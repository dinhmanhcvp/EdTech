# CHUYÊN ĐỀ 02: KIẾN TRÚC PHẦN MỀM VÀ CÔNG NGHỆ WEB HIỆN ĐẠI
## Tài liệu nghiên cứu chuyên sâu dành cho học sinh dự thi ViSEF / ISEF

---

### 1. Sơ đồ phân tầng kiến trúc tổng thể

Hệ thống Socratic Vision Board được xây dựng theo mô hình kiến trúc phân tầng chuyên nghiệp (Multi-tier Enterprise Architecture), tách biệt rành mạch giữa giao diện người dùng, máy chủ dịch vụ AI và động cơ tính toán:

```
[ FRONTEND CLIENTS (Next.js 14 / TypeScript) ]
  ├── Teacher Board (Bục giảng 75"-86" 4K)
  │     ├── Living Hologram Canvas (Canvas 2D Sub-pixel)
  │     ├── Floating Screen Overlay (Trong suốt đè lên slide)
  │     └── Web Audio API Engine (Âm thanh phản hồi thủ tục)
  └── Student Companion (BYOD Mobile / Tablet / Laptop)
        ├── Locked Stepper Workflow
        └── 4 Visual Debuggers (Force, Energy, Phase, FBD)
                    │
            WebSocket / CRDTs (Độ trễ < 45ms, Vector Journal 1.2 KB/phút)
                    │
[ BACKEND SERVICES (FastAPI Python 3.12) ]
  ├── AI Engine Hub (Định tuyến & Phân tích thị giác)
  ├── SymPy CAS Engine (Đại số biểu tượng & Tính toán chính xác)
  └── Semantic Cache (Lưu trữ vector nhúng, phản hồi < 50ms)
                    │
[ CLOUD FOUNDATION MODELS ]
  └── Gemini Flash Vision (Trích xuất cấu trúc thực nghiệm từ ảnh phác thảo)
```

---

### 2. Kỹ thuật đồ họa kết hợp Canvas 2D và SVG Overlay

Một câu hỏi rất phổ biến từ Ban Giám khảo ngành CNTT là: *"Tại sao các em không dùng Three.js hay WebGL cho toàn bộ đồ họa mà lại kết hợp Canvas 2D và SVG?"*

Các em hãy tự tin trả lời dựa trên các cơ sở kỹ thuật sau:
1. **Đặc thù phần cứng trường học:** Màn hình tương tác thông minh tại các trường THPT thường chạy trên các bo mạch Android OPS hoặc máy tính gắn khe có cấu hình CPU/GPU tầm trung. Nếu chạy WebGL 3D nặng nề, tốc độ khung hình sẽ bị sụt giảm xuống dưới 30 FPS, gây giật lag và nóng thiết bị.
2. **Kỹ thuật phân chia nhiệm vụ tối ưu:**
   * **Canvas 2D (Chế độ Immediate Mode):** Dùng để vẽ các vật thể vật lý chuyển động liên tục ở tần số 60 FPS (quả lắc đu đưa, dòng electron chạy, hạt khí chuyển động Brown). Canvas 2D xử lý trực tiếp mảng pixel trong bộ nhớ đệm, đạt hiệu năng cực cao.
   * **SVG (Chế độ Retained Mode):** Dùng để hiển thị các thành phần dạng văn bản, công thức toán học KaTeX, trục tọa độ và menu điều khiển. SVG lưu trữ đối tượng dạng cây DOM vector, giúp chữ và biểu tượng phóng to thu nhỏ ở bất kỳ tỷ lệ nào cũng không bao giờ bị vỡ hạt (Infinite Vector Sharpness).
3. **Kỹ thuật Sub-pixel Alpha Compositing:**
   Thay vì dùng một khung hình chữ nhật màu trắng che khuất mặt bảng, hệ thống sử dụng thuật toán hòa trộn kênh Alpha (Alpha Blending) với thuộc tính `globalCompositeOperation = 'screen'` hoặc `'source-over'`. Nhờ đó, nét phấn vẽ tay của giáo viên như "sống dậy" và chuyển động trực tiếp trên nền bảng đen phấn trắng mà không hề có đường viền hộp bao quanh.

---

### 3. Động cơ âm thanh phản hồi xúc giác bằng Web Audio API

Thay vì phát các tệp âm thanh thu âm sẵn (file .mp3 hay .wav) vốn gây tốn băng thông và có độ trễ tải về, hệ thống sử dụng **Web Audio API** tích hợp sẵn trong trình duyệt để tổng hợp sóng âm theo thời gian thực (Procedural Audio Synthesis):
* **Âm thanh gài chốt (Haptic Snap):** Khi người dùng kéo vật thể vào đúng vị trí neo vật lý, một bộ dao động sóng tam giác (`OscillatorNode`) tần số 150 Hz được kích hoạt với thời lượng ngắn 40 mili-giây, kết hợp bộ lọc thông thấp (`BiquadFilterNode`) tạo cảm giác rung cơ học chân thực.
* **Tiếng sôi phản ứng hóa học (Pink Noise Bubbles):** Sử dụng thuật toán sinh nhiễu hồng (Pink Noise) điều biến biên độ ngẫu nhiên để mô phỏng tiếng sủi bọt khí trong ống nghiệm.
* **Hợp âm hoàn thành (Arpeggio Completion Chime):** Khi học sinh giải xong một bước trong kịch bản Socratic, hệ thống phát một chuỗi 4 nốt nhạc thăng hoa (tần số tương ứng các nốt C5 - E5 - G5 - C6) trong thời gian 350 mili-giây, mang lại cảm xúc phấn khích và tưởng thưởng tinh thần.

---

### 4. Giao thức nén nhật ký Vector Journaling trong đồng bộ phòng học

Khi trong phòng học có 45 học sinh cùng kết nối thiết bị cá nhân (BYOD) với bảng của giáo viên, nếu truyền luồng video màn hình qua mạng Wi-Fi trường học:
$$\text{Băng thông video} = 45 \times 2{,}5 \text{ Mbps} \approx 112{,}5 \text{ Mbps} \implies \text{Gây nghẽn mạng sập Wi-Fi lập tức!}$$

**Giải pháp đột phá của đề tài - Giao thức Vector Event Journaling:**
* Thay vì truyền ảnh hay video, hệ thống chỉ truyền các gói tin sự kiện vector cực nhỏ dạng nhị phân hoặc JSON qua kết nối WebSocket:
  - Sự kiện kéo thả tọa độ: `{ type: 'DRAG', id: 'mass_1', x: 240.5, y: 180.2 }` (chỉ 48 bytes).
  - Sự kiện thay đổi thông số: `{ type: 'PARAM', key: 'friction', val: 0.15 }` (chỉ 32 bytes).
* Mỗi thiết bị của học sinh nhận gói tin sự kiện này và tự chạy thuật toán render trên máy của mình.
* **Kết quả đo đạc thực tế:** Dung lượng gói tin đồng bộ chỉ tốn khoảng **1,2 KB mỗi phút**, tức là cả tiết học 45 phút chỉ tốn chưa đầy 60 KB dữ liệu. Độ trễ truyền nhận đạt dưới 45 mili-giây, hoạt động mượt mà ngay cả trên mạng Wi-Fi yếu của trường học.

---

### 5. Câu hỏi nghiên cứu tự rèn luyện dành cho học sinh

1. **Câu hỏi 1 (Về đồ họa Web):** Phân biệt bản chất giữa đồ họa Immediate Mode (như Canvas 2D) và Retained Mode (như SVG và DOM). Tại sao trong ứng dụng Socratic Vision Board, việc tách riêng hai lớp này lại giúp đạt chuẩn 60 FPS trên màn hình 4K?
2. **Câu hỏi 2 (Về tối ưu hóa mạng):** Phân tích sự khác biệt về mặt kiến trúc giữa việc *"truyền phát luồng điểm ảnh (Pixel Streaming)"* và *"truyền phát trạng thái vector (State Vector Synchronization)"*. Tại sao phương pháp State Synchronization lại là chìa khóa duy nhất khả thi cho mô hình lớp học đông học sinh tại Việt Nam?
3. **Câu hỏi 3 (Về kiến trúc Backend):** FastAPI hoạt động dựa trên cơ chế bất đồng bộ Asynchronous (async/await) và chuẩn ASGI như thế nào? Tại sao nó lại có tốc độ xử lý I/O vượt trội hơn hẳn các framework đồng bộ truyền thống như Flask hay Django khi nhận hàng trăm yêu cầu từ học sinh cùng lúc?
4. **Câu hỏi 4 (Về công nghệ âm thanh):** Giải thích cách hoạt động của đồ thị âm thanh (Audio Graph) trong Web Audio API. Làm thế nào để điều khiển tần số của `OscillatorNode` và hệ số khuếch đại của `GainNode` để tạo ra một âm thanh tắt dần theo hàm mũ mà không tốn một byte dung lượng tải file âm thanh?
