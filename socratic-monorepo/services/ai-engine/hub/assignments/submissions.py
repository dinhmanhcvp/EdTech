"""Bài nộp: trắc nghiệm, đáp số gõ, ảnh vở (Task 7). Chỉ bài máy chấm chắc chắn hoặc giáo viên đã duyệt mới thành sự kiện học tập."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from hub import clock
from hub.db import LOCK, connect, dumps, loads, new_id
from hub.events import bus
from hub.grading import PRIOR, bkt_update
from hub.assignments import grader, store

CERTAIN = ("graded", "teacher_confirmed")


class RequestConflict(Exception):
    pass


def question_of(run: Dict[str, Any], version: int, question_id: str) -> Dict[str, Any]:
    current = store.get(run["assignmentId"])["version"]
    if not 1 <= version <= current:
        raise ValueError("bad_version")
    body = store.get(run["assignmentId"], version)["body"]
    q = next((q for q in body["questions"] if q["id"] == question_id), None)
    if q is None:
        raise KeyError(question_id)
    return q


def _row(r) -> Dict[str, Any]:
    out = dict(r)
    for k in ("ocr", "confirmed", "grade", "correction"):
        out[k] = loads(out[k]) if out.get(k) else None
    return out


def get(submission_id: str) -> Dict[str, Any]:
    with connect() as conn:
        r = conn.execute("SELECT * FROM submissions WHERE id=?", (submission_id,)).fetchone()
    if not r:
        raise KeyError(submission_id)
    return _row(r)


def view(sub: Dict[str, Any]) -> Dict[str, Any]:
    return {"submissionId": sub["id"], "status": sub["status"], "score": sub["score"], "attempt": sub["attempt"]}


def _by_request(student_id: str, request_id: str) -> Optional[Dict[str, Any]]:
    with connect() as conn:
        r = conn.execute("SELECT * FROM submissions WHERE student_id=? AND request_id=?", (student_id, request_id)).fetchone()
    return _row(r) if r else None


def insert(run: Dict[str, Any], student_id: str, question_id: str, version: int, request_id: str, fingerprint: str, mode: str,
           status: str, score: Optional[float], **fields: Any) -> Dict[str, Any]:
    sid, now = new_id("sub"), clock.now()
    with LOCK, connect() as conn:
        attempt = 1 + conn.execute("SELECT COUNT(*) FROM submissions WHERE run_id=? AND student_id=? AND question_id=? AND status != 'draft'",
                                   (run["id"], student_id, question_id)).fetchone()[0]
        conn.execute("INSERT INTO submissions (id, run_id, student_id, question_id, version, attempt, request_id, fingerprint, mode, answer, "
                     "photo_path, ocr, confirmed, grade, status, score, phase, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                     (sid, run["id"], student_id, question_id, version, attempt, request_id, fingerprint, mode, fields.get("answer"),
                      fields.get("photo_path"), dumps(fields["ocr"]) if fields.get("ocr") is not None else None,
                      dumps(fields["confirmed"]) if fields.get("confirmed") is not None else None, None, status, score,
                      "homework" if run["phase"] == "homework" else "in_class", now))
    return get(sid)


def update(submission_id: str, **fields: Any) -> Dict[str, Any]:
    cols = []
    vals: List[Any] = []
    for k, v in fields.items():
        cols.append(f"{k}=?")
        vals.append(dumps(v) if k in ("ocr", "confirmed", "grade", "correction") and v is not None else v)
    with LOCK, connect() as conn:
        conn.execute(f"UPDATE submissions SET {', '.join(cols)} WHERE id=?", (*vals, submission_id))
    return get(submission_id)


def _was_correct_before(sub: Dict[str, Any]) -> bool:
    with connect() as conn:
        return conn.execute(
            "SELECT 1 FROM submissions WHERE run_id=? AND student_id=? AND question_id=? AND id != ? AND status IN ('graded','teacher_confirmed') "
            "AND score >= 0.5 AND created_at <= ? LIMIT 1", (sub["run_id"], sub["student_id"], sub["question_id"], sub["id"], sub["created_at"])).fetchone() is not None


def record_event(sub: Dict[str, Any], run: Dict[str, Any]) -> None:
    """Một bài chắc chắn → mỗi KC một dòng learning_events; mastery chỉ đổi khi đây không phải lần đúng lặp lại."""
    q = question_of(run, sub["version"], sub["question_id"])
    kind = "correct" if (sub["score"] or 0) >= 0.5 else "incorrect"
    update_mastery = not (kind == "correct" and _was_correct_before(sub))
    now = clock.now()
    with LOCK, connect() as conn:
        for kc in [k["id"] for k in q.get("kcs") or []] or [""]:
            cur = conn.execute("INSERT OR IGNORE INTO learning_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                               (new_id("ev"), sub["student_id"], run["id"], f"asg:{run['assignmentId']}", kc,
                                f"{run['id']}:{sub['question_id']}", kind, (sub.get("answer") or "")[:200] or None, f"sub:{sub['id']}", now))
            if cur.rowcount and kc and update_mastery:
                row = conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id=?", (sub["student_id"], kc)).fetchone()
                p = bkt_update(row["p_known"] if row else PRIOR, kind == "correct")
                conn.execute("INSERT INTO mastery VALUES (?,?,?,?) ON CONFLICT(student_id, kc_id) DO UPDATE SET p_known=excluded.p_known, "
                             "updated_at=excluded.updated_at", (sub["student_id"], kc, p, now))
    bus.publish(f"teacher:{run['teacherId']}", {"type": "metric_delta", "classId": run["classId"], "studentId": sub["student_id"],
                                                "sectionId": f"asg:{run['assignmentId']}"})


def notify(sub: Dict[str, Any], run: Dict[str, Any]) -> None:
    bus.publish(f"teacher:{run['teacherId']}", {"type": "submission_update", "runId": run["id"], "studentId": sub["student_id"],
                                                "questionId": sub["question_id"], "status": sub["status"]})
    if run["periodId"]:
        bus.publish(f"cboard:{run['periodId']}", {"type": "progress", "runId": run["id"]})


def finish(sub: Dict[str, Any], run: Dict[str, Any]) -> None:
    if sub["status"] in CERTAIN:
        record_event(sub, run)
    notify(sub, run)


def _guard(run: Dict[str, Any]) -> None:
    if run["phase"] == "closed":
        raise PermissionError("run_closed")


def answer(run: Dict[str, Any], student_id: str, question_id: str, version: int, request_id: str,
           choice: Optional[int] = None, text: Optional[str] = None) -> Dict[str, Any]:
    _guard(run)
    fingerprint = json.dumps([question_id, version, choice, text], ensure_ascii=False)
    existing = _by_request(student_id, request_id)
    if existing:
        if existing["fingerprint"] != fingerprint:
            raise RequestConflict(request_id)
        return view(existing)
    q = question_of(run, version, question_id)
    if q["type"] == "choice" and choice is not None:
        correct: Optional[bool] = grader.grade_choice(choice, q["answer"])
        given = str(choice)
    elif q["type"] == "short" and text is not None and text.strip():
        correct = grader.grade_short(text, q["answer"])
        given = text.strip()[:200]
    else:
        raise ValueError("wrong_mode")
    status = "pending_teacher" if correct is None else "graded"
    score = None if correct is None else (1.0 if correct else 0.0)
    sub = insert(run, student_id, question_id, version, request_id, fingerprint, "choice" if q["type"] == "choice" else "typed",
                 status, score, answer=given)
    finish(sub, run)
    return view(sub)


def mine(run: Dict[str, Any], student_id: str) -> Dict[str, Dict[str, Any]]:
    """Kết quả hiện tại (lần nộp gần nhất, không tính ảnh nháp) của học sinh theo câu."""
    with connect() as conn:
        rows = conn.execute("SELECT question_id, status, score, attempt FROM submissions WHERE run_id=? AND student_id=? AND status != 'draft' "
                            "ORDER BY created_at", (run["id"], student_id)).fetchall()
    return {r["question_id"]: {"status": r["status"], "score": r["score"], "attempt": r["attempt"]} for r in rows}
