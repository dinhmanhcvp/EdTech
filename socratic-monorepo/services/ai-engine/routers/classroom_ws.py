"""
Phòng học BYOD thời gian thực (WebSocket) — giáo viên trên bảng, học sinh trên điện thoại/máy tính bảng.

Giao thức (JSON, mỗi thông điệp có "type"):
  Giáo viên → máy chủ : BLUEPRINT{blueprint} · SLIDER{key,value} · DELEGATE{studentId|null} · POLL_START{question,options} · POLL_END · CLOSE
  Học sinh  → máy chủ : INTERACT{key,value}  (chỉ khi đang được giao quyền)  · VOTE{choice}
  Máy chủ   → client  : STATE (ảnh chụp trạng thái khi vào phòng) · SYNC{key,value,by} · CONTROL{studentId,name}
                        ROSTER{count,students?,control} · POLL{question,options,open} · POLL_RESULT{counts,total,percents,final}
                        VOTE_ACK · TEACHER_STATUS{online} · CLOSED · ERROR{code}

Bảo mật: phòng do giáo viên tạo qua POST /api/v1/rooms, nhận về `teacherToken`; kết nối quyền giáo viên bắt buộc có token.
Học sinh chỉ cần mã phòng. Trạng thái nằm trong bộ nhớ tiến trình (mất khi máy chủ khởi động lại — chấp nhận được cho một tiết học).
Lõi nghiệp vụ (`RoomManager`) thuần túy, không dính WebSocket, để kiểm thử được.
"""
from __future__ import annotations

import json
import math
import re
import secrets
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["Classroom BYOD"])

MAX_ROOMS = 300
MAX_STUDENTS = 120
ROOM_TTL_S = 6 * 3600
MAX_MSG_CHARS = 70_000
ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # bỏ O/0, I/1 dễ nhầm khi đọc cho học sinh
KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,31}$")

Target = Union[str, Tuple[str, str]]  # "teacher" | "students" | "all" | ("student", id)
Out = List[Tuple[Target, Dict[str, Any]]]


def _clean_name(raw: Any) -> str:
    s = re.sub(r"[\x00-\x1f<>]", "", str(raw or "")).strip()
    return s[:30] or "Học sinh"


def _num(v: Any) -> Optional[float]:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    f = float(v)
    return f if math.isfinite(f) and abs(f) <= 1e9 else None


@dataclass
class Room:
    id: str
    token: str
    created: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    blueprint: Optional[dict] = None
    params: Dict[str, float] = field(default_factory=dict)
    control: Optional[str] = None
    poll: Optional[dict] = None
    votes: Dict[str, str] = field(default_factory=dict)
    students: Dict[str, str] = field(default_factory=dict)  # id → tên
    teacher_online: bool = False


class RoomManager:
    def __init__(self) -> None:
        self.rooms: Dict[str, Room] = {}

    # ------------------------------------------------------------ vòng đời
    def create(self) -> Tuple[str, str]:
        self._gc()
        if len(self.rooms) >= MAX_ROOMS:
            raise RuntimeError("too_many_rooms")
        for _ in range(20):
            rid = "".join(secrets.choice(ID_ALPHABET) for _ in range(6))
            if rid not in self.rooms:
                room = Room(id=rid, token=secrets.token_urlsafe(16))
                self.rooms[rid] = room
                return rid, room.token
        raise RuntimeError("no_free_id")

    def _gc(self) -> None:
        now = time.time()
        for rid in [r for r, rm in self.rooms.items() if now - rm.last_active > ROOM_TTL_S]:
            self.rooms.pop(rid, None)

    def get(self, rid: str) -> Optional[Room]:
        return self.rooms.get((rid or "").upper())

    def close(self, rid: str) -> None:
        self.rooms.pop(rid, None)

    # ------------------------------------------------------------ ảnh chụp trạng thái
    def snapshot(self, room: Room, you: Optional[str] = None, teacher: bool = False) -> Dict[str, Any]:
        poll = None
        if room.poll:
            poll = {"question": room.poll["question"], "options": room.poll["options"], "open": room.poll["open"]}
        return {
            "type": "STATE",
            "roomId": room.id,
            "youId": you,
            "role": "teacher" if teacher else "student",
            "blueprint": room.blueprint,
            "params": room.params,
            "control": room.control,
            "controlName": room.students.get(room.control) if room.control else None,
            "poll": poll,
            "teacherOnline": room.teacher_online,
        }

    def roster(self, room: Room) -> Out:
        students = [{"id": i, "name": n} for i, n in room.students.items()]
        return [
            ("teacher", {"type": "ROSTER", "count": len(students), "students": students, "control": room.control}),
            ("students", {"type": "ROSTER", "count": len(students), "control": room.control}),
        ]

    def poll_result(self, room: Room, final: bool) -> Dict[str, Any]:
        opts = room.poll["options"] if room.poll else []
        counts = {o: 0 for o in opts}
        for choice in room.votes.values():
            if choice in counts:
                counts[choice] += 1
        total = sum(counts.values())
        percents = {o: (round(100 * c / total) if total else 0) for o, c in counts.items()}
        return {"type": "POLL_RESULT", "counts": counts, "total": total, "percents": percents, "answered": total, "students": len(room.students), "final": final}

    # ------------------------------------------------------------ tham gia / rời
    def teacher_connected(self, room: Room) -> Out:
        room.teacher_online = True
        room.last_active = time.time()
        return [("students", {"type": "TEACHER_STATUS", "online": True})]

    def teacher_disconnected(self, room: Room) -> Out:
        room.teacher_online = False
        return [("students", {"type": "TEACHER_STATUS", "online": False})]

    def student_join(self, room: Room, name: Any) -> Tuple[Optional[str], Out]:
        if len(room.students) >= MAX_STUDENTS:
            return None, [("self", {"type": "ERROR", "code": "room_full"})]
        sid = "S" + secrets.token_hex(3).upper()
        room.students[sid] = _clean_name(name)
        room.last_active = time.time()
        return sid, self.roster(room)

    def student_leave(self, room: Room, sid: str) -> Out:
        room.students.pop(sid, None)
        room.votes.pop(sid, None)
        out: Out = []
        if room.control == sid:
            room.control = None
            out.append(("all", {"type": "CONTROL", "studentId": None, "name": None}))
        out += self.roster(room)
        if room.poll and room.poll["open"]:
            out.append(("teacher", self.poll_result(room, False)))
        return out

    # ------------------------------------------------------------ thông điệp của giáo viên
    def on_teacher(self, room: Room, msg: Dict[str, Any]) -> Out:
        room.last_active = time.time()
        t = msg.get("type")
        if t == "BLUEPRINT":
            bp = msg.get("blueprint")
            if not isinstance(bp, dict) or len(json.dumps(bp, ensure_ascii=False)) > 60_000:
                return [("teacher", {"type": "ERROR", "code": "bad_blueprint"})]
            room.blueprint = bp
            room.params = {}
            room.control = None
            return [("students", self.snapshot(room)), ("teacher", {"type": "CONTROL", "studentId": None, "name": None})]
        if t == "SLIDER":
            key, val = msg.get("key"), _num(msg.get("value"))
            if not isinstance(key, str) or not KEY_RE.match(key) or val is None:
                return [("teacher", {"type": "ERROR", "code": "bad_param"})]
            room.params[key] = val
            return [("students", {"type": "SYNC", "key": key, "value": val, "by": "teacher"})]
        if t == "DELEGATE":
            sid = msg.get("studentId")
            if sid is not None and sid not in room.students:
                return [("teacher", {"type": "ERROR", "code": "unknown_student"})]
            room.control = sid
            return [("all", {"type": "CONTROL", "studentId": sid, "name": room.students.get(sid) if sid else None})]
        if t == "POLL_START":
            q = str(msg.get("question") or "").strip()[:200]
            opts = [str(o).strip()[:40] for o in (msg.get("options") or []) if str(o).strip()]
            opts = list(dict.fromkeys(opts))[:6]
            if not q or len(opts) < 2:
                return [("teacher", {"type": "ERROR", "code": "bad_poll"})]
            room.poll = {"question": q, "options": opts, "open": True}
            room.votes = {}
            return [("all", {"type": "POLL", "question": q, "options": opts, "open": True}), ("teacher", self.poll_result(room, False))]
        if t == "POLL_END":
            if not room.poll:
                return []
            room.poll["open"] = False
            return [("all", {"type": "POLL", "question": room.poll["question"], "options": room.poll["options"], "open": False}), ("all", self.poll_result(room, True))]
        if t == "CLOSE":
            return [("all", {"type": "CLOSED"})]
        return [("teacher", {"type": "ERROR", "code": "unknown_type"})]

    # ------------------------------------------------------------ thông điệp của học sinh
    def on_student(self, room: Room, sid: str, msg: Dict[str, Any]) -> Out:
        room.last_active = time.time()
        t = msg.get("type")
        me: Target = ("student", sid)
        if t == "INTERACT":
            if room.control != sid:
                return [(me, {"type": "ERROR", "code": "not_in_control"})]
            key, val = msg.get("key"), _num(msg.get("value"))
            if not isinstance(key, str) or not KEY_RE.match(key) or val is None:
                return [(me, {"type": "ERROR", "code": "bad_param"})]
            room.params[key] = val
            return [("everyone_but", {"type": "SYNC", "key": key, "value": val, "by": sid, "byName": room.students.get(sid)}), ]
        if t == "VOTE":
            if not room.poll or not room.poll["open"]:
                return [(me, {"type": "ERROR", "code": "no_open_poll"})]
            choice = msg.get("choice")
            if choice not in room.poll["options"]:
                return [(me, {"type": "ERROR", "code": "bad_choice"})]
            room.votes[sid] = choice
            return [(me, {"type": "VOTE_ACK", "choice": choice}), ("teacher", self.poll_result(room, False))]
        if t == "PING":
            return [(me, {"type": "PONG"})]
        return [(me, {"type": "ERROR", "code": "unknown_type"})]


manager = RoomManager()


# ====================================================================== lớp WebSocket mỏng
class Hub:
    """Giữ kết nối đang mở của từng phòng và chuyển thông điệp theo đích."""

    def __init__(self) -> None:
        self.teacher: Dict[str, WebSocket] = {}
        self.students: Dict[str, Dict[str, WebSocket]] = {}

    async def send(self, ws: WebSocket, msg: Dict[str, Any]) -> None:
        try:
            await ws.send_text(json.dumps(msg, ensure_ascii=False))
        except Exception:
            pass  # kết nối đã đứt: vòng đọc sẽ tự dọn

    async def deliver(self, rid: str, out: Out, sender: Optional[str] = None, self_ws: Optional[WebSocket] = None) -> None:
        studs = self.students.get(rid, {})
        for target, msg in out:
            if target == "teacher":
                if rid in self.teacher:
                    await self.send(self.teacher[rid], msg)
            elif target == "students":
                for w in list(studs.values()):
                    await self.send(w, msg)
            elif target == "all":
                if rid in self.teacher:
                    await self.send(self.teacher[rid], msg)
                for w in list(studs.values()):
                    await self.send(w, msg)
            elif target == "everyone_but":
                if rid in self.teacher:
                    await self.send(self.teacher[rid], msg)
                for sid, w in list(studs.items()):
                    if sid != sender:
                        await self.send(w, msg)
            elif target == "self":
                if self_ws is not None:
                    await self.send(self_ws, msg)
            elif isinstance(target, tuple) and target[0] == "student":
                w = studs.get(target[1])
                if w:
                    await self.send(w, msg)


hub = Hub()


@router.post("/api/v1/rooms")
def create_room():
    try:
        rid, token = manager.create()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"roomId": rid, "teacherToken": token}


@router.get("/api/v1/rooms/{room_id}")
def room_info(room_id: str):
    room = manager.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="room_not_found")
    return {"roomId": room.id, "students": len(room.students), "teacherOnline": room.teacher_online, "hasBlueprint": room.blueprint is not None}


@router.websocket("/ws/rooms/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str, role: str = "student", token: str = "", name: str = ""):
    room = manager.get(room_id)
    if room is None:
        await websocket.close(code=4404)
        return
    rid = room.id
    is_teacher = role == "teacher"
    if is_teacher and not secrets.compare_digest(token or "", room.token):
        await websocket.close(code=4401)
        return
    await websocket.accept()

    sid: Optional[str] = None
    if is_teacher:
        old = hub.teacher.get(rid)
        hub.teacher[rid] = websocket
        if old is not None:
            try:
                await old.close(code=4409)
            except Exception:
                pass
        await hub.send(websocket, manager.snapshot(room, teacher=True))
        await hub.deliver(rid, manager.teacher_connected(room))
        await hub.deliver(rid, manager.roster(room))
    else:
        sid, out = manager.student_join(room, name)
        if sid is None:
            await hub.deliver(rid, out, self_ws=websocket)
            await websocket.close(code=4429)
            return
        hub.students.setdefault(rid, {})[sid] = websocket
        await hub.send(websocket, manager.snapshot(room, you=sid))
        await hub.deliver(rid, out)

    try:
        while True:
            text = await websocket.receive_text()
            if len(text) > MAX_MSG_CHARS:
                await websocket.close(code=1009)
                break
            try:
                msg = json.loads(text)
            except json.JSONDecodeError:
                await hub.send(websocket, {"type": "ERROR", "code": "bad_json"})
                continue
            if not isinstance(msg, dict):
                continue
            if is_teacher:
                out = manager.on_teacher(room, msg)
                await hub.deliver(rid, out, self_ws=websocket)
                if msg.get("type") == "CLOSE":
                    manager.close(rid)
                    break
            else:
                out = manager.on_student(room, sid, msg)  # type: ignore[arg-type]
                await hub.deliver(rid, out, sender=sid, self_ws=websocket)
    except WebSocketDisconnect:
        pass
    finally:
        if is_teacher:
            if hub.teacher.get(rid) is websocket:
                hub.teacher.pop(rid, None)
                if rid in manager.rooms:
                    await hub.deliver(rid, manager.teacher_disconnected(room))
        else:
            hub.students.get(rid, {}).pop(sid or "", None)
            if rid in manager.rooms:
                await hub.deliver(rid, manager.student_leave(room, sid or ""))
        if rid not in manager.rooms:  # phòng đã đóng: dọn kết nối còn lại
            hub.teacher.pop(rid, None)
            hub.students.pop(rid, None)


def _public_size() -> Dict[str, int]:  # tiện cho kiểm thử / giám sát
    return {"rooms": len(manager.rooms), "students": sum(len(r.students) for r in manager.rooms.values())}
