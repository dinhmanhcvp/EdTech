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
"""


def db_path() -> Path:
    import student_context

    return Path(student_context.DB_PATH)


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(seed: bool = True) -> None:
    with LOCK, connect() as conn:
        conn.executescript(SCHEMA)
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
