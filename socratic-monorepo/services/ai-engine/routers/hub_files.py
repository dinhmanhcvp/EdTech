"""Tải ảnh của bài tập (trang đề, ảnh vở) có kiểm quyền; không có đường dẫn công khai. Không đủ quyền → 404."""
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Response

from hub.assignments import bridge, files, runs, store

router = APIRouter(prefix="/api/v1/hub/files", tags=["Hub files"])


def _jpeg(data: bytes) -> Response:
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


@router.get("/page/{aid}/{n}")
def page_file(aid: str, n: int, authorization: Optional[str] = Header(default=None), x_board_token: Optional[str] = Header(default=None)):
    who = bridge.viewer(authorization, x_board_token)
    try:
        a = store.get(aid)
        path = files.page_path(aid, n)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    allowed = (who["kind"] == "board" and a["teacherId"] == who["hubTeacherId"]) \
        or (who["kind"] == "teacher" and a["teacherId"] == who["subject"]) \
        or (who["kind"] == "student" and runs.student_can_see_assignment(who["subject"], aid))
    if not allowed:
        raise HTTPException(status_code=404, detail="not_found")
    return _jpeg(files.read("assignments", path))
