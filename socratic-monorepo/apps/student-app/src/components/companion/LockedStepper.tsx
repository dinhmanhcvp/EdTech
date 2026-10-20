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
            className={`p-3.5 rounded-md border transition-all duration-200 relative overflow-hidden ${
              isCompleted
                ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
                : isActive
                ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm'
                : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between text-xs ${isLocked ? 'blur-[1px]' : ''}`}>
              <span className="font-medium flex items-center gap-2">
                {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                {isLocked && <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />}
                <span>Bước {st.index}: {st.title}</span>
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
              }`}>
                {isCompleted ? 'Đã vượt qua' : isActive ? 'Đang thực hiện' : 'Đang khóa'}
              </span>
            </div>

            {/* Description & Body (blurred if locked) */}
            <p className={`text-xs text-zinc-400 mt-1.5 leading-relaxed ${isLocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
              {st.description}
            </p>

            {isActive && children && <div className="mt-3">{children}</div>}

            {/* Frosted Glass Lock Overlay for CP4 */}
            {isLocked && (
              <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[2px] flex items-center justify-center p-2 rounded-md border border-zinc-800/40 pointer-events-none">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 shadow-md">
                  <span className="font-mono text-[9px] text-zinc-500 border border-zinc-700 px-1 py-0.2 rounded">LOCKED</span>
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
