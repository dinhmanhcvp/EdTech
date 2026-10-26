'use client';

import React, { useState, useEffect } from 'react';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { SocraticWorkspaceMode } from '../components/modes/SocraticWorkspaceMode';
import { ClassTelemetryMode } from '../components/modes/ClassTelemetryMode';
import { EngineHealthRail } from '../components/common/EngineHealthRail';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { Download, Share2, Check, Sparkles, QrCode, Copy, ExternalLink, X, FileText, ChevronRight, Maximize2, Minimize2, Monitor, ChevronDown, ChevronUp } from 'lucide-react';

export default function UnifiedPlatformPage() {

  const [activeMode, setActiveMode] = useState<'BOARD' | 'SOCRATIC' | 'ANALYTICS'>('BOARD');
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel>('THPT_STANDARD');
  const [selectedDemoBlueprint, setSelectedDemoBlueprint] = useState<SimulationBlueprint | null>(null);
  const [lessonExportNotice, setLessonExportNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);

  useEffect(() => {

    const handleFsChange = () => {
      if (typeof document !== 'undefined') {
        setIsFullscreen(Boolean(document.fullscreenElement));
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleExitToNative = () => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setLessonExportNotice('Đã thu nhỏ / chuyển về chế độ cửa sổ: Bạn có thể chọn PowerPoint, Bảng mặc định hoặc Menu hệ thống ở thanh tác vụ bên dưới / mép màn hình.');
    setTimeout(() => {
      setLessonExportNotice(null);
    }, 6000);
  };

  // Editorial 1-Tap QR Smart Notes Modal (Apple-Keynote Showcase)
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  // Read Gemini Vision key from environment if provided, or rely on backend env
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      localStorage.setItem('gemini_api_key', process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    }
  }, []);


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
    PHYS_INCLINED: {
      engine: 'PHYSICS',
      templateId: 'PHYS_INCLINED',
      // Không ghi sin/cos ở đây: SimulationWidget sẽ tưởng là sóng điều hòa và thay mất thanh trượt α, μ, m.
      recognizedLatex: '\\mu = 0{,}2,\\ \\alpha = 30^\\circ \\quad \\text{Mặt phẳng nghiêng có ma sát}',
      ocrAlternatives: ['mu = 0.2, alpha = 30°', 'mu = 0.3, alpha = 30°'],
      parameters: [
        { key: 'alpha', label: 'Góc nghiêng (α)', unit: 'độ', defaultValue: 30.0, min: 5.0, max: 80.0, step: 1.0 },
        { key: 'mu', label: 'Hệ số ma sát (μ)', unit: '', defaultValue: 0.2, min: 0.0, max: 1.0, step: 0.05 },
        { key: 'm', label: 'Khối lượng (m)', unit: 'kg', defaultValue: 2.0, min: 0.5, max: 10.0, step: 0.5 },
      ],
      socraticQuestion: 'Khi tăng dần góc nghiêng α, đến giá trị nào thì vật bắt đầu trượt? Điều kiện biên đó phụ thuộc vào khối lượng m hay không?',
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
      recognizedLatex: '\\text{C}_6\\text{H}_6 \\quad \\text{Vòng Benzen 3D & Động học Arrhenius}',
      ocrAlternatives: ['C6H6 Benzene', 'NH3 Ammonia'],
      parameters: [
        { key: 'T', label: 'Nhiệt độ (T)', unit: 'K', defaultValue: 350.0, min: 250.0, max: 500.0, step: 10.0 },
        { key: 'Ea', label: 'Năng lượng hoạt hóa (Ea)', unit: 'kJ/mol', defaultValue: 45.0, min: 15.0, max: 90.0, step: 5.0 },
      ],
      socraticQuestion: 'Khi thêm chất xúc tác, đỉnh rào cản năng lượng hoạt hóa Ea giảm xuống, tốc độ phản ứng hai chiều biến đổi như thế nào?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    },
    CHEM_BALANCE_SCALE: {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_BALANCE_SCALE',
      recognizedLatex: '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
      ocrAlternatives: ['4Fe + 3O_2 \\rightarrow 2Fe_2O_3', 'Fe_2O_3 + 3CO \\rightarrow 2Fe + 3CO_2'],
      parameters: [
        { key: 'c1', label: 'Hệ số Fe', unit: '', defaultValue: 4.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c2', label: 'Hệ số O₂', unit: '', defaultValue: 3.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c3', label: 'Hệ số Fe₂O₃', unit: '', defaultValue: 2.0, min: 1.0, max: 4.0, step: 1.0 },
      ],
      socraticQuestion: 'Chiếc cân đang lệch về phía nào? Em cần chọn bội chung nhỏ nhất là mấy để số Oxi hai vế thăng bằng?',
    },
    BIO_PHOTOSYNTHESIS: {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{ADN Double Helix 3D & Quang hợp: } Rate = f(T, I)',
      ocrAlternatives: ['DNA Replication Fork', 'Stomata Guard Cells'],
      parameters: [
        { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
        { key: 'helicaseProgress', label: 'Tiến trình Helicase tách mạch', unit: '%', defaultValue: 40.0, min: 0.0, max: 100.0, step: 5.0 },
      ],
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng và khí khổng buộc phải khép chặt?',
    },
  };

  // Open Editorial Smart Notes Modal
  const handleOpenSmartNotesModal = () => {
    setIsQrModalOpen(true);
  };

  // Global Presenter Hotkeys (1, 2, 3, 4, R, V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '1') {
        setActiveMode('BOARD');
      } else if (e.key === '2') {
        setActiveMode('BOARD');
      } else if (e.key === '3') {
        setActiveMode('BOARD');
      } else if (e.key === '4') {
        setActiveMode('BOARD');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveMode('SOCRATIC');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveMode('SOCRATIC');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://socratic.edu.vn/recap/vat-ly-12-rlc');
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2500);
    }
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#F8F7F4] text-[#18181B] flex flex-col select-none font-sans relative">
      <EngineHealthRail />
      {/* 1. SMARTBOARD COLLAPSED FLOATING PILL (Chế độ thu gọn tối giản chuẩn bảng thông minh) */}
      {!isHeaderExpanded && (
        <div className="absolute top-2.5 right-4 z-50 flex items-center gap-1.5 bg-white/85 hover:bg-white/95 backdrop-blur-md border border-stone-200/90 shadow-sm rounded-full px-2.5 py-1 transition-all select-none">
          <span className="font-mono text-[10px] tracking-wider text-stone-700 font-bold hidden sm:inline px-1">
            SOCRATIC BOARD
          </span>
          <div className="h-3.5 w-px bg-stone-300 hidden sm:block" />
          <button
            type="button"
            data-testid="btn-toggle-fullscreen-collapsed"
            onClick={toggleFullscreen}
            className="p-1 rounded-full hover:bg-stone-100 text-stone-600 transition"
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            data-testid="btn-native-board-switch-collapsed"
            onClick={handleExitToNative}
            className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 transition"
            title="Chuyển sang PowerPoint hoặc Bảng mặc định của trường"
          >
            <Monitor className="w-3 h-3 text-amber-700" />
            <span className="hidden md:inline">Tác vụ gốc</span>
          </button>
          <button
            type="button"
            data-testid="btn-expand-header"
            onClick={() => setIsHeaderExpanded(true)}
            className="px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-0.5 transition"
            title="Mở rộng menu cài đặt chi tiết"
          >
            <span>Menu</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
          </button>
        </div>
      )}

      {/* 2. FULL TOP COMMAND HEADER (Chỉ hiện khi nhấn Menu mở rộng) */}
      {isHeaderExpanded && (
        <header className="h-10 border-b border-[#E6E4DD] bg-white/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-50 transition-all">
          {/* Left: Minimal Wordmark & Lesson Title */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs tracking-widest text-stone-900 font-bold">
              SOCRATIC VISION BOARD
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold hidden md:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Tính năng 1: Bảng Tương Tác Trên Lớp
            </span>
          </div>

          {/* Center: Unified Mode Switcher (Segmented Control) */}
          <div className="flex items-center bg-[#F2F0EA] border border-[#E6E4DD] p-1 rounded-xl">
            <button
              type="button"
              data-testid="mode-tab-board"
              onClick={() => setActiveMode('BOARD')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${
                activeMode === 'BOARD'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              01. Bảng Tương Tác Trên Lớp (Màn hình 86")
            </button>
            <a
              href="http://localhost:3002?tab=COMPANION"
              target="_blank"
              rel="noreferrer"
              data-testid="mode-tab-socratic"
              className="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-medium text-stone-600 hover:text-purple-700 flex items-center gap-1.5"
              title="Mở Gia sư Socratic 1:1 trên nền tảng sau giờ học (Tính năng 2)"
            >
              <span>02. Gia Sư Socratic 1:1</span>
              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-semibold">Tính năng 2</span>
              <ExternalLink className="w-3 h-3 text-purple-500" />
            </a>
            <a
              href="http://localhost:3002?tab=HEATMAP"
              target="_blank"
              rel="noreferrer"
              data-testid="mode-tab-analytics"
              className="px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-medium text-stone-600 hover:text-emerald-700 flex items-center gap-1.5"
              title="Mở Phân tích lớp học & Smart Notes trên nền tảng sau giờ học (Tính năng 2)"
            >
              <span>03. Phân Tích Lớp Học & Smart Notes</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-semibold">Tính năng 2</span>
              <ExternalLink className="w-3 h-3 text-emerald-500" />
            </a>
          </div>

          {/* Right: Curriculum Depth Toggle, AI Settings & Export Action */}
          <div className="flex items-center gap-2">
            {/* Curriculum Depth Segmented Toggle */}
            <div
              className="flex items-center bg-[#F2F0EA] border border-[#E6E4DD] p-1 rounded-xl"
              data-testid="curriculum-mode-toggle"
            >
              <button
                type="button"
                data-testid="btn-mode-standard"
                onClick={() => setCurriculumLevel('THPT_STANDARD')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${
                  curriculumLevel === 'THPT_STANDARD'
                    ? 'bg-white text-stone-900 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Chuẩn THPT
              </button>
              <button
                type="button"
                data-testid="btn-mode-olympiad"
                onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${
                  curriculumLevel === 'OLYMPIAD_ADVANCED'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Chuyên / HSG
              </button>
            </div>

            {/* Export Lecture & 1-Tap QR Smart Notes Modal Button */}
            <button
              type="button"
              data-testid="btn-export-smart-notes-modal"
              onClick={handleOpenSmartNotesModal}
              className="text-xs border border-[#DCD9D0] bg-white hover:bg-stone-50 px-2.5 py-1.5 rounded-lg text-stone-800 font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden 2xl:inline">Xuất bài giảng</span>
            </button>

            {/* Bridge to Feature 2: After-School AI Tutor */}
            <button
              type="button"
              data-testid="btn-open-feature-2-companion"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.open('http://localhost:3002', '_blank');
                }
              }}
              className="text-xs border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg text-purple-800 font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
              title="Mở Nền tảng Gia sư AI Socratic sau giờ học"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden xl:inline">Tính năng 2: Gia sư AI</span>
              <ExternalLink className="w-3 h-3 text-purple-500" />
            </button>

            {/* Smartboard Display Mode & Escape Control */}
            <button
              type="button"
              data-testid="btn-toggle-fullscreen"
              onClick={toggleFullscreen}
              className="text-xs border border-stone-300 bg-white hover:bg-stone-50 px-2 py-1.5 rounded-lg text-stone-700 font-medium shadow-xs transition cursor-pointer flex items-center gap-1"
              title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-stone-600" /> : <Maximize2 className="w-3.5 h-3.5 text-stone-600" />}
            </button>

            {/* Switch to Native Board Tasks */}
            <button
              type="button"
              data-testid="btn-native-board-switch"
              onClick={handleExitToNative}
              className="text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg text-amber-900 font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
              title="Chuyển nhanh sang PowerPoint, Bảng vẽ gốc hoặc giao diện Android của bảng"
            >
              <Monitor className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden xl:inline">Về tác vụ gốc</span>
            </button>

            {/* Collapse Header Button */}
            <button
              type="button"
              data-testid="btn-collapse-header"
              onClick={() => setIsHeaderExpanded(false)}
              className="text-xs border border-stone-300 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg text-stone-700 font-semibold shadow-xs transition cursor-pointer flex items-center gap-1"
              title="Thu gọn thanh điều khiển để có 100% diện tích mặt bảng"
            >
              <ChevronUp className="w-3.5 h-3.5 text-stone-600" />
              <span>Thu gọn</span>
            </button>
          </div>
        </header>
      )}

      {/* Export Toast Notice */}
      {lessonExportNotice && (
        <div className="bg-[#ECFDF5] border-b border-[#A7F3D0] px-4 py-1.5 text-xs font-mono text-[#065F46] flex items-center justify-between z-40">
          <span>{lessonExportNotice}</span>
          <button
            onClick={() => setLessonExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. UNIFIED WORKSPACE VIEW AREA (100% height khi thu gọn thanh điều khiển) */}
      <div className={`flex-1 overflow-y-auto relative ${isHeaderExpanded ? 'h-[calc(100vh-40px)]' : 'h-screen'}`}>

        {/* MODE 01: Interactive Board & Precision Lab Studio */}
        <div className={`w-full min-h-full ${activeMode === 'BOARD' ? 'block' : 'hidden'}`}>
          <SmartboardCanvas
            initialBlueprint={selectedDemoBlueprint}
            apiEndpoint="/api/v1/canvas/compile-lasso"
          />
        </div>

        {/* MODE 02: Socratic 1:1 Workspace */}
        <div className={`w-full h-full flex flex-col ${activeMode === 'SOCRATIC' ? 'block' : 'hidden'}`}>
          <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center justify-between text-xs text-purple-900 shrink-0">
            <span className="font-medium">
              Phân hệ Gia Sư Socratic 1:1 đã được quy tụ sang Tính Năng 2 để học sinh và giáo viên sử dụng tự học sau giờ học.
            </span>
            <a
              href="http://localhost:3002?tab=COMPANION"
              target="_blank"
              rel="noreferrer"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <span>Mở Tính năng 2 tại cổng 3002</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SocraticWorkspaceMode curriculumLevel={curriculumLevel} />
          </div>
        </div>

        {/* MODE 03: Class Telemetry & Smart Notes Matrix */}
        <div className={`w-full h-full flex flex-col ${activeMode === 'ANALYTICS' ? 'block' : 'hidden'}`}>
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <span className="font-medium">
              Phân hệ Phân Tích Lớp Học & Smart Notes đã được quy tụ sang Tính Năng 2 để theo dõi ma trận nhận thức sau giờ học.
            </span>
            <a
              href="http://localhost:3002?tab=HEATMAP"
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <span>Mở Tính năng 2 tại cổng 3002</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ClassTelemetryMode
              onJumpToBoard={(blueprintKey) => {
                setActiveMode('BOARD');
                setSelectedDemoBlueprint(demoBlueprints[blueprintKey] || null);
              }}
              onOpenQrNotes={handleOpenSmartNotesModal}
            />
          </div>
        </div>
      </div>

      {/* 4. EDITORIAL 1-TAP QR SMART NOTES MODAL */}
      {isQrModalOpen && (
        <div
          data-testid="editorial-smart-notes-modal"
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#E6E4DD] rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 font-sans text-[#18181B] relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#18181B]">
                    Đóng Gói Bài Giảng (Smart Notes) & QR Code Live Sync
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Học sinh quét mã QR hoặc truy cập đường link để tải về toàn bộ mô phỏng 60FPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR Code Graphic & Shareable URL Row */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD]">
              {/* Crisp High-Fidelity SVG QR Code */}
              <div className="p-3 bg-white rounded-2xl border border-[#E6E4DD] shadow-xs shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-28 h-28" fill="none">
                  {/* Outer border background */}
                  <rect width="100" height="100" fill="#FFFFFF" rx="4" />
                  {/* Top-Left Finder Pattern */}
                  <rect x="8" y="8" width="28" height="28" fill="#18181B" rx="3" />
                  <rect x="12" y="12" width="20" height="20" fill="#FFFFFF" rx="2" />
                  <rect x="16" y="16" width="12" height="12" fill="#18181B" rx="1.5" />
                  {/* Top-Right Finder Pattern */}
                  <rect x="64" y="8" width="28" height="28" fill="#18181B" rx="3" />
                  <rect x="68" y="12" width="20" height="20" fill="#FFFFFF" rx="2" />
                  <rect x="72" y="16" width="12" height="12" fill="#18181B" rx="1.5" />
                  {/* Bottom-Left Finder Pattern */}
                  <rect x="8" y="64" width="28" height="28" fill="#18181B" rx="3" />
                  <rect x="12" y="68" width="20" height="20" fill="#FFFFFF" rx="2" />
                  <rect x="16" y="72" width="12" height="12" fill="#18181B" rx="1.5" />
                  {/* Sync Pixel Matrix */}
                  <rect x="40" y="12" width="6" height="6" fill="#18181B" />
                  <rect x="50" y="16" width="6" height="6" fill="#18181B" />
                  <rect x="44" y="24" width="8" height="6" fill="#18181B" />
                  <rect x="12" y="44" width="6" height="8" fill="#18181B" />
                  <rect x="22" y="48" width="8" height="6" fill="#18181B" />
                  <rect x="40" y="40" width="8" height="8" fill="#2563EB" rx="1" />
                  <rect x="52" y="44" width="6" height="6" fill="#18181B" />
                  <rect x="44" y="56" width="6" height="8" fill="#18181B" />
                  <rect x="64" y="44" width="8" height="6" fill="#18181B" />
                  <rect x="76" y="48" width="6" height="6" fill="#18181B" />
                  <rect x="84" y="40" width="8" height="8" fill="#18181B" />
                  <rect x="40" y="72" width="8" height="6" fill="#18181B" />
                  <rect x="52" y="68" width="6" height="8" fill="#18181B" />
                  <rect x="64" y="64" width="8" height="8" fill="#18181B" />
                  <rect x="76" y="72" width="6" height="6" fill="#18181B" />
                  <rect x="84" y="80" width="8" height="8" fill="#18181B" />
                  <rect x="44" y="84" width="6" height="8" fill="#18181B" />
                </svg>
              </div>

              {/* URL & Instant Copy Box */}
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                  Đường dẫn Smart Notes Lớp 12A1:
                </span>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-[#DCD9D0] text-xs font-mono text-stone-900">
                  <span className="truncate flex-1 text-blue-700 font-medium">
                    socratic.edu.vn/recap/vat-ly-12-rlc
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1 rounded-md hover:bg-stone-100 text-stone-600 transition cursor-pointer shrink-0"
                    title="Sao chép đường dẫn"
                  >
                    {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {isLinkCopied && (
                  <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Đã sao chép link vào bộ nhớ tạm!
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>35 học sinh Lớp 12A1 đã sẵn sàng tải về</span>
                </div>
              </div>
            </div>

            {/* Miniature Interactive Cards of Covered Formulas */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold">
                Nội dung thí nghiệm & mô phỏng đã đóng gói:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-blue-700 font-bold uppercase">Vật lý 12</span>
                  <span className="text-xs font-mono text-stone-900">u = U₀ cos(ωt + φ)</span>
                  <span className="text-[10px] text-stone-500">Fresnel Phasor & Cộng hưởng</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">Vật lý 10</span>
                  <span className="text-xs font-mono text-stone-900">v₀ = 22 m/s, α = 45°</span>
                  <span className="text-[10px] text-stone-500">Ném xiên vi phân Comet Trail</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-amber-700 font-bold uppercase">Hóa học 10</span>
                  <span className="text-xs font-mono text-stone-900">4Fe + 3O₂ → 2Fe₂O₃</span>
                  <span className="text-[10px] text-stone-500">Bảo toàn khối lượng Lomonosov</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase">Sinh học 12</span>
                  <span className="text-xs font-mono text-stone-900">ADN Helicase 3D</span>
                  <span className="text-[10px] text-stone-500">Giải phẫu khí khổng 25°C-50°C</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E6E4DD]">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-[#DCD9D0] bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:translate-y-px text-white text-xs font-semibold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Sao chép liên kết</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
