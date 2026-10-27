'use client';

import React, {useMemo, useRef} from 'react';
import type {ShapeMeta, Stroke} from '../../utils/lassoGeometry';
import {VERTEX_LABELS, planeStats, solidWire, triangleCenters, type P2} from '../../utils/inlineShape';
import type {SolidKind} from '../../utils/localRouter';

interface Props {
  stroke: Stroke;
  boardScale: number;
  picked: boolean;
  onChange: (shape: ShapeMeta) => void;
  onDelete: () => void;
  onOpenFull: () => void;
  onMoveStart: (e: React.PointerEvent<HTMLElement>) => void;
  onMove: (e: React.PointerEvent<HTMLElement>) => void;
  onMoveEnd: () => void;
  onInteractStart: () => void;
}

const fmt = (v: number) => v.toFixed(1).replace('.', ',');
const midOf = (a: P2, b: P2): P2 => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});

/** Hình học vẽ thẳng lên bảng: không khung, không nền; chỉ có nét hình, nhãn đỉnh và tay cầm nhỏ. */
export const InlineShape: React.FC<Props> = ({stroke, boardScale, picked, onChange, onDelete, onOpenFull, onMoveStart, onMove, onMoveEnd, onInteractStart}) => {
  const s = stroke.shape!;
  const t = stroke.typeset!;
  const w = t.w;
  const h = t.h;
  const ink = stroke.color;
  const drag = useRef<{kind: 'vertex' | 'rotate'; i: number; sx: number; sy: number; ox: number; oy: number; started: boolean} | null>(null);

  const wire = useMemo(
    () => (s.kind === 'solid' && s.solid ? solidWire(s.solid.kind as SolidKind, s.solid.dims, s.solid.yaw, s.solid.pitch, w, h) : null),
    [s.kind, s.solid, w, h],
  );
  const verts = s.plane?.verts ?? [];
  const stats = useMemo(() => (s.kind === 'plane' ? planeStats(verts) : null), [s.kind, verts]);
  const centers = s.plane?.euler && verts.length === 3 ? triangleCenters(verts) : null;

  const down = (kind: 'vertex' | 'rotate', i: number, e: React.PointerEvent<Element>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const o = kind === 'vertex' ? verts[i] : {x: s.solid?.yaw ?? 0, y: s.solid?.pitch ?? 0};
    drag.current = {kind, i, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, started: false};
  };
  const move = (e: React.PointerEvent<Element>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.started) {
      if (Math.hypot(dx, dy) < 2) return;
      d.started = true;
      onInteractStart();
    }
    if (d.kind === 'vertex' && s.plane) {
      const nv = verts.map((p, k) => (k === d.i ? {x: d.ox + dx / boardScale, y: d.oy + dy / boardScale} : p));
      onChange({...s, plane: {...s.plane, verts: nv}});
    } else if (d.kind === 'rotate' && s.solid) {
      const pitch = Math.max(-1.45, Math.min(1.45, d.oy + dy * 0.012));
      onChange({...s, solid: {...s.solid, yaw: d.ox + dx * 0.012, pitch}});
    }
  };
  const up = () => {
    drag.current = null;
  };

  const sw = Math.max(2.2, stroke.width || 3);
  return (
    <div
      data-testid="inline-shape"
      data-kind={s.kind}
      data-title={s.title}
      className="absolute"
      style={{left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none'}}
    >
      <div className="absolute" style={{left: `${(stroke.points[0].x / 1200) * 100}%`, top: `${(stroke.points[0].y / 675) * 100}%`, width: w * boardScale, height: h * boardScale}}>
        {picked && <div className="absolute -inset-1.5 rounded-md border-2 border-blue-500/80 pointer-events-none" />}
        <svg viewBox={`0 0 ${w} ${h}`} width={w * boardScale} height={h * boardScale} style={{overflow: 'visible'}}>
          {s.kind === 'plane' && stats && (
            <g>
              <polygon points={verts.map((p) => `${p.x},${p.y}`).join(' ')} fill={ink} fillOpacity={0.06} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
              {verts.map((p, i) => {
                const n = verts.length;
                const q = verts[(i + 1) % n];
                const m = midOf(p, q);
                const cx = verts.reduce((a, b) => a + b.x, 0) / n;
                const cy = verts.reduce((a, b) => a + b.y, 0) / n;
                const ox = m.x - cx;
                const oy = m.y - cy;
                const L = Math.hypot(ox, oy) || 1;
                return (
                  <text key={`s${i}`} data-testid="side-label" x={m.x + (ox / L) * 14} y={m.y + (oy / L) * 14 + 4} fontSize={13} textAnchor="middle" fill="#0369A1" fontFamily="JetBrains Mono, monospace">
                    {fmt(stats.sides[i])}
                  </text>
                );
              })}
              {verts.map((p, i) => {
                const n = verts.length;
                const cx = verts.reduce((a, b) => a + b.x, 0) / n;
                const cy = verts.reduce((a, b) => a + b.y, 0) / n;
                const ox = p.x - cx;
                const oy = p.y - cy;
                const L = Math.hypot(ox, oy) || 1;
                return (
                  <g key={`v${i}`}>
                    <text x={p.x + (ox / L) * 18} y={p.y + (oy / L) * 18 + 5} fontSize={17} fontWeight={700} textAnchor="middle" fill={ink} fontFamily="'Times New Roman', serif" fontStyle="italic">
                      {VERTEX_LABELS[i]}
                    </text>
                    <text data-testid="angle-label" x={p.x - (ox / L) * 26} y={p.y - (oy / L) * 26 + 4} fontSize={11} textAnchor="middle" fill="#B45309" fontFamily="JetBrains Mono, monospace">
                      {Math.round(stats.angles[i])}°
                    </text>
                  </g>
                );
              })}
              {centers && (
                <g data-testid="euler-overlay">
                  <circle cx={centers.O.x} cy={centers.O.y} r={centers.R} fill="none" stroke="#7C3AED" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.7} />
                  <line x1={centers.O.x} y1={centers.O.y} x2={centers.H.x} y2={centers.H.y} stroke="#DC2626" strokeWidth={1.8} />
                  {([['G', centers.G, '#16A34A'], ['O', centers.O, '#7C3AED'], ['H', centers.H, '#DC2626']] as [string, P2, string][]).map(([k, p, c]) => (
                    <g key={k}>
                      <circle cx={p.x} cy={p.y} r={4} fill={c} />
                      <text x={p.x + 7} y={p.y - 6} fontSize={13} fontWeight={700} fill={c}>{k}</text>
                    </g>
                  ))}
                </g>
              )}
              {verts.map((p, i) => (
                <circle
                  key={`h${i}`}
                  data-testid="shape-vertex-handle"
                  cx={p.x}
                  cy={p.y}
                  r={11}
                  fill={ink}
                  fillOpacity={0.12}
                  stroke={ink}
                  strokeWidth={1.4}
                  style={{pointerEvents: 'auto', cursor: 'grab', touchAction: 'none'}}
                  onPointerDown={(e) => down('vertex', i, e)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                />
              ))}
            </g>
          )}
          {s.kind === 'solid' && wire && (
            <g>
              {wire.edges.map((e, i) => (
                <line
                  key={i}
                  data-testid={e.hidden ? 'edge-hidden' : 'edge-visible'}
                  x1={wire.pts[e.a].x}
                  y1={wire.pts[e.a].y}
                  x2={wire.pts[e.b].x}
                  y2={wire.pts[e.b].y}
                  stroke={ink}
                  strokeWidth={e.hidden ? sw * 0.7 : sw}
                  strokeDasharray={e.hidden ? '7 6' : undefined}
                  strokeLinecap="round"
                  opacity={e.hidden ? 0.75 : 1}
                />
              ))}
              {wire.pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill={ink} />
                  <text x={p.x + 7} y={p.y - 6} fontSize={15} fontWeight={700} fill={ink} fontFamily="'Times New Roman', serif" fontStyle="italic">
                    {wire.labels[i] ?? ''}
                  </text>
                </g>
              ))}
              <g
                data-testid="shape-rotate-handle"
                transform={`translate(${w - 4}, ${h - 4})`}
                style={{pointerEvents: 'auto', cursor: 'grab', touchAction: 'none'}}
                onPointerDown={(e) => down('rotate', 0, e)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              >
                <circle r={17} fill="#fff" fillOpacity={0.9} stroke="#2563EB" strokeWidth={1.6} />
                <path d="M -7 -2 A 7.5 7.5 0 1 1 -3 6" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" />
                <path d="M -10 -5 L -7 -2 L -3.5 -5.5" fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          )}
        </svg>
        <div
          className="pointer-events-auto absolute left-0 flex items-center gap-px rounded-md bg-white/90 border border-[#DCD9D0] shadow-sm opacity-40 hover:opacity-100 transition-opacity"
          style={{top: -26, fontSize: 11, whiteSpace: 'nowrap'}}
        >
          <span
            data-testid="shape-grip"
            title="Kéo để di chuyển"
            onPointerDown={onMoveStart}
            onPointerMove={onMove}
            onPointerUp={onMoveEnd}
            className="px-1.5 cursor-grab active:cursor-grabbing select-none touch-none text-stone-500"
          >
            ⠿
          </span>
          <span className="px-1 text-stone-700 font-medium max-w-[220px] truncate">{s.title}</span>
          {s.kind === 'plane' && verts.length === 3 && (
            <button
              data-testid="shape-euler-toggle"
              title="Hiện tâm ngoại tiếp O, trọng tâm G, trực tâm H và đường thẳng Euler"
              onClick={() => s.plane && onChange({...s, plane: {...s.plane, euler: !s.plane.euler}})}
              className={`px-1.5 py-0.5 hover:bg-stone-100 ${s.plane?.euler ? 'text-violet-700 font-bold' : 'text-stone-600'}`}
            >
              Euler
            </button>
          )}
          <button data-testid="shape-open-full" title="Mở mô phỏng đầy đủ (khai triển, thông số)" onClick={onOpenFull} className="px-1.5 py-0.5 hover:bg-stone-100 text-stone-600">
            ⤢
          </button>
          <button data-testid="shape-delete" title="Xóa hình" onClick={onDelete} className="px-1.5 py-0.5 hover:bg-rose-50 text-stone-600 hover:text-rose-600">
            ✕
          </button>
        </div>
        {s.kind === 'plane' && (
          <div className="absolute left-0 text-[10px] font-mono text-stone-500 pointer-events-none" style={{top: h * boardScale + 6, whiteSpace: 'nowrap'}} data-testid="shape-area">
            {stats && `S = ${fmt(stats.area)} đvdt · ${verts.length === 3 ? 'tam giác' : `${verts.length} cạnh`} · kéo đỉnh để biến đổi`}
          </div>
        )}
        {s.kind === 'solid' && (
          <div className="absolute left-0 text-[10px] font-mono text-stone-500 pointer-events-none" style={{top: h * boardScale + 26, whiteSpace: 'nowrap'}}>
            Nét liền: cạnh thấy · nét đứt: cạnh khuất · kéo vòng xoay để xoay khối
          </div>
        )}
      </div>
    </div>
  );
};

