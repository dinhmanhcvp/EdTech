import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {buildScene, renderScene} from '../utils/geometryProblem';
import {addFoot, addMidpoint, addPointOnSegment, addSection, addSegment, addRequirement, layoutGeo, nextName} from '../utils/geoTools';
import {GeometryProblemPanel, type GeoController} from '../components/canvas/GeometryProblemPanel';
import {AiFab} from '../components/canvas/SmartboardDock';

const PYR = 'Cho hình chóp S.ABCD đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy, SA = a√2';
const scene = () => buildScene(PYR).scene!;

describe('dụng cụ vẽ thêm trên hình', () => {
  it('trung điểm, điểm trên cạnh, đoạn nối', () => {
    const sc = scene();
    const {scene: s1, name} = addMidpoint(sc, 'S', 'C', 0);
    expect(name).toBe('M');
    expect(s1.pts.M[1]).toBeCloseTo((sc.pts.S[1] + sc.pts.C[1]) / 2);
    const {scene: s2, name: n2} = addPointOnSegment(s1, 'A', 'B', 0.25, 0);
    expect(n2).toBe('N');
    expect(s2.pts.N[0]).toBeCloseTo(sc.pts.A[0] + (sc.pts.B[0] - sc.pts.A[0]) * 0.25);
    const s3 = addSegment(s2, 'M', 'N', 0);
    expect(s3.aux.length).toBe(1);
    // nối lại đoạn đã có thì không thêm
    expect(addSegment(s3, 'N', 'M', 0).aux.length).toBe(1);
    // cảnh cũ không bị sửa
    expect(sc.pts.M).toBeUndefined();
  });

  it('chân đường vuông góc cho AH ⊥ BC', () => {
    const sc = buildScene('Cho tam giác ABC vuông tại A, AB = 3, AC = 4').scene!;
    const {scene: s, name} = addFoot(sc, 'A', 'B', 'C', 0);
    const [A, B, C, H] = [sc.pts.A, sc.pts.B, sc.pts.C, s.pts[name]];
    expect((H[0] - A[0]) * (C[0] - B[0]) + (H[1] - A[1]) * (C[1] - B[1])).toBeCloseTo(0);
  });

  it('thiết diện qua ba điểm gắn vào phần hiện tại', () => {
    let sc = scene();
    sc = addMidpoint(sc, 'S', 'B', 0).scene; // M
    sc = addMidpoint(sc, 'S', 'D', 0).scene; // N
    sc = addMidpoint(sc, 'C', 'D', 0).scene; // P
    const s = addSection(sc, ['M', 'N', 'P'], 0);
    expect(s.polys.length).toBe(1);
    expect(s.polys[0].part).toBe(0);
    expect(s.parts).toHaveLength(sc.parts.length);
    expect(renderScene(s, 0).polys).toHaveLength(1);
  });

  it('thêm yêu cầu bằng lời tạo phần mới và giữ nguyên hình cũ', () => {
    const sc = scene();
    const before = renderScene(sc, 0);
    const s2 = addRequirement(sc, 'Gọi M là trung điểm SC');
    expect(s2.parts).toHaveLength(2);
    expect(renderScene(s2, 0).labels).not.toContain('M');
    expect(renderScene(s2, 1).labels).toContain('M');
    before.verts.forEach((v, i) => expect(renderScene(s2, 1).verts[i]).toEqual(v));
    expect(nextName(s2)).not.toBe('M');
  });

  it('bố trí trên bảng: thêm phần ra ngoài thì khung bao đổi nhưng vị trí tuyệt đối của hình cũ không đổi', () => {
    const sc = scene();
    const origin = {x: 400, y: 200};
    const a = layoutGeo(sc, 0, origin);
    const s2 = addRequirement(sc, 'Tìm giao tuyến d = (SAB) ∩ (SCD)');
    const b = layoutGeo(s2, 1, origin);
    a.sketch.verts.forEach((v, i) => {
      expect(b.sketch.verts[i].x + b.ax).toBeCloseTo(v.x + a.ax, 6);
      expect(b.sketch.verts[i].y + b.ay).toBeCloseTo(v.y + a.ay, 6);
    });
  });
});

describe('bảng dụng cụ / hộp thoại vẽ từ đề', () => {
  it('nhập đề rồi vẽ: mặc định chỉ hình gốc, tích ô thì vẽ đủ', () => {
    const onCreate = vi.fn();
    render(<GeometryProblemPanel mode="new" onClose={() => undefined} onCreate={onCreate} />);
    fireEvent.change(screen.getByTestId('geo-problem-text'), {target: {value: `${PYR}. a) Gọi M là trung điểm SB. b) Gọi O = AC ∩ BD.`}});
    expect(screen.getByTestId('geo-problem-preview').textContent).toContain('Hình chóp S.ABCD');
    expect(screen.getByTestId('geo-problem-preview').textContent).toContain('a)');
    fireEvent.click(screen.getByTestId('geo-problem-draw'));
    expect(onCreate.mock.calls[0][1]).toBe(0);
    fireEvent.click(screen.getByTestId('geo-draw-all'));
    fireEvent.click(screen.getByTestId('geo-problem-draw'));
    expect(onCreate.mock.calls[1][1]).toBe(2);
  });

  it('đề không nhận ra thì báo, nút vẽ bị khóa', () => {
    render(<GeometryProblemPanel mode="new" onClose={() => undefined} onCreate={() => undefined} />);
    fireEvent.change(screen.getByTestId('geo-problem-text'), {target: {value: 'Tính tích phân của x'}});
    expect(screen.getByTestId('geo-problem-preview').textContent).toContain('Chưa nhận ra hình');
    expect((screen.getByTestId('geo-problem-draw') as HTMLButtonElement).disabled).toBe(true);
  });

  it('chế độ sửa: bộ điều khiển bước từng phần, thêm yêu cầu, hoàn tác, chọn điểm bằng chạm', () => {
    const sc = buildScene(`${PYR}. a) Gọi M là trung điểm SB. b) Gọi O = AC ∩ BD.`).scene!;
    const onApply = vi.fn();
    let pick: any = null;
    let ctl: GeoController | null = null;
    render(<GeometryProblemPanel mode="edit" scene={sc} upTo={0} onClose={() => undefined} onApply={onApply} onPickConfig={(c) => (pick = c)} onController={(c) => (ctl = c)} />);
    expect(ctl!.parts).toBe(3);
    act(() => ctl!.next());
    expect(onApply).toHaveBeenLastCalledWith(sc, 1);
    act(() => ctl!.next());
    expect(onApply).toHaveBeenLastCalledWith(sc, 2);
    // thêm yêu cầu bằng lời qua ô nhỏ
    act(() => ctl!.openRequirement());
    fireEvent.change(screen.getByTestId('geo-req-input'), {target: {value: 'Gọi N là trung điểm SC'}});
    fireEvent.click(screen.getByTestId('geo-req-add'));
    const last = onApply.mock.calls[onApply.mock.calls.length - 1];
    expect(last[0].parts).toHaveLength(4);
    expect(last[1]).toBe(3);
    // hoàn tác về trước khi thêm
    expect(ctl!.canUndo).toBe(true);
    act(() => ctl!.undo());
    expect(onApply.mock.calls[onApply.mock.calls.length - 1][0].parts).toHaveLength(3);
    expect(ctl!.canRedo).toBe(true);
    // dụng cụ trung điểm: chọn hai điểm
    act(() => ctl!.setTool('midpoint'));
    expect(pick.pickMode).toBe('point');
    expect(screen.getByTestId('geo-chip').textContent).toContain('Trung điểm');
    act(() => pick.onPickPoint('A'));
    expect(pick.picks).toEqual(['A']);
    act(() => pick.onPickPoint('B'));
    const after = onApply.mock.calls[onApply.mock.calls.length - 1][0];
    expect(Object.keys(after.pts).length).toBe(Object.keys(sc.pts).length + 1);
  });
});

describe('AI hub phân tầng cho chức năng Vẽ hình', () => {
  const ctl = (over: Partial<GeoController> = {}): GeoController => ({
    parts: 3,
    upTo: 1,
    tool: null,
    picks: [],
    canUndo: true,
    canRedo: false,
    setTool: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    remove: vi.fn(),
    openRequirement: vi.fn(),
    ...over,
  });
  const base = {selectionCount: 0, busy: false, listening: false, onConvert: () => undefined, onVisualize: () => undefined, onLasso: () => undefined, onVoice: () => undefined};
  const tier = () => screen.getByTestId('radial-action-menu').getAttribute('data-tier');
  const ids = () => Array.from(screen.getByTestId('radial-action-menu').querySelectorAll('button')).map((b) => b.getAttribute('data-testid'));

  it('tầng 1 có thêm Vẽ hình; bấm vào thì vòng đổi sang tầng 2 có nút Quay lại', () => {
    render(<AiFab {...base} geo={ctl()} onGeoNew={() => undefined} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    expect(tier()).toBe('root');
    expect(ids()).toContain('ai-fab-draw');
    fireEvent.click(screen.getByTestId('ai-fab-draw'));
    expect(tier()).toBe('draw');
    // tầng 2 thay hẳn các ô tầng 1
    expect(ids()).not.toContain('ai-fab-voice');
    expect(ids()).toEqual(expect.arrayContaining(['ai-fab-back', 'ai-fab-draw-tools', 'ai-fab-draw-parts', 'ai-fab-draw-req', 'ai-fab-draw-undo', 'ai-fab-draw-redo', 'ai-fab-draw-remove']));
    fireEvent.click(screen.getByTestId('ai-fab-back'));
    expect(tier()).toBe('root');
  });

  it('tầng 3 Dụng cụ: chọn dụng cụ thì đĩa đóng nhưng mở lại vẫn ở tầng 3', () => {
    const g = ctl();
    render(<AiFab {...base} geo={g} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.click(screen.getByTestId('ai-fab-draw'));
    fireEvent.click(screen.getByTestId('ai-fab-draw-tools'));
    expect(tier()).toBe('draw/tools');
    expect(ids().filter((i) => i?.startsWith('ai-fab-draw-'))).toHaveLength(5);
    fireEvent.click(screen.getByTestId('ai-fab-draw-midpoint'));
    expect(g.setTool).toHaveBeenCalledWith('midpoint');
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(screen.getByTestId('ai-fab'));
    expect(tier()).toBe('draw/tools');
    // Quay lại hai lần về tầng 1
    fireEvent.click(screen.getByTestId('ai-fab-back'));
    expect(tier()).toBe('draw');
    fireEvent.click(screen.getByTestId('ai-fab-back'));
    expect(tier()).toBe('root');
  });

  it('tầng 3 Phần đề: bấm lặp lại không đóng đĩa; nút bị khóa ở hai đầu', () => {
    const g = ctl({upTo: 2});
    render(<AiFab {...base} geo={g} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.click(screen.getByTestId('ai-fab-draw'));
    fireEvent.click(screen.getByTestId('ai-fab-draw-parts'));
    expect((screen.getByTestId('ai-fab-draw-next') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('ai-fab-draw-prev'));
    expect(g.prev).toHaveBeenCalled();
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('false');
  });

  it('chưa có hình thì tầng 2 chỉ có Từ đề bài; yêu cầu mở lại hub tại tầng được chỉ định', () => {
    const onGeoNew = vi.fn();
    const {rerender} = render(<AiFab {...base} geo={null} onGeoNew={onGeoNew} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.click(screen.getByTestId('ai-fab-draw'));
    // chưa khoanh gì: gợi ý khoanh đề; vẫn có lối phụ gõ đề
    expect(ids()).toEqual(['ai-fab-back', 'ai-fab-draw-new', 'ai-fab-draw-typed']);
    fireEvent.click(screen.getByTestId('ai-fab-draw-typed'));
    expect(onGeoNew).toHaveBeenCalled();
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('true');
    // Esc đưa về tầng 1
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.keyDown(window, {key: 'Escape'});
    rerender(<AiFab {...base} geo={ctl()} openAtPath={{path: ['draw'], nonce: 1}} />);
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('false');
    expect(tier()).toBe('draw');
  });

  it('có vùng khoanh: tầng 1 là bộ chức năng của vùng (không còn Chọn vùng); Vẽ hình dựng từ vùng khoanh', () => {
    const onDrawSelected = vi.fn();
    const onLasso = vi.fn();
    render(<AiFab {...base} selectionCount={4} onDrawSelected={onDrawSelected} onLasso={onLasso} onGeoNew={() => undefined} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    expect(ids()).toEqual(expect.arrayContaining(['sel-btn-duplicate', 'sel-btn-delete', 'sel-btn-deselect', 'ai-fab-draw']));
    expect(ids()).not.toContain('ai-fab-lasso');
    fireEvent.click(screen.getByTestId('ai-fab-draw'));
    fireEvent.click(screen.getByTestId('ai-fab-draw-new'));
    expect(onDrawSelected).toHaveBeenCalledTimes(1);
    expect(onLasso).not.toHaveBeenCalled();
  });
});
