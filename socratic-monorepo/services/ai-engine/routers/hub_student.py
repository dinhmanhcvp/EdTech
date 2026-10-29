"""Học sinh: danh sách bài học từ các tiết của lớp mình (bài học dùng route Mode 2 /api/v1/student/lesson với session_id)."""
from fastapi import APIRouter, Depends

from hub import learning
from hub.auth import require_hub

router = APIRouter(prefix="/api/v1/hub/me", tags=["Hub student"])


@router.get("/lessons")
def my_lessons(claims: dict = Depends(require_hub("student"))):
    return {"lessons": learning.list_lessons(claims["subject"])}
