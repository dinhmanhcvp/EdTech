/**
 * Feature 6.3: Visual Debugging Widget - Chemical Balance Scale
 * When SymPy or ChemBalancer detects an error, the scale tilts proportionally
 * to atom imbalance, allowing student to visually perceive and correct stoichiometry.
 */
import React from 'react';

export interface ChemicalBalanceScaleProps {
  leftAtomsCount: number;
  rightAtomsCount: number;
  elementName: string;
  feedbackText: string;
  leftAtomsMap?: Record<string, number>;
  rightAtomsMap?: Record<string, number>;
  onAdjustLeft?: (delta: number) => void;
  onAdjustRight?: (delta: number) => void;
  onApplyBalanced?: () => void;
}

export const ChemicalBalanceScale: React.FC<ChemicalBalanceScaleProps> = ({
  leftAtomsCount,
  rightAtomsCount,
  elementName,
  feedbackText,
  leftAtomsMap,
  rightAtomsMap,
  onAdjustLeft,
  onAdjustRight,
  onApplyBalanced,
}: ChemicalBalanceScaleProps) => {
  const diff = rightAtomsCount - leftAtomsCount;
  // Tilt angle: positive = tilts right (right heavier)
  const tiltAngle = Math.min(Math.max(diff * 6, -15), 15);
  // Pan vertical displacement connected to beam tilt
  const panOffset = Math.round(Math.tan((tiltAngle * Math.PI) / 180) * 100);

  return (
    <div
      data-testid="chemical-balance-scale"
      className="bg-white/95 p-4 rounded-xl border border-[#E6E4DD] flex flex-col items-center w-full shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] font-sans"
    >
      <div className="text-[11px] font-mono text-stone-500 mb-2 flex items-center justify-between w-full px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>Cân thăng bằng số nguyên tử:</span>
          <span className="text-[#18181B] font-semibold">{elementName}</span>
        </span>
        <span className="text-[10px] text-stone-400 font-mono">Chạm [+] / [-] trực tiếp trên đĩa cân</span>
      </div>

      <div className="w-full flex items-center justify-between px-8 py-5 relative min-h-[120px]">
        {/* Central Fulcrum Stand */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 w-3.5 h-14 bg-stone-300 rounded-t z-0" />
        <div className="absolute left-1/2 top-14 -translate-x-1/2 w-14 h-2.5 bg-stone-400 rounded-full" />

        {/* Tilting Beam */}
        <div
          className="absolute left-8 right-8 top-6 h-1.5 bg-stone-500 rounded-full transition-transform duration-300 origin-center"
          style={{ transform: `rotate(${tiltAngle}deg)` }}
        />

        {/* Left Pan (rises or falls with tilt) */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-300"
          style={{ transform: `translateY(${-panOffset}px)` }}
        >
          <div className="w-32 bg-[#F4F3EE] border border-[#E5E3DC] rounded-xl p-2.5 text-center shadow-xs flex flex-col items-center">
            <div className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-semibold">Vế Trái</div>
            <div className="text-sm font-mono font-bold text-[#18181B] mt-0.5 tabular-nums">
              {leftAtomsCount} {elementName}
            </div>

            {/* Interactive Step Buttons for Left Pan */}
            {onAdjustLeft && (
              <div className="flex items-center gap-1.5 mt-2 font-mono">
                <button
                  type="button"
                  data-testid="adjust-left-minus"
                  onClick={() => onAdjustLeft(-2)}
                  className="w-6 h-6 rounded-md bg-white hover:bg-stone-50 active:translate-y-px text-xs font-semibold text-stone-700 border border-[#DCD9D0] transition cursor-pointer shadow-2xs"
                  title="Giảm 1 phân tử (2 nguyên tử O)"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-left-plus"
                  onClick={() => onAdjustLeft(2)}
                  className="w-6 h-6 rounded-md bg-white hover:bg-stone-50 active:translate-y-px text-xs font-semibold text-blue-600 border border-[#DCD9D0] transition cursor-pointer shadow-2xs"
                  title="Tăng 1 phân tử (2 nguyên tử O)"
                >
                  +
                </button>
              </div>
            )}

            {leftAtomsMap && Object.keys(leftAtomsMap).length > 1 && (
              <div className="mt-1 pt-1 border-t border-[#E5E3DC] text-[9px] font-mono text-stone-500">
                {Object.entries(leftAtomsMap).map(([e, c]) => `${e}:${c}`).join(' ')}
              </div>
            )}
          </div>
        </div>

        {/* Right Pan (rises or falls with tilt) */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-300"
          style={{ transform: `translateY(${panOffset}px)` }}
        >
          <div className="w-32 bg-[#F4F3EE] border border-[#E5E3DC] rounded-xl p-2.5 text-center shadow-xs flex flex-col items-center">
            <div className="text-[10px] text-rose-600 font-mono uppercase tracking-wider font-semibold">Vế Phải</div>
            <div className="text-sm font-mono font-bold text-[#18181B] mt-0.5 tabular-nums">
              {rightAtomsCount} {elementName}
            </div>

            {/* Interactive Step Buttons for Right Pan */}
            {onAdjustRight && (
              <div className="flex items-center gap-1.5 mt-2 font-mono">
                <button
                  type="button"
                  data-testid="adjust-right-minus"
                  onClick={() => onAdjustRight(-3)}
                  className="w-6 h-6 rounded-md bg-white hover:bg-stone-50 active:translate-y-px text-xs font-semibold text-stone-700 border border-[#DCD9D0] transition cursor-pointer shadow-2xs"
                  title="Giảm 1 phân tử (3 nguyên tử O)"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-right-plus"
                  onClick={() => onAdjustRight(3)}
                  className="w-6 h-6 rounded-md bg-white hover:bg-stone-50 active:translate-y-px text-xs font-semibold text-rose-600 border border-[#DCD9D0] transition cursor-pointer shadow-2xs"
                  title="Tăng 1 phân tử (3 nguyên tử O)"
                >
                  +
                </button>
              </div>
            )}

            {rightAtomsMap && Object.keys(rightAtomsMap).length > 1 && (
              <div className="mt-1 pt-1 border-t border-[#E5E3DC] text-[9px] font-mono text-stone-500">
                {Object.entries(rightAtomsMap).map(([e, c]) => `${e}:${c}`).join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono mt-2 text-center px-3 py-1.5 rounded-lg bg-[#F8F7F4] border border-[#E5E3DC] flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
        {diff === 0 ? (
          <span className="text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Cân bằng hoàn hảo! Hai vế cùng có {leftAtomsCount} {elementName}.</span>
          </span>
        ) : (
          <span className="text-amber-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{feedbackText}</span>
          </span>
        )}

        {diff === 0 && onApplyBalanced && (
          <button
            type="button"
            data-testid="apply-balanced-btn"
            onClick={onApplyBalanced}
            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer active:translate-y-px shadow-xs"
          >
            Điền vào bài làm
          </button>
        )}
      </div>
    </div>
  );
};
