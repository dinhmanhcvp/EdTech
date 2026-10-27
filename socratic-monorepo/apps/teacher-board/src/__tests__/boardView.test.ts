import {describe, it, expect} from 'vitest';
import {clampView, zoomAt, panBy, toContent, bufferQuality, FIT_VIEW, MAX_ZOOM, MIN_ZOOM} from '../utils/boardView';

const W = 1200;
const H = 675;

describe('thu phóng / di chuyển bảng', () => {
  it('phóng quanh một điểm thì điểm đó đứng yên trên màn hình', () => {
    const v = zoomAt(FIT_VIEW, 2, 300, 200, W, H);
    expect(v.k).toBe(2);
    const before = toContent(FIT_VIEW, 300, 200);
    const after = toContent(v, 300, 200);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
  it('giới hạn hệ số phóng', () => {
    expect(zoomAt(FIT_VIEW, 99, 0, 0, W, H).k).toBe(MAX_ZOOM);
    expect(zoomAt(FIT_VIEW, 0.01, 0, 0, W, H).k).toBe(MIN_ZOOM);
  });
  it('thu nhỏ thì căn giữa tờ giấy; phóng to thì không kéo trượt hẳn ra ngoài', () => {
    const small = clampView({k: 0.5, tx: 999, ty: -999}, W, H);
    expect(small.tx).toBeCloseTo(300, 6);
    expect(small.ty).toBeCloseTo(168.75, 6);
    const big = panBy({k: 2, tx: 0, ty: 0}, 99999, 99999, W, H);
    expect(big.tx).toBe(W - 80);
    expect(big.ty).toBe(H - 80);
    const left = panBy({k: 2, tx: 0, ty: 0}, -99999, -99999, W, H);
    expect(left.tx).toBe(80 - W * 2);
    expect(left.ty).toBe(80 - H * 2);
  });
  it('về FIT thì khớp khung', () => {
    expect(clampView(FIT_VIEW, W, H)).toEqual({k: 1, tx: 0, ty: 0});
  });
  it('độ phân giải bộ đệm tăng theo mức phóng', () => {
    expect(bufferQuality(1)).toBeLessThan(bufferQuality(1.5));
    expect(bufferQuality(1.5)).toBeLessThan(bufferQuality(3));
  });
});
