'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {ShapeMeta, Stroke} from '../../utils/lassoGeometry';
import {VERTEX_LABELS, planeStats, solidWire, triangleCenters, type P2} from '../../utils/inlineShape';
import type {SolidKind} from '../../utils/localRouter';
import {BUNDLES, KIND_COLOR, KIND_LABEL, addConstructs, arcPath, distToPolygon, evalConstructs, hasConstruct, polygonBundles, toggleConstruct, type ConstructKind, type PlaneConstruct} from '../../utils/planeConstruct';

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
  /** hình dựng từ đề: đang chọn điểm ('point') hoặc cạnh ('edge') bằng chạm */
  pickMode?: 'point' | 'edge' | null;
  pickedNames?: string[];
  onPickPoint?: (name: string) => void;
  onPickEdge?: (a: string, b: string, t: number) => void;
  onOpenTools?: () => void;
}

const fmt = (v: number) => v.toFixed(1).replace('.', ',');
const midOf = (a: P2, b: P2): P2 => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});

/** Hình học vẽ thẳng lên bảng: không khung, không nền; chỉ có nét hình, nhãn đỉnh và tay cầm nhỏ. */
export const InlineShape: React.FC<Props> = ({stroke, boardScale, picked, onChange, onDelete, onOpenFull, onMoveStart, onMove, onMoveEnd, onInteractStart, pickMode, pickedNames, onPickPoint, onPickEdge, onOpenTools}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const s = stroke.shape!;
  const t = stroke.typeset!;
  const w = t.w;
  const h = t.h;
  const ink = stroke.color;
  const drag = useRef<{kind: 'vertex' | 'rotate'; i: number; sx: number; sy: number; ox: number; oy: number; started: boolean} | null>(null);

  const wire = useMemo(
    () => (s.kind === 'solid' && s.solid && !s.sketch ? solidWire(s.solid.kind as SolidKind, s.solid.dims, s.solid.yaw, s.solid.pitch, w, h) : null),
    [s.kind, s.solid, s.sketch, w, h],
  );
  const sk = s.sketch;
  const verts = s.plane?.verts ?? [];
  const stats = useMemo(() => (s.kind === 'plane' ? planeStats(verts) : null), [s.kind, verts]);
  const centers = s.plane?.euler && verts.length === 3 ? triangleCenters(verts) : null;
  // dựng hình động: lưu theo loại + chỉ số đỉnh/cạnh nên tự cập nhật khi kéo đỉnh
  const constructs = s.plane?.constructs;
  const drawn = useMemo(() => (s.kind === 'plane' ? evalConstructs(verts, constructs) : null), [s.kind, verts, constructs]);
  const [build, setBuild] = useState(false);
  const [menu, setMenu] = useState<{kind: 'v' | 's'; i: number} | null>(null);
  useEffect(() => {
    if (!build) setMenu(null);
  }, [build]);
  const applyConstructs = (next: PlaneConstruct[]) => {
    if (!s.plane) return;
    onInteractStart();
    onChange({...s, plane: {...s.plane, constructs: next}});
  };
  const polyCx = verts.length ? verts.reduce((a, b) => a + b.x, 0) / verts.length : 0;
  const polyCy = verts.length ? verts.reduce((a, b) => a + b.y, 0) / verts.length : 0;

  const down = (kind: 'vertex' | 'rotate', i: number, e: React.PointerEvent<Element>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const o = kind === 'vertex' ? (sk ? sk.verts[i] : verts[i]) : {x: s.solid?.yaw ?? 0, y: s.solid?.pitch ?? 0};
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
    if (d.kind === 'vertex' && sk) {
      const nv = sk.verts.map((p, k) => (k === d.i ? {x: d.ox + dx / boardScale, y: d.oy + dy / boardScale} : p));
      onChange({...s, sketch: {...sk, verts: nv}});
    } else if (d.kind === 'vertex' && s.plane) {
      const nv = verts.map((p, k) => (k === d.i ? {x: d.ox + dx / boardScale, y: d.oy + dy / boardScale} : p));
      onChange({...s, plane: {...s.plane, verts: nv}});
    } else if (d.kind === 'rotate' && s.solid) {
      const pitch = Math.max(-1.45, Math.min(1.45, d.oy + dy * 0.012));
      onChange({...s, solid: {...s.solid, yaw: d.ox + dx * 0.012, pitch}});
    }
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    // chạm nhẹ (không kéo) vào đỉnh khi đang ở chế độ dựng hình → hiện các phép dựng từ đỉnh đó
    if (d && !d.started && d.kind === 'vertex' && build && s.kind === 'plane') setMenu({kind: 'v', i: d.i});
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
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} width={w * boardScale} height={h * boardScale} style={{overflow: 'visible'}}>
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
              {drawn && (
                <g data-testid="construct-draw" data-count={(constructs ?? []).length} style={{pointerEvents: 'none'}}>
                  {drawn.circles.map((c, k) => (
                    <circle key={`cc${k}`} data-testid="construct-circle" cx={c.c.x} cy={c.c.y} r={c.r} fill="none" stroke={c.color} strokeWidth={1.8} strokeDasharray={c.dashed ? '6 5' : undefined} />
                  ))}
                  {drawn.segs.map((g, k) => (
                    <line key={`cs${k}`} data-testid="construct-seg" x1={g.a.x} y1={g.a.y} x2={g.b.x} y2={g.b.y} stroke={g.color} strokeWidth={g.thin ? 1.2 : 2.2} strokeLinecap="round" strokeDasharray={g.dashed ? '6 5' : undefined} />
                  ))}
                  {drawn.arcs.flatMap((a, k) =>
                    Array.from({length: a.n}, (_, j) => <path key={`ca${k}-${j}`} d={arcPath(a.at, a.a1, a.a2, a.r + j * 4)} fill="none" stroke={a.color} strokeWidth={1.4} />),
                  )}
                  {drawn.rights.map((r, k) => (
                    <path
                      key={`cr${k}`}
                      d={`M ${r.at.x + r.u.x * r.size} ${r.at.y + r.u.y * r.size} L ${r.at.x + (r.u.x + r.v.x) * r.size} ${r.at.y + (r.u.y + r.v.y) * r.size} L ${r.at.x + r.v.x * r.size} ${r.at.y + r.v.y * r.size}`}
                      fill="none"
                      stroke={r.color}
                      strokeWidth={1.4}
                    />
                  ))}
                  {drawn.ticks.flatMap((tk, k) =>
                    Array.from({length: tk.n}, (_, j) => {
                      const off = (j - (tk.n - 1) / 2) * 4;
                      const cx = tk.at.x + tk.dir.x * off;
                      const cy = tk.at.y + tk.dir.y * off;
                      return <line key={`ct${k}-${j}`} x1={cx + tk.dir.y * 5} y1={cy - tk.dir.x * 5} x2={cx - tk.dir.y * 5} y2={cy + tk.dir.x * 5} stroke={tk.color} strokeWidth={1.6} strokeLinecap="round" />;
                    }),
                  )}
                  {drawn.points.map((p, k) => {
                    // nhãn điểm nằm TRÊN cạnh thì đặt phía trong (nhãn độ dài cạnh ở phía ngoài); điểm ở giữa hình thì đặt chếch lên phải
                    const ox = p.x - polyCx;
                    const oy = p.y - polyCy;
                    const L = Math.hypot(ox, oy);
                    const onEdge = distToPolygon(p, verts) < 3;
                    const dirx = L < 9 ? 0.75 : onEdge ? -ox / L : ox / L;
                    const diry = L < 9 ? -0.65 : onEdge ? -oy / L : oy / L;
                    return (
                      <g key={`cp${k}`} data-testid={p.minor ? undefined : 'construct-point'} data-label={p.label || undefined}>
                        <circle cx={p.x} cy={p.y} r={p.minor ? 2.2 : 3.8} fill={p.color} />
                        {p.label && (
                          <text x={p.x + dirx * 13} y={p.y + diry * 13 + 5} fontSize={15} fontWeight={700} textAnchor="middle" fill={p.color} fontFamily="'Times New Roman', serif" fontStyle="italic">
                            {p.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
              {build && verts.map((p, i) => {
                const q = verts[(i + 1) % verts.length];
                const on = menu?.kind === 's' && menu.i === i;
                return (
                  <g key={`sd${i}`}>
                    {on && <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#2563EB" strokeWidth={sw + 3} strokeLinecap="round" opacity={0.35} />}
                    <line
                      data-testid="side-hit"
                      x1={p.x}
                      y1={p.y}
                      x2={q.x}
                      y2={q.y}
                      stroke="transparent"
                      strokeWidth={22}
                      style={{pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none'}}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setMenu({kind: 's', i});
                      }}
                    />
                  </g>
                );
              })}
              {build && menu?.kind === 'v' && verts[menu.i] && <circle cx={verts[menu.i].x} cy={verts[menu.i].y} r={17} fill="none" stroke="#2563EB" strokeWidth={2.4} opacity={0.6} />}
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
          {s.kind === 'solid' && sk && (
            <g data-testid="sketch-wire" data-fitted={sk.labels.length > 0 ? 'true' : 'false'} data-geo={sk.fixed ? 'true' : 'false'}>
              {(sk.polys ?? []).map((poly, i) => (
                <polygon key={`poly${i}`} data-testid="geo-section" points={poly.map((k) => `${sk.verts[k].x},${sk.verts[k].y}`).join(' ')} fill="#2563EB" fillOpacity={0.14} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="4 3" />
              ))}
              {(sk.curves ?? []).map((c, i) => (
                <path key={`curve${i}`} data-testid="geo-circle" data-label={c.label} d={c.pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')} fill="none" stroke="#7C3AED" strokeWidth={Math.max(1.8, sw * 0.8)} strokeLinejoin="round" />
              ))}
              {sk.edges.map((e, i) => (
                <line
                  key={i}
                  data-testid={e.hidden ? 'edge-hidden' : 'edge-visible'}
                  data-aux={e.aux ? 'true' : undefined}
                  x1={sk.verts[e.a].x}
                  y1={sk.verts[e.a].y}
                  x2={sk.verts[e.b].x}
                  y2={sk.verts[e.b].y}
                  stroke={e.aux ? '#2563EB' : ink}
                  strokeWidth={e.aux ? Math.max(1.8, sw * 0.8) : e.hidden ? sw * 0.7 : sw}
                  strokeDasharray={e.hidden ? '7 6' : undefined}
                  strokeLinecap="round"
                  opacity={e.hidden ? 0.8 : 1}
                />
              ))}
              {pickMode === 'edge' &&
                sk.edges.map((e, i) => (
                  <line
                    key={`pk${i}`}
                    data-testid="geo-edge-pick"
                    x1={sk.verts[e.a].x}
                    y1={sk.verts[e.a].y}
                    x2={sk.verts[e.b].x}
                    y2={sk.verts[e.b].y}
                    stroke="transparent"
                    strokeWidth={18}
                    style={{pointerEvents: 'auto', cursor: 'crosshair'}}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      const r = svgRef.current?.getBoundingClientRect();
                      if (!r || !sk.names) return;
                      const px = (ev.clientX - r.left) / boardScale;
                      const py = (ev.clientY - r.top) / boardScale;
                      const A = sk.verts[e.a];
                      const B = sk.verts[e.b];
                      const dx = B.x - A.x;
                      const dy = B.y - A.y;
                      const t = ((px - A.x) * dx + (py - A.y) * dy) / (dx * dx + dy * dy || 1);
                      onPickEdge?.(sk.names[e.a], sk.names[e.b], Math.min(0.95, Math.max(0.05, t)));
                    }}
                  />
                ))}
              {(sk.marks ?? []).map((k) => (
                <circle key={`mk${k}`} cx={sk.verts[k].x} cy={sk.verts[k].y} r={3.6} fill="#2563EB" />
              ))}
              {sk.verts.map((p, i) => (
                <g key={i}>
                  <text x={p.x + 7} y={p.y - 6} fontSize={15} fontWeight={700} fill={(sk.marks ?? []).includes(i) ? '#1D4ED8' : ink} fontFamily="'Times New Roman', serif" fontStyle="italic">
                    {sk.labels[i] ?? ''}
                  </text>
                  {sk.fixed ? (
                    pickMode === 'point' && (
                      <circle
                        data-testid="geo-point-pick"
                        data-name={sk.names?.[i]}
                        cx={p.x}
                        cy={p.y}
                        r={12}
                        fill={pickedNames?.includes(sk.names?.[i] ?? '') ? '#2563EB' : 'transparent'}
                        fillOpacity={0.35}
                        stroke="#2563EB"
                        strokeWidth={1.4}
                        style={{pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none'}}
                        onPointerDown={(ev) => {
                          ev.stopPropagation();
                          if (sk.names?.[i]) onPickPoint?.(sk.names[i]);
                        }}
                      />
                    )
                  ) : (
                    <circle
                      data-testid="shape-vertex-handle"
                      cx={p.x}
                      cy={p.y}
                      r={10}
                      fill={ink}
                      fillOpacity={0.1}
                      stroke={ink}
                      strokeWidth={1.2}
                      style={{pointerEvents: 'auto', cursor: 'grab', touchAction: 'none'}}
                      onPointerDown={(e) => down('vertex', i, e)}
                      onPointerMove={move}
                      onPointerUp={up}
                      onPointerCancel={up}
                    />
                  )}
                </g>
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
          {s.kind === 'plane' && verts.length >= 3 && (
            <button
              data-testid="shape-build-toggle"
              title="Dựng hình: chạm đỉnh hoặc cạnh để dựng trung tuyến, đường cao, phân giác, trung trực…"
              onClick={() => setBuild((b) => !b)}
              className={`px-1.5 py-0.5 hover:bg-blue-50 ${build ? 'text-blue-700 font-bold bg-blue-50' : 'text-stone-600'}`}
            >
              📐 Dựng hình
            </button>
          )}
          {s.geo && onOpenTools && (
            <button data-testid="shape-geo-tools" title="Mở dụng cụ vẽ thêm trên hình" onClick={onOpenTools} className="px-1.5 py-0.5 hover:bg-blue-50 text-blue-700 font-semibold">
              ✎ Dụng cụ
            </button>
          )}
          <button data-testid="shape-open-full" title="Mở mô phỏng đầy đủ (khai triển, thông số)" onClick={onOpenFull} className="px-1.5 py-0.5 hover:bg-stone-100 text-stone-600">
            ⤢
          </button>
          <button data-testid="shape-delete" title="Xóa hình" onClick={onDelete} className="px-1.5 py-0.5 hover:bg-rose-50 text-stone-600 hover:text-rose-600">
            ✕
          </button>
        </div>
        {s.kind === 'plane' && verts.length >= 3 && build && menu && verts[menu.i] && (() => {
          const n = verts.length;
          const anchor = menu.kind === 'v' ? verts[menu.i] : midOf(verts[menu.i], verts[(menu.i + 1) % n]);
          const items: ConstructKind[] = menu.kind === 'v' ? (n === 3 ? ['median', 'altitude', 'bisector', 'midline', 'parallel'] : ['bisector', 'midline']) : ['midpoint', 'perpBisector'];
          const title = menu.kind === 'v' ? `Đỉnh ${VERTEX_LABELS[menu.i]}` : `Cạnh ${VERTEX_LABELS[menu.i]}${VERTEX_LABELS[(menu.i + 1) % n]}`;
          return (
            <div
              data-testid="construct-menu"
              className="pointer-events-auto absolute z-20 flex flex-col gap-1 rounded-xl border border-[#DCD9D0] bg-white/95 p-1.5 shadow-lg"
              style={{left: anchor.x * boardScale + 18, top: anchor.y * boardScale + 6, minWidth: 168, touchAction: 'manipulation'}}
            >
              <div className="px-1.5 text-[11px] font-semibold text-stone-500">{title}</div>
              {items.map((k) => {
                const on = hasConstruct(constructs, {k, i: menu.i});
                return (
                  <button
                    key={k}
                    data-testid={`construct-${k}`}
                    data-on={on}
                    onClick={() => applyConstructs(toggleConstruct(constructs, {k, i: menu.i}))}
                    className={`rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${on ? 'text-white' : 'bg-stone-50 text-stone-800 hover:bg-stone-100'}`}
                    style={on ? {background: KIND_COLOR[k]} : undefined}
                  >
                    {on ? '✓ ' : ''}
                    {KIND_LABEL[k]}
                  </button>
                );
              })}
              <button data-testid="construct-menu-close" onClick={() => setMenu(null)} className="rounded-lg px-3 py-1.5 text-center text-[12px] text-stone-500 hover:bg-stone-100">
                Xong
              </button>
            </div>
          );
        })()}
        {s.kind === 'plane' && verts.length >= 3 && (build || (drawn && drawn.facts.length > 0)) && (
          <div className="absolute left-0 flex flex-col gap-1" style={{top: h * boardScale + 30, width: Math.max(w * boardScale, 380)}}>
            {build && (
              <div data-testid="construct-palette" className="pointer-events-auto flex flex-wrap gap-1" style={{touchAction: 'manipulation'}}>
                {(verts.length === 3 ? BUNDLES : polygonBundles(verts.length)).map((b) => (
                  <button
                    key={b.id}
                    data-testid={`bundle-${b.id}`}
                    onClick={() => applyConstructs(addConstructs(constructs, b.items))}
                    className="rounded-lg border border-[#DCD9D0] bg-white/95 px-2.5 py-1.5 text-[12px] font-semibold text-stone-800 shadow-sm hover:bg-blue-50"
                  >
                    {b.label}
                  </button>
                ))}
                <button data-testid="construct-clear" onClick={() => applyConstructs([])} className="rounded-lg border border-rose-200 bg-white/95 px-2.5 py-1.5 text-[12px] font-semibold text-rose-600 shadow-sm hover:bg-rose-50">
                  Xóa dựng
                </button>
              </div>
            )}
            {build && !menu && <div className="pointer-events-none text-[11px] text-stone-500">Chạm vào một đỉnh hoặc một cạnh để dựng; kéo đỉnh để xem các đường dựng thay đổi.</div>}
            {drawn && drawn.facts.length > 0 && (
              <div data-testid="construct-facts" className="pointer-events-none rounded-md bg-white/85 px-2 py-1 font-mono text-[11px] leading-snug text-slate-700">
                {drawn.facts.slice(-6).map((f, k) => (
                  <div key={k}>{f}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {s.kind === 'plane' && (
          <div className="absolute left-0 text-[10px] font-mono text-stone-500 pointer-events-none" style={{top: h * boardScale + 6, whiteSpace: 'nowrap'}} data-testid="shape-area">
            {stats && `S = ${fmt(stats.area)} đvdt · ${verts.length === 3 ? 'tam giác' : `${verts.length} cạnh`} · kéo đỉnh để biến đổi`}
          </div>
        )}
        {s.kind === 'solid' && (
          <div className="absolute left-0 text-[10px] font-mono text-stone-500 pointer-events-none" style={{top: h * boardScale + 26, whiteSpace: 'nowrap'}}>
            {sk?.fixed ? (pickMode ? (pickMode === 'edge' ? 'Chạm vào cạnh để đặt điểm' : 'Chạm vào điểm để chọn') : 'Hình dựng từ đề · mở dụng cụ vẽ để thêm điểm, đoạn, thiết diện') : sk ? 'Hình giữ đúng nét bạn vẽ · nét đứt: cạnh khuất · kéo đỉnh để chỉnh · ⤢ mở mô hình 3D để xoay' : 'Nét liền: cạnh thấy · nét đứt: cạnh khuất · kéo vòng xoay để xoay khối'}
          </div>
        )}
      </div>
    </div>
  );
};

