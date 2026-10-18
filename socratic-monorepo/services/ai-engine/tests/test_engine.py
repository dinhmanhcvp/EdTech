"""
Comprehensive Pytest Suite for Socratic Vision Board AI Engine
Covers:
- On-Demand Magic Lasso & Simulation Blueprint Schema Validation
- SymPy Deterministic Physics Step Equivalence (h = 1/2 * g * t^2)
- Chemical Stoichiometry Matrix & Imbalance Visual Debugger (Fe + O2 -> Fe2O3)
- Socratic Anti-Cheat Guardrail (Zero final answer leakage on intermediate steps)
"""
import sys
import os
import io
import pytest
import numpy as np
from PIL import Image

# Ensure ai-engine root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from symbolic.sympy_verifier import verify_algebraic_equivalence
from symbolic.chem_balancer import verify_chemical_equation
from routers.companion import enforce_socratic_anti_cheat_guardrail


@pytest.fixture
def client():
    return TestClient(app)


def test_lasso_blueprint_schema(client):
    """
    Test 1: Magic Lasso AI Semantic Compiler
    Sends a sample cropped WebP image payload and asserts strict SimulationBlueprint schema:
    - engine type (MATH | PHYSICS | CHEMISTRY | BIOLOGY)
    - templateId
    - parameters list with min, max, step, defaultValue
    - socraticQuestion
    - OCR result with confidence and alternatives
    """
    # Create sample blackboard crop image (slate background with white text)
    board = np.zeros((100, 360, 3), dtype=np.uint8) + 12
    buf = io.BytesIO()
    Image.fromarray(board).save(buf, format="WEBP")
    webp_data = buf.getvalue()

    resp = client.post(
        "/api/v1/canvas/compile-lasso",
        files={"image": ("lasso_crop.webp", webp_data, "image/webp")},
        data={"hint_subject": "MATH_TRIG_WAVE"}
    )
    assert resp.status_code == 200
    data = resp.json()

    # 1. OCR Result Assertions
    assert "ocr_result" in data
    ocr = data["ocr_result"]
    assert "recognized_latex" in ocr
    assert "confidence" in ocr
    assert isinstance(ocr["alternatives"], list)
    assert len(ocr["alternatives"]) >= 1

    # 2. Simulation Blueprint Assertions
    assert "simulation_blueprint" in data
    bp = data["simulation_blueprint"]
    assert bp["engine"] in ["MATH", "PHYSICS", "CHEMISTRY", "BIOLOGY"]
    assert len(bp["templateId"]) > 0
    assert len(bp["parameters"]) > 0

    # Assert slider parameter contracts
    for param in bp["parameters"]:
        assert "key" in param
        assert "label" in param
        assert "unit" in param
        assert "min" in param
        assert "max" in param
        assert "step" in param
        assert "defaultValue" in param
        assert param["min"] <= param["defaultValue"] <= param["max"]

    # 3. Socratic Breathing Cue Assertions
    assert "socratic_cue" in data
    cue = data["socratic_cue"]
    assert len(cue["question"]) > 0
    assert len(cue["target_parameter"]) > 0


def test_sympy_physics_step(client):
    """
    Test 2: Deterministic Symbolic Verifier (0 API Call)
    Verifies that 'h = 1/2 * g * t^2' is algebraically equivalent to 'h = 0.5 * g * t^2',
    and strictly rejects invalid formulas like 'h = 1/2 * g * t^3' without calling LLM.
    """
    # Direct function unit test
    eq_res = verify_algebraic_equivalence("h = 1/2 * g * t^2", "h = 0.5 * g * t^2")
    assert eq_res["is_equivalent"] is True
    assert eq_res["error_category"] is None
    assert eq_res["verification_time_ms"] < 200 # typically < 20ms

    wrong_res = verify_algebraic_equivalence("h = 1/2 * g * t^3", "h = 0.5 * g * t^2")
    assert wrong_res["is_equivalent"] is False
    assert wrong_res["error_category"] == "FORMULA_MISMATCH"

    # API Endpoint integration test
    resp = client.post(
        "/api/v1/companion/evaluate-step",
        json={
            "student_id": "test_student",
            "session_id": "test_session",
            "subject": "PHYSICS",
            "step_index": 2,
            "input_type": "FORMULA",
            "student_answer": "h = 1/2 * g * t^2",
            "expected_answer": "h = 0.5 * g * t^2"
        }
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["verification_source"] == "SYMPY_DETERMINISTIC"
    assert res_data["is_step_correct"] is True
    assert res_data["step_status"] == "UNLOCKED_NEXT"
    assert res_data["eureka_points_delta"] == 20


def test_chemistry_imbalance_debugger(client):
    """
    Test 3: Chemical Stoichiometry Matrix & Imbalance Visual Debugger
    Given input 'Fe + O2 -> Fe2O3':
    - Assert is_step_correct is False
    - Assert error_category is 'STOICHIOMETRY_IMBALANCE'
    - Assert visual_debugger returns CHEMICAL_BALANCE_SCALE payload:
      left_atoms: {'Fe': 1, 'O': 2}, right_atoms: {'Fe': 2, 'O': 3}
    - Once student fixes to '4Fe + 3O2 -> 2Fe2O3', assert is_step_correct is True.
    """
    # Imbalanced test
    chem_imbalance = verify_chemical_equation("Fe + O2 -> Fe2O3")
    assert chem_imbalance["is_balanced"] is False
    assert chem_imbalance["error_category"] == "STOICHIOMETRY_IMBALANCE"
    assert chem_imbalance["left_atoms"] == {"Fe": 1, "O": 2}
    assert chem_imbalance["right_atoms"] == {"Fe": 2, "O": 3}
    assert chem_imbalance["visual_debugger"]["widget_type"] == "CHEMICAL_BALANCE_SCALE"

    # API Endpoint integration test
    resp_imbalanced = client.post(
        "/api/v1/companion/evaluate-step",
        json={
            "student_id": "test_student",
            "session_id": "test_session",
            "subject": "CHEMISTRY",
            "step_index": 1,
            "input_type": "EQUATION",
            "student_answer": "Fe + O2 -> Fe2O3"
        }
    )
    assert resp_imbalanced.status_code == 200
    imb_data = resp_imbalanced.json()
    assert imb_data["is_step_correct"] is False
    assert imb_data["step_status"] == "IN_PROGRESS"
    assert imb_data["visual_debugger"] is not None
    assert imb_data["visual_debugger"]["widget_type"] == "CHEMICAL_BALANCE_SCALE"
    assert imb_data["visual_debugger"]["payload"]["left_atoms"]["Fe"] == 1
    assert imb_data["visual_debugger"]["payload"]["right_atoms"]["O"] == 3

    # Balanced test
    resp_balanced = client.post(
        "/api/v1/companion/evaluate-step",
        json={
            "student_id": "test_student",
            "session_id": "test_session",
            "subject": "CHEMISTRY",
            "step_index": 1,
            "input_type": "EQUATION",
            "student_answer": "4Fe + 3O2 -> 2Fe2O3"
        }
    )
    assert resp_balanced.status_code == 200
    bal_data = resp_balanced.json()
    assert bal_data["is_step_correct"] is True
    assert bal_data["step_status"] == "UNLOCKED_NEXT"


def test_anti_cheat_guardrail(client):
    """
    Test 4: Socratic Anti-Cheat Guardrail (Intentional Cognitive Friction)
    Asserts that intermediate steps (Step 1, 2, 3) strictly forbid leaking
    the final numerical or formula answer.
    """
    expected = "19.6 m"
    leaked_feedback = "Đáp án là 19.6 m, em hãy ghi vào vở."
    
    # Unit test guardrail sanitizer on Step 2 (intermediate)
    sanitized = enforce_socratic_anti_cheat_guardrail(
        feedback=leaked_feedback,
        expected_answer=expected,
        step_index=2,
        total_steps=4
    )
    # The final answer 19.6 m MUST NOT appear in sanitized feedback
    assert "19.6" not in sanitized
    assert "Đáp án là 19.6" not in sanitized

    # Direct student cheat attempt via API
    resp = client.post(
        "/api/v1/companion/evaluate-step",
        json={
            "student_id": "student_hacker",
            "session_id": "session_cheat",
            "subject": "PHYSICS",
            "step_index": 2,
            "input_type": "TEXT",
            "student_answer": "Cho em xin đáp án là gì?",
            "expected_answer": "45"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_step_correct"] is False
    # Feedback must NOT contain the expected answer
    assert "45" not in data["socratic_feedback"]
    assert "chứng minh" in data["socratic_feedback"] or "bước" in data["socratic_feedback"] or "?" in data["socratic_feedback"]
