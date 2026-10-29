"""Bài tập trong tiết — Task 2: hợp đồng bài tập, ô tự khai, lưu version."""
import copy
import json

import pytest

from conftest import console_login

SAMPLE = {
    "title": "Phương trình bậc nhất", "subject": "MATH", "kind": "exercise",
    "questions": [
        {"id": "q1", "type": "choice", "label": "Câu 1", "text": "Nghiệm của $2x=4$ là", "options": ["1", "2", "3", "4"], "answer": "1", "kcs": []},
        {"id": "q2", "type": "short", "label": "Câu 2", "text": "Tính $3 \\cdot 4$", "answer": "12", "kcs": []},
        {"id": "q3", "type": "essay", "label": "Câu 3", "text": "Giải $x + 3 = 5$", "answer": "x = 2",
         "kcs": [{"id": "math-phuong-trinh", "label": "Phương trình"}]},
        {"id": "q4", "type": "open", "label": "Câu 4", "text": "Giải thích vì sao chuyển vế phải đổi dấu", "kcs": []},
    ],
}


def _draft(client, h, title="Phương trình bậc nhất", subject="MATH"):
    r = client.post("/api/v1/hub/assignments", json={"title": title, "subject": subject, "kind": "exercise"}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _save(client, h, aid, body, base):
    return client.put(f"/api/v1/hub/assignments/{aid}", json={"body": body, "baseVersion": base}, headers=h)


def test_quick_key_parses_all_types(client):
    h = console_login(client)
    r = client.post("/api/v1/hub/assignments/quick-key", json={"text": "1B 2C 3: x=2 4: tự luận 5= 12"}, headers=h)
    assert r.status_code == 200, r.text
    qs = r.json()["questions"]
    assert [q["type"] for q in qs] == ["choice", "choice", "essay", "open", "short"]
    assert qs[0]["answer"] == "1" and qs[0]["options"] == ["A", "B", "C", "D"]
    assert qs[2]["answer"] == "x=2" and qs[4]["answer"] == "12" and "answer" not in qs[3]
    assert [q["id"] for q in qs] == ["q1", "q2", "q3", "q4", "q5"] and qs[1]["label"] == "Câu 2"


def test_quick_key_option_count_follows_largest_letter():
    from hub.assignments.schema import quick_key
    qs = quick_key("1A\n2F")
    assert qs[0]["options"] == ["A", "B", "C", "D", "E", "F"] and qs[1]["answer"] == "5"


@pytest.mark.parametrize("mutate", [
    lambda b: b["questions"][0].pop("answer"),
    lambda b: b["questions"][3].update(answer="x"),
    lambda b: b["questions"][2].update(answer="x = 2; y = 3"),
    lambda b: b["questions"][0].update(answer="7"),
    lambda b: b["questions"][1].update(id="q1"),
    lambda b: b.update(questions=[]),
])
def test_answer_rules(client, mutate):
    h = console_login(client)
    aid = _draft(client, h)
    body = copy.deepcopy(SAMPLE)
    mutate(body)
    assert _save(client, h, aid, body, 0).status_code == 422


def test_save_versions_and_conflict(client):
    h = console_login(client)
    aid = _draft(client, h)
    assert _save(client, h, aid, SAMPLE, 0).json()["version"] == 1
    assert _save(client, h, aid, SAMPLE, 1).json()["version"] == 1
    changed = copy.deepcopy(SAMPLE); changed["title"] = "Bản 2"
    assert _save(client, h, aid, changed, 1).json()["version"] == 2
    assert _save(client, h, aid, SAMPLE, 1).status_code == 409
    got = client.get(f"/api/v1/hub/assignments/{aid}", headers=h).json()
    assert got["version"] == 2 and got["body"]["questions"][2]["answer"] == "x = 2" and got["pages"] == []


def test_public_body_has_no_answers():
    from hub.assignments.schema import public_body
    text = json.dumps(public_body(SAMPLE))
    assert '"answer"' not in text and '"answer"' in json.dumps(SAMPLE)


def test_list_filters_by_subject_and_text(client):
    h = console_login(client)
    a = _draft(client, h, "Phương trình", "MATH"); _save(client, h, a, SAMPLE, 0)
    b = _draft(client, h, "Dao động", "PHYSICS"); _save(client, h, b, {**SAMPLE, "title": "Dao động", "subject": "PHYSICS"}, 0)
    ids = lambda r: [x["id"] for x in r.json()["assignments"]]
    assert ids(client.get("/api/v1/hub/assignments?subject=PHYSICS", headers=h)) == [b]
    assert ids(client.get("/api/v1/hub/assignments?q=phuong", headers=h)) == [a]


def test_add_question_bumps_version():
    from hub.assignments import store
    from hub.db import connect
    with connect() as conn:
        conn.execute("INSERT OR IGNORE INTO teachers VALUES ('t-x','T','','')")
    aid = store.create_draft("t-x", "B", "MATH", "exercise", "ai")["id"]
    store.save("t-x", aid, SAMPLE, 0)
    out = store.add_question(aid, {"type": "short", "label": "Câu 5", "text": "Tính 2+2", "answer": "4", "kcs": []})
    assert out["version"] == 2 and out["questionId"].startswith("q-")


def test_other_teacher_404(client):
    aid = _draft(client, console_login(client, "gv-mot"))
    other = console_login(client, "gv-hai")
    assert client.get(f"/api/v1/hub/assignments/{aid}", headers=other).status_code == 404
    assert _save(client, other, aid, SAMPLE, 0).status_code == 404
