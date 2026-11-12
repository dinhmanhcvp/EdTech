import React from 'react';
import {Easing} from 'remotion';
import {ramp, useSec} from '../ui';
import {FONT} from '../theme';

/**
 * Chữ kiểu Flow: từng từ hiện ra từ mờ + phóng nhẹ (blur 18px → 0, scale 1.12 → 1), chữ trắng đậm vừa,
 * bóng mềm để nổi trên footage; ra bằng mờ dần + nở nhẹ.
 */
export const BlurText: React.FC<{
  text: string;
  at: number;
  out?: number;
  size?: number;
  stagger?: number;
  weight?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({text, at, out = 1e9, size = 120, stagger = 0.12, weight = 600, color = '#fff', style}) => {
  const t = useSec();
  const o = ramp(t, out, 0.45, Easing.in(Easing.cubic));
  if (t < at - 0.1 || o >= 1) return null;
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: -size * 0.025,
        lineHeight: 1.05,
        textShadow: '0 4px 40px rgba(0,0,0,0.55)',
        whiteSpace: 'nowrap',
        opacity: 1 - o,
        filter: `blur(${o * 16}px)`,
        transform: `scale(${1 + o * 0.06})`,
        ...style,
      }}
    >
      {text.split(' ').map((w, i) => {
        const p = ramp(t, at + i * stagger, 0.55, Easing.out(Easing.cubic));
        return (
          <span key={i} style={{display: 'inline-block', opacity: p, filter: `blur(${(1 - p) * 18}px)`, transform: `scale(${1.12 - 0.12 * p})`, whiteSpace: 'pre'}}>
            {w}
            {i < text.split(' ').length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};
