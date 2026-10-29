"""Trang quản lý giáo viên (REST) và ghép bảng chung với từng tiết học.

Hai nhóm đường dẫn:
  /api/v1/console/*  Giáo viên đăng nhập (Bearer): tài khoản, lớp, bài soạn, tiết học, bắt đầu/kết thúc tiết.
  /api/v1/board/*    Bảng chung (X-Board-Token): ghép bằng mã một lần, lưu ảnh chụp bảng theo tiết, lưu bài vào kho của giáo viên.

Cô lập: bảng chỉ làm việc với MỘT tiết đang diễn ra (mã bảng gắn với tiết). Giáo viên khác tới dạy → ghép bằng mã của họ → tiết mới, dữ liệu
riêng; mã bảng của tiết trước hết hiệu lực. Mã ghép dùng một lần, sống 10 phút, giữ trong bộ nhớ (không cần lưu bền).
Nghiệp vụ lưu trữ nằm ở store/console_db.py; đây chỉ là lớp HTTP mỏng.
"""
import os
import secrets
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from routers import classroom_ws as cw
from store.console_db import StoreError, db

router = APIRouter(tags=["Teacher console"])

PAIR_TTL_S = 600
MAX_PAIR_CODES = 500
_PAIR: Dict[str, Dict[str, Any]] = {}  # mã ghép → {pid, tid, exp}
_STATUS = {"exists": 409, "invalid": 422, "not_found": 404, "too_large": 413}


def _fail(e: StoreError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(e.code, 400), detail=str(e))


def teacher_from(authorization: Optional[str]) -> Dict[str, Any]:
    token = (authorization or "").removeprefix("Bearer ").strip()
    t = db().session_teacher(token)
    if not t:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập hoặc phiên đã hết hạn.")
    return t


def current_teacher(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    return teacher_from(authorization)


# ------------------------------------------------------------------ mô hình dữ liệu vào
class Credentials(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str = Field(max_length=60)
    password: str = Field(max_length=250)


class RegisterBody(Credentials):
    display_name: str = Field(default="", max_length=80)
    invite_code: str = Field(default="", max_length=80)


class ClassBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(max_length=80)
    grade: str = Field(default="", max_length=30)
    subject: str = Field(default="", max_length=60)
    size: int = Field(default=0, ge=0, le=200)
    notes: str = Field(default="", max_length=3000)


class LessonBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = Field(default="", max_length=160)
    folder: str = Field(default="", max_length=80)
    pages: List[List[Dict[str, Any]]]


class PeriodBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = Field(max_length=160)
    class_id: Optional[str] = Field(default=None, max_length=40)
    lesson_id: Optional[str] = Field(default=None, max_length=40)
    goals: str = Field(default="", max_length=3000)
    notes: str = Field(default="", max_length=6000)
    prompts: List[str] = Field(default_factory=list, max_length=30)


# ------------------------------------------------------------------ tài khoản
@router.post("/api/v1/console/register")
def register(body: RegisterBody):
    invite = os.getenv("CONSOLE_INVITE_CODE", "")
    if invite and not secrets.compare_digest(body.invite_code, invite):
        raise HTTPException(status_code=403, detail="Cần mã mời của trường để tạo tài khoản.")
    try:
        t = db().register(body.username, body.display_name, body.password)
    except StoreError as e:
        raise _fail(e)
    return {"token": db().create_session(t["id"]), "teacher": t}


@router.post("/api/v1/console/login")
def login(body: Credentials):
    t = db().verify_login(body.username, body.password)
    if not t:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu.")
    return {"token": db().create_session(t["id"]), "teacher": t}


@router.post("/api/v1/console/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    db().delete_session((authorization or "").removeprefix("Bearer ").strip())
    return {"ok": True}


@router.get("/api/v1/console/me")
def me(t: Dict[str, Any] = Depends(current_teacher)):
    return {"teacher": t}


# ------------------------------------------------------------------ lớp học
@router.get("/api/v1/console/classes")
def classes(t: Dict[str, Any] = Depends(current_teacher)):
    return {"classes": db().list_classes(t["id"])}


@router.post("/api/v1/console/classes")
def class_create(body: ClassBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_class(t["id"], body.model_dump())
    except StoreError as e:
        raise _fail(e)


@router.put("/api/v1/console/classes/{cid}")
def class_update(cid: str, body: ClassBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_class(t["id"], body.model_dump(), cid=cid)
    except StoreError as e:
        raise _fail(e)


@router.delete("/api/v1/console/classes/{cid}")
def class_delete(cid: str, t: Dict[str, Any] = Depends(current_teacher)):
    if not db().delete_class(t["id"], cid):
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp.")
    return {"ok": True}


# ------------------------------------------------------------------ bài soạn
@router.get("/api/v1/console/lessons")
def lessons(t: Dict[str, Any] = Depends(current_teacher)):
    return {"lessons": db().list_lessons(t["id"])}


@router.get("/api/v1/console/lessons/{lid}")
def lesson_get(lid: str, t: Dict[str, Any] = Depends(current_teacher)):
    les = db().get_lesson(t["id"], lid)
    if not les:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài.")
    return les


@router.post("/api/v1/console/lessons")
def lesson_create(body: LessonBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_lesson(t["id"], body.title, body.folder, body.pages)
    except StoreError as e:
        raise _fail(e)


@router.put("/api/v1/console/lessons/{lid}")
def lesson_update(lid: str, body: LessonBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_lesson(t["id"], body.title, body.folder, body.pages, lid=lid)
    except StoreError as e:
        raise _fail(e)


@router.delete("/api/v1/console/lessons/{lid}")
def lesson_delete(lid: str, t: Dict[str, Any] = Depends(current_teacher)):
    if not db().delete_lesson(t["id"], lid):
        raise HTTPException(status_code=404, detail="Không tìm thấy bài.")
    return {"ok": True}


# ------------------------------------------------------------------ tiết học
@router.get("/api/v1/console/periods")
def periods(t: Dict[str, Any] = Depends(current_teacher)):
    return {"periods": db().list_periods(t["id"])}


@router.post("/api/v1/console/periods")
def period_create(body: PeriodBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_period(t["id"], body.model_dump())
    except StoreError as e:
        raise _fail(e)


@router.get("/api/v1/console/periods/{pid}")
def period_get(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    p = db().get_period(t["id"], pid)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    cls = db().get_class(t["id"], p["class_id"]) if p["class_id"] else None
    return {**p, "class": cls}


@router.put("/api/v1/console/periods/{pid}")
def period_update(pid: str, body: PeriodBody, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return db().save_period(t["id"], body.model_dump(), pid=pid)
    except StoreError as e:
        raise _fail(e)


@router.delete("/api/v1/console/periods/{pid}")
def period_delete(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        if not db().delete_period(t["id"], pid):
            raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    except StoreError as e:
        raise _fail(e)
    return {"ok": True}


@router.get("/api/v1/console/periods/{pid}/record")
def period_record(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    """Hồ sơ tiết đã dạy: ảnh chụp bảng cuối và các bài học sinh đã nộp (để xem lại, trích vào bài soạn mới)."""
    p = db().get_period(t["id"], pid)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    return {"period": p, "pages": db().get_snapshot(t["id"], pid), "submissions": db().get_submissions(t["id"], pid) or []}


def _new_pair_code(pid: str, tid: str) -> Dict[str, Any]:
    now = time.time()
    for k in [k for k, v in _PAIR.items() if v["exp"] < now]:
        _PAIR.pop(k, None)
    for k in [k for k, v in _PAIR.items() if v["pid"] == pid]:  # mỗi tiết chỉ có một mã còn hiệu lực
        _PAIR.pop(k, None)
    if len(_PAIR) >= MAX_PAIR_CODES:
        raise HTTPException(status_code=503, detail="Quá nhiều mã ghép đang chờ.")
    for _ in range(30):
        code = "".join(secrets.choice(cw.ID_ALPHABET) for _ in range(6))
        if code not in _PAIR:
            _PAIR[code] = {"pid": pid, "tid": tid, "exp": now + PAIR_TTL_S}
            return {"pairCode": code, "expiresIn": PAIR_TTL_S}
    raise HTTPException(status_code=503, detail="Không tạo được mã ghép.")


@router.post("/api/v1/console/periods/{pid}/start")
def period_start(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    """Bắt đầu (hoặc ghép lại) tiết: tạo phòng học BYOD gắn với tiết, trả mã một lần để bảng ghép vào."""
    p = db().get_period(t["id"], pid)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiết học.")
    if p["status"] == "ended":
        raise HTTPException(status_code=422, detail="Tiết đã kết thúc.")
    room = cw.manager.get(p["room_id"]) if p["room_id"] else None
    if room is None:
        try:
            rid, _ = cw.manager.create()
        except RuntimeError:
            raise HTTPException(status_code=503, detail="Máy chủ đang có quá nhiều phòng học.")
        room = cw.manager.get(rid)
        room.managed, room.period_id, room.teacher_id = True, pid, t["id"]
    try:
        db().start_period(t["id"], pid, room.id)
    except StoreError as e:
        raise _fail(e)
    return {**_new_pair_code(pid, t["id"]), "roomId": room.id, "period": db().get_period(t["id"], pid)}


@router.get("/api/v1/console/periods/{pid}/live")
def period_live(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    """Thông tin để trang quản lý nối WebSocket vào phòng của tiết đang dạy (chỉ người dạy tiết đó nhận được)."""
    p = db().get_period(t["id"], pid)
    room = cw.manager.get(p["room_id"]) if p and p["room_id"] else None
    if not p or p["status"] != "live" or room is None or room.period_id != pid:
        raise HTTPException(status_code=404, detail="Tiết chưa diễn ra hoặc phòng đã đóng. Bấm Bắt đầu để mở lại.")
    return {"roomId": room.id, "token": room.token}


async def finish_period(tid: str, pid: str) -> Dict[str, Any]:
    """Kết thúc tiết: lưu bài học sinh đã nộp, đóng phòng (học sinh và bảng nhận CLOSED), thu hồi mã bảng."""
    p = db().get_period(tid, pid)
    if not p:
        raise StoreError("not_found")
    subs: Optional[List[Dict[str, Any]]] = None
    room = cw.manager.get(p["room_id"]) if p["room_id"] else None
    if room is not None and room.period_id == pid:
        subs = [{"name": s["name"], "rev": s["rev"], "at": s["at"], "strokes": s["strokes"]} for s in room.submissions.values()]
        await cw.hub.deliver(room.id, [("all", {"type": "CLOSED"})])
        cw.manager.close(room.id)
    for k in [k for k, v in _PAIR.items() if v["pid"] == pid]:
        _PAIR.pop(k, None)
    return db().end_period(tid, pid, submissions=subs)


@router.post("/api/v1/console/periods/{pid}/end")
async def period_end(pid: str, t: Dict[str, Any] = Depends(current_teacher)):
    try:
        return await finish_period(t["id"], pid)
    except StoreError as e:
        raise _fail(e)


# ------------------------------------------------------------------ bảng chung
class PairBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str = Field(max_length=20)
    previous_board_token: str = Field(default="", max_length=100)


@router.post("/api/v1/board/pair")
async def board_pair(body: PairBody):
    """Bảng nhập mã một lần của giáo viên. Trả mọi thứ bảng cần cho tiết này; bảng đang ghép với tiết khác thì tiết đó kết thúc."""
    code = body.code.strip().upper()
    entry = _PAIR.get(code)
    if not entry or entry["exp"] < time.time():
        _PAIR.pop(code, None)
        raise HTTPException(status_code=404, detail="Mã ghép sai hoặc đã hết hạn. Hãy bấm Bắt đầu tiết trên trang quản lý để lấy mã mới.")
    pid, tid = entry["pid"], entry["tid"]
    ctx = db().period_context(tid, pid)
    p = ctx["period"] if ctx else None
    room = cw.manager.get(p["room_id"]) if p and p["room_id"] else None
    if not p or p["status"] != "live" or room is None:
        _PAIR.pop(code, None)
        raise HTTPException(status_code=409, detail="Tiết không còn diễn ra. Hãy bắt đầu lại trên trang quản lý.")
    prev = db().period_by_board(body.previous_board_token) if body.previous_board_token else None
    if prev and prev["id"] != pid:  # cùng một bảng chuyển sang giáo viên/tiết khác: tiết cũ khép lại, dữ liệu cũ được cất riêng
        await finish_period(prev["teacher_id"], prev["id"])
    _PAIR.pop(code, None)
    board_token = secrets.token_urlsafe(24)
    db().bind_board(tid, pid, board_token)
    return _board_payload(tid, pid, ctx, room, board_token)


def _board_payload(tid: str, pid: str, ctx: Dict[str, Any], room: Any, board_token: str) -> Dict[str, Any]:
    p = ctx["period"]
    return {
        "boardToken": board_token,
        "roomId": room.id,
        "roomToken": room.token,
        "period": {k: p[k] for k in ("id", "title", "goals", "prompts", "started_at")},
        "class": ctx["class"],
        "teacher": {"display_name": ctx["teacher"]["display_name"]},
        "pages": ctx["pages"],
        "resumed": db().get_snapshot(tid, pid) is not None,
    }


def board_period(x_board_token: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    p = db().period_by_board(x_board_token or "")
    if not p:
        raise HTTPException(status_code=410, detail="Tiết đã kết thúc hoặc bảng đã được ghép sang tiết khác.")
    return p


class SnapshotBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pages: List[List[Dict[str, Any]]]


@router.put("/api/v1/board/snapshot")
def board_snapshot(body: SnapshotBody, p: Dict[str, Any] = Depends(board_period)):
    try:
        db().save_snapshot(p["id"], body.pages)
    except StoreError as e:
        raise _fail(e)
    return {"ok": True}


@router.get("/api/v1/board/resume")
def board_resume(x_board_token: Optional[str] = Header(default=None)):
    """Làm mới trang bảng giữa tiết: cùng mã bảng nhận lại tiết, phòng và ảnh chụp bảng mới nhất (không cần mã ghép mới)."""
    p = db().period_by_board(x_board_token or "")
    if not p:
        raise HTTPException(status_code=410, detail="Tiết đã kết thúc hoặc bảng đã được ghép sang tiết khác.")
    ctx = db().period_context(p["teacher_id"], p["id"])
    room = cw.manager.get(p["room_id"]) if p["room_id"] else None
    if not ctx or room is None:
        raise HTTPException(status_code=409, detail="Phòng của tiết không còn. Hãy lấy mã ghép mới trên trang quản lý.")
    return _board_payload(p["teacher_id"], p["id"], ctx, room, x_board_token or "")


@router.get("/api/v1/board/status")
def board_status(p: Dict[str, Any] = Depends(board_period)):
    return {"periodId": p["id"], "title": p["title"], "status": p["status"]}


@router.post("/api/v1/board/lessons")
def board_save_lesson(body: LessonBody, p: Dict[str, Any] = Depends(board_period)):
    """Giáo viên lưu bảng đang dạy thành bài trong kho của CHÍNH MÌNH (người dạy tiết này), không lẫn với giáo viên khác."""
    try:
        les = db().save_lesson(p["teacher_id"], body.title, body.folder, body.pages)
    except StoreError as e:
        raise _fail(e)
    return {"id": les["id"], "title": les["title"], "page_count": les["page_count"]}
