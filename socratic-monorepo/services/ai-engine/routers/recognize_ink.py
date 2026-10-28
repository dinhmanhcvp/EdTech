"""
Router: POST /api/v1/canvas/recognize-ink
Chuyển ảnh chữ viết tay (công thức toán/lý/hóa, văn bản tiếng Việt có dấu) của giáo viên thành văn bản + LaTeX chuẩn
bằng Gemini Vision. Không có khóa API hoặc lỗi mạng -> trả mã 503 để trình duyệt tự dùng bộ nhận dạng cục bộ.
"""
import base64
import hashlib
import io
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from collections import OrderedDict
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, TimeoutError as FuturesTimeout, wait
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request

from llm import gemini_rest
from llm.model_router import model_router
from llm.key_pool import call_openrouter_vision, classify_error_cooldown, gemini_vision_enabled, global_key_pool, mask_api_key, openrouter_vision_enabled

try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:  # pragma: no cover
    PIL_AVAILABLE = False

router = APIRouter(prefix="/api/v1/canvas", tags=["Handwriting Recognition"])

# thứ tự và cách tắt suy nghĩ lấy từ llm/gemini_rest.py (đã đo thật); ghi đè bằng GEMINI_VISION_MODELS
GEMINI_MODELS = gemini_rest.vision_models()
_TIMEOUT_S = float(os.getenv("INK_RECOGNIZE_TIMEOUT_S", "14"))
_POOL = ThreadPoolExecutor(max_workers=6, thread_name_prefix="ink-recognize")
# Tăng tốc Vision: ảnh nhỏ gọn, JSON trả thẳng, gọi REST (an toàn đa luồng), nhân đôi yêu cầu khi chậm, nhớ kết quả
_MAX_SIDE = int(os.getenv("INK_IMAGE_MAX_SIDE", "720"))
_HEDGE_S = float(os.getenv("INK_HEDGE_AFTER_S", "3.0"))
_CALL_TIMEOUT_S = float(os.getenv("INK_GEMINI_CALL_TIMEOUT_S", "9"))
_CACHE_MAX = 96
_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_cache_lock = threading.Lock()
_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def prepare_image(image_bytes: bytes) -> bytes:
    """Ảnh xám, cạnh dài tối đa ~720 px, JPEG: nhẹ hơn nhiều so với PNG gốc nên tải lên và suy luận nhanh hơn."""
    try:
        im = Image.open(io.BytesIO(image_bytes)).convert("L")
        w, h = im.size
        k = _MAX_SIDE / max(w, h)
        if k < 1:
            im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=82, optimize=True)
        return buf.getvalue()
    except Exception:
        return image_bytes


def _cache_key(jpeg: bytes, hint: str) -> str:
    return hashlib.sha1(jpeg + b"|" + hint.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> Optional[Dict[str, Any]]:
    with _cache_lock:
        hit = _cache.get(key)
        if hit is not None:
            _cache.move_to_end(key)
            return dict(hit)
    return None


def _cache_put(key: str, value: Dict[str, Any]) -> None:
    with _cache_lock:
        _cache[key] = dict(value)
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)


def _gemini_rest(model: str, key: str, prompt: str, jpeg: bytes, timeout: float) -> str:
    """Một lần generateContent qua REST (xem llm/gemini_rest.py). Lỗi HTTP ném ra urllib.error.HTTPError (có .code) để phân loại cooldown."""
    return gemini_rest.generate_image(model, key, prompt, jpeg, timeout, max_tokens=700)


PROMPT = (
    "Bạn là hệ thống nhận dạng chữ viết tay trên bảng của giáo viên (toán, vật lí, hóa học, sinh học; tiếng Việt có dấu).\n"
    "Đọc CHÍNH XÁC những gì được viết trong ảnh, không tự giải, không thêm bớt. Mỗi dòng viết tay là một phần tử.\n"
    "Với mỗi dòng trả về:\n"
    '- "text": văn bản thuần dễ gõ (dùng x^2, sqrt(x), a/b; giữ nguyên chữ tiếng Việt có dấu);\n'
    '- "latex": LaTeX chuẩn hiển thị được bằng KaTeX (\\frac, \\sqrt, ^, _, \\alpha, \\cdot, \\le ...). Phần chữ thường đặt trong \\text{...};\n'
    '- "confidence": số từ 0 đến 1.\n'
    'Trả về DUY NHẤT một JSON: {"lines":[{"text":"...","latex":"...","confidence":0.9}],"alternatives":["latex khác nếu mơ hồ"]}\n'
    "Nếu ảnh không có chữ viết, trả về {\"lines\":[],\"alternatives\":[]}."
)


def _clamp01(v: Any, default: float = 0.8) -> float:
    try:
        return max(0.0, min(1.0, float(v)))
    except (TypeError, ValueError):
        return default


def classify_intent_from_text(text: str, line_count: int = 1) -> Dict[str, Any]:
    """Phân loại mục đích của người dùng: Trực quan hóa công thức (VISUALIZE) hay Chấm bài học sinh (GRADE)."""
    text_lower = text.lower()
    has_keywords = bool(re.search(r'(bài\s*làm|lời\s*giải|ta\s*có|suy\s*ra|đáp\s*số|kết\s*quả|bước|\bđs\b|\bkq\b|thay\s*vào|chứng\s*minh|giải\s*ra)', text_lower))
    has_derivation = bool(re.search(r'(=>|\\Rightarrow|\\Leftrightarrow|\\therefore)', text)) or text.count('=') >= 3
    is_multiline = line_count >= 3

    grade_score = 0
    if has_keywords:
        grade_score += 65
    if has_derivation:
        grade_score += 45
    if is_multiline:
        grade_score += 30

    intent = "GRADE" if grade_score >= 50 else "VISUALIZE"
    conf = min(0.98, max(0.72, 0.65 + grade_score / 150.0))
    reason = "Phát hiện bài làm nhiều bước của học sinh" if intent == "GRADE" else "Phát hiện công thức toán hoặc mô phỏng STEM"
    return {
        "detected_intent": intent,
        "intent_confidence": round(conf, 2),
        "intent_reason": reason,
    }


def parse_recognition(raw: str) -> Optional[Dict[str, Any]]:
    """Trích JSON từ câu trả lời của mô hình và chuẩn hóa. Trả None nếu không dùng được."""
    if not raw:
        return None
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    clean_json = m.group(0)
    try:
        data = json.loads(clean_json)
    except json.JSONDecodeError:
        # Tự động sửa lỗi dấu phẩy thừa ở cuối mảng/object mà một số mô hình OpenRouter có thể trả về
        clean_json = re.sub(r",\s*([\}\]])", r"\1", clean_json)
        try:
            data = json.loads(clean_json)
        except json.JSONDecodeError:
            return None
    lines: List[Dict[str, Any]] = []
    for item in data.get("lines", []) or []:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text", "")).strip()
        latex = str(item.get("latex", "")).strip()
        if not text and not latex:
            continue
        # bỏ rào $...$ / \[...\] mà mô hình hay thêm
        latex = re.sub(r"^\$+|\$+$", "", latex).strip()
        latex = re.sub(r"^\\\[|\\\]$", "", latex).strip()
        lines.append({"text": text or latex, "latex": latex or text, "confidence": _clamp01(item.get("confidence"))})
    alts = [str(a).strip() for a in (data.get("alternatives") or []) if str(a).strip()][:4]
    if not lines and not alts:
        return {
            "lines": [],
            "text": "",
            "latex": "",
            "confidence": 0.0,
            "alternatives": [],
            "detected_intent": "VISUALIZE",
            "intent_confidence": 0.8,
            "intent_reason": "Chưa có nét chữ",
        }
    conf = sum(l["confidence"] for l in lines) / len(lines) if lines else 0.0
    joined_text = "\n".join(l["text"] for l in lines)
    intent_data = classify_intent_from_text(joined_text, len(lines))
    return {
        "lines": lines,
        "text": joined_text,
        "latex": " \\\\ ".join(l["latex"] for l in lines) if len(lines) > 1 else (lines[0]["latex"] if lines else ""),
        "confidence": round(conf, 3),
        "alternatives": alts,
        "detected_intent": intent_data["detected_intent"],
        "intent_confidence": intent_data["intent_confidence"],
        "intent_reason": intent_data["intent_reason"],
    }


def _call_gemini(image_bytes: bytes, hint: str, api_key: str, key_offset: int = 0) -> Optional[Dict[str, Any]]:
    candidate_keys = global_key_pool.get_ordered_keys("gemini", extra_key=api_key)
    if not candidate_keys and api_key:
        candidate_keys = [api_key]
    if key_offset and len(candidate_keys) > 1:
        k = key_offset % len(candidate_keys)
        candidate_keys = candidate_keys[k:] + candidate_keys[:k]

    jpeg = prepare_image(image_bytes)
    prompt = PROMPT + (f"\nGợi ý ngữ cảnh từ giáo viên: {hint}" if hint else "")
    last_err: Optional[Exception] = None
    # (khóa, model) theo hạn mức: model RPD lớn trước, khóa dùng ít nhất trước; hết lượt thì thôi để OpenRouter đỡ (không đập vào 429)
    bad_keys: set = set()
    tried: Dict[str, int] = {}
    key_pos = {k: i + 1 for i, k in enumerate(candidate_keys)}
    for current_key, name in model_router.plan("vision", candidate_keys, GEMINI_MODELS, skip=bad_keys):
        tried[current_key] = tried.get(current_key, 0) + 1
        t_call = time.time()
        try:
            text = _gemini_rest(name, current_key, prompt, jpeg, _CALL_TIMEOUT_S)
            model_router.note_latency(name, time.time() - t_call)
            parsed = parse_recognition(text)
            if parsed is not None:
                global_key_pool.mark_success("gemini", current_key)
                parsed["model"] = name
                parsed["key_index"] = key_pos.get(current_key, 1)
                parsed["masked_key"] = mask_api_key(current_key)
                return parsed
        except Exception as e:
            last_err = e
            model_router.note_failure(current_key, name, e, time.time() - t_call)
            if classify_error_cooldown(e)[0] == "auth_error":
                # khóa không hợp lệ: bỏ khóa này cho lần gọi này và cách ly
                global_key_pool.mark_failure("gemini", current_key, e)
                bad_keys.add(current_key)
    if last_err:
        print(f"[recognize-ink] Gemini pool error across {len(candidate_keys)} key(s): {last_err}")
    return None


def recognize_with_gemini(image_bytes: bytes, hint: str, api_key: str) -> Optional[Dict[str, Any]]:
    """Gemini Vision với: nhớ kết quả theo ảnh, và nhân đôi yêu cầu sang khóa khác nếu lần đầu chậm quá _HEDGE_S giây."""
    jpeg = prepare_image(image_bytes)
    ck = _cache_key(jpeg, hint)
    hit = _cache_get(ck)
    if hit is not None:
        hit["cached"] = True
        return hit

    futs = [_POOL.submit(_call_gemini, image_bytes, hint, api_key, 0)]
    deadline = time.monotonic() + _TIMEOUT_S
    hedged = False
    result: Optional[Dict[str, Any]] = None
    while futs and time.monotonic() < deadline:
        wait_for = max(0.05, (_HEDGE_S if not hedged else deadline - time.monotonic()))
        done, pending = wait(futs, timeout=min(wait_for, deadline - time.monotonic()), return_when=FIRST_COMPLETED)
        for f in done:
            futs.remove(f)
            try:
                r = f.result()
            except Exception:
                r = None
            if r is not None and result is None:
                result = r
        if result is not None:
            break
        if not done and not hedged and len(global_key_pool.get_ordered_keys("gemini", extra_key=api_key)) > 1:
            hedged = True
            futs.append(_POOL.submit(_call_gemini, image_bytes, hint, api_key, 1))
        elif not done:
            hedged = True  # chỉ một khóa: không có gì để nhân đôi, chờ tiếp
    for f in futs:
        f.cancel()
    if result is None:
        print(f"[recognize-ink] no result within {_TIMEOUT_S}s")
        return None
    _cache_put(ck, result)
    return result


def _call_openrouter(image_bytes: bytes, hint: str, openrouter_key: str = "") -> Optional[Dict[str, Any]]:
    prompt = PROMPT + (f"\nGợi ý ngữ cảnh từ giáo viên: {hint}" if hint else "")
    res = call_openrouter_vision(
        prompt=prompt,
        image_bytes=image_bytes,
        pool=global_key_pool,
        extra_key=openrouter_key or None,
        timeout_s=min(_TIMEOUT_S, 11.0),
    )
    if not res:
        return None
    raw_text, model_used = res
    parsed = parse_recognition(raw_text)
    if parsed is not None:
        parsed["model"] = model_used
        parsed["engine"] = "openrouter"
    return parsed


def recognize_with_openrouter(image_bytes: bytes, hint: str, openrouter_key: str = "") -> Optional[Dict[str, Any]]:
    """Gọi OpenRouter Vision khi Gemini bị chạm Rate Limit hoặc khi chỉ cấu hình OpenRouter."""
    fut = _POOL.submit(_call_openrouter, image_bytes, hint, openrouter_key)
    try:
        return fut.result(timeout=_TIMEOUT_S)
    except FuturesTimeout:
        print(f"[recognize-ink] OpenRouter timeout {_TIMEOUT_S}s")
        return None


def recognize_with_local_onnx(
    image_bytes: bytes,
    raw_strokes_json: Optional[str] = None,
    hint: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Nhận dạng công thức toán 2D & chữ viết tay 100% offline trên máy chủ Python local
    bằng mô hình Neural ONNX (`pix2text-mfr-1.5` VisionEncoderDecoder + `RapidOCR`).
    Trả về None nếu ảnh rỗng (chẳng hạn ảnh trắng stub trong unit test) hoặc khi mô hình không sẵn sàng.
    """
    try:
        from ocr_engine import LOCAL_MATH_ONNX, RAPIDOCR_ENGINE, BlackboardOCREngine, LocalMathONNXEngine
    except Exception as e:
        print(f"[recognize-ink] cannot load ocr_engine: {e}")
        return None

    parsed_strokes = None
    if raw_strokes_json:
        try:
            s_obj = json.loads(raw_strokes_json)
            if isinstance(s_obj, list) and len(s_obj) > 0:
                parsed_strokes = s_obj
        except Exception:
            parsed_strokes = None

    if not parsed_strokes and not LocalMathONNXEngine.has_ink_content(image_bytes=image_bytes):
        return None

    # 1. Chạy mô hình Neural 2D Math Formula (Pix2Text MFR-1.5 ONNX)
    mfr_res = None
    if LOCAL_MATH_ONNX is not None:
        mfr_res = LOCAL_MATH_ONNX.recognize_formula(
            image_bytes=image_bytes,
            strokes_data=parsed_strokes,
        )

    # 2. Chạy RapidOCR nếu cần kiểm tra từ khóa Tiếng Việt hoặc khi MFR không sẵn sàng
    rapid_text = ""
    rapid_conf = 0.0
    if RAPIDOCR_ENGINE is not None:
        try:
            pil_im = LocalMathONNXEngine.prepare_formula_pil(image_bytes=image_bytes, strokes_data=parsed_strokes)
            if pil_im is not None:
                import numpy as np
                ocr_out, _ = RAPIDOCR_ENGINE(np.asarray(pil_im))
                if ocr_out:
                    rapid_text, rapid_conf = BlackboardOCREngine.assemble_math_tokens(ocr_out)
        except Exception:
            pass

    if mfr_res and mfr_res.get("lines"):
        lines = mfr_res["lines"]
        joined_text = mfr_res.get("text") or "\n".join(l["text"] for l in lines)
        joined_latex = mfr_res.get("latex") or " \\\\ ".join(l["latex"] for l in lines)
        conf = float(mfr_res.get("confidence", 0.92))
        alts = list(mfr_res.get("alternatives") or [])
        if rapid_text and rapid_text not in alts and rapid_text != joined_latex:
            alts.append(rapid_text)
        intent_data = classify_intent_from_text(joined_text, len(lines))
        return {
            "lines": lines,
            "text": joined_text,
            "latex": joined_latex,
            "confidence": round(conf, 3),
            "alternatives": alts[:4],
            "detected_intent": intent_data["detected_intent"],
            "intent_confidence": intent_data["intent_confidence"],
            "intent_reason": intent_data["intent_reason"],
            "model": mfr_res.get("model", "pix2text-mfr-1.5-onnx"),
            "engine": "local_onnx",
        }

    if rapid_text:
        intent_data = classify_intent_from_text(rapid_text, 1)
        return {
            "lines": [{"text": rapid_text, "latex": rapid_text, "confidence": round(rapid_conf, 3)}],
            "text": rapid_text,
            "latex": rapid_text,
            "confidence": round(rapid_conf, 3),
            "alternatives": [],
            "detected_intent": intent_data["detected_intent"],
            "intent_confidence": intent_data["intent_confidence"],
            "intent_reason": intent_data["intent_reason"],
            "model": "rapidocr-onnx",
            "engine": "local_onnx",
        }

    return None


@router.post("/recognize-ink")
async def recognize_ink(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Body phải là JSON.")
    b64 = (body.get("image_base64") or "").strip()
    if "," in b64[:64]:
        b64 = b64.split(",", 1)[1]
    if not b64:
        raise HTTPException(status_code=400, detail="Thiếu image_base64.")
    try:
        image_bytes = base64.b64decode(b64, validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="image_base64 không hợp lệ.")
    if not PIL_AVAILABLE:
        raise HTTPException(status_code=503, detail="Máy chủ thiếu Pillow.")

    hint = str(body.get("hint") or "")[:300]
    raw_strokes_json = body.get("raw_strokes_json")
    # Phân tầng: Vision (Gemini → OpenRouter) trước, mô hình cục bộ chỉ là phương án dự phòng.
    # Chỉ khi khách yêu cầu RÕ "prefer_offline" mới chạy cục bộ trước.
    prefer_offline = bool(body.get("prefer_offline"))

    req_gemini_key = (request.headers.get("x-gemini-api-key") or body.get("gemini_api_key") or "").strip().strip("'\"")
    req_openrouter_key = (request.headers.get("x-openrouter-api-key") or body.get("openrouter_api_key") or "").strip().strip("'\"")

    if not gemini_vision_enabled():
        req_gemini_key = ""  # Vision chỉ qua OpenRouter (mặc định); VISION_PROVIDER=auto|gemini để bật lại Gemini
    ordered_gemini_keys = global_key_pool.get_ordered_keys("gemini", extra_key=req_gemini_key or None) if gemini_vision_enabled() else []
    ordered_openrouter_keys = global_key_pool.get_ordered_keys("openrouter", extra_key=req_openrouter_key or None)

    api_key = req_gemini_key or (ordered_gemini_keys[0] if ordered_gemini_keys else "")
    openrouter_key = req_openrouter_key or (ordered_openrouter_keys[0] if ordered_openrouter_keys else "")
    has_any_cloud_key = bool(api_key or openrouter_key)

    # 1. Local Neural ONNX (Pix2Text MFR-1.5 + RapidOCR) chỉ chạy trước khi bật prefer_offline hoặc khi KHÔNG có khóa Cloud nào
    local_result: Optional[Dict[str, Any]] = None
    if prefer_offline or not has_any_cloud_key:
        local_result = recognize_with_local_onnx(image_bytes, raw_strokes_json=raw_strokes_json, hint=hint)
        if local_result is not None:
            return local_result

    if not has_any_cloud_key:
        raise HTTPException(status_code=503, detail="no_key")

    # 2. Gọi bể khóa Gemini Vision (tự động xoay vòng qua nhiều khóa khi chạm Rate Limit 429)
    if api_key:
        result = recognize_with_gemini(image_bytes, hint, api_key)
        if result is not None:
            result["engine"] = "gemini"
            return result

    # 3. Tự động chuyển sang bể khóa OpenRouter Vision nếu tất cả khóa Gemini chạm giới hạn hoặc lỗi
    if openrouter_key and openrouter_vision_enabled():
        or_result = recognize_with_openrouter(image_bytes, hint, openrouter_key)
        if or_result is not None:
            or_result["engine"] = "openrouter"
            return or_result

    # 4. Fallback sang Local Neural ONNX nếu mọi khóa Cloud đều quá hạn hoặc lỗi mạng
    if local_result is None:
        local_result = recognize_with_local_onnx(image_bytes, raw_strokes_json=raw_strokes_json, hint=hint)
    if local_result is not None:
        return local_result

    err_summary = global_key_pool.get_last_error_summary()
    detail_msg = f"vision_unavailable: {err_summary}" if err_summary else "vision_unavailable"
    raise HTTPException(status_code=503, detail=detail_msg)
