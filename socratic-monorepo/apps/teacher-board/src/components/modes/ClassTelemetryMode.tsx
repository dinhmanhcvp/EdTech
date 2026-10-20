'use client';

import React, { useState } from 'react';
import { Send, QrCode, FileText, Check, ArrowUpRight, BarChart2, ShieldCheck, Activity } from 'lucide-react';

export interface StudentMastery {
  name: string;
  mathWave: 'green' | 'amber' | 'red';
  physicsProjectile: 'green' | 'amber' | 'red';
  chemRedox: 'green' | 'amber' | 'red';
  bioStomata: 'green' | 'amber' | 'red';
  gritScore: number;
}

export const ClassTelemetryMode: React.FC = () => {
  const [pushedToast, setPushedToast] = useState<string | null>(null);

  const students: StudentMastery[] = [
    { name: 'Nguyễn Văn An', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'red', bioStomata: 'amber', gritScore: 88 },
    { name: 'Trần Thị Mai', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Lê Hoàng Nam', mathWave: 'amber', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'green', gritScore: 74 },
    { name: 'Phạm Minh Tuấn', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 98 },
    { name: 'Đỗ Thảo Linh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 91 },
    { name: 'Vũ Hoàng Bách', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'amber', gritScore: 84 },
  ];

  const handlePushToBoard = (topic: string) => {
    setPushedToast(`Đã đồng bộ bài toán '${topic}' lên Smartboard lớp 12A1!`);
    setTimeout(() => setPushedToast(null), 3000);
  };

  const getStatusBadge = (status: 'green' | 'amber' | 'red') => {
    switch (status) {
      case 'green':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đạt chuẩn
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Cần gợi mở
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Mắc kẹt
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8F7F4] text-[#18181B] overflow-y-auto p-6 gap-6 select-none font-sans">
      {/* Toast */}
      {pushedToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 shadow-sm">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{pushedToast}</span>
        </div>
      )}

      {/* KPI Telemetry Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Tỷ lệ Nắm vững Lớp
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-[#18181B] tabular-nums">84.2%</span>
            <span className="text-xs font-mono text-emerald-600 font-medium">+5.4% so với tuần trước</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Chỉ số Bền bỉ (Grit)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-600 tabular-nums">89.6</span>
            <span className="text-xs font-mono text-stone-500">/ 100 điểm chuẩn</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Điểm nghẽn Cực trị & Biên
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-rose-600 tabular-nums">28.0%</span>
            <span className="text-xs font-mono text-stone-500">Cân bằng Oxi (Fe + O₂)</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Học sinh Chuyên / Olympic
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-blue-600 tabular-nums">18 / 24</span>
            <span className="text-xs font-mono text-stone-500">Đã mở khóa RK4</span>
          </div>
        </div>
      </div>

      {/* Main Split: Mastery Matrix & Real-time Action Banner */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Student Mastery Table (70% width) */}
        <div className="flex-1 border border-[#E6E4DD] bg-white/95 backdrop-blur-md rounded-xl p-5 shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-stone-700 font-semibold">
                MA TRẬN TIẾN ĐỘ THỰC TẾ (CLASS MASTERY MATRIX)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Dữ liệu đồng bộ trực tiếp từ các bài giải trên điện thoại học sinh
              </p>
            </div>
            <span className="text-xs font-mono text-stone-500 bg-[#F2F0EA] px-2 py-0.5 rounded border border-[#E5E3DC]">Lớp 12A1 • Sĩ số: 24</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-2.5 px-3">Học sinh</th>
                  <th className="py-2.5 px-3">Sóng Sin</th>
                  <th className="py-2.5 px-3">Ném xiên RK4</th>
                  <th className="py-2.5 px-3">Cân bằng Oxi</th>
                  <th className="py-2.5 px-3">Quang hợp</th>
                  <th className="py-2.5 px-3">Điểm Grit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EA]">
                {students.map((s) => (
                  <tr key={s.name} className="hover:bg-[#F8F7F4] transition">
                    <td className="py-2.5 px-3 font-medium text-[#18181B]">{s.name}</td>
                    <td className="py-2.5 px-3">{getStatusBadge(s.mathWave)}</td>
                    <td className="py-2.5 px-3">{getStatusBadge(s.physicsProjectile)}</td>
                    <td className="py-2.5 px-3">{getStatusBadge(s.chemRedox)}</td>
                    <td className="py-2.5 px-3">{getStatusBadge(s.bioStomata)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-stone-700 font-semibold">
                      {s.gritScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel & Lesson Recap Summary (30% width) */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Action Trigger Card */}
          <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-700 font-semibold">
              Đồng Bộ Sang Smartboard Lớp
            </span>
            <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
              72% học sinh gặp bẫy ở bước tính số nguyên tử Oxi tối qua. Đẩy bài toán mẫu lên bảng để cùng mổ xẻ trên lớp:
            </p>
            <button
              type="button"
              onClick={() => handlePushToBoard('Cân bằng Oxi Fe + O₂')}
              className="w-full py-2 px-3 rounded-lg bg-[#18181B] hover:bg-stone-800 active:translate-y-px text-white text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đẩy lên Bảng lớp</span>
            </button>
          </div>

          {/* Smart Notes Packaging Card */}
          <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-700 font-semibold">
              Đóng Gói Bài Giảng (Smart Notes)
            </span>
            <div className="p-3 bg-[#F4F3EE] rounded-lg border border-[#E5E3DC] text-xs flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-stone-500">
                <span>Khóa học:</span>
                <span className="text-stone-800 font-semibold">KHTN Chuyên sâu</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Định dạng:</span>
                <span className="text-stone-800 font-semibold">KaTeX + 60FPS Sandbox</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Mã lớp:</span>
                <span className="text-emerald-700 font-semibold">12A1-KHTN-2026</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handlePushToBoard('Smart Notes 12A1')}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-stone-50 active:translate-y-px border border-[#DCD9D0] text-stone-700 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Xuất Smart Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
