"""Bài tập / đề có version (cùng cách với giáo án hub), trang ảnh, ngân hàng đề của giáo viên."""
from __future__ import annotations

import secrets
import unicodedata
from typing import Any, Dict, List, Optional

from hub import clock
from hub.db import LOCK, connect, dumps, loads, new_id
from hub.assignments.schema import Question, clean_body


class VersionConflict(Exception):
    pass


def _fold(text: str) -> str:
    text = unicodedata.normalize("NFD", (text or "").replace("đ", "d").replace("Đ", "D"))
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()


def create_draft(teacher_id: str, title: str, subject: str, kind: str, source: str) -> Dict[str, Any]:
    aid, now = new_id("asg"), clock.now()
    with LOCK, connect() as conn:
        conn.execute("INSERT INTO assignments VALUES (?,?,?,?,?,?,0,?,?)", (aid, teacher_id, title[:160], subject, kind, source, now, now))
    return {"id": aid, "version": 0}


def _pages(conn, aid: str) -> List[Dict[str, Any]]:
    return [{"page": r["page"], "width": r["width"], "height": r["height"]}
            for r in conn.execute("SELECT page, width, height FROM assignment_pages WHERE assignment_id=? ORDER BY page", (aid,))]


def get(aid: str, version: Optional[int] = None) -> Dict[str, Any]:
    with connect() as conn:
        head = conn.execute("SELECT * FROM assignments WHERE id=?", (aid,)).fetchone()
        if not head:
            raise KeyError(aid)
        v = head["current_version"] if version is None else version
        row = conn.execute("SELECT payload FROM assignment_versions WHERE assignment_id=? AND version=?", (aid, v)).fetchone() if v else None
        if v and not row:
            raise KeyError(f"{aid}@{v}")
        pages = _pages(conn, aid)
    return {"id": aid, "teacherId": head["teacher_id"], "version": v, "body": loads(row["payload"]) if row else None, "pages": pages,
            "source": head["source"], "title": head["title"], "subject": head["subject"], "kind": head["kind"]}


def owned(teacher_id: str, aid: str, version: Optional[int] = None) -> Dict[str, Any]:
    a = get(aid, version)
    if a["teacherId"] != teacher_id:
        raise KeyError(aid)
    return a


def _write_version(aid: str, version: int, clean: Dict[str, Any]) -> None:
    now = clock.now()
    with connect() as conn:
        conn.execute("INSERT INTO assignment_versions VALUES (?,?,?,?)", (aid, version, dumps(clean), now))
        conn.execute("UPDATE assignments SET current_version=?, title=?, subject=?, kind=?, updated_at=? WHERE id=?",
                     (version, clean["title"], clean["subject"], clean["kind"], now, aid))


def save(teacher_id: str, aid: str, body: Dict[str, Any], base_version: int) -> Dict[str, Any]:
    clean = clean_body(body)
    with LOCK:
        current = owned(teacher_id, aid)
        if current["body"] == clean:
            return {"id": aid, "version": current["version"], "body": clean}
        if base_version != current["version"]:
            raise VersionConflict(aid)
        _write_version(aid, current["version"] + 1, clean)
    return {"id": aid, "version": current["version"] + 1, "body": clean}


def add_question(aid: str, question: Dict[str, Any]) -> Dict[str, Any]:
    """Thêm một câu (vd câu AI tạo trong tiết) vào cuối bài; id câu sinh mới."""
    with LOCK:
        current = get(aid)
        body = dict(current["body"] or {"title": current["title"], "subject": current["subject"], "kind": current["kind"], "questions": []})
        qid = f"q-{secrets.token_hex(3)}"
        Question.model_validate({**question, "id": qid})
        body["questions"] = list(body["questions"]) + [{**question, "id": qid}]
        clean = clean_body(body)
        _write_version(aid, current["version"] + 1, clean)
    return {"id": aid, "version": current["version"] + 1, "questionId": qid}


def list_for(teacher_id: str, subject: Optional[str] = None, q: Optional[str] = None) -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM assignments WHERE teacher_id=? ORDER BY updated_at DESC", (teacher_id,)).fetchall()
        counts = {r["assignment_id"]: r["n"] for r in conn.execute(
            "SELECT assignment_id, COUNT(*) AS n FROM assignment_pages GROUP BY assignment_id")}
    out = []
    for r in rows:
        if subject and r["subject"] != subject:
            continue
        if q and _fold(q) not in _fold(r["title"]):
            continue
        out.append({"id": r["id"], "title": r["title"], "subject": r["subject"], "kind": r["kind"], "source": r["source"],
                    "currentVersion": r["current_version"], "pageCount": counts.get(r["id"], 0), "updatedAt": r["updated_at"]})
    return out
