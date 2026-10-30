"""Durable, deterministic Student Board context store."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("STUDENT_CONTEXT_DB", str(ROOT / ".data" / "student_context.sqlite3")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
_LOCK = threading.RLock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init_store() -> None:
    with _LOCK, _connect() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS student_profiles (student_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS student_errors (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, concept TEXT NOT NULL, diagnosis TEXT NOT NULL, subject TEXT NOT NULL, occurrences INTEGER NOT NULL DEFAULT 1, last_seen REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS student_events (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, event_type TEXT NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS classroom_snapshots (class_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at REAL NOT NULL);
        """)


def _default_profile() -> Dict[str, Any]:
    return {"profile_id": "FOUNDATION", "display_name": "Student", "scaffold_depth": 3, "pace": "medium", "difficulty": "THPT_STANDARD", "visual_first": False}


def get_profile(student_id: str) -> Dict[str, Any]:
    with _LOCK, _connect() as conn:
        row = conn.execute("SELECT payload FROM student_profiles WHERE student_id = ?", (student_id,)).fetchone()
    return json.loads(row["payload"]) if row else _default_profile()


def save_profile(student_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    clean = _default_profile()
    clean.update({k: v for k, v in payload.items() if k in clean})
    clean["scaffold_depth"] = max(1, min(5, int(clean.get("scaffold_depth", 3))))
    with _LOCK, _connect() as conn:
        conn.execute("INSERT INTO student_profiles(student_id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(student_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at", (student_id, json.dumps(clean, ensure_ascii=False), time.time()))
    return clean


def record_error(student_id: str, subject: str, concept: str, diagnosis: str) -> Dict[str, Any]:
    concept, diagnosis, subject = concept.strip()[:160], diagnosis.strip()[:500], subject.strip().upper()[:24]
    if not concept or not diagnosis:
        raise ValueError("concept_and_diagnosis_required")
    with _LOCK, _connect() as conn:
        row = conn.execute("SELECT id, occurrences FROM student_errors WHERE student_id=? AND concept=?", (student_id, concept)).fetchone()
        if row:
            occurrences = row["occurrences"] + 1
            conn.execute("UPDATE student_errors SET occurrences=?, diagnosis=?, last_seen=? WHERE id=?", (occurrences, diagnosis, time.time(), row["id"]))
            error_id = row["id"]
        else:
            error_id, occurrences = f"err_{uuid.uuid4().hex[:10]}", 1
            conn.execute("INSERT INTO student_errors VALUES(?,?,?,?,?,?,?)", (error_id, student_id, concept, diagnosis, subject, occurrences, time.time()))
    return {"id": error_id, "student_id": student_id, "subject": subject, "concept": concept, "diagnosis": diagnosis, "occurrences": occurrences}


def list_errors(student_id: str, limit: int = 12) -> List[Dict[str, Any]]:
    with _LOCK, _connect() as conn:
        rows = conn.execute("SELECT id,subject,concept,diagnosis,occurrences,last_seen FROM student_errors WHERE student_id=? ORDER BY last_seen DESC LIMIT ?", (student_id, limit)).fetchall()
    return [dict(row) for row in rows]


def record_event(student_id: str, event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    event = {"id": f"evt_{uuid.uuid4().hex[:10]}", "student_id": student_id, "event_type": event_type[:60], "payload": payload, "created_at": time.time()}
    with _LOCK, _connect() as conn:
        conn.execute("INSERT INTO student_events VALUES(?,?,?,?,?)", (event["id"], student_id, event["event_type"], json.dumps(payload, ensure_ascii=False), event["created_at"]))
    return event


def roadmap(student_id: str) -> Dict[str, Any]:
    profile, errors = get_profile(student_id), list_errors(student_id, 3)
    focus = errors[0]["concept"] if errors else "chuyển đổi công thức và kiểm tra điều kiện biên"
    return {"student_id": student_id, "profile": profile, "focus_concept": focus, "steps": [{"order": 1, "title": "Ôn lại điểm kẹt", "detail": f"Đối chiếu lại: {focus} trong 5 phút."}, {"order": 2, "title": "Một câu kiểm tra bẫy", "detail": "Làm một câu Đúng/Sai và giải thích điều kiện biên."}, {"order": 3, "title": "Bài mở rộng", "detail": f"Thử cấp độ {profile.get('difficulty', 'THPT_STANDARD')} với một biến đổi mới."}], "generated_at": time.time()}


def _fallback_snapshot(student_id: str) -> Dict[str, Any]:
    return {"sessionId": "demo-12a1-today", "className": "12A1", "lessonTitle": "Từ bảng lớp đến bài làm cá nhân", "updatedAt": "Hôm nay · backend", "boardSnapshots": [{"id": "board-rlc", "kind": "BOARD", "title": "Giản đồ Fresnel RLC", "subject": "PHYSICS", "latex": "\\vec{U} = \\vec{U}_R + \\vec{U}_L + \\vec{U}_C", "templateId": "PHYS_RLC_PHASOR", "note": "Cộng vector theo pha; không cộng đại số độ lớn.", "parameters": {"omega": 200, "R": 50}}, {"id": "board-friction", "kind": "SLIDE", "title": "Công của lực ma sát", "subject": "PHYSICS", "latex": "A_{ms} = -\\mu mg\\cos\\alpha \\cdot s", "templateId": "PHYS_INCLINED", "note": "Dấu âm biểu diễn lực ma sát ngược chiều chuyển động.", "parameters": {"alpha": 30, "mu": 0.2}}, {"id": "board-redox", "kind": "BOARD", "title": "Bảo toàn electron trong Fe₃O₄", "subject": "CHEMISTRY", "latex": "\\bar{x}_{Fe} = +\\frac{8}{3}", "templateId": "CHEM_BALANCE_SCALE", "note": "Số oxi hóa trung bình của Fe trong Fe₃O₄ là +8/3.", "parameters": {"Fe": 3, "O": 4}}], "studentWork": [], "studentId": student_id}


def save_snapshot(class_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**payload, "classId": class_id, "updatedAt": payload.get("updatedAt") or time.time()}
    with _LOCK, _connect() as conn:
        conn.execute("INSERT INTO classroom_snapshots(class_id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(class_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at", (class_id, json.dumps(payload, ensure_ascii=False), time.time()))
    return payload


def get_snapshot(class_id: str) -> Optional[Dict[str, Any]]:
    with _LOCK, _connect() as conn:
        row = conn.execute("SELECT payload FROM classroom_snapshots WHERE class_id=?", (class_id,)).fetchone()
    return json.loads(row["payload"]) if row else None


def context_snapshot(student_id: str, class_id: str = "12A1") -> Dict[str, Any]:
    with _LOCK, _connect() as conn:
        row = conn.execute("SELECT payload FROM classroom_snapshots WHERE class_id=?", (class_id,)).fetchone()
    payload = json.loads(row["payload"]) if row else _fallback_snapshot(student_id)
    payload["studentId"] = student_id
    return payload


def store_ready() -> bool:
    try:
        with _LOCK, _connect() as conn: conn.execute("SELECT 1")
        return True
    except Exception: return False


init_store()
