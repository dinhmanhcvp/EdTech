# Bóc tách "Introducing the New Flow – Your AI Creative Studio" (59,5 s)

Nguồn: `YTSave.to_YouTube_Media_BGuxsk79sYY_Introducing-the-New-Flow-Your-AI-Creative-Studio_001_1080p.mp4` (1920×1080, 23,976 fps, AAC 44,1 kHz).
Dữ liệu thô: `flow_audio.wav`, `audio.json` (onset/kick/năng lượng), `cuts.txt` (điểm cắt cảnh), `sheets/` (4 khung/giây).

## 1. Cấu trúc nhịp kể (5 hồi trong 1 phút)

| Thời gian | Hồi | Hình | Chữ |
|---|---|---|---|
| 0 – 6,8 | Mở | Hàng trăm thẻ ảnh trôi trong không gian 3D tối, bay về phía camera | "Every story" (từng từ, mờ → nét) |
| 6,8 – 10 | Hội tụ | **Cắt đúng phách** sang bức tường thẻ đã xếp lưới, nghiêng phối cảnh, thu nhỏ dần | "Starts with vision" |
| 10 – 26 | Demo tính năng 1 | Một cửa sổ UI phóng to, công cụ khoanh vùng (lasso) đứt nét, gõ prompt "add @…", nút → , ảnh nhòe → nét | "Add characters." |
| 26 – 37 | Demo tính năng 2-3 | Lặp đúng công thức: khoanh vùng → gõ → bấm → nhòe → kết quả; rồi các phiên bản xếp chồng cuộn dọc | "Build environments." / "Create stories." |
| 37 – 43 | Demo tính năng 4 | Lưới kết quả nghiêng, nhặt 2 thẻ làm "nguyên liệu", gõ prompt video, bấm, kết quả | "Image and Video" / "Working as one." |
| 43 – 52 | Montage | **Cắt cứng mỗi 1/2–1 phách** (0,33–0,7 s) qua 16 cảnh kết quả rất khác nhau | không chữ |
| 52 – 59,5 | Kết | Tường thẻ nghiêng → "Introducing the new / Flow / Your AI Creative Studio" → chữ khổng lồ lồng ảnh "Start creating." → logo trên đen | logo + "by Google" |

Bài học: **một công thức demo lặp lại** (chọn → nói → bấm → thấy kết quả) cho mỗi tính năng, mỗi lần chỉ thêm một yếu tố mới; chữ chỉ là **một câu 2–3 từ** gọi tên lợi ích, không giải thích.

## 2. Kỹ thuật hình

1. **Chữ nhòe-hiện (blur-in) theo từ**: mỗi từ đi từ blur ~18 px + scale ~1,1 → nét, trễ nhau 0,1–0,35 s; ra bằng nhòe + nở nhẹ. Chữ trắng, đậm vừa, bóng mềm; đặt giữa khung, đè lên hình (không hộp).
2. **Thẻ 3D trong chiều sâu**: phối cảnh ~1500 px, thẻ bo góc + bóng đổ, xoay ngẫu nhiên, trôi chậm về camera → hội tụ thành lưới.
3. **Bức tường nghiêng (rotateX/rotateY 10–20°)** làm nền cho chữ lớn; các hàng trượt ngang ngược chiều nhau.
4. **Camera không bao giờ đứng yên**: UI luôn đang phóng/đẩy rất chậm (1–5 %/giây).
5. **Zoom vào thao tác**: con trỏ, ô nhập prompt được phóng cực lớn (ô nhập chiếm nửa màn hình khi gõ), nhấn nút có hiệu ứng ấn.
6. **"Đang tạo" = nhòe**: khi bấm, ảnh nhòe mạnh rồi nét dần ra kết quả mới → dùng làm chuyển cảnh (nhòe-zoom).
7. **Khớp hình (match cut)**: kết quả của bước trước thành khung đầu của bước sau; tường thẻ → lao vào một thẻ → thẻ đó thành cảnh tiếp theo.
8. **Xếp chồng phiên bản**: các biến thể xếp chồng như bài, cuộn dọc, để thấy "nhiều phương án".
9. **Chữ khổng lồ lồng hình** (text mask) tràn khung rồi thu nhỏ → chữ trắng → đen + logo.

### Soi kỹ ở 8 khung/giây (lượt 2)

10. **Chữ trượt ngang có nhòe chuyển động** ("Build environments."): cả dòng lướt từ trái vào, nhòe theo trục ngang rồi phanh gấp; ra bằng trượt tiếp. Khác hẳn kiểu hiện từng từ.
11. **Lấy nét chuyển (focus pull)**: khi gõ prompt, nền phía sau nhòe kiểu khẩu độ lớn, ô nhập nghiêng 3D bay lên phía trước.
12. **Viền sáng trạng thái chọn**: khung kết quả có viền trắng mảnh + quầng sáng nhẹ khi được chọn.
13. **Kết quả phóng to thành toàn khung**: thẻ nhỏ lớn dần đúng bằng khung hình rồi thành cảnh mới, chữ đè lên.
14. **Xếp chồng dọc có chiều sâu**: các phiên bản xếp như bài, cuộn lên; thẻ phía sau tối và nhòe hơn.
15. **Tắt về đen + UI mới trồi lên từ dưới** thay cho chuyển cảnh mờ.
16. **Montage điện ảnh**: khung 2.39:1 (letterbox), có cảnh đen trắng, mỗi cảnh một khoảnh khắc chuyển động mạnh.
17. **Không có nền "đồ họa"**: mọi nền là đen tuyền hoặc chính nội dung sản phẩm; không lưới, không hạt bay, không gradient neon.

## 3. Âm thanh

- Nhạc điện tử một mạch, ~**87 BPM** (phách 0,6895 s, ô nhịp 2,758 s), không lời thoại; năng lượng tăng từ −35 dB (0 s) lên ổn định −16…−19 dB từ giây 5, outro tắt ở 59,5 s.
- Mọi vết cắt lớn rơi **đúng phách mạnh** (6,84 s; 25,78 s; 37,66 s); montage 43–52 s cắt theo nửa phách.
- SFX UI rất nhẹ (click khi bấm, whoosh khi tường thẻ trượt) nằm dưới nhạc.

## 4. Áp dụng cho Socratic Vision Board (composition `FlowCut`)

| Kỹ thuật Flow | Bản dự thi |
|---|---|
| Đám thẻ 3D + "Every story / Starts with vision" | `CardCloud`: 60 khung hình app thật trôi → tường → "Mỗi bài giảng / bắt đầu từ một nét phấn." → lao vào thẻ giữa = khung đầu cảnh viết tay (cắt thẳng) |
| Công thức demo lặp lại | Giữ nguyên các hồi Demo2: viết → khoanh → biên dịch → kéo thanh trượt (mỗi môn một lần) |
| Chuyển cảnh nhòe "đang tạo" | `blurZoom` thay iris/wipe/slide |
| Montage cắt theo phách | `Montage`: 12 khoảnh khắc mô phỏng thật, mỗi phách một cảnh, vết cắt lấy từ lưới phách của nhạc |
| Tường nghiêng + tên sản phẩm | "Một nét phấn. Mọi môn học." → "Socratic Vision Board" |
| Chữ khổng lồ + logo trên outro | `EndCard`: "Bắt đầu dạy." → logo; đặt trùng outro nhạc nên nốt cuối rơi đúng logo |
| Nhạc 59,5 s cho video 4 phút | `tools/flow_music.py`: intro + thân + lặp vòng 12 ô nhịp (16,6 → 49,7 s) + outro, nối chéo 40 ms trên vạch ô nhịp; outro canh đúng điểm kết video |

Mức nhạc: 0,8–0,9 khi không có lời (mở, montage, kết), 0,2 dưới thuyết minh, chuyển mềm 0,6 s.

### Lượt 2 (sau góp ý "nền AI slop, nét vẽ cứng, thiếu SFX/hiệu ứng")

| Vấn đề | Cách sửa |
|---|---|
| Nền aurora + lưới + hạt bay + quầng màu | `StudioBg` (`src/flow/fx.tsx`): đen than, đèn rọi mềm bám cửa sổ app, vignette, hạt phim động (`Grain`); bỏ mọi glow neon ở thẻ số liệu/logo |
| Cửa sổ app phẳng | phản chiếu xuống sàn (`-webkit-box-reflect`), nhòe→nét khi bay vào, vệt sáng quét kính khi đáp, viền sáng "đang chọn" lúc biên dịch |
| Nét viết tay là vài đoạn thẳng | `tools/handwriting.py`: phông nét đơn Hershey + người hóa (nghiêng, lệch cỡ/xoay từng chữ, dòng trôi, bo góc, rung tay, tốc độ bút hình chuông, nhấc bút 70–160 ms) → `recorder.inkHand` phát lại đúng nhịp từng điểm; vòng lasso méo tự nhiên, vẽ quá điểm đầu. Đã quay lại P/R/H/B |
| Chữ hiện đơn điệu | `SlideText` (trượt ngang + nhòe một chiều bằng bộ lọc SVG), số liệu kiểu keynote (số lớn nét mảnh, vạch nhấn, nhãn mờ) |
| Chuyển cảnh một kiểu | `whip` (lia ngang có nhòe chuyển động), `through` (lao xuyên), `blurZoom`; montage có letterbox + chớp sáng 2 frame mỗi vết cắt |
| SFX ít | `tools/sfx2.py`: riser, impact, hit, whip, swoosh, tick, pop, glass, keys, shutter, swell, pen1-3, sub. `src/flow/sfx.ts` gắn tiếng bút cho **từng nét** (độ dài nét → biến thể + tốc độ), gõ phím khi nhập gợi ý, swell trước biên dịch, tick cho chữ, glass cho số liệu, whip/swoosh cho chuyển cảnh, hit/shutter cho cắt montage, riser→impact ở mở đầu, tên sản phẩm và logo |

## 5. Lưu ý bản quyền

Nhạc là của video quảng cáo Google Flow. Thể lệ yêu cầu sản phẩm "do chính tác giả tạo ra" và BTC được dùng video cho truyền thông → **rủi ro bản quyền âm nhạc**. Bản nộp an toàn: chạy lại `flow_music.py` với một bài nhạc miễn phí bản quyền cùng nhịp (hoặc `public/sfx/music.mp3` tự tổng hợp) — toàn bộ cắt theo phách tự cập nhật theo lưới nhịp mới.
