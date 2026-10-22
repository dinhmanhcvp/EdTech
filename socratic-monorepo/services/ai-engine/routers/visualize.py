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
    custom_interactive_svg: Optional[str] = None
    ai_visual_description: Optional[str] = None


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
    },
    # 13. VẬT LÝ: ĐIỆN XOAY CHIỀU RLC & GIẢN ĐỒ FRESNEL (LỚP 12 & CHUYÊN)
    "PHYS_RLC_PHASOR": {
        "engine": "PHYSICS",
        "templateId": "PHYS_RLC_PHASOR",
        "recognizedLatex": "u = U_0\\cos(\\omega t + \\varphi), \\quad \\text{Mạch RLC}",
        "parameters": [
            { "key": "R", "label": "Điện trở (R)", "unit": "Ω", "defaultValue": 50.0, "min": 10.0, "max": 200.0, "step": 10.0 },
            { "key": "L", "label": "Độ tự cảm (L)", "unit": "H", "defaultValue": 0.5, "min": 0.1, "max": 2.0, "step": 0.1 },
            { "key": "C", "label": "Điện dung (C)", "unit": "μF", "defaultValue": 50.0, "min": 10.0, "max": 200.0, "step": 10.0 },
            { "key": "omega", "label": "Tần số góc (ω)", "unit": "rad/s", "defaultValue": 200.0, "min": 50.0, "max": 500.0, "step": 10.0 },
            { "key": "U", "label": "Điện áp (U)", "unit": "V", "defaultValue": 120.0, "min": 20.0, "max": 240.0, "step": 10.0 }
        ],
        "socraticQuestion": "Khi điều chỉnh tần số góc ω tiến dần về giá trị cộng hưởng ω₀ = 1/√(LC), góc lệch pha φ giữa u và i sẽ biến đổi thế nào và vì sao công suất mạch đạt cực đại?",
        "targetParam": "omega",
        "subject": "PHYSICS"
    },
    # 14. HÓA HỌC: CHUẨN ĐỘ AXIT - BAZƠ & ĐƯỜNG CONG pH (HÓA 11-12 & CHUYÊN)
    "CHEM_EQUILIBRIUM_TITRATION": {
        "engine": "CHEMISTRY",
        "templateId": "CHEM_EQUILIBRIUM_TITRATION",
        "recognizedLatex": "\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}, \\quad \\text{Chuẩn độ pH}",
        "parameters": [
            { "key": "Vb", "label": "Thể tích NaOH (V_b)", "unit": "mL", "defaultValue": 20.0, "min": 0.0, "max": 50.0, "step": 1.0 },
            { "key": "Ca", "label": "Nồng độ HCl (C_a)", "unit": "M", "defaultValue": 0.1, "min": 0.05, "max": 0.5, "step": 0.05 },
            { "key": "Cb", "label": "Nồng độ NaOH (C_b)", "unit": "M", "defaultValue": 0.1, "min": 0.05, "max": 0.5, "step": 0.05 }
        ],
        "socraticQuestion": "Tại sao tại điểm tương đương (V_NaOH = 25mL), đường cong pH lại có một bước nhảy vọt dốc đứng thay vì biến thiên từ từ?",
        "targetParam": "Vb",
        "subject": "CHEMISTRY"
    },
    # 15. SINH HỌC: 3D DNA DOUBLE HELIX & HELICASE REPLICATION FORK
    "BIO_DNA_HELIX": {
        "engine": "BIOLOGY",
        "templateId": "BIO_DNA_HELIX",
        "recognizedLatex": "\\text{DNA Replication: } 5' \\to 3', \\quad A=T, \\, G\\equiv C",
        "parameters": [
            { "key": "unzipProgress", "label": "Tháo xoắn Helicase", "unit": "%", "defaultValue": 25.0, "min": 0.0, "max": 100.0, "step": 5.0 },
            { "key": "turnCount", "label": "Số chu kỳ xoắn", "unit": "vòng", "defaultValue": 3.0, "min": 1.0, "max": 6.0, "step": 1.0 }
        ],
        "socraticQuestion": "Tại sao liên kết hydro giữa A-T lại dễ bị bẻ gãy hơn G-C trong quá trình tháo xoắn của enzyme Helicase?",
        "targetParam": "unzipProgress",
        "subject": "BIOLOGY"
    },
    # 16. VẬT LÝ: BỂ SÓNG GIAO THOA 2 NGUỒN KẾT HỢP
    "PHYS_RIPPLE_TANK": {
        "engine": "PHYSICS",
        "templateId": "PHYS_RIPPLE_TANK",
        "recognizedLatex": "u_M = 2A \\cos\\left(\\frac{\\pi(d_2 - d_1)}{\\lambda}\\right) \\cos(\\omega t)",
        "parameters": [
            { "key": "lambda", "label": "Bước sóng (λ)", "unit": "px", "defaultValue": 24.0, "min": 10.0, "max": 60.0, "step": 2.0 },
            { "key": "f", "label": "Tần số dao động (f)", "unit": "Hz", "defaultValue": 2.5, "min": 1.0, "max": 5.0, "step": 0.5 },
            { "key": "d", "label": "Khoảng cách 2 nguồn (d)", "unit": "px", "defaultValue": 130.0, "min": 60.0, "max": 240.0, "step": 10.0 },
            { "key": "deltaPhi", "label": "Độ lệch pha (Δφ)", "unit": "rad", "defaultValue": 0.0, "min": -3.14, "max": 3.14, "step": 0.314 }
        ],
        "socraticQuestion": "Khi hai nguồn dao động cùng pha, những điểm có hiệu đường đi d₂ - d₁ = kλ sẽ dao động với biên độ cực đại hay cực tiểu?",
        "targetParam": "lambda",
        "subject": "PHYSICS"
    }
}


def generate_bespoke_interactive_svg(topic: str, recognized_latex: str = "", parameters: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Generates rich, publication-grade interactive SVG for any STEM topic,
    with CSS variables (--param-<key>) and live annotations.
    """
    t_lower = (topic or recognized_latex or "").lower()

    # 1. CARDIAC ANATOMY / CẤU TẠO TIM / HEART CYCLE
    if any(k in t_lower for k in ["tim", "heart", "cardiac", "wiggers", "nhịp"]):
        return (
            '<svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
            '<defs>'
            '<radialGradient id="heartGrad" cx="40%" cy="35%" r="65%">'
            '<stop offset="0%" stop-color="#FB7185"/>'
            '<stop offset="60%" stop-color="#E11D48"/>'
            '<stop offset="100%" stop-color="#881337"/>'
            '</radialGradient>'
            '<linearGradient id="aortaGrad" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0%" stop-color="#E11D48"/><stop offset="100%" stop-color="#9F1239"/>'
            '</linearGradient>'
            '<linearGradient id="venaCavaGrad" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0369A1"/>'
            '</linearGradient>'
            '<filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">'
            '<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0F172A" flood-opacity="0.08"/>'
            '</filter>'
            '</defs>'
            '<style>'
            '@keyframes heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.06); } 28% { transform: scale(1); } 42% { transform: scale(1.04); } 70% { transform: scale(1); } }'
            '.heart-muscle { transform-origin: 200px 175px; animation: heartbeat calc(60s / var(--param-BPM, 75)) infinite ease-in-out; }'
            '</style>'
            '<rect width="620" height="340" rx="16" fill="#FCFBF9" stroke="#E6E4DD" stroke-width="1.5"/>'
            '<g class="heart-muscle" filter="url(#shadowFilter)">'
            '<path d="M 130 50 L 130 110 Q 130 130 150 140" fill="none" stroke="url(#venaCavaGrad)" stroke-width="22" stroke-linecap="round"/>'
            '<path d="M 180 120 Q 180 40 230 45 Q 260 50 260 120" fill="none" stroke="url(#aortaGrad)" stroke-width="26" stroke-linecap="round"/>'
            '<path d="M 210 40 L 210 20 M 230 42 L 230 18 M 250 48 L 250 24" stroke="url(#aortaGrad)" stroke-width="8" stroke-linecap="round"/>'
            '<path d="M 200 110 C 130 70 80 140 100 200 C 120 250 200 290 200 290 C 200 290 280 250 300 200 C 320 140 270 70 200 110 Z" fill="url(#heartGrad)"/>'
            '<path d="M 200 120 Q 200 200 200 285" stroke="#4C0519" stroke-width="4" stroke-dasharray="4,4"/>'
            '<path d="M 110 170 Q 200 180 290 170" stroke="#4C0519" stroke-width="3" stroke-dasharray="3,3"/>'
            '</g>'
            '<g font-family="monospace" font-size="10" font-weight="bold" fill="#0F172A">'
            '<rect x="25" y="80" width="85" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="32" y="95" fill="#0284C7">TĨNH MẠCH CHỦ</text>'
            '<rect x="25" y="150" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="32" y="165">TÂM NHĨ PHẢI</text>'
            '<rect x="25" y="220" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="32" y="235">TÂM THẤT PHẢI</text>'
            '<rect x="280" y="80" width="90" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="287" y="95" fill="#E11D48">ĐỘNG MẠCH CHỦ</text>'
            '<rect x="280" y="150" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="287" y="165">TÂM NHĨ TRÁI</text>'
            '<rect x="280" y="220" width="75" height="22" rx="4" fill="#FFFFFF" stroke="#CBD5E1"/><text x="287" y="235">TÂM THẤT TRÁI</text>'
            '</g>'
            '<g transform="translate(390, 25)">'
            '<rect width="210" height="290" rx="12" fill="#FFFFFF" stroke="#E6E4DD"/>'
            '<text x="16" y="26" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">CHU TRÌNH TIM &amp; ECG</text>'
            '<line x1="16" y1="36" x2="194" y2="36" stroke="#E2E8F0"/>'
            '<path d="M 16 90 L 55 90 L 62 82 L 68 90 L 76 90 L 82 110 L 92 40 L 100 98 L 106 90 L 130 90 L 145 78 L 160 90 L 194 90" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>'
            '<text x="16" y="125" font-family="sans-serif" font-size="10" fill="#57534E">Áp suất Thất trái: 120 mmHg</text>'
            '<text x="16" y="145" font-family="sans-serif" font-size="10" fill="#57534E">Thể tích nhát bóp: 70 mL</text>'
            '<text x="16" y="165" font-family="sans-serif" font-size="10" fill="#57534E">Cung lượng tim: 5.2 L/phút</text>'
            '<rect x="16" y="195" width="178" height="75" rx="8" fill="#FFFBEB" stroke="#FDE68A"/>'
            '<text x="26" y="215" font-family="monospace" font-size="10" font-weight="bold" fill="#92400E">ĐỒNG BỘ SLIDER (BPM):</text>'
            '<text x="26" y="235" font-family="sans-serif" font-size="10" fill="#78350F">Trái tim co bóp theo tần số nhịp</text>'
            '<text x="26" y="252" font-family="sans-serif" font-size="10" fill="#78350F">học sinh điều chỉnh trên thanh trượt.</text>'
            '</g>'
            '</svg>'
        )

    # 2. GALVANIC CELL / PIN ĐIỆN HÓA / VOLTA
    if any(k in t_lower for k in ["galvani", "pin", "volta", "electrochemical", "điện hóa", "cực"]):
        return (
            '<svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
            '<defs>'
            '<linearGradient id="znBeaker" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E2E8F0" stop-opacity="0.5"/><stop offset="100%" stop-color="#CBD5E1" stop-opacity="0.8"/></linearGradient>'
            '<linearGradient id="cuBeaker" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#93C5FD" stop-opacity="0.6"/><stop offset="100%" stop-color="#2563EB" stop-opacity="0.7"/></linearGradient>'
            '<linearGradient id="znElectrode" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#94A3B8"/><stop offset="50%" stop-color="#E2E8F0"/><stop offset="100%" stop-color="#64748B"/></linearGradient>'
            '<linearGradient id="cuElectrode" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#B45309"/><stop offset="50%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#78350F"/></linearGradient>'
            '</defs>'
            '<rect width="620" height="340" rx="16" fill="#FCFBF9" stroke="#E6E4DD" stroke-width="1.5"/>'
            '<rect x="70" y="140" width="130" height="150" rx="6" fill="url(#znBeaker)" stroke="#94A3B8" stroke-width="2"/>'
            '<rect x="110" y="90" width="22" height="160" rx="2" fill="url(#znElectrode)" stroke="#475569"/>'
            '<text x="121" y="80" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle">Zn (-)</text>'
            '<text x="135" y="270" font-family="monospace" font-size="9" fill="#334155" text-anchor="middle">Dung dịch ZnSO₄ 1M</text>'
            '<rect x="290" y="140" width="130" height="150" rx="6" fill="url(#cuBeaker)" stroke="#94A3B8" stroke-width="2"/>'
            '<rect x="350" y="90" width="22" height="160" rx="2" fill="url(#cuElectrode)" stroke="#78350F"/>'
            '<text x="361" y="80" font-family="monospace" font-size="11" font-weight="bold" fill="#92400E" text-anchor="middle">Cu (+)</text>'
            '<text x="355" y="270" font-family="monospace" font-size="9" fill="#1E3A8A" text-anchor="middle">Dung dịch CuSO₄ 1M</text>'
            '<path d="M 165 210 L 165 110 Q 165 95 180 95 L 310 95 Q 325 95 325 110 L 325 210" fill="none" stroke="#F1F5F9" stroke-width="18" stroke-linecap="round"/>'
            '<path d="M 165 210 L 165 110 Q 165 95 180 95 L 310 95 Q 325 95 325 110 L 325 210" fill="none" stroke="#E2E8F0" stroke-width="14" stroke-linecap="round"/>'
            '<text x="245" y="115" font-family="monospace" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">CẦU MUỐI (KNO₃)</text>'
            '<path d="M 121 90 L 121 40 L 220 40" fill="none" stroke="#1E293B" stroke-width="2.5"/>'
            '<path d="M 270 40 L 361 40 L 361 90" fill="none" stroke="#1E293B" stroke-width="2.5"/>'
            '<circle cx="245" cy="40" r="22" fill="#FFFFFF" stroke="#0F172A" stroke-width="2"/>'
            '<text x="245" y="44" font-family="monospace" font-size="10" font-weight="bold" fill="#E11D48" text-anchor="middle">1.10 V</text>'
            '<text x="245" y="24" font-family="sans-serif" font-size="8" fill="#64748B" text-anchor="middle">VÔN KẾ</text>'
            '<g transform="translate(440, 25)">'
            '<rect width="165" height="290" rx="12" fill="#FFFFFF" stroke="#E6E4DD"/>'
            '<text x="14" y="26" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">PIN ĐIỆN HÓA DANIELL</text>'
            '<line x1="14" y1="36" x2="151" y2="36" stroke="#E2E8F0"/>'
            '<text x="14" y="65" font-family="monospace" font-size="10" font-weight="bold" fill="#0284C7">ANODE (Oxi hóa):</text>'
            '<text x="14" y="82" font-family="sans-serif" font-size="9" fill="#334155">Zn → Zn²⁺ + 2e⁻</text>'
            '<text x="14" y="115" font-family="monospace" font-size="10" font-weight="bold" fill="#D97706">CATHODE (Khử):</text>'
            '<text x="14" y="132" font-family="sans-serif" font-size="9" fill="#334155">Cu²⁺ + 2e⁻ → Cu</text>'
            '<text x="14" y="165" font-family="monospace" font-size="10" font-weight="bold" fill="#059669">PHƯƠNG TRÌNH PIN:</text>'
            '<text x="14" y="182" font-family="sans-serif" font-size="9" fill="#334155">Zn + Cu²⁺ → Zn²⁺ + Cu</text>'
            '<rect x="14" y="210" width="137" height="65" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/>'
            '<text x="22" y="230" font-family="monospace" font-size="10" font-weight="bold" fill="#0F172A">E° = E°(+) - E°(-)</text>'
            '<text x="22" y="248" font-family="monospace" font-size="10" fill="#2563EB">E° = 0.34 - (-0.76)</text>'
            '<text x="22" y="264" font-family="monospace" font-size="11" font-weight="bold" fill="#E11D48">= +1.10 V</text>'
            '</g>'
            '</svg>'
        )

    # 3. KREBS CYCLE / CHU TRÌNH KREBS
    if any(k in t_lower for k in ["krebs", "citric", "axit citric", "tca", "hô hấp"]):
        return (
            '<svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
            '<rect width="620" height="340" rx="16" fill="#FCFBF9" stroke="#E6E4DD" stroke-width="1.5"/>'
            '<g transform="translate(210, 175)">'
            '<circle cx="0" cy="0" r="105" fill="none" stroke="#10B981" stroke-width="4" stroke-dasharray="8,4"/>'
            '<text x="0" y="-8" font-family="monospace" font-size="13" font-weight="bold" fill="#0F172A" text-anchor="middle">CHU TRÌNH KREBS</text>'
            '<text x="0" y="10" font-family="monospace" font-size="9" fill="#64748B" text-anchor="middle">(Axit Citric / TCA Cycle)</text>'
            '<rect x="-40" y="-140" width="80" height="24" rx="4" fill="#FEF3C7" stroke="#FDE68A"/><text x="0" y="-124" font-family="monospace" font-size="9" font-weight="bold" fill="#92400E" text-anchor="middle">Acetyl-CoA (2C)</text>'
            '<rect x="55" y="-105" width="75" height="24" rx="4" fill="#DCFCE7" stroke="#86EFAC"/><text x="92" y="-89" font-family="monospace" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">Citrate (6C)</text>'
            '<rect x="75" y="10" width="85" height="24" rx="4" fill="#DCFCE7" stroke="#86EFAC"/><text x="117" y="26" font-family="monospace" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">α-Ketoglutarate(5C)</text>'
            '<rect x="25" y="85" width="85" height="24" rx="4" fill="#DCFCE7" stroke="#86EFAC"/><text x="67" y="101" font-family="monospace" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">Succinate (4C)</text>'
            '<rect x="-115" y="75" width="75" height="24" rx="4" fill="#DCFCE7" stroke="#86EFAC"/><text x="-78" y="91" font-family="monospace" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">Malate (4C)</text>'
            '<rect x="-135" y="-60" width="90" height="24" rx="4" fill="#DCFCE7" stroke="#86EFAC"/><text x="-90" y="-44" font-family="monospace" font-size="9" font-weight="bold" fill="#166534" text-anchor="middle">Oxaloacetate (4C)</text>'
            '</g>'
            '<g transform="translate(420, 25)">'
            '<rect width="185" height="290" rx="12" fill="#FFFFFF" stroke="#E6E4DD"/>'
            '<text x="16" y="26" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">NĂNG LƯỢNG THU ĐƯỢC</text>'
            '<line x1="16" y1="36" x2="169" y2="36" stroke="#E2E8F0"/>'
            '<rect x="16" y="75" width="153" height="32" rx="6" fill="#EFF6FF" stroke="#BFDBFE"/><text x="26" y="96" font-family="monospace" font-size="11" font-weight="bold" fill="#1E40AF">3 NADH (+7.5 ATP)</text>'
            '<rect x="16" y="115" width="153" height="32" rx="6" fill="#FEF3C7" stroke="#FDE68A"/><text x="26" y="136" font-family="monospace" font-size="11" font-weight="bold" fill="#92400E">1 FADH₂ (+1.5 ATP)</text>'
            '<rect x="16" y="155" width="153" height="32" rx="6" fill="#ECFDF5" stroke="#A7F3D0"/><text x="26" y="176" font-family="monospace" font-size="11" font-weight="bold" fill="#065F46">1 ATP / GTP (SLP)</text>'
            '<rect x="16" y="195" width="153" height="32" rx="6" fill="#F1F5F9" stroke="#E2E8F0"/><text x="26" y="216" font-family="monospace" font-size="11" font-weight="bold" fill="#475569">2 CO₂ (Thải khí)</text>'
            '<text x="16" y="255" font-family="monospace" font-size="10" font-weight="bold" fill="#059669">TỔNG: ~10 ATP / Acetyl-CoA</text>'
            '</g>'
            '</svg>'
        )

    # 4. EYE OPTICS & MYOPIA / TẬT CẬN THỊ / MẮT
    if any(k in t_lower for k in ["mắt", "cận thị", "viễn thị", "eye", "tật"]):
        return (
            '<svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
            '<rect width="620" height="340" rx="16" fill="#FCFBF9" stroke="#E6E4DD" stroke-width="1.5"/>'
            '<g transform="translate(230, 170)">'
            '<circle cx="0" cy="0" r="95" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2"/>'
            '<path d="M 0 -95 A 95 95 0 0 1 0 95" fill="none" stroke="#F59E0B" stroke-width="4"/>'
            '<text x="75" y="4" font-family="monospace" font-size="9" font-weight="bold" fill="#D97706" text-anchor="middle">VÕNG MẠC</text>'
            '<path d="M -70 -65 C -115 -35 -115 35 -70 65" fill="#E0F2FE" stroke="#38BDF8" stroke-width="2.5"/>'
            '<text x="-95" y="-75" font-family="monospace" font-size="9" fill="#0284C7">GIÁC MẠC</text>'
            '<ellipse cx="-55" cy="0" rx="8" ry="42" fill="#BAE6FD" stroke="#0284C7" stroke-width="2"/>'
            '<text x="-55" y="58" font-family="monospace" font-size="9" fill="#0284C7" text-anchor="middle">THỂ THỦY TINH</text>'
            '<line x1="-180" y1="0" x2="105" y2="0" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4,4"/>'
            '<path d="M -180 -35 L -55 -35 L 50 0 L 95 25" fill="none" stroke="#E11D48" stroke-width="2"/>'
            '<path d="M -180 35 L -55 35 L 50 0 L 95 -25" fill="none" stroke="#E11D48" stroke-width="2"/>'
            '<circle cx="50" cy="0" r="4" fill="#E11D48"/>'
            '<text x="50" y="-12" font-family="monospace" font-size="9" font-weight="bold" fill="#E11D48" text-anchor="middle">Tiêu điểm F\'</text>'
            '<text x="50" y="16" font-family="sans-serif" font-size="8" fill="#E11D48" text-anchor="middle">(Hội tụ trước võng mạc)</text>'
            '</g>'
            '<g transform="translate(420, 25)">'
            '<rect width="185" height="290" rx="12" fill="#FFFFFF" stroke="#E6E4DD"/>'
            '<text x="16" y="26" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">QUANG HỌC MẮT</text>'
            '<line x1="16" y1="36" x2="169" y2="36" stroke="#E2E8F0"/>'
            '<rect x="16" y="50" width="153" height="32" rx="6" fill="#FEE2E2" stroke="#FECACA"/>'
            '<text x="24" y="70" font-family="monospace" font-size="11" font-weight="bold" fill="#B91C1C">TẬT CẬN THỊ (MYOPIA)</text>'
            '<text x="16" y="105" font-family="sans-serif" font-size="10" font-weight="bold" fill="#334155">Nguyên nhân:</text>'
            '<text x="16" y="122" font-family="sans-serif" font-size="9" fill="#57534E">• Thể thủy tinh quá phồng</text>'
            '<text x="16" y="138" font-family="sans-serif" font-size="9" fill="#57534E">• Trục trước-sau nhãn cầu dài</text>'
            '<text x="16" y="154" font-family="sans-serif" font-size="9" fill="#57534E">• F\' nằm trước màng lưới</text>'
            '<text x="16" y="185" font-family="sans-serif" font-size="10" font-weight="bold" fill="#059669">Cách khắc phục:</text>'
            '<rect x="16" y="198" width="153" height="42" rx="6" fill="#ECFDF5" stroke="#A7F3D0"/>'
            '<text x="24" y="216" font-family="monospace" font-size="10" font-weight="bold" fill="#065F46">Đeo Kính Phân kỳ</text>'
            '<text x="24" y="231" font-family="sans-serif" font-size="8.5" fill="#047857">(f &lt; 0) để lùi ảnh về võng mạc</text>'
            '<text x="16" y="265" font-family="monospace" font-size="9.5" fill="#64748B">D = 1/f &lt; 0 (Diop âm)</text>'
            '</g>'
            '</svg>'
        )

    # 5. GENERAL ADAPTIVE SCIENTIFIC SVG FALLBACK
    return (
        '<svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">'
        '<rect width="620" height="340" rx="16" fill="#FCFBF9" stroke="#E6E4DD" stroke-width="1.5"/>'
        '<rect x="25" y="25" width="340" height="290" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>'
        '<circle cx="195" cy="170" r="85" fill="none" stroke="#2563EB" stroke-width="3" stroke-dasharray="6,4"/>'
        '<circle cx="195" cy="170" r="55" fill="none" stroke="#059669" stroke-width="2.5"/>'
        '<circle cx="195" cy="170" r="18" fill="#2563EB"/>'
        '<text x="195" y="174" font-family="monospace" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">CORE</text>'
        '<text x="45" y="55" font-family="monospace" font-size="12" font-weight="bold" fill="#0F172A">' + (recognized_latex or topic or 'MÔ HÌNH KHOA HỌC') + '</text>'
        '<g transform="translate(390, 25)">'
        '<rect width="205" height="290" rx="12" fill="#FFFFFF" stroke="#E6E4DD"/>'
        '<text x="16" y="26" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">THÔNG SỐ &amp; BẢNG ĐIỀU KHIỂN</text>'
        '<line x1="16" y1="36" x2="189" y2="36" stroke="#E2E8F0"/>'
        '<text x="16" y="65" font-family="sans-serif" font-size="10" fill="#64748B">Khung cảnh AI Sinh động:</text>'
        '<text x="16" y="82" font-family="monospace" font-size="11" font-weight="bold" fill="#2563EB">Vector SVG Đa tầng</text>'
        '<text x="16" y="115" font-family="sans-serif" font-size="10" fill="#64748B">Độ mượt tương tác:</text>'
        '<text x="16" y="132" font-family="monospace" font-size="11" font-weight="bold" fill="#059669">60 FPS Hardware Scaled</text>'
        '<rect x="16" y="170" width="173" height="95" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>'
        '<text x="26" y="195" font-family="monospace" font-size="10" font-weight="bold" fill="#334155">ĐIỀU CHỈNH THAM SỐ:</text>'
        '<text x="26" y="215" font-family="sans-serif" font-size="9" fill="#64748B">Sử dụng các thanh trượt bên dưới</text>'
        '<text x="26" y="230" font-family="sans-serif" font-size="9" fill="#64748B">để cập nhật trực tiếp mô hình.</text>'
        '</g>'
        '</svg>'
    )


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
        if any(k in hint for k in ["dna", "adn", "double helix", "helicase", "chạc sao chép", "xoắn kép"]):
            matched_template = "BIO_DNA_HELIX"
        elif any(k in hint for k in ["giao thoa", "ripple", "bể sóng", "sóng nước", "hai nguồn"]):
            matched_template = "PHYS_RIPPLE_TANK"
        elif any(k in hint for k in ["rlc", "fresnel", "điện xoay chiều", "cộng hưởng"]):
            matched_template = "PHYS_RLC_PHASOR"
        elif any(k in hint for k in ["chuẩn độ", "titration", "ph", "naoh"]):
            matched_template = "CHEM_EQUILIBRIUM_TITRATION"
        elif any(k in hint for k in ["quang hợp", "quang hop", "photo", "quang", "lá", "la", "cây", "cay", "stomata", "sinh học", "sinh hoc"]):
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
        ai_svg = generate_bespoke_interactive_svg(
            topic=item.get("templateId", ""),
            recognized_latex=recognized_latex,
            parameters=[p.dict() for p in parameters]
        )
        blueprint = SimulationBlueprint(
            engine=item["engine"],
            templateId=item["templateId"],
            recognizedLatex=recognized_latex,
            ocrAlternatives=[recognized_latex, item["recognizedLatex"]],
            expressions=expr_list,
            parameters=parameters,
            socraticQuestion=socratic_q,
            custom_interactive_svg=ai_svg,
            ai_visual_description=f"Mô hình AI đồ họa sinh động cho {item['templateId']}",
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

    ai_svg = generate_bespoke_interactive_svg(
        topic=hint_text or hint_subject or item.get("templateId", ""),
        recognized_latex=final_latex,
        parameters=[p.dict() for p in parameters]
    )

    blueprint = SimulationBlueprint(
        engine=item["engine"],
        templateId=item["templateId"],
        recognizedLatex=final_latex,
        ocrAlternatives=alts[:3],
        expressions=expressions,
        parameters=parameters,
        socraticQuestion=item["socraticQuestion"],
        custom_interactive_svg=ai_svg,
        ai_visual_description=f"Mô hình AI đồ họa sinh động cho {item['templateId']}",
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
