"""Bài tập / đề của giáo viên (đỉnh 1) và liên kết lớp console ↔ hub."""
from fastapi import APIRouter, Depends, HTTPException

from hub.assignments import bridge
from hub.auth import require_hub
from store.console_db import db as console_db

router = APIRouter(prefix="/api/v1/hub", tags=["Hub assignments"])
teacher = require_hub("teacher")


@router.post("/console/classes/{console_class_id}/link")
def link_console_class(console_class_id: str, claims: dict = Depends(teacher)):
    console_tid = claims.get("console") or bridge.console_teacher_for_hub(claims["subject"])
    console_class = console_db().get_class(console_tid, console_class_id) if console_tid else None
    if not console_class:
        raise HTTPException(status_code=404, detail="not_found")
    return {"hubClassId": bridge.link_class(claims["subject"], console_class)}
