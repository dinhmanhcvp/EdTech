"""Đóng gói kết quả bài tập: cho học sinh (đỉnh 3), chỉ số theo lượt giao (đỉnh 1), bài học Socratic từ câu sai/chưa làm."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from formula_check import latex_to_plain
from hub.db import connect
from hub.assignments import runs, store, submissions

CERTAIN = submissions.CERTAIN


def _questions(run: Dict[str, Any]) -> List[Dict[str, Any]]:
    return store.get(run["assignmentId"])["body"]["questions"]


def _student_class(student_id: str) -> Optional[str]:
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
    return row["class_id"] if row else None


def class_runs(class_id: str) -> List[Dict[str, Any]]:
    with connect() as conn:
        ids = [r["id"] for r in conn.execute("SELECT id FROM assignment_runs WHERE class_id=? ORDER BY opened_at DESC", (class_id,))]
    return [runs.get(i) for i in ids]


def class_question_total(class_id: str) -> int:
    return sum(len(_questions(r)) for r in class_runs(class_id))


def score10(qs: List[Dict[str, Any]], latest: Dict[str, Dict[str, Any]]) -> Optional[float]:
    """Điểm thang 10 trên các câu đã có điểm (câu đang chờ giáo viên chưa tính)."""
    scored = [(latest[q["id"]]["score"], q.get("points", 1)) for q in qs if q["id"] in latest and latest[q["id"]]["score"] is not None]
    if not scored:
        return None
    return round(sum(s * p for s, p in scored) / sum(p for _, p in scored) * 10, 2)


def _latest_for(run_id: str, student_id: str) -> Dict[str, Dict[str, Any]]:
    return {s["question_id"]: s for s in submissions._latest(run_id) if s["student_id"] == student_id}


def my_assignments(student_id: str) -> List[Dict[str, Any]]:
    class_id = _student_class(student_id)
    out = []
    for run in class_runs(class_id) if class_id else []:
        a = store.get(run["assignmentId"])
        latest = _latest_for(run["id"], student_id)
        tags = submissions.labels(run["id"])
        everyone = submissions._latest(run["id"])
        out.append({
            "runId": run["id"], "code": run["code"], "title": a["title"], "kind": a["kind"], "phase": run["phase"], "dueAt": run["dueAt"],
            "score10": score10(a["body"]["questions"], latest),
            "questions": [{"questionId": q["id"], "label": q["label"], "status": latest.get(q["id"], {}).get("status"),
                           "score": latest.get(q["id"], {}).get("score")} for q in a["body"]["questions"]],
            "corrections": [{"submissionId": s["id"], "questionId": s["question_id"]} for s in everyone
                            if s["student_id"] == student_id and s["correction"]],
            "classExamples": [{"submissionId": s["id"], "questionId": s["question_id"], "label": tags.get(s["student_id"], "")}
                              for s in everyone if s["student_id"] != student_id and s["correction"]],
        })
    return out


def is_class_example(student_id: str, submission_id: str) -> bool:
    sub = submissions.get(submission_id)
    return bool(sub["correction"]) and runs.get(sub["run_id"])["classId"] == _student_class(student_id)


def _norm(answer: str) -> str:
    return re.sub(r"\s+", "", latex_to_plain(answer or "")).lower()


def run_metrics(run: Dict[str, Any]) -> Dict[str, Any]:
    qs = _questions(run)
    with connect() as conn:
        students = [dict(r) for r in conn.execute("SELECT id, name FROM students WHERE class_id=? ORDER BY rowid", (run["classId"],))]
        rows = [dict(r) for r in conn.execute("SELECT * FROM submissions WHERE run_id=? AND status != 'draft' ORDER BY created_at", (run["id"],))]
    latest = {(s["student_id"], s["question_id"]): s for s in rows}
    first = {}
    for s in rows:
        if s["status"] in CERTAIN:
            first.setdefault((s["student_id"], s["question_id"]), s)
    n = len(students) or 1
    questions = []
    for q in qs:
        cur = [s for (sid, qid), s in latest.items() if qid == q["id"]]
        scored = [s for s in cur if s["score"] is not None]
        firsts = [s for (sid, qid), s in first.items() if qid == q["id"]]
        wrong: Dict[str, List[Any]] = {}
        for s in rows:
            if s["question_id"] == q["id"] and s["status"] in CERTAIN and (s["score"] or 0) < 0.5 and s["answer"]:
                key = _norm(s["answer"])
                shown, count = wrong.get(key, [s["answer"].strip(), 0])
                wrong[key] = [shown, count + 1]
        questions.append({
            "questionId": q["id"], "label": q["label"], "submittedRate": round(len(cur) / n, 3),
            "correctRate": round(sum(1 for s in scored if s["score"] >= 0.5) / len(scored), 3) if scored else None,
            "firstTryRate": round(sum(1 for s in firsts if (s["score"] or 0) >= 0.5) / len(firsts), 3) if firsts else None,
            "wrongAnswers": [{"answer": a, "count": c} for a, c in sorted(wrong.values(), key=lambda v: -v[1])[:5]],
            "pending": sum(1 for s in cur if s["status"] == "pending_teacher"),
        })
    per_student = []
    for st in students:
        mine = {qid: s for (sid, qid), s in latest.items() if sid == st["id"]}
        per_student.append({"studentId": st["id"], "name": st["name"], "score10": score10(qs, mine),
                            "pending": sum(1 for s in mine.values() if s["status"] == "pending_teacher"), "done": len(mine)})
    return {"runId": run["id"], "questions": questions, "students": per_student}


def run_lesson(student_id: str, run: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """Bài học Socratic một cảnh mỗi câu có đáp án mà em làm sai hoặc chưa làm. Đáp án chỉ ở `keys`."""
    from lesson_builder import add_run_questions

    a = store.get(run["assignmentId"])
    latest = _latest_for(run["id"], student_id)
    todo = [q["id"] for q in a["body"]["questions"] if q["type"] != "open"
            and not (q["id"] in latest and latest[q["id"]]["status"] in CERTAIN and (latest[q["id"]]["score"] or 0) >= 0.5)]
    plan = {"lesson_id": f"hub:run:{run['id']}:{student_id}", "session_id": run["id"], "title": a["title"], "version": 1, "scenes": []}
    keys: Dict[str, str] = {}
    add_run_questions(plan, keys, a["body"], todo)
    return plan, keys
