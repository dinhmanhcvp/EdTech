import {describe, it, expect} from 'vitest';
import {parseRichestGeometry} from '../utils/geometryProblem';

describe('parseRichestGeometry', () => {
  it('chọn đề đọc từ chữ viết tay (có a, b, c) thay vì tên hình đoán từ nét', () => {
    const title = 'Hình chóp S.ABCD';
    const read = 'Cho hình chóp S.ABCD, đáy ABCD là hình vuông,\nSA vuông góc với đáy.\na) Gọi M là trung điểm SB.\nb) Gọi N là trung điểm SD.\nc) Gọi P là trung điểm SC.';
    const hit = parseRichestGeometry([title, read]);
    expect(hit?.src).toBe(read);
    expect(hit?.scene.parts.length).toBe(4);
  });
  it('không có đề nào dựng được hình thì trả null; hòa thì giữ nguồn đứng trước', () => {
    expect(parseRichestGeometry(['y = x^2', ''])).toBeNull();
    expect(parseRichestGeometry(['Hình chóp S.ABCD', 'hình chóp S.ABCD'])?.src).toBe('Hình chóp S.ABCD');
  });
});
