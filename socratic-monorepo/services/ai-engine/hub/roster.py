"""Lớp, học sinh và link phụ huynh. Truy cập lớp của giáo viên khác coi như không tồn tại (KeyError → 404)."""
from __future__ import annotations

import secrets
from typing import Dict, List, Tuple

from hub import clock
from hub.db import LOCK, connect, new_id, new_login_code


def teacher_classes(teacher_id: str) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT c.id, c.name, c.subject, COUNT(s.id) AS n FROM classes c LEFT JOIN students s ON s.class_id = c.id "
            "WHERE c.teacher_id=? GROUP BY c.id ORDER BY c.name", (teacher_id,)).fetchall()
    return [{"id": r["id"], "name": r["name"], "subject": r["subject"], "studentCount": r["n"]} for r in rows]


def owned_class(teacher_id: str, class_id: str) -> Dict:
    with connect() as conn:
        row = conn.execute("SELECT id, name, subject FROM classes WHERE id=? AND teacher_id=?", (class_id, teacher_id)).fetchone()
    if not row:
        raise KeyError(class_id)
    return dict(row)


def list_students(class_id: str) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT s.id, s.name, s.login_code, (SELECT token FROM parent_links p WHERE p.student_id = s.id AND p.revoked_at IS NULL "
            "ORDER BY rowid DESC LIMIT 1) AS token FROM students s WHERE s.class_id=? ORDER BY s.rowid", (class_id,)).fetchall()
    return [{"id": r["id"], "name": r["name"], "loginCode": r["login_code"], "parentToken": r["token"]} for r in rows]


def add_students(class_id: str, names: List[str]) -> List[Dict]:
    created = []
    with LOCK, connect() as conn:
        for name in names:
            student_id, code, token = new_id("s"), new_login_code(conn), secrets.token_urlsafe(32)
            conn.execute("INSERT INTO students VALUES (?,?,?,?)", (student_id, class_id, name.strip(), code))
            conn.execute("INSERT INTO parent_links VALUES (?,?,NULL)", (token, student_id))
            created.append({"id": student_id, "name": name.strip(), "loginCode": code, "parentToken": token})
    return created


def student_owner(student_id: str) -> Tuple[str, str]:
    """(class_id, teacher_id) của học sinh; KeyError nếu không có."""
    with connect() as conn:
        row = conn.execute("SELECT s.class_id, c.teacher_id FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id=?",
                           (student_id,)).fetchone()
    if not row:
        raise KeyError(student_id)
    return row["class_id"], row["teacher_id"]


def rotate_parent_link(student_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with LOCK, connect() as conn:
        conn.execute("UPDATE parent_links SET revoked_at=? WHERE student_id=? AND revoked_at IS NULL", (clock.now(), student_id))
        conn.execute("INSERT INTO parent_links VALUES (?,?,NULL)", (token, student_id))
    return token
