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
