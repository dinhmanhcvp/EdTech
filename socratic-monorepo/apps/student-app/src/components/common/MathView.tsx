'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

export interface MathViewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  fallbackText?: string;
}

export function cleanLatexForKatex(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  if (str.startsWith('$$') && str.endsWith('$$') && str.length > 4) {
    str = str.slice(2, -2).trim();
  } else if (str.startsWith('$') && str.endsWith('$') && str.length > 2) {
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('\\[') && str.endsWith('\\]') && str.length > 4) {
    str = str.slice(2, -2).trim();
  }

  str = str.replace(/(\\cdot|[\.,])\s*d([a-zA-Z])/g, ' \\, d$2');
  str = str.replace(/\s+dx\b/g, ' \\, dx');
  str = str.replace(/\s+dt\b/g, ' \\, dt');
  str = str.replace(/([0-9]+)\s*°/g, '$1^\\circ');

  str = str.replace(/→/g, '\\rightarrow ');
  str = str.replace(/⇌/g, '\\rightleftharpoons ');
  str = str.replace(/Δ/g, '\\Delta ');

  return str;
}

export const MathView: React.FC<MathViewProps> = ({
  latex,
  displayMode = false,
  className = '',
  fallbackText,
}) => {
  const cleaned = cleanLatexForKatex(latex);

  const html = useMemo(() => {
    if (!cleaned) return '';
    try {
      return katex.renderToString(cleaned, {
        displayMode,
        throwOnError: false,
        errorColor: '#f43f5e',
        strict: 'ignore',
      });
    } catch (err) {
      console.warn('[MathView] KaTeX renderToString error:', err);
      return '';
    }
  }, [cleaned, displayMode]);

  if (!html) {
    const pretty = cleaned
      .replace(/\\int/g, '∫')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\pi/g, 'π')
      .replace(/\\alpha/g, 'α')
      .replace(/\\theta/g, 'θ')
      .replace(/\\omega/g, 'ω')
      .replace(/\\phi/g, 'φ')
      .replace(/\\varphi/g, 'φ')
      .replace(/\\cos/g, 'cos')
      .replace(/\\sin/g, 'sin')
      .replace(/\\cdot/g, '·')
      .replace(/\\,/g, ' ')
      .replace(/\\quad/g, '   ')
      .replace(/\\rightleftharpoons/g, '⇌')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\iff/g, '⇔')
      .replace(/\\pm/g, '±')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\^2\b/g, '²')
      .replace(/\^3\b/g, '³')
      .replace(/\^4\b/g, '⁴');

    return (
      <span
        className={`inline-block select-text font-serif italic ${className}`}
        data-testid="math-view-fallback"
      >
        {pretty || fallbackText || latex}
      </span>
    );
  }

  return (
    <span
      className={`inline-block select-text ${className}`}
      data-testid="math-view"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
