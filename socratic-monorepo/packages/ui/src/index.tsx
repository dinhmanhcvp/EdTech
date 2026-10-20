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
    <div className="bg-[#F4F3EE] border border-[#E5E3DC] p-3 rounded-lg flex flex-col justify-between transition-colors hover:border-[#DCD9D0] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-stone-700 font-sans font-medium tracking-tight text-[11px]">{label}</span>
        <span className="font-mono tabular-nums text-blue-600 text-xs font-semibold">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="w-6 h-6 rounded-md bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px flex items-center justify-center text-xs font-mono transition cursor-pointer"
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
          className="flex-1 h-1 bg-[#E5E3DC] rounded appearance-none cursor-pointer accent-blue-600"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="w-6 h-6 rounded-md bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px flex items-center justify-center text-xs font-mono transition cursor-pointer"
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
      className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-colors border shadow-sm cursor-pointer ${
        isOpen
          ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
          : 'bg-white text-stone-700 border-[#E6E4DD] hover:bg-[#F8F7F4] hover:border-[#DCD9D0]'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      <span>Gợi ý Socratic</span>
    </button>
  );
};
