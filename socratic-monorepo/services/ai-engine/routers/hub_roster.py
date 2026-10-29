"""Lớp, học sinh, link phụ huynh của giáo viên. Lớp/học sinh của giáo viên khác → 404."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import Annotated

from hub import roster
from hub.auth import require_hub
from hub.db import connect

router = APIRouter(prefix="/api/v1/hub", tags=["Hub roster"])
teacher = require_hub("teacher")


class AddStudents(BaseModel):
    model_config = ConfigDict(extra="forbid")
    names: List[Annotated[str, Field(min_length=1, max_length=80)]] = Field(min_length=1, max_length=60)


def _owned(teacher_id: str, class_id: str) -> dict:
    try:
        return roster.owned_class(teacher_id, class_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")


@router.get("/me/teacher")
def me_teacher(claims: dict = Depends(teacher)):
    with connect() as conn:
        row = conn.execute("SELECT id, name FROM teachers WHERE id=?", (claims["subject"],)).fetchone()
    return {"teacher": {"id": row["id"], "name": row["name"]}, "classes": roster.teacher_classes(claims["subject"])}


@router.get("/classes/{class_id}/students")
def class_students(class_id: str, claims: dict = Depends(teacher)):
    _owned(claims["subject"], class_id)
    return {"students": roster.list_students(class_id)}


@router.post("/classes/{class_id}/students")
def add_class_students(class_id: str, req: AddStudents, claims: dict = Depends(teacher)):
    _owned(claims["subject"], class_id)
    names = [n.strip() for n in req.names if n.strip()]
    if not names:
        raise HTTPException(status_code=422, detail="names_required")
    return {"students": roster.add_students(class_id, names)}


@router.post("/students/{student_id}/parent-link")
def new_parent_link(student_id: str, claims: dict = Depends(teacher)):
    try:
        _, owner = roster.student_owner(student_id)
    except KeyError:
        owner = None
    if owner != claims["subject"]:
        raise HTTPException(status_code=404, detail="not_found")
    return {"parentToken": roster.rotate_parent_link(student_id)}
