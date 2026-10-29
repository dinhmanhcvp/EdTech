'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FormulaBlock, MathText } from '../ui/MathText';
import type { Box, GradeResult, GradeStep, Uncertain } from '../../utils/gradeUi';
import { uncertainBoardPos } from '../../utils/gradeUi';

const pct = (v: number, total: number) => `${(v / total) * 100}%`;
const W = 1200;
const H = 675;

/** Thanh chọn ngay dưới từng ký tự AI phân vân (dùng chung cho mọi chức năng nhận diện). */
export const UncertainBars: React.FC<{
  items: Uncertain[];
  bbox: Box;
  gradePending: boolean;
  onPick: (index: number, choice: string) => void;
  onKeepAll: () => void;
}> = ({ items, bbox, gradePending, onPick, onKeepAll }) => (
  <>
    {items.map((u, i) => {
      const p = uncertainBoardPos(bbox, u);
      return (
        <div key={`${u.line}-${u.token}-${i}`} data-testid="uncertain-bar" data-index={i} className="absolute pointer-events-none" style={{ left: pct(p.x, W), top: pct(p.y, H) }}>
          <span className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-dashed border-amber-500 bg-amber-300/20" />
          <div className="absolute -translate-x-1/2 mt-4 flex items-center gap-0.5 rounded-full bg-white/95 border border-amber-300 shadow-md px-1 py-0.5 pointer-events-auto whitespace-nowrap">
            {[u.token, ...u.alternatives].map((c, k) => (
              <button
                key={`${c}-${k}`}
                type="button"
                data-testid={`uncertain-pick-${i}-${k}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onPick(i, c)}
                className={`min-w-[24px] px-1.5 py-0.5 rounded-full text-[13px] font-semibold cursor-pointer ${k === 0 ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400' : 'text-stone-700 hover:bg-stone-100'}`}
                title={k === 0 ? 'AI đang chọn ký tự này' : 'Chọn ký tự này'}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      );
    })}
    <div className="absolute pointer-events-auto flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-[11px] px-2.5 py-1 shadow-sm" style={{ left: pct(bbox.x0, W), top: pct(Math.max(4, bbox.y0 - 34), H) }} data-testid="uncertain-footer">
      <span>{gradePending ? `Chấm bài sau khi chọn: còn ${items.length} ký tự cần xác nhận` : `${items.length} ký tự AI chưa chắc, chạm để chọn`}</span>
      <button type="button" data-testid="uncertain-keep-all" onPointerDown={(e) => e.stopPropagation()} onClick={onKeepAll} className="underline underline-offset-2 cursor-pointer">
        Giữ như AI đọc
      </button>
    </div>
  </>
);

const STYLE: Record<string, { fill: string; border: string; label: string }> = {
  error: { fill: 'rgba(239,68,68,0.16)', border: '#EF4444', label: 'Sai' },
  carry: { fill: 'rgba(249,115,22,0.10)', border: '#F97316', label: 'Hệ quả' },
  warn: { fill: 'rgba(245,158,11,0.12)', border: '#F59E0B', label: 'Cần kiểm lại' },
};

/** Bôi đỏ dòng sai, mũi tên chỉ vào bước sai đầu tiên; chạm mũi tên/dấu để mở cửa sổ giải thích. */
export const GradeMarks: React.FC<{ result: GradeResult; boxes: Box[]; onOpen: (index: number) => void }> = ({ result, boxes, onOpen }) => (
  <>
    {result.steps.map((s) => {
      const b = boxes[s.index];
      if (!b) return null;
      const st = STYLE[s.status];
      const first = s.index === result.first_error;
      return (
        <React.Fragment key={s.index}>
          {st && (
            <div
              data-testid={`grade-mark-${s.status}`}
              data-index={s.index}
              className="absolute rounded-md pointer-events-none"
              style={{ left: pct(b.x0 - 6, W), top: pct(b.y0, H), width: pct(b.x1 - b.x0 + 12, W), height: pct(b.y1 - b.y0, H), background: st.fill, border: `1.5px solid ${st.border}` }}
            />
          )}
          {s.status === 'ok' && (
            <span className="absolute text-emerald-600 text-sm font-bold pointer-events-none" style={{ left: pct(b.x0 - 22, W), top: pct((b.y0 + b.y1) / 2 - 9, H) }} data-testid="grade-mark-ok">
              ✓
            </span>
          )}
          {st && (
            <button
              type="button"
              data-testid={first ? 'grade-arrow-first' : `grade-arrow-${s.index}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onOpen(s.index)}
              className="absolute pointer-events-auto -translate-y-1/2 flex items-center gap-1 rounded-full text-white text-[12px] font-semibold px-2.5 py-1 shadow-md cursor-pointer"
              style={{ left: pct(b.x1 + 14, W), top: pct((b.y0 + b.y1) / 2, H), background: st.border }}
              title="Xem giải thích"
            >
              ◀ {first ? `Sai ở bước ${s.index + 1}` : `Bước ${s.index + 1}: ${st.label}`}
            </button>
          )}
        </React.Fragment>
      );
    })}
  </>
);

const DOT: Record<string, string> = { ok: 'bg-emerald-500', error: 'bg-rose-500', carry: 'bg-orange-400', warn: 'bg-amber-400', unchecked: 'bg-stone-300' };

/** Cửa sổ giải thích kĩ bước sai và cách khắc phục. */
export const StepExplainWindow: React.FC<{ result: GradeResult; index: number; onIndex: (i: number) => void; onClose: () => void }> = ({ result, index, onIndex, onClose }) => {
  const s: GradeStep | undefined = result.steps[index];
  if (!s) return null;
  const bad = result.steps.filter((x) => x.status === 'error' || x.status === 'warn').map((x) => x.index);
  const at = bad.indexOf(index);
  const go = (d: number) => bad.length > 0 && onIndex(bad[(Math.max(0, at) + d + bad.length) % bad.length]);
  const head = s.status === 'error' ? `Bước ${s.index + 1} sai` : s.status === 'carry' ? `Bước ${s.index + 1}: sai do hệ quả` : s.status === 'warn' ? `Bước ${s.index + 1}: cần kiểm lại` : `Bước ${s.index + 1} đúng`;
  // đặt ở body với vị trí cố định để luôn nằm trên đĩa AI và các thẻ khác của bảng
  const card = (
    <div data-testid="step-explain-window" className="fixed right-3 top-14 z-[80] w-[380px] max-w-[calc(100vw-24px)] max-h-[85vh] overflow-auto rounded-2xl bg-white border border-rose-200 shadow-2xl pointer-events-auto text-[13px] text-stone-800" onPointerDown={(e) => e.stopPropagation()}>
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl ${s.status === 'error' ? 'bg-rose-50' : s.status === 'ok' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        <b className="text-sm">{head}</b>
        {s.source === 'machine' && <span className="text-[10px] rounded-full bg-stone-900 text-white px-2 py-0.5" title="Máy kiểm chứng bằng tính toán, không phải AI đoán">máy kiểm chứng</span>}
        <button type="button" data-testid="explain-close" className="ml-auto text-stone-500 hover:text-stone-900 cursor-pointer" onClick={onClose} title="Đóng">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 overflow-x-auto" data-testid="explain-step-latex">
          <FormulaBlock latex={s.latex} />
        </div>
        {s.title && <div className="font-semibold text-rose-700">{s.title}</div>}
        {s.explain && (
          <section data-testid="explain-why">
            <div className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Vì sao sai</div>
            <div className="leading-relaxed"><MathText text={s.explain} /></div>
          </section>
        )}
        {s.fix && (
          <section data-testid="explain-fix">
            <div className="text-[11px] uppercase tracking-wide text-stone-500 mb-1">Cách khắc phục</div>
            <div className="leading-relaxed"><MathText text={s.fix} /></div>
          </section>
        )}
        {s.corrected && (
          <section data-testid="explain-corrected">
            <div className="text-[11px] uppercase tracking-wide text-emerald-700 mb-1">Viết lại cho đúng</div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 overflow-x-auto"><FormulaBlock latex={s.corrected} /></div>
          </section>
        )}
        <section className="border-t border-stone-200 pt-2.5">
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="explain-steps">
            {result.steps.map((x) => (
              <button key={x.index} type="button" onClick={() => onIndex(x.index)} title={x.title || `Bước ${x.index + 1}`} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] cursor-pointer ${x.index === index ? 'border-stone-800' : 'border-stone-200'}`}>
                <span className={`w-2 h-2 rounded-full ${DOT[x.status] ?? DOT.unchecked}`} />
                {x.index + 1}
              </button>
            ))}
            {bad.length > 1 && (
              <span className="ml-auto flex items-center gap-1">
                <button type="button" data-testid="explain-prev" onClick={() => go(-1)} className="p-1 rounded hover:bg-stone-100 cursor-pointer" title="Lỗi trước"><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" data-testid="explain-next" onClick={() => go(1)} className="p-1 rounded hover:bg-stone-100 cursor-pointer" title="Lỗi sau"><ChevronRight className="w-4 h-4" /></button>
              </span>
            )}
          </div>
          {result.summary && <p className="mt-2 text-stone-600 leading-relaxed" data-testid="explain-summary">{result.summary}</p>}
          {result.final_correct !== null && <p className={`mt-1 text-[12px] font-semibold ${result.final_correct ? 'text-emerald-700' : 'text-rose-700'}`}>{result.final_correct ? 'Đáp án cuối đúng' : 'Đáp án cuối chưa đúng'}</p>}
        </section>
      </div>
    </div>
  );
  return typeof document === 'undefined' ? card : createPortal(card, document.body);
};
