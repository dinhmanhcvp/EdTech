"""Hợp đồng dữ liệu của hub (bản Python của packages/types/src/hub.ts)."""
from __future__ import annotations

import copy
import re
import unicodedata
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing_extensions import Annotated

ID = r"^[a-z0-9-]{1,40}$"
Subject = Literal["MATH", "PHYSICS", "CHEMISTRY", "BIOLOGY"]
MAX_SECTIONS = 12
MAX_ITEMS = 12


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FormulaItem(_Strict):
    id: str = Field(pattern=ID)
    type: Literal["formula"]
    latex: str = Field(min_length=1, max_length=400)
    caption: Optional[str] = Field(default=None, max_length=200)


class ProblemItem(_Strict):
    id: str = Field(pattern=ID)
    type: Literal["problem"]
    text: str = Field(min_length=1, max_length=1000)
    latex: Optional[str] = Field(default=None, max_length=400)
    answer: Optional[str] = Field(default=None, min_length=1, max_length=200)
    figure: bool = False

    @field_validator("answer")
    @classmethod
    def _gradable(cls, answer: Optional[str]) -> Optional[str]:
        """Đáp án máy chấm không đọc được thì học sinh không bao giờ giải được câu đó: từ chối ngay khi lưu (cả đề xuất AI)."""
        from formula_check import check_formula

        if answer is not None and check_formula(answer, answer) is not True:
            raise ValueError("answer_not_gradable")
        return answer


class SimItem(_Strict):
    id: str = Field(pattern=ID)
    type: Literal["sim"]
    templateId: str = Field(pattern=r"^[A-Z0-9_]{2,40}$")
    params: Dict[str, float] = Field(default_factory=dict, max_length=12)


class PollItem(_Strict):
    id: str = Field(pattern=ID)
    type: Literal["poll"]
    question: str = Field(min_length=1, max_length=300)
    options: List[Annotated[str, Field(min_length=1, max_length=120)]] = Field(min_length=2, max_length=6)
    correct: Optional[int] = None

    @model_validator(mode="after")
    def _correct_in_range(self):
        if self.correct is not None and not 0 <= self.correct < len(self.options):
            raise ValueError("correct_out_of_range")
        return self


PlanItem = Annotated[Union[FormulaItem, ProblemItem, SimItem, PollItem], Field(discriminator="type")]


class KC(_Strict):
    id: str = Field(pattern=r"^[a-z0-9-]{1,80}$")
    label: str = Field(min_length=1, max_length=80)


class PlanSection(_Strict):
    id: str = Field(pattern=ID)
    title: str = Field(min_length=1, max_length=160)
    objective: str = Field(default="", max_length=500)
    kcs: List[KC] = Field(default_factory=list, max_length=8)
    items: List[PlanItem] = Field(default_factory=list, max_length=MAX_ITEMS)


class LessonPlanBody(_Strict):
    title: str = Field(min_length=1, max_length=160)
    subject: Subject
    boardContext: str = Field(default="", max_length=1000)
    sections: List[PlanSection] = Field(min_length=1, max_length=MAX_SECTIONS)

    @model_validator(mode="after")
    def _unique_ids(self):
        ids = [s.id for s in self.sections] + [i.id for s in self.sections for i in s.items]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate_ids")
        return self


def clean_plan(body: Dict[str, Any]) -> Dict[str, Any]:
    """Kiểm theo schema và trả bản chuẩn hóa (bỏ trường None) để lưu và so sánh."""
    return LessonPlanBody.model_validate(body).model_dump(exclude_none=True)


def strip_answers(body: Dict[str, Any]) -> Dict[str, Any]:
    """Bản sao bỏ đáp án (`answer` của đề bài, `correct` của poll): chỉ bản này được gửi cho bảng, học sinh, phụ huynh."""
    out = copy.deepcopy(body)
    for section in out.get("sections", []):
        for item in section.get("items", []):
            item.pop("answer", None)
            item.pop("correct", None)
    return out


def kc_id(subject: str, label: str) -> str:
    text = unicodedata.normalize("NFD", label.replace("đ", "d").replace("Đ", "D"))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return f"{subject.lower()}-{slug}"[:80].rstrip("-")


class _Loose(BaseModel):
    model_config = ConfigDict(extra="ignore")


class PackageSection(_Loose):
    boardSnapshotId: str = Field(min_length=1, max_length=80)
    planSectionId: Optional[str] = Field(default=None, max_length=40)
    kcIds: List[str] = Field(default_factory=list, max_length=8)


class PackagePoll(_Loose):
    itemId: Optional[str] = Field(default=None, max_length=40)
    question: str = Field(min_length=1, max_length=300)
    options: List[str] = Field(min_length=2, max_length=6)
    counts: List[int]
    total: int = Field(ge=0)

    @model_validator(mode="after")
    def _counts_match(self):
        if len(self.counts) != len(self.options) or any(c < 0 for c in self.counts):
            raise ValueError("counts_must_match_options")
        return self


class KnowledgePackage(_Loose):
    schema_: Literal["kp/2"] = Field(alias="schema")
    sessionId: str = Field(min_length=1, max_length=80)
    planId: str = Field(min_length=1, max_length=80)
    planVersion: int = Field(ge=1)
    snapshot: Dict[str, Any]
    sections: List[PackageSection] = Field(default_factory=list, max_length=40)
    polls: List[PackagePoll] = Field(default_factory=list, max_length=24)
    usedItemIds: List[str] = Field(default_factory=list, max_length=200)

    @field_validator("snapshot")
    @classmethod
    def _v1_snapshot(cls, snap: Dict[str, Any]) -> Dict[str, Any]:
        boards, work = snap.get("boardSnapshots"), snap.get("studentWork")
        if not isinstance(boards, list) or not isinstance(work, list) or len(boards) > 40:
            raise ValueError("snapshot_requires_boardSnapshots_and_studentWork")
        return snap
