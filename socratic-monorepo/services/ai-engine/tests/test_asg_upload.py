"""Bài tập trong tiết — Task 3: tải PDF/ảnh thành trang, AI tách câu."""
import io
import json

import pytest
from PIL import Image

from conftest import console_login


def _pdf(pages=2, size=(600, 800)):
    imgs = [Image.new("RGB", size, (255, 255, 255)) for _ in range(pages)]
    buf = io.BytesIO()
    imgs[0].save(buf, "PDF", save_all=True, append_images=imgs[1:])
    return buf.getvalue()


def _jpeg_with_orientation(w=400, h=200, orientation=6):
    im = Image.new("RGB", (w, h), (200, 200, 200))
    exif = Image.Exif()
    exif[0x0112] = orientation
    buf = io.BytesIO()
    im.save(buf, "JPEG", exif=exif.tobytes())
    return buf.getvalue()


def _upload(client, h, files, title="Đề kiểm tra"):
    return client.post("/api/v1/hub/assignments/upload", data={"title": title, "subject": "MATH", "kind": "exam"}, files=files, headers=h)


def test_pdf_renders_pages():
    from hub.assignments.pages import render
    pages = render(_pdf(2), "application/pdf")
    assert len(pages) == 2
    im = Image.open(io.BytesIO(pages[0]))
    assert im.format == "JPEG" and max(im.size) == 1600


def test_pdf_over_20_pages_rejected(client):
    r = _upload(client, console_login(client), {"file": ("de.pdf", _pdf(21, (100, 140)), "application/pdf")})
    assert r.status_code == 422 and r.json()["detail"] == "too_many_pages"


def test_upload_too_large_413(client, monkeypatch):
    import routers.hub_assignments as ra
    monkeypatch.setattr(ra, "MAX_UPLOAD_BYTES", 1000)
    r = _upload(client, console_login(client), {"file": ("de.pdf", _pdf(1), "application/pdf")})
    assert r.status_code == 413


def test_upload_wrong_type_415(client):
    r = _upload(client, console_login(client), {"file": ("de.docx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert r.status_code == 415


def test_upload_pdf_creates_assignment_with_pages(client):
    h = console_login(client)
    r = _upload(client, h, {"file": ("de.pdf", _pdf(2), "application/pdf")})
    assert r.status_code == 200, r.text
    got = client.get(f"/api/v1/hub/assignments/{r.json()['id']}", headers=h).json()
    assert got["source"] == "file" and len(got["pages"]) == 2 and got["version"] == 0


def test_upload_images_respects_exif(client):
    h = console_login(client)
    r = _upload(client, h, [("files", ("a.jpg", _jpeg_with_orientation(), "image/jpeg")), ("files", ("b.jpg", _jpeg_with_orientation(), "image/jpeg"))])
    assert r.status_code == 200, r.text
    pages = client.get(f"/api/v1/hub/assignments/{r.json()['id']}", headers=h).json()["pages"]
    assert len(pages) == 2 and pages[0]["height"] > pages[0]["width"]  # ảnh ngang 400x200 xoay 90° thành dọc


@pytest.fixture
def vision(monkeypatch):
    import hub.assignments.extract as ex
    box = {"replies": []}
    monkeypatch.setattr(ex.vision, "vision_json", lambda prompt, jpeg, timeout: box["replies"].pop(0) if box["replies"] else None)
    return box


def test_extract_keeps_valid_drops_invalid(client, vision):
    h = console_login(client)
    aid = _upload(client, h, {"file": ("de.pdf", _pdf(2), "application/pdf")}).json()["id"]
    vision["replies"] = [
        json.dumps({"questions": [
            {"label": "Câu 1", "type": "choice", "text": "Chọn đáp án", "options": ["1", "2", "3", "4"], "answer": "1", "box": [0.1, 0.1, 0.8, 0.2]},
            {"label": "Câu 2", "type": "bogus", "text": "?"},
        ]}),
        json.dumps({"questions": [{"label": "Câu 3", "type": "essay", "text": "Giải $x+1=3$", "answer": "x = 2"}]}),
    ]
    r = client.post(f"/api/v1/hub/assignments/{aid}/extract", headers=h)
    assert r.status_code == 200 and r.json()["source"] == "ai"
    qs = r.json()["questions"]
    assert [q["label"] for q in qs] == ["Câu 1", "Câu 3"] and [q["page"] for q in qs] == [0, 1]
    assert [q["id"] for q in qs] == ["q1", "q2"]


def test_extract_offline(client, vision):
    h = console_login(client)
    aid = _upload(client, h, {"file": ("de.pdf", _pdf(1), "application/pdf")}).json()["id"]
    assert client.post(f"/api/v1/hub/assignments/{aid}/extract", headers=h).json() == {"questions": [], "source": "offline"}


def test_extract_drops_answer_on_open_and_ungradable(client, vision):
    h = console_login(client)
    aid = _upload(client, h, {"file": ("de.pdf", _pdf(1), "application/pdf")}).json()["id"]
    vision["replies"] = [json.dumps({"questions": [
        {"label": "Câu 1", "type": "open", "text": "Chứng minh", "answer": "đúng"},
        {"label": "Câu 2", "type": "essay", "text": "Giải hệ", "answer": "x = 2; y = 3"},
    ]})]
    qs = client.post(f"/api/v1/hub/assignments/{aid}/extract", headers=h).json()["questions"]
    assert qs[0]["type"] == "open" and "answer" not in qs[0]
    assert qs[1]["type"] == "essay" and "answer" not in qs[1]  # đáp án máy không chấm được: để giáo viên điền
