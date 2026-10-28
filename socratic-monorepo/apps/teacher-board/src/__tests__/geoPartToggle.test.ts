import {describe, expect, it} from 'vitest';
import {buildScene, renderScene} from '../utils/geometryProblem';
import {addMidpoint, partChips, partDeps, setPartShown, showUpTo, togglePart} from '../utils/geoTools';

const PYR = 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2.';
const sc0 = () => buildScene(`${PYR} a) Gọi M là trung điểm SB. b) Gọi O = AC ∩ BD. c) Tìm thiết diện của hình chóp cắt bởi mặt phẳng (MOD).`).scene!;
const labels = (s: ReturnType<typeof sc0>) => renderScene(s).labels.filter(Boolean);

describe('bật/tắt từng phần a, b, c của đề, giữ nguyên nét các phần khác', () => {
  it('các nút chỉ có cho phần có nét vẽ', () => {
    expect(partChips(sc0()).map((c) => c.label)).toEqual(['a)', 'b)', 'c)']);
  });
  it('thiết diện c cần M của a và O của b', () => {
    const sc = sc0();
    expect(partDeps(sc, 3).sort()).toEqual([1, 2]);
    expect(partDeps(sc, 1)).toEqual([]);
  });
  it('mặc định chỉ hình gốc; bật a thì chỉ có M; bật b thì có thêm O mà M vẫn còn', () => {
    let sc = showUpTo(sc0(), 0);
    expect(labels(sc)).not.toContain('M');
    sc = setPartShown(sc, 1, true);
    expect(labels(sc)).toContain('M');
    expect(labels(sc)).not.toContain('O');
    sc = setPartShown(sc, 2, true);
    expect(labels(sc)).toEqual(expect.arrayContaining(['M', 'O']));
  });
  it('bật c tự bật a và b; tắt a thì c cũng tắt nhưng b giữ nguyên', () => {
    let sc = setPartShown(showUpTo(sc0(), 0), 3, true);
    expect(sc.hiddenParts).toEqual([]);
    expect(renderScene(sc).polys).toHaveLength(1);
    sc = setPartShown(sc, 1, false);
    expect(sc.hiddenParts).toEqual([1, 3]);
    expect(labels(sc)).toContain('O');
    expect(labels(sc)).not.toContain('M');
    expect(renderScene(sc).polys).toHaveLength(0);
  });
  it('bật/tắt nhiều lần cho cùng một kết quả (không reset, không mất nét)', () => {
    let sc = showUpTo(sc0(), 0);
    const first = JSON.stringify(renderScene(setPartShown(sc, 2, true)));
    for (let i = 0; i < 5; i++) sc = togglePart(togglePart(sc, 2), 2);
    expect(JSON.stringify(renderScene(setPartShown(sc, 2, true)))).toBe(first);
  });
  it('điểm tự vẽ bằng dụng cụ thuộc phần 0: không biến mất khi tắt các phần', () => {
    let sc = showUpTo(sc0(), 0);
    sc = addMidpoint(sc, 'S', 'C', 0).scene; // N
    sc = setPartShown(setPartShown(sc, 1, true), 1, false);
    expect(labels(sc)).toContain('N');
  });
  it('tọa độ các điểm đang hiện không đổi khi bật thêm phần (hình không dịch)', () => {
    const sc = showUpTo(sc0(), 0);
    const a = renderScene(sc);
    const b = renderScene(setPartShown(sc, 1, true));
    a.verts.forEach((v, i) => expect(b.verts[i]).toEqual(v));
  });
});
