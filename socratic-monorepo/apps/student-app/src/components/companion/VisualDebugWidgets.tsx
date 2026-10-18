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
}

export const ChemicalBalanceScale: React.FC<ChemicalBalanceScaleProps> = ({
  leftAtomsCount,
  rightAtomsCount,
  elementName,
  feedbackText,
}: ChemicalBalanceScaleProps) => {
  const diff = rightAtomsCount - leftAtomsCount;
  // Tilt angle: positive = tilts right (right heavier)
  const tiltAngle = Math.min(Math.max(diff * 6, -15), 15);

  return (
    <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 flex flex-col items-center">
      <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1">
        <span>⚖️ Cân thăng bằng số nguyên tử: {elementName}</span>
      </div>

      <div className="w-full flex items-center justify-between px-6 py-4 relative">
        {/* Beam */}
        <div
          className="absolute left-6 right-6 top-6 h-1.5 bg-slate-400 rounded transition-transform duration-500 origin-center"
          style={{ transform: `rotate(${tiltAngle}deg)` }}
        />
        <div className="absolute left-1/2 top-4 -translate-x-1/2 w-3.5 h-10 bg-slate-500 rounded-t" />

        {/* Left Pan */}
        <div className="z-10 flex flex-col items-center">
          <div className="w-24 bg-slate-800/90 border border-cyan-500/40 rounded-xl p-2.5 text-center shadow-lg">
            <div className="text-[10px] text-cyan-300 font-bold uppercase">Vế Trái</div>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {leftAtomsCount} {elementName}
            </div>
          </div>
        </div>

        {/* Right Pan */}
        <div className="z-10 flex flex-col items-center">
          <div className="w-24 bg-slate-800/90 border border-amber-500/40 rounded-xl p-2.5 text-center shadow-lg">
            <div className="text-[10px] text-amber-300 font-bold uppercase">Vế Phải</div>
            <div className="text-xs font-mono font-bold text-white mt-1">
              {rightAtomsCount} {elementName}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-amber-300 mt-2 text-center">
        {diff === 0 ? '✅ Cân bằng hoàn hảo!' : `⚠️ ${feedbackText}`}
      </div>
    </div>
  );
};
