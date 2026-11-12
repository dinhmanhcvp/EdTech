---
name: contest-pitch-video
description: Làm video thuyết trình sản phẩm dự thi (giáo dục, khởi nghiệp, sáng kiến, giới hạn thời lượng ~3-5 phút) vừa đúng cấu trúc hồ sơ/tiêu chí chấm, vừa có chất video giới thiệu sản phẩm (không giống slide). Dùng khi người dùng có thể lệ cuộc thi + sản phẩm/repo và muốn video dự thi, pitch video, video thuyết trình sản phẩm.
---

# Contest Pitch Video

Rút ra từ dự án video dự thi Socratic Vision Board (Remotion). Mục tiêu kép: **đúng tinh thần thuyết trình dự thi** (đủ nội dung bắt buộc, bám tiêu chí, số liệu trung thực) **và** **nét video giới thiệu sản phẩm** (ít chữ, chuyển động, UI sản phẩm là nhân vật chính). Dùng cùng `product-intro-video`, `remotion-video`, `audio-and-export`. Có footage người thật (nhóm dự án nói trước máy, học sinh thao tác): dùng thêm `live-action-pitch-video` (quy trình, mã mẫu, QC).

## 1. Đọc nguồn trước khi viết một dòng kịch bản

1. Thể lệ (PDF/Word): lấy **nội dung bắt buộc** (vd: bối cảnh & vấn đề / giải pháp & công cụ AI & hình thức triển khai / kết quả & tác động / bền vững & nhân rộng), **thời lượng tối đa**, **tiêu chí và trọng số**, hạn nộp. Trích văn bản: `pdftotext -layout file.pdf out.txt` (Windows có thể sai mã hóa khi hiển thị: đọc đúng cho ý, không sao chép nguyên văn).
2. Repo sản phẩm: README (triết lý, kiến trúc), báo cáo kiểm thử/benchmark, ảnh chụp giao diện. **Chỉ dùng số liệu có nguồn trong repo.**
3. Phân biệt rõ trên màn hình: **đã đo** (kết quả kiểm thử) và **mục tiêu thiết kế** (ghi "mục tiêu thiết kế"). Không bịa số liệu lớp học/học sinh. Nếu chưa có dữ liệu thực nghiệm tại lớp, nói rõ cho người dùng là chỗ yếu nhất ở tiêu chí tác động và đề nghị bổ sung cảnh dữ liệu thật.

## 2. Khung kịch bản (≈ 4 phút, dưới giới hạn)

| Phần | Giây | Việc |
|---|---|---|
| Hook | 6-8 | Một câu hỏi/khoảnh khắc đau điểm, chữ lớn, không chào hỏi |
| Mở đầu | 8-10 | Tên sản phẩm + câu chào ban giám khảo + tên cuộc thi |
| 1. Bối cảnh & vấn đề | 25-35 | 3 rào cản, mỗi rào cản một khoảnh khắc hình ảnh |
| 2. Giải pháp & công cụ AI | 100-140 | Mỗi tính năng là một cảnh demo UI + 1 con số; sau đó kiến trúc/triển khai |
| 3. Kết quả & tác động | 40-50 | Bức tường số liệu lớn + dashboard cho người dùng cuối |
| 4. Bền vững & nhân rộng | 20-25 | Chi phí, mở rộng, triển khai |
| Kết | 8-11 | Câu chốt + cảm ơn |

Mỗi cảnh bám một tiêu chí chấm; kiểm tra tổng thời lượng bằng script (`TOTAL_FRAMES / fps`) và tốc độ đọc phụ đề ≤ ~17 ký tự/giây.

## 2b. Hai cách làm hình (chọn theo sản phẩm)
- **Sản phẩm là app web chạy được → ưu tiên quay app thật** (skill `product-demo-screencast`): footage thật + camera zoom + Metric Pill + SFX. Đây là cách người dùng yêu cầu cho Socratic Vision Board, và thuyết phục hơn minh họa dựng lại.
- Chưa có app/khó quay → dựng lại UI bằng React (bản motion-graphics, Remotion composition `Pitch`).
- Có thể kết hợp: footage thật cho các hồi tính năng, thẻ số liệu/kết bằng nền giấy cùng phông với sản phẩm.

## 2c. Có video tham chiếu (vd trailer sản phẩm lớn) → học dựng rồi áp vào
Bóc tách điểm cắt, tờ liên hoàn 4 khung/giây, BPM/phách của nhạc; biến từng kỹ thuật thành thành phần (chữ mờ→nét, đám thẻ 3D → tường → match cut, chuyển cảnh nhòe-zoom, montage cắt theo phách, chữ khổng lồ + logo trên outro); dùng khung hình của chính app làm tài sản; nhạc ngắn thì lặp theo ô nhịp và canh outro trùng cuối video. Chi tiết + lệnh + cạm bẫy: `references/reference-video-edit.md`. Bản đã làm: composition `FlowCut` (`socratic-video/src/flow/`).

## 3. Khác nhau giữa "slide" và "product video" (luật cứng)

Không làm: tiêu đề + lưới thẻ kính + gạch đầu dòng; bảng số liệu có thanh tiến độ; hộp phụ đề nền đậm; thanh chương lớn; chữ nhỏ dày đặc; mọi thứ hiện cùng lúc.

Làm:
- **Một ý một cảnh**, chữ cực lớn chuyển động theo từ (kinetic type), từ khóa tô màu.
- **UI sản phẩm là nhân vật chính**: dựng lại hoặc chụp màn hình thật, phóng to, đẩy camera chậm, nghiêng 3D nhẹ, nhãn chỉ (callout: chấm + đường kẻ + nhãn) vào chi tiết; nhãn phải **tắt đúng lúc** để không chồng sang cảnh khác.
- **Số liệu lớn** (một số + một dòng nhãn) thay cho bảng; cho số "bay" về ô lưới khi chuyển ý.
- **Chuyển cảnh có chuyển động** (đẩy/lùi camera đầu và cuối cảnh) thay vì thuần mờ dần.
- **Phụ đề kiểu phim** (không hộp, bóng chữ, lớp tối mờ dưới đáy) = chính là lời thuyết minh; xuất `SCRIPT.md` từ cùng dữ liệu để người dùng thu giọng.
- Giữ cấu trúc thể lệ bằng **nhãn chương nhỏ** (số + tên, chỉ hiện ~3 giây ở đầu mỗi phần) và một vạch tiến độ 4 đoạn rất mảnh trên cùng.

## 4. Quy trình kỹ thuật (Remotion)

1. Một file dữ liệu duy nhất `script.ts`: thứ tự cảnh, thời lượng, phụ đề `[bắt đầu, kết thúc, lời]`, ánh xạ cảnh → chương. Từ file này: tính tổng frame, kiểm tra tốc độ đọc, xuất `SCRIPT.md`.
2. Mỗi cảnh một component; mọi chuyển động theo `frame` (xem `remotion-video`). Thành phần dùng chung: `Kinetic`, `Callout`, `Stat`, `Beat` (khoảng hiển thị có hiện/ẩn), `Captions`, `ChapterTag`, nền aurora + hạt.
3. Chụp màn hình prototype HTML bằng Edge/Chrome headless (`--headless=new --screenshot=... --window-size=1920,1080 --virtual-time-budget=6000 file:///...`). Màn canvas trống ở trạng thái đầu thì **dựng lại bằng React** thay vì dùng ảnh tĩnh.
4. Duyệt bằng khung hình mẫu: viết script render nhiều `renderStill` sau một lần `bundle`, ghép lưới 2x2 bằng FFmpeg rồi xem; sửa chồng lấn trước khi render đầy đủ.
5. Render: `npx remotion render src/index.ts <Id> out/x.mp4 --crf=18 --concurrency=75%`.
6. Chuẩn hóa tương thích: nếu dùng `setVideoImageFormat('jpeg')` thì ra `yuvj420p`; chuyển bằng
   `ffmpeg -i in.mp4 -vf "scale=in_range=pc:out_range=tv:flags=accurate_rnd,format=yuv420p" -c:v libx264 -crf 18 -preset slow -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart -an out.mp4`.
7. Lưu: video, `SCRIPT.md`, mã nguồn dự án và thư mục `skills/` cùng một thư mục dự án.

## 5. Cạm bẫy đã gặp

- Lệnh shell heredoc quá dài có thể lỗi cú pháp: ghi từng file bằng công cụ Write.
- Sau khi sửa file bằng `sed`/script, công cụ Write đòi đọc lại file trước khi ghi đè.
- Dấu câu đứng riêng sau chữ nhấn (`*từ*.`) bị tách ra thành "từ ." : đưa dấu câu vào trong cặp `*...*`.
- Remotion lần đầu tự tải Chrome Headless Shell (~120 MB).
- Chưa có giọng đọc/nhạc nền: video xuất không có âm thanh; người dùng thu giọng theo `SCRIPT.md` hoặc yêu cầu thêm TTS/nhạc.
- Ảnh chụp bản mẫu phải ghi chú là "ảnh chụp từ bản mẫu" nếu không phải bản chạy thật.

## 6. Checklist trước khi giao

- [ ] Đủ 4 nội dung bắt buộc, đúng thứ tự thể lệ, tổng thời lượng dưới giới hạn
- [ ] Mỗi tiêu chí chấm có ít nhất một cảnh thể hiện
- [ ] Số liệu: có nguồn; "đã đo" tách khỏi "mục tiêu thiết kế"; không có số bịa
- [ ] Không còn dáng slide (xem mục 3); callout không chồng cảnh khác
- [ ] Phụ đề không vượt 2 dòng; tốc độ đọc ổn
- [ ] MP4 `yuv420p`, 1920x1080, `faststart`; đã xem lại khung hình từ chính file cuối
- [ ] Thông tin tác giả/đơn vị/bảng thi điền ở `META` hoặc nói rõ là chưa điền
