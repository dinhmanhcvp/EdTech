'use client';

import React, { useState } from 'react';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { SocraticWorkspaceMode } from '../components/modes/SocraticWorkspaceMode';
import { ClassTelemetryMode } from '../components/modes/ClassTelemetryMode';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { Download, Share2 } from 'lucide-react';

export default function UnifiedPlatformPage() {
  const [activeMode, setActiveMode] = useState<'BOARD' | 'SOCRATIC' | 'ANALYTICS'>('BOARD');
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel>('THPT_STANDARD');
  const [selectedDemoBlueprint, setSelectedDemoBlueprint] = useState<SimulationBlueprint | null>(null);
  const [lessonExportNotice, setLessonExportNotice] = useState<string | null>(null);

  const demoBlueprints: Record<string, SimulationBlueprint> = {
    PHYS_RLC_PHASOR: {
      engine: 'PHYSICS',
      templateId: 'PHYS_RLC_PHASOR',
      recognizedLatex: 'u = U_0\\cos(\\omega t + \\varphi), \\quad \\text{Mạch RLC nối tiếp}',
      ocrAlternatives: ['u = U_0 cos(omega*t)', 'i = I_0 cos(omega*t - phi)'],
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
    CHEM_EQUILIBRIUM_TITRATION: {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_EQUILIBRIUM_TITRATION',
      recognizedLatex: '\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}, \\quad \\text{Chuẩn độ pH}',
      ocrAlternatives: ['HCl + NaOH -> NaCl + H2O', 'CH3COOH + NaOH -> CH3COONa + H2O'],
      parameters: [
        { key: 'Vb', label: 'Thể tích NaOH (V_b)', unit: 'mL', defaultValue: 20.0, min: 0.0, max: 50.0, step: 1.0 },
      ],
      socraticQuestion: 'Tại sao tại điểm tương đương (V_NaOH = 25mL), đường cong pH lại có một bước nhảy vọt dốc đứng thay vì biến thiên từ từ?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    },
    CHEM_BALANCE_SCALE: {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_BALANCE_SCALE',
      recognizedLatex: 'c_1\\text{Fe} + c_2\\text{O}_2 \\rightarrow c_3\\text{Fe}_2\\text{O}_3',
      ocrAlternatives: ['4Fe + 3O_2 \\rightarrow 2Fe_2O_3', 'Fe_2O_3 + 3CO \\rightarrow 2Fe + 3CO_2'],
      parameters: [
        { key: 'c1', label: 'Hệ số Fe', unit: '', defaultValue: 1.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c2', label: 'Hệ số O₂', unit: '', defaultValue: 1.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c3', label: 'Hệ số Fe₂O₃', unit: '', defaultValue: 2.0, min: 1.0, max: 4.0, step: 1.0 },
      ],
      socraticQuestion: 'Chiếc cân đang lệch về phía nào? Em cần chọn bội chung nhỏ nhất là mấy để số Oxi hai vế thăng bằng?',
    },
    BIO_PHOTOSYNTHESIS: {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{Quang hợp: } Rate = f(T, I, CO_2)',
      ocrAlternatives: ['Rate = f(T, I, CO_2)', 'Rate = k \\cdot [CO_2] \\cdot e^{-E_a/RT}'],
      parameters: [
        { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
        { key: 'light', label: 'Cường độ sáng (I)', unit: '%', defaultValue: 70.0, min: 10.0, max: 100.0, step: 5.0 },
      ],
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng và khí khổng buộc phải khép chặt?',
    },
  };

  const handleExportLecture = () => {
    setLessonExportNotice('Đã xuất bài giảng sang Smart Notes & đóng gói QR cho học sinh!');
    setTimeout(() => setLessonExportNotice(null), 3000);
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col select-none">
      {/* 1. TOP COMMAND HEADER (Linear / Vercel Precision Style: 44px h-11) */}
      <header className="h-11 border-b border-zinc-800/80 bg-zinc-950 px-4 flex items-center justify-between shrink-0 z-50">
        {/* Left: Minimal Wordmark & Lesson Title */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-zinc-100 font-semibold">
            SOCRATIC
          </span>
          <span className="text-zinc-700 font-mono text-xs">/</span>
          <span className="text-xs text-zinc-400 font-medium tracking-tight">
            Dao động điều hòa & Cơ học giải tích
          </span>
        </div>

        {/* Center: Unified Mode Switcher (Segmented Control) */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setActiveMode('BOARD')}
            className={`px-3 py-1 rounded text-xs transition cursor-pointer font-medium ${
              activeMode === 'BOARD'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            01. Bảng Tương Tác & Mô Phỏng
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('SOCRATIC')}
            className={`px-3 py-1 rounded text-xs transition cursor-pointer font-medium ${
              activeMode === 'SOCRATIC'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            02. Gia Sư Socratic 1:1
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('ANALYTICS')}
            className={`px-3 py-1 rounded text-xs transition cursor-pointer font-medium ${
              activeMode === 'ANALYTICS'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            03. Phân Tích Lớp Học & Smart Notes
          </button>
        </div>

        {/* Right: Curriculum Depth Toggle & Export Action */}
        <div className="flex items-center gap-2.5">
          {/* Curriculum Depth Segmented Toggle */}
          <div
            className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-md"
            data-testid="curriculum-mode-toggle"
          >
            <button
              type="button"
              data-testid="btn-mode-standard"
              onClick={() => setCurriculumLevel('THPT_STANDARD')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                curriculumLevel === 'THPT_STANDARD'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Chuẩn THPT
            </button>
            <button
              type="button"
              data-testid="btn-mode-olympiad"
              onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                curriculumLevel === 'OLYMPIAD_ADVANCED'
                  ? 'bg-zinc-800 text-sky-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Chuyên / HSG
            </button>
          </div>

          {/* Export Lesson Button */}
          <button
            type="button"
            onClick={handleExportLecture}
            className="text-xs border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-1 rounded-md text-zinc-200 font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Xuất Bài Giảng</span>
          </button>
        </div>
      </header>

      {/* Export Toast Notice */}
      {lessonExportNotice && (
        <div className="bg-zinc-900 border-b border-emerald-500/30 px-4 py-1.5 text-xs font-mono text-emerald-300 flex items-center justify-between z-40">
          <span>{lessonExportNotice}</span>
          <button
            onClick={() => setLessonExportNotice(null)}
            className="text-zinc-500 hover:text-zinc-300 font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. UNIFIED WORKSPACE VIEW AREA (100% height minus header) */}
      <div className="flex-1 h-[calc(100vh-44px)] overflow-hidden relative">
        {/* MODE 01: Interactive Board & Precision Lab Studio */}
        <div className={`w-full h-full ${activeMode === 'BOARD' ? 'block' : 'hidden'}`}>
          <SmartboardCanvas
            initialBlueprint={selectedDemoBlueprint}
            apiEndpoint="/api/v1/canvas/compile-lasso"
          />
        </div>

        {/* MODE 02: Socratic 1:1 Workspace */}
        <div className={`w-full h-full ${activeMode === 'SOCRATIC' ? 'block' : 'hidden'}`}>
          <SocraticWorkspaceMode curriculumLevel={curriculumLevel} />
        </div>

        {/* MODE 03: Class Telemetry & Smart Notes Matrix */}
        <div className={`w-full h-full ${activeMode === 'ANALYTICS' ? 'block' : 'hidden'}`}>
          <ClassTelemetryMode />
        </div>
      </div>
    </main>
  );
}
