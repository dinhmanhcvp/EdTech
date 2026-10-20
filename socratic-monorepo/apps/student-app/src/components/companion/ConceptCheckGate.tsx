'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ConceptCheckGateProps {
  onPassGate: (eurekaPoints: number) => void;
  conceptTitle?: string;
  targetKeywords?: string[];
  pointsAwarded?: number;
}

function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export const ConceptCheckGate: React.FC<ConceptCheckGateProps> = ({
  onPassGate,
  conceptTitle = 'Định luật Bảo toàn Khối lượng',
  targetKeywords = ['bảo toàn', 'nguyên tử', 'khối lượng'],
  pointsAwarded = 50,
}: ConceptCheckGateProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Quiet Mode State (Feature 6.4 Upgrade)
  const [isQuietMode, setIsQuietMode] = useState(false);
  const [isTrapHunterMode, setIsTrapHunterMode] = useState(false);

  const [causalBlocks, setCausalBlocks] = useState([
    { id: 2, step: 'Bước B', text: 'Diễn biến: Các nguyên tử Fe và O tái tổ hợp tạo phân tử gỉ sắt Fe₂O₃ mới' },
    { id: 1, step: 'Bước A', text: 'Chất tham gia: Các liên kết Fe-Fe và O=O bị bẻ gãy khi đốt nóng' },
    { id: 3, step: 'Bước C', text: 'Bảo toàn: Tổng số nguyên tử Fe và O trước và sau phản ứng không đổi ➔ Khối lượng bảo toàn' },
  ]);

  // Format 2025+ True/False Statements (Săn Bẫy Đề Thi THPT Quốc Gia)
  const [trapStatements, setTrapStatements] = useState([
    {
      id: 'a',
      label: 'a) Tỉ lệ số mol phản ứng giữa Fe và O₂ là 4 : 3 để tạo ra 2 mol Fe₂O₃.',
      correctVal: true,
      userVal: null as boolean | null,
    },
    {
      id: 'b',
      label: 'b) Theo Định luật Bảo toàn Khối lượng, tổng số mol nguyên tử trước và sau phản ứng không đổi.',
      correctVal: true,
      userVal: null as boolean | null,
    },
    {
      id: 'c',
      label: 'c) Khi tăng nhiệt độ, số nguyên tử Oxi ở vế sản phẩm sẽ tự tăng lên để cân bằng áp suất.',
      correctVal: false,
      userVal: null as boolean | null,
    },
    {
      id: 'd',
      label: 'd) Đốt 4 mol Fe trong 2 mol O₂ thì O₂ phản ứng hết và Fe còn dư sau phản ứng.',
      correctVal: true,
      userVal: null as boolean | null,
    },
  ]);

  const handleSelectTrapOption = (id: string, val: boolean) => {
    if (isPassed) return;
    setTrapStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, userVal: val } : s))
    );
  };

  const verifyTrapStatements = () => {
    const allAnswered = trapStatements.every((s) => s.userVal !== null);
    if (!allAnswered) {
      setFeedback('Em hãy chọn Đúng hoặc Sai cho cả 4 mệnh đề trước khi nộp bài!');
      return;
    }
    const allCorrect = trapStatements.every((s) => s.userVal === s.correctVal);
    if (allCorrect) {
      setIsPassed(true);
      setFeedback(`Xuất sắc! Em đã vượt qua toàn bộ 4 bẫy đề thi THPT 2025+. Nhận +${pointsAwarded} Eureka Particles!`);
      onPassGate(pointsAwarded);
    } else {
      setFeedback('Có mệnh đề chưa chính xác! Em hãy suy luận lại điều kiện biên và tỉ lệ hóa học nhé.');
    }
  };

  const moveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    if (isPassed) return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= causalBlocks.length) return;
    const next = [...causalBlocks];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setCausalBlocks(next);
  };

  const verifyCausalBlocks = () => {
    const isCorrect = causalBlocks[0].id === 1 && causalBlocks[1].id === 2 && causalBlocks[2].id === 3;
    if (isCorrect) {
      setIsPassed(true);
      setFeedback(`Xuất sắc! Chuỗi nhân quả bản chất hoàn toàn chính xác. Em nhận được +${pointsAwarded} Eureka Particles!`);
      onPassGate(pointsAwarded);
    } else {
      setFeedback('Thứ tự chuỗi nhân quả chưa đúng! Gợi ý: [Chất tham gia] ➔ [Tái tổ hợp liên kết] ➔ [Bảo toàn số nguyên tử].');
    }
  };

  const startListening = () => {
    setIsRecording(true);
    setFeedback('Đang lắng nghe lời giải thích của em...');

    // Attempt Web Speech API if supported
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          verifyExplanation(text);
        };
        recognition.onerror = () => {
          setIsRecording(false);
          setFeedback('Không nhận diện được giọng nói. Em hãy nói to hơn hoặc gõ lời giải thích.');
        };
        recognition.onend = () => {
          setIsRecording(false);
        };
        recognition.start();
        return;
      } catch (err) {
        setIsRecording(false);
      }
    }

    // Zero Mock: Do NOT fake or auto-pass! Guide the student to articulate or type.
    setIsRecording(false);
    setFeedback('Trình duyệt chưa hỗ trợ Web Speech trực tiếp. Em hãy gõ lời giải thích bản chất vào ô bên dưới nhé!');
  };

  const stopListening = () => {
    setIsRecording(false);
  };

  const verifyExplanation = (text: string) => {
    const norm = removeDiacritics(text);
    const matched: string[] = [];
    const missing: string[] = [];

    targetKeywords.forEach((kw) => {
      if (norm.includes(removeDiacritics(kw))) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    // Require >= 60% concept keyword coverage
    const coverage = matched.length / Math.max(targetKeywords.length, 1);
    const passed = coverage >= 0.6;

    if (passed) {
      setIsPassed(true);
      setFeedback(`Tuyệt vời! Lời giải thích rất chuẩn xác. Em nhận được +${pointsAwarded} Eureka Particles!`);
      onPassGate(pointsAwarded);
    } else {
      setFeedback(`Em đã nói đúng một phần, nhưng còn thiếu các khái niệm then chốt: ${missing.join(', ')}. Hãy giải thích rõ hơn!`);
    }
  };

  return (
    <div
      data-testid="concept-check-gate"
      className="p-5 rounded-xl bg-white/95 border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] flex flex-col gap-4 text-[#18181B] font-sans"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <h4 className="font-semibold text-xs tracking-tight text-stone-700 uppercase font-mono">
            Cổng Kiểm Tra Khái Niệm Ngược (Reverse Gate)
          </h4>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Trap Hunter 2025+ Toggle */}
          <button
            type="button"
            data-testid="trap-hunter-toggle"
            onClick={() => {
              const next = !isTrapHunterMode;
              setIsTrapHunterMode(next);
              if (next) setIsQuietMode(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer border ${
              isTrapHunterMode
                ? 'bg-white text-amber-800 border-amber-300 font-semibold shadow-xs'
                : 'bg-[#F2F0EA] text-stone-600 hover:text-stone-900 border-[#E5E3DC]'
            }`}
            title="Đặc sản format thi THPT Quốc gia 2025+: Câu hỏi trắc nghiệm Đúng/Sai 4 ý"
          >
            {isTrapHunterMode ? 'Săn Bẫy THPT (Bật)' : 'Săn Bẫy (Format 2025+)'}
          </button>

          {/* Quiet Mode Toggle */}
          <button
            type="button"
            data-testid="quiet-mode-toggle"
            onClick={() => {
              const next = !isQuietMode;
              setIsQuietMode(next);
              if (next) setIsTrapHunterMode(false);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer border ${
              isQuietMode
                ? 'bg-white text-stone-900 border-stone-300 font-semibold shadow-xs'
                : 'bg-[#F2F0EA] text-stone-600 hover:text-stone-900 border-[#E5E3DC]'
            }`}
            title="Chuyển chế độ yên tĩnh khi học ở thư viện / ban đêm"
          >
            {isQuietMode ? 'Chế độ Yên tĩnh (Bật)' : 'Giọng nói (x2 Eureka)'}
          </button>
          <span
            data-testid="eureka-reward-badge"
            className="text-xs font-mono tabular-nums px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-semibold"
          >
            +{pointsAwarded} Eureka Particles
          </span>
        </div>
      </div>

      <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
        {isTrapHunterMode
          ? 'Thử thách Bẫy Đề Thi THPT 2025+: Biện luận Đúng / Sai cho 4 mệnh đề dưới đây:'
          : isQuietMode
          ? 'Sắp xếp 3 khối tư duy nhân quả theo đúng trình tự diễn biến phản ứng:'
          : <>Để hoàn thành bài học, hãy dùng giọng nói giải thích bản chất: <strong className="text-[#18181B] font-semibold">{conceptTitle}</strong></>}
      </p>

      {/* TRAP HUNTER MODE: Format 2025+ True/False 4-Statement */}
      {isTrapHunterMode ? (
        <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[#F4F3EE] border border-[#E5E3DC]">
          <div className="text-xs font-semibold text-stone-700 flex items-center gap-1.5 font-mono">
            <span>Thử thách Đúng/Sai (Format Đề Thi THPT 2025-2026):</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {trapStatements.map((stmt) => (
              <div
                key={stmt.id}
                data-testid={`trap-stmt-${stmt.id}`}
                className="p-2.5 rounded-lg bg-white border border-[#E5E3DC] flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs"
              >
                <span className="text-xs text-stone-800">{stmt.label}</span>
                <div className="flex items-center gap-1 shrink-0 font-mono">
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-true`}
                    onClick={() => handleSelectTrapOption(stmt.id, true)}
                    disabled={isPassed}
                    className={`px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer active:translate-y-px ${
                      stmt.userVal === true
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold shadow-xs'
                        : 'bg-[#F8F7F4] text-stone-600 hover:text-stone-900 border border-[#DCD9D0]'
                    }`}
                  >
                    ĐÚNG
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-false`}
                    onClick={() => handleSelectTrapOption(stmt.id, false)}
                    disabled={isPassed}
                    className={`px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer active:translate-y-px ${
                      stmt.userVal === false
                        ? 'bg-rose-50 text-rose-700 border border-rose-300 font-semibold shadow-xs'
                        : 'bg-[#F8F7F4] text-stone-600 hover:text-stone-900 border border-[#DCD9D0]'
                    }`}
                  >
                    SAI
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-verify-trap-statements"
            onClick={verifyTrapStatements}
            disabled={isPassed}
            className="mt-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:translate-y-px text-xs font-medium text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isPassed ? 'Đã vượt qua 4 bẫy đề thi' : 'Nộp bài kiểm tra 4 mệnh đề Đúng/Sai'}
          </button>
        </div>
      ) : isQuietMode ? (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#F4F3EE] border border-[#E5E3DC]">
          {causalBlocks.map((block, idx) => (
            <div
              key={block.id}
              data-testid={`causal-block-${block.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-[#E5E3DC] hover:border-stone-400 transition shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#F2F0EA] border border-[#E5E3DC] text-stone-700 text-[11px] font-mono flex items-center justify-center shrink-0 font-semibold">
                  {idx + 1}
                </span>
                <span className="text-xs text-stone-800">{block.text}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 font-mono">
                <button
                  type="button"
                  onClick={() => moveBlock(idx, 'UP')}
                  disabled={idx === 0 || isPassed}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-xs text-stone-700 disabled:opacity-20 cursor-pointer shadow-2xs"
                  title="Di chuyển lên"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(idx, 'DOWN')}
                  disabled={idx === causalBlocks.length - 1 || isPassed}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-xs text-stone-700 disabled:opacity-20 cursor-pointer shadow-2xs"
                  title="Di chuyển xuống"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            data-testid="btn-verify-causal-blocks"
            onClick={verifyCausalBlocks}
            disabled={isPassed}
            className="mt-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:translate-y-px text-xs font-medium text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isPassed ? 'Đã hoàn thành thử thách' : 'Kiểm tra trình tự nhân quả'}
          </button>
        </div>
      ) : (
        /* VOICE MODE: Mic Button */
        <div className="flex flex-col items-center gap-3 py-3">
          <button
            type="button"
            data-testid="voice-record-btn"
            onClick={isRecording ? stopListening : startListening}
            disabled={isPassed}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
              isPassed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#F2F0EA] hover:bg-[#EAE7DF] text-stone-700 border border-[#DCD9D0]'
            }`}
          >
            {isPassed ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          <span className="text-xs text-stone-500 font-serif italic">
            {isPassed
              ? 'Đã vượt qua cổng kiểm tra'
              : isRecording
              ? 'Đang ghi âm giọng nói...'
              : 'Nhấn vào micro để giải thích'}
          </span>
        </div>
      )}

      {/* Manual Input Fallback for Accessibility & Fast Automated Testing */}
      <div className="flex items-center gap-2">
        <input
          data-testid="concept-input-fallback"
          type="text"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Hoặc gõ lời giải thích bằng bàn phím..."
          disabled={isPassed}
          className="flex-1 px-3 py-2 rounded-lg bg-[#FCFBF9] border border-[#DCD9D0] text-xs text-[#18181B] placeholder:text-stone-400 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          data-testid="btn-verify-explanation"
          onClick={() => verifyExplanation(transcript)}
          disabled={isPassed || transcript.trim().length === 0}
          className="px-3.5 py-2 rounded-lg bg-[#18181B] hover:bg-stone-800 active:translate-y-px text-xs font-medium text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
        >
          Xác nhận
        </button>
      </div>

      {/* Feedback & Particles Display */}
      {feedback && (
        <div
          data-testid="concept-feedback"
          className={`p-3 rounded-lg text-xs leading-relaxed border ${
            isPassed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
};
