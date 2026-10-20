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
    <div className="w-[390px] bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-4 text-zinc-100 shadow-xl relative">
      {/* Celebratory Fireworks Toast */}
      {showCheer && (
        <div
          data-testid="cheer-toast"
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-md bg-zinc-100 text-zinc-950 font-medium text-xs shadow-xl flex items-center gap-2 animate-in fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Đã bắn pháo hoa & lời nhắn yêu thương đến app của {studentName}!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-xs text-zinc-100">Parent Pulse (Nhịp đập Gia đình)</div>
          <div className="text-[11px] text-zinc-400">Học sinh: {studentName}</div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
          Hôm nay
        </span>
      </div>

      {/* 15s Audio/Text Digest Pill */}
      <div className="p-3 rounded-md bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
          <div>
            <div className="font-medium text-[11px] text-zinc-300">15s Audio/Text Digest:</div>
            <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
              &quot;Hôm nay con tự vượt qua bài toán cân bằng sau 3 lần thử. Điểm kiên trì: Xuất sắc!&quot;
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid="btn-cheer-fireworks"
          onClick={handleSendFireworks}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-[11px] font-medium border border-zinc-700 transition cursor-pointer shrink-0"
          title="Bắn pháo hoa động viên con"
        >
          Bắn pháo hoa
        </button>
      </div>

      {/* Grit Score Card */}
      <div className="bg-zinc-950 p-3.5 rounded-md border border-zinc-800 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-zinc-400 font-medium">Chỉ số Nỗ lực Vượt khó (Grit)</div>
          <div className="text-xl font-mono tabular-nums font-semibold text-zinc-100 mt-0.5">{gritScore} / 100</div>
          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">↑ Tăng 12% so với tuần trước</div>
        </div>
        <div className="w-12 h-12 rounded-md border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs font-mono font-medium text-zinc-300">
          Top 5%
        </div>
      </div>

      {/* Narrative Story Insight */}
      <div className="bg-zinc-950 p-3.5 rounded-md border border-zinc-800 text-xs leading-relaxed text-zinc-300">
        <div className="font-medium text-zinc-200 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>Bản tin kể chuyện:</span>
        </div>
        <p className="text-[11px] text-zinc-400">{narrativeText}</p>
      </div>

      {/* Conversation Starters */}
      <div className="bg-zinc-950 p-3.5 rounded-md border border-zinc-800 text-xs">
        <div className="font-medium text-zinc-200 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Gợi ý trò chuyện cùng con:</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-zinc-400">
          {conversationStarters.map((q: string, idx: number) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-zinc-600 font-mono">•</span>
              <span>&quot;{q}&quot;</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
