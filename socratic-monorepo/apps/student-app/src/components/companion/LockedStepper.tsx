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
    <div className="flex flex-col gap-3">
      {steps.map((st: StepItem) => {
        const isCompleted = st.status === 'COMPLETED';
        const isActive = st.status === 'ACTIVE';
        const isLocked = st.status === 'LOCKED';

        return (
          <div
            key={st.index}
            className={`p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
              isCompleted
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : isActive
                ? 'bg-indigo-950/20 border-indigo-500/40 text-slate-100 shadow-lg'
                : 'bg-white/5 border-white/10 text-slate-400 backdrop-blur-md'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between text-xs ${isLocked ? 'blur-[1.5px]' : ''}`}>
              <span className="font-bold flex items-center gap-1.5">
                {isCompleted && <span>✅</span>}
                {isActive && <span>💡</span>}
                {isLocked && <span>🔒</span>}
                <span>Bước {st.index}: {st.title}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10">
                {isCompleted ? 'Đã vượt qua' : isActive ? 'Đang thực hiện' : 'Đang khóa'}
              </span>
            </div>

            {/* Description & Body (blurred if locked) */}
            <p className={`text-xs text-slate-300 mt-1.5 leading-relaxed ${isLocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
              {st.description}
            </p>

            {isActive && children && <div className="mt-3">{children}</div>}

            {/* Frosted Glass Lock Overlay for CP4 */}
            {isLocked && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-2 rounded-2xl border border-white/5 pointer-events-none">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-white/15 text-[11px] font-mono text-slate-300 shadow-xl">
                  <span>🔒</span>
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
