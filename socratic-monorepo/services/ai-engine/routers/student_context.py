import secrets
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from student_context import context_snapshot, get_profile, list_errors, roadmap, record_error, record_event, save_profile, save_snapshot, get_snapshot
from security import require_roles

MAX_BOARD_SNAPSHOTS = 40
router = APIRouter(prefix="/api/v1/student", tags=["Student Board Context"])

def _assert_subject(student_id: str, claims: dict) -> None:
    if claims.get("role") not in {"local", "admin", "teacher"} and claims.get("subject") != student_id:
        raise HTTPException(status_code=403, detail="student_subject_mismatch")

class ProfileUpdate(BaseModel):
    profile_id: str = "FOUNDATION"
    display_name: str = "Student"
    scaffold_depth: int = Field(default=3, ge=1, le=5)
    pace: str = "medium"
    difficulty: str = "THPT_STANDARD"
    visual_first: bool = False

class ErrorMemoryRequest(BaseModel):
    subject: str
    concept: str = Field(min_length=1, max_length=160)
    diagnosis: str = Field(min_length=1, max_length=500)

class SessionEventRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=60)
    payload: Dict[str, Any] = Field(default_factory=dict)

class SnapshotUpdate(BaseModel):
    class_id: str = Field(default="12A1", min_length=1, max_length=80)
    snapshot: Dict[str, Any]

@router.get("/context/{student_id}")
def get_student_context(student_id: str, class_id: str = "12A1", _claims: dict = Depends(require_roles({"student", "teacher", "admin"}))) -> Dict[str, Any]:
    if not student_id.strip() or len(student_id) > 80: raise HTTPException(status_code=400, detail="invalid_student_id")
    _assert_subject(student_id, _claims)
    return {"snapshot": context_snapshot(student_id, class_id), "profile": get_profile(student_id), "errors": list_errors(student_id), "roadmap": roadmap(student_id)}

@router.put("/profile/{student_id}")
def update_student_profile(student_id: str, req: ProfileUpdate, _claims: dict = Depends(require_roles({"student", "admin"}))) -> Dict[str, Any]:
    _assert_subject(student_id, _claims)
    return {"status": "saved", "profile": save_profile(student_id, req.model_dump())}

@router.post("/errors/{student_id}")
def save_student_error(student_id: str, req: ErrorMemoryRequest, _claims: dict = Depends(require_roles({"student", "admin"}))) -> Dict[str, Any]:
    _assert_subject(student_id, _claims)
    try: return {"status": "recorded", "error": record_error(student_id, req.subject, req.concept, req.diagnosis), "roadmap": roadmap(student_id)}
    except ValueError as exc: raise HTTPException(status_code=400, detail=str(exc))

@router.post("/events/{student_id}")
def save_session_event(student_id: str, req: SessionEventRequest, _claims: dict = Depends(require_roles({"student", "admin"}))) -> Dict[str, Any]:
    _assert_subject(student_id, _claims)
    return {"status": "recorded", "event": record_event(student_id, req.event_type, req.payload)}

@router.get("/roadmap/{student_id}")
def get_student_roadmap(student_id: str, _claims: dict = Depends(require_roles({"student", "teacher", "admin"}))) -> Dict[str, Any]:
    _assert_subject(student_id, _claims)
    return roadmap(student_id)

@router.post("/roadmap/{student_id}/prepare")
def prepare_teacher_roadmap(student_id: str, _claims: dict = Depends(require_roles({"teacher", "admin"}))) -> Dict[str, Any]:
    return {"status": "prepared", "package_id": f"roadmap_{student_id[:20]}", "plan": roadmap(student_id), "teacher_action": "Review before publishing to the next classroom session."}

@router.put("/snapshot")
def update_classroom_snapshot(req: SnapshotUpdate, _claims: dict = Depends(require_roles({"teacher", "admin"}))) -> Dict[str, Any]:
    if not isinstance(req.snapshot.get("boardSnapshots"), list) or not isinstance(req.snapshot.get("studentWork"), list):
        raise HTTPException(status_code=422, detail="snapshot_requires_boardSnapshots_and_studentWork")
    if len(req.snapshot["boardSnapshots"]) > MAX_BOARD_SNAPSHOTS:
        raise HTTPException(status_code=422, detail="snapshot_too_many_boardSnapshots")
    return {"status": "saved", "snapshot": save_snapshot(req.class_id, req.snapshot)}


def _checked_snapshot(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(snapshot.get("boardSnapshots"), list) or not isinstance(snapshot.get("studentWork"), list):
        raise HTTPException(status_code=422, detail="snapshot_requires_boardSnapshots_and_studentWork")
    if len(snapshot["boardSnapshots"]) > MAX_BOARD_SNAPSHOTS:
        raise HTTPException(status_code=422, detail="snapshot_too_many_boardSnapshots")
    return snapshot


@router.post("/recap")
def publish_recap(req: SnapshotUpdate, _claims: dict = Depends(require_roles({"teacher", "admin"}))) -> Dict[str, Any]:
    """Đóng gói cả tiết thành một bản xem lại có mã riêng (không đoán được) để in vào QR; không ghi đè bài đang gửi cho lớp."""
    code = secrets.token_urlsafe(6)
    save_snapshot(f"recap-{code}", _checked_snapshot(req.snapshot))
    return {"status": "saved", "code": code}


@router.get("/recap/{code}")
def read_recap(code: str) -> Dict[str, Any]:
    """Công khai (học sinh quét QR, không cần đăng nhập): chỉ đọc bản đóng gói đúng mã."""
    snap = get_snapshot(f"recap-{code}") if 0 < len(code) <= 40 else None
    if snap is None:
        raise HTTPException(status_code=404, detail="recap_not_found")
    return {"snapshot": snap}
