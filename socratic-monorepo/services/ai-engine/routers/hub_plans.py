"""Giáo án có version của giáo viên."""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from hub import plans
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
