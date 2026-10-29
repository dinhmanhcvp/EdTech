"""Việc chạy nền (AI chấm từng bước). Bài kiểm thử thay `spawn` bằng lời gọi đồng bộ."""
import threading
from typing import Callable


def spawn(fn: Callable[[], None]) -> None:
    threading.Thread(target=fn, daemon=True).start()
