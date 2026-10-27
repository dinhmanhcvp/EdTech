import { describe, it, expect } from 'vitest';
import { classifyLassoIntent, estimateLineClusters } from '../utils/lassoIntent';
import { Stroke } from '../utils/lassoGeometry';

describe('Lasso Intent Classifier (Auto-detect VISUALIZE vs GRADE)', () => {
  // Helper to create synthetic strokes
  const makeStroke = (id: string, x: number, y: number, w: number, h: number): Stroke => ({
    id,
    color: '#ffffff',
    width: 3,
    points: [
      { x, y, p: 0.5 },
      { x: x + w, y: y + h, p: 0.5 },
    ],
  });

  it('correctly estimates vertical line clusters', () => {
    // 3 distinct horizontal lines with vertical gap
    const line1 = [makeStroke('1', 50, 50, 40, 10), makeStroke('2', 100, 52, 30, 10)];
    const line2 = [makeStroke('3', 50, 120, 50, 10), makeStroke('4', 110, 122, 40, 10)];
    const line3 = [makeStroke('5', 50, 190, 60, 10), makeStroke('6', 120, 192, 50, 10)];

    const allStrokes = [...line1, ...line2, ...line3];
    expect(estimateLineClusters(allStrokes)).toBe(3);
  });

  it('classifies single-line STEM formulas as VISUALIZE', () => {
    // Teacher writes "y = 2\sin(3x)": 6 strokes, 1 line, wide aspect ratio
    const strokes: Stroke[] = [];
    for (let i = 0; i < 6; i++) {
      strokes.push(makeStroke(`s${i}`, 100 + i * 40, 200, 30, 25));
    }

    const result = classifyLassoIntent(strokes, 'y = 2\\sin(3x)');
    expect(result.intent).toBe('VISUALIZE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.features.lineCount).toBe(1);
    expect(result.features.strokeCount).toBe(6);
  });

  it('classifies chemical reaction equation as VISUALIZE', () => {
    // Teacher writes "4Fe + 3O_2 -> 2Fe_2O_3": 14 strokes, 1 line, wide
    const strokes: Stroke[] = [];
    for (let i = 0; i < 14; i++) {
      strokes.push(makeStroke(`s${i}`, 80 + i * 25, 150, 20, 25));
    }

    const result = classifyLassoIntent(strokes, '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3');
    expect(result.intent).toBe('VISUALIZE');
    expect(result.features.lineCount).toBe(1);
  });

  it('classifies student multi-line solution with keywords as GRADE', () => {
    // Student writes solution: 40 strokes across 4 lines
    const strokes: Stroke[] = [];
    for (let line = 0; line < 4; line++) {
      for (let s = 0; s < 10; s++) {
        strokes.push(makeStroke(`l${line}_s${s}`, 100 + s * 30, 100 + line * 60, 25, 30));
      }
    }

    const result = classifyLassoIntent(
      strokes,
      'Bài làm: \\n Ta có v = v_0 + at = 10 + 2*5 = 20 \\n => S = 75m \\n Đáp số: 75m'
    );

    expect(result.intent).toBe('GRADE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.features.hasKeywords).toBe(true);
    expect(result.features.hasDerivation).toBe(true);
    expect(result.features.lineCount).toBeGreaterThanOrEqual(3);
    expect(result.features.strokeCount).toBe(40);
  });

  it('classifies dense multi-step derivations with derivation operators as GRADE', () => {
    // 35 strokes, 3 lines, equations with =>
    const strokes: Stroke[] = [];
    for (let line = 0; line < 3; line++) {
      for (let s = 0; s < 12; s++) {
        strokes.push(makeStroke(`l${line}_s${s}`, 120 + s * 25, 80 + line * 70, 20, 35));
      }
    }

    const result = classifyLassoIntent(strokes, 'x^2 - 4x + 3 = 0 \\\\ => (x-1)(x-3) = 0 \\\\ => x=1, x=3');
    expect(result.intent).toBe('GRADE');
    expect(result.features.hasDerivation).toBe(true);
  });
});
