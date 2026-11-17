import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';
import {buildScene} from '../utils/geometryProblem';
import {layoutGeo} from '../utils/geoTools';

const PYR = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD) và SA = a√2. Gọi O là giao điểm của AC và BD. Gọi H là hình chiếu vuông góc của A trên SB.';
const figure = (): Stroke => {
  const scene = buildScene(PYR).scene!;
  const origin = {x: 450, y: 170};
  const L = layoutGeo(scene, 0, origin);
  return {
    id: 'geo-solid',
    points: [{x: L.ax, y: L.ay}],
    color: '#18181B',
    width: 3,
    typeset: {latex: '', text: scene.title, size: 20, w: L.w, h: L.h},
    shape: {kind: 'solid', title: scene.title, sketch: L.sketch, geo: {scene, upTo: 0, origin, source: PYR}},
  };
};
const pos = (name: string) => {
  const t = Array.from(document.querySelectorAll('[data-testid="inline-shape"] text')).find((x) => x.textContent === name);
  return t ? `${t.getAttribute('x')},${t.getAttribute('y')}` : '';
};

describe('kéo đỉnh hình chóp trên bảng', () => {
  it('đang dùng dụng cụ của hình: có tay kéo ở các đỉnh đáy và đỉnh S; kéo C thì C và H (chân đường vuông góc) đổi chỗ', async () => {
    render(<SmartboardCanvas initialStrokes={[figure()]} />);
    expect(screen.queryAllByTestId('geo-free-point')).toHaveLength(0); // chưa chọn hình thì không có
    await act(async () => {
      fireEvent.click(await screen.findByTestId('shape-geo-tools'));
    });
    const handles = await screen.findAllByTestId('geo-free-point');
    expect(handles.map((h) => h.getAttribute('data-name')).sort()).toEqual(['A', 'B', 'C', 'D', 'S']);
    const c = handles.find((h) => h.getAttribute('data-name') === 'C')!;
    const [c0, o0] = [pos('C'), pos('O')];
    await act(async () => {
      fireEvent.pointerDown(c, {clientX: 100, clientY: 100, pointerId: 1});
      fireEvent.pointerMove(c, {clientX: 140, clientY: 80, pointerId: 1});
      fireEvent.pointerUp(c, {pointerId: 1});
    });
    expect(pos('C')).not.toBe(c0);
    expect(pos('O')).not.toBe(o0); // tâm đáy theo
    const s = screen.getAllByTestId('geo-free-point').find((h) => h.getAttribute('data-name') === 'S')!;
    const s0 = pos('S');
    await act(async () => {
      fireEvent.pointerDown(s, {clientX: 100, clientY: 100, pointerId: 2});
      fireEvent.pointerMove(s, {clientX: 100, clientY: 60, pointerId: 2});
      fireEvent.pointerUp(s, {pointerId: 2});
    });
    expect(pos('S')).not.toBe(s0);
  });
});
