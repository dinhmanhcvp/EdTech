import {describe, expect, it} from 'vitest';
import {matchStemModel} from '../utils/localRouter';

const id = (t: string) => matchStemModel(t)?.templateId ?? null;

describe('viết chữ "tim" trên bảng ra tim 3D (BIO_HEART_CIRCULATION)', () => {
  it.each(['tim', 'Tim', ' tim ', 'quả tim', 'Quả tim', 'trái tim', 'tim người', 'Tim 3D', 'hình tim', 'cấu tạo tim'])('"%s" → tim 3D', (t) => {
    expect(id(t)).toBe('BIO_HEART_CIRCULATION');
  });
  it('không cướp câu toán: "tìm x", "tim x", "tìm giá trị lớn nhất" không ra tim', () => {
    for (const t of ['tìm x', 'tim x', 'tìm giá trị lớn nhất của hàm số', 'tim kiem', 'x^2 + 1 = 0 tìm x']) expect(id(t), t).not.toBe('BIO_HEART_CIRCULATION');
  });
  it('nhịp tim / ECG vẫn ra mô phỏng nhịp tim cũ', () => {
    expect(id('nhịp tim 75 bpm')).toBe('BIO_HEART_CYCLE');
  });
});
