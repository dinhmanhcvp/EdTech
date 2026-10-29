import copy
import json

import pytest

from hub.seed import DEMO_PLAN


def _other_teacher():
    from hub.auth import hash_pin
    from hub.db import connect
    h, salt = hash_pin("1357")
    with connect() as conn:
        conn.execute("INSERT INTO teachers VALUES ('gv-khac','GV Khác',?,?)", (h, salt))
        conn.execute("INSERT INTO classes VALUES ('10a9','10A9','MATH','gv-khac')")


def test_teacher_sees_own_classes(client, teacher_headers):
    data = client.get("/api/v1/hub/me/teacher", headers=teacher_headers(client)).json()
    classes = {c["id"]: c for c in data["classes"]}
    assert set(classes) == {"12a1", "11a2"} and classes["12a1"]["studentCount"] == 5


def test_add_students_bulk_generates_codes_and_links(client, teacher_headers):
    h = teacher_headers(client)
    r = client.post("/api/v1/hub/classes/12a1/students", json={"names": ["Lan", "Minh"]}, headers=h)
    assert r.status_code == 200
    created = r.json()["students"]
    assert [s["name"] for s in created] == ["Lan", "Minh"]
    assert all(len(s["loginCode"]) == 6 and s["parentToken"] for s in created)
    assert len(client.get("/api/v1/hub/classes/12a1/students", headers=h).json()["students"]) == 7


def test_rotate_parent_link_revokes_old(client, teacher_headers):
    from hub.db import connect
    h = teacher_headers(client)
    old = next(s for s in client.get("/api/v1/hub/classes/12a1/students", headers=h).json()["students"] if s["id"] == "s-an000001")["parentToken"]
    new = client.post("/api/v1/hub/students/s-an000001/parent-link", headers=h).json()["parentToken"]
    assert new and new != old
    with connect() as conn:
        assert conn.execute("SELECT revoked_at FROM parent_links WHERE token=?", (old,)).fetchone()[0] is not None


def test_other_teacher_gets_404(client, teacher_headers):
    _other_teacher()
    h = teacher_headers(client)
    assert client.get("/api/v1/hub/classes/12a1/students", headers=h).status_code == 200
    assert client.get("/api/v1/hub/classes/10a9/students", headers=h).status_code == 404
    assert client.post("/api/v1/hub/classes/10a9/students", json={"names": ["X"]}, headers=h).status_code == 404
    other = teacher_headers(client, "gv-khac", "1357")
    assert client.get("/api/v1/hub/classes/10a9/students", headers=other).status_code == 200
    assert client.get("/api/v1/hub/plans/plan-demo-rlc", headers=other).status_code == 404
    assert client.post("/api/v1/hub/students/s-an000001/parent-link", headers=other).status_code == 404


def test_plan_versioning(client, teacher_headers):
    h = teacher_headers(client)
    r = client.post("/api/v1/hub/plans", json={"body": DEMO_PLAN}, headers=h)
    assert r.status_code == 200 and r.json()["version"] == 1
    pid = r.json()["id"]
    body = copy.deepcopy(DEMO_PLAN); body["title"] = "Bản sửa"
    r2 = client.put(f"/api/v1/hub/plans/{pid}", json={"body": body, "baseVersion": 1}, headers=h)
    assert r2.status_code == 200 and r2.json()["version"] == 2
    r3 = client.put(f"/api/v1/hub/plans/{pid}", json={"body": body, "baseVersion": 2}, headers=h)
    assert r3.json()["version"] == 2
    assert client.put(f"/api/v1/hub/plans/{pid}", json={"body": DEMO_PLAN, "baseVersion": 1}, headers=h).status_code == 409
    listed = {p["id"]: p for p in client.get("/api/v1/hub/plans", headers=h).json()["plans"]}
    assert listed[pid]["currentVersion"] == 2 and listed[pid]["title"] == "Bản sửa"
    got = client.get(f"/api/v1/hub/plans/{pid}", headers=h).json()
    assert got["version"] == 2 and got["body"]["sections"][0]["items"][1]["answer"] == "U = 100"


def _bad(mutate):
    body = copy.deepcopy(DEMO_PLAN)
    mutate(body)
    return body


@pytest.mark.parametrize("mutate", [
    lambda b: b["sections"][0]["items"][3].update(options=["chỉ một"], correct=0),
    lambda b: b.update(sections=[dict(b["sections"][0], id=f"s{i}", items=[]) for i in range(13)]),
    lambda b: b["sections"][0]["items"][3].update(correct=5),
    lambda b: b["sections"][1]["items"][0].update(id="it-rlc-f1"),
    lambda b: b.update(boardContext="x" * 1001),
])
def test_plan_schema_limits(client, teacher_headers, mutate):
    r = client.post("/api/v1/hub/plans", json={"body": _bad(mutate)}, headers=teacher_headers(client))
    assert r.status_code == 422


def test_strip_answers():
    from hub.schemas import strip_answers
    stripped = json.dumps(strip_answers(DEMO_PLAN))
    assert '"answer"' not in stripped and '"correct"' not in stripped
    assert '"answer"' in json.dumps(DEMO_PLAN)


def test_kc_id_slug():
    from hub.schemas import kc_id
    assert kc_id("PHYSICS", "Cộng vector RLC") == "physics-cong-vector-rlc"
    assert kc_id("MATH", "Đạo hàm") == "math-dao-ham"
