'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Eraser, Redo2, Undo2, X} from 'lucide-react';
import {buildScene, type GeoScene} from '../../utils/geometryProblem';
import {canUnfold, polygonStats, sliceSection} from '../../utils/netUnfold';
import {addFoot, addMidpoint, addPointOnSegment, addRequirement, addSection, addSegment, measureAngle, measureDistance, partChips, sceneGrew, setPartShown, showUpTo, solidStats, toTikz, togglePart, visibleNames, measureAngleLinePlane, measureDihedral, measureDistPointLine, measureDistPointPlane} from '../../utils/geoTools';

export type GeoTool = 'segment' | 'midpoint' | 'onEdge' | 'foot' | 'section' | 'dist' | 'angle' | 'dpl' | 'dln' | 'alp' | 'dih';

export interface GeoPickConfig {
  pickMode: 'point' | 'edge' | null;
  picks: string[];
  onPickPoint: (name: string) => void;
  onPickEdge: (a: string, b: string, t: number) => void;
}

/** Bộ điều khiển hình dựng từ đề: AI hub phân tầng dùng để điều khiển, không cần bảng riêng. */
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

export const GEO_TOOLS: {id: GeoTool; label: string; need: number; hint: string}[] = [
  {id: 'segment', label: 'Đoạn nối', need: 2, hint: 'Chạm 2 điểm để nối thành đoạn thẳng'},
  {id: 'midpoint', label: 'Trung điểm', need: 2, hint: 'Chạm 2 điểm để lấy trung điểm'},
  {id: 'onEdge', label: 'Điểm trên cạnh', need: 1, hint: 'Chạm vào một cạnh để đặt điểm tại chỗ chạm'},
  {id: 'foot', label: 'Chân vuông góc', need: 3, hint: 'Chạm điểm cần hạ, rồi 2 điểm của đường thẳng'},
  {id: 'section', label: 'Thiết diện', need: 3, hint: 'Chạm 3 điểm xác định mặt phẳng cắt'},
];

/** dụng cụ đo (tầng Đo của hub): không đổi hình, chỉ hiện kết quả */
export const GEO_MEASURE: {id: GeoTool; label: string; need: number; hint: string}[] = [
  {id: 'dist', label: 'Độ dài', need: 2, hint: 'Chạm 2 điểm để đo khoảng cách (đơn vị cạnh a)'},
  {id: 'angle', label: 'Góc', need: 3, hint: 'Chạm 3 điểm, điểm giữa là đỉnh góc'},
  {id: 'dpl', label: 'Điểm–mặt', need: 4, hint: 'Khoảng cách điểm đến mặt phẳng: chạm điểm cần đo, rồi 3 điểm của mặt phẳng'},
  {id: 'dln', label: 'Điểm–đường', need: 3, hint: 'Khoảng cách điểm đến đường thẳng: chạm điểm cần đo, rồi 2 điểm của đường thẳng'},
  {id: 'alp', label: 'Đường–mặt', need: 5, hint: 'Góc đường thẳng và mặt phẳng: chạm 2 điểm của đường thẳng, rồi 3 điểm của mặt phẳng'},
  {id: 'dih', label: 'Nhị diện', need: 4, hint: 'Góc nhị diện: chạm 2 điểm của cạnh chung, rồi một điểm ở mỗi mặt'},
];
const ALL_TOOLS = [...GEO_TOOLS, ...GEO_MEASURE];

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
    if (t === 'segment') next = addSegment(sc, names[0], names[1], part);
    else if (t === 'midpoint') next = addMidpoint(sc, names[0], names[1], part).scene;
    else if (t === 'onEdge') next = addPointOnSegment(sc, names[0], names[1], edge?.t ?? 0.5, part).scene;
    else if (t === 'foot') next = addFoot(sc, names[0], names[1], names[2], part).scene;
    else if (t === 'section') next = addSection(sc, names, part);
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
      pickMode: tool === 'onEdge' ? 'edge' : 'point',
      picks,
      onPickPoint: (name) => {
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
