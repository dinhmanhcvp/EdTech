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
    <div className="bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="font-mono text-cyan-400 font-bold">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center font-bold text-slate-200 border border-white/10"
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
          className="flex-1 h-2.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        <button
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center font-bold text-slate-200 border border-white/10"
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
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
        isOpen
          ? 'bg-amber-500 text-white scale-105'
          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse hover:scale-110'
      }`}
    >
      💡
    </button>
  );
};
