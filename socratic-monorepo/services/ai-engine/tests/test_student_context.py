import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_student_context_profile_error_and_roadmap_flow():
    student_id = "test_context_student"
    assert client.put(f"/api/v1/student/profile/{student_id}", json={"profile_id": "OLYMPIAD", "display_name": "Nam", "scaffold_depth": 2, "pace": "fast", "difficulty": "OLYMPIAD_ADVANCED", "visual_first": False}).status_code == 200
    assert client.post(f"/api/v1/student/errors/{student_id}", json={"subject": "PHYSICS", "concept": "cộng vector RLC", "diagnosis": "Cộng độ lớn thay vì cộng theo pha"}).status_code == 200
    data = client.get(f"/api/v1/student/context/{student_id}").json()
    assert data["profile"]["profile_id"] == "OLYMPIAD"
    assert data["errors"][0]["concept"] == "cộng vector RLC"
    assert data["roadmap"]["steps"]

def test_student_context_event_and_teacher_package():
    student_id = "event_student"
    assert client.post(f"/api/v1/student/events/{student_id}", json={"event_type": "STEP_FAILED", "payload": {"step": 2}}).status_code == 200
    package = client.post(f"/api/v1/student/roadmap/{student_id}/prepare")
    assert package.status_code == 200
    assert package.json()["status"] == "prepared"


def test_snapshot_writer_requires_shape_and_persists():
    snapshot = {"sessionId": "s1", "boardSnapshots": [], "studentWork": [], "className": "12A1"}
    response = client.put("/api/v1/student/snapshot", json={"class_id": "12A1", "snapshot": snapshot})
    assert response.status_code == 200
    context = client.get("/api/v1/student/context/snapshot_student?class_id=12A1")
    assert context.status_code == 200
    assert context.json()["snapshot"]["sessionId"] == "s1"
