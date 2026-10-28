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
    monkeypatch.setenv("SOCRATIC_ENV_FILE", str(tmp_path / "test.env"))
    yield
    for k in list(os.environ):
        if k not in saved:
            del os.environ[k]
    for k, v in saved.items():
        os.environ[k] = v
