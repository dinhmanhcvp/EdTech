import { describe, it, expect } from 'vitest';
import { findAmbiguousTokens, swapTokenInFormula } from '../utils/ocrConfusions';

describe('OCR Confusion Detection & 1-Tap Swap (CP1)', () => {
  it('detects common confusions like Z and 2', () => {
    const res = findAmbiguousTokens('y = Z*x + 2');
    const tokens = res.map((r) => r.token);
    expect(tokens).toContain('Z');
    expect(tokens).toContain('2');

    const zItem = res.find((r) => r.token === 'Z');
    expect(zItem?.alternatives).toContain('2');
  });

  it('detects n and pi confusions', () => {
    const res = findAmbiguousTokens('x = 5*cos(2*n*t)');
    const tokens = res.map((r) => r.token);
    expect(tokens).toContain('n');
    const nItem = res.find((r) => r.token === 'n');
    expect(nItem?.alternatives).toContain('\\pi');
  });

  it('swaps target token cleanly without needing virtual keyboard', () => {
    const original = 'y = Z*x + 1';
    const swapped = swapTokenInFormula(original, 'Z', '2');
    expect(swapped).toBe('y = 2*x + 1');
  });
});
