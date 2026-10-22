// apps/teacher-board/src/components/canvas/AIGeneratedVisualEngine.tsx
'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { SimulationBlueprint } from '@socratic/types';
import { Sparkles, Cpu, Maximize2 } from 'lucide-react';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  svgContent?: string;
}

export const AIGeneratedVisualEngine: React.FC<Props> = ({
  blueprint,
  params,
  svgContent,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fallback bespoke SVG if not provided by backend
  const activeSvg = useMemo(() => {
    if (svgContent && svgContent.trim().length > 20) {
      return svgContent;
    }
    if (blueprint.custom_interactive_svg && blueprint.custom_interactive_svg.trim().length > 20) {
      return blueprint.custom_interactive_svg;
    }

    // Default scientific high-craft fallback SVG
    return `
      <svg viewBox="0 0 620 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="aiGlass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#F8FAFC" stop-opacity="0.7" />
          </linearGradient>
          <linearGradient id="aiAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2563EB" />
            <stop offset="100%" stop-color="#059669" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Ambient Laboratory Backdrop -->
        <rect x="15" y="15" width="590" height="310" rx="16" fill="url(#aiGlass)" stroke="#E2E8F0" stroke-width="1.5" />

        <!-- Header Card -->
        <rect x="35" y="32" width="280" height="38" rx="8" fill="#FFFFFF" stroke="#E6E4DD" />
        <circle cx="52" cy="51" r="5" fill="#2563EB" />
        <text x="68" y="55" font-family="monospace" font-size="12" font-weight="bold" fill="#0F172A">
          ${blueprint.recognizedLatex || 'AI SCIENTIFIC VISUALIZER'}
        </text>

        <!-- Dynamic Visual Apparatus -->
        <g transform="translate(180, 180)">
          <!-- Core Central Orbital Rings -->
          <ellipse cx="0" cy="0" rx="110" ry="45" fill="none" stroke="#3B82F6" stroke-width="2" stroke-dasharray="6,4" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="18s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="0" cy="0" rx="110" ry="45" fill="none" stroke="#10B981" stroke-width="2" stroke-dasharray="6,4" opacity="0.6" transform="rotate(60)">
            <animateTransform attributeName="transform" type="rotate" from="60" to="420" dur="24s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="0" cy="0" rx="110" ry="45" fill="none" stroke="#D97706" stroke-width="2" stroke-dasharray="6,4" opacity="0.6" transform="rotate(120)">
            <animateTransform attributeName="transform" type="rotate" from="120" to="480" dur="20s" repeatCount="indefinite" />
          </ellipse>

          <!-- Core Nucleus with PBR glow -->
          <circle cx="0" cy="0" r="28" fill="url(#aiAccent)" filter="url(#softGlow)" />
          <circle cx="-8" cy="-8" r="6" fill="#FFFFFF" opacity="0.8" />
          <text x="0" y="4" font-family="monospace" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
            AI CORE
          </text>
        </g>

        <!-- Right Side Parameter Telemetry HUD -->
        <g transform="translate(390, 45)">
          <rect x="0" y="0" width="200" height="250" rx="12" fill="#FFFFFF" stroke="#E6E4DD" />
          <text x="16" y="28" font-family="monospace" font-size="11" font-weight="bold" fill="#0F172A">THÔNG SỐ MÔ HÌNH AI</text>
          <line x1="16" y1="38" x2="184" y2="38" stroke="#E2E8F0" stroke-width="1" />

          <text x="16" y="65" font-family="sans-serif" font-size="11" fill="#64748B">Chế độ sinh học / vật lý:</text>
          <text x="16" y="82" font-family="monospace" font-size="12" font-weight="bold" fill="#2563EB">Vectorized Adaptive SVG</text>

          <text x="16" y="115" font-family="sans-serif" font-size="11" fill="#64748B">Độ phân giải vector:</text>
          <text x="16" y="132" font-family="monospace" font-size="12" font-weight="bold" fill="#059669">Vô cực (Infinite SVG)</text>

          <text x="16" y="165" font-family="sans-serif" font-size="11" fill="#64748B">Tương tác thời gian thực:</text>
          <text x="16" y="182" font-family="monospace" font-size="12" font-weight="bold" fill="#D97706">Gắn kết tham số trực tiếp</text>

          <rect x="16" y="205" width="168" height="28" rx="6" fill="#F1F5F9" />
          <text x="100" y="223" font-family="monospace" font-size="10" fill="#475569" text-anchor="middle">
            TỰ ĐỘNG CẬP NHẬT THEO SLIDER
          </text>
        </g>
      </svg>
    `;
  }, [svgContent, blueprint.custom_interactive_svg, blueprint.recognizedLatex]);

  // Inject CSS custom properties and dynamic DOM bindings into container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 1. Set CSS variables for every slider parameter: --param-temperature, --param-v0, etc.
    Object.entries(params).forEach(([key, val]) => {
      el.style.setProperty(`--param-${key}`, String(val));
    });

    // 2. Direct DOM bindings on SVG elements with data attributes
    const bindEls = el.querySelectorAll<SVGElement>('[data-bind-param]');
    bindEls.forEach((bindEl) => {
      const paramKey = bindEl.getAttribute('data-bind-param');
      if (paramKey && params[paramKey] !== undefined) {
        const val = params[paramKey];

        // If attribute has data-bind-scale
        if (bindEl.hasAttribute('data-bind-scale')) {
          const baseScale = parseFloat(bindEl.getAttribute('data-bind-scale') || '1');
          bindEl.style.transform = `scale(${1 + (val / 100) * baseScale})`;
        }
        // If attribute has data-bind-rotate
        if (bindEl.hasAttribute('data-bind-rotate')) {
          bindEl.style.transform = `rotate(${val}deg)`;
        }
        // If attribute has data-bind-text
        if (bindEl.hasAttribute('data-bind-text')) {
          bindEl.textContent = String(val);
        }
      }
    });
  }, [params, activeSvg]);

  return (
    <div className="relative w-full max-w-[620px] flex flex-col items-center">
      {/* AI Engine Status Ribbon */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-white/95 backdrop-blur-md rounded-xl border border-[#E6E4DD] shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-stone-800">Đồ họa AI Sinh động</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
            Gemini Interactive SVG
          </span>
        </div>
        <div className="flex items-center gap-2 text-stone-500 text-[10px]">
          <Cpu className="w-3 h-3 text-emerald-600" />
          <span>Liên kết tham số động</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        ref={containerRef}
        data-testid="ai-generated-svg-container"
        className="w-full h-[340px] rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] overflow-hidden flex items-center justify-center p-2 relative"
        dangerouslySetInnerHTML={{ __html: activeSvg }}
      />
    </div>
  );
};
