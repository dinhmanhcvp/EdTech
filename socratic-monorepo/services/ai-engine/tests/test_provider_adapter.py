"""Adapter Socratic Tier 3: model failover trên cùng khóa Gemini và fallback heuristic."""
import sys
import types

import pytest

from llm import provider_adapter
from llm.key_pool import KeyPoolManager


def _install_fake_genai(monkeypatch, failing_models):
    calls = []
    mod = types.ModuleType("google.generativeai")

    class FakeModel:
        def __init__(self, name, system_instruction=None):
            self.name = name

        def generate_content(self, _prompt):
            calls.append(self.name)
            if self.name in failing_models:
                raise RuntimeError("429 ResourceExhausted: Quota exceeded")
            return types.SimpleNamespace(text="Em thử kiểm tra lại đơn vị của đại lượng này xem?")

    mod.configure = lambda api_key=None: None
    mod.GenerativeModel = FakeModel
    pkg = types.ModuleType("google")
    pkg.generativeai = mod
    monkeypatch.setitem(sys.modules, "google", pkg)
    monkeypatch.setitem(sys.modules, "google.generativeai", mod)
    return calls


@pytest.fixture
def pool(monkeypatch):
    p = KeyPoolManager(read_env=False)
    p.add_runtime_keys(gemini_keys=["AIzaFAKE_KEY_ONE_1234567890"])
    monkeypatch.setattr(provider_adapter, "global_key_pool", p)
    return p


def test_quota_on_first_model_falls_over_to_next_model_on_same_key(monkeypatch, pool):
    calls = _install_fake_genai(monkeypatch, failing_models={provider_adapter.SOCRATIC_GEMINI_MODELS[0]})
    out = provider_adapter.generate_socratic_guidance("em không hiểu", 2)
    assert out["source"] == "LLM_GEMINI_POOL"
    assert calls[:2] == provider_adapter.SOCRATIC_GEMINI_MODELS[:2]
    # khóa không bị phạt vì một model còn dùng được
    assert pool.get_ordered_keys("gemini")


def test_all_models_failing_penalises_key_and_uses_heuristic(monkeypatch, pool):
    calls = _install_fake_genai(monkeypatch, failing_models=set(provider_adapter.SOCRATIC_GEMINI_MODELS))
    out = provider_adapter.generate_socratic_guidance("tại sao vậy", 1)
    assert calls == provider_adapter.SOCRATIC_GEMINI_MODELS
    assert out["source"] == "LLM_FALLBACK"
    assert "?" in out["socratic_question"] or "!" in out["socratic_question"]
