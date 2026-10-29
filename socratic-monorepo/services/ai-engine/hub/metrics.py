"""Chỉ số tính khi đọc từ learning_events và mastery (không lưu số phái sinh nên không lệch dữ liệu).

Một lượt làm bài có thể ghi nhiều dòng event (mỗi KC một dòng): mọi phép đếm theo lượt đều gộp theo request_id.
"""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Optional

from formula_check import latex_to_plain
from hub import learning, plans
from hub.db import connect
from hub.grading import PRIOR, bkt_update

GAP_CAP_S = 300
LOW_MASTERY = 0.4
MIN_GRADED = 3
GRADED = ("correct", "incorrect")


def _turns(student_id: str, where: str = "", args: tuple = ()) -> List[Dict]:
    """Các lượt (gộp theo request_id) của học sinh, theo thời gian."""
    with connect() as conn:
        rows = conn.execute(
            f"SELECT request_id, MIN(created_at) AS t, session_id, section_id, item_id, kind, answer, GROUP_CONCAT(kc_id) AS kcs "
            f"FROM learning_events WHERE student_id=? {where} GROUP BY request_id ORDER BY t", (student_id, *args)).fetchall()
    return [dict(r, kcs=[k for k in (r["kcs"] or "").split(",") if k]) for r in rows]


def mastery_at(student_id: str, kc_id: str, ts: float) -> float:
    with connect() as conn:
        rows = conn.execute("SELECT kind FROM learning_events WHERE student_id=? AND kc_id=? AND kind IN ('correct','incorrect') "
                            "AND created_at <= ? ORDER BY created_at", (student_id, kc_id, ts)).fetchall()
    p = PRIOR
    for r in rows:
        p = bkt_update(p, r["kind"] == "correct")
    return p


def _mastery(student_id: str) -> Dict[str, float]:
    with connect() as conn:
        return {r["kc_id"]: r["p_known"] for r in conn.execute("SELECT kc_id, p_known FROM mastery WHERE student_id=?", (student_id,))}


def _first_try_rate(turns: List[Dict]) -> Optional[float]:
    first: Dict[str, str] = {}
    for t in turns:
        if t["kind"] in GRADED:
            first.setdefault(t["item_id"], t["kind"])
    return sum(k == "correct" for k in first.values()) / len(first) if first else None


def _minutes(turns: List[Dict]) -> float:
    by_session: Dict[str, List[float]] = defaultdict(list)
    for t in turns:
        by_session[t["session_id"]].append(t["t"])
    seconds = sum(min(b - a, GAP_CAP_S) for ts in by_session.values() for a, b in zip(ts, ts[1:]))
    return round(seconds / 60, 1)


def _support_reasons(turns: List[Dict], mastery: Dict[str, float], kcs: Optional[set] = None) -> List[str]:
    graded = [t for t in turns if t["kind"] in GRADED]
    per_kc: Dict[str, int] = defaultdict(int)
    for t in graded:
        for kc in t["kcs"]:
            per_kc[kc] += 1
    reasons = [f"low_mastery:{kc}" for kc, n in sorted(per_kc.items())
               if n >= MIN_GRADED and mastery.get(kc, PRIOR) < LOW_MASTERY and (kcs is None or kc in kcs)]
    if len(graded) >= 3 and all(t["kind"] == "incorrect" for t in graded[-3:]):
        reasons.append("three_wrong_in_a_row")
    return reasons


def _class_sessions(class_id: str) -> List[str]:
    with connect() as conn:
        rows = conn.execute("SELECT s.id FROM class_sessions s JOIN knowledge_packages k ON k.session_id = s.id WHERE s.class_id=?",
                            (class_id,)).fetchall()
    return [r["id"] for r in rows]


def _class_total(class_id: str) -> int:
    return sum(len(learning.session_questions(sid)) for sid in _class_sessions(class_id))


def student_metrics(student_id: str, total: Optional[int] = None) -> Dict:
    with connect() as conn:
        row = conn.execute("SELECT name, class_id FROM students WHERE id=?", (student_id,)).fetchone()
    turns = _turns(student_id)
    mastery = _mastery(student_id)
    done = len({t["item_id"] for t in turns if t["kind"] != "hint"})
    hints = sum(t["kind"] == "hint" for t in turns)
    reasons = _support_reasons(turns, mastery)
    return {"studentId": student_id, "name": row["name"], "mastery": mastery, "done": done,
            "total": _class_total(row["class_id"]) if total is None else total,
            "firstTryRate": _first_try_rate(turns), "hintsPerItem": round(hints / done, 2) if done else 0.0,
            "minutes": _minutes(turns), "lastActive": turns[-1]["t"] if turns else None,
            "needsSupport": bool(reasons), "supportReasons": reasons}


def _norm_answer(answer: str) -> str:
    return re.sub(r"\s+", "", latex_to_plain(answer or "")).lower()


def section_metrics(plan_id: str, section_id: str, class_id: str) -> Dict:
    section = next((s for s in plans.get_plan(plan_id)["body"]["sections"] if s["id"] == section_id), None)
    if section is None:
        raise KeyError(section_id)
    kcs = {k["id"] for k in section.get("kcs", [])}
    with connect() as conn:
        students = [r["id"] for r in conn.execute("SELECT id FROM students WHERE class_id=?", (class_id,))]
        sessions = [r["id"] for r in conn.execute("SELECT id FROM class_sessions WHERE class_id=? AND plan_id=?", (class_id, plan_id))]
    marks = ",".join("?" * len(sessions)) or "''"
    where = f"AND section_id=? AND session_id IN ({marks})"
    attempted, first, hints, attempted_items, needs, wrong = 0, [], 0, 0, [], {}
    for sid in students:
        turns = _turns(sid, where, (section_id, *sessions))
        items = {t["item_id"] for t in turns if t["kind"] != "hint"}
        attempted += bool(items)
        attempted_items += len(items)
        hints += sum(t["kind"] == "hint" for t in turns)
        seen: Dict[str, str] = {}
        for t in turns:
            if t["kind"] in GRADED:
                seen.setdefault(t["item_id"], t["kind"])
            if t["kind"] == "incorrect" and t["answer"]:
                key = _norm_answer(t["answer"])
                shown, count = wrong.get(key, (t["answer"], 0))
                wrong[key] = (shown, count + 1)
        first.extend(seen.values())
        if _support_reasons(turns, _mastery(sid), kcs):
            needs.append(sid)
    avg = {kc: sum(_mastery(s).get(kc, PRIOR) for s in students) / len(students) for kc in kcs} if students else {}
    top = sorted(wrong.values(), key=lambda v: -v[1])[:5]
    return {"sectionId": section_id,
            "attemptedRate": attempted / len(students) if students else 0.0,
            "firstTryRate": sum(k == "correct" for k in first) / len(first) if first else None,
            "avgHints": round(hints / attempted_items, 2) if attempted_items else 0.0,
            "weakestKc": min(avg, key=avg.get) if avg else None,
            "needsSupport": needs,
            "wrongAnswers": [{"answer": a, "count": n} for a, n in top]}


def class_metrics(class_id: str, teacher_id: str) -> Dict:
    with connect() as conn:
        students = [r["id"] for r in conn.execute("SELECT id FROM students WHERE class_id=? ORDER BY rowid", (class_id,))]
    total = _class_total(class_id)
    per_student = [student_metrics(s, total) for s in students]
    labels: Dict[str, str] = {}
    for p in plans.list_plans(teacher_id):
        for section in plans.get_plan(p["id"])["body"]["sections"]:
            for kc in section.get("kcs", []):
                labels.setdefault(kc["id"], kc["label"])
    done = sum(m["done"] for m in per_student)
    return {"classId": class_id, "kcs": [{"id": k, "label": v} for k, v in labels.items()], "students": per_student,
            "heatmap": {m["studentId"]: m["mastery"] for m in per_student},
            "progress": done / (total * len(students)) if total and students else 0.0}
