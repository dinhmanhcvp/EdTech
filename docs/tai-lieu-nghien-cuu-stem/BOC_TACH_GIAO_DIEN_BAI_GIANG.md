# Bóc tách thẩm mỹ các hình trực quan của `nclamvn/bai-giang` ("Sáng Ăn Khoai")

Nguồn: https://github.com/nclamvn/bai-giang (xem trực tiếp trang chính, "Máy ảnh cắt lớp", "Neuron và xung thần kinh", Thư viện 54 bài và bài "Chuẩn độ acid mạnh – base mạnh"). Bản clone 263 MB (phần lớn là mô hình GLB) không đưa vào dự án.
**Phạm vi học: thẩm mỹ của CHÍNH các hình trực quan** (cảnh, màu, ánh sáng, nhãn chú thích, nhịp một bước bài), không phải giao diện của cả hệ thống.

## 1. Ngôn ngữ thẩm mỹ của hình

| Nét | Cách họ làm | Áp dụng cho template của ta |
|---|---|---|
| **Sân khấu** | Mỗi nhóm bài một sân khấu thống nhất: *studio sáng* (xám kem, vầng sáng giữa, lưới sàn mờ dần ra rìa, vật matte có bóng tiếp xúc mềm), *kính pastel* (xanh nhạt → tím nhạt, vật đặt trên bệ kính trong suốt), *điện ảnh tối* cho thế giới vi mô và vũ trụ (chàm sâu, màng thủy tinh phát sáng, lõi sáng, sao) | `SceneData.stage: 'studio' \| 'glass' \| 'night'`; `StageBackdrop` trong `engines/families/SceneLab.tsx` (mặc định studio nên cả 61 cảnh SCENE_LAB đổi nền) |
| **Nét có quầng sáng** | Tia sáng, xung, lực là nét mảnh màu cam đỏ có quầng mờ như phát sáng nhẹ | `renderShape`: nét màu dày ≥ 2,2 tự có quầng; trên nền tối quầng đậm hơn |
| **Khối có điểm sáng** | Quả cầu, hạt có vệt sáng nhỏ nên có khối thay vì chấm phẳng | `renderShape`: hình tròn đặc 7–40 px có điểm sáng |
| **Bảng màu trầm** | Màu môn đã trầm bớt (Lí #2459C9, Hóa #0E7C66, Sinh #C2184A, Toán #6B4BC8, Địa #2E7D32, Sử #B26A1A, tia/lực #D9481C), mực ấm thay đen xám; nhiều màu cạnh nhau vẫn dịu | `utils/presets/sceneKit.ts` `C` (đổi một nơi, đổi toàn bộ cảnh) |
| **Chú thích viên thuốc** | Nhãn nền giấy có chấm màu + chữ, nối tới chi tiết bằng đường đứt nét có vòng nhỏ ở đầu; nhãn ít, ngắn | `callout()` trong `sceneKit.ts` |
| **Vòng phóng to** | "Phóng to minh họa": vòng kính chứa chi tiết vi mô/đại lượng quan trọng, có viền kính, vệt sáng và nhãn | `lensFrame()` (dùng ở Trái Đất nghiêng: tia nắng lúc trưa và góc cao Mặt Trời) |
| **Bệ kính** | Mọi vật trong thư viện đặt trên một tấm kính trong suốt có cạnh xanh nhạt: một chi tiết thống nhất cả 54 ảnh bìa | `glassPlinth()` (con lắc Newton) |
| **Chữ trong hình** | Ít chữ, tối thiểu 11–13 px, có viền nền để đọc được trên đường kẻ; con số dùng phông đơn cách | `renderShape` chữ có viền theo nền; cỡ tối thiểu 11 |
| **Một thứ nổi bật** | Cảnh có màu, thứ xung quanh trung tính; mỗi khung chỉ một chi tiết nhấn | giữ trong cách dựng 3 template 3D mới |

## 2. Nhịp một bước bài (rất hợp phương pháp POE/Socratic của ta)

Mỗi bước: **câu hỏi mở** → **"Tự tay thử"** (việc làm với mô hình: xoay, kéo, bật) → **"Em sẽ thấy"** (điều cần quan sát) → nút **"Xem kết luận"** (kết luận ẩn đến khi học sinh bấm).
Áp dụng: `SceneData.tryIt`, `SceneData.see` hiện thành hai dòng "Tự tay thử · …" và "Em sẽ thấy · …"; `note` trở thành **"Xem kết luận"** (ẩn mặc định cho mọi cảnh SCENE_LAB). Đã điền cho 3 template mới; các cảnh cũ chỉ có kết luận ẩn, cần bổ sung dần `tryIt`/`see`.

## 3. Đã làm trong dự án

- Khung vẽ chung `SceneLab`/`renderShape`/`StageBackdrop`, bảng màu `C`, `callout`/`lensFrame`/`glassPlinth`/`groundShadow`.
- Ba template 3D mới học từ studio "Vẻ đẹp Vật lí" của board hntech và áp thẩm mỹ này: `PHYS_EM_WAVE_3D` (nền tối, E/B phát sáng, chú thích viên thuốc), `PHYS_EARTH_SEASONS` (nền vũ trụ, Mặt Trời có vầng sáng, vòng phóng to tia nắng), `PHYS_NEWTON_CRADLE` (nền kính pastel, bệ kính, quả đang chuyển động tô cam).
- Bộ chiếu 3D nhẹ `utils/presets/scene3d.ts` (xoay bằng thanh trượt, "Tự chạy" để tự xoay), không cần WebGL.

## 4. Chưa làm / giới hạn

- Họ engine khác (CURVE_LAB, PROCESS_STEPS, ANATOMY_FLOW, CHEM_BENCH, các engine canvas riêng) chưa có sân khấu và quầng sáng; mới `SceneLab` (61 cảnh) và `PhysBench` (dùng chung `renderShape`) được hưởng.
- Chưa có ảnh bìa 3D dạng kính cho từng template (họ dùng mô hình GLB dựng sẵn; ta chỉ dùng SVG).
- Vẫn là SVG 2D chiếu 3D, không có vật liệu thật, ánh sáng động hay bóng đổ thật như three.js của họ.
- Phần giao diện bao quanh (thanh nút, khung điều khiển) KHÔNG nằm trong phạm vi bài học này; phần đổi màu giao diện đã lỡ làm trong phiên đã được hoàn nguyên.
