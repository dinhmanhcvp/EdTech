'use client';

import React, {useEffect, useRef, useState} from 'react';
import {Eraser, Send, Undo2} from 'lucide-react';
import {PAD_H, PAD_W, prepareSubmission, type InkStroke, type Pt} from '../../utils/submissionInk';

interface Props {
  prompt: string;
  /** giáo viên còn nhận bài không */
  open: boolean;
  /** số lần nộp đã được máy chủ xác nhận (0 = chưa nộp) */
  submittedRev: number;
  /** gửi bài; trả false nếu chưa gửi được (mất kết nối) */
  onSubmit: (strokes: InkStroke[]) => boolean;
}

const COLORS = [
  {c: '#18181B', label: 'Đen'},
  {c: '#2563EB', label: 'Xanh'},
  {c: '#DC2626', label: 'Đỏ'},
];

/**
 * Bảng nháp trên điện thoại học sinh: vẽ/viết lời giải bằng ngón tay rồi nộp cho giáo viên. Bài nộp được máy chủ giữ theo đợt thu bài,
 * học sinh sửa và nộp lại được cho tới khi giáo viên đóng đợt.
 */
export const SubmitPad: React.FC<Props> = ({prompt, open, submittedRev, onSubmit}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [color, setColor] = useState(COLORS[0].c);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false); // đã vẽ thêm/sửa sau lần nộp gần nhất
  const live = useRef<InkStroke | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext?.('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of strokes) {
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w * 1.6;
      ctx.beginPath();
      s.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.p.length === 1) ctx.lineTo(s.p[0][0] + 0.1, s.p[0][1]);
      ctx.stroke();
    }
  }, [strokes]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    const w = r.width || PAD_W;
    const h = r.height || PAD_H;
    return [((e.clientX - r.left) / w) * PAD_W, ((e.clientY - r.top) / h) * PAD_H];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!open) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    const st: InkStroke = {p: [at(e)], c: color, w: 3};
    live.current = st; // giữ nét trong biến cục bộ: bản cập nhật state chạy muộn, lúc đó live.current có thể đã bị `up` xóa (chạm nhanh)
    setStrokes((s) => [...s, st]);
    setDirty(true);
    setMsg(null);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cur = live.current;
    if (!cur) return;
    cur.p.push(at(e));
    setStrokes((s) => s.slice()); // vẽ lại với điểm mới (cur đã nằm trong mảng)
  };
  const up = () => {
    live.current = null;
  };

  const submit = () => {
    const r = prepareSubmission(strokes);
    if (!r.ok) {
      setMsg(r.reason === 'empty' ? 'Bạn chưa viết gì để nộp.' : r.reason === 'too_many_strokes' ? 'Bài có quá nhiều nét. Hãy xóa bớt hoặc viết gọn lại.' : 'Bài quá phức tạp để gửi. Hãy xóa bớt nét.');
      return;
    }
    if (!onSubmit(r.strokes)) {
      setMsg('Chưa gửi được: mất kết nối. Đợi kết nối lại rồi nộp lần nữa.');
      return;
    }
    setDirty(false);
    setMsg(null);
  };

  const status = !open ? 'Giáo viên đã đóng việc nộp bài.' : submittedRev > 0 && !dirty ? `Đã nộp (lần ${submittedRev}). Bạn có thể sửa rồi nộp lại.` : 'Viết lời giải rồi bấm Nộp bài.';

  return (
    <div data-testid="submit-pad" className="rounded-2xl bg-white border border-[#E6E4DD] shadow-sm p-3 flex flex-col gap-2.5">
      <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-700">Nộp bài làm</div>
      {prompt && (
        <p data-testid="submit-prompt" className="text-base font-semibold text-stone-900">
          {prompt}
        </p>
      )}
      <div className="relative w-full overflow-hidden rounded-xl border border-[#DCD9D0] bg-[#FCFBF9]" style={{aspectRatio: `${PAD_W} / ${PAD_H}`}}>
        <canvas
          ref={canvasRef}
          data-testid="submit-canvas"
          width={PAD_W}
          height={PAD_H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="absolute inset-0 h-full w-full"
          style={{touchAction: 'none', cursor: open ? 'crosshair' : 'not-allowed', opacity: open ? 1 : 0.6}}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="Màu bút">
          {COLORS.map((k) => (
            <button
              key={k.c}
              role="radio"
              aria-checked={color === k.c}
              aria-label={k.label}
              data-testid={`submit-color-${k.label}`}
              onClick={() => setColor(k.c)}
              className="h-8 w-8 rounded-full border-2 border-white ring-1 ring-stone-300 aria-checked:ring-2 aria-checked:ring-blue-600"
              style={{background: k.c}}
            />
          ))}
        </div>
        <button
          data-testid="submit-undo"
          disabled={!open || strokes.length === 0}
          onClick={() => {
            setStrokes((s) => s.slice(0, -1));
            setDirty(true);
          }}
          className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" /> Hoàn tác
        </button>
        <button
          data-testid="submit-clear"
          disabled={!open || strokes.length === 0}
          onClick={() => {
            setStrokes([]);
            setDirty(true);
          }}
          className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-40"
        >
          <Eraser className="h-4 w-4" /> Xóa hết
        </button>
        <button data-testid="submit-send" disabled={!open || strokes.length === 0} onClick={submit} className="ml-auto flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300">
          <Send className="h-4 w-4" /> {submittedRev > 0 ? 'Nộp lại' : 'Nộp bài'}
        </button>
      </div>
      <p data-testid="submit-status" className={`text-xs ${!open ? 'text-amber-700' : submittedRev > 0 && !dirty ? 'text-emerald-700' : 'text-stone-500'}`}>
        {status}
      </p>
      {msg && (
        <p data-testid="submit-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {msg}
        </p>
      )}
    </div>
  );
};
