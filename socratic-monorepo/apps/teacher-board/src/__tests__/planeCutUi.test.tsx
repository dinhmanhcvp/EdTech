import React, {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {InlineShape} from '../components/canvas/InlineShape';
import type {Stroke} from '../utils/lassoGeometry';
import {shapeFromBlueprint} from '../utils/inlineShape';

const tri = () => shapeFromBlueprint({templateId: 'MATH_DYNAMIC_GEOMETRY', meta: {planeTitle: 'Tam giác ABC', vertices2D: [[0, 0], [3, 0], [1, 2]]}}, 200, 160)!;

const Harness: React.FC = () => {
  const [shape, setShape] = useState(tri());
  const stroke: Stroke = {id: 's1', points: [{x: 100, y: 100}], color: '#111', width: 3, typeset: {latex: '', text: '', size: 20, w: 200, h: 160}, shape};
  const noop = vi.fn();
  return <InlineShape stroke={stroke} boardScale={1} picked={false} onChange={setShape} onDelete={noop} onOpenFull={noop} onMoveStart={noop} onMove={noop} onMoveEnd={noop} onInteractStart={noop} />;
};

/** trung điểm cạnh k theo vùng chạm của nó (tọa độ cục bộ = tọa độ màn hình vì jsdom có khung 0 và boardScale = 1) */
const sideMid = (k: number) => {
  const l = screen.getAllByTestId('side-hit')[k];
  const n = (a: string) => Number(l.getAttribute(a));
  return {x: (n('x1') + n('x2')) / 2, y: (n('y1') + n('y2')) / 2};
};

describe('cắt hình bằng cách kéo từ cạnh này sang cạnh khác', () => {
  it('kéo cạnh AB → cạnh CA: hiện đường cắt, mảnh tô màu, số đo hai mảnh; nút Tách mảnh dời mảnh ra', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    const from = sideMid(0);
    const to = sideMid(2);
    const side0 = screen.getAllByTestId('side-hit')[0];
    fireEvent.pointerDown(side0, {pointerId: 1, clientX: from.x, clientY: from.y});
    fireEvent.pointerMove(side0, {pointerId: 1, clientX: (from.x + to.x) / 2, clientY: (from.y + to.y) / 2});
    expect(screen.getByTestId('cut-preview')).toBeInTheDocument();
    fireEvent.pointerUp(side0, {pointerId: 1, clientX: to.x, clientY: to.y});

    expect(screen.queryByTestId('cut-preview')).toBeNull();
    expect(screen.getAllByTestId('cut-fill')).toHaveLength(1);
    expect(screen.getByTestId('construct-facts').textContent).toMatch(/Cắt [A-Z]{2} = .*S₁ = .*S₂ = /);

    fireEvent.click(screen.getByTestId('cut-separate'));
    expect(screen.getByTestId('cut-ghost')).toBeInTheDocument();
    expect(screen.getAllByTestId('cut-fill')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('cut-separate'));
    expect(screen.queryByTestId('cut-ghost')).toBeNull();
  });

  it('kéo rồi thả giữa khoảng trống (không trúng cạnh nào): không cắt', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    const from = sideMid(0);
    const side0 = screen.getAllByTestId('side-hit')[0];
    fireEvent.pointerDown(side0, {pointerId: 1, clientX: from.x, clientY: from.y});
    fireEvent.pointerMove(side0, {pointerId: 1, clientX: from.x + 40, clientY: from.y - 40});
    fireEvent.pointerUp(side0, {pointerId: 1, clientX: 500, clientY: 500});
    expect(screen.queryAllByTestId('cut-fill')).toHaveLength(0);
    expect(screen.queryByTestId('cut-preview')).toBeNull();
  });
});
