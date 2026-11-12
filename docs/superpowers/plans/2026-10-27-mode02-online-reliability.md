# Mode 02 online reliability implementation plan

> For agentic workers: use superpowers:executing-plans, inline in the existing workspace. Preserve unrelated uncommitted work.

**Goal:** Survive ambiguous network failures, reloads and exercise switches without losing drafts or duplicating learning evidence/rewards.

**Architecture:** Extend the server-owned catalog response with an authoritative current progress snapshot. Store per-step drafts and stable submission IDs in tab-scoped sessionStorage; server remains the only grading authority. Validate responses using shared Zod contracts. Keep current Next.js/React/FastAPI/SQLite stack.

**Spec:** User's continuing online-first Mode 02 upgrade; existing `.ai/ARCHITECTURE.md` and `.ai/INTERFACES.md` boundaries.

## Constraints and design decisions
- No Teacher Board edits, no dependency additions, no deployment or automatic commit.
- Keep existing verified grading and BKT rules; one retry of the same uncertain attempt must not produce another BKT observation.
- Tab-local drafts are recovery data, never evidence for scores or mastery. Storage failure must not prevent typing/grading.
- Keep current identity limitation explicit: student_default is a development identity, not school authentication.
- No automatic background submissions. An explicit retry reuses its request ID until the text changes or the attempt receives an acknowledged result.

## Review focus
- Response lost after server commit: retry returns cached verdict plus fresh progress, applies learning only once.
- Old request replay after another step: no rollback of total/mastery/completed step.
- Typing during initial restoration: keep answer attached to its original step.
- Switch/reload after failure: recover input and pending ID; unavailable storage degrades to in-memory drafts.
- Malformed response or expired session: no reward/advance; retain answer with actionable feedback.

## Tasks
- [ ] Backend tests: repeated incorrect request updates BKT only once; old replay carries current progress; conflicting payload remains 409.
- [ ] Implement progress snapshot helper and attach `progress` on fresh and cached attempts without storing answer keys in responses.
- [ ] Shared `OnlineTutorProgressSchema` and `OnlineTutorAttemptResultSchema`; adapter validates ranges/status/reward invariants and distinguishes auth/conflict/validation/unavailable.
- [ ] UI regression tests: lost response retry uses same ID, draft survives switching/remount, late restoration preserves entered draft, no duplicate points.
- [ ] Implement small draft utility; wire authoritative state and synchronous submission guard into AfterSchoolTutor. Add completion state and accurate recovery copy.
- [ ] Run student tests, targeted backend regression, typecheck, production build; update interfaces and handoff with evidence and remaining deployment limits.
