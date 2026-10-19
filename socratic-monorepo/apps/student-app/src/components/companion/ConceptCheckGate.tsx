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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
          <h4 className="font-bold text-sm text-purple-200">
            Cổng Kiểm Tra Khái Niệm Ngược (Reverse Gate)
          </h4>
        </div>
        <span
          data-testid="eureka-reward-badge"
          className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40"
        >
          +{pointsAwarded} Eureka Particles
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Để hoàn thành bài học, hãy dùng giọng nói giải thích bản chất: <strong>{conceptTitle}</strong>
      </p>

      {/* Voice Recording Control */}
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
