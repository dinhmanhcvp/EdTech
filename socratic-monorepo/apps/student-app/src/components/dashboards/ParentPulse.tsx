/**
 * Touchpoint 4: Parent Pulse (Mobile Web / Mini App)
 * Shows student Grit Score (effort and resilience), narrative insights,
 * and dinner conversation starter questions.
 */
import React from 'react';

export interface ParentPulseProps {
  studentName: string;
  gritScore: number;
  narrativeText: string;
  conversationStarters: string[];
}

export const ParentPulse: React.FC<ParentPulseProps> = ({
  studentName,
  gritScore,
  narrativeText,
  conversationStarters,
}: ParentPulseProps) => {
  return (
    <div className="w-[390px] bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-white/10 flex flex-col gap-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-sm text-white">Parent Pulse (Nhịp đập Gia đình)</div>
          <div className="text-[11px] text-slate-400">Học sinh: {studentName}</div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
          Hôm nay
        </span>
      </div>

      {/* Grit Score Card */}
      <div className="bg-gradient-to-tr from-pink-950/40 to-indigo-950/40 p-4 rounded-2xl border border-pink-500/20 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-pink-300 font-semibold">Chỉ số Nỗ lực Vượt khó (Grit)</div>
          <div className="text-2xl font-extrabold text-white mt-0.5">{gritScore} / 100</div>
          <div className="text-[10px] text-emerald-400 mt-1">↑ Tăng 12% so với tuần trước</div>
        </div>
        <div className="w-14 h-14 rounded-full border-4 border-pink-500 flex items-center justify-center text-xs font-mono font-bold text-pink-200">
          Top 5%
        </div>
      </div>

      {/* Narrative Story Insight */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs leading-relaxed text-slate-300">
        <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
          <span>✨ Bản tin kể chuyện:</span>
        </div>
        <p className="text-[11px]">{narrativeText}</p>
      </div>

      {/* Conversation Starters */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-xs">
        <div className="font-bold text-slate-200 mb-2">
          <span>💬 Gợi ý trò chuyện cùng con:</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          {conversationStarters.map((q: string, idx: number) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">•</span>
              <span>"{q}"</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
