'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X, CheckCheck } from 'lucide-react';
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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <CheckCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2 tracking-tight">
                Kiểm tra kết quả nhận diện (OCR)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Xác nhận công thức toán học trước khi chuyển sang mô phỏng
              </p>
            </div>
          </div>
          <span
            data-testid="ocr-confidence-badge"
            className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-zinc-950 text-emerald-400 border border-zinc-800 font-medium inline-flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {percent}% Tin cậy
          </span>
        </div>

        {/* Side-by-side comparison: Handwriting crop vs KaTeX formula */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-zinc-950 p-3 rounded-md border border-zinc-800/80">
          {/* Left: Original handwriting thumbnail */}
          <div className="sm:col-span-5 flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 mb-1 font-mono uppercase tracking-widest">
              Nét chữ viết tay:
            </span>
            <div className="w-full h-20 bg-white rounded border border-zinc-800 flex items-center justify-center overflow-hidden p-1 shadow-sm">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Chữ viết tay"
                  data-testid="ocr-review-thumb"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[11px] text-zinc-400 font-mono">Nét chữ đã chọn</span>
              )}
            </div>
          </div>

          {/* Right: AI recognized formula (KaTeX) */}
          <div className="sm:col-span-7 flex flex-col">
            <span className="text-[10px] text-zinc-500 mb-1 font-mono uppercase tracking-widest">
              Công thức dịch được:
            </span>
            <div className="w-full min-h-[80px] bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center p-3 overflow-x-auto">
              <div
                data-testid="ocr-review-katex-display"
                className="text-xl text-center text-zinc-100 font-medium"
              >
                <MathView latex={editedFormula || recognizedLatex} displayMode={true} />
              </div>
            </div>
          </div>
        </div>

        {/* 1-Tap Ambiguous OCR Tokens Swap Chips */}
        {confusions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 font-mono">
              Sửa ký tự nhầm:
            </span>
            {confusions.map((conf) =>
              conf.alternatives.map((alt) => (
                <button
                  key={`${conf.token}-${alt}`}
                  type="button"
                  onClick={() => setEditedFormula((prev) => swapTokenInFormula(prev, conf.token, alt))}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition cursor-pointer"
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
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Sửa trực tiếp:</span>
            <span className="text-[10px] text-zinc-500 font-mono">Bấm chèn nhanh hoặc gõ lại</span>
          </label>
          <input
            ref={inputRef}
            data-testid="ocr-review-input"
            type="text"
            value={editedFormula}
            onChange={(e) => setEditedFormula(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="VD: y = \int x^3 dx hoặc x = 5\cos(2\pi t + \pi/2)"
            className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-zinc-600 transition"
          />

          {/* Quick Math Keyboard Chips */}
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <span className="text-[10px] text-zinc-500 font-mono">Ký hiệu:</span>
            {QUICK_MATH_SYMBOLS.map((sym) => (
              <button
                key={sym.label}
                type="button"
                onClick={() => handleInsertSymbol(sym.insert)}
                className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono transition cursor-pointer"
                title={`Chèn ${sym.label}`}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Alternatives */}
        {alternatives.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-mono">Gợi ý khác:</span>
            {alternatives.map((alt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectAlternative(alt)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition cursor-pointer ${
                  editedFormula === alt
                    ? 'bg-zinc-800 text-sky-400 font-semibold border border-zinc-700'
                    : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <button
            type="button"
            data-testid="ocr-cancel-btn"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            data-testid="ocr-confirm-btn"
            onClick={() => onConfirm(editedFormula.trim() || recognizedLatex)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Xác nhận đưa lên bảng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
