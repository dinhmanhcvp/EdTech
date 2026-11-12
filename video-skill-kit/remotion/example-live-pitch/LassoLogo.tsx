import React from 'react';
import {ramp, useSec} from '../ui';
import {FONT} from '../theme';
import {expo} from './parts';
import {AXES, BACK, CUBE, FRONT} from './logoPaths';

// Logo chính thức "lasso cube" (public/sv/logo/c01-lasso-cube-mark.svg, từ slide-mau.zip) vẽ động:
// nửa sau vòng lasso → khối lập phương → trục chấm → nửa trước vòng lasso (viền kem che khối) → chấm đầu bút.
export const LOGO_INK = '#1B1F27';
export const LOGO_RED = '#A32C34';
export const LOGO_CREAM = '#FAF7F0';


const draw = (p: number) => ({strokeDasharray: 1, strokeDashoffset: 1 - p});

export const LassoMark: React.FC<{at: number; size?: number; halo?: string; ink?: string}> = ({at, size = 220, halo = LOGO_CREAM, ink = LOGO_INK}) => {
  const t = useSec();
  const back = ramp(t, at, 0.5, expo);
  const cube = ramp(t, at + 0.2, 0.8, expo);
  const axes = ramp(t, at + 0.7, 0.5);
  const front = ramp(t, at + 0.75, 0.55, expo);
  const dot = ramp(t, at + 1.2, 0.3, expo);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{overflow: 'visible'}}>
      <path d={AXES} pathLength={1} stroke="#4A525C" strokeWidth={2.4} strokeDasharray="0.1 5.2" strokeLinecap="round" fill="none" opacity={axes} />
      <path d={BACK} pathLength={1} stroke={LOGO_RED} strokeWidth={5.2} strokeLinecap="round" fill="none" style={draw(back)} />
      <path d={CUBE} pathLength={1} stroke={ink} strokeWidth={5.2} strokeLinejoin="round" strokeLinecap="round" fill="none" style={draw(cube)} />
      <path d={FRONT} pathLength={1} stroke={halo} strokeWidth={11.2} strokeLinecap="round" fill="none" style={draw(front)} />
      <path d={FRONT} pathLength={1} stroke={LOGO_RED} strokeWidth={5.2} strokeLinecap="round" fill="none" style={draw(front)} />
      <circle cx={16} cy={87.56} r={7.4 * dot} fill={halo} />
      <circle cx={16} cy={87.56} r={5.6 * dot} fill={LOGO_RED} />
    </svg>
  );
};

/** Lockup: mark + SOCRATIC VISION BOARD + dòng phụ, chữ hiện sau khi mark vẽ xong. */
/** onDark: chữ và khối trắng, viền đen (dùng trên nền tối như outro kiểu FlowCut). */
export const LassoLockup: React.FC<{at: number; scale?: number; tagline?: string; onDark?: boolean}> = ({at, scale = 1, tagline = 'THỰC NGHIỆM STEM & GIA SƯ SOCRATIC', onDark}) => {
  const t = useSec();
  const w = ramp(t, at + 1.0, 0.9, expo);
  const g = ramp(t, at + 1.4, 0.8, expo);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 44 * scale}}>
      <LassoMark at={at} size={230 * scale} {...(onDark ? {halo: '#000', ink: '#F5F5F7'} : {})} />
      <div style={{fontFamily: FONT, color: onDark ? '#F5F5F7' : LOGO_INK}}>
        <div style={{fontSize: 98 * scale, fontWeight: 800, letterSpacing: 3 * scale, lineHeight: 1, opacity: w, transform: `translateX(${(1 - w) * -30}px)`, filter: `blur(${(1 - w) * 10}px)`}}>
          SOCRATIC VISION BOARD
        </div>
        <div style={{fontSize: 34 * scale, fontWeight: 600, letterSpacing: 12 * scale, color: onDark ? 'rgba(245,245,247,0.6)' : '#4A525C', marginTop: 18 * scale, opacity: g}}>{tagline}</div>
      </div>
    </div>
  );
};
