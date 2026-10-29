"""Cạnh 1↔2: ghép bảng bằng QR, tiết học, giáo án realtime tới bảng; cạnh 2→3: gói tri thức cuối tiết."""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from typing import Dict, List, Optional

import student_context
from hub import clock, plans
from hub.auth import issue_board_token
from hub.db import CODE_ALPHABET, LOCK, connect, dumps, loads, new_id
from hub.events import bus
from hub.roster import owned_class
from hub.schemas import strip_answers

PAIRING_TTL_S = 120


class PairingGone(Exception):
    pass


class SessionClosed(Exception):
    pass


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def create_pairing(board_id: Optional[str]) -> Dict:
    if not board_id or not re.fullmatch(r"board-[a-z0-9]{8}", board_id):
        board_id = f"board-{secrets.token_hex(4)}"
    secret = secrets.token_urlsafe(24)
    expires_at = clock.now() + PAIRING_TTL_S
    with LOCK, connect() as conn:
        while True:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
            if not conn.execute("SELECT 1 FROM board_pairings WHERE code=?", (code,)).fetchone():
                break
        conn.execute("INSERT INTO board_pairings VALUES (?,?,?,?,NULL)", (code, board_id, _hash(secret), expires_at))
    return {"code": code, "boardId": board_id, "boardSecret": secret, "expiresAt": expires_at}


def _session_status(conn, session_id: Optional[str]) -> Optional[str]:
    if not session_id:
        return None
    row = conn.execute("SELECT status FROM class_sessions WHERE id=?", (session_id,)).fetchone()
    return row["status"] if row else None


def check_pairing_secret(code: str, secret: str) -> Dict:
    """Bản ghi mã ghép khi secret đúng. Mã đã ghép mà tiết còn live vẫn hợp lệ (bảng mở luồng chờ muộn)."""
    with connect() as conn:
        row = conn.execute("SELECT * FROM board_pairings WHERE code=?", (code,)).fetchone()
        if not row:
            raise PairingGone(code)
        if not hmac.compare_digest(_hash(secret), row["board_secret_hash"]):
            raise PermissionError(code)
        status = _session_status(conn, row["session_id"])
    if row["session_id"]:
        if status != "live":
            raise PairingGone(code)
    elif row["expires_at"] < clock.now():
        raise PairingGone(code)
    return dict(row)


def claim(code: str, teacher_id: str, class_id: str, plan_id: str) -> Dict:
    owned_class(teacher_id, class_id)
    plan = plans.owned_plan(teacher_id, plan_id)
    with LOCK:
        with connect() as conn:
            row = conn.execute("SELECT * FROM board_pairings WHERE code=?", (code,)).fetchone()
            if not row or row["session_id"] or row["expires_at"] < clock.now():
                raise PairingGone(code)
            session_id = new_id("sess")
            conn.execute("INSERT INTO class_sessions VALUES (?,?,?,?,?,'live',?,NULL)",
                         (session_id, class_id, plan_id, plan["version"], row["board_id"], clock.now()))
            conn.execute("UPDATE board_pairings SET session_id=? WHERE code=?", (session_id, code))
    bus.publish(f"pairing:{code}", paired_event(session_id))
    return {"sessionId": session_id}


def session_class(session_id: str) -> Dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT c.id, c.name, c.teacher_id, s.plan_id, s.plan_version, s.status, s.started_at, s.ended_at "
            "FROM class_sessions s JOIN classes c ON c.id = s.class_id WHERE s.id=?", (session_id,)).fetchone()
    if not row:
        raise KeyError(session_id)
    return dict(row)


def session_plan(session_id: str) -> Dict:
    info = session_class(session_id)
    plan = plans.get_plan(info["plan_id"])
    with LOCK, connect() as conn:
        conn.execute("UPDATE class_sessions SET plan_version=? WHERE id=?", (plan["version"], session_id))
    return {"planId": plan["id"], "version": plan["version"], "body": strip_answers(plan["body"])}


def paired_event(session_id: str) -> Dict:
    info = session_class(session_id)
    plan = session_plan(session_id)
    return {"type": "paired", "boardToken": issue_board_token(session_id),
            "session": {"id": session_id, "startedAt": info["started_at"]},
            "class": {"id": info["id"], "name": info["name"]},
            "plan": {"id": plan["planId"], "version": plan["version"], "body": plan["body"]}}


def live_sessions_for_plan(plan_id: str) -> List[str]:
    with connect() as conn:
        rows = conn.execute("SELECT id FROM class_sessions WHERE plan_id=? AND status='live'", (plan_id,)).fetchall()
    return [r["id"] for r in rows]


def _notify_boards(plan_id: str, version: int) -> None:
    for session_id in live_sessions_for_plan(plan_id):
        bus.publish(f"board:{session_id}", {"type": "plan_updated", "version": version})


plans.on_saved = _notify_boards


def get_package(session_id: str) -> Optional[Dict]:
    with connect() as conn:
        row = conn.execute("SELECT payload FROM knowledge_packages WHERE session_id=?", (session_id,)).fetchone()
    return loads(row["payload"]) if row else None


def _check_plan_match(info: Dict, package: Dict) -> None:
    """Gói phải nói về đúng giáo án của tiết (version đã có, phần và KC có thật); nếu không, mọi lần dựng bài học sau đó đều lỗi."""
    if package["planId"] != info["plan_id"]:
        raise ValueError("package_plan_mismatch")
    if not 1 <= package["planVersion"] <= plans.get_plan(info["plan_id"])["version"]:
        raise ValueError("package_plan_version_unknown")
    body = plans.get_plan(info["plan_id"], package["planVersion"])["body"]
    kcs = {s["id"]: {k["id"] for k in s.get("kcs", [])} for s in body["sections"]}
    for section in package.get("sections", []):
        plan_section = section.get("planSectionId")
        if plan_section is not None and plan_section not in kcs:
            raise ValueError("package_section_unknown")
        allowed = kcs[plan_section] if plan_section else set().union(*kcs.values())
        if not set(section.get("kcIds") or []) <= allowed:
            raise ValueError("package_kc_unknown")


def save_package(session_id: str, request_id: str, package: Dict) -> Dict:
    if package.get("sessionId") != session_id:
        raise ValueError("session_mismatch")
    info = session_class(session_id)
    _check_plan_match(info, package)
    with LOCK:
        with connect() as conn:
            row = conn.execute("SELECT id, request_id FROM knowledge_packages WHERE session_id=?", (session_id,)).fetchone()
            if row:
                if row["request_id"] == request_id:
                    return {"status": "saved", "packageId": row["id"]}
                raise SessionClosed(session_id)
            if info["status"] != "live":
                raise SessionClosed(session_id)
            package_id = new_id("kp")
            conn.execute("INSERT INTO knowledge_packages VALUES (?,?,?,?,?)", (package_id, session_id, request_id, dumps(package), clock.now()))
            conn.execute("UPDATE class_sessions SET status='closed', ended_at=? WHERE id=?", (clock.now(), session_id))
        # luồng bài học cũ (snapshot mới nhất của lớp theo tên, vd "12A1") cũng thấy tiết vừa dạy. Giữ sessionId của bảng:
        # bài học cũ không được mang id tiết hub (nếu không nó bị coi là bài học hub và đòi token hub).
        student_context.save_snapshot(info["name"], package["snapshot"])
    bus.publish(f"board:{session_id}", {"type": "session_closed"})
    return {"status": "saved", "packageId": package_id}
