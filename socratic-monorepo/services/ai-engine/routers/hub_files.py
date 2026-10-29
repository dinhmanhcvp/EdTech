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
        or (who["kind"] == "student" and (runs.student_can_see_assignment(who["subject"], aid) or _resource_used_in_class(who["subject"], aid)))
    if not allowed:
        raise HTTPException(status_code=404, detail="not_found")
    return _jpeg(files.read("assignments", path))


@router.get("/submission/{submission_id}")
def submission_file(submission_id: str, authorization: Optional[str] = Header(default=None), x_board_token: Optional[str] = Header(default=None)):
    from hub.assignments import submissions

    who = bridge.viewer(authorization, x_board_token)
    try:
        sub = submissions.get(submission_id)
        run = runs.get(sub["run_id"])
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    allowed = sub.get("photo_path") and (
        (who["kind"] == "board" and run["periodId"] == who["period"]["id"])
        or (who["kind"] == "teacher" and run["teacherId"] == who["subject"])
        or (who["kind"] == "student" and (sub["student_id"] == who["subject"] or _class_example(who["subject"], submission_id))))
    if not allowed:
        raise HTTPException(status_code=404, detail="not_found")
    return _jpeg(files.read("submissions", sub["photo_path"]))


def _class_example(student_id: str, submission_id: str) -> bool:
    """Bài chữa mẫu (giáo viên đã lưu phần chữa) xem được bởi học sinh cùng lớp."""
    from hub.assignments import metrics as asg_metrics

    return asg_metrics.is_class_example(student_id, submission_id)


def _resource_used_in_class(student_id: str, aid: str) -> bool:
    """Tài nguyên giáo viên đã mở trên bảng trong một tiết của lớp em: em xem lại được."""
    from hub.assignments import resources

    return resources.student_can_see(student_id, aid)
