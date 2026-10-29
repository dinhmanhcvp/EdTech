"""Kho dữ liệu của trang quản lý giáo viên (SQLite): tài khoản, lớp, bài soạn, tiết học.

Nguyên tắc cô lập: MỌI truy vấn dữ liệu của giáo viên đều có điều kiện `teacher_id`, nên một giáo viên không đọc, sửa hay xóa được
dữ liệu của giáo viên khác (id của người khác trả về "không tìm thấy", không phải "bị cấm", để không lộ sự tồn tại).
Mỗi tiết học là một bản ghi riêng: bài soạn, ngữ cảnh, ảnh chụp bảng và bài học sinh nộp của tiết này không bao giờ ghi đè tiết khác,
dù cùng một chiếc bảng.

Mật khẩu: scrypt + muối ngẫu nhiên riêng từng người (thư viện chuẩn, không phụ thuộc gói ngoài). Mã đăng nhập: chuỗi ngẫu nhiên, chỉ lưu
bản băm SHA-256 nên rò rỉ cơ sở dữ liệu không lộ mã còn hạn.

shortcut: một kết nối SQLite dùng chung có khóa luồng; đủ cho vài trăm giáo viên trên một máy chủ. Nhiều tiến trình ghi cùng lúc hoặc
Render không có ổ đĩa bền thì chuyển sang Postgres, giữ nguyên các hàm công khai của lớp ConsoleDB.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

SESSION_TTL_S = 14 * 24 * 3600
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.\-]{3,32}$")
MIN_PASSWORD = 8
MAX_LESSON_BYTES = 8 * 1024 * 1024
MAX_PAGES = 100
MAX_STROKES = 30_000
_SCRYPT = dict(n=2**14, r=8, p=1, dklen=32)

SCHEMA = """
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY, username TEXT NOT NULL, username_lc TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
  pw_salt BLOB NOT NULL, pw_hash BLOB NOT NULL, created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at REAL NOT NULL, expires_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, grade TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '', created_at REAL NOT NULL, updated_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL, folder TEXT NOT NULL DEFAULT '', pages_json TEXT NOT NULL, page_count INTEGER NOT NULL, stroke_count INTEGER NOT NULL,
  created_at REAL NOT NULL, updated_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL, lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL, goals TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', prompts_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','live','ended')),
  room_id TEXT, board_token_hash TEXT, board_json TEXT, submissions_json TEXT,
  created_at REAL NOT NULL, started_at REAL, ended_at REAL);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_periods_teacher ON periods(teacher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_periods_board ON periods(board_token_hash);
"""


class StoreError(Exception):
    """Lỗi nghiệp vụ có mã ngắn để lớp REST đổi thành HTTP: `code` ∈ {exists, invalid, not_found, too_large}."""

    def __init__(self, code: str, message: str = "") -> None:
        super().__init__(message or code)
        self.code = code


def _hash_pw(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, **_SCRYPT)


def _sha(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _clip(v: Any, n: int) -> str:
    return re.sub(r"[\x00-\x08\x0b-\x1f]", "", str(v or "")).strip()[:n]


def _new_id() -> str:
    return secrets.token_hex(8)


class ConsoleDB:
    def __init__(self, path: str) -> None:
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA foreign_keys=ON")
        if path != ":memory:":
            self._db.execute("PRAGMA journal_mode=WAL")
        self._db.executescript(SCHEMA)
        self._db.commit()

    # ------------------------------------------------------------------ tiện ích
    def _one(self, sql: str, args: tuple = ()) -> Optional[sqlite3.Row]:
        with self._lock:
            return self._db.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple = ()) -> List[sqlite3.Row]:
        with self._lock:
            return self._db.execute(sql, args).fetchall()

    def _run(self, sql: str, args: tuple = ()) -> int:
        with self._lock:
            cur = self._db.execute(sql, args)
            self._db.commit()
            return cur.rowcount

    # ------------------------------------------------------------------ tài khoản
    def register(self, username: str, display_name: str, password: str) -> Dict[str, Any]:
        username = _clip(username, 40)
        if not USERNAME_RE.match(username):
            raise StoreError("invalid", "Tên đăng nhập 3–32 ký tự: chữ không dấu, số, dấu . _ -")
        if not isinstance(password, str) or len(password) < MIN_PASSWORD or len(password) > 200:
            raise StoreError("invalid", f"Mật khẩu cần ít nhất {MIN_PASSWORD} ký tự.")
        tid, salt = _new_id(), secrets.token_bytes(16)
        try:
            self._run(
                "INSERT INTO teachers(id,username,username_lc,display_name,pw_salt,pw_hash,created_at) VALUES(?,?,?,?,?,?,?)",
                (tid, username, username.lower(), _clip(display_name, 60) or username, salt, _hash_pw(password, salt), time.time()),
            )
        except sqlite3.IntegrityError:
            raise StoreError("exists", "Tên đăng nhập đã có người dùng.")
        return self.teacher(tid)  # type: ignore[return-value]

    def teacher(self, tid: str) -> Optional[Dict[str, Any]]:
        r = self._one("SELECT id,username,display_name,created_at FROM teachers WHERE id=?", (tid,))
        return dict(r) if r else None

    def verify_login(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        r = self._one("SELECT * FROM teachers WHERE username_lc=?", (_clip(username, 40).lower(),))
        # luôn băm một lần để thời gian phản hồi không cho biết tên đăng nhập có tồn tại không
        salt = r["pw_salt"] if r else b"\x00" * 16
        h = _hash_pw(password if isinstance(password, str) else "", salt)
        if r and hmac.compare_digest(h, r["pw_hash"]):
            return {"id": r["id"], "username": r["username"], "display_name": r["display_name"], "created_at": r["created_at"]}
        return None

    def create_session(self, teacher_id: str, now: Optional[float] = None) -> str:
        now = now if now is not None else time.time()
        token = secrets.token_urlsafe(32)
        self._run("INSERT INTO sessions(token_hash,teacher_id,created_at,expires_at) VALUES(?,?,?,?)", (_sha(token), teacher_id, now, now + SESSION_TTL_S))
        self._run("DELETE FROM sessions WHERE expires_at < ?", (now,))
        return token

    def session_teacher(self, token: str, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        now = now if now is not None else time.time()
        r = self._one("SELECT teacher_id FROM sessions WHERE token_hash=? AND expires_at>?", (_sha(token), now))
        return self.teacher(r["teacher_id"]) if r else None

    def delete_session(self, token: str) -> None:
        self._run("DELETE FROM sessions WHERE token_hash=?", (_sha(token or ""),))

    # ------------------------------------------------------------------ lớp học
    def _class_row(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {k: r[k] for k in ("id", "name", "grade", "subject", "size", "notes", "created_at", "updated_at")}

    def list_classes(self, tid: str) -> List[Dict[str, Any]]:
        return [self._class_row(r) for r in self._all("SELECT * FROM classes WHERE teacher_id=? ORDER BY name COLLATE NOCASE", (tid,))]

    def get_class(self, tid: str, cid: str) -> Optional[Dict[str, Any]]:
        r = self._one("SELECT * FROM classes WHERE id=? AND teacher_id=?", (cid, tid))
        return self._class_row(r) if r else None

    def save_class(self, tid: str, data: Dict[str, Any], cid: Optional[str] = None) -> Dict[str, Any]:
        name = _clip(data.get("name"), 60)
        if not name:
            raise StoreError("invalid", "Lớp cần có tên.")
        try:
            size = max(0, min(200, int(data.get("size") or 0)))
        except (TypeError, ValueError):
            raise StoreError("invalid", "Sĩ số phải là số.")
        vals = (name, _clip(data.get("grade"), 20), _clip(data.get("subject"), 40), size, _clip(data.get("notes"), 2000))
        now = time.time()
        if cid is None:
            cid = _new_id()
            self._run("INSERT INTO classes(id,teacher_id,name,grade,subject,size,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", (cid, tid, *vals, now, now))
        elif not self._run("UPDATE classes SET name=?,grade=?,subject=?,size=?,notes=?,updated_at=? WHERE id=? AND teacher_id=?", (*vals, now, cid, tid)):
            raise StoreError("not_found")
        return self.get_class(tid, cid)  # type: ignore[return-value]

    def delete_class(self, tid: str, cid: str) -> bool:
        return self._run("DELETE FROM classes WHERE id=? AND teacher_id=?", (cid, tid)) > 0

    # ------------------------------------------------------------------ bài soạn
    @staticmethod
    def _check_pages(pages: Any) -> str:
        if not isinstance(pages, list) or not pages or len(pages) > MAX_PAGES or not all(isinstance(p, list) for p in pages):
            raise StoreError("invalid", "Bài phải là danh sách trang (tối đa 100 trang).")
        n = sum(len(p) for p in pages)
        if n > MAX_STROKES or any(not isinstance(s, dict) for p in pages for s in p):
            raise StoreError("invalid", "Bài có quá nhiều đối tượng hoặc sai định dạng.")
        raw = json.dumps(pages, ensure_ascii=False, separators=(",", ":"))
        if len(raw) > MAX_LESSON_BYTES:
            raise StoreError("too_large", "Bài quá lớn (tối đa 8 MB).")
        return raw

    def _lesson_meta(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {k: r[k] for k in ("id", "title", "folder", "page_count", "stroke_count", "created_at", "updated_at")}

    def list_lessons(self, tid: str) -> List[Dict[str, Any]]:
        rows = self._all("SELECT id,title,folder,page_count,stroke_count,created_at,updated_at FROM lessons WHERE teacher_id=? ORDER BY updated_at DESC", (tid,))
        return [self._lesson_meta(r) for r in rows]

    def get_lesson(self, tid: str, lid: str) -> Optional[Dict[str, Any]]:
        r = self._one("SELECT * FROM lessons WHERE id=? AND teacher_id=?", (lid, tid))
        return {**self._lesson_meta(r), "pages": json.loads(r["pages_json"])} if r else None

    def save_lesson(self, tid: str, title: str, folder: str, pages: Any, lid: Optional[str] = None) -> Dict[str, Any]:
        raw = self._check_pages(pages)
        count = sum(len(p) for p in pages)
        title = _clip(title, 120) or "Bài chưa đặt tên"
        now = time.time()
        if lid is None:
            lid = _new_id()
            self._run("INSERT INTO lessons(id,teacher_id,title,folder,pages_json,page_count,stroke_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", (lid, tid, title, _clip(folder, 60), raw, len(pages), count, now, now))
        elif not self._run("UPDATE lessons SET title=?,folder=?,pages_json=?,page_count=?,stroke_count=?,updated_at=? WHERE id=? AND teacher_id=?", (title, _clip(folder, 60), raw, len(pages), count, now, lid, tid)):
            raise StoreError("not_found")
        return self.get_lesson(tid, lid)  # type: ignore[return-value]

    def delete_lesson(self, tid: str, lid: str) -> bool:
        return self._run("DELETE FROM lessons WHERE id=? AND teacher_id=?", (lid, tid)) > 0

    # ------------------------------------------------------------------ tiết học
    def _period(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": r["id"], "class_id": r["class_id"], "lesson_id": r["lesson_id"], "title": r["title"], "goals": r["goals"], "notes": r["notes"],
            "prompts": json.loads(r["prompts_json"] or "[]"), "status": r["status"], "room_id": r["room_id"], "created_at": r["created_at"],
            "started_at": r["started_at"], "ended_at": r["ended_at"], "has_snapshot": r["board_json"] is not None,
            "submission_count": len(json.loads(r["submissions_json"])) if r["submissions_json"] else 0,
        }

    def list_periods(self, tid: str) -> List[Dict[str, Any]]:
        return [self._period(r) for r in self._all("SELECT * FROM periods WHERE teacher_id=? ORDER BY created_at DESC LIMIT 200", (tid,))]

    def get_period(self, tid: str, pid: str) -> Optional[Dict[str, Any]]:
        r = self._one("SELECT * FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        return self._period(r) if r else None

    def save_period(self, tid: str, data: Dict[str, Any], pid: Optional[str] = None) -> Dict[str, Any]:
        title = _clip(data.get("title"), 120)
        if not title:
            raise StoreError("invalid", "Tiết học cần có tên.")
        class_id, lesson_id = data.get("class_id") or None, data.get("lesson_id") or None
        if class_id and not self.get_class(tid, class_id):
            raise StoreError("invalid", "Lớp không tồn tại.")
        if lesson_id and not self._one("SELECT 1 FROM lessons WHERE id=? AND teacher_id=?", (lesson_id, tid)):
            raise StoreError("invalid", "Bài soạn không tồn tại.")
        prompts = [_clip(p, 200) for p in (data.get("prompts") or []) if _clip(p, 200)][:20] if isinstance(data.get("prompts"), list) else []
        vals = (class_id, lesson_id, title, _clip(data.get("goals"), 2000), _clip(data.get("notes"), 4000), json.dumps(prompts, ensure_ascii=False))
        if pid is None:
            pid = _new_id()
            self._run("INSERT INTO periods(id,teacher_id,class_id,lesson_id,title,goals,notes,prompts_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)", (pid, tid, *vals, time.time()))
        else:
            cur = self._one("SELECT status FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
            if not cur:
                raise StoreError("not_found")
            if cur["status"] == "ended":
                raise StoreError("invalid", "Tiết đã kết thúc, không sửa được.")
            self._run("UPDATE periods SET class_id=?,lesson_id=?,title=?,goals=?,notes=?,prompts_json=? WHERE id=? AND teacher_id=?", (*vals, pid, tid))
        return self.get_period(tid, pid)  # type: ignore[return-value]

    def delete_period(self, tid: str, pid: str) -> bool:
        r = self._one("SELECT status FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        if not r:
            return False
        if r["status"] == "live":
            raise StoreError("invalid", "Hãy kết thúc tiết trước khi xóa.")
        return self._run("DELETE FROM periods WHERE id=? AND teacher_id=?", (pid, tid)) > 0

    def start_period(self, tid: str, pid: str, room_id: str) -> Dict[str, Any]:
        r = self._one("SELECT status FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        if not r:
            raise StoreError("not_found")
        if r["status"] == "ended":
            raise StoreError("invalid", "Tiết đã kết thúc.")
        self._run("UPDATE periods SET status='live', room_id=?, started_at=COALESCE(started_at, ?) WHERE id=? AND teacher_id=?", (room_id, time.time(), pid, tid))
        return self.get_period(tid, pid)  # type: ignore[return-value]

    def end_period(self, tid: str, pid: str, submissions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        r = self._one("SELECT status FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        if not r:
            raise StoreError("not_found")
        if r["status"] != "ended":
            self._run(
                "UPDATE periods SET status='ended', ended_at=?, board_token_hash=NULL, room_id=NULL, submissions_json=COALESCE(?, submissions_json) WHERE id=? AND teacher_id=?",
                (time.time(), json.dumps(submissions, ensure_ascii=False) if submissions is not None else None, pid, tid),
            )
        return self.get_period(tid, pid)  # type: ignore[return-value]

    # ------------------------------------------------------------------ ghép bảng
    def bind_board(self, tid: str, pid: str, board_token: str) -> None:
        if not self._run("UPDATE periods SET board_token_hash=? WHERE id=? AND teacher_id=? AND status='live'", (_sha(board_token), pid, tid)):
            raise StoreError("not_found")

    def period_by_board(self, board_token: str) -> Optional[Dict[str, Any]]:
        """Tiết đang gắn với mã của bảng (chỉ tiết đang diễn ra); kèm teacher_id để bảng thao tác đúng người dạy."""
        if not board_token:
            return None
        r = self._one("SELECT * FROM periods WHERE board_token_hash=? AND status='live'", (_sha(board_token),))
        return {**self._period(r), "teacher_id": r["teacher_id"]} if r else None

    def period_context(self, tid: str, pid: str) -> Optional[Dict[str, Any]]:
        """Mọi thứ bảng cần khi ghép: tiết, lớp, trang của bài soạn (hoặc ảnh chụp bảng nếu đang dạy dở)."""
        r = self._one("SELECT * FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        if not r:
            return None
        pages: Optional[Any] = json.loads(r["board_json"]) if r["board_json"] else None
        if pages is None and r["lesson_id"]:
            lesson = self.get_lesson(tid, r["lesson_id"])
            pages = lesson["pages"] if lesson else None
        return {"period": self._period(r), "class": self.get_class(tid, r["class_id"]) if r["class_id"] else None, "pages": pages, "teacher": self.teacher(tid)}

    def save_snapshot(self, pid: str, pages: Any) -> None:
        raw = self._check_pages(pages)
        self._run("UPDATE periods SET board_json=? WHERE id=? AND status='live'", (raw, pid))

    def get_submissions(self, tid: str, pid: str) -> Optional[List[Dict[str, Any]]]:
        r = self._one("SELECT submissions_json FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        return json.loads(r["submissions_json"]) if r and r["submissions_json"] else None

    def get_snapshot(self, tid: str, pid: str) -> Optional[Any]:
        r = self._one("SELECT board_json FROM periods WHERE id=? AND teacher_id=?", (pid, tid))
        return json.loads(r["board_json"]) if r and r["board_json"] else None


# ------------------------------------------------------------------ bản dùng chung của tiến trình
_instance: Optional[ConsoleDB] = None
_instance_lock = threading.Lock()


def db() -> ConsoleDB:
    global _instance
    with _instance_lock:
        if _instance is None:
            _instance = ConsoleDB(os.getenv("SOCRATIC_DB_PATH") or str(Path(__file__).resolve().parent.parent / ".data" / "console.db"))
        return _instance


def reset_for_tests() -> None:
    global _instance
    with _instance_lock:
        _instance = None
