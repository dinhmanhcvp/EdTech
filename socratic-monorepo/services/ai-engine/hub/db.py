"""SQLite của hub: luôn dùng đúng tệp của student_context.py (đọc student_context.DB_PATH mỗi lần mở, nên cách ly DB trong conftest áp dụng luôn cho hub)."""
from __future__ import annotations

import json
import os
import secrets
import sqlite3
import threading
from pathlib import Path
from typing import Any

LOCK = threading.RLock()
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

SCHEMA = """
CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS classes (id TEXT PRIMARY KEY, name TEXT NOT NULL, subject TEXT NOT NULL, teacher_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, name TEXT NOT NULL, login_code TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS parent_links (token TEXT PRIMARY KEY, student_id TEXT NOT NULL, revoked_at REAL);
CREATE TABLE IF NOT EXISTS teaching_plans (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, subject TEXT NOT NULL, title TEXT NOT NULL, current_version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS teaching_plan_versions (plan_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (plan_id, version));
CREATE TABLE IF NOT EXISTS class_sessions (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, plan_id TEXT NOT NULL, plan_version INTEGER NOT NULL, board_id TEXT NOT NULL, status TEXT NOT NULL, started_at REAL NOT NULL, ended_at REAL);
CREATE TABLE IF NOT EXISTS board_pairings (code TEXT PRIMARY KEY, board_id TEXT NOT NULL, board_secret_hash TEXT NOT NULL, expires_at REAL NOT NULL, session_id TEXT);
CREATE TABLE IF NOT EXISTS knowledge_packages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE, request_id TEXT NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS learning_events (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, session_id TEXT NOT NULL, section_id TEXT, kc_id TEXT NOT NULL, item_id TEXT NOT NULL, kind TEXT NOT NULL, answer TEXT, request_id TEXT NOT NULL, created_at REAL NOT NULL, UNIQUE (student_id, request_id, kc_id));
CREATE TABLE IF NOT EXISTS mastery (student_id TEXT NOT NULL, kc_id TEXT NOT NULL, p_known REAL NOT NULL, updated_at REAL NOT NULL, PRIMARY KEY (student_id, kc_id));
CREATE TABLE IF NOT EXISTS parent_reports (student_id TEXT NOT NULL, week TEXT NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL, PRIMARY KEY (student_id, week));
CREATE INDEX IF NOT EXISTS idx_events_student ON learning_events (student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON learning_events (session_id, section_id);
CREATE TABLE IF NOT EXISTS console_links (console_teacher_id TEXT PRIMARY KEY, hub_teacher_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS class_links (console_class_id TEXT PRIMARY KEY, hub_class_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, title TEXT NOT NULL, subject TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL, current_version INTEGER NOT NULL, created_at REAL NOT NULL, updated_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS assignment_versions (assignment_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL, PRIMARY KEY (assignment_id, version));
CREATE TABLE IF NOT EXISTS assignment_pages (assignment_id TEXT NOT NULL, page INTEGER NOT NULL, path TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, PRIMARY KEY (assignment_id, page));
CREATE TABLE IF NOT EXISTS assignment_runs (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, assignment_id TEXT NOT NULL, version INTEGER NOT NULL, teacher_id TEXT NOT NULL, class_id TEXT NOT NULL, period_id TEXT, console_teacher_id TEXT, opened_at REAL NOT NULL, closed_at REAL, due_at REAL, status TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_runs_class ON assignment_runs (class_id, opened_at);
CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, student_id TEXT NOT NULL, question_id TEXT NOT NULL, version INTEGER NOT NULL, attempt INTEGER NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, mode TEXT NOT NULL, answer TEXT, photo_path TEXT, ocr TEXT, confirmed TEXT, grade TEXT, status TEXT NOT NULL, score REAL, phase TEXT NOT NULL, correction TEXT, created_at REAL NOT NULL, reviewed_at REAL, UNIQUE (student_id, request_id));
CREATE INDEX IF NOT EXISTS idx_submissions_run ON submissions (run_id, question_id, created_at);
CREATE TABLE IF NOT EXISTS resource_uses (period_id TEXT NOT NULL, assignment_id TEXT NOT NULL, class_id TEXT, opened_at REAL NOT NULL, PRIMARY KEY (period_id, assignment_id));
CREATE TABLE IF NOT EXISTS resource_annotations (period_id TEXT NOT NULL, assignment_id TEXT NOT NULL, page INTEGER NOT NULL, strokes TEXT NOT NULL, updated_at REAL NOT NULL, PRIMARY KEY (period_id, assignment_id, page));
"""


def db_path() -> Path:
    import student_context

    return Path(student_context.DB_PATH)


_READY: set = set()  # đường dẫn DB đã có schema hub (DB_PATH đổi trong bài kiểm thử, hoặc tệp mới tạo)


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5)
    conn.row_factory = sqlite3.Row
    if str(path) not in _READY:
        with LOCK:
            conn.executescript(SCHEMA)
            _READY.add(str(path))
    return conn


def init_db(seed: bool = True) -> None:
    with LOCK, connect() as conn:
        if seed and os.getenv("HUB_SEED", "true").lower() != "false" and conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0] == 0:
            from hub.seed import seed as run_seed

            run_seed(conn)


def new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4)}"


def new_login_code(conn: sqlite3.Connection) -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not conn.execute("SELECT 1 FROM students WHERE login_code=?", (code,)).fetchone():
            return code


def dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)


def loads(s: str) -> Any:
    return json.loads(s)
