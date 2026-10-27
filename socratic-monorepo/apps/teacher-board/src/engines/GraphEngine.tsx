'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {MathView} from '../components/common/MathView';
import {fmtNum} from '../utils/mathExpr';
import {
  FN_COLORS,
  GraphFn,
  ParamCfg,
  View,
  areaBetween,
  collectParams,
  compileGraphFns,
  defaultView,
  fitView,
  implicitSegments,
  nearestOnCurves,
  niceStep,
  paramValues,
  sampleExplicit,
  specialPoints,
  syncParams,
  toScreen,
  toWorld,
  viewBounds,
} from '../utils/graphModel';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
  isHologram?: boolean;
}

type Pin = {fn: number; x: number};

/** Tách danh sách hàm từ blueprint: ưu tiên `expressions`, nếu không thì tách "y = …; y = …" trong LaTeX nhận dạng. */
export function functionsFromBlueprint(bp: SimulationBlueprint): string[] {
  if (bp.expressions?.length) return bp.expressions.filter(Boolean);
  const raw = bp.recognizedLatex || '';
  const parts = raw
    .split(/\\\\|;|\n|\s+(?:và|and)\s+|\\quad|\\qquad|,\s*(?=\s*(?:y|f|g|h)\s*(?:\(\s*x\s*\))?\s*=)/i)
    .map((s) => s.trim())
    .filter((s) => /=/.test(s) || /x/.test(s));
  return parts.length ? parts : ['y = x^2 - 3'];
}

const BTN = 'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer select-none';

export const GraphEngine: React.FC<Props> = ({blueprint, isHologram = false}) => {
  const initial = useMemo<GraphFn[]>(
    () => functionsFromBlueprint(blueprint).map((text, i) => ({id: `f${i}-${Math.random().toString(36).slice(2, 6)}`, text, color: FN_COLORS[i % FN_COLORS.length], visible: true})),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blueprint.templateId, blueprint.recognizedLatex, (blueprint.expressions || []).join('|')],
  );
  const [fns, setFns] = useState<GraphFn[]>(initial);
  useEffect(() => setFns(initial), [initial]);

  const cfns = useMemo(() => compileGraphFns(fns), [fns]);
  const paramKeys = useMemo(() => collectParams(cfns), [cfns]);
  const [pcfg, setPcfg] = useState<Record<string, ParamCfg>>({});
  useEffect(() => setPcfg((prev) => syncParams(paramKeys, prev)), [paramKeys]);
  const pv = useMemo(() => paramValues(pcfg), [pcfg]);

  // Auto-Play hoạt ảnh biến thiên tham số (▶ / ⏸)
  const [isPlaying, setIsPlaying] = useState(false);
  const playDirRef = useRef<Record<string, number>>({});
  const playRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || paramKeys.length === 0) {
      if (playRafRef.current != null) {
        cancelAnimationFrame(playRafRef.current);
        playRafRef.current = null;
      }
      return;
    }

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPcfg((prev) => {
        const next = {...prev};
        for (const k of paramKeys) {
          const c = next[k];
          if (!c) continue;
          const span = c.max - c.min || 1;
          const speed = span * 0.35; // quét hết miền trong ~2.8s
          let dir = playDirRef.current[k] ?? 1;
          let val = c.value + dir * speed * dt;
          if (val >= c.max) {
            val = c.max;
            dir = -1;
          } else if (val <= c.min) {
            val = c.min;
            dir = 1;
          }
          playDirRef.current[k] = dir;
          next[k] = {...c, value: Number(val.toFixed(2))};
        }
        return next;
      });
      playRafRef.current = requestAnimationFrame(tick);
    };

    playRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRafRef.current != null) {
        cancelAnimationFrame(playRafRef.current);
        playRafRef.current = null;
      }
    };
  }, [isPlaying, paramKeys]);

  const [opt, setOpt] = useState({intersections: true, zeros: false, extrema: false, tangent: false, shade: false});
  const [pins, setPins] = useState<Pin[]>([]);
  const [hover, setHover] = useState<{px: number; py: number} | null>(null);
  const [darkBoard, setDarkBoard] = useState<boolean>(true);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({w: 640, h: 400});
  const viewRef = useRef<View>(defaultView(640, 400));
  const [, force] = useState(0);
  const dirty = useRef(true);
  const raf = useRef<number | null>(null);

  // ---------------------------------------------------------------- kích thước đáp ứng
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      const w = Math.max(280, Math.round(el.clientWidth || 640));
      const h = Math.round(Math.min(480, Math.max(260, w * 0.62)));
      setSize((s) => (s.w === w && s.h === h ? s : {w, h}));
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const refit = useCallback(() => {
    viewRef.current = fitView(cfns, pv, size.w, size.h);
    dirty.current = true;
    force((n) => n + 1);
  }, [cfns, pv, size.w, size.h]);

  // khung nhìn khởi tạo khi đổi bộ hàm hoặc kích thước (không ghi đè khi chỉ kéo tham số)
  const fnSig = cfns.map((f) => f.text).join('|');
  useEffect(() => {
    refit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fnSig, size.w, size.h]);

  // ---------------------------------------------------------------- điểm đặc biệt (tính lại khi đổi hàm, tham số, khung nhìn)
  const specials = useMemo(() => {
    const b = viewBounds(viewRef.current, size.w, size.h);
    return specialPoints(cfns, pv, b.xMin, b.xMax, opt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfns, pv, opt, size.w, size.h, viewRef.current.cx, viewRef.current.sx]);

  const shade = useMemo(() => {
    if (!opt.shade) return null;
    const ex = cfns.map((f, i) => ({f, i})).filter(({f}) => f.kind === 'explicit' && f.visible && f.compiled);
    if (ex.length < 2) return null;
    const r = areaBetween(ex[0].f, ex[1].f, pv);
    return r ? {...r, i: ex[0].i, j: ex[1].i} : null;
  }, [cfns, pv, opt.shade]);

  // ---------------------------------------------------------------- vẽ
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(2.5, window.devicePixelRatio || 1) : 1;
    const {w, h} = size;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = viewRef.current;
    const b = viewBounds(v, w, h);

    if (isHologram) {
      ctx.clearRect(0, 0, w, h);
    } else if (darkBoard) {
      // Nền bảng tối chuẩn tương giao (Obsidian Slate)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }

    // lưới
    const sxStep = niceStep(b.xMax - b.xMin);
    const syStep = niceStep(b.yMax - b.yMin);
    ctx.lineWidth = 1;
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    const isDark = darkBoard && !isHologram;
    const axisCol = isDark ? '#94A3B8' : '#475569';
    const gridCol = isDark ? 'rgba(148, 163, 184, 0.14)' : '#EEF0F3';
    ctx.fillStyle = isDark ? '#CBD5E1' : '#94A3B8';
    const ox = toScreen(v, w, h, 0, 0);
    for (let x = Math.ceil(b.xMin / sxStep) * sxStep; x <= b.xMax; x += sxStep) {
      const px = toScreen(v, w, h, x, 0).px;
      ctx.strokeStyle = Math.abs(x) < 1e-9 ? axisCol : gridCol;
      ctx.lineWidth = Math.abs(x) < 1e-9 ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      if (Math.abs(x) > 1e-9) {
        ctx.textAlign = 'center';
        ctx.fillText(fmtNum(x, 2), px, Math.min(h - 4, Math.max(12, ox.py + 14)));
      }
    }
    for (let y = Math.ceil(b.yMin / syStep) * syStep; y <= b.yMax; y += syStep) {
      const py = toScreen(v, w, h, 0, y).py;
      ctx.strokeStyle = Math.abs(y) < 1e-9 ? axisCol : gridCol;
      ctx.lineWidth = Math.abs(y) < 1e-9 ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
      if (Math.abs(y) > 1e-9) {
        ctx.textAlign = 'right';
        ctx.fillText(fmtNum(y, 2), Math.min(w - 4, Math.max(30, ox.px - 6)), py + 4);
      }
    }
    ctx.fillStyle = isDark ? '#E2E8F0' : '#475569';
    ctx.textAlign = 'left';
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('x', w - 14, Math.min(h - 6, Math.max(14, ox.py - 8)));
    ctx.fillText('y', Math.min(w - 12, Math.max(8, ox.px + 8)), 14);
    ctx.fillText('O', Math.min(w - 12, Math.max(4, ox.px - 14)), Math.min(h - 4, Math.max(12, ox.py + 14)));

    // vùng tô giữa hai đường
    if (shade) {
      const f = cfns[shade.i].compiled!;
      const g = cfns[shade.j].compiled!;
      ctx.beginPath();
      const n = 160;
      for (let k = 0; k <= n; k++) {
        const x = shade.a + ((shade.b - shade.a) * k) / n;
        const p = toScreen(v, w, h, x, f.eval(x, pv));
        k ? ctx.lineTo(p.px, p.py) : ctx.moveTo(p.px, p.py);
      }
      for (let k = n; k >= 0; k--) {
        const x = shade.a + ((shade.b - shade.a) * k) / n;
        const p = toScreen(v, w, h, x, g.eval(x, pv));
        ctx.lineTo(p.px, p.py);
      }
      ctx.closePath();
      ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(99,102,241,0.16)';
      ctx.fill();
    }

    // đường cong
    cfns.forEach((f, idx) => {
      if (!f.visible) return;
      // Nổi bật sắc nét trên nền bảng tối
      const strokeCol = isDark && idx === 1 && f.color === '#2563EB' ? '#38BDF8' : f.color;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (f.kind === 'explicit') {
        ctx.beginPath();
        let pen = false;
        for (const s of sampleExplicit(f, pv, v, w, h)) {
          if (!s) {
            pen = false;
            continue;
          }
          const p = toScreen(v, w, h, s.x, s.y);
          if (p.py < -2000 || p.py > h + 2000) {
            pen = false;
            continue;
          }
          pen ? ctx.lineTo(p.px, p.py) : ctx.moveTo(p.px, p.py);
          pen = true;
        }
        ctx.stroke();
      } else if (f.kind === 'implicit') {
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of implicitSegments(f, pv, v, w, h)) {
          const a = toScreen(v, w, h, x1, y1);
          const c = toScreen(v, w, h, x2, y2);
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(c.px, c.py);
        }
        ctx.stroke();
      }
    });

    // điểm đặc biệt (Giao điểm, nghiệm, cực trị)
    const showLabels = specials.length <= 10;
    specials.forEach((p) => {
      const s = toScreen(v, w, h, p.x, p.y);
      if (s.px < -10 || s.px > w + 10 || s.py < -10 || s.py > h + 10) return;
      const col = p.kind === 'intersection' ? (isDark ? '#FACC15' : '#111827') : p.kind === 'zero' ? '#0891B2' : p.kind === 'max' ? '#DC2626' : '#2563EB';
      ctx.fillStyle = isDark ? '#0F172A' : '#fff';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(s.px, s.py, p.kind === 'intersection' ? 5.8 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (showLabels) {
        const text = `(${fmtNum(p.x, 2)} ; ${fmtNum(p.y, 2)})`;
        ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
        const tw = ctx.measureText(text).width;
        const lx = Math.min(w - tw - 10, Math.max(6, s.px + 8));
        const ly = Math.max(16, s.py - 10);
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255,255,255,0.92)';
        ctx.fillRect(lx - 3, ly - 12, tw + 6, 16);
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.fillText(text, lx, ly);
      }
    });

    // điểm ghim
    pins.forEach((pin) => {
      const f = cfns[pin.fn];
      if (!f || f.kind !== 'explicit' || !f.visible) return;
      const y = f.compiled!.eval(pin.x, pv);
      if (!Number.isFinite(y)) return;
      const s = toScreen(v, w, h, pin.x, y);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.px, s.py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const text = `(${fmtNum(pin.x, 2)} ; ${fmtNum(y, 2)})`;
      ctx.font = '700 12px "JetBrains Mono", ui-monospace, monospace';
      const tw = ctx.measureText(text).width;
      const lx = Math.min(w - tw - 14, Math.max(4, s.px + 10));
      const ly = Math.max(20, s.py - 12);
      ctx.fillStyle = f.color;
      ctx.fillRect(lx - 4, ly - 14, tw + 8, 20);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(text, lx, ly);
    });

    // con trỏ hít vào đường cong + tiếp tuyến
    if (hover) {
      const hit = nearestOnCurves(cfns, pv, v, w, h, hover.px, hover.py);
      if (hit) {
        const f = cfns[hit.fn];
        const s = toScreen(v, w, h, hit.x, hit.y);
        if (opt.tangent) {
          const L = 2.2 / Math.max(0.2, Math.hypot(1, hit.slope));
          const a = toScreen(v, w, h, hit.x - L, hit.y - hit.slope * L);
          const c = toScreen(v, w, h, hit.x + L, hit.y + hit.slope * L);
          ctx.strokeStyle = f.color;
          ctx.setLineDash([6, 5]);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(c.px, c.py);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = isDark ? 'rgba(226,232,240,0.4)' : 'rgba(71,85,105,0.45)';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.px, ox.py);
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(ox.px, s.py);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = f.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.px, s.py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const lines = [`x = ${fmtNum(hit.x, 3)}`, `y = ${fmtNum(hit.y, 3)}`, `k = ${fmtNum(hit.slope, 3)}`];
        ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
        const bw = 92;
        const bx = Math.min(w - bw - 8, Math.max(6, s.px + 14));
        const by = Math.min(h - 56, Math.max(6, s.py - 62));
        ctx.fillStyle = 'rgba(24,24,27,0.92)';
        ctx.beginPath();
        ctx.roundRect?.(bx, by, bw, 52, 8);
        if (!ctx.roundRect) ctx.rect(bx, by, bw, 52);
        ctx.fill();
        ctx.fillStyle = '#F8F7F4';
        ctx.textAlign = 'left';
        lines.forEach((t, i) => ctx.fillText(t, bx + 8, by + 16 + i * 14));
      } else {
        const wp = toWorld(v, w, h, hover.px, hover.py);
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
        ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`(${fmtNum(wp.x, 2)} ; ${fmtNum(wp.y, 2)})`, Math.min(w - 96, hover.px + 10), Math.max(14, hover.py - 8));
      }
    }
  }, [size, cfns, pv, specials, shade, pins, hover, opt.tangent, isHologram, darkBoard]);

  const requestDraw = useCallback(() => {
    dirty.current = true;
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (dirty.current) {
        dirty.current = false;
        draw();
      }
    });
  }, [draw]);

  useEffect(() => {
    requestDraw();
  }, [requestDraw]);
  useEffect(() => () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
  }, []);

  // ---------------------------------------------------------------- tương tác: kéo, thu phóng (chuột + cảm ứng), ghim điểm
  const pointers = useRef(new Map<number, {x: number; y: number}>());
  const gesture = useRef<{startView: View; sx: number; sy: number; dist: number; moved: boolean; mid?: {x: number; y: number}} | null>(null);

  const local = (e: {clientX: number; clientY: number}) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {x: ((e.clientX - r.left) * size.w) / r.width, y: ((e.clientY - r.top) * size.h) / r.height};
  };

  const zoomAt = useCallback(
    (px: number, py: number, factor: number, lockY = false) => {
      const v = viewRef.current;
      const before = toWorld(v, size.w, size.h, px, py);
      const sx = Math.min(4000, Math.max(6, v.sx * factor));
      const sy = lockY ? v.sy : Math.min(4000, Math.max(6, v.sy * factor));
      const nv = {...v, sx, sy};
      const after = toWorld(nv, size.w, size.h, px, py);
      viewRef.current = {...nv, cx: nv.cx + (before.x - after.x), cy: nv.cy + (before.y - after.y)};
      force((n) => n + 1);
      requestDraw();
    },
    [size.w, size.h, requestDraw],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    gesture.current = {startView: {...viewRef.current}, sx: p.x, sy: p.y, dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, moved: false, mid: pts.length > 1 ? {x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2} : undefined};
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const g = gesture.current;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    if (g && pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = {x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2};
      if (g.dist > 0 && d > 0) zoomAt(mid.x, mid.y, d / g.dist);
      g.dist = d;
      g.moved = true;
      return;
    }
    if (g && pointers.current.has(e.pointerId) && e.buttons !== 0) {
      const dx = p.x - g.sx;
      const dy = p.y - g.sy;
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      if (g.moved) {
        viewRef.current = {...g.startView, cx: g.startView.cx - dx / g.startView.sx, cy: g.startView.cy + dy / g.startView.sy};
        force((n) => n + 1);
        requestDraw();
      }
      return;
    }
    setHover({px: p.x, py: p.y});
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    if (g && !g.moved && pointers.current.size === 0) {
      // chạm: ghim / bỏ ghim điểm trên đường cong gần nhất
      const hit = nearestOnCurves(cfns, pv, viewRef.current, size.w, size.h, p.x, p.y, 34);
      if (hit) {
        setPins((prev) => {
          const near = prev.findIndex((q) => q.fn === hit.fn && Math.abs(q.x - hit.x) * viewRef.current.sx < 12);
          return near >= 0 ? prev.filter((_, i) => i !== near) : [...prev.slice(-5), {fn: hit.fn, x: hit.x}];
        });
      }
    }
    if (pointers.current.size === 0) gesture.current = null;
    if (e.pointerType !== 'mouse') setHover(null);
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = ((e.clientX - r.left) * size.w) / r.width;
      const py = ((e.clientY - r.top) * size.h) / r.height;
      zoomAt(px, py, Math.exp(-e.deltaY * 0.0016), e.shiftKey);
    };
    el.addEventListener('wheel', onWheel, {passive: false});
    return () => el.removeEventListener('wheel', onWheel);
  }, [size.w, size.h, zoomAt]);

  // ---------------------------------------------------------------- giao diện điều khiển
  const updateFn = (id: string, patch: Partial<GraphFn>) => setFns((prev) => prev.map((f) => (f.id === id ? {...f, ...patch} : f)));
  const addFn = () => setFns((prev) => (prev.length >= 8 ? prev : [...prev, {id: `f-${Date.now()}`, text: 'y = ', color: FN_COLORS[prev.length % FN_COLORS.length], visible: true}]));
  const removeFn = (id: string) => setFns((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  const toggle = (k: keyof typeof opt) => setOpt((o) => ({...o, [k]: !o[k]}));

  const chip = (k: keyof typeof opt, label: string) => (
    <button key={k} type="button" data-testid={`graph-toggle-${k}`} aria-pressed={opt[k]} onClick={() => toggle(k)} className={`${BTN} ${opt[k] ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}>
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} data-testid="graph-engine" className="w-full flex flex-col gap-2.5">
      {/* danh sách hàm */}
      <div className="flex flex-col gap-1.5" data-testid="graph-fn-list">
        {cfns.map((f, i) => (
          <div key={f.id} className="flex items-center gap-2 rounded-xl bg-white border border-[#E6E4DD] px-2 py-1.5 shadow-xs">
            <button type="button" data-testid={`graph-fn-visible-${i}`} aria-label={f.visible ? 'Ẩn đồ thị' : 'Hiện đồ thị'} onClick={() => updateFn(f.id, {visible: !f.visible})} className="w-5 h-5 rounded-full border-2 shrink-0 cursor-pointer" style={{borderColor: f.color, background: f.visible ? f.color : 'transparent'}} />
            <input
              data-testid={`graph-fn-input-${i}`}
              value={f.text}
              spellCheck={false}
              onChange={(e) => updateFn(f.id, {text: e.target.value})}
              className={`flex-1 min-w-0 px-2 py-1 rounded-lg text-xs font-mono bg-[#F8F7F4] border focus:outline-none ${f.kind === 'error' && f.text.trim().length > 2 ? 'border-rose-300 focus:border-rose-400' : 'border-[#E6E4DD] focus:border-blue-400'}`}
            />
            <div className="hidden sm:block text-sm min-w-[120px] text-stone-900" data-testid={`graph-fn-latex-${i}`}>
              {f.kind !== 'error' ? <MathView latex={f.latex} /> : <span className="text-[10px] text-rose-600 font-mono">{f.error}</span>}
            </div>
            <button type="button" data-testid={`graph-fn-remove-${i}`} aria-label="Xóa hàm" onClick={() => removeFn(f.id)} className="w-6 h-6 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer text-sm leading-none">
              ×
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" data-testid="graph-add-fn" onClick={addFn} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50`}>
            + Thêm hàm
          </button>
          {chip('intersections', 'Giao điểm')}
          {chip('zeros', 'Nghiệm')}
          {chip('extrema', 'Cực trị')}
          {chip('tangent', 'Tiếp tuyến')}
          {chip('shade', 'Diện tích')}
          <button
            type="button"
            data-testid="graph-toggle-darkboard"
            aria-pressed={darkBoard}
            onClick={() => setDarkBoard((d) => !d)}
            className={`${BTN} ${darkBoard ? 'bg-slate-800 border-slate-900 text-amber-300 shadow-sm' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}
          >
            {darkBoard ? '🌙 Nền tối' : '☀ Nền sáng'}
          </button>
          <button type="button" data-testid="graph-reset-view" onClick={refit} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50 ml-auto`}>
            ⌖ Khung gốc
          </button>
        </div>
      </div>

      {/* canvas + Cụm HUD Thanh trượt góc trên bên phải có nút Auto-Play ▶ */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E6E4DD] bg-white shadow-sm" style={{height: size.h}}>
        <canvas
          ref={canvasRef}
          data-testid="graph-canvas"
          data-intersections={specials.filter((p) => p.kind === 'intersection').length}
          data-fn-count={cfns.filter((f) => f.kind !== 'error' && f.visible).length}
          data-dark-board={String(darkBoard)}
          data-view={`${viewRef.current.cx.toFixed(3)},${viewRef.current.cy.toFixed(3)},${viewRef.current.sx.toFixed(2)}`}
          style={{width: '100%', height: size.h, touchAction: 'none', cursor: gesture.current?.moved ? 'grabbing' : 'crosshair', display: 'block'}}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={refit}
        />
        <div className="absolute left-2 top-2 text-[10px] font-mono text-stone-500 bg-white/85 rounded-md px-1.5 py-0.5 pointer-events-none">
          Kéo: dịch · Cuộn/chụm: thu phóng · Chạm: ghim điểm
        </div>

        {/* Cụm HUD Thanh trượt tham số (A, B, m...) gọn ngay góc trên bên phải đồ thị kèm nút Auto-Play ▶ */}
        {paramKeys.length > 0 && (
          <div
            data-testid="graph-hud-params"
            data-interactive="true"
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-2.5 top-2.5 z-20 w-56 rounded-xl bg-slate-900/88 backdrop-blur-md border border-slate-600/70 px-3 py-2 text-white shadow-lg flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                Tham số biến thiên
              </span>
              <button
                type="button"
                data-testid="graph-autoplay-btn"
                aria-pressed={isPlaying}
                onClick={() => setIsPlaying((p) => !p)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                  isPlaying
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/40'
                }`}
                title={isPlaying ? 'Tạm dừng chạy biến thiên tự động' : 'Tự động chạy biến thiên mượt mà'}
              >
                <span>{isPlaying ? '⏸ Pause' : '▶ Auto-Play'}</span>
              </button>
            </div>
            <div className="flex flex-col gap-1.5" data-testid="graph-params">
              {paramKeys.map((k) => {
                const c = pcfg[k];
                if (!c) return null;
                return (
                  <label key={k} className="flex flex-col gap-0.5">
                    <span className="flex justify-between text-[11px] font-medium text-slate-200">
                      <span className="font-serif italic text-xs text-amber-300">{k}</span>
                      <span data-testid={`graph-param-val-${k}`} className="font-mono font-bold text-cyan-300 tabular-nums text-[11px]">
                        {fmtNum(c.value, 2)}
                      </span>
                    </span>
                    <input
                      data-testid={`graph-param-${k}`}
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={c.value}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setPcfg((p) => ({...p, [k]: {...p[k], value: parseFloat(e.target.value)}}));
                      }}
                      className="w-full h-1.5 accent-cyan-400 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {shade && (
          <div data-testid="graph-area-badge" className="absolute left-2 bottom-2 text-xs font-mono font-bold text-indigo-700 bg-indigo-50/95 border border-indigo-200 rounded-lg px-2 py-1">
            S ≈ {fmtNum(shade.area, 3)} (x từ {fmtNum(shade.a, 2)} đến {fmtNum(shade.b, 2)})
          </div>
        )}
      </div>
    </div>
  );
};
