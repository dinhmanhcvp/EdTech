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
}

const TOOLS: {id: GeoTool; label: string; need: number; hint: string}[] = [
  {id: 'segment', label: 'Đoạn nối', need: 2, hint: 'Chạm 2 điểm để nối thành đoạn thẳng'},
  {id: 'midpoint', label: 'Trung điểm', need: 2, hint: 'Chạm 2 điểm để lấy trung điểm'},
  {id: 'onEdge', label: 'Điểm trên cạnh', need: 1, hint: 'Chạm vào một cạnh để đặt điểm tại chỗ chạm'},
  {id: 'foot', label: 'Chân vuông góc', need: 3, hint: 'Chạm điểm cần hạ, rồi 2 điểm của đường thẳng'},
  {id: 'section', label: 'Thiết diện', need: 3, hint: 'Chạm 3 điểm xác định mặt phẳng cắt'},
];

const SAMPLE = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2.\na) Gọi M là trung điểm SB.\nb) Gọi O = AC ∩ BD.\nc) Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MOD).';

export const GeometryProblemPanel: React.FC<Props> = ({mode, scene, upTo, initialText, onClose, onCreate, onApply, onDeleteFigure, onPickConfig}) => {
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
    const spec = TOOLS.find((x) => x.id === tool);
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
  const spec = TOOLS.find((x) => x.id === tool);
  const names = visibleNames(sc, cur.upTo);
  return (
    <div data-testid="geo-toolbox" className={box}>
      <div className="flex items-center gap-2">
        <b className="text-sm truncate">{sc.title}</b>
        <button className="ml-auto text-stone-400 hover:text-stone-700" onClick={onClose} title="Đóng bảng dụng cụ">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button data-testid="geo-undo" disabled={at <= 0} onClick={() => jump(at - 1)} className="p-1.5 rounded-md border border-[#DCD9D0] disabled:opacity-30" title="Hoàn tác">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button data-testid="geo-redo" disabled={at >= hist.length - 1} onClick={() => jump(at + 1)} className="p-1.5 rounded-md border border-[#DCD9D0] disabled:opacity-30" title="Làm lại">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button data-testid="geo-delete" onClick={onDeleteFigure} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50">
          <Eraser className="w-3.5 h-3.5" /> Xóa hình
        </button>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">Các phần của đề</div>
        <div className="flex flex-col gap-1">
          {sc.parts.map((p, i) => (
            <button
              key={i}
              data-testid={`geo-part-${i}`}
              data-active={i <= cur.upTo ? 'true' : 'false'}
              onClick={() => stepTo(i)}
              className={`text-left rounded-md border px-2 py-1 truncate ${i <= cur.upTo ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-[#E6E4DD] text-stone-500'}`}
              title={p.text}
            >
              <b>{p.label}</b> {p.text.replace(/\s+/g, ' ').slice(0, 46) || '(hình gốc)'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          <button data-testid="geo-prev" disabled={cur.upTo <= 0} onClick={() => stepTo(cur.upTo - 1)} className="flex-1 rounded-md border border-[#DCD9D0] py-1 disabled:opacity-30">
            ◀ Ẩn phần cuối
          </button>
          <button data-testid="geo-next" disabled={cur.upTo >= sc.parts.length - 1} onClick={() => stepTo(cur.upTo + 1)} className="flex-1 rounded-md bg-blue-600 text-white py-1 disabled:opacity-30">
            Vẽ phần tiếp ▶
          </button>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">Dụng cụ vẽ trên hình</div>
        <div className="flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              data-testid={`geo-tool-${t.id}`}
              onClick={() => {
                setTool(tool === t.id ? null : t.id);
                setPicks([]);
              }}
              className={`px-2 py-1 rounded-md border ${tool === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-[#DCD9D0] text-stone-700 hover:bg-stone-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div data-testid="geo-tool-hint" className="mt-1 text-stone-600 min-h-[16px]">
          {spec ? `${spec.hint}${picks.length ? ` (đã chọn: ${picks.join(', ')})` : ''}` : `Có ${names.length} điểm trên hình. Chọn dụng cụ rồi chạm vào hình.`}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-1">Thêm yêu cầu bằng lời</div>
        <div className="flex gap-1.5">
          <input
            data-testid="geo-req-input"
            value={req}
            onChange={(e) => setReq(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReq()}
            placeholder="VD: Gọi N là trung điểm SC"
            className="flex-1 rounded-md border border-[#DCD9D0] px-2 py-1 outline-none focus:border-blue-500"
          />
          <button data-testid="geo-req-add" onClick={addReq} className="rounded-md bg-blue-600 text-white px-2.5">
            Vẽ thêm
          </button>
        </div>
      </div>

      {(sc.notes.length > 0 || sc.ignored.length > 0) && (
        <div className="rounded-lg bg-stone-50 border border-[#E6E4DD] p-2 flex flex-col gap-0.5 max-h-28 overflow-auto">
          {sc.notes.slice(-6).map((n, i) => (
            <div key={i} className="text-emerald-700">✓ {n}</div>
          ))}
          {sc.ignored.slice(-4).map((n, i) => (
            <div key={`i${i}`} className="text-amber-700">⚠ {n}</div>
          ))}
        </div>
      )}
    </div>
  );
};
