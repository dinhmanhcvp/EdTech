# CHUYÊN ĐỀ 04: TRÍ TUỆ NHÂN TẠO THỊ GIÁC VÀ SƯ PHẠM GỢI MỞ SOCRATIC
## Tài liệu nghiên cứu chuyên sâu dành cho học sinh dự thi ViSEF / ISEF

---

### 1. Phễu nhận dạng phác thảo đa tầng (Multi-tier Recognition Funnel)

Để vừa bảo đảm tốc độ phản hồi tức thì dưới ngón tay của giáo viên, vừa tiết kiệm chi phí gọi API trí tuệ nhân tạo, hệ thống sử dụng một phễu nhận dạng 3 tầng thông minh:

```
[ NÉT VẼ PHÁC THẢO TAY CỦA NGƯỜI DÙNG ]
                    │
      ┌─────────────▼─────────────┐
      │ TẦNG 1: $1 Unistroke      │ ──> Nhận diện hình học cơ bản (tròn, lò xo, dốc)
      │ Chạy Offline trên Client  │     Độ trễ < 2ms | Chi phí = $0.00
      └─────────────┬─────────────┘
                    │ (Nếu sơ đồ phức tạp / liên kết đa vật thể)
      ┌─────────────▼─────────────┐
      │ TẦNG 2: Semantic Cache    │ ──> Khớp vector nhúng sơ đồ phổ biến đã học
      │ Chạy trên Bộ nhớ đệm Web  │     Độ trễ < 50ms | Chi phí = $0.00
      └─────────────┬─────────────┘
                    │ (Nếu là sơ đồ mới lạ chưa từng xuất hiện)
      ┌─────────────▼─────────────┐
      │ TẦNG 3: Cloud Vision LLM  │ ──> Gemini Flash Vision trích xuất AST JSON
      │ Gọi API Đám mây có bảo vệ │     Độ trễ < 1.1s | Kèm Socratic Guardrails
      └───────────────────────────┘
```

#### Chi tiết thuật toán $1 Unistroke Recognizer (Tầng 1):
Thuật toán $1 Unistroke (phát triển bởi Wobbrock và cộng sự) cho phép nhận diện nét vẽ tay độc lập với kích thước và tốc độ vẽ chỉ qua 4 bước toán học cực kỳ thanh lịch:
1. **Lấy mẫu lại điểm (Resample):** Chia lại nét vẽ thành một số lượng điểm cách đều nhau (mặc định $N = 64$ điểm) để loại bỏ sai lệch do người vẽ nhanh hay chậm.
2. **Xoay chuẩn hóa (Rotate to Zero):** Tìm góc nghiêng của đường nối điểm đầu và trọng tâm nét vẽ, sau đó xoay toàn bộ nét vẽ về góc $0^\circ$ để nhận diện bất biến góc quay.
3. **Co giãn kích thước (Scale to Square):** Co giãn hộp bao quanh nét vẽ về kích thước chuẩn một hình vuông cố định ($D \times D$, ví dụ $250 \times 250$ pixel) để bất biến kích thước vẽ to hay nhỏ.
4. **Tịnh tiến về gốc tọa độ (Translate to Origin):** Dời trọng tâm của nét vẽ về gốc tọa độ $(0, 0)$ rồi so sánh khoảng cách Euclid với các mẫu hình học cơ bản đã nạp sẵn. Toàn bộ quá trình này chạy trên JavaScript chỉ mất **dưới 2 mili-giây**!

---

### 2. Cây cú pháp trừu tượng (Abstract Syntax Tree - AST) cho sơ đồ STEM

Khi Gemini Flash Vision phân tích bức ảnh vẽ tay, nó không chỉ trả về tên các đồ vật mà phân tích quan hệ cấu trúc không gian theo một cây cú pháp trừu tượng (AST) được định nghĩa qua schema JSON `SimulationBlueprintCore`:
* **Nút gốc (Root):** Loại mô phỏng (ví dụ: `MECHANICS_INCLINED_PLANE`).
* **Các nút thực thể (Entities):** Nêm nghiêng góc $30^\circ$, khối hộp khối lượng $m = 2 \text{ kg}$, ròng rọc ở đỉnh dốc, dây nối không giãn.
* **Các nút ràng buộc quan hệ (Constraints):** Khối hộp nằm trên mặt nêm, dây nối vắt qua ròng rọc, hệ số ma sát $\mu = 0{,}1$.
Nhờ có cây AST này, động cơ vật lý phía máy khách có thể khởi tạo chính xác các phương trình vi phân và các lực tương tác giữa các vật thể.

---

### 3. Cơ sở lý luận Sư phạm hiện đại của hệ thống

Khi thuyết trình trước Ban Giám khảo, việc nêu bật nền tảng khoa học giáo dục sẽ giúp đề tài của các em vượt trội so với các phần mềm chỉ thuần túy về lập trình:

1. **Thuyết kiến tạo nhận thức (Constructivism - Jean Piaget):**
   Người học không tiếp thu tri thức một cách thụ động bằng cách ngồi nghe, mà phải tự mình kiến tạo tri thức thông qua hành động thực nghiệm, quan sát kết quả và tự điều chỉnh mô hình tư duy trong não.
2. **Vùng phát triển gần nhất (Zone of Proximal Development - Lev Vygotsky):**
   Khoảng cách giữa những gì học sinh có thể tự giải quyết một mình và những gì học sinh có thể giải quyết được khi có sự hướng dẫn của chuyên gia. Hệ thống đóng vai trò là "chiếc giàn giáo sư phạm" (Scaffolding), nâng đỡ từng bước tư duy của học sinh.
3. **Thuyết tải nhận thức (Cognitive Load Theory - John Sweller):**
   Não người có dung lượng bộ nhớ làm việc (Working Memory) rất hạn chế. Nếu để học sinh phải vật lộn với các giao diện phức tạp, nhiều nút bấm thừa thãi, học sinh sẽ bị quá tải nhận thức ngoại lai (Extraneous Cognitive Load). Hệ thống tối giản hóa giao diện bằng trải nghiệm không nút bấm (Zero-Keyboard) để học sinh tập trung $100\%$ trí lực vào tải nhận thức hữu ích (Germane Cognitive Load) là bản chất định luật vật lý.

---

### 4. Khung câu hỏi Socratic 4 cấp độ và Hàng rào sư phạm (Socratic Guardrails)

Hệ thống phân cấp các câu hỏi gợi mở của AI theo 4 bậc thang nhận thức rõ ràng:
* **Cấp 1 - Quan sát trực quan (Observation):** *"Em có nhận xét gì về phương của vectơ vận tốc so với phương của lực căng dây tại vị trí biên?"*
* **Cấp 2 - Giải thích cơ chế (Mechanism):** *"Tại sao khi con lắc đi qua vị trí cân bằng, lực căng dây lại lớn hơn trọng lực tác dụng lên quả cầu?"*
* **Cấp 3 - Dự đoán giả thuyết (Prediction):** *"Nếu ta tăng gấp đôi khối lượng quả cầu nhưng giữ nguyên chiều dài dây, chu kỳ dao động sẽ thay đổi như thế nào? Em hãy kéo thanh trượt để kiểm chứng giả thuyết của mình."*
* **Cấp 4 - Khái quát hóa quy luật (Generalization):** *"Từ kết quả trên, em có thể khái quát hóa mối liên hệ giữa chu kỳ dao động của con lắc đơn và gia tốc trọng trường $g$ không?"*

#### Kỹ thuật Hàng rào sư phạm (Socratic Guardrails):
Trong System Prompt của AI, hệ thống cài đặt các ràng buộc an ninh sư phạm nghiêm ngặt:
* Tuyệt đối không bao giờ xuất ra biểu thức nghiệm cuối cùng dạng số học (ví dụ: cấm xuất $x = 5{,}2$).
* Nếu phát hiện học sinh cố tình nhập câu hỏi đòi đáp án (như: *"Hãy giải giúp tôi bài này"*), AI sẽ tự động kích hoạt câu hỏi phản hồi ngược: *"Để giải được bài này, trước hết em hãy quan sát xem có những lực nào đang tác dụng lên vật?"*, đồng thời tự động bật công cụ *Free-Body Diagram Debugger* trên màn hình học sinh.

---

### 5. Câu hỏi nghiên cứu tự rèn luyện dành cho học sinh

1. **Câu hỏi 1 (Về tâm lý học giáo dục):** "Tải nhận thức ngoại lai" (Extraneous Cognitive Load) và "Tải nhận thức hữu ích" (Germane Cognitive Load) khác nhau như thế nào? Hãy nêu một ví dụ cụ thể về cách mà thiết kế giao diện của Socratic Vision Board giúp triệt tiêu tải nhận thức ngoại lai cho học sinh.
2. **Câu hỏi 2 (Về thuật toán thị giác):** Tại sao bước lấy mẫu lại (Resample về 64 điểm) trong thuật toán $1 Unistroke lại mang tính sống còn đối với độ chính xác của việc nhận diện nét vẽ? Nếu không có bước này thì điều gì sẽ xảy ra khi học sinh vẽ quá nhanh hoặc vẽ ngập ngừng?
3. **Câu hỏi 3 (Về kỹ thuật Prompt Engineering):** Để ngăn chặn hoàn toàn việc AI "nhả đáp án" khi học sinh liên tục thúc ép hoặc sử dụng các câu lệnh thao túng (jailbreak prompts), các em đã thiết kế cấu trúc prompt và cơ chế lọc kết quả đầu ra (Output Guardrails) như thế nào?
4. **Câu hỏi 4 (Về tích hợp sư phạm):** Phân tích ưu thế của việc AI Socratic vừa đặt câu hỏi vừa chủ động kích hoạt một công cụ trực quan (như bật thanh đo năng lượng) so với một chatbot chỉ trò chuyện thuần túy bằng văn bản như ChatGPT hay Khanmigo?
