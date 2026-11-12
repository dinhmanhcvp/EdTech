---
name: audio-and-export
description: Âm thanh và xuất video - Howler.js (phát nhạc/SFX trên web), Mediabunny (đọc/ghi/chuyển đổi media bằng WebCodecs trong trình duyệt/Node), FFmpeg (ghép, mux, chuẩn hóa âm lượng, mã hóa H.264/ProRes/WebM/GIF). Dùng khi cần thiết kế âm thanh cho video giới thiệu, xuất file, đổi định dạng, hoặc xử lý video bằng dòng lệnh.
---

# Howler · Mediabunny · FFmpeg

## Chọn công cụ

| Việc | Công cụ |
|---|---|
| Phát nhạc/SFX trong trang web, preview | **Howler.js** |
| Đọc metadata, cắt/đổi codec, ghi video từ canvas **trong trình duyệt/Node**, không cần FFmpeg nặng | **Mediabunny** |
| Ghép/mux/chuẩn hóa/mã hóa bất kỳ định dạng, dòng lệnh, batch | **FFmpeg** |
| Âm thanh bên trong video render | Thành phần âm thanh của Remotion / thẻ `<audio data-start>` của HyperFrames (không dùng Howler để render) |

## Cài FFmpeg trên máy này (Windows)

Máy chưa có FFmpeg hệ thống. Hai cách: `winget install Gyan.FFmpeg` (rồi mở terminal mới), hoặc `pip install imageio-ffmpeg` và lấy đường dẫn bằng `python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`. HyperFrames cần FFmpeg trong PATH; Remotion mang theo bản riêng.

## Howler.js

```js
import { Howl, Howler } from "howler";

const music = new Howl({ src: ["music.mp3", "music.webm"], loop: true, volume: 0.0 });
music.play();
music.fade(0, 0.35, 1500);                       // fade-in 1,5s

const sfx = new Howl({ src: ["sfx.webm", "sfx.mp3"],
  sprite: { whoosh: [0, 600], pop: [1000, 300], click: [2000, 120] } });  // [bắt đầu ms, độ dài ms]
sfx.play("whoosh");

Howler.volume(0.8);                              // âm lượng tổng
music.rate(1.0); music.seek(12.5);
```

- Trình duyệt chặn tự phát âm thanh: phải khởi chạy sau một thao tác người dùng.
- `html5: true` cho file dài (stream), mặc định dùng Web Audio (độ trễ thấp, hợp SFX).
- Cung cấp nhiều định dạng (`webm` + `mp3`).
- Đây là bản **preview/web**. Muốn đồng bộ chính xác theo frame trong video, đặt âm thanh vào timeline của công cụ render.

## Mediabunny (WebCodecs, thuần TypeScript)

```bash
npm i mediabunny
```

Đọc metadata:

```ts
import { Input, ALL_FORMATS, BlobSource } from "mediabunny";
const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
const duration = await input.computeDuration();           // giây
const video = await input.getPrimaryVideoTrack();
const audio = await input.getPrimaryAudioTrack();
```

Chuyển đổi/cắt:

```ts
import { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget } from "mediabunny";
const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
const conversion = await Conversion.init({ input, output });
if (!conversion.isValid) console.warn(conversion.discardedTracks);   // track bị bỏ
conversion.onProgress = (p) => console.log(p);
await conversion.execute();
const mp4 = output.target.buffer;                          // ArrayBuffer
```

Ghi video từ canvas (ghi hình cảnh WebGL/Canvas thành MP4 ngay trong trình duyệt):

```ts
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality } from "mediabunny";
const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
const videoSource = new CanvasSource(canvas, { codec: "avc", quality: new Quality({ bitrate: 8e6 }) });
output.addVideoTrack(videoSource, { frameRate: 30 });
await output.start();
for (let f = 0; f < totalFrames; f++) {
  drawFrame(f);                                           // vẽ khung f lên canvas
  await videoSource.add(f / 30, 1 / 30);                  // (thời điểm giây, độ dài giây)
}
await output.finalize();
const file = output.target.buffer;
```

- Đích ghi: `BufferTarget` (bộ nhớ), `StreamTarget`/`FilePathTarget` (Node/Bun/Deno ghi thẳng ra đĩa cho file lớn), `NullTarget`.
- Có `fastStart: 'fragmented'` cho MP4 phát khi đang ghi.
- Cần trình duyệt có WebCodecs (Chromium là chắc chắn nhất); Safari/Firefox hỗ trợ khác nhau, kiểm tra trước khi hứa tính năng.
- Giấy phép MPL-2.0. Tài liệu: mediabunny.dev. Remotion dùng Mediabunny cho metadata/đa phương tiện trong trình duyệt.

## FFmpeg: công thức hay dùng

Mã hóa chuẩn chia sẻ web (H.264, tương thích rộng):

```bash
ffmpeg -i in.mov -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k out.mp4
```

Ghép ảnh tuần tự thành video:

```bash
ffmpeg -framerate 30 -i frames/%05d.png -c:v libx264 -crf 18 -pix_fmt yuv420p out.mp4
```

Gắn nhạc/voiceover vào video (không mã hóa lại hình):

```bash
ffmpeg -i video.mp4 -i music.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4
```

Trộn nhạc + voiceover, nhạc **ducking** dưới giọng:

```bash
ffmpeg -i voice.wav -i music.mp3 -filter_complex \
"[1:a][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[bg];[0:a][bg]amix=inputs=2:duration=first:normalize=0[a]" \
-map "[a]" mix.wav
```

Chuẩn hóa âm lượng (≈ -14 LUFS cho mạng xã hội, -16 cho web/podcast):

```bash
ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:v copy out.mp4
```

Fade âm: `-af "afade=t=in:st=0:d=1,afade=t=out:st=28:d=2"`. Chuyển cảnh chéo: `xfade=transition=fade:duration=0.5:offset=4.5` (hình) và `acrossfade=d=0.5` (tiếng).

Cắt: `-ss 00:00:05 -to 00:00:12 -c copy` (nhanh, cắt theo keyframe) hoặc bỏ `-c copy` để cắt chính xác.

Tỉ lệ dọc 9:16 từ 16:9 (cắt giữa): `-vf "crop=ih*9/16:ih,scale=1080:1920"`.
GIF đẹp: `-vf "fps=15,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"`.
ProRes (làm việc tiếp trong NLE): `-c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le`.
WebM trong suốt (VP9 alpha): `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30`.
Poster/khung: `-ss 00:00:03 -frames:v 1 poster.png`. Xem thông tin: `ffprobe -hide_banner in.mp4`.

## Bộ xuất chuẩn cho video giới thiệu sản phẩm

1. **Master**: H.264 CRF 18, 1920x1080, 30 fps, `yuv420p`, `+faststart`, AAC 192k.
2. **Dọc 9:16** (Reels/Shorts/TikTok): dựng riêng bố cục nếu có thể (không chỉ cắt), xuất 1080x1920.
3. **Nhẹ cho web**: CRF 23, 1280x720 hoặc WebM VP9/AV1.
4. **GIF/WebP động** ngắn cho README/email, kèm **poster PNG**.
5. Đặt tên: `<product>-intro-<aspect>-<yyyymmdd>.mp4`.

Kiểm tra cuối: mở bằng trình phát thật, âm thanh đồng bộ (chênh < 40 ms), không clip, chữ không cắt ở tỉ lệ đích, dung lượng đúng nền tảng.
