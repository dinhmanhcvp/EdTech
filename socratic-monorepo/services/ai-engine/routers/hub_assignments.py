"""Bài tập / đề của giáo viên (đỉnh 1) và liên kết lớp console ↔ hub."""
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from hub.assignments import bridge, extract, files, pages, store
from hub.assignments.schema import quick_key
from hub.auth import require_hub
from hub.schemas import Subject
from store.console_db import db as console_db

router = APIRouter(prefix="/api/v1/hub", tags=["Hub assignments"])
teacher = require_hub("teacher")


class NewAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=160)
    subject: Subject
    kind: Literal["exercise", "exam"] = "exercise"
    source: Literal["bank", "ai"] = "bank"


class SaveAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: Dict[str, Any]
    baseVersion: int = Field(ge=0)


class QuickKey(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=4000)


def _invalid(exc: ValidationError) -> HTTPException:
    return HTTPException(status_code=422, detail=[{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()][:10])


@router.post("/console/classes/{console_class_id}/link")
def link_console_class(console_class_id: str, claims: dict = Depends(teacher)):
    console_tid = claims.get("console") or bridge.console_teacher_for_hub(claims["subject"])
    console_class = console_db().get_class(console_tid, console_class_id) if console_tid else None
    if not console_class:
        raise HTTPException(status_code=404, detail="not_found")
    return {"hubClassId": bridge.link_class(claims["subject"], console_class)}


@router.get("/assignments")
def list_assignments(subject: Optional[str] = None, q: Optional[str] = None, claims: dict = Depends(teacher)):
    return {"assignments": store.list_for(claims["subject"], subject, q)}


@router.post("/assignments")
def create_assignment(req: NewAssignment, claims: dict = Depends(teacher)):
    return store.create_draft(claims["subject"], req.title, req.subject, req.kind, req.source)


@router.post("/assignments/quick-key")
def parse_quick_key(req: QuickKey, claims: dict = Depends(teacher)):
    return {"questions": quick_key(req.text)}


@router.get("/assignments/{aid}")
def get_assignment(aid: str, claims: dict = Depends(teacher)):
    try:
        return store.owned(claims["subject"], aid)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")


@router.put("/assignments/{aid}")
def save_assignment(aid: str, req: SaveAssignment, claims: dict = Depends(teacher)):
    try:
        return store.save(claims["subject"], aid, req.body, req.baseVersion)
    except ValidationError as exc:
        raise _invalid(exc)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    except store.VersionConflict:
        raise HTTPException(status_code=409, detail="version_conflict")


# ------------------------------------------------------------------ tải file đề, AI tách câu
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


@router.post("/assignments/upload")
async def upload_assignment(request: Request, claims: dict = Depends(teacher)):
    form = await request.form()
    uploads = [f for f in form.getlist("file") + form.getlist("files") if hasattr(f, "read")]
    if not uploads:
        raise HTTPException(status_code=422, detail="file_required")
    title, subject, kind = str(form.get("title") or "Bài tập")[:160], str(form.get("subject") or "MATH"), str(form.get("kind") or "exercise")
    if subject not in ("MATH", "PHYSICS", "CHEMISTRY", "BIOLOGY") or kind not in ("exercise", "exam"):
        raise HTTPException(status_code=422, detail="bad_subject_or_kind")
    blobs = []
    for f in uploads:
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="file_too_large")
        ctype = (f.content_type or "").lower()
        if ctype not in pages.PDF_TYPES | pages.IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="unsupported_file_type")
        blobs.append((data, ctype))
    is_pdf = len(blobs) == 1 and blobs[0][1] in pages.PDF_TYPES
    if any(c in pages.PDF_TYPES for _, c in blobs) and not is_pdf:
        raise HTTPException(status_code=422, detail="one_pdf_or_images")
    try:
        rendered = await run_in_threadpool(lambda: [p for data, ctype in blobs for p in pages.render(data, ctype)])
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if len(rendered) > pages.MAX_PAGES:
        raise HTTPException(status_code=422, detail="too_many_pages")
    draft = store.create_draft(claims["subject"], title, subject, kind, "file" if is_pdf else "photos")
    for n, jpeg in enumerate(rendered):
        files.save_page(draft["id"], n, jpeg)
    return {"id": draft["id"], "pages": len(rendered)}


@router.post("/assignments/{aid}/extract")
async def extract_assignment(aid: str, claims: dict = Depends(teacher)):
    try:
        a = store.owned(claims["subject"], aid)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    jpegs = [files.read("assignments", files.page_path(aid, p["page"])) for p in a["pages"]]
    return await run_in_threadpool(extract.extract_questions, jpegs)
