"""Tệp ảnh của bài tập: trang đề và ảnh vở. Nằm cạnh tệp SQLite của hub (nên cách ly theo DB tạm khi kiểm thử)."""
from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple

from PIL import Image

from hub.db import LOCK, connect, db_path


def _root(kind: str) -> Path:
    root = db_path().parent / kind
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_page(aid: str, n: int, jpeg: bytes) -> Tuple[str, int, int]:
    path = _root("assignments") / f"{aid}-p{n}.jpg"
    path.write_bytes(jpeg)
    w, h = Image.open(io.BytesIO(jpeg)).size
    with LOCK, connect() as conn:
        conn.execute("INSERT OR REPLACE INTO assignment_pages VALUES (?,?,?,?,?)", (aid, n, path.name, w, h))
    return path.name, w, h


def save_photo(submission_id: str, jpeg: bytes) -> str:
    path = _root("submissions") / f"{submission_id}.jpg"
    path.write_bytes(jpeg)
    return path.name


def remove(kind: str, names) -> None:
    for name in names:
        try:
            (_root(kind) / Path(name).name).unlink()
        except OSError:
            pass


def read(kind: str, name: str) -> bytes:
    return (_root(kind) / Path(name).name).read_bytes()


def page_path(aid: str, n: int) -> str:
    with connect() as conn:
        row = conn.execute("SELECT path FROM assignment_pages WHERE assignment_id=? AND page=?", (aid, n)).fetchone()
    if not row:
        raise KeyError(f"{aid}:{n}")
    return row["path"]
