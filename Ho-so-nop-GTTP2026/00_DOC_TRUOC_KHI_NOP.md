# ĐỌC TRƯỚC: hồ sơ Socratic Vision Board cho "Nhà giáo sáng tạo với công nghệ số và AI 2026"

**Tác giả:** Phùng Văn Kiệm, giáo viên Tin học, Trường THPT Chuyên Vĩnh Phúc · **Bảng B** (THCS, THPT, GDTX)
**Nộp tại:** https://apps.rmit.edu.vn/r/nopsanphamGTTP2026 (đường dẫn lấy từ trang https://www.ieeai.net/giaithuong, nút "Nộp sản phẩm tham gia")
**Thể lệ:** https://tinyurl.com/TheLeGTTP2026 · **Hỏi BTC:** ieeai@rmit.edu.vn, chị Lưu Siêu Anh 0382 186 949

## 0. Hạn nộp: có hai mốc khác nhau, hãy nộp ngay hôm nay

- Công văn 1875/NGCBQLGD-PTNGCB và công văn 4479/SGDĐT-KHCNTT ghi hạn **23:59 ngày 25/10/2026**.
- Trang `ieeai.net/giaithuong` (đọc ngày 25/10/2026) lại ghi **30/10/2026** và đánh dấu mốc 25/10 là "đã thay đổi / gia hạn".
- Mình không xác nhận được mốc nào là cuối cùng. Cách an toàn: **nộp trong hôm nay** theo mốc sớm. Nếu còn băn khoăn, hỏi BTC qua email trên.

## 1. Hồ sơ phải nộp (ba tệp, theo công văn 4479 và trang ieeai.net)

| Tệp | Yêu cầu | Tệp trong thư mục này | Tình trạng |
|---|---|---|---|
| Bài trình bày | PDF, ≤ 15 slide, ≤ 100 MB, dựng trên mẫu BTC | `02_Slide/Socratic-Vision-Board_Slide_PhungVanKiem.pdf` (15 slide, 2,4 MB) | Còn **2 ô `[ link ]` ở slide 15** (xem mục 2) |
| Poster | PDF chất lượng cao, khổ A0 (84,1 × 118,9 cm), ≤ 100 MB, mẫu BTC | `03_Poster/Socratic-Vision-Board_Poster_A0_PhungVanKiem.pdf` (đã đo: đúng 84,1 × 118,9 cm) | Sẵn sàng |
| Video thuyết trình | ≤ 5 phút, **chia sẻ qua link Google Drive**, không xóa hay sửa sau khi nộp | `04_Video/Socratic-Vision-Board_Video_PhungVanKiem.mp4` (4 phút 43 giây, 1920×1080, 66 MB) | Cần tải lên Drive và lấy link |

Nội dung BTC yêu cầu có đủ trong cả slide, poster và video: (1) bối cảnh và vấn đề, (2) ý tưởng, công cụ AI, hình thức triển khai, (3) quá trình triển khai thực tế, (4) kết quả và tác động, (5) tính bền vững và khả năng nhân rộng.

## 2. Việc bắt buộc thầy phải làm (mình không làm thay được)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | Điền **2 ô link ở slide 15**: "Bản chạy thử / mã nguồn" và "Thư mục minh chứng (Drive)". Nếu chưa muốn công khai mã nguồn thì xóa dòng đó đi. | Sửa trong `slide-du-thi/build.py` (dòng 544–546) rồi dựng lại, hoặc sửa trực tiếp trong `Socratic-Vision-Board_Slide-du-thi-2026.pptx` và xuất lại PDF. Nếu thầy gửi link cho mình, mình dựng lại giúp. |
| 2 | Tải video lên **Google Drive**, đặt "Bất kỳ ai có đường liên kết đều có thể xem", dán link vào form (xem `04_Video/HUONG_DAN_VIDEO.md`) | Bản trên YouTube (youtu.be/L6QS6LOGydE) vẫn nên giữ; slide 15 đang trỏ vào đó. Hãy mở cả hai link bằng cửa sổ ẩn danh để kiểm tra. |
| 3 | Xác nhận **video Drive là bản `Final.mp4` (4:43)** và khớp với bản đã đăng YouTube | Mình không so được nội dung hai bản. Nếu YouTube là bản khác, quyết định dùng bản nào, đừng để hai bản khác số liệu. |
| 4 | Điền các ô **[ĐIỀN]** trong `01_Noi_dung_dien_form_nop_bai.md`: số điện thoại, ngày sinh nếu form hỏi, xác nhận mình là người trực tiếp làm những phần nào, cách chia nhóm thực nghiệm/đối chứng | |
| 5 | Chuẩn bị **bằng chứng gốc** của đợt thí điểm (bảng điểm trước/sau, danh sách lớp, ảnh chụp bảng thống kê, phản hồi) và đưa vào thư mục Drive minh chứng | Xem `05_Minh_chung/`. Đây là phần quyết định tiêu chí "Tác động" (25%). |
| 6 | Tích các ô cam kết trong form | Xem mục cam kết trong file 01 |

## 3. Những điểm cần rà trước khi bấm gửi

1. **Số liệu thí điểm phải là số thật.** Theo memory của dự án, thầy đã xác nhận N = 86 là số thật ngày 24/10/2026 và nguồn duy nhất là `socratic-monorepo/packages/types/src/pilot2026.json`. Mục 4c của Thể lệ: tác giả chịu trách nhiệm về nội dung trình bày; Hội đồng có thể hỏi bằng chứng ở vòng chung kết.
2. **Không dẫn `socratic-monorepo/TEST_REPORT.md`.** File đó ghi "100% (14/14)" và ngưỡng lasso 70%, trong khi code thật dùng ngưỡng 25% số điểm và kiểm thử frontend chưa xanh hết (trước đây đo: pytest backend 13/13, Vitest frontend 10/29). Chạy lại ngày 25/10/2026: pytest backend 22/22 đạt, Vitest 101/101 đạt (12 tệp), nên số hiện tại tốt hơn nhiều; nếu cần dẫn kiểm thử thì dùng số mới này, không dùng TEST_REPORT.md. Slide đã tránh những số cũ. Nếu thầy đưa mã nguồn lên link công khai, nên sửa file đó cho khớp.
3. **README của repo ghi "Giải thưởng / Bình chọn: Ngày hội nhà giáo sáng tạo 2026".** Sản phẩm chưa đạt giải gì. Thể lệ yêu cầu sản phẩm "chưa từng được vinh danh ở chương trình chính thức quy mô toàn quốc". Nên xóa dòng đó trước khi công khai repo (https://github.com/dinhmanhcvp/EdTech; mình chưa kiểm tra repo đang công khai hay riêng tư).
4. **Giọng đọc và nhạc trong video.** Memory ghi giọng AI ElevenLabs (nam, "MC Anh Đức") và nhạc nền được dựng từ nhạc trailer của Google Flow (đã báo rủi ro bản quyền). Nếu video có nhạc đó, Drive/BTC có thể gỡ hoặc ban giám khảo hỏi; cân nhắc thay nhạc không bản quyền. Thể lệ cũng yêu cầu sản phẩm "do chính tác giả tạo ra" nên đã ghi rõ việc dùng giọng AI và công cụ AI trong mục kê khai (file 01).
5. **Một thầy một sản phẩm.** Mỗi nhà giáo chỉ nộp tối đa một sản phẩm. Hồ sơ Hanovation của nhóm IT-Hust (4 sinh viên Bách khoa) là cùng sản phẩm này dưới tên AXIOMA; thầy chỉ là người hướng dẫn ở đó. Hai hồ sơ phải khai chéo cuộc thi kia và ghi vai trò khớp nhau; thầy không nộp thêm sản phẩm khác dưới tên mình.

## 4. Nội dung thư mục

| Tệp / thư mục | Dùng cho |
|---|---|
| `01_Noi_dung_dien_form_nop_bai.md` | Từng ô của form: thông tin tác giả, tóm tắt, năm mục nội dung, kê khai AI, cam kết |
| `02_Slide/` | Slide PDF 15 trang để nộp |
| `03_Poster/` | Poster A0 PDF để nộp |
| `04_Video/` | Video MP4 và hướng dẫn đưa lên Drive |
| `05_Minh_chung/` | Tổng hợp số liệu thí điểm, danh mục bằng chứng gốc cần có, mẫu giấy xác nhận của nhà trường (tùy chọn) |
| `06_Chuan_bi_hoi_dap/` | Câu hỏi Hội đồng có thể hỏi (tiêu chí 5: "trả lời câu hỏi, thuyết phục"), kèm đáp án bám số liệu thật |

Nguồn dựng lại (không nộp): `slide-du-thi/` (build.py, poster.py, kit.py), `Ho-so-du-thi-2026/` (pptx và PDF xem trước), `socratic-video/` (Remotion).

## 5. Đối chiếu tiêu chí chấm (Thể lệ mục 4b, 100%)

| Tiêu chí | Tỷ trọng | Hồ sơ trả lời ở | Điểm mạnh / điểm yếu |
|---|---|---|---|
| 1. Tính thực tiễn | 25% | Slide 3, 11; poster mục 01, 05 | Mạnh: bối cảnh rõ, thí điểm tại lớp thật. Cần: ghi rõ lớp, trường, thời gian ở slide 11 và xác nhận của nhà trường (mẫu ở `05_Minh_chung/`) |
| 2. Tính sáng tạo | 20% | Slide 4–10, 13; bảng so sánh | Mạnh: "AI là trình biên dịch", ma sát nhận thức có chủ đích, 81,4% phiên không tốn token. Nên nói rõ khác gì GeoGebra, PhET, ChatGPT |
| 3. Tác động và kết quả thực tiễn | 25% | Slide 12; poster mục 06; `05_Minh_chung/` | Mạnh: có đối chứng, d = 0,88, p = 0,0002, phản hồi 3 người. Yếu: 4 tuần, hai chủ đề, chưa có đánh giá độc lập. Bằng chứng gốc là điều kiện để giữ điểm này |
| 4. Bền vững và nhân rộng | 15% | Slide 14 | Mạnh: chạy trên thiết bị sẵn có, chi phí AI khoảng 350 đồng/tiết. Cần: đã có ai ngoài lớp thầy dùng chưa (nếu có, thêm vào) |
| 5. Chất lượng trình bày, tính thuyết phục | 15% | Slide, poster, video; `06_Chuan_bi_hoi_dap/` | Video 4:43 ≤ 5:00. Luyện trả lời các câu hỏi trong file 06 trước vòng chung kết (dự kiến 05/12/2026 tại TP. Hồ Chí Minh) |

## 6. Mình đã làm / chưa làm

- Đã làm: gom ba tệp nộp vào đúng định dạng (đo lại khổ poster, số trang slide, độ dài video), soạn nội dung điền form, tổng hợp số liệu thí điểm từ `pilot2026.json`, mẫu giấy xác nhận, bộ câu hỏi phản biện.
- Chưa làm và không thể làm thay: bấm nộp trên cổng RMIT, tải video lên Drive, điền link vào slide 15, điền thông tin cá nhân, xin chữ ký/dấu nhà trường, chuẩn bị bằng chứng gốc.
- Chưa kiểm tra: biểu mẫu thật trên `apps.rmit.edu.vn` (cổng này không đọc được ở phiên làm việc này, nên các ô trong file 01 là danh sách dự phòng theo thể lệ, có thể khác tên ô thực tế); nội dung công khai/riêng tư của repo GitHub.
