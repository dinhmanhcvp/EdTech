---
name: ai-video-director
description: Viết prompt phân cảnh (storyboard) điện ảnh cho model video AI (Seedance, Kling, Veo, Sora...) và quy trình sản xuất + dựng video AI từ đầu đến cuối - khóa phong cách, ảnh tham chiếu nhân vật/cảnh, kịch bản, shot list, prompt từng clip, dựng hậu kỳ. Dùng khi người dùng muốn tạo video bằng AI, viết prompt video, lên storyboard/shot list, hoặc dựng/edit clip AI ghép thành phim.
---

# AI Video Director

Đúc kết từ video hướng dẫn `skill_video.mov` (tác giả @hancontam, ~55 phút, dùng Seedance 2.5 + dựng bằng 剪映/CapCut). Ý cốt lõi: **model video làm đúng nghĩa đen những gì bạn viết** - muốn ra chất lượng đạo diễn thì phải viết như đạo diễn, không viết như người xem.

> Nguồn gốc: trích từ hình ảnh, phụ đề tiếng Việt và các prompt hiện trên màn hình video. Lời nói gốc là tiếng Trung, bản phiên âm tự động kém nên các chi tiết chỉ nghe được (không hiện trên màn hình) có thể thiếu. Xem `references/video-notes.md`.

## 1. Khái niệm nền (dạy người mới)

| Thuật ngữ | Nghĩa | Ví dụ khi viết prompt |
|---|---|---|
| Phân cảnh / Shot (分镜) | Một cú máy liền mạch; đạo diễn quyết định đặt máy ở đâu, diễn viên làm gì | "Shot 2 (7-14s)" |
| Vận kính / Camera move (运镜) | Chuyển động máy: đẩy (push-in), kéo (pull-out), lắc (pan/tilt), dịch (truck) | "slow dolly push-in", "handheld sway" |
| Vị trí máy / Camera position (机位) | Máy đặt ở đâu, cao bao nhiêu, góc nào | "ultra-low ground-level", "over-the-shoulder", "high-angle looking down" |
| Cỡ cảnh / Shot scale (景别) | Cắt người ở đâu | Đại cận (ECU) > Cận (CU) > Cận-trung > Trung > Toàn > Viễn |

Quy tắc chọn cỡ cảnh: **viễn cảnh** = cho thấy cả thế giới; **toàn cảnh** = thấy cả người và không gian; **trung cảnh** = từ đầu gối trở lên, xem họ đang làm gì; **cận cảnh/đặc tả** = khi cảm xúc ở trên mặt hoặc một chi tiết (ngón tay trên phím Delete, tay mở lon nước).

Hiểu biết quan trọng: AI chỉ ra đúng cái bạn mô tả. Nếu chỉ nói "người đàn ông buồn" thì ra cảnh rập khuôn; nếu không viết thì model quay về "vùng an toàn" (cảnh hoành tráng chung chung).

## 2. Công thức 7 yếu tố cho MỖI shot

Mỗi shot phải trả lời đủ 7 câu (kèm mô tả âm thanh tương ứng cho lớp nào có tiếng):

1. **Tiền cảnh** là gì, có bị out-focus (mờ) không? + âm thanh của nó
2. **Tiền cảnh nằm ở phía nào** khung hình? (trên / trái / phải / dưới / trái-trên / phải-trên / trái-dưới / phải-dưới) - thiếu thông tin này hình sẽ cứng
3. **Hậu cảnh** là gì, có out-focus không? + âm thanh ("hậu cảnh" = phố, quán, đường, không phải "không có gì")
4. **Chủ thể** mà ống kính quay là gì (nhân vật nào)
5. **Vị trí máy** (cao/thấp, trước/sau/bên, khoảng cách)
6. **Cỡ cảnh** (từ danh sách ở mục 1)
7. **Hành động chi tiết của nhân vật** + biểu cảm + âm thanh đi kèm

Mẫu 1 shot (rút gọn):

```
Shot 3 (đặc tả · vai trái chủ thể · cầm tay rung nhẹ)
[0-4s] Tiền cảnh: vai trái nhân vật, mờ, nằm phải-khung. Chủ thể: bàn tay phải cầm lon
nước. Máy từ trên cao hơi cúi xuống, nối tiếp shot 2. Hành động: ngón cái bật nắp lon,
"xịt" - bọt khí trào ra tay, nhân vật giật nhẹ người ra sau. Âm thanh: tiếng bật nắp, bọt xì.
Hậu cảnh: phố mưa mờ, tiếng xe xa.
[Trạng thái cuối] Bọt còn bám trên mu bàn tay, vỏ lon ướt sáng.
```

## 3. Nguyên tắc viết (rút từ video)

- **Dùng sự thật vật lý, không dùng tính từ cảm xúc.** Không viết "cô buồn"; viết "mắt đỏ lên, nước mắt đọng, môi run, hít một hơi ngắn, đầu nghiêng nhẹ trái". Ví dụ trong video: "ngón tay dừng trên phím xóa hai giây". Cần **rất nhiều** chi tiết thân thể.
- **Dùng số và mốc thời gian**, không dùng từ mơ hồ: `[0-3s]`, `[3-5s]`, "nghiêng 15 độ", "đứng cách 3m", "dừng 2 giây". Gom hành động theo từng đoạn giây.
- **Hành động đồng thời, không nối tiếp.** "Vừa khóc vừa nói thoại" (cùng một khoảng thời gian) thay vì khóc xong mới nói - cho cảm giác sống, nhiều lớp.
- **Viết âm thanh ngay trong prompt** (foley, tiếng bước, tiếng nền, thoại để trong ngoặc kép kèm giọng/nhịp). Âm thanh không chỉ là việc hậu kỳ; để AI sinh đồng bộ thì không phải đi tìm SFX về ghép.
- **Chỉ ghi khẳng định (positive) cho nội dung chính.** Mô tả cái CẦN có. Negative prompt dài lê thê chỉ làm model rối; giữ ngắn, tách riêng khối `[NEGATIVE]`.
- **Chủ động quản lý "tính kiểm soát".** Chỗ nào không viết rõ thì model tự quyết và khó kiểm soát; nếu kết quả lệch, **thêm đúng một câu thoại/hành động tại shot đó** rồi sinh lại, đừng viết lại cả prompt.
- **Mỗi clip độc lập: model không nhớ clip trước.** Mỗi prompt phải lặp lại khối khóa phong cách + neo ảnh tham chiếu + khai báo không gian, và nối mạch bằng "tiếp nối trạng thái cuối của clip trước".
- Prompt chuyên nghiệp có thể rất dài (từ vài trăm tới ~1.000 chữ cho một đoạn ngắn, tới hàng nghìn chữ cho clip 25-30s nhiều shot). Dài nhưng có cấu trúc, không dài vì lặp.
- Dùng AI trợ lý (agent/LLM có skill này) để **mở rộng** câu mô tả ngắn của bạn thành prompt đủ 7 yếu tố; con người chỉ viết ý đạo diễn (ví dụ "máy ở cửa tiệm quay thấp sát đất, nữ chính đẩy cửa bước ra"). Dùng AI tự viết phân cảnh không có skill "thường ra rất tệ".

## 4. Cấu trúc prompt dài cho một CLIP (nhiều shot)

```
[STYLE LOCK]
Khóa phong cách 1 câu: bối cảnh + không khí + thị giác then chốt.
Tông màu: màu chủ đạo, màu nhấn, nguồn sáng duy nhất thuộc về nhân vật nếu có.
Chất liệu: film stock mô phỏng (vd Kodak Vision3 250D), hạt mịn, halation.
Khóa điện ảnh: Live action film, not animation/CGI/game engine. Physical camera,
  anamorphic lens, 180-degree shutter, 24fps cinematic motion blur.
Khóa ánh sáng vật lý: Practical light only - mọi nguồn sáng đều từ vật thể thấy được.
Vật lý chuyển động: quán tính, vải theo khối lượng + sức cản không khí.
Quy tắc vật lý cảnh: mưa, nước đọng, hơi nước, phản chiếu...
Khai báo nhân sự: nhân vật chính 1 người (mô tả), nền 3-5 người đi lại, không thêm người.

[THAM CHIẾU ẢNH - ANCHOR]
@Image1 chỉ cung cấp: cấu trúc không gian, chất liệu, ánh sáng của cảnh
  - góc máy do văn bản shot quyết định (camera angle defined by the shot text only).
@Image2 chỉ cung cấp: khuôn mặt, kiểu tóc, kính, nốt ruồi đặc trưng
  - trang phục do văn bản định nghĩa, KHÔNG lấy từ ảnh.
@Image3 (đạo cụ): chỉ dùng hình dạng/chất liệu vật.

[KHAI BÁO KHÔNG GIAN & VỊ TRÍ ĐỨNG]
Ngày/đêm, địa điểm. Nguồn sáng ở đâu (trái/phải/trên). Đồ vật ở đâu. Ai đứng đâu,
quay mặt hướng nào. (Nếu nối tiếp: "tiếp nối trạng thái cuối của clip trước: ...")

CLIP - <tên> (<tổng thời lượng> · <n shot>)
Shot 1 (<cỡ cảnh> · <góc/vị trí máy> · <chuyển động> · <ổn định>)
[0-3s] Khung đầu: ... lớp tiền cảnh / trung cảnh / hậu cảnh / lớp không khí ...
[3-5s] ... thoại: "..." (giọng, nhịp) ...
Trạng thái cuối: ...
(HARD CUT)
Shot 2 ...

[NEGATIVE]
chữ/phụ đề/watermark trong khung, giao diện điện thoại bịa; tay biến dạng, thừa ngón;
đen trắng/sepia/giả film cũ; slow-motion/speed ramp; pháo hoa, xe lạ xuất hiện ngẫu nhiên...
```

Mẹo: ảnh tham chiếu **chỉ neo cái nó giỏi** (mặt, cấu trúc cảnh), phần còn lại (trang phục, góc máy) do văn bản định nghĩa, tránh xung đột giữa ảnh và chữ.

## 5. Quy trình sản xuất end-to-end

1. **Chọn phong cách mỹ thuật.** Nhờ agent đề xuất bộ từ khóa phong cách (vd Gothic + Cyberpunk neon, màu tím/xanh lạnh, mưa đêm), rồi sinh **ảnh tham chiếu cảnh** (16:9, chất lượng cao, ban đêm sau mưa, không có người, tập trung kiến trúc/mặt đường).
2. **Thiết kế nhân vật** khớp phong cách (tuổi, trang điểm, tóc, trang phục, chất giọng); sinh **ảnh nhân vật 4 ô** (2x2: mặt chính diện, mặt nghiêng, toàn thân trước, toàn thân sau; nền xám studio, ánh sáng cứng đơn, giữ nguyên danh tính, không chỉnh sửa/làm đẹp). Đạo cụ quan trọng làm ảnh 3 góc nhìn (vd lon nước phát sáng).
3. **Viết kịch bản** ngắn (một cảnh đơn giản cũng được: nhân vật ra khỏi cửa hàng, mở lon, uống một ngụm...).
4. **Phân cảnh bằng lời thường rồi để AI mở rộng:** bạn viết mỗi shot 1-2 câu theo ý đạo diễn (có thể nhờ AI "thiết kế 3 hành vi người đi đường khác nhau"), skill mở rộng thành bảng: vị trí máy, cỡ cảnh, 3 lớp hình, diễn xuất, âm thanh, thời lượng.
5. **Sinh video** (vd Seedance 2.5: 21:9, 720p, tối đa 30s): đính kèm ảnh cảnh = Image1, nhân vật = Image2, đạo cụ = Image3, dán prompt đã có STYLE LOCK, bấm tạo.
6. **Kiểm tra & sửa cục bộ:** phần nào sai/khó kiểm soát thì viết rõ hơn đúng chỗ đó (thêm hành động/câu thoại), sinh lại; clip tốt thì giữ.
7. **Dựng hậu kỳ** (xem mục 6).

Tóm tắt tác giả: (1) chốt phong cách mỹ thuật → (2) sinh tham chiếu → (3) viết phân cảnh → (4) sinh video → (5) dựng.

## 6. Dựng (edit) clip AI - trong 剪映 / CapCut Pro

- Đặt dự án **24 fps** (khớp 24fps của model, giữ cảm giác điện ảnh); tỉ lệ theo clip (21:9/16:9).
- Kéo clip vào timeline, **cắt ngắn** phần thừa (thường nửa sau clip lệch/hỏng hoặc đã đủ ý, không cần dùng hết 25-30s).
- **Tách âm thanh (Audio separation / 声音分离)** khi cần: chuột phải clip → tách âm, để chỉnh âm lượng/nhạc riêng.
- Ghép nhiều clip (mỗi clip 1-3 shot) bằng hard cut; thứ tự theo kịch bản, kiểm tra khớp trạng thái cuối → đầu của clip kế.
- Giữ nguyên âm thanh AI sinh (thoại, foley, ambience) làm nền; chỉ thêm nhạc nếu cần. Không phải đi tìm SFX về ghép.
- Xuất theo chuẩn nền tảng đăng.

Công cụ dùng trong video: model video Seedance 2.5, sinh ảnh (G2/Seedream), canvas trên nền Seko/Jimeng, agent riêng chạy skill, dựng bằng 剪映 (Jianying)/CapCut. Dùng tương đương theo công cụ có sẵn.

## 7. Checklist trước khi sinh clip

- [ ] STYLE LOCK đủ 7 khóa (phong cách, màu, chất liệu, điện ảnh, ánh sáng, vật lý, nhân sự)
- [ ] Mỗi @Image có câu "chỉ cung cấp ..." và phần bị cấm lấy
- [ ] Khai báo không gian và vị trí đứng
- [ ] Mỗi shot đủ 7 yếu tố + mốc giây + âm thanh + trạng thái cuối
- [ ] Cảm xúc chuyển thành sự thật vật lý
- [ ] Hành động nào đồng thời đã ghi đồng thời
- [ ] Lặp lại khóa trong từng clip (model không nhớ)
- [ ] NEGATIVE ngắn, tách riêng

## 8. Khi áp dụng cho người dùng

Hỏi nhanh: model video nào, độ dài, tỉ lệ, có ảnh tham chiếu chưa. Nếu người dùng chỉ đưa ý ngắn, **tự mở rộng** theo mục 2-4 rồi trình bày prompt hoàn chỉnh dùng ngay (giữ prompt bằng tiếng Anh cho model nếu model hợp tiếng Anh; thoại để đúng ngôn ngữ nhân vật). Với dự án giáo dục (EdTech), cùng quy trình có thể áp dụng cho video giảng bài/minh họa: khóa phong cách, nhân vật giáo viên nhất quán, từng shot một ý.
