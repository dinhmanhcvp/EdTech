import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';
import {buildScene} from '../utils/geometryProblem';
import {layoutGeo} from '../utils/geoTools';

const figure = (): Stroke => {
  const scene = buildScene('tam giác ABC vuông tại A').scene!;
  const origin = {x: 450, y: 170};
  const L = layoutGeo(scene, 0, origin);
  return {
    id: 'geo-test',
    points: [{x: L.ax, y: L.ay}],
    color: '#18181B',
    width: 3,
    typeset: {latex: '', text: scene.title, size: 20, w: L.w, h: L.h},
    shape: {kind: 'solid', title: scene.title, sketch: L.sketch, geo: {scene, upTo: 0, origin, source: 'tam giác ABC vuông tại A'}},
  };
};
const note = (text: string): Stroke => ({
  id: 'text-1',
  points: [{x: 60, y: 90}],
  color: '#18181B',
  width: 3,
  typeset: {latex: '', text, size: 20, w: 320, h: 30},
});

describe('viết yêu cầu lên bảng, khoanh, bấm Vẽ hình: thêm vào hình đang có', () => {
  it('"vẽ đường tròn ngoại tiếp tam giác ABC" thêm đường tròn vào hình, không tạo hình mới', async () => {
    const t = note('vẽ đường tròn ngoại tiếp tam giác ABC');
    render(<SmartboardCanvas initialStrokes={[figure(), t]} initialSelectedStrokes={[t]} />);
    expect(screen.queryByTestId('geo-circle')).toBeNull();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('ai-fab-draw'));
    });
    await waitFor(() => expect(screen.getAllByTestId('geo-circle')).toHaveLength(1));
    expect(screen.getAllByTestId('inline-shape')).toHaveLength(1);
    expect(screen.getByTestId('info-toast').textContent).toContain('đường tròn');
  });

  it('chữ không hiểu thì báo và không đổi hình', async () => {
    const t = note('xin chào các em');
    render(<SmartboardCanvas initialStrokes={[figure(), t]} initialSelectedStrokes={[t]} />);
    await act(async () => {
      fireEvent.click(await screen.findByTestId('ai-fab-draw'));
    });
    await waitFor(() => expect(screen.getByTestId('error-toast')).toBeTruthy());
    expect(screen.queryByTestId('geo-circle')).toBeNull();
  });
});
