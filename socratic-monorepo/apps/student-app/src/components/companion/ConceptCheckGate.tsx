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
      setFeedback(`🎉 Xuất sắc! Em đã vượt qua toàn bộ 4 bẫy đề thi THPT 2025+. Nhận +${pointsAwarded} Eureka Particles!`);
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
      setFeedback(`🎉 Xuất sắc! Chuỗi nhân quả bản chất hoàn toàn chính xác. Em nhận được +${pointsAwarded} Eureka Particles!`);
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
      setFeedback(`🎉 Tuyệt vời! Lời giải thích rất chuẩn xác. Em nhận được +${pointsAwarded} Eureka Particles!`);
      onPassGate(pointsAwarded);
    } else {
      setFeedback(`Em đã nói đúng một phần, nhưng còn thiếu các khái niệm then chốt: ${missing.join(', ')}. Hãy giải thích rõ hơn!`);
    }
  };

  return (
    <div
      data-testid="concept-check-gate"
      className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-purple-500/30 shadow-2xl flex flex-col gap-4 text-slate-100"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
          <h4 className="font-bold text-sm text-purple-200">
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
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition cursor-pointer border ${
              isTrapHunterMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md shadow-amber-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Đặc sản format thi THPT Quốc gia 2025+: Câu hỏi trắc nghiệm Đúng/Sai 4 ý"
          >
            {isTrapHunterMode ? '🎯 Săn Bẫy THPT (Bật)' : '🎯 Săn Bẫy (Format 2025+)'}
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
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition cursor-pointer border ${
              isQuietMode
                ? 'bg-purple-600 text-white border-purple-400 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
            title="Chuyển chế độ yên tĩnh khi học ở thư viện / ban đêm"
          >
            {isQuietMode ? '🤫 Chế độ Yên tĩnh (Bật)' : '🎙️ Giọng nói (x2 Eureka)'}
          </button>
          <span
            data-testid="eureka-reward-badge"
            className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40"
          >
            +{pointsAwarded} Eureka Particles
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {isTrapHunterMode
          ? 'Thử thách Bẫy Đề Thi THPT 2025+: Biện luận Đúng / Sai cho 4 mệnh đề dưới đây:'
          : isQuietMode
          ? 'Sắp xếp 3 khối tư duy nhân quả theo đúng trình tự diễn biến phản ứng:'
          : <>Để hoàn thành bài học, hãy dùng giọng nói giải thích bản chất: <strong>{conceptTitle}</strong></>}
      </p>

      {/* TRAP HUNTER MODE: Format 2025+ True/False 4-Statement */}
      {isTrapHunterMode ? (
        <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>🎯 Thử thách Đúng/Sai (Format Đề Thi THPT 2025-2026):</span>
          </div>
          <div className="flex flex-col gap-2">
            {trapStatements.map((stmt) => (
              <div
                key={stmt.id}
                data-testid={`trap-stmt-${stmt.id}`}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <span className="text-xs text-slate-200">{stmt.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-true`}
                    onClick={() => handleSelectTrapOption(stmt.id, true)}
                    disabled={isPassed}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      stmt.userVal === true
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    ĐÚNG
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-false`}
                    onClick={() => handleSelectTrapOption(stmt.id, false)}
                    disabled={isPassed}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      stmt.userVal === false
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
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
            className="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 active:scale-95 text-xs font-bold text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isPassed ? '✅ Đã vượt qua 4 bẫy đề thi' : 'Nộp bài kiểm tra 4 mệnh đề Đúng/Sai'}
          </button>
        </div>
      ) : isQuietMode ? (
        <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/70 border border-purple-500/20">
          {causalBlocks.map((block, idx) => (
            <div
              key={block.id}
              data-testid={`causal-block-${block.id}`}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-900/60 text-purple-200 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs text-slate-200">{block.text}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveBlock(idx, 'UP')}
                  disabled={idx === 0 || isPassed}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-300 disabled:opacity-20 cursor-pointer"
                  title="Di chuyển lên"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(idx, 'DOWN')}
                  disabled={idx === causalBlocks.length - 1 || isPassed}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-300 disabled:opacity-20 cursor-pointer"
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
            className="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-purple-900/30 disabled:opacity-50"
          >
            {isPassed ? '✅ Đã hoàn thành thử thách' : 'Kiểm tra trình tự nhân quả'}
          </button>
        </div>
      ) : (
        /* VOICE MODE: Mic Button */
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            data-testid="voice-record-btn"
            onClick={isRecording ? stopListening : startListening}
            disabled={isPassed}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
              isPassed
                ? 'bg-emerald-500 text-slate-950'
                : isRecording
                ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105 active:scale-95'
            }`}
          >
            {isPassed ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : isRecording ? (
              <MicOff className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>

          <span className="text-xs font-medium text-slate-400">
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
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-purple-400"
        />
        <button
          type="button"
          data-testid="btn-verify-explanation"
          onClick={() => verifyExplanation(transcript)}
          disabled={isPassed || transcript.trim().length === 0}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-xs font-bold text-white transition disabled:opacity-40 cursor-pointer"
        >
          Xác nhận
        </button>
      </div>

      {/* Feedback & Particles Display */}
      {feedback && (
        <div
          data-testid="concept-feedback"
          className={`p-3 rounded-2xl text-xs leading-relaxed ${
            isPassed
              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/70 border border-amber-500/40 text-amber-200'
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
};
