import React from 'react';

export interface MacroSliderProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

export const MacroSlider: React.FC<MacroSliderProps> = ({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: MacroSliderProps) => {
  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 p-2.5 rounded-md flex flex-col justify-between transition-colors hover:border-zinc-700/80">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-zinc-300 font-medium tracking-tight text-[11px]">{label}</span>
        <span className="font-mono tabular-nums text-sky-400 text-xs font-semibold">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="w-6 h-6 rounded bg-zinc-900 hover:bg-zinc-800 active:scale-95 flex items-center justify-center text-xs font-mono text-zinc-300 border border-zinc-800 transition"
        >
          -
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-sky-400"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="w-6 h-6 rounded bg-zinc-900 hover:bg-zinc-800 active:scale-95 flex items-center justify-center text-xs font-mono text-zinc-300 border border-zinc-800 transition"
        >
          +
        </button>
      </div>
    </div>
  );
};

export interface SocraticCueButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const SocraticCueButton: React.FC<SocraticCueButtonProps> = ({
  isOpen,
  onClick,
}: SocraticCueButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-colors border ${
        isOpen
          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      <span>Gợi ý Socratic</span>
    </button>
  );
};
