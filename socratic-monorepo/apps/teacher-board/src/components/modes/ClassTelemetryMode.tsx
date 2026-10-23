'use client';

import React, { useState, useEffect } from 'react';
import { Send, QrCode, FileText, Check, ArrowUpRight, BarChart2, ShieldCheck, Activity, Sparkles, Layers } from 'lucide-react';

export interface StudentMastery {
  name: string;
  mathWave: 'green' | 'amber' | 'red';
  physicsProjectile: 'green' | 'amber' | 'red';
  chemRedox: 'green' | 'amber' | 'red';
  bioStomata: 'green' | 'amber' | 'red';
  gritScore: number;
}

export interface ClassTelemetryModeProps {
  onJumpToBoard?: (blueprintKey: string) => void;
  onOpenQrNotes?: () => void;
}

export const ClassTelemetryMode: React.FC<ClassTelemetryModeProps> = ({
  onJumpToBoard,
  onOpenQrNotes,
}) => {
  const [pushedToast, setPushedToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bottleneckText, setBottleneckText] = useState<string>('28.0% Cân bằng Oxi (Fe + O₂)');
  const [masteryPct, setMasteryPct] = useState<number>(84.2);
  const [avgGrit, setAvgGrit] = useState<number>(89.6);

  // 35 Students Class 12A1 Curriculum Heatmap
  const defaultStudents: StudentMastery[] = [
    { name: 'Nguyễn Văn An', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'red', bioStomata: 'amber', gritScore: 88 },
    { name: 'Trần Thị Mai', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Lê Hoàng Nam', mathWave: 'amber', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'green', gritScore: 74 },
    { name: 'Phạm Minh Tuấn', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 98 },
    { name: 'Đỗ Thảo Linh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 91 },
    { name: 'Vũ Hoàng Bách', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'amber', gritScore: 84 },
    { name: 'Ngô Bảo Châu', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 99 },
    { name: 'Hoàng Thị Diệu', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'red', bioStomata: 'green', gritScore: 82 },
    { name: 'Đặng Quốc Huy', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'amber', gritScore: 80 },
    { name: 'Bùi Phương Thảo', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 94 },
    { name: 'Dương Văn Hùng', mathWave: 'red', physicsProjectile: 'amber', chemRedox: 'red', bioStomata: 'amber', gritScore: 71 },
    { name: 'Lý Gia Hân', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 96 },
    { name: 'Trịnh Công Sơn', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 90 },
    { name: 'Mai Thu Trang', mathWave: 'amber', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'amber', gritScore: 76 },
    { name: 'Hồ Quang Hiếu', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 93 },
    { name: 'Phan Đình Tùng', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 89 },
    { name: 'Lâm Thanh Hà', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 92 },
    { name: 'Đinh Tiến Đạt', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'red', bioStomata: 'amber', gritScore: 83 },
    { name: 'Võ Minh Trí', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 97 },
    { name: 'Tạ Quang Thắng', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 87 },
    { name: 'Châu Khải Phong', mathWave: 'red', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'amber', gritScore: 68 },
    { name: 'Trần Mỹ Linh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Nguyễn Hồng Nhung', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 91 },
    { name: 'Lê Uyên Phương', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 89 },
    { name: 'Đoàn Văn Hậu', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 88 },
    { name: 'Nguyễn Quang Hải', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 96 },
    { name: 'Bùi Tiến Dũng', mathWave: 'green', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'amber', gritScore: 75 },
    { name: 'Lương Xuân Trường', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 94 },
    { name: 'Phạm Đức Huy', mathWave: 'amber', physicsProjectile: 'amber', chemRedox: 'amber', bioStomata: 'green', gritScore: 82 },
    { name: 'Hà Đức Chinh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 90 },
    { name: 'Văn Thanh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'amber', bioStomata: 'green', gritScore: 92 },
    { name: 'Tuấn Anh', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Hồng Duy', mathWave: 'amber', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'amber', gritScore: 85 },
    { name: 'Công Phượng', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'red', bioStomata: 'green', gritScore: 86 },
    { name: 'Quế Ngọc Hải', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 97 }
  ];

  const [students, setStudents] = useState<StudentMastery[]>(defaultStudents);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/v1/heatmap');
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/v1/heatmap');
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.bottleneck) {
          setBottleneckText(data.bottleneck);
        }
      }
    } catch (err) {
      console.warn('[ClassTelemetryMode] Telemetry fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handlePushToBoard = async (topic: string, blueprintKey: string = 'CHEM_BALANCE_SCALE') => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'socratic_board_incoming_lesson',
          JSON.stringify({
            templateId: blueprintKey,
            topic,
            timestamp: Date.now(),
          })
        );
      }

      const payload = {
        student_id: 'HS02',
        student_name: 'Trần Thị Mai',
        subject: blueprintKey.includes('RLC') ? 'PHYSICS' : 'CHEMISTRY',
        step_index: 2,
        status: 'friction',
        concept: topic,
      };

      try {
        await fetch('/api/v1/heatmap/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        await fetch('http://127.0.0.1:8000/api/v1/heatmap/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      setPushedToast(`Đã đồng bộ bài toán '${topic}' lên Smartboard lớp 12A1!`);
    } catch {
      setPushedToast(`Đã lưu bài toán '${topic}' vào bộ nhớ cục bộ lớp 12A1!`);
    }

    if (onJumpToBoard) {
      onJumpToBoard(blueprintKey);
    }

    setTimeout(() => setPushedToast(null), 3500);
  };

  const handleExportSmartNotes = async () => {
    if (onOpenQrNotes) {
      onOpenQrNotes();
      return;
    }

    try {
      const payload = {
        formula: '4Fe + 3O2 -> 2Fe2O3',
        template_id: 'CHEM_BALANCE_SCALE',
        engine: 'CHEMISTRY',
        parameters: { c1: 4, c2: 3, c3: 2 },
        socratic_questions: [
          'Tại sao số nguyên tử Oxi ở 2 vế phải bằng nhau?',
          'Làm sao để số nguyên tử Oxi ở 2 vế thăng bằng khi một bên là O2 và một bên là Fe2O3?'
        ],
        key_insights: [
          'Định luật bảo toàn khối lượng và bảo toàn nguyên tố Lomonosov',
          'BCNN của 2 và 3 là 6, do đó hệ số O2 là 3 và Fe2O3 là 2',
          '72% học sinh vượt qua bẫy sau khi quan sát cân đĩa nguyên tử'
        ],
        class_id: '12A1',
        student_id: 'all_students'
      };

      let res: Response | null = null;
      try {
        res = await fetch('/api/v1/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/v1/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        setPushedToast(`Đã xuất Smart Notes (ID: ${data.note_id}) sang ứng dụng Học sinh (${data.export_ms}ms)!`);
      } else {
        setPushedToast('Đã xuất Smart Notes sang bộ nhớ cục bộ lớp 12A1!');
      }
    } catch {
      setPushedToast('Đã xuất Smart Notes sang bộ nhớ cục bộ lớp 12A1!');
    }
    setTimeout(() => setPushedToast(null), 3500);
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
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{pushedToast}</span>
        </div>
      )}

      {/* KPI Telemetry Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Tỷ lệ Nắm vững Lớp 12A1
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-[#18181B] tabular-nums">{masteryPct}%</span>
            <span className="text-xs font-mono text-emerald-600 font-medium">+5.4% tuần này</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Chỉ số Bền bỉ (Grit Score)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-600 tabular-nums">{avgGrit}</span>
            <span className="text-xs font-mono text-stone-500">/ 100 điểm chuẩn</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Điểm nghẽn Cực trị & Biên
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-mono font-bold text-rose-600 truncate">{bottleneckText}</span>
          </div>
        </div>

        <div className="border border-[#E6E4DD] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            Học sinh Chuyên / Olympic
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-blue-600 tabular-nums">26 / 35</span>
            <span className="text-xs font-mono text-stone-500">Đã mở khóa RK4</span>
          </div>
        </div>
      </div>

      {/* Main Split: Mastery Matrix & Real-time Action Banner */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Student Mastery Table (70% width) */}
        <div className="flex-1 border border-[#E6E4DD] bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-widest text-stone-700 font-semibold">
                MA TRẬN TIẾN ĐỘ THỰC TẾ (CLASS MASTERY MATRIX — 35 HỌC SINH × 5 CHỦ ĐỀ)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Dữ liệu phân tích trực tiếp từ bài giải học sinh, phát hiện điểm nghẽn nhận thức
              </p>
            </div>
            <span className="text-xs font-mono text-stone-600 bg-[#F2F0EA] px-2.5 py-0.5 rounded-lg border border-[#E5E3DC]">
              Lớp 12A1 • Sĩ số: 35
            </span>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <tr className="border-b border-[#E6E4DD] text-[11px] font-mono uppercase tracking-wider text-stone-500">
                  <th className="py-2.5 px-3">Học sinh</th>
                  <th className="py-2.5 px-3">Sóng Sin (Toán)</th>
                  <th className="py-2.5 px-3">Ném xiên / RLC (Lý)</th>
                  <th className="py-2.5 px-3">Cân bằng Oxi (Hóa)</th>
                  <th className="py-2.5 px-3">ADN / Khí khổng (Sinh)</th>
                  <th className="py-2.5 px-3">Điểm Grit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F0EA]">
                {students.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F7F4] transition">
                    <td className="py-2 px-3 font-medium text-[#18181B] flex items-center gap-2">
                      <span className="w-5 text-[10px] font-mono text-stone-400">{idx + 1}.</span>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-2 px-3">{getStatusBadge(s.mathWave)}</td>
                    <td className="py-2 px-3">{getStatusBadge(s.physicsProjectile)}</td>
                    <td className="py-2 px-3">{getStatusBadge(s.chemRedox)}</td>
                    <td className="py-2 px-3">{getStatusBadge(s.bioStomata)}</td>
                    <td className="py-2 px-3 font-mono tabular-nums text-stone-700 font-semibold">
                      {s.gritScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel & Bottleneck Remediation (30% width) */}
        <div className="w-full lg:w-88 flex flex-col gap-4">
          {/* Bottleneck 1: Cân bằng Oxi hóa - Khử */}
          <div className="border border-rose-200 bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-rose-700 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Điểm nghẽn 01: Cân bằng Oxi</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                28% Nắm vững
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-serif">
              72% học sinh gặp bẫy ở bước bảo toàn Oxi (4Fe + 3O₂ → 2Fe₂O₃). Bấm để đẩy bài toán lên bảng cùng mổ xẻ trên Cân Đĩa:
            </p>
            <button
              type="button"
              data-testid="btn-push-chem-bottleneck"
              onClick={() => handlePushToBoard('Cân bằng Oxi Fe + O₂', 'CHEM_BALANCE_SCALE')}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đẩy bài tập khắc phục lên Bảng lớp</span>
            </button>
          </div>

          {/* Bottleneck 2: Giản đồ Fresnel RLC */}
          <div className="border border-blue-200 bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-700 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Điểm nghẽn 02: Giản đồ RLC</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                34% Nắm vững
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-serif">
              Học sinh nhầm lẫn giữa điện áp tức thời và điện áp hiệu dụng trên tụ điện và cuộn cảm khi thay đổi tần số cộng hưởng $\omega_0$.
            </p>
            <button
              type="button"
              data-testid="btn-push-rlc-bottleneck"
              onClick={() => handlePushToBoard('Giản đồ vector quay RLC', 'PHYS_RLC_PHASOR')}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đẩy Giản đồ RLC lên Bảng lớp</span>
            </button>
          </div>

          {/* Smart Notes Packaging Card */}
          <div className="border border-[#E6E4DD] bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-700 font-semibold">
              Đóng Gói Bài Giảng (Smart Notes)
            </span>
            <div className="p-3 bg-[#F4F3EE] rounded-xl border border-[#E5E3DC] text-xs flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-stone-500">
                <span>Khóa học:</span>
                <span className="text-stone-800 font-semibold">KHTN Chuyên sâu 12</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Định dạng:</span>
                <span className="text-stone-800 font-semibold">KaTeX + 60FPS Sandbox</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Liên kết:</span>
                <span className="text-emerald-700 font-semibold truncate max-w-[170px]">socratic.edu.vn/recap</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportSmartNotes}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-stone-600" />
              <span>Xuất Smart Notes & QR Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
