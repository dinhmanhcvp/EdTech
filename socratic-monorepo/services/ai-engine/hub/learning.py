"""Đỉnh 3 theo tiết học: bài học Mode 2 dựng từ gói tri thức của tiết, và sự kiện học tập → mastery → chỉ số cho giáo viên."""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from hub import clock, plans
from hub.db import LOCK, connect, new_id
from hub.events import bus
from hub.grading import PRIOR, bkt_update
from hub.sessions import get_package, session_class
from lesson_builder import add_plan_questions, build_lesson

_EVENT_KIND = {"VERIFIED_CORRECT": "correct", "VERIFIED_INCORRECT": "incorrect"}


HUB_LESSON_PREFIX = "hub:"


def is_hub_session(session_id: Optional[str]) -> bool:
    return bool(session_id) and get_package(session_id) is not None


def is_hub_lesson(plan: Dict) -> bool:
    """Bài học dựng từ tiết hub (id riêng `hub:<tiết>:<học sinh>`), không phải bài học Mode 2 cũ của lớp."""
    return str(plan.get("lesson_id", "")).startswith(HUB_LESSON_PREFIX) and is_hub_session(plan.get("session_id"))


def _in_session_class(student_id: str, session_id: str) -> bool:
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
    return bool(row) and row["class_id"] == session_class(session_id)["id"]


def _build(student_id: str, session_id: str, package: Dict) -> Tuple[Dict, Dict]:
    plan_body = plans.get_plan(package["planId"], package["planVersion"])["body"]
    plan, keys = build_lesson({**package["snapshot"], "sessionId": session_id}, student_id)
    add_plan_questions(plan, keys, package.get("sections", []), plan_body)
    return plan, keys


def session_lesson(student_id: str, session_id: str) -> Tuple[Dict, Dict]:
    """(bài học công khai, đáp án) của tiết; KeyError khi tiết không có gói hoặc học sinh không thuộc lớp của tiết."""
    package = get_package(session_id)
    if not package:
        raise KeyError(session_id)
    if not _in_session_class(student_id, session_id):
        raise KeyError(student_id)
    plan, keys = _build(student_id, session_id, package)
    plan["lesson_id"] = f"{HUB_LESSON_PREFIX}{session_id}:{student_id}"  # không trùng (và không bị ghi đè bởi) bài học cũ của lớp
    return plan, keys


def _section_map(package: Dict) -> Dict[str, Dict]:
    return {s["boardSnapshotId"]: s for s in package.get("sections", [])}


def session_questions(session_id: str) -> List[Dict]:
    package = get_package(session_id)
    if not package:
        return []
    plan, _ = _build("_", session_id, package)
    sections = _section_map(package)
    return [{"questionId": q["id"], "sceneId": s["id"], "sectionId": (sections.get(s["id"]) or {}).get("planSectionId")}
            for s in plan["scenes"] for q in s["questions"]]


def record_turn(student_id: str, session_id: str, scene_id: str, question_id: str, kind: str, status: str,
                message: str, request_id: str, update_mastery: bool = True) -> None:
    """update_mastery=False khi trả lời đúng lại một câu đã giải: vẫn ghi sự kiện nhưng không cộng thêm bằng chứng BKT."""
    package = get_package(session_id)
    if not package or kind == "CHAT" or not _in_session_class(student_id, session_id):
        return
    if kind == "HINT":
        event_kind = "hint"
    elif status in _EVENT_KIND:
        event_kind = _EVENT_KIND[status]
    elif message.strip():
        event_kind = "unverified"
    else:
        return
    section = _section_map(package).get(scene_id) or {}
    section_id, kc_ids = section.get("planSectionId"), section.get("kcIds") or [""]
    info, now, inserted = session_class(session_id), clock.now(), 0
    with LOCK, connect() as conn:
        for kc in kc_ids:
            cur = conn.execute("INSERT OR IGNORE INTO learning_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                               (new_id("ev"), student_id, session_id, section_id, kc, question_id, event_kind,
                                message.strip()[:200] or None, request_id, now))
            inserted += cur.rowcount
            if cur.rowcount and kc and update_mastery and event_kind in ("correct", "incorrect"):
                row = conn.execute("SELECT p_known FROM mastery WHERE student_id=? AND kc_id=?", (student_id, kc)).fetchone()
                p = bkt_update(row["p_known"] if row else PRIOR, event_kind == "correct")
                conn.execute("INSERT INTO mastery VALUES (?,?,?,?) ON CONFLICT(student_id, kc_id) DO UPDATE SET p_known=excluded.p_known, "
                             "updated_at=excluded.updated_at", (student_id, kc, p, now))
    if inserted:
        bus.publish(f"teacher:{info['teacher_id']}", {"type": "metric_delta", "classId": info["id"], "studentId": student_id, "sectionId": section_id})


def list_lessons(student_id: str) -> List[Dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT s.id, s.ended_at FROM class_sessions s JOIN students st ON st.class_id = s.class_id "
            "JOIN knowledge_packages k ON k.session_id = s.id WHERE st.id=? ORDER BY s.ended_at DESC", (student_id,)).fetchall()
        done = {r["session_id"]: r["n"] for r in conn.execute(
            "SELECT session_id, COUNT(DISTINCT item_id) AS n FROM learning_events WHERE student_id=? AND kind != 'hint' GROUP BY session_id",
            (student_id,))}
    out = []
    for r in rows:
        package = get_package(r["id"])
        snapshot = package["snapshot"]
        subjects = [b.get("subject") for b in snapshot.get("boardSnapshots", []) if b.get("subject")]
        out.append({"sessionId": r["id"], "title": snapshot.get("lessonTitle") or "Bài học từ bảng", "subject": subjects[0] if subjects else None,
                    "endedAt": r["ended_at"], "total": len(session_questions(r["id"])), "done": done.get(r["id"], 0)})
    return out
