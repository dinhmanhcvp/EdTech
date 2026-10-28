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
