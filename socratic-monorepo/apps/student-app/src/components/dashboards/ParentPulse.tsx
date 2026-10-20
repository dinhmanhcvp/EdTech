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
  const [showCheer, setShowCheer] = React.useState(false);

  const handleSendFireworks = () => {
    setShowCheer(true);
    setTimeout(() => setShowCheer(false), 3500);
  };

  return (
    <div className="w-[390px] bg-white/95 border border-[#E6E4DD] rounded-xl p-5 flex flex-col gap-4 text-[#18181B] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] relative font-sans">
      {/* Celebratory Fireworks Toast */}
      {showCheer && (
        <div
          data-testid="cheer-toast"
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-lg bg-[#18181B] text-white font-medium text-xs shadow-xl flex items-center gap-2 animate-in fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Đã bắn pháo hoa & lời nhắn yêu thương đến app của {studentName}!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-xs text-[#18181B]">Parent Pulse (Nhịp đập Gia đình)</div>
          <div className="text-[11px] text-stone-500">Học sinh: {studentName}</div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F2F0EA] text-stone-600 border border-[#E5E3DC]">
          Hôm nay
        </span>
      </div>

      {/* 15s Audio/Text Digest Pill */}
      <div className="p-3 rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
          <div>
            <div className="font-semibold text-[11px] text-stone-800">15s Audio/Text Digest:</div>
            <div className="text-[10px] text-stone-600 leading-tight mt-0.5 font-serif italic">
              &quot;Hôm nay con tự vượt qua bài toán cân bằng sau 3 lần thử. Điểm kiên trì: Xuất sắc!&quot;
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid="btn-cheer-fireworks"
          onClick={handleSendFireworks}
          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 active:translate-y-px text-white text-[11px] font-medium transition cursor-pointer shrink-0 shadow-xs"
          title="Bắn pháo hoa động viên con"
        >
          Bắn pháo hoa
        </button>
      </div>

      {/* Grit Score Card */}
      <div className="bg-[#F4F3EE] p-3.5 rounded-xl border border-[#E5E3DC] flex items-center justify-between">
        <div>
          <div className="text-[11px] text-stone-500 font-medium">Chỉ số Nỗ lực Vượt khó (Grit)</div>
          <div className="text-xl font-mono tabular-nums font-bold text-[#18181B] mt-0.5">{gritScore} / 100</div>
          <div className="text-[10px] font-mono text-emerald-600 mt-0.5 font-semibold">↑ Tăng 12% so với tuần trước</div>
        </div>
        <div className="w-12 h-12 rounded-lg border border-[#DCD9D0] bg-white flex items-center justify-center text-xs font-mono font-bold text-stone-800 shadow-2xs">
          Top 5%
        </div>
      </div>

      {/* Narrative Story Insight */}
      <div className="bg-[#F4F3EE] p-3.5 rounded-xl border border-[#E5E3DC] text-xs leading-relaxed text-stone-700">
        <div className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>Bản tin kể chuyện:</span>
        </div>
        <p className="text-[11px] text-stone-600 font-serif italic">{narrativeText}</p>
      </div>

      {/* Conversation Starters */}
      <div className="bg-[#FFFBEB] p-3.5 rounded-xl border border-[#FDE68A] text-xs">
        <div className="font-semibold text-[#92400E] mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Gợi ý trò chuyện cùng con:</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-stone-700 font-serif italic">
          {conversationStarters.map((q: string, idx: number) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-amber-600 font-mono not-italic">•</span>
              <span>&quot;{q}&quot;</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
