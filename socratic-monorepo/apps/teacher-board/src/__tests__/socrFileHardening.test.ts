import {describe, expect, it} from 'vitest';
import {parseSocr, SOCR_MAX_EVENTS} from '../utils/socrFile';

const file = (events: unknown[]) => JSON.stringify({header: {}, events});

describe('parseSocr: tệp hỏng không làm sập phát lại', () => {
  it('bỏ sự kiện có toạ độ không hữu hạn, giữ sự kiện hợp lệ', () => {
    const data = parseSocr(
      file([
        {t: 1, type: 'STROKE_START', pointerId: 1, x: 10, y: 20, pressure: 0.5, color: '#fff'},
        {t: 2, type: 'STROKE_START', pointerId: 1, x: null, y: 20, pressure: 0.5, color: '#fff'},
        {t: 3, type: 'STROKE_MOVE', pointerId: 1, pts: [[1, 2, 0.5], [3, null, 0.5]]},
        {t: 4, type: 'STROKE_MOVE', pointerId: 1, pts: [[1, 2, 0.5]]},
      ]),
    );
    expect(data.events.map((e) => e.t)).toEqual([1, 4]);
  });

  it('từ chối tệp có quá nhiều sự kiện', () => {
    const many = Array.from({length: SOCR_MAX_EVENTS + 1}, (_, i) => ({t: i, type: 'CLEAR_CANVAS'}));
    expect(() => parseSocr(file(many))).toThrow(/quá nhiều/);
  });
});
