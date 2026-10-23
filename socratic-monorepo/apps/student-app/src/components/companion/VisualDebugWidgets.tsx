'use client';

import React, { useState } from 'react';
import { SocraticProblem } from '../../data/socraticProblems';
import { MathView } from '../common/MathView';
import { MathText, FormulaBlock } from '../ui/MathText';
import {
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Maximize2,
  Atom,
  TrendingUp,
  Cpu,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

// ============================================================================
// 1. BACKWARD-COMPATIBLE CHEMICAL BALANCE SCALE (TEST 2 & TEST 6 SUPPORT)
// ============================================================================
export interface ChemicalBalanceScaleProps {
  leftAtomsCount: number;
  rightAtomsCount: number;
  elementName: string;
  feedbackText: string;
  leftAtomsMap?: Record<string, number>;
  rightAtomsMap?: Record<string, number>;
  onAdjustLeft?: (delta: number) => void;
  onAdjustRight?: (delta: number) => void;
  onApplyBalanced?: () => void;
}

export const ChemicalBalanceScale: React.FC<ChemicalBalanceScaleProps> = ({
  leftAtomsCount,
  rightAtomsCount,
  elementName,
  feedbackText,
  leftAtomsMap,
  rightAtomsMap,
  onAdjustLeft,
  onAdjustRight,
  onApplyBalanced,
}) => {
  const diff = rightAtomsCount - leftAtomsCount;
  const tiltAngle = Math.min(Math.max(diff * 6, -15), 15);
  const panOffset = Math.round(Math.tan((tiltAngle * Math.PI) / 180) * 80);

  return (
    <div
      data-testid="chemical-balance-scale"
      className="bg-white p-4 rounded-xl border border-[#E6E4DD] flex flex-col items-center w-full shadow-xs font-sans select-none"
    >
      <div className="text-[11px] font-mono text-stone-500 mb-2 flex items-center justify-between w-full px-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          <span>Thăng bằng số nguyên tử & Electron:</span>
          <span className="text-stone-900 font-bold">{elementName}</span>
        </span>
        <span className="text-[10px] text-stone-400 font-mono">Chạm [+] / [-] trực tiếp</span>
      </div>

      <div className="w-full flex items-center justify-between px-6 py-4 relative min-h-[110px]">
        {/* Fulcrum Stand */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 w-3 h-12 bg-stone-300 rounded-t z-0" />
        <div className="absolute left-1/2 top-12 -translate-x-1/2 w-12 h-2 bg-stone-400 rounded-full" />

        {/* Tilting Beam */}
        <div
          className="absolute left-6 right-6 top-5 h-1.5 bg-stone-600 rounded-full transition-transform duration-300 origin-center"
          style={{ transform: `rotate(${tiltAngle}deg)` }}
        />

        {/* Left Pan */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-300"
          style={{ transform: `translateY(${-panOffset}px)` }}
        >
          <div className="w-28 bg-[#F8F7F4] border border-[#E6E4DD] rounded-xl p-2 text-center shadow-2xs flex flex-col items-center">
            <div className="text-[10px] text-blue-600 font-mono uppercase tracking-wider font-semibold">
              Vế Trái
            </div>
            <div className="text-xs font-mono font-bold text-stone-900 mt-0.5 tabular-nums">
              {leftAtomsCount} {elementName}
            </div>

            {onAdjustLeft && (
              <div className="flex items-center gap-1.5 mt-1.5 font-mono">
                <button
                  type="button"
                  data-testid="adjust-left-minus"
                  onClick={() => onAdjustLeft(-2)}
                  className="w-5 h-5 rounded bg-white hover:bg-stone-50 border border-[#DCD9D0] text-xs font-semibold text-stone-700 transition cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Giảm 2 nguyên tử"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-left-plus"
                  onClick={() => onAdjustLeft(2)}
                  className="w-5 h-5 rounded bg-white hover:bg-stone-50 border border-[#DCD9D0] text-xs font-semibold text-blue-600 transition cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Tăng 2 nguyên tử"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Pan */}
        <div
          className="z-10 flex flex-col items-center transition-transform duration-300"
          style={{ transform: `translateY(${panOffset}px)` }}
        >
          <div className="w-28 bg-[#F8F7F4] border border-[#E6E4DD] rounded-xl p-2 text-center shadow-2xs flex flex-col items-center">
            <div className="text-[10px] text-rose-600 font-mono uppercase tracking-wider font-semibold">
              Vế Phải
            </div>
            <div className="text-xs font-mono font-bold text-stone-900 mt-0.5 tabular-nums">
              {rightAtomsCount} {elementName}
            </div>

            {onAdjustRight && (
              <div className="flex items-center gap-1.5 mt-1.5 font-mono">
                <button
                  type="button"
                  data-testid="adjust-right-minus"
                  onClick={() => onAdjustRight(-3)}
                  className="w-5 h-5 rounded bg-white hover:bg-stone-50 border border-[#DCD9D0] text-xs font-semibold text-stone-700 transition cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Giảm 3 nguyên tử"
                >
                  -
                </button>
                <button
                  type="button"
                  data-testid="adjust-right-plus"
                  onClick={() => onAdjustRight(3)}
                  className="w-5 h-5 rounded bg-white hover:bg-stone-50 border border-[#DCD9D0] text-xs font-semibold text-rose-600 transition cursor-pointer flex items-center justify-center shadow-2xs"
                  title="Tăng 3 nguyên tử"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono mt-2 text-center px-3 py-1.5 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD] flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
        {diff === 0 ? (
          <span className="text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Cân bằng hoàn hảo! Hai vế cùng có {leftAtomsCount} {elementName}.</span>
          </span>
        ) : (
          <span className="text-amber-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{feedbackText}</span>
          </span>
        )}

        {diff === 0 && onApplyBalanced && (
          <button
            type="button"
            data-testid="apply-balanced-btn"
            onClick={onApplyBalanced}
            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer active:translate-y-px shadow-xs"
          >
            Điền vào bài làm
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. PHYSICS FREE-BODY DIAGRAM & ENERGY BAR CHART (TAB A - PHYSICS)
// ============================================================================
export interface PhysicsFBDProps {
  alpha: number; // in degrees, e.g. 30
  mu: number; // e.g. 0.2
  onAlphaChange?: (newAlpha: number) => void;
  onMuChange?: (newMu: number) => void;
  isFrictionMissing?: boolean;
}

export const PhysicsFBDCanvas: React.FC<PhysicsFBDProps> = ({
  alpha,
  mu,
  onAlphaChange,
  onMuChange,
  isFrictionMissing = false,
}) => {
  const rad = (alpha * Math.PI) / 180;
  const a = Math.max(0, 9.8 * (Math.sin(rad) - mu * Math.cos(rad)));
  const aWithoutFriction = 9.8 * Math.sin(rad);

  // Energy proportions on a 10m incline
  const Ep0 = 100;
  const W_loss = Math.min(100, Math.round((mu * Math.cos(rad)) / Math.sin(rad) * 100));
  const Ek = Math.max(0, Ep0 - W_loss);

  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
        <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>Biểu đồ Phân tích Lực (Free-Body Diagram)</span>
        </span>
        <span className="text-[10px] font-mono text-stone-500 bg-[#F2F0EA] px-2 py-0.5 rounded border border-[#E6E4DD]">
          α = {alpha}° • μ = {mu}
        </span>
      </div>

      {/* SVG Canvas for Free-Body Diagram */}
      <div className="relative w-full h-44 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 320 180" className="w-full h-full">
          {/* Ground */}
          <line x1="20" y1="150" x2="300" y2="150" stroke="#71717A" strokeWidth="2" />

          {/* Incline Triangle */}
          <polygon
            points="40,150 260,150 260,40"
            fill="#EFECE6"
            stroke="#A1A1AA"
            strokeWidth="1.5"
          />

          {/* Angle Arc */}
          <path d="M 80 150 A 40 40 0 0 0 74 133" fill="none" stroke="#2563EB" strokeWidth="1.5" />
          <text x="86" y="142" fontSize="10" fill="#2563EB" fontFamily="monospace" fontWeight="bold">
            {alpha}°
          </text>

          {/* Sliding Block */}
          <g transform="translate(170, 85) rotate(-28)">
            <rect x="-18" y="-12" width="36" height="24" rx="2" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
            <text x="0" y="4" fontSize="9" fill="#18181B" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
              m
            </text>

            {/* Normal Force N (up perpendicular) */}
            <line x1="0" y1="-12" x2="0" y2="-45" stroke="#2563EB" strokeWidth="2" markerEnd="url(#arrow-blue)" />
            <text x="4" y="-35" fontSize="9" fill="#2563EB" fontFamily="monospace" fontWeight="bold">N</text>

            {/* Friction Force F_ms (up incline opposite to motion) */}
            {!isFrictionMissing ? (
              <>
                <line x1="18" y1="0" x2="52" y2="0" stroke="#DC2626" strokeWidth="2" />
                <polygon points="52,0 46,-3 46,3" fill="#DC2626" />
                <text x="32" y="-5" fontSize="8" fill="#DC2626" fontFamily="monospace" fontWeight="bold">Fₘₛ</text>
              </>
            ) : (
              /* Warning missing vector dashed outline */
              <line x1="18" y1="0" x2="50" y2="0" stroke="#F43F5E" strokeWidth="2" strokeDasharray="3,3" opacity="0.6" />
            )}

            {/* Gravity Component P_x (down incline) */}
            <line x1="-18" y1="0" x2="-58" y2="0" stroke="#059669" strokeWidth="2" />
            <polygon points="-58,0 -52,-3 -52,3" fill="#059669" />
            <text x="-56" y="-5" fontSize="8" fill="#059669" fontFamily="monospace" fontWeight="bold">Pₓ</text>
          </g>

          {/* Full Gravity Vector P (straight down from block) */}
          <g transform="translate(170, 85)">
            <line x1="0" y1="0" x2="0" y2="48" stroke="#18181B" strokeWidth="2" />
            <polygon points="0,48 -3,42 3,42" fill="#18181B" />
            <text x="4" y="45" fontSize="9" fill="#18181B" fontFamily="monospace" fontWeight="bold">P = mg</text>
          </g>
        </svg>

        {/* Vector Mismatch Warning if Student Omitted Friction */}
        {isFrictionMissing && (
          <div className="absolute top-2 left-2 right-2 p-1.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono flex items-center gap-1.5 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>CẢNH BÁO: ΣF ≠ ma! Bạn đang bỏ quên lực ma sát trượt Fₘₛ = μN.</span>
          </div>
        )}
      </div>

      {/* Energy Partition Bar Chart (W_đ vs Q_nhiệt) */}
      <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD]">
        <div className="flex justify-between items-center text-[10px] font-mono text-stone-600 font-semibold">
          <span>Phân bố Cơ năng ở chân dốc:</span>
          <span>W (cơ năng) = Wđ ({Ek}%) + Qₘₛ ({W_loss}%)</span>
        </div>
        <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-600 h-full transition-all duration-300"
            style={{ width: `${Ek}%` }}
            title={`Động năng hữu ích: ${Ek}%`}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${W_loss}%` }}
            title={`Nhiệt năng tiêu hao: ${W_loss}%`}
          />
        </div>
      </div>

      {/* Interactive Sliders for Angle and Friction */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#F4F3EE] border border-[#E5E3DC]">
          <div className="flex justify-between items-center text-[10px] text-stone-600">
            <span>Góc nghiêng α:</span>
            <span className="font-bold text-blue-700">{alpha}°</span>
          </div>
          <input
            type="range"
            min="15"
            max="75"
            step="5"
            value={alpha}
            onChange={(e) => onAlphaChange?.(Number(e.target.value))}
            className="h-1 bg-stone-300 rounded appearance-none accent-blue-600 cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#F4F3EE] border border-[#E5E3DC]">
          <div className="flex justify-between items-center text-[10px] text-stone-600">
            <span>Hệ số ma sát μ:</span>
            <span className="font-bold text-stone-800">{mu}</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={mu}
            onChange={(e) => onMuChange?.(Number(e.target.value))}
            className="h-1 bg-stone-300 rounded appearance-none accent-stone-700 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MATH PARAMETRIC CURVE CANVAS (TAB A - MATH)
// ============================================================================
export interface MathParametricProps {
  mVal: number;
  onMChange?: (val: number) => void;
}

export const MathParametricCurveCanvas: React.FC<MathParametricProps> = ({
  mVal,
  onMChange,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
        <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Đồ thị Khảo sát Tham số m & Cực trị</span>
        </span>
        <span className="text-[10px] font-mono text-stone-600 bg-[#F2F0EA] px-2 py-0.5 rounded border border-[#E6E4DD]">
          m = {mVal.toFixed(1)}
        </span>
      </div>

      <div className="relative w-full h-44 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] overflow-hidden flex items-center justify-center">
        <svg viewBox="-4 -4 8 8" className="w-full h-full">
          {/* Grid lines */}
          <line x1="-4" y1="0" x2="4" y2="0" stroke="#E4E4E7" strokeWidth="0.08" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#E4E4E7" strokeWidth="0.08" />

          {/* Parametric Curve: y = x^3 - 3mx^2 + 3(m^2 - 1)x */}
          {/* Sampling curve */}
          <path
            d={Array.from({ length: 41 }, (_, i) => {
              const x = -3 + (i / 40) * 6;
              const y = -(Math.pow(x, 3) - 3 * mVal * Math.pow(x, 2) + 3 * (mVal * mVal - 1) * x);
              return `${i === 0 ? 'M' : 'L'} ${x} ${Math.min(Math.max(y, -3.8), 3.8)}`;
            }).join(' ')}
            fill="none"
            stroke="#2563EB"
            strokeWidth="0.12"
          />

          {/* Origin O */}
          <circle cx="0" cy="0" r="0.15" fill="#18181B" />
          <text x="0.2" y="0.4" fontSize="0.4" fill="#18181B" fontFamily="monospace" fontWeight="bold">O</text>

          {/* Symmetrical Extrema Points when m=0: x = -1, y = 2 and x = 1, y = -2 */}
          <circle cx="-1" cy="-2" r="0.14" fill="#E11D48" />
          <text x="-1.8" y="-2" fontSize="0.35" fill="#E11D48" fontFamily="monospace">A(-1, 2)</text>
          <circle cx="1" cy="2" r="0.14" fill="#E11D48" />
          <text x="1.1" y="2.3" fontSize="0.35" fill="#E11D48" fontFamily="monospace">B(1, -2)</text>
        </svg>

        {mVal === 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-medium">
            O(0,0) là trung điểm của AB (Đối xứng hoàn hảo khi m = 0) ✓
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-2 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD]">
        <div className="flex justify-between items-center text-[10px] font-mono text-stone-600">
          <span>Kéo tham số m để dịch chuyển tâm uốn:</span>
          <span className="font-bold text-blue-700">m = {mVal.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="-2"
          max="2"
          step="0.1"
          value={mVal}
          onChange={(e) => onMChange?.(Number(e.target.value))}
          className="h-1 bg-stone-300 rounded appearance-none accent-blue-600 cursor-pointer"
        />
      </div>
    </div>
  );
};

// ============================================================================
// 4. BIOLOGY GENETICS & OPERON LAC CANVAS (TAB A - BIOLOGY)
// ============================================================================
export interface BiologySwitchProps {
  hasLactose: boolean;
  hasMutationO: boolean;
  onToggleLactose?: () => void;
  onToggleMutationO?: () => void;
}

export const BiologyGeneticsAndOperonCanvas: React.FC<BiologySwitchProps> = ({
  hasLactose,
  hasMutationO,
  onToggleLactose,
  onToggleMutationO,
}) => {
  const isTranscribing = hasLactose || hasMutationO;

  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
        <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
          <Atom className="w-3.5 h-3.5 text-blue-600" />
          <span>Mô hình Phân tử Operon Lac & Di truyền</span>
        </span>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
          isTranscribing ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          {isTranscribing ? 'Đang Phiên mã mRNA (BẬT)' : 'Bị Khóa Phiên mã (TẮT)'}
        </span>
      </div>

      {/* Operon DNA Structural Layout */}
      <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] flex flex-col gap-2">
        <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
          Cấu trúc cụm gen Operon Lac (E. coli):
        </div>
        <div className="flex items-center gap-1 w-full text-[10px] font-mono text-center">
          <div className="w-14 py-2 bg-stone-200 border border-stone-300 rounded text-stone-700 font-semibold">
            Gen R
          </div>
          <div className="w-3 text-stone-400">---</div>
          <div className="w-14 py-2 bg-blue-100 border border-blue-200 rounded text-blue-800 font-semibold">
            Vùng P
          </div>
          <div className={`w-14 py-2 rounded border font-semibold ${
            hasMutationO ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-amber-100 border-amber-200 text-amber-800'
          }`}>
            Vùng O {hasMutationO ? '(Đột biến)' : ''}
          </div>
          <div className="w-3 text-stone-400">---</div>
          <div className="flex-1 py-2 bg-emerald-100 border border-emerald-200 rounded text-emerald-800 font-semibold">
            Gen Cấu trúc Z - Y - A
          </div>
        </div>

        {/* Dynamic status notice */}
        <div className="mt-1 text-[11px] font-mono text-stone-600 p-2 bg-white rounded border border-[#E6E4DD]">
          {hasMutationO ? (
            <span className="text-rose-700 font-semibold">
              Vùng O đột biến: Protein ức chế không thể gắn vào ➔ RNA Polymerase tự do phiên mã liên tục!
            </span>
          ) : hasLactose ? (
            <span className="text-emerald-700 font-semibold">
              Có Lactose: Allolactose liên kết làm biến tính protein ức chế ➔ Mở khóa phiên mã gen Z, Y, A.
            </span>
          ) : (
            <span className="text-stone-600">
              Không có Lactose: Protein ức chế bám chặt vùng O ➔ Chặn RNA Polymerase phiên mã.
            </span>
          )}
        </div>
      </div>

      {/* Interactive Toggles */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <button
          type="button"
          onClick={onToggleLactose}
          className={`py-2 px-3 rounded-lg border transition cursor-pointer font-medium ${
            hasLactose
              ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-semibold'
              : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'
          }`}
        >
          {hasLactose ? '✓ Có Lactose' : '○ Không có Lactose'}
        </button>

        <button
          type="button"
          onClick={onToggleMutationO}
          className={`py-2 px-3 rounded-lg border transition cursor-pointer font-medium ${
            hasMutationO
              ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs font-semibold'
              : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'
          }`}
        >
          {hasMutationO ? '✓ Đột biến vùng O' : '○ Vùng O bình thường'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 5. TAB B: DIMENSIONAL & LIMIT INSPECTOR (THPT / OLYMPIAD AUDIT)
// ============================================================================
export interface DimensionalAuditCardProps {
  audit: SocraticProblem['dimensionalAudit'];
}

export const DimensionalAuditCard: React.FC<DimensionalAuditCardProps> = ({ audit }) => {
  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
        <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5 font-mono">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span>Kiểm tra Thứ nguyên & Điều kiện Biên (Dimensional & Limit Inspector)</span>
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
          Chuẩn Quốc tế
        </span>
      </div>

      {/* Unit Balance Card */}
      <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] flex flex-col gap-1.5">
        <div className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
          Cân bằng Thứ nguyên (Unit Check):
        </div>
        <div className="flex items-center justify-between text-xs font-mono font-medium text-stone-800">
          <span>[Vế trái]: <strong className="text-blue-700"><MathText text={audit.leftHandUnit} /></strong></span>
          <span>=</span>
          <span>[Vế phải]: <strong className="text-blue-700"><MathText text={audit.rightHandUnit} /></strong></span>
        </div>
        <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-200 mt-1">
          {audit.explanation}
        </div>
      </div>

      {/* Limiting Cases Table */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
          Khảo sát Giới hạn (Limiting Cases - Trực giác Vật lý):
        </div>
        <div className="flex flex-col gap-1.5">
          {audit.limitingCases.map((c, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#FCFBF9] border border-[#E6E4DD] text-xs flex flex-col gap-1"
            >
              <div className="flex items-center justify-between font-mono font-semibold text-stone-900 gap-2">
                <span className="text-blue-700"><MathText text={c.condition} /></span>
                <span className="text-stone-600 font-normal flex items-center gap-1">➔ <MathText text={c.behavior} /></span>
              </div>
              <p className="text-[11px] text-stone-500 font-serif italic">
                {c.physicalMeaning}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. TAB C: KNOWLEDGE GRAPH MASTERY NODE
// ============================================================================
export interface KnowledgeNodeGraphProps {
  nodes: SocraticProblem['masteryNodes'];
}

export const KnowledgeMasteryNodeGraph: React.FC<KnowledgeNodeGraphProps> = ({ nodes }) => {
  return (
    <div className="flex flex-col gap-3 w-full bg-white p-4 rounded-xl border border-[#E6E4DD] shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
        <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5 font-mono">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Sơ đồ Phân rã Tư duy & Năng lực (Knowledge Graph)</span>
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
          Hồ sơ Năng lực
        </span>
      </div>

      {/* Grit Score Breakdown Card */}
      <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E6E4DD] grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded bg-white border border-[#E6E4DD]">
          <div className="text-[10px] font-mono text-stone-500 uppercase">Chỉ số Nỗ lực</div>
          <div className="text-sm font-mono font-bold text-amber-800 mt-0.5">94 / 100</div>
        </div>
        <div className="p-2 rounded bg-white border border-[#E6E4DD]">
          <div className="text-[10px] font-mono text-stone-500 uppercase">Kháng Bẫy THPT</div>
          <div className="text-sm font-mono font-bold text-emerald-700 mt-0.5">96%</div>
        </div>
        <div className="p-2 rounded bg-white border border-[#E6E4DD]">
          <div className="text-[10px] font-mono text-stone-500 uppercase">Hạt Eureka</div>
          <div className="text-sm font-mono font-bold text-blue-700 mt-0.5">+65 pts</div>
        </div>
      </div>

      {/* Concept Nodes Hierarchy */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="text-[10px] font-mono uppercase text-stone-500 font-semibold">
          Cây Khái niệm Tiền đề (Prerequisite Hierarchy):
        </div>
        <div className="grid grid-cols-2 gap-2">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`p-2.5 rounded-lg border flex flex-col gap-1 transition ${
                node.status === 'MASTERED'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-white border-[#E6E4DD] text-stone-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{node.title}</span>
                {node.status === 'MASTERED' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </div>
              <span className="text-[10px] font-mono text-stone-500">{node.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 7. MASTER 3-TAB DIAGNOSTIC WORKBENCH (LEFT PANE 45%)
// ============================================================================
export interface VisualDebuggerWorkbenchProps {
  problem: SocraticProblem;
  isFrictionMissing?: boolean;
}

export const VisualDebuggerWorkbench: React.FC<VisualDebuggerWorkbenchProps> = ({
  problem,
  isFrictionMissing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'DIMENSIONAL' | 'GRAPH'>('VISUAL');

  // Physics dynamic state
  const [alpha, setAlpha] = useState(30);
  const [mu, setMu] = useState(0.2);

  // Math dynamic state
  const [mVal, setMVal] = useState(0);

  // Biology dynamic state
  const [hasLactose, setHasLactose] = useState(true);
  const [hasMutationO, setHasMutationO] = useState(false);

  return (
    <div
      data-testid="visual-debugger-workbench"
      className="flex flex-col gap-3 w-full font-sans"
    >
      {/* 3-Tab Selector Bar */}
      <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-[#E6E4DD] shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="tab-visual-debugger"
            onClick={() => setActiveTab('VISUAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VISUAL'
                ? 'bg-[#18181B] text-white shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mô phỏng Thị giác</span>
          </button>

          <button
            type="button"
            data-testid="tab-dimensional-audit"
            onClick={() => setActiveTab('DIMENSIONAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DIMENSIONAL'
                ? 'bg-[#18181B] text-white shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Thứ nguyên & Giới hạn</span>
          </button>

          <button
            type="button"
            data-testid="tab-knowledge-graph"
            onClick={() => setActiveTab('GRAPH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'GRAPH'
                ? 'bg-[#18181B] text-white shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sơ đồ Năng lực</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'VISUAL' && (
        <div className="animate-in fade-in duration-150">
          {problem.subject === 'PHYSICS' && (
            <PhysicsFBDCanvas
              alpha={alpha}
              mu={mu}
              onAlphaChange={setAlpha}
              onMuChange={setMu}
              isFrictionMissing={isFrictionMissing}
            />
          )}

          {problem.subject === 'CHEMISTRY' && (
            <ChemicalBalanceScale
              leftAtomsCount={6}
              rightAtomsCount={6}
              elementName="Oxi (O) & 3e⁻"
              feedbackText="Cân bằng hoàn hảo! Hai vế cùng thăng bằng 6 O và 3e⁻ trao đổi."
            />
          )}

          {problem.subject === 'MATH' && (
            <MathParametricCurveCanvas mVal={mVal} onMChange={setMVal} />
          )}

          {problem.subject === 'BIOLOGY' && (
            <BiologyGeneticsAndOperonCanvas
              hasLactose={hasLactose}
              hasMutationO={hasMutationO}
              onToggleLactose={() => setHasLactose((l) => !l)}
              onToggleMutationO={() => setHasMutationO((m) => !m)}
            />
          )}
        </div>
      )}

      {activeTab === 'DIMENSIONAL' && (
        <div className="animate-in fade-in duration-150">
          <DimensionalAuditCard audit={problem.dimensionalAudit} />
        </div>
      )}

      {activeTab === 'GRAPH' && (
        <div className="animate-in fade-in duration-150">
          <KnowledgeMasteryNodeGraph nodes={problem.masteryNodes} />
        </div>
      )}
    </div>
  );
};
