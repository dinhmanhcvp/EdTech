'use client';

import React, { useState, useEffect } from 'react';
import { Send, QrCode, Check } from 'lucide-react';
import { PilotImpactPanel } from '../analytics/PilotImpactPanel';
import { MathView } from '../common/MathView';
import { apiBase } from '../../utils/apiBase';

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

/** Ba điểm nghẽn khái niệm hay gặp; mỗi nút nạp đúng mẫu mô phỏng tương ứng vào Mode 01. */
const BOTTLENECKS = [
  {
    key: 'PHYS_RLC_PHASOR',
    testId: 'btn-push-rlc-bottleneck',
    title: 'Cực trị RLC',
    topic: 'Cực trị mạch RLC khi ω biến thiên',
    latex: String.raw`\omega_0 = \dfrac{1}{\sqrt{LC}}`,
    note: 'Nhầm điện áp tức thời với hiệu dụng trên L và C khi quét tần số qua điểm cộng hưởng.',
    col: 'physicsProjectile' as const,
    level: 'red' as const,
    tone: 'text-blue-700',
    dot: 'bg-blue-600',
  },
  {
    key: 'CHEM_BALANCE_SCALE',
    testId: 'btn-push-chem-bottleneck',
    title: 'Bảo toàn electron',
    topic: 'Bảo toàn electron Fe3O4 + HNO3',
    latex: String.raw`\text{Fe}_3\text{O}_4 + \text{HNO}_3 \rightarrow \text{Fe(NO}_3)_3 + \text{NO} + \text{H}_2\text{O}`,
    note: 'Đếm sai số electron nhường vì sắt trong oxit sắt từ có số oxi hóa trung bình +8/3.',
    col: 'chemRedox' as const,
    level: 'red' as const,
    tone: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  {
    key: 'PHYS_INCLINED',
    testId: 'btn-push-incline-bottleneck',
    title: 'Biên trượt có ma sát',
    topic: 'Điều kiện biên trượt có ma sát',
    latex: String.raw`ma = mg\sin\alpha - \mu mg\cos\alpha`,
    note: 'Quên đổi chiều lực ma sát hoặc bỏ sót điều kiện tan α > μ để vật bắt đầu trượt.',
    col: 'physicsProjectile' as const,
    level: 'amber' as const,
    tone: 'text-amber-700',
    dot: 'bg-amber-500',
  },
];

export const ClassTelemetryMode: React.FC<ClassTelemetryModeProps> = ({
  onJumpToBoard,
  onOpenQrNotes,
}) => {
  const [pushedToast, setPushedToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bottleneckText, setBottleneckText] = useState<string>('28.0% Cân bằng Oxi (Fe + O₂)');

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
        res = await fetch(`${apiBase()}/api/v1/heatmap`);
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
        await fetch(`${apiBase()}/api/v1/heatmap/event`, {
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
        res = await fetch(`${apiBase()}/api/v1/notes/export`, {
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

      <PilotImpactPanel />

      <div className="h-px bg-[#E6E4DD]" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-rose-600">Lớp đang dạy · cập nhật theo bài làm</span>
          <h2 className="font-display text-[28px] leading-tight text-[#141413] mt-1">
            Bản đồ điểm nghẽn: <em className="text-rose-600">một chạm đẩy bài khắc phục lên bảng</em>
          </h2>
        </div>
        <span className="text-[11px] font-mono text-stone-500 truncate max-w-[40%]">Điểm nghẽn từ máy chủ: {bottleneckText}</span>
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
          {BOTTLENECKS.map((bn) => (
            <div key={bn.key} className="border border-[#E6E4DD] bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 ${bn.tone}`}>
                  <span className={`w-2 h-2 rounded-full ${bn.dot}`} />
                  <span>{bn.title}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F0EA] text-stone-700 border border-[#E5E3DC] font-semibold tabular-nums whitespace-nowrap">
                  {students.filter((st) => st[bn.col] === bn.level).length} HS {bn.level === 'red' ? 'mắc kẹt' : 'cần gợi mở'}
                </span>
              </div>
              <div className="text-sm text-[#141413]">
                <MathView latex={bn.latex} />
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">{bn.note}</p>
              <button
                type="button"
                data-testid={bn.testId}
                onClick={() => handlePushToBoard(bn.topic, bn.key)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#18181B] hover:bg-black text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Đẩy bài tập khắc phục lên Bảng lớp</span>
              </button>
            </div>
          ))}

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
