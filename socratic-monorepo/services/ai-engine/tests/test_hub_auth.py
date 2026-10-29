def test_teacher_login_ok_and_wrong_pin(client):
    r = client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "2468"})
    assert r.status_code == 200 and r.json()["teacher"]["id"] == "gv-demo"
    assert client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "0000"}).status_code == 401


def test_teacher_pin_lockout(client):
    for _ in range(5):
        client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "0000"})
    r = client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "2468"})
    assert r.status_code == 429


def test_student_login_case_insensitive(client):
    r = client.post("/api/v1/hub/auth/student", json={"loginCode": "an2345"})
    assert r.status_code == 200 and r.json()["student"]["classId"] == "12a1"
    assert client.post("/api/v1/hub/auth/student", json={"loginCode": "ZZZZZZ"}).status_code == 401


def test_hub_requires_token_even_in_local_mode(client, monkeypatch):
    monkeypatch.delenv("STUDENT_CONTEXT_REQUIRE_AUTH", raising=False)
    assert client.get("/api/v1/hub/me/teacher").status_code == 401


def test_teacher_route_with_teacher_token(client, teacher_headers):
    r = client.get("/api/v1/hub/me/teacher", headers=teacher_headers(client))
    assert r.status_code == 200 and r.json()["teacher"]["id"] == "gv-demo"


def test_student_token_cannot_use_teacher_route(client, student_headers):
    assert client.get("/api/v1/hub/me/teacher", headers=student_headers(client)).status_code == 403


def test_board_role_is_valid_token_role():
    from security import issue_token, verify_token
    assert verify_token(issue_token("board", "sess-abc"))["role"] == "board"


def test_production_refuses_default_token_secret(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("STUDENT_CONTEXT_SECRET", raising=False)
    r = client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "2468"})
    assert r.status_code == 503 and r.json()["detail"] == "hub_secret_not_configured"
    from security import issue_token
    forged = issue_token("teacher", "gv-demo")  # ký bằng secret mặc định công khai
    assert client.get("/api/v1/hub/me/teacher", headers={"Authorization": f"Bearer {forged}"}).status_code == 503
    monkeypatch.setenv("STUDENT_CONTEXT_SECRET", "x" * 40)
    assert client.post("/api/v1/hub/auth/teacher", json={"teacherId": "gv-demo", "pin": "2468"}).status_code == 200
