'use client';

import React, { useEffect, useRef } from 'react';
import { MathText, FormulaBlock } from '../ui/MathText';
import { Lock, Unlock, Sparkles, HelpCircle } from 'lucide-react';

export interface StepItem {
  index: number;
  title: string;
  description: string;
  status: 'COMPLETED' | 'ACTIVE' | 'LOCKED';
  phaseLabel?: string;
  expectedLatex?: string;
  strikeCount?: number;
  hintStrike1?: string;
  hintStrike2?: string;
  onOpenLifeline?: () => void;
}

export interface LockedStepperProps {
  steps: StepItem[];
  activeStep: number;
  children?: React.ReactNode;
}

/** Dấu tích vẽ nét mượt khi máy chấm xác nhận bước đúng. */
export const Tick: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`draw-check ${className}`} aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/**
 * Bậc thang tư duy khóa mở tuần tự (dòng thời gian dọc): bước đang làm nổi trên thẻ trắng, các bước sau mờ + nhòe nhẹ + ổ khóa,
 * giải đúng bước này thì ổ khóa bước kế xoay mở. Sai thì KHÔNG báo đỏ: gợi ý hổ phách ngay dưới dòng đang viết.
 */
export const LockedStepper: React.FC<LockedStepperProps> = ({ steps, children }) => {
  // bước vừa chuyển từ khóa sang mở (so với lần vẽ trước) được chạy hiệu ứng xoay ổ khóa
  const prev = useRef<Record<number, StepItem['status']>>({});
  const justUnlocked = new Set(steps.filter((s) => s.status === 'ACTIVE' && prev.current[s.index] === 'LOCKED').map((s) => s.index));
  useEffect(() => {
    prev.current = Object.fromEntries(steps.map((s) => [s.index, s.status]));
  });

  return (
    <ol data-testid="locked-stepper" className="flex flex-col w-full font-sans">
      {steps.map((st: StepItem, i) => {
        const isCompleted = st.status === 'COMPLETED';
        const isActive = st.status === 'ACTIVE';
        const isLocked = st.status === 'LOCKED';
        const strikes = st.strikeCount || 0;
        const last = i === steps.length - 1;

        return (
          <li key={st.index} data-step-status={st.status} className="relative flex gap-3 pb-3">
            {/* đường nối và dấu mốc */}
            {!last && <span aria-hidden className={`absolute left-[13px] top-7 bottom-0 w-px ${isCompleted ? 'bg-mastery-bd' : 'bg-rule'}`} />}
            <span
              aria-hidden
              className={`relative z-10 mt-1 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border text-[11px] font-mono font-semibold ${
                isCompleted ? 'border-mastery bg-mastery-bg text-mastery' : isActive ? 'border-ink bg-ink text-white shadow-card' : 'border-rule bg-sunk text-mute'
              }`}
            >
              {isCompleted ? <Tick /> : isLocked ? <Lock className="h-3 w-3" /> : st.index}
            </span>

            <div
              className={`min-w-0 flex-1 rounded-xl border transition-all duration-300 ${justUnlocked.has(st.index) ? 'animate-rise-in' : ''} ${
                isCompleted
                  ? 'bg-white border-mastery-bd p-3.5'
                  : isActive
                  ? 'bg-white border-ink/25 shadow-card ring-1 ring-ink/5 p-4'
                  : 'bg-white/60 border-rule p-3 opacity-[.45] [filter:blur(1px)]'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="font-mono text-[10px] text-mute uppercase tracking-wider shrink-0">{st.phaseLabel || `BƯỚC 0${st.index}`}</span>
                  <span className="truncate font-semibold text-ink">{st.title}</span>
                </div>

                {isCompleted ? (
                  <span className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full bg-mastery-bg text-mastery border border-mastery-bd font-mono text-[10px] font-bold">
                    <Tick className="w-3 h-3" />
                    <span>SYMPY VERIFIED</span>
                  </span>
                ) : isActive ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full bg-sunk text-ink border border-rule font-mono text-[10px] font-semibold">
                    {justUnlocked.has(st.index) ? <Unlock className="w-3 h-3 animate-unlock-turn" /> : <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />}
                    <span>Đang thực hiện</span>
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-full bg-sunk text-mute border border-rule font-mono text-[9px] uppercase font-bold">
                    <Lock className="w-2.5 h-2.5" />
                    <span>LOCKED</span>
                  </span>
                )}
              </div>

              {/* Completed Derivation Summary */}
              {isCompleted && st.expectedLatex && (
                <div className="mt-2 p-2 bg-paper rounded-lg border border-hair text-xs font-mono flex items-center justify-between gap-2">
                  <div className="text-ink font-medium min-w-0 overflow-x-auto">
                    <FormulaBlock latex={st.expectedLatex} />
                  </div>
                  <span className="shrink-0 text-[10px] text-mastery font-bold">Chuẩn xác ✓</span>
                </div>
              )}

              {/* Active Socratic Prompt */}
              {isActive && (
                <div className="mt-2.5">
                  <p className="text-sm font-serif italic text-ink leading-relaxed bg-paper p-3 rounded-lg border border-hair">
                    &ldquo;<MathText text={st.description} />&rdquo;
                  </p>

                  {/* Gợi ý theo nấc: luôn ấm áp, hổ phách; không có nấc nào báo lỗi đỏ */}
                  {strikes >= 1 && st.hintStrike1 && (
                    <div data-testid="hint-strike-1" className="mt-2 p-2.5 rounded-lg bg-hint-bg border border-hint-bd text-xs text-hint-fg flex items-start gap-2 animate-nudge-in">
                      <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Gợi ý Socratic (Lần 1):</span> <MathText text={st.hintStrike1} />
                      </div>
                    </div>
                  )}

                  {strikes >= 2 && st.hintStrike2 && (
                    <div data-testid="hint-strike-2" className="mt-2 p-2.5 rounded-lg bg-hint-bg border border-hint-bd text-xs text-hint-fg flex items-start gap-2 animate-nudge-in">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Đồng bộ Thị giác (Lần 2):</span> <MathText text={st.hintStrike2} />
                      </div>
                    </div>
                  )}

                  {strikes >= 3 && st.onOpenLifeline && (
                    <div data-testid="lifeline-container" className="mt-2 p-3 rounded-lg bg-hint-bg border border-hint-bd text-xs text-hint-fg flex items-center justify-between gap-2 animate-nudge-in">
                      <div>
                        <span className="font-bold">Em đã thử {strikes} lần rồi, kiên trì lắm!</span> Muốn mở Phao cứu sinh để chia nhỏ bước này thành 2 câu hỏi định hướng không?
                      </div>
                      <button
                        type="button"
                        data-testid="lifeline-btn"
                        onClick={st.onOpenLifeline}
                        className="px-2.5 py-1 rounded-md bg-hint hover:bg-hint-fg active:translate-y-px text-white font-medium text-xs shrink-0 cursor-pointer shadow-card transition"
                      >
                        Phao cứu sinh
                      </button>
                    </div>
                  )}

                  {children && <div className="mt-3">{children}</div>}
                </div>
              )}

              {/* Future Locked Step Card */}
              {isLocked && (
                <div className="mt-1 flex items-center justify-between text-xs text-mute">
                  <span className="font-serif italic text-[11px] truncate">
                    <MathText text={st.description} />
                  </span>
                  <span className="text-[10px] font-mono shrink-0 ml-2">Giải đúng bước trước để mở</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
