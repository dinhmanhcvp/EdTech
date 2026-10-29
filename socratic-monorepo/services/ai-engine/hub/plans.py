"""Giáo án có version: mỗi lần lưu thay đổi tạo version mới; id phần/mục giữ nguyên qua các version."""
from __future__ import annotations

from typing import Callable, Dict, List, Optional

from hub import clock
from hub.db import LOCK, connect, dumps, loads, new_id
from hub.schemas import clean_plan


class VersionConflict(Exception):
    pass


def _noop(plan_id: str, version: int) -> None:
    return None


# Gán lại ở hub.sessions: phát "plan_updated" tới bảng của các tiết đang dùng giáo án này.
on_saved: Callable[[str, int], None] = _noop


def list_plans(teacher_id: str) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute("SELECT id, title, subject, current_version FROM teaching_plans WHERE teacher_id=? ORDER BY rowid DESC",
                            (teacher_id,)).fetchall()
    return [{"id": r["id"], "title": r["title"], "subject": r["subject"], "currentVersion": r["current_version"]} for r in rows]


def get_plan(plan_id: str, version: Optional[int] = None) -> Dict:
    with connect() as conn:
        head = conn.execute("SELECT teacher_id, current_version FROM teaching_plans WHERE id=?", (plan_id,)).fetchone()
        if not head:
            raise KeyError(plan_id)
        v = version or head["current_version"]
        row = conn.execute("SELECT payload FROM teaching_plan_versions WHERE plan_id=? AND version=?", (plan_id, v)).fetchone()
    if not row:
        raise KeyError(f"{plan_id}@{v}")
    return {"id": plan_id, "teacherId": head["teacher_id"], "version": v, "body": loads(row["payload"])}


def owned_plan(teacher_id: str, plan_id: str, version: Optional[int] = None) -> Dict:
    plan = get_plan(plan_id, version)
    if plan["teacherId"] != teacher_id:
        raise KeyError(plan_id)
    return plan


def create_plan(teacher_id: str, body: Dict) -> Dict:
    clean = clean_plan(body)
    plan_id = new_id("plan")
    with LOCK, connect() as conn:
        conn.execute("INSERT INTO teaching_plans VALUES (?,?,?,?,1)", (plan_id, teacher_id, clean["subject"], clean["title"]))
        conn.execute("INSERT INTO teaching_plan_versions VALUES (?,?,?,?,?)", (plan_id, 1, dumps(clean), clock.now(), "edit"))
    return {"id": plan_id, "version": 1, "body": clean}


def save_plan(teacher_id: str, plan_id: str, body: Dict, base_version: int, reason: str = "edit") -> Dict:
    clean = clean_plan(body)
    with LOCK:
        current = owned_plan(teacher_id, plan_id)
        if current["body"] == clean:
            return {"id": plan_id, "version": current["version"], "body": clean}
        if base_version != current["version"]:
            raise VersionConflict(plan_id)
        version = current["version"] + 1
        with connect() as conn:
            conn.execute("INSERT INTO teaching_plan_versions VALUES (?,?,?,?,?)", (plan_id, version, dumps(clean), clock.now(), reason))
            conn.execute("UPDATE teaching_plans SET current_version=?, title=?, subject=? WHERE id=?",
                         (version, clean["title"], clean["subject"], plan_id))
    on_saved(plan_id, version)
    return {"id": plan_id, "version": version, "body": clean}
