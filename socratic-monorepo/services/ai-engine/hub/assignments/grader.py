"""Chấm từng loại câu. Máy chấm được thì chắc chắn; không chấm được thì để giáo viên quyết (không đoán).

`check_formula` coi hai phương trình cùng nghiệm là như nhau, nên chép lại đề ("x + 3 = 5") sẽ "khớp" đáp án "x = 2". Vì vậy
khi đáp án ở dạng đã giải (một ẩn = giá trị) thì dòng cuối của học sinh cũng phải ở dạng đã giải; đáp số là hằng số thì
câu trả lời phải là một con số, không phải một phép tính. Ngoài các dạng đó → None (chờ giáo viên).
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from formula_check import _parse, check_formula, latex_to_plain

_NUMBER = re.compile(r"^[+-]?\d+(?:[.,]\d+)?(?:/\d+)?$")


def grade_choice(index: int, answer: str) -> bool:
    return str(index) == str(answer)


def _solved(text: str) -> Optional[Tuple[str, Any]]:
    """("x", giá trị) nếu text có dạng `ẩn = hằng số`, ngược lại None."""
    m = re.fullmatch(r"\s*([A-Za-z])\s*=\s*([^=]+)", latex_to_plain(text or ""))
    if not m:
        return None
    try:
        value = _parse(m.group(2))
    except Exception:
        return None
    return (m.group(1), value) if not getattr(value, "free_symbols", {1}) else None


def _constant(text: str) -> Optional[Any]:
    try:
        value = _parse(latex_to_plain(text or ""))
    except Exception:
        return None
    return value if not getattr(value, "free_symbols", {1}) else None


def _equal(a: Any, b: Any) -> Optional[bool]:
    import sympy as sp

    try:
        return bool(sp.simplify(a - b) == 0)
    except Exception:
        return None


def grade_short(text: str, answer: str) -> Optional[bool]:
    key_value = _constant(answer)
    if key_value is not None:  # đáp số là một con số: câu trả lời phải là con số, không phải phép tính chép lại
        cleaned = latex_to_plain(text or "").replace(" ", "")
        if not _NUMBER.match(cleaned):
            return None
        got = _constant(cleaned.replace(",", "."))
        return None if got is None else _equal(got, key_value)
    key = _solved(answer)
    if key:
        got = _solved(text)
        return _equal(got[1], key[1]) if got and got[0] == key[0] else None
    return check_formula(text, answer)


def grade_final(lines: List[str], answer: str) -> Optional[bool]:
    """Tự luận có đáp số: dòng cuối học sinh đã xác nhận so với đáp án."""
    if not lines:
        return None
    key = _solved(answer)
    if key:
        got = _solved(lines[-1])
        return _equal(got[1], key[1]) if got and got[0] == key[0] else None
    return grade_short(lines[-1], answer)


def grade_lines(question: Dict[str, Any], lines: List[str], subject: str) -> Dict[str, Any]:
    """Chấm từng bước (máy kiểm + AI) qua routers/grade_steps.py; chạy ở luồng nền."""
    from routers.grade_steps import GradeLine, GradeStepsRequest
    from routers.grade_steps import grade_lines as run

    req = GradeStepsRequest(lines=[GradeLine(latex=l[:600], text=l[:600]) for l in lines], subject=subject,
                            problem=question.get("text", "")[:2000], expected_answer=(question.get("answer") or "")[:300])
    return run(req)
