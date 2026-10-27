import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from main import app
import student_context as store
import pytest

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(store, 'DB_PATH', tmp_path / 'tutor.db')
    store.init_store()
    monkeypatch.setenv('STUDENT_CONTEXT_REQUIRE_AUTH', 'false')
    return TestClient(app)

def test_server_catalog_grading_and_replay(client):
    body = {'problem_id': 'hw-phys-1', 'step': 1, 'answer': 'vx=v0*cos(alpha)', 'request_id': 'r1'}
    a = client.post('/api/v1/student/tutor/s1/attempts', json=body)
    assert a.status_code == 200
    assert a.json()['status'] == 'VERIFIED_CORRECT'
    assert client.post('/api/v1/student/tutor/s1/attempts', json=body).json() == a.json()
    body['request_id'] = 'r2'
    b = client.post('/api/v1/student/tutor/s1/attempts', json=body).json()
    assert b['points'] == 0
    assert b['mastery'] == a.json()['mastery']

def test_no_client_answer_key_or_step_skipping(client):
    body = {'problem_id': 'hw-phys-1', 'step': 2, 'answer': 'x=2', 'request_id': 'r1'}
    assert client.post('/api/v1/student/tutor/s1/attempts', json=body).status_code == 409
    body.update(step=1, expected_answer='x=2')
    assert client.post('/api/v1/student/tutor/s1/attempts', json=body).status_code == 422

def test_unparseable_answer_does_not_change_mastery(client):
    body = {'problem_id': 'hw-math-1', 'step': 1, 'answer': 'xin chao?!', 'request_id': 'r1'}
    result = client.post('/api/v1/student/tutor/s1/attempts', json=body)
    assert result.status_code == 200
    assert result.json()['status'] == 'UNVERIFIED'
    assert result.json()['points'] == 0

def test_catalog_accepts_latex_and_does_not_ignore_wrong_lhs(client):
    from routers.online_tutor import CATALOG, verdict
    for problem in CATALOG.values():
        for expected in problem['answers']:
            assert verdict(expected, expected) is True
    assert verdict('y=v0*cos(alpha)', CATALOG['hw-phys-1']['answers'][0]) is False

def test_reused_request_with_changed_answer_is_rejected(client):
    body = {'problem_id': 'hw-phys-1', 'step': 1, 'answer': 'vx=v0*cos(alpha)', 'request_id': 'r1'}
    assert client.post('/api/v1/student/tutor/s1/attempts', json=body).status_code == 200
    body['answer'] = 'vx=0'
    assert client.post('/api/v1/student/tutor/s1/attempts', json=body).status_code == 409

def test_progress_restores_mastery_steps_and_points_without_answer_keys(client):
    url = '/api/v1/student/tutor/s1/progress'
    initial = client.get(url)
    assert initial.status_code == 200
    assert initial.json()['total_points'] == 0
    body = {'problem_id': 'hw-phys-1', 'step': 1, 'answer': 'vx=v0*cos(alpha)', 'request_id': 'restore'}
    result = client.post('/api/v1/student/tutor/s1/attempts', json=body).json()
    client.post('/api/v1/student/tutor/s1/attempts', json=body)
    progress = client.get(url).json()
    assert progress['total_points'] == 20
    physics = next(p for p in progress['problems'] if p['problem_id'] == 'hw-phys-1')
    assert physics['completed_step'] == 1
    assert physics['mastery'] == result['mastery']
    assert 'answers' not in physics
    assert client.get('/api/v1/student/tutor/s2/progress').json()['total_points'] == 0

def test_progress_requires_matching_student_when_auth_enabled(client, monkeypatch):
    from security import issue_token
    monkeypatch.setenv('STUDENT_CONTEXT_REQUIRE_AUTH', 'true')
    monkeypatch.setenv('STUDENT_CONTEXT_SECRET', 'a-test-secret-that-is-at-least-32-characters')
    url = '/api/v1/student/tutor/s1/progress'
    assert client.get(url).status_code == 401
    headers = {'Authorization': 'Bearer ' + issue_token('student', 's2')}
    assert client.get(url, headers=headers).status_code == 403
    headers = {'Authorization': 'Bearer ' + issue_token('student', 's1')}
    assert client.get(url, headers=headers).status_code == 200

def test_retry_of_incorrect_attempt_does_not_add_learning_evidence(client):
    body = {'problem_id': 'hw-phys-1', 'step': 1, 'answer': 'vx=0', 'request_id': 'lost-response'}
    url = '/api/v1/student/tutor/s1/attempts'
    first = client.post(url, json=body).json()
    retry = client.post(url, json=body).json()
    assert first['status'] == 'VERIFIED_INCORRECT'
    assert retry['progress'] == first['progress']
    assert retry['progress']['total_points'] == 0
    assert retry['progress']['problems'][0]['mastery'] == first['mastery']

def test_old_retry_returns_current_progress_not_cached_progress(client):
    url = '/api/v1/student/tutor/s1/attempts'
    first = {'problem_id': 'hw-phys-1', 'step': 1, 'answer': 'vx=v0*cos(alpha)', 'request_id': 'step1'}
    client.post(url, json=first)
    second = client.post(url, json={**first, 'step': 2, 'answer': 'y=h+v0*sin(alpha)*t-1/2*g*t**2', 'request_id': 'step2'}).json()
    replay = client.post(url, json=first).json()
    assert replay['status'] == 'VERIFIED_CORRECT'
    assert replay['progress'] == second['progress']
    assert replay['progress']['total_points'] == 40
    assert replay['progress']['problems'][0]['completed_step'] == 2
