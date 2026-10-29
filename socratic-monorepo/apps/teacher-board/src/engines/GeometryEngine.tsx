'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum} from '../utils/mathExpr';
import type {SolidKind} from '../utils/localRouter';
import {RANGE_CLASS, rangeFill, usePrefersReducedMotion} from './visualKit';
import {
  Cam,
  FACE_PALETTE,
  M3,
  Solid,
  V3,
  centroid,
  computeCrossSection,
  defaultFaceColors,
  dot,
  edgesOf,
  faceNormal,
  getCrossSectionPresets,
  len,
  makeSolid,
  mulMM,
  mulMV,
  orthonormalize,
  planUnfold,
  planeFromThreePoints,
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
  isHologram?: boolean;
}

/** Vị trí các đỉnh thiết diện trên bảng 2D thật (nửa trái khi cắt thiết diện); dùng chung cho hình 2D và cho "tách ra ngoài". */
function sectionFlatPts(cs: {vertices: {pos2D: [number, number]}[]}, splitX: number, h: number) {
  const maxR = Math.max(0.5, ...cs.vertices.map((v) => Math.hypot(v.pos2D[0], v.pos2D[1])));
  const scale = (Math.min(splitX, h) * 0.31) / maxR;
  return cs.vertices.map((v) => ({x: splitX * 0.5 + v.pos2D[0] * scale, y: h * 0.52 - v.pos2D[1] * scale}));
}

type Mode = 'solid' | 'ghost' | 'wire' | 'section';
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

const VERT_NAMES_SECTION = ['M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U'];

export interface AuxPoint3D {
  id: string;
  label: string;
  pos: V3;
  kind: 'vertex' | 'midpoint' | 'center' | 'projection';
}

export interface AuxSegment3D {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  dashed?: boolean;
  label?: string;
}

export const GeometryEngine: React.FC<Props> = ({blueprint, isHologram}) => {
  const initialKind = ((blueprint.meta?.solid as SolidKind) || 'cube') as SolidKind;
  const [activeKind, setActiveKind] = useState<SolidKind>(initialKind);
  useEffect(() => {
    setActiveKind(((blueprint.meta?.solid as SolidKind) || 'cube') as SolidKind);
  }, [blueprint.meta?.solid]);
  const kind = activeKind;
  const initialMode = (blueprint.meta?.initialMode as Mode) || 'solid';
  const [dims, setDims] = useState<Record<string, number>>(() => ({...(blueprint.meta?.dims || {})}));
  useEffect(() => setDims({...(blueprint.meta?.dims || {})}), [kind, blueprint.meta?.dims]);

  const solid: Solid = useMemo(() => makeSolid(kind, dims), [kind, dims]);
  const edges = useMemo(() => edgesOf(solid.faces), [solid]);
  const [root, setRoot] = useState(0);
  useEffect(() => setRoot(0), [kind, isHologram]);
  const plan = useMemo(() => planUnfold(solid, Math.min(root, solid.faces.length - 1)), [solid, root]);

  // ---------------- Công cụ Vẽ thêm Hình phụ 3D (Dựng đường phụ, trung điểm, đường cao, mặt phẳng) ----------------
  const [showConstructBar, setShowConstructBar] = useState<boolean>(false);
  const [showMidpoints, setShowMidpoints] = useState<boolean>(false);
  const [showAltitude, setShowAltitude] = useState<boolean>(false);
  const [showBaseDiagonals, setShowBaseDiagonals] = useState<boolean>(false);
  const [showCircumSphere, setShowCircumSphere] = useState<boolean>(false);
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [pendingFromId, setPendingFromId] = useState<string | null>(null);
  const [customSegments, setCustomSegments] = useState<AuxSegment3D[]>([]);
  useEffect(() => {
    setCustomSegments([]);
    setPendingFromId(null);
  }, [kind]);

  // Danh sách toàn bộ các điểm đặc biệt 3D (đỉnh khối, trung điểm cạnh, tâm đáy O, chân đường cao H)
  const allAuxPoints = useMemo<AuxPoint3D[]>(() => {
    const pts: AuxPoint3D[] = solid.verts.map((v, i) => ({
      id: `V-${i}`,
      label: solid.labels[i] ?? `V${i}`,
      pos: v,
      kind: 'vertex',
    }));
    const baseFace = solid.faces[0] || [];
    if (baseFace.length >= 3) {
      const baseCenter = centroid(baseFace.map((vi) => solid.verts[vi]));
      pts.push({
        id: 'O-base',
        label: 'O',
        pos: baseCenter,
        kind: 'center',
      });
    }
    if (showMidpoints) {
      const midLabels = ['M', 'N', 'P', 'Q', 'E', 'F', 'I', 'J', 'K', 'L', 'G', 'R'];
      edges.forEach(([a, b], ei) => {
        const va = solid.verts[a];
        const vb = solid.verts[b];
        const mid: V3 = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2];
        const lbl = midLabels[ei] || `M${ei + 1}`;
        pts.push({
          id: `M-${ei}`,
          label: lbl,
          pos: mid,
          kind: 'midpoint',
        });
      });
    }
    return pts;
  }, [solid, edges, showMidpoints]);

  const [colors, setColors] = useState<string[]>(() => defaultFaceColors(solid.faces.length));
  useEffect(() => setColors((prev) => (prev.length === solid.faces.length ? prev : defaultFaceColors(solid.faces.length))), [solid.faces.length]);
  const [brush, setBrush] = useState<string | null>(null);
  const [pickBase, setPickBase] = useState(false);
  const [selFace, setSelFace] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => {
    if (blueprint.meta?.initialMode) {
      setMode(blueprint.meta.initialMode as Mode);
    }
  }, [blueprint.meta?.initialMode]);
  const [showLabels, setShowLabels] = useState(true);

  // ---------------- Chế độ Cắt Thiết Diện (Cross-Section) ----------------
  const [sectionCtrlMode, setSectionCtrlMode] = useState<'plane' | 'threePoints'>('plane');
  const [planeNormal, setPlaneNormal] = useState<V3>(() =>
    (blueprint.meta?.sectionNormal as V3) || [1, 1, 1],
  );
  const [planeOffset, setPlaneOffset] = useState<number>(() =>
    typeof blueprint.meta?.sectionOffset === 'number' ? (blueprint.meta.sectionOffset as number) : 0,
  );
  useEffect(() => {
    if (blueprint.meta?.sectionNormal) setPlaneNormal(blueprint.meta.sectionNormal as V3);
    if (typeof blueprint.meta?.sectionOffset === 'number') setPlaneOffset(blueprint.meta.sectionOffset as number);
  }, [blueprint.meta?.sectionNormal, blueprint.meta?.sectionOffset]);

  // 3 điểm điều khiển trên cạnh: lưu (chỉ số cạnh, tham số t ∈ [0.05, 0.95])
  const [threePts, setThreePts] = useState<{edgeIdx: number; t: number}[]>(() => [
    {edgeIdx: 0, t: 0.5},
    {edgeIdx: Math.min(2, Math.max(0, edges.length - 1)), t: 0.5},
    {edgeIdx: Math.min(5, Math.max(0, edges.length - 1)), t: 0.5},
  ]);
  useEffect(() => {
    setThreePts([
      {edgeIdx: 0, t: 0.5},
      {edgeIdx: Math.min(2, Math.max(0, edges.length - 1)), t: 0.5},
      {edgeIdx: Math.min(5, Math.max(0, edges.length - 1)), t: 0.5},
    ]);
  }, [kind, edges.length]);

  const activePlane = useMemo(() => {
    if (sectionCtrlMode === 'threePoints' && edges.length >= 3) {
      const pts3D = threePts.map((tp) => {
        const [a, b] = edges[tp.edgeIdx % edges.length];
        const va = solid.verts[a];
        const vb = solid.verts[b];
        return [
          va[0] + (vb[0] - va[0]) * tp.t,
          va[1] + (vb[1] - va[1]) * tp.t,
          va[2] + (vb[2] - va[2]) * tp.t,
        ] as V3;
      });
      return planeFromThreePoints(pts3D[0], pts3D[1], pts3D[2]);
    }
    return {normal: planeNormal, d: planeOffset};
  }, [sectionCtrlMode, threePts, edges, solid.verts, planeNormal, planeOffset]);

  const crossSection = useMemo(
    () => computeCrossSection(solid, activePlane.normal, activePlane.d),
    [solid, activePlane],
  );

  const presets = useMemo(() => getCrossSectionPresets(kind), [kind]);
  const applySectionPreset = (normal: V3, dRatio: number) => {
    const aVal = dims.a ?? 2;
    setSectionCtrlMode('plane');
    setPlaneNormal(normal);
    setPlaneOffset(Number((dRatio * aVal).toFixed(2)));
    setMode('section');
  };

  // unfold: u thật (ref, đọc trong vòng vẽ) + u hiển thị cho thanh trượt
  const reducedMotion = usePrefersReducedMotion();
  /** "Tách thiết diện": 0 = nằm trong khối, 1 = bản sao đã bay sang bảng 2D thật */
  const [extended, setExtended] = useState(false);
  const extRef = useRef(0);
  const extAnim = useRef<{from: number; to: number; t0: number; ms: number} | null>(null);
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

  // Kéo trực tiếp 3 điểm M, N, P trên cạnh 3D
  const draggingPtIdxRef = useRef<number | null>(null);
  const screenCtrlPtsRef = useRef<{x: number; y: number; edgeIdx: number}[]>([]);
  const screenAuxPtsRef = useRef<{id: string; label: string; x: number; y: number}[]>([]);

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
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);

    const isSectionMode = mode === 'section';
    const splitX = isSectionMode ? Math.round(w * 0.46) : 0;

    if (isHologram) {
      ctx.clearRect(0, 0, w, h);
    } else if (ctx.createRadialGradient) {
      const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#FFFFFF');
      bg.addColorStop(1, '#F1EFEA');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    }

    // Nếu ở chế độ Cắt Thiết Diện: Bên trái (0 .. splitX) vẽ Hình phẳng 2D trích xuất thật, Bên phải (splitX .. w) vẽ Hình 3D có mặt cắt xanh bán trong suốt
    if (isSectionMode) {
      if (!isHologram) {
        // Nền khu vực 2D bên trái (bảng kỹ thuật sáng rõ)
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, splitX, h);

        // Lưới kỹ thuật mịn bên trái
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = 20; gx < splitX; gx += 24) {
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, h);
        }
        for (let gy = 20; gy < h; gy += 24) {
          ctx.moveTo(0, gy);
          ctx.lineTo(splitX, gy);
        }
        ctx.stroke();

        // Đường phân cách dọc
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, h);
        ctx.stroke();
      } else {
        // Chế độ Hologram (bảng đen sống động): Không vẽ khối chữ nhật đục!
        // Đường phân cách dọc thanh mảnh dạng nét đứt màu cyan
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(splitX, 12);
        ctx.lineTo(splitX, h - 12);
        ctx.stroke();
        ctx.restore();
      }

      // Tiêu đề khung 2D bên trái
      ctx.fillStyle = isHologram ? '#0891B2' : '#0F172A';
      ctx.font = '700 11px ui-sans-serif, system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('MẶT CẮT 2D THẬT (TRÍCH XUẤT TRỰC GIAO)', 12, 20);

      if (crossSection.valid && crossSection.vertices.length >= 3) {
        const verts2D = crossSection.vertices;
        const pts2 = sectionFlatPts(crossSection, splitX, h);
        const cx2 = splitX * 0.5;
        const cy2 = h * 0.52;

        // Vẽ miền đa giác thiết diện 2D màu xanh ngọc bán trong suốt
        ctx.beginPath();
        pts2.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = isHologram ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#0891B2';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Vẽ cung góc (độ) tại mỗi đỉnh
        pts2.forEach((p, idx) => {
          const prv = pts2[(idx - 1 + pts2.length) % pts2.length];
          const nxt = pts2[(idx + 1) % pts2.length];
          const a1 = Math.atan2(prv.y - p.y, prv.x - p.x);
          const a2 = Math.atan2(nxt.y - p.y, nxt.x - p.x);

          // Vẽ cung góc nhỏ hướng vào tâm đa giác
          const arcR = 16;
          ctx.beginPath();
          // Chọn chiều quay ngắn hơn đi qua miền trong đa giác
          let diff = a2 - a1;
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          ctx.arc(p.x, p.y, arcR, a1, a1 + diff, diff < 0);
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Ghi số đo góc (độ)
          const midA = a1 + diff / 2;
          const ax = p.x + Math.cos(midA) * (arcR + 11);
          const ay = p.y + Math.sin(midA) * (arcR + 11);
          ctx.fillStyle = isHologram ? '#0284C7' : '#0369A1';
          ctx.font = '700 10px "JetBrains Mono", ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(verts2D[idx].angleDeg)}°`, ax, ay + 3);
        });

        // Vẽ độ dài từng cạnh trên trung điểm cạnh
        pts2.forEach((p, idx) => {
          const nxt = pts2[(idx + 1) % pts2.length];
          const mx = (p.x + nxt.x) / 2;
          const my = (p.y + nxt.y) / 2;
          const dx = mx - cx2;
          const dy = my - cy2;
          const dl = Math.hypot(dx, dy) || 1;
          const lx = mx + (dx / dl) * 13;
          const ly = my + (dy / dl) * 13;
          const lenStr = fmtNum(verts2D[idx].nextEdgeLen, 2);
          ctx.font = '700 10px "JetBrains Mono", ui-monospace, monospace';
          const tw = ctx.measureText(lenStr).width;
          ctx.fillStyle = isHologram ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255,255,255,0.92)';
          ctx.fillRect(lx - tw / 2 - 3, ly - 8, tw + 6, 13);
          ctx.fillStyle = isHologram ? '#38BDF8' : '#0F172A';
          ctx.textAlign = 'center';
          ctx.fillText(lenStr, lx, ly + 2);
        });

        // Vẽ đỉnh thiết diện & tên đỉnh M, N, P...
        pts2.forEach((p, idx) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#06B6D4';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const dx = p.x - cx2;
          const dy = p.y - cy2;
          const dl = Math.hypot(dx, dy) || 1;
          const lx = p.x + (dx / dl) * 16;
          const ly = p.y + (dy / dl) * 16;
          const vLabel = VERT_NAMES_SECTION[idx] || `P${idx + 1}`;
          ctx.fillStyle = '#0F172A';
          ctx.font = 'italic 700 12px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText(vLabel, lx, ly + 4);
        });

        // Nhãn diện tích & tên hình ở góc dưới khung 2D
        ctx.fillStyle = isHologram ? 'rgba(15, 23, 42, 0.85)' : 'rgba(236, 254, 255, 0.95)';
        ctx.strokeStyle = isHologram ? '#0891B2' : '#67E8F9';
        ctx.lineWidth = 1;
        ctx.fillRect(10, h - 54, splitX - 20, 44);
        ctx.strokeRect(10, h - 54, splitX - 20, 44);

        ctx.fillStyle = isHologram ? '#38BDF8' : '#0E7490';
        ctx.font = '700 12px ui-sans-serif, system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`${crossSection.shapeName} (${verts2D.length} cạnh)`, 18, h - 35);
        ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = isHologram ? '#7DD3FC' : '#155E75';
        ctx.fillText(
          `S = ${fmtNum(crossSection.area, 3)}   •   P = ${fmtNum(crossSection.perimeter, 2)}`,
          18,
          h - 18,
        );
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = '500 12px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Mặt phẳng hiện không cắt qua miền trong khối', splitX / 2, h / 2);
      }
    }

    // Khung vẽ 3D (toàn bộ nếu bình thường, hoặc nửa phải nếu ở chế độ Cắt Thiết Diện)
    const view3DW = isSectionMode ? w - splitX : w;
    const view3DCx = isSectionMode ? splitX + view3DW / 2 : w / 2;

    const u = isSectionMode ? 0 : uRef.current;
    const faceV = unfoldedFaces(solid, plan, u);
    const center = centroid(faceV.flat());
    const R = rotRef.current;
    const rNow = fitR.r0 + (fitR.r1 - fitR.r0) * u;
    const zoom = (Math.min(view3DW, h) * 0.5 * 0.8 * zoomRef.current) / Math.max(0.5, rNow);
    const cam: Cam = {R, zoom, cx: view3DCx, cy: h / 2, dist: rNow * 7};

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
    if (ctx.createRadialGradient) {
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
    }

    // mặt (trong chế độ section thì khối bán trong suốt nhẹ để thấy rõ mặt cắt xanh bên trong)
    const alpha = mode === 'solid' ? 1 : mode === 'ghost' ? 0.34 : mode === 'section' ? 0.18 : 0;
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
      solid.faces.forEach((f, fi) =>
        f.forEach((a, k) => {
          const b = f[(k + 1) % f.length];
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          (adjFaces.get(key) ?? adjFaces.set(key, []).get(key)!).push(fi);
        }),
      );
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

    // Vẽ mặt phẳng thiết diện 3D xanh bán trong suốt bên phải
    screenCtrlPtsRef.current = [];
    if (isSectionMode && crossSection.valid && crossSection.vertices.length >= 3) {
      const secPts3D = crossSection.vertices.map((v) => project(cam, v.pos3D, center));
      ctx.save();
      ctx.beginPath();
      secPts3D.forEach((p, idx) => (idx ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.42)';
      ctx.fill();
      ctx.strokeStyle = '#0891B2';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Vẽ các đỉnh giao điểm M, N, P... trên hình 3D
      secPts3D.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#06B6D4';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const vLabel = VERT_NAMES_SECTION[idx] || `P${idx + 1}`;
        ctx.fillStyle = '#0E7490';
        ctx.font = 'italic 700 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(vLabel, p.x + 10, p.y - 6);
      });
      ctx.restore();

      // Bản sao thiết diện tách khỏi khối, bay sang bảng 2D thật; nét đứt nối từng đỉnh với vị trí gốc
      const e = extRef.current;
      if (e > 0.001) {
        const flat = sectionFlatPts(crossSection, splitX, h);
        const mid = secPts3D.map((p, i) => ({x: p.x + (flat[i].x - p.x) * e, y: p.y + (flat[i].y - p.y) * e}));
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(8, 145, 178, 0.55)';
        ctx.lineWidth = 1.2;
        mid.forEach((m, i) => {
          ctx.beginPath();
          ctx.moveTo(secPts3D[i].x, secPts3D[i].y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.beginPath();
        mid.forEach((m, i) => (i ? ctx.lineTo(m.x, m.y) : ctx.moveTo(m.x, m.y)));
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.38)';
        ctx.fill();
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Nếu đang ở chế độ kéo 3 điểm trên cạnh: vẽ 3 nút tròn cam nổi bật để giáo viên chạm kéo trực tiếp
    if (isSectionMode && sectionCtrlMode === 'threePoints' && edges.length >= 3) {
      threePts.forEach((tp, idx) => {
        const [a, b] = edges[tp.edgeIdx % edges.length];
        const va = solid.verts[a];
        const vb = solid.verts[b];
        const pos: V3 = [
          va[0] + (vb[0] - va[0]) * tp.t,
          va[1] + (vb[1] - va[1]) * tp.t,
          va[2] + (vb[2] - va[2]) * tp.t,
        ];
        const sp = project(cam, pos, center);
        screenCtrlPtsRef.current.push({x: sp.x, y: sp.y, edgeIdx: tp.edgeIdx});

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // mặt được chọn
    if (selFace != null && !isSectionMode) {
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
    if (u > 0.5 && !isSectionMode) {
      const f = pfs.find((p) => p.i === plan.root);
      if (f) {
        const c = f.poly.reduce((s, p) => ({x: s.x + p.x / f.poly.length, y: s.y + p.y / f.poly.length}), {x: 0, y: 0});
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.font = '700 11px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('MẶT ĐÁY', c.x, c.y + 4);
      }
    }

    // Nút chấm cảm ứng tại các đỉnh khối 3D (Frame 36 trong video)
    if (u < 0.02) {
      solid.verts.forEach((v) => {
        const p = project(cam, v, center);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // nhãn đỉnh (khi còn là khối): đỉnh bị che hiện mờ
    if (showLabels && u < 0.02) {
      const frontOf = pfs.reduce<Record<number, boolean>>((m, f) => ((m[f.i] = f.front), m), {});
      const visVert = solid.verts.map(() => false);
      solid.faces.forEach((f, fi) =>
        f.forEach((vi) => {
          if (frontOf[fi]) visVert[vi] = true;
        }),
      );
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
    if (pickBase && !isSectionMode) {
      ctx.fillStyle = 'rgba(37,99,235,0.92)';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Chạm vào một mặt để chọn làm mặt đáy của mạng khai triển', w / 2, 22);
    }

    // ---------------- Vẽ các yếu tố hình phụ 3D (Đường chéo đáy, Đường cao SO, Trung điểm, Mặt cầu ngoại tiếp, Đoạn thẳng nối thêm) ----------------
    screenAuxPtsRef.current = [];
    if (u < 0.02) {
      allAuxPoints.forEach((ap) => {
        const sp = project(cam, ap.pos, center);
        screenAuxPtsRef.current.push({id: ap.id, label: ap.label, x: sp.x, y: sp.y});
      });

      const baseFace = solid.faces[0] || [];
      const baseCenterPt = allAuxPoints.find((p) => p.id === 'O-base');

      // 1. Đường chéo đáy AC, BD và tâm đáy O
      if (showBaseDiagonals && baseFace.length >= 4 && baseCenterPt) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#0D9488';
        ctx.lineWidth = 1.8;
        const p0 = project(cam, solid.verts[baseFace[0]], center);
        const p2 = project(cam, solid.verts[baseFace[2]], center);
        const p1 = project(cam, solid.verts[baseFace[1]], center);
        const p3 = project(cam, solid.verts[baseFace[3]], center);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const spO = project(cam, baseCenterPt.pos, center);
        ctx.beginPath();
        ctx.arc(spO.x, spO.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0D9488';
        ctx.fill();
        ctx.font = 'italic 700 13px Georgia, serif';
        ctx.fillText('O', spO.x + 10, spO.y + 12);
        ctx.restore();
      }

      // 2. Đường cao SO / SH vuông góc mặt đáy kèm ký hiệu góc vuông chuẩn SGK
      if (showAltitude && baseCenterPt) {
        // Chọn đỉnh cao nhất theo trục z (đỉnh S của hình chóp hoặc A' của lăng trụ/hộp)
        let topIdx = solid.verts.length - 1;
        let maxZ = -Infinity;
        solid.verts.forEach((v, idx) => {
          if (v[2] > maxZ) {
            maxZ = v[2];
            topIdx = idx;
          }
        });
        const topPos = solid.verts[topIdx];
        const footPos: V3 =
          kind === 'pyramid4' || kind === 'pyramid3' || kind === 'octahedron'
            ? baseCenterPt.pos
            : [topPos[0], topPos[1], solid.verts[baseFace[0] ?? 0][2]];
        const spTop = project(cam, topPos, center);
        const spFoot = project(cam, footPos, center);

        ctx.save();
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(spTop.x, spTop.y);
        ctx.lineTo(spFoot.x, spFoot.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ký hiệu góc vuông tại chân đường cao H / O
        const refVert = solid.verts[baseFace[0] ?? 0];
        const spRef = project(cam, refVert, center);
        const vx = spTop.x - spFoot.x;
        const vy = spTop.y - spFoot.y;
        const vl = Math.hypot(vx, vy) || 1;
        const ux = spRef.x - spFoot.x;
        const uy = spRef.y - spFoot.y;
        const ul = Math.hypot(ux, uy) || 1;
        const sq = 9;
        const pA = {x: spFoot.x + (vx / vl) * sq, y: spFoot.y + (vy / vl) * sq};
        const pB = {x: spFoot.x + (ux / ul) * sq, y: spFoot.y + (uy / ul) * sq};
        const pAB = {x: pA.x + (ux / ul) * sq, y: pA.y + (uy / ul) * sq};
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pAB.x, pAB.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(spFoot.x, spFoot.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#E11D48';
        ctx.fill();
        ctx.font = 'italic 700 13px Georgia, serif';
        ctx.fillText(kind === 'pyramid4' || kind === 'pyramid3' ? 'O (H)' : 'H', spFoot.x + 12, spFoot.y + 4);
        ctx.restore();
      }

      // 3. Mặt cầu ngoại tiếp (Circumscribed Sphere) — Vẽ 3 đường tròn lớn trực giao 3D (Đỏ XY, Xanh lá YZ, Xanh dương XZ) theo chuẩn Video Frame 35
      if (showCircumSphere && solid.verts.length > 0) {
        const c3 = centroid(solid.verts);
        const rSphere = Math.max(...solid.verts.map((v) => len(sub(v, c3))));
        const spCenter = project(cam, c3, center);
        const pxR = rSphere * zoom;

        ctx.save();

        // 3a. Bóng khối cầu bán trong suốt dạng thủy tinh
        if (ctx.createRadialGradient) {
          const grad = ctx.createRadialGradient(
            spCenter.x - pxR * 0.25,
            spCenter.y - pxR * 0.25,
            pxR * 0.1,
            spCenter.x,
            spCenter.y,
            pxR,
          );
          grad.addColorStop(0, 'rgba(191, 219, 254, 0.25)');
          grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.08)');
          grad.addColorStop(1, 'rgba(37, 99, 235, 0.22)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        }
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(spCenter.x, spCenter.y, pxR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hàm vẽ đường tròn lớn 3D có phân biệt nửa trước / nửa sau theo chiều sâu camera
        const draw3DGreatCircle = (pts3D: V3[], color: string) => {
          const count = pts3D.length;
          const proj = pts3D.map((p) => project(cam, p, center));
          for (let i = 0; i < count; i++) {
            const pA = proj[i];
            const pB = proj[(i + 1) % count];
            const isFront = (pA.z + pB.z) / 2 > 0;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = isFront ? 2.5 : 1.4;
            if (isFront) {
              ctx.setLineDash([]);
              ctx.globalAlpha = 0.95;
            } else {
              ctx.setLineDash([4, 4]);
              ctx.globalAlpha = 0.42;
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
        };

        const NUM_CIRCLE_SEGS = 64;
        const xyCircle: V3[] = [];
        const yzCircle: V3[] = [];
        const xzCircle: V3[] = [];
        for (let i = 0; i < NUM_CIRCLE_SEGS; i++) {
          const th = (i * Math.PI * 2) / NUM_CIRCLE_SEGS;
          const cos = Math.cos(th);
          const sin = Math.sin(th);
          // Đường xích đạo XY: màu đỏ
          xyCircle.push([c3[0] + rSphere * cos, c3[1] + rSphere * sin, c3[2]]);
          // Đường kinh tuyến YZ: màu xanh lá
          yzCircle.push([c3[0], c3[1] + rSphere * cos, c3[2] + rSphere * sin]);
          // Đường kinh tuyến XZ: màu xanh dương
          xzCircle.push([c3[0] + rSphere * cos, c3[1], c3[2] + rSphere * sin]);
        }

        draw3DGreatCircle(xyCircle, '#EF4444');
        draw3DGreatCircle(yzCircle, '#10B981');
        draw3DGreatCircle(xzCircle, '#3B82F6');

        // Tâm mặt cầu O
        ctx.beginPath();
        ctx.arc(spCenter.x, spCenter.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'italic 700 13px Georgia, serif';
        ctx.fillStyle = '#1E3A8A';
        ctx.fillText('O', spCenter.x + 8, spCenter.y - 6);

        // Bán kính R nối từ tâm O tới đỉnh thứ nhất
        if (solid.verts[0]) {
          const spV0 = project(cam, solid.verts[0], center);
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(spCenter.x, spCenter.y);
          ctx.lineTo(spV0.x, spV0.y);
          ctx.stroke();
          ctx.setLineDash([]);

          const mrx = (spCenter.x + spV0.x) / 2;
          const mry = (spCenter.y + spV0.y) / 2;
          ctx.font = 'italic 700 12px Georgia, serif';
          ctx.fillStyle = '#2563EB';
          ctx.fillText(`R = ${fmtNum(rSphere, 2)}`, mrx + 10, mry);
        }

        ctx.restore();
      }

      // 4. Các trung điểm cạnh M, N, P, Q...
      if (showMidpoints) {
        ctx.save();
        allAuxPoints
          .filter((ap) => ap.kind === 'midpoint')
          .forEach((mp) => {
            const sp = project(cam, mp.pos, center);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 4.2, 0, Math.PI * 2);
            ctx.fillStyle = '#7C3AED';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.fillStyle = '#5B21B6';
            ctx.font = 'italic 700 11px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(mp.label, sp.x + 9, sp.y - 5);
          });
        ctx.restore();
      }

      // 5. Các đoạn thẳng phụ giáo viên / học sinh tự nối thêm giữa hai điểm bất kỳ
      if (customSegments.length > 0) {
        const ptMap = new Map(allAuxPoints.map((p) => [p.id, p]));
        ctx.save();
        customSegments.forEach((seg) => {
          const pFrom = ptMap.get(seg.fromId);
          const pTo = ptMap.get(seg.toId);
          if (!pFrom || !pTo) return;
          const s1 = project(cam, pFrom.pos, center);
          const s2 = project(cam, pTo.pos, center);
          ctx.beginPath();
          if (seg.dashed) ctx.setLineDash([6, 4]);
          else ctx.setLineDash([]);
          ctx.strokeStyle = seg.color || '#DC2626';
          ctx.lineWidth = 2.6;
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Độ dài đoạn thẳng phụ ở trung điểm
          const d3 = len(sub(pFrom.pos, pTo.pos));
          const mx = (s1.x + s2.x) / 2;
          const my = (s1.y + s2.y) / 2;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          const txt = `${pFrom.label}${pTo.label}=${fmtNum(d3, 2)}`;
          ctx.font = '700 10px "JetBrains Mono", ui-monospace, monospace';
          const tw = ctx.measureText(txt).width;
          ctx.fillRect(mx - tw / 2 - 3, my - 7, tw + 6, 13);
          ctx.fillStyle = seg.color || '#DC2626';
          ctx.textAlign = 'center';
          ctx.fillText(txt, mx, my + 2);
        });
        ctx.restore();
      }

      // Đánh dấu điểm đang chờ nối trong chế độ Nối 2 điểm
      if (connectMode && pendingFromId) {
        const pt = allAuxPoints.find((p) => p.id === pendingFromId);
        if (pt) {
          const sp = project(cam, pt.pos, center);
          ctx.save();
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    if (connectMode && u < 0.02) {
      ctx.fillStyle = 'rgba(220,38,38,0.92)';
      ctx.font = '600 12px ui-sans-serif, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(
        pendingFromId
          ? 'Chạm tiếp vào đỉnh / trung điểm thứ hai trên hình 3D để kẻ đoạn thẳng nối'
          : 'Chế độ Nối đoạn thẳng: Chạm vào 2 đỉnh hoặc trung điểm bất kỳ trên hình 3D để nối',
        w / 2,
        22,
      );
    }
  }, [size, solid, plan, edges, colors, mode, showLabels, fitR, selFace, pickBase, crossSection, sectionCtrlMode, threePts, allAuxPoints, showBaseDiagonals, showAltitude, showCircumSphere, showMidpoints, customSegments, connectMode, pendingFromId, kind]);

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
    const ex = extAnim.current;
    if (ex) {
      const t = Math.min(1, (now - ex.t0) / ex.ms);
      extRef.current = ex.from + (ex.to - ex.from) * ease(t);
      if (t >= 1) extAnim.current = null;
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

  const toggleExtend = () => {
    const to = extended ? 0 : 1;
    setExtended(!extended);
    extAnim.current = {from: extRef.current, to, t0: performance.now(), ms: reducedMotion ? 1 : 750};
    kick();
  };

  useEffect(() => {
    kick();
  }, [kick, draw]);
  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  // ---------------------------------------------------------------- điều khiển khai triển
  const animateU = (to: number, ms = 1500) => {
    animRef.current = {from: uRef.current, to, t0: performance.now(), ms: Math.max(200, ms * Math.abs(to - uRef.current))};
    kick();
  };
  const unfold = () => {
    if (mode === 'section') setMode('solid');
    animateU(1);
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

  // ---------------------------------------------------------------- tương tác: xoay, thu phóng, tô màu, kéo điểm thiết diện
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

    // Kiểm tra nếu người dùng chạm vào 1 trong 3 điểm điều khiển trên cạnh khi ở chế độ threePoints
    if (mode === 'section' && sectionCtrlMode === 'threePoints') {
      const hitIdx = screenCtrlPtsRef.current.findIndex((sp) => Math.hypot(sp.x - p.x, sp.y - p.y) < 18);
      if (hitIdx >= 0) {
        draggingPtIdxRef.current = hitIdx;
        return;
      }
    }

    ptrs.current.set(e.pointerId, p);
    const pts = [...ptrs.current.values()];
    gest.current = {x: p.x, y: p.y, moved: false, pinch: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0};
    rotAnim.current = null;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    if (draggingPtIdxRef.current !== null) {
      const idx = draggingPtIdxRef.current;
      const dy = -e.movementY * 0.008;
      setThreePts((prev) =>
        prev.map((item, i) => (i === idx ? {...item, t: Math.max(0.05, Math.min(0.95, item.t + dy))} : item)),
      );
      return;
    }

    const g = gest.current;
    if (!g || !ptrs.current.has(e.pointerId)) return;
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
    const d = Math.hypot(dx, dy);
    rotRef.current = orthonormalize(mulMM(rotAxis([dy, dx, 0], d * 0.0095), rotRef.current));
    g.x = p.x;
    g.y = p.y;
    kick();
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingPtIdxRef.current !== null) {
      draggingPtIdxRef.current = null;
      return;
    }
    const g = gest.current;
    const p = local(e);
    ptrs.current.delete(e.pointerId);
    if (g && !g.moved && ptrs.current.size === 0 && connectMode && uRef.current < 0.02) {
      let bestHit: {id: string; dist: number} | null = null;
      for (const ap of screenAuxPtsRef.current) {
        const d = Math.hypot(ap.x - p.x, ap.y - p.y);
        if (d < 22 && (!bestHit || d < bestHit.dist)) {
          bestHit = {id: ap.id, dist: d};
        }
      }
      if (bestHit) {
        if (!pendingFromId) {
          setPendingFromId(bestHit.id);
        } else if (pendingFromId === bestHit.id) {
          setPendingFromId(null);
        } else {
          const fromId = pendingFromId;
          const toId = bestHit.id;
          setCustomSegments((prev) => [
            ...prev,
            {
              id: `seg-${Date.now()}-${prev.length}`,
              fromId,
              toId,
              color: '#DC2626',
              dashed: true,
            },
          ]);
          setPendingFromId(null);
        }
        kick();
        gest.current = null;
        return;
      }
    }
    if (g && !g.moved && ptrs.current.size === 0 && mode !== 'section') {
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
    <button
      key={m}
      type="button"
      data-testid={`geo-mode-${m}`}
      aria-pressed={mode === m}
      onClick={() => {
        setMode(m);
        if (m === 'section') {
          uRef.current = 0;
          setUUi(0);
        }
        kick();
      }}
      className={`${BTN} ${
        mode === m
          ? m === 'section'
            ? 'bg-cyan-600 border-cyan-700 text-white shadow-sm font-semibold'
            : 'bg-blue-600 border-blue-700 text-white shadow-sm'
          : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  );
  const selInfo = selFace != null ? solid.faces[selFace] : null;
  const maxOffset = Math.max(2.5, (dims.a ?? 2) * 0.95);

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

      <div className={`relative rounded-2xl overflow-hidden ${
          isHologram ? 'bg-transparent border-0 shadow-none' : 'border border-[#E6E4DD] bg-white shadow-sm'
        }`} style={{height: size.h}}>
        <canvas
          ref={canvasRef}
          data-testid="geo-canvas"
          data-unfold={uUi.toFixed(3)}
          data-faces={solid.faces.length}
          data-net-valid={String(plan.valid)}
          data-root={plan.root}
          data-colors={JSON.stringify(colors)}
          data-section-mode={String(mode === 'section')}
          data-section-verts={mode === 'section' ? crossSection.vertices.length : 0}
          data-section-shape={mode === 'section' ? crossSection.shapeName : ''}
          style={{width: '100%', height: size.h, touchAction: 'none', cursor: pickBase ? 'crosshair' : brush ? 'copy' : 'grab', display: 'block'}}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={resetView}
        />
        <div className="absolute right-2 top-2 text-[10px] font-mono text-stone-500 bg-white/85 rounded-md px-1.5 py-0.5 pointer-events-none">
          {mode === 'section' ? 'Trái: Mặt cắt 2D thật · Phải: Khối 3D & mặt phẳng cắt' : 'Kéo: xoay · Cuộn/chụm: thu phóng · Chạm: tô màu/chọn mặt'}
        </div>
        {selInfo && mode !== 'section' && (
          <div data-testid="geo-face-info" className="absolute right-2 bottom-2 text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
            Mặt {selFace! + 1}: {selInfo.map((i) => solid.labels[i]).join('')} · S = {fmtNum(Math.abs(areaOf(solid, selInfo)), 3)}
          </div>
        )}
        {mode === 'section' && crossSection.valid && (
          <div data-testid="geo-section-live-badge" className="absolute right-2 bottom-2 text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50/95 border border-cyan-300 rounded-lg px-2.5 py-1 shadow-xs">
            Thiết diện: {crossSection.shapeName} ({crossSection.vertices.length} cạnh) · S = {fmtNum(crossSection.area, 3)}
          </div>
        )}
        {uUi > 0.98 && mode !== 'section' && (
          <div data-testid="geo-net-badge" className={`absolute left-2 bottom-2 text-[11px] font-semibold rounded-lg px-2 py-1 border ${plan.valid ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
            {plan.valid ? '✓ Mạng khai triển hợp lệ (không chồng mặt)' : '⚠ Cách mở này có mặt chồng nhau'}
          </div>
        )}
      </div>

      {/* Sleek Floating Pill Toolbar (Matches Frame 38 of Video) */}
      <div
        data-testid="geo-floating-pill-toolbar"
        className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-stone-900/90 backdrop-blur-md border border-white/20 shadow-xl self-center max-w-full overflow-x-auto select-none"
      >
        <button
          type="button"
          data-testid="geo-pill-labels"
          aria-pressed={showLabels}
          onClick={() => {
            setShowLabels((v) => !v);
            kick();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            showLabels ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bật/tắt nhãn đỉnh A, B, C..."
        >
          <span>🏷️</span>
          <span>Đỉnh</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-section"
          aria-pressed={mode === 'section'}
          onClick={() => {
            const nextMode = mode === 'section' ? 'solid' : 'section';
            setMode(nextMode);
            if (nextMode === 'section') {
              uRef.current = 0;
              setUUi(0);
            }
            kick();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            mode === 'section' ? 'bg-cyan-500 text-white shadow-xs' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Cắt thiết diện 3D và trích xuất mặt cắt phẳng 2D"
        >
          <span>📐</span>
          <span>Thiết diện 2D+3D</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-sphere"
          aria-pressed={showCircumSphere}
          onClick={() => {
            setShowCircumSphere((v) => !v);
            if (mode === 'solid') setMode('ghost');
            kick();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            showCircumSphere ? 'bg-purple-600 text-white shadow-xs' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Mặt cầu 3D ngoại tiếp với 3 đường tròn lớn trực giao (XY, YZ, XZ)"
        >
          <span>🌐</span>
          <span>Mặt cầu 3D</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-altitude"
          aria-pressed={showAltitude}
          onClick={() => {
            setShowAltitude((v) => !v);
            if (mode === 'solid') setMode('ghost');
            kick();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            showAltitude ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Đường cao SO / SH vuông góc mặt đáy"
        >
          <span>⊥</span>
          <span>Chiều cao</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-midpoints"
          aria-pressed={showMidpoints}
          onClick={() => {
            setShowMidpoints((v) => !v);
            kick();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            showMidpoints ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Trung điểm các cạnh M, N, P..."
        >
          <span>•</span>
          <span>Trung điểm</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-unfold"
          onClick={() => {
            if (uUi > 0.5) fold();
            else unfold();
          }}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
            uUi > 0.5 ? 'bg-amber-500 text-white' : 'text-stone-300 hover:text-white hover:bg-white/10'
          }`}
          title="Khai triển hoặc gập lại mạng phẳng"
        >
          <span>◱</span>
          <span>{uUi > 0.5 ? 'Gập lại' : 'Khai triển'}</span>
        </button>

        <button
          type="button"
          data-testid="geo-pill-reset"
          onClick={resetView}
          className="px-2 py-1 rounded-full text-[11px] font-medium text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-0.5"
          title="Đặt lại góc nhìn 3D"
        >
          <span>⌖</span>
          <span>Đặt lại</span>
        </button>
      </div>

      {/* hàng 1: kiểu hiển thị + chế độ Cắt Thiết Diện + Dựng Hình Phụ */}
      <div className="flex flex-wrap items-center gap-1.5">
        {modeBtn('solid', 'Đặc')}
        {modeBtn('ghost', 'Trong suốt')}
        {modeBtn('wire', 'Khung dây')}
        {modeBtn('section', '✂ Cắt Thiết Diện (2D + 3D)')}
        <button
          type="button"
          data-testid="geo-construct-toggle"
          aria-pressed={showConstructBar}
          onClick={() => {
            setShowConstructBar((v) => !v);
            if (!showConstructBar && mode === 'solid') setMode('ghost');
            kick();
          }}
          className={`${BTN} ${
            showConstructBar
              ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm font-semibold'
              : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'
          }`}
        >
          📐 Vẽ Thêm Hình Phụ
        </button>
        <button type="button" data-testid="geo-labels-toggle" aria-pressed={showLabels} onClick={() => (setShowLabels((v) => !v), kick())} className={`${BTN} ${showLabels ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}>
          Nhãn đỉnh
        </button>
        <button type="button" data-testid="geo-reset-view" onClick={resetView} className={`${BTN} bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50 ml-auto`}>
          ⌖ Góc nhìn gốc
        </button>
      </div>

      {/* Bảng công cụ Dựng Hình Phụ 3D (Nối đoạn thẳng, Đường cao SO, Đường chéo đáy, Trung điểm, Mặt cầu ngoại tiếp, Đổi loại khối) */}
      {showConstructBar && (
        <div data-testid="geo-construct-panel" className="rounded-xl bg-emerald-50/70 border border-emerald-200 px-3 py-2.5 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-950 mr-1">Dựng yếu tố phụ:</span>
            <button
              type="button"
              data-testid="geo-aux-altitude"
              aria-pressed={showAltitude}
              onClick={() => {
                setShowAltitude((v) => !v);
                if (mode === 'solid') setMode('ghost');
                kick();
              }}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showAltitude ? 'bg-rose-600 border-rose-700 text-white shadow-xs' : 'bg-white border-emerald-300 text-stone-700 hover:bg-emerald-100/60'
              }`}
            >
              ⊥ Đường cao SO / SH
            </button>
            <button
              type="button"
              data-testid="geo-aux-diagonals"
              aria-pressed={showBaseDiagonals}
              onClick={() => {
                setShowBaseDiagonals((v) => !v);
                if (mode === 'solid') setMode('ghost');
                kick();
              }}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showBaseDiagonals ? 'bg-teal-600 border-teal-700 text-white shadow-xs' : 'bg-white border-emerald-300 text-stone-700 hover:bg-emerald-100/60'
              }`}
            >
              ✕ Đường chéo đáy & tâm O
            </button>
            <button
              type="button"
              data-testid="geo-aux-midpoints"
              aria-pressed={showMidpoints}
              onClick={() => {
                setShowMidpoints((v) => !v);
                kick();
              }}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showMidpoints ? 'bg-violet-600 border-violet-700 text-white shadow-xs' : 'bg-white border-emerald-300 text-stone-700 hover:bg-emerald-100/60'
              }`}
            >
              • Trung điểm cạnh (M, N, P…)
            </button>
            <button
              type="button"
              data-testid="geo-aux-sphere"
              aria-pressed={showCircumSphere}
              onClick={() => {
                setShowCircumSphere((v) => !v);
                if (mode === 'solid') setMode('ghost');
                kick();
              }}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                showCircumSphere ? 'bg-purple-600 border-purple-700 text-white shadow-xs' : 'bg-white border-emerald-300 text-stone-700 hover:bg-emerald-100/60'
              }`}
            >
              ◯ Mặt cầu ngoại tiếp
            </button>
            <button
              type="button"
              data-testid="geo-aux-connect-mode"
              aria-pressed={connectMode}
              onClick={() => {
                setConnectMode((v) => !v);
                setPendingFromId(null);
                if (mode === 'solid') setMode('ghost');
                kick();
              }}
              className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                connectMode ? 'bg-red-600 border-red-700 text-white shadow-xs' : 'bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100/60'
              }`}
            >
              ✎ Chạm 2 điểm để nối đoạn thẳng
            </button>
            {customSegments.length > 0 && (
              <button
                type="button"
                data-testid="geo-aux-clear-segs"
                onClick={() => {
                  setCustomSegments([]);
                  setPendingFromId(null);
                  kick();
                }}
                className="px-2 py-0.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-[11px] font-medium text-rose-700 transition cursor-pointer ml-auto"
              >
                Xóa đoạn nối ({customSegments.length})
              </button>
            )}
          </div>

          {/* Chuyển đổi nhanh giữa các khối đa diện phục vụ giải toán */}
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-emerald-200/80">
            <span className="text-[10px] font-mono text-emerald-900 mr-1">Đổi nhanh khối 3D:</span>
            {(
              [
                ['cube', 'Lập phương'],
                ['box', 'Hộp chữ nhật'],
                ['pyramid4', 'Chóp tứ giác S.ABCD'],
                ['pyramid3', 'Tứ diện ABCD'],
                ['prism3', 'Lăng trụ tam giác'],
                ['octahedron', 'Bát diện đều'],
              ] as [SolidKind, string][]
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                data-testid={`geo-switch-solid-${k}`}
                onClick={() => setActiveKind(k)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                  kind === k
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-white text-stone-700 border-emerald-200 hover:bg-emerald-100/50'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bảng điều khiển Cắt Thiết Diện Động (Tam giác ↔ Tứ giác ↔ Ngũ giác ↔ Lục giác đều) */}
      {mode === 'section' && (
        <div data-testid="geo-section-panel" className="rounded-xl bg-cyan-50/60 border border-cyan-200 px-3 py-2.5 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-cyan-900">Mẫu thiết diện nhanh:</span>
              {presets.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  data-testid={`geo-section-preset-${pr.id}`}
                  onClick={() => applySectionPreset(pr.normal, pr.dRatio)}
                  className="px-2 py-0.5 rounded-lg bg-white hover:bg-cyan-100/70 border border-cyan-300 text-[11px] font-medium text-cyan-800 transition cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-cyan-200">
              <button
                type="button"
                data-testid="geo-section-ctrl-plane"
                onClick={() => setSectionCtrlMode('plane')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  sectionCtrlMode === 'plane' ? 'bg-cyan-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Kéo mặt phẳng
              </button>
              <button
                type="button"
                data-testid="geo-section-ctrl-3pts"
                onClick={() => setSectionCtrlMode('threePoints')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  sectionCtrlMode === 'threePoints' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                3 điểm trên cạnh
              </button>
            </div>
          </div>

          {sectionCtrlMode === 'plane' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 bg-white/90 rounded-lg px-2.5 py-1.5 border border-cyan-200">
                <span className="flex justify-between text-[11px] font-medium text-stone-700">
                  <span>Vị trí mặt phẳng cắt (d)</span>
                  <span data-testid="geo-section-offset-val" className="font-mono font-bold text-cyan-700 tabular-nums">
                    {fmtNum(planeOffset, 2)}
                  </span>
                </span>
                <input
                  data-testid="geo-section-offset-slider"
                  type="range"
                  min={-maxOffset}
                  max={maxOffset}
                  step={0.02}
                  value={planeOffset}
                  onChange={(e) => setPlaneOffset(parseFloat(e.target.value))}
                  className="w-full h-1.5 accent-cyan-600 cursor-pointer"
                />
              </label>

              <label className="flex flex-col gap-1 bg-white/90 rounded-lg px-2.5 py-1.5 border border-cyan-200">
                <span className="flex justify-between text-[11px] font-medium text-stone-700">
                  <span>Góc nghiêng pháp tuyến (n_x, n_y)</span>
                  <span className="font-mono font-bold text-cyan-700 tabular-nums">
                    ({fmtNum(planeNormal[0], 1)}, {fmtNum(planeNormal[1], 1)}, {fmtNum(planeNormal[2], 1)})
                  </span>
                </span>
                <input
                  data-testid="geo-section-tilt-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={planeNormal[0]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setPlaneNormal([v, v, 1]);
                  }}
                  className="w-full h-1.5 accent-cyan-600 cursor-pointer"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2" data-testid="geo-section-3pts-controls">
              {threePts.map((tp, idx) => {
                const [a, b] = edges[tp.edgeIdx % edges.length] || [0, 1];
                const edgeName = `${solid.labels[a] ?? a}${solid.labels[b] ?? b}`;
                return (
                  <div key={idx} className="bg-white/90 rounded-lg px-2 py-1.5 border border-amber-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-stone-700">
                      <span className="text-amber-700 font-bold">Điểm {VERT_NAMES_SECTION[idx]}</span>
                      <select
                        data-testid={`geo-3pt-edge-${idx}`}
                        value={tp.edgeIdx}
                        onChange={(e) => {
                          const nextEdge = parseInt(e.target.value, 10);
                          setThreePts((prev) => prev.map((it, i) => (i === idx ? {...it, edgeIdx: nextEdge} : it)));
                        }}
                        className="text-[10px] font-mono bg-amber-50 border border-amber-200 rounded px-1 py-0.2"
                      >
                        {edges.map(([ea, eb], ei) => (
                          <option key={ei} value={ei}>
                            Cạnh {solid.labels[ea]}
                            {solid.labels[eb]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      data-testid={`geo-3pt-slider-${idx}`}
                      type="range"
                      min={0.05}
                      max={0.95}
                      step={0.02}
                      value={tp.t}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setThreePts((prev) => prev.map((it, i) => (i === idx ? {...it, t: val} : it)));
                      }}
                      className="w-full h-1.5 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-stone-500">
                      Trên {edgeName}: {Math.round(tp.t * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            data-testid="geo-section-extend"
            aria-pressed={extended}
            onClick={toggleExtend}
            className="self-start px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-cyan-300 text-cyan-800 bg-white hover:bg-cyan-100 aria-pressed:bg-cyan-600 aria-pressed:text-white transition"
          >
            {extended ? '⇲ Đưa thiết diện về khối' : '⇱ Tách thiết diện ra ngoài'}
          </button>

          {/* Số liệu chi tiết của thiết diện trích xuất */}
          {crossSection.valid && (
            <div data-testid="geo-section-metrics" className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-cyan-200/80 text-[11px] font-mono text-cyan-950">
              <span>
                Hình phẳng: <strong data-testid="geo-section-shape-label">{crossSection.shapeName}</strong> ({crossSection.vertices.length} đỉnh)
              </span>
              <span>
                Diện tích thiết diện: <strong data-testid="geo-section-area-val">S = {fmtNum(crossSection.area, 3)}</strong>
              </span>
              <span>
                Chu vi: <strong data-testid="geo-section-perim-val">P = {fmtNum(crossSection.perimeter, 2)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

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
        <input data-testid="geo-unfold-slider" type="range" min={0} max={1} step={0.005} value={uUi} onChange={(e) => setUManual(parseFloat(e.target.value))} className={`w-full ${RANGE_CLASS}`} style={rangeFill(uUi, 0, 1)} />
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
            <input data-testid={`geo-dim-${d.key}`} type="range" min={d.min} max={d.max} step={d.step} value={d.value} onChange={(e) => setDims((p) => ({...p, [d.key]: parseFloat(e.target.value)}))} className={`w-full ${RANGE_CLASS}`} style={rangeFill(d.value, d.min, d.max)} />
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
