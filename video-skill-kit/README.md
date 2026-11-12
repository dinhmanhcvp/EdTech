# Video Skill Kit — làm phim giới thiệu / demo / dự thi cho dự án phần mềm

Đóng gói từ dự án Socratic Vision Board: 12 skill cho Claude Code + script quay/âm thanh + thành phần Remotion + bộ SFX tự tổng hợp (không bản quyền).

## Trong thư mục có gì

| Thư mục | Nội dung |
|---|---|
| `skills/` | 12 skill. Bắt đầu từ **`product-launch-video`** (quy trình trọn gói), rồi `product-intro-video`, `contest-pitch-video` (video dự thi theo thể lệ), `product-demo-screencast`, `remotion-video`, `audio-and-export`; các skill còn lại cho HyperFrames, Motion Canvas, GSAP, SVG/Lottie, three.js, prompt video AI |
| `tools/` | Script dùng lại được (bảng dưới) |
| `remotion/flow/` | Hiệu ứng & cảnh dùng chung: `fx.tsx` (nền studio, hạt phim, chữ trượt có nhòe, quét sáng, letterbox), `whip.tsx`/`blurZoom.tsx` (chuyển cảnh), `BlurText`, `CardCloud` (mở đầu đám thẻ 3D), `Montage` (cắt theo phách), `EndCard`, `LogoAnim`, `music.ts` (lưới phách), `sfx.ts` (gắn SFX theo mốc) |
| `remotion/footage/` | `FootageScene.tsx` (cửa sổ app nghiêng 3D + camera theo keyframe + cột tiêu đề), `camera.ts`, `types.ts`, `clips.ts` (registry clip) |
| `remotion/example-launch/` | Mẫu phim launch hoàn chỉnh: `plan.ts` (danh sách cảnh), `Launch3.tsx` (composition + nhạc + giọng + SFX), `vo-lines.json` |
| `assets/sfx/` | 26 SFX mp3 tự tổng hợp |
| `PLAYBOOK-bai-hoc-tu-video-Flow.md` | Bóc tách kỹ thuật dựng từ trailer Google Flow |

### Script trong `tools/`
| Script | Việc |
|---|---|
| `recorder.mjs` | Quay app web bằng Puppeteer + CDP: con trỏ, vòng click, `glide/click/dragSlider/lasso/typeHint/inkHand`, ghi mốc `mark()` và camera `zoom()` ra `*.marks.json` |
| `handwriting.py` | Sinh nét chữ viết tay "người thật" (Hershey + rung tay, nghiêng, tốc độ bút) → `hand-ink.json`. Sửa `FORMULAS` cho nội dung của bạn |
| `clips4.mjs`, `probe7.mjs` | Mẫu kịch bản quay (viết → khoanh → gợi ý → mô phỏng → xoay/kéo) và mẫu thăm dò UI (chụp từng bước, liệt kê `data-testid`) |
| `flow_music.py` | Kéo dài bài nhạc tới đúng độ dài phim theo ô nhịp, outro trùng điểm kết, xuất lưới phách JSON |
| `analyze_audio.py` | BPM, onset, năng lượng của nhạc tham chiếu |
| `sfx.py`, `sfx2.py` | Tổng hợp SFX (cần `pip install numpy scipy`) |
| `tts-lines.mjs` | Giọng ElevenLabs cho từng câu (`vo-lines.json`), cắt lặng, ghi độ dài |
| `asr_check.py` | Kiểm độ rõ lời giọng AI bằng faster-whisper (CER) |
| `sheet.py` | Ghép ảnh khung thành tờ liên hoàn để soát |
| `check-launch3.mjs`, `stills-launch3.mjs` | In thời lượng từng cảnh; render vài khung theo id cảnh |
| `shot.mjs`, `deck-shots.mjs` | Chụp trang HTML / bộ slide web ra PNG + PDF |

## Cài cho máy (một lần)
1. Chép các thư mục trong `skills/` vào `C:\Users\<bạn>\.claude\skills\` (đã cài sẵn trên máy này).
2. Node 20+, Python 3.11+ (`pip install numpy scipy opencv-python HersheyFonts imageio-ffmpeg faster-whisper`), Chrome.
3. FFmpeg: dùng bản của imageio-ffmpeg (`python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`) và **sửa hằng `FF` trong các script** nếu đường dẫn khác.

## Dùng cho dự án mới
Cách nhanh nhất: mở Claude Code trong dự án mới và nói *"làm video giới thiệu sản phẩm theo skill product-launch-video, bộ kit ở <đường dẫn video-skill-kit>"*. Làm tay thì:

1. Tạo dự án Remotion: `npx create-video@latest` (hoặc chép `remotion/package.json.mau` rồi `npm i`). Chép `remotion/flow`, `remotion/footage`, `remotion/example-launch` vào `src/`, `assets/sfx` vào `public/sfx`, `tools/` vào `tools/`.
2. Chạy app của bạn; viết script quay theo mẫu `clips4.mjs` (đổi URL, `data-testid`, nội dung `HINT`); quay → chuẩn hóa vào `public/clips/` + `marks/` → khai báo trong `clips.ts`.
3. Sửa `example-launch/plan.ts`: danh sách cảnh, chữ từng cảnh. Đổi logo trong `LogoAnim.tsx`/`EndCard.tsx`, màu trong `fx.tsx`.
4. Nhạc: `python -I tools/flow_music.py <nhạc.wav> <tổng giây> public/music/<tên>_bed.mp3` (tổng giây lấy từ `node tools/check-launch3.mjs`).
5. Giọng (tùy chọn): sửa `vo-lines.json`, đặt `ELEVENLABS_API_KEY` trong `.env`, `node tools/tts-lines.mjs`.
6. Soát: `node tools/stills-launch3.mjs <thư mục> <id>:<giây,...>` + `python -I tools/sheet.py`.
7. Render: `npx remotion render src/index.ts <Composition> out/raw.mp4 --crf=18 --concurrency=75% --port=3123`, rồi chuẩn hóa:
   `ffmpeg -i out/raw.mp4 -vf "scale=in_range=pc:out_range=tv,format=yuv420p" -c:v libx264 -crf 18 -preset slow -af "alimiter=limit=0.84:level=false,loudnorm=I=-15:TP=-1.5:LRA=11" -c:a aac -b:a 256k -movflags +faststart out/final.mp4`

## Lưu ý
- Mã trong `remotion/` là bản đang chạy của Socratic Vision Board, **chưa tách thành thư viện**: còn import chéo (`../demo2/plan`, `../ui`, `../theme`) và dữ liệu riêng của dự án đó. Khi chép sang dự án mới cần sửa đường dẫn import và bỏ phần không dùng; script `recorder.mjs` có `BP_PATCH`/URL riêng của app cũ.
- Không kèm nhạc nền (nhạc trailer Flow có bản quyền). Dùng nhạc miễn phí bản quyền rồi chạy `flow_music.py`.
- Bài học và cạm bẫy đầy đủ nằm trong `skills/product-launch-video/SKILL.md` và `skills/contest-pitch-video/references/reference-video-edit.md`.
