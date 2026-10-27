"""
Router: POST /api/v1/canvas/recognize-ink
Chuyển ảnh chữ viết tay (công thức toán/lý/hóa, văn bản tiếng Việt có dấu) của giáo viên thành văn bản + LaTeX chuẩn
bằng Gemini Vision. Không có khóa API hoặc lỗi mạng -> trả mã 503 để trình duyệt tự dùng bộ nhận dạng cục bộ.
"""
import base64
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request

try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:  # pragma: no cover
    PIL_AVAILABLE = False

router = APIRouter(prefix="/api/v1/canvas", tags=["Handwriting Recognition"])

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]
_TIMEOUT_S = float(os.getenv("INK_RECOGNIZE_TIMEOUT_S", "14"))
_POOL = ThreadPoolExecutor(max_workers=3, thread_name_prefix="ink-recognize")

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
    try:
        data = json.loads(m.group(0))
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


def _call_gemini(image_bytes: bytes, hint: str, api_key: str) -> Optional[Dict[str, Any]]:
    import google.generativeai as genai  # nhập muộn: máy không cài vẫn chạy được các phần khác

    genai.configure(api_key=api_key)
    img = Image.open(io.BytesIO(image_bytes))
    prompt = PROMPT + (f"\nGợi ý ngữ cảnh từ giáo viên: {hint}" if hint else "")
    last_err: Optional[Exception] = None
    for name in GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(name)
            resp = model.generate_content([prompt, img], generation_config={"temperature": 0})
            parsed = parse_recognition(getattr(resp, "text", "") or "")
            if parsed is not None:
                parsed["model"] = name
                return parsed
        except Exception as e:  # thử mô hình kế tiếp
            last_err = e
    if last_err:
        print(f"[recognize-ink] Gemini error: {last_err}")
    return None


def recognize_with_gemini(image_bytes: bytes, hint: str, api_key: str) -> Optional[Dict[str, Any]]:
    """Gọi Gemini trong luồng riêng với thời hạn cứng để không treo máy chủ."""
    fut = _POOL.submit(_call_gemini, image_bytes, hint, api_key)
    try:
        return fut.result(timeout=_TIMEOUT_S)
    except FuturesTimeout:
        print(f"[recognize-ink] quá thời hạn {_TIMEOUT_S}s")
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

    api_key = (request.headers.get("x-gemini-api-key") or body.get("gemini_api_key") or os.getenv("GEMINI_API_KEY") or "").strip().strip("'\"")
    if not api_key:
        raise HTTPException(status_code=503, detail="no_key")

    result = recognize_with_gemini(image_bytes, str(body.get("hint") or "")[:300], api_key)
    if result is None:
        raise HTTPException(status_code=503, detail="vision_unavailable")
    result["engine"] = "gemini"
    return result
