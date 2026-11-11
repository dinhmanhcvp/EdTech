import {describe, it, expect} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {figureContext, latexToClaimText, sceneOnBoard} from '../utils/geoGrade';
import type {Stroke} from '../utils/lassoGeometry';

const geoStroke = (text: string): Stroke => {
  const scene = buildScene(text).scene!;
  return {id: 'g1', points: [{x: 0, y: 0}], color: '#000', width: 3, typeset: {latex: '', text: scene.title, size: 20, w: 100, h: 100}, shape: {kind: 'solid', title: scene.title, geo: {scene, upTo: 0, origin: {x: 0, y: 0}, source: text}}} as unknown as Stroke;
};

describe('ngữ cảnh hình cho chấm bài', () => {
  it('LaTeX viết tay → mệnh đề đọc được', () => {
    expect(latexToClaimText('AB \\perp CD')).toBe('AB ⊥ CD');
    expect(latexToClaimText('\\frac{HD}{HC} = \\frac{KB}{KA}')).toBe('HD/HC = KB/KA');
    expect(latexToClaimText('\\widehat{KQB} = \\widehat{BCD}')).toBe('∠KQB = ∠BCD');
  });
  it('không có hình trên bảng thì không gửi gì', () => {
    expect(sceneOnBoard([])).toBeNull();
    expect(figureContext([], ['x = 1'])).toBeNull();
  });
  it('đánh dấu dòng đúng / không khớp trên hình, bỏ dòng không phải mệnh đề', () => {
    const ctx = figureContext([geoStroke('tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi M là trung điểm BC. Chứng minh rằng AM = BM.')], ['AM = BM', 'AB = AC', 'Vậy bài toán được chứng minh'])!;
    expect(ctx.figure).toContain('Dòng [0] «AM = BM»: đúng trên hình');
    expect(ctx.figure).toContain('Dòng [1] «AB = AC»: KHÔNG khớp trên hình');
    expect(ctx.figure).not.toContain('Dòng [2]');
    expect(ctx.figure).toContain('Cần chứng minh: AM = BM');
    expect(ctx.problem).toContain('trung điểm BC');
  });
});
