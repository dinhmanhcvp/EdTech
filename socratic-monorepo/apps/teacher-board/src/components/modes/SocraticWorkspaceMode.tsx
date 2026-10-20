'use client';

import React, { useState } from 'react';
import { Check, AlertTriangle, Shield, Mic, MicOff, RefreshCw } from 'lucide-react';
import { CurriculumLevel } from '@socratic/types';

export interface SocraticWorkspaceModeProps {
  curriculumLevel: CurriculumLevel;
}

export const SocraticWorkspaceMode: React.FC<SocraticWorkspaceModeProps> = ({
  curriculumLevel,
}) => {
  const [step1Input, setStep1Input] = useState<string>('');
  const [step1Submitted, setStep1Submitted] = useState<boolean>(false);
  const [step1Correct, setStep1Correct] = useState<boolean>(false);
  const [leftAtoms, setLeftAtoms] = useState<{ Fe: number; O: number }>({ Fe: 1, O: 2 });
  const [rightAtoms, setRightAtoms] = useState<{ Fe: number; O: number }>({ Fe: 2, O: 3 });
  const [feedback, setFeedback] = useState<string>(
    'Hãy điền hệ số nguyên tối giản vào trước Fe, O₂ và Fe₂O₃ để số nguyên tử hai vế thăng bằng.'
  );
  const [pasteAlert, setPasteAlert] = useState<boolean>(false);
  const [eurekaPoints, setEurekaPoints] = useState<number>(120);

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

  // Parse coefficients from student answer
  const handleEvaluateStep = async () => {
    const ans = step1Input.trim();
    if (!ans) return;

    // Check if balanced: 4Fe + 3O2 -> 2Fe2O3
    const isBalanced =
      (ans.includes('4') && ans.includes('3') && ans.includes('2')) ||
      ans === '4Fe + 3O2 -> 2Fe2O3' ||
      ans === '4Fe + 3O₂ → 2Fe₂O₃';

    setStep1Submitted(true);
    if (isBalanced) {
      setStep1Correct(true);
      setLeftAtoms({ Fe: 4, O: 6 });
      setRightAtoms({ Fe: 4, O: 6 });
      setFeedback('Chính xác tuyệt đối! Cả hai vế đều có 4 nguyên tử Fe và 6 nguyên tử Oxi (Định luật Bảo toàn khối lượng).');
      setEurekaPoints((pts) => pts + 50);
    } else {
      setStep1Correct(false);
      setLeftAtoms({ Fe: 1, O: 2 });
      setRightAtoms({ Fe: 2, O: 3 });
      setFeedback('Vế phải có 3 nguyên tử Oxi, trong khi vế trái mới có 2. Bội chung nhỏ nhất của 2 và 3 là 6. Em hãy thử lại!');
    }
  };

  const insertToken = (token: string) => {
    setStep1Input((prev) => prev + token);
  };

  const handlePasteAttempt = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteAlert(true);
    setTimeout(() => setPasteAlert(false), 3000);
  };

  const handleVerifyTrap = () => {
    // Correct answers: a=True, b=False, c=True, d=False
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

  // Balance scale tilt angle: diff in Oxygen atoms
  const diffO = rightAtoms.O - leftAtoms.O;
  const tiltDeg = step1Correct ? 0 : Math.max(-12, Math.min(12, diffO * 4));

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Left Pane (45%): Problem Statement, Visual Debugger, Concept Gate */}
      <div className="w-[45%] h-full overflow-y-auto border-r border-zinc-800/80 bg-zinc-950/70 p-5 flex flex-col gap-4">
        {/* Breadcrumb & Target Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              KHOA HỌC TỰ NHIÊN • HÓA HỌC 10-11
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] font-mono text-sky-400 font-medium">
              {curriculumLevel === 'OLYMPIAD_ADVANCED' ? 'OLYMPIAD CHUYÊN SÂU' : 'CHUẨN THPT'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span data-testid="eureka-particles-counter">{eurekaPoints} Eureka</span>
          </div>
        </div>

        {/* Problem Statement Card */}
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Bài toán 02: Cân bằng Phương trình & Bảo toàn Nguyên tử
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              Định luật Lomonosov
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Cho phản ứng nhiệt nhôm hoặc đốt cháy sắt trong khí Oxi tạo thành gỉ sắt (Oxit sắt từ / Oxit sắt III):
          </p>
          <div className="bg-zinc-950 border border-zinc-800/80 rounded px-3 py-2 text-center font-mono text-sm text-zinc-100 tracking-wider">
            Fe + O₂ → Fe₂O₃
          </div>
          <p className="text-[11px] text-zinc-400 leading-normal">
            Em hãy xác định bộ ba hệ số nguyên tối giản (a, b, c) để số nguyên tử của từng nguyên tố ở hai vế hoàn toàn bằng nhau.
          </p>
        </div>

        {/* Interactive Visual Debugger: Chemical Balance Scale */}
        <div
          data-testid="balance-scale-wrapper"
          className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Cân Đĩa Nguyên Tử (Visual Debugger)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {step1Correct ? 'Cân bằng hoàn hảo!' : 'Đang lệch vế'}
            </span>
          </div>

          {/* SVG Balance Scale */}
          <div className="relative w-full h-36 bg-zinc-950 rounded border border-zinc-850 flex items-center justify-center p-2">
            <svg viewBox="0 0 400 140" className="w-full h-full">
              {/* Fulcrum Base */}
              <polygon points="185,125 215,125 200,85" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
              <circle cx="200" cy="85" r="4" fill="#71717a" />

              {/* Lever Beam (Rotates based on difference) */}
              <g transform={`rotate(${tiltDeg}, 200, 85)`} style={{ transition: 'transform 0.4s ease' }}>
                <line x1="70" y1="85" x2="330" y2="85" stroke="#71717a" strokeWidth="3" />
                {/* Left Pan Strings & Plate */}
                <line x1="90" y1="85" x2="65" y2="115" stroke="#52525b" strokeWidth="1" />
                <line x1="90" y1="85" x2="115" y2="115" stroke="#52525b" strokeWidth="1" />
                <path d="M 55,115 Q 90,125 125,115 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />

                {/* Right Pan Strings & Plate */}
                <line x1="310" y1="85" x2="285" y2="115" stroke="#52525b" strokeWidth="1" />
                <line x1="310" y1="85" x2="335" y2="115" stroke="#52525b" strokeWidth="1" />
                <path d="M 275,115 Q 310,125 345,115 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />

                {/* Left Pan Atom Readout */}
                <text x="90" y="75" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                  {leftAtoms.O} Oxi (O)
                </text>
                <text x="90" y="62" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                  {leftAtoms.Fe} Fe
                </text>

                {/* Right Pan Atom Readout */}
                <text x="310" y="75" textAnchor="middle" fill="#f43f5e" fontSize="10" fontFamily="monospace">
                  {rightAtoms.O} Oxi (O)
                </text>
                <text x="310" y="62" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                  {rightAtoms.Fe} Fe
                </text>
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Vế trái: {leftAtoms.Fe} Fe, {leftAtoms.O} O</span>
            <span className="text-zinc-400">Vế phải: {rightAtoms.Fe} Fe, {rightAtoms.O} O</span>
          </div>

          <div className={`p-2 rounded text-xs leading-relaxed border ${
            step1Correct
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
          }`}>
            {feedback}
          </div>
        </div>

        {/* Concept Check Gate: True/False 4-Statement (Format THPT 2025+) */}
        <div
          data-testid="concept-check-gate"
          className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-medium">
                Săn Bẫy Đề Thi (Format THPT 2025-2026)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                +30 Eureka
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="trap-hunter-toggle"
                onClick={() => setIsTrapHunterMode(!isTrapHunterMode)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              >
                Săn Bẫy (2025+)
              </button>
              <button
                type="button"
                data-testid="quiet-mode-toggle"
                onClick={() => setIsQuietMode(!isQuietMode)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
              >
                {isQuietMode ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                <span>{isQuietMode ? 'Chế độ Yên tĩnh' : 'Giọng nói'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            Hãy xét tính Đúng / Sai của 4 mệnh đề sau trước khi mở khóa bước giải tiếp theo:
          </p>

          <div className="flex flex-col gap-2">
            {[
              { id: 'a', stmt: 'a) Tổng hệ số nguyên tối giản của các chất tham gia phản ứng là 7.' },
              { id: 'b', stmt: 'b) Nếu tăng gấp đôi lượng Oxi thì số mol Fe₂O₃ tạo thành luôn tăng gấp đôi.' },
              { id: 'c', stmt: 'c) Số electron mà Fe nhường trong phản ứng bằng số electron Oxi nhận.' },
              { id: 'd', stmt: 'd) Ở điều kiện tiêu chuẩn, 1 mol Fe phản ứng cần đúng 44.8 lít khí O₂.' },
            ].map(({ id, stmt }) => (
              <div
                key={id}
                data-testid={`trap-stmt-${id}`}
                className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-zinc-300 font-sans leading-tight flex-1">{stmt}</span>
                <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setTrapAnswers((prev) => ({ ...prev, [id]: true }))}
                    className={`px-2 py-0.5 rounded transition ${
                      trapAnswers[id] === true
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrapAnswers((prev) => ({ ...prev, [id]: false }))}
                    className={`px-2 py-0.5 rounded transition ${
                      trapAnswers[id] === false
                        ? 'bg-rose-500 text-zinc-950 font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Sai
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-zinc-500">
              {trapVerified === true && <span className="text-emerald-400">Chính xác cả 4 mệnh đề (+30 Eureka)!</span>}
              {trapVerified === false && <span className="text-rose-400">Còn mệnh đề chưa đúng. Hãy kiểm tra lại!</span>}
            </span>
            <button
              type="button"
              data-testid="btn-verify-trap-statements"
              onClick={handleVerifyTrap}
              className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition cursor-pointer"
            >
              Kiểm tra 4 mệnh đề
            </button>
          </div>
        </div>
      </div>

      {/* Right Pane (55%): Vertical Step-by-Step Derivation Tree */}
      <div className="w-[55%] h-full overflow-y-auto bg-zinc-950 p-6 flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-medium">
                CÂY CHỨNG MINH TỪNG BƯỚC (STEP-BY-STEP DERIVATION)
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Các bước tiếp theo bị khóa mờ cho đến khi hoàn thành bước hiện tại
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              Bước 1 / 3
            </span>
          </div>

          {/* Step 1: Active Card */}
          <div className="border border-zinc-700 bg-zinc-900/90 rounded-lg p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-sky-400 font-semibold uppercase tracking-wider">
                BƯỚC 01: CÂN BẰNG PHƯƠNG TRÌNH HÓA HỌC
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                step1Correct
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {step1Correct ? 'ĐÃ HOÀN THÀNH' : 'ĐANG LÀM'}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Nhập phương trình sau khi đã điền hệ số nguyên tối giản:
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-300">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1">Gợi ý Socratic:</div>
              <div>Tìm bội chung nhỏ nhất của chỉ số Oxi ở vế trái (2) và vế phải (3). Sau đó cân bằng tiếp nguyên tố Fe.</div>
            </div>

            {/* Answer Display */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500">Bài làm:</span>
              <span className="font-mono text-xs text-zinc-100 font-medium">
                {step1Input || 'Chưa nhập...'}
              </span>
            </div>
          </div>

          {/* Step 2: Locked Row */}
          <div className="border border-zinc-900 bg-zinc-950/80 rounded-lg px-4 py-3 flex items-center justify-between text-zinc-600">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-700">02</span>
              <span className="text-xs font-medium text-zinc-500">
                BƯỚC 02: GIẢI THÍCH ĐỊNH LUẬT BẢO TOÀN NGUYÊN TỬ (CỔNG KHÁI NIỆM)
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 border border-zinc-850 px-2 py-0.5 rounded">
              LOCKED
            </span>
          </div>

          {/* Step 3: Locked Row */}
          <div className="border border-zinc-900 bg-zinc-950/80 rounded-lg px-4 py-3 flex items-center justify-between text-zinc-600">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-700">03</span>
              <span className="text-xs font-medium text-zinc-500">
                BƯỚC 03: TÍNH TOÁN HIỆU SUẤT & KHỐI LƯỢNG SẢN PHẨM Ở ĐIỀU KIỆN BIÊN
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 border border-zinc-850 px-2 py-0.5 rounded">
              LOCKED
            </span>
          </div>
        </div>

        {/* Bottom Input Bar & Token Pills */}
        <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
          {pasteAlert && (
            <div
              data-testid="paste-blocked-alert"
              className="p-2 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono"
            >
              Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa!
            </div>
          )}

          {/* Algebraic Token Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">
              Ký hiệu:
            </span>
            {['4', '3', '2', 'Fe', '+', 'O₂', '→', 'Fe₂O₃', 'v₀', 'gt²', 'sin(α)', '∫'].map((tok) => (
              <button
                key={tok}
                type="button"
                data-testid={`key-${tok}`}
                onClick={() => insertToken(tok.includes('Fe') || tok.includes('O') || tok.includes('→') ? tok + ' ' : tok)}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {tok}
              </button>
            ))}
            <button
              type="button"
              data-testid="numpad-clear"
              onClick={() => setStep1Input('')}
              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition cursor-pointer ml-auto"
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
              className="flex-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
            />
            <button
              type="button"
              data-testid="numpad-submit"
              onClick={handleEvaluateStep}
              className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition cursor-pointer shadow-sm shrink-0"
            >
              Kiểm tra bước giải
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
