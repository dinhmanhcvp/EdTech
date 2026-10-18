'use client';

import React, { useState } from 'react';
import { Delete, Send, ShieldAlert } from 'lucide-react';

export interface MathNumpadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MathNumpad: React.FC<MathNumpadProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Nhập công thức / hệ số...',
}: MathNumpadProps) => {
  const [pasteBlockedWarning, setPasteBlockedWarning] = useState(false);

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
      className="w-full max-w-md bg-slate-900/90 rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col gap-3 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Formula Input Box with Strict Anti-Cheat onPaste Blocking */}
      <div className="relative">
        <input
          data-testid="numpad-input"
          type="text"
          value={value}
          readOnly
          onPaste={handlePasteAttempt}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-mono text-base font-semibold focus:outline-none focus:border-cyan-400 select-none"
          style={{ userSelect: 'none' }}
        />
        {value.length > 0 && (
          <button
            data-testid="numpad-clear"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-white/10"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Anti-cheat banner warning if student attempts paste */}
      {pasteBlockedWarning && (
        <div
          data-testid="paste-blocked-alert"
          className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>Chống gian lận: Tính năng dán (Paste) bị vô hiệu hóa để kích hoạt tư duy chủ động!</span>
        </div>
      )}

      {/* Touch-Friendly Virtual Math Keys */}
      <div className="grid grid-cols-5 gap-2">
        {keys.map((row, rIdx) =>
          row.map((char, cIdx) => (
            <button
              key={`${rIdx}-${cIdx}`}
              data-testid={`key-${char}`}
              onClick={() => handleKeyPress(char)}
              disabled={disabled}
              className="h-11 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 font-mono text-base font-bold text-slate-200 transition flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {char}
            </button>
          ))
        )}
      </div>

      {/* Bottom Action Row: Backspace & Submit */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          data-testid="numpad-backspace"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-sm font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
        >
          <Delete className="w-4 h-4" />
          <span>Xóa lùi</span>
        </button>

        <button
          data-testid="numpad-submit"
          onClick={() => onSubmit(value)}
          disabled={disabled || value.trim().length === 0}
          className="h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-95 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          <span>Kiểm tra</span>
        </button>
      </div>
    </div>
  );
};
