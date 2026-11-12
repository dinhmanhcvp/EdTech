import React from 'react';
import {AbsoluteFill, Easing, Img, staticFile} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {BlurText} from './BlurText';
import {TILES} from './tiles';

// Mở đầu kiểu "Every story / Starts with vision" của Flow, dựng bằng chính khung hình app:
// đám thẻ trôi trong chiều sâu → hội tụ thành bức tường nghiêng → camera lao vào thẻ giữa (khớp khung đầu của cảnh sau).
export const OPEN_DUR = 8.2;
const TW = 384;
const TH = 216;
const COLS = 7;
const ROWS = 5;
const GAP_X = 404;
const GAP_Y = 236;
const CENTER = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);

const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const CardCloud: React.FC<{converge?: number}> = ({converge = 4.4}) => {
  const t = useSec();
  const fadeIn = ramp(t, 0, 1.2);
  const conv = ramp(t, converge, 2.0, Easing.inOut(Easing.cubic));
  const push = ramp(t, 6.75, 1.25, Easing.inOut(Easing.cubic));
  // tường nghiêng nhẹ rồi trả về phẳng khi camera lao vào
  const wallRX = lerp(16, 0, push);
  const wallRY = lerp(-14, 0, push);
  const zoom = lerp(1, 1920 / TW, push);
  const cx = (CENTER % COLS) - (COLS - 1) / 2;
  const cy = Math.floor(CENTER / COLS) - (ROWS - 1) / 2;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{perspective: 1500, opacity: fadeIn}}>
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 540,
            transformStyle: 'preserve-3d',
            transform: `scale(${zoom}) rotateX(${wallRX * conv}deg) rotateY(${wallRY * conv}deg) translate(${-cx * GAP_X * push}px, ${-cy * GAP_Y * push}px)`,
          }}
        >
          {TILES.map((name, i) => {
            // thẻ giữa luôn là khung đầu của cảnh viết tay để cú lao vào khớp hình
            const isCenter = i === 0;
            const slot = isCenter ? CENTER : i <= CENTER ? i - 1 : i;
            const inGrid = slot < COLS * ROWS;
            // vị trí trong đám mây: rải rộng, trôi về phía camera
            const z0 = -2600 + rnd(i, 1) * 2600;
            const z = z0 + t * 260;
            const x0 = (rnd(i, 2) - 0.5) * 3400;
            const y0 = (rnd(i, 3) - 0.5) * 1900;
            const rx = (rnd(i, 4) - 0.5) * 70 + t * 6;
            const ry = (rnd(i, 5) - 0.5) * 80 - t * 5;
            const rz = (rnd(i, 6) - 0.5) * 50;
            const gx = ((slot % COLS) - (COLS - 1) / 2) * GAP_X;
            const gy = (Math.floor(slot / COLS) - (ROWS - 1) / 2) * GAP_Y;
            const delay = rnd(i, 7) * 0.35;
            const p = inGrid ? ramp(t, converge + delay, 1.8, Easing.inOut(Easing.cubic)) : 0;
            const away = inGrid ? 0 : conv;
            const appear = ramp(t, rnd(i, 8) * 0.9, 0.8);
            const fadeOthers = isCenter ? 0 : ramp(t, 7.4, 0.5);
            return (
              <div
                key={name}
                style={{
                  position: 'absolute',
                  width: TW,
                  height: TH,
                  left: -TW / 2,
                  top: -TH / 2,
                  borderRadius: lerp(14, 4, push),
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                  background: '#111',
                  // ảnh app nền giấy rất sáng: hạ sáng để chữ trắng đọc được, trả lại sáng khi lao vào
                  filter: `brightness(${lerp(0.5, 1, push)})`,
                  opacity: appear * (1 - away) * (1 - fadeOthers),
                  transform: `translate3d(${lerp(x0, gx, p)}px, ${lerp(y0, gy, p)}px, ${lerp(z, 0, p) - away * 1500}px) rotateX(${lerp(rx, 0, p)}deg) rotateY(${lerp(ry, 0, p)}deg) rotateZ(${lerp(rz, 0, p)}deg)`,
                }}
              >
                <Img src={staticFile(isCenter ? 'flow/cold_first.jpg' : `flow/tiles/${name}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {/* chữ */}
      <AbsoluteFill style={{background: 'radial-gradient(900px 300px at 50% 50%, rgba(0,0,0,0.55), transparent 70%)', opacity: 1 - push}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <BlurText text="Mỗi bài giảng" at={1.5} out={converge - 0.2} size={128} stagger={0.35} />
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <BlurText text="bắt đầu từ một nét phấn." at={converge + 0.5} out={6.95} size={112} stagger={0.12} />
      </AbsoluteFill>
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65))', opacity: 1 - push}} />
    </AbsoluteFill>
  );
};
