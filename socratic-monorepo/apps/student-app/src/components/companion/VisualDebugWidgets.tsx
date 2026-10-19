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
      className="bg-black/50 p-4 rounded-3xl border border-white/10 flex flex-col items-center w-full shadow-2xl backdrop-blur-md"
    >
      <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between w-full px-2">
        <span className="flex items-center gap-1.5">
          <span>⚖️ Cân thăng bằng số nguyên tử:</span>
          <span className="text-cyan-300 font-bold">{elementName}</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">Chạm [+] / [-] trực tiếp trên đĩa cân</span>
      </div>

      <div className="w-full flex items-center justify-between px-8 py-5 relative min-h-[120px]">
        {/* Central Fulcrum Stand */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 w-4 h-14 bg-gradient-to-b from-slate-500 to-slate-700 rounded-t shadow-md z-0" />
        <div className="absolute left-1/2 top-14 -translate-x-1/2 w-16 h-3 bg-slate-600 rounded-full" />

        {/* Tilting Beam */}
        <div
          className="absolute left-8 right-8 top-6 h-2 bg-gradient-to-r from-cyan-500 via-slate-300 to-amber-500 rounded-full transition-transform duration-500 origin-center shadow-lg"
          style={{ transform: `rotate(${tiltAngle}deg)` }}
        />

        {/* Left Pan (rises or falls with tilt) */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-500"
          style={{ transform: `translateY(${-panOffset}px)` }}
        >
          <div className="w-32 bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-3 text-center shadow-2xl shadow-cyan-950/60 flex flex-col items-center">
            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">Vế Trái</div>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {leftAtomsCount} {elementName}
            </div>

            {/* Interactive Step Buttons for Left Pan */}
            {onAdjustLeft && (
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  data-testid="adjust-left-minus"
                  onClick={() => onAdjustLeft(-2)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-slate-200 transition cursor-pointer"
                  title="Giảm 1 phân tử (2 nguyên tử O)"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-left-plus"
                  onClick={() => onAdjustLeft(2)}
                  className="w-7 h-7 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/50 active:scale-95 text-xs font-bold text-cyan-200 border border-cyan-500/40 transition cursor-pointer"
                  title="Tăng 1 phân tử (2 nguyên tử O)"
                >
                  +
                </button>
              </div>
            )}

            {leftAtomsMap && Object.keys(leftAtomsMap).length > 1 && (
              <div className="mt-1 pt-1 border-t border-white/10 text-[9px] font-mono text-slate-400">
                {Object.entries(leftAtomsMap).map(([e, c]) => `${e}:${c}`).join(' ')}
              </div>
            )}
          </div>
        </div>

        {/* Right Pan (rises or falls with tilt) */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-500"
          style={{ transform: `translateY(${panOffset}px)` }}
        >
          <div className="w-32 bg-slate-900/95 border border-amber-500/50 rounded-2xl p-3 text-center shadow-2xl shadow-amber-950/60 flex flex-col items-center">
            <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Vế Phải</div>
            <div className="text-sm font-mono font-bold text-white mt-0.5">
              {rightAtomsCount} {elementName}
            </div>

            {/* Interactive Step Buttons for Right Pan */}
            {onAdjustRight && (
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  data-testid="adjust-right-minus"
                  onClick={() => onAdjustRight(-3)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-slate-200 transition cursor-pointer"
                  title="Giảm 1 phân tử (3 nguyên tử O)"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-right-plus"
                  onClick={() => onAdjustRight(3)}
                  className="w-7 h-7 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 active:scale-95 text-xs font-bold text-amber-200 border border-amber-500/40 transition cursor-pointer"
                  title="Tăng 1 phân tử (3 nguyên tử O)"
                >
                  +
                </button>
              </div>
            )}

            {rightAtomsMap && Object.keys(rightAtomsMap).length > 1 && (
              <div className="mt-1 pt-1 border-t border-white/10 text-[9px] font-mono text-slate-400">
                {Object.entries(rightAtomsMap).map(([e, c]) => `${e}:${c}`).join(' ')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono mt-2 text-center px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
        {diff === 0 ? (
          <span className="text-emerald-400 font-bold">✅ Cân bằng hoàn hảo! Hai vế cùng có {leftAtomsCount} {elementName}.</span>
        ) : (
          <span className="text-amber-300">⚠️ {feedbackText}</span>
        )}

        {diff === 0 && onApplyBalanced && (
          <button
            type="button"
            data-testid="apply-balanced-btn"
            onClick={onApplyBalanced}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
          >
            ✨ Điền vào bài làm
          </button>
        )}
      </div>
    </div>
  );
};
