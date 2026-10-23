'use client';

import React, { useState, useEffect } from 'react';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { SocraticWorkspaceMode } from '../components/modes/SocraticWorkspaceMode';
import { ClassTelemetryMode } from '../components/modes/ClassTelemetryMode';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { Download, Share2, Key, Check, Settings, Sparkles, QrCode, Copy, ExternalLink, X, FileText, ChevronRight } from 'lucide-react';

export default function UnifiedPlatformPage() {
  const [activeMode, setActiveMode] = useState<'BOARD' | 'SOCRATIC' | 'ANALYTICS'>('BOARD');
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel>('THPT_STANDARD');
  const [selectedDemoBlueprint, setSelectedDemoBlueprint] = useState<SimulationBlueprint | null>(null);
  const [lessonExportNotice, setLessonExportNotice] = useState<string | null>(null);

  // Gemini Vision AI Key Configuration Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<{ has_key: boolean; model?: string; masked_key?: string | null } | null>(null);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string | null>(null);

  // Editorial 1-Tap QR Smart Notes Modal (Apple-Keynote Showcase)
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

  const fetchGeminiKeyStatus = async () => {
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/v1/canvas/settings/gemini-key');
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/v1/canvas/settings/gemini-key');
      }
      if (res && res.ok) {
        const data = await res.json();
        setGeminiKeyStatus(data);
      }
    } catch (err) {
      console.warn('[Gemini Settings] Status check fallback:', err);
    }
  };

  useEffect(() => {
    fetchGeminiKeyStatus();
  }, []);

  const handleSaveGeminiKey = async () => {
    const key = geminiKeyInput.trim();
    if (!key) return;
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/v1/canvas/settings/gemini-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gemini_api_key: key }),
        });
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/v1/canvas/settings/gemini-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gemini_api_key: key }),
        });
      }

      if (res && res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('gemini_api_key', key);
        }
        setSettingsSaveNotice('Đã xác thực và lưu Gemini 2.0 Flash Vision Key thành công!');
        setGeminiKeyInput('');
        fetchGeminiKeyStatus();
      } else {
        setSettingsSaveNotice('Không thể lưu key vào backend, đã lưu vào bộ nhớ trình duyệt!');
        if (typeof window !== 'undefined') {
          localStorage.setItem('gemini_api_key', key);
        }
      }
    } catch {
      setSettingsSaveNotice('Đã lưu Gemini Key vào bộ nhớ cục bộ trình duyệt!');
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key', key);
      }
    }
    setTimeout(() => setSettingsSaveNotice(null), 3500);
  };

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
      {/* 1. TOP COMMAND HEADER (Editorial Daylight: 48px h-12) */}
      <header className="h-12 border-b border-[#E6E4DD] bg-white/95 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-50">
        {/* Left: Minimal Wordmark & Lesson Title */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-stone-900 font-bold">
            SOCRATIC VISION BOARD
          </span>
          <span className="text-stone-300 font-mono text-xs">/</span>
          <span className="text-xs text-stone-600 font-medium tracking-tight">
            Khoa học Tự nhiên & Không gian Pha 60FPS
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
            01. Bảng Tương Tác & Mô Phỏng
          </button>
          <button
            type="button"
            data-testid="mode-tab-socratic"
            onClick={() => setActiveMode('SOCRATIC')}
            className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${
              activeMode === 'SOCRATIC'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            02. Gia Sư Socratic 1:1
          </button>
          <button
            type="button"
            data-testid="mode-tab-analytics"
            onClick={() => setActiveMode('ANALYTICS')}
            className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer font-medium ${
              activeMode === 'ANALYTICS'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            03. Phân Tích Lớp Học & Smart Notes
          </button>
        </div>

        {/* Right: Curriculum Depth Toggle, AI Settings & Export Action */}
        <div className="flex items-center gap-2.5">
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

          {/* Gemini AI Settings Button */}
          <button
            type="button"
            data-testid="btn-gemini-settings"
            onClick={() => {
              setIsSettingsOpen(true);
              fetchGeminiKeyStatus();
            }}
            className="text-xs border border-[#DCD9D0] bg-white hover:bg-stone-50 px-2.5 py-1.5 rounded-lg text-stone-700 font-medium shadow-xs transition cursor-pointer flex items-center gap-1.5"
            title="Cài đặt Gemini 2.0 Flash Vision Key"
          >
            <Settings className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Cài đặt AI</span>
            {geminiKeyStatus?.has_key && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Key đã kết nối" />
            )}
          </button>

          {/* Export Lecture & 1-Tap QR Smart Notes Modal Button */}
          <button
            type="button"
            data-testid="btn-export-smart-notes-modal"
            onClick={handleOpenSmartNotesModal}
            className="text-xs border border-[#DCD9D0] bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg text-stone-800 font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Bài Giảng (Smart Notes)</span>
          </button>
        </div>
      </header>

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

      {/* 2. UNIFIED WORKSPACE VIEW AREA (100% height minus header) */}
      <div className="flex-1 h-[calc(100vh-48px)] overflow-y-auto relative">
        {/* MODE 01: Interactive Board & Precision Lab Studio */}
        <div className={`w-full min-h-full ${activeMode === 'BOARD' ? 'block' : 'hidden'}`}>
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
          <ClassTelemetryMode
            onJumpToBoard={(blueprintKey) => {
              setActiveMode('BOARD');
              setSelectedDemoBlueprint(demoBlueprints[blueprintKey] || null);
            }}
            onOpenQrNotes={handleOpenSmartNotesModal}
          />
        </div>
      </div>

      {/* 3. FLOATING DIRECTOR PILL DOCK (Apple Keynote Recording Control) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E6E4DD] shadow-lg text-xs">
        <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold px-1.5">
          Director:
        </span>
        <button
          type="button"
          onClick={() => setActiveMode('BOARD')}
          className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition cursor-pointer border ${
            activeMode === 'BOARD'
              ? 'bg-[#18181B] text-white border-[#18181B] font-semibold'
              : 'bg-[#F4F3EE] hover:bg-[#EAE7DF] border-[#E5E3DC] text-stone-700'
          }`}
          title="Chuyển sang Mode 01: Bảng thông minh"
        >
          01. Bảng lớp (1-4)
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('SOCRATIC')}
          className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition cursor-pointer border ${
            activeMode === 'SOCRATIC'
              ? 'bg-[#18181B] text-white border-[#18181B] font-semibold'
              : 'bg-[#F4F3EE] hover:bg-[#EAE7DF] border-[#E5E3DC] text-stone-700'
          }`}
          title="Chuyển sang Mode 02: Gia sư Socratic 1:1"
        >
          02. Socratic 1:1 (R/V)
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('ANALYTICS')}
          className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition cursor-pointer border ${
            activeMode === 'ANALYTICS'
              ? 'bg-[#18181B] text-white border-[#18181B] font-semibold'
              : 'bg-[#F4F3EE] hover:bg-[#EAE7DF] border-[#E5E3DC] text-stone-700'
          }`}
          title="Chuyển sang Mode 03: Bản đồ nhiệt lớp"
        >
          03. Bản đồ nhiệt
        </button>
        <span className="w-px h-3.5 bg-stone-300 mx-1" />
        <button
          type="button"
          onClick={handleOpenSmartNotesModal}
          className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[11px] transition cursor-pointer flex items-center gap-1"
          title="Mở Modal QR Smart Notes"
        >
          <QrCode className="w-3 h-3 text-emerald-600" />
          <span>QR Smart Notes</span>
        </button>
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

      {/* 5. GEMINI AI VISION KEY SETTINGS MODAL */}
      {isSettingsOpen && (
        <div
          data-testid="gemini-settings-modal"
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#E6E4DD] rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 font-sans text-[#18181B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F2F0EA] border border-[#E5E3DC] flex items-center justify-center text-stone-700">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#18181B]">Cấu hình Gemini 2.0 Flash Vision</h3>
                  <p className="text-[11px] text-stone-500">Kết nối trực tiếp backend AI Engine với Google Gemini</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-mono p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {settingsSaveNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSaveNotice}</span>
              </div>
            )}

            <div className="p-3 bg-[#F4F3EE] rounded-xl border border-[#E5E3DC] flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Trạng thái Backend:</span>
                <span className={`font-mono font-medium ${geminiKeyStatus?.has_key ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {geminiKeyStatus?.has_key ? 'Đã kích hoạt' : 'Chưa cấu hình (Dùng Heuristics Offline)'}
                </span>
              </div>
              {geminiKeyStatus?.masked_key && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>Key hiện hành:</span>
                  <span className="font-mono text-stone-800 font-semibold">{geminiKeyStatus.masked_key}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-600">
                <span>Model AI:</span>
                <span className="font-mono text-stone-800">gemini-2.0-flash</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-stone-700">
                Google Gemini API Key mới:
              </label>
              <input
                type="password"
                data-testid="input-gemini-key"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl bg-[#FCFBF9] border border-[#DCD9D0] text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-stone-500 font-serif italic">
                Key được gửi trực tiếp tới FastAPI /api/v1/canvas/settings/gemini-key và tự động lưu vào .env.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E6E4DD]">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2 rounded-xl border border-[#DCD9D0] bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                data-testid="btn-save-gemini-key"
                onClick={handleSaveGeminiKey}
                disabled={!geminiKeyInput.trim()}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:translate-y-px text-white text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-40"
              >
                Lưu và Xác thực
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
