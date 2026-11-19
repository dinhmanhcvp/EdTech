import {describe, expect, it} from 'vitest';
import {MAX_SCREENS, boardHeight, clampView, panBy} from '../utils/boardView';

describe('bảng phủ kín màn hình và kéo dài được', () => {
  it('chiều cao bảng theo tỉ lệ khung: màn 4:3 được 1200×900, màn rất rộng không thấp hơn 675', () => {
    expect(boardHeight(1024, 768, 0, 0)).toBe(900);
    expect(boardHeight(2560, 1080, 0, 0)).toBe(675);
  });

  it('viết gần mép dưới thì tự dài thêm nửa màn; kéo dài tay cộng thêm; có trần', () => {
    expect(boardHeight(1024, 768, 0, 850)).toBe(1350); // còn chừa ≥ nửa màn dưới nét thấp nhất
    expect(boardHeight(1024, 768, 450, 0)).toBe(1350);
    expect(boardHeight(1024, 768, 0, 1e7)).toBe(900 * MAX_SCREENS); // tọa độ rác không làm canvas khổng lồ
  });

  it('chưa phóng to mà giấy cao hơn khung: cuộn dọc trong mép giấy, không lệch ngang', () => {
    const [W, H, CH] = [1024, 768, 1536];
    expect(clampView({k: 1, tx: 50, ty: 0}, W, H, CH)).toEqual({k: 1, tx: 0, ty: 0});
    expect(panBy({k: 1, tx: 0, ty: 0}, 0, -300, W, H, CH).ty).toBe(-300);
    expect(panBy({k: 1, tx: 0, ty: 0}, 0, -5000, W, H, CH).ty).toBe(H - CH); // dừng ở mép dưới giấy
    expect(panBy({k: 1, tx: 0, ty: -100}, 0, 5000, W, H, CH).ty).toBe(0); // dừng ở mép trên
  });

  it('giấy vừa khung (không truyền CH) giữ nguyên hành vi cũ', () => {
    expect(clampView({k: 0.5, tx: 9, ty: 9}, 1000, 600)).toEqual({k: 0.5, tx: 250, ty: 150});
    expect(clampView({k: 2, tx: 5000, ty: 5000}, 1000, 600)).toEqual({k: 2, tx: 920, ty: 520});
  });
});
