import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';
import {buildScene} from '../utils/geometryProblem';
import {layoutGeo} from '../utils/geoTools';

const PYR = 'Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2. Gọi M là trung điểm SB.';
const figure = (): Stroke => {
  const scene = buildScene(PYR).scene!;
  const origin = {x: 450, y: 170};
  const L = layoutGeo(scene, 0, origin);
  return {
    id: 'geo-test',
    points: [{x: L.ax, y: L.ay}],
    color: '#18181B',
    width: 3,
    typeset: {latex: '', text: scene.title, size: 20, w: L.w, h: L.h},
    shape: {kind: 'solid', title: scene.title, sketch: L.sketch, geo: {scene, upTo: 0, origin, source: PYR}},
  };
};
const mPos = () => {
  const t = Array.from(document.querySelectorAll('[data-testid="inline-shape"] text')).find((x) => x.textContent === 'M');
  return t ? `${t.getAttribute('x')},${t.getAttribute('y')}` : '';
};

describe('kéo điểm M trượt trên cạnh SB', () => {
  it('có tay kéo khi đang dùng dụng cụ của hình; kéo thì M dịch chuyển trên hình', async () => {
    render(<SmartboardCanvas initialStrokes={[figure()]} />);
    expect(screen.queryByTestId('geo-drag-point')).toBeNull(); // chưa chọn hình thì không có
    await act(async () => {
      fireEvent.click(await screen.findByTestId('shape-geo-tools'));
    });
    const handle = await screen.findByTestId('geo-drag-point');
    expect(handle.getAttribute('data-name')).toBe('M');
    const before = mPos();
    await act(async () => {
      fireEvent.pointerDown(handle, {clientX: 0, clientY: 0, pointerId: 1});
      fireEvent.pointerMove(handle, {clientX: 4000, clientY: 4000, pointerId: 1});
    });
    expect(mPos()).not.toBe(before);
    await act(async () => {
      fireEvent.pointerUp(handle, {pointerId: 1});
    });
    expect(mPos()).not.toBe(before);
  });
});
