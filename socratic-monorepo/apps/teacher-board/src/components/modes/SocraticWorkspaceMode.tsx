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
    <div className="flex h-full w-full bg-[#F8F7F4] text-[#18181B] overflow-hidden select-none font-sans">
      {/* Left Pane (45%): Problem Statement, Visual Debugger, Concept Gate */}
      <div className="w-[45%] h-full overflow-y-auto border-r border-[#E6E4DD] bg-[#FCFBF9] p-5 flex flex-col gap-4">
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
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span data-testid="eureka-particles-counter">{eurekaPoints} Eureka</span>
          </div>
        </div>

        {/* Problem Statement Card */}
        <div className="border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-semibold text-stone-900 tracking-tight">
              Bài toán 02: Cân bằng Phương trình & Bảo toàn Nguyên tử
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F0EA] text-stone-600 border border-[#E6E4DD]">
              Định luật Lomonosov
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Cho phản ứng nhiệt nhôm hoặc đốt cháy sắt trong khí Oxi tạo thành gỉ sắt (Oxit sắt từ / Oxit sắt III):
          </p>
          <div className="bg-[#F8F7F4] border border-[#E6E4DD] rounded-xl px-4 py-2.5 text-center font-mono text-sm text-stone-900 font-bold tracking-wider">
            Fe + O₂ → Fe₂O₃
          </div>
          <p className="text-[11px] text-stone-500 leading-normal">
            Em hãy xác định bộ ba hệ số nguyên tối giản (a, b, c) để số nguyên tử của từng nguyên tố ở hai vế hoàn toàn bằng nhau.
          </p>
        </div>

        {/* Interactive Visual Debugger: Chemical Balance Scale */}
        <div
          data-testid="balance-scale-wrapper"
          className="border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-600 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Cân Đĩa Nguyên Tử (Visual Debugger)</span>
            </span>
            <span className="text-[10px] font-mono text-stone-500">
              {step1Correct ? 'Cân bằng hoàn hảo!' : 'Đang lệch vế'}
            </span>
          </div>

          {/* SVG Balance Scale */}
          <div className="relative w-full h-36 bg-[#FCFBF9] rounded-xl border border-[#E6E4DD] flex items-center justify-center p-2">
            <svg viewBox="0 0 400 140" className="w-full h-full">
              {/* Fulcrum Base */}
              <polygon points="185,125 215,125 200,85" fill="#E5E3DC" stroke="#CBD5E1" strokeWidth="1" />
              <circle cx="200" cy="85" r="4" fill="#78716C" />

              {/* Lever Beam (Rotates based on difference) */}
              <g transform={`rotate(${tiltDeg}, 200, 85)`} style={{ transition: 'transform 0.4s ease' }}>
                <line x1="70" y1="85" x2="330" y2="85" stroke="#78716C" strokeWidth="3" />
                {/* Left Pan Strings & Plate */}
                <line x1="90" y1="85" x2="65" y2="115" stroke="#A8A29E" strokeWidth="1" />
                <line x1="90" y1="85" x2="115" y2="115" stroke="#A8A29E" strokeWidth="1" />
                <path d="M 55,115 Q 90,125 125,115 Z" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />

                {/* Right Pan Strings & Plate */}
                <line x1="310" y1="85" x2="285" y2="115" stroke="#A8A29E" strokeWidth="1" />
                <line x1="310" y1="85" x2="335" y2="115" stroke="#A8A29E" strokeWidth="1" />
                <path d="M 275,115 Q 310,125 345,115 Z" fill="#FFF1F2" stroke="#FECDD3" strokeWidth="1.5" />

                {/* Left Pan Atom Readout */}
                <text x="90" y="75" textAnchor="middle" fill="#2563EB" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {leftAtoms.O} Oxi (O)
                </text>
                <text x="90" y="62" textAnchor="middle" fill="#57534E" fontSize="9" fontFamily="monospace">
                  {leftAtoms.Fe} Fe
                </text>

                {/* Right Pan Atom Readout */}
                <text x="310" y="75" textAnchor="middle" fill="#E11D48" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {rightAtoms.O} Oxi (O)
                </text>
                <text x="310" y="62" textAnchor="middle" fill="#57534E" fontSize="9" fontFamily="monospace">
                  {rightAtoms.Fe} Fe
                </text>
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-stone-600">Vế trái: {leftAtoms.Fe} Fe, {leftAtoms.O} O</span>
            <span className="text-stone-600">Vế phải: {rightAtoms.Fe} Fe, {rightAtoms.O} O</span>
          </div>

          <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
            step1Correct
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] font-medium'
              : 'bg-[#F8F7F4] border-[#E6E4DD] text-stone-600'
          }`}>
            {feedback}
          </div>
        </div>

        {/* Concept Check Gate: True/False 4-Statement (Format THPT 2025+) */}
        <div
          data-testid="concept-check-gate"
          className="border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-xs flex flex-col gap-3.5"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-stone-700 font-semibold">
                Săn Bẫy Đề Thi (Format THPT 2025-2026)
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                +30 Eureka
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="trap-hunter-toggle"
                onClick={() => setIsTrapHunterMode(!isTrapHunterMode)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-600 hover:text-stone-900 transition"
              >
                Săn Bẫy (2025+)
              </button>
              <button
                type="button"
                data-testid="quiet-mode-toggle"
                onClick={() => setIsQuietMode(!isQuietMode)}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-600 hover:text-stone-900 transition flex items-center gap-1"
              >
                {isQuietMode ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                <span>{isQuietMode ? 'Chế độ Yên tĩnh' : 'Giọng nói'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-stone-600">
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
                className="p-3 rounded-xl bg-[#F8F7F4] border border-[#E6E4DD] flex items-center justify-between gap-3 text-xs"
              >
                <span className="text-stone-800 font-sans leading-tight flex-1">{stmt}</span>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setTrapAnswers((prev) => ({ ...prev, [id]: true }))}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      trapAnswers[id] === true
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-stone-50 text-stone-600 border border-[#DCD9D0]'
                    }`}
                  >
                    Đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrapAnswers((prev) => ({ ...prev, [id]: false }))}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      trapAnswers[id] === false
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-stone-50 text-stone-600 border border-[#DCD9D0]'
                    }`}
                  >
                    Sai
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-stone-500">
              {trapVerified === true && <span className="text-emerald-700 font-semibold">Chính xác cả 4 mệnh đề (+30 Eureka)!</span>}
              {trapVerified === false && <span className="text-rose-600 font-semibold">Còn mệnh đề chưa đúng. Hãy kiểm tra lại!</span>}
            </span>
            <button
              type="button"
              data-testid="btn-verify-trap-statements"
              onClick={handleVerifyTrap}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Kiểm tra 4 mệnh đề
            </button>
          </div>
        </div>
      </div>

      {/* Right Pane (55%): Vertical Step-by-Step Derivation Tree */}
      <div className="w-[55%] h-full overflow-y-auto bg-[#F8F7F4] p-6 flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-stone-600 font-semibold">
                CÂY CHỨNG MINH TỪNG BƯỚC (STEP-BY-STEP DERIVATION)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Các bước tiếp theo bị khóa mờ cho đến khi hoàn thành bước hiện tại
              </p>
            </div>
            <span className="text-xs font-mono text-stone-600 font-medium">
              Bước 1 / 3
            </span>
          </div>

          {/* Step 1: Active Card */}
          <div className="border border-blue-200 bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-blue-600 font-bold uppercase tracking-wider">
                BƯỚC 01: CÂN BẰNG PHƯƠNG TRÌNH HÓA HỌC
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${
                step1Correct
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}>
                {step1Correct ? 'ĐÃ HOÀN THÀNH' : 'ĐANG LÀM'}
              </span>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed">
              Nhập phương trình sau khi đã điền hệ số nguyên tối giản:
            </p>

            <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded-xl p-3.5 font-serif text-xs">
              <div className="font-bold text-[11px] uppercase tracking-wider mb-1 text-amber-800">Gợi ý Socratic:</div>
              <div className="leading-relaxed">Tìm bội chung nhỏ nhất của chỉ số Oxi ở vế trái (2) và vế phải (3). Sau đó cân bằng tiếp nguyên tố Fe.</div>
            </div>

            {/* Answer Display */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-stone-500">Bài làm:</span>
              <span className="font-mono text-xs text-stone-900 font-bold">
                {step1Input || 'Chưa nhập...'}
              </span>
            </div>
          </div>

          {/* Step 2: Locked Row */}
          <div className="border border-[#E6E4DD] bg-[#F2F0EA]/70 rounded-2xl px-4 py-3 flex items-center justify-between text-stone-400">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-stone-500">02</span>
              <span className="text-xs font-medium text-stone-500">
                BƯỚC 02: GIẢI THÍCH ĐỊNH LUẬT BẢO TOÀN NGUYÊN TỬ (CỔNG KHÁI NIỆM)
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 border border-[#DCD9D0] bg-white px-2 py-0.5 rounded-md">
              LOCKED
            </span>
          </div>

          {/* Step 3: Locked Row */}
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
