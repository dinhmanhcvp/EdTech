'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Eraser, Redo2, Undo2, X} from 'lucide-react';
import {buildScene, type GeoScene} from '../../utils/geometryProblem';
import {addFoot, addMidpoint, addPointOnSegment, addRequirement, addSection, addSegment, visibleNames} from '../../utils/geoTools';

export type GeoTool = 'segment' | 'midpoint' | 'onEdge' | 'foot' | 'section';

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
  setTool: (t: GeoTool | null) => void;
  next: () => void;
  prev: () => void;
  undo: () => void;
  redo: () => void;
  remove: () => void;
  openRequirement: () => void;
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
}

export const GEO_TOOLS: {id: GeoTool; label: string; need: number; hint: string}[] = [
  {id: 'segment', label: 'Đoạn nối', need: 2, hint: 'Chạm 2 điểm để nối thành đoạn thẳng'},
  {id: 'midpoint', label: 'Trung điểm', need: 2, hint: 'Chạm 2 điểm để lấy trung điểm'},
  {id: 'onEdge', label: 'Điểm trên cạnh', need: 1, hint: 'Chạm vào một cạnh để đặt điểm tại chỗ chạm'},
  {id: 'foot', label: 'Chân vuông góc', need: 3, hint: 'Chạm điểm cần hạ, rồi 2 điểm của đường thẳng'},
  {id: 'section', label: 'Thiết diện', need: 3, hint: 'Chạm 3 điểm xác định mặt phẳng cắt'},
];

const SAMPLE = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2.\na) Gọi M là trung điểm SB.\nb) Gọi O = AC ∩ BD.\nc) Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MOD).';

export const GeometryProblemPanel: React.FC<Props> = ({mode, scene, upTo, initialText, onClose, onCreate, onApply, onDeleteFigure, onPickConfig, onController}) => {
  const [reqOpen, setReqOpen] = useState(false);
  // ---------------- chế độ MỚI: nhập đề
  const [text, setText] = useState(initialText ?? '');
  const [drawAll, setDrawAll] = useState(false);
  const built = useMemo(() => (mode === 'new' && text.trim() ? buildScene(text) : null), [mode, text]);

  // ---------------- chế độ SỬA: lịch sử, công cụ, chọn điểm
  const [hist, setHist] = useState<{scene: GeoScene; upTo: number}[]>(() => (scene ? [{scene, upTo: upTo ?? 0}] : []));
  const [at, setAt] = useState(0);
  const [tool, setTool] = useState<GeoTool | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [req, setReq] = useState('');
  const cur = hist[at];
  const curRef = useRef(cur);
  curRef.current = cur;

  const commit = (next: GeoScene, nextUpTo: number) => {
    const h = [...hist.slice(0, at + 1), {scene: next, upTo: nextUpTo}].slice(-30);
    setHist(h);
    setAt(h.length - 1);
    onApply?.(next, nextUpTo);
  };
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

  const part = cur ? Math.min(cur.upTo, cur.scene.parts.length - 1) : 0;
  const apply = (t: GeoTool, names: string[], edge?: {t: number}) => {
    if (!cur) return;
    const sc = cur.scene;
    let next = sc;
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
    const spec = GEO_TOOLS.find((x) => x.id === tool);
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
      setTool: (t) => {
        setTool(t);
        setPicks([]);
      },
      next: () => stepTo(cur.upTo + 1),
      prev: () => stepTo(cur.upTo - 1),
      undo: () => jump(at - 1),
      redo: () => jump(at + 1),
      remove: () => onDeleteFigure?.(),
      openRequirement: () => setReqOpen(true),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tool, picks, at, hist]);
  useEffect(() => () => onController?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addReq = () => {
    if (!cur || !req.trim()) return;
    const next = addRequirement(cur.scene, req.trim());
    setReq('');
    commit(next, next.parts.length - 1);
  };

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
  const spec = GEO_TOOLS.find((x) => x.id === tool);
  const names = visibleNames(sc, cur.upTo);
  return (
    <>
      {/* chip gợi ý nhỏ khi đang dùng dụng cụ; phần còn lại điều khiển qua AI hub */}
      {(spec || reqOpen) && (
        <div data-testid="geo-chip" className="absolute left-1/2 -translate-x-1/2 top-14 z-40 pointer-events-auto flex items-center gap-2 rounded-full bg-white/97 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[12px] text-stone-800">
          {reqOpen ? (
            <>
              <input
                data-testid="geo-req-input"
                autoFocus
                value={req}
                onChange={(e) => setReq(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addReq();
                    setReqOpen(false);
                  } else if (e.key === 'Escape') setReqOpen(false);
                }}
                placeholder="Yêu cầu thêm, VD: Gọi N là trung điểm SC"
                className="w-[300px] rounded-md border border-[#DCD9D0] px-2 py-1 outline-none focus:border-blue-500"
              />
              <button
                data-testid="geo-req-add"
                onClick={() => {
                  addReq();
                  setReqOpen(false);
                }}
                className="rounded-md bg-blue-600 text-white px-2.5 py-1"
              >
                Vẽ thêm
              </button>
              <button onClick={() => setReqOpen(false)} className="text-stone-400 hover:text-stone-700" title="Đóng">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span data-testid="geo-tool-hint">{`${spec!.label}: ${spec!.hint}${picks.length ? ` (đã chọn: ${picks.join(', ')})` : ''}`}</span>
              <button data-testid="geo-tool-off" onClick={() => setTool(null)} className="text-stone-400 hover:text-stone-700" title="Thôi dùng dụng cụ">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
      <span data-testid="geo-toolbox" className="hidden" data-points={names.length} data-part={cur.upTo} data-parts={sc.parts.length} />
    </>
  );
};
