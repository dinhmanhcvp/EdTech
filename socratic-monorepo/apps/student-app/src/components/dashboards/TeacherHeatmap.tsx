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
  const badgeClasses: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    red: 'bg-red-500/20 text-red-300 border border-red-500/30',
  };

  const badgeLabels: Record<'green' | 'amber' | 'red', string> = {
    green: 'Làm chủ',
    amber: 'Đang thử',
    red: 'Kẹt bước 2',
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">Ma trận Nhận thức KHTN</h3>
          <p className="text-xs text-slate-400">Dữ liệu thử sai tổng hợp từ 40 học sinh</p>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-xl text-red-300 text-xs font-semibold">
          🚨 Cảnh báo điểm nghẽn: 72% kẹt ở cân bằng Oxi
        </div>
      </div>

      <table className="w-full text-left text-xs">
        <thead className="border-b border-white/10 text-slate-400 font-mono">
          <tr>
            <th className="pb-3 px-3">Học sinh</th>
            <th className="pb-3 px-3">Toán: Sóng Sin</th>
            <th className="pb-3 px-3">Lý: Ném Xiên</th>
            <th className="pb-3 px-3">Hóa: Cân bằng Oxi</th>
            <th className="pb-3 px-3">Sinh: Khí khổng</th>
            <th className="pb-3 px-3 text-right">Chỉ số Grit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-medium">
          {students.map((st: StudentMastery, i: number) => (
            <tr key={i}>
              <td className="py-3 px-3 font-semibold text-slate-200">{st.name}</td>
              <td className="py-3 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] ${badgeClasses[st.mathWave]}`}>
                  {badgeLabels[st.mathWave]}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] ${badgeClasses[st.physicsProjectile]}`}>
                  {badgeLabels[st.physicsProjectile]}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] ${badgeClasses[st.chemRedox]}`}>
                  {badgeLabels[st.chemRedox]}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] ${badgeClasses[st.bioStomata]}`}>
                  {badgeLabels[st.bioStomata]}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                {st.gritScore}/100
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
