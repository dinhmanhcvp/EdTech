"""Vở ghi "Học theo SGK": học sinh lưu/đọc vở của mình, giáo viên đọc vở cả lớp mình (lớp của giáo viên khác → 404)."""
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field

from hub import notebook, roster
from hub.auth import require_hub

router = APIRouter(prefix="/api/v1/hub", tags=["Hub notebook"])
student = require_hub("student")
teacher = require_hub("teacher")

ITEM_KEY = Path(pattern=r"^[A-Z0-9_]{3,64}$")


class NoteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prediction: str = Field(default="", max_length=2000)
    result: str = Field(default="", max_length=2000)
    done: bool = False


@router.get("/me/notebook")
def my_notebook(claims: dict = Depends(student)):
    return {"entries": notebook.list_mine(claims["subject"])}


@router.put("/me/notebook/{item_key}")
def save_note(req: NoteBody, item_key: str = ITEM_KEY, claims: dict = Depends(student)):
    return notebook.save(claims["subject"], item_key, req.prediction, req.result, req.done)


@router.get("/classes/{class_id}/notebook")
def class_notebook(class_id: str, claims: dict = Depends(teacher)):
    try:
        roster.owned_class(claims["subject"], class_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="not_found")
    return {"entries": notebook.list_class(class_id)}
