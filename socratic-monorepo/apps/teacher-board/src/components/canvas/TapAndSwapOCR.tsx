'use client';

import React, { useState } from 'react';
import { Edit3, Check, RefreshCw } from 'lucide-react';

export interface TapAndSwapOCRProps {
  formula: string;
  alternatives?: string[];
  onSwap: (newFormula: string) => void;
  className?: string;
}

export const TapAndSwapOCR: React.FC<TapAndSwapOCRProps> = ({
  formula,
  alternatives = [],
  onSwap,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(formula);
  const [editInput, setEditInput] = useState(formula);

  const defaultMathAlternatives = [
    'y = 2x + 1',
    'y = x^2 - 4',
    'y = x^3 - 3x',
    'y = 2\\sin(3x)',
    '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
  ].filter((alt) => alt !== selectedFormula);

  const effectiveAlternatives = alternatives.length > 0
    ? alternatives.filter((a) => a !== selectedFormula)
    : defaultMathAlternatives;

  const handleSelect = (alt: string) => {
    setSelectedFormula(alt);
    setEditInput(alt);
    onSwap(alt);
    setIsOpen(false);
  };

  const handleSaveEdit = () => {
    if (editInput.trim()) {
      setSelectedFormula(editInput.trim());
      onSwap(editInput.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {isEditing ? (
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-cyan-400 shadow-xl">
          <input
            type="text"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            autoFocus
            className="bg-transparent text-cyan-300 font-mono text-sm focus:outline-none w-56"
            placeholder="VD: y = 2x + 1 hoặc y = x^2 - 4"
          />
          <button
            onClick={handleSaveEdit}
            className="p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer"
            title="Áp dụng công thức"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Clickable OCR Token Header */}
          <div
            data-testid="ocr-token"
            onClick={() => setIsOpen(!isOpen)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 border border-white/20 hover:border-cyan-400 cursor-pointer transition select-none"
            title="Chạm để đổi phương án OCR hoặc sửa công thức"
          >
            <span
              data-testid="current-formula-display"
              className="font-mono text-cyan-300 font-semibold text-base"
            >
              {selectedFormula}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-sans group-hover:bg-cyan-500 group-hover:text-black transition flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Tap & Swap</span>
            </span>
          </div>

          {/* Quick Edit Button */}
          <button
            onClick={() => {
              setEditInput(selectedFormula);
              setIsEditing(true);
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
            title="Sửa trực tiếp công thức"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bubble Popover Menu */}
      {isOpen && !isEditing && (
        <div
          data-testid="ocr-bubble-menu"
          className="absolute z-50 left-0 top-full mt-2 w-80 p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Phương án OCR thay thế:
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsEditing(true);
              }}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Tự nhập</span>
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {effectiveAlternatives.map((alt, idx) => (
              <button
                key={idx}
                data-testid={`ocr-alt-${idx}`}
                onClick={() => handleSelect(alt)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono text-slate-200 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400/50 border border-transparent transition flex items-center justify-between cursor-pointer"
              >
                <span>{alt}</span>
                <span className="text-[10px] text-cyan-400 font-sans px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  Chọn
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
