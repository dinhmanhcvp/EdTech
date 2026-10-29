"""Xác thực của hub: PIN giáo viên, mã đăng nhập học sinh, token bảng gắn với một tiết.

Khác `security.require_context_auth`: endpoint hub LUÔN kiểm token (kể cả khi chạy local), vì hub cần biết ai là giáo viên,
học sinh nào, bảng của tiết nào để kiểm quyền sở hữu.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Dict, Iterable, List, Optional, Set, Tuple

from fastapi import Header, HTTPException

from hub import clock
from hub.db import connect
from security import issue_token, verify_token

PIN_ITERATIONS = 120_000
USER_TTL_S = 28800
BOARD_TTL_S = 43200
LOCK_AFTER_FAILS = 5
LOCK_WINDOW_S = 60.0

_FAILS: Dict[str, List[float]] = {}


class LockedOut(Exception):
    pass


def hash_pin(pin: str, salt_hex: Optional[str] = None) -> Tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, PIN_ITERATIONS)
    return digest.hex(), salt.hex()


def _recent_fails(teacher_id: str) -> List[float]:
    now = clock.now()
    fails = [t for t in _FAILS.get(teacher_id, []) if now - t < LOCK_WINDOW_S]
    _FAILS[teacher_id] = fails
    return fails


def login_teacher(teacher_id: str, pin: str) -> Optional[dict]:
    if len(_recent_fails(teacher_id)) >= LOCK_AFTER_FAILS:
        raise LockedOut()
    with connect() as conn:
        row = conn.execute("SELECT id, name, pin_hash, pin_salt FROM teachers WHERE id=?", (teacher_id,)).fetchone()
    if not row or not hmac.compare_digest(hash_pin(pin, row["pin_salt"])[0], row["pin_hash"]):
        _FAILS.setdefault(teacher_id, []).append(clock.now())
        return None
    _FAILS.pop(teacher_id, None)
    return {"token": issue_token("teacher", row["id"], USER_TTL_S), "teacher": {"id": row["id"], "name": row["name"]}}


def login_student(login_code: str) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute(
            "SELECT s.id, s.name, s.class_id, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.login_code=?",
            (login_code.strip().upper(),),
        ).fetchone()
    if not row:
        return None
    return {"token": issue_token("student", row["id"], USER_TTL_S),
            "student": {"id": row["id"], "name": row["name"], "classId": row["class_id"], "className": row["class_name"]}}


def issue_board_token(session_id: str) -> str:
    return issue_token("board", session_id, BOARD_TTL_S)


def _subject_exists(role: str, subject: str, allow_closed: bool) -> bool:
    with connect() as conn:
        if role == "teacher":
            return conn.execute("SELECT 1 FROM teachers WHERE id=?", (subject,)).fetchone() is not None
        if role == "student":
            return conn.execute("SELECT 1 FROM students WHERE id=?", (subject,)).fetchone() is not None
        row = conn.execute("SELECT status, started_at FROM class_sessions WHERE id=?", (subject,)).fetchone()
    if not row or row["started_at"] < clock.now() - BOARD_TTL_S:
        return False
    return allow_closed or row["status"] == "live"


def claims_from_header(authorization: Optional[str], roles: Iterable[str], allow_closed: bool = False) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="bearer_token_required")
    claims = verify_token(authorization.split(" ", 1)[1].strip())
    allowed: Set[str] = set(roles)
    if claims["role"] not in allowed:
        raise HTTPException(status_code=403, detail="insufficient_role")
    if not _subject_exists(claims["role"], claims["subject"], allow_closed):
        raise HTTPException(status_code=401, detail="board_session_closed" if claims["role"] == "board" else "unknown_subject")
    return {"role": claims["role"], "subject": claims["subject"]}


def require_hub(*roles: str, allow_closed: bool = False):
    def dependency(authorization: Optional[str] = Header(default=None)) -> dict:
        return claims_from_header(authorization, roles, allow_closed)

    return dependency
