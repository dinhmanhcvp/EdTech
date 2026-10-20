'use client';

import React, { useState } from 'react';
import { Delete, Send, ShieldAlert } from 'lucide-react';

export interface MathNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  tokenChips?: string[];
}

export const MathNumpad: React.FC<MathNumpadProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Nhập công thức / hệ số...',
  tokenChips,
}: MathNumpadProps) => {
  const [pasteBlockedWarning, setPasteBlockedWarning] = useState(false);

  const defaultTokens = ['4Fe', '3O₂', '2Fe₂O₃', 'gt²', '½', 'v₀', 'cos(α)'];
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
    setTimeout(() => setPasteBlockedWarning(false), 3000);
  };

  const keys = [
    ['7', '8', '9', '+', 'Fe'],
    ['4', '5', '6', '-', 'O₂'],
    ['1', '2', '3', '→', 'Fe₂O₃'],
    ['0', '.', '=', '(', ')'],
  ];

  return (
    <div
      data-testid="math-numpad"
      className="w-full max-w-md bg-white/95 rounded-xl p-4 border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] flex flex-col gap-3 select-none font-sans"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Context Token Chips */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F4F3EE] rounded-lg border border-[#E5E3DC]">
        <span className="text-[10px] font-mono text-stone-500 px-1 font-medium shrink-0">
          Token nhanh:
        </span>
        {effectiveTokens.map((token) => (
          <button
            key={token}
            type="button"
            data-testid={`token-chip-${token}`}
            onClick={() => handleKeyPress(token)}
            disabled={disabled}
            className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] font-mono text-xs text-blue-600 font-medium transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            {token}
          </button>
        ))}
      </div>

      {/* Formula Input Box with Strict Anti-Cheat onPaste Blocking */}
      <div className="relative">
        <input
          data-testid="numpad-input"
          type="text"
          value={value}
          readOnly
          onPaste={handlePasteAttempt}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 rounded-lg bg-[#FCFBF9] border border-[#DCD9D0] text-blue-700 font-mono text-sm font-semibold focus:outline-none focus:border-blue-500 select-none shadow-inner"
          style={{ userSelect: 'none' }}
        />
        {value.length > 0 && (
          <button
            data-testid="numpad-clear"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-600 hover:text-stone-900 px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 transition"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Anti-cheat banner warning if student attempts paste */}
      {pasteBlockedWarning && (
        <div
          data-testid="paste-blocked-alert"
          className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa để kích hoạt tư duy chủ động!</span>
        </div>
      )}

      {/* Touch-Friendly Virtual Math Keys (Tactile Porcelain Keycaps) */}
      <div className="grid grid-cols-5 gap-1.5">
        {keys.map((row, rIdx) =>
          row.map((char, cIdx) => (
            <button
              key={`${rIdx}-${cIdx}`}
              data-testid={`key-${char}`}
              onClick={() => handleKeyPress(char)}
              disabled={disabled}
              className="h-10 rounded-lg bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] font-mono text-xs font-semibold text-stone-800 transition flex items-center justify-center cursor-pointer disabled:opacity-40 shadow-2xs"
            >
              {char}
            </button>
          ))
        )}
      </div>

      {/* Bottom Action Row: Backspace & Submit */}
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        <button
          data-testid="numpad-backspace"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="h-9 rounded-lg bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-xs font-medium text-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-2xs"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>Xóa lùi</span>
        </button>

        <button
          data-testid="numpad-submit"
          onClick={() => onSubmit(value)}
          disabled={disabled || value.trim().length === 0}
          className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 active:translate-y-px text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kiểm tra</span>
        </button>
      </div>
    </div>
  );
};
