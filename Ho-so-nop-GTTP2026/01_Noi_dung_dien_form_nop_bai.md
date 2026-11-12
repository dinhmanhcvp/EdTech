# Nội dung điền form nộp sản phẩm

Cổng nộp: https://apps.rmit.edu.vn/r/nopsanphamGTTP2026 (từ https://www.ieeai.net/giaithuong)

> Lưu ý: mình không mở được biểu mẫu thật nên tên ô dưới đây bám theo thể lệ và công văn. Nếu form có ô khác, lấy nội dung tương ứng ở các mục bên dưới. Chỗ **[ĐIỀN]** là thông tin mình không có.

---

## Phần A · Thông tin tác giả

| Trường | Điền |
|---|---|
| Họ và tên | **Phùng Văn Kiệm** |
| Chức vụ / môn | Giáo viên Tin học |
| Đơn vị công tác | **Trường THPT Chuyên Vĩnh Phúc** (tỉnh Phú Thọ) |
| Bảng dự thi | **Bảng B** (Trung học cơ sở, Trung học phổ thông, Giáo dục thường xuyên) |
| Email | kiempv@cvp.vn |
| Số điện thoại | **[ĐIỀN]** |
| Hình thức | Cá nhân (mỗi nhà giáo tối đa một sản phẩm) |
| Ảnh chân dung (nếu form hỏi) | `Ho-so-du-thi-2026/anh-the/anh-the-3x4-nen-trang.jpg` (hoặc nền xanh, hoặc ảnh vuông) |

## Phần B · Thông tin sản phẩm

| Trường | Điền |
|---|---|
| Tên sản phẩm | **Socratic Vision Board** |
| Tên đầy đủ / khẩu hiệu | Bảng tương tác thông minh và gia sư Socratic cho Toán, Lý, Hóa, Sinh THPT: AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh |
| Chủ đề (chọn theo thể lệ mục 3) | **Lớp học số tích hợp AI**; thêm **Ứng dụng AI có trách nhiệm** (nếu cho chọn nhiều chủ đề). Có thể chọn thêm "Giảng dạy, học tập và đánh giá" |
| Link video | **[ĐIỀN: link Google Drive, quyền "Bất kỳ ai có liên kết"]**; bản YouTube: https://youtu.be/L6QS6LOGydE |
| Tệp slide | `02_Slide/Socratic-Vision-Board_Slide_PhungVanKiem.pdf` |
| Tệp poster | `03_Poster/Socratic-Vision-Board_Poster_A0_PhungVanKiem.pdf` |

### Tóm tắt sản phẩm (khoảng 200 từ; dán nguyên nếu form có ô mô tả)

```
Socratic Vision Board giải hai bài toán của dạy học Toán, Lý, Hóa, Sinh THPT trong một sản phẩm. Trên lớp, giáo viên viết bảng tự nhiên trên màn hình tương tác; nét chữ được nhận dạng ngay tại máy, không gọi AI. Khi giáo viên khoanh một công thức, hệ thống chỉ gửi đúng phần nét được khoanh (ảnh dưới 8 KB) cho Gemini Flash, một lần duy nhất. AI đóng vai trình biên dịch: trả về công thức, tham số và câu hỏi gợi mở dưới dạng dữ liệu JSON. Trình duyệt tự dựng mô phỏng 60 khung hình/giây bằng bốn bộ máy Toán, Lý, Hóa, Sinh; kéo thanh trượt không cần mạng và không tốn chi phí AI.

Khi tự học, học sinh dùng gia sư Socratic có ma sát nhận thức: bước sau bị khóa cho đến khi bước trước đúng, không dán được đáp án, SymPy chấm từng bước, AI chỉ được đặt câu hỏi và không bao giờ nói đáp án. Lỗi sai hiện ngay trên hình, cuối bài học sinh phải tự giải thích bản chất.

Thí điểm 4 tuần, 64 tiết, 7 giáo viên, 86 học sinh lớp 11 và 12 (thực nghiệm 44, đối chứng 42): điểm bài sau 7,74 so với 6,85 (d = 0,88; p = 0,0002); phần Đúng/Sai tăng thêm 25,8 điểm phần trăm; thời gian soạn mô phỏng giảm từ 38,5 xuống 4,2 phút mỗi tiết; chi phí AI khoảng 350 đồng mỗi tiết.
```

(Khoảng 205 từ. Số liệu đều lấy từ `packages/types/src/pilot2026.json`.)

---

## Phần C · Năm mục nội dung bắt buộc (BTC yêu cầu có đủ trong hồ sơ)

Mỗi mục dưới đây dán được vào ô tự do nếu form có; nếu không thì dùng làm dàn ý khi tóm tắt.

**1. Bối cảnh và vấn đề**
Dạy KHTN ở THPT đang kẹt giữa "bảng tĩnh" trên lớp và "AI giải hộ" khi ở nhà. (a) Giáo viên: màn hình tương tác chủ yếu để chiếu slide; soạn một mô phỏng động mất trung bình 38,5 phút mỗi tiết và không đổi được theo câu hỏi tại chỗ. (b) Học sinh: chatbot phổ thông giải trọn bài trong vài giây; trước thí điểm, 71,6% học sinh bỏ cuộc hoặc chép đáp án ngay sau lần sai đầu. (c) Nhà trường: công cụ sinh ảnh, video bằng AI phải chờ nhiều giây và tính tiền theo lượt nên khó dùng giữa tiết, khó nhân rộng cho cả trường.

**2. Ý tưởng, công cụ AI, hình thức triển khai**
Hai nguyên lý: AI chỉ chạy khi thấy khoanh vùng, và AI không bao giờ nói đáp án. Kiến trúc "AI là trình biên dịch": tách nét khoanh tại máy, một lần gọi Gemini Flash trả về dữ liệu (công thức, hai cách đọc thay thế, tham số thanh trượt, câu hỏi Socratic), rồi bốn bộ máy mô phỏng chạy tại trình duyệt. Công cụ: Google Gemini Flash (đọc nét chữ), SymPy (kiểm tra đại số, thứ nguyên, cân bằng phương trình), nhận dạng nét $1 Unistroke chạy ngoại tuyến, nhận giọng nói của trình duyệt. Có bộ chặn chống xin đáp án và chốt chặn bản chất ở cuối bài. Hình thức: màn hình tương tác sẵn có của lớp + trình duyệt + một máy chủ Python.

**3. Quá trình triển khai thực tế**
Vòng khép kín: cuối giờ học sinh quét mã QR để mở lại đúng mô phỏng và tự kéo thanh trượt ở nhà; ở nhà làm bài theo từng bậc với gia sư Socratic; sáng hôm sau giáo viên xem bản đồ nhiệt lớp học để biết bước nào cả lớp đang kẹt. Thí điểm 4 tuần, 64 tiết, 1.420 phiên gia sư, 7 giáo viên, 86 học sinh lớp 11–12 (thực nghiệm 44 gồm 32 học sinh THPT và 12 học sinh chuyên; đối chứng 42). Chủ đề: Vật lý 12 (điện xoay chiều RLC, dao động cơ), Hóa học 11/12 (cân bằng hóa học, oxi hóa – khử, chuẩn độ). Tuần 1 phát hiện 6 lượt lách bộ chặn bằng nhập vai gián tiếp; đã bổ sung bước lọc đầu ra và đo lại. **[ĐIỀN: tên lớp/khối, thời điểm thí điểm, cách chia nhóm thực nghiệm và đối chứng]**

**4. Kết quả và tác động**
Hai nhóm tương đương trước thí điểm (6,42 so với 6,48; p = 0,81). Sau thí điểm: thực nghiệm 7,74 ± 0,89, đối chứng 6,85 ± 1,12; chênh 0,89 điểm; hiệu ứng d = 0,88; p = 0,0002. Tăng so với đầu kỳ: +1,32 điểm (+20,6%) so với +0,37 (+5,7%). Theo phần đề thi tốt nghiệp THPT từ 2025: Phần I (trắc nghiệm) 84,2% so với 81,4%; Phần II (Đúng/Sai) 78,4% so với 52,6%; Phần III (trả lời ngắn nhiều bước) 66,5% so với 44,0%; ghi nhớ sau 2 tuần 82,7% so với 61,2%. Kiên trì sau lần sai đầu tăng từ 28,4% lên 74,6% (gấp 2,6 lần). Bộ chặn ngăn 312/318 lượt (98,1%) xin đáp án hoặc dán lời giải. Giáo viên giảm thời gian soạn mô phỏng từ 38,5 xuống 4,2 phút mỗi tiết (−89,1%). Giới hạn: một đợt thí điểm 4 tuần, hai chủ đề, chưa có đánh giá độc lập.

**5. Tính bền vững và khả năng nhân rộng**
Chạy trên thiết bị trường đã có (màn hình tương tác, trình duyệt) và một máy chủ Python. Mỗi tiết gọi AI trung bình 4,3 lần, chi phí khoảng 0,014 USD (≈ 350 đồng), thấp hơn khoảng 94,6% so với phương án sinh ảnh/video bằng AI theo lượt. Thêm một chủ đề mới chỉ là thêm một mẫu dữ liệu trong thư viện. Hướng phát triển: mở rộng từ 86 học sinh và 7 giáo viên sang toàn khối 10–12; mở rộng thư viện chủ đề KHTN theo Chương trình GDPT 2018; chia sẻ bộ cài đặt và tài liệu hướng dẫn cho giáo viên các trường; thử mô hình chạy tại chỗ để không phụ thuộc mạng.

---

## Phần D · Kê khai sử dụng công cụ AI (dán nguyên, chỉnh cho đúng thực tế)

```
Có sử dụng công cụ AI.
- Trong sản phẩm: Socratic Vision Board gọi mô hình Google Gemini Flash để đọc nét chữ được khoanh và sinh dữ liệu mô phỏng, câu hỏi gợi mở; SymPy kiểm tra đại số và thứ nguyên; nhận dạng nét chạy ngoại tuyến ($1 Unistroke).
- Trong phát triển và làm hồ sơ: tác giả dùng trợ lý lập trình AI (Claude Code) hỗ trợ viết mã, dựng slide, poster và video. Giọng đọc trong video: [ĐIỀN: giọng của tác giả / giọng tổng hợp bằng AI (ElevenLabs)]. Nhạc nền: [ĐIỀN: nguồn và giấy phép].
- Phần do tác giả trực tiếp thực hiện: xác định bài toán và ý tưởng (Magic Lasso, ma sát nhận thức có chủ đích); thiết kế kiến trúc, bộ chặn chống xin đáp án, các kịch bản dạy học; tổ chức đợt thí điểm 4 tuần, thu thập và phân tích số liệu; viết nội dung hồ sơ. [ĐIỀN thêm nếu cần]
- Công cụ AI chỉ hỗ trợ soạn mã và tài liệu theo yêu cầu của tác giả; tác giả rà soát và chịu trách nhiệm kết quả cuối cùng.
```

## Phần E · Cam kết (đọc kỹ rồi mới tích)

Theo thể lệ mục 4c, tích khi đúng thực tế:
1. Sản phẩm là sản phẩm gốc, **chưa từng được vinh danh ở chương trình chính thức nào quy mô toàn quốc**. (Cùng sản phẩm này, dưới tên AXIOMA, đang dự Hanovation Sáng tạo trẻ Hà Nội 2026 do nhóm sinh viên IT-Hust nộp và có thể dự "Ý tưởng sáng tạo EdTech 2026"; chưa có kết quả giải nào. Phải khai các cuộc thi này ở mục "đã tham gia cuộc thi khác". README của repo đang ghi một dòng "Giải thưởng / Bình chọn" cần xóa.)
2. Sản phẩm do chính tác giả tạo ra, không sao chép từ người khác; tác giả chịu trách nhiệm về nội dung và thông tin trình bày.
3. Đồng ý cho Ban Tổ chức dùng thông tin, hình ảnh cá nhân và sản phẩm cho mục đích phi thương mại (truyền thông, đào tạo, phổ biến kinh nghiệm).
4. Mỗi nhà giáo chỉ nộp tối đa một sản phẩm.
5. Số liệu thí điểm (N = 86) là số thật, có dữ liệu gốc lưu giữ.

**Nếu có học sinh xuất hiện trong video hoặc ảnh chụp**: bảo đảm có sự đồng ý của phụ huynh/nhà trường theo quy định. Số liệu và phản hồi học sinh trong hồ sơ đang ghi ẩn danh ("Học sinh lớp 12"), nên giữ như vậy.
