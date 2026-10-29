"""Nối trang quản lý (console của teammate) với hub, không sửa luồng của console.

Console giữ tài khoản giáo viên, lớp (chỉ sĩ số), tiết và mã ghép bảng; hub giữ học sinh thật, bài tập, bài nộp, chỉ số.
Mỗi giáo viên console có một giáo viên hub liên kết (không đăng nhập PIN được), mỗi lớp console có một lớp hub liên kết.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from fastapi import Header, HTTPException

from hub.db import LOCK, connect
from store.console_db import db as console_db


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9-]", "-", value.lower())[:24]


def hub_teacher_for_console(console_teacher: Dict[str, Any]) -> str:
    with LOCK, connect() as conn:
        row = conn.execute("SELECT hub_teacher_id FROM console_links WHERE console_teacher_id=?", (console_teacher["id"],)).fetchone()
        if row:
            return row["hub_teacher_id"]
        hub_id = f"ct-{_slug(console_teacher['id'])}"
        name = console_teacher.get("display_name") or console_teacher.get("username") or "Giáo viên"
        # pin_hash/pin_salt rỗng: không bao giờ khớp hash_pin, nên tài khoản này chỉ vào được qua phiên console
        conn.execute("INSERT OR IGNORE INTO teachers VALUES (?,?,?,?)", (hub_id, name, "", ""))
        conn.execute("INSERT INTO console_links VALUES (?,?)", (console_teacher["id"], hub_id))
        return hub_id


def console_teacher_for_hub(hub_teacher_id: str) -> Optional[str]:
    with connect() as conn:
        row = conn.execute("SELECT console_teacher_id FROM console_links WHERE hub_teacher_id=?", (hub_teacher_id,)).fetchone()
    return row["console_teacher_id"] if row else None


def link_class(hub_teacher_id: str, console_class: Dict[str, Any]) -> str:
    with LOCK, connect() as conn:
        row = conn.execute("SELECT hub_class_id FROM class_links WHERE console_class_id=?", (console_class["id"],)).fetchone()
        if row:
            return row["hub_class_id"]
        hub_id = f"cc-{_slug(console_class['id'])}"
        conn.execute("INSERT OR IGNORE INTO classes VALUES (?,?,?,?)",
                     (hub_id, console_class.get("name") or "Lớp", console_class.get("subject") or "", hub_teacher_id))
        conn.execute("INSERT INTO class_links VALUES (?,?)", (console_class["id"], hub_id))
        return hub_id


def console_session(token: str) -> Optional[Dict[str, Any]]:
    """Giáo viên console của một phiên đăng nhập console (None nếu không phải / hết hạn)."""
    return console_db().session_teacher(token) if token else None


def board_context(board_token: str) -> Dict[str, Any]:
    """Tiết console đang live gắn với bảng: {period, consoleTeacherId, hubTeacherId, hubClassId}. Không có → KeyError."""
    period = console_db().period_by_board(board_token or "")
    if not period:
        raise KeyError("board_not_paired")
    console_tid = period["teacher_id"]
    hub_tid = hub_teacher_for_console(console_db().teacher(console_tid))
    hub_class = None
    if period.get("class_id"):
        console_class = console_db().get_class(console_tid, period["class_id"])
        hub_class = link_class(hub_tid, console_class) if console_class else None
    return {"period": period, "consoleTeacherId": console_tid, "hubTeacherId": hub_tid, "hubClassId": hub_class}


def period_status(console_teacher_id: str, period_id: str) -> Optional[Dict[str, Any]]:
    p = console_db().get_period(console_teacher_id, period_id)
    return {"status": p["status"], "ended_at": p.get("ended_at")} if p else None


def require_board(x_board_token: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    try:
        return board_context(x_board_token or "")
    except KeyError:
        raise HTTPException(status_code=401, detail="board_not_paired")
