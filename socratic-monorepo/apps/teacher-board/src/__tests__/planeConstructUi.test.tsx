import React, {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {InlineShape} from '../components/canvas/InlineShape';
import type {Stroke} from '../utils/lassoGeometry';
import {shapeFromBlueprint} from '../utils/inlineShape';

const tri = () =>
  shapeFromBlueprint({templateId: 'MATH_DYNAMIC_GEOMETRY', meta: {planeTitle: 'Tam giác ABC', vertices2D: [[0, 0], [3, 0], [1, 2]]}}, 200, 160)!;
const quad = () =>
  shapeFromBlueprint({templateId: 'MATH_DYNAMIC_GEOMETRY', meta: {planeTitle: 'Tứ giác', vertices2D: [[0, 0], [3, 0], [3.6, 2], [0.4, 2.2]]}}, 200, 160)!;

/** Bọc có trạng thái để xem hình đổi theo từng thao tác, như trên bảng thật. */
const Harness: React.FC<{initial: Stroke['shape']; onChange?: (s: NonNullable<Stroke['shape']>) => void; onInteractStart?: () => void}> = ({initial, onChange, onInteractStart}) => {
  const [shape, setShape] = useState(initial);
  const stroke: Stroke = {id: 's1', points: [{x: 100, y: 100}], color: '#111', width: 3, typeset: {latex: '', text: '', size: 20, w: 200, h: 160}, shape};
  return (
    <InlineShape
      stroke={stroke}
      boardScale={1}
      picked={false}
      onChange={(sh) => {
        setShape(sh);
        onChange?.(sh);
      }}
      onDelete={vi.fn()}
      onOpenFull={vi.fn()}
      onMoveStart={vi.fn()}
      onMove={vi.fn()}
      onMoveEnd={vi.fn()}
      onInteractStart={onInteractStart ?? vi.fn()}
    />
  );
};

const tap = (el: Element) => {
  fireEvent.pointerDown(el, {pointerId: 1, clientX: 10, clientY: 10});
  fireEvent.pointerUp(el, {pointerId: 1, clientX: 10, clientY: 10});
};

describe('dựng hình trực tiếp trên hình phẳng', () => {
  it('chưa bật chế độ dựng: không có menu, không có vùng chạm cạnh', () => {
    render(<Harness initial={tri()} />);
    expect(screen.queryByTestId('construct-palette')).toBeNull();
    expect(screen.queryAllByTestId('side-hit')).toHaveLength(0);
    tap(screen.getAllByTestId('shape-vertex-handle')[0]);
    expect(screen.queryByTestId('construct-menu')).toBeNull();
  });

  it('chạm đỉnh A → menu phép dựng từ đỉnh; chọn Phân giác → có đường phân giác, cung góc bằng nhau và điểm chân', () => {
    const onChange = vi.fn();
    const onInteractStart = vi.fn();
    render(<Harness initial={tri()} onChange={onChange} onInteractStart={onInteractStart} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    expect(screen.getAllByTestId('side-hit')).toHaveLength(3);
    tap(screen.getAllByTestId('shape-vertex-handle')[0]);
    const menu = screen.getByTestId('construct-menu');
    expect(within(menu).getByText('Đỉnh A')).toBeTruthy();
    for (const k of ['median', 'altitude', 'bisector', 'midline', 'parallel']) expect(within(menu).getByTestId(`construct-${k}`)).toBeTruthy();
    fireEvent.click(within(menu).getByTestId('construct-bisector'));
    expect(onInteractStart).toHaveBeenCalled(); // để hoàn tác được
    expect(onChange.mock.calls.at(-1)![0].plane.constructs).toEqual([{k: 'bisector', i: 0}]);
    expect(screen.getAllByTestId('construct-seg')).toHaveLength(1);
    expect(screen.getAllByTestId('construct-point')).toHaveLength(1);
    expect(screen.getByTestId('construct-facts').textContent).toContain('là phân giác');
    // chạm lần nữa để bỏ
    fireEvent.click(screen.getByTestId('construct-bisector'));
    expect(screen.queryAllByTestId('construct-seg')).toHaveLength(0);
  });

  it('chạm cạnh → Trung trực: có đường vuông góc tại trung điểm, điểm M, dấu góc vuông', () => {
    const onChange = vi.fn();
    render(<Harness initial={tri()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    fireEvent.pointerDown(screen.getAllByTestId('side-hit')[0], {pointerId: 1});
    const menu = screen.getByTestId('construct-menu');
    expect(within(menu).getByText('Cạnh AB')).toBeTruthy();
    fireEvent.click(within(menu).getByTestId('construct-perpBisector'));
    expect(onChange.mock.calls.at(-1)![0].plane.constructs).toEqual([{k: 'perpBisector', i: 0}]);
    expect(screen.getByTestId('construct-point').getAttribute('data-label')).toBe('M');
    expect(screen.getByTestId('construct-facts').textContent).toContain('trung trực');
  });

  it('gói "Trọng tâm G": 3 trung tuyến + điểm G, AG : GM = 2', () => {
    render(<Harness initial={tri()} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    fireEvent.click(screen.getByTestId('bundle-G'));
    expect(screen.getAllByTestId('construct-seg')).toHaveLength(3);
    expect(screen.getAllByTestId('construct-point').map((p) => p.getAttribute('data-label'))).toContain('G');
    expect(screen.getByTestId('construct-facts').textContent).toContain('AG : GM = 2,00');
  });

  it('gói Ngoại tiếp O / Nội tiếp I vẽ đường tròn; Xóa dựng dọn sạch', () => {
    render(<Harness initial={tri()} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    fireEvent.click(screen.getByTestId('bundle-O'));
    fireEvent.click(screen.getByTestId('bundle-I'));
    expect(screen.getAllByTestId('construct-circle')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('construct-clear'));
    expect(screen.queryAllByTestId('construct-circle')).toHaveLength(0);
    expect(screen.queryAllByTestId('construct-seg')).toHaveLength(0);
  });

  it('kéo đỉnh: các đường dựng đi theo, phép dựng vẫn được giữ', () => {
    const onChange = vi.fn();
    render(<Harness initial={tri()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    fireEvent.click(screen.getByTestId('bundle-G'));
    const gBefore = screen.getAllByTestId('construct-point').find((p) => p.getAttribute('data-label') === 'G')!.querySelector('circle')!.getAttribute('cx');
    const handle = screen.getAllByTestId('shape-vertex-handle')[2];
    fireEvent.pointerDown(handle, {pointerId: 1, clientX: 100, clientY: 100});
    fireEvent.pointerMove(handle, {pointerId: 1, clientX: 160, clientY: 120});
    fireEvent.pointerUp(handle, {pointerId: 1, clientX: 160, clientY: 120});
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.plane.constructs).toHaveLength(4);
    expect(last.plane.verts[2].x).not.toBeCloseTo(tri().plane!.verts[2].x, 1);
    const gAfter = screen.getAllByTestId('construct-point').find((p) => p.getAttribute('data-label') === 'G')!.querySelector('circle')!.getAttribute('cx');
    expect(gAfter).not.toBe(gBefore);
    expect(screen.getByTestId('construct-facts').textContent).toContain('AG : GM = 2,00'); // định lý vẫn đúng sau khi kéo
    // kéo xong KHÔNG mở menu (đó là thao tác kéo, không phải chạm)
    expect(screen.queryByTestId('construct-menu')).toBeNull();
  });

  it('tứ giác: gói riêng (đường chéo, nối trung điểm…), không có đường cao/trung tuyến', () => {
    render(<Harness initial={quad()} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    expect(screen.queryByTestId('bundle-G')).toBeNull();
    fireEvent.click(screen.getByTestId('bundle-D'));
    expect(screen.getAllByTestId('construct-seg')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('bundle-V'));
    expect(screen.getByTestId('construct-facts').textContent).toContain('hình bình hành');
    tap(screen.getAllByTestId('shape-vertex-handle')[0]);
    expect(screen.queryByTestId('construct-altitude')).toBeNull();
    expect(screen.getByTestId('construct-bisector')).toBeTruthy();
  });

  it('tắt chế độ dựng: ẩn công cụ nhưng các đường đã dựng vẫn nằm trên hình', () => {
    render(<Harness initial={tri()} />);
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    fireEvent.click(screen.getByTestId('bundle-H'));
    fireEvent.click(screen.getByTestId('shape-build-toggle'));
    expect(screen.queryByTestId('construct-palette')).toBeNull();
    expect(screen.queryAllByTestId('side-hit')).toHaveLength(0);
    expect(screen.getAllByTestId('construct-seg').length).toBeGreaterThanOrEqual(3);
  });
});
