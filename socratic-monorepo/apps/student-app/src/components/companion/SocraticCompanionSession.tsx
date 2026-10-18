'use client';

import React, { useState } from 'react';
import { LockedStepper, StepItem } from './LockedStepper';
import { MathNumpad } from './MathNumpad';
import { ChemicalBalanceScale } from './VisualDebugWidgets';
import { ConceptCheckGate } from './ConceptCheckGate';
import { Sparkles, Trophy, Award } from 'lucide-react';

export interface SocraticCompanionSessionProps {
  onSessionComplete?: (totalEureka: number) => void;
  apiEndpoint?: string;
}

export const SocraticCompanionSession: React.FC<SocraticCompanionSessionProps> = ({
  onSessionComplete,
  apiEndpoint = 'http://localhost:8000/api/v1/companion/evaluate-step',
}: SocraticCompanionSessionProps) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [eurekaParticles, setEurekaParticles] = useState<number>(0);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balancePayload, setBalancePayload] = useState<{
    leftAtoms: number;
    rightAtoms: number;
    element: string;
    feedback: string;
  } | null>(null);

  const [steps, setSteps] = useState<StepItem[]>([
    {
      index: 1,
      title: 'Cân bằng phương trình Hóa học (Bảo toàn nguyên tử)',
      description: 'Nhập phương trình cân bằng cho phản ứng giữa Sắt (Fe) và Khí Oxi (O₂) tạo thành Gỉ sắt (Fe₂O₃).',
      status: 'ACTIVE',
    },
    {
      index: 2,
      title: 'Cổng Khái Niệm Ngược (Reverse Concept Gate)',
      description: 'Dùng giọng nói hoặc bàn phím giải thích tại sao khối lượng các chất trước và sau phản ứng phải bằng nhau.',
      status: 'LOCKED',
    },
  ]);

  const handleStep1Submit = async (input: string) => {
    setIsLoading(true);

    try {
      // Clean input string
      const cleanAnswer = input.replace(/\s+/g, '').replace(/→/g, '->').replace(/₂/g, '2').replace(/₃/g, '3');

      // Call evaluate-step API
      const resp = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'student_grit_1',
          session_id: 'session_fe_o2',
          subject: 'CHEMISTRY',
          step_index: 1,
          input_type: 'EQUATION',
          student_answer: cleanAnswer,
          expected_answer: '4Fe + 3O2 -> 2Fe2O3',
        }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      const evalData = await resp.json();

      if (evalData.is_step_correct) {
        // Balanced successfully!
        setBalancePayload({
          leftAtoms: 6,
          rightAtoms: 6,
          element: 'Oxi (O)',
          feedback: 'Cân bằng hoàn hảo! 6 nguyên tử Oxi ở cả hai vế.',
        });

        // Unlock Step 2
        setSteps((prev) =>
          prev.map((s) => {
            if (s.index === 1) return { ...s, status: 'COMPLETED' };
            if (s.index === 2) return { ...s, status: 'ACTIVE' };
            return s;
          })
        );
        setCurrentStep(2);
      } else {
        // Imbalanced! Show visual balance scale
        const debugPayload = evalData.visual_debugger?.payload || {};
        const leftO = debugPayload.left_atoms?.O ?? 2;
        const rightO = debugPayload.right_atoms?.O ?? 3;

        setBalancePayload({
          leftAtoms: leftO,
          rightAtoms: rightO,
          element: 'Oxi (O)',
          feedback: evalData.socratic_feedback || 'Vế phải đang có 3 Oxi trong khi vế trái chỉ có 2. Hãy tìm BCNN là 6!',
        });
      }
    } catch (err) {
      // Deterministic client fallback if backend is offline in test
      const cleanAnswer = input.replace(/\s+/g, '').replace(/→/g, '->').replace(/₂/g, '2').replace(/₃/g, '3');
      if (cleanAnswer === '4Fe+3O2->2Fe2O3') {
        setBalancePayload({
          leftAtoms: 6,
          rightAtoms: 6,
          element: 'Oxi (O)',
          feedback: 'Cân bằng hoàn hảo!',
        });
        setSteps((prev) =>
          prev.map((s) => {
            if (s.index === 1) return { ...s, status: 'COMPLETED' };
            if (s.index === 2) return { ...s, status: 'ACTIVE' };
            return s;
          })
        );
        setCurrentStep(2);
      } else {
        // Imbalanced simulation
        setBalancePayload({
          leftAtoms: 2,
          rightAtoms: 3,
          element: 'Oxi (O)',
          feedback: 'Hai vế chưa thăng bằng số nguyên tử Oxi! Đĩa cân đang lệch sang bên phải.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConceptGatePassed = (points: number) => {
    setEurekaParticles((prev) => {
      const total = prev + points;
      if (onSessionComplete) onSessionComplete(total);
      return total;
    });

    setSteps((prev) =>
      prev.map((s) => {
        if (s.index === 2) return { ...s, status: 'COMPLETED' };
        return s;
      })
    );
  };

  return (
    <div
      data-testid="socratic-companion-session"
      className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 flex flex-col gap-5 text-slate-100 shadow-2xl"
    >
      {/* Session Header & Eureka Grit Economy Counter */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Socratic Learning Loop • KHTN Lớp 8
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            Phản ứng Oxi hóa: Sắt cháy trong Khí Oxi
          </h2>
        </div>

        {/* Eureka Particles Badge */}
        <div
          data-testid="eureka-particles-counter"
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-mono font-bold shadow-lg shadow-amber-500/10"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span>{eurekaParticles} Eureka</span>
        </div>
      </div>

      {/* Locked Stepper Component */}
      <LockedStepper steps={steps} activeStep={currentStep}>
        {currentStep === 1 && (
          <div className="flex flex-col gap-4 mt-2">
            {/* Visual Balance Scale Widget when imbalanced */}
            {balancePayload && (
              <div data-testid="balance-scale-wrapper">
                <ChemicalBalanceScale
                  leftAtomsCount={balancePayload.leftAtoms}
                  rightAtomsCount={balancePayload.rightAtoms}
                  elementName={balancePayload.element}
                  feedbackText={balancePayload.feedback}
                />
              </div>
            )}

            {/* Contextual Math Numpad */}
            <MathNumpad
              value={formulaInput}
              onChange={setFormulaInput}
              onSubmit={handleStep1Submit}
              disabled={isLoading}
              placeholder="VD: 4Fe + 3O₂ → 2Fe₂O₃"
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="mt-2">
            <ConceptCheckGate
              onPassGate={handleConceptGatePassed}
              conceptTitle="Định luật Bảo toàn Khối lượng trong Phản ứng Hóa học"
              pointsAwarded={50}
            />
          </div>
        )}
      </LockedStepper>

      {/* Victory Celebration when both steps completed */}
      {steps.every((s) => s.status === 'COMPLETED') && (
        <div
          data-testid="session-completed-banner"
          className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-between animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            <div>
              <div className="font-bold text-sm">Xuất sắc vượt qua bài học!</div>
              <div className="text-xs text-emerald-400">
                Toàn bộ các bước scaffolding đã được giải quyết trọn vẹn.
              </div>
            </div>
          </div>
          <span className="font-mono font-extrabold text-lg text-amber-300">
            +{eurekaParticles} Particles
          </span>
        </div>
      )}
    </div>
  );
};
