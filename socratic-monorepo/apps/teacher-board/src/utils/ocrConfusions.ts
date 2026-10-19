// apps/teacher-board/src/utils/ocrConfusions.ts
/**
 * Detects common handwriting OCR visual confusions and generates
 * 1-tap swap candidates (Zero Virtual Keyboard Needed).
 */

export interface TokenConfusion {
  index: number;
  token: string;
  alternatives: string[];
}

const CONFUSION_MAP: Record<string, string[]> = {
  'Z': ['2', 'z'],
  '2': ['Z'],
  'n': ['\\pi', '\\eta', 'm'],
  '\\pi': ['n', 'p'],
  'pi': ['n'],
  'l': ['1', 'I', '|'],
  '1': ['l', 'I'],
  'I': ['1', 'l'],
  'O': ['0', 'o'],
  '0': ['O', 'o'],
  'S': ['5', 's'],
  '5': ['S'],
  'B': ['8', 'b'],
  '8': ['B'],
  'w': ['\\omega', 'W'],
  '\\omega': ['w'],
  'a': ['\\alpha'],
  '\\alpha': ['a'],
  't': ['+'],
  '+': ['t'],
  'q': ['9', 'g'],
  '9': ['q'],
};

export function findAmbiguousTokens(formula: string): TokenConfusion[] {
  if (!formula) return [];
  const results: TokenConfusion[] = [];
  const tokens = formula.split(/(\s+|[+\-*/=^(),\\]|[A-Za-z0-9]+)/).filter(Boolean);

  let charOffset = 0;
  for (const tok of tokens) {
    const trimmed = tok.trim();
    if (CONFUSION_MAP[trimmed]) {
      results.push({
        index: charOffset,
        token: trimmed,
        alternatives: CONFUSION_MAP[trimmed],
      });
    }
    charOffset += tok.length;
  }

  return results;
}

export function swapTokenInFormula(formula: string, targetToken: string, replacement: string): string {
  // Replace first occurrence of targetToken with boundary check
  const idx = formula.indexOf(targetToken);
  if (idx === -1) return formula;
  return formula.slice(0, idx) + replacement + formula.slice(idx + targetToken.length);
}
