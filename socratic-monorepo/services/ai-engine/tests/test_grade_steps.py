"""Chấm theo từng bước: máy kiểm chứng (SymPy, cân bằng hóa học) là sự thật, AI chỉ giải thích; không có AI vẫn trả phần máy kiểm."""
import json

import pytest
from fastapi.testclient import TestClient

from main import app
from routers import grade_steps as gs


@pytest.fixture
def client():
    return TestClient(app)


L = lambda *xs: [gs.GradeLine(latex=x) for x in xs]


def test_good_algebra_chain_has_no_machine_error():
    assert gs.machine_check(L("2x+3=7", "2x=4", "x=2")) == {}


def test_sign_error_when_moving_a_term_is_caught_at_the_first_wrong_step():
    found = gs.machine_check(L("2x+3=7", "2x=7+3", "x=5"))
    assert list(found) == [1]  # dòng 2 (x=5) đúng so với dòng 1 sai nên không báo thêm lỗi mới
    assert found[1]["kind"] == "transform"


def test_arithmetic_slip_inside_a_line():
    found = gs.machine_check(L("2 + 3 = 6"))
    assert found[0]["kind"] == "calculation"


def test_fraction_and_sqrt_latex_are_understood():
    assert gs.machine_check(L(r"\frac{x}{2} = 3", "x = 6")) == {}
    assert 1 in gs.machine_check(L(r"\frac{x}{2} = 3", "x = 5"))
    assert gs.machine_check(L(r"x^2 = 9", r"x = 3 \text{ hoặc } x = -3")) == {}  # không hiểu được thì không báo bừa


def test_expression_transformation():
    assert gs.machine_check(L("(x+1)^2", "x^2+2x+1")) == {}
    assert 1 in gs.machine_check(L("(x+1)^2", "x^2+1"))


def test_unbalanced_chemical_equation_is_flagged():
    found = gs.machine_check(L(r"\text{Fe} + \text{O}_2 \rightarrow \text{Fe}_2\text{O}_3"))
    assert found[0]["kind"] == "balance"
    assert gs.machine_check(L(r"4Fe + 3O_2 \rightarrow 2Fe_2O_3")) == {}


def test_unknown_or_unparsable_lines_never_raise_false_alarms():
    assert gs.machine_check(L(r"\vec{F} = m\vec{a}", r"F = 3\ \text{N}", "Vậy lực là 3 N")) == {}


def test_merge_machine_overrides_ai_and_marks_first_error():
    req = gs.GradeStepsRequest(lines=L("2x+3=7", "2x=7+3", "x=5"))
    machine = gs.machine_check(req.lines)
    ai = {"subject": "MATH_ALGEBRA", "final_correct": False, "summary": "Sai dấu.", "steps": [
        {"index": 0, "status": "ok"}, {"index": 1, "status": "ok", "title": "?"},  # AI nhầm là đúng
        {"index": 2, "status": "carry", "explain": "do lỗi ở bước 2"}]}
    out = gs.merge(req, machine, ai)
    assert [s["status"] for s in out["steps"]] == ["ok", "error", "carry"]
    assert out["first_error"] == 1 and out["steps"][1]["source"] == "machine"
    assert out["final_correct"] is False and out["status"] == "GRADED"


def test_merge_without_ai_is_offline_but_keeps_machine_findings():
    req = gs.GradeStepsRequest(lines=L("2 + 3 = 6", "x = 1"))
    out = gs.merge(req, gs.machine_check(req.lines), None)
    assert out["status"] == "OFFLINE" and out["first_error"] == 0
    assert out["steps"][1]["status"] == "unchecked"


def test_endpoint_with_fake_llm(client, monkeypatch):
    seen = {}

    def fake(system, user, g="", o="", max_tokens=0, timeout=0):
        seen.update(user=user, tokens=max_tokens)
        return json.dumps({"subject": "MATH_ALGEBRA", "final_correct": False, "summary": "ok", "steps": [
            {"index": 0, "status": "ok"}, {"index": 1, "status": "error", "title": "Sai dấu", "explain": "Chuyển vế phải đổi dấu.", "fix": "2x = 7 - 3", "corrected": "2x=4"}]}), "gemini", "m"

    monkeypatch.setattr(gs, "_llm_json", fake)
    r = client.post("/api/v1/canvas/grade-steps", json={"lines": [{"latex": "2x+3=7"}, {"latex": "2x=7+3"}], "subject": "MATH"})
    j = r.json()
    assert r.status_code == 200 and j["first_error"] == 1
    assert j["steps"][1]["fix"] == "2x = 7 - 3" and j["steps"][1]["corrected"] == "2x=4"
    assert "Máy đã kiểm" in seen["user"] and "Dòng [1]" in seen["user"]  # kết quả của máy được đưa vào cho AI
    assert seen["tokens"] >= 3000


def test_endpoint_rejects_empty_and_survives_llm_failure(client, monkeypatch):
    assert client.post("/api/v1/canvas/grade-steps", json={"lines": []}).status_code == 422

    def boom(*a, **k):
        raise RuntimeError("down")

    monkeypatch.setattr(gs, "_llm_json", boom)
    r = client.post("/api/v1/canvas/grade-steps", json={"lines": [{"latex": "2 + 3 = 6"}]})
    assert r.status_code == 200 and r.json()["status"] == "OFFLINE" and r.json()["first_error"] == 0
