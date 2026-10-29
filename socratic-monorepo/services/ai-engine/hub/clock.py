"""Một nguồn thời gian duy nhất cho hub để bài kiểm thử đóng băng được (monkeypatch hub.clock.now)."""
import time


def now() -> float:
    return time.time()
