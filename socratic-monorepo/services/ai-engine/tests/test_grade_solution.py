import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_grade_solution_refuses_uncertain_ocr():
    response = client.post('/api/v1/companion/grade-solution', json={
        'solution_latex': 'h = 1/2 * g * t^2',
        'expected_answer': 'h = 0.5 * g * t^2',
        'subject': 'PHYSICS',
        'ocr_confidence': 0.4,
        'alternatives': ['h = 1/2 * g * t^2', 'h = 1/2 * g * t^3'],
    })
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'NEEDS_CLARIFICATION'
    assert data['is_correct'] is None
    assert data['options']


def test_grade_solution_uses_deterministic_verifier_after_review():
    response = client.post('/api/v1/companion/grade-solution', json={
        'solution_latex': 'h = 1/2 * g * t^2',
        'expected_answer': 'h = 0.5 * g * t^2',
        'subject': 'PHYSICS',
        'ocr_confidence': 0.96,
    })
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'GRADED'
    assert data['is_correct'] is True
    assert data['verification_source'] == 'SYMPY_DETERMINISTIC'
