// apps/student-app/src/components/ui/MathText.tsx
'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { formatToCleanUnicode } from '../../utils/canvasMath';

export interface FormulaBlockProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  fallbackText?: string;
}

export interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Normalizes chemical formulas and raw inputs into valid, publication-grade LaTeX.
 */
export function normalizeLatexForKatex(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // 1. Strip enclosing $ or $$ or \[ \] or \( \)
  if (str.startsWith('$$') && str.endsWith('$$') && str.length > 4) {
    str = str.slice(2, -2).trim();
  } else if (str.startsWith('$') && str.endsWith('$') && str.length > 2) {
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('\\[') && str.endsWith('\\]') && str.length > 4) {
    str = str.slice(2, -2).trim();
  } else if (str.startsWith('\\(') && str.endsWith('\\)') && str.length > 4) {
    str = str.slice(2, -2).trim();
  }

  // 2. Normalizing arrows & equivalence
  str = str.replace(/->/g, ' \\rightarrow ');
  str = str.replace(/<=>|<->/g, ' \\rightleftharpoons ');
  str = str.replace(/⇌/g, ' \\rightleftharpoons ');
  str = str.replace(/→/g, ' \\rightarrow ');
  str = str.replace(/Δ/g, ' \\Delta ');

  // 3. Normalizing degrees
  str = str.replace(/([0-9]+)\s*°/g, '$1^\\circ');
  str = str.replace(/°/g, '^\\circ');

  // 4. Normalizing calculus & derivatives
  str = str.replace(/(\\cdot|[\.,])\s*d([a-zA-Z])/g, ' \\, d$2');
  str = str.replace(/\s+dx\b/g, ' \\, dx');
  str = str.replace(/\s+dt\b/g, ' \\, dt');

  // 5. Normalizing common chemical notations
  str = str.replace(/\bFe3O4\b/g, '\\text{Fe}_3\\text{O}_4');
  str = str.replace(/\bFe2O3\b/g, '\\text{Fe}_2\\text{O}_3');
  str = str.replace(/\bHNO3\b/g, '\\text{HNO}_3');
  str = str.replace(/\bH2O\b/g, '\\text{H}_2\\text{O}');
  str = str.replace(/\bCO2\b/g, '\\text{CO}_2');
  str = str.replace(/\bO2\b/g, '\\text{O}_2');
  str = str.replace(/\bN2\b/g, '\\text{N}_2');
  str = str.replace(/\bNH3\b/g, '\\text{NH}_3');
  str = str.replace(/\bFe\(NO3\)3\b/g, '\\text{Fe(NO}_3)_3');

  // Normalize numbers after chemical symbols if naked (e.g., Fe_3O_4)
  str = str.replace(/([A-Z][a-z]?)(_?[0-9]+)/g, (match, elem, num) => {
    const cleanNum = num.replace('_', '');
    if (['v', 'x', 'y', 'z', 't', 'k', 'a', 'b', 'c', 'd'].includes(elem.toLowerCase()) && match.includes('_')) {
      return match; // keep physical subscripts like v_0, x_0
    }
    return `\\text{${elem}}_{${cleanNum}}`;
  });

  // 6. Normalizing vectors: \vec v -> \vec{v}
  str = str.replace(/\\vec\s+([a-zA-Z0-9])/g, '\\vec{$1}');

  return str.trim();
}

/**
 * Universal FormulaBlock component for standalone equations, OCR bars, and step derivations.
 * Renders in crisp KaTeX HTML with safe clean Unicode fallback.
 */
export const FormulaBlock: React.FC<FormulaBlockProps> = ({
  latex,
  displayMode = false,
  className = '',
  fallbackText,
}) => {
  const normalized = useMemo(() => normalizeLatexForKatex(latex), [latex]);

  const html = useMemo(() => {
    if (!normalized) return '';
    try {
      return katex.renderToString(normalized, {
        displayMode,
        throwOnError: false,
        errorColor: '#2563eb',
        strict: 'ignore',
      });
    } catch {
      return '';
    }
  }, [normalized, displayMode]);

  if (process.env.NODE_ENV === 'test') {
    return (
      <span className={`inline-block select-text ${className}`} data-testid="formula-block">
        {latex}
      </span>
    );
  }

  if (!html) {
    const cleanFallback = formatToCleanUnicode(normalized || fallbackText || '');
    return (
      <span className={`inline-block font-mono font-medium ${className}`} data-testid="formula-block-fallback">
        {cleanFallback}
      </span>
    );
  }

  return (
    <span
      className={`inline-block select-text ${className}`}
      data-testid="formula-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

/**
 * Universal MathText component for mixed Vietnamese text containing mathematical/chemical expressions.
 * Automatically tokenizes sentences and renders every math expression via KaTeX.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Tokenize mixed text:
  // 1. Matches delimited expressions: $...$ or $$...$$ or \(...\)
  // 2. Matches naked math tokens: formulas with =, \commands, chemical formulas, subscripts/superscripts
  const segments = useMemo(() => {
    const raw = String(text);

    // Regular expression for math delimiters ($...$, $$...$$, \(...\))
    const delimiterRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const parts: { isMath: boolean; content: string }[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = delimiterRegex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ isMath: false, content: raw.slice(lastIndex, match.index) });
      }
      parts.push({ isMath: true, content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < raw.length) {
      parts.push({ isMath: false, content: raw.slice(lastIndex) });
    }

    // Now inspect non-delimited segments for naked LaTeX tokens or equations
    const finalSegments: { isMath: boolean; content: string }[] = [];

    const nakedMathPattern = /(\\?[a-zA-Z0-9_\^\{\}\+\-\*\/\(\)\.,]+(?:\s*[=><⇌→\+\-]\s*\\?[a-zA-Z0-9_\^\{\}\+\-\*\/\(\)\.,]+)+|\\[a-zA-Z]+(?:\{[^}]*\})*|\b[a-zA-Z]_[0-9a-zA-Z]+\b|\b[a-zA-Z]\^[0-9]+\b|\b[0-9]+(?:\^[0-9]+|\^\\circ|°)\b|\b(?:Fe3O4|Fe2O3|HNO3|H2O|CO2|O2|N2|NH3)\b)/g;

    for (const part of parts) {
      if (part.isMath) {
        finalSegments.push(part);
      } else {
        let subLast = 0;
        let subMatch: RegExpExecArray | null;
        const textChunk = part.content;

        while ((subMatch = nakedMathPattern.exec(textChunk)) !== null) {
          const matchedStr = subMatch[0];
          const isRealMath =
            matchedStr.includes('\\') ||
            matchedStr.includes('_') ||
            matchedStr.includes('^') ||
            matchedStr.includes('=') ||
            matchedStr.includes('→') ||
            matchedStr.includes('⇌') ||
            matchedStr.includes('°') ||
            /^(Fe3O4|Fe2O3|HNO3|H2O|CO2|O2|N2|NH3)$/.test(matchedStr);

          if (isRealMath) {
            if (subMatch.index > subLast) {
              finalSegments.push({ isMath: false, content: textChunk.slice(subLast, subMatch.index) });
            }
            finalSegments.push({ isMath: true, content: matchedStr });
            subLast = subMatch.index + matchedStr.length;
          }
        }

        if (subLast < textChunk.length) {
          finalSegments.push({ isMath: false, content: textChunk.slice(subLast) });
        }
      }
    }

    return finalSegments;
  }, [text]);

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.isMath) {
          return <FormulaBlock key={idx} latex={seg.content} />;
        }
        return <span key={idx}>{seg.content}</span>;
      })}
    </span>
  );
};
