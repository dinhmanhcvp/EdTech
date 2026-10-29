import {describe, expect, it} from 'vitest';
import type {Stroke} from '../utils/lassoGeometry';
import {coverCount, coverLines, coverWhole, hiddenCovers, hideAllCovers, makeCovers, revealNext, setCoverHidden, strokeRect} from '../utils/answerCover';

const ink = (id: string, x0: number, y0: number, x1: number, y1: number): Stroke => ({id, points: [{x: x0, y: y0}, {x: x1, y: y1}], color: '#000', width: 3});
const formula = (id: string, x: number, y: number, w = 120, h = 30): Stroke => ({id, points: [{x, y}], color: '#000', width: 3, typeset: {latex: 'x', text: 'x', size: 20, w, h}});

describe('che / lộ đáp án', () => {
  it('hộp bao: nét tay theo các điểm, công thức theo w,h đã lưu', () => {
    expect(strokeRect(ink('a', 10, 20, 50, 60))).toEqual({x: 10, y: 20, w: 40, h: 40});
    expect(strokeRect(formula('f', 100, 200, 80, 30))).toEqual({x: 100, y: 200, w: 80, h: 30});
  });

  it('che cả vùng chọn bằng một tấm nới 8 px và giữ trong khung bảng', () => {
    const [r] = coverWhole([ink('a', 100, 100, 200, 140), formula('f', 150, 200)]);
    expect(r.x).toBe(92);
    expect(r.y).toBe(92);
    expect(r.x + r.w).toBe(278); // 150 + 120 + 8
    expect(r.y + r.h).toBe(238); // 200 + 30 + 8
    const [edge] = coverWhole([ink('b', 2, 2, 30, 30)]);
    expect(edge.x).toBe(0);
    expect(edge.y).toBe(0);
  });

  it('không có gì để che (rỗng hoặc chỉ toàn tấm che) thì không tạo tấm nào', () => {
    expect(coverWhole([])).toEqual([]);
    const [c] = makeCovers([{x: 0, y: 0, w: 50, h: 50}], []);
    expect(coverWhole([c])).toEqual([]);
    expect(coverLines([c])).toEqual([]);
  });

  it('chia dòng: các nét cùng dòng gộp, dòng dưới tách riêng, xếp từ trên xuống dù chọn lộn xộn', () => {
    const sel = [ink('l3', 100, 300, 200, 330), ink('l1a', 100, 100, 150, 130), formula('l2', 100, 200, 200, 30), ink('l1b', 170, 105, 260, 128)];
    const rows = coverLines(sel);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.y)).toEqual([...rows.map((r) => r.y)].sort((a, b) => a - b));
    expect(rows[0].x + rows[0].w).toBeGreaterThanOrEqual(268); // dòng 1 gộp cả hai nét (đến x = 260 + 8)
  });

  it('tạo tấm che: đang che, nối thứ tự sau các tấm có sẵn, mang w,h để chọn/tẩy/di chuyển như công thức', () => {
    const first = makeCovers([{x: 10, y: 10, w: 100, h: 30}, {x: 10, y: 60, w: 100, h: 30}], []);
    expect(first.map((c) => c.cover)).toEqual([{hidden: true, order: 0}, {hidden: true, order: 1}]);
    expect(first[0].typeset).toMatchObject({w: 100, h: 30, text: '', latex: ''});
    expect(new Set(first.map((c) => c.id)).size).toBe(2);
    const more = makeCovers([{x: 0, y: 0, w: 5, h: 5}], first);
    expect(more[0].cover!.order).toBe(2);
  });

  it('"Lộ bước kế" lộ đúng tấm đứng đầu thứ tự, hết thì không đổi gì; che lại tất cả đưa về ban đầu', () => {
    let s: Stroke[] = [ink('x', 0, 0, 10, 10), ...makeCovers([{x: 0, y: 0, w: 5, h: 5}, {x: 0, y: 10, w: 5, h: 5}, {x: 0, y: 20, w: 5, h: 5}], [])];
    expect(coverCount(s)).toBe(3);
    s = revealNext(s);
    expect(hiddenCovers(s).map((c) => c.cover!.order)).toEqual([1, 2]);
    s = revealNext(revealNext(s));
    expect(hiddenCovers(s)).toHaveLength(0);
    expect(revealNext(s)).toBe(s);
    s = hideAllCovers(s);
    expect(hiddenCovers(s)).toHaveLength(3);
    expect(s[0]).toEqual(ink('x', 0, 0, 10, 10)); // nét thường không bị đụng
  });

  it('lộ/che một tấm bằng chạm không đụng tấm khác', () => {
    const cs = makeCovers([{x: 0, y: 0, w: 5, h: 5}, {x: 0, y: 10, w: 5, h: 5}], []);
    const out = setCoverHidden(cs, cs[1].id, false);
    expect(out[0].cover!.hidden).toBe(true);
    expect(out[1].cover!.hidden).toBe(false);
    expect(setCoverHidden(cs, 'khong-co', false)).toEqual(cs);
  });
});
