---
name: vector-assets-svg-lottie-rive
description: Chuẩn bị và dùng tài sản vector/2D động cho video và web - tối ưu SVG bằng SVGO, tạo ảnh thẻ/end card/OG bằng Satori, hoạt ảnh Lottie (lottie-web, dotLottie) và Rive (state machine). Dùng khi cần logo/icon/minh họa SVG sạch để animate, sinh ảnh từ JSX, hoặc chèn Lottie/Rive vào video hay trang sản phẩm.
---

# SVGO · Satori · Lottie · Rive

## SVGO (tối ưu SVG mà vẫn animate được)

```bash
npx svgo -i logo.svg -o logo.min.svg
npx svgo -f ./svg-in -o ./svg-out --config svgo.config.mjs
```

```js
// svgo.config.mjs
export default {
  multipass: true,
  plugins: [
    { name: "preset-default", params: { overrides: {
        removeViewBox: false,   // giữ viewBox: bắt buộc để scale đúng
        cleanupIds: false,      // giữ id để GSAP/anime.js chọn được phần tử
    } } },
    "removeDimensions",         // bỏ width/height cứng, dùng viewBox
  ],
};
```

- Với SVG sẽ được animate: đặt tên nhóm bằng `id` có nghĩa (`#logo-mark`, `#wordmark`) **trước** khi chạy SVGO và bảo đảm `cleanupIds: false`; hoặc bật `prefixIds` nếu nhúng nhiều SVG vào một trang.
- Chuyển chữ thành path trong Figma/Illustrator trước khi xuất để không phụ thuộc font.
- Kiểm tra sau tối ưu: mở lại trong trình duyệt, so sánh với bản gốc (SVGO đôi khi gộp path làm hỏng morph).
- Vẽ nét (draw-on): path cần `stroke`, không `fill` phức tạp; dùng GSAP DrawSVG hoặc `svg.createDrawable` của anime.js.

## Satori (JSX → SVG → PNG)

Dựng ảnh tĩnh theo dữ liệu (end card, OG image, lower third, thẻ tính năng, số liệu) mà không cần trình duyệt.

```tsx
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";

const font = fs.readFileSync("./public/Inter-Bold.ttf");   // ttf/otf/woff; KHÔNG woff2
const svg = await satori(
  <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%",
                background: "#0B0B12", color: "#fff", padding: 64, justifyContent: "center" }}>
    <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>Socratic AI</div>
    <div style={{ display: "flex", fontSize: 32, opacity: 0.7 }}>Học bằng câu hỏi, không bằng đáp án</div>
  </div>,
  { width: 1920, height: 1080, fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }] }
);
const png = new Resvg(svg, { fitTo: { mode: "width", value: 1920 } }).render().asPng();
fs.writeFileSync("out/card.png", png);
```

Ràng buộc của Satori: chỉ **một tập con CSS** (flexbox, không grid); **mỗi `div` có nhiều con phải `display:"flex"`**; phải truyền font; ảnh nhúng bằng URL hoặc data URI; hỗ trợ prop `tw` (Tailwind) ở bản có hỗ trợ; không có JS/animation (là ảnh tĩnh). Chữ tiếng Việt cần font có đủ dấu (Inter, Be Vietnam Pro, Noto Sans).
Kết hợp video: sinh nhiều PNG từ Satori rồi đặt vào Remotion (`<Img>`) hoặc HyperFrames (`<img class="clip">`), animate bằng transform bên ngoài.

## Lottie

- Xuất từ After Effects (Bodymovin) hoặc LottieFiles; định dạng `.json` hoặc `.lottie` (dotLottie, nhỏ hơn).
- Web: `lottie-web` (`lottie.loadAnimation({container, path, loop:true, autoplay:true})`) hoặc `@lottiefiles/dotlottie-web` (nhẹ hơn, WASM).
- Video: **Remotion** dùng `@remotion/lottie` (`<Lottie animationData={json} />`, đồng bộ theo frame; tải JSON qua `fetch` + `delayRender`/`continueRender`); **HyperFrames** có adapter Lottie.
- Kiểm tra: Lottie không hỗ trợ mọi hiệu ứng AE (expressions phức tạp, một số blend/effects); preview trước khi dựa vào.
- Tối ưu: bỏ layer ẩn, ảnh raster nhúng nặng; `.lottie` thay `.json` khi tải trên web.

## Rive

- Làm trong Rive editor, xuất `.riv`; tương tác qua **state machine** (inputs: boolean, number, trigger).
- Web/React: `@rive-app/canvas` hoặc `@rive-app/react-canvas`:

```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
const { rive, RiveComponent } = useRive({ src: "/hero.riv", stateMachines: "Main", autoplay: true });
const hover = useStateMachineInput(rive, "Main", "hover");   // hover.value = true
```

- Dùng cho trang sản phẩm/app tương tác (nút, mascot, onboarding). Cho **video render theo frame**, Rive chạy theo thời gian thật nên khó tất định: quay hoặc xuất sang Lottie/ảnh tuần tự, hoặc dùng `@remotion/rive` nếu cần (tra tài liệu hiện hành).

## Chọn nhanh

| Cần | Dùng |
|---|---|
| Logo/icon sạch, nhẹ | SVG + SVGO |
| Thẻ/ảnh sinh theo dữ liệu | Satori |
| Hoạt ảnh làm sẵn từ designer (AE) | Lottie |
| Hoạt ảnh tương tác, mascot, trạng thái | Rive |
| Hoạt ảnh code tinh chỉnh từng frame | SVG + GSAP / anime.js / Remotion |
