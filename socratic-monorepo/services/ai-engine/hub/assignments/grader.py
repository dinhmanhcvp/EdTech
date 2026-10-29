"""Chấm từng loại câu. Máy chấm được thì chắc chắn; không chấm được thì để giáo viên quyết (không đoán)."""
from __future__ import annotations

from typing import Optional

from formula_check import check_formula


def grade_choice(index: int, answer: str) -> bool:
    return str(index) == str(answer)


def grade_short(text: str, answer: str) -> Optional[bool]:
    return check_formula(text, answer)
