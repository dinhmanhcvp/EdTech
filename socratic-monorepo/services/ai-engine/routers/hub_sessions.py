"""Ghép bảng bằng QR, tiết học và gói tri thức cuối tiết."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from hub import sessions
from hub.auth import require_hub
from hub.events import sse_response
from hub.schemas import KnowledgePackage

router = APIRouter(prefix="/api/v1/hub", tags=["Hub sessions"])
MAX_PACKAGE_BYTES = 262144


class NewPairing(BaseModel):
    model_config = ConfigDict(extra="forbid")
    boardId: Optional[str] = Field(default=None, max_length=40)


class Claim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    classId: str = Field(min_length=1, max_length=40)
    planId: str = Field(min_length=1, max_length=80)


class PackageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: str = Field(min_length=1, max_length=80)
    package: Dict[str, Any]


def _own_session(sid: str, claims: dict) -> None:
    if claims["subject"] != sid:
        raise HTTPException(status_code=403, detail="wrong_session")


@router.post("/pairings")
def new_pairing(req: Optional[NewPairing] = None):
    return sessions.create_pairing((req or NewPairing()).boardId)


@router.get("/stream/pairing/{code}")
def pairing_stream(code: str, authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Board-Secret "):
        raise HTTPException(status_code=401, detail="invalid_board_secret")
    try:
        row = sessions.check_pairing_secret(code, authorization.split(" ", 1)[1].strip())
    except PermissionError:
        raise HTTPException(status_code=401, detail="invalid_board_secret")
    except sessions.PairingGone:
        raise HTTPException(status_code=410, detail="pairing_gone")
    first = sessions.paired_event(row["session_id"]) if row["session_id"] else None
    return sse_response(f"pairing:{code}", first=first, until=lambda e: e.get("type") == "paired")


@router.post("/pairings/{code}/claim")
def claim_pairing(code: str, req: Claim, claims: dict = Depends(require_hub("teacher"))):
    try:
        return sessions.claim(code, claims["subject"], req.classId, req.planId)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    except sessions.PairingGone:
        raise HTTPException(status_code=410, detail="pairing_gone")


@router.get("/stream/board")
def board_stream(claims: dict = Depends(require_hub("board"))):
    return sse_response(f"board:{claims['subject']}")


@router.get("/sessions/{sid}/plan")
def board_plan(sid: str, claims: dict = Depends(require_hub("board"))):
    _own_session(sid, claims)
    return sessions.session_plan(sid)


@router.post("/sessions/{sid}/package")
async def post_package(sid: str, request: Request, claims: dict = Depends(require_hub("board", allow_closed=True))):
    _own_session(sid, claims)
    raw = await request.body()
    if len(raw) > MAX_PACKAGE_BYTES:
        raise HTTPException(status_code=413, detail="package_too_large")
    try:
        req = PackageRequest.model_validate_json(raw)
        package = KnowledgePackage.model_validate(req.package).model_dump(by_alias=True)
        return sessions.save_package(sid, req.requestId, package)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=[{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()][:10])
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except sessions.SessionClosed:
        raise HTTPException(status_code=409, detail="session_closed")

