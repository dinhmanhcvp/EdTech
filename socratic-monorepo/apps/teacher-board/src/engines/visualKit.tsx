'use client';

import React, {useEffect, useId, useRef, useState} from 'react';

/**
 * Lớp trình bày dùng chung cho các engine SVG (gradient, đổ bóng, chuyển động mượt).
 * Chỉ thay đổi cách VẼ: mọi số liệu vẫn đến từ mô hình trong utils/*Models.ts.
 */

/** Mã định danh ổn định, dùng làm tiền tố id của gradient/filter để nhiều widget không đè nhau. */
export function useUid(): string {
  return 'vk' + useId().replace(/[^a-zA-Z0-9]/g, '');
}

/** Người dùng bật "giảm chuyển động" (hoặc môi trường không có matchMedia) → hình đứng yên. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/**
 * Làm mượt một đại lượng vẽ (độ cao piston, độ dày điện cực...) theo hàm mũ.
 * `rate` càng lớn càng nhanh (≈ 1/rate giây để đi 63 % quãng đường). Giảm chuyển động → nhảy thẳng tới đích.
 */
export function useEased(target: number, rate = 10): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const cur = useRef(target);
  const tgt = useRef(target);
  tgt.current = target;

  useEffect(() => {
    if (reduced) {
      cur.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      const d = tgt.current - cur.current;
      if (Math.abs(d) < 1e-4) {
        cur.current = tgt.current;
        setValue(cur.current);
        return;
      }
      cur.current += d * (1 - Math.exp(-rate * dt));
      setValue(cur.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, rate]);

  return reduced ? target : value;
}

/** Hạt cầu có đổ bóng ba tông (sáng – gốc – tối) từ một màu gốc. */
export const SphereGrad: React.FC<{id: string; light: string; base: string; dark: string}> = ({id, light, base, dark}) => (
  <radialGradient id={id} cx="0.36" cy="0.32" r="0.8">
    <stop offset="0" stopColor={light} />
    <stop offset="0.55" stopColor={base} />
    <stop offset="1" stopColor={dark} />
  </radialGradient>
);

/**
 * Bộ gradient/filter dùng chung. Đặt trong <defs>, tham chiếu bằng url(#${id}-tên).
 *  - glass: lớp phủ thủy tinh (viền sáng hai bên, thân trong)
 *  - metal: lớp phủ trụ kim loại (sáng giữa, tối hai mép) — phủ lên màu gốc của kim loại
 *  - steel: thép xám cho piston/thanh truyền
 *  - halo: quầng sáng của bóng đèn/ngọn lửa
 *  - soft: bóng đổ mềm
 */
export const VisualDefs: React.FC<{id: string}> = ({id}) => (
  <>
    <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
      <stop offset="0.14" stopColor="#fff" stopOpacity="0.08" />
      <stop offset="0.82" stopColor="#fff" stopOpacity="0" />
      <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
    </linearGradient>
    <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#000" stopOpacity="0.28" />
      <stop offset="0.35" stopColor="#fff" stopOpacity="0.4" />
      <stop offset="0.6" stopColor="#fff" stopOpacity="0.05" />
      <stop offset="1" stopColor="#000" stopOpacity="0.32" />
    </linearGradient>
    <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#E7E5E4" />
      <stop offset="0.45" stopColor="#A8A29E" />
      <stop offset="1" stopColor="#57534E" />
    </linearGradient>
    <radialGradient id={`${id}-halo`}>
      <stop offset="0" stopColor="#FDE047" stopOpacity="0.85" />
      <stop offset="0.5" stopColor="#FACC15" stopOpacity="0.3" />
      <stop offset="1" stopColor="#FACC15" stopOpacity="0" />
    </radialGradient>
    <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="150%">
      <feGaussianBlur stdDeviation="3" />
    </filter>
  </>
);

/** Bóng đổ elip mờ dưới một vật đặt trên mặt bàn. */
export const GroundShadow: React.FC<{id: string; cx: number; cy: number; rx: number; ry?: number; opacity?: number}> = ({id, cx, cy, rx, ry = 6, opacity = 0.16}) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#292524" opacity={opacity} filter={`url(#${id}-soft)`} pointerEvents="none" />
);

// ------------------------------------------------------------------ thanh trượt dùng chung
/** Lớp Tailwind cho thanh trượt: rãnh đậm dần theo giá trị (dùng kèm `rangeFill`), núm tròn lớn dễ chạm trên bảng. */
export const RANGE_CLASS =
  'appearance-none h-2 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-blue-600 [&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110 ' +
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white ' +
  '[&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-blue-600 [&::-moz-range-thumb]:shadow-md';

export const rangeFill = (value: number, min: number, max: number, color = '#2563EB'): React.CSSProperties => {
  const p = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return {background: `linear-gradient(to right, ${color} ${p}%, #E7E5E4 ${p}%)`};
};

// ------------------------------------------------------------------ đường cong biểu đồ
/** Đường cong có quầng mờ phía dưới và đầu nét tròn: nhìn "mềm" hơn nét đơn 2 px, vẫn đọc được số liệu. */
export const CurvePath: React.FC<{d: string; color: string; width?: number; dashed?: string; testid?: string}> = ({d, color, width = 2.2, dashed, testid}) => (
  <g>
    <path d={d} fill="none" stroke={color} strokeWidth={width + 4.5} opacity="0.12" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed} data-testid={testid} />
  </g>
);

/** Nền biểu đồ: trắng dịu chuyển nhẹ sang kem, thay cho nền trắng phẳng. */
export const CHART_BG = 'bg-gradient-to-b from-white to-[#FAF9F6]';

// ------------------------------------------------------------------ canvas sắc nét
/**
 * Canvas có kích thước logic cố định (vd. 620×340) nhưng bị CSS kéo giãn theo bảng: trên màn hình lớn hoặc DPR cao
 * hình bị mờ. Hàm này tăng độ phân giải nền (tối đa ×3) và đặt phép biến đổi để mã vẽ vẫn dùng tọa độ logic.
 * Gọi ngay sau khi lấy ctx; mã vẽ phải dùng lw/lh thay cho canvas.width/height.
 */
export function setupHiDpiCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, lw: number, lh: number): void {
  const shown = canvas.clientWidth || lw;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const k = Math.min(3, Math.max(1, dpr * (shown / lw)));
  const bw = Math.round(lw * k);
  const bh = Math.round(lh * k);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(bw / lw, 0, 0, bh / lh, 0, 0);
}
