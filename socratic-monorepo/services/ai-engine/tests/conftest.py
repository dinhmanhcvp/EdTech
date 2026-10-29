"""
Cô lập bài kiểm thử khỏi máy thật:
- Endpoint /settings/keys ghi khóa vào tệp .env. Trước đây kiểm thử ghi các khóa giả ("AIzaSyKeyA"…) đè lên .env thật của người dùng
  và làm mất khóa Gemini/OpenRouter thật đã nhập. Nay mọi lần ghi đi vào một tệp tạm (biến SOCRATIC_ENV_FILE).
- Biến môi trường (khóa, VISION_PROVIDER…) mà bài kiểm thử đặt không rò sang bài sau.
"""
import os

import pytest


@pytest.fixture(autouse=True)
def _isolate_env_file_and_environ(tmp_path, monkeypatch):
    saved = dict(os.environ)
    from llm.model_router import model_router

    model_router.__init__()  # bộ đếm hạn mức theo (khóa, model) không rò sang bài sau
    monkeypatch.setenv("SOCRATIC_ENV_FILE", str(tmp_path / "test.env"))
    # Cơ sở dữ liệu chạy thật (.data/student_context.sqlite3) không bị kiểm thử ghi đè: trước đây một bài kiểm thử ghi snapshot
    # rỗng cho lớp 12A1 và xóa bài giáo viên vừa gửi từ bảng.
    import student_context as store

    monkeypatch.setattr(store, "DB_PATH", tmp_path / "runtime.sqlite3")
    store.init_store()
    yield
    for k in list(os.environ):
        if k not in saved:
            del os.environ[k]
    for k, v in saved.items():
        os.environ[k] = v


# ------------------------------------------------------------------ hub: DB tạm cho từng bài kiểm thử
_HUB_RESETS = (("hub.auth", "_FAILS"), ("hub.suggest", "_PENDING"))


@pytest.fixture
def hub_db(tmp_path, monkeypatch):
    """Hub và student_context cùng ghi vào tệp SQLite tạm của test này (đã cách ly ở fixture autouse), có sẵn dữ liệu mẫu (PIN 2468)."""
    import importlib
    import importlib.util

    import student_context

    monkeypatch.setenv("HUB_DEMO_PIN", "2468")
    path = student_context.DB_PATH
    from hub import db

    db.init_db()
    for mod, attr in _HUB_RESETS:
        if importlib.util.find_spec(mod):
            state = getattr(importlib.import_module(mod), attr, None)
            if state is not None:
                state.clear()
    if importlib.util.find_spec("hub.events"):
        importlib.import_module("hub.events").bus.reset()
    return path


@pytest.fixture
def client(hub_db):
    from fastapi.testclient import TestClient
    from main import app

    return TestClient(app)


def _login(client, path, payload):
    r = client.post(path, json=payload)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture
def teacher_headers():
    return lambda client, teacher_id="gv-demo", pin="2468": _login(client, "/api/v1/hub/auth/teacher", {"teacherId": teacher_id, "pin": pin})


@pytest.fixture
def student_headers():
    return lambda client, code="AN2345": _login(client, "/api/v1/hub/auth/student", {"loginCode": code})


SNAPSHOT_V1 = {
    "sessionId": "lesson-board-local", "className": "12A1", "lessonTitle": "RLC và ma sát", "updatedAt": "2026-10-29T10:00:00Z",
    "boardSnapshots": [
        {"id": "b-rlc", "kind": "BOARD", "title": "Cộng vector RLC", "subject": "PHYSICS",
         "latex": r"\vec{U} = \vec{U}_R + \vec{U}_L + \vec{U}_C", "templateId": "PHYS_RLC_PHASOR",
         "note": "Cộng theo pha, không cộng độ lớn.", "parameters": {"omega": 200}},
        {"id": "b-fr", "kind": "BOARD", "title": "Công của lực ma sát", "subject": "PHYSICS", "latex": "",
         "templateId": "PHYS_INCLINED", "note": "Dấu âm của công ma sát.", "parameters": {}},
    ],
    "studentWork": [],
    "reviewQuestions": ["Vì sao không cộng đại số độ lớn các điện áp?"],
}


def make_package(session_id, **over):
    import copy
    pkg = {"schema": "kp/2", "sessionId": session_id, "planId": "plan-demo-rlc", "planVersion": 1,
           "snapshot": copy.deepcopy(SNAPSHOT_V1),
           "sections": [{"boardSnapshotId": "b-rlc", "planSectionId": "sec-rlc", "kcIds": ["physics-cong-vector-rlc"]},
                        {"boardSnapshotId": "b-fr", "planSectionId": "sec-friction", "kcIds": ["physics-cong-luc-ma-sat"]}],
           "polls": [{"itemId": "it-rlc-q1", "question": "U bằng bao nhiêu?", "options": ["70 V", "50 V", "10 V"], "counts": [3, 9, 1], "total": 13}],
           "usedItemIds": ["it-rlc-f1", "it-rlc-q1"]}
    pkg.update(over)
    return pkg


def open_session(client, teacher_headers, class_id="12a1"):
    """Ghép + claim; trả (session_id, header token bảng)."""
    from hub.events import bus
    p = client.post("/api/v1/hub/pairings", json={}).json()
    q = bus.subscribe(f"pairing:{p['code']}")
    r = client.post(f"/api/v1/hub/pairings/{p['code']}/claim", json={"classId": class_id, "planId": "plan-demo-rlc"}, headers=teacher_headers(client))
    assert r.status_code == 200, r.text
    return r.json()["sessionId"], {"Authorization": f"Bearer {q.get_nowait()['boardToken']}"}


@pytest.fixture
def closed_session(client, teacher_headers):
    sid, board = open_session(client, teacher_headers)
    r = client.post(f"/api/v1/hub/sessions/{sid}/package", json={"requestId": "req-1", "package": make_package(sid)}, headers=board)
    assert r.status_code == 200, r.text
    return {"sessionId": sid, "board": board, "teacherHeaders": teacher_headers(client)}
