"""Tài nguyên mở trên bảng theo tiết console: lượt mở (để học sinh lớp đó xem lại), nét viết đè theo tiết, gói cuối tiết."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from hub import clock
from hub.db import LOCK, connect, dumps, loads
from hub.assignments import bridge, runs, store

MAX_STROKES = 500


def record_use(period_id: str, assignment_id: str, class_id: Optional[str]) -> None:
    with LOCK, connect() as conn:
        conn.execute("INSERT OR IGNORE INTO resource_uses VALUES (?,?,?,?)", (period_id, assignment_id, class_id, clock.now()))


def student_can_see(student_id: str, assignment_id: str) -> bool:
    """Tài nguyên đã mở trong một tiết ĐÃ KẾT THÚC của lớp em (giữa tiết giáo viên có thể mở đề của lớp khác để xem trước)."""
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
        uses = conn.execute("SELECT * FROM resource_uses WHERE assignment_id=? AND class_id=?",
                            (assignment_id, row["class_id"])).fetchall() if row else []
    return any(_period_ended(u) for u in uses)


def _valid_point(p: Any) -> bool:
    return isinstance(p, list) and len(p) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in p)


def check_strokes(strokes: List[Dict[str, Any]], limit: int = MAX_STROKES) -> List[Dict[str, Any]]:
    """Nét trong tọa độ 0–1 theo ảnh trang; chỉ giữ p/c/w."""
    if len(strokes) > limit:
        raise ValueError("too_many_strokes")
    out = []
    for s in strokes:
        pts = s.get("p") if isinstance(s, dict) else None
        if not isinstance(pts, list) or not pts or len(pts) > 1500 or not all(_valid_point(p) for p in pts):
            raise ValueError("bad_stroke")
        color = str(s.get("c") or "#1f2937")[:16]
        width = float(s.get("w") or 3)
        out.append({"p": pts, "c": color, "w": max(0.5, min(width, 40.0))})
    return out


def get_annotations(period_id: str, assignment_id: str, page: int) -> List[Dict[str, Any]]:
    with connect() as conn:
        row = conn.execute("SELECT strokes FROM resource_annotations WHERE period_id=? AND assignment_id=? AND page=?",
                           (period_id, assignment_id, page)).fetchone()
    return loads(row["strokes"]) if row else []


def save_annotations(period_id: str, assignment_id: str, page: int, strokes: List[Dict[str, Any]]) -> None:
    clean = check_strokes(strokes)
    with LOCK, connect() as conn:
        conn.execute("INSERT INTO resource_annotations VALUES (?,?,?,?,?) ON CONFLICT(period_id, assignment_id, page) DO UPDATE SET "
                     "strokes=excluded.strokes, updated_at=excluded.updated_at", (period_id, assignment_id, page, dumps(clean), clock.now()))


def _class_of(student_id: str) -> Optional[str]:
    with connect() as conn:
        row = conn.execute("SELECT class_id FROM students WHERE id=?", (student_id,)).fetchone()
    return row["class_id"] if row else None


def _period_title(teacher_id: str, period_id: str) -> Optional[Dict[str, Any]]:
    console_tid = bridge.console_teacher_for_hub(teacher_id)
    return bridge.period_info(console_tid, period_id) if console_tid else None


def _resource_item(r) -> Dict[str, Any]:
    a = store.get(r["assignment_id"])
    info = _period_title(a["teacherId"], r["period_id"]) or {}
    return {"assignmentId": a["id"], "title": a["title"], "kind": a["kind"], "pages": a["pages"], "openedAt": r["opened_at"],
            "periodId": r["period_id"], "periodTitle": info.get("title", "")}


def _period_ended(use) -> bool:
    try:
        info = _period_title(store.get(use["assignment_id"])["teacherId"], use["period_id"])
    except KeyError:
        return False
    return bool(info) and info["status"] == "ended"


def my_resources(student_id: str) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM resource_uses WHERE class_id=? ORDER BY opened_at DESC", (_class_of(student_id) or "",)).fetchall()
    out = []
    for r in rows:
        if not _period_ended(r):
            continue
        try:
            out.append(_resource_item(r))
        except KeyError:  # tài nguyên đã bị xóa
            continue
    return out


def my_periods(student_id: str) -> List[Dict[str, Any]]:
    """Gói cuối tiết: các tiết console ĐÃ KẾT THÚC của lớp em, kèm bài tập (kết quả của em, phần chữa) và tài nguyên đã mở."""
    from hub.assignments import metrics as asg_metrics

    class_id = _class_of(student_id)
    if not class_id:
        return []
    with connect() as conn:
        pairs = conn.execute("SELECT DISTINCT period_id, teacher_id FROM assignment_runs WHERE class_id=? AND period_id IS NOT NULL", (class_id,)).fetchall()
        uses = conn.execute("SELECT * FROM resource_uses WHERE class_id=? ORDER BY opened_at", (class_id,)).fetchall()
    teacher_of = {p["period_id"]: p["teacher_id"] for p in pairs}
    for u in uses:
        if u["period_id"] not in teacher_of:
            try:
                teacher_of[u["period_id"]] = store.get(u["assignment_id"])["teacherId"]
            except KeyError:
                continue
    runs_by_period: Dict[str, List[Dict[str, Any]]] = {}
    for item in asg_metrics.my_assignments(student_id):
        pid = runs.get(item["runId"])["periodId"]
        if pid:
            runs_by_period.setdefault(pid, []).append({**item, "lessonAvailable": item["phase"] == "closed"})
    out = []
    for pid, teacher_id in teacher_of.items():
        info = _period_title(teacher_id, pid)
        if not info or info["status"] != "ended":
            continue
        resources = []
        for u in uses:
            if u["period_id"] == pid:
                try:
                    resources.append(_resource_item(u))
                except KeyError:
                    continue
        out.append({"periodId": pid, "title": info["title"], "endedAt": info["ended_at"], "runs": runs_by_period.get(pid, []), "resources": resources})
    return sorted(out, key=lambda p: -(p["endedAt"] or 0))


def period_summary(teacher_id: str, period_id: str) -> Dict[str, Any]:
    """Tổng kết một tiết console cho giáo viên: lượt giao + chỉ số, tài nguyên đã mở, bài chờ duyệt, học sinh cần hỗ trợ."""
    from hub import metrics as hub_metrics
    from hub.assignments import metrics as asg_metrics

    with connect() as conn:
        run_ids = [r["id"] for r in conn.execute("SELECT id FROM assignment_runs WHERE teacher_id=? AND period_id=? ORDER BY opened_at",
                                                  (teacher_id, period_id))]
        uses = conn.execute("SELECT * FROM resource_uses WHERE period_id=? ORDER BY opened_at", (period_id,)).fetchall()
    items = []
    class_id = None
    for rid in run_ids:
        run = runs.get(rid)
        class_id = class_id or run["classId"]
        items.append({**runs.run_view(run), "title": store.get(run["assignmentId"])["title"], "metrics": asg_metrics.run_metrics(run)})
    support = []
    if class_id:
        with connect() as conn:
            students = [r["id"] for r in conn.execute("SELECT id FROM students WHERE class_id=?", (class_id,))]
        support = [{"studentId": m["studentId"], "name": m["name"], "reasons": m["supportReasons"]}
                   for m in (hub_metrics.student_metrics(s) for s in students) if m["needsSupport"]]
    return {"periodId": period_id, "runs": items, "resources": [_resource_item(u) for u in uses],
            "pending": sum(q["pending"] for it in items for q in it["metrics"]["questions"]), "needsSupport": support}
