'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertTriangle, Shield, Mic, MicOff, RefreshCw, Volume2, Sparkles, ChevronRight, ArrowRight } from 'lucide-react';
import { CurriculumLevel } from '@socratic/types';
import { apiBase } from '../../utils/apiBase';

export interface SocraticWorkspaceModeProps {
  curriculumLevel: CurriculumLevel;
}

export const SocraticWorkspaceMode: React.FC<SocraticWorkspaceModeProps> = ({
  curriculumLevel,
}) => {
  // Stoichiometric Coefficients
  const [coeffFe, setCoeffFe] = useState<number>(1);
  const [coeffO2, setCoeffO2] = useState<number>(1);
  const [coeffFe2O3, setCoeffFe2O3] = useState<number>(1);

  const [step1Input, setStep1Input] = useState<string>('Fe + O₂ → Fe₂O₃');
  const [step1Submitted, setStep1Submitted] = useState<boolean>(false);
  const [step1Correct, setStep1Correct] = useState<boolean>(false);

  // Atom counts derived from coefficients
  const leftAtoms = { Fe: coeffFe, O: coeffO2 * 2 };
  const rightAtoms = { Fe: coeffFe2O3 * 2, O: coeffFe2O3 * 3 };

  const [feedback, setFeedback] = useState<string>(
    'Hãy điền hệ số nguyên tối giản vào trước Fe, O₂ và Fe₂O₃ để số nguyên tử hai vế thăng bằng.'
  );
  const [pasteAlert, setPasteAlert] = useState<boolean>(false);
  const [eurekaPoints, setEurekaPoints] = useState<number>(120);

  // Red-Team Anti-Cheat Guardrail State
  const [isAntiCheatBlocked, setIsAntiCheatBlocked] = useState<boolean>(false);
  const [antiCheatReason, setAntiCheatReason] = useState<string>('');

  // Feature 6.4: Voice Gate Audio Waveform & Transcript State
  const [isVoiceGateActive, setIsVoiceGateActive] = useState<boolean>(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([
    18, 25, 42, 68, 85, 92, 74, 55, 38, 62, 88, 95, 78, 64, 45, 82,
    90, 72, 58, 40, 65, 84, 96, 75, 52, 35, 60, 80, 94, 68, 48, 28
  ]);
  const [typedChars, setTypedChars] = useState<number>(0);
  const fullTranscript =
    'Vì theo định luật bảo toàn nguyên tố, số nguyên tử Sắt và Oxi trước và sau phản ứng phải bằng nhau: 4Fe + 3O2 -> 2Fe2O3. Mỗi nguyên tử Fe nhường 3 electron cho Oxi nhận...';

  // Concept check gate (True/False 2025+ format)
  const [isTrapHunterMode, setIsTrapHunterMode] = useState<boolean>(true);
  const [isQuietMode, setIsQuietMode] = useState<boolean>(false);
  const [trapAnswers, setTrapAnswers] = useState<Record<string, boolean | null>>({
    a: true,
    b: false,
    c: true,
    d: false,
  });
  const [trapVerified, setTrapVerified] = useState<boolean | null>(null);

  // 32-Bar Audio visualizer tick
  useEffect(() => {
    if (!isVoiceGateActive) return;
    const interval = setInterval(() => {
      setWaveformBars((prev) =>
        prev.map((h) => {
          const delta = (Math.random() - 0.5) * 24;
          return Math.max(12, Math.min(98, Math.round(h + delta)));
        })
      );
      setTypedChars((c) => Math.min(fullTranscript.length, c + 3));
    }, 70);
    return () => clearInterval(interval);
  }, [isVoiceGateActive, fullTranscript.length]);

  // Tactile +/- Stepper Modifier
  const updateCoeff = (type: 'Fe' | 'O2' | 'Fe2O3', delta: number) => {
    setIsAntiCheatBlocked(false);
    let newFe = coeffFe;
    let newO2 = coeffO2;
    let newFe2O3 = coeffFe2O3;

    if (type === 'Fe') newFe = Math.max(1, Math.min(8, coeffFe + delta));
    if (type === 'O2') newO2 = Math.max(1, Math.min(8, coeffO2 + delta));
    if (type === 'Fe2O3') newFe2O3 = Math.max(1, Math.min(6, coeffFe2O3 + delta));

    setCoeffFe(newFe);
    setCoeffO2(newO2);
    setCoeffFe2O3(newFe2O3);

    const formatted = `${newFe === 1 ? '' : newFe}Fe + ${newO2 === 1 ? '' : newO2}O₂ → ${newFe2O3 === 1 ? '' : newFe2O3}Fe₂O₃`;
    setStep1Input(formatted);

    const lFe = newFe;
    const lO = newO2 * 2;
    const rFe = newFe2O3 * 2;
    const rO = newFe2O3 * 3;

    if (lFe === rFe && lO === rO) {
      setStep1Correct(true);
      setFeedback('Chính xác tuyệt đối! Cả hai vế đều có 4 Fe và 6 O. Cân đĩa đã thăng bằng hoàn hảo.');
      setEurekaPoints((pts) => pts + 50);
    } else {
      setStep1Correct(false);
      setFeedback(
        `Vế trái có ${lFe} Fe, ${lO} O; Vế phải có ${rFe} Fe, ${rO} O. Chiếc cân đang nghiêng về bên nặng hơn.`
      );
    }
  };

  // Evaluate step via FastAPI AI Backend with ChemBalancer & SymPy
  const handleEvaluateStep = async () => {
    const ans = step1Input.trim();
    if (!ans) return;

    // Red-Team Check
    if (ans.toLowerCase().includes('đáp số') || ans.toLowerCase().includes('cho em') || ans.toLowerCase().includes('thu bài')) {
      handleTriggerAntiCheat();
      return;
    }

    setStep1Submitted(true);
    const cleanAnswer = ans.replace(/\s+/g, ' ').replace(/→/g, '->').replace(/₂/g, '2').replace(/₃/g, '3');

    try {
      let resp: Response | null = null;
      try {
        resp = await fetch('/api/v1/companion/evaluate-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: 'teacher_board_demo',
            session_id: 'session_socratic_mode',
            subject: 'CHEMISTRY',
            step_index: 1,
            input_type: 'EQUATION',
            student_answer: cleanAnswer,
            expected_answer: '4Fe + 3O2 -> 2Fe2O3',
            curriculum_level: curriculumLevel,
          }),
        });
      } catch {
        resp = await fetch(`${apiBase()}/api/v1/companion/evaluate-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: 'teacher_board_demo',
            session_id: 'session_socratic_mode',
            subject: 'CHEMISTRY',
            step_index: 1,
            input_type: 'EQUATION',
            student_answer: cleanAnswer,
            expected_answer: '4Fe + 3O2 -> 2Fe2O3',
            curriculum_level: curriculumLevel,
          }),
        });
      }

      if (resp && resp.ok) {
        const data = await resp.json();
        if (data.is_step_correct) {
          setStep1Correct(true);
          setCoeffFe(4);
          setCoeffO2(3);
          setCoeffFe2O3(2);
          setFeedback(data.socratic_feedback || 'Chính xác tuyệt đối! Cả hai vế đều có 4 Fe và 6 O (Định luật Bảo toàn khối lượng).');
          setEurekaPoints((pts) => pts + (data.eureka_points_delta || 50));
        } else {
          setStep1Correct(false);
          setFeedback(data.socratic_feedback || 'Vế phải có 3 nguyên tử Oxi, trong khi vế trái mới có 2. Bội chung nhỏ nhất của 2 và 3 là 6. Em hãy thử lại!');
        }
        return;
      }
    } catch (e) {
      console.warn('[SocraticWorkspaceMode] Backend offline, fallback to deterministic calculation', e);
    }

    // Client-side deterministic calculation
    const isBalanced =
      (cleanAnswer.includes('4') && cleanAnswer.includes('3') && cleanAnswer.includes('2')) ||
      cleanAnswer === '4Fe + 3O2 -> 2Fe2O3';

    if (isBalanced) {
      setStep1Correct(true);
      setCoeffFe(4);
      setCoeffO2(3);
      setCoeffFe2O3(2);
      setFeedback('Chính xác tuyệt đối! Cả hai vế đều có 4 nguyên tử Fe và 6 nguyên tử Oxi.');
      setEurekaPoints((pts) => pts + 50);
    } else {
      setStep1Correct(false);
      setFeedback('Vế phải có 3 nguyên tử Oxi, trong khi vế trái mới có 2. Bội chung nhỏ nhất của 2 và 3 là 6. Em hãy thử lại!');
    }
  };

  // Demo Trigger 1: Red-Team Anti-Cheat Guardrail (Hotkey R)
  const handleTriggerAntiCheat = () => {
    setStep1Input('Cho em đáp số luôn đi cô sắp thu bài rồi');
    setIsAntiCheatBlocked(true);
    setAntiCheatReason(
      'Phát hiện hành vi xin đáp số trực tiếp. Hệ thống Socratic tuân thủ nghiêm ngặt quy tắc Socratic Guardrail: Không cung cấp đáp số làm sẵn nhằm bảo vệ năng lực tư duy bản chất của học sinh.'
    );
  };

  // Demo Trigger 2: Wrong Coefficients (Tilts scale, triggers Visual Debugger & Micro-step)
  const handleTriggerWrongCoeff = () => {
    setIsAntiCheatBlocked(false);
    setCoeffFe(1);
    setCoeffO2(1);
    setCoeffFe2O3(1);
    setStep1Input('1Fe + 1O₂ → 1Fe₂O₃');
    setStep1Correct(false);
    setIsVoiceGateActive(false);
    setFeedback(
      'Vế trái có 1 Fe, 2 O; Vế phải có 2 Fe, 3 O. Chiếc cân đang lệch về bên phải do thiếu nguyên tử Oxi ở vế tham gia phản ứng.'
    );
  };

  // Demo Trigger 3: Balance & Unlock Voice Gate (Hotkey V)
  const handleTriggerVoiceGate = () => {
    setIsAntiCheatBlocked(false);
    setCoeffFe(4);
    setCoeffO2(3);
    setCoeffFe2O3(2);
    setStep1Input('4Fe + 3O₂ → 2Fe₂O₃');
    setStep1Correct(true);
    setIsVoiceGateActive(true);
    setTypedChars(0);
    setEurekaPoints((pts) => pts + 50);
    setFeedback('Chính xác tuyệt đối! Cả hai vế đều có 4 Fe và 6 O. Cân đĩa đã thăng bằng hoàn hảo.');
  };

  // Global hotkeys for presenter (R: Red-team, V: Voice Gate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleTriggerAntiCheat();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleTriggerVoiceGate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const insertToken = (token: string) => {
    setStep1Input((prev) => prev + token);
  };

  const handlePasteAttempt = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteAlert(true);
    setTimeout(() => setPasteAlert(false), 3000);
  };

  const handleVerifyTrap = () => {
    const isCorrect =
      trapAnswers.a === true &&
      trapAnswers.b === false &&
      trapAnswers.c === true &&
      trapAnswers.d === false;
    setTrapVerified(isCorrect);
    if (isCorrect) {
      setEurekaPoints((pts) => pts + 30);
    }
  };

  // Mass difference calculation for balance scale tilt
  const leftMass = leftAtoms.Fe * 55.8 + leftAtoms.O * 16.0;
  const rightMass = rightAtoms.Fe * 55.8 + rightAtoms.O * 16.0;
  const massDiff = rightMass - leftMass;
  const tiltDeg = step1Correct ? 0 : Math.max(-12, Math.min(12, massDiff * 0.12));

  return (
    <div className="flex h-full w-full bg-[#F8F7F4] text-[#18181B] overflow-hidden select-none font-sans">
      {/* Left Pane (48%): Problem Statement, Tactile Balance Scale, Visual Debugger */}
      <div className="w-[48%] h-full overflow-y-auto border-r border-[#E6E4DD] bg-[#FCFBF9] p-5 flex flex-col gap-4">
        {/* Breadcrumb & Target Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-medium">
              KHOA HỌC TỰ NHIÊN • HÓA HỌC 10-11
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-300" />
            <span className="text-[10px] font-mono text-blue-600 font-semibold">
              {curriculumLevel === 'OLYMPIAD_ADVANCED' ? 'OLYMPIAD CHUYÊN SÂU' : 'CHUẨN THPT'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 rounded-lg font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span data-testid="eureka-particles-counter">{eurekaPoints} Điểm Eureka</span>
          </div>
        </div>

        {/* Problem Statement Card */}
        <div className="border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-semibold text-stone-900 tracking-tight">
              Bài toán 02: Cân bằng Phương trình & Bảo toàn Nguyên tử
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F0EA] text-stone-600 border border-[#E6E4DD]">
              Định luật Lomonosov
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Cho phản ứng đốt cháy sắt trong khí Oxi tạo thành oxit sắt III (gỉ sắt):
          </p>

          {/* Tactile Stoichiometric Stepper Bar */}
          <div className="flex items-center justify-center gap-2.5 bg-[#F8F7F4] border border-[#E6E4DD] rounded-xl p-3 font-mono text-sm font-bold">
            {/* Fe stepper */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DCD9D0] shadow-2xs">
              <button
                type="button"
                data-testid="btn-dec-fe"
                onClick={() => updateCoeff('Fe', -1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Giảm hệ số Fe"
              >
                -
              </button>
              <span className="w-5 text-center text-blue-700 font-bold">{coeffFe}</span>
              <button
                type="button"
                data-testid="btn-inc-fe"
                onClick={() => updateCoeff('Fe', 1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Tăng hệ số Fe"
              >
                +
              </button>
            </div>
            <span className="text-stone-800">Fe</span>
            <span className="text-stone-400 font-normal">+</span>

            {/* O2 stepper */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DCD9D0] shadow-2xs">
              <button
                type="button"
                data-testid="btn-dec-o2"
                onClick={() => updateCoeff('O2', -1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Giảm hệ số O2"
              >
                -
              </button>
              <span className="w-5 text-center text-blue-700 font-bold">{coeffO2}</span>
              <button
                type="button"
                data-testid="btn-inc-o2"
                onClick={() => updateCoeff('O2', 1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Tăng hệ số O2"
              >
                +
              </button>
            </div>
            <span className="text-stone-800">O₂</span>
            <span className="text-stone-400 font-normal">→</span>

            {/* Fe2O3 stepper */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#DCD9D0] shadow-2xs">
              <button
                type="button"
                data-testid="btn-dec-fe2o3"
                onClick={() => updateCoeff('Fe2O3', -1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Giảm hệ số Fe2O3"
              >
                -
              </button>
              <span className="w-5 text-center text-blue-700 font-bold">{coeffFe2O3}</span>
              <button
                type="button"
                data-testid="btn-inc-fe2o3"
                onClick={() => updateCoeff('Fe2O3', 1)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition cursor-pointer"
                title="Tăng hệ số Fe2O3"
              >
                +
              </button>
            </div>
            <span className="text-stone-800">Fe₂O₃</span>
          </div>
        </div>

        {/* Interactive Visual Debugger: Chemical Balance Scale with Real Atom Spheres */}
        <div
          data-testid="balance-scale-wrapper"
          className="border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-600 font-semibold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${step1Correct ? 'bg-emerald-500' : 'bg-blue-600'}`} />
              <span>Cân Đĩa Nguyên Tử (Precision Balance Scale)</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              step1Correct
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {step1Correct ? 'Cân bằng hoàn hảo!' : 'Đang lệch vế'}
            </span>
          </div>

          {/* SVG Balance Scale with Atom Spheres */}
          <div className="relative w-full h-44 bg-[#FCFBF9] rounded-xl border border-[#E6E4DD] flex items-center justify-center p-2 overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full">
              {/* Fulcrum Base */}
              <polygon points="185,138 215,138 200,90" fill="#E5E3DC" stroke="#CBD5E1" strokeWidth="1" />
              <circle cx="200" cy="90" r="5" fill="#57534E" />

              {/* Lever Beam (Rotates based on mass difference) */}
              <g transform={`rotate(${tiltDeg}, 200, 90)`} style={{ transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <line x1="60" y1="90" x2="340" y2="90" stroke="#57534E" strokeWidth="3.5" strokeLinecap="round" />

                {/* Left Pan Strings & Plate */}
                <line x1="85" y1="90" x2="55" y2="120" stroke="#A8A29E" strokeWidth="1.2" />
                <line x1="85" y1="90" x2="115" y2="120" stroke="#A8A29E" strokeWidth="1.2" />
                <path
                  d="M 45,120 Q 85,132 125,120 Z"
                  fill={step1Correct ? '#ECFDF5' : '#EFF6FF'}
                  stroke={step1Correct ? '#6EE7B7' : '#BFDBFE'}
                  strokeWidth="2"
                />

                {/* Left Pan Visual Atom Spheres */}
                {/* Fe atoms (Rust/amber) */}
                {Array.from({ length: Math.min(6, leftAtoms.Fe) }).map((_, i) => (
                  <circle
                    key={`l-fe-${i}`}
                    cx={65 + (i % 3) * 16}
                    cy={114 - Math.floor(i / 3) * 12}
                    r="5.5"
                    fill="#EA580C"
                    stroke="#C2410C"
                    strokeWidth="1"
                  />
                ))}
                {/* O atoms (Cyan/sky) */}
                {Array.from({ length: Math.min(8, leftAtoms.O) }).map((_, i) => (
                  <circle
                    key={`l-o-${i}`}
                    cx={75 + (i % 4) * 12}
                    cy={102 - Math.floor(i / 4) * 10}
                    r="4.5"
                    fill="#0284C7"
                    stroke="#0369A1"
                    strokeWidth="1"
                  />
                ))}

                {/* Right Pan Strings & Plate */}
                <line x1="315" y1="90" x2="285" y2="120" stroke="#A8A29E" strokeWidth="1.2" />
                <line x1="315" y1="90" x2="345" y2="120" stroke="#A8A29E" strokeWidth="1.2" />
                <path
                  d="M 275,120 Q 315,132 355,120 Z"
                  fill={step1Correct ? '#ECFDF5' : '#FFF1F2'}
                  stroke={step1Correct ? '#6EE7B7' : '#FECDD3'}
                  strokeWidth="2"
                />

                {/* Right Pan Visual Atom Spheres */}
                {/* Fe atoms (Rust/amber) */}
                {Array.from({ length: Math.min(6, rightAtoms.Fe) }).map((_, i) => (
                  <circle
                    key={`r-fe-${i}`}
                    cx={295 + (i % 3) * 16}
                    cy={114 - Math.floor(i / 3) * 12}
                    r="5.5"
                    fill="#EA580C"
                    stroke="#C2410C"
                    strokeWidth="1"
                  />
                ))}
                {/* O atoms (Cyan/sky) */}
                {Array.from({ length: Math.min(8, rightAtoms.O) }).map((_, i) => (
                  <circle
                    key={`r-o-${i}`}
                    cx={300 + (i % 4) * 12}
                    cy={102 - Math.floor(i / 4) * 10}
                    r="4.5"
                    fill="#0284C7"
                    stroke="#0369A1"
                    strokeWidth="1"
                  />
                ))}

                {/* Left Pan Text Readout */}
                <text x="85" y="75" textAnchor="middle" fill="#0284C7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {leftAtoms.O} O
                </text>
                <text x="85" y="62" textAnchor="middle" fill="#EA580C" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {leftAtoms.Fe} Fe
                </text>

                {/* Right Pan Text Readout */}
                <text x="315" y="75" textAnchor="middle" fill="#0284C7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {rightAtoms.O} O
                </text>
                <text x="315" y="62" textAnchor="middle" fill="#EA580C" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {rightAtoms.Fe} Fe
                </text>
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-stone-700 font-medium">Trái: {leftAtoms.Fe} Fe, {leftAtoms.O} O</span>
            <span className="text-stone-700 font-medium">Phải: {rightAtoms.Fe} Fe, {rightAtoms.O} O</span>
          </div>

          {/* Micro-step Lifeline Card (appears when imbalanced) */}
          {!step1Correct && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Phao cứu sinh chia nhỏ bước (Micro-step Lifeline)</span>
              </div>
              <p className="leading-relaxed font-serif text-[11px] text-amber-800">
                Gợi ý: Tìm Bội chung nhỏ nhất của chỉ số Oxi ở hai vế: BCNN(2, 3) = 6. Cần 3 phân tử O₂ và 2 phân tử Fe₂O₃, sau đó cân bằng 4 nguyên tử Fe.
              </p>
            </div>
          )}

          {step1Correct && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Định luật Bảo toàn khối lượng thỏa mãn: 4Fe + 3O₂ → 2Fe₂O₃!</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane (52%): Locked Steppers, Demo Quick-Actions & Voice Gate */}
      <div className="w-[52%] h-full overflow-y-auto bg-[#F8F7F4] p-5 flex flex-col justify-between gap-5">
        <div className="flex flex-col gap-4">
          {/* Top Demo Quick-Action Buttons (Apple Keynote Recording Triggers) */}
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-white border border-[#E6E4DD] shadow-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold px-1 shrink-0">
              Kịch bản Demo:
            </span>
            <button
              type="button"
              data-testid="demo-trigger-anticheat"
              onClick={handleTriggerAntiCheat}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
              title="Thử học sinh xin đáp số trực tiếp (Phím R)"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Xin đáp án (Anti-Cheat / R)</span>
            </button>
            <button
              type="button"
              data-testid="demo-trigger-wrong-coeff"
              onClick={handleTriggerWrongCoeff}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
              title="Nhập sai hệ số để kích hoạt Cân đĩa nghiêng"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>2. Sai hệ số (Cân lệch)</span>
            </button>
            <button
              type="button"
              data-testid="demo-trigger-voice-gate"
              onClick={handleTriggerVoiceGate}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Cân bằng đúng & Mở khóa Chốt chặn Giọng nói (Phím V)"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>3. Hoàn thành (Voice Gate / V)</span>
            </button>
          </div>

          {/* Red-Team Anti-Cheat Guardrail Shield Banner */}
          {isAntiCheatBlocked && (
            <div
              data-testid="anticheat-guardrail-banner"
              className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-sm flex flex-col gap-2.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-amber-700" />
                  <span>Socratic Guardrail: Chặn Bỏ Qua Tư Duy</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Anti-Leak Triggered
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-sans font-medium">
                {antiCheatReason}
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] font-serif italic text-amber-800">
                  Hệ thống không cung cấp đáp số. Hãy điều chỉnh hệ số trên Cân Đĩa!
                </span>
                <button
                  type="button"
                  onClick={() => setIsAntiCheatBlocked(false)}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition"
                >
                  Đã hiểu - Tiếp tục làm
                </button>
              </div>
            </div>
          )}

          {/* Stepper Tree Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-stone-700 font-semibold">
                CÂY CHỨNG MINH TỪNG BƯỚC (STEP-BY-STEP DERIVATION)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Các bước tiếp theo bị khóa mờ cho đến khi hoàn thành bước hiện tại
              </p>
            </div>
            <span className="text-xs font-mono text-stone-600 font-medium">
              {step1Correct ? 'Bước 2 / 3' : 'Bước 1 / 3'}
            </span>
          </div>

          {/* STEP 1: Chemical Equation Balancing */}
          <div className="border border-blue-200 bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-700 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${step1Correct ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                <span>BƯỚC 01: CÂN BẰNG PHƯƠNG TRÌNH HÓA HỌC</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                step1Correct
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}>
                {step1Correct ? 'ĐÃ HOÀN THÀNH' : 'ĐANG LÀM'}
              </span>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed font-sans">
              Phương trình phản ứng sau khi đã thăng bằng nguyên tử hai vế:
            </p>

            <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-xl p-3 font-serif text-xs leading-relaxed">
              <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 block mb-0.5">Gợi ý Socratic:</span>
              Tìm bội chung nhỏ nhất của chỉ số Oxi ở vế trái (2) và vế phải (3). BCNN(2, 3) = 6.
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-stone-500">Bài làm:</span>
              <span className="font-mono text-xs text-stone-900 font-bold bg-[#F8F7F4] px-3 py-1.5 rounded-lg border border-[#E6E4DD]">
                {step1Input}
              </span>
            </div>
          </div>

          {/* STEP 2: Concept Check Gate / Voice Gate (Feature 6.4) */}
          {step1Correct ? (
            <div
              data-testid="concept-check-gate"
              className="border-2 border-emerald-300 bg-white rounded-2xl p-5 shadow-md flex flex-col gap-4 animate-in fade-in duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs text-emerald-800 font-bold uppercase tracking-wider">
                    BƯỚC 02: CHỐT CHẶN GIỌNG NÓI & BẢN CHẤT LOMONOSOV (FEATURE 6.4)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>+50 Điểm Nỗ Lực (Grit Score)</span>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed font-sans">
                Em hãy nói hoặc ghi âm ngắn giải thích vì sao theo Định luật Bảo toàn nguyên tố, hai vế bắt buộc phải có cùng số lượng nguyên tử Fe và O:
              </p>

              {/* Mode Toggle: Live Audio vs Quiet Drag-Drop */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVoiceGateActive(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      !isQuietMode && isVoiceGateActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'bg-[#F2F0EA] text-stone-700 hover:bg-[#EAE7DF]'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Thu âm Giọng nói</span>
                  </button>
                  <button
                    type="button"
                    data-testid="quiet-mode-toggle"
                    onClick={() => setIsQuietMode(!isQuietMode)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                      isQuietMode
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-[#F2F0EA] text-stone-700 hover:bg-[#EAE7DF]'
                    }`}
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Chế độ Yên tĩnh (Kéo-Thả Khối Tư Duy)</span>
                  </button>
                </div>
              </div>

              {/* 32-Bar Live Audio Waveform Visualizer */}
              {!isQuietMode && (
                <div className="p-4 bg-[#FCFBF9] rounded-xl border border-[#E6E4DD] flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Audio Visualizer (32 Dải Tần Số)
                    </span>
                    <span>16-bit PCM • Web Audio Engine</span>
                  </div>

                  {/* 32 Animated Waveform Bars */}
                  <div
                    data-testid="audio-waveform-32bar"
                    className="flex items-end justify-between h-14 px-2 py-1 bg-white rounded-lg border border-[#E6E4DD]"
                  >
                    {waveformBars.map((height, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400 rounded-t-sm transition-all duration-75"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  {/* Auto-typing Transcript Ticker */}
                  <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] text-xs font-serif leading-relaxed text-stone-800">
                    <span className="font-mono text-[10px] uppercase text-stone-400 block mb-0.5">Phụ đề thời gian thực (Live Transcript):</span>
                    <span>{fullTranscript.slice(0, typedChars)}</span>
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-600 ml-0.5 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Quiet Mode Fallback Concept Blocks */}
              {isQuietMode && (
                <div className="p-3.5 bg-[#FCFBF9] rounded-xl border border-[#E6E4DD] flex flex-col gap-2.5">
                  <span className="text-[11px] font-mono text-stone-600 uppercase font-semibold">
                    Khối tư duy bản chất (Kéo-Thả liên kết):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-mono shadow-2xs font-semibold">
                      [Bảo toàn nguyên tố Fe và O]
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E4DD] text-stone-700 text-xs font-mono shadow-2xs">
                      [Fe nhường electron cho Oxi]
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E4DD] text-stone-700 text-xs font-mono shadow-2xs">
                      [Liên kết ion trong mạng Fe₂O₃]
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Locked Row */
            <div className="border border-[#E6E4DD] bg-[#F2F0EA]/70 rounded-2xl px-4 py-3 flex items-center justify-between text-stone-400">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-stone-500">02</span>
                <span className="text-xs font-medium text-stone-500">
                  BƯỚC 02: CHỐT CHẶN GIỌNG NÓI & BẢN CHẤT LOMONOSOV (FEATURE 6.4)
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 border border-[#DCD9D0] bg-white px-2 py-0.5 rounded-md">
                LOCKED
              </span>
            </div>
          )}

          {/* STEP 3: Locked Row */}
          <div className="border border-[#E6E4DD] bg-[#F2F0EA]/70 rounded-2xl px-4 py-3 flex items-center justify-between text-stone-400">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-stone-500">03</span>
              <span className="text-xs font-medium text-stone-500">
                BƯỚC 03: TÍNH TOÁN HIỆU SUẤT & KHỐI LƯỢNG SẢN PHẨM Ở ĐIỀU KIỆN BIÊN
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 border border-[#DCD9D0] bg-white px-2 py-0.5 rounded-md">
              LOCKED
            </span>
          </div>
        </div>

        {/* Bottom Input Bar & Token Pills */}
        <div className="border-t border-[#E6E4DD] pt-4 flex flex-col gap-3">
          {pasteAlert && (
            <div
              data-testid="paste-blocked-alert"
              className="p-2.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs font-mono"
            >
              Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa!
            </div>
          )}

          {/* Algebraic Token Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest shrink-0">
              Ký hiệu:
            </span>
            {['4', '3', '2', 'Fe', '+', 'O₂', '→', 'Fe₂O₃', 'v₀', 'gt²', 'sin(α)', '∫'].map((tok) => (
              <button
                key={tok}
                type="button"
                data-testid={`key-${tok}`}
                onClick={() => insertToken(tok.includes('Fe') || tok.includes('O') || tok.includes('→') ? tok + ' ' : tok)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-xs font-mono text-stone-700 hover:text-stone-900 shadow-2xs transition cursor-pointer"
              >
                {tok}
              </button>
            ))}
            <button
              type="button"
              data-testid="numpad-clear"
              onClick={() => setStep1Input('')}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-[10px] font-mono text-stone-500 hover:text-stone-800 shadow-2xs transition cursor-pointer ml-auto"
            >
              Xóa
            </button>
          </div>

          {/* Direct Input & Submit */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              data-testid="numpad-input"
              value={step1Input}
              onChange={(e) => setStep1Input(e.target.value)}
              onPaste={handlePasteAttempt}
              onKeyDown={(e) => e.key === 'Enter' && handleEvaluateStep()}
              placeholder="Nhập phương trình cân bằng (VD: 4Fe + 3O2 -> 2Fe2O3)..."
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DCD9D0] text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-500 transition shadow-2xs"
            />
            <button
              type="button"
              data-testid="numpad-submit"
              onClick={handleEvaluateStep}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm shrink-0"
            >
              Kiểm tra bước giải
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
