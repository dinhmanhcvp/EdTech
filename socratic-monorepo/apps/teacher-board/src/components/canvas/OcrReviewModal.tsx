'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X, Sparkles, CheckCheck, RefreshCw } from 'lucide-react';
import { MathView } from '../common/MathView';
import { findAmbiguousTokens, swapTokenInFormula } from '../../utils/ocrConfusions';

export interface OcrReviewModalProps {
  isOpen: boolean;
  thumbnailUrl: string | null;
  recognizedLatex: string;
  confidence?: number;
  alternatives?: string[];
  onConfirm: (finalFormula: string) => void;
  onCancel: () => void;
}

const QUICK_MATH_SYMBOLS = [
  { label: '∫', insert: '\\int ' },
  { label: 'x²', insert: 'x^2' },
  { label: 'x³', insert: 'x^3' },
  { label: 'x⁴', insert: 'x^4' },
  { label: '√x', insert: '\\sqrt{x}' },
  { label: 'a/b', insert: '\\frac{1}{x}' },
  { label: 'sin', insert: '\\sin(x)' },
  { label: 'cos', insert: '\\cos(x)' },
  { label: 'π', insert: '\\pi' },
  { label: 'dx', insert: ' dx' },
  { label: 'dt', insert: ' dt' },
];

export const OcrReviewModal: React.FC<OcrReviewModalProps> = ({
  isOpen,
  thumbnailUrl,
  recognizedLatex,
  confidence = 0.98,
  alternatives = [],
  onConfirm,
  onCancel,
}) => {
  const [editedFormula, setEditedFormula] = useState(recognizedLatex);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditedFormula(recognizedLatex);
  }, [recognizedLatex, isOpen]);

  // Detect ambiguous OCR characters (2↔Z, n↔π, etc.) for 1-tap correction without keyboard
  const confusions = useMemo(() => findAmbiguousTokens(editedFormula), [editedFormula]);

  if (!isOpen) return null;

  const handleInsertSymbol = (symbol: string) => {
    const input = inputRef.current;
    if (!input) {
      setEditedFormula((prev) => prev + symbol);
      return;
    }

    const start = input.selectionStart || editedFormula.length;
    const end = input.selectionEnd || editedFormula.length;
    const nextText =
      editedFormula.substring(0, start) + symbol + editedFormula.substring(end);
    setEditedFormula(nextText);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 10);
  };

  const handleSelectAlternative = (alt: string) => {
    setEditedFormula(alt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(editedFormula.trim() || recognizedLatex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const percent = Math.round(confidence * 100);

  return (
    <div
      data-testid="ocr-review-modal"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900/95 border border-cyan-500/50 rounded-3xl max-w-xl w-full p-6 shadow-2xl shadow-cyan-950/70 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Kiểm tra kết quả nhận diện (OCR)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                  Socratic AI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Xem và xác nhận công thức toán học trước khi đưa lên bảng giảng dạy
              </p>
            </div>
          </div>
          <span
            data-testid="ocr-confidence-badge"
            className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold"
          >
            ● {percent}% Tin cậy (Gemini)
          </span>
        </div>

        {/* Side-by-side comparison: Handwriting crop vs KaTeX formula */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-black/50 p-4 rounded-2xl border border-white/5">
          {/* Left: Original handwriting thumbnail */}
          <div className="sm:col-span-5 flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wider">
              Chữ viết tay gốc:
            </span>
            <div className="w-full h-24 bg-white rounded-xl border border-cyan-500/30 flex items-center justify-center overflow-hidden p-1 shadow-md">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Chữ viết tay"
                  data-testid="ocr-review-thumb"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[11px] text-slate-400 font-mono">Nét chữ đã chọn</span>
              )}
            </div>
          </div>

          {/* Right: AI recognized formula (KaTeX) */}
          <div className="sm:col-span-7 flex flex-col">
            <span className="text-[10px] text-cyan-400 mb-1 font-mono uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI nhận diện được:
            </span>
            <div className="w-full min-h-[96px] bg-slate-950/90 rounded-2xl border border-cyan-500/40 flex items-center justify-center p-3 shadow-inner overflow-x-auto">
              <div
                data-testid="ocr-review-katex-display"
                className="text-2xl text-center text-cyan-100 font-medium tracking-wide"
              >
                <MathView latex={editedFormula || recognizedLatex} displayMode={true} />
              </div>
            </div>
          </div>
        </div>

        {/* 1-Tap Ambiguous OCR Tokens Swap Chips (Zero Virtual Keyboard Needed) */}
        {confusions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/40">
            <span className="text-[11px] font-medium text-amber-300 font-mono">
              Sửa nhanh lỗi nhận diện nhầm (1 chạm):
            </span>
            {confusions.map((conf) =>
              conf.alternatives.map((alt) => (
                <button
                  key={`${conf.token}-${alt}`}
                  type="button"
                  onClick={() => setEditedFormula((prev) => swapTokenInFormula(prev, conf.token, alt))}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-xs font-mono text-amber-200 transition cursor-pointer active:scale-95"
                  title={`Đổi ${conf.token} thành ${alt}`}
                >
                  {conf.token} ⇄ {alt}
                </button>
              ))
            )}
          </div>
        )}

        {/* Direct formula editor input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Sửa trực tiếp công thức (nếu cần):</span>
            <span className="text-[10px] text-cyan-400 font-mono">Gõ lại hoặc bấm chèn nhanh</span>
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              data-testid="ocr-review-input"
              type="text"
              value={editedFormula}
              onChange={(e) => setEditedFormula(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="VD: y = \int x^3 dx hoặc x = 5\cos(2\pi t + \pi/2)"
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-cyan-500/40 text-white text-sm font-mono focus:outline-none focus:border-cyan-300 shadow-inner transition"
            />
          </div>

          {/* Quick Math Keyboard Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-mono">Chèn nhanh:</span>
            {QUICK_MATH_SYMBOLS.map((sym) => (
              <button
                key={sym.label}
                type="button"
                onClick={() => handleInsertSymbol(sym.insert)}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-800/80 border border-cyan-500/30 text-cyan-300 font-medium text-xs transition cursor-pointer active:scale-95"
                title={`Chèn ${sym.label}`}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Alternatives */}
        {alternatives.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">Gợi ý khác:</span>
            {alternatives.map((alt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectAlternative(alt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                  editedFormula === alt
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            type="button"
            data-testid="ocr-cancel-btn"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5 inline mr-1" />
            Hủy bỏ
          </button>
          <button
            type="button"
            data-testid="ocr-confirm-btn"
            onClick={() => onConfirm(editedFormula.trim() || recognizedLatex)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 text-slate-950 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>✅ Đúng rồi, Đưa Lên Bảng!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
