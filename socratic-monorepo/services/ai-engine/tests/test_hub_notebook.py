"""Vở ghi "Học theo SGK": học sinh lưu/đọc vở mình, giáo viên của lớp đọc được, người ngoài không."""


def test_student_saves_and_reads_back(client, student_headers):
    h = student_headers(client)
    r = client.put("/api/v1/hub/me/notebook/PHYS_LAB_BOYLE", json={"prediction": "Nén khí thì áp suất tăng gấp đôi", "result": "", "done": False}, headers=h)
    assert r.status_code == 200 and r.json()["itemKey"] == "PHYS_LAB_BOYLE"
    # ghi lại cùng học liệu = cập nhật, không thêm dòng
    client.put("/api/v1/hub/me/notebook/PHYS_LAB_BOYLE", json={"prediction": "Nén khí thì áp suất tăng gấp đôi", "result": "pV của em lệch 3 %", "done": True}, headers=h)
    entries = client.get("/api/v1/hub/me/notebook", headers=h).json()["entries"]
    assert len(entries) == 1 and entries[0]["result"] == "pV của em lệch 3 %" and entries[0]["done"] is True


def test_students_do_not_see_each_other(client, student_headers):
    client.put("/api/v1/hub/me/notebook/PHYS_SHM", json={"prediction": "của An"}, headers=student_headers(client))
    assert client.get("/api/v1/hub/me/notebook", headers=student_headers(client, "BAO234")).json()["entries"] == []


def test_teacher_reads_own_class_only(client, student_headers, teacher_headers):
    from hub.auth import hash_pin
    from hub.db import connect

    client.put("/api/v1/hub/me/notebook/CHEM_LAB_TOLLENS", json={"prediction": "Có lớp bạc", "result": "Bạc bám thành ống", "done": True}, headers=student_headers(client))
    h = teacher_headers(client)
    entries = client.get("/api/v1/hub/classes/12a1/notebook", headers=h).json()["entries"]
    assert [(e["studentName"], e["itemKey"], e["done"]) for e in entries] == [("Nguyễn Văn An", "CHEM_LAB_TOLLENS", True)]
    hp, salt = hash_pin("1357")
    with connect() as conn:
        conn.execute("INSERT INTO teachers VALUES ('gv-khac','GV Khác',?,?)", (hp, salt))
    other = teacher_headers(client, "gv-khac", "1357")
    assert client.get("/api/v1/hub/classes/12a1/notebook", headers=other).status_code == 404


def test_validation_and_roles(client, student_headers, teacher_headers):
    h = student_headers(client)
    assert client.put("/api/v1/hub/me/notebook/bad key", json={"prediction": "x"}, headers=h).status_code == 422
    assert client.put("/api/v1/hub/me/notebook/PHYS_SHM", json={"prediction": "x" * 2001}, headers=h).status_code == 422
    assert client.put("/api/v1/hub/me/notebook/PHYS_SHM", json={"prediction": "x", "grade": 10}, headers=h).status_code == 422
    assert client.get("/api/v1/hub/me/notebook").status_code == 401
    assert client.get("/api/v1/hub/classes/12a1/notebook", headers=h).status_code in (401, 403)
    assert client.get("/api/v1/hub/me/notebook", headers=teacher_headers(client)).status_code in (401, 403)
