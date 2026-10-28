import {describe, expect, it} from 'vitest';
import type {SimulationBlueprint} from '@socratic/types';
import type {Stroke} from '../utils/lassoGeometry';
import {buildBoardContext, summarizeContext, suggestQuestions} from '../utils/boardContext';

const pt = (x: number, y: number) => [{x, y}, {x: x + 5, y: y + 5}];
const formula = (id: string, latex: string, x = 100, y = 100): Stroke => ({id, points: pt(x, y), color: '#111', width: 3, typeset: {latex, text: latex, size: 20, w: 100, h: 30}});
const triangle = (id = 'tri', constructs?: {k: 'median'; i: number}[]): Stroke => ({
  id,
  points: pt(900, 500),
  color: '#111',
  width: 3,
  typeset: {latex: '', text: '', size: 20, w: 200, h: 160},
  // A(0,150) B(200,150) C(0,0): AB = 4, BC = 5, CA = 3 (đơn vị = 50 px), vuông tại A
  shape: {kind: 'plane', title: 'Tam giác ABC', plane: {verts: [{x: 0, y: 150}, {x: 200, y: 150}, {x: 0, y: 0}], euler: false, constructs}},
});
const ink: Stroke = {id: 'ink1', points: pt(50, 50), color: '#111', width: 3};
const bp = {
  engine: 'PHYSICS', templateId: 'PHYS_PROJECTILE', recognizedLatex: 'v_0 t', ocrAlternatives: [],
  parameters: [{key: 'v0', label: 'Tốc độ', unit: 'm/s', defaultValue: 20, min: 1, max: 50, step: 1}, {key: 'alpha', label: 'Góc', unit: '°', defaultValue: 45, min: 0, max: 90, step: 1}],
  meta: {planeTitle: 'x', big: '<svg>' + 'a'.repeat(50) + '</svg>', arr: [1, 2], n: 3, flag: true},
  socraticQuestion: '?',
} as unknown as SimulationBlueprint;

describe('buildBoardContext', () => {
  it('công thức: giữ LaTeX và vị trí tương đối', () => {
    const c = buildBoardContext({strokes: [formula('f1', 'y = x^2 - 3', 100, 80)]});
    expect(c.items).toEqual([expect.objectContaining({id: 'f1', kind: 'formula', latex: 'y = x^2 - 3', where: 'trên-trái'})]);
  });

  it('hình phẳng: số đo theo TÊN đỉnh/cạnh (không buộc AI đếm theo thứ tự mảng)', () => {
    const c = buildBoardContext({strokes: [triangle()]});
    const it = c.items[0];
    expect(it.kind).toBe('plane');
    expect(it.names).toEqual(['A', 'B', 'C']);
    expect(it.measures!.sides_named).toEqual({AB: 4, BC: 5, CA: 3});
    expect(it.measures!.angles_named.A).toBeCloseTo(90, 1);
    expect(it.measures!.area).toBeCloseTo(6, 2);
    expect(it.where).toBe('dưới-phải');
  });

  it('phép dựng đã làm trên hình đi theo: tên phép dựng và các nhận xét đo', () => {
    const c = buildBoardContext({strokes: [triangle('t', [{k: 'median', i: 0}])]});
    expect(c.items[0].constructs).toEqual(['Trung tuyến A']);
    expect(c.items[0].facts!.join(' ')).toContain('trung tuyến');
  });

  it('nét viết tay chưa nhận dạng gộp thành một mục, không gửi tọa độ nét', () => {
    const c = buildBoardContext({strokes: [ink, {...ink, id: 'ink2'}]});
    expect(c.items).toEqual([{id: 'ink', kind: 'ink', count: 2, where: 'trên-trái'}]);
  });

  it('vùng chọn chỉ chứa id có thật; nét thô được chọn không tạo id lạ', () => {
    const f = formula('f1', 'x');
    const c = buildBoardContext({strokes: [f, ink], selected: [f, {...ink, id: 'ghost'}]});
    expect(c.selection).toEqual({item_ids: ['f1']});
  });

  it('mô phỏng: tham số hiện tại thắng mặc định; meta bỏ SVG, mảng; có môn đang khóa', () => {
    const c = buildBoardContext({strokes: [], blueprint: bp, params: {alpha: 60}, subject: 'PHYSICS'});
    expect(c.simulation!.params).toEqual({v0: 20, alpha: 60});
    expect(c.simulation!.meta).toEqual({planeTitle: 'x', n: 3, flag: true});
    expect(c.simulation!.templateId).toBe('PHYS_PROJECTILE');
    expect(c.subject).toBe('PHYSICS');
  });

  it('giới hạn số đối tượng để lời nhắc không phình vô hạn', () => {
    const many = Array.from({length: 80}, (_, i) => formula(`f${i}`, 'x'));
    expect(buildBoardContext({strokes: many}).items.length).toBeLessThanOrEqual(40);
  });
});

describe('summarizeContext / suggestQuestions', () => {
  it('nhãn "AI đã đọc" thu hẹp theo vùng chọn', () => {
    const f = formula('f1', 'y = x^2');
    const t = triangle();
    expect(summarizeContext(buildBoardContext({strokes: [f, t]}))).toEqual(expect.arrayContaining([expect.stringContaining('y = x^2'), '△ Tam giác ABC']));
    const sel = summarizeContext(buildBoardContext({strokes: [f, t], selected: [t]}));
    expect(sel[0]).toBe('▭ Vùng đang chọn');
    expect(sel.join(' ')).not.toContain('y = x^2');
  });

  it('câu hỏi gợi ý đổi theo nội dung bảng; bảng trống thì mời viết/vẽ, không bịa chủ đề', () => {
    expect(suggestQuestions(buildBoardContext({strokes: [triangle()]})).join(' ')).toContain('Tam giác ABC');
    expect(suggestQuestions(buildBoardContext({strokes: [formula('f', 'v_0 t')]})).join(' ')).toContain('v_0 t');
    expect(suggestQuestions(buildBoardContext({strokes: [], blueprint: bp})).join(' ')).toContain('tham số');
    expect(suggestQuestions({items: []})).toEqual(['Hãy viết công thức hoặc vẽ hình lên bảng rồi hỏi mình nhé.']);
  });
});
