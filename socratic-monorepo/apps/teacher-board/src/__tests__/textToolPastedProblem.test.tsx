import React from 'react';
import {describe, it, expect} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';

// đề dán từ PDF (xuống dòng giữa câu, dấu mũ rời)
const T = `Cho tứ giác ABCD nội tiếp đường tròn (O) với ̂ DCB < ̂ ADC < 90◦, giả sử có điểm P
nằm trong tứ giác ABCD sao cho P A ⊥ AD và P B ⊥ BC. Dựng hình bình hành P AQB.
Gọi K là hình chiếu vuông góc của Q lên AB.
1. Chứng minh rằng ̂ KQB = ̂ BCD.
2. Gọi H là hình chiếu vuông góc của P lên CD. Chứng minh rằng HD
HC = KB
KA .
3. Lấy điểm R sao cho DR song song AH và CR song song BH. Gọi giao điểm của hai
đường thẳng RH và AB là L. Chứng minh rằng các điểm D, C, K, L cùng nằm trên
một đường tròn.`;

const openTextInput = async () => {
  fireEvent.click(screen.getByTestId('tool-text'));
  fireEvent.pointerDown(screen.getByTestId('chalkboard-canvas'), {pointerId: 1, pointerType: 'mouse', button: 0, clientX: 50, clientY: 50});
  return (await screen.findByTestId('text-draft-input', {}, {timeout: 1000})) as HTMLInputElement;
};

describe('công cụ Chữ: dán đề dài', () => {
  it('dán đề hình học: chữ tự xuống dòng trong khung và hình được vẽ ngay bên cạnh', async () => {
    render(<SmartboardCanvas />);
    const input = await openTextInput();
    fireEvent.change(input, {target: {value: T.replace(/\n/g, ' ')}});
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(await screen.findByTestId('typeset-wrapped')).toBeInTheDocument();
    expect(screen.getByTestId('inline-shape')).toBeInTheDocument();
    // vẽ xong: AI hub tự mở ở tầng Vẽ hình, thấy ngay Gợi ý và Dựng (không có thanh công cụ thứ hai)
    expect(await screen.findByTestId('ai-fab-draw-tools')).toBeInTheDocument();
    expect(screen.getByTestId('ai-fab-draw-coach')).toBeInTheDocument();
    expect(screen.queryByTestId('geo-toolbar')).toBeNull();
  });

  it('chữ dài không phải đề hình học: chỉ xuống dòng, không vẽ hình', async () => {
    render(<SmartboardCanvas />);
    const input = await openTextInput();
    fireEvent.change(input, {target: {value: 'Hôm nay chúng ta ôn lại các bước giải phương trình bậc hai và cách nhận biết nghiệm kép khi biệt thức bằng không'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(await screen.findByTestId('typeset-wrapped')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-shape')).toBeNull();
  });

  it('dán có xuống dòng: đổi thành khoảng trắng, không dính từ', async () => {
    render(<SmartboardCanvas />);
    const input = await openTextInput();
    fireEvent.paste(input, {clipboardData: {getData: () => 'điểm P\nnằm trong'}});
    expect(input.value).toBe('điểm P nằm trong');
  });
});
