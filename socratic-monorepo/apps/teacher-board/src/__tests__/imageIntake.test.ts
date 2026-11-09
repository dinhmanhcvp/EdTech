import {describe, expect, it, vi} from 'vitest';

const hb = vi.hoisted(() => ({pageUrl: vi.fn()}));
vi.mock('../utils/hubBoard', async () => ({...(await vi.importActual<typeof import('../utils/hubBoard')>('../utils/hubBoard')), hubBoard: hb}));

import {firstImage, fitOnBoard, isImageFile, loadImageFile, shrink} from '../utils/imageIntake';
import {pastedImageStroke, BOARD_H, BOARD_W} from '../utils/boardImage';
import {cleanPages} from '../utils/lessonLibrary';
import {createBoardImageLoader} from '../utils/boardImages';

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'x', {type});

describe('ảnh từ ngoài đưa lên bảng', () => {
  it('nhận ra tệp ảnh và lấy ảnh đầu tiên từ dữ liệu dán/kéo thả', () => {
    expect(isImageFile({type: 'image/png'})).toBe(true);
    expect(isImageFile({type: 'image/svg+xml'})).toBe(false);
    expect(isImageFile({type: 'application/pdf'})).toBe(false);
    const png = file('image/png');
    expect(firstImage({files: [file('text/plain'), png]})).toBe(png);
    expect(firstImage({files: []})).toBeNull();
    expect(firstImage(null)).toBeNull();
    const item = {kind: 'file', type: 'image/jpeg', getAsFile: () => file('image/jpeg')} as unknown as DataTransferItem;
    expect(firstImage({items: [item]})).not.toBeNull();
    const text = {kind: 'string', type: 'text/plain', getAsFile: () => null} as unknown as DataTransferItem;
    expect(firstImage({items: [text]})).toBeNull();
  });

  it('vừa khung bảng, chừa chỗ giải, không phóng quá 1,5 lần', () => {
    const big = fitOnBoard(3000, 2000);
    expect(big.w).toBeLessThanOrEqual(BOARD_W * 0.85 + 1);
    expect(big.h).toBeLessThanOrEqual(BOARD_H * 0.5 + 1);
    expect(Math.abs(big.w / big.h - 1.5)).toBeLessThan(0.01);
    const tiny = fitOnBoard(100, 50);
    expect(tiny).toEqual({w: 150, h: 75});
    expect(shrink(3200, 1600)).toEqual({w: 1600, h: 800});
    expect(shrink(800, 600)).toEqual({w: 800, h: 600});
  });

  it('từ chối tệp không phải ảnh hoặc quá lớn bằng thông báo tiếng Việt', async () => {
    await expect(loadImageFile(file('application/pdf'))).rejects.toThrow('không phải ảnh');
    await expect(loadImageFile(file('image/png', 16 * 1024 * 1024))).rejects.toThrow('15 MB');
  });

  it('đối tượng ảnh đặt giữa phía trên, lưu lại được (chỉ nhận data URL ảnh) và nạp không qua hub', async () => {
    const src = 'data:image/jpeg;base64,/9j/AAAA';
    const s = pastedImageStroke(src, 600, 300);
    expect(s.points[0]).toEqual({x: 300, y: 24});
    expect(s.image).toEqual({assignmentId: 'local', page: 0, src});
    const [[back]] = cleanPages([[JSON.parse(JSON.stringify(s))]]);
    expect(back.image?.src).toBe(src);
    const evil = {...s, image: {assignmentId: 'local', page: 0, src: 'javascript:alert(1)'}};
    expect(cleanPages([[evil]])[0][0].image?.src).toBeUndefined();
    const load = createBoardImageLoader(() => undefined);
    expect(load(s.image!)).toEqual({state: 'loading'});
    expect(hb.pageUrl).not.toHaveBeenCalled();
  });
});
