'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum} from '../utils/mathExpr';
import type {SolidKind} from '../utils/localRouter';
import {
  Cam,
  FACE_PALETTE,
  I3,
  M3,
  Solid,
  V3,
  centroid,
  defaultFaceColors,
  dot,
  edgesOf,
  faceNormal,
  len,
  makeSolid,
  mulMM,
  mulMV,
  orthonormalize,
  planUnfold,
  pointInPoly,
  project,
  rotAxis,
  slerpRot,
  sub,
  unfoldedFaces,
  viewAlign,
} from '../utils/solids';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

type Mode = 'solid' | 'ghost' | 'wire';
const LIGHT: V3 = (() => {
  const l: V3 = [-0.45, 0.7, 0.55];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

const BTN = 'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer select-none';
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Góc nhìn ban đầu: trục z của khối hướng lên, hơi nghiêng để thấy 3 mặt. */
const homeRotation = (): M3 => mulMM(rotAxis([1, 0, 0], 0.5), mulMM(rotAxis([0, 1, 0], -0.7), rotAxis([1, 0, 0], -Math.PI / 2)));

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

export const GeometryEngine: React.FC<Props> = ({blueprint}) => {
  const kind = ((blueprint.meta?.solid as SolidKind) || 'cube') as SolidKind;
  const [dims, setDims] = useState<Record<string, number>>(() => ({...(blueprint.meta?.dims || {})}));
  useEffect(() => setDims({...(blueprint.meta?.dims || {})}), [kind, blueprint.meta?.dims]);

  const solid: Solid = useMemo(() => makeSolid(kind, dims), [kind, dims]);
  const edges = useMemo(() => edgesOf(solid.faces), [solid]);
  const [root, setRoot] = useState(0);
  useEffect(() => setRoot(0), [kind]);
  const plan = useMemo(() => planUnfold(solid, Math.min(root, solid.faces.length - 1)), [solid, root]);

  const [colors, setColors] = useState<string[]>(() => defaultFaceColors(solid.faces.length));
  useEffect(() => setColors((prev) => (prev.length === solid.faces.length ? prev : defaultFaceColors(solid.faces.length))), [solid.faces.length]);
  const [brush, setBrush] = useState<string | null>(null);
  const [pickBase, setPickBase] = useState(false);
  const [selFace, setSelFace] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('solid');
  const [showLabels, setShowLabels] = useState(true);

  // unfold: u thật (ref, đọc trong vòng vẽ) + u hiển thị cho thanh trượt
  const uRef = useRef(0);
  const [uUi, setUUi] = useState(0);
  const animRef = useRef<{from: number; to: number; t0: number; ms: number} | null>(null);
  const rotRef = useRef<M3>(homeRotation());
  const rotAnim = useRef<{from: M3; to: M3; t0: number; ms: number} | null>(null);
  const zoomRef = useRef(1);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({w: 640, h: 400});
  const raf = useRef<number | null>(null);
  const needs = useRef(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const w = Math.max(280, Math.round(el.clientWidth || 640));
      const h = Math.round(Math.min(480, Math.max(280, w * 0.62)));
      setSize((s) => (s.w === w && s.h === h ? s : {w, h}));
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // bán kính khung: đủ chứa cả khối lẫn mạng phẳng để khi mở ra hình không bị cắt hoặc nhảy tỉ lệ
  const fitR = useMemo(() => {
    const radius = (faces: V3[][]) => {
      const all = faces.flat();
      const c = centroid(all);
      return Math.max(...all.map((v) => len(sub(v, c))));
    };
    // r0: khối (to khi còn gấp), r1: mạng phẳng; khung nội suy theo u nên khối không bị thu nhỏ vô lý
    return {r0: radius(unfoldedFaces(solid, plan, 0)), r1: radius(unfoldedFaces(solid, plan, 1))};
  }, [solid, plan]);

  // ---------------------------------------------------------------- vẽ
  const hitPolys = useRef<{face: number; poly: {x: number; y: number}[]; z: number}[]>([]);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(2.5, window.devicePixelRatio || 1) : 1;
    const {w, h} = size;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#FFFFFF');
    bg.addColorStop(1, '#F1EFEA');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const u = uRef.current;
    const faceV = unfoldedFaces(solid, plan, u);
    const center = centroid(faceV.flat());
    const R = rotRef.current;
    const rNow = fitR.r0 + (fitR.r1 - fitR.r0) * u;
    const zoom = (Math.min(w, h) * 0.5 * 0.8 * zoomRef.current) / Math.max(0.5, rNow);
    const cam: Cam = {R, zoom, cx: w / 2, cy: h / 2, dist: rNow * 7};

    // chiếu từng mặt
    type PF = {i: number; poly: {x: number; y: number}[]; z: number; front: boolean; light: number};
    const pfs: PF[] = faceV.map((fv, i) => {
      const poly = fv.map((v) => project(cam, v, center));
      const nrm = faceNormal(fv, fv.map((_, k) => k));
      const nv = mulMV(R, nrm);
      const front = nv[2] > 0;
      const l = Math.max(0, Math.abs(dot(nv, LIGHT)));
      return {i, poly, z: poly.reduce((s, p) => s + p.z, 0) / poly.length, front, light: 0.62 + 0.38 * l};
    });
    pfs.sort((a, b) => a.z - b.z);
    hitPolys.current = pfs.map((p) => ({face: p.i, poly: p.poly, z: p.z}));

    // bóng đổ mềm dưới khối
    const gp = project(cam, [center[0], center[1], center[2]], center);
    ctx.save();
    ctx.translate(gp.x, h - 34);
    ctx.scale(1, 0.18);
    const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, zoom * rNow * 1.1);
    sh.addColorStop(0, 'rgba(0,0,0,0.18)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(0, 0, zoom * rNow * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // mặt
    const alpha = mode === 'solid' ? 1 : mode === 'ghost' ? 0.34 : 0;
    if (alpha > 0) {
      for (const f of pfs) {
        ctx.beginPath();
        f.poly.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        const base = colors[f.i] || '#CBD5E1';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = shade(base, f.front ? f.light : f.light * 0.78);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // cạnh: ở trạng thái khối, cạnh bị che nét đứt; khi đã mở ra thì vẽ viền từng mặt
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (u < 0.02) {
      const frontOf = pfs.reduce<Record<number, boolean>>((m, f) => ((m[f.i] = f.front), m), {});
      const adjFaces = new Map<string, number[]>();
      solid.faces.forEach((f, fi) => f.forEach((a, k) => {
        const b = f[(k + 1) % f.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        (adjFaces.get(key) ?? adjFaces.set(key, []).get(key)!).push(fi);
      }));
      const pv = solid.verts.map((v) => project(cam, v, center));
      const draw1 = (hidden: boolean) => {
        ctx.beginPath();
        for (const [a, b] of edges) {
          const fs = adjFaces.get(`${a}-${b}`) ?? [];
          const vis = fs.some((fi) => frontOf[fi]);
          if (vis === hidden) continue;
          ctx.moveTo(pv[a].x, pv[a].y);
          ctx.lineTo(pv[b].x, pv[b].y);
        }
        if (hidden) {
          if (mode === 'solid') return;
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = 'rgba(30,41,59,0.45)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2.4;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      draw1(true);
      draw1(false);
    } else {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      for (const f of pfs) {
        ctx.beginPath();
        f.poly.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
      }
    }

    // mặt được chọn
    if (selFace != null) {
      const f = pfs.find((p) => p.i === selFace);
      if (f) {
        ctx.beginPath();
        f.poly.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = 'rgba(37,99,235,0.16)';
        ctx.fill();
      }
    }
    // mặt gốc khi khai triển: huy hiệu
    if (u > 0.5) {
      const f = pfs.find((p) => p.i === plan.root);
      if (f) {
        const c = f.poly.reduce((s, p) => ({x: s.x + p.x / f.poly.length, y: s.y + p.y / f.poly.length}), {x: 0, y: 0});
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.font = '700 11px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('MẶT ĐÁY', c.x, c.y + 4);
      }
    }

    // nhãn đỉnh (khi còn là khối): đỉnh bị che hiện mờ, không có nền trắng
    if (showLabels && u < 0.02) {
      const frontOf = pfs.reduce<Record<number, boolean>>((m, f) => ((m[f.i] = f.front), m), {});
      const visVert = solid.verts.map(() => false);
      solid.faces.forEach((f, fi) => f.forEach((vi) => {
        if (frontOf[fi]) visVert[vi] = true;
      }));
      ctx.font = 'italic 700 15px Georgia, serif';
      ctx.textAlign = 'center';
      solid.verts.forEach((v, i) => {
        const p = project(cam, v, center);
        const dir = mulMV(R, sub(v, center));
        const l = Math.hypot(dir[0], dir[1]) || 1;
        const lx = p.x + (dir[0] / l) * 14;
        const ly = p.y - (dir[1] / l) * 14 + 5;
        if (visVert[i]) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(lx, ly - 5, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1E293B';
        } else ctx.fillStyle = 'rgba(30,41,59,0.4)';
        ctx.fillText(solid.labels[i] ?? '', lx, ly);
      });
    }
    // chú thích khi chọn mặt gốc
    if (pickBase) {
      ctx.fillStyle = 'rgba(37,99,235,0.92)';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Chạm vào một mặt để chọn làm mặt đáy của mạng khai triển', w / 2, 22);
    }
  }, [size, solid, plan, edges, colors, mode, showLabels, fitR, selFace, pickBase]);

  const loop = useCallback(() => {
    raf.current = null;
    const now = performance.now();
    let again = false;
    const a = animRef.current;
    if (a) {
      const t = Math.min(1, (now - a.t0) / a.ms);
      uRef.current = a.from + (a.to - a.from) * ease(t);
      setUUi(uRef.current);
      if (t >= 1) animRef.current = null;
      else again = true;
    }
    const r = rotAnim.current;
    if (r) {
      const t = Math.min(1, (now - r.t0) / r.ms);
      rotRef.current = slerpRot(r.from, r.to, ease(t));
      if (t >= 1) rotAnim.current = null;
      else again = true;
    }
    if (needs.current || again) {
      needs.current = false;
      draw();
    }
    if (again) raf.current = requestAnimationFrame(loop);
  }, [draw]);

  const kick = useCallback(() => {
    needs.current = true;
    if (raf.current == null) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    kick();
  }, [kick, draw]);
  useEffect(() => () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
  }, []);

  // ---------------------------------------------------------------- điều khiển khai triển
  const animateU = (to: number, ms = 1500) => {
    animRef.current = {from: uRef.current, to, t0: performance.now(), ms: Math.max(200, ms * Math.abs(to - uRef.current))};
    kick();
  };
  const unfold = () => {
    animateU(1);
    // quay để nhìn thẳng vào mạng phẳng (giữ nguyên chiều "lên" gần nhất)
    rotAnim.current = {from: rotRef.current, to: orthonormalize(viewAlign(solid, plan.root)), t0: performance.now(), ms: 1300};
    kick();
  };
  const fold = () => {
    animateU(0);
    rotAnim.current = {from: rotRef.current, to: homeRotation(), t0: performance.now(), ms: 1300};
    kick();
  };
  const setUManual = (v: number) => {
    animRef.current = null;
    uRef.current = v;
    setUUi(v);
    kick();
  };

  // ---------------------------------------------------------------- tương tác: xoay, thu phóng, tô màu
  const ptrs = useRef(new Map<number, {x: number; y: number}>());
  const gest = useRef<{x: number; y: number; moved: boolean; pinch: number} | null>(null);
  const local = (e: {clientX: number; clientY: number}) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * size.w) / r.width, y: ((e.clientY - r.top) * size.h) / r.height};
  };

  const pick = (x: number, y: number): number | null => {
    const polys = hitPolys.current;
    for (let i = polys.length - 1; i >= 0; i--) if (pointInPoly(polys[i].poly, x, y)) return polys[i].face;
    return null;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = local(e);
    ptrs.current.set(e.pointerId, p);
    const pts = [...ptrs.current.values()];
    gest.current = {x: p.x, y: p.y, moved: false, pinch: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0};
    rotAnim.current = null; // người dùng cầm lái: dừng quay tự động
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gest.current;
    if (!g || !ptrs.current.has(e.pointerId)) return;
    const p = local(e);
    ptrs.current.set(e.pointerId, p);
    const pts = [...ptrs.current.values()];
    if (pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (g.pinch > 0) zoomRef.current = Math.min(3, Math.max(0.35, zoomRef.current * (d / g.pinch)));
      g.pinch = d;
      g.moved = true;
      kick();
      return;
    }
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    g.moved = true;
    // xoay kiểu trackball: trục vuông góc hướng kéo trong mặt phẳng màn hình
    const d = Math.hypot(dx, dy);
    rotRef.current = orthonormalize(mulMM(rotAxis([dy, dx, 0], d * 0.0095), rotRef.current));
    g.x = p.x;
    g.y = p.y;
    kick();
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gest.current;
    const p = local(e);
    ptrs.current.delete(e.pointerId);
    if (g && !g.moved && ptrs.current.size === 0) {
      const f = pick(p.x, p.y);
      if (f != null) {
        if (pickBase) {
          setRoot(f);
          setPickBase(false);
          animRef.current = null;
          uRef.current = 0;
          setUUi(0);
        } else if (brush) setColors((c) => c.map((x, i) => (i === f ? brush : x)));
        setSelFace(f);
      } else setSelFace(null);
      kick();
    }
    if (ptrs.current.size === 0) gest.current = null;
  };
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(3, Math.max(0.35, zoomRef.current * Math.exp(-e.deltaY * 0.0014)));
      kick();
    };
    el.addEventListener('wheel', onWheel, {passive: false});
    return () => el.removeEventListener('wheel', onWheel);
  }, [kick]);

  // ---------------------------------------------------------------- giao diện
  const paintAll = () => setColors(defaultFaceColors(solid.faces.length));
  const clearColors = () => setColors(solid.faces.map(() => '#CBD5E1'));
  const resetView = () => {
    zoomRef.current = 1;
    rotAnim.current = {from: rotRef.current, to: homeRotation(), t0: performance.now(), ms: 700};
    kick();
  };
  const modeBtn = (m: Mode, label: string) => (
    <button key={m} type="button" data-testid={`geo-mode-${m}`} aria-pressed={mode === m} onClick={() => (setMode(m), kick())} className={`${BTN} ${mode === m ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}>
      {label}
    </button>
  );
  const selInfo = selFace != null ? solid.faces[selFace] : null;

  return (
    <div ref={wrapRef} data-testid="geo-engine" className="w-full flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold text-stone-800" data-testid="geo-title">
          {solid.title}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500" data-testid="geo-counts">
          <span data-testid="geo-stat-faces">{solid.faces.length} mặt</span>·<span data-testid="geo-stat-edges">{edges.length} cạnh</span>·<span data-testid="geo-stat-verts">{solid.verts.length} đỉnh</span>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-[#E6E4DD] bg-white shadow-sm" style={{height: size.h}}>
        <canvas
          ref={canvasRef}
          data-testid="geo-canvas"
          data-unfold={uUi.toFixed(3)}
          data-faces={solid.faces.length}
          data-net-valid={String(plan.valid)}
          data-root={plan.root}
          data-colors={JSON.stringify(colors)}
          style={{width: '100%', height: size.h, touchAction: 'none', cursor: pickBase ? 'crosshair' : brush ? 'copy' : 'grab', display: 'block'}}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={resetView}
        />
        <div className="absolute left-2 top-2 text-[10px] font-mono text-stone-500 bg-white/85 rounded-md px-1.5 py-0.5 pointer-events-none">Kéo: xoay · Cuộn/chụm: thu phóng · Chạm: tô màu/chọn mặt</div>
        {selInfo && (
          <div data-testid="geo-face-info" className="absolute right-2 top-2 text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
            Mặt {selFace! + 1}: {selInfo.map((i) => solid.labels[i]).join('')} · S = {fmtNum(Math.abs(areaOf(solid, selInfo)), 3)}
          </div>
        )}
        {uUi > 0.98 && (
          <div data-testid="geo-net-badge" className={`absolute left-2 bottom-2 text-[11px] font-semibold rounded-lg px-2 py-1 border ${plan.valid ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
            {plan.valid ? '✓ Mạng khai triển hợp lệ (không chồng mặt)' : '⚠ Cách mở này có mặt chồng nhau'}
          </div>
        )}
      </div>

      {/* hàng 1: kiểu hiển thị */}
      <div className="flex flex-wrap items-center gap-1.5">
        {modeBtn('solid', 'Đặc')}
        {modeBtn('ghost', 'Trong suốt')}
        {modeBtn('wire', 'Khung dây')}
        <button type="button" data-testid="geo-labels-toggle" aria-pressed={showLabels} onClick={() => (setShowLabels((v) => !v), kick())} className={`${BTN} ${showLabels ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}>
          Nhãn đỉnh
        </button>
        <button type="button" data-testid="geo-reset-view" onClick={resetView} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50 ml-auto`}>
          ⌖ Góc nhìn gốc
        </button>
      </div>

      {/* hàng 2: bảng màu */}
      <div className="flex flex-wrap items-center gap-1.5" data-testid="geo-palette">
        <span className="text-[11px] font-medium text-stone-600 mr-0.5">Tô mặt:</span>
        {FACE_PALETTE.map((c, i) => (
          <button key={c} type="button" data-testid={`geo-color-${i}`} aria-label={`Màu ${i + 1}`} aria-pressed={brush === c} onClick={() => setBrush((b) => (b === c ? null : c))} className="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform" style={{background: c, borderColor: brush === c ? '#0F172A' : 'transparent', transform: brush === c ? 'scale(1.18)' : undefined, boxShadow: brush === c ? '0 0 0 2px #fff inset' : 'none'}} />
        ))}
        <button type="button" data-testid="geo-paint-all" onClick={paintAll} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50`}>
          Mỗi mặt một màu
        </button>
        <button type="button" data-testid="geo-clear-colors" onClick={clearColors} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50`}>
          Xóa màu
        </button>
      </div>

      {/* hàng 3: khai triển */}
      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] px-3 py-2 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" data-testid="geo-unfold-btn" onClick={unfold} className={`${BTN} bg-blue-600 border-blue-700 text-white shadow-sm`}>
            ▸ Khai triển
          </button>
          <button type="button" data-testid="geo-fold-btn" onClick={fold} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50`}>
            ◂ Gấp lại
          </button>
          <button type="button" data-testid="geo-pick-base" aria-pressed={pickBase} onClick={() => setPickBase((v) => !v)} className={`${BTN} ${pickBase ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}>
            Chọn mặt đáy
          </button>
          <span className="ml-auto text-[10px] font-mono text-stone-500 tabular-nums" data-testid="geo-unfold-val">
            {Math.round(uUi * 100)}%
          </span>
        </div>
        <input data-testid="geo-unfold-slider" type="range" min={0} max={1} step={0.005} value={uUi} onChange={(e) => setUManual(parseFloat(e.target.value))} className="w-full h-1.5 accent-blue-600 cursor-pointer" />
      </div>

      {/* hàng 4: kích thước + số liệu */}
      <div className="grid grid-cols-2 gap-2">
        {solid.dimKeys.map((d) => (
          <label key={d.key} className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] px-3 py-2 flex flex-col gap-1">
            <span className="flex justify-between text-[11px] font-medium text-stone-700">
              <span>{d.label}</span>
              <span data-testid={`geo-dim-val-${d.key}`} className="font-mono font-bold text-blue-600 tabular-nums">
                {fmtNum(d.value, 2)}
              </span>
            </span>
            <input data-testid={`geo-dim-${d.key}`} type="range" min={d.min} max={d.max} step={d.step} value={d.value} onChange={(e) => setDims((p) => ({...p, [d.key]: parseFloat(e.target.value)}))} className="w-full h-1.5 accent-blue-600 cursor-pointer" />
          </label>
        ))}
        {solid.formulas.map((f) => (
          <div key={f.label} className="rounded-xl bg-white border border-[#E5E3DC] px-3 py-2 flex items-center justify-between" data-testid={`geo-measure-${f.latex}`}>
            <span className="text-[11px] text-stone-600 font-medium">{f.label}</span>
            <span className="font-mono text-sm font-bold text-stone-900 tabular-nums">
              {f.latex.replace('_{tp}', 'ₜₚ')} = {fmtNum(f.value, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function areaOf(solid: Solid, face: number[]) {
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < face.length; i++) {
    const a = solid.verts[face[i]];
    const b = solid.verts[face[(i + 1) % face.length]];
    n = [n[0] + (a[1] * b[2] - a[2] * b[1]), n[1] + (a[2] * b[0] - a[0] * b[2]), n[2] + (a[0] * b[1] - a[1] * b[0])];
  }
  return len(n) / 2;
}
