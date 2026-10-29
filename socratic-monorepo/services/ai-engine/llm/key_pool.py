"""
Multi-Key & Multi-Provider Failover Pool (Gemini Free Keys + OpenRouter Vision/LLM)
-----------------------------------------------------------------------------------
Giải quyết triệt để giới hạn Rate Limit (429 RPM/RPD) của khóa API miễn phí:
1. Cho phép cấu hình NHIỀU khóa Gemini (`GEMINI_API_KEYS=key1,key2,key3` hoặc `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`...)
2. Cho phép cấu hình NHIỀU khóa OpenRouter (`OPENROUTER_API_KEYS=sk-or-...,sk-or-...` hoặc `OPENROUTER_API_KEY`)
3. Tự động xoay vòng (Round-Robin) và cách ly tức thì (Cooldown) khóa bị chạm Rate Limit (429 / Quota Exceeded),
   chuyển sang khóa tiếp theo hoặc chuyển sang OpenRouter ngay trong cùng 1 request mà người dùng không hề hay biết.
"""

import base64
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple, TypeVar

T = TypeVar("T")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Mã model đã đối chiếu với danh mục công khai của OpenRouter (GET /api/v1/models) ngày 2026-10-28.
# Model trả phí rẻ đứng trước (nhanh, ổn định), model miễn phí chỉ là dự phòng cuối (hay bị giới hạn lượt).
# Ghi đè bằng biến môi trường OPENROUTER_VISION_MODELS / OPENROUTER_TEXT_MODELS (ngăn bằng dấu phẩy).
DEFAULT_OPENROUTER_VISION_MODELS = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "qwen/qwen3-vl-30b-a3b-instruct",
    "openai/gpt-4o-mini",
    "google/gemma-4-31b-it:free",
]

DEFAULT_OPENROUTER_TEXT_MODELS = [
    "google/gemini-2.5-flash-lite",
    "qwen/qwen3.7-flash",
    "openai/gpt-4o-mini",
    "google/gemma-4-31b-it:free",
]


def gemini_vision_enabled() -> bool:
    """
    Vision: `auto` (mặc định) = bể khóa Gemini trước (nhiều khóa, có giới hạn tần suất từng khóa), OpenRouter dự phòng;
    `openrouter` = chỉ OpenRouter; `gemini` = chỉ Gemini.
    """
    return (os.getenv("VISION_PROVIDER", "auto") or "auto").strip().lower() in ("auto", "gemini")


def openrouter_vision_enabled() -> bool:
    return (os.getenv("VISION_PROVIDER", "auto") or "auto").strip().lower() in ("auto", "openrouter")


def rpm_limit(provider: str) -> int:
    """Số yêu cầu tối đa mỗi phút cho MỖI khóa (0 = không giới hạn). Đặt thấp hơn hạn mức thật của gói để không bao giờ chạm 429."""
    name = "GEMINI_RPM_PER_KEY" if provider == "gemini" else "OPENROUTER_RPM_PER_KEY"
    default = "8" if provider == "gemini" else "0"
    try:
        return max(0, int(os.getenv(name, default)))
    except ValueError:
        return int(default)

# Thời gian cách ly tạm thời (giây) khi một key gặp lỗi
COOLDOWN_RATE_LIMIT_S = float(os.getenv("KEY_COOLDOWN_RATE_LIMIT_S", "60"))
COOLDOWN_QUOTA_EXHAUSTED_S = float(os.getenv("KEY_COOLDOWN_QUOTA_S", "900"))
COOLDOWN_AUTH_ERROR_S = float(os.getenv("KEY_COOLDOWN_AUTH_S", "1800"))
COOLDOWN_TRANSIENT_S = float(os.getenv("KEY_COOLDOWN_TRANSIENT_S", "15"))
# hết hạn mức THEO NGÀY: thử lại sớm chỉ phí lượt, nên cách ly lâu (hạn mức Gemini đặt lại vào nửa đêm giờ Thái Bình Dương)
COOLDOWN_DAILY_QUOTA_S = float(os.getenv("KEY_COOLDOWN_DAILY_QUOTA_S", str(6 * 3600)))


def _split_keys(raw: Optional[str]) -> List[str]:
    """Tách chuỗi chứa 1 hoặc nhiều API key (phân cách bằng dấu phẩy, chấm phẩy, khoảng trắng hoặc xuống dòng)."""
    if not raw:
        return []
    cleaned = str(raw).strip().strip("'\"")
    if not cleaned:
        return []
    parts = re.split(r"[,;\n\r\s]+", cleaned)
    out: List[str] = []
    for p in parts:
        k = p.strip().strip("'\"")
        if k and k not in out:
            out.append(k)
    return out


def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 10:
        return key[:2] + "***"
    return f"{key[:6]}...{key[-4:]}"


def classify_error_cooldown(err: BaseException) -> Tuple[str, float]:
    """
    Phân loại lỗi từ Gemini / OpenRouter / HTTP để quyết định thời gian cách ly (cooldown)
    và có chuyển sang key tiếp theo ngay hay không.
    """
    msg = str(err).lower()
    cls_name = type(err).__name__.lower()

    # Kiểm tra mã lỗi HTTP nếu là HTTPError
    status_code = getattr(err, "code", None) or getattr(err, "status_code", None)

    if status_code in (401, 403) or any(
        w in msg for w in ("api_key_invalid", "invalid api key", "unauthorized", "permission_denied", "401", "403")
    ):
        return ("auth_error", COOLDOWN_AUTH_ERROR_S)

    compact = msg.replace(" ", "").replace("_", "")
    if "perday" in compact or "requestsperday" in compact or "dailylimit" in compact:
        return ("quota_exhausted", COOLDOWN_DAILY_QUOTA_S)

    if any(
        w in msg
        for w in (
            "quota",
            "daily limit",
            "billing",
            "insufficient_quota",
            "credits",
            "exceeded your current quota",
        )
    ):
        return ("quota_exhausted", COOLDOWN_QUOTA_EXHAUSTED_S)

    if (
        status_code == 429
        or "resourceexhausted" in cls_name
        or any(
            w in msg
            for w in (
                "429",
                "rate limit",
                "rate_limit",
                "too many requests",
                "resource_exhausted",
                "resource exhausted",
            )
        )
    ):
        return ("rate_limit", COOLDOWN_RATE_LIMIT_S)

    return ("transient_error", COOLDOWN_TRANSIENT_S)


class KeyState:
    def __init__(self, key: str, provider: str) -> None:
        self.key = key
        self.provider = provider
        self.cooldown_until: float = 0.0
        self.last_error_reason: Optional[str] = None
        self.last_error_at: Optional[float] = None
        self.success_count: int = 0
        self.fail_count: int = 0
        self.rate_limit_hits: int = 0

    def is_available(self, now: Optional[float] = None) -> bool:
        t = time.time() if now is None else now
        return t >= self.cooldown_until

    def remaining_cooldown(self, now: Optional[float] = None) -> float:
        t = time.time() if now is None else now
        return max(0.0, round(self.cooldown_until - t, 1))


class KeyPoolManager:
    """
    Bộ quản lý bể khóa (Key Pool) an toàn đa luồng:
    - Tự động gom tất cả khóa từ biến môi trường và request header/body.
    - Xoay vòng tải (Round-Robin) giữa các khóa đang khỏe mạnh.
    - Cách ly khóa bị 429/hết quota và tự động phục hồi khi hết thời gian chờ.
    - Tự động trượt (Failover) từ Gemini -> OpenRouter -> Local ONNX.
    """

    def __init__(self, read_env: bool = True) -> None:
        self.read_env = read_env
        self._lock = threading.Lock()
        self._states: Dict[Tuple[str, str], KeyState] = {}
        self._rr_cursor: Dict[str, int] = {"gemini": 0, "openrouter": 0}
        self._runtime_gemini_keys: List[str] = []
        self._runtime_openrouter_keys: List[str] = []
        # nhật ký thời điểm gọi theo từng khóa (cửa sổ trượt 60 s) để tự giữ dưới hạn mức mỗi phút
        self._req_log: Dict[Tuple[str, str], Deque[float]] = {}

    def try_reserve(self, provider: str, key: str, now: Optional[float] = None) -> bool:
        """Giữ một lượt gọi cho khóa này. False nếu khóa đã đủ `rpm_limit` lượt trong 60 s gần nhất (hãy thử khóa khác)."""
        limit = rpm_limit(provider)
        if limit <= 0 or not key:
            return True
        t = time.time() if now is None else now
        with self._lock:
            dq = self._req_log.setdefault((provider, key), deque())
            while dq and t - dq[0] >= 60.0:
                dq.popleft()
            if len(dq) >= limit:
                return False
            dq.append(t)
            return True

    def seconds_until_slot(self, provider: str, keys: List[str], now: Optional[float] = None) -> float:
        """Còn bao lâu nữa thì có ít nhất một khóa trong `keys` được phép gọi (0 nếu đã có)."""
        limit = rpm_limit(provider)
        if limit <= 0 or not keys:
            return 0.0
        t = time.time() if now is None else now
        best = 60.0
        with self._lock:
            for k in keys:
                dq = self._req_log.get((provider, k))
                live = [x for x in (dq or []) if t - x < 60.0]
                if len(live) < limit:
                    return 0.0
                best = min(best, 60.0 - (t - live[0]))
        return max(0.0, best)

    def usage_last_minute(self, provider: str, key: str, now: Optional[float] = None) -> int:
        t = time.time() if now is None else now
        with self._lock:
            return len([x for x in self._req_log.get((provider, key), ()) if t - x < 60.0])

    def clear_runtime_keys(self) -> None:
        with self._lock:
            self._runtime_gemini_keys.clear()
            self._runtime_openrouter_keys.clear()
            self._states.clear()
            self._req_log.clear()
            self._rr_cursor = {"gemini": 0, "openrouter": 0}

    def add_runtime_keys(
        self,
        gemini_keys: Optional[List[str]] = None,
        openrouter_keys: Optional[List[str]] = None,
        replace: bool = False,
    ) -> None:
        with self._lock:
            if gemini_keys is not None:
                parsed_g: List[str] = []
                for k in gemini_keys:
                    parsed_g.extend(_split_keys(k))
                if replace:
                    self._runtime_gemini_keys = list(dict.fromkeys(parsed_g))
                else:
                    for k in parsed_g:
                        if k not in self._runtime_gemini_keys:
                            self._runtime_gemini_keys.append(k)
                for k in parsed_g:
                    st = self._states.get(("gemini", k))
                    if st:
                        st.cooldown_until = 0.0

            if openrouter_keys is not None:
                parsed_or: List[str] = []
                for k in openrouter_keys:
                    parsed_or.extend(_split_keys(k))
                if replace:
                    self._runtime_openrouter_keys = list(dict.fromkeys(parsed_or))
                else:
                    for k in parsed_or:
                        if k not in self._runtime_openrouter_keys:
                            self._runtime_openrouter_keys.append(k)
                for k in parsed_or:
                    st = self._states.get(("openrouter", k))
                    if st:
                        st.cooldown_until = 0.0

    def _collect_env_gemini_keys(self, extra_key: Optional[str] = None) -> List[str]:
        keys: List[str] = []
        for k in _split_keys(extra_key):
            if k not in keys:
                keys.append(k)
        for k in self._runtime_gemini_keys:
            if k not in keys:
                keys.append(k)
        if self.read_env:
            for env_name in ("GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEYS", "GOOGLE_API_KEY"):
                for k in _split_keys(os.getenv(env_name)):
                    if k not in keys:
                        keys.append(k)
            for idx in range(1, 21):
                for k in _split_keys(os.getenv(f"GEMINI_API_KEY_{idx}")):
                    if k not in keys:
                        keys.append(k)
        return keys

    def _collect_env_openrouter_keys(self, extra_key: Optional[str] = None) -> List[str]:
        keys: List[str] = []
        for k in _split_keys(extra_key):
            if k not in keys:
                keys.append(k)
        for k in self._runtime_openrouter_keys:
            if k not in keys:
                keys.append(k)
        if self.read_env:
            for env_name in ("OPENROUTER_API_KEYS", "OPENROUTER_API_KEY"):
                for k in _split_keys(os.getenv(env_name)):
                    if k not in keys:
                        keys.append(k)
            for idx in range(1, 21):
                for k in _split_keys(os.getenv(f"OPENROUTER_API_KEY_{idx}")):
                    if k not in keys:
                        keys.append(k)
        return keys

    def _get_state(self, provider: str, key: str) -> KeyState:
        pair = (provider, key)
        st = self._states.get(pair)
        if st is None:
            st = KeyState(key=key, provider=provider)
            self._states[pair] = st
        return st

    def get_ordered_keys(self, provider: str, extra_key: Optional[str] = None) -> List[str]:
        """
        Trả về danh sách các khóa theo thứ tự ưu tiên:
        1. Các khóa đang khỏe mạnh (xoay vòng Round-Robin để chia đều tải RPM của gói Free).
        2. Nếu TẤT CẢ khóa đều đang trong thời gian Cooldown, vẫn trả về khóa sắp hết Cooldown nhất
           ở cuối danh sách như phương án dự phòng cuối cùng.
        """
        with self._lock:
            raw_keys = (
                self._collect_env_gemini_keys(extra_key)
                if provider == "gemini"
                else self._collect_env_openrouter_keys(extra_key)
            )
            if not raw_keys:
                return []

            now = time.time()
            n = len(raw_keys)
            start = self._rr_cursor.get(provider, 0) % n
            self._rr_cursor[provider] = (start + 1) % n

            rotated = [raw_keys[(start + i) % n] for i in range(n)]
            available: List[str] = []
            cooling: List[Tuple[float, str]] = []

            for k in rotated:
                st = self._get_state(provider, k)
                if st.is_available(now):
                    available.append(k)
                else:
                    cooling.append((st.cooldown_until, k))

            if available:
                return available

            # Nếu mọi key đều đang cooldown, thử key có thời gian chờ ngắn nhất
            cooling.sort(key=lambda item: item[0])
            return [ cooling[0][1] ] if cooling else []

    def has_any_key(self, extra_gemini: Optional[str] = None, extra_openrouter: Optional[str] = None) -> bool:
        with self._lock:
            return bool(
                self._collect_env_gemini_keys(extra_gemini)
                or self._collect_env_openrouter_keys(extra_openrouter)
            )

    def mark_success(self, provider: str, key: str) -> None:
        if not key:
            return
        with self._lock:
            st = self._get_state(provider, key)
            st.success_count += 1
            st.cooldown_until = 0.0
            st.last_error_reason = None

    def mark_failure(
        self,
        provider: str,
        key: str,
        err: BaseException,
        custom_cooldown_s: Optional[float] = None,
    ) -> Tuple[str, float]:
        if not key:
            return ("unknown", 0.0)
        reason, cooldown = classify_error_cooldown(err)
        if custom_cooldown_s is not None:
            cooldown = custom_cooldown_s
        with self._lock:
            st = self._get_state(provider, key)
            st.fail_count += 1
            if reason in ("rate_limit", "quota_exhausted"):
                st.rate_limit_hits += 1
            st.last_error_reason = f"{reason}: {str(err)[:160]}"
            st.last_error_at = time.time()
            st.cooldown_until = time.time() + cooldown
            try:
                print(
                    f"[KeyPool] {provider.upper()} key {mask_api_key(key)} gặp {reason} -> "
                    f"cách ly {cooldown:.0f}s và tự động chuyển key tiếp theo."
                )
            except Exception:
                pass  # lỗi ghi log không được làm hỏng việc đánh dấu khóa lỗi
        return (reason, cooldown)

    def reset_cooldowns(self) -> None:
        with self._lock:
            for st in self._states.values():
                st.cooldown_until = 0.0
                st.last_error_reason = None

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            g_keys = self._collect_env_gemini_keys()
            or_keys = self._collect_env_openrouter_keys()

            def _describe(provider: str, keys: List[str]) -> List[Dict[str, Any]]:
                items = []
                for idx, k in enumerate(keys):
                    st = self._get_state(provider, k)
                    avail = st.is_available(now)
                    items.append(
                        {
                            "index": idx + 1,
                            "masked_key": mask_api_key(k),
                            "status": "active" if avail else "cooldown",
                            "cooldown_remaining_s": st.remaining_cooldown(now),
                            "success_count": st.success_count,
                            "fail_count": st.fail_count,
                            "rate_limit_hits": st.rate_limit_hits,
                            "last_error": st.last_error_reason,
                        }
                    )
                return items

            g_desc = _describe("gemini", g_keys)
            or_desc = _describe("openrouter", or_keys)
            g_active = sum(1 for x in g_desc if x["status"] == "active")
            or_active = sum(1 for x in or_desc if x["status"] == "active")

            return {
                "gemini": {
                    "total": len(g_keys),
                    "active": g_active,
                    "cooling_down": len(g_keys) - g_active,
                    "keys": g_desc,
                },
                "openrouter": {
                    "total": len(or_keys),
                    "active": or_active,
                    "cooling_down": len(or_keys) - or_active,
                    "keys": or_desc,
                    "models": get_openrouter_vision_models(),
                },
                "any_configured": bool(g_keys or or_keys),
                "total_active_keys": g_active + or_active,
            }

    def get_last_error_summary(self) -> str:
        """Trả về tóm tắt chẩn đoán lỗi gần nhất của các khóa để báo cáo HTTP 503 chi tiết."""
        with self._lock:
            reasons = []
            for (prov, key), st in self._states.items():
                if st.last_error_reason:
                    reasons.append(f"{prov.upper()}[{mask_api_key(key)}]: {st.last_error_reason}")
            return " | ".join(reasons) if reasons else ""


def get_openrouter_vision_models() -> List[str]:
    env_models = _split_keys(os.getenv("OPENROUTER_VISION_MODELS") or os.getenv("OPENROUTER_MODEL"))
    return env_models if env_models else list(DEFAULT_OPENROUTER_VISION_MODELS)


def get_openrouter_text_models() -> List[str]:
    env_models = _split_keys(os.getenv("OPENROUTER_TEXT_MODELS") or os.getenv("OPENROUTER_MODEL"))
    return env_models if env_models else list(DEFAULT_OPENROUTER_TEXT_MODELS)


def call_openrouter_vision(
    prompt: str,
    image_bytes: bytes,
    pool: Optional[KeyPoolManager] = None,
    extra_key: Optional[str] = None,
    models: Optional[List[str]] = None,
    timeout_s: float = 10.0,
    opener: Optional[Callable[..., Any]] = None,
) -> Optional[Tuple[str, str]]:
    """
    Gọi OpenRouter Vision API (tương thích chuẩn OpenAI Multimodal Chat Completions)
    với cơ chế tự động xoay vòng qua tất cả các khóa OpenRouter và danh sách model miễn phí/nhanh.
    Trả về `(raw_response_text, model_used)` hoặc `None`.
    """
    mgr = pool or global_key_pool
    keys = mgr.get_ordered_keys("openrouter", extra_key=extra_key)
    if not keys or not image_bytes:
        return None

    b64 = base64.b64encode(image_bytes).decode("utf-8")
    model_list = models or get_openrouter_vision_models()
    http_open = opener or urllib.request.urlopen

    for api_key in keys:
        last_key_err: Optional[Exception] = None
        for model_name in model_list:
            payload = {
                "model": model_name,
                "temperature": 0,
                # giới hạn đầu ra: không đặt thì OpenRouter giữ chỗ theo trần của model (hàng chục nghìn token) và từ chối 402 khi số dư thấp
                "max_tokens": int(os.getenv("OPENROUTER_MAX_TOKENS", "1500")),
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{b64}"},
                            },
                        ],
                    }
                ],
            }
            req = urllib.request.Request(
                OPENROUTER_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://socratic-vision-board.local",
                    "X-Title": "Socratic Vision Board",
                },
                method="POST",
            )
            try:
                with http_open(req, timeout=timeout_s) as resp:
                    raw_body = resp.read().decode("utf-8", errors="replace")
                data = json.loads(raw_body)
                if "error" in data:
                    err_obj = data["error"]
                    err_msg = err_obj.get("message", str(err_obj)) if isinstance(err_obj, dict) else str(err_obj)
                    err_code = err_obj.get("code", 500) if isinstance(err_obj, dict) else 500
                    raise RuntimeError(f"OpenRouter error {err_code}: {err_msg}")
                choices = data.get("choices") or []
                if choices:
                    msg_content = choices[0].get("message", {}).get("content", "")
                    if isinstance(msg_content, list):
                        msg_content = "\n".join(
                            part.get("text", "") for part in msg_content if isinstance(part, dict)
                        )
                    text = str(msg_content or "").strip()
                    if text:
                        mgr.mark_success("openrouter", api_key)
                        return (text, model_name)
            except urllib.error.HTTPError as he:
                body_txt = ""
                try:
                    body_txt = he.read().decode("utf-8", errors="replace")[:200]
                except Exception:
                    pass
                err_wrapped = RuntimeError(f"HTTP {he.code}: {body_txt or he.reason}")
                last_key_err = err_wrapped
                reason, _ = classify_error_cooldown(err_wrapped)
                if reason == "auth_error":
                    # Khóa không hợp lệ -> cách ly khóa và chuyển sang khóa tiếp theo
                    mgr.mark_failure("openrouter", api_key, err_wrapped)
                    break
                # Nếu 429 trên model miễn phí cụ thể -> tiếp tục thử model khác trong danh sách
            except Exception as e:
                last_key_err = e
                reason, _ = classify_error_cooldown(e)
                if reason == "auth_error":
                    mgr.mark_failure("openrouter", api_key, e)
                    break
        else:
            if last_key_err is not None:
                mgr.mark_failure("openrouter", api_key, last_key_err)

    return None


def call_openrouter_text(
    system_prompt: str,
    user_prompt: str,
    pool: Optional[KeyPoolManager] = None,
    extra_key: Optional[str] = None,
    models: Optional[List[str]] = None,
    timeout_s: float = 8.0,
    opener: Optional[Callable[..., Any]] = None,
    max_tokens: Optional[int] = None,
) -> Optional[Tuple[str, str]]:
    """
    Gọi OpenRouter Text Chat Completions cho Gia sư Socratic / Hỏi đáp AI khi Gemini chạm giới hạn.
    """
    mgr = pool or global_key_pool
    keys = mgr.get_ordered_keys("openrouter", extra_key=extra_key)
    if not keys:
        return None

    model_list = models or get_openrouter_text_models()
    http_open = opener or urllib.request.urlopen

    for api_key in keys:
        last_key_err: Optional[Exception] = None
        for model_name in model_list:
            payload = {
                "model": model_name,
                "temperature": 0.3,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            }
            if max_tokens:
                payload["max_tokens"] = max_tokens  # không đặt thì OpenRouter tính theo trần của mô hình (65k) và từ chối khi số dư thấp (HTTP 402)
            req = urllib.request.Request(
                OPENROUTER_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://socratic-vision-board.local",
                    "X-Title": "Socratic Vision Board",
                },
                method="POST",
            )
            try:
                with http_open(req, timeout=timeout_s) as resp:
                    raw_body = resp.read().decode("utf-8", errors="replace")
                data = json.loads(raw_body)
                if "error" in data:
                    err_obj = data["error"]
                    err_msg = err_obj.get("message", str(err_obj)) if isinstance(err_obj, dict) else str(err_obj)
                    raise RuntimeError(f"OpenRouter error: {err_msg}")
                choices = data.get("choices") or []
                if choices:
                    text = str(choices[0].get("message", {}).get("content", "") or "").strip()
                    if text:
                        mgr.mark_success("openrouter", api_key)
                        return (text, model_name)
            except Exception as e:
                last_key_err = e
                reason, _ = classify_error_cooldown(e)
                if reason == "auth_error":
                    mgr.mark_failure("openrouter", api_key, e)
                    break
        else:
            if last_key_err is not None:
                mgr.mark_failure("openrouter", api_key, last_key_err)

    return None


# Singleton quản lý toàn bộ bể khóa cho máy chủ AI Engine
global_key_pool = KeyPoolManager()

