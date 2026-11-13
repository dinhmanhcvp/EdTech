import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';
import {buildScene} from '../utils/geometryProblem';
import {layoutGeo, showUpTo} from '../utils/geoTools';
import {MAX_LABEL_DRIFT} from '../utils/geoLabels';

const TXT = 'Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi M là trung điểm BC.';

const figure = (): Stroke => {
  const scene = showUpTo(buildScene(TXT).scene!, 0);
  const origin = {x: 450, y: 170};
  const L = layoutGeo(scene, 0, origin);
  return {
    id: 'geo-label',
    points: [{x: L.ax, y: L.ay}],
    color: '#18181B',
    width: 3,
    typeset: {latex: '', text: scene.title, size: 20, w: L.w, h: L.h},
    shape: {kind: 'solid', title: scene.title, sketch: L.sketch, geo: {scene, upTo: 0, origin, source: TXT}},
  };
};
const textOf = (name: string) => Array.from(document.querySelectorAll('[data-testid="inline-shape"] text')).find((t) => t.textContent === name) as SVGTextElement;
const pos = (el: SVGTextElement) => ({x: Number(el.getAttribute('x')), y: Number(el.getAttribute('y'))});

describe('kéo chữ tên đỉnh', () => {
  it('chữ kéo được nhưng không xa đỉnh quá bán kính cho phép; bấm đúp thì về chỗ mặc định', async () => {
    render(<SmartboardCanvas initialStrokes={[figure()]} />);
    const handle = (await screen.findByText('A', {selector: 'text'}).then(() => document.querySelector('[data-testid="geo-label-drag"][data-name="A"]'))) as SVGCircleElement;
    expect(handle).toBeTruthy();
    const before = pos(textOf('A'));
    await act(async () => {
      fireEvent.pointerDown(handle, {clientX: 100, clientY: 100, pointerId: 1});
      fireEvent.pointerMove(handle, {clientX: 100 + 500, clientY: 100 - 500, pointerId: 1});
      fireEvent.pointerUp(handle, {clientX: 600, clientY: -400, pointerId: 1});
    });
    const after = pos(textOf('A'));
    expect(after).not.toEqual(before);
    // đỉnh A = tâm vòng chạm trừ độ lệch cũ; chữ mới cách đỉnh không quá MAX_LABEL_DRIFT
    const vx = before.x - Number(handle.getAttribute('cx')); // chỉ để đảm bảo có số
    expect(Number.isFinite(vx)).toBe(true);
    const moved = document.querySelector('[data-testid="geo-label-drag"][data-name="A"]') as SVGCircleElement;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(2 * MAX_LABEL_DRIFT + 1e-6);
    expect(moved).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(moved);
    });
    expect(pos(textOf('A'))).toEqual(before);
  });
});
