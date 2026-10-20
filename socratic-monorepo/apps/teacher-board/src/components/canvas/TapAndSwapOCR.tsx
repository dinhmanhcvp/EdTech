'use client';

import React, { useState, useMemo } from 'react';
import { Edit3, Check, RefreshCw } from 'lucide-react';
import { findAmbiguousTokens, swapTokenInFormula } from '../../utils/ocrConfusions';

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

  // Detect ambiguous tokens (Z↔2, n↔π, etc.) for 1-tap correction without keyboard
  const confusions = useMemo(() => findAmbiguousTokens(selectedFormula), [selectedFormula]);

  const handleSelect = (alt: string) => {
    setSelectedFormula(alt);
    setEditInput(alt);
    onSwap(alt);
    setIsOpen(false);
  };

  const handleSwapToken = (target: string, repl: string) => {
    const updated = swapTokenInFormula(selectedFormula, target, repl);
    setSelectedFormula(updated);
    setEditInput(updated);
    onSwap(updated);
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
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#DCD9D0] shadow-xs">
          <input
            type="text"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            className="bg-transparent text-[#18181B] font-mono text-xs focus:outline-none w-56 font-semibold"
            placeholder="y = 2x + 1 hoặc y = x^2 - 4"
          />
          <button
            onClick={handleSaveEdit}
            className="p-1 rounded bg-[#18181B] hover:bg-stone-800 text-white transition cursor-pointer shadow-xs active:translate-y-px"
            title="Áp dụng công thức"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Clickable OCR Token Header */}
          <div
            data-testid="ocr-token"
            onClick={() => setIsOpen(!isOpen)}
            className="group flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] cursor-pointer transition select-none shadow-2xs"
            title="Chạm để đổi phương án OCR hoặc sửa công thức"
          >
            <span
              data-testid="current-formula-display"
              className="font-mono text-[#18181B] font-semibold text-xs tracking-tight"
            >
              {selectedFormula}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F2F0EA] text-stone-600 border border-[#E5E3DC] font-mono group-hover:text-stone-900 transition flex items-center gap-1 font-medium">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Swap</span>
            </span>
          </div>

          {/* Quick 1-tap Token Swap Chips */}
          {confusions.slice(0, 2).map((conf) =>
            conf.alternatives.slice(0, 1).map((alt) => (
              <button
                key={`${conf.token}-${alt}`}
                type="button"
                onClick={() => handleSwapToken(conf.token, alt)}
                title={`Đổi ${conf.token} thành ${alt}`}
                className="px-1.5 py-0.5 rounded-md bg-white hover:bg-stone-50 border border-[#DCD9D0] text-[10px] font-mono text-stone-600 hover:text-stone-900 transition cursor-pointer shadow-2xs active:translate-y-px"
              >
                {conf.token} ⇄ {alt}
              </button>
            ))
          )}

          {/* Quick Edit Button */}
          <button
            onClick={() => {
              setEditInput(selectedFormula);
              setIsEditing(true);
            }}
            className="p-1 rounded-md bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-600 hover:text-stone-900 transition cursor-pointer shadow-2xs active:translate-y-px"
            title="Sửa trực tiếp công thức"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Bubble Popover Menu */}
      {isOpen && !isEditing && (
        <div
          data-testid="ocr-bubble-menu"
          className="absolute z-50 left-0 top-full mt-1.5 w-80 p-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.12)] font-sans"
        >
          {confusions.length > 0 && (
            <div className="mb-2 pb-2 border-b border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest block mb-1">
                Sửa ký tự nhầm:
              </span>
              <div className="flex flex-wrap gap-1">
                {confusions.map((conf) =>
                  conf.alternatives.map((alt) => (
                    <button
                      key={`pop-${conf.token}-${alt}`}
                      type="button"
                      onClick={() => {
                        handleSwapToken(conf.token, alt);
                        setIsOpen(false);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-[10px] font-mono text-stone-700 cursor-pointer transition shadow-2xs"
                    >
                      {conf.token} ⇄ {alt}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
              Phương án thay thế:
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsEditing(true);
              }}
              className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer font-mono font-medium"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Tự nhập</span>
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {effectiveAlternatives.map((alt, idx) => (
              <button
                key={idx}
                data-testid={`ocr-alt-${idx}`}
                onClick={() => handleSelect(alt)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono text-stone-700 hover:text-[#18181B] hover:bg-[#F8F7F4] border border-transparent hover:border-[#E5E3DC] transition flex items-center justify-between cursor-pointer"
              >
                <span>{alt}</span>
                <span className="text-[10px] text-stone-500 font-mono px-1 py-0.2 rounded bg-[#F2F0EA] border border-[#E5E3DC]">
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
