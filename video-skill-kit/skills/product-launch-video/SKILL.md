---
name: product-launch-video
description: Quy trình trọn gói làm phim giới thiệu sản phẩm phần mềm kiểu "launch" của hãng lớn (Flow, Apple) bằng Remotion – quay app thật bằng Puppeteer có nét viết tay người, dựng theo nhạc với chữ lớn, chuyển cảnh whip/blur, montage cắt theo phách, SFX tự tổng hợp, giọng ElevenLabs, xuất MP4 chuẩn. Dùng khi người dùng có app web chạy được và muốn video giới thiệu/demo/dự thi chuyên nghiệp, hoặc muốn học kỹ thuật dựng từ một video tham chiếu.
---

# Product Launch Video

Rút ra từ dự án Socratic Vision Board (Remotion 4, 3 bản: dự thi có giọng 4:43, launch v3 2:17). Bộ mã mẫu đi kèm ở thư mục kit (`video-skill-kit/`), xem README ở đó. Dùng chung với `remotion-video`, `product-demo-screencast`, `audio-and-export`, `contest-pitch-video`.

## 1. Nguyên tắc nội dung (bài học từ góp ý người dùng)
- **Footage app thật > hình dựng lại.** Bản dựng bằng SVG tĩnh trong khung kiểu slide bị chê "như slide". Quay chính app đang chạy, tương tác thật (xoay, kéo thanh trượt, kéo cửa sổ).
- **Phim launch không đọc số liệu kỹ thuật** (60 khung/giây, ms, % chi phí, "soạn bài 4 phút"): nghe tầm thường. Chỉ chữ lợi ích 2–4 từ: "Viết. Khoanh. Thấy.", "Gợi mở. Không giải hộ."
- **Không ghi tên tác giả/cuộc thi** trong bản giới thiệu sản phẩm (chỉ bản dự thi mới cần).
- **Thao tác demo phải giống người:** nét viết tay sinh bằng phông nét đơn Hershey + "người hóa" (nghiêng, rung tay, tốc độ bút hình chuông, nhấc bút), vòng khoanh méo và vẽ quá điểm đầu. Nét polyline vài điểm trông như máy.
- **Không nền "đồ họa AI":** bỏ aurora, lưới, hạt bay, glow neon. Dùng studio đen + đèn rọi + vignette + hạt phim; sản phẩm là nguồn sáng.
- **Số liệu chỉ từ một nguồn có thật** (file JSON của dự án). Claim không có trong mã/dữ liệu thì bỏ.

## 2. Cấu trúc phim (< 3 phút, nhịp nhanh)
| Khối | Giây | Kỹ thuật |
|---|---|---|
| Mở | 8 | Đám thẻ 3D (khung hình app) → tường nghiêng → lao vào thẻ giữa = khung đầu cảnh sau (match cut) |
| Hook demo | 10 | Thao tác cốt lõi đầy đủ, chữ khổng lồ theo hành động |
| Thương hiệu | 5–6 | Logo động (nét vẽ tự chạy) + wordmark + một câu định vị |
| Tính năng chủ lực | 2 × 11–13 | Quy trình đầy đủ: thao tác → kết quả → tương tác |
| Chuỗi nhanh | 6–8 × 4,8 | Chỉ phần kết quả, cột trái tiêu đề 2 dòng, whip pan giữa các cảnh |
| Đặc trưng khác | 3 × 12 | Cảnh có tiêu đề hero → thu về cột trái |
| Montage | 11 | Letterbox 2.39:1, mỗi phách một cảnh, chớp 2 frame, tường thẻ + tên |
| Kết | 7 | Chữ khổng lồ → logo trên outro nhạc |

## 3. Quy trình
1. **Bóc tách video tham chiếu** (nếu có): điểm cắt `select='gt(scene,0.18)'`, tờ liên hoàn 4–8 khung/giây, BPM (`analyze_audio.py`; tự tương quan hay ra gấp đôi). Ghi bảng kỹ thuật.
2. **Quay app:** `recorder.mjs` (Puppeteer + CDP screencast, con trỏ + vòng click, ghi mốc `mark()` và keyframe camera `zoom()/zoomPoint()`). Viết tay: `handwriting.py` → `hand-ink.json` → `inkHand(key)` (mỗi nét ghi mốc `stroke` để gắn tiếng bút). Thăm dò UI trước bằng script chụp từng bước + liệt kê `data-testid`, `input[type=range]`.
3. **Ingest:** chuẩn hóa `fps=30, yuv420p, crf 15, -g 30` vào `public/clips/`, mốc vào `marks/*.json`, khai báo trong registry clip.
4. **Dựng:** một `plan.ts` (ITEMS: cảnh, độ dài, kiểu chuyển cảnh, mức nhạc) + một composition. Cảnh footage: cửa sổ app nghiêng 3D + phản chiếu sàn + camera theo keyframe đã ghi; cột tiêu đề `SlideText` (trượt ngang, nhòe một chiều bằng SVG `feGaussianBlur stdDeviation="N 0"`).
5. **Nhạc:** `flow_music.py <wav> <giây> <out.mp3>`: lặp theo ô nhịp, nối chéo 40 ms, outro canh trùng cuối video, xuất lưới phách JSON cho montage/SFX. Mỗi composition một file nhạc.
6. **SFX:** `sfx2.py` (riser, impact, hit, whip, swoosh, tick, pop, glass, keys, shutter, swell, pen1-3, sub). Gắn: bút theo từng mốc `stroke`, gõ phím khi nhập, swell trước kết quả, whip/swoosh ở chuyển cảnh, hit/shutter ở cắt montage, impact ở logo.
7. **Giọng (tùy chọn):** mỗi cảnh một câu ngắn trong `vo-lines.json` → `tts-lines.mjs` (ElevenLabs). Hạ nhạc còn ~40% khi có lời. Kiểm độ rõ lời bằng `asr_check.py` (whisper, CER).
8. **Soát:** script `stills` (render vài khung theo id cảnh) + `sheet.py` ghép tờ xem; sửa chồng lấn trước khi render.
9. **Render** `--port=3123`; chuẩn hóa `yuv420p`, `loudnorm=I=-15:TP=-1.5`, `+faststart`; soát 12–15 khung + `ebur128` trên file cuối.

## 4. Cạm bẫy đã gặp
- Render treo giữa chừng (một frame OffthreadVideo không trả về): dừng, **chỉ thêm/đổi âm thanh thì render `--codec=wav` rồi ghép vào video cũ** (`-map 0:v -map 1:a -c:v copy`), khỏi render lại hình.
- Cổng 3001 bị app Next chiếm → Remotion báo "not a valid Remotion project": thêm `--port`.
- esbuild bundle ra `os.tmpdir()` không thấy `remotion` → ghi vào `node_modules/.cache` + `external`.
- CDP screencast chỉ gửi khung khi màn hình đổi: đoạn tĩnh cuối clip bị mất; thêm thao tác nhẹ hoặc chấp nhận.
- Ảnh crop phóng > 1,3× từ nguồn 1080p bị vỡ hạt.
- `toLocaleString('vi-VN')` khác nhau Node/trình duyệt → hydration error (trang slide Next: `ssr:false`).
- ElevenLabs gói free: không dùng giọng thư viện qua API (402); `eleven_multilingual_v2` đọc tiếng Việt CER 25–30%, `eleven_v3` ≈ 4% nhưng không nhận `previous_text/next_text`. Tên riêng: viết phiên âm trong bảng PRON ("Sô-cra-tích Vi-sần Boóc").
- PowerShell `.Replace()` nhiều dòng hỏng với file CRLF → dùng Edit.
- Nhạc lấy từ trailer thương mại có bản quyền: cảnh báo người dùng; thay wav khác chỉ cần chạy lại `flow_music.py`.

- (11/2026) Render 75% luồng chết giữa chừng ở cảnh nhiều video → `--concurrency=4 --timeout=120000`. Đổi vài giây cuối: `--frames=a-b --muted` rồi ghép `trim=end_frame`+`concat`+`fps=30 -r 30 -video_track_timescale 15360` (thiếu → 30,01 fps).
- (11/2026) `alimiter=0.84` trước loudnorm để đỉnh AAC vọt +1 dBFS → `loudnorm=I=-13.5:TP=-3,volume=2.4dB,alimiter=0.7` sau cùng.
- (11/2026) UI quay CDP lặp khung lẻ (giật): `mpdecimate=hi=128:lo=64:frac=0.1:max=3,minterpolate=fps=30:mi_mode=blend` ra bản riêng.
- (11/2026) Chữ gradient `background-clip:text` không ẩn được bằng opacity của span con.
- Phim có người thật quay (pitch, dự thi): xem skill `live-action-pitch-video`.

## 5. Checklist giao
- [ ] < giới hạn thời lượng; mỗi tính năng mới có footage thật
- [ ] Không còn số liệu kỹ thuật/tên tác giả nếu là bản launch
- [ ] Không chồng chữ lên HUD/phụ đề; ảnh không vỡ
- [ ] MP4 1080p yuv420p, đỉnh < −1 dBFS; đã nghe lại tên sản phẩm trong giọng đọc
- [ ] Bản mới lưu tên mới (`_vN`), không ghi đè bản cũ
- [ ] `tools/qc_video.py` đạt (lệch cắt ≤ 2 khung, shot người/montage 0% lặp, −14 LUFS, 30 fps) + chép lời file cuối đủ câu
