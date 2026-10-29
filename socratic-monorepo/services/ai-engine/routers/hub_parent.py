"""Phụ huynh xem báo cáo tuần qua link bí mật (không cần đăng nhập); giáo viên chốt báo cáo ngay để demo."""
from fastapi import APIRouter, Depends, HTTPException, Response

from hub import clock, reports, roster
from hub.auth import require_hub

router = APIRouter(prefix="/api/v1/hub", tags=["Hub parent"])


@router.get("/parent/{token}/report")
def parent_report(token: str, response: Response):
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Robots-Tag"] = "noindex"
    try:
        return reports.parent_view(token)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found", headers={"Referrer-Policy": "no-referrer"})


@router.post("/students/{student_id}/reports")
def report_now(student_id: str, claims: dict = Depends(require_hub("teacher"))):
    try:
        _, owner = roster.student_owner(student_id)
    except KeyError:
        owner = None
    if owner != claims["subject"]:
        raise HTTPException(status_code=404, detail="not_found")
    return reports.close_week(student_id, reports.week_of(clock.now()))
