# Học dựng từ một video tham chiếu rồi áp vào video dự thi

Rút ra khi bóc tách "Introducing the New Flow" (Google, 59,5 s) cho Socratic Vision Board. Bản phân tích đầy đủ: `socratic-video/analysis/flow/PLAYBOOK.md`; mã: `socratic-video/src/flow/`, `tools/analyze_audio.py`, `tools/flow_music.py`.

## Quy trình bóc tách (≈10 phút)

FFmpeg trên máy: `python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"` (bản này không hỗ trợ `-pattern_type glob`).

1. Thông tin: `ffmpeg -i ref.mp4` (thời lượng, fps, có audio không).
2. Điểm cắt: `ffmpeg -i ref.mp4 -vf "select='gt(scene,0.18)',showinfo" -vsync vfr -f null -` → lấy `pts_time`.
3. Tờ liên hoàn: `ffmpeg -i ref.mp4 -vf "fps=4,scale=384:-1,tile=8x6" sheet_%02d.jpg` (mỗi tờ 12 s) rồi xem bằng Read.
4. Âm thanh: tách wav → `tools/analyze_audio.py` (năng lượng/giây, onset, kick). BPM tự tương quan hay ra **gấp đôi**: kiểm tra bằng khoảng cách các onset đều nhau (vd 0,685 s → 87 BPM).
5. Ghi bảng: hồi kể chuyện theo thời gian, kỹ thuật hình, chữ, nhịp cắt so với phách, mức nhạc.

## Biến kỹ thuật thành thành phần Remotion

| Kỹ thuật | Thành phần |
|---|---|
| Chữ từng từ mờ → nét | `BlurText` (blur 18px→0, scale 1,12→1, stagger 0,1–0,35 s) |
| Đám thẻ 3D → tường → lao vào một thẻ | `CardCloud` (thẻ giữa = khung đầu cảnh sau → cắt thẳng, match cut) |
| Chuyển cảnh "đang tạo" | `blurZoom` (TransitionPresentation tùy biến) |
| Montage cắt theo phách | `Montage` đọc lưới phách từ JSON nhạc, mỗi phách một `Sequence` + `OffthreadVideo` zoom vào vùng mô phỏng |
| Chữ khổng lồ lồng hình + logo | `EndCard` đặt trùng outro nhạc |

Tài sản cho thẻ/montage lấy từ **chính app**: cắt khung từ clip quay màn hình ở các mốc có mô phỏng (crop theo keyframe camera đã ghi), cộng ảnh chụp giao diện. App nền giấy trắng → hạ `brightness(0.5)` thẻ khi có chữ trắng đè lên, và không dùng ảnh app để lồng trong chữ (quá sáng) — dùng dải màu thương hiệu.

## Để trông như launch của hãng lớn (bài học lượt 2)

- **Không nền "đồ họa AI"** (aurora, lưới, hạt bay, quầng neon, viền phát sáng màu): dùng studio đen + đèn rọi + vignette + hạt phim; sản phẩm là nguồn sáng duy nhất; phản chiếu sàn.
- **Chữ**: trượt ngang có nhòe chuyển động một chiều (SVG `feGaussianBlur stdDeviation="N 0"`), số liệu trắng nét mảnh + vạch màu ngắn; màu nhấn dùng tiết kiệm.
- **Chuyển cảnh đa dạng có chủ đích**: whip pan giữa các hồi cùng loại, lao xuyên khi đổi chương, nhòe khi "đang tạo"; montage letterbox + chớp 2 frame theo phách.
- **Mọi chuyển động có tiếng**; tiếng bút gắn theo từng nét thật (ghi mốc `stroke` khi quay).
- **Thao tác demo phải giống người**: nét viết tay sinh bằng `tools/handwriting.py` (Hershey + người hóa), lasso méo, tốc độ bút thay đổi. Nét polyline vài điểm trông như máy.
- Bộ SFX tự tổng hợp: `tools/sfx2.py` (cần `pip install scipy`).

## Nhạc nền ngắn hơn video

`tools/flow_music.py <src.wav> <giây> <ra.mp3> [hết intro] [vào outro]`: tìm lưới phách + phách mạnh, chọn vòng lặp dài giống nhau nhất (bội số ô nhịp), ghép intro + thân + n×vòng + phần lẻ + outro, nối chéo equal-power 40 ms sớm 15 ms trước vạch, loudnorm −16 LUFS; xuất JSON `beats/bars` theo thời gian bản mới. Trong Remotion đặt nhạc sao cho **cuối nhạc = cuối video** (outro rơi đúng logo), mọi vết cắt theo phách tính lại từ độ lệch này.

Mức nhạc: 0,8–0,9 ở cảnh không lời, 0,2 dưới thuyết minh, chuyển 0,6 s.

## Cạm bẫy

- Remotion render/still lỗi "not a valid Remotion project" khi cổng 3001 bị app Next chiếm → thêm `port: 3123` / `--port=3123`.
- Bundle plan.ts bằng esbuild ra `os.tmpdir()` không tìm được gói `remotion` → ghi vào `node_modules/.cache/` và đánh dấu `external`.
- Nhạc lấy từ video quảng cáo có bản quyền: nói rõ rủi ro với người dùng, giữ phương án nhạc tự tổng hợp/miễn phí (chỉ cần chạy lại `flow_music.py`).
