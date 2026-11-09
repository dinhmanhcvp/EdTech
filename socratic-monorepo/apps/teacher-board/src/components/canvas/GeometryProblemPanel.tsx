'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Eraser, Redo2, Undo2, X} from 'lucide-react';
import {buildScene, type GeoScene} from '../../utils/geometryProblem';
import type {V3} from '../../utils/solids';
import {canUnfold, polygonStats, sliceSection} from '../../utils/netUnfold';
import {addFreePoint, addSector, addSegmentLen, addSemicircle, toggleHidden, addBisector, addCircleOf, addLineAB, addPolygon, addRegularPolygon, addTangentsFrom, addTransform, addVector, toggleLabel, addFoot, addIntersection, addLineThrough, addMidline, addPerpBisector, addReflection, addTangent, measurePolygon, addMidpoint, moveFreePoint, removePoint, addPointOnSegment, addRequirement, addSection, addSegment, measureAngle, measureDistance, partChips, sceneGrew, setPartShown, showUpTo, setPointT, solidStats, toTikz, togglePart, visibleNames, measureAngleLinePlane, measureDihedral, measureDistPointLine, measureDistPointPlane} from '../../utils/geoTools';

export type GeoTool = 'segment' | 'midpoint' | 'onEdge' | 'foot' | 'section' | 'midline' | 'delete' | 'perpbis' | 'bisector' | 'parallel' | 'perpline' | 'inter' | 'circle' | 'circle3' | 'tangent' | 'reflline' | 'reflpt' | 'line' | 'ray' | 'vector' | 'polygon' | 'reg4' | 'reg5' | 'reg6' | 'compass' | 'tangents' | 'translate' | 'rot90' | 'rot60' | 'dil2' | 'dilhalf' | 'label' | 'point' | 'hide' | 'seglen' | 'circlecr' | 'semi' | 'sector' | 'rotate' | 'dilate' | 'area' | 'perim' | 'dist' | 'angle' | 'dpl' | 'dln' | 'alp' | 'dih';

export interface GeoPickConfig {
  pickMode: 'point' | 'edge' | 'place' | null;
  /** đặt điểm tự do: dx, dy = vị trí chạm so với đỉnh `anchor` (px cục bộ của hình) */
  onPlace?: (dx: number, dy: number, anchor: string) => void;
  picks: string[];
  onPickPoint: (name: string) => void;
  onPickEdge: (a: string, b: string, t: number) => void;
}

/** Bộ điều khiển hình dựng từ đề: AI hub phân tầng dùng để điều khiển, không cần bảng riêng. */
export type GeoToolSpec = {id: GeoTool; label: string; need: number; hint: string; param?: {label: string; def: number}};

export interface GeoController {
  parts: number;
  upTo: number;
  tool: GeoTool | null;
  picks: string[];
  canUndo: boolean;
  canRedo: boolean;
  /** số phần (a, b, c…) đang hiện / tổng số phần có nét vẽ */
  shownParts: number;
  togglableParts: number;
  togglePart: (i: number) => void;
  /** đang ẩn hẳn nét khuất (mặc định nét đứt chuẩn SGK) */
  hideHidden: boolean;
  toggleHidden: () => void;
  /** hình khối (3D): góc nhìn hiện tại; null = góc chuẩn SGK (chiếu xiên cố định) */
  is3D: boolean;
  rot: {yaw: number; pitch: number} | null;
  /** đặt góc xoay (kéo tay): cập nhật tại chỗ, không thêm bước hoàn tác */
  setRot: (yaw: number, pitch: number) => void;
  /** về góc chuẩn SGK */
  resetView: () => void;
  colors: boolean;
  toggleColors: () => void;
  /** đo thể tích và diện tích của khối */
  measureSolid: () => void;
  /** kéo một điểm trượt trên cạnh: t ∈ (0,1) từ đầu a; `done` = thả tay (ghi một bước hoàn tác). Điểm phụ thuộc và thiết diện tự cập nhật */
  setPointT: (name: string, t: number, done: boolean) => void;
  hasHidden: boolean;
  showHidden: () => void;
  /** kéo đỉnh tự do: dx, dy = độ dời con trỏ (px cục bộ) so với lúc bắt đầu kéo */
  moveFree: (name: string, dx: number, dy: number, done: boolean, start: boolean) => void;
  /** hình khối có thể khai triển thành lưới */
  canNet: boolean;
  /** mức khai triển 0..1 (0 = khối); đặt có hoạt họa gấp/mở mượt */
  net: number;
  setNet: (t: number) => void;
  /** mặt phẳng cắt ngang song song đáy: null = tắt, 0..1 = độ cao */
  slice: number | null;
  setSlice: (v: number | null) => void;
  /** chép mã TikZ của hình (nét đứt đúng chuẩn) vào bộ nhớ tạm */
  exportTikz: () => void;
  /** mở mô phỏng 3D xoay/cắt/khai triển của khối này */
  open3D: () => void;
  setTool: (t: GeoTool | null) => void;
  next: () => void;
  prev: () => void;
  undo: () => void;
  redo: () => void;
  remove: () => void;
  /** nhận yêu cầu bằng lời từ vùng khoanh (VD "vẽ đường tròn ngoại tiếp") và thêm vào chính hình này */
  addRequirementText: (text: string) => {grew: boolean; notes: string[]; ignored: string[]};
  /** mã của nét hình trên bảng */
  figureId?: string;
}

interface Props {
  mode: 'new' | 'edit';
  /** chế độ sửa: cảnh và số phần đang hiện của hình trên bảng */
  scene?: GeoScene;
  upTo?: number;
  initialText?: string;
  onClose: () => void;
  onCreate?: (scene: GeoScene, upTo: number, source: string) => void;
  onApply?: (scene: GeoScene, upTo: number) => void;
  onDeleteFigure?: () => void;
  onPickConfig?: (cfg: GeoPickConfig | null) => void;
  onController?: (c: GeoController | null) => void;
  onOpen3D?: (scene: GeoScene) => void;
  figureId?: string;
}

export const GEO_TOOLS: GeoToolSpec[] = [
  {id: 'segment', label: 'Đoạn nối', need: 2, hint: 'Chạm 2 điểm để nối thành đoạn thẳng'},
  {id: 'midpoint', label: 'Trung điểm', need: 2, hint: 'Chạm 2 điểm để lấy trung điểm'},
  {id: 'onEdge', label: 'Điểm trên cạnh', need: 1, hint: 'Chạm vào một cạnh để đặt điểm tại chỗ chạm'},
  {id: 'foot', label: 'Chân vuông góc', need: 3, hint: 'Chạm điểm cần hạ, rồi 2 điểm của đường thẳng'},
  {id: 'midline', label: 'Đường trung bình', need: 3, hint: 'Chạm đỉnh chung của hai cạnh, rồi 2 đỉnh còn lại: nối trung điểm hai cạnh đó (song song và bằng nửa cạnh thứ ba)'},
  {id: 'delete', label: 'Xóa điểm', need: 1, hint: 'Chạm một điểm đã thêm để xóa nó cùng các đoạn nối và điểm phụ thuộc'},
  {id: 'section', label: 'Thiết diện', need: 3, hint: 'Chạm 3 điểm xác định mặt phẳng cắt'},
];

/** nhóm "Đối tượng": điểm mới, tên, ẩn/hiện */
export const GEO_OBJECTS: GeoToolSpec[] = [
  {id: 'point', label: 'Điểm mới', need: 0, hint: 'Chạm vào chỗ trống trên hình để đặt một điểm tự do (kéo đi đâu cũng được)'},
  {id: 'label', label: 'Ẩn/hiện tên', need: 1, hint: 'Chạm một điểm để ẩn hoặc hiện chữ tên của nó'},
  {id: 'hide', label: 'Ẩn/hiện điểm', need: 1, hint: 'Chạm một điểm dựng thêm để ẩn nó cùng các đoạn nối; hiện lại bằng nút Hiện lại tất cả'},
];

/** Bộ dụng cụ kiểu GeoGebra (hình phẳng): mọi nét dựng ra đều theo khi kéo đỉnh gốc. Chia thành bốn nhóm cho AI hub. */
export const GEO_LINES: GeoToolSpec[] = [
  {id: 'line', label: 'Đường thẳng', need: 2, hint: 'Chạm 2 điểm: đường thẳng qua hai điểm (kéo dài hai phía)'},
  {id: 'seglen', label: 'Đoạn dài cố định', need: 1, param: {label: 'Dài', def: 3}, hint: 'Chạm điểm A rồi nhập độ dài: đoạn thẳng từ A sang phải'},
  {id: 'ray', label: 'Tia', need: 2, hint: 'Chạm gốc A rồi điểm B: tia AB'},
  {id: 'perpbis', label: 'Trung trực', need: 2, hint: 'Chạm 2 điểm A, B: đường trung trực của AB'},
  {id: 'bisector', label: 'Phân giác', need: 3, hint: 'Chạm 3 điểm, điểm giữa là đỉnh góc: phân giác của góc đó'},
  {id: 'parallel', label: 'Song song', need: 3, hint: 'Chạm điểm P, rồi 2 điểm A, B: đường qua P song song AB'},
  {id: 'perpline', label: 'Vuông góc', need: 3, hint: 'Chạm điểm P, rồi 2 điểm A, B: đường qua P vuông góc AB'},
  {id: 'inter', label: 'Giao điểm', need: 4, hint: 'Chạm 4 điểm A, B, C, D: giao điểm của đường AB và đường CD'},
];

export const GEO_SHAPES: GeoToolSpec[] = [
  {id: 'polygon', label: 'Đa giác', need: 0, hint: 'Chạm lần lượt các đỉnh, rồi chạm lại đỉnh đầu để khép kín'},
  {id: 'reg4', label: 'Hình vuông', need: 2, hint: 'Chạm 2 điểm A, B: hình vuông có cạnh AB (ngược chiều kim đồng hồ)'},
  {id: 'reg5', label: 'Ngũ giác đều', need: 2, hint: 'Chạm 2 điểm A, B: ngũ giác đều có cạnh AB'},
  {id: 'reg6', label: 'Lục giác đều', need: 2, hint: 'Chạm 2 điểm A, B: lục giác đều có cạnh AB'},
  {id: 'vector', label: 'Véctơ', need: 2, hint: 'Chạm gốc A rồi ngọn B: véctơ AB có mũi tên'},
];

export const GEO_CURVES: GeoToolSpec[] = [
  {id: 'circle', label: 'Tròn tâm', need: 2, hint: 'Chạm tâm O, rồi một điểm P trên đường tròn'},
  {id: 'circlecr', label: 'Tròn bán kính', need: 1, param: {label: 'R', def: 2}, hint: 'Chạm tâm O rồi nhập bán kính R'},
  {id: 'semi', label: 'Nửa đường tròn', need: 2, hint: 'Chạm 2 điểm A, B: nửa đường tròn đường kính AB (từ A sang B ngược chiều kim đồng hồ)'},
  {id: 'sector', label: 'Hình quạt', need: 3, hint: 'Chạm tâm O, rồi A, rồi B: hình quạt từ OA tới OB ngược chiều kim đồng hồ'},
  {id: 'circle3', label: 'Tròn 3 điểm', need: 3, hint: 'Chạm 3 điểm: đường tròn đi qua cả ba'},
  {id: 'compass', label: 'Compa', need: 3, hint: 'Chạm 2 điểm A, B (bán kính AB), rồi tâm C: đường tròn tâm C bán kính AB'},
  {id: 'tangent', label: 'Tiếp tuyến', need: 2, hint: 'Chạm tâm O, rồi điểm P trên đường tròn: tiếp tuyến tại P'},
  {id: 'tangents', label: 'Tiếp tuyến từ điểm', need: 3, hint: 'Chạm điểm P ngoài đường tròn, rồi tâm O, rồi điểm Q trên đường tròn: hai tiếp tuyến kẻ từ P'},
];

export const GEO_TRANSFORM: GeoToolSpec[] = [
  {id: 'translate', label: 'Tịnh tiến', need: 3, hint: 'Chạm điểm P, rồi 2 điểm A, B: P tịnh tiến theo véctơ AB'},
  {id: 'rotate', label: 'Quay góc', need: 2, param: {label: 'Góc °', def: 45}, hint: 'Chạm điểm P, rồi tâm O; nhập góc (độ, ngược chiều kim đồng hồ)'},
  {id: 'dilate', label: 'Vị tự tỉ số', need: 2, param: {label: 'Tỉ số', def: 3}, hint: 'Chạm điểm P, rồi tâm O; nhập tỉ số (âm = ảnh phía bên kia tâm)'},
  {id: 'rot90', label: 'Quay 90°', need: 2, hint: 'Chạm điểm P, rồi tâm O: P quay quanh O góc 90°'},
  {id: 'rot60', label: 'Quay 60°', need: 2, hint: 'Chạm điểm P, rồi tâm O: P quay quanh O góc 60°'},
  {id: 'dil2', label: 'Vị tự ×2', need: 2, hint: 'Chạm điểm P, rồi tâm O: ảnh của P qua vị tự tâm O tỉ số 2'},
  {id: 'dilhalf', label: 'Vị tự ×½', need: 2, hint: 'Chạm điểm P, rồi tâm O: ảnh của P qua vị tự tâm O tỉ số 1/2'},
  {id: 'reflline', label: 'Đối xứng trục', need: 3, hint: 'Chạm điểm P, rồi 2 điểm A, B của trục: điểm đối xứng của P qua AB'},
  {id: 'reflpt', label: 'Đối xứng tâm', need: 2, hint: 'Chạm điểm P, rồi tâm O: điểm đối xứng của P qua O'},
];

/** dụng cụ đo (tầng Đo của hub): không đổi hình, chỉ hiện kết quả */
export const GEO_MEASURE: GeoToolSpec[] = [
  {id: 'dist', label: 'Độ dài', need: 2, hint: 'Chạm 2 điểm để đo khoảng cách (đơn vị cạnh a)'},
  {id: 'angle', label: 'Góc', need: 3, hint: 'Chạm 3 điểm, điểm giữa là đỉnh góc'},
  {id: 'dpl', label: 'Điểm–mặt', need: 4, hint: 'Khoảng cách điểm đến mặt phẳng: chạm điểm cần đo, rồi 3 điểm của mặt phẳng'},
  {id: 'dln', label: 'Điểm–đường', need: 3, hint: 'Khoảng cách điểm đến đường thẳng: chạm điểm cần đo, rồi 2 điểm của đường thẳng'},
  {id: 'alp', label: 'Đường–mặt', need: 5, hint: 'Góc đường thẳng và mặt phẳng: chạm 2 điểm của đường thẳng, rồi 3 điểm của mặt phẳng'},
  {id: 'area', label: 'Diện tích', need: 3, hint: 'Chạm 3 điểm (tam giác): diện tích, đơn vị a²'},
  {id: 'perim', label: 'Chu vi', need: 3, hint: 'Chạm 3 điểm (tam giác): chu vi'},
  {id: 'dih', label: 'Nhị diện', need: 4, hint: 'Góc nhị diện: chạm 2 điểm của cạnh chung, rồi một điểm ở mỗi mặt'},
];
const ALL_TOOLS: GeoToolSpec[] = [...GEO_TOOLS, ...GEO_LINES, ...GEO_SHAPES, ...GEO_CURVES, ...GEO_TRANSFORM, ...GEO_OBJECTS, ...GEO_MEASURE];

const SAMPLE = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2.\na) Gọi M là trung điểm SB.\nb) Gọi O = AC ∩ BD.\nc) Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MOD).';

/** Cảnh cũ lưu kiểu "vẽ đến hết phần k" → kiểu bật/tắt từng phần (các phần sau k ẩn) */
function normalizeParts(scene: GeoScene, upTo?: number): {scene: GeoScene; upTo: number} {
  const last = scene.parts.length - 1;
  if (upTo === undefined || upTo >= last || scene.hiddenParts) return {scene, upTo: last};
  return {scene: showUpTo(scene, upTo), upTo: last};
}

export const GeometryProblemPanel: React.FC<Props> = ({mode, scene, upTo, initialText, onClose, onCreate, onApply, onDeleteFigure, onPickConfig, onController, onOpen3D, figureId}) => {
  // ---------------- chế độ MỚI: nhập đề
  const [text, setText] = useState(initialText ?? '');
  const [drawAll, setDrawAll] = useState(false);
  const built = useMemo(() => (mode === 'new' && text.trim() ? buildScene(text) : null), [mode, text]);

  // ---------------- chế độ SỬA: lịch sử, công cụ, chọn điểm
  const [hist, setHist] = useState<{scene: GeoScene; upTo: number}[]>(() => (scene ? [normalizeParts(scene, upTo)] : []));
  const [at, setAt] = useState(0);
  const [tool, setTool] = useState<GeoTool | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [info, setInfo] = useState('');
  const cur = hist[at];
  const curRef = useRef(cur);
  const freeBase = useRef<{name: string; at: V3; scene: GeoScene} | null>(null);
  curRef.current = cur;

  const commit = (next: GeoScene, nextUpTo: number) => {
    const h = [...hist.slice(0, at + 1), {scene: next, upTo: nextUpTo}].slice(-30);
    setHist(h);
    setAt(h.length - 1);
    onApply?.(next, nextUpTo);
  };
  // đổi thuộc tính hiển thị của bước hiện tại tại chỗ (không thêm vào lịch sử): dùng khi kéo xoay hình để giữ mượt
  const patchScene = (p: Partial<GeoScene>) => {
    const c = curRef.current;
    if (!c) return;
    const scene = {...c.scene, ...p};
    setHist((h) => h.map((x, i) => (i === at ? {...x, scene} : x)));
    curRef.current = {...c, scene};
    onApply?.(scene, c.upTo);
  };
  // hoạt họa mượt: nội suy một thuộc tính hiển thị (net, slice) theo từng khung hình
  const rafRef = useRef<number | null>(null);
  const tween = (key: 'net' | 'slice', to: number, ms: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const c0 = curRef.current;
    if (!c0) return;
    const from = c0.scene[key] ?? (key === 'slice' ? to : 0);
    const t0 = performance.now();
    const finish = (v: number) => {
      const off = key === 'slice' ? ms === 0 : v <= 0.001;
      patchScene({[key]: off ? undefined : v} as Partial<GeoScene>);
      const c = curRef.current;
      if (key === 'slice' && !off && c) {
        const sec = sliceSection(c.scene, v);
        setInfo(sec ? `Thiết diện ${sec.length}-giác: S = ${+polygonStats(sec).area.toFixed(3)}a², chu vi = ${+polygonStats(sec).perimeter.toFixed(3)}a` : 'Mặt phẳng này không cắt khối');
      } else if (key === 'slice') setInfo('');
    };
    if (ms === 0) return finish(to);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const v = from + (to - from) * e;
      if (k < 1) {
        patchScene({[key]: v} as Partial<GeoScene>);
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        finish(to);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);
  const stepTo = (k: number) => {
    if (!cur) return;
    const v = Math.max(0, Math.min(cur.scene.parts.length - 1, k));
    commit(cur.scene, v);
  };
  const jump = (i: number) => {
    const t = hist[i];
    if (!t) return;
    setAt(i);
    onApply?.(t.scene, t.upTo);
  };

  // nét tự vẽ bằng dụng cụ thuộc phần 0: luôn hiện, giữ nguyên khi bật/tắt các phần a, b, c
  const part = 0;
  // tham số số của dụng cụ (góc, tỉ số, độ dài, bán kính): giá trị người dùng nhập, không có thì mặc định
  const [params, setParams] = useState<Record<string, number>>({});
  const argOf = (t: GeoTool) => params[t] ?? ALL_TOOLS.find((x) => x.id === t)?.param?.def ?? 1;
  const apply = (t: GeoTool, names: string[], edge?: {t: number}) => {
    if (!cur) return;
    const sc = cur.scene;
    let next = sc;
    if (t === 'dist') {
      setInfo(measureDistance(sc, names[0], names[1]));
      setPicks([]);
      return;
    }
    if (t === 'angle') {
      setInfo(measureAngle(sc, names[0], names[1], names[2]));
      setPicks([]);
      return;
    }
    if (t === 'dpl' || t === 'dln' || t === 'alp' || t === 'dih') {
      setInfo(
        t === 'dpl' ? measureDistPointPlane(sc, names[0], names[1], names[2], names[3]) : t === 'dln' ? measureDistPointLine(sc, names[0], names[1], names[2]) : t === 'alp' ? measureAngleLinePlane(sc, names[0], names[1], names[2], names[3], names[4]) : measureDihedral(sc, names[0], names[1], names[2], names[3]),
      );
      setPicks([]);
      return;
    }
    if (t === 'area' || t === 'perim') {
      setInfo(measurePolygon(sc, names, t === 'area' ? 'area' : 'perimeter'));
      setPicks([]);
      return;
    }
    const built =
      t === 'perpbis' ? addPerpBisector(sc, names[0], names[1], part)
      : t === 'bisector' ? addBisector(sc, names[0], names[1], names[2], part)
      : t === 'parallel' ? addLineThrough(sc, 'par', names[0], names[1], names[2], part)?.scene
      : t === 'perpline' ? addLineThrough(sc, 'perp', names[0], names[1], names[2], part)?.scene
      : t === 'inter' ? addIntersection(sc, names[0], names[1], names[2], names[3], part)
      : t === 'circle' ? addCircleOf(sc, 'cp', names, part)
      : t === 'circle3' ? addCircleOf(sc, 'circum', names, part)
      : t === 'tangent' ? addTangent(sc, names[0], names[1], part)
      : t === 'reflline' ? addReflection(sc, names[0], [names[1], names[2]], part)
      : t === 'reflpt' ? addReflection(sc, names[0], names[1], part)
      : t === 'line' || t === 'ray' ? addLineAB(sc, names[0], names[1], t, part)
      : t === 'vector' ? addVector(sc, names[0], names[1], part)
      : t === 'polygon' ? addPolygon(sc, names, part)
      : t === 'reg4' || t === 'reg5' || t === 'reg6' ? addRegularPolygon(sc, names[0], names[1], Number(t.slice(3)), part)
      : t === 'compass' ? addCircleOf(sc, 'comp', [names[2], names[0], names[1]], part)
      : t === 'tangents' ? addTangentsFrom(sc, names[0], names[1], names[2], part)
      : t === 'translate' ? addTransform(sc, names[0], {k: 'trans', a: names[1], b: names[2]}, part)
      : t === 'rot90' || t === 'rot60' ? addTransform(sc, names[0], {k: 'rot', o: names[1], deg: t === 'rot90' ? 90 : 60}, part)
      : t === 'dil2' || t === 'dilhalf' ? addTransform(sc, names[0], {k: 'dil', o: names[1], f: t === 'dil2' ? 2 : 0.5}, part)
      : t === 'label' ? toggleLabel(sc, names[0])
      : t === 'hide' ? toggleHidden(sc, names[0])
      : t === 'seglen' ? addSegmentLen(sc, names[0], argOf(t), part)
      : t === 'circlecr' ? addCircleOf(sc, 'cr', [names[0]], part, argOf(t))
      : t === 'semi' ? addSemicircle(sc, names[0], names[1], part)
      : t === 'sector' ? addSector(sc, names[0], names[1], names[2], part)
      : t === 'rotate' ? addTransform(sc, names[0], {k: 'rot', o: names[1], deg: argOf(t)}, part)
      : t === 'dilate' ? addTransform(sc, names[0], {k: 'dil', o: names[1], f: argOf(t)}, part)
      : undefined;
    if (built !== undefined) {
      if (built === null) setInfo(sc.dim === 2 ? 'Không dựng được với các điểm này (trùng nhau, thẳng hàng, hai đường song song, hoặc điểm nằm trong đường tròn khi kẻ tiếp tuyến)' : 'Dựng kiểu GeoGebra chỉ dùng cho hình phẳng');
      else commit(built, cur.upTo);
      setPicks([]);
      return;
    }
    if (t === 'segment') next = addSegment(sc, names[0], names[1], part);
    else if (t === 'midpoint') next = addMidpoint(sc, names[0], names[1], part).scene;
    else if (t === 'onEdge') next = addPointOnSegment(sc, names[0], names[1], edge?.t ?? 0.5, part).scene;
    else if (t === 'foot') next = addFoot(sc, names[0], names[1], names[2], part).scene;
    else if (t === 'section') next = addSection(sc, names, part);
    else if (t === 'midline') next = addMidline(sc, names[0], names[1], names[2], part).scene;
    else if (t === 'delete') {
      next = removePoint(sc, names[0]);
      if (next === sc) {
        setInfo(`Không xóa được ${names[0]}: đó là đỉnh của hình gốc (chỉ xóa được điểm thêm vào)`);
        setPicks([]);
        return;
      }
      setInfo(`Đã xóa ${names[0]}`);
    }
    if (next !== sc) commit(next, cur.upTo);
    setPicks([]);
  };

  // đăng ký cấu hình chọn điểm với bảng
  useEffect(() => {
    if (mode !== 'edit' || !onPickConfig) return;
    const spec = ALL_TOOLS.find((x) => x.id === tool);
    if (!tool || !spec) {
      onPickConfig(null);
      return;
    }
    onPickConfig({
      pickMode: tool === 'onEdge' ? 'edge' : tool === 'point' ? 'place' : 'point',
      onPlace: (dx, dy, anchor) => {
        const c0 = curRef.current;
        if (!c0 || !c0.scene.pts[anchor]) return;
        const k = c0.scene.view.k || 1;
        const at = c0.scene.pts[anchor];
        const made = addFreePoint(c0.scene, [at[0] + dx / k, at[1] - dy / k, 0], 0);
        if (made) commit(made.scene, c0.upTo);
      },
      picks,
      onPickPoint: (name) => {
        // đa giác: số đỉnh tùy ý, chạm lại đỉnh đầu để khép kín
        if (spec.need === 0) {
          if (picks.length >= 3 && name === picks[0]) apply(tool, picks);
          else if (!picks.includes(name)) setPicks([...picks, name]);
          return;
        }
        const list = [...picks, name];
        if (list.length >= spec.need) apply(tool, list);
        else setPicks(list);
      },
      onPickEdge: (a, b, t) => apply('onEdge', [a, b], {t}),
    });
    return () => onPickConfig(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, picks, at, hist, mode]);

  // đăng ký bộ điều khiển với AI hub (mỗi lần trạng thái đổi)
  useEffect(() => {
    if (mode !== 'edit' || !onController || !cur) return;
    onController({
      parts: cur.scene.parts.length,
      upTo: cur.upTo,
      tool,
      picks,
      canUndo: at > 0,
      canRedo: at < hist.length - 1,
      hideHidden: !!cur.scene.hideHidden,
      is3D: cur.scene.dim === 3,
      rot: cur.scene.rot ?? null,
      setRot: (yaw, pitch) => patchScene({rot: {yaw, pitch}}),
      resetView: () => commit({...cur.scene, rot: undefined}, cur.upTo),
      colors: !!cur.scene.colors,
      toggleColors: () => commit({...cur.scene, colors: !cur.scene.colors}, cur.upTo),
      measureSolid: () => setInfo(solidStats(cur.scene)),
      setPointT: (name, t, done) => {
        const c0 = curRef.current ?? cur;
        const next = setPointT(c0.scene, name, t);
        setInfo('');
        if (done) commit(next, c0.upTo);
        else patchScene({pts: next.pts, defs: next.defs});
      },
      moveFree: (name, dx, dy, done, start) => {
        const c0 = curRef.current ?? cur;
        if (start) freeBase.current = {name, at: [...c0.scene.pts[name]] as V3, scene: c0.scene};
        const b = freeBase.current;
        if (!b || b.name !== name) return;
        const k = b.scene.view.k || 1;
        const next = moveFreePoint(c0.scene, name, [b.at[0] + dx / k, b.at[1] - dy / k, b.at[2]]);
        setInfo('');
        if (done) {
          freeBase.current = null;
          // lịch sử: trạng thái TRƯỚC khi kéo rồi trạng thái sau, để hoàn tác quay về đúng hình cũ
          const h = [...hist.slice(0, at), {...hist[at], scene: b.scene}, {scene: next, upTo: c0.upTo}].slice(-30);
          setHist(h);
          setAt(h.length - 1);
          onApply?.(next, c0.upTo);
        } else patchScene({pts: next.pts, circles: next.circles, cons: next.cons});
      },
      hasHidden: (cur.scene.hiddenPts?.length ?? 0) > 0,
      showHidden: () => commit({...cur.scene, hiddenPts: []}, cur.upTo),
      canNet: canUnfold(cur.scene),
      net: cur.scene.net ?? 0,
      setNet: (t) => tween('net', t, 700),
      slice: cur.scene.slice ?? null,
      setSlice: (v) => (v === null ? tween('slice', 0, 0) : tween('slice', Math.max(0.05, Math.min(0.95, v)), 350)),
      toggleHidden: () => commit({...cur.scene, hideHidden: !cur.scene.hideHidden}, cur.upTo),
      exportTikz: () => {
        const code = toTikz(cur.scene, cur.upTo);
        try {
          void navigator.clipboard?.writeText(code);
          setInfo('Đã chép mã TikZ vào bộ nhớ tạm, dán vào LaTeX để in đề');
        } catch {
          setInfo('Không chép được vào bộ nhớ tạm');
        }
      },
      open3D: () => onOpen3D?.(cur.scene),
      setTool: (t) => {
        setTool(t);
        setPicks([]);
        if (t) setInfo('');
      },
      shownParts: partChips(cur.scene).filter((c) => c.shown).length,
      togglableParts: partChips(cur.scene).length,
      togglePart: (i) => patchScene({hiddenParts: togglePart(cur.scene, i).hiddenParts}),
      next: () => {
        const nxt = partChips(cur.scene).find((c) => !c.shown);
        if (nxt) patchScene({hiddenParts: setPartShown(cur.scene, nxt.index, true).hiddenParts});
      },
      prev: () => {
        const shown = partChips(cur.scene).filter((c) => c.shown);
        const last = shown[shown.length - 1];
        if (last) patchScene({hiddenParts: setPartShown(cur.scene, last.index, false).hiddenParts});
      },
      undo: () => jump(at - 1),
      redo: () => jump(at + 1),
      remove: () => onDeleteFigure?.(),
      figureId,
      addRequirementText: (text) => {
        const before = cur.scene;
        const next = addRequirement(before, text.trim());
        if (!sceneGrew(before, next)) return {grew: false, notes: [], ignored: next.ignored.slice(before.ignored.length)};
        commit(next, next.parts.length - 1);
        return {grew: true, notes: next.notes.slice(before.notes.length), ignored: next.ignored.slice(before.ignored.length)};
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tool, picks, at, hist]);
  useEffect(() => () => onController?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const box = 'absolute left-3 top-16 z-40 w-[300px] max-h-[78%] overflow-auto rounded-2xl bg-white/97 backdrop-blur border border-[#DCD9D0] shadow-xl p-3 flex flex-col gap-2.5 text-[12px] text-stone-800 pointer-events-auto';

  if (mode === 'new') {
    return (
      <div data-testid="geo-problem-dialog" className={box} style={{width: 340}}>
        <div className="flex items-center gap-2">
          <b className="text-sm">Vẽ hình từ đề bài</b>
          <button className="ml-auto text-stone-400 hover:text-stone-700" onClick={onClose} title="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          data-testid="geo-problem-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Dán hoặc gõ đề. Hiểu cả dạng tóm tắt (GT/KL) và ký hiệu ⊥ ∥ ∩ ≡ ∈ ∠ △…"
          className="w-full rounded-lg border border-[#DCD9D0] px-2 py-1.5 outline-none focus:border-blue-500 font-mono text-[12px]"
        />
        <button className="self-start text-[11px] text-blue-700 hover:underline" onClick={() => setText(SAMPLE)}>
          Điền đề mẫu
        </button>
        {built && (
          <div data-testid="geo-problem-preview" className="rounded-lg bg-stone-50 border border-[#E6E4DD] p-2 flex flex-col gap-1">
            {built.scene ? (
              <>
                <div className="font-semibold">{built.scene.title}</div>
                <div className="text-stone-600">Các phần: {built.scene.parts.map((p) => p.label).join(' · ')}</div>
                {built.notes.slice(0, 6).map((n, i) => (
                  <div key={i} className="text-emerald-700">✓ {n}</div>
                ))}
              </>
            ) : null}
            {built.ignored.map((n, i) => (
              <div key={`i${i}`} className="text-amber-700">⚠ {n}</div>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-stone-700">
          <input type="checkbox" data-testid="geo-draw-all" checked={drawAll} onChange={(e) => setDrawAll(e.target.checked)} />
          Vẽ đủ mọi phần ngay (mặc định: chỉ hình gốc, vẽ thêm từng phần sau)
        </label>
        <button
          data-testid="geo-problem-draw"
          disabled={!built?.scene}
          onClick={() => built?.scene && onCreate?.(built.scene, drawAll ? built.scene.parts.length - 1 : 0, text)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 disabled:opacity-40"
        >
          Vẽ lên bảng
        </button>
      </div>
    );
  }

  if (!cur) return null;
  const sc = cur.scene;
  const spec = ALL_TOOLS.find((x) => x.id === tool);
  const names = visibleNames(sc, cur.upTo);
  return (
    <>
      {/* chip gợi ý nhỏ khi đang dùng dụng cụ; phần còn lại điều khiển qua AI hub */}
      {(spec || info) && (
        <div data-testid="geo-chip" className="absolute left-1/2 -translate-x-1/2 top-14 z-40 pointer-events-auto flex items-center gap-2 rounded-full bg-white/97 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[12px] text-stone-800">
              {info && <b data-testid="geo-measure" className="text-blue-700">{info}</b>}
              {spec?.param && (
                <label className="flex items-center gap-1 text-stone-600">
                  {spec.param.label}
                  <input
                    data-testid="geo-tool-param"
                    type="number"
                    step="any"
                    value={params[spec.id] ?? spec.param.def}
                    onChange={(e) => setParams((p) => ({...p, [spec.id]: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : spec.param!.def}))}
                    className="w-16 rounded border border-[#DCD9D0] px-1 py-0.5 text-[12px]"
                  />
                </label>
              )}
              {spec && <span data-testid="geo-tool-hint">{`${spec.label}: ${spec.hint}${picks.length ? ` (đã chọn: ${picks.join(', ')})` : ''}`}</span>}
              <button data-testid="geo-tool-off" onClick={() => { setTool(null); setInfo(''); }} className="text-stone-400 hover:text-stone-700" title="Thôi dùng dụng cụ">
                <X className="w-4 h-4" />
              </button>
        </div>
      )}
      <span data-testid="geo-toolbox" className="hidden" data-points={names.length} data-part={cur.upTo} data-parts={sc.parts.length} />
    </>
  );
};
