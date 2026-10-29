"""Chấm từng loại câu. Máy chấm được thì chắc chắn; không chấm được thì để giáo viên quyết (không đoán)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from formula_check import check_formula


def grade_choice(index: int, answer: str) -> bool:
    return str(index) == str(answer)


def grade_short(text: str, answer: str) -> Optional[bool]:
    return check_formula(text, answer)


def grade_final(lines: List[str], answer: str) -> Optional[bool]:
    """Tự luận có đáp số: dòng cuối học sinh đã xác nhận so với đáp án."""
    return check_formula(lines[-1], answer) if lines else None


def grade_lines(question: Dict[str, Any], lines: List[str], subject: str) -> Dict[str, Any]:
    """Chấm từng bước (máy kiểm + AI) qua routers/grade_steps.py; chạy ở luồng nền."""
    from routers.grade_steps import GradeLine, GradeStepsRequest
    from routers.grade_steps import grade_lines as run

    req = GradeStepsRequest(lines=[GradeLine(latex=l[:600], text=l[:600]) for l in lines], subject=subject,
                            problem=question.get("text", "")[:2000], expected_answer=(question.get("answer") or "")[:300])
    return run(req)
