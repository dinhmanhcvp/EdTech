# Mode 2 — Bài học hội thoại từ nội dung bảng (design)

Trạng thái: bản nháp chờ duyệt. Ngày: 2026-10-29.

## Mục tiêu
Lấy nội dung thầy cô đã dạy trên bảng, diễn giải thành lời dễ hiểu theo từng học sinh, gộp thành một mạch bài học tự học dạng hội thoại, để học sinh không chán khi làm bài.

## Điều đã thống nhất với người dùng
- "Dịch ra" = diễn giải công thức/hình/nét viết thành lời giải thích tiếng Việt theo trình độ học sinh (không dịch ngôn ngữ).
- "Không chán" = giao tiếp hội thoại (gia sư chat), không game hóa nặng.
- Cách làm: khung bài học và chấm đúng/sai do quy tắc + SymPy; LLM (Gemini) viết lời theo thời gian thực và cá nhân hóa theo từng học sinh.
- Đợt đầu chạy trên snapshot demo. Bộ xuất snapshot thật từ Teacher Board là hạng mục riêng (chạm Mode 1, cần đồng ý riêng).

## Nguyên tắc
1. Server quyết định đúng/sai và điểm; LLM chỉ quyết định cách nói.
2. Không có LLM (hết hạn mức, mất mạng, chưa cấu hình khóa) thì vẫn chạy bằng mẫu câu dự phòng.
3. Student App không import Teacher Board; dữ liệu đi qua snapshot và `@socratic/types`.
4. Đáp án không bao giờ gửi xuống client.
5. Khóa API chỉ ở server (`services/ai-engine/.env`, đã được gitignore).

## Khối và ranh giới
| Khối | Vị trí | Việc |
|---|---|---|
| Hợp đồng `LessonPlan`, `LessonTurn` | `packages/types/src/lesson.ts` (file mới, re-export qua barrel; không sửa `index.ts` khi chưa được phép) | Khung bài học, lượt hội thoại. Không chứa đáp án. |
| `lesson_builder.py` | `services/ai-engine` | Snapshot → các đơn vị học: khái niệm → ví dụ trên bảng → câu hỏi dẫn dắt → bài tập. Thuần quy tắc. |
| `lesson_llm.py` | `services/ai-engine` | Gọi LLM qua `key_pool`/`provider_adapter` hiện có. Timeout, đầu ra JSON chặt, rơi về mẫu câu khi lỗi. Cache theo (đơn vị học, nhóm hồ sơ). |
| Chấm bài của bài học | `services/ai-engine` | Đáp án lưu phía server từ snapshot; dùng lại `verdict()` của `online_tutor`. Không phân tích được → `UNVERIFIED`, không cộng điểm. |
| Route hội thoại | `services/ai-engine/routers/lesson.py` | `POST /api/v1/student/lesson/{student_id}/turn`, trả stream SSE, có `request_id` chống gửi trùng, quyền student/admin và ràng buộc subject như `online_tutor`. |
| `LessonChat.tsx` | `apps/student-app/src/components/companion` | Khung chat, thẻ cảnh bảng (công thức/hình), nút gợi ý, trả lời nhanh, xử lý stream. |

## Cá nhân hóa
Bối cảnh gửi LLM (ẩn danh, không có tên thật): persona, scaffold_depth, pace, visual_first, lỗi cũ liên quan khái niệm, mastery khái niệm, vài lượt gần nhất (giới hạn độ dài). Dùng để chọn độ dài giải thích, ví dụ mở đầu, mức gợi ý đầu tiên, thời điểm tăng độ khó. Bài chữa sai của học sinh trên bảng thành tình huống "tìm lỗi sai".

## Giữ học sinh hứng thú (qua hội thoại)
Mỗi lượt một ý, một câu hỏi; mở bằng việc nhắc đúng thứ thầy cô vừa vẽ; đa dạng kiểu hỏi (dự đoán rồi xem, tìm lỗi, giải thích ngược); khen đúng vào cách nghĩ; có "gợi ý nhỏ hơn" theo thang 4 cấp sẵn có; cuối bài tóm tắt 2–3 ý.

## An toàn
- Tin nhắn học sinh là dữ liệu, không phải chỉ thị; prompt hệ thống tách riêng.
- Bộ lọc đầu ra: `socratic_guard` + so khớp đáp án chính xác của câu hiện tại; vi phạm thì thay bằng mẫu câu dự phòng.
- LLM lỗi/chậm: dự phòng + cờ trạng thái "chế độ cơ bản" cho UI.
- Giới hạn tần suất theo học sinh; không ghi khóa hay tên thật vào log/snapshot.

## Kiểm thử
- pytest (LLM giả lập, không gọi AI thật): dựng bài học từ snapshot demo, bộ lọc chống lộ đáp án, dự phòng khi LLM lỗi/timeout, chống gửi trùng/đổi nội dung (409), chấm đúng/sai/UNVERIFIED, subject guard.
- vitest: `LessonChat` hiển thị stream, giữ câu nhập khi mạng lỗi, không cộng điểm khi UNVERIFIED, hiển thị chế độ cơ bản.
- Kiểm tra tay: chạy backend + student-app với khóa Gemini thật trong `.env`.

## Ngoài phạm vi (đợt sau)
Xuất snapshot thật từ Teacher Board; lưu bền Postgres; danh tính học sinh thật thay `student_default`; hiệu chỉnh BKT bằng dữ liệu thật; gộp đường chấm của `SocraticCompanionSession`.

## Tập tin dự kiến chạm
Mới: `packages/types/src/lesson.ts`, `services/ai-engine/{lesson_builder.py,lesson_llm.py,routers/lesson.py}`, `apps/student-app/src/components/companion/LessonChat.tsx`, test tương ứng.
Sửa nhỏ: `services/ai-engine/main.py` (đăng ký router), `apps/student-app/.../AfterSchoolTutor.tsx` hoặc `page.tsx` (lối vào), `.ai/INTERFACES.md`, `.ai/HANDOFF.md`.
