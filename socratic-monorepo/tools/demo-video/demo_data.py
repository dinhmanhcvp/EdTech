"""Dữ liệu dựng sẵn cho các cảnh quay (gọi API thật của máy chủ AI, chạy được nhiều lần): giáo viên, lớp 12A1 có học sinh, bài soạn.
Mã đăng nhập học sinh và link phụ huynh lưu ở demo-state.json cho các cảnh sau (14–18, 26)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

import ink

API = "http://127.0.0.1:8000"
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo-state.json")
TEACHER = {"username": "thaykiem", "password": "matkhau-demo-2026", "display_name": "Thầy Kiệm"}
CLASS_NAME = "12A1"
STUDENTS = ["Hoàng Lan Anh", "Nguyễn Minh", "Lê An", "Trần Bảo", "Phạm Hà", "Đỗ Kha"]
LESSON_TITLE = "Phương trình bậc nhất và tích phân"


def call(method: str, path: str, body=None, token: str = ""):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        if e.code in (400, 409):
            return None
        raise RuntimeError(f"{method} {path}: {e.code} {e.read()[:200]!r}")


def _strokes(strokes, color="#18181B"):
    return [{"id": f"demo-{i}", "points": [{"x": round(x - 210, 1), "y": round(y - 12, 1)} for x, y in s], "color": color, "width": 3}
            for i, s in enumerate(strokes)]


def ensure() -> dict:
    """Tạo (nếu chưa có) và trả về {token, classId, hubClassId, lessonId, students:[{name, loginCode, id}], parentToken}."""
    call("POST", "/api/v1/console/register", TEACHER)
    token = call("POST", "/api/v1/console/login", {"username": TEACHER["username"], "password": TEACHER["password"]})["token"]
    classes = call("GET", "/api/v1/console/classes", token=token)
    classes = classes.get("classes", classes) if isinstance(classes, dict) else classes
    cls = next((c for c in classes if c["name"] == CLASS_NAME), None)
    if not cls:
        cls = call("POST", "/api/v1/console/classes", {"name": CLASS_NAME, "subject": "Toán", "size": 36}, token=token)
    hub_class = call("POST", f"/api/v1/hub/console/classes/{cls['id']}/link", token=token)["hubClassId"]
    roster = call("GET", f"/api/v1/hub/classes/{hub_class}/students", token=token) or {}
    students = roster.get("students", [])
    if not students:
        students = call("POST", f"/api/v1/hub/classes/{hub_class}/students", {"names": STUDENTS}, token=token)["students"]
    lessons = call("GET", "/api/v1/console/lessons", token=token)
    lessons = lessons.get("lessons", lessons) if isinstance(lessons, dict) else lessons
    lesson = next((l for l in lessons if l["title"] == LESSON_TITLE), None)
    if not lesson:
        page = _strokes(ink.text("Phương trình bậc nhất", 330, 120, 56) + ink.text("2x - 4 = 6", 330, 260, 60))
        lesson = call("POST", "/api/v1/console/lessons", {"title": LESSON_TITLE, "folder": "Toán 12", "pages": [page]}, token=token)
    first = students[0]
    parent = call("POST", f"/api/v1/hub/students/{first['id']}/parent-link", token=token)
    state = {"token": token, "classId": cls["id"], "hubClassId": hub_class, "lessonId": lesson["id"],
             "students": [{"id": s["id"], "name": s["name"], "loginCode": s.get("loginCode") or s.get("login_code")} for s in students],
             "parentToken": parent["parentToken"]}
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    return state


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8")
    s = ensure()
    print({k: (v if k != "token" else "***") for k, v in s.items()})
