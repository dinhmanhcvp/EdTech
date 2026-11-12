---
name: product-intro-video
description: Quy trình tổng thể làm video giới thiệu sản phẩm (product intro / launch / explainer / demo reel) bằng code - chọn stack (Remotion, HyperFrames, Motion Canvas, Three.js), kịch bản + storyboard, design tokens, asset, âm thanh, xuất. Dùng đầu tiên khi người dùng muốn video giới thiệu sản phẩm hoặc app, rồi chuyển sang skill chuyên biệt.
---

# Product Intro Video (orchestrator)

Skill điều phối. Các skill chuyên biệt đi kèm (gọi theo nhu cầu):

| Cần | Skill |
|---|---|
| Video 2D lập trình bằng React, dữ liệu/biến thể hàng loạt | `remotion-video` |
| Video từ HTML + GSAP, agent viết nhanh, preview không build | `hyperframes-video` |
| Tween chính xác bằng generator, explainer | `motion-canvas-2d` |
| Hoạt ảnh UI/typography/SVG (GSAP, anime.js, Motion) | `web-animation-gsap-motion` |
| SVG tối ưu, ảnh thẻ bằng Satori, Lottie, Rive | `vector-assets-svg-lottie-rive` |
| 3D hero sản phẩm | `threejs-r3f-3d` |
| Nhạc/SFX, Howler, Mediabunny, FFmpeg, xuất | `audio-and-export` |
| Cảnh quay do AI video model sinh | `ai-video-director` |
| Video thuyết trình dự thi (đúng thể lệ + chất product video) | `contest-pitch-video` |

## 1. Chọn stack (quyết định trong 1 phút)

- **Đã có UI là HTML/React** (ví dụ các prototype `.html`, app React): dùng thẳng UI làm cảnh. HyperFrames nếu là HTML thuần; Remotion nếu là React.
- **Cần 20+ biến thể** (nhiều ngôn ngữ, nhiều tên khách, dữ liệu thật): Remotion (`defaultProps` + `--props` + `calculateMetadata`).
- **Chủ yếu chữ + hình khối + số liệu, tốc độ là ưu tiên**: HyperFrames (GSAP timeline).
- **Explainer với đồ họa vector, cần kiểm soát từng tween**: Motion Canvas.
- **Sản phẩm vật lý / cần "wow" 3D**: three.js / R3F (chạy trong Remotion bằng `@remotion/three`, hoặc HyperFrames qua adapter Three.js).
- Mặc định nếu không rõ: **Remotion** (hệ sinh thái lớn nhất, xuất MP4 ổn định). Cấp phép: Remotion cần giấy phép công ty nếu tổ chức vượt quy mô miễn phí; kiểm tra điều khoản hiện hành trước khi dùng thương mại.

Không có công cụ nào ở trên được dùng song song cho cùng một cảnh trừ khi cần (ví dụ GSAP/Lottie/Three nằm trong một cảnh Remotion hoặc HyperFrames).

## 2. Quy trình

1. **Brief (hỏi tối đa 4 câu):** sản phẩm + đối tượng, thông điệp 1 câu, thời lượng/tỉ lệ (16:9 / 9:16 / 1:1), tài sản có sẵn (logo, màu, font, UI, screenshot, nhạc).
2. **Design tokens:** 1 file duy nhất `tokens` (màu nền/chữ/nhấn, font, bán kính, đổ bóng, easing, nhịp thời gian). Mọi cảnh dùng chung. Tối đa 2 font, 3-4 màu.
3. **Storyboard dạng bảng** (mẫu bên dưới) - duyệt trước khi code.
4. **Asset:** logo → SVG qua SVGO; UI/screenshot → PNG 2x; thẻ động (đồ thị, OG, lower third) → Satori; 3D → GLB nén; nhạc + SFX → xem `audio-and-export`.
5. **Dựng cảnh theo từng scene**, preview, chỉnh nhịp; mỗi scene là một component/section riêng, thời lượng đặt bằng hằng số.
6. **Âm thanh:** nhạc nền ducking dưới voiceover; SFX theo điểm cắt; chuẩn hóa âm lượng.
7. **Xuất + kiểm tra:** xem checklist mục 4; xuất bản cuối (H.264) và bản tệp phụ (GIF/WebM/9:16) nếu cần.

## 3. Cấu trúc kịch bản mặc định (30 giây, có thể co giãn)

| Giây | Beat | Nội dung | Gợi ý chuyển động |
|---|---|---|---|
| 0-3 | Hook | Một câu gây tò mò hoặc con số đau điểm | Chữ lớn vào nhanh (stagger), cắt dứt khoát |
| 3-8 | Vấn đề | Cảnh "trước": rối, chậm, tốn kém | Chuyển động rối/lộn xộn, tông màu lạnh |
| 8-12 | Giải pháp | Logo + tên sản phẩm lộ diện | Reveal bằng mask/scale, tiếng "whoosh" |
| 12-24 | 3 tính năng | Mỗi tính năng 4s: tiêu đề + UI thật + 1 lợi ích đo được | Zoom/pan trong UI, nhấn con trỏ/click |
| 24-27 | Bằng chứng | Số liệu, logo khách hàng, trích dẫn | Count-up, marquee |
| 27-30 | CTA | Tên + URL/QR + 1 hành động | Giữ yên 1,5s để đọc, logo lock-up |

Quy tắc nhịp: mỗi ý tối đa ~2 câu; một cảnh tối đa 1 ý; chữ phải đọc được trong thời lượng (≈ 3 từ/giây cho chữ trên màn hình); kết thúc ở khung tĩnh để người xem kịp đọc CTA.

## 4. Checklist chất lượng

- [ ] 1920x1080 hoặc đúng tỉ lệ yêu cầu; 30 fps (60 nếu nhiều chuyển động nhanh); an toàn lề 5% cho chữ
- [ ] Không dùng animation theo đồng hồ thật (CSS transition / requestAnimationFrame tự do) trong công cụ render theo frame
- [ ] Font đã nạp trước khi render (tránh nhảy font)
- [ ] Tương phản chữ đạt WCAG AA; chữ không bị cắt ở tỉ lệ 9:16
- [ ] Ease hợp lý (out cho vào, in cho ra); không có chuyển động tuyến tính trơ cứng
- [ ] Âm lượng tổng ≈ -14 đến -16 LUFS; không clip
- [ ] Thử phát bản xuất ở tốc độ thật trên điện thoại
- [ ] Dung lượng hợp lý (H.264 CRF 18-23, `yuv420p`, `+faststart`)

## 5. Ghi chú dự án EdTech

Các file prototype HTML hiện có trong repo là nguồn cảnh sẵn cho HyperFrames (hoặc quay màn hình bằng Playwright rồi đặt vào Remotion). Với video giáo dục, ưu tiên: một ý học tập mỗi cảnh, phụ đề tiếng Việt song song, giọng đọc rõ nhịp chậm hơn quảng cáo.
