'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Volume2, HelpCircle } from 'lucide-react';
import { TrapStatement } from '../../data/socraticProblems';
import { MathText } from '../ui/MathText';

export interface ConceptCheckGateProps {
  onPassGate: (eurekaPoints: number) => void;
  conceptTitle?: string;
  targetKeywords?: string[];
  pointsAwarded?: number;
  causalBlocks?: { id: number; step: string; text: string }[];
  trapStatements?: TrapStatement[];
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
  conceptTitle = 'Định luật Bảo toàn Khối lượng & Năng lượng',
  targetKeywords = ['bảo toàn', 'nguyên tử', 'khối lượng'],
  pointsAwarded = 50,
  causalBlocks: propCausalBlocks,
  trapStatements: propTrapStatements,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Mode toggles
  const [isQuietMode, setIsQuietMode] = useState(false);
  const [isTrapHunterMode, setIsTrapHunterMode] = useState(false);

  // 32-Bar Real-Time Audio Waveform animation levels
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array.from({ length: 32 }, () => 12)
  );
  const animFrameRef = useRef<number | null>(null);
  const verifyingRef = useRef(false);
  const passedRef = useRef(false);

  const verifyExplanation = async (speech: string) => {
    if (verifyingRef.current || passedRef.current) return;
    verifyingRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setFeedback('Đang xác thực giải thích…');
    try {
      const response = await fetch('/api/v1/companion/verify-voice-gate', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({transcript: speech, concept: conceptTitle, expected_keywords: targetKeywords}),
      });
      if (!response.ok) throw new Error('unavailable');
      const result = await response.json();
      setFeedback(result.feedback || 'Chưa đủ thông tin để xác nhận.');
      if (result.passed === true && typeof result.eureka_points_awarded === 'number') {
        passedRef.current = true;
        setIsPassed(true);
        onPassGate(result.eureka_points_awarded);
      }
    } catch {
      setFeedback('Chưa xác thực được giải thích online. Giữ nguyên nội dung và thử lại khi có kết nối.');
    } finally {
      clearTimeout(timeout);
      verifyingRef.current = false;
    }
  };

  useEffect(() => {
    if (isRecording) {
      const updateWaveform = () => {
        setWaveformBars(
          Array.from({ length: 32 }, () => Math.floor(Math.random() * 28 + 6))
        );
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      animFrameRef.current = requestAnimationFrame(updateWaveform);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setWaveformBars(Array.from({ length: 32 }, () => 10));
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  const defaultCausal = [
    { id: 2, step: 'Bước B', text: 'Diễn biến: Các nguyên tử Fe và O tái tổ hợp tạo phân tử gỉ sắt Fe₂O₃ mới' },
    { id: 1, step: 'Bước A', text: 'Chất tham gia: Các liên kết Fe-Fe và O=O bị bẻ gãy khi đốt nóng' },
    { id: 3, step: 'Bước C', text: 'Bảo toàn: Tổng số nguyên tử Fe và O trước và sau phản ứng không đổi ➔ Khối lượng bảo toàn' },
  ];

  const defaultTraps: TrapStatement[] = [
    {
      id: 'a',
      label: 'a) Tỉ lệ số mol phản ứng giữa Fe và O₂ là 4 : 3 để tạo ra 2 mol Fe₂O₃.',
      correctVal: true,
      explanation: 'Đúng theo phương trình 4Fe + 3O₂ → 2Fe₂O₃.',
    },
    {
      id: 'b',
      label: 'b) Theo Định luật Bảo toàn Khối lượng, tổng số mol nguyên tử trước và sau phản ứng không đổi.',
      correctVal: true,
      explanation: 'Đúng, số nguyên tử mỗi nguyên tố bảo toàn tuyệt đối.',
    },
    {
      id: 'c',
      label: 'c) Khi tăng nhiệt độ, số nguyên tử Oxi ở vế sản phẩm sẽ tự tăng lên để cân bằng áp suất.',
      correctVal: false,
      explanation: 'Sai, nhiệt độ chỉ ảnh hưởng đến tốc độ hoặc chuyển dịch cân bằng, không thể tạo thêm nguyên tử mới.',
    },
    {
      id: 'd',
      label: 'd) Đốt 4 mol Fe trong 2 mol O₂ thì O₂ phản ứng hết và Fe còn dư sau phản ứng.',
      correctVal: true,
      explanation: 'Đúng, 4 mol Fe cần 3 mol O₂. Nếu chỉ có 2 mol O₂ thì O₂ hết và Fe dư.',
    },
  ];

  const [causalBlocks, setCausalBlocks] = useState(propCausalBlocks || defaultCausal);
  const [trapStatements, setTrapStatements] = useState<
    (TrapStatement & { userVal?: boolean | null })[]
  >((propTrapStatements || defaultTraps).map((t) => ({ ...t, userVal: null })));

  // Real-time Semantic Keyword Tracking
  const normalizedTranscript = removeDiacritics(transcript);
  const matchedKeywords = targetKeywords.filter((kw) =>
    normalizedTranscript.includes(removeDiacritics(kw))
  );

  const handleStartVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    ) {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;
        setIsRecording(true);

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);

          // Check if all keywords met
          const norm = removeDiacritics(current);
          const allFound = targetKeywords.every((kw) =>
            norm.includes(removeDiacritics(kw))
          );
          if (allFound && !isPassed) {
            void verifyExplanation(current);
            recognition.stop();
            setIsRecording(false);
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch {}
    }

    setFeedback('Trình duyệt chưa hỗ trợ nhận giọng nói. Em có thể nhập lời giải thích ở ô bên dưới.');
  };

  const handleFallbackTextVerify = () => {
    if (transcript.trim()) void verifyExplanation(transcript);
  };

  const handleVerifyCausalBlocks = () => {
    // Correct sequence is id: 1 -> 2 -> 3
    const isSorted =
      causalBlocks[0].id === 1 &&
      causalBlocks[1].id === 2 &&
      causalBlocks[2].id === 3;
    if (isSorted) {
      setIsPassed(true);
      setFeedback(
        `Chính xác! Chuỗi nhân quả diễn biến đã được sắp xếp chuẩn xác. Nhận +${pointsAwarded} Eureka Particles!`
      );
      onPassGate(pointsAwarded);
    }
  };

  const handleSelectTrapOption = (id: string, val: boolean) => {
    if (isPassed) return;
    setTrapStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, userVal: val } : s))
    );
  };

  const handleVerifyTrapStatements = () => {
    const allAnswered = trapStatements.every((s) => s.userVal !== null);
    if (!allAnswered) {
      setFeedback('Em hãy chọn Đúng hoặc Sai cho cả 4 mệnh đề trước khi nộp bài!');
      return;
    }
    const allCorrect = trapStatements.every((s) => s.userVal === s.correctVal);
    if (allCorrect) {
      setIsPassed(true);
      setFeedback(
        `Xuất sắc! Em đã vượt qua toàn bộ 4 bẫy đề thi THPT 2025+. Nhận +${pointsAwarded} Eureka Particles!`
      );
      onPassGate(pointsAwarded);
    } else {
      setFeedback('Có mệnh đề chưa chính xác! Em hãy xem lại các điều kiện biên và bảo toàn.');
    }
  };

  return (
    <div
      data-testid="concept-check-gate"
      className="bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs flex flex-col gap-3 font-sans select-none"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-stone-900 tracking-tight">
              Chốt chặn Kiểm tra Bản chất (Concept Check Gate)
            </h3>
            <p className="text-[11px] text-stone-500 font-serif italic">
              {conceptTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="eureka-reward-badge"
            className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-mono text-xs font-bold tabular-nums shadow-2xs"
          >
            +{pointsAwarded} Eureka Particles
          </span>
        </div>
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex items-center justify-between bg-[#F8F7F4] p-1 rounded-lg border border-[#E6E4DD]">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsQuietMode(false);
              setIsTrapHunterMode(false);
            }}
            className={`px-3 py-1 rounded-md transition cursor-pointer font-medium ${
              !isQuietMode && !isTrapHunterMode
                ? 'bg-white shadow-xs text-stone-900 font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Bảo vệ Giọng nói (x2 Grit)
          </button>

          <button
            type="button"
            data-testid="quiet-mode-toggle"
            onClick={() => {
              setIsQuietMode(true);
              setIsTrapHunterMode(false);
            }}
            className={`px-3 py-1 rounded-md transition cursor-pointer font-medium ${
              isQuietMode && !isTrapHunterMode
                ? 'bg-white shadow-xs text-stone-900 font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Chế độ Yên tĩnh {isQuietMode && !isTrapHunterMode ? '(Bật)' : ''}
          </button>

          <button
            type="button"
            data-testid="trap-hunter-toggle"
            onClick={() => {
              setIsTrapHunterMode(true);
              setIsQuietMode(false);
            }}
            className={`px-3 py-1 rounded-md transition cursor-pointer font-medium ${
              isTrapHunterMode
                ? 'bg-white shadow-xs text-stone-900 font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Săn Bẫy THPT 2025+
          </button>
        </div>
      </div>

      {/* MODE 1: VOICE DEFENSE (WITH 32-BAR WAVEFORM & LIVE SEMANTIC TRACKER) */}
      {!isQuietMode && !isTrapHunterMode && (
        <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-700 font-medium">
              Nói ngắn gọn định luật/nguyên tắc khoa học vừa áp dụng:
            </span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              Thưởng x2 Grit Score
            </span>
          </div>

          {/* 32-Bar Real-Time Audio Waveform Visualizer */}
          <div
            data-testid="voice-defense-waveform"
            className="w-full h-12 bg-white rounded-lg border border-[#E6E4DD] flex items-center justify-center gap-1 px-4 overflow-hidden shadow-inner"
          >
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isRecording ? 'bg-blue-600' : 'bg-stone-300'
                }`}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>

          {/* Live Semantic Keyword Tracker */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-stone-500 uppercase font-semibold">
              Trụ cột khái niệm:
            </span>
            {targetKeywords.map((kw) => {
              const isFound = matchedKeywords.includes(kw);
              return (
                <span
                  key={kw}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                    isFound
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                      : 'bg-stone-100 text-stone-500 border-stone-200'
                  }`}
                >
                  {isFound ? '✓ ' : '○ '}
                  {kw}
                </span>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              data-testid="mic-voice-defense-btn"
              onClick={handleStartVoice}
              disabled={isPassed}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isRecording ? 'Đang lắng nghe... (Bấm dừng)' : 'Bấm để nói giải thích'}</span>
            </button>
          </div>

          {/* Fallback Text Input (for headless tests or noisy room) */}
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-[#E6E4DD]">
            <input
              type="text"
              data-testid="concept-input-fallback"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFallbackTextVerify()}
              placeholder="Hoặc gõ giải thích bản chất tại đây..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#DCD9D0] text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-blue-500 font-mono shadow-inner"
            />
            <button
              type="button"
              data-testid="btn-verify-explanation"
              onClick={handleFallbackTextVerify}
              disabled={isPassed || transcript.trim().length === 0}
              className="px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-stone-800 text-white text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-40"
            >
              Nộp
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: QUIET MODE CAUSAL BLOCKS */}
      {isQuietMode && !isTrapHunterMode && (
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] animate-in fade-in">
          <span className="text-xs text-stone-700 font-medium">
            Sắp xếp chuỗi nguyên nhân - kết quả theo thứ tự logic:
          </span>
          <div className="flex flex-col gap-1.5">
            {causalBlocks.map((b, idx) => (
              <div
                key={b.id}
                className="p-2.5 rounded-lg bg-white border border-[#E6E4DD] text-xs flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 font-mono text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-stone-800"><MathText text={b.text} /></span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-verify-causal-blocks"
            onClick={handleVerifyCausalBlocks}
            disabled={isPassed}
            className="w-full py-2 rounded-lg bg-[#18181B] hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs mt-1"
          >
            Xác nhận Chuỗi Nhân Quả
          </button>
        </div>
      )}

      {/* MODE 3: TRAP HUNTER (THPT 2025+ FORMAT 4-STATEMENTS) */}
      {isTrapHunterMode && (
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900">
              Săn Bẫy Đề Thi THPT 2025+ (Format Đúng / Sai):
            </span>
            <span className="text-[10px] font-mono text-stone-500">4 / 4 mệnh đề</span>
          </div>

          <div className="flex flex-col gap-2">
            {trapStatements.map((stmt) => (
              <div
                key={stmt.id}
                data-testid={`trap-stmt-${stmt.id}`}
                className="p-2.5 rounded-lg bg-white border border-[#E6E4DD] text-xs flex flex-col gap-1.5 shadow-2xs"
              >
                <div className="text-stone-800 leading-relaxed font-medium">
                  <MathText text={stmt.label} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-true`}
                    onClick={() => handleSelectTrapOption(stmt.id, true)}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer border ${
                      stmt.userVal === true
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-[#F8F7F4] text-stone-700 border-[#E6E4DD] hover:bg-stone-100'
                    }`}
                  >
                    ĐÚNG
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-stmt-${stmt.id}-false`}
                    onClick={() => handleSelectTrapOption(stmt.id, false)}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer border ${
                      stmt.userVal === false
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-[#F8F7F4] text-stone-700 border-[#E6E4DD] hover:bg-stone-100'
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
            onClick={handleVerifyTrapStatements}
            disabled={isPassed}
            className="w-full py-2 rounded-lg bg-[#18181B] hover:bg-stone-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs mt-1"
          >
            Nộp bài Săn Bẫy THPT
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          data-testid="concept-feedback"
          className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 animate-in fade-in ${
            isPassed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {isPassed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          )}
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
