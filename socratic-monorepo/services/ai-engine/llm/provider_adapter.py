"""
Socratic LLM Adapter (Tier 3 Fallback - Intentional Cognitive Friction)
Supports Multi-Key Gemini Pool, OpenRouter Pool, or deterministic rule-based fallback.
Guarantees NO ANSWER LEAKAGE — only returns scaffolding questions.
"""
import os
import json
from typing import Dict, Any, Optional

from llm.key_pool import global_key_pool, call_openrouter_text

# Giữ cùng thứ tự ưu tiên với routers/recognize_ink.py: model hạn mức cao trước.
SOCRATIC_GEMINI_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-flash-latest"]

SOCRATIC_SYSTEM_PROMPT = """
Bạn là Trợ lý Gia sư Socratic 1:1 cho học sinh KHTN (Toán, Lý, Hóa, Sinh).
QUY TẮC BẮT BUỘC (INTENTIONAL COGNITIVE FRICTION):
1. TUYỆT ĐỐI KHÔNG BAO GIỜ nói thẳng đáp án hoặc giải hộ bài toán.
2. Luôn trả lời bằng một câu hỏi gợi mở tư duy (Socratic Question) hoặc hướng dẫn học sinh kiểm tra lại giả thiết.
3. Chia nhỏ vấn đề thành từng nấc thang tư duy (Scaffolding).
4. Giữ giọng văn thân thiện, truyền cảm hứng, ngắn gọn (< 80 từ).
"""


def generate_socratic_guidance(student_message: str, current_step: int, subject: str = "STEM") -> Dict[str, Any]:
    """
    Tier 3 Fallback: Called only when Tier 1 (SymPy) and Tier 2 (ChromaDB) are bypassed.
    Supports Multi-Key Gemini Pool -> OpenRouter Pool -> Deterministic Socratic Heuristic Fallback.
    """
    # 1. Thử gọi Gemini Pool nếu có khóa hoạt động
    gemini_keys = global_key_pool.get_ordered_keys("gemini")
    if gemini_keys:
        try:
            import google.generativeai as genai
            user_prompt = f"Môn học: {subject}. Bước học sinh đang thực hiện: bước {current_step}. Tin nhắn học sinh: \"{student_message}\". Hãy đưa ra đúng 1 câu hỏi Socratic gợi mở ngắn gọn (<60 từ) giúp học sinh tự tìm ra bước giải tiếp theo mà KHÔNG nói ra đáp án."
            for g_key in gemini_keys:
                last_err: Optional[Exception] = None
                for model_name in SOCRATIC_GEMINI_MODELS:
                    try:
                        genai.configure(api_key=g_key)
                        model = genai.GenerativeModel(model_name, system_instruction=SOCRATIC_SYSTEM_PROMPT)
                        resp = model.generate_content(user_prompt)
                        txt = getattr(resp, "text", "") or ""
                        if txt.strip():
                            global_key_pool.mark_success("gemini", g_key)
                            return {
                                "source": "LLM_GEMINI_POOL",
                                "socratic_question": txt.strip(),
                                "step_status": "IN_PROGRESS",
                                "eureka_points_delta": 5,
                            }
                    except Exception as me:
                        # hạn mức tính riêng từng model: thử model kế tiếp trên cùng khóa
                        last_err = me
                # chỉ phạt khóa khi mọi model đều lỗi
                if last_err is not None:
                    global_key_pool.mark_failure("gemini", g_key, last_err)
        except Exception:
            pass

    # 2. Thử gọi OpenRouter Text nếu Gemini hết quota hoặc rate-limited
    openrouter_keys = global_key_pool.get_ordered_keys("openrouter")
    if openrouter_keys:
        try:
            user_prompt = f"Môn học: {subject}. Bước {current_step}. Học sinh: \"{student_message}\". Hãy đưa ra 1 câu hỏi gợi ý Socratic ngắn gọn (<60 từ), tuyệt đối không cho đáp án."
            or_res = call_openrouter_text(
                system_prompt=SOCRATIC_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                pool=global_key_pool,
                timeout_s=6.0,
            )
            if or_res and or_res[0].strip():
                return {
                    "source": "LLM_OPENROUTER_POOL",
                    "socratic_question": or_res[0].strip(),
                    "step_status": "IN_PROGRESS",
                    "eureka_points_delta": 5,
                }
        except Exception:
            pass

    # 3. Fallback heuristic engine to guarantee offline/immediate resilience (0ms, 0 API):
    msg_lower = student_message.lower()

    if "không hiểu" in msg_lower or "khó quá" in msg_lower or "giúp em" in msg_lower:
        question = "Đừng nản lòng nhé! Em hãy nhìn lại dữ kiện đề bài cho: đại lượng nào đã biết giá trị, và công thức nào liên hệ giữa chúng?"
    elif "đáp án là gì" in msg_lower or "cho em xin đáp án" in msg_lower:
        question = "Nếu cô cho luôn đáp án thì em sẽ không nhớ được lâu đâu! Thử suy nghĩ xem: bước đầu tiên em cần làm để rút gọn vế trái là gì?"
    elif "tại sao" in msg_lower:
        question = "Một câu hỏi rất hay! Hãy thử tưởng tượng: nếu đại lượng này tăng gấp 10 lần, hiện tượng vật lý / hóa học gì sẽ xảy ra?"
    else:
        question = f"Thầy/Cô thấy em đang tư duy theo hướng tích cực! Ở bước {current_step}, em hãy đối chiếu lại định luật bảo toàn xem điều gì cần được giữ nguyên?"

    return {
        "source": "LLM_FALLBACK",
        "socratic_question": question,
        "step_status": "IN_PROGRESS",
        "eureka_points_delta": 5,
    }
