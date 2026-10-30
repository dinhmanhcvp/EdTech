import {describe, it, expect} from 'vitest';
import {detectSolidSketch} from '../utils/sketchSolid';
import oneStrokeCube from './fixtures/oneStrokeCube.json';

describe('detectSolidSketch: khối vẽ một nét liền (không nhấc bút)', () => {
  it('nhận lập phương vẽ một nét (đi lại 3 cạnh)', () => {
    expect(detectSolidSketch([{points: oneStrokeCube}])?.kind).toBe('cube');
  });
  it('ít hơn 4 nét mà cấu trúc không rõ thì không nhận (chữ viết liền không bị coi là khối)', () => {
    const zigzag = Array.from({length: 12}, (_, i) => ({x: i * 20, y: i % 2 ? 0 : 30}));
    expect(detectSolidSketch([{points: zigzag}])).toBeNull();
    expect(detectSolidSketch([])).toBeNull();
  });
});
