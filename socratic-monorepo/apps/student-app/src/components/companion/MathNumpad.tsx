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
      className="w-full max-w-md bg-zinc-900/90 rounded-lg p-4 border border-zinc-800 shadow-xl flex flex-col gap-3 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Context Token Chips */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-950 rounded-md border border-zinc-800/80">
        <span className="text-[10px] font-mono text-zinc-400 px-1 font-medium shrink-0">
          Token nhanh:
        </span>
        {effectiveTokens.map((token) => (
          <button
            key={token}
            type="button"
            data-testid={`token-chip-${token}`}
            onClick={() => handleKeyPress(token)}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 font-mono text-xs text-sky-400 transition cursor-pointer disabled:opacity-40"
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
          className="w-full px-3.5 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-sky-400 font-mono text-sm font-semibold focus:outline-none focus:border-zinc-700 select-none"
          style={{ userSelect: 'none' }}
        />
        {value.length > 0 && (
          <button
            data-testid="numpad-clear"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 hover:text-zinc-100 px-2 py-0.5 rounded bg-zinc-800"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Anti-cheat banner warning if student attempts paste */}
      {pasteBlockedWarning && (
        <div
          data-testid="paste-blocked-alert"
          className="flex items-center gap-2 p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa để kích hoạt tư duy chủ động!</span>
        </div>
      )}

      {/* Touch-Friendly Virtual Math Keys */}
      <div className="grid grid-cols-5 gap-1.5">
        {keys.map((row, rIdx) =>
          row.map((char, cIdx) => (
            <button
              key={`${rIdx}-${cIdx}`}
              data-testid={`key-${char}`}
              onClick={() => handleKeyPress(char)}
              disabled={disabled}
              className="h-10 rounded-md bg-zinc-950 hover:bg-zinc-800 active:scale-95 border border-zinc-800/90 font-mono text-xs font-medium text-zinc-200 transition flex items-center justify-center cursor-pointer disabled:opacity-40"
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
          className="h-9 rounded-md bg-zinc-950 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>Xóa lùi</span>
        </button>

        <button
          data-testid="numpad-submit"
          onClick={() => onSubmit(value)}
          disabled={disabled || value.trim().length === 0}
          className="h-9 rounded-md bg-zinc-100 hover:bg-white active:scale-95 text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Kiểm tra</span>
        </button>
      </div>
    </div>
  );
};
