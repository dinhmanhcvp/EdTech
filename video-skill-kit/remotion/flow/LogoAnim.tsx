import React, {useId} from 'react';
import {Easing, spring, useVideoConfig} from 'remotion';
import {lerp, ramp, useSec} from '../ui';
import {loadFont as loadSerif} from '@remotion/google-fonts/Newsreader';
import {loadFont as loadSans} from '@remotion/google-fonts/PlusJakartaSans';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

// Logo động theo brand/logo-mark.svg: nền giấy hiện ra → vòng lasso tự khoanh → nét bút dấu hỏi chạy
// → vật hổ phách rơi xuống, nảy nhẹ, để lại vệt. Phông chữ của chính app: Newsreader + Plus Jakarta Sans + JetBrains Mono.
const serif = loadSerif('italic', {weights: ['500'], subsets: ['vietnamese', 'latin']}).fontFamily;
const sans = loadSans('normal', {weights: ['700'], subsets: ['vietnamese', 'latin']}).fontFamily;
const mono = loadMono('normal', {weights: ['500'], subsets: ['vietnamese', 'latin']}).fontFamily;

const LASSO = 'M 118 300 C 92 220, 150 128, 262 112 C 370 98, 438 158, 420 238 C 404 316, 318 370, 226 366 C 150 362, 108 330, 112 282 C 116 252, 140 230, 168 222';
const HOOK = 'M 168 236 C 174 226, 180 218, 188 210 C 190 160, 226 136, 262 138 C 306 140, 330 168, 326 204 C 322 238, 292 250, 272 266 C 258 278, 254 292, 255 308';

/** Thời điểm (giây sau `at`) vật rơi chạm đáy – để canh tiếng impact. */
export const LOGO_LAND = 1.25;

export const LogoAnim: React.FC<{at: number; size?: number; tile?: boolean}> = ({at, size = 160, tile = true}) => {
  const t = useSec() - at;
  const {fps} = useVideoConfig();
  const id = useId().replace(/:/g, '');
  if (t < -0.05) return <div style={{width: size, height: size}} />;
  const appear = ramp(t, 0, 0.6, Easing.out(Easing.cubic));
  const lasso = ramp(t, 0.12, 0.75, Easing.inOut(Easing.cubic));
  const hook = ramp(t, 0.45, 0.6, Easing.inOut(Easing.quad));
  const drop = t > 0.95 ? spring({frame: Math.round((t - 0.95) * fps), fps, config: {damping: 9, stiffness: 160, mass: 0.6}}) : 0;
  const ballY = lerp(300, 380, drop);
  const ballOn = t > 0.95 ? 1 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{overflow: 'visible', opacity: appear, transform: `scale(${lerp(0.7, 1, appear)})`, filter: `blur(${(1 - appear) * 12}px)`}}>
      <defs>
        <mask id={`m${id}`}>
          <path d={LASSO} fill="none" stroke="#fff" strokeWidth={22} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lasso} />
        </mask>
      </defs>
      {tile && <rect width="512" height="512" rx="116" fill="#F8F7F4" />}
      <g mask={`url(#m${id})`}>
        <path d={LASSO} fill="none" stroke={tile ? '#18181B' : '#F5F5F7'} strokeWidth="9" strokeLinecap="round" strokeDasharray="1 17 1 25" opacity="0.85" />
      </g>
      <path d={HOOK} fill="none" stroke="#2563EB" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - hook} />
      <g opacity={ballOn}>
        <circle cx="255" cy={lerp(330, 336, drop)} r="5" fill="#D97706" opacity={0.35 * drop} />
        <circle cx="255" cy={lerp(318, 352, drop)} r="7" fill="#D97706" opacity={0.6 * drop} />
        <circle cx="256" cy={ballY} r="21" fill="#D97706" />
      </g>
    </svg>
  );
};

/** Chữ thương hiệu: *Socratic* (serif nghiêng) + Vision Board (sans đậm), dòng phụ mono giãn chữ. */
export const Wordmark: React.FC<{at: number; size?: number; color?: string; tagline?: string}> = ({at, size = 110, color = '#F5F5F7', tagline = 'NÉT PHẤN · THỰC TẠI'}) => {
  const t = useSec() - at;
  const a = ramp(t, 0, 0.7, Easing.out(Easing.exp));
  const b = ramp(t, 0.18, 0.7, Easing.out(Easing.exp));
  const c = ramp(t, 0.6, 0.6);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.16}}>
      <div style={{fontSize: size, lineHeight: 1, letterSpacing: -size * 0.025, color, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: serif, fontStyle: 'italic', fontWeight: 500, marginRight: size * 0.22, display: 'inline-block', opacity: a, transform: `translateX(${(1 - a) * -60}px)`, filter: `blur(${(1 - a) * 14}px)`}}>Socratic</span>
        <span style={{fontFamily: sans, fontWeight: 700, display: 'inline-block', opacity: b, transform: `translateX(${(1 - b) * 60}px)`, filter: `blur(${(1 - b) * 14}px)`}}>Vision Board</span>
      </div>
      {tagline && <div style={{fontFamily: mono, fontSize: size * 0.2, letterSpacing: size * 0.07, color, opacity: c * 0.6}}>{tagline}</div>}
    </div>
  );
};
