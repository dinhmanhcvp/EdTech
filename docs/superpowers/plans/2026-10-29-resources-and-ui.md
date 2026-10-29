# Tài nguyên trên bảng + gói cuối tiết + giao diện vòng bài tập — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Hoàn thiện (1) trình mở tài nguyên trên bảng (slide/bài tập/đề, thu phóng, viết đè, đưa lên bảng), (2) nối vào luồng tam giác theo tiết console (gói cuối tiết cho học sinh, tổng kết tiết cho giáo viên), (3) các màn hình để vòng bài tập chạy thật trên console, bảng, app học sinh.

**Spec:** `docs/superpowers/specs/2026-10-29-trinh-mo-tai-nguyen-design.md` (phụ lục), `docs/superpowers/specs/2026-10-29-bai-tap-trong-tiet-design.md` (mục 5–7, 12 bước 2–4). Người dùng cho phép sửa cả console và bảng; giữ nguyên hành vi/test cũ.

**Gói cuối tiết (đề xuất đã được người dùng cho dùng):** tiết console là đơn vị đóng gói. `GET /hub/me/periods` (học sinh) liệt kê các tiết console đã kết thúc của lớp em: tên tiết, lúc kết thúc, các lượt giao của tiết (kết quả của em, phần chữa, bài chữa mẫu), tài nguyên đã mở, link bài học Socratic `?run_id=` khi đã qua hạn. `GET /hub/console/periods/{pid}/summary` (giáo viên): lượt giao + chỉ số từng lượt, tài nguyên đã mở, số bài chờ duyệt, học sinh cần hỗ trợ (chỉ số hub của lớp). Sự kiện học tập, chỉ số lớp, báo cáo phụ huynh đã nối ở plan trước.

## Global Constraints
- Như plan backend bài tập (Python 3.9, id, route `/api/v1/hub`, 404 cho tài nguyên người khác, bảng không có tên/id học sinh).
- Thu phóng 0,5–5; ảnh trang tải bằng `fetch` + header rồi object URL; không thêm thư viện thu phóng.
- Nét viết đè: ≤ 500 nét/trang, tọa độ 0–1 theo ảnh; lưu debounce 1 s.
- Chạy vitest từ gốc monorepo cho console (`npx vitest run apps/teacher-console`), trong thư mục app cho bảng và app học sinh; `tsc --noEmit --incremental false` cho mỗi app.

## Tasks

### Task 1: Backend tài nguyên + gói theo tiết
Files: `hub/assignments/schema.py` (kind `slides`, câu 0–40), `hub/assignments/resources.py` (mới: uses, annotations, học sinh xem trang), `routers/hub_assignments.py` (DELETE), `routers/hub_runs.py` (board resources open/annotations; `/me/resources`; `/me/periods`; `/console/periods/{pid}/summary`), `routers/hub_files.py` (quyền trang qua `resource_uses`), `hub/db.py` (bảng `resource_uses`, `resource_annotations`). Test `tests/test_asg_resources.py`:
`test_slides_need_no_questions`, `test_exercise_still_needs_questions`, `test_delete_unused_only`, `test_board_open_records_use_and_student_sees_pages`, `test_annotations_per_period_and_limits`, `test_other_period_board_cannot_touch_annotations`, `test_me_resources_lists_used_in_my_class`, `test_me_periods_package`, `test_console_period_summary`.

### Task 2: Hợp đồng TS
`packages/types/src/assignments.ts`: thêm `kind` `slides`, `ResourceListItemSchema`, `AnnotationStrokeSchema`, `MyResourceSchema`, `PeriodPackageSchema`, `PeriodSummarySchema`, `BoardListItemSchema`, `ProgressSchema`, `TeacherGridRowSchema`; `HubStreamEventSchema` (hub.ts) thêm `submission_update`. Test trong `assignments.test.ts`.

### Task 3: Console — học sinh của lớp, tài nguyên, duyệt câu
`apps/teacher-console/src/lib/hub.ts` (mới: client API hub dùng cùng token console), `app/classes/page.tsx` (mục "Học sinh": nối lớp, danh sách, thêm nhiều tên, mã, link phụ huynh), `app/resources/page.tsx` (mới: tải lên Slide/Bài tập/Đề, lọc, ảnh trang đầu, xóa), `app/resources/[id]/page.tsx` (mới: trang + danh sách câu, AI tách câu, ô tự khai, sửa loại/đáp án/KC, lưu), menu "Tài nguyên" trong `Shell.tsx`. Test `src/__tests__/hub.test.ts`, `resources.test.tsx`.

### Task 4: Console — bài tập trong tiết đang dạy + tổng kết tiết
`components/AssignmentLive.tsx` (mới, trong `periods/[id]`): lượt giao của tiết, lưới học sinh × câu (cập nhật qua `GET /hub/stream/teacher` + làm mới 15 s), hàng chờ duyệt (ảnh, dòng, bước sai, Đúng/Sai/điểm), "Chiếu lên bảng", đóng/hạn nộp; tổng kết khi tiết đã kết thúc. Test `assignmentLive.test.tsx`.

### Task 5: Bảng — trình mở tài nguyên
`apps/teacher-board/src/utils/viewport.ts` (`clampScale`, `zoomAt`, `fitTo`, `panBy`, `focusBox`), `utils/hubBoard.ts` (client API hub với `X-Board-Token`, bộ nhớ đệm ảnh), `components/resources/ResourcePanel.tsx`, `components/resources/ResourceViewer.tsx` (thu phóng/di chuyển, đổi trang, bút viết đè + lưu, danh sách câu + phóng tới khung, Giao bài → QR, tiến độ), đối tượng ảnh (`Stroke.image`) vẽ trong `SmartboardCanvas` + `onInsertPage`. Test `viewport.test.ts`, `resourceViewer.test.tsx`, `imageStroke.test.ts`.

### Task 6: Bảng — chọn bài và chữa
Trong `ResourceViewer` (bài tập/đề đang giao): "Chọn bài để chữa" (ảnh thu nhỏ ẩn danh, lọc câu/trạng thái), mở ảnh bài với dòng sai tô đỏ + thẻ giải thích, bút chữa + "Lưu phần chữa", nhận `show_submission` từ `GET /hub/board/stream`. Test `boardCorrection.test.tsx`.

### Task 7: App học sinh
`apps/student-app/src/utils/hubApi.ts` (token hub ở localStorage `hub_student_token`), `src/app/a/[code]/page.tsx` (nhập mã, đề + trang thu phóng, trắc nghiệm/gõ/chụp ảnh nén ≤ 1600 px → màn xác nhận ô không chắc → nộp, trạng thái từng câu), `components/hub/HubHome.tsx` (tab mới trên trang chính: Bài tập, Tài liệu của tiết, Tiết học — gói theo tiết, phần chữa). Test `hubApi.test.ts`, `assignmentPage.test.tsx`, `hubHome.test.tsx`.

### Task 8: E2E, tài liệu, kiểm toàn bộ
`services/ai-engine/tests/test_e2e_triangle.py`: console đăng ký → lớp + học sinh → tải đề → bảng ghép → giao → học sinh nộp (trắc nghiệm, ảnh + xác nhận) → giáo viên duyệt → chiếu → hết tiết → bài về nhà → `/me/periods` → chỉ số lớp → báo cáo phụ huynh. Cập nhật `INTERFACES.md`, `ARCHITECTURE.md` (đỉnh 1 = teacher-console + hub), `HANDOFF.md`. Chạy pytest, vitest + tsc cả 3 app, e2e.
