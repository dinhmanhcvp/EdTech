import {describe, expect, it, vi} from 'vitest';
import {angleArc, glowPath, hatch, hudCard, lensBody, roundRectPath, shadedBlock} from '../utils/canvasKit';

/** ctx giả: ghi lại lời gọi, measureText đo theo số ký tự. */
const fakeCtx = () => {
  const calls: [string, unknown[]][] = [];
  const grad = {addColorStop: vi.fn()};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k === 'measureText') return (s: string) => ({width: s.length * 6});
      if (k === 'createLinearGradient') return () => grad;
      if (k in t) return t[k];
      return (...a: unknown[]) => {
        calls.push([k, a]);
      };
    },
    set: (t, k: string, v) => {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const count = (name: string) => calls.filter(([n]) => n === name).length;
  return {ctx, calls, count};
};

describe('canvasKit', () => {
  it('hudCard: một thẻ, mỗi dòng một fillText, kích thước theo dòng dài nhất', () => {
    const {ctx, calls, count} = fakeCtx();
    const r = hudCard(ctx, [{text: 'ngắn', bold: true}, {text: 'dòng dài hơn nhiều'}], 10, 20);
    expect(count('fillText')).toBe(2);
    expect(r.w).toBeCloseTo('dòng dài hơn nhiều'.length * 6 + 16, 5);
    expect(r.h).toBeGreaterThan(30);
    expect(calls.find(([n]) => n === 'fillText')![1][1]).toBe(10 + 8); // lề trái = x + pad
  });

  it('hudCard: không có dòng nào thì vẫn không văng lỗi', () => {
    expect(() => hudCard(fakeCtx().ctx, [], 0, 0)).not.toThrow();
  });

  it('roundRectPath: bán kính bị kẹp theo kích thước nên khối nhỏ không méo', () => {
    const {ctx, count} = fakeCtx();
    roundRectPath(ctx, 0, 0, 4, 4, 99);
    expect(count('quadraticCurveTo')).toBe(4);
  });

  it('hatch: số vạch theo bước, hướng xuống/lên đổi dấu chiều dài', () => {
    const a = fakeCtx();
    hatch(a.ctx, 0, 90, 100, 1, 10, 8);
    expect(a.count('moveTo')).toBe(10); // x = 0, 10, …, 90
    expect((a.calls.find(([n]) => n === 'lineTo')![1] as number[])[1]).toBe(108);
    const b = fakeCtx();
    hatch(b.ctx, 0, 10, 100, -1, 10, 8);
    expect((b.calls.find(([n]) => n === 'lineTo')![1] as number[])[1]).toBe(92);
  });

  it('angleArc: vẽ cung theo cung nhỏ, có nhãn ở giữa khi truyền label', () => {
    const {ctx, calls, count} = fakeCtx();
    angleArc(ctx, 0, 0, 20, 0, (3 * Math.PI) / 2, '#000', '90°'); // 270° → đi ngược 90° (cung nhỏ)
    const arc = calls.find(([n]) => n === 'arc')![1] as [number, number, number, number, number, boolean];
    expect(arc[5]).toBe(true); // ngược chiều kim đồng hồ
    expect(arc[4]).toBeCloseTo(-Math.PI / 2, 9);
    expect(count('fillText')).toBe(1);
    const none = fakeCtx();
    angleArc(none.ctx, 0, 0, 20, 0, 1, '#000');
    expect(none.count('fillText')).toBe(0);
  });

  it('glowPath: hai lượt vẽ (quầng + nét), bỏ qua đường ít hơn 2 điểm', () => {
    const a = fakeCtx();
    glowPath(a.ctx, [[0, 0], [5, 5], [9, 0]], '#f00');
    expect(a.count('stroke')).toBe(2);
    const b = fakeCtx();
    glowPath(b.ctx, [[0, 0]], '#f00');
    expect(b.count('stroke')).toBe(0);
  });

  it('lensBody / shadedBlock chạy được và khôi phục trạng thái vẽ', () => {
    const a = fakeCtx();
    lensBody(a.ctx, 100, 100, 80);
    expect(a.count('save')).toBe(a.count('restore'));
    const b = fakeCtx();
    shadedBlock(b.ctx, 0, 0, 40, 20, '#2563EB', '#1D4ED8');
    expect(b.count('save')).toBe(b.count('restore'));
  });
});
