"""Đăng nhập hub: giáo viên bằng PIN, học sinh bằng mã."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from hub import auth

router = APIRouter(prefix="/api/v1/hub/auth", tags=["Hub auth"])


class TeacherLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    teacherId: str = Field(min_length=1, max_length=40)
    pin: str = Field(min_length=1, max_length=40)


class StudentLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    loginCode: str = Field(min_length=1, max_length=12)


@router.post("/teacher")
def teacher_login(req: TeacherLogin):
    try:
        result = auth.login_teacher(req.teacherId.strip(), req.pin)
    except auth.LockedOut:
        raise HTTPException(status_code=429, detail="too_many_attempts")
    if not result:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    return result


@router.post("/student")
def student_login(req: StudentLogin):
    result = auth.login_student(req.loginCode)
    if not result:
        raise HTTPException(status_code=401, detail="invalid_credentials")
    return result
