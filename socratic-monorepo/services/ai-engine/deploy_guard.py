"""Bảo vệ bản triển khai công khai (Render): giới hạn tần suất lời gọi tốn khóa AI, bảo vệ điểm cuối ghi khóa, khởi động nóng.

Chỉ có hiệu lực khi APP_ENV=production; chạy local (APP_ENV khác) không đổi hành vi.
"""
from __future__ import annotations

import hmac
import json
import os
import threading
import time
from collections import deque
from typing import Deque, Dict, Iterable, Optional


def is_production() -> bool:
    return os.getenv("APP_ENV", "local").lower() == "production"


# ------------------------------------------------------------------ khóa quản trị cho điểm cuối ghi khóa AI
def admin_ok(headers: Dict[str, str]) -> bool:
    """Điểm cuối lưu khóa AI vào máy chủ chỉ dùng được khi có X-Admin-Token đúng ADMIN_TOKEN (đặt trong Render).

    Không đặt ADMIN_TOKEN thì điểm cuối bị tắt ở bản production; khóa vẫn dùng được từ trình duyệt của từng người
    (gửi kèm mỗi lời gọi, không lưu ở máy chủ).
    """
    if not is_production():
        return True
    token = os.getenv("ADMIN_TOKEN", "")
    supplied = headers.get("x-admin-token", "")
    return bool(token) and hmac.compare_digest(token.encode(), supplied.encode())


# ------------------------------------------------------------------ giới hạn tần suất
class RateLimitMiddleware:
    """Cửa sổ trượt theo IP cho các điểm cuối POST tốn khóa AI của máy chủ.

    Lời gọi mang khóa riêng của người dùng (x-gemini-api-key / x-openrouter-api-key) không bị tính vì không tốn khóa máy chủ.
    Trả 429 kèm Retry-After; đặt trong CORS để phản hồi 429 vẫn có tiêu đề CORS.
    """

    def __init__(self, app, limit: Optional[int] = None, window: float = 60.0, prefixes: Iterable[str] = ()):
        self.app = app
        self.limit = limit if limit is not None else int(os.getenv("RATE_LIMIT_PER_MIN", "90"))
        self.window = window
        self.prefixes = tuple(prefixes)
        self.hits: Dict[str, Deque[float]] = {}
        self.lock = threading.Lock()
        self.enabled = is_production() and self.limit > 0

    @staticmethod
    def _client_ip(scope) -> str:
        hdrs = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        fwd = hdrs.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _allow(self, ip: str) -> Optional[int]:
        now = time.monotonic()
        with self.lock:
            q = self.hits.setdefault(ip, deque())
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                return max(1, int(self.window - (now - q[0])))
            q.append(now)
            if len(self.hits) > 5000:  # dọn IP cũ
                for k in [k for k, v in self.hits.items() if not v or now - v[-1] > self.window]:
                    self.hits.pop(k, None)
        return None

    async def __call__(self, scope, receive, send):
        if self.enabled and scope["type"] == "http" and scope.get("method") == "POST" and scope.get("path", "").startswith(self.prefixes):
            hdrs = {k.decode("latin-1").lower() for k, _ in scope.get("headers", [])}
            # mang khóa AI riêng chỉ miễn giới hạn cho điểm cuối AI; đăng nhập hub luôn bị giới hạn (chống dò PIN)
            byok = not scope.get("path", "").startswith("/api/v1/hub/") and ("x-gemini-api-key" in hdrs or "x-openrouter-api-key" in hdrs)
            if not byok:
                retry = self._allow(self._client_ip(scope))
                if retry is not None:
                    body = json.dumps({"detail": f"Quá nhiều yêu cầu AI từ địa chỉ này. Thử lại sau {retry} giây."}).encode()
                    await send({"type": "http.response.start", "status": 429, "headers": [(b"content-type", b"application/json"), (b"retry-after", str(retry).encode()), (b"content-length", str(len(body)).encode())]})
                    await send({"type": "http.response.body", "body": body})
                    return
        await self.app(scope, receive, send)


# ------------------------------------------------------------------ khởi động nóng
def warm_up() -> None:
    """Nạp trước các thư viện nặng (matplotlib, sympy) để lời gọi đầu tiên của người dùng không bị giật."""

    def work() -> None:
        t0 = time.time()
        try:
            import matplotlib

            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig = plt.figure(figsize=(1, 1))
            fig.add_subplot(111).plot([0, 1], [0, 1])
            fig.canvas.draw()
            plt.close(fig)
            import sympy

            sympy.sympify("sin(x)**2 + cos(x)**2").simplify()
            print(f"[warm-up] xong sau {time.time() - t0:.1f}s")
        except Exception as e:  # không để lỗi khởi động nóng làm hỏng máy chủ
            print(f"[warm-up] bỏ qua: {e}")

    threading.Thread(target=work, daemon=True, name="warm-up").start()
