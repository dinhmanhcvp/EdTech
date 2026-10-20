/**
 * Feature 6.2: Locked Stepper UI
 * Divides problem into 3-5 scaffolding steps. Future steps are strictly locked
 * behind frosted glass blur (Glassmorphism Blur) until prerequisite concepts are mastered.
 */
import React from 'react';

export interface StepItem {
  index: number;
  title: string;
  description: string;
  status: 'COMPLETED' | 'ACTIVE' | 'LOCKED';
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
}: LockedStepperProps) => {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((st: StepItem) => {
        const isCompleted = st.status === 'COMPLETED';
        const isActive = st.status === 'ACTIVE';
        const isLocked = st.status === 'LOCKED';

        return (
          <div
            key={st.index}
            className={`p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden ${
              isCompleted
                ? 'bg-[#F8F7F4] border-[#E6E4DD] text-stone-700'
                : isActive
                ? 'bg-white border-[#2563EB]/40 text-[#18181B] shadow-[0_2px_12px_-2px_rgba(37,99,235,0.08)] ring-1 ring-[#2563EB]/20'
                : 'bg-[#F4F3EE]/60 border-[#E5E3DC] text-stone-400'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between text-xs ${isLocked ? 'blur-[1px]' : ''}`}>
              <span className="font-medium flex items-center gap-2">
                {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                {isLocked && <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />}
                <span>Bước {st.index}: {st.title}</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                  : 'bg-stone-100 text-stone-500 border border-stone-200'
              }`}>
                {isCompleted ? 'Đã vượt qua' : isActive ? 'Đang thực hiện' : 'Đang khóa'}
              </span>
            </div>

            {/* Description & Body (blurred if locked) */}
            <p className={`text-xs text-stone-600 mt-1.5 leading-relaxed ${isLocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
              {st.description}
            </p>

            {isActive && children && <div className="mt-3">{children}</div>}

            {/* Frosted Glass Lock Overlay for CP4 */}
            {isLocked && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center p-2 rounded-xl border border-[#E5E3DC]/60 pointer-events-none">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 border border-[#DCD9D0] text-[11px] font-mono text-stone-600 shadow-xs">
                  <span className="font-mono text-[9px] text-stone-500 border border-stone-300 bg-stone-50 px-1 py-0.2 rounded">LOCKED</span>
                  <span>Bước {st.index} bị khóa — Cần giải quyết bước trước</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
