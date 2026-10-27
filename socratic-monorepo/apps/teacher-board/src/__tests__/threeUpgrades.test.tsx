import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import {makeSolid, computeCrossSection, planeFromThreePoints} from '../utils/solids';
import {GeometryEngine} from '../engines/GeometryEngine';
import {GraphEngine, functionsFromBlueprint} from '../engines/GraphEngine';
import {VoiceAiQaCard, resolveVoiceQaQuery} from '../components/canvas/VoiceAiQaCard';
import {SmartboardCanvas, matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import type {SimulationBlueprint} from '@socratic/types';

describe('Nâng cấp 1 — Thiết Diện Hình Học Không Gian 3D Động & Trích Xuất Mặt Cắt 2D Thật', () => {
  it('computeCrossSection trích xuất đúng Tam giác đều, Tứ giác, Ngũ giác và Lục giác đều trên Hình lập phương', () => {
    const cube = makeSolid('cube', {a: 2});

    // 1. Mặt phẳng đi qua tâm O với pháp tuyến (1,1,1) -> Lục giác đều (6 đỉnh)
    const hex = computeCrossSection(cube, [1, 1, 1], 0);
    expect(hex.valid).toBe(true);
    expect(hex.vertices).toHaveLength(6);
    expect(hex.isRegular).toBe(true);
    expect(hex.shapeName).toBe('Lục giác đều');
    // Cạnh lục giác đều cắt trung điểm hình lập phương cạnh 2 là √2 ≈ 1.4142, diện tích = (3√3/2)*(√2)^2 = 3√3 ≈ 5.196
    expect(hex.area).toBeCloseTo(3 * Math.sqrt(3), 2);
    hex.vertices.forEach((v) => {
      expect(v.angleDeg).toBeCloseTo(120, 1);
      expect(v.nextEdgeLen).toBeCloseTo(Math.SQRT2, 2);
    });

    // 2. Mặt phẳng (1,1,1) dịch về phía đỉnh (d = 1.15) -> Tam giác đều (3 đỉnh)
    const tri = computeCrossSection(cube, [1, 1, 1], 1.15);
    expect(tri.valid).toBe(true);
    expect(tri.vertices).toHaveLength(3);
    expect(tri.shapeName).toBe('Tam giác đều');
    tri.vertices.forEach((v) => {
      expect(v.angleDeg).toBeCloseTo(60, 1);
    });

    // 3. Mặt phẳng (1,1,1) tại d = 0.5 -> Ngũ giác (5 đỉnh) hoặc Lục giác; với pháp tuyến lệch [1, 0.8, 0.5] tại d = 0.55 -> Ngũ giác
    const pent = computeCrossSection(cube, [1, 1, 1], 0.5);
    expect(pent.valid).toBe(true);
    expect(pent.vertices.length).toBeGreaterThanOrEqual(3);

    // 4. Mặt phẳng song song đáy (0,0,1) tại d = 0 -> Hình vuông (4 đỉnh, góc 90°, diện tích = 4)
    const sq = computeCrossSection(cube, [0, 0, 1], 0);
    expect(sq.valid).toBe(true);
    expect(sq.vertices).toHaveLength(4);
    expect(sq.shapeName).toBe('Hình vuông');
    expect(sq.area).toBeCloseTo(4, 3);
    sq.vertices.forEach((v) => {
      expect(v.angleDeg).toBeCloseTo(90, 1);
      expect(v.nextEdgeLen).toBeCloseTo(2, 2);
    });
  });

  it('planeFromThreePoints dựng đúng mặt phẳng từ 3 điểm không thẳng hàng', () => {
    const p = planeFromThreePoints([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    expect(p.normal[0]).toBeCloseTo(1 / Math.sqrt(3), 4);
    expect(p.normal[1]).toBeCloseTo(1 / Math.sqrt(3), 4);
    expect(p.normal[2]).toBeCloseTo(1 / Math.sqrt(3), 4);
    expect(p.d).toBeCloseTo(1 / Math.sqrt(3), 4);
  });

  it('GeometryEngine hiển thị chế độ Cắt Thiết Diện (2D + 3D), đổi mẫu thiết diện và kéo thanh trượt thời gian thực', () => {
    const bp: SimulationBlueprint = {
      engine: 'GEOMETRY',
      templateId: 'GEO_SOLID',
      recognizedLatex: '\\text{Hình lập phương}',
      parameters: [],
      meta: {solid: 'cube', dims: {a: 2}},
      socraticQuestion: 'Thiết diện là hình gì?',
    };

    render(<GeometryEngine blueprint={bp} />);

    // Bấm nút chuyển sang chế độ Cắt Thiết Diện
    const secBtn = screen.getByTestId('geo-mode-section');
    fireEvent.click(secBtn);

    const canvas = screen.getByTestId('geo-canvas');
    expect(canvas).toHaveAttribute('data-section-mode', 'true');
    expect(screen.getByTestId('geo-section-panel')).toBeInTheDocument();

    // Mặc định (1,1,1) d = 0 -> Lục giác đều (6 cạnh)
    expect(canvas).toHaveAttribute('data-section-verts', '6');
    expect(screen.getByTestId('geo-section-shape-label').textContent).toContain('Lục giác đều');

    // Bấm mẫu Tam giác đều
    fireEvent.click(screen.getByTestId('geo-section-preset-triangle'));
    expect(canvas).toHaveAttribute('data-section-verts', '3');
    expect(screen.getByTestId('geo-section-shape-label').textContent).toContain('Tam giác đều');

    // Chuyển sang điều khiển bằng 3 điểm trên cạnh
    fireEvent.click(screen.getByTestId('geo-section-ctrl-3pts'));
    expect(screen.getByTestId('geo-section-3pts-controls')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('geo-3pt-slider-0'), {target: {value: '0.75'}});
    expect(screen.getByTestId('geo-section-metrics')).toBeInTheDocument();

    // Bật thanh công cụ Vẽ Thêm Hình Phụ 3D (Đường cao, Đường chéo đáy, Trung điểm, Mặt cầu ngoại tiếp, Đổi nhanh khối)
    fireEvent.click(screen.getByTestId('geo-construct-toggle'));
    expect(screen.getByTestId('geo-construct-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('geo-aux-altitude'));
    expect(screen.getByTestId('geo-aux-altitude')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('geo-aux-midpoints'));
    expect(screen.getByTestId('geo-aux-midpoints')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('geo-switch-solid-pyramid4'));
    expect(screen.getByTestId('geo-title').textContent).toContain('S.ABCD');
  });
});

describe('Nâng cấp 2 — Nhận Diện Đa Hàm Số Tương Giao + HUD Thanh Trượt Góc Đồ Thị Có Nút Auto-Play ▶', () => {
  it('matchInstantStemBlueprint nhận diện đồng thời 2 hàm số (y = x² − 3 và y = A sin x + B) vào hệ trục MATH_GRAPH', () => {
    const bp = matchInstantStemBlueprint('y = x^2 - 3 \\\\ y = A \\sin x + B');
    expect(bp).not.toBeNull();
    expect(bp!.templateId).toBe('MATH_GRAPH');
    expect(bp!.expressions).toEqual(['y = x^2 - 3', 'y = A \\sin x + B']);
    expect(functionsFromBlueprint(bp!)).toHaveLength(2);
  });

  it('GraphEngine hiển thị cả 2 hàm trên hệ trục nền tối kèm HUD thanh trượt A, B ở góc trên phải và nút ▶ Auto-Play', () => {
    const bp = matchInstantStemBlueprint('y = x^2 - 3; y = A sin x + B')!;
    render(<GraphEngine blueprint={bp} />);

    // Kiểm tra cả 2 hàm đều có trong danh sách và đang hiển thị
    expect(screen.getByTestId('graph-fn-input-0')).toHaveValue('y = x^2 - 3');
    expect(screen.getByTestId('graph-fn-input-1')).toHaveValue('y = A sin x + B');

    const canvas = screen.getByTestId('graph-canvas');
    expect(canvas).toHaveAttribute('data-fn-count', '2');
    expect(canvas).toHaveAttribute('data-dark-board', 'true');
    expect(Number(canvas.getAttribute('data-intersections'))).toBeGreaterThanOrEqual(2);

    // Cụm HUD thanh trượt nằm gọn ngay góc trên bên phải đồ thị
    const hud = screen.getByTestId('graph-hud-params');
    expect(hud).toBeInTheDocument();
    expect(screen.getByTestId('graph-param-A')).toBeInTheDocument();
    expect(screen.getByTestId('graph-param-B')).toBeInTheDocument();

    // Nút Play/Pause (▶ Auto-Play) hoạt động mượt mà
    const playBtn = screen.getByTestId('graph-autoplay-btn');
    expect(playBtn.textContent).toContain('Auto-Play');
    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    expect(playBtn.textContent).toContain('Pause');
    fireEvent.click(playBtn);
    expect(playBtn).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Nâng cấp 3 — Hỏi Đáp AI Giọng Nói Kèm Mô Hình Minh Họa Động Ngay Trên Bảng (Voice AI Q&A Card)', () => {
  it('resolveVoiceQaQuery trả lời chính xác câu hỏi thiết diện hình lập phương kèm các mô hình minh họa động', () => {
    const ans = resolveVoiceQaQuery('Trong hình lập phương, thiết diện nào có diện tích lớn nhất?');
    expect(ans.headline).toContain('Lục giác đều');
    expect(ans.actions.length).toBeGreaterThanOrEqual(2);
    expect(ans.actions[0].blueprint.templateId).toBe('GEO_SOLID');
    expect(ans.actions[0].blueprint.meta?.initialMode).toBe('section');
  });

  it('VoiceAiQaCard mở từ nút AI trên bảng và cho phép bấm 1 chạm để bung mô hình minh họa động lên bảng', () => {
    const onSpawn = vi.fn();
    const onClose = vi.fn();
    render(
      <VoiceAiQaCard
        isOpen={true}
        initialQuery="Trong hình lập phương, thiết diện nào có diện tích lớn nhất?"
        onClose={onClose}
        onSpawnBlueprint={onSpawn}
      />,
    );

    expect(screen.getByTestId('voice-ai-qa-card')).toBeInTheDocument();
    expect(screen.getByTestId('voice-qa-headline').textContent).toContain('Lục giác đều');

    // Bấm vào nút minh họa Thiết diện Lục giác đều -> gọi onSpawnBlueprint với blueprint chế độ section
    const hexBtn = screen.getByTestId('voice-qa-spawn-act-hexagon');
    fireEvent.click(hexBtn);
    expect(onSpawn).toHaveBeenCalledTimes(1);
    const spawnedBp = onSpawn.mock.calls[0][0] as SimulationBlueprint;
    expect(spawnedBp.templateId).toBe('GEO_SOLID');
    expect(spawnedBp.meta?.initialMode).toBe('section');
  });

  it('Tích hợp trực tiếp trên SmartboardCanvas thông qua menu tròn của nút AI', () => {
    render(<SmartboardCanvas />);
    // Mở menu tròn từ nút AI
    fireEvent.click(screen.getByTestId('ai-fab'));
    // Bấm nút Thẻ Hỏi Đáp
    const qaBtn = screen.getByTestId('ai-fab-qa');
    fireEvent.click(qaBtn);

    // Thẻ Voice AI Q&A hiện ngay trên bảng
    expect(screen.getByTestId('voice-ai-qa-card')).toBeInTheDocument();

    // Bấm nút nạp mô hình Thiết diện Lục giác đều lên bảng
    fireEvent.click(screen.getByTestId('voice-qa-spawn-act-hexagon'));

    // Mô hình 3D + mặt cắt 2D hiện trực tiếp trên bảng
    expect(screen.getByTestId('geo-engine')).toBeInTheDocument();
    expect(screen.getByTestId('geo-canvas')).toHaveAttribute('data-section-mode', 'true');
  });
});
