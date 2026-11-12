'use client';

import React, {Suspense, useEffect, useId, useMemo, useState} from 'react';
import type {SceneData, Shape} from '../../utils/presets/types';
import {BTN, ControlPanel, PANEL, Readouts, initialP, initialS} from './Controls';
import {Slider} from '../StemModelEngines';

const INK = '#2B2823';
const fmt = (v: number) => v.toLocaleString('vi-VN', {maximumSignificantDigits: 4});

/** Màu mực mặc định và nét chữ trên nền tối: ánh sáng lạnh thay cho mực. */
const NIGHT_MAP: Record<string, string> = {'#2B2823': '#E8E6F5', '#44403C': '#E8E6F5', '#A39E93': '#8F8CB0', '#A8A29E': '#8F8CB0', '#E6E2D8': '#2C2F63', '#E7E5E4': '#2C2F63', '#1D1B16': '#05071A'};
const tone = (c: string | undefined, night: boolean) => (night && c && NIGHT_MAP[c.toUpperCase()] ? NIGHT_MAP[c.toUpperCase()] : c);
/** Trộn màu #RRGGBB về trắng (to = 255) hoặc đen (to = 0) theo tỉ lệ k: sắc độ sáng, tối của khối cầu. */
const mix = (hex: string, to: number, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + to * k).toString(16).padStart(2, '0')).join('');
const isInk = (c: string | undefined) => !c || c.toUpperCase() === '#2B2823' || c.toUpperCase() === '#44403C';

/**
 * Vẽ một hình của cảnh. Thẩm mỹ chung (học từ các bài trực quan của bai-giang): nét màu có quầng mờ như phát sáng nhẹ, khối cầu có điểm sáng cho có khối,
 * chữ có viền nền để luôn đọc được trên đường kẻ. `night` = sân khấu tối: mực đổi sang ánh sáng lạnh.
 */
export function renderShape(sh: Shape, i: number, night = false): React.ReactNode {
  const ink = night ? '#E8E6F5' : INK;
  switch (sh.t) {
    case 'line': {
      const col = tone(sh.stroke, night) ?? ink;
      const w = sh.w ?? 1.5;
      const L = Math.hypot(sh.x2 - sh.x1, sh.y2 - sh.y1);
      const glow = !isInk(sh.stroke) && w >= 2.2 && !sh.dash;
      const halo = glow ? <line x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} stroke={col} strokeWidth={w + 5} strokeLinecap="round" opacity={night ? 0.22 : 0.12} pointerEvents="none" /> : null;
      if (!sh.arrow || L < 1) return <g key={i}>{halo}<line x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} stroke={col} strokeWidth={w} strokeDasharray={sh.dash} strokeLinecap="round" /></g>;
      const ux = (sh.x2 - sh.x1) / L;
      const uy = (sh.y2 - sh.y1) / L;
      const hl = Math.min(10 + w * 2, L * 0.6);
      const bx = sh.x2 - ux * hl;
      const by = sh.y2 - uy * hl;
      return (
        <g key={i}>
          {halo}
          <line x1={sh.x1} y1={sh.y1} x2={bx} y2={by} stroke={col} strokeWidth={w} strokeDasharray={sh.dash} strokeLinecap="round" />
          <polygon points={`${sh.x2},${sh.y2} ${bx - uy * hl * 0.38},${by + ux * hl * 0.38} ${bx + uy * hl * 0.38},${by - ux * hl * 0.38}`} fill={col} />
        </g>
      );
    }
    case 'circle': {
      const fill = tone(sh.fill, night);
      const solid = !!fill && sh.o === undefined && /^#[0-9a-f]{6}$/i.test(fill) && sh.r >= 7 && sh.r <= 40;
      const gid = solid ? `sph${fill!.slice(1)}` : '';
      return (
        <g key={i}>
          {solid && (
            <defs>
              <radialGradient id={gid} cx="35%" cy="30%" r="78%">
                <stop offset="0" stopColor={mix(fill!, 255, 0.6)} />
                <stop offset="0.45" stopColor={fill} />
                <stop offset="1" stopColor={mix(fill!, 0, 0.38)} />
              </radialGradient>
            </defs>
          )}
          <circle cx={sh.cx} cy={sh.cy} r={sh.r} fill={solid ? `url(#${gid})` : fill ?? 'none'} stroke={tone(sh.stroke, night) ?? (sh.fill ? 'none' : ink)} strokeWidth={sh.w ?? 1.5} opacity={sh.o} />
          {solid && <circle cx={sh.cx - sh.r * 0.34} cy={sh.cy - sh.r * 0.38} r={sh.r * 0.15} fill="#FFFFFF" opacity={0.6} pointerEvents="none" />}
        </g>
      );
    }
    case 'rect':
      return <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} fill={tone(sh.fill, night) ?? 'none'} stroke={tone(sh.stroke, night) ?? (sh.fill ? 'none' : ink)} strokeWidth={sh.sw ?? 1.3} opacity={sh.o} />;
    case 'poly': {
      const pts = sh.pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
      const stroke = tone(sh.stroke, night);
      const glow = sh.close === false && !sh.fill && !isInk(sh.stroke) && (sh.w ?? 1.8) >= 2.2 && !sh.dash;
      return sh.close === false && !sh.fill ? (
        <g key={i}>
          {glow && <polyline points={pts} fill="none" stroke={stroke} strokeWidth={(sh.w ?? 1.8) + 5} strokeLinejoin="round" strokeLinecap="round" opacity={night ? 0.22 : 0.12} pointerEvents="none" />}
          <polyline points={pts} fill="none" stroke={stroke ?? ink} strokeWidth={sh.w ?? 1.7} strokeDasharray={sh.dash} strokeLinejoin="round" strokeLinecap="round" opacity={sh.o} />
        </g>
      ) : (
        <polygon key={i} points={pts} fill={tone(sh.fill, night) ?? 'none'} stroke={stroke ?? (sh.fill ? 'none' : ink)} strokeWidth={sh.w ?? 1.5} strokeDasharray={sh.dash} strokeLinejoin="round" opacity={sh.o} />
      );
    }
    case 'path':
      return <path key={i} d={sh.d} fill={tone(sh.fill, night) ?? 'none'} stroke={tone(sh.stroke, night) ?? (sh.fill ? 'none' : ink)} strokeWidth={sh.w ?? 1.7} strokeDasharray={sh.dash} strokeLinecap="round" strokeLinejoin="round" opacity={sh.o} />;
    case 'text':
      return (
        <text
          key={i}
          x={sh.x}
          y={sh.y}
          fontSize={Math.max(sh.size ?? 12, 11)}
          fill={tone(sh.fill, night) ?? ink}
          textAnchor={sh.anchor ?? 'middle'}
          fontWeight={sh.bold ? 600 : 400}
          stroke={night ? '#080B24' : '#FBF9F4'}
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
          transform={sh.rot ? `rotate(${sh.rot} ${sh.x} ${sh.y})` : undefined}
        >
          {sh.s}
        </text>
      );
  }
}

/** Mọi hình của cảnh: khối và nét nằm trong một lớp có bóng đổ mềm (nền sáng) hoặc quầng sáng (nền tối); chữ ở lớp trên, không qua bộ lọc nên luôn nét. */
export const SceneShapes: React.FC<{shapes: Shape[]; id: string; vw: number; vh: number; night?: boolean}> = ({shapes, id, vw, vh, night = false}) => (
  <>
    <defs>
      <filter id={`${id}-fx`} filterUnits="userSpaceOnUse" x={0} y={0} width={vw} height={vh}>
        {night ? (
          <>
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </>
        ) : (
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#1D1B16" floodOpacity="0.16" />
        )}
      </filter>
    </defs>
    <g filter={`url(#${id}-fx)`}>{shapes.map((sh, i) => (sh.t === 'text' ? null : renderShape(sh, i, night)))}</g>
    <g>{shapes.map((sh, i) => (sh.t === 'text' ? renderShape(sh, i, night) : null))}</g>
  </>
);

/** Sao nền cho sân khấu tối: vị trí cố định (cùng hạt giống) để hình không nhấp nháy khi kéo thanh trượt. */
const STARS: [number, number, number][] = Array.from({length: 46}, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [(a - Math.floor(a)), (b - Math.floor(b)), 0.5 + ((i * 7) % 5) * 0.25] as [number, number, number];
});

/** Nền sân khấu: studio (xám kem, vầng sáng giữa, lưới sàn mờ dần ra rìa) hoặc night (chàm sâu, vầng tím, sao). */
export const StageBackdrop: React.FC<{vw: number; vh: number; night: boolean; glass?: boolean; id: string}> = ({vw, vh, night, glass = false, id}) => (
  <g pointerEvents="none" data-testid="scene-stage" data-stage={night ? 'night' : glass ? 'glass' : 'studio'}>
    <defs>
      <radialGradient id={`${id}-bg`} cx="50%" cy="46%" r="75%">
        {night ? (
          <>
            <stop offset="0" stopColor="#262A66" />
            <stop offset="0.55" stopColor="#11143A" />
            <stop offset="1" stopColor="#070918" />
          </>
        ) : glass ? (
          <>
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.5" stopColor="#E8F1FC" />
            <stop offset="1" stopColor="#E3DDF6" />
          </>
        ) : (
          <>
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.6" stopColor="#F4F1EA" />
            <stop offset="1" stopColor="#E7E3D9" />
          </>
        )}
      </radialGradient>
      <pattern id={`${id}-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M28 0H0V28" fill="none" stroke={night ? '#8F8CB0' : '#1D1B16'} strokeWidth="0.6" opacity={night ? 0.14 : 0.07} />
      </pattern>
      <radialGradient id={`${id}-fade`} cx="50%" cy="55%" r="62%">
        <stop offset="0.35" stopColor="#fff" />
        <stop offset="1" stopColor="#000" />
      </radialGradient>
      <mask id={`${id}-m`}>
        <rect width={vw} height={vh} fill={`url(#${id}-fade)`} />
      </mask>
    </defs>
    <rect width={vw} height={vh} rx="12" fill={`url(#${id}-bg)`} />
    <rect width={vw} height={vh} fill={`url(#${id}-grid)`} mask={`url(#${id}-m)`} />
    {glass && [[0.12, 0.22, 46], [0.86, 0.3, 34], [0.7, 0.78, 54], [0.2, 0.8, 30]].map(([x, y, r], i) => <circle key={i} cx={x * vw} cy={y * vh} r={r} fill="#FFFFFF" opacity={0.28} />)}
    {night && STARS.map(([x, y, r], i) => <circle key={i} cx={x * vw} cy={y * vh} r={r} fill="#E8E6F5" opacity={0.25 + ((i * 3) % 5) * 0.12} />)}
  </g>
);

/** Template có thêm bản 3D thật (three.js), tải khi cần để three không nằm trong gói chính. Bản SVG luôn còn làm dự phòng. */
export const HAS_3D = new Set(['PHYS_NEWTON_CRADLE', 'PHYS_EM_WAVE_3D', 'PHYS_EARTH_SEASONS', 'MATH_VECTOR_3D', 'MATH_SPACE_RELATIONS', 'MATH_QUADRIC_SURFACES', 'PHYS_MAGNETIC_FIELD', 'PHYS_EM_INDUCTION', 'PHYS_CIRCULAR_MOTION', 'PHYS_KINETIC_GAS_PARTICLES', 'PHYS_STATES_OF_MATTER', 'CHEM_BONDING', 'CHEM_LIPID_SOAP', 'BIO_BIOMOLECULES', 'BIO_MEMBRANE_TRANSPORT', 'BIO_SCALE_CELL_TYPES']);
const Scene3D = React.lazy(() => import('./Scenes3D'));
export const canWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

/** Cảnh SVG sinh từ hàm thuần của (tham số, thời gian): dùng cho hình học, cơ–điện–nhiệt, cấu trúc phân tử, ống nghiệm ảo... */
export const SceneLab: React.FC<{id: string; data: SceneData}> = ({id, data}) => {
  const [p, setPs] = useState(() => initialP(data));
  const [s, setSs] = useState(() => initialS(data));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(!!data.time?.autoplay);
  const tm = data.time;
  const night = data.stage === 'night';
  const glass = data.stage === 'glass';
  const [showNote, setShowNote] = useState(false);
  const uid = useId().replace(/:/g, '');
  const View3D = HAS_3D.has(id);
  const [in3d, setIn3d] = useState(false);
  useEffect(() => {
    if (View3D && canWebGL()) setIn3d(true);
  }, [View3D]);

  useEffect(() => {
    if (!playing || !tm) return;
    const h = setInterval(() => {
      setT((x) => {
        const n = x + 0.05;
        if (n < tm.max) return n;
        if (tm.loop) return 0;
        setPlaying(false);
        return tm.max;
      });
    }, 50);
    return () => clearInterval(h);
  }, [playing, tm]);

  const shapes = useMemo(() => data.draw(p, t, s), [data, p, t, s]);
  const [vw, vh] = data.viewBox;

  return (
    <div className="p-4 flex flex-wrap items-start gap-3" data-testid="scene-lab" data-preset={id}>
      <div className="flex-[3_1_320px] min-w-0 flex flex-col gap-3">
      {View3D && (
        <div className="flex gap-1 self-end" data-testid="scene-view-toggle">
          {[true, false].map((on) => (
            <button key={String(on)} type="button" aria-pressed={in3d === on} onClick={() => setIn3d(on)} className={`min-h-[30px] rounded-full border px-3.5 text-xs font-medium ${in3d === on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/25 bg-white text-[#1D1B16]'}`}>
              {on ? '3D' : '2D'}
            </button>
          ))}
        </div>
      )}
      {View3D && in3d ? (
        <Suspense fallback={<div className={`w-full aspect-[560/340] rounded-2xl border border-[#1D1B16]/15 ${night ? 'bg-[#0B0E2A]' : 'bg-[#EEEAE0]'}`} />}>
          <Scene3D id={id} p={p} t={t} s={s} onFail={() => setIn3d(false)} />
        </Suspense>
      ) : (
      <svg viewBox={`0 0 ${vw} ${vh}`} className={`w-full rounded-2xl border ${night ? 'border-[#1B1B4B]' : 'border-[#1D1B16]/15'}`} data-testid="scene-svg" data-shapes={shapes.length} data-stage={night ? 'night' : glass ? 'glass' : 'studio'}>
        <StageBackdrop vw={vw} vh={vh} night={night} glass={glass} id={uid} />
        <SceneShapes shapes={shapes} id={uid} vw={vw} vh={vh} night={night} />
      </svg>
      )}
        {(data.tryIt || data.see) && (
          <div className="grid gap-2 sm:grid-cols-2 text-xs leading-relaxed text-[#4B473D]" data-testid="scene-try">
            {data.tryIt && (
              <p className="rounded-xl bg-[#A8481C]/[.07] px-3 py-2">
                <b className="block font-semibold text-[#A8481C]">Tự tay thử</b>
                {data.tryIt}
              </p>
            )}
            {data.see && (
              <p className="rounded-xl bg-[#1F7A4D]/[.07] px-3 py-2">
                <b className="block font-semibold text-[#1F7A4D]">Em sẽ thấy</b>
                {data.see}
              </p>
            )}
          </div>
        )}
        {data.note &&
          (showNote ? (
            <p data-testid="scene-note" className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2 text-xs leading-relaxed text-[#4B473D]">
              <b className="block font-semibold text-[#1D1B16]">Kết luận</b>
              {data.note}
            </p>
          ) : (
            <button type="button" data-testid="scene-note-toggle" onClick={() => setShowNote(true)} className={`${BTN} self-start`}>
              Xem kết luận
            </button>
          ))}
      </div>

      <div className={`${PANEL} flex-[2_1_260px] min-w-0 flex flex-col gap-2.5`}>
        {tm && (
          <div className="flex items-center gap-2">
            <button type="button" data-testid="scene-play" onClick={() => { if (!playing && t >= tm.max) setT(0); setPlaying((x) => !x); }} className={`${BTN} w-16 shrink-0`}>
              {playing ? 'Dừng' : 'Chạy'}
            </button>
            <div className="flex-1 min-w-0">
              <Slider testid="scene-time" label={tm.label ?? 'Thời gian'} value={t} min={0} max={tm.max} step={0.05} onChange={(v) => { setPlaying(false); setT(v); }} fmt={(v) => `${fmt(v)}${tm.unit ? ` ${tm.unit}` : ''}`} />
            </div>
          </div>
        )}
        <ControlPanel prefix="scene" c={data} p={p} s={s} setP={(k, v) => setPs((x) => ({...x, [k]: v}))} setS={(k, v) => setSs((x) => ({...x, [k]: v}))} />
        {data.readouts && <Readouts prefix="scene" items={data.readouts.map((r) => [r.label, r.value(p, t, s)])} />}
      </div>
    </div>
  );
};
