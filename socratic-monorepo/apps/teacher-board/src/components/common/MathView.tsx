'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    katex?: {
      render: (tex: string, element: HTMLElement, options?: any) => void;
      renderToString: (tex: string, options?: any) => string;
    };
  }
}

export interface MathViewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  fallbackText?: string;
}

/**
 * Clean raw LaTeX strings from OCR or LLM so KaTeX renders cleanly without errors.
 */
export function cleanLatexForKatex(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Strip enclosing $ or $$ or \[ \]
  if (str.startsWith('$$') && str.endsWith('$$') && str.length > 4) {
    str = str.slice(2, -2).trim();
  } else if (str.startsWith('$') && str.endsWith('$') && str.length > 2) {
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('\\[') && str.endsWith('\\]') && str.length > 4) {
    str = str.slice(2, -2).trim();
  }

  // Convert raw artifacts like \cdot dx or , dx into proper spacing \, dx
  str = str.replace(/(\\cdot|[\.,])\s*d([a-zA-Z])/g, ' \\, d$2');
  str = str.replace(/\s+dx\b/g, ' \\, dx');
  str = str.replace(/\s+dt\b/g, ' \\, dt');

  // Fix degree symbol
  str = str.replace(/([0-9]+)\s*°/g, '$1^\\circ');

  return str;
}

export const MathView: React.FC<MathViewProps> = ({
  latex,
  displayMode = true,
  className = '',
  fallbackText,
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const cleaned = cleanLatexForKatex(latex);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.katex && typeof window.katex.render === 'function') {
      try {
        window.katex.render(cleaned, el, {
          displayMode,
          throwOnError: false,
          errorColor: '#f43f5e',
        });
        return;
      } catch (err) {
        console.warn('[MathView] KaTeX render exception:', err);
      }
    }

    // Fallback: human-readable unicode typography if KaTeX is not loaded
    const pretty = cleaned
      .replace(/\\int/g, '∫')
      .replace(/\\pi/g, 'π')
      .replace(/\\alpha/g, 'α')
      .replace(/\\theta/g, 'θ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\phi/g, 'φ')
      .replace(/\\cos/g, 'cos')
      .replace(/\\sin/g, 'sin')
      .replace(/\\cdot/g, '·')
      .replace(/\\,/g, ' ')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\^2\b/g, '²')
      .replace(/\^3\b/g, '³')
      .replace(/\^4\b/g, '⁴');

    el.textContent = pretty || fallbackText || latex;
  }, [cleaned, displayMode, fallbackText, latex]);

  return (
    <span
      ref={containerRef}
      className={`inline-block select-text ${className}`}
      data-testid="math-view"
    >
      {cleaned}
    </span>
  );
};
