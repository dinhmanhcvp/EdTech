# Kịch bản 5 phút: Socratic Vision Board (bám poster 01 đến 07)

Nguồn bố cục và số liệu: `Ho-so-nop-GTTP2026/03_Poster/Socratic-Vision-Board_Poster_A0_PhungVanKiem.pdf`. Câu khẩu hiệu ở dải xanh là xương sống của cả bài:

> **"AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh."**

Cách đọc: nói như kể chuyện cho một đồng nghiệp, câu ngắn, chỉ tay vào khối đang nói. Đừng đọc số liệu như đọc bảng; mỗi khối chỉ giữ một con số mà người nghe nhớ được.

| Khối poster | Thời lượng | Vai trò |
|---|---|---|
| Dải tên + khẩu hiệu | 0:20 | Mở bằng một câu hỏi |
| 01 Bối cảnh | 0:30 | Lướt |
| 02 Giải pháp | 0:45 | Vừa phải |
| 03 Bốn môn | 0:15 | Lướt, gạt đi chuyện "số môn" |
| 04 Gia sư Socratic | 1:00 | **Trọng tâm 1** |
| 05 Triển khai | 0:15 | Lướt |
| 06 Kết quả | 1:15 | **Trọng tâm 2** |
| 07 Xem và chạy thử + kết | 0:20 | Chốt |
| Còn dư | 0:20 | Đệm cho nhịp nói chậm |

---

## Dải tên và khẩu hiệu (0:00 đến 0:20)

> "Thưa các thầy cô, em xin hỏi một câu trước khi giới thiệu: nếu học sinh gõ đề vào AI và hai giây sau có lời giải, thì mình vừa dạy em điều gì?
> Sản phẩm của em là Socratic Vision Board, và em chọn một nguyên tắc duy nhất, như câu ở dải xanh: AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh."

## 01 Bối cảnh và vấn đề (0:20 đến 0:50) [lướt]

> "Ba người đều đang kẹt. Thầy cô muốn có mô phỏng giữa tiết nhưng phải soạn trước ở nhà. Học sinh thì chatbot giải trọn bài, em chép đáp án, bỏ qua bước lập luận. Nhà trường thì dùng AI sinh ảnh, sinh video phải chờ và trả tiền từng lượt, khó dùng giữa tiết."

## 02 Giải pháp: AI là trình biên dịch, không phải máy vẽ (0:50 đến 1:35)

> "Cách làm của em đơn giản. Thầy cô cứ viết lên bảng, khoanh một vùng, ví dụ này là 'v₀ bằng 24, góc 45 độ'. AI chỉ làm một việc: **dịch** nét vừa khoanh thành công thức, tham số và một câu hỏi gợi mở. Việc vẽ thì để cho mô phỏng chạy ngay trên máy.
> Cho nên khi viết, em không gọi AI lần nào, phản hồi dưới 16 mili giây. Cả tiết học chỉ khoảng 4 lần gọi AI, tốn khoảng 350 đồng. Thầy cô kéo thanh trượt là mô hình chạy, không cần mạng."

Nếu muốn ghi điểm với giám khảo hiểu kỹ thuật, thêm một câu: "Vì AI chỉ dịch, nên mô hình **luôn đúng theo phương trình**, không bị 'bịa hình'."

## 03 Một nét khoanh, bốn môn (1:35 đến 1:50) [lướt, đây là chỗ gạt chuyện số môn]

> "Bốn môn ở đây, Lý, Toán, Hóa, Sinh, em không dùng để khoe số lượng. Chúng chỉ để chứng minh một điều: cùng **một cách làm** chạy được cho nhiều môn. Em không chạy đua số công cụ, vì thêm môn là việc kỹ thuật. Phần khó là cách dạy, và đó là phần tiếp theo."

## 04 Gia sư Socratic: kiểm bằng toán học trước (1:50 đến 2:50) [trọng tâm 1]

Chỉ tay vào bốn tầng, từ trên xuống.

> "Đây là phần em tâm đắc nhất. Khi học sinh hỏi bài, câu hỏi đi qua bốn tầng, và tầng nào nhẹ nhất thì xử lý trước.
> Tầng 0 chặn việc xin đáp án. Trong thí điểm có 318 lượt xin đáp án, hệ thống chặn 312.
> Tầng 1 là toán học thật. SymPy kiểm từng bước học sinh viết, xử lý hơn một nửa số phiên, dưới 12 mili giây. Nên ở đây AI không phán đúng sai, toán phán.
> Tầng 2 là kho câu hỏi gợi mở có sẵn, khoảng 27% phiên.
> Chỉ tới tầng 3, khoảng 19% phiên, mới gọi mô hình ngôn ngữ, và mô hình chỉ được **hỏi**, không được giải.
> Dòng đỏ bên dưới là điều em muốn thầy cô nhớ: tỷ lệ học sinh **kiên trì sau lần sai đầu** tăng từ 28% lên 75%, gấp 2,6 lần. Sai một lần mà vẫn làm tiếp, đó mới là học."

Nếu bị hỏi vặn "bên kia cũng dùng thư viện toán để tính": "Dạ đúng, em không nói đó là điểm riêng. Điểm riêng là toán kiểm xong rồi **không nói đáp án**, mà hỏi ngược lại."

## 05 Triển khai: vòng khép kín (2:50 đến 3:05) [lướt]

> "Cuối giờ học sinh quét mã QR mở lại đúng mô phỏng, về nhà làm bài theo bậc, sáng hôm sau giáo viên thấy bản đồ nhiệt của cả lớp: em nào sai ở bước nào. Em đã thí điểm 4 tuần, 64 tiết, hơn 1.400 phiên gia sư."

## 06 Kết quả thí điểm, N = 86 (3:05 đến 4:20) [trọng tâm 2]

Chỉ vào biểu đồ cột, **nhấn vào chỗ khác biệt giữa các dòng**, không đọc hết mọi cột.

> "Em có 86 học sinh lớp 11 và 12, chia hai nhóm: 44 em học với hệ thống, 42 em là nhóm đối chứng. Điểm bài sau: 7,74 so với 6,85, d bằng 0,88, p bằng 0,0002.
> Nhưng điều thú vị nằm ở biểu đồ. Phần trắc nghiệm, hai nhóm gần như ngang nhau: 84 và 81. Còn phần đúng/sai, nhóm học với hệ thống hơn hẳn: 78 so với 53. Trả lời ngắn: 67 so với 44. Và ghi nhớ sau hai tuần: 83 so với 61.
> Nghĩa là chỗ khác biệt rõ nhất đúng là chỗ học sinh **phải tự nghĩ và tự giải thích**. Đó chính là điều Socratic nhắm tới."

Một câu học sinh ở dưới khối 06 để làm điểm nhấn cảm xúc, đọc chậm: *"Em quên trực quan ma sát là mô hình hiện ngay vật trượt quá dốc và báo lệch thứ nguyên."*

**Câu trả lời trung thực nếu bị hỏi hạn chế:** "Đây là thí điểm 4 tuần, một số lớp ở một trường, nên em coi đây là tín hiệu tích cực, chưa phải bằng chứng cuối cùng."

## 07 Xem và chạy thử, kết (4:20 đến 4:40)

> "Thầy cô quét mã này để xem video và chạy thử ngay, không cần tài khoản. Em xin chốt lại bằng một câu: không để AI suy nghĩ thay học sinh, mà dùng AI để đánh thức nhà khoa học bên trong mỗi em. Em xin cảm ơn."

---

## Khi giám khảo hỏi: "Em hơn BC178.08 và iFLYTEK ở điểm nào?"

Trả lời tự nhiên, khoảng 30 giây, không nêu danh sách tính năng:

> "Dạ, em tôn trọng cả hai. Họ làm rất rộng, và khung hồng ngoại giữ được phấn thật là một ưu điểm thật. Chỗ em chọn khác là: các hệ thống đó mạnh ở việc **đưa nội dung ra**, và AI giải từng bước cho học sinh xem. Em chọn hướng ngược lại: AI **không giải hộ**, và em có đo. Thí điểm của em có nhóm đối chứng, và chỗ hơn rõ nhất là phần học sinh phải tự suy luận. Em không cạnh tranh số công cụ, em cạnh tranh ở chỗ học sinh có tự nghĩ ra không."

Ba câu hỏi khác dễ gặp:
- **"Chỉ có bốn môn thôi à?"** "Dạ, bốn môn để chứng minh cách làm, mở rộng thêm môn là việc kỹ thuật, nên em dồn sức vào cách dạy."
- **"AI sai thì sao?"** "Toán thật phán đúng sai, AI chỉ được hỏi gợi mở, và mô phỏng chạy theo phương trình xác định."
- **"Dữ liệu học sinh bảo vệ thế nào?"** "Hiện phòng học nằm trong bộ nhớ tạm, chưa có tài khoản, nên em chưa đưa vào trường công; đây là hạng mục Giai đoạn 2."

## Việc phải xử lý trước ngày thi (nói thẳng, giám khảo sẽ hỏi)

1. **Lệch bộ số giữa các hồ sơ.** Poster này ghi **N = 86, 4 tuần, d = 0,88**; báo cáo khởi nghiệp và sổ tay phòng vệ ghi **412 học sinh, 8 tuần, d = 0,73**. Phải chọn đúng một bộ cho ViSEF và nói rõ quan hệ giữa hai đợt nếu bị hỏi. Kịch bản này dùng bộ số của poster.
2. **Nguồn của số trên poster:** "chặn 312/318", "kiên trì 28,4% lên 74,6%" cần truy được về nhật ký hoặc bảng dữ liệu gốc, và cách chia nhóm (ngẫu nhiên theo lớp hay theo học sinh, ai ra đề) cần có câu trả lời sẵn.
3. **Dòng "+1,32 điểm (+20,6%)" trên poster** không khớp với 7,74 trừ 6,85 (= 0,89); chọn cách nói nhất quán (so với đối chứng hay so với trước thí điểm) trước khi đứng trình bày.
4. Demo (nếu có) dùng biến `z`, `k` thay `x`, `t`, vì bộ kiểm thứ nguyên đang báo sai biến thường.
