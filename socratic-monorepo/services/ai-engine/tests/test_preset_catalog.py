"""Danh mục preset SGK mới (data/preset_catalog.json, sinh từ teacher-board) phải vào Registry và prompt nhận dạng."""
import re

from routers.visualize import OFFLINE_TEMPLATE_REGISTRY, PRESET_CATALOG, build_vision_prompt


def test_catalog_loaded_and_registered():
    assert len(PRESET_CATALOG) >= 127
    for p in PRESET_CATALOG:
        item = OFFLINE_TEMPLATE_REGISTRY[p["id"]]
        assert item["templateId"] == p["id"]
        assert item["engine"] == p["engine"] == item["subject"]
        assert item["parameters"] == []
        assert item["socraticQuestion"].endswith("?")
        assert re.match(r"^(MATH|PHYS|CHEM|BIO)_", p["id"])


def test_core_templates_not_overridden():
    assert OFFLINE_TEMPLATE_REGISTRY["MATH_TRIG_WAVE"]["parameters"], "template lõi giữ nguyên tham số"


def test_prompt_lists_every_preset_and_keeps_core_rules():
    prompt = build_vision_prompt("phiên mã", "BIOLOGY")
    ids = set(re.findall(r"\b(?:MATH|PHYS|CHEM|BIO)_[A-Z0-9_]+\b", prompt))
    assert {p["id"] for p in PRESET_CATALOG} <= ids
    assert ids <= set(OFFLINE_TEMPLATE_REGISTRY)
    assert "Cross-subject disambiguation" in prompt and "LOCKED the subject to Sinh học" in prompt
