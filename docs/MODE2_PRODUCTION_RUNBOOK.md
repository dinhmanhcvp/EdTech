# Mode 02 production pilot runbook

Mode 02 is ready for a controlled school pilot when it is deployed behind the school's identity and TLS boundary. The local fallback remains useful for development; production must turn on authentication and persistent storage.

## Services and data ownership

- FastAPI owns Student Context API, deterministic grading, error memory, roadmap generation, and the read-only classroom snapshot.
- Student App owns presentation and offline fallback only.
- Teacher Board is a snapshot producer. It writes a sanitized `ClassroomSessionSnapshot` through `PUT /api/v1/student/snapshot`; Student Board never imports Teacher Board code.
- The runtime database contains student profile settings, pedagogical error memory, session audit events, and the latest snapshot per class.

## Required production environment

Copy `services/ai-engine/.env.production.example` and set:

```env
APP_ENV=production
STUDENT_CONTEXT_REQUIRE_AUTH=true
STUDENT_CONTEXT_SECRET=<secret-manager-value-at-least-32-characters>
STUDENT_CONTEXT_DB=/var/lib/socratic/student_context.sqlite3
CORS_ORIGINS=https://student.school.example,https://teacher.school.example
```

Set `NEXT_PUBLIC_STUDENT_CONTEXT_TOKEN` only when the school gateway injects a short-lived student bearer token. Prefer an OIDC reverse proxy that exchanges the user's session for the API token; never hard-code a shared classroom token in a public bundle.

## Roles

The context API accepts signed bearer claims with role `student`, `teacher`, or `admin`. Student tokens can read their context, save their profile, error memory, and events. Teacher tokens can read context, prepare a roadmap, and publish snapshots. Admin tokens can do both.

For the local compatibility token format, use `security.issue_token()` from a protected server-side script. The token is `v1.<role>.<subject>.<expiry>.<signature>` and is HMAC-signed with `STUDENT_CONTEXT_SECRET`. Production identity should be provided by the school's OIDC gateway instead.

## Snapshot contract

`PUT /api/v1/student/snapshot` requires a teacher/admin token and accepts:

```json
{
  "class_id": "school-a/12A1",
  "snapshot": {
    "sessionId": "lesson-2026-10-27-01",
    "className": "12A1",
    "lessonTitle": "Giản đồ Fresnel RLC",
    "updatedAt": "2026-10-27T10:42:00Z",
    "boardSnapshots": [],
    "studentWork": []
  }
}
```

Do not send full student names, raw audio, or API keys in a snapshot. Keep only the minimum pedagogical data needed for the lesson. Store the class identifier with a school tenant prefix so two schools cannot collide.

## Readiness and operations

- Liveness: `GET /health`
- Readiness: `GET /health/ready`
- Back up `STUDENT_CONTEXT_DB` daily during a pilot; use a managed Postgres adapter before multi-instance deployment.
- Put FastAPI behind HTTPS, a reverse proxy, request-size limits, and school firewall rules.
- Rotate `STUDENT_CONTEXT_SECRET` and invalidate old tokens on a regular schedule.
- Retain event/error data only for the school's approved period; provide a deletion job keyed by student ID before production rollout.

## Pilot acceptance checklist

1. Teacher publishes a snapshot and receives HTTP 200.
2. A student token reads only the assigned class context and cannot publish a snapshot.
3. A teacher token can prepare a roadmap; a student token receives HTTP 403 for that operation.
4. Profile change, error memory, and step events survive an AI Engine restart.
5. `/health/ready` is monitored and the Student UI visibly falls back when unavailable.
6. Test data is deleted before importing real student data.
