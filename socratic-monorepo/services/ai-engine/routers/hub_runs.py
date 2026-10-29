"""Lượt giao bài: bảng (X-Board-Token của tiết console), giáo viên (phiên console / token hub), học sinh (token hub)."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from hub import roster
from hub.assignments import bridge, runs, store
from hub.assignments.schema import public_body
from hub.auth import require_hub

router = APIRouter(prefix="/api/v1/hub", tags=["Hub assignment runs"])
teacher = require_hub("teacher")
student = require_hub("student")


class OpenRun(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assignmentId: str = Field(min_length=1, max_length=40)


class TeacherOpenRun(OpenRun):
    classId: str = Field(min_length=1, max_length=40)


class DueDate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dueAt: float


class NewQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: Dict[str, Any]


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="not_found")


def _assignment_public(a: Dict[str, Any]) -> Dict[str, Any]:
    return {"id": a["id"], "version": a["version"], "body": public_body(a["body"]) if a["body"] else None, "pages": a["pages"],
            "title": a["title"], "subject": a["subject"], "kind": a["kind"]}


# ------------------------------------------------------------------ bảng
def _board_run(ctx: Dict[str, Any], run_id: str) -> Dict[str, Any]:
    try:
        run = runs.get(run_id)
    except KeyError:
        raise _not_found()
    if run["periodId"] != ctx["period"]["id"]:
        raise _not_found()
    return run


@router.get("/board/assignments")
def board_assignments(ctx: dict = Depends(bridge.require_board)):
    return {"assignments": [a for a in store.list_for(ctx["hubTeacherId"]) if a["currentVersion"] > 0]}


@router.get("/board/assignments/{aid}")
def board_assignment(aid: str, ctx: dict = Depends(bridge.require_board)):
    try:
        return _assignment_public(store.owned(ctx["hubTeacherId"], aid))
    except KeyError:
        raise _not_found()


@router.post("/board/assignments/{aid}/questions")
def board_add_question(aid: str, req: NewQuestion, ctx: dict = Depends(bridge.require_board)):
    try:
        store.owned(ctx["hubTeacherId"], aid)
        return store.add_question(aid, req.question)
    except KeyError:
        raise _not_found()
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=[{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()][:10])


@router.post("/board/runs")
def board_open_run(req: OpenRun, ctx: dict = Depends(bridge.require_board)):
    if not ctx["hubClassId"]:
        raise HTTPException(status_code=409, detail="period_has_no_class")
    try:
        return runs.open_run(ctx["hubTeacherId"], req.assignmentId, ctx["hubClassId"], ctx["period"]["id"], ctx["consoleTeacherId"])
    except KeyError:
        raise _not_found()
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/board/runs/{run_id}/close")
def board_close_run(run_id: str, ctx: dict = Depends(bridge.require_board)):
    _board_run(ctx, run_id)
    return runs.run_view(runs.close(run_id))


# ------------------------------------------------------------------ giáo viên
def _teacher_run(claims: dict, run_id: str) -> Dict[str, Any]:
    try:
        return runs.owned(claims["subject"], run_id)
    except KeyError:
        raise _not_found()


@router.post("/runs")
def teacher_open_run(req: TeacherOpenRun, claims: dict = Depends(teacher)):
    try:
        roster.owned_class(claims["subject"], req.classId)
        return runs.open_run(claims["subject"], req.assignmentId, req.classId)
    except KeyError:
        raise _not_found()
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/runs")
def teacher_runs(classId: str, claims: dict = Depends(teacher)):
    try:
        roster.owned_class(claims["subject"], classId)
    except KeyError:
        raise _not_found()
    return {"runs": [runs.run_view(r) for r in runs.list_for_class(claims["subject"], classId)]}


@router.put("/runs/{run_id}")
def teacher_set_due(run_id: str, req: DueDate, claims: dict = Depends(teacher)):
    _teacher_run(claims, run_id)
    return runs.run_view(runs.set_due(run_id, req.dueAt))


@router.post("/runs/{run_id}/close")
def teacher_close_run(run_id: str, claims: dict = Depends(teacher)):
    _teacher_run(claims, run_id)
    return runs.run_view(runs.close(run_id))


# ------------------------------------------------------------------ học sinh
@router.get("/runs/by-code/{code}")
def student_run(code: str, claims: dict = Depends(student)):
    try:
        run = runs.by_code(code)
    except KeyError:
        raise _not_found()
    try:
        runs.check_student(run, claims["subject"])
    except PermissionError:
        raise HTTPException(status_code=403, detail="not_in_class")
    if run["phase"] == "closed":
        raise HTTPException(status_code=410, detail="run_closed")
    a = store.get(run["assignmentId"])
    return {"runId": run["id"], "phase": run["phase"], "dueAt": run["dueAt"], **_assignment_public(a), "mine": {}}
