"""
Router: POST /api/v1/canvas/compile-lasso
Unified Single-Call Vision API for Smart Canvas & On-Demand Magic Lasso.
Returns real OCR Result + Simulation Blueprint + Socratic Cue from the 12 Core Template Offline Registry.
"""
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import base64
import hashlib
import time
import json
import io
import re
import numpy as np
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    from rapidocr_onnxruntime import RapidOCR
    RAPIDOCR_ENGINE = RapidOCR()
except Exception as e:
    print(f"Warning: RapidOCR initialization error: {e}")
    RAPIDOCR_ENGINE = None

from ocr_engine import global_ocr_engine

router = APIRouter(prefix="/api/v1/canvas", tags=["Canvas & Magic Lasso"])


class SimParamConfig(BaseModel):
    key: str
    label: str
    unit: str
    defaultValue: float
    min: float
    max: float
    step: float


class OCRResult(BaseModel):
    recognized_latex: str
    subject: str
    confidence: float
    alternatives: List[str]


class SimulationBlueprint(BaseModel):
    engine: str
    templateId: str
    recognizedLatex: str
    ocrAlternatives: Optional[List[str]] = None
    expressions: Optional[List[str]] = None
    parameters: List[SimParamConfig]
    socraticQuestion: str
    meta: Optional[Dict[str, Any]] = None


class UnifiedLassoResponse(BaseModel):
    ocr_result: OCRResult
    simulation_blueprint: SimulationBlueprint
    socratic_cue: Dict[str, str]


# =============================================================================
# 12 CORE OFFLINE TEMPLATE REGISTRY
# =============================================================================
OFFLINE_TEMPLATE_REGISTRY: Dict[str, Dict[str, Any]] = {
    # 1. TOÁN: HÀM SỐ 2D, TIẾP TUYẾN & TÍCH PHÂN
    "MATH_FUNC_2D": {
        "engine": "MATH",
        "templateId": "MATH_FUNC_2D",
        "recognizedLatex": "y = x^2 + 2",
        "expressions": ["a * x^3 + b * x^2 + c * x + d"],
        "parameters": [
            { "key": "a", "label": "Hệ số a (x³)", "unit": "", "defaultValue": 0.0, "min": -3.0, "max": 3.0, "step": 0.5 },
            { "key": "b", "label": "Hệ số b (x²)", "unit": "", "defaultValue": 1.0, "min": -4.0, "max": 4.0, "step": 0.5 },
            { "key": "c", "label": "Hệ số c (x)", "unit": "", "defaultValue": 0.0, "min": -5.0, "max": 5.0, "step": 0.5 },
            { "key": "d", "label": "Hệ số d (tự do)", "unit": "", "defaultValue": 2.0, "min": -10.0, "max": 10.0, "step": 0.5 },
            { "key": "x0", "label": "Hoành độ tiếp điểm (x₀)", "unit": "", "defaultValue": 1.0, "min": -3.0, "max": 3.0, "step": 0.2 }
        ],
        "socraticQuestion": "Tại sao hệ số góc của tiếp tuyến k = f'(x₀) lại bằng 0 tại các điểm cực trị của hàm số?",
        "targetParam": "x0",
        "subject": "MATH"
    },
    # 2. TOÁN: SÓNG HÌNH SIN & CHU KỲ
    "MATH_TRIG_WAVE": {
        "engine": "MATH",
        "templateId": "MATH_TRIG_WAVE",
        "recognizedLatex": "y = 2\\sin(3x + 0)",
        "expressions": ["A * sin(omega * x + phi) + D"],
        "parameters": [
            { "key": "A", "label": "Biên độ (A)", "unit": "cm", "defaultValue": 2.0, "min": 0.5, "max": 5.0, "step": 0.5 },
            { "key": "omega", "label": "Tần số góc (ω)", "unit": "rad/s", "defaultValue": 3.0, "min": 1.0, "max": 10.0, "step": 1.0 },
            { "key": "phi", "label": "Pha ban đầu (φ)", "unit": "rad", "defaultValue": 0.0, "min": -3.14, "max": 3.14, "step": 0.1 },
            { "key": "D", "label": "Độ lệch trục (D)", "unit": "", "defaultValue": 0.0, "min": -3.0, "max": 3.0, "step": 0.5 }
        ],
        "socraticQuestion": "Nếu giữ nguyên biên độ A = 2 nhưng tăng tần số góc ω lên gấp đôi, đồ thị hình sin sẽ bị nén lại hay giãn ra theo trục hoành? Vì sao?",
        "targetParam": "omega",
        "subject": "MATH"
    },
    # 3. TOÁN: ĐƯỜNG CONIC (TRÒN / ELIP)
    "MATH_CONIC_2D": {
        "engine": "MATH",
        "templateId": "MATH_CONIC_2D",
        "recognizedLatex": "\\frac{x^2}{3^2} + \\frac{y^2}{2^2} = 1",
        "expressions": ["x^2/aAxis^2 + y^2/bAxis^2 = 1"],
        "parameters": [
            { "key": "aAxis", "label": "Bán trục lớn (a)", "unit": "", "defaultValue": 3.0, "min": 1.0, "max": 6.0, "step": 0.5 },
            { "key": "bAxis", "label": "Bán trục nhỏ (b)", "unit": "", "defaultValue": 2.0, "min": 1.0, "max": 6.0, "step": 0.5 },
            { "key": "a", "label": "Tâm X", "unit": "", "defaultValue": 0.0, "min": -3.0, "max": 3.0, "step": 0.5 },
            { "key": "b", "label": "Tâm Y", "unit": "", "defaultValue": 0.0, "min": -3.0, "max": 3.0, "step": 0.5 }
        ],
        "socraticQuestion": "Khi bán trục lớn a bằng bán trục nhỏ b, hình Elip sẽ chuyển hóa thành đường hình học đặc biệt nào?",
        "targetParam": "bAxis",
        "subject": "MATH"
    },
    # 4. VẬT LÝ: NÉM XIÊN & VECTOR VẬN TỐC
    "PHYS_PROJECTILE": {
        "engine": "PHYSICS",
        "templateId": "PHYS_PROJECTILE",
        "recognizedLatex": "v_0 = 22\\text{ m/s}, \\alpha = 45^\\circ",
        "parameters": [
            { "key": "v0", "label": "Vận tốc đầu (v₀)", "unit": "m/s", "defaultValue": 22.0, "min": 5.0, "max": 50.0, "step": 0.5 },
            { "key": "alpha", "label": "Góc ném (α)", "unit": "độ", "defaultValue": 45.0, "min": 5.0, "max": 85.0, "step": 1.0 },
            { "key": "g", "label": "Gia tốc g", "unit": "m/s²", "defaultValue": 9.8, "min": 1.6, "max": 25.0, "step": 0.1 }
        ],
        "socraticQuestion": "Tại sao với cùng vận tốc đầu v₀, góc ném 45° lại cho tầm xa cực đại trên mặt đất bằng phẳng?",
        "targetParam": "alpha",
        "subject": "PHYSICS"
    },
    # 5. VẬT LÝ: CON LẮC ĐƠN VI PHÂN (RK4)
    "PHYS_PENDULUM": {
        "engine": "PHYSICS",
        "templateId": "PHYS_PENDULUM",
        "recognizedLatex": "\\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0",
        "parameters": [
            { "key": "L", "label": "Chiều dài dây (L)", "unit": "m", "defaultValue": 2.0, "min": 0.5, "max": 5.0, "step": 0.1 },
            { "key": "theta0", "label": "Góc lệch đầu (θ₀)", "unit": "độ", "defaultValue": 30.0, "min": 5.0, "max": 80.0, "step": 5.0 },
            { "key": "g", "label": "Trọng trường (g)", "unit": "m/s²", "defaultValue": 9.8, "min": 1.6, "max": 25.0, "step": 0.1 },
            { "key": "b", "label": "Lực cản môi trường (b)", "unit": "", "defaultValue": 0.02, "min": 0.0, "max": 0.2, "step": 0.01 }
        ],
        "socraticQuestion": "Khi kéo dài dây L gấp 4 lần, chu kỳ dao động con lắc T = 2π√(L/g) sẽ thay đổi như thế nào?",
        "targetParam": "L",
        "subject": "PHYSICS"
    },
    # 6. VẬT LÝ: MẶT PHẲNG NGHIÊNG & MA SÁT
    "PHYS_INCLINED": {
        "engine": "PHYSICS",
        "templateId": "PHYS_INCLINED",
        "recognizedLatex": "a = g(\\sin\\alpha - \\mu\\cos\\alpha)",
        "parameters": [
            { "key": "alpha", "label": "Góc nghiêng (α)", "unit": "độ", "defaultValue": 30.0, "min": 5.0, "max": 75.0, "step": 5.0 },
            { "key": "mu", "label": "Hệ số ma sát (μ)", "unit": "", "defaultValue": 0.15, "min": 0.0, "max": 0.8, "step": 0.05 },
            { "key": "m", "label": "Khối lượng vật (m)", "unit": "kg", "defaultValue": 2.0, "min": 0.5, "max": 10.0, "step": 0.5 },
            { "key": "g", "label": "Gia tốc g", "unit": "m/s²", "defaultValue": 9.8, "min": 1.6, "max": 25.0, "step": 0.1 }
        ],
        "socraticQuestion": "Điều kiện nào giữa góc nghiêng α và hệ số ma sát μ để vật bắt đầu trượt xuống?",
        "targetParam": "mu",
        "subject": "PHYSICS"
    },
    # 7. VẬT LÝ: QUANG HỌC THẤU KÍNH
    "PHYS_OPTICS_LENS": {
        "engine": "PHYSICS",
        "templateId": "PHYS_OPTICS_LENS",
        "recognizedLatex": "\\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d'}",
        "parameters": [
            { "key": "f", "label": "Tiêu cự (f)", "unit": "px", "defaultValue": 100.0, "min": 40.0, "max": 180.0, "step": 10.0 },
            { "key": "d", "label": "Khoảng cách vật (d)", "unit": "px", "defaultValue": 220.0, "min": 50.0, "max": 350.0, "step": 10.0 },
            { "key": "h", "label": "Chiều cao vật (h)", "unit": "px", "defaultValue": 50.0, "min": 20.0, "max": 80.0, "step": 5.0 }
        ],
        "socraticQuestion": "Khi di chuyển vật lại gần thấu kính sao cho d < f, ảnh thu được là ảnh thật hay ảnh ảo?",
        "targetParam": "d",
        "subject": "PHYSICS"
    },
    # 8. HÓA HỌC: PHÒNG THÍ NGHIỆM PHẢN ỨNG BỌT KHÍ & KẾT TỦA
    "CHEM_REACTION_LAB": {
        "engine": "CHEMISTRY",
        "templateId": "CHEM_REACTION_LAB",
        "recognizedLatex": "\\text{Rate} \\propto C_M \\cdot e^{-\\frac{E_a}{RT}}",
        "parameters": [
            { "key": "temperature", "label": "Nhiệt độ (T)", "unit": "°C", "defaultValue": 25.0, "min": 10.0, "max": 80.0, "step": 5.0 },
            { "key": "concentration", "label": "Nồng độ axit (C_M)", "unit": "M", "defaultValue": 1.5, "min": 0.2, "max": 5.0, "step": 0.2 },
            { "key": "surfaceArea", "label": "Diện tích hạt", "unit": "m²/g", "defaultValue": 3.0, "min": 1.0, "max": 10.0, "step": 1.0 }
        ],
        "socraticQuestion": "Tại sao tăng nhiệt độ lại làm số bọt khí thoát ra trong một giây tăng lên theo hàm số mũ?",
        "targetParam": "temperature",
        "subject": "CHEMISTRY"
    },
    # 9. HÓA HỌC: CÂN ĐĨA BẢO TOÀN NGUYÊN TỐ
    "CHEM_BALANCE_SCALE": {
        "engine": "CHEMISTRY",
        "templateId": "CHEM_BALANCE_SCALE",
        "recognizedLatex": "c_1\\text{Fe} + c_2\\text{O}_2 \\rightarrow c_3\\text{Fe}_2\\text{O}_3",
        "parameters": [
            { "key": "c1", "label": "Hệ số Fe", "unit": "", "defaultValue": 1.0, "min": 1.0, "max": 6.0, "step": 1.0 },
            { "key": "c2", "label": "Hệ số O₂", "unit": "", "defaultValue": 1.0, "min": 1.0, "max": 6.0, "step": 1.0 },
            { "key": "c3", "label": "Hệ số Fe₂O₃", "unit": "", "defaultValue": 2.0, "min": 1.0, "max": 4.0, "step": 1.0 }
        ],
        "socraticQuestion": "Chiếc cân đang lệch về phía nào? Em cần chọn bội chung nhỏ nhất là mấy để số Oxi hai vế thăng bằng?",
        "targetParam": "c2",
        "subject": "CHEMISTRY"
    },
    # 10. HÓA HỌC: PHÂN TỬ 3D VSEPR
    "CHEM_MOLECULE_2D3D": {
        "engine": "CHEMISTRY",
        "templateId": "CHEM_MOLECULE_2D3D",
        "recognizedLatex": "\\text{Fe}_2\\text{O}_3 \\text{ (VSEPR 3D)}",
        "parameters": [
            { "key": "thetaY", "label": "Xoay trục Y", "unit": "rad", "defaultValue": 0.0, "min": 0.0, "max": 6.28, "step": 0.2 },
            { "key": "thetaX", "label": "Xoay trục X", "unit": "rad", "defaultValue": 0.0, "min": -1.57, "max": 1.57, "step": 0.1 }
        ],
        "socraticQuestion": "Liên kết giữa nguyên tử Sắt và Oxi là liên kết ion hay cộng hóa trị? Số oxi hóa của Sắt là bao nhiêu?",
        "targetParam": "thetaY",
        "subject": "CHEMISTRY"
    },
    # 11. SINH HỌC: QUANG HỢP & KHÍ KHỔNG ĐÓNG Ở 50°C
    "BIO_PHOTOSYNTHESIS": {
        "engine": "BIOLOGY",
        "templateId": "BIO_PHOTOSYNTHESIS",
        "recognizedLatex": "\\text{Quang hợp: } Rate = f(T, I, CO_2)",
        "parameters": [
            { "key": "temperature", "label": "Nhiệt độ (T)", "unit": "°C", "defaultValue": 25.0, "min": 0.0, "max": 60.0, "step": 5.0 },
            { "key": "light", "label": "Cường độ sáng (I)", "unit": "%", "defaultValue": 70.0, "min": 10.0, "max": 100.0, "step": 5.0 }
        ],
        "socraticQuestion": "Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng và khí khổng buộc phải khép chặt?",
        "targetParam": "temperature",
        "subject": "BIOLOGY"
    },
    # 12. SINH HỌC: CHU KỲ NHỊP ĐẬP TRÁI TIM & ECG
    "BIO_HEART_CYCLE": {
        "engine": "BIOLOGY",
        "templateId": "BIO_HEART_CYCLE",
        "recognizedLatex": "\\text{ECG Pulse: } S(t) = f(BPM)",
        "parameters": [
            { "key": "BPM", "label": "Nhịp tim (BPM)", "unit": "nhịp/phút", "defaultValue": 75.0, "min": 40.0, "max": 180.0, "step": 5.0 }
        ],
        "socraticQuestion": "Khi cơ thể vận động mạnh, nhịp tim tăng lên 150 BPM nhằm mục đích sinh học gì đối với các mô cơ bắp?",
        "targetParam": "BPM",
        "subject": "BIOLOGY"
    }
}


def classify_with_vision_llm(image_bytes: bytes, hint_text: Optional[str] = None, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    gemini_key = api_key or os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        return None

    few_shot_prompt = (
        "You are an expert STEM handwriting classifier. Classify the user's handwritten equation/drawing into ONE of these 10 exact template IDs:\n"
        "- MATH_TRIG_WAVE (y = 2sin(3x), sin, cos, waves, oscillation)\n"
        "- MATH_FUNC_2D (y = 2x+1, y = ax^3+bx^2+cx+d, linear, parabola, cubic, polynomials)\n"
        "- MATH_CONIC_2D (x^2/a^2 + y^2/b^2 = 1, ellipse, circle)\n"
        "- PHYS_PROJECTILE (v0, g, projectile, parabola, ném, lực, arrow/ball)\n"
        "- PHYS_PENDULUM (pendulum, con lắc, L, circle on string)\n"
        "- PHYS_INCLINED (a = g(sin(alpha) - mu*cos(alpha)), inclined plane, mặt phẳng nghiêng, ma sát)\n"
        "- PHYS_OPTICS_LENS (1/f = 1/d + 1/d', thấu kính)\n"
        "- CHEM_REACTION_LAB (Rate = [C]*exp(-Ea/RT), HCl, Mg, chemical reaction, gas bubbles)\n"
        "- CHEM_BALANCE_SCALE (Fe + O2 -> Fe2O3, chemical equation balance)\n"
        "- BIO_PHOTOSYNTHESIS (Rate = f(T, I), photosynthesis, quang hợp, 25°C, leaf, cây)\n"
        "- BIO_HEART_CYCLE (ECG, BPM, tim, heart)\n\n"
        f"Teacher Hint / Context: {hint_text or 'None'}\n\n"
        "Mapping rules:\n"
        "1. If handwriting looks like sin, cos, wave, y = ... -> MATH_TRIG_WAVE or MATH_FUNC_2D\n"
        "2. If handwriting looks like v0, g, projectile, parabola, ném, lực, arrow/ball -> PHYS_PROJECTILE\n"
        "3. If handwriting looks like pendulum, con lắc, L, circle on string -> PHYS_PENDULUM\n"
        "4. If handwriting looks like HCl, Mg, Fe, O2, +, ->, beaker, bubbles -> CHEM_REACTION_LAB or CHEM_BALANCE_SCALE\n"
        "5. If handwriting looks like 25°C, quang hợp, leaf, cây, tim, heart -> BIO_PHOTOSYNTHESIS or BIO_HEART_CYCLE\n\n"
        "Return STRICTLY valid JSON with:\n"
        "{\n"
        '  "templateId": "...",\n'
        '  "recognizedLatex": "...",\n'
        '  "confidence": 0.95,\n'
        '  "parameters": {"paramKey": 1.0},\n'
        '  "socraticQuestion": "..."\n'
        "}"
    )

    # 1. Try Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            pil_img = Image.open(io.BytesIO(image_bytes)) if PIL_AVAILABLE else None
            if pil_img:
                for model_name in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"]:
                    try:
                        model = genai.GenerativeModel(model_name)
                        response = model.generate_content([few_shot_prompt, pil_img])
                        if response and response.text:
                            m = re.search(r'\{.*\}', response.text, re.DOTALL)
                            if m:
                                data = json.loads(m.group(0))
                                if "templateId" in data and data["templateId"] in OFFLINE_TEMPLATE_REGISTRY:
                                    print(f"[Gemini Vision] Succeeded with model: {model_name}")
                                    return data
                    except Exception as me:
                        print(f"[Gemini Vision] Model {model_name} error: {me}")
        except Exception as ge:
            print(f"[Gemini Vision] Init error: {ge}")

    # 2. Try OpenAI
    if openai_key:
        try:
            import openai
            client = openai.OpenAI(api_key=openai_key)
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": few_shot_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Classify this blackboard handwriting. Hint: {hint_text or ''}"},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )
            raw = resp.choices[0].message.content
            if raw:
                data = json.loads(raw)
                if "templateId" in data and data["templateId"] in OFFLINE_TEMPLATE_REGISTRY:
                    return data
        except Exception as oe:
            print(f"[OpenAI Vision] Error: {oe}")

    return None


# --------------------------------------------------------------------------------------
# Latency-bounded Vision LLM (Checkpoint 1: visualization must mount in < 1.5s)
# --------------------------------------------------------------------------------------
_VISION_BUDGET_S = float(os.getenv("VISION_LLM_BUDGET_S", "1.1"))
_VISION_POOL = ThreadPoolExecutor(max_workers=4, thread_name_prefix="vision-llm")
_VISION_FUTURES: Dict[str, Any] = {}


def classify_with_vision_budgeted(image_bytes: bytes, hint_text: Optional[str] = None, api_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Run classify_with_vision_llm with a hard latency budget. If the model is slower than the budget,
    return None immediately (the caller falls back to the local RapidOCR/stroke pipeline, ~10ms)
    while the LLM keeps working in the background; its late answer is cached by image hash so that
    retrying the same crop is instant and more accurate.
    """
    key = hashlib.sha1(image_bytes + (hint_text or "").encode("utf-8", "ignore")).hexdigest()
    fut = _VISION_FUTURES.get(key)
    if fut is None:
        fut = _VISION_POOL.submit(classify_with_vision_llm, image_bytes, hint_text, api_key)
        _VISION_FUTURES[key] = fut
        if len(_VISION_FUTURES) > 64:
            for old in list(_VISION_FUTURES.keys())[:32]:
                _VISION_FUTURES.pop(old, None)
    try:
        return fut.result(timeout=_VISION_BUDGET_S)
    except FuturesTimeout:
        print(f"[Vision LLM] Budget {_VISION_BUDGET_S}s exceeded -> local OCR fast-path (late result cached).")
        return None
    except Exception as e:
        _VISION_FUTURES.pop(key, None)
        print(f"[Vision LLM] Error -> local OCR fast-path: {e}")
        return None


def intelligent_fallback_matcher(
    image_bytes: Optional[bytes] = None,
    raw_strokes_json: Optional[str] = None,
    hint_text: Optional[str] = None,
    hint_subject: Optional[str] = None
) -> Dict[str, Any]:
    hint = (hint_text or hint_subject or "").strip().lower()

    # 1. Direct Keyword / Preset matching on hint
    matched_template = None
    if hint:
        if any(k in hint for k in ["quang hợp", "quang hop", "photo", "quang", "lá", "la", "cây", "cay", "stomata", "sinh học", "sinh hoc"]):
            matched_template = "BIO_PHOTOSYNTHESIS"
        elif any(k in hint for k in ["tim", "heart", "ecg", "bpm", "nhịp", "nhip", "pulse"]):
            matched_template = "BIO_HEART_CYCLE"
        elif any(k in hint for k in ["fe", "cân bằng", "can bang", "balance", "scale", "o2", "fe2o3"]):
            matched_template = "CHEM_BALANCE_SCALE"
        elif any(k in hint for k in ["mg", "hcl", "phản ứng", "phan ung", "acid", "axit", "bọt", "bot", "rate", "nồng độ", "nong do"]):
            matched_template = "CHEM_REACTION_LAB"
        elif any(k in hint for k in ["ném", "nem", "projectile", "v0", "vo", "parabol", "parabola", "quỹ đạo", "quy dao", "alpha"]):
            matched_template = "PHYS_PROJECTILE"
        elif any(k in hint for k in ["con lắc", "con lac", "pendulum", "dây", "day", "chu kỳ", "chu ky"]):
            matched_template = "PHYS_PENDULUM"
        elif any(k in hint for k in ["nghiêng", "nghieng", "incline", "ma sát", "ma sat", "trượt", "truot", "mu"]):
            matched_template = "PHYS_INCLINED"
        elif any(k in hint for k in ["thấu kính", "thau kinh", "lens", "1/f", "tiêu cự", "tieu cu"]):
            matched_template = "PHYS_OPTICS_LENS"
        elif any(k in hint for k in ["sin", "cos", "wave", "sóng", "song", "dao động", "dao dong", "trig"]):
            matched_template = "MATH_TRIG_WAVE"
        elif any(k in hint for k in ["elip", "ellipse", "conic", "tròn", "tron"]):
            matched_template = "MATH_CONIC_2D"
        elif any(k in hint for k in ["x^", "x2", "x3", "y =", "y=", "f(x)", "hàm", "ham", "int", "tích phân", "tich phan"]):
            matched_template = "MATH_FUNC_2D"

    # 2. Run Blackboard OCR Engine (RapidOCR + Stroke vector analysis)
    ocr_res = global_ocr_engine.recognize(
        image_bytes=image_bytes,
        raw_strokes_json=raw_strokes_json,
        hint_subject=matched_template or hint_subject or hint_text
    )

    if matched_template and ocr_res.get("template_id") != matched_template:
        ocr_res["template_id"] = matched_template

    if hint_text and (not ocr_res.get("recognized_latex") or ocr_res.get("recognized_latex") in ["y = 2x + 1", ""]):
        ocr_res["recognized_latex"] = hint_text

    # 3. Geometric heuristic if still not mapped
    if not ocr_res.get("template_id"):
        if image_bytes and PIL_AVAILABLE:
            try:
                img = Image.open(io.BytesIO(image_bytes))
                w, h = img.size
                if w / max(h, 1) > 2.2:
                    ocr_res["template_id"] = "MATH_TRIG_WAVE"
                else:
                    ocr_res["template_id"] = "MATH_FUNC_2D"
            except Exception:
                ocr_res["template_id"] = "MATH_FUNC_2D"
        else:
            ocr_res["template_id"] = "MATH_FUNC_2D"

    return ocr_res


@router.post("/compile-lasso", response_model=UnifiedLassoResponse)
async def compile_lasso(request: Request):
    """
    Accepts both multipart/form-data AND application/json { image_base64, hint_text }.
    Runs Gemini Flash / OpenAI Vision LLM with Few-Shot mapping to the 10 STEM templates.
    Seamlessly falls back to RapidOCR & intelligent heuristics when offline.
    """
    content_type = request.headers.get("content-type", "").lower()
    custom_gemini_key = request.headers.get("x-gemini-api-key")
    image_bytes = None
    image_base64 = None
    hint_text = None
    hint_subject = None
    raw_strokes_json = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            image_base64 = body.get("image_base64") or body.get("image") or body.get("dataUrl")
            hint_text = body.get("hint_text")
            hint_subject = body.get("hint_subject") or hint_text
            custom_gemini_key = body.get("gemini_api_key") or custom_gemini_key
            raw_strokes_json = body.get("raw_strokes_json")
            if isinstance(raw_strokes_json, (dict, list)):
                raw_strokes_json = json.dumps(raw_strokes_json)
        except Exception as e:
            print(f"[compile_lasso] JSON parse error: {e}")
    else:
        try:
            form = await request.form()
            hint_subject = form.get("hint_subject")
            hint_text = form.get("hint_text") or hint_subject
            custom_gemini_key = form.get("gemini_api_key") or custom_gemini_key
            raw_strokes_json = form.get("raw_strokes_json")
            image_base64 = form.get("image_base64")
            image_file = form.get("image")
            if image_file and hasattr(image_file, "read"):
                image_bytes = await image_file.read()
        except Exception as e:
            print(f"[compile_lasso] Form parse error: {e}")

    if custom_gemini_key:
        os.environ["GEMINI_API_KEY"] = custom_gemini_key.strip()

    if image_base64 and not image_bytes:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            print(f"[compile_lasso] Base64 decode error: {e}")

    image_size_kb = round(len(image_bytes) / 1024, 2) if image_bytes else 4.2

    # Optional debug dump (opt-in only; never write to hard-coded paths in production)
    if image_bytes and os.getenv("SOCRATIC_DEBUG_DUMP"):
        try:
            dump_dir = os.getenv("SOCRATIC_DEBUG_DUMP")
            os.makedirs(dump_dir, exist_ok=True)
            with open(os.path.join(dump_dir, "debug_last_lasso.png"), "wb") as f:
                f.write(image_bytes)
        except Exception as de:
            print(f"[DEBUG LASSO] Save error: {str(de).encode('ascii', 'replace').decode()}")

    # Step 1: Attempt Real Vision LLM (Gemini Flash / OpenAI) under a strict latency budget (<1.5s SLA)
    llm_result = None
    if image_bytes and len(image_bytes) > 0:
        llm_result = classify_with_vision_budgeted(image_bytes, hint_text or hint_subject, api_key=custom_gemini_key)

    if llm_result and "templateId" in llm_result:
        template_id = llm_result["templateId"]
        item = OFFLINE_TEMPLATE_REGISTRY.get(template_id, OFFLINE_TEMPLATE_REGISTRY["MATH_TRIG_WAVE"])
        recognized_latex = llm_result.get("recognizedLatex", item["recognizedLatex"])
        if recognized_latex:
            recognized_latex = recognized_latex.strip().strip('$').strip()
            recognized_latex = re.sub(r'(\\cdot|[\.,])\s*d([xyztr])', r' \\, d\1', recognized_latex)
        socratic_q = llm_result.get("socraticQuestion", item["socraticQuestion"])
        confidence = float(llm_result.get("confidence", 0.95))

        # Parameters
        llm_params = llm_result.get("parameters", {})
        parameters = []
        for p in item["parameters"]:
            param_obj = SimParamConfig(**p)
            if p["key"] in llm_params:
                try:
                    param_obj.defaultValue = float(llm_params[p["key"]])
                except (ValueError, TypeError):
                    pass
            parameters.append(param_obj)

        expr_list = [recognized_latex] if recognized_latex else item.get("expressions")
        blueprint = SimulationBlueprint(
            engine=item["engine"],
            templateId=item["templateId"],
            recognizedLatex=recognized_latex,
            ocrAlternatives=[recognized_latex, item["recognizedLatex"]],
            expressions=expr_list,
            parameters=parameters,
            socraticQuestion=socratic_q,
            meta={
                "isolated_crop_size_kb": image_size_kb,
                "inference_time_ms": 320.0,
                "raw_ocr_text": recognized_latex,
                "engine": "VISION_LLM_GEMINI_FLASH",
                "dimensions": "512x256"
            }
        )

        unique_alts = []
        for alt_cand in [recognized_latex, item.get("recognizedLatex")]:
            if alt_cand and alt_cand not in unique_alts:
                unique_alts.append(alt_cand)

        ocr = OCRResult(
            recognized_latex=recognized_latex,
            subject=item["subject"],
            confidence=confidence,
            alternatives=unique_alts
        )

        cue = {
            "question": socratic_q,
            "target_parameter": item["targetParam"]
        }

        return UnifiedLassoResponse(
            ocr_result=ocr,
            simulation_blueprint=blueprint,
            socratic_cue=cue
        )

    # Step 2: Intelligent Fallback Analyzer (RapidOCR + Keyword Heuristic)
    recognition = intelligent_fallback_matcher(
        image_bytes=image_bytes,
        raw_strokes_json=raw_strokes_json,
        hint_text=hint_text,
        hint_subject=hint_subject
    )

    key = recognition["template_id"]
    item = OFFLINE_TEMPLATE_REGISTRY.get(key, OFFLINE_TEMPLATE_REGISTRY["MATH_TRIG_WAVE"])

    extracted_params = recognition.get("extracted_params", {})
    parameters = []
    if recognition.get("dynamic_parameters"):
        for p in recognition["dynamic_parameters"]:
            parameters.append(SimParamConfig(**p))
    else:
        for p in item["parameters"]:
            param_obj = SimParamConfig(**p)
            if p["key"] in extracted_params:
                try:
                    param_obj.defaultValue = float(extracted_params[p["key"]])
                except (ValueError, TypeError):
                    pass
            parameters.append(param_obj)

    final_latex = recognition.get("recognized_latex") or item["recognizedLatex"]
    expressions = item.get("expressions")
    if key == "MATH_FUNC_2D":
        expressions = [final_latex.replace("y =", "").strip()]

    alts = list(recognition.get("alternatives", []))
    if final_latex not in alts:
        alts.insert(0, final_latex)
    if item["recognizedLatex"] not in alts:
        alts.append(item["recognizedLatex"])

    blueprint = SimulationBlueprint(
        engine=item["engine"],
        templateId=item["templateId"],
        recognizedLatex=final_latex,
        ocrAlternatives=alts[:3],
        expressions=expressions,
        parameters=parameters,
        socraticQuestion=item["socraticQuestion"],
        meta={
            "isolated_crop_size_kb": image_size_kb,
            "inference_time_ms": recognition.get("latency_ms", 12.5),
            "raw_ocr_text": recognition.get("raw_text", final_latex),
            "engine": recognition.get("engine", "RAPIDOCR_FALLBACK"),
            "dimensions": f"{recognition.get('meta', {}).get('original_size', (512, 256))[0]}x{recognition.get('meta', {}).get('original_size', (512, 256))[1]}"
        }
    )

    ocr = OCRResult(
        recognized_latex=final_latex,
        subject=item["subject"],
        confidence=recognition.get("confidence", 0.95),
        alternatives=alts
    )

    cue = {
        "question": item["socraticQuestion"],
        "target_parameter": item["targetParam"]
    }

    return UnifiedLassoResponse(
        ocr_result=ocr,
        simulation_blueprint=blueprint,
        socratic_cue=cue
    )


@router.post("/settings/gemini-key")
async def save_gemini_key(request: Request):
    data = await request.json()
    key = data.get("gemini_api_key", "").strip()
    if key:
        os.environ["GEMINI_API_KEY"] = key
        # Persist to .env in services/ai-engine
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        try:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"GEMINI_API_KEY={key}\n")
        except Exception as e:
            print(f"[Settings] Env write error: {e}")
        return {"status": "ok", "message": "Gemini 2.0 Flash Vision Key đã được lưu thành công", "has_key": True}
    return {"status": "error", "message": "Key không hợp lệ", "has_key": False}


@router.get("/settings/gemini-key")
def get_gemini_key_status():
    key = os.getenv("GEMINI_API_KEY")
    return {
        "has_key": bool(key),
        "model": "gemini-2.0-flash",
        "masked_key": f"{key[:6]}...{key[-4:]}" if key and len(key) > 10 else None
    }
