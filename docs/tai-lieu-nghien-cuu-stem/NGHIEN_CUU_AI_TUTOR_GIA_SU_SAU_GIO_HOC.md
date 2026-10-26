# NGHIÊN CỨU CHUYÊN SÂU: HỆ THỐNG GIA SƯ AI SOCRATIC ĐỒNG HÀNH SAU GIỜ HỌC
## Kiến trúc Sư phạm, Truy vết Tri thức và Công nghệ Tự học STEM Cá nhân hóa
### Dự án: Nền tảng Bảng tương tác thông minh Socratic Vision Board

---

## MỤC LỤC HỆ THỐNG

1. **Bối cảnh thực tiễn và Điểm gãy nhận thức trong tự học sau giờ học**
   - Hiện trạng bẫy giải hộ đáp án của các ứng dụng AI tiêu dùng
   - Hiện tượng bức tường 9 giờ tối và sự cô độc nhận thức của học sinh
   - Sự đứt gãy thông tin giữa bài giảng trên lớp và buổi tự học ở nhà
2. **Khung lý thuyết Sư phạm & Nguyên tắc Ma sát nhận thức có chủ đích**
   - Lý thuyết nỗ lực tư duy hữu ích và khó khăn mong muốn
   - Cơ chế phòng chống sụp đổ sư phạm và hàng rào an ninh Socratic Guardrails
   - Ma trận phân tầng giàn giáo sư phạm 4 cấp độ
3. **Mô hình toán học Truy vết Tri thức người học**
   - Ứng dụng mô hình Bayesian Knowledge Tracing trong chẩn đoán điểm mù
   - Mở rộng Deep Knowledge Tracing nắm bắt liên kết liên môn Toán - Lý - Hóa
   - Bản đồ nhiệt nhận thức cá nhân hóa và phát hiện ngộ nhận gốc rễ
4. **Cầu nối bài giảng Bục giảng - Về nhà thông qua Vector Journaling Replay**
   - Tái hiện bài học động lực học tương tác từ tệp nhật ký siêu nhẹ
   - Tương tác can thiệp trực tiếp vào mô phỏng của giáo viên
5. **Đặc tả 4 Chế độ tương tác của AI Tutor sau giờ học**
   - Chế độ 1: Giải bài tập về nhà có giàn giáo Socratic
   - Chế độ 2: Phòng thí nghiệm phác thảo tự do tại nhà
   - Chế độ 3: Luyện thi phân hóa và Ôn tập ngắt quãng Spaced Repetition
   - Chế độ 4: Cầu nối phản hồi ParentPulse và Teacher Dashboard
6. **Kiến trúc Kỹ thuật phần mềm và Tối ưu hóa Offline-First**
   - Ngăn xếp công nghệ phía máy khách và lưu trữ cục bộ IndexedDB
   - Luồng dữ liệu xử lý bất đồng bộ phía máy chủ AI Engine Hub
   - Đảm bảo tính riêng tư dữ liệu và an toàn học sinh
7. **Kế hoạch Thực nghiệm và Bộ chỉ số Đánh giá hiệu quả**
8. **Câu hỏi nghiên cứu mở rộng dành cho học sinh**

---

## 1. Bối cảnh thực tiễn và Điểm gãy nhận thức trong tự học sau giờ học

### 1.1. Hiện trạng bẫy giải hộ đáp án của các ứng dụng AI tiêu dùng
Sự bùng nổ của các mô hình ngôn ngữ lớn thương mại và các ứng dụng quét bài tập như Photomath, Qanda, ChatGPT đã làm thay đổi hoàn toàn thói quen làm bài tập về nhà của học sinh phổ thông. Khi gặp một bài toán vật lý hay phản ứng hóa học khó, đa số học sinh chọn cách chụp ảnh hoặc dán toàn văn đề bài vào chatbot để nhận ngay lời giải chi tiết và đáp số sau vài giây.

Hiện tượng này tạo ra hai hệ quả giáo dục tiêu cực:
* **Tê liệt tư duy độc lập:** Học sinh bỏ qua hoàn toàn giai đoạn trăn trở tìm tòi, vốn là giai đoạn quan trọng nhất giúp não bộ hình thành các liên kết thần kinh mới và xây dựng lược đồ nhận thức (Schema Construction).
* **Ảo tưởng về năng lực:** Khi đọc một bài giải hoàn chỉnh do AI viết sẵn, học sinh cảm thấy rất dễ hiểu và lầm tưởng rằng mình đã làm chủ kiến thức. Tuy nhiên, khi bước vào phòng thi không có điện thoại, các em hoàn toàn bất lực vì chưa từng tự mình vận động tư duy từ trang giấy trắng.

### 1.2. Hiện tượng bức tường 9 giờ tối và sự cô độc nhận thức
Ngược lại với nhóm học sinh lạm dụng AI giải hộ, những học sinh có ý thức tự lực cánh sinh lại đối mặt với **bức tường 9 giờ tối**:
* Khi làm bài tập tại nhà vào ban đêm, nếu gặp một khái niệm khó (ví dụ: xác định chiều của lực ma sát nghỉ, hay cân bằng phương trình ion thu gọn), các em không thể liên hệ được với thầy cô giáo bộ môn.
* Phụ huynh phần lớn không đủ kiến thức chuyên môn sâu về chương trình GDPT mới để hướng dẫn con em.
* Sự bế tắc kéo dài biến ma sát nhận thức thành cảm giác bất lực, chán nản và thúc đẩy học sinh từ bỏ hoặc quay lại con đường sao chép lời giải từ mạng xã hội.

### 1.3. Sự đứt gãy thông tin giữa bài giảng trên lớp và buổi tự học ở nhà
Trong tiết học trên lớp, giáo viên có thể đã biểu diễn những mô phỏng rất trực quan trên màn hình tương tác thông minh 86 inch. Tuy nhiên, khi về nhà, học sinh chỉ còn lại những dòng ghi chép vội vàng trong vở hoặc các tệp slide PowerPoint tĩnh. Không có công cụ nào giúp học sinh tái hiện lại những tương tác động học đó để tiếp tục đào sâu nghiên cứu.

---

## 2. Khung lý thuyết Sư phạm & Nguyên tắc Ma sát nhận thức có chủ đích

Khác biệt hoàn toàn với các chatbot thương mại, phân hệ AI Tutor sau giờ học của Socratic Vision Board được xây dựng trên nền tảng khoa học nhận thức và giáo dục học thực nghiệm hiện đại.

```
┌──────────────────────────────────────────────────────────────┐
│       NGUYÊN TẮC VÀNG CỦA AI TUTOR SAU GIỜ HỌC              │
│  "Không cung cấp đáp án - Chỉ cung cấp công cụ để tự thấy"  │
└──────────────────────────────┬───────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
[ PRODUCTIVE STRUGGLE ]                     [ VISUAL SCAFFOLDING ]
Giữ học sinh trong vùng nỗ lực tư duy       Kích hoạt công cụ thị giác
Ngăn chặn học vẹt & ảo tưởng năng lực      Tự giải quyết mâu thuẫn nhận thức
```

### 2.1. Lý thuyết nỗ lực tư duy hữu ích và khó khăn mong muốn
Theo nghiên cứu của nhà tâm lý học Robert Bjork, quá trình học tập sâu chỉ diễn ra khi người học trải qua các **khó khăn mong muốn (Desirable Difficulties)**. Việc tạo ra một lượng **ma sát nhận thức có chủ đích (Intentional Cognitive Friction)** giúp làm chậm quá trình tiếp thu bề nổi nhưng tối ưu hóa khả năng ghi nhớ dài hạn và chuyển giao tri thức sang các bối cảnh mới.

Hệ thống thiết lập nguyên lý:
1. AI Tutor tuyệt đối không bao giờ xuất ra kết quả số học cuối cùng hoặc công thức rút gọn trực tiếp.
2. Khi học sinh yêu cầu giúp đỡ, hệ thống luôn phản hồi bằng một câu hỏi bản chất hoặc một thao tác thực nghiệm trên mô phỏng.

### 2.2. Cơ chế phòng chống sụp đổ sư phạm
Một thách thức kỹ thuật lớn của các hệ thống gia sư AI dựa trên LLM là hiện tượng **sụp đổ sư phạm (Scaffolding Collapse)**. Khi học sinh cảm thấy sốt ruột và liên tục ra lệnh: *"Tôi không muốn suy nghĩ nữa, hãy cho tôi đáp án ngay lập tức"*, các mô hình AI thông thường sẽ đầu hàng và cung cấp toàn bộ lời giải.

Để khắc phục triệt để lỗ hổng này, phân hệ AI Tutor áp dụng kỹ thuật **Hàng rào an ninh Socratic Guardrails** đa tầng:
* **Tầng lọc mục đích đầu vào:** Sử dụng bộ phân loại nhanh (Intent Classifier) để nhận diện các câu lệnh ép buộc hoặc bẻ khóa (Jailbreak Prompts).
* **Tầng chuyển hướng sư phạm:** Khi phát hiện học sinh nản lòng, hệ thống không lặp lại câu hỏi trừu tượng mà chuyển đổi phương thức tương tác: tự động mở một công cụ mô phỏng trực quan tương ứng (ví dụ: mở thanh cân bằng hóa học hoặc tam giác lực) kèm lời động viên nhẹ nhàng: *"Thầy biết bài toán này rất thử thách! Em hãy thử di chuyển thanh trượt ma sát trên hình xem khối gỗ có trượt xuống được không nhé?"*.
* **Tầng kiểm duyệt đầu ra:** Một hàm kiểm tra Regex và AST toán học sẽ quét câu trả lời trước khi gửi về client; nếu phát hiện có dạng biểu thức giải sẵn như `x = ...` hay `m = ...`, phản hồi sẽ bị chặn và thay thế bằng câu hỏi gợi ý thành phần.

### 2.3. Ma trận phân tầng giàn giáo sư phạm 4 cấp độ
Khi học sinh gặp khó khăn, hệ thống hạ bậc độ khó theo 4 nấc thang khoa học:

| Cấp độ giàn giáo | Tên gọi chuyên môn | Mục tiêu can thiệp | Phương thức thực thi trong hệ thống |
| :---: | :--- | :--- | :--- |
| **Mức 1** | **Micro-Cue**<br>*(Gợi ý vi mô)* | Hướng sự chú ý vào thông số then chốt đang bị bỏ sót. | AI đưa ra một gợi ý ngắn gọn: *"Em hãy quan sát xem vận tốc ban đầu của vật tại đỉnh dốc bằng bao nhiêu?"*. |
| **Mức 2** | **Visual Debugger Trigger**<br>*(Kích hoạt công cụ thị giác)* | Giúp học sinh tự phát hiện mâu thuẫn bằng hình ảnh trực quan. | Tự động bung widget đồ thị động (ví dụ: Energy Bar Debugger) để học sinh thấy cơ năng đang không bảo toàn do có ma sát. |
| **Mức 3** | **Leading Counter-Example**<br>*(Phản ví dụ dẫn dắt)* | Thách thức giả định sai lầm của học sinh bằng trường hợp giới hạn. | *"Nếu mặt phẳng nghiêng hoàn toàn không có ma sát, theo em khối gỗ có dừng lại được không?"*. |
| **Mức 4** | **Sub-Problem Decomposition**<br>*(Phân rã bài toán)* | Chia nhỏ bài toán phức tạp thành các câu hỏi phụ độc lập. | Kích hoạt giao diện Locked Stepper: Bước 1 tìm gia tốc $\to$ Bước 2 tìm vận tốc $\to$ Bước 3 tính quãng đường. |

---

## 3. Mô hình toán học Truy vết Tri thức người học

Để trở thành một gia sư thực thụ, hệ thống cần hiểu rõ học sinh đã nắm vững những khái niệm nào và đang bị "hổng" ở những mắt xích nào trong mạng lưới kiến thức.

```
       BÀI TẬP / HÀNH ĐỘNG CỦA HỌC SINH
                     │
         ┌───────────▼───────────┐
         │  Phân tích log hành vi│ (Thời gian suy nghĩ, số lần thử sai,
         │  & phản hồi Socratic  │  mức độ dùng Visual Debugger)
         └───────────┬───────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ MÔ HÌNH BKT (Xác suất) ]    [ MÔ HÌNH DKT (Mạng nơ-ron) ]
Ước lượng độ thành thạo       Dự đoán quy luật quên lãng
minh bạch từng kỹ năng con    và liên kết chéo đa môn học
       │                           │
       └─────────────┬─────────────┘
                     ▼
       [ KNOWLEDGE HEATMAP CÁ NHÂN HÓA ]
       Hiển thị điểm mù & đề xuất lộ trình ôn tập
```

### 3.1. Ứng dụng mô hình Bayesian Knowledge Tracing
Hệ thống triển khai thuật toán **Bayesian Knowledge Tracing (BKT)** dựa trên mô hình Markov ẩn (Hidden Markov Model) để theo dõi trạng thái làm chủ từng kỹ năng thành phần (Knowledge Component - KC).

Với mỗi kỹ năng con $k$ (ví dụ: *Quy tắc cộng vectơ lực*, *Bảo toàn cơ năng*, *Xác định số oxi hóa*), trạng thái tri thức được mô tả qua 4 tham số xác suất:
1. $P(L_0)$: Xác suất ban đầu học sinh đã nắm vững kỹ năng trước khi làm bài tập.
2. $P(T)$: Tốc độ tiếp thu (Transit probability) - xác suất học sinh chuyển từ trạng thái chưa biết sang đã hiểu sau một lượt làm bài.
3. $P(G)$: Xác suất đoán mò đúng (Guess probability) - học sinh chưa hiểu bài nhưng chọn trúng đáp án ngẫu nhiên.
4. $P(S)$: Xác suất sơ suất làm sai (Slip probability) - học sinh đã nắm vững kiến thức nhưng tính nhầm dấu hoặc bấm nhầm máy tính.

Sau mỗi bước tương tác thứ $t$, nếu học sinh trả lời đúng hoặc thao tác chính xác trên mô phỏng, xác suất làm chủ tri thức được cập nhật theo định lý Bayes:

$$P(L_t \mid \text{Correct}) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$

Nếu học sinh làm sai:

$$P(L_t \mid \text{Incorrect}) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$

Tiếp đó, xác suất học sinh làm chủ kỹ năng trước khi bước vào câu tiếp theo được tính qua tốc độ tiếp thu $P(T)$:

$$P(L_{t+1}) = P(L_t \mid \text{Evidence}) + (1 - P(L_t \mid \text{Evidence})) \cdot P(T)$$

**Ưu điểm vượt trội của BKT:** Tính toán cực nhanh trên trình duyệt hoặc máy chủ nhẹ, hoàn toàn minh bạch và có thể giải thích rõ ràng cho giáo viên và học sinh: *"Hệ thống nhận thấy em có $88\%$ độ thành thạo về định luật II Newton, nhưng chỉ đạt $32\%$ về kỹ năng chiếu vectơ lực lên trục Oy"*.

### 3.2. Mở rộng Deep Knowledge Tracing nắm bắt liên kết liên môn
Trong các bài toán STEM nâng cao (đặc biệt là đề thi HSG Quốc gia), một bài tập thường đòi hỏi sự kết hợp đồng thời của nhiều môn học (ví dụ: dùng giải tích tích phân để tính thông lượng điện trường, hoặc dùng nhiệt động lực học để giải thích cân bằng hóa học). 

Hệ thống kết hợp mạng hồi quy **LSTM trong Deep Knowledge Tracing (DKT)** để nhận diện sự liên đới ẩn giữa các môn học. Ví dụ, nếu học sinh thường xuyên làm sai bài toán mạch dao động LC trong môn Vật lý, DKT sẽ phát hiện ra nguyên nhân gốc rễ không nằm ở kiến thức điện học mà nằm ở kỹ năng giải phương trình vi phân thuần nhất bậc 2 trong môn Toán học.

---

## 4. Cầu nối bài giảng Bục giảng - Về nhà thông qua Vector Journaling Replay

Một trong những tính năng đột phá nhất của hệ sinh thái Socratic Vision Board là khả năng **kết nối liền mạch giữa tiết học trên lớp và quá trình tự học ban đêm tại nhà**.

```
[ TRÊN LỚP (Bục giảng 86") ]                    [ Ở NHÀ (Laptop / Tablet) ]
Giáo viên vẽ phác thảo mô phỏng                 Học sinh mở lại bài học
Hệ thống ghi lại Vector Event Journal ────────> Tải tệp Journal siêu nhẹ (60 KB)
(Tọa độ nét vẽ, thay đổi slider, audio cue)      Học sinh can thiệp vào mô phỏng
```

### 4.1. Tái hiện bài học động lực học tương tác từ tệp nhật ký siêu nhẹ
Khi giáo viên giảng bài trên lớp, hệ thống không ghi lại video màn hình (vốn nặng hàng trăm Megabyte và là tệp chết). Thay vào đó, mô-đun `vectorJournal.ts` ghi lại chuỗi sự kiện vector thời gian thực:
* Thời điểm $t_1$: Nét vẽ phác thảo lò xo được tạo ra tại tọa độ $(x, y)$.
* Thời điểm $t_2$: Giáo viên thay đổi độ cứng $k$ từ $50 \text{ N/m}$ lên $100 \text{ N/m}$.
* Thời điểm $t_3$: Giáo viên bấm chạy mô phỏng và đặt câu hỏi Socratic.

Toàn bộ tiết học 45 phút được nén thành một tệp JSON hoặc nhị phân dung lượng chưa đầy **60 Kilobyte** (nhỏ hơn một bức ảnh chụp điện thoại).

### 4.2. Tương tác can thiệp trực tiếp vào mô phỏng của giáo viên
Khi về nhà, học sinh không chỉ "xem lại" như một đoạn video thụ động, mà có thể:
1. **Bấm tạm dừng bài giảng ở bất kỳ giây nào.**
2. **Cầm chuột hoặc ngón tay chạm trực tiếp vào vật thể mà giáo viên đã vẽ trên lớp.**
3. **Thực hiện các thí nghiệm giả định (What-If Analysis):** *"Nếu chiều nay cô giáo chỉnh góc nghiêng $45^\circ$ thay vì $30^\circ$ thì khối hộp có bị lật không?"*. Học sinh kéo thanh trượt góc lên $45^\circ$ và bấm chạy để kiểm chứng tức thì ngay trên mô hình sống của cô giáo.

---

## 5. Đặc tả 4 Chế độ tương tác của AI Tutor sau giờ học

Phân hệ gia sư AI được thiết kế đa năng với 4 chế độ phục vụ toàn diện nhu cầu tự học của học sinh:

```
┌────────────────────────────────────────────────────────────────────────┐
│             4 CHẾ ĐỘ TƯƠNG TÁC CỦA AI TUTOR SAU GIỜ HỌC               │
├───────────────────────────┬────────────────────────────────────────────┤
│ 1. SOCRATIC HOMEWORK      │ Hướng dẫn làm bài tập về nhà theo giàn giáo│
│    SOLVER                 │ từng bước, tuyệt đối không cho chép đáp án │
├───────────────────────────┼────────────────────────────────────────────┤
│ 2. HOME SANDBOX &         │ Phòng thí nghiệm ảo tự do phác thảo nét vẽ │
│    FREE SKETCH            │ thỏa sức sáng tạo và kiểm chứng giả thuyết │
├───────────────────────────┼────────────────────────────────────────────┤
│ 3. SPACED REPETITION &    │ Luyện thi phân hóa, tự động lặp lại ngắt   │
│    EXAM DRILL             │ quãng vào đúng các điểm mù kiến thức       │
├───────────────────────────┼────────────────────────────────────────────┤
│ 4. PARENTPULSE &          │ Báo cáo minh bạch thời gian nỗ lực tư duy  │
│    TEACHER DASHBOARD      │ cho phụ huynh và giáo viên chủ nhiệm       │
└───────────────────────────┴────────────────────────────────────────────┘
```

### 5.1. Chế độ 1: Giải bài tập về nhà có giàn giáo Socratic
* **Quy trình nhập liệu linh hoạt:** Học sinh có thể gõ đề bài, tải ảnh chụp đề từ sách bài tập, hoặc vẽ tay sơ đồ hiện tượng.
* **Quy trình xử lý:**
  1. AI trích xuất thực thể và xác định dạng bài tập.
  2. Tạo lập cây cú pháp `SimulationBlueprintCore` và dựng mô phỏng tương ứng trên giao diện học sinh.
  3. Kích hoạt giao diện **Locked Stepper**: Học sinh phải hoàn thành từng chặng tư duy (ví dụ: chọn hệ quy chiếu $\to$ phân tích lực $\to$ viết phương trình định luật II $\to$ tính toán số liệu).
  4. Bàn phím toán học ảo `MathNumpad` hỗ trợ nhập ký hiệu khoa học chuẩn xác mà không cần học cú pháp LaTeX phức tạp.

### 5.2. Chế độ 2: Phòng thí nghiệm phác thảo tự do tại nhà
* Cung cấp một mặt bảng kỹ thuật số vô hạn (Infinite Living Canvas) cho phép học sinh thỏa sức vẽ bất kỳ hệ cơ học, mạch điện hay phân tử hóa học nào để hệ thống tự động nhận diện và chạy mô phỏng.
* Tính năng kích thích sáng tạo khoa học: Học sinh có thể chế tạo các hệ thống phức tạp (ví dụ: máy bắn đá Rube Goldberg, con lắc hỗn loạn đôi, chu trình làm việc của động cơ Carnot) để phục vụ các dự án nghiên cứu khoa học STEM của riêng mình.

### 5.3. Chế độ 3: Luyện thi phân hóa và Ôn tập ngắt quãng Spaced Repetition
* Dựa trên thuật toán lặp lại ngắt quãng (biến thể từ thuật toán SM-2 của SuperMemo và hộp Leitner), hệ thống phân tích đường cong quên lãng của từng học sinh:
  - Nếu một học sinh hiểu bài vào tối thứ Hai, hệ thống sẽ tự động nhắc lại khái niệm đó vào tối thứ Năm dưới một bài toán có bối cảnh hoàn toàn mới lạ.
* Hỗ trợ 2 phân hệ phân hóa rõ rệt:
  - **Phân hệ THPT Chuẩn:** Bám sát ma trận đề thi tốt nghiệp THPT của Bộ GD&ĐT, rèn luyện kỹ năng giải quyết bài toán thực tế và chống sai sót cơ bản.
  - **Phân hệ Chuyên & HSG Quốc gia:** Tích hợp các kịch bản động học phi tuyến, cơ học tương đối tính, hóa lý lượng tử và sinh học phân tử nâng cao.

### 5.4. Chế độ 4: Cầu nối phản hồi ParentPulse và Teacher Dashboard
* **Bảng điều khiển ParentPulse dành cho cha mẹ:**
  Thay vì chỉ báo cáo con được mấy điểm, hệ thống gửi thông báo định tính giàu tính động viên qua ứng dụng di động: *"Hôm nay bạn Nam đã kiên trì suy nghĩ suốt 35 phút để tự giải bài toán khúc xạ ánh sáng mà không cần xem đáp án mẫu. Khả năng phân tích lực của Nam đã tăng từ 45% lên 78%"*.
* **Bảng đồng bộ Teacher Dashboard dành cho thầy cô:**
  Sáng hôm sau khi bước vào lớp, giáo viên mở màn hình tương tác bục giảng sẽ thấy ngay bản đồ nhiệt của cả lớp: *"Có 18/42 học sinh tối qua bị kẹt ở bước tính công của lực ma sát"*. Giáo viên lập tức dành 5 phút đầu giờ để giải thích đúng vào điểm nghẽn chung đó, biến giờ học thành một buổi thảo luận trúng đích và hiệu quả.

---

## 6. Kiến trúc Kỹ thuật phần mềm và Tối ưu hóa Offline-First

### 6.1. Ngăn xếp công nghệ phía máy khách
Phân hệ AI Tutor tại `apps/student-app` được xây dựng bằng công nghệ Web hiện đại nhất:
* **Next.js 14 App Router & React 18:** Tối ưu hóa tốc độ tải trang và khả năng tương thích đa nền tảng (chạy mượt mà trên trình duyệt của máy tính bàn, laptop Windows, Chromebook, máy tính bảng iPad và điện thoại Android).
* **Kiến trúc Offline-First với IndexedDB:**
  Khi học sinh ở các vùng nông thôn hoặc nơi có đường truyền Internet chập chờn, hệ thống tự động lưu trữ bộ nhớ đệm (Cache) của các bài tập, mô phỏng và thuật toán BKT xuống cơ sở dữ liệu `IndexedDB` trên trình duyệt. Học sinh vẫn có thể tiếp tục làm bài tập và tương tác với các công cụ Visual Debuggers ngoại tuyến $100\%$. Khi có mạng trở lại, dữ liệu sẽ tự động đồng bộ ngầm lên máy chủ.
* **Bộ thư viện trực quan hóa chuyên sâu:**
  - `Canvas 2D` và `SVG`: Dựng hình động lực học 60 FPS.
  - `KaTeX`: Hiển thị công thức toán học sắc nét chuẩn tạp chí khoa học.
  - `Web Audio API`: Sinh âm thanh phản hồi xúc giác và âm thanh thành tựu Arpeggio mà không cần tải tệp âm thanh tĩnh.

### 6.2. Luồng dữ liệu xử lý bất đồng bộ phía máy chủ AI Engine Hub
Tại dịch vụ máy chủ `services/ai-engine`, các yêu cầu tự học của học sinh được định tuyến qua kiến trúc vi dịch vụ bất đồng bộ trên nền tảng **FastAPI Python 3.12**:
* Endpoint `/api/v1/companion/evaluate-step`: Tiếp nhận công thức và trạng thái thao tác của học sinh, chuyển giao cho SymPy CAS để kiểm tra tính đúng đắn đại số trong thời gian dưới 15 mili-giây.
* Endpoint `/api/v1/tutor/diagnostic-probe`: Phân tích lỗi sai của học sinh dựa trên cây lỗi nhận thức (Misconception Tree) và trả về cấu hình công cụ `VisualDebuggerConfig` phù hợp nhất.
* Cơ chế lưu trữ đệm ngữ nghĩa **Semantic Cache**: Các câu hỏi gợi ý phổ biến được nhúng thành vector và lưu trong bộ nhớ đệm Redis, giúp phản hồi các câu hỏi tương tự với độ trễ dưới 50 mili-giây và chi phí API bằng $0.00.

---

## 7. Kế hoạch Thực nghiệm và Bộ chỉ số Đánh giá hiệu quả

Để chứng minh tính hiệu quả khoa học của phân hệ AI Tutor sau giờ học khi tham dự các kỳ thi ViSEF và ISEF, nhóm nghiên cứu đề xuất bộ chỉ số đo lường thực nghiệm:

| Chỉ số đo lường | Định nghĩa khoa học | Phương pháp đo lường | Mục tiêu kỳ vọng |
| :--- | :--- | :--- | :---: |
| **Productive Struggle Time (PST)** | Thời gian học sinh tích cực suy nghĩ và thử nghiệm giải pháp trước khi tìm ra hướng đi đúng. | Ghi nhận log thời gian tương tác với mô phỏng và công cụ Visual Debugger giữa các lần nhập đáp án. | Đạt từ 4 đến 8 phút mỗi bài toán khó (không bỏ cuộc giữa chừng). |
| **Scaffolding Efficiency Ratio (SER)** | Tỷ lệ số lượt gợi ý của AI cần thiết để học sinh đạt được khoảnh khắc Eureka. | $\text{SER} = \frac{\text{Số câu hỏi gợi ý trung bình}}{\text{Độ phức tạp bài toán}}$ | Giảm dần từ 3,8 lượt xuống dưới 1,6 lượt sau 4 tuần sử dụng. |
| **Direct Copying Reduction** | Tỷ lệ suy giảm hành vi sao chép đáp số từ các trang web giải bài tập có sẵn. | Khảo sát ẩn danh kết hợp phỏng vấn sâu học sinh và đối chiếu độ tương đồng bài nộp. | Giảm trên 85% hành vi chép giải thụ động. |
| **Knowledge Retention Rate (KRR)** | Tỷ lệ nhớ lại và vận dụng thành công kiến thức sau khoảng thời gian ngắt quãng 14 ngày. | Kiểm tra bài kiểm tra đột xuất (Surprise Delayed Post-test) không báo trước. | Nhóm sử dụng AI Tutor đạt điểm số cao hơn nhóm đối chứng tối thiểu 35%. |

---

## 8. Câu hỏi nghiên cứu mở rộng dành cho học sinh

Để chuẩn bị chu đáo nhất cho các câu hỏi đào sâu từ Ban Giám khảo, các em học sinh trong nhóm hãy tự nghiên cứu và thảo luận 4 câu hỏi dưới đây:

1. **Câu hỏi 1 (Về tâm lý học nhận thức):** Trong bối cảnh học tập tại nhà khi không có thầy cô giám sát, điều gì ngăn cản học sinh mở một tab trình duyệt khác để tra cứu đáp án trên ChatGPT thay vì kiên nhẫn tương tác với AI Tutor Socratic? Hệ thống cần thiết kế các cơ chế tưởng thưởng nội tại (Gamification, Eureka Moment) và sự thỏa mãn trí tuệ như thế nào để biến "nỗ lực tư duy" thành một trải nghiệm thú vị?
2. **Câu hỏi 2 (Về thuật toán BKT):** Trong mô hình Bayesian Knowledge Tracing, nếu tham số đoán mò $P(G)$ bị ước lượng quá cao hoặc tham số sơ suất $P(S)$ bị ước lượng quá thấp thì hệ quả nhận định năng lực học sinh của hệ thống sẽ bị sai lệch như thế nào? Làm sao để tự động hiệu chỉnh (calibrate) 4 tham số này cho từng học sinh cụ thể?
3. **Câu hỏi 3 (Về kỹ thuật nén dữ liệu):** Tại sao giao thức Vector Event Journaling chỉ tốn 60 KB dữ liệu cho một tiết học 45 phút, trong khi một video quay lại bài giảng lại tốn đến vài trăm Megabyte? Phân tích sự khác biệt về mặt bản chất giữa "lưu trữ chuỗi lệnh biến đổi hình học vector" và "lưu trữ lưới điểm ảnh ma trận pixel".
4. **Câu hỏi 4 (Về an toàn AI):** Giả sử một học sinh cố tình nhập một bài toán có nội dung độc hại hoặc tìm cách "thao túng" (jailbreak) AI Tutor để bắt nó viết văn, làm thơ hoặc giải các bài tập không thuộc phạm vi STEM, hệ thống phòng thủ Socratic Guardrails sẽ phản ứng như thế nào để giữ vững phạm vi hoạt động của sản phẩm?
