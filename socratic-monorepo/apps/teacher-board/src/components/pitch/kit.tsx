'use client';
// Bộ khối dựng slide AXIOMA theo ngôn ngữ thiết kế Framer: nền đen sâu, quầng sáng màu, Inter đậm chữ khít,
// chữ chuyển sắc, thẻ bento viền mảnh có ánh sáng mép trên, ảnh sản phẩm nổi nghiêng 3D có quầng phát sáng.
import React from 'react';
import katex from 'katex';
import {Inter} from 'next/font/google';

const inter = Inter({subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700', '800']});
export const SANS = `${inter.style.fontFamily}, system-ui, sans-serif`;
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

export const C = {
  bg: '#000000',
  card: '#0B0B0D',
  card2: '#111114',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  sub: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.38)',
  blue: '#0099FF',
  violet: '#8855FF',
  pink: '#FF4D8D',
  amber: '#FFB547',
  green: '#3DDC97',
};
export const GRAD = 'linear-gradient(90deg, #4DB8FF 0%, #8855FF 55%, #FF4D8D 100%)';

export const Tex: React.FC<{tex: string; size?: number; color?: string}> = ({tex, size, color = C.text}) => (
  <span style={{fontSize: size, color}} dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {throwOnError: false, output: 'html'})}} />
);

/** Chữ chuyển sắc (dùng cho cụm nhấn). */
export const G: React.FC<{children: React.ReactNode; grad?: string}> = ({children, grad = GRAD}) => (
  <span style={{backgroundImage: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{children}</span>
);

/** Tiêu đề Framer: Inter đậm, chữ khít; *cụm* tô chuyển sắc. */
export const Head: React.FC<{text: string; size?: number; width?: number; center?: boolean; style?: React.CSSProperties}> = ({text, size = 84, width = 1500, center, style}) => (
  <h1 style={{fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.045, color: C.text, margin: 0, maxWidth: width, textAlign: center ? 'center' : 'left', ...style}}>
    {text.split(/(\*[^*]+\*)/).filter(Boolean).map((p, i) => (p.startsWith('*') ? <G key={i}>{p.slice(1, -1)}</G> : <React.Fragment key={i}>{p}</React.Fragment>))}
  </h1>
);

/** Viên nhãn có chấm màu (kiểu "● New" của Framer). */
export const Pill: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = C.blue, style}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 18px 9px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line2}`, fontFamily: SANS, fontSize: 18, fontWeight: 500, color: C.sub, ...style}}>
    <span style={{width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 12px ${color}`}} />
    {children}
  </div>
);

export const P: React.FC<{children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({children, size = 23, style}) => (
  <div style={{fontFamily: SANS, fontSize: size, lineHeight: 1.45, color: C.sub, letterSpacing: -0.2, ...style}}>{children}</div>
);

/** Số liệu cỡ lớn, có thể chuyển sắc. */
export const Big: React.FC<{children: React.ReactNode; size?: number; grad?: string; color?: string; style?: React.CSSProperties}> = ({children, size = 160, grad, color = C.text, style}) => (
  <div style={{fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 0.92, letterSpacing: -size * 0.055, fontVariantNumeric: 'tabular-nums', color, ...style}}>{grad ? <G grad={grad}>{children}</G> : children}</div>
);

/** Thẻ bento: nền gần đen, viền mảnh, ánh sáng mép trên, quầng màu tùy chọn ở góc. */
export const Card: React.FC<{children: React.ReactNode; glow?: string; style?: React.CSSProperties; pad?: number}> = ({children, glow, style, pad = 36}) => (
  <div
    style={{
      position: 'relative',
      borderRadius: 28,
      background: C.card,
      border: `1px solid ${C.line}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      padding: pad,
      overflow: 'hidden',
      ...style,
    }}
  >
    {glow && <div style={{position: 'absolute', right: -120, top: -160, width: 420, height: 420, borderRadius: 210, background: glow, filter: 'blur(90px)', opacity: 0.45, pointerEvents: 'none'}} />}
    <div style={{position: 'relative', height: '100%'}}>{children}</div>
  </div>
);

/**
 * Ảnh app thật nổi trong khung tối: cắt quanh (fx, fy) với độ phóng z, có thể nghiêng 3D và quầng sáng bên dưới.
 * Ảnh gốc 1920×1080 ở public/pitch/*.jpg.
 */
export const Shot: React.FC<{src: string; w: number; h: number; fx: number; fy: number; z: number; tilt?: number; glow?: string; radius?: number; style?: React.CSSProperties}> = ({src, w, h, fx, fy, z, tilt = 0, glow, radius = 22, style}) => {
  const iw = 1920 * z;
  const ih = 1080 * z;
  const left = Math.min(0, Math.max(w - iw, w / 2 - fx * iw));
  const top = Math.min(0, Math.max(h - ih, h / 2 - fy * ih));
  return (
    <div style={{position: 'relative', width: w, height: h, flex: 'none', perspective: 2200, ...style}}>
      {glow && <div style={{position: 'absolute', left: '10%', right: '10%', bottom: -40, height: '60%', background: glow, filter: 'blur(110px)', opacity: 0.55}} />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          overflow: 'hidden',
          background: '#F8F7F4',
          padding: 0,
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 50px 120px rgba(0,0,0,0.75), 0 0 0 8px rgba(255,255,255,0.03)',
          transform: tilt ? `rotateX(${tilt}deg)` : undefined,
          transformOrigin: 'center bottom',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/pitch/${src}.jpg`} alt="" style={{position: 'absolute', left, top, width: iw, height: ih, maxWidth: 'none'}} />
      </div>
    </div>
  );
};

export const Pin: React.FC<{x: number; y: number; n: string; color?: string}> = ({x, y, n, color = C.blue}) => (
  <div style={{position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: color, color: '#fff', fontFamily: SANS, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 8px ${color}40, 0 0 30px ${color}`}}>{n}</div>
);

export const Mark: React.FC<{size?: number}> = ({size = 64}) => (
  <svg width={size} height={size} viewBox="0 0 512 512" style={{flex: 'none'}}>
    <defs>
      <linearGradient id="axg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4DB8FF" />
        <stop offset="0.6" stopColor="#8855FF" />
        <stop offset="1" stopColor="#FF4D8D" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="120" fill="#111114" stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
    <path d="M 118 300 C 92 220, 150 128, 262 112 C 370 98, 438 158, 420 238 C 404 316, 318 370, 226 366 C 150 362, 108 330, 112 282 C 116 252, 140 230, 168 222" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeDasharray="1 17 1 25" opacity="0.7" />
    <path d="M 168 236 C 174 226, 180 218, 188 210 C 190 160, 226 136, 262 138 C 306 140, 330 168, 326 204 C 322 238, 292 250, 272 266 C 258 278, 254 292, 255 308" fill="none" stroke="url(#axg)" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="256" cy="380" r="22" fill={C.amber} />
  </svg>
);

/** Khung slide: nền đen, quầng sáng màu theo vị trí, lưới mờ cực nhẹ, thương hiệu + số trang. */
export const Frame: React.FC<{n: number; total: number; glows?: [number, number, string][]; children: React.ReactNode}> = ({n, total, glows = [[80, 0, C.blue]], children}) => (
  <div style={{position: 'relative', width: 1920, height: 1080, background: C.bg, overflow: 'hidden', fontFamily: SANS, color: C.text}}>
    {glows.map(([x, y, c], i) => (
      <div key={i} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, width: 1100, height: 760, marginLeft: -550, marginTop: -380, borderRadius: '50%', background: c, filter: 'blur(160px)', opacity: 0.28}} />
    ))}
    <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '120px 120px', maskImage: 'radial-gradient(ellipse at 50% 40%, black, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black, transparent 75%)'}} />
    <div style={{position: 'absolute', left: 100, top: 56, display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: -0.8}}>
      <Mark size={36} /> Axioma
    </div>
    <div style={{position: 'absolute', right: 100, top: 64, fontFamily: SANS, fontSize: 17, fontWeight: 500, color: C.faint, fontVariantNumeric: 'tabular-nums'}}>
      {String(n).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
    <div style={{position: 'absolute', left: 100, right: 100, top: 150, bottom: 90}}>{children}</div>
  </div>
);
