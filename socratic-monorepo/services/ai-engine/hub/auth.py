"""Xác thực của hub: PIN giáo viên, mã đăng nhập học sinh, token bảng gắn với một tiết.

Khác `security.require_context_auth`: endpoint hub LUÔN kiểm token (kể cả khi chạy local), vì hub cần biết ai là giáo viên,
học sinh nào, bảng của tiết nào để kiểm quyền sở hữu.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import threading
from typing import Dict, Iterable, List, Optional, Set, Tuple

from fastapi import Header, HTTPException

from deploy_guard import is_production
from hub import clock
from hub.db import connect
from security import issue_token, verify_token

PIN_ITERATIONS = 120_000
USER_TTL_S = 28800
BOARD_TTL_S = 43200
LOCK_AFTER_FAILS = 5
LOCK_WINDOW_S = 60.0

# teacher_id → {"fails": [mốc sai], "pending": số lượt đang băm, "locked_until": mốc}
_FAILS: Dict[str, dict] = {}
_FAILS_LOCK = threading.Lock()


class LockedOut(Exception):
    pass


def require_secret() -> None:
    """Ở production, hub không cấp hay nhận token khi secret còn là mặc định công khai hoặc quá ngắn (ai cũng ký được)."""
    secret = os.getenv("STUDENT_CONTEXT_SECRET", "")
    if is_production() and (len(secret) < 32 or secret == "local-development-secret"):
        raise HTTPException(status_code=503, detail="hub_secret_not_configured")


def hash_pin(pin: str, salt_hex: Optional[str] = None) -> Tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, PIN_ITERATIONS)
    return digest.hex(), salt.hex()


def _reserve_attempt(teacher_id: str) -> dict:
    """Giữ chỗ cho một lượt thử TRƯỚC khi băm PIN (băm mất ~0,1 s): nhiều yêu cầu đồng thời không vượt quá 5 lượt."""
    with _FAILS_LOCK:
        now = clock.now()
        state = _FAILS.setdefault(teacher_id, {"fails": [], "pending": 0, "locked_until": 0.0})
        state["fails"] = [t for t in state["fails"] if now - t < LOCK_WINDOW_S]
        if state["locked_until"] > now or len(state["fails"]) + state["pending"] >= LOCK_AFTER_FAILS:
            raise LockedOut()
        state["pending"] += 1
        return state


def _finish_attempt(teacher_id: str, state: dict, ok: bool) -> None:
    with _FAILS_LOCK:
        state["pending"] -= 1
        if ok:
            _FAILS.pop(teacher_id, None)
            return
        now = clock.now()
        state["fails"].append(now)
        if len(state["fails"]) >= LOCK_AFTER_FAILS:
            state["locked_until"] = now + LOCK_WINDOW_S  # khóa 60 s tính từ lần sai thứ năm


def login_teacher(teacher_id: str, pin: str) -> Optional[dict]:
    require_secret()
    state = _reserve_attempt(teacher_id)
    ok = False
    try:
        with connect() as conn:
            row = conn.execute("SELECT id, name, pin_hash, pin_salt FROM teachers WHERE id=?", (teacher_id,)).fetchone()
        ok = bool(row) and hmac.compare_digest(hash_pin(pin, row["pin_salt"])[0], row["pin_hash"])
    finally:
        _finish_attempt(teacher_id, state, ok)
    if not ok:
        return None
    return {"token": issue_token("teacher", row["id"], USER_TTL_S), "teacher": {"id": row["id"], "name": row["name"]}}


def login_student(login_code: str) -> Optional[dict]:
    require_secret()
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
    require_secret()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="bearer_token_required")
    token = authorization.split(" ", 1)[1].strip()
    allowed: Set[str] = set(roles)
    try:
        claims = verify_token(token)
    except HTTPException:
        # không phải token hub: có thể là phiên đăng nhập của trang quản lý (console) — chỉ cho vai trò giáo viên
        if "teacher" in allowed:
            from hub.assignments import bridge

            console_teacher = bridge.console_session(token)
            if console_teacher:
                return {"role": "teacher", "subject": bridge.hub_teacher_for_console(console_teacher), "console": console_teacher["id"]}
        raise
    if claims["role"] not in allowed:
        raise HTTPException(status_code=403, detail="insufficient_role")
    if not _subject_exists(claims["role"], claims["subject"], allow_closed):
        raise HTTPException(status_code=401, detail="board_session_closed" if claims["role"] == "board" else "unknown_subject")
    return {"role": claims["role"], "subject": claims["subject"]}


def require_hub(*roles: str, allow_closed: bool = False):
    def dependency(authorization: Optional[str] = Header(default=None)) -> dict:
        return claims_from_header(authorization, roles, allow_closed)

    return dependency
