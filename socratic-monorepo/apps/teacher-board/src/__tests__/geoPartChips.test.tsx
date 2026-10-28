import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';
import {buildScene} from '../utils/geometryProblem';
import {layoutGeo, showUpTo} from '../utils/geoTools';

const PYR = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2. a) Gọi M là trung điểm SB. b) Gọi O = AC ∩ BD. c) Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MOD).';

const figure = (): Stroke => {
  const scene = showUpTo(buildScene(PYR).scene!, 0);
  const origin = {x: 450, y: 170};
  const L = layoutGeo(scene, scene.parts.length - 1, origin);
  return {
    id: 'geo-test',
    points: [{x: L.ax, y: L.ay}],
    color: '#18181B',
    width: 3,
    typeset: {latex: '', text: scene.title, size: 20, w: L.w, h: L.h},
    shape: {kind: 'solid', title: scene.title, sketch: L.sketch, geo: {scene, upTo: scene.parts.length - 1, origin, source: PYR}},
  };
};
const labels = () => Array.from(document.querySelectorAll('[data-testid="inline-shape"] text')).map((t) => t.textContent);

describe('nút a), b), c) ngay dưới hình: bật/tắt từng phần, giữ nguyên các nét khác', () => {
  it('có nút cho từng phần, mặc định mờ (ẩn); bấm hiện nét của phần đó, bấm lần nữa ẩn', async () => {
    render(<SmartboardCanvas initialStrokes={[figure()]} />);
    const a = await screen.findByTestId('geo-part-1');
    expect(screen.getByTestId('geo-part-2')).toBeTruthy();
    expect(screen.getByTestId('geo-part-3')).toBeTruthy();
    expect(a.getAttribute('aria-pressed')).toBe('false');
    expect(labels()).not.toContain('M');
    await act(async () => {
      fireEvent.click(a);
    });
    expect(screen.getByTestId('geo-part-1').getAttribute('aria-pressed')).toBe('true');
    expect(labels()).toContain('M');
    await act(async () => {
      fireEvent.click(screen.getByTestId('geo-part-1'));
    });
    expect(labels()).not.toContain('M');
  });

  it('các phần độc lập: bật b không làm mất M của a; bật c tự bật các phần nó cần', async () => {
    render(<SmartboardCanvas initialStrokes={[figure()]} />);
    await act(async () => {
      fireEvent.click(await screen.findByTestId('geo-part-1'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('geo-part-2'));
    });
    expect(labels()).toEqual(expect.arrayContaining(['M', 'O']));
    await act(async () => {
      fireEvent.click(screen.getByTestId('geo-part-1')); // tắt a: M mất, O (b) còn
    });
    expect(labels()).toContain('O');
    expect(labels()).not.toContain('M');
    await act(async () => {
      fireEvent.click(screen.getByTestId('geo-part-3')); // bật c: kéo theo a
    });
    expect(screen.getByTestId('geo-part-1').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByTestId('geo-section').length).toBe(1);
  });
});
