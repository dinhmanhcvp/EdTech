"""Lớp, học sinh, link phụ huynh của giáo viên."""
from fastapi import APIRouter, Depends

from hub.auth import require_hub
from hub.db import connect

router = APIRouter(prefix="/api/v1/hub", tags=["Hub roster"])


@router.get("/me/teacher")
def me_teacher(claims: dict = Depends(require_hub("teacher"))):
    with connect() as conn:
        row = conn.execute("SELECT id, name FROM teachers WHERE id=?", (claims["subject"],)).fetchone()
    return {"teacher": {"id": row["id"], "name": row["name"]}}
