---
name: remotion-video
description: Dựng video 2D lập trình bằng Remotion (React) - composition, interpolate/spring, Sequence/Series/TransitionSeries, media, font, audio, props động, render CLI/Lambda. Dùng khi tạo, sửa hoặc render video bằng Remotion, hoặc khi người dùng nói "Remotion", "video bằng React".
---

# Remotion

Video là hàm của frame: `UI = f(frame)`. Mọi thứ nhìn thấy phải suy ra từ `useCurrentFrame()`. Skill chính thức tham khảo thêm: `npx skills add remotion-dev/skills` (có `remotion-best-practices`, `remotion-docs`, `remotion-captions`...). Khi API không chắc, tra tài liệu hiện hành (remotion.dev/docs) vì phiên bản thay đổi.

## Khởi tạo

```bash
npx create-video@latest          # chọn template (Blank, TypeScript)
npx remotion studio              # preview có hot reload
npx remotion render <CompId> out/video.mp4
npx remotion still <CompId> out/frame.png --frame=45
```

Cấu trúc: `src/Root.tsx` đăng ký các `<Composition>`; mỗi composition là một component.

```tsx
import {Composition} from 'remotion';
export const Root = () => (
  <Composition
    id="ProductIntro"
    component={ProductIntro}
    durationInFrames={30 * 30}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{title: 'Socratic AI', accent: '#6D5EF5'}}
  />
);
```

## Quy tắc vàng (lỗi hay gặp)

1. **Không dùng CSS `transition`/`animation`, không `setTimeout`/`requestAnimationFrame`, không `Date.now()`**, không class Tailwind `animate-*`. Chúng chạy theo đồng hồ, không theo frame nên render sẽ lệch hoặc nháy.
2. Mọi chuyển động = `interpolate` hoặc `spring` theo `frame`.
3. **Luôn `clamp`** khi nội suy: `{extrapolateLeft:'clamp', extrapolateRight:'clamp'}`.
4. Dùng giây nhân fps thay vì số frame cứng: `const {fps} = useVideoConfig(); const t = frame / fps;`.
5. Random phải có seed: `random('seed-' + i)` từ `remotion`, không `Math.random()`.
6. Tải font/ảnh/dữ liệu bất đồng bộ phải chặn render bằng `delayRender()` / `continueRender()` (hoặc dùng `@remotion/fonts`, `@remotion/google-fonts`, hook preload).
7. Media dùng `staticFile('x.mp4')` cho file trong `public/`; ưu tiên component media của Remotion (`<Img>`, `<Audio>`, `<OffthreadVideo>` hoặc `<Video>` từ `@remotion/media` ở bản mới) thay vì thẻ HTML thô.

## Công cụ thời gian

```tsx
import {AbsoluteFill, Sequence, Series, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

const Title = ({text}: {text: string}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 200}});        // 0 -> 1, mượt không nảy
  const y = interpolate(enter, [0, 1], [40, 0]);
  const fade = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <h1 style={{opacity: fade, transform: `translateY(${y}px)`}}>{text}</h1>;
};

export const Intro = () => (
  <AbsoluteFill style={{background: '#0B0B12'}}>
    <Series>
      <Series.Sequence durationInFrames={90}><Hook /></Series.Sequence>
      <Series.Sequence durationInFrames={120}><Feature /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
```

- `<Sequence from={30} durationInFrames={60}>`: con nhận `useCurrentFrame()` bắt đầu từ 0 (cục bộ).
- `spring` preset: mượt `{damping:200}`, nảy nhẹ `{damping:12}`, "snappy" `{damping:20, stiffness:200}`.
- Chuyển cảnh: `@remotion/transitions` (`TransitionSeries`, `fade()`, `slide()`, `wipe()`, `linearTiming`/`springTiming`); chuyển cảnh trừ thời lượng chồng lấn khỏi tổng.
- Stagger: `delay: i * 4` trong `spring`, hoặc `frame - i * 4`.
- Số đếm: `Math.round(interpolate(frame,[0,60],[0,12000],{extrapolateRight:'clamp'}))` + `toLocaleString`.

## Dữ liệu & biến thể

- `defaultProps` + schema `zod` cho chỉnh trong Studio; `--props='{"title":"..."}'` khi render.
- Thời lượng theo dữ liệu: `calculateMetadata` trên `<Composition>` (đọc audio, API, số mục).
- Render hàng loạt: vòng lặp gọi `npx remotion render` với `--props`, hoặc API Node `@remotion/renderer` (`bundle`, `selectComposition`, `renderMedia`).

## Media, âm thanh, 3D, vector

- Âm thanh: `<Audio src={staticFile('music.mp3')} volume={(f) => interpolate(f,[0,15],[0,0.4],{extrapolateRight:'clamp'})} />`; ducking = hàm volume theo frame. Phân tích: `@remotion/media-utils`.
- Lottie: `@remotion/lottie` (`<Lottie animationData=... />`, đồng bộ theo frame). Three.js: `@remotion/three` (`<ThreeCanvas>`), xem `threejs-r3f-3d`. Phụ đề: `@remotion/captions`. Hình dạng SVG: `@remotion/shapes`, `@remotion/paths` (animate đường đi, `evolvePath`).
- GSAP/anime.js: chỉ dùng được nếu timeline đặt `paused` và `seek` theo frame (xem `web-animation-gsap-motion`); với Remotion thường dùng `interpolate`/`spring` là đủ.

## Render và hiệu năng

- Mã hóa: `--codec=h264` (mặc định), `prores`, `vp9`; âm thanh AAC. Ví dụ: `npx remotion render ProductIntro out.mp4 --crf=18 --concurrency=50%`.
- WebGL/Three trong render: dùng `--gl=angle` (tránh lỗi GPU) khi gặp vấn đề.
- Chậm: giảm `concurrency`, dùng ảnh/video đã nén đúng kích thước, `<OffthreadVideo>` thay `<video>`, tránh `box-shadow`/`filter: blur` lớn trên nhiều lớp.
- Đám mây: `@remotion/lambda` hoặc Cloud Run cho bản lớn.
- Vì sao hình bị nháy giữa các frame: có animation theo đồng hồ (quy tắc 1) hoặc font/ảnh chưa nạp (quy tắc 6).

## Checklist dựng cảnh

- [ ] Mỗi scene là một component, thời lượng đặt trong hằng số `SCENES = {hook: 90, ...}` và tổng khớp `durationInFrames`
- [ ] Mọi `interpolate` có clamp
- [ ] Font nạp trước; không có `Math.random`
- [ ] Preview ở Studio với tốc độ thật rồi mới render
