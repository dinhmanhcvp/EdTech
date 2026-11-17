import {describe, expect, it} from 'vitest';
import {declutter} from '../engines/families/Stage3D';

/** phần tử giả có hộp bao cố định (jsdom không tính bố cục) */
const box = (left: number, top: number, w: number, h: number, card = false) => {
  const el = document.createElement('span');
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.opacity = '1';
  el.getBoundingClientRect = () => ({left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON: () => ''}) as DOMRect;
  return {el, card};
};

describe('nhãn nổi trong cảnh 3D không đè nhau, không tràn khung', () => {
  const frame = box(0, 0, 800, 450).el;

  it('nhãn tràn mép trên được kéo vào trong khung', () => {
    const a = box(100, -30, 120, 20);
    declutter(frame, [a]);
    expect(a.el.style.top).toBe('calc(50% + 34px)');
    expect(a.el.style.opacity).toBe('1');
  });

  it('nhãn đè nhãn tạo trước thì nhích xuống ngay dưới; thẻ được ưu tiên hơn nhãn', () => {
    const first = box(100, 100, 120, 20);
    const second = box(110, 105, 120, 20);
    declutter(frame, [first, second]);
    expect(first.el.style.top).toBe('50%');
    expect(second.el.style.top).toBe('calc(50% + 17px)'); // 100 + 20 + 2 − 105
    const label = box(300, 200, 120, 20);
    const card = box(290, 190, 200, 80, true);
    declutter(frame, [label, card]);
    expect(card.el.style.top).toBe('50%'); // thẻ đặt trước, giữ nguyên
    expect(label.el.style.top).toBe('calc(50% + 72px)');
  });

  it('không còn chỗ (sát mép dưới) thì nhãn sau tạm ẩn', () => {
    const a = box(100, 420, 120, 24);
    const b = box(105, 422, 120, 24);
    declutter(frame, [a, b]);
    expect(a.el.style.opacity).toBe('1');
    expect(b.el.style.opacity).toBe('0');
  });
});
