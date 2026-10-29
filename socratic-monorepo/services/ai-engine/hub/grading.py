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
    """Nhận chữ cái (B), số thứ tự 1-based (2) hoặc đúng chữ của một lựa chọn; không nhận ra → None (chưa chấm được)."""
    spec = json.loads(key[len("choice:"):])
    correct, options = spec["c"], spec["o"]
    a = answer.strip().rstrip(".)")
    if re.fullmatch(r"[A-Za-z]", a):
        index = ord(a.upper()) - ord("A")
    elif re.fullmatch(r"\d{1,2}", a):
        index = int(a) - 1
    else:
        matches = [i for i, o in enumerate(options) if _norm(o) == _norm(a)]
        index = matches[0] if matches else -1
    if not 0 <= index < len(options):
        return None
    return index == correct
