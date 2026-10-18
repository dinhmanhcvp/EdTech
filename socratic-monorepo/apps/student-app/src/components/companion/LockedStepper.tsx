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
                : 'bg-white/5 border-white/5 text-slate-500 backdrop-blur-md opacity-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
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
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{st.description}</p>
            {isActive && children && <div className="mt-3">{children}</div>}
          </div>
        );
      })}
    </div>
  );
};
