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


# ------------------------------------------------------------------ ảnh vở: đọc → học sinh xác nhận → chấm
MAX_PHOTO_BYTES = 2 * 1024 * 1024
MAX_LINES = 40


def upload_photo(run: Dict[str, Any], student_id: str, question_id: str, version: int, request_id: str, data: bytes) -> Dict[str, Any]:
    from hub.assignments import files, ocr, pages

    _guard(run)
    fingerprint = json.dumps([question_id, version, "photo"])
    existing = _by_request(student_id, request_id)
    if existing:
        if existing["fingerprint"] != fingerprint:
            raise RequestConflict(request_id)
        return {"photoId": existing["id"], **(existing["ocr"] or {"lines": [], "uncertain": []})}
    q = question_of(run, version, question_id)
    if q["type"] not in ("essay", "open"):
        raise ValueError("wrong_mode")
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("too_large")
    jpeg = pages.shrink_photo(data)
    read = ocr.recognize_image(jpeg) or {"lines": [], "uncertain": []}
    sub = insert(run, student_id, question_id, version, request_id, fingerprint, "photo", "draft", None, ocr=read)
    update(sub["id"], photo_path=files.save_photo(sub["id"], jpeg))
    return {"photoId": sub["id"], **read}


def _grade_job(submission_id: str, run: Dict[str, Any]) -> None:
    sub = get(submission_id)
    q = question_of(run, sub["version"], sub["question_id"])
    subject = store.get(run["assignmentId"])["subject"]
    try:
        result = grader.grade_lines(q, sub["confirmed"] or [], subject)
    except Exception:
        return
    notify(update(submission_id, grade=result), run)


def confirm(run: Dict[str, Any], photo_id: str, student_id: str, lines: List[str], resolved: List[int], photo_only: bool = False) -> Dict[str, Any]:
    from hub.assignments import jobs

    _guard(run)
    sub = get(photo_id)
    if sub["student_id"] != student_id or sub["run_id"] != run["id"] or sub["mode"] != "photo":
        raise KeyError(photo_id)
    if sub["status"] != "draft":
        return {"photoId": photo_id, **view(sub)}
    uncertain = (sub["ocr"] or {}).get("uncertain") or []
    if not photo_only and set(resolved) != set(range(len(uncertain))):
        raise ValueError("uncertain_unresolved")
    clean = [l.strip()[:600] for l in lines if l and l.strip()][:MAX_LINES]
    q = question_of(run, sub["version"], sub["question_id"])
    verdict = None if photo_only or not clean or q["type"] == "open" else grader.grade_final(clean, q["answer"])
    status = "pending_teacher" if verdict is None else "graded"
    with LOCK, connect() as conn:  # lần thử tính khi bài thật sự được nộp (ảnh nháp không tính)
        attempt = 1 + conn.execute("SELECT COUNT(*) FROM submissions WHERE run_id=? AND student_id=? AND question_id=? AND status != 'draft'",
                                   (run["id"], student_id, sub["question_id"])).fetchone()[0]
    sub = update(photo_id, status=status, score=None if verdict is None else (1.0 if verdict else 0.0), confirmed=clean,
                 answer=clean[-1][:200] if clean else None, attempt=attempt, created_at=clock.now())
    finish(sub, run)
    if clean:
        jobs.spawn(lambda: _grade_job(photo_id, run))
    return {"photoId": photo_id, **view(sub)}


# ------------------------------------------------------------------ giáo viên duyệt, bảng chọn bài ẩn danh, chiếu, chữa
MAX_CORRECTION_STROKES = 200


def _replay_mastery(student_id: str, kc: str) -> None:
    """Tính lại mastery của một KC từ sự kiện, cùng quy tắc lúc chạy: lần đúng lặp lại của cùng một câu không cộng thêm."""
    with LOCK, connect() as conn:
        rows = conn.execute("SELECT item_id, kind FROM learning_events WHERE student_id=? AND kc_id=? AND kind IN ('correct','incorrect') "
                            "ORDER BY created_at", (student_id, kc)).fetchall()
        p, solved = PRIOR, set()
        for r in rows:
            if r["kind"] == "correct" and r["item_id"] in solved:
                continue
            p = bkt_update(p, r["kind"] == "correct")
            if r["kind"] == "correct":
                solved.add(r["item_id"])
        conn.execute("INSERT INTO mastery VALUES (?,?,?,?) ON CONFLICT(student_id, kc_id) DO UPDATE SET p_known=excluded.p_known, "
                     "updated_at=excluded.updated_at", (student_id, kc, p, clock.now()))


def review(run: Dict[str, Any], submission_id: str, score: float, lines: Optional[List[str]] = None) -> Dict[str, Any]:
    sub = get(submission_id)
    if sub["run_id"] != run["id"] or sub["status"] == "draft":
        raise KeyError(submission_id)
    fields: Dict[str, Any] = {"status": "teacher_confirmed", "score": float(score), "reviewed_at": clock.now()}
    if lines is not None:
        fields["confirmed"] = [l.strip()[:600] for l in lines if l.strip()][:MAX_LINES]
    with LOCK, connect() as conn:
        conn.execute("DELETE FROM learning_events WHERE request_id=?", (f"sub:{submission_id}",))
    sub = update(submission_id, **fields)
    record_event(sub, run)
    q = question_of(run, sub["version"], sub["question_id"])
    for kc in [k["id"] for k in q.get("kcs") or []]:
        _replay_mastery(sub["student_id"], kc)
    notify(sub, run)
    return view(sub)


def labels(run_id: str) -> Dict[str, str]:
    """Nhãn ẩn danh "Bài n" theo thứ tự lần nộp đầu tiên của mỗi học sinh trong lượt giao."""
    with connect() as conn:
        rows = conn.execute("SELECT student_id, MIN(created_at) AS t FROM submissions WHERE run_id=? AND status != 'draft' "
                            "GROUP BY student_id ORDER BY t", (run_id,)).fetchall()
    return {r["student_id"]: f"Bài {i}" for i, r in enumerate(rows, 1)}


def _latest(run_id: str) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM submissions WHERE run_id=? AND status != 'draft' ORDER BY created_at", (run_id,)).fetchall()
    latest: Dict[Any, Dict[str, Any]] = {}
    for r in rows:
        latest[(r["student_id"], r["question_id"])] = _row(r)
    return list(latest.values())


def teacher_list(run_id: str) -> List[Dict[str, Any]]:
    with connect() as conn:
        names = {r["id"]: r["name"] for r in conn.execute("SELECT id, name FROM students")}
    return [{"submissionId": s["id"], "studentId": s["student_id"], "name": names.get(s["student_id"], ""), "questionId": s["question_id"],
             "mode": s["mode"], "status": s["status"], "score": s["score"], "attempt": s["attempt"], "phase": s["phase"],
             "answer": s["answer"], "confirmed": s["confirmed"], "ocr": s["ocr"], "grade": s["grade"], "hasPhoto": bool(s["photo_path"])}
            for s in _latest(run_id)]


def _label_no(tags: Dict[str, str], student_id: str) -> int:
    return int(tags.get(student_id, "Bài 0").split()[1])


def anonymous_list(run_id: str, question_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
    tags = labels(run_id)
    out = []
    for s in sorted(_latest(run_id), key=lambda s: (_label_no(tags, s["student_id"]), s["question_id"])):
        if (question_id and s["question_id"] != question_id) or (status and s["status"] != status):
            continue
        out.append({"submissionId": s["id"], "label": tags.get(s["student_id"], ""), "questionId": s["question_id"], "status": s["status"],
                    "firstError": (s["grade"] or {}).get("first_error"), "hasPhoto": bool(s["photo_path"])})
    return out


def board_detail(submission_id: str) -> Dict[str, Any]:
    sub = get(submission_id)
    if sub["status"] == "draft":
        raise KeyError(submission_id)
    return {"submissionId": sub["id"], "label": labels(sub["run_id"]).get(sub["student_id"], ""), "questionId": sub["question_id"],
            "status": sub["status"], "confirmed": sub["confirmed"], "lines": (sub["ocr"] or {}).get("lines"), "grade": sub["grade"],
            "correction": sub["correction"], "hasPhoto": bool(sub["photo_path"])}


def progress(run: Dict[str, Any]) -> List[Dict[str, Any]]:
    body = store.get(run["assignmentId"])["body"]
    latest = _latest(run["id"])
    out = []
    for q in body["questions"]:
        subs = [s for s in latest if s["question_id"] == q["id"]]
        scored = [s["score"] for s in subs if s["score"] is not None]
        rate = round(sum(1 for x in scored if x >= 0.5) / len(scored), 3) if scored else None
        out.append({"questionId": q["id"], "submitted": len(subs), "correctRate": rate})
    return out


def show(run: Dict[str, Any], submission_id: str) -> Dict[str, Any]:
    if get(submission_id)["run_id"] != run["id"]:
        raise KeyError(submission_id)
    detail = board_detail(submission_id)
    event = {"type": "show_submission", "runId": run["id"], "submissionId": submission_id, "label": detail["label"]}
    if run["periodId"]:
        bus.publish(f"cboard:{run['periodId']}", event)
    return event


def _valid_point(p: Any) -> bool:
    return isinstance(p, list) and len(p) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in p)


def save_correction(submission_id: str, strokes: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(strokes) > MAX_CORRECTION_STROKES:
        raise ValueError("too_many_strokes")
    for s in strokes:
        pts = s.get("p") if isinstance(s, dict) else None
        if not isinstance(pts, list) or not pts or len(pts) > 1500 or not all(_valid_point(p) for p in pts):
            raise ValueError("bad_stroke")
    sub = update(submission_id, correction={"strokes": strokes, "savedAt": clock.now()})
    return {"submissionId": sub["id"], "saved": True}
