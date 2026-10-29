"""Chỉ số học sinh / phần giáo án / lớp và luồng realtime cho giáo viên (chỉ lớp và giáo án của mình)."""
from fastapi import APIRouter, Depends, HTTPException

from hub import metrics, plans, roster
from hub.auth import require_hub
from hub.events import sse_response

router = APIRouter(prefix="/api/v1/hub", tags=["Hub metrics"])
teacher = require_hub("teacher")


def _owned(teacher_id: str, class_id: str) -> None:
    try:
        roster.owned_class(teacher_id, class_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")


@router.get("/classes/{class_id}/metrics")
def class_metrics(class_id: str, claims: dict = Depends(teacher)):
    _owned(claims["subject"], class_id)
    return metrics.class_metrics(class_id, claims["subject"])


@router.get("/classes/{class_id}/students/{student_id}/metrics")
def student_metrics(class_id: str, student_id: str, claims: dict = Depends(teacher)):
    _owned(claims["subject"], class_id)
    try:
        if roster.student_owner(student_id)[0] != class_id:
            raise KeyError(student_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    return metrics.student_metrics(student_id)


@router.get("/plans/{plan_id}/sections/{section_id}/metrics")
def section_metrics(plan_id: str, section_id: str, classId: str, claims: dict = Depends(teacher)):
    _owned(claims["subject"], classId)
    try:
        plans.owned_plan(claims["subject"], plan_id)
        return metrics.section_metrics(plan_id, section_id, classId)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")


@router.get("/stream/teacher")
def teacher_stream(claims: dict = Depends(teacher)):
    return sse_response(f"teacher:{claims['subject']}")
