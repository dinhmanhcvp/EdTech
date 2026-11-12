import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {FONT} from '../theme';

// Bộ hiệu ứng "keynote": nền studio tối (đèn rọi + hạt phim + vignette, không lưới/hạt bay/blob màu),
// quét sáng phản chiếu, chữ trượt có nhòe chuyển động ngang, bộ lọc nhòe một chiều cho whip pan.

export const INK = '#F5F5F7';
export const DIM = 'rgba(245,245,247,0.56)';

/** Bộ lọc SVG nhòe theo một trục (CSS blur() chỉ nhòe đều). Dùng filter: url(#dirblur-<px>). */
export const DirBlurDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      {[6, 14, 28, 48, 80].map((px) => (
        <filter key={px} id={`dirblur-${px}`} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation={`${px} 0`} />
        </filter>
      ))}
    </defs>
  </svg>
);
export const dirBlur = (px: number) => {
  const steps = [6, 14, 28, 48, 80];
  if (px < 3) return 'none';
  const s = steps.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a));
  return `url(#dirblur-${s})`;
};

/** Hạt phim động (đổi mầm mỗi frame) – làm hình "có chất liệu", bớt cảm giác đồ họa phẳng. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity}}>
      <svg width="100%" height="100%">
        <filter id={`grain-${f % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${f % 6})`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Nền studio: đen than ấm, một đèn rọi mềm phía sau sản phẩm, sàn tối, vignette. */
export const StudioBg: React.FC<{spot?: {x: number; y: number}; tint?: string; intensity?: number}> = ({spot = {x: 62, y: 42}, tint = '#8FA8FF', intensity = 1}) => {
  const t = useSec();
  const sx = spot.x + Math.sin(t / 7) * 1.5;
  const sy = spot.y + Math.cos(t / 9) * 1.2;
  return (
    <AbsoluteFill style={{background: '#070708'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 820px at ${sx}% ${sy}%, rgba(255,255,255,${0.085 * intensity}), transparent 70%),
            radial-gradient(900px 600px at ${sx}% ${sy + 8}%, ${tint}${Math.round(18 * intensity).toString(16).padStart(2, '0')}, transparent 72%),
            linear-gradient(180deg, #0B0B0D 0%, #070708 62%, #050506 100%)`,
        }}
      />
      {/* đường chân trời sàn rất mảnh */}
      <div style={{position: 'absolute', left: 0, right: 0, top: '86%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Vệt sáng phản chiếu quét chéo qua bề mặt (kính cửa sổ, chữ lớn) một lần tại `at`. */
export const LightSweep: React.FC<{at: number; dur?: number; radius?: number; strength?: number}> = ({at, dur = 1.1, radius = 0, strength = 0.22}) => {
  const t = useSec();
  const p = ramp(t, at, dur, Easing.inOut(Easing.cubic));
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          bottom: '-30%',
          width: '28%',
          left: `${lerp(-40, 120, p)}%`,
          transform: 'skewX(-22deg)',
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${strength}), transparent)`,
        }}
      />
    </div>
  );
};

/**
 * Chữ trượt ngang kiểu Flow ("Build environments."): cả dòng lướt vào từ trái với nhòe chuyển động ngang,
 * phanh mềm; *từ* trong dấu sao được tô màu nhấn. Ra bằng trượt tiếp sang phải + nhòe.
 */
export const SlideText: React.FC<{
  text: string;
  at: number;
  out?: number;
  size?: number;
  accent?: string;
  weight?: number;
  from?: 'left' | 'right';
  color?: string;
  style?: React.CSSProperties;
}> = ({text, at, out = 1e9, size = 120, accent = '#9DB4FF', weight = 700, from = 'left', color = INK, style}) => {
  const t = useSec();
  const pin = ramp(t, at, 0.75, Easing.out(Easing.exp));
  const pout = ramp(t, out, 0.45, Easing.in(Easing.cubic));
  if (t < at - 0.05 || pout >= 1) return null;
  const dir = from === 'left' ? -1 : 1;
  const x = dir * (1 - pin) * 260 - dir * pout * 200;
  const blur = (1 - pin) * 60 + pout * 50;
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: -size * 0.03,
        lineHeight: 1.04,
        color,
        whiteSpace: 'nowrap',
        transform: `translateX(${x}px)`,
        filter: dirBlur(blur),
        opacity: Math.min(1, pin * 1.6) * (1 - pout),
        ...style,
      }}
    >
      {parts.map((p, i) =>
        p.startsWith('*') ? (
          <span key={i} style={{color: accent}}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};

/** Viền sáng mảnh quanh một khung (trạng thái "đang chọn" trong Flow), hiện rồi tắt. */
export const SelectGlow: React.FC<{at: number; dur?: number; radius?: number}> = ({at, dur = 1.6, radius = 24}) => {
  const t = useSec();
  const o = Math.min(ramp(t, at, 0.25), 1 - ramp(t, at + dur - 0.4, 0.4));
  if (o <= 0) return null;
  return <div style={{position: 'absolute', inset: -3, borderRadius: radius + 3, border: '2px solid rgba(255,255,255,0.85)', boxShadow: '0 0 30px rgba(255,255,255,0.35)', opacity: o, pointerEvents: 'none'}} />;
};

/** Thanh letterbox điện ảnh (2.39:1) trượt vào. */
export const Letterbox: React.FC<{p: number}> = ({p}) => {
  const h = 128 * p;
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000'}} />
    </>
  );
};
