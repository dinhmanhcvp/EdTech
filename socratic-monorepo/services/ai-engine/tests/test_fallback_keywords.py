"""Bộ định tuyến từ khóa dự phòng của backend: từ khóa ngắn phải đứng riêng, không nuốt nhầm chữ thường."""
import pytest

from routers.visualize import _has, intelligent_fallback_matcher


def tid(hint: str) -> str:
    res = intelligent_fallback_matcher(hint_text=hint)
    return res.get("template_id") or res.get("templateId") or ""


def test_has_matches_whole_short_words_only():
    assert _has("chuẩn độ ph", ["ph"])
    assert not _has("phương trình bậc hai", ["ph"])
    assert not _has("muối ăn", ["mu"])
    assert _has("hệ số mu", ["mu"])
    assert not _has("point", ["int"])
    assert not _has("sinh học", ["sin"])
    assert _has("y = 2sin(3x)", ["sin"])  # chữ số dính liền vẫn là ranh giới
    assert _has("y = sin x", ["sin"])


def test_has_keeps_substring_for_long_or_symbolic_keywords():
    assert _has("vẽ đồ thị y = x^2", ["y ="])
    assert _has("giao thoa sóng", ["giao thoa"])
    assert _has("\\mu = 0.2", ["\\mu"])


@pytest.mark.parametrize(
    "hint,expected",
    [
        ("phương trình bậc hai", None),   # không phải chuẩn độ
        ("x^2+y^2", None),                 # đường tròn 2D, không phải Oxyz
        ("mặt cầu Oxyz", "MATH_3D_OXYZ"),
        ("chuẩn độ HCl bằng NaOH", "CHEM_EQUILIBRIUM_TITRATION"),
        ("con lắc đơn", "PHYS_PENDULUM"),
    ],
)
def test_fallback_template_choice(hint, expected):
    got = tid(hint)
    if expected is None:
        assert got not in ("CHEM_EQUILIBRIUM_TITRATION", "MATH_3D_OXYZ", "BIO_PHOTOSYNTHESIS")
    else:
        assert got == expected
