---
name: live-action-pitch-video
description: Dựng phim pitch/khởi nghiệp/dự thi (≤ 3 phút) ghép footage người thật (học sinh, nhóm dự án nói trước máy, thu giọng riêng) với giao diện sản phẩm, đồ họa nổi, montage UI kiểu Flow/Apple bằng Remotion — từ footage 4K thô + sheet kịch bản tới MP4 chuẩn. Dùng khi người dùng có clip quay người + kịch bản (sheet/EDL) + app và muốn video startup/SV_STARTUP/KHKT/sáng kiến chuyên nghiệp, có phụ đề, thẻ tên, mask cut, nhạc khớp phách.
---

# Live-action Pitch Video (người thật + UI)

Rút ra từ phim SV_STARTUP IX của Socratic Vision Board (11 bản dựng, mentor duyệt). Mã mẫu đầy đủ: `remotion/example-live-pitch/` trong kit (plan.ts = EDL, SvStartup.tsx = lắp cảnh + âm thanh, parts.tsx = linh kiện đồ họa, Intro.tsx, Montage.tsx). Dùng cùng `product-launch-video` (CardCloud, EndCard, flow_music), `audio-and-export`, `remotion-video`.

## 1. Quy trình

1. **Chỉ tải clip có trong sheet kịch bản** (Drive: `gdown` theo id; liệt kê thư mục bằng `gdown.download_folder(..., skip_download=True)`). Ghi lại id clip dự phòng.
2. **Proxy**: FX30/4K HEVC 10-bit 59,94 → `scale=1920:1080:flags=lanczos,fps=30,eq=contrast=1.05:saturation=1.08,format=yuv420p`, `libx264 -crf 16 -g 30`, AAC 48 kHz. Giọng thu riêng (m4a) → wav 48 kHz.
3. **Chép lời có mốc TỪNG TỪ** cho mọi clip và file giọng: `tools/words.py` (faster-whisper small, giải mã bằng ffmpeg vì PyAV cài sẵn hay lỗi). Mốc từ (không phải mốc đoạn VAD) là nguồn cho in/out, phụ đề, chữ nổi, SFX.
   - File giọng dài nhiều lần thu: `silencedetect` + chép lời từng khúc để chọn take; take cuối thường đủ chữ nhất.
   - Lời thật ≠ sheet: **phụ đề theo lời thật** (sửa chính tả). Số liệu nói ra ≠ dữ liệu dự án → hỏi người dùng số nào thật trước khi giao.
   - Whisper bịa câu ("Hãy subscribe cho kênh…") ở đoạn yên lặng/ồn — đừng tin chép lời ở chỗ không có lời.
4. **Tờ liên hoàn**: 1 khung/s cho cả clip, 4 khung/s quanh hành động (búng tay, đi ngang, giơ điện thoại) để lấy mốc khớp hình.
5. **Cân mức từng nguồn lời** về ≈ −23 LUFS trước khi dựng (đo `ebur128` đúng khúc có lời). Thu xa (−45 LUFS): `highpass=120,lowpass=7000,afftdn=nf=-25,volume=+21dB` rồi đo lại, thêm dB nếu thiếu. Cảnh hô to: giảm. Ghi vào chính proxy (`-c:v copy -af ...`).
6. **EDL trong `plan.ts`**: mỗi cảnh `{id, src, in, dur, muteBefore/After, rate, vo:{file,from,to,at}, subs:[[giây nguồn a,b,text]], chapter}`; `absOf(id, giây nguồn)` đổi về giây phim (clip: (s−in)/rate; giọng: (s−from)/rate+at). Mọi chữ nổi/SFX/phụ đề viết theo **giây nguồn** → đổi in/out/tốc độ không phải dò lại.
7. **Nhạc**: `flow_music.py <wav> <giây> <ra.mp3>` (nhảy theo ô nhịp) hoặc tự tổng hợp `sv_music.py` (không bản quyền). Xem §4.
8. **Soát khung trước khi render**: `node tools/sv-tool.mjs stills <dir> <giây,...>` rồi ghép tờ (ffmpeg `tile`). Mỗi lần sửa: soát đúng khung vừa sửa (lấy mốc thật từ `sv-tool.mjs times`, đừng tính tay).
9. **Render** `--concurrency=4 --timeout=120000 --port=<cổng trống>` (75% luồng hay chết giữa chừng). Chuẩn hóa: `loudnorm=I=-13.5:TP=-3:LRA=11,volume=2.4dB,alimiter=limit=0.7:level=false:attack=2:release=60` → ≈ −14 LUFS, đỉnh ≈ −2,6 dBFS (limiter 0,84 để đỉnh AAC vọt +1 dB).
10. **QC trên file cuối**: `python -I -X utf8 tools/qc_video.py <mp4> public/.../times.json` + chép lời toàn phim (`transcribe.py`) — mọi câu phải ra, đúng thứ tự. Xem §5.

## 2. Kỹ thuật dựng (đã kiểm chứng, có mã trong example-live-pitch)

| Kỹ thuật | Cách làm | Mã |
|---|---|---|
| Intro kiểu Flow | CardCloud 8,2 s (đám thẻ khung app → tường → lao vào thẻ giữa) + giọng mở đầu 1 câu ở 1,2 s | `flow/CardCloud`, `OPEN_VO` |
| Montage hook | 8 shot cắt đúng phách (lấy từ lưới `beatsIn` của bản nhạc), chữ theo cặp shot "Thầy giảng. → Trò chép. → AI giải hộ. → Ai đang thực sự học?", letterbox, chớp 2 frame | `Intro.tsx` |
| Thẻ tên + vai | Tên + nhãn CEO/CTO… + lớp/trường, góc dưới trái **trên** phụ đề 2 dòng (bottom ≥ 215), giữ ~5 s | `LowerThird` |
| Khung nổi lên shot người | Cửa sổ chatbot quay chờ → "hết lượt" → đáp án sai; điện thoại "Đáp án C" + dấu ✕; thanh "kiến thức tích lũy" tụt về 0; 2 màn hình app hai bên người nói khi nói "giáo viên"/"học sinh"; thẻ số chạy "~3.000 trường" | `Float`, `Panel`, `Phone`, `Bubble`, `KnowledgeBar`, `SchoolsCard` |
| Chip theo lời | Bật đúng từ (mốc words.py), **tắt sau ~0,5 s** khi đặt gần người; không xếp 3 chip đứng mãi cạnh mặt | `Chip at/until` |
| Mask cut búng tay | 0,42 s: clip trước chạy tiếp bên dưới, cảnh sau mở bằng `clip-path: circle()` từ đúng toạ độ bàn tay + viền sáng | `SnapCut` |
| Mask người đi ngang | Đo mép lưng từng khung (`mask_edge.py`), `mask-image` theo bảng; cảnh sau lộ SAU lưng người | `MaskWipe` |
| Khớp khung trời | Cảnh trước kết bằng máy hất lên trời trắng, cảnh sau mở bằng máy hạ từ trời; tên sản phẩm (chữ mực tối) hiện trên trời, gói trong shot trời | `SkyTitle` |
| Cảnh giao diện | Thiết bị viền tối trên sân khấu sáng, camera 2.5D đẩy vào điểm chạm (ease-out-expo), nhãn môn + tiêu đề lợi ích | `Device`, `Stage`, `FeatureTitle` |
| Người thật + UI | Clip học sinh thao tác bảng thật + màn hình app bay ra phóng to kết quả (cầu 3D khi khoanh), thẻ "AI chấm từng bước" khớp đúng bước sai trên bảng | `ARollOverlay` U2/U4 |
| Giọng thật làm bằng chứng | Giữ nguyên câu học sinh hỏi bảng bằng giọng, phụ đề trong ngoặc kép, ô "Đang nghe…" có sóng; tắt tiếng ê-kíp sau đó | `MicBadge`, `muteBefore/After` |
| Nguyên lý cốt lõi | Một cảnh riêng 5 s: tiêu đề lớn + lối tắt bị khóa ✕ + đường đi nhiều bậc + nguồn khoa học (vd "desirable difficulties", Bjork) | `Friction` |
| Số liệu | Số chạy (rolling) khớp lúc đọc; chữ dùng gradient + `background-clip:text` thì **không ẩn được bằng opacity con** → cho số chạy ngay khi mở cảnh | `Rolling`, `Results`, `Finance` |
| Montage UI cuối | 10 shot tính năng nửa phách (khung giữa bảng mô phỏng cy≈0,47, phóng 1,4 để không cắt mất phần trên) → tường thẻ nghiêng + tên | `Montage.tsx` |
| Outro | Logo vẽ nét (lasso) hiện ngay trên nền đen + dòng khẩu hiệu + giọng AI đọc tên → khẩu hiệu, trùng outro nhạc | `Outro`, `OUTRO_VO` |
| Logo động từ SVG thật | Trích nguyên path SVG của logo (`logoPaths.ts`), vẽ bằng `pathLength=1` + `strokeDashoffset`, bản trên nền tối đổi màu nét | `LassoLogo.tsx` |

## 3. Âm thanh

- Hạ nhạc theo khoảng phụ đề: còn **15%** dưới lời (nhạc trailer dày), **6%** dưới câu thu xa, 40–45% dưới giọng AI/giọng mở đầu. Vào/ra 0,25 s.
- Đoạn cả nhóm hô không đều → **giọng AI** (ElevenLabs eleven_v3, Daniel, thẻ `[excited]`) hoặc bỏ hẳn, chỉ giữ cú máy. TTS theo dòng: `tools/tts-sv.mjs` (đọc `vo-ai.json`, cắt lặng 2 đầu, cache theo hash). Gói free có hạn mức ký tự — hết thì 401 `quota_exceeded`: dùng lại file đã tạo.
- SFX (kit `assets/sfx`) theo mốc: pop/blip khi chip, swoosh khi khung nổi, thud khi dấu, hit/shutter mỗi vết cắt montage, impact + sub khi logo.
- Tăng tốc lời (Seg.rate, Audio `playbackRate`, atempo giữ cao độ) **1,01–1,05×** thay cho cắt cảnh khi cần bớt thời lượng.

## 4. Thời lượng & nhạc

- Giới hạn 3:00: tổng phim = **độ dài bản nhạc − 0,048 s** (flow_music nhảy theo ô nhịp ~2,76 s; nấc kế có thể vượt 3:00). Đặt outro tự tính = phần còn lại (ném lỗi nếu ngoài 6–8,5 s) → outro luôn trùng `outroAt` của nhạc.
- Thiếu/thừa vài giây: chỉnh `SPEED` (tốc độ đoạn có lời), **không gọt cảnh** (người xem thấy "thô").
- Montage/intro cắt theo `beatsIn(TOTAL, a, b)` của chính bản nhạc đang dùng; đổi nhạc → chạy lại flow_music rồi mọi vết cắt tự theo.

## 5. QC (con số đạt)

| Đo | Đạt |
|---|---|
| Lệch điểm cắt so với EDL | ≤ 0,07 s (2 khung); "noi-lien" chỉ ở chỗ chuyển cảnh liền mạch có chủ đích |
| Khung lặp lẻ shot người thật / montage | 0% (UI quay CDP có lặp → làm mượt, §6) |
| Âm | −14 ±0,5 LUFS, đỉnh ≤ −1 dBFS (đạt −2,6) |
| fps | 30 cố định (`-r 30 -video_track_timescale 15360` khi ghép) |
| Chép lời file cuối | Đủ mọi câu theo thứ tự; số liệu đọc đúng |
| Thời lượng | < giới hạn thể lệ |

## 6. Cạm bẫy đã gặp

- **Cắt đúng lúc bắt đầu nói nuốt âm đầu** ("Tr…"): `in` lùi 0,2–0,25 s trước mốc từ đầu tiên; fade biên 0,08 s.
- **Khoảng chết đầu shot** (2–3 s chưa ai nói) bị chê "chậm": chừa 0,1–0,3 s trước lời — trừ chỗ cố ý (máy hạ từ trời để khớp cảnh trước).
- **Chữ/khung nổi vắt qua cắt** đè lên người ở shot sau: gói trong shot của nó.
- **Mặt nạ ước lượng tay chạy trước người 5–8%** → đo bằng `mask_edge.py` (nền = trung vị cả clip).
- **UI quay CDP lặp khung** (con lắc 19%): `mpdecimate=hi=128:lo=64:frac=0.1:max=3,minterpolate=fps=30:mi_mode=blend` (chỉ bỏ lặp lẻ, giữ đoạn tĩnh dài) → bản riêng, không ghi đè clip gốc.
- **Remotion chết giữa chừng** ở cảnh nhiều OffthreadVideo: `--concurrency=4 --timeout=120000`. **Cổng bị phiên khác chiếm** → đổi `--port`.
- **Chỉ đổi âm**: `--codec=wav` rồi ghép `-map 0:v -map 1:a -c:v copy`. **Chỉ đổi vài giây cuối**: `--frames=a-b --muted`, ghép bằng `trim=end_frame=a`+`concat` + `fps=30` (thiếu → 30,01 fps).
- **Gradient text** (`background-clip:text`) không ẩn được bằng opacity của phần tử con.
- **Heredoc bash** hỏng với khối mã dài có `` ` `` và `${}` → ghi script ra file (Write) rồi chạy.
- **scipy cài sẵn lệch numpy** → lọc bằng FFT trong numpy (`sv_music.py`).
- Whisper bịa câu ở đoạn ồn/yên lặng; đo âm lượng (`ebur128`) để biết câu có thật sự mất không.

## 7. Góp ý thật từ người xem (ưu tiên khi dựng lần sau)

- Muốn **đồ họa nổi trên chính shot người thật** (khung UI, thẻ số, chat) để shot người không nhàm.
- Chữ chú thích **vào gần giữa khung, không che mặt**; chip bật rồi tắt, không đứng mãi.
- **Mask cut khéo** ở điểm hành động (búng tay, người đi ngang) phải khớp thật.
- **Không cắt nhiều cho kịp thời lượng** — tăng tốc nhẹ.
- Hô tập thể không đều → giọng AI hoặc bỏ; chữ khổng lồ đứng một mình ở outro bị chê "đơn độc".
- Thẻ tên giữ lâu hơn (~5 s). Logo chính thức của nhóm thay logo tự vẽ.
- Mentor duyệt dựa trên một bản tham chiếu → tải về, so tờ khung 2 s/khung + chép lời với bản mình, liệt kê khác biệt, áp phần thiếu, giữ những gì người dùng đã yêu cầu khác.
