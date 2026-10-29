"""Một chỗ duy nhất gọi Vision cho bài tập (OpenRouter mặc định; Gemini khi VISION_PROVIDER bật). Lỗi → None."""
from __future__ import annotations

from typing import Optional

from llm import gemini_rest
from llm.key_pool import call_openrouter_vision, gemini_vision_enabled, global_key_pool, openrouter_vision_enabled
from llm.model_router import model_router


def vision_json(prompt: str, jpeg: bytes, timeout: float) -> Optional[str]:
    if openrouter_vision_enabled():
        try:
            res = call_openrouter_vision(prompt=prompt, image_bytes=jpeg, pool=global_key_pool, timeout_s=timeout)
            if res and res[0].strip():
                return res[0]
        except Exception:
            pass
    if gemini_vision_enabled():
        keys = global_key_pool.get_ordered_keys("gemini")
        for key, model in model_router.plan("vision", keys, gemini_rest.vision_models()):
            try:
                text = gemini_rest.generate_image(model, key, prompt, jpeg, timeout, max_tokens=2500)
                if text.strip():
                    return text
            except Exception:
                continue
    return None
