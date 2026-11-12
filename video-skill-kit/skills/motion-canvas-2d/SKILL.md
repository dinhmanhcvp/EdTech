---
name: motion-canvas-2d
description: Dựng animation 2D vector bằng Motion Canvas (TypeScript, generator, editor trực quan) cho explainer và video giải thích. Dùng khi cần tween chính xác theo từng bước, đồ họa vector/sơ đồ/code động, hoặc người dùng nhắc "Motion Canvas".
---

# Motion Canvas

Thư viện TypeScript vẽ animation 2D trên canvas; cảnh là **generator function**, mỗi `yield*` là một bước thời gian. Có editor web để scrub timeline và xuất video. Phù hợp explainer, sơ đồ, giải thích code/khái niệm. (Phiên bản và API đổi theo thời gian: đối chiếu motioncanvas.io trước khi dùng cú pháp cụ thể.)

## Khởi tạo

```bash
npm init @motion-canvas@latest      # tạo project + editor
npm install && npm start            # mở editor (thường http://localhost:9000)
```

## Cảnh cơ bản

```tsx
import {makeScene2D, Rect, Circle, Txt} from '@motion-canvas/2d';
import {all, createRef, waitFor, easeOutCubic} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  const box = createRef<Rect>();
  const label = createRef<Txt>();

  view.add(
    <>
      <Rect ref={box} width={0} height={0} radius={24} fill="#6D5EF5" />
      <Txt ref={label} text="Socratic AI" fill="white" fontSize={0} />
    </>,
  );

  yield* all(
    box().size([360, 200], 0.6, easeOutCubic),     // tween thuộc tính trong 0,6s
    label().fontSize(64, 0.6, easeOutCubic),
  );
  yield* waitFor(1);
  yield* box().position.x(300, 0.8);                // thuộc tính là hàm: gọi để tween
});
```

Đăng ký cảnh trong `src/project.ts`: `makeProject({scenes: [intro]})`.

## Công cụ thường dùng

- **Tuần tự / song song:** `yield*` nối tiếp; `all(...)` cùng lúc; `chain(...)`; `sequence(0.1, ...)` so le (stagger); `delay(t, anim)`.
- **Dòng:** `createRef`, `createSignal` (giá trị phản ứng), `Layout` flex (`layout`, `direction`, `gap`).
- **Hình/Chữ:** `Rect`, `Circle`, `Line`, `Path`, `Img`, `Txt`, `Code` (animate đổi code có highlight, rất hợp video kỹ thuật), `Latex`.
- **Easing:** `easeInOutCubic`, `easeOutBack`, `linear`..., truyền làm tham số thứ ba.
- **Thời gian:** `waitFor(s)`, `waitUntil('tên')` (đặt điểm neo đồng bộ với thoại/âm nhạc trên editor).
- **Âm thanh:** gắn file audio trong scene/project để đồng bộ trong editor.

## Xuất video

Trong editor có tab Render: xuất **chuỗi ảnh** hoặc video qua plugin FFmpeg exporter; hoặc render ảnh tuần tự rồi ghép bằng FFmpeg (xem `audio-and-export`):

```bash
ffmpeg -framerate 60 -i output/%06d.png -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart out.mp4
```

## Chọn Motion Canvas khi

Cần kiểm soát từng giây bằng đoạn code tuần tự, đồ họa vector, sơ đồ/code động, ít 3D. Với dữ liệu lớn, nhiều biến thể, tích hợp React hoặc 3D, dùng `remotion-video`.
