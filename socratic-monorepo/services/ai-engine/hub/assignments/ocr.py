"""Đọc ảnh vở bằng đường nhận dạng sẵn có (routers/recognize_ink.py): từng dòng + độ tin cậy + ký tự không chắc. Lỗi → None."""
from __future__ import annotations

from typing import Any, Dict, Optional

HINT = "bài làm viết tay trong vở học sinh, nhiều dòng"


def _normalize(raw: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw.get("lines"), list):
        return None
    lines = []
    for ln in raw["lines"]:
        if isinstance(ln, dict) and (ln.get("latex") or ln.get("text")):
            lines.append({k: ln[k] for k in ("text", "latex", "confidence", "y0", "y1") if k in ln})
    uncertain = [u for u in raw.get("uncertain") or [] if isinstance(u, dict) and isinstance(u.get("line"), int)]
    return {"lines": lines, "uncertain": uncertain}


def recognize_image(jpeg: bytes) -> Optional[Dict[str, Any]]:
    from llm.key_pool import gemini_vision_enabled, global_key_pool, openrouter_vision_enabled
    from routers.recognize_ink import recognize_with_gemini, recognize_with_openrouter

    try:
        if openrouter_vision_enabled():
            out = _normalize(recognize_with_openrouter(jpeg, HINT, ""))
            if out:
                return out
        if gemini_vision_enabled():
            keys = global_key_pool.get_ordered_keys("gemini")
            if keys:
                return _normalize(recognize_with_gemini(jpeg, HINT, keys[0]))
    except Exception:
        return None
    return None
