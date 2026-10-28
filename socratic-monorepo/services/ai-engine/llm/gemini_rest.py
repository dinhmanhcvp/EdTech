"""
Gọi Gemini qua REST (an toàn đa luồng, không cần SDK) dùng chung cho Vision và gia sư Socratic.

Số liệu đo thật ngày 2026-10-29 trên 4 khóa AI Studio (đọc một dòng chữ viết, ảnh ~700 px):
- gemini-3-flash-preview + thinkingLevel=minimal: ~1,6 s, đọc đúng (✓ → "vuông góc");
- cùng model KHÔNG đặt thinking: ~4,8 s, tốn ~670 token "suy nghĩ" nên JSON bị cụt → không đọc được;
- gemini-3.6-flash / 3.5-flash minimal: ~2,0 / ~2,7 s; gemini-3.5-flash-lite và gemini-flash-lite-latest: 8 đến 19 s (quá chậm);
- gemini-2.5-flash: chỉ còn dùng được với khóa cũ (khóa mới trả 404 "no longer available to new users");
- gemini-3.7-flash không nhận thinkingLevel=minimal (400).
Danh sách và thứ tự ghi đè được bằng biến môi trường GEMINI_VISION_MODELS (ngăn bằng dấu phẩy).
"""

import base64
import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

DEFAULT_VISION_MODELS = [
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
]

DEFAULT_TEXT_MODELS = [
    "gemini-3-flash-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
]


def _models(env_name: str, default: List[str]) -> List[str]:
    raw = os.getenv(env_name, "")
    out = [m.strip() for m in re.split(r"[,;\s]+", raw) if m.strip()]
    return out or list(default)


def vision_models() -> List[str]:
    return _models("GEMINI_VISION_MODELS", DEFAULT_VISION_MODELS)


def text_models() -> List[str]:
    return _models("GEMINI_TEXT_MODELS", DEFAULT_TEXT_MODELS)


def thinking_config(model: str) -> Optional[Dict[str, Any]]:
    """Đọc chữ/sinh câu hỏi ngắn không cần suy nghĩ dài: tắt hoặc tối thiểu để nhanh và không làm cụt JSON."""
    m = model.lower()
    if m.startswith("gemini-3"):
        return {"thinkingLevel": "minimal"}
    if m.startswith("gemini-2.5-flash") and "lite" not in m:
        return {"thinkingBudget": 0}
    return None


def _post(model: str, key: str, payload: Dict[str, Any], timeout: float) -> Dict[str, Any]:
    req = urllib.request.Request(
        GEMINI_URL.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")[:300]
        except Exception:
            pass
        # giữ .code để classify_error_cooldown phân loại được 429/403/503
        raise urllib.error.HTTPError(e.url, e.code, f"{e.reason} {body}", e.headers, None)


def _text_of(data: Dict[str, Any]) -> str:
    parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts")) or []
    return "".join(p.get("text", "") for p in parts if isinstance(p, dict) and not p.get("thought"))


def generate(
    model: str,
    key: str,
    parts: List[Dict[str, Any]],
    timeout: float,
    max_tokens: int = 700,
    json_mode: bool = True,
    system: Optional[str] = None,
) -> str:
    """Một lần generateContent. Model không nhận cấu hình suy nghĩ (400 nhắc "thinking") thì thử lại một lần không cấu hình."""
    cfg: Dict[str, Any] = {"temperature": 0, "maxOutputTokens": max_tokens}
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    th = thinking_config(model)
    if th:
        cfg["thinkingConfig"] = th
    payload: Dict[str, Any] = {"contents": [{"parts": parts}], "generationConfig": cfg}
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    try:
        return _text_of(_post(model, key, payload, timeout))
    except urllib.error.HTTPError as e:
        if e.code == 400 and th and "thinking" in str(e.reason).lower():
            cfg.pop("thinkingConfig", None)
            return _text_of(_post(model, key, payload, timeout))
        raise


def generate_image(model: str, key: str, prompt: str, jpeg: bytes, timeout: float, max_tokens: int = 700) -> str:
    parts = [{"text": prompt}, {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(jpeg).decode("ascii")}}]
    return generate(model, key, parts, timeout, max_tokens=max_tokens, json_mode=True)


def generate_text(model: str, key: str, prompt: str, timeout: float, system: Optional[str] = None, max_tokens: int = 300) -> str:
    return generate(model, key, [{"text": prompt}], timeout, max_tokens=max_tokens, json_mode=False, system=system)
