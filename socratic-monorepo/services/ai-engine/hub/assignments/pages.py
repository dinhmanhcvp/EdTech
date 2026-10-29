"""PDF hoặc ảnh → các trang JPEG (bảng và điện thoại chỉ cần hiển thị ảnh; AI đọc từng trang)."""
from __future__ import annotations

import io
from typing import List

from PIL import Image, ImageOps

MAX_PAGES = 20
LONG_SIDE = 1600
QUALITY = 82
PDF_TYPES = {"application/pdf"}
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _jpeg(im: Image.Image, long_side: int = LONG_SIDE) -> bytes:
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    k = long_side / max(w, h)
    if k != 1:
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=QUALITY, optimize=True)
    return buf.getvalue()


def shrink_photo(data: bytes, long_side: int = LONG_SIDE) -> bytes:
    """Ảnh điện thoại: đúng chiều theo EXIF, cạnh dài tối đa long_side (không phóng to ảnh nhỏ)."""
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        raise ValueError("unreadable_file")
    return _jpeg(im, min(long_side, max(im.size)))


def render(data: bytes, content_type: str) -> List[bytes]:
    if content_type in PDF_TYPES:
        import pypdfium2 as pdfium

        try:
            pdf = pdfium.PdfDocument(data)
        except Exception:
            raise ValueError("unreadable_file")
        if len(pdf) > MAX_PAGES:
            raise ValueError("too_many_pages")
        out = []
        for i in range(len(pdf)):
            page = pdf[i]
            w, h = page.get_size()
            out.append(_jpeg(page.render(scale=LONG_SIDE / max(w, h)).to_pil()))
        return out
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception:
        raise ValueError("unreadable_file")
    return [_jpeg(im)]
