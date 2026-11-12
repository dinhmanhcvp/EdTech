---
name: web-animation-gsap-motion
description: Hoạt ảnh bằng GSAP, anime.js (v4) và Motion (motion.dev, gồm Motion AI Kit) cho typography, UI, SVG, timeline dựng nhịp. Dùng khi cần animate trang giới thiệu, hero, cảnh video HTML (HyperFrames) hoặc chọn thư viện hoạt ảnh phù hợp.
---

# GSAP · anime.js · Motion

## Chọn nhanh

| Thư viện | Dùng khi | Điểm mạnh |
|---|---|---|
| **GSAP** | Timeline phức tạp, video HTML, SVG, scroll | Timeline + position parameter, stagger, plugin (SplitText, DrawSVG, MorphSVG, Flip, MotionPath, ScrollTrigger). Hiện miễn phí kể cả plugin (kiểm tra điều khoản hiện hành) |
| **anime.js v4** | Nhẹ, SVG draw/morph, timeline đơn giản | API gọn, `svg.createDrawable`, `stagger` |
| **Motion** (`motion`, `motion/react`) | UI React/web, spring, layout animation, gesture, scroll | Spring tự nhiên, `layout`/shared element, GPU-accelerated |
| Remotion `interpolate`/`spring` | Video Remotion | Tất định theo frame, dùng thay ba cái trên |

**Video render theo frame:** timeline phải seek được (GSAP `paused: true`, anime.js `autoplay: false`). Motion chạy theo thời gian thật: dùng cho web/preview, không dùng trong Remotion.

## GSAP

```js
import gsap from "gsap";
gsap.defaults({ ease: "power3.out", duration: 0.7 });

const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
tl.from(".title .word", { yPercent: 120, opacity: 0, stagger: 0.07 }, 0)   // tuyệt đối 0s
  .from(".card", { y: 60, opacity: 0, stagger: { each: 0.12, from: "start" } }, "-=0.3") // chồng lấn
  .to(".bg", { scale: 1.08, duration: 6, ease: "none" }, 0)
  .addLabel("cta", ">+=0.4")
  .from(".cta", { scale: 0.7, opacity: 0, ease: "back.out(2)" }, "cta");

tl.seek(2.5);      // tua đến 2,5 giây (video render)
tl.play();         // chạy thật (web)
```

- Position parameter: số = tuyệt đối; `"+=0.5"` sau cuối 0,5s; `"<"` cùng lúc với tween trước; `">"` ngay sau; `"label+=0.2"`.
- Ease nhanh: vào = `power3.out`/`expo.out`; ra = `power2.in`; nảy = `back.out(1.7)`; đàn hồi = `elastic.out(1, 0.4)`; liên tục = `none`; spring thật dùng `CustomEase`.
- Chữ: SplitText tách ký tự/từ/dòng (`new SplitText(el, {type:"chars,words"})`), sau đó stagger.
- SVG: DrawSVG vẽ nét (`fromTo(path,{drawSVG:"0%"},{drawSVG:"100%"})`), MorphSVG biến hình, MotionPath cho chuyển động theo đường.
- React: `@gsap/react` → `useGSAP(() => {...}, {scope: ref})` để tự dọn.
- Hiệu năng: chỉ animate `transform`/`opacity`, đặt `will-change` có chọn lọc, `gsap.ticker.lagSmoothing(0)` khi render/ghi hình.

## anime.js v4

```js
import { animate, createTimeline, stagger, svg } from "animejs";

animate(".dot", { y: [40, 0], opacity: [0, 1], delay: stagger(60), duration: 700, ease: "outExpo" });

const tl = createTimeline({ autoplay: false, defaults: { ease: "outQuad", duration: 600 } });
tl.add(".title", { opacity: [0, 1], y: [30, 0] }, 0)
  .add(svg.createDrawable(".line"), { draw: ["0 0", "0 1"] }, 300);   // vẽ nét SVG
tl.seek(1200);   // ms
```

Lưu ý: v4 đổi API so với v3 (`animate`, `createTimeline`, ease dạng chuỗi như `"outExpo"`, đơn vị ms). Khi không chắc, tra tài liệu animejs.com thay vì dùng cú pháp v3 `anime({...})`.

## Motion (motion.dev)

```tsx
import { motion, stagger, animate, useScroll } from "motion/react";

<motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", visualDuration: 0.5, bounce: 0.25 }} />

// Vanilla
import { animate, stagger } from "motion";
animate(".item", { opacity: [0, 1], y: [20, 0] }, { delay: stagger(0.08), duration: 0.5 });
```

- Shared element / chuyển layout: prop `layout`, `layoutId`.
- Scroll: `useScroll`, `scroll()`, `inView()`.
- Spring chọn theo cảm giác: `visualDuration` + `bounce` dễ hơn `stiffness/damping`.

### Motion AI Kit (trả phí, thuộc Motion+)
Bộ công cụ nạp kiến thức Motion mới nhất cho agent: skill `/motion` (đã gộp ở bản 6.x), MCP tra cứu tài liệu (có tầng miễn phí), **MotionScore** chấm hiệu năng hoạt ảnh (cho cả CSS/GSAP), sinh đường cong spring `linear()` cho CSS, trình sửa transition. Cài theo hướng dẫn chính thức tại motion.dev/docs/ai-kit-install; **không chạy lệnh cài kiểu `curl | bash` trước khi đọc kỹ**. Nếu không có giấy phép Motion+, bỏ qua và dùng tài liệu công khai.

## Nguyên tắc chuyển động cho video giới thiệu

- Mỗi phần tử vào: 0,4-0,8s, ease out; ra nhanh hơn vào.
- Stagger 0,05-0,12s; không quá 8 phần tử một lượt.
- Một "chủ thể chuyển động" tại một thời điểm; mắt người chỉ theo kịp một thứ.
- Giữ nhịp theo nhạc (bội số của beat), đặt cắt/nhấn đúng beat.
- Chữ đọc được: giữ yên tối thiểu ~1 giây cho mỗi cụm 3-4 từ sau khi hiện xong.
