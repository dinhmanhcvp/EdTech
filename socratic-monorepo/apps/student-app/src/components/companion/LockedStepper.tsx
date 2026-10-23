'use client';

import React from 'react';
import { MathView } from '../common/MathView';
import { MathText, FormulaBlock } from '../ui/MathText';
import { CheckCircle2, Lock, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';

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

export const LockedStepper: React.FC<LockedStepperProps> = ({
  steps,
  activeStep,
  children,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full font-sans">
      {steps.map((st: StepItem) => {
        const isCompleted = st.status === 'COMPLETED';
        const isActive = st.status === 'ACTIVE';
        const isLocked = st.status === 'LOCKED';
        const strikes = st.strikeCount || 0;

        return (
          <div
            key={st.index}
            className={`rounded-xl border transition-all duration-200 relative overflow-hidden ${
              isCompleted
                ? 'bg-white border-[#E6E4DD] text-stone-700 shadow-2xs p-3.5'
                : isActive
                ? 'bg-white border-stone-300 text-stone-900 shadow-md ring-1 ring-stone-900/5 p-4'
                : 'bg-[#F2F0EA]/70 border-[#E6E4DD] text-stone-400 p-3'
            }`}
          >
            {/* Header Row */}
            <div className={`flex items-center justify-between text-xs ${isLocked ? 'blur-[0.5px]' : ''}`}>
              <div className="flex items-center gap-2 font-medium">
                {isCompleted && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                )}
                {isLocked && (
                  <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
                )}
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                  {st.phaseLabel || `BƯỚC 0${st.index}`}
                </span>
                <span className="font-semibold text-stone-900">{st.title}</span>
              </div>

              {/* Status Badge */}
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                  <span>SYMPY VERIFIED</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </span>
              ) : isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  <span>Đang thực hiện</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200 font-mono text-[9px] uppercase font-bold">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LOCKED</span>
                </span>
              )}
            </div>

            {/* Completed Derivation Summary */}
            {isCompleted && st.expectedLatex && (
              <div className="mt-2 p-2 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] text-xs font-mono flex items-center justify-between">
                <div className="text-stone-800 font-medium">
                  <FormulaBlock latex={st.expectedLatex} />
                </div>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Chuẩn xác 100% ✓
                </span>
              </div>
            )}

            {/* Active Socratic Prompt */}
            {isActive && (
              <div className="mt-2.5">
                <p className="text-sm font-serif italic text-stone-800 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#EBE8DF]">
                  &ldquo;<MathText text={st.description} />&rdquo;
                </p>

                {/* 3-Strike Escalation Hints */}
                {strikes >= 1 && st.hintStrike1 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-sans flex items-start gap-2 animate-in fade-in">
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-900">Gợi ý Socratic (Lần 1):</span>{' '}
                      <MathText text={st.hintStrike1} />
                    </div>
                  </div>
                )}

                {strikes >= 2 && st.hintStrike2 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-900 font-sans flex items-start gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-blue-900">Đồng bộ Thị giác (Lần 2):</span>{' '}
                      <MathText text={st.hintStrike2} />
                    </div>
                  </div>
                )}

                {strikes >= 3 && st.onOpenLifeline && (
                  <div
                    data-testid="lifeline-container"
                    className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-2 animate-in fade-in"
                  >
                    <div>
                      <span className="font-bold text-rose-800">Thử thách {strikes} lần:</span> Em có muốn mở Phao cứu sinh để chia nhỏ bước này thành 2 câu hỏi định hướng?
                    </div>
                    <button
                      type="button"
                      data-testid="lifeline-btn"
                      onClick={st.onOpenLifeline}
                      className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 active:translate-y-px text-white font-medium text-xs shrink-0 cursor-pointer shadow-xs transition"
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
              <div className="mt-1 flex items-center justify-between text-xs text-stone-400">
                <span className="font-serif italic text-[11px] truncate"><MathText text={st.description} /></span>
                <span className="text-[10px] font-mono text-stone-400 shrink-0 ml-2">Cần mở khóa bước trước</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
