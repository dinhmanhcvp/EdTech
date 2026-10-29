"""BKT và chấm câu trắc nghiệm (câu biểu thức chấm bằng formula_check.check_formula của Mode 2)."""
from __future__ import annotations

import json
import re
from typing import List, Optional

PRIOR = 0.3
LEARN = 0.2


def bkt_update(p: float, correct: bool) -> float:
    """Cùng hệ số với online_tutor.py: likelihood 0,92/0,08, guess 0,12/0,88, learn 0,2."""
    likelihood, guess = (0.92, 0.12) if correct else (0.08, 0.88)
    posterior = p * likelihood / (p * likelihood + (1 - p) * guess)
    return posterior + (1 - posterior) * LEARN


def choice_key(index: int, options: List[str]) -> str:
    return "choice:" + json.dumps({"c": index, "o": options}, ensure_ascii=False)


def _norm(text: str) -> str:
    return re.sub(r"\s+", "", text).lower()


def grade_choice(answer: str, key: str) -> Optional[bool]:
    """Nhận đúng chữ của một lựa chọn, chữ cái (B) hoặc số thứ tự 1-based (2); không nhận ra → None (chưa chấm được).

    Chữ của lựa chọn được so trước: với lựa chọn là số ("2", "4"…), "4" nghĩa là lựa chọn "4", không phải lựa chọn thứ tư."""
    spec = json.loads(key[len("choice:"):])
    correct, options = spec["c"], spec["o"]
    a = answer.strip().rstrip(".)")
    matches = [i for i, o in enumerate(options) if _norm(o) == _norm(a)]
    if matches:
        index = matches[0]
    elif re.fullmatch(r"[A-Za-z]", a):
        index = ord(a.upper()) - ord("A")
    elif re.fullmatch(r"\d{1,2}", a):
        index = int(a) - 1
    else:
        index = -1
    if not 0 <= index < len(options):
        return None
    return index == correct


def answer_text(key: str) -> str:
    """Chữ của đáp án để lọc lộ đáp án trong lời gia sư: câu trắc nghiệm → chữ của lựa chọn đúng, câu biểu thức → chính đáp án."""
    if not key.startswith("choice:"):
        return key
    spec = json.loads(key[len("choice:"):])
    return spec["o"][spec["c"]]
