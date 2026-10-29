"""Xác thực của hub: PIN giáo viên, mã đăng nhập học sinh, token bảng gắn với một tiết."""
from __future__ import annotations

import hashlib
import secrets
from typing import Optional, Tuple

PIN_ITERATIONS = 120_000


def hash_pin(pin: str, salt_hex: Optional[str] = None) -> Tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, PIN_ITERATIONS)
    return digest.hex(), salt.hex()
