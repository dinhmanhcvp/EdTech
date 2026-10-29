"""Pub/sub trong bộ nhớ + phản hồi text/event-stream.

Hub chạy một tiến trình (Render free, 1 instance) nên bus không cần Redis. Hàng đợi là queue.Queue (an toàn giữa các luồng:
TestClient và threadpool của FastAPI chạy ở luồng khác vòng lặp sự kiện). Kênh: pairing:{code}, board:{session_id}, teacher:{teacher_id}.
"""
from __future__ import annotations

import asyncio
import json
import queue
import threading
import time
from typing import AsyncIterator, Callable, Dict, List, Optional

from fastapi.responses import StreamingResponse


class Bus:
    def __init__(self) -> None:
        self._subs: Dict[str, List[queue.Queue]] = {}
        self._lock = threading.Lock()

    def subscribe(self, channel: str) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=256)
        with self._lock:
            self._subs.setdefault(channel, []).append(q)
        return q

    def unsubscribe(self, channel: str, q: queue.Queue) -> None:
        with self._lock:
            subs = self._subs.get(channel, [])
            if q in subs:
                subs.remove(q)
            if not subs:
                self._subs.pop(channel, None)

    def publish(self, channel: str, event: dict) -> int:
        with self._lock:
            subs = list(self._subs.get(channel, []))
        for q in subs:
            try:
                q.put_nowait(event)
            except queue.Full:  # người nghe chậm: bỏ sự kiện, client tự tải lại trạng thái khi nối lại
                pass
        return len(subs)

    def reset(self) -> None:
        with self._lock:
            self._subs.clear()


bus = Bus()


def _frame(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def sse_iter(q: queue.Queue, first: Optional[dict] = None, until: Optional[Callable[[dict], bool]] = None,
                   heartbeat_s: float = 15.0, poll_s: float = 0.2) -> AsyncIterator[str]:
    if first is not None:
        yield _frame(first)
        if until and until(first):
            return
    last = time.monotonic()
    while True:
        try:
            event = q.get_nowait()
        except queue.Empty:
            if time.monotonic() - last >= heartbeat_s:
                last = time.monotonic()
                yield ": ping\n\n"
            await asyncio.sleep(poll_s)
            continue
        last = time.monotonic()
        yield _frame(event)
        if until and until(event):
            return


def sse_response(channel: str, first: Optional[dict] = None, until: Optional[Callable[[dict], bool]] = None) -> StreamingResponse:
    q = bus.subscribe(channel)

    async def body() -> AsyncIterator[str]:
        try:
            async for chunk in sse_iter(q, first, until):
                yield chunk
        finally:
            bus.unsubscribe(channel, q)

    return StreamingResponse(body(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
