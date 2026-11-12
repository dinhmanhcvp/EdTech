# Codex Agent Instructions

Luôn đọc `.ai/ARCHITECTURE.md`, `.ai/INTERFACES.md`, và `.ai/HANDOFF.md` trước khi sửa code. Tuân thủ ranh giới module để tránh xung đột. Cập nhật `.ai/HANDOFF.md` khi kết thúc phiên.

Preserve existing business logic and uncommitted work. Use `git mv` for any approved move and verify imports after it.

Chạy local: xem mục "Chạy local" ở đầu `socratic-monorepo/README.md`. Tóm tắt: trong `socratic-monorepo/` chạy `npm install`, chép `.env.example` thành `.env.local` ở `apps/teacher-board` và `apps/student-app`, rồi `npm run dev` (board 3001 gồm cả `/lab`, student 3002, console 3003); AI Engine là `npm run dev:ai` (cổng 8000, cần `pip install -r services/ai-engine/requirements.txt`). Không commit khóa AI.
