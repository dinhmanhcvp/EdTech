/**
 * Feature 5: Teacher Dashboard Knowledge Heatmap
 * Visualizes 2D matrix of students across STEM concepts with mastery levels and bottleneck alerts.
 */
import React from 'react';

export interface StudentMastery {
  name: string;
  mathWave: 'green' | 'amber' | 'red';
  physicsProjectile: 'green' | 'amber' | 'red';
  chemRedox: 'green' | 'amber' | 'red';
  bioStomata: 'green' | 'amber' | 'red';
  gritScore: number;
}

export interface TeacherHeatmapProps {
  students: StudentMastery[];
}

export const TeacherHeatmap: React.FC<TeacherHeatmapProps> = ({ students }: TeacherHeatmapProps) => {
  const [pushedToast, setPushedToast] = React.useState<string | null>(null);

  const handlePushToBoard = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'socratic_board_incoming_lesson',
        JSON.stringify({
          templateId: 'CHEM_BALANCE_SCALE',
          formula: '4Fe + 3O2 -> 2Fe2O3',
          source: 'TeacherHeatmap_Bottleneck_Alert',
          timestamp: Date.now(),
        })
      );
    }
    setPushedToast('Đã đẩy bài toán Cân bằng Oxi (72% học sinh sai tối qua) lên Smartboard lớp!');
    setTimeout(() => setPushedToast(null), 3500);
  };

  const badgeClasses: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    red: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  };

  const badgeLabels: Record<'green' | 'amber' | 'red', string> = {
    green: 'Làm chủ',
    amber: 'Đang thử',
    red: 'Kẹt bước 2',
  };

  return (
    <div className="bg-zinc-900/90 backdrop-blur-md p-5 rounded-lg border border-zinc-800 shadow-xl relative">
      {pushedToast && (
        <div
          data-testid="pushed-board-toast"
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-md bg-zinc-100 text-zinc-950 font-medium text-xs shadow-xl flex items-center gap-2 animate-in fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{pushedToast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Ma trận Nhận thức KHTN</h3>
          <p className="text-xs text-zinc-400">Dữ liệu thử sai tổng hợp từ 40 học sinh</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded text-rose-400 text-xs font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Cảnh báo điểm nghẽn: 72% kẹt ở cân bằng Oxi</span>
          </div>
          <button
            type="button"
            data-testid="push-to-board-btn"
            onClick={handlePushToBoard}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-medium transition cursor-pointer active:scale-95"
            title="Sáng mai lên lớp, bài toán này sẽ tự động nạp lên Smartboard lớp để chữa chung"
          >
            <span>Đẩy lên Bảng lớp</span>
          </button>
        </div>
      </div>

      <table className="w-full text-left text-xs">
        <thead className="border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
          <tr>
            <th className="pb-2.5 px-3">Học sinh</th>
            <th className="pb-2.5 px-3">Toán: Sóng Sin</th>
            <th className="pb-2.5 px-3">Lý: Ném Xiên</th>
            <th className="pb-2.5 px-3">Hóa: Cân bằng Oxi</th>
            <th className="pb-2.5 px-3">Sinh: Khí khổng</th>
            <th className="pb-2.5 px-3 text-right">Chỉ số Grit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 font-normal">
          {students.map((st: StudentMastery, i: number) => (
            <tr key={i} className="hover:bg-zinc-800/30 transition">
              <td className="py-2.5 px-3 font-medium text-zinc-200">{st.name}</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClasses[st.mathWave]}`}>
                  {badgeLabels[st.mathWave]}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClasses[st.physicsProjectile]}`}>
                  {badgeLabels[st.physicsProjectile]}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClasses[st.chemRedox]}`}>
                  {badgeLabels[st.chemRedox]}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClasses[st.bioStomata]}`}>
                  {badgeLabels[st.bioStomata]}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-300">
                {st.gritScore}/100
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
