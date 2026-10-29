"""Hợp đồng bài tập / đề (bản Python của packages/types/src/assignments.ts) và ô tự khai đáp án nhanh."""
from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing_extensions import Annotated

from hub.schemas import KC, Subject

ID = r"^[a-z0-9-]{1,40}$"
MAX_QUESTIONS = 40
QuestionType = Literal["choice", "short", "essay", "open"]


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=ID)
    type: QuestionType
    label: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=1, max_length=2000)
    page: Optional[int] = Field(default=None, ge=0, le=19)
    box: Optional[List[Annotated[float, Field(ge=0, le=1)]]] = Field(default=None, min_length=4, max_length=4)
    options: Optional[List[Annotated[str, Field(min_length=1, max_length=200)]]] = Field(default=None, min_length=2, max_length=6)
    answer: Optional[str] = Field(default=None, min_length=1, max_length=200)
    kcs: List[KC] = Field(default_factory=list, max_length=8)
    points: float = Field(default=1, gt=0, le=100)

    @model_validator(mode="after")
    def _answer_rules(self):
        if self.type == "open":
            if self.answer is not None:
                raise ValueError("open_has_no_answer")
            return self
        if self.answer is None:
            raise ValueError("answer_required")
        if self.type == "choice":
            if not self.options:
                raise ValueError("options_required")
            if not self.answer.isdigit() or not 0 <= int(self.answer) < len(self.options):
                raise ValueError("choice_answer_out_of_range")
            return self
        from formula_check import check_formula

        if check_formula(self.answer, self.answer) is not True:
            raise ValueError("answer_not_gradable")
        return self


class AssignmentBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=160)
    subject: Subject
    kind: Literal["exercise", "exam"]
    questions: List[Question] = Field(min_length=1, max_length=MAX_QUESTIONS)

    @model_validator(mode="after")
    def _unique_ids(self):
        ids = [q.id for q in self.questions]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate_ids")
        return self


def clean_body(body: Dict[str, Any]) -> Dict[str, Any]:
    return AssignmentBody.model_validate(body).model_dump(exclude_none=True)


def public_body(body: Dict[str, Any]) -> Dict[str, Any]:
    """Bản cho bảng và học sinh: không có đáp án."""
    out = copy.deepcopy(body)
    for q in out.get("questions", []):
        q.pop("answer", None)
    return out


# ------------------------------------------------------------------ ô tự khai: "1B 2C 3: x=2 4: tự luận 5= 12"
_ITEM = re.compile(r"(?:(?<=\s)|(?<=,)|^)(\d{1,2})\s*(?:([A-Fa-f])(?=[\s,;]|$)|(:)|(=))")
_OPEN_WORDS = {"tự luận", "tu luan", "?", "mở", "mo"}


def quick_key(text: str) -> List[Dict[str, Any]]:
    """Mỗi mục: `<n><chữ>` trắc nghiệm, `<n>: <biểu thức>` tự luận có đáp số, `<n>: tự luận` (hoặc `?`) tự luận không đáp án,
    `<n>= <biểu thức>` đáp số gõ. Mục không đọc được bị bỏ qua."""
    matches = list(_ITEM.finditer(text or ""))
    items: List[Dict[str, Any]] = []
    for i, m in enumerate(matches):
        tail = text[m.end(): matches[i + 1].start() if i + 1 < len(matches) else len(text)].strip(" ,;\n\t")
        n = int(m.group(1))
        item: Dict[str, Any] = {"id": f"q{n}", "label": f"Câu {n}", "text": f"Câu {n}", "kcs": []}
        if m.group(2):
            item.update(type="choice", answer=str(ord(m.group(2).upper()) - ord("A")))
        elif m.group(4):
            item.update(type="short", answer=tail)
        elif tail.lower() in _OPEN_WORDS or not tail:
            item.update(type="open")
        else:
            item.update(type="essay", answer=tail)
        items.append(item)
    letters = max([int(q["answer"]) for q in items if q["type"] == "choice"] + [3])
    for q in items:
        if q["type"] == "choice":
            q["options"] = [chr(65 + k) for k in range(letters + 1)]
    return items
