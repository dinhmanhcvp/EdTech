import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {fitPlaneVertices, planeStats, triangleCenters, solidWire, shapeFromBlueprint, DEFAULT_YAW, DEFAULT_PITCH} from '../utils/inlineShape';
import {makeSolidBlueprint} from '../utils/localRouter';
import {InlineShape} from '../components/canvas/InlineShape';
import type {Stroke} from '../utils/lassoGeometry';

describe('hình phẳng tại chỗ', () => {
  it('khớp đỉnh vào khung, giữ tỉ lệ, đảo trục y', () => {
    const v = fitPlaneVertices([[-2, -1], [2, -1], [0, 1]], 200, 100);
    expect(v[0].x).toBeCloseTo(0, 5);
    expect(v[1].x).toBeCloseTo(200, 5);
    expect(v[2].y).toBeCloseTo(0, 5); // đỉnh trên (y lớn) nằm phía trên màn hình
    expect(v[0].y).toBeCloseTo(100, 5);
  });
  it('cạnh, góc, diện tích của hình vuông 100 px', () => {
    const st = planeStats([{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}], 50);
    expect(st.sides.every((s) => Math.abs(s - 2) < 1e-9)).toBe(true);
    expect(st.angles.every((a) => Math.abs(a - 90) < 1e-6)).toBe(true);
    expect(st.area).toBeCloseTo(4, 9);
  });
  it('tam giác vuông: tâm ngoại tiếp là trung điểm cạnh huyền, trực tâm trùng đỉnh góc vuông, GH = 2·GO', () => {
    const c = triangleCenters([{x: 0, y: 0}, {x: 120, y: 0}, {x: 0, y: 90}])!;
    expect(c.O.x).toBeCloseTo(60, 6);
    expect(c.O.y).toBeCloseTo(45, 6);
    expect(c.H.x).toBeCloseTo(0, 6);
    expect(c.H.y).toBeCloseTo(0, 6);
    const GH = Math.hypot(c.G.x - c.H.x, c.G.y - c.H.y);
    const GO = Math.hypot(c.G.x - c.O.x, c.G.y - c.O.y);
    expect(GH / GO).toBeCloseTo(2, 6);
    expect(triangleCenters([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}])).toBeNull();
  });
});

describe('khối 3D nét liền / nét đứt', () => {
  it('hình lập phương: 12 cạnh, đúng 9 liền + 3 đứt ở góc nhìn mặc định', () => {
    const w = solidWire('cube', {}, DEFAULT_YAW, DEFAULT_PITCH, 200, 200);
    expect(w.edges).toHaveLength(12);
    expect(w.edges.filter((e) => e.hidden)).toHaveLength(3);
    expect(w.pts).toHaveLength(8);
  });
  it('hình chóp tứ giác: 8 cạnh; đổi góc nhìn thì tọa độ chiếu đổi', () => {
    const a = solidWire('pyramid4', {}, 0.3, 0.4, 200, 200);
    const b = solidWire('pyramid4', {}, 1.4, 0.4, 200, 200);
    expect(a.edges).toHaveLength(8);
    expect(a.edges.some((e) => e.hidden)).toBe(true);
    expect(Math.abs(a.pts[0].x - b.pts[0].x) + Math.abs(a.pts[0].y - b.pts[0].y)).toBeGreaterThan(1);
  });
  it('mọi điểm chiếu nằm trong khung', () => {
    const w = solidWire('box', {}, 0.9, 0.5, 220, 180);
    expect(w.pts.every((p) => p.x > -5 && p.x < 225 && p.y > -5 && p.y < 185)).toBe(true);
  });
});

describe('shapeFromBlueprint', () => {
  it('khối và hình phẳng', () => {
    expect(shapeFromBlueprint(makeSolidBlueprint('cube'), 180, 180)?.kind).toBe('solid');
    const plane = shapeFromBlueprint({templateId: 'MATH_DYNAMIC_GEOMETRY', meta: {planeTitle: 'Tam giác', vertices2D: [[0, 0], [2, 0], [1, 2]]}}, 200, 150);
    expect(plane?.kind).toBe('plane');
    expect(plane?.plane?.verts).toHaveLength(3);
    expect(shapeFromBlueprint({templateId: 'MATH_GRAPH', meta: {}}, 100, 100)).toBeNull();
  });
});

describe('InlineShape', () => {
  const base = (shape: Stroke['shape']): Stroke => ({id: 's1', points: [{x: 100, y: 100}], color: '#111', width: 3, typeset: {latex: '', text: '', size: 20, w: 200, h: 160}, shape});
  const handlers = () => ({onChange: vi.fn(), onDelete: vi.fn(), onOpenFull: vi.fn(), onMoveStart: vi.fn(), onMove: vi.fn(), onMoveEnd: vi.fn(), onInteractStart: vi.fn()});

  it('tam giác: nhãn cạnh/góc, bật Euler, xóa', () => {
    const h = handlers();
    const shape = shapeFromBlueprint({templateId: 'MATH_DYNAMIC_GEOMETRY', meta: {planeTitle: 'Tam giác ABC', vertices2D: [[0, 0], [3, 0], [1, 2]]}}, 200, 160)!;
    render(<InlineShape stroke={base(shape)} boardScale={1} picked={false} {...h} />);
    expect(screen.getAllByTestId('side-label')).toHaveLength(3);
    expect(screen.getAllByTestId('angle-label')).toHaveLength(3);
    fireEvent.click(screen.getByTestId('shape-euler-toggle'));
    expect(h.onChange).toHaveBeenCalledOnce();
    expect(h.onChange.mock.calls[0][0].plane.euler).toBe(true);
    fireEvent.click(screen.getByTestId('shape-delete'));
    expect(h.onDelete).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('shape-open-full'));
    expect(h.onOpenFull).toHaveBeenCalled();
  });

  it('khối: có cạnh đứt và vòng xoay', () => {
    const h = handlers();
    const shape = shapeFromBlueprint(makeSolidBlueprint('cube'), 200, 160)!;
    render(<InlineShape stroke={base(shape)} boardScale={1} picked={false} {...h} />);
    expect(screen.getAllByTestId('edge-visible')).toHaveLength(9);
    expect(screen.getAllByTestId('edge-hidden')).toHaveLength(3);
    expect(screen.getByTestId('shape-rotate-handle')).toBeTruthy();
  });
});
