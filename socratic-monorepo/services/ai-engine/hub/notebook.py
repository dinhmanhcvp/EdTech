"""Vở ghi "Học theo SGK" của học sinh: mỗi học liệu (mã preset/bài lab) một dòng dự đoán + kết quả, giáo viên của lớp đọc được."""
from __future__ import annotations

import time
from typing import Dict, List

from hub.db import LOCK, connect


def _row(r) -> Dict:
    return {"itemKey": r["item_key"], "prediction": r["prediction"], "result": r["result"], "done": bool(r["done"]), "updatedAt": r["updated_at"]}


def list_mine(student_id: str) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM notebook_entries WHERE student_id=? ORDER BY updated_at DESC", (student_id,)).fetchall()
    return [_row(r) for r in rows]


def save(student_id: str, item_key: str, prediction: str, result: str, done: bool) -> Dict:
    now = time.time()
    with LOCK, connect() as conn:
        conn.execute(
            "INSERT INTO notebook_entries (student_id, item_key, prediction, result, done, updated_at) VALUES (?,?,?,?,?,?) "
            "ON CONFLICT(student_id, item_key) DO UPDATE SET prediction=excluded.prediction, result=excluded.result, done=excluded.done, updated_at=excluded.updated_at",
            (student_id, item_key, prediction, result, int(done), now),
        )
    return {"itemKey": item_key, "prediction": prediction, "result": result, "done": done, "updatedAt": now}


def list_class(class_id: str, limit: int = 500) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT n.*, s.id AS sid, s.name AS sname FROM notebook_entries n JOIN students s ON s.id = n.student_id "
            "WHERE s.class_id=? ORDER BY n.updated_at DESC LIMIT ?",
            (class_id, limit),
        ).fetchall()
    return [{**_row(r), "studentId": r["sid"], "studentName": r["sname"]} for r in rows]
