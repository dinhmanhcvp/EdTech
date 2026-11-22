'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {MarchingCubes} from 'three/examples/jsm/objects/MarchingCubes.js';
import {AXIS_NAME, WL_PRESETS, autoWL, chestPhantom, dicomVolume, distMm, exportJSON, idx, parseDicom, parseNifti, regionGrow, sliceRGBA, sliceShape, toPixel, toVoxel, type Axis, type MeasureLine, type P3, type Segment, type Volume, type WL} from '../../utils/lab/hands/medvol';
import {BTN_GHOST} from './Controls';
import type {HandsInput} from './handsKit';
import {Stage3D, type SceneDef} from './Stage3D';

type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode};
type Tool = 'scroll' | 'wl' | 'measure' | 'segment' | 'rotate';
const TOOLS: [Tool, string, string][] = [
  ['scroll', 'Cuộn lát', 'Chụm trên một ô để đặt dấu chữ thập (hai ô kia đi theo), giữ chụm kéo lên / xuống để lướt qua các lát.'],
  ['wl', 'Độ tương phản', 'Chụm và kéo: ngang đổi độ rộng cửa sổ (tương phản), dọc đổi mức cửa sổ (độ sáng).'],
  ['measure', 'Đo khoảng cách', 'Chụm một lần ở điểm đầu, một lần ở điểm cuối: hiện khoảng cách (mm).'],
  ['segment', 'Phân vùng', 'Chụm một lần vào tổn thương: vùng cùng đậm độ loang ra, tính thể tích (cm³) và dựng khối 3D.'],
  ['rotate', 'Xoay 3D', 'Chụm và kéo trên ô 3D để xoay khối tái tạo.'],
];
const AXES: Axis[] = ['axial', 'coronal', 'sagittal'];
const SURF: {id: string; name: string; hu: number | null}[] = [
  {id: 'skin', name: 'Da', hu: -300},
  {id: 'bone', name: 'Xương', hu: 250},
  {id: 'off', name: 'Tắt', hu: null},
];

/** dữ liệu chia sẻ với cảnh 3D (đọc mỗi khung hình, không qua React) */
interface Live {
  vol: Volume | null;
  cur: P3;
  tex: Partial<Record<Axis, HTMLCanvasElement>>;
  dirty: Record<Axis, boolean>;
  seg: Segment | null;
  segVer: number;
  surf: number | null;
  surfVer: number;
  rot: [number, number];
}
const W3 = 1 / 100; // 1 đơn vị cảnh = 100 mm

/** toạ độ cảnh của một voxel: khối đặt giữa gốc, trên là đầu người bệnh (+y), trước là phía người xem (+z) */
const world = (v: Volume, p: P3, out = new THREE.Vector3()) =>
  out.set((p[0] - v.dims[0] / 2) * v.spacing[0] * W3, (p[2] - v.dims[2] / 2) * v.spacing[2] * W3, (p[1] - v.dims[1] / 2) * v.spacing[1] * W3);

/** dựng bề mặt bằng marching cubes trên lưới thưa `res`³ lấy mẫu trong hộp [lo, hi] (voxel); `inside(i,j,k)` = điểm thuộc vật */
function surface(v: Volume, lo: P3, hi: P3, res: number, inside: (n: number) => boolean, mat: THREE.Material): MarchingCubes {
  const mc = new MarchingCubes(res, mat, false, false, 250000);
  mc.isolation = 50;
  mc.reset();
  for (let c = 1; c < res - 1; c++)
    for (let b = 1; b < res - 1; b++)
      for (let a = 1; a < res - 1; a++) {
        const i = Math.round(lo[0] + ((a - 1) / (res - 3)) * (hi[0] - lo[0]));
        const k = Math.round(lo[2] + ((b - 1) / (res - 3)) * (hi[2] - lo[2]));
        const j = Math.round(lo[1] + ((c - 1) / (res - 3)) * (hi[1] - lo[1]));
        if (inside(idx(v, i, j, k))) mc.setCell(a, b, c, 100);
      }
  mc.blur(1);
  mc.update();
  // lưới MarchingCubes nằm trong [−1, 1]³ ứng với ô 0..res−1; ô 1..res−2 phủ hộp [lo, hi]
  const a0 = world(v, lo);
  const a1 = world(v, hi);
  const k = (res - 1) / (res - 3);
  mc.position.copy(a0).add(a1).multiplyScalar(0.5);
  mc.scale.set(Math.max(1e-3, ((a1.x - a0.x) / 2) * k), Math.max(1e-3, ((a1.y - a0.y) / 2) * k), Math.max(1e-3, ((a1.z - a0.z) / 2) * k));
  return mc;
}

function makeDef(live: Live): SceneDef {
  return {
    room: true,
    dist: 6,
    target: [0, 0, 0],
    setup: (k) => {
      const root = new THREE.Group();
      k.scene.add(root);
      const planes = {} as Record<Axis, THREE.Mesh>;
      const texs = {} as Record<Axis, THREE.CanvasTexture>;
      for (const ax of AXES) {
        texs[ax] = new THREE.CanvasTexture((live.tex[ax] ??= document.createElement('canvas')));
        texs[ax].colorSpace = THREE.SRGBColorSpace;
        planes[ax] = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: texs[ax], side: THREE.DoubleSide, transparent: true, opacity: 0.92}));
        root.add(planes[ax]);
      }
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({color: '#7AD8F7', transparent: true, opacity: 0.5}));
      root.add(box);
      let volRef: Volume | null = null;
      if (process.env.NODE_ENV !== 'production') (window as unknown as {__medPlanes?: object}).__medPlanes = planes;
      let segVer = -1;
      let surfVer = -1;
      let segMesh: MarchingCubes | null = null;
      let surfMesh: MarchingCubes | null = null;
      const segMat = new THREE.MeshPhysicalMaterial({color: '#E0303A', roughness: 0.35, clearcoat: 0.6});
      const surfMat = new THREE.MeshStandardMaterial({color: '#E8CBB0', roughness: 0.6, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide});
      const v3 = new THREE.Vector3();
      k.caption('');
      return () => {
        const v = live.vol;
        if (!v) return;
        root.rotation.set(live.rot[1], live.rot[0], 0);
        if (v !== volRef) {
          volRef = v;
          segVer = surfVer = -1;
          box.scale.set(v.dims[0] * v.spacing[0] * W3, v.dims[2] * v.spacing[2] * W3, v.dims[1] * v.spacing[1] * W3);
          for (const ax of AXES) {
            const {w, h, sw, sh} = sliceShape(v, ax);
            planes[ax].geometry.dispose();
            const g = new THREE.PlaneGeometry(w * sw * W3, h * sh * W3);
            // ngang: nằm ngang, mép trên ảnh (phía trước) về phía người xem; đứng dọc: mép phải ảnh (phía trước) về phía người xem
            if (ax === 'axial') g.rotateX(Math.PI / 2);
            if (ax === 'sagittal') g.rotateY(-Math.PI / 2);
            planes[ax].geometry = g;
          }
        }
        for (const ax of AXES) {
          if (live.dirty[ax]) {
            // canvas đổi cỡ (mở ảnh mới, hoặc ô vẽ sau khi cảnh đã tạo texture): bộ nhớ texture WebGL2 cố định cỡ nên phải cấp lại
            const cv = live.tex[ax]!;
            const sz = `${cv.width}x${cv.height}`;
            if (texs[ax].userData.size !== sz) {
              texs[ax].dispose();
              texs[ax].userData.size = sz;
            }
            texs[ax].needsUpdate = true;
            live.dirty[ax] = false;
          }
          // mặt cắt nằm đúng lát đang xem
          const c = world(v, [v.dims[0] / 2, v.dims[1] / 2, v.dims[2] / 2], v3.set(0, 0, 0));
          const p = world(v, live.cur, new THREE.Vector3());
          planes[ax].position.set(ax === 'sagittal' ? p.x : c.x, ax === 'axial' ? p.y : c.y, ax === 'coronal' ? p.z : c.z);
        }
        if (live.segVer !== segVer) {
          segVer = live.segVer;
          if (segMesh) root.remove(segMesh);
          segMesh = null;
          const s = live.seg;
          if (s && s.count > 0) {
            const pad = (p: P3, d: number): P3 => [Math.max(0, Math.min(v.dims[0] - 1, p[0] + d)), Math.max(0, Math.min(v.dims[1] - 1, p[1] + d)), Math.max(0, Math.min(v.dims[2] - 1, p[2] + d))];
            segMesh = surface(v, pad(s.min, -1), pad(s.max, 1), 40, (n) => s.mask[n] === 1, segMat);
            root.add(segMesh);
          }
        }
        if (live.surfVer !== surfVer) {
          surfVer = live.surfVer;
          if (surfMesh) root.remove(surfMesh);
          surfMesh = null;
          const hu = live.surf;
          if (hu !== null) {
            surfMesh = surface(v, [0, 0, 0], [v.dims[0] - 1, v.dims[1] - 1, v.dims[2] - 1], 72, (n) => v.data[n] > hu, surfMat);
            root.add(surfMesh);
          }
        }
      };
    },
  };
}

const Recon3D: React.FC<{live: Live; onFail: () => void}> = ({live, onFail}) => {
  const def = useMemo(() => makeDef(live), [live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};

/** một ô lát cắt: vẽ ảnh theo đúng tỉ lệ mm, dấu chữ thập, đường đo; trả hàm đổi toạ độ màn hình → voxel */
const Pane: React.FC<{ax: Axis; vol: Volume; cur: P3; wl: WL; seg: Segment | null; lines: MeasureLine[]; pending: P3 | null; live: Live; onPointer: (ax: Axis, kind: 'down' | 'move' | 'up', x: number, y: number) => void}> = ({ax, vol, cur, wl, seg, lines, pending, live, onPointer}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const shape = sliceShape(vol, ax);
  const s = toPixel(vol, ax, cur).s;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const off = (live.tex[ax] ??= document.createElement('canvas'));
    off.width = shape.w;
    off.height = shape.h;
    off.getContext('2d')!.putImageData(new ImageData(sliceRGBA(vol, ax, s, wl, seg?.mask), shape.w, shape.h), 0, 0);
    live.dirty[ax] = true;
    const W = (cv.width = cv.clientWidth * devicePixelRatio);
    const H = (cv.height = cv.clientHeight * devicePixelRatio);
    const g = cv.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const mmW = shape.w * shape.sw;
    const mmH = shape.h * shape.sh;
    const sc = Math.min(W / mmW, H / mmH);
    const ox = (W - mmW * sc) / 2;
    const oy = (H - mmH * sc) / 2;
    g.imageSmoothingEnabled = true;
    g.drawImage(off, ox, oy, mmW * sc, mmH * sc);
    const px = (c: number, r: number) => [ox + (c + 0.5) * shape.sw * sc, oy + (r + 0.5) * shape.sh * sc] as const;
    cv.dataset.map = JSON.stringify([ox / devicePixelRatio, oy / devicePixelRatio, (shape.sw * sc) / devicePixelRatio, (shape.sh * sc) / devicePixelRatio]);
    // dấu chữ thập: vị trí hai mặt cắt kia
    const q = toPixel(vol, ax, cur);
    const [cx, cy] = px(q.c, q.r);
    g.strokeStyle = 'rgba(122,216,247,0.55)';
    g.lineWidth = devicePixelRatio;
    g.beginPath();
    g.moveTo(cx, oy);
    g.lineTo(cx, oy + mmH * sc);
    g.moveTo(ox, cy);
    g.lineTo(ox + mmW * sc, cy);
    g.stroke();
    // đường đo nằm trên lát này
    g.font = `${12 * devicePixelRatio}px ui-monospace, monospace`;
    for (const l of lines) {
      const a = toPixel(vol, ax, l.a);
      const b = toPixel(vol, ax, l.b);
      if (a.s !== s || b.s !== s) continue;
      const [x0, y0] = px(a.c, a.r);
      const [x1, y1] = px(b.c, b.r);
      g.strokeStyle = '#F7E27A';
      g.lineWidth = 2 * devicePixelRatio;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.fillStyle = '#F7E27A';
      g.fillText(`${l.mm.toFixed(1)} mm`, (x0 + x1) / 2 + 6, (y0 + y1) / 2 - 6);
    }
    if (pending) {
      const a = toPixel(vol, ax, pending);
      if (a.s === s) {
        const [x0, y0] = px(a.c, a.r);
        g.fillStyle = '#F7E27A';
        g.beginPath();
        g.arc(x0, y0, 4 * devicePixelRatio, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = 'rgba(207,233,220,0.85)';
    g.fillText(`${AXIS_NAME[ax]} · lát ${s + 1}/${shape.n}`, 8 * devicePixelRatio, 16 * devicePixelRatio);
  });
  const ev = (kind: 'down' | 'move' | 'up') => (e: React.PointerEvent) => {
    if (kind === 'down') (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (kind === 'move' && !e.buttons) return;
    onPointer(ax, kind, e.clientX, e.clientY);
  };
  return <canvas ref={ref} data-pane={ax} onPointerDown={ev('down')} onPointerMove={ev('move')} onPointerUp={ev('up')} className="h-full w-full touch-none bg-black" />;
};

/** điểm màn hình → voxel trên ô `ax` (null nếu ra ngoài ảnh) */
function pickVoxel(vol: Volume, ax: Axis, s: number, x: number, y: number): P3 | null {
  const cv = document.querySelector(`canvas[data-pane="${ax}"]`) as HTMLCanvasElement | null;
  if (!cv?.dataset.map) return null;
  const [ox, oy, pw, ph] = JSON.parse(cv.dataset.map) as number[];
  const r = cv.getBoundingClientRect();
  const c = Math.floor((x - r.left - ox) / pw);
  const rr = Math.floor((y - r.top - oy) / ph);
  const {w, h} = sliceShape(vol, ax);
  if (c < 0 || rr < 0 || c >= w || rr >= h) return null;
  return toVoxel(vol, ax, s, c, rr);
}

/**
 * Trạm ảnh y khoa (giai đoạn 1): ba lát MPR đồng bộ + khối 3D tái tạo, cửa sổ đậm độ, đo khoảng cách (mm), phân vùng loang và thể tích (cm³),
 * xuất số đo JSON. Điều khiển bằng chuột / cảm ứng hoặc bàn tay qua camera (con trỏ ảo = giữa đầu ngón cái và ngón trỏ, chụm = bấm).
 */
export const MedStationLab: React.FC<{Shell: React.FC<ShellProps>}> = ({Shell}) => {
  const [vol, setVol] = useState<Volume | null>(null);
  const [cur, setCur] = useState<P3>([0, 0, 0]);
  const [wl, setWl] = useState<WL>(WL_PRESETS[0].wl);
  const [tool, setTool] = useState<Tool>('scroll');
  const [lines, setLines] = useState<MeasureLine[]>([]);
  const [pending, setPending] = useState<P3 | null>(null);
  const [seg, setSeg] = useState<Segment | null>(null);
  const [tol, setTol] = useState(120);
  const [surf, setSurf] = useState('skin');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const live = useRef<Live>({vol: null, cur: [0, 0, 0], tex: {}, dirty: {axial: true, coronal: true, sagittal: true}, seg: null, segVer: 0, surf: -300, surfVer: 0, rot: [0.5, 0.25]}).current;
  const drag = useRef<{x: number; y: number; s: number; wl: WL; rot: [number, number]} | null>(null);
  // chỉ khi phát triển: máy dò trình duyệt đọc trạng thái trạm
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__med?: Live}).__med = live;

  const load = useCallback((v: Volume) => {
    setVol(v);
    setCur([Math.floor(v.dims[0] / 2), Math.floor(v.dims[1] / 2), Math.floor(v.dims[2] / 2)]);
    setWl(v.modality === 'CT' ? WL_PRESETS[0].wl : autoWL(v));
    setLines([]);
    setPending(null);
    setSeg(null);
    setErr('');
  }, []);
  useEffect(() => {
    // phantom tổng hợp ngay khi mở: có dữ liệu để thử mà không tải gì từ ngoài
    load(chestPhantom());
  }, [load]);
  // đồng bộ sang cảnh 3D
  Object.assign(live, {vol, cur});
  useEffect(() => {
    live.seg = seg;
    live.segVer++;
  }, [seg, live]);
  useEffect(() => {
    live.surf = vol?.modality === 'CT' ? SURF.find((x) => x.id === surf)!.hu : surf === 'off' ? null : autoWL(vol ?? chestPhantom()).l;
    live.surfVer++;
  }, [surf, vol, live]);

  const onPointer = useCallback(
    (ax: Axis | '3d', kind: 'down' | 'move' | 'up', x: number, y: number) => {
      if (!vol) return;
      if (kind === 'up') {
        drag.current = null;
        return;
      }
      if (ax === '3d') {
        if (kind === 'down') drag.current = {x, y, s: 0, wl, rot: [...live.rot]};
        else if (drag.current) live.rot = [drag.current.rot[0] + (x - drag.current.x) * 0.01, drag.current.rot[1] + (y - drag.current.y) * 0.01];
        return;
      }
      const s = toPixel(vol, ax, cur).s;
      if (kind === 'down') drag.current = {x, y, s, wl, rot: [...live.rot]};
      const d = drag.current;
      if (!d) return;
      if (tool === 'scroll') {
        const p = kind === 'down' ? pickVoxel(vol, ax, s, x, y) : null;
        const n = sliceShape(vol, ax).n;
        const ns = Math.max(0, Math.min(n - 1, d.s + Math.round((d.y - y) / 6)));
        const base = p ?? cur;
        const q = toPixel(vol, ax, base);
        setCur(toVoxel(vol, ax, kind === 'down' ? s : ns, q.c, q.r));
      } else if (tool === 'wl') {
        setWl({w: Math.max(1, d.wl.w + (x - d.x) * 4), l: d.wl.l + (d.y - y) * 2});
      } else if (tool === 'rotate') {
        live.rot = [d.rot[0] + (x - d.x) * 0.01, d.rot[1] + (y - d.y) * 0.01];
      } else if (kind === 'down') {
        const p = pickVoxel(vol, ax, s, x, y);
        if (!p) return;
        if (tool === 'measure') {
          if (!pending) setPending(p);
          else {
            setLines((ls) => [...ls, {a: pending, b: p, mm: distMm(vol, pending, p)}]);
            setPending(null);
          }
        } else if (tool === 'segment') {
          setSeg(regionGrow(vol, p, tol));
          setCur(p);
        }
      }
    },
    [vol, cur, wl, tool, pending, tol, live],
  );

  const openFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('Đang đọc tệp…');
    try {
      const list = Array.from(files);
      if (list.length === 1 && /\.nii(\.gz)?$/i.test(list[0].name)) load(await parseNifti(await list[0].arrayBuffer(), list[0].name));
      else {
        const slices = [];
        for (const f of list) slices.push(parseDicom(await f.arrayBuffer()));
        load(dicomVolume(slices, `${list.length} lát DICOM`));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
    setBusy('');
  };
  const download = () => {
    if (!vol) return;
    const blob = new Blob([JSON.stringify(exportJSON(vol, lines, seg), null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'so-do-anh-y-khoa.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Shell
      hint="Chọn công cụ ở bảng bên phải. Đưa tay lên ô ảnh: chụm để bấm, giữ chụm và kéo để cuộn lát, đổi tương phản hoặc xoay khối 3D."
      render={(input, onFail) => (vol ? <Workspace input={input} vol={vol} cur={cur} wl={wl} seg={seg} lines={lines} pending={pending} live={live} onPointer={onPointer} onFail={onFail} /> : <div className="p-6 text-[#CFE9DC]">Đang dựng phantom…</div>)}
    >
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Trạm ảnh y khoa · giai đoạn 1</b>
        Ba lát cắt chuẩn đồng bộ với khối 3D tái tạo; đo khoảng cách (mm), phân vùng tổn thương và tính thể tích (cm³). Mở tệp NIfTI hoặc chuỗi DICOM không nén của bộ dữ liệu công khai, hoặc dùng phantom có sẵn.
      </p>
      {vol && (
        <div data-testid="med-info" className="rounded-xl bg-[#1D1B16]/[.05] px-3 py-2 text-xs leading-relaxed">
          <b className="block">{vol.name}</b>
          {vol.modality} · {vol.dims.join(' × ')} voxel · {vol.spacing.map((x) => x.toFixed(2)).join(' × ')} mm
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <label className={`${BTN_GHOST} cursor-pointer`}>
          Mở tệp (.nii / .nii.gz / DICOM)
          <input type="file" multiple className="hidden" accept=".nii,.gz,.dcm,application/dicom,*/*" onChange={(e) => void openFiles(e.target.files)} />
        </label>
        <button type="button" className={BTN_GHOST} onClick={() => load(chestPhantom())}>
          Phantom ngực
        </button>
      </div>
      {busy && <p className="text-xs">{busy}</p>}
      {err && (
        <p role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 text-xs font-medium text-[#C4261A]">
          {err}
        </p>
      )}
      <div role="group" aria-label="Công cụ" className="flex flex-wrap gap-1.5">
        {TOOLS.map(([t, name]) => (
          <button key={t} type="button" data-testid={`med-tool-${t}`} aria-pressed={tool === t} onClick={() => setTool(t)} className={`min-h-[40px] rounded-full border px-3 text-xs font-medium ${tool === t ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`}>
            {name}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-[#4B473D]">{TOOLS.find((x) => x[0] === tool)![2]}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span>Cửa sổ:</span>
        {WL_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => setWl(p.wl)} className="rounded-full border border-[#1D1B16]/20 bg-white px-2.5 py-1">
            {p.name}
          </button>
        ))}
        <span className="tabular-nums text-[#4B473D]">
          W {Math.round(wl.w)} / L {Math.round(wl.l)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span>Bề mặt 3D:</span>
        {SURF.map((x) => (
          <button key={x.id} type="button" aria-pressed={surf === x.id} onClick={() => setSurf(x.id)} className={`rounded-full border px-2.5 py-1 ${surf === x.id ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`}>
            {x.name}
          </button>
        ))}
      </div>
      {tool === 'segment' && (
        <label className="flex items-center gap-2 text-xs">
          Khoảng đậm độ ±{tol}
          <input type="range" min={20} max={400} step={10} value={tol} onChange={(e) => setTol(+e.target.value)} />
        </label>
      )}
      {seg && (
        <div data-testid="med-seg" className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${seg.capped ? 'bg-[#C4261A]/[.08]' : 'bg-[#1F7A4D]/[.09]'}`}>
          <b className="block">Vùng phân đoạn: {seg.cm3.toFixed(2)} cm³</b>
          Kích thước hộp bao {seg.extent.map((x) => x.toFixed(1)).join(' × ')} mm · {seg.count.toLocaleString('vi-VN')} voxel · đậm độ {Math.round(seg.range[0])}…{Math.round(seg.range[1])}
          {seg.capped && <span className="block font-medium text-[#C4261A]">Vùng loang tràn ra mô xung quanh: thu hẹp khoảng đậm độ rồi chụm lại.</span>}
          <button type="button" onClick={() => setSeg(null)} className="mt-1 block underline">
            Xóa vùng
          </button>
        </div>
      )}
      {lines.length > 0 && (
        <ol data-testid="med-lines" className="flex flex-col gap-0.5 text-xs">
          {lines.map((l, n) => (
            <li key={n} className="flex justify-between gap-2">
              <span>
                Đo {n + 1}: <b className="tabular-nums">{l.mm.toFixed(1)} mm</b>
              </span>
              <button type="button" className="underline" onClick={() => setLines((ls) => ls.filter((_, m) => m !== n))}>
                xóa
              </button>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className={BTN_GHOST} onClick={download}>
        Xuất số đo (JSON)
      </button>
      <p className="text-xs leading-relaxed text-[#4B473D]">
        Phân vùng loang theo đậm độ (không phải AI): tốt với tổn thương khác hẳn mô quanh. Số đo theo chỉ số voxel, chưa áp ma trận hướng của ảnh. Chỉ dùng cho học tập và nghiên cứu, không dùng chẩn đoán. Không mở ảnh có thông tin nhận dạng người bệnh.
      </p>
    </Shell>
  );
};

/** lưới 2 × 2 (ngang | 3D / đứng ngang | đứng dọc) + con trỏ ảo của bàn tay */
const Workspace: React.FC<{input: HandsInput; vol: Volume; cur: P3; wl: WL; seg: Segment | null; lines: MeasureLine[]; pending: P3 | null; live: Live; onPointer: (ax: Axis | '3d', kind: 'down' | 'move' | 'up', x: number, y: number) => void; onFail: () => void}> = ({input, vol, cur, wl, seg, lines, pending, live, onPointer, onFail}) => {
  const box = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const cb = useRef(onPointer);
  cb.current = onPointer;
  useEffect(() => {
    let raf = 0;
    let down = false;
    let pane: Axis | '3d' | null = null;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = box.current;
      const d = dot.current;
      if (!el || !d) return;
      const h = input.hands.find((x) => x.pts.length === 21);
      if (!h) {
        d.style.display = 'none';
        if (down && pane) cb.current(pane, 'up', 0, 0);
        down = false;
        return;
      }
      // con trỏ = giữa đầu ngón cái và ngón trỏ, toạ độ 0–1 của khung cảnh
      const r = el.getBoundingClientRect();
      const x = r.left + ((h.pts[4].x + h.pts[8].x) / 2) * r.width;
      const y = r.top + ((h.pts[4].y + h.pts[8].y) / 2) * r.height;
      d.style.display = 'block';
      d.style.transform = `translate(${x - r.left - 9}px, ${y - r.top - 9}px)`;
      d.style.background = h.pinch ? 'rgba(247,226,122,0.9)' : 'transparent';
      if (h.pinch && !down) {
        const t = document.elementFromPoint(x, y)?.closest('[data-pane]') as HTMLElement | null;
        pane = (t?.dataset.pane as Axis | '3d' | undefined) ?? null;
        if (pane) cb.current(pane, 'down', x, y);
      } else if (h.pinch && pane) cb.current(pane, 'move', x, y);
      else if (!h.pinch && down && pane) {
        cb.current(pane, 'up', x, y);
        pane = null;
      }
      down = h.pinch;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [input]);
  return (
    <div ref={box} className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 bg-[#05070F] p-1 pt-[76px]">
      {(['axial', '3d', 'coronal', 'sagittal'] as const).map((ax) => (
        <div key={ax} className="relative min-h-0 overflow-hidden rounded-lg ring-1 ring-white/10" data-pane={ax === '3d' ? '3d' : undefined}>
          {ax === '3d' ? (
            <>
              <Recon3D live={live} onFail={onFail} />
              <span className="pointer-events-none absolute left-2 top-1 font-mono text-[11px] text-[#CFE9DC]/85">Khối 3D tái tạo</span>
            </>
          ) : (
            <Pane ax={ax} vol={vol} cur={cur} wl={wl} seg={seg} lines={lines} pending={pending} live={live} onPointer={onPointer} />
          )}
        </div>
      ))}
      <div ref={dot} className="pointer-events-none absolute left-0 top-0 z-20 hidden h-[18px] w-[18px] rounded-full border-2 border-[#F7E27A]" />
    </div>
  );
};
