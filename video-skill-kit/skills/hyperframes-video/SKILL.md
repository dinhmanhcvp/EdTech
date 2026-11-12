---
name: hyperframes-video
description: Tạo video bằng HyperFrames (HeyGen, mã nguồn mở) - composition là file HTML với data attribute, hoạt ảnh bằng timeline GSAP (hoặc Lottie/Three/anime.js/WAAPI qua adapter), render ra MP4 qua headless Chrome + FFmpeg. Dùng khi cần video nhanh từ HTML, khi agent tự viết video, hoặc người dùng nhắc "hyperframes".
---

# HyperFrames

Mã nguồn: github.com/heygen-com/hyperframes, tài liệu: hyperframes.heygen.com. Yêu cầu Node.js >= 22 và FFmpeg. Render **tất định**: renderer tua (seek) từng frame trong Chrome headless rồi mã hóa bằng FFmpeg; không có bước build, `index.html` có thể mở trực tiếp.

## Lệnh

```bash
npx hyperframes init my-video       # tạo project
cd my-video
npx hyperframes preview             # xem trên trình duyệt, live reload
npx hyperframes render              # xuất MP4
npx hyperframes add data-chart      # thêm khối từ catalog (vd flash-through-white, instagram-follow)
npx hyperframes skills update       # cài/cập nhật skill cho agent (khuyên dùng)
```

Skill chính thức: `claude plugin marketplace add heygen-com/hyperframes` rồi `claude plugin install hyperframes@hyperframes` (gọi bằng `/hyperframes:hyperframes`), hoặc `npx skills add heygen-com/hyperframes`. Bộ lõi: `/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, `/media-use`; theo nhu cầu: `/figma`, `/slideshow`, `/remotion-to-hyperframes`. Cờ lệnh render không có trong README - chạy `npx hyperframes render --help` để biết.

## Định dạng composition (đúng theo README)

```html
<div id="stage" data-composition-id="launch" data-start="0" data-width="1920" data-height="1080">

  <video class="clip" data-start="0" data-duration="6" data-track-index="0"
         src="intro.mp4" muted playsinline></video>

  <h1 id="title" class="clip" data-start="1" data-duration="4" data-track-index="1">Launch day</h1>

  <audio data-start="0" data-duration="6" data-track-index="2" data-volume="0.5" src="music.wav"></audio>
</div>

<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script>
  const tl = gsap.timeline({ paused: true });          // BẮT BUỘC paused để renderer tua theo frame
  tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1);   // tham số 3 = thời điểm bắt đầu (giây)
  window.__timelines = window.__timelines || {};
  window.__timelines.launch = tl;                       // khóa phải KHỚP data-composition-id
</script>
```

- Thời gian tính bằng **giây** (`data-start`, `data-duration`).
- `data-track-index` = lớp xếp chồng/làn; số cao hơn nằm trên.
- Video luôn `muted playsinline`; âm thanh dùng thẻ `<audio>` riêng với `data-volume`.
- Adapter có sẵn: GSAP, CSS, Lottie, Three.js, anime.js, WAAPI, hoặc runtime tự viết ("frame adapter": hàm nhận thời gian, vẽ trạng thái tại thời điểm đó).

## Quy tắc tác giả (suy ra từ cơ chế render tất định)

1. Hoạt ảnh phải **seek được**: timeline `paused`, không dựa `setTimeout`/`Date.now()`/`requestAnimationFrame` tự do.
2. Không dùng `Math.random()` không seed; không phụ thuộc kết nối mạng lúc render (nhúng font/ảnh cục bộ thay vì CDN khi cần ổn định; GSAP qua CDN chỉ ổn khi có mạng - tốt hơn là cài về file local).
3. Mỗi cảnh một khối `.clip` có `data-start/data-duration`; để lộ/ẩn bằng thời lượng, không bằng JS đồng hồ thật.
4. Dựng nhịp trên timeline GSAP bằng position parameter (`"<"`, `"+=0.3"`, số tuyệt đối), đặt nhãn `tl.addLabel('feature1', 8)` để dễ chỉnh.
5. Kiểm tra bằng `preview` ở nhiều thời điểm trước khi `render`.

## Mẫu cảnh: tiêu đề + 3 tính năng

```js
const tl = gsap.timeline({ paused: true });
tl.from(".hook span", { yPercent: 110, stagger: 0.06, duration: 0.6, ease: "power4.out" }, 0.2)
  .to(".hook", { opacity: 0, y: -30, duration: 0.4, ease: "power2.in" }, 2.6)
  .from(".logo", { scale: 0.6, opacity: 0, duration: 0.7, ease: "back.out(1.7)" }, 3.2);
document.querySelectorAll(".feature").forEach((el, i) => {
  const t = 8 + i * 4;
  tl.from(el.querySelector("h2"), { x: -60, opacity: 0, duration: 0.5, ease: "power3.out" }, t)
    .from(el.querySelector(".ui"), { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, t + 0.15)
    .to(el, { opacity: 0, duration: 0.3 }, t + 3.7);
});
window.__timelines = { launch: tl };
```

## Khi nào dùng HyperFrames thay Remotion

HyperFrames: nhanh, HTML/CSS/GSAP thuần, agent dễ viết, có sẵn khối catalog. Remotion: nhiều biến thể dữ liệu lớn, hệ sinh thái React/Lambda, kiểm soát kiểu dữ liệu. Có skill `/remotion-to-hyperframes` để chuyển dự án sang.

Đọc thêm GSAP trong `web-animation-gsap-motion`; âm thanh/mux/xuất trong `audio-and-export`.
