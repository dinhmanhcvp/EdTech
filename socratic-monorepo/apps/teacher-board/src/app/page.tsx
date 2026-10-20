'use client';

import React, { useState } from 'react';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { Sparkles, Monitor, Activity, ShieldCheck, HelpCircle } from 'lucide-react';
import { SimulationBlueprint } from '@socratic/types';

export default function TeacherSmartboardPage() {
  const [selectedDemoBlueprint, setSelectedDemoBlueprint] = useState<SimulationBlueprint | null>(null);

  const demoBlueprints: Record<string, SimulationBlueprint> = {
    BIO_PHOTOSYNTHESIS: {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{Quang hợp: } Rate = f(T, I, CO_2)',
      ocrAlternatives: [
        'Rate = f(T, I, CO_2)',
        'Rate = k \\cdot [CO_2] \\cdot e^{-E_a/RT}'
      ],
      parameters: [
        { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
        { key: 'light', label: 'Cường độ sáng (I)', unit: '%', defaultValue: 70.0, min: 10.0, max: 100.0, step: 5.0 },
      ],
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng và khí khổng buộc phải khép chặt?',
    },
    CHEM_BALANCE_SCALE: {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_BALANCE_SCALE',
      recognizedLatex: 'c_1\\text{Fe} + c_2\\text{O}_2 \\rightarrow c_3\\text{Fe}_2\\text{O}_3',
      ocrAlternatives: [
        '4Fe + 3O_2 \\rightarrow 2Fe_2O_3',
        'Fe_2O_3 + 3CO \\rightarrow 2Fe + 3CO_2'
      ],
      parameters: [
        { key: 'c1', label: 'Hệ số Fe', unit: '', defaultValue: 1.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c2', label: 'Hệ số O₂', unit: '', defaultValue: 1.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c3', label: 'Hệ số Fe₂O₃', unit: '', defaultValue: 2.0, min: 1.0, max: 4.0, step: 1.0 },
      ],
      socraticQuestion: 'Chiếc cân đang lệch về phía nào? Em cần chọn bội chung nhỏ nhất là mấy để số Oxi hai vế thăng bằng?',
    },
    PHYS_PROJECTILE: {
      engine: 'PHYSICS',
      templateId: 'PHYS_PROJECTILE',
      recognizedLatex: 'v_0 = 22\\text{ m/s}, \\alpha = 45^\\circ',
      ocrAlternatives: ['v_0 = 22 m/s, alpha = 45°', 'v_0 = 25 m/s, alpha = 30°'],
      parameters: [
        { key: 'v0', label: 'Vận tốc đầu (v₀)', unit: 'm/s', defaultValue: 22.0, min: 5.0, max: 50.0, step: 1.0 },
        { key: 'alpha', label: 'Góc ném (α)', unit: 'độ', defaultValue: 45.0, min: 15.0, max: 85.0, step: 5.0 },
        { key: 'g', label: 'Gia tốc g', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
      ],
      socraticQuestion: 'Tại sao với cùng vận tốc đầu v₀, góc ném 45° lại cho tầm xa cực đại trên mặt đất bằng phẳng?',
    },
    MATH_TRIG_WAVE: {
      engine: 'MATH',
      templateId: 'MATH_TRIG_WAVE',
      recognizedLatex: 'y = 2\\sin(3x + 0)',
      ocrAlternatives: ['y = 2sin(3x)', 'y = 2cos(3x)'],
      parameters: [
        { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.5 },
        { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3.0, min: 1.0, max: 10.0, step: 1.0 },
        { key: 'phi', label: 'Pha ban đầu (φ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.1 },
      ],
      socraticQuestion: 'Nếu giữ nguyên biên độ A = 2 nhưng tăng tần số góc ω lên gấp đôi, đồ thị hình sin sẽ bị nén lại hay giãn ra theo trục hoành?',
    },
    PHYS_RLC_PHASOR: {
      engine: 'PHYSICS',
      templateId: 'PHYS_RLC_PHASOR',
      recognizedLatex: 'u = U_0\\cos(\\omega t + \\varphi), \\quad \\text{Mạch RLC nối tiếp}',
      ocrAlternatives: [
        'u = U_0 cos(omega*t)',
        'i = I_0 cos(omega*t - phi)',
      ],
      parameters: [
        { key: 'R', label: 'Điện trở (R)', unit: 'Ω', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
        { key: 'L', label: 'Độ tự cảm (L)', unit: 'H', defaultValue: 0.5, min: 0.1, max: 2.0, step: 0.1 },
        { key: 'C', label: 'Điện dung (C)', unit: 'μF', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
        { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 200.0, min: 50.0, max: 500.0, step: 10.0 },
        { key: 'U', label: 'Điện áp (U)', unit: 'V', defaultValue: 120.0, min: 20.0, max: 240.0, step: 10.0 },
      ],
      socraticQuestion: 'Khi điều chỉnh tần số góc ω tiến dần về giá trị cộng hưởng ω₀ = 1/√(LC), góc lệch pha φ giữa u và i sẽ biến đổi thế nào và vì sao công suất mạch đạt cực đại?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    },
    CHEM_EQUILIBRIUM_TITRATION: {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_EQUILIBRIUM_TITRATION',
      recognizedLatex: '\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}, \\quad \\text{Chuẩn độ pH}',
      ocrAlternatives: [
        'HCl + NaOH -> NaCl + H2O',
        'CH3COOH + NaOH -> CH3COONa + H2O',
      ],
      parameters: [
        { key: 'Vb', label: 'Thể tích NaOH (V_b)', unit: 'mL', defaultValue: 20.0, min: 0.0, max: 50.0, step: 1.0 },
      ],
      socraticQuestion: 'Tại sao tại điểm tương đương (V_NaOH = 25mL), đường cong pH lại có một bước nhảy vọt dốc đứng thay vì biến thiên từ từ?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    },
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="px-8 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <Monitor className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">
                Socratic Vision Board <span className="text-cyan-400 font-mono text-xs">v2.0</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                Port 3001
              </span>
            </div>
            <p className="text-xs text-slate-400">Bảng thông minh cho Giáo viên • 0 API khi viết ink • Nhận diện Magic Lasso tức thì</p>
          </div>
        </div>

        {/* Live Architecture Status Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>FastAPI Backend: <strong className="text-cyan-300 font-mono">:8000</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Engines: <strong className="text-emerald-300">60FPS Local Canvas</strong></span>
          </div>
        </div>
      </header>

      {/* Quick Launch Demo Blueprints */}
      <div className="px-8 py-3 bg-slate-900/40 border-b border-white/5 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold whitespace-nowrap">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Mẫu mô phỏng kiểm thử nhanh:</span>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(demoBlueprints).map(([key, bp]) => (
            <button
              key={key}
              onClick={() => setSelectedDemoBlueprint(bp)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/40 border border-white/10 text-xs font-mono text-slate-200 transition cursor-pointer"
            >
              {bp.engine}: {bp.templateId}
            </button>
          ))}
          {selectedDemoBlueprint && (
            <button
              onClick={() => setSelectedDemoBlueprint(null)}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs transition cursor-pointer"
            >
              Đóng mô phỏng
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <SmartboardCanvas initialBlueprint={selectedDemoBlueprint} />
      </div>
    </main>
  );
}
