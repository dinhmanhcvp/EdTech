import React from 'react';
import {describe, it, expect} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';

const drawStroke = (canvas: HTMLElement) => {
  fireEvent.click(screen.getByTestId('tool-pen'));
  fireEvent.pointerDown(canvas, {clientX: 100, clientY: 100});
  fireEvent.pointerMove(canvas, {clientX: 150, clientY: 130});
  fireEvent.pointerMove(canvas, {clientX: 200, clientY: 150});
  fireEvent.pointerUp(canvas);
  fireEvent.click(screen.getByTestId('tool-lasso'));
};

describe('chọn vùng bằng kéo khung chữ nhật', () => {
  it('kéo chéo một khung quanh nét thì chọn được nét', () => {
    render(<SmartboardCanvas />);
    const canvas = screen.getByTestId('chalkboard-canvas');
    drawStroke(canvas);
    fireEvent.pointerDown(canvas, {clientX: 60, clientY: 60});
    fireEvent.pointerMove(canvas, {clientX: 140, clientY: 120});
    fireEvent.pointerMove(canvas, {clientX: 260, clientY: 200});
    fireEvent.pointerUp(canvas);
    expect(screen.getByTestId('lasso-action-bar')).toBeInTheDocument();
  });

  it('kéo khung chỉ trúng chỗ trống thì không chọn gì', () => {
    render(<SmartboardCanvas />);
    const canvas = screen.getByTestId('chalkboard-canvas');
    drawStroke(canvas);
    fireEvent.pointerDown(canvas, {clientX: 400, clientY: 300});
    fireEvent.pointerMove(canvas, {clientX: 500, clientY: 380});
    fireEvent.pointerUp(canvas);
    expect(screen.queryByTestId('lasso-action-bar')).not.toBeInTheDocument();
  });

  it('chạm một điểm vào chỗ trống thì bỏ chọn', () => {
    render(<SmartboardCanvas />);
    const canvas = screen.getByTestId('chalkboard-canvas');
    drawStroke(canvas);
    fireEvent.pointerDown(canvas, {clientX: 60, clientY: 60});
    fireEvent.pointerMove(canvas, {clientX: 260, clientY: 200});
    fireEvent.pointerUp(canvas);
    expect(screen.getByTestId('lasso-action-bar')).toBeInTheDocument();
    // chạm ngoài vùng chọn
    fireEvent.pointerDown(canvas, {clientX: 700, clientY: 500});
    fireEvent.pointerUp(canvas);
    expect(screen.queryByTestId('lasso-action-bar')).not.toBeInTheDocument();
  });
});
