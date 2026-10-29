"""Một lần giao bài: mã QR, trong tiết → bài về nhà → hết hạn.

Hết tiết được nhận ra khi đọc lượt giao (lazy): tiết console đã `ended` mà lượt giao còn mở thì coi như đóng lúc tiết kết thúc.
Nhờ vậy không cần móc gì vào luồng kết thúc tiết của console.
"""
from __future__ import annotations

import os
import secrets
from typing import Any, Dict, List, Optional

from hub import clock
from hub.db import CODE_ALPHABET, LOCK, connect, new_id
from hub.assignments import bridge, store

HOMEWORK_S = 259200  # hạn bài về nhà mặc định: 3 ngày sau khi đóng


def _code(conn) -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        if not conn.execute("SELECT 1 FROM assignment_runs WHERE code=?", (code,)).fetchone():
            return code


def student_url(code: str) -> str:
    return os.getenv("STUDENT_APP_URL", "http://localhost:3002").rstrip("/") + "/a/" + code


def open_run(teacher_id: str, assignment_id: str, class_id: str, period_id: Optional[str] = None,
             console_teacher_id: Optional[str] = None) -> Dict[str, Any]:
    a = store.owned(teacher_id, assignment_id)
    if not a["body"]:
        raise ValueError("assignment_has_no_questions")
    run_id = new_id("run")
    with LOCK, connect() as conn:
        code = _code(conn)
        conn.execute("INSERT INTO assignment_runs VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL,'open')",
                     (run_id, code, assignment_id, a["version"], teacher_id, class_id, period_id, console_teacher_id, clock.now()))
        has_students = conn.execute("SELECT 1 FROM students WHERE class_id=? LIMIT 1", (class_id,)).fetchone() is not None
    return {"runId": run_id, "code": code, "url": student_url(code), "classHasStudents": has_students}


def phase(run: Dict[str, Any]) -> str:
    if run["status"] == "open":
        return "in_class"
    return "homework" if run["dueAt"] and clock.now() < run["dueAt"] else "closed"


def _row(r) -> Dict[str, Any]:
    run = {"id": r["id"], "code": r["code"], "assignmentId": r["assignment_id"], "version": r["version"], "teacherId": r["teacher_id"],
           "classId": r["class_id"], "periodId": r["period_id"], "consoleTeacherId": r["console_teacher_id"], "openedAt": r["opened_at"],
           "closedAt": r["closed_at"], "dueAt": r["due_at"], "status": r["status"]}
    run["phase"] = phase(run)
    return run


def _close(run_id: str, at: float) -> None:
    with LOCK, connect() as conn:
        conn.execute("UPDATE assignment_runs SET status='closed', closed_at=?, due_at=COALESCE(due_at, ?) WHERE id=? AND status='open'",
                     (at, at + HOMEWORK_S, run_id))


def _load(where: str, arg: str) -> Dict[str, Any]:
    with connect() as conn:
        r = conn.execute(f"SELECT * FROM assignment_runs WHERE {where}=?", (arg,)).fetchone()
    if not r:
        raise KeyError(arg)
    if r["status"] == "open" and r["period_id"] and r["console_teacher_id"]:
        p = bridge.period_status(r["console_teacher_id"], r["period_id"])
        if p and p["status"] == "ended":
            _close(r["id"], p["ended_at"] or clock.now())
            with connect() as conn:
                r = conn.execute("SELECT * FROM assignment_runs WHERE id=?", (r["id"],)).fetchone()
    return _row(r)


def get(run_id: str) -> Dict[str, Any]:
    return _load("id", run_id)


def by_code(code: str) -> Dict[str, Any]:
    return _load("code", code.strip().upper())


def owned(teacher_id: str, run_id: str) -> Dict[str, Any]:
    run = get(run_id)
    if run["teacherId"] != teacher_id:
        raise KeyError(run_id)
    return run


def close(run_id: str) -> Dict[str, Any]:
    _close(run_id, clock.now())
    return get(run_id)


def set_due(run_id: str, due_at: float) -> Dict[str, Any]:
    with LOCK, connect() as conn:
        conn.execute("UPDATE assignment_runs SET due_at=? WHERE id=?", (due_at, run_id))
    return get(run_id)


def list_for_class(teacher_id: str, class_id: str) -> List[Dict[str, Any]]:
    with connect() as conn:
        ids = [r["id"] for r in conn.execute("SELECT id FROM assignment_runs WHERE teacher_id=? AND class_id=? ORDER BY opened_at DESC",
                                             (teacher_id, class_id))]
    return [get(i) for i in ids]


def check_student(run: Dict[str, Any], student_id: str) -> None:
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
    if not row or row["class_id"] != run["classId"]:
        raise PermissionError("not_in_class")


def student_can_see_assignment(student_id: str, assignment_id: str) -> bool:
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
        ids = [r["id"] for r in conn.execute("SELECT id FROM assignment_runs WHERE assignment_id=? AND class_id=?",
                                             (assignment_id, row["class_id"] if row else ""))]
    return any(get(i)["phase"] != "closed" for i in ids)


def run_view(run: Dict[str, Any]) -> Dict[str, Any]:
    """Thông tin lượt giao cho giáo viên / bảng."""
    return {"runId": run["id"], "code": run["code"], "url": student_url(run["code"]), "assignmentId": run["assignmentId"],
            "classId": run["classId"], "periodId": run["periodId"], "openedAt": run["openedAt"], "closedAt": run["closedAt"],
            "dueAt": run["dueAt"], "phase": run["phase"]}
