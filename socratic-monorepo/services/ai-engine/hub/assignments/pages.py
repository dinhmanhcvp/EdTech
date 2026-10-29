"""PDF hoặc ảnh → các trang JPEG (bảng và điện thoại chỉ cần hiển thị ảnh; AI đọc từng trang)."""
from __future__ import annotations

import io
import threading
from typing import List

from PIL import Image, ImageOps

MAX_PAGES = 20
LONG_SIDE = 1600
QUALITY = 82
PDF_TYPES = {"application/pdf"}
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_PIXELS = 40_000_000  # ảnh vài MB vẫn có thể giải nén ra hàng trăm MB: kiểm kích thước trước khi giải nén
_PDF_LOCK = threading.Lock()  # pdfium không an toàn khi nhiều luồng cùng render


def _open(data: bytes) -> Image.Image:
    try:
        im = Image.open(io.BytesIO(data))
    except Exception:
        raise ValueError("unreadable_file")
    if im.size[0] * im.size[1] > MAX_PIXELS:
        raise ValueError("image_too_large")
    try:
        im.load()
    except Exception:
        raise ValueError("unreadable_file")
    return im


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
    im = _open(data)
    return _jpeg(im, min(long_side, max(im.size)))


def render(data: bytes, content_type: str) -> List[bytes]:
    if content_type in PDF_TYPES:
        import pypdfium2 as pdfium

        with _PDF_LOCK:
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
    return [_jpeg(_open(data))]
