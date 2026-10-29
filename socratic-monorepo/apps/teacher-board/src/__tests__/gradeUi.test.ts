import {describe, expect, it} from 'vitest';
import {applyPick, lineBox, uncertainBoardPos} from '../utils/gradeUi';
import {imagePointToBoard} from '../utils/isolatedExporter';
import type {ConvertResult} from '../utils/inkConvert';

const res = (): ConvertResult => ({
  engine: 'gemini', confidence: 0.8, ms: 1,
  lines: [
    {text: 'x+5=7', latex: 'x+5=7', confidence: 0.9, alternatives: [], y0: 0.1, y1: 0.4},
    {text: '2x=5', latex: '2x=5', confidence: 0.9, alternatives: [], y0: 0.5, y1: 0.9},
  ],
  uncertain: [
    {line: 0, token: '5', alternatives: ['S', 's'], x: 0.6, y: 0.3},
    {line: 1, token: 'x', alternatives: ['×'], x: 0.3, y: 0.7},
  ],
});

describe('chọn ký tự phân vân', () => {
  it('thay đúng ký tự ở đúng dòng và bỏ mục đã chọn, giữ mục còn lại', () => {
    const r = applyPick(res(), 0, 'S');
    expect(r.lines[0].latex).toBe('x+S=7');
    expect(r.lines[1].latex).toBe('2x=5');
    expect(r.uncertain).toHaveLength(1);
    expect(r.uncertain![0].token).toBe('x');
  });
  it('giữ nguyên ký tự đang chọn thì chỉ bỏ mục', () => {
    const r = applyPick(res(), 0, '5');
    expect(r.lines[0].latex).toBe('x+5=7');
    expect(r.uncertain).toHaveLength(1);
  });
  it('4 điểm phân vân cho 4 mục độc lập, chọn lần lượt về 0', () => {
    let r: ConvertResult = {...res(), uncertain: [0, 1, 2, 3].map((i) => ({line: 0, token: 'x', alternatives: ['y'], x: 0.1 * i, y: 0.2}))};
    for (let i = 0; i < 4; i++) r = applyPick(r, 0, 'x');
    expect(r.uncertain).toHaveLength(0);
  });
  it('chỉ số sai thì không đổi gì', () => {
    const r = res();
    expect(applyPick(r, 9, 'S')).toBe(r);
  });
});

describe('vị trí trên bảng', () => {
  const bbox = {x0: 100, y0: 200, x1: 500, y1: 320};
  it('giữa ảnh ↔ giữa vùng quét; góc ảnh nằm ngoài vùng quét (có lề)', () => {
    const c = imagePointToBoard(bbox, 0.5, 0.5);
    expect(c.x).toBeCloseTo(300, 6);
    expect(c.y).toBeCloseTo(260, 6);
    const tl = imagePointToBoard(bbox, 0, 0);
    expect(tl.x).toBeLessThan(100);
    expect(tl.y).toBeLessThan(200);
  });
  it('ký tự ở 60% chiều rộng nằm bên phải tâm, và trong vùng quét', () => {
    const p = uncertainBoardPos(bbox, res().uncertain![0]);
    expect(p.x).toBeGreaterThan(300);
    expect(p.x).toBeLessThan(500);
  });
  it('hộp dòng theo y0,y1 của AI; thiếu thì chia đều theo số dòng', () => {
    const r = res();
    const a = lineBox(bbox, r, 0);
    const b = lineBox(bbox, r, 1);
    expect(a.y1).toBeLessThanOrEqual(b.y0 + 30);
    expect(a.y0).toBeLessThan(b.y0);
    const noPos: ConvertResult = {...r, lines: r.lines.map((l) => ({...l, y0: undefined, y1: undefined}))};
    expect(lineBox(bbox, noPos, 0)).toEqual({x0: 100, x1: 500, y0: 200, y1: 260});
    expect(lineBox(bbox, noPos, 1)).toEqual({x0: 100, x1: 500, y0: 260, y1: 320});
  });
});
