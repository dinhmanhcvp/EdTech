"""Small dependency-free bearer token guard for the pilot deployment.

The school deployment can replace this dependency with its OIDC middleware;
the API contract stays the same: role, subject and expiry are required.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time
from typing import Iterable, Optional

from fastapi import Header, HTTPException


def _secret() -> bytes:
    secret = os.getenv("STUDENT_CONTEXT_SECRET", "local-development-secret")
    if len(secret) < 32 and os.getenv("STUDENT_CONTEXT_REQUIRE_AUTH", "false").lower() == "true":
        raise RuntimeError("STUDENT_CONTEXT_SECRET must contain at least 32 characters in production")
    return secret.encode("utf-8")


def issue_token(role: str, subject: str, ttl_seconds: int = 28800) -> str:
    exp = int(time.time()) + max(60, ttl_seconds)
    body = f"v1.{role}.{subject}.{exp}"
    sig = hmac.new(_secret(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{base64.urlsafe_b64encode(sig).decode().rstrip('=')}"


def verify_token(token: str) -> dict[str, str]:
    try:
        version, role, subject, exp, encoded_sig = token.split(".", 4)
        body = ".".join([version, role, subject, exp])
        expected = hmac.new(_secret(), body.encode(), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(encoded_sig + "=" * (-len(encoded_sig) % 4))
        if version != "v1" or not hmac.compare_digest(expected, supplied) or int(exp) < int(time.time()):
            raise ValueError
        if role not in {"student", "teacher", "admin", "board"} or not subject:
            raise ValueError
        return {"role": role, "subject": subject, "exp": exp}
    except Exception as exc:
        raise HTTPException(status_code=401, detail="invalid_or_expired_context_token") from exc


def require_context_auth(authorization: Optional[str] = Header(default=None)) -> dict[str, str]:
    if os.getenv("STUDENT_CONTEXT_REQUIRE_AUTH", "false").lower() != "true":
        return {"role": "local", "subject": "local"}
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="bearer_token_required")
    return verify_token(authorization.split(" ", 1)[1].strip())


def require_roles(roles: Iterable[str]):
    allowed = set(roles)

    def dependency(authorization: Optional[str] = Header(default=None)) -> dict[str, str]:
        claims = require_context_auth(authorization)
        if claims["role"] != "local" and claims["role"] not in allowed:
            raise HTTPException(status_code=403, detail="insufficient_context_role")
        return claims

    return dependency
