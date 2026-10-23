'use client';

import React, { useState } from 'react';
import { Delete, Send, ShieldAlert, Sparkles } from 'lucide-react';

import { FormulaBlock } from '../ui/MathText';

export interface MathNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tokenChips?: string[];
  customKeys?: string[][];
}

export const MathNumpad: React.FC<MathNumpadProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Nhập công thức / biểu thức...',
  tokenChips,
  customKeys,
}) => {
  const [pasteBlockedWarning, setPasteBlockedWarning] = useState(false);

  const defaultTokens = ['4Fe', '3O_2', '2Fe_2O_3', 'g\\sin(\\alpha)', '\\mu mg\\cos(\\alpha)', 'm = 0', 'S = 6'];
  const effectiveTokens = tokenChips && tokenChips.length > 0 ? tokenChips : defaultTokens;

  const handleKeyPress = (char: string) => {
    if (disabled) return;
    onChange(value + char);
  };

  const handleBackspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
  };

  const handlePasteAttempt = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setPasteBlockedWarning(true);
    setTimeout(() => setPasteBlockedWarning(false), 4500);
  };

  const defaultKeys = [
    ['7', '8', '9', '+', 'Fe'],
    ['4', '5', '6', '-', 'O₂'],
    ['1', '2', '3', '→', 'Fe₂O₃'],
    ['0', '.', '=', '(', ')'],
  ];

  const keys = customKeys && customKeys.length > 0 ? customKeys : defaultKeys;

  return (
    <div
      data-testid="math-numpad"
      className="w-full bg-white rounded-xl p-3.5 border border-[#E6E4DD] shadow-xs flex flex-col gap-2.5 font-sans select-none"
    >
      {/* Context Token Keycaps Bar: Renders typeset formulas */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD]">
        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider font-semibold px-1 shrink-0">
          Token nhanh:
        </span>
        {effectiveTokens.map((token) => (
          <button
            key={token}
            type="button"
            data-testid={`token-chip-${token}`}
            onClick={() => handleKeyPress(token)}
            disabled={disabled}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-xs text-blue-700 font-medium transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <FormulaBlock latex={token} />
          </button>
        ))}
      </div>

      {/* Live Typeset Math Preview Bar (Textbook Render) */}
      {value.length > 0 && (
        <div
          data-testid="live-math-preview-bar"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-200 text-stone-900 text-xs shadow-2xs"
        >
          <span className="text-[10px] font-mono text-blue-700 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Xem trước công thức:</span>
          </span>
          <div className="overflow-x-auto text-sm font-semibold">
            <FormulaBlock latex={value} />
          </div>
        </div>
      )}

      {/* Formula Input Box with Strict Anti-Cheat onPaste Blocking */}
      <div className="relative">
        <input
          data-testid="numpad-input"
          type="text"
          value={value}
          readOnly
          onPaste={handlePasteAttempt}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#FCFBF9] border border-[#DCD9D0] text-stone-900 font-mono text-sm font-semibold focus:outline-none focus:border-blue-500 select-none shadow-inner"
        />
        {value.length > 0 && (
          <button
            data-testid="numpad-clear"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-500 hover:text-stone-900 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 transition cursor-pointer"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Anti-cheat banner warning if student attempts paste */}
      {pasteBlockedWarning && (
        <div
          data-testid="paste-blocked-alert"
          className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-in fade-in"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa. Chế độ Rèn luyện Tư duy: Hệ thống khóa sao chép để giúp bạn tự xây dựng bước giải. Hãy sử dụng các thẻ ký hiệu gợi ý bên dưới.
          </span>
        </div>
      )}

      {/* Tactile Virtual Math Keys */}
      <div className="grid grid-cols-5 gap-1.5">
        {keys.map((row, rIdx) =>
          row.map((char, cIdx) => (
            <button
              key={`${rIdx}-${cIdx}`}
              data-testid={`key-${char}`}
              onClick={() => handleKeyPress(char)}
              disabled={disabled}
              className="h-9 rounded-lg bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] font-mono text-xs font-semibold text-stone-800 transition flex items-center justify-center cursor-pointer disabled:opacity-40 shadow-2xs"
            >
              {char}
            </button>
          ))
        )}
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        <button
          type="button"
          data-testid="numpad-backspace"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="h-9 rounded-lg bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-xs font-medium text-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-2xs"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>Xóa lùi</span>
        </button>

        <button
          type="button"
          data-testid="numpad-submit"
          onClick={() => onSubmit(value)}
          disabled={disabled || value.trim().length === 0}
          className="h-9 rounded-lg bg-[#18181B] hover:bg-stone-800 active:translate-y-px text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kiểm tra</span>
        </button>
      </div>
    </div>
  );
};
