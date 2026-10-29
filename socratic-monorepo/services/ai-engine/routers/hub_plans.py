"""Giáo án có version của giáo viên."""
import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from hub import plans, roster
from hub import suggest as sg
from hub.auth import require_hub

router = APIRouter(prefix="/api/v1/hub/plans", tags=["Hub plans"])
teacher = require_hub("teacher")


class CreatePlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    body: Dict[str, Any]


class SavePlan(CreatePlan):
    baseVersion: int = Field(ge=1)


def _invalid(exc: ValidationError) -> HTTPException:
    return HTTPException(status_code=422, detail=[{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()][:10])


@router.get("")
def list_plans(claims: dict = Depends(teacher)):
    return {"plans": plans.list_plans(claims["subject"])}


@router.post("")
def create_plan(req: CreatePlan, claims: dict = Depends(teacher)):
    try:
        return plans.create_plan(claims["subject"], req.body)
    except ValidationError as exc:
        raise _invalid(exc)


@router.get("/{plan_id}")
def get_plan(plan_id: str, claims: dict = Depends(teacher)):
    try:
        plan = plans.owned_plan(claims["subject"], plan_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    return {"id": plan["id"], "version": plan["version"], "body": plan["body"]}


@router.put("/{plan_id}")
def save_plan(plan_id: str, req: SavePlan, claims: dict = Depends(teacher)):
    try:
        return plans.save_plan(claims["subject"], plan_id, req.body, req.baseVersion)
    except ValidationError as exc:
        raise _invalid(exc)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    except plans.VersionConflict:
        raise HTTPException(status_code=409, detail="version_conflict")


class SuggestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    classId: str = Field(min_length=1, max_length=40)


@router.post("/{plan_id}/sections/{section_id}/suggestions")
async def suggest(plan_id: str, section_id: str, req: SuggestRequest, claims: dict = Depends(teacher),
                  x_gemini_api_key: Optional[str] = Header(default=None), x_openrouter_api_key: Optional[str] = Header(default=None)):
    try:
        roster.owned_class(claims["subject"], req.classId)
        plans.owned_plan(claims["subject"], plan_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    keys = ((x_gemini_api_key or "").strip(), (x_openrouter_api_key or "").strip())
    try:
        return await asyncio.wait_for(run_in_threadpool(sg.suggest, claims["subject"], plan_id, section_id, req.classId, *keys), 30.0)
    except asyncio.TimeoutError:
        return {"suggestions": [], "source": "offline", "note": sg.OFFLINE_NOTE}
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")


@router.post("/{plan_id}/suggestions/{sg_id}/apply")
def apply_suggestion(plan_id: str, sg_id: str, claims: dict = Depends(teacher)):
    try:
        return sg.apply(claims["subject"], plan_id, sg_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    except ValueError:
        raise HTTPException(status_code=409, detail="section_full")
