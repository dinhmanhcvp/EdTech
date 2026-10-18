import asyncio
import json
from typing import AsyncGenerator

def get_socratic_system_prompt() -> str:
    """
    Siêu Prompt (Mega-Prompt) sư phạm, áp dụng triệt để nguyên lý:
    - Không bao giờ cho đáp án trực tiếp.
    - Duy trì "Ma sát nhận thức" (Cognitive Friction).
    - Tạo các bước đệm (Scaffolding Steps).
    """
    return """You are a Master Socratic Tutor for a high school student.
CRITICAL RULES:
1. NEVER give the final answer directly.
2. If the student makes a mistake, do NOT say "You are wrong". Instead, ask a guiding question that forces them to spot the contradiction.
3. If the student is completely stuck, break the problem down into a smaller, atomic sub-problem (Scaffolding).
4. Output your response as a stream of text to simulate a conversational pace.
5. If the student achieves understanding, output a special metadata token [ACTION:UNLOCK_NEXT_STEP] to trigger the Gamified UI.
"""

async def stream_socratic_guidance(student_message: str, context: dict) -> AsyncGenerator[str, None]:
    """
    Hàm mô phỏng lõi LangChain / LLM Streaming. 
    Trong thực tế, hàm này gọi OpenAI/Gemini API với `stream=True`.
    """
    # Xử lý Logic Nội bộ của AI dựa vào hành vi học sinh
    is_giving_up = "không biết" in student_message.lower() or "chịu" in student_message.lower()
    
    if is_giving_up:
        response_tokens = [
            "Không ", "sao ", "cả. ", "Chúng ", "ta ", "cùng ", "gỡ ", "rối ", "nhé. ", 
            "Hãy ", "nhìn ", "vào ", "hệ ", "số ", "của ", "Oxi ", "ở ", "vế ", "trái, ", 
            "em ", "thấy ", "nó ", "đang ", "là ", "số ", "chẵn ", "hay ", "lẻ?"
        ]
    else:
        response_tokens = [
            "Hướng ", "tư ", "duy ", "của ", "em ", "rất ", "tốt! ", 
            "Nhưng ", "hãy ", "kiểm ", "tra ", "lại ", "Định ", "luật ", "bảo ", "toàn ", "khối ", "lượng. ",
            "Nếu ", "vế ", "phải ", "có ", "3 ", "nguyên ", "tử ", "Oxi, ", "thì ", "vế ", "trái ", "phải ", "nhân ", "hệ ", "số ", "mấy?"
        ]

    # Mô phỏng việc Stream từng Token từ LLM (như ChatGPT) về Mobile App
    for token in response_tokens:
        yield f"data: {token}\n\n"
        await asyncio.sleep(0.08) # Mô phỏng độ trễ sinh từ của LLM
        
    # Kích hoạt Widget Gỡ lỗi trực quan nếu học sinh làm sai (Visual Debug Arena)
    yield f"data: [ACTION:TRIGGER_VISUAL_DEBUG_SCALE]\n\n"
    
    # Kết thúc luồng
    yield "data: [DONE]\n\n"
