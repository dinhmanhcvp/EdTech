import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import type { Stroke } from '../utils/lassoGeometry';
import { GeometryEngine } from '../engines/GeometryEngine';
import { makeSolidBlueprint, makePlaneGeometryBlueprint } from '../utils/localRouter';
import { detectSolidFromStrokes, detectPlaneShapeFromStrokes } from '../utils/sketchSolid';

describe('In-Place Geometry Transformation on Smartboard Canvas', () => {
  const triangleStrokes: Stroke[] = [
    { id: 't1', points: [{ x: 100, y: 100 }, { x: 100, y: 300 }], color: '#000000', width: 3 },
    { id: 't2', points: [{ x: 100, y: 300 }, { x: 300, y: 300 }], color: '#000000', width: 3 },
    { id: 't3', points: [{ x: 300, y: 300 }, { x: 100, y: 100 }], color: '#000000', width: 3 },
  ];

  const cubeStrokes: Stroke[] = [
    { id: 'c1', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }, { x: 100, y: 100 }], color: '#000', width: 3 },
    { id: 'c2', points: [{ x: 140, y: 70 }, { x: 240, y: 70 }, { x: 240, y: 170 }, { x: 140, y: 170 }, { x: 140, y: 70 }], color: '#000', width: 3 },
    { id: 'c3', points: [{ x: 100, y: 100 }, { x: 140, y: 70 }], color: '#000', width: 3 },
    { id: 'c4', points: [{ x: 200, y: 100 }, { x: 240, y: 70 }], color: '#000', width: 3 },
    { id: 'c5', points: [{ x: 200, y: 200 }, { x: 240, y: 170 }], color: '#000', width: 3 },
    { id: 'c6', points: [{ x: 100, y: 200 }, { x: 140, y: 170 }], color: '#000', width: 3 },
  ];

  it('GeometryEngine hỗ trợ isHologram: xóa nền đục (clearRect) và trong suốt hòa quyện mặt bảng', () => {
    const bp = makeSolidBlueprint('cube');
    render(<GeometryEngine blueprint={bp} isHologram={true} />);

    expect(screen.getByTestId('geo-engine')).toBeInTheDocument();
    const canvas = screen.getByTestId('geo-canvas');
    expect(canvas).toBeInTheDocument();

    const canvasParent = canvas.parentElement;
    expect(canvasParent?.className).toContain('bg-transparent');
    expect(canvasParent?.className).toContain('border-0');
  });

  it('Nhận diện hình khối 3D và đa giác phẳng 2D từ nét vẽ tay chuẩn xác', () => {
    const plane = detectPlaneShapeFromStrokes(triangleStrokes);
    expect(plane).not.toBeNull();
    expect(plane?.kind).toBe('triangle_right');
    expect(plane?.title).toContain('Tam giác vuông');

    const solid = detectSolidFromStrokes(cubeStrokes);
    expect(solid).not.toBeNull();
    expect(solid?.kind).toBe('cube');
  });

  it('Bật/Tắt Chế độ trực quan hình học tự động từ thanh tác vụ và hiển thị HUD banner', () => {
    render(<SmartboardCanvas />);

    // Mở popover Hình
    const shapeToolBtn = screen.getByTestId('tool-shape');
    fireEvent.click(shapeToolBtn);

    // Nút bật Chế độ trực quan hình học
    const geoToggleBtn = screen.getByTestId('tool-geo-live-mode-toggle');
    expect(geoToggleBtn).toBeInTheDocument();
    expect(geoToggleBtn.textContent).toContain('Trực quan hình học');

    // Bấm BẬT
    fireEvent.click(geoToggleBtn);

    // Kiểm tra HUD banner xuất hiện trên bảng
    const hudBadge = screen.getByTestId('geo-live-mode-badge');
    expect(hudBadge).toBeInTheDocument();
    expect(hudBadge.textContent).toContain('Trực quan hình học');

    // Kiểm tra chấm báo hiệu trên nút Hình
    expect(screen.getByTestId('dock-geo-live-indicator')).toBeInTheDocument();

    // Bấm tắt từ nút X trên banner
    const closeBtn = screen.getByTestId('geo-live-mode-close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('geo-live-mode-badge')).not.toBeInTheDocument();
  });

  it('Tam giác vẽ tay: Trực quan chỉ đường sang Vẽ hình; Vẽ hình dựng hình có đủ dụng cụ tầng 2', async () => {
    render(<SmartboardCanvas initialStrokes={triangleStrokes} initialSelectedStrokes={triangleStrokes} />);

    // Trực quan dành cho hàm số/công thức: gặp hình học thì không tự vẽ mà mở tầng Vẽ hình
    await act(async () => {
      fireEvent.click(await screen.findByTestId('top-toolbar-btn-visualize'));
    });
    expect(screen.queryByTestId('inline-shape')).not.toBeInTheDocument();
    expect(await screen.findByTestId('ai-fab-draw-new')).toBeInTheDocument();

    // Vẽ hình: nét vẽ tay được nhận dạng và thay bằng hình dựng ngay tại chỗ
    await act(async () => {
      fireEvent.click(screen.getByTestId('ai-fab-draw-new'));
    });
    const shape = await screen.findByTestId('inline-shape');
    expect(shape.getAttribute('data-title')).toContain('Tam giác');
    expect(screen.queryByTestId('hologram-simulation-overlay')).not.toBeInTheDocument();
    // tầng 2 có đủ chức năng chuyên sâu cho hình vừa dựng
    for (const id of ['ai-fab-draw-tools', 'ai-fab-draw-measure', 'ai-fab-draw-hidden', 'ai-fab-draw-export']) expect(await screen.findByTestId(id)).toBeInTheDocument();
  });

  it('Hình lập phương vẽ tay: Vẽ hình nhận ra lập phương (không phải hộp) và có đủ dụng cụ', async () => {
    render(<SmartboardCanvas initialStrokes={cubeStrokes} initialSelectedStrokes={cubeStrokes} />);

    await act(async () => {
      fireEvent.click(await screen.findByTestId('ai-fab-draw'));
    });
    const shape = await screen.findByTestId('inline-shape');
    expect(shape.getAttribute('data-title')).toContain('lập phương');
    expect(screen.queryByTestId('hologram-simulation-overlay')).not.toBeInTheDocument();
    // hình khối có nét đứt cho cạnh khuất
    expect(screen.getAllByTestId('edge-hidden').length).toBeGreaterThan(0);
    for (const id of ['ai-fab-draw-tools', 'ai-fab-draw-measure', 'ai-fab-draw-view3d']) expect(await screen.findByTestId(id)).toBeInTheDocument();
  });

  it('Thanh công cụ nổi dạng viên thuốc (Floating Pill Toolbar) ngay dưới hình 3D cho phép tương tác 1 chạm (Frame 38 Video)', () => {
    const bp = makeSolidBlueprint('cube');
    render(<GeometryEngine blueprint={bp} isHologram={true} />);

    // Thanh công cụ nổi xuất hiện
    const pillToolbar = screen.getByTestId('geo-floating-pill-toolbar');
    expect(pillToolbar).toBeInTheDocument();

    // Các nút 1 chạm thao tác nhanh
    const pillLabels = screen.getByTestId('geo-pill-labels');
    const pillSection = screen.getByTestId('geo-pill-section');
    const pillSphere = screen.getByTestId('geo-pill-sphere');
    const pillAltitude = screen.getByTestId('geo-pill-altitude');
    const pillMidpoints = screen.getByTestId('geo-pill-midpoints');
    const pillUnfold = screen.getByTestId('geo-pill-unfold');
    const pillReset = screen.getByTestId('geo-pill-reset');

    expect(pillLabels).toBeInTheDocument();
    expect(pillSection).toBeInTheDocument();
    expect(pillSphere).toBeInTheDocument();
    expect(pillAltitude).toBeInTheDocument();
    expect(pillMidpoints).toBeInTheDocument();
    expect(pillUnfold).toBeInTheDocument();
    expect(pillReset).toBeInTheDocument();

    // 1-Chạm bật Cắt Thiết Diện (2D + 3D) từ thanh công cụ nổi
    fireEvent.click(pillSection);
    const canvas = screen.getByTestId('geo-canvas');
    expect(canvas).toHaveAttribute('data-section-mode', 'true');
    expect(pillSection).toHaveAttribute('aria-pressed', 'true');

    // 1-Chạm bật Mặt Cầu 3D với 3 đường tròn lớn trực giao (Frame 35)
    fireEvent.click(pillSphere);
    expect(pillSphere).toHaveAttribute('aria-pressed', 'true');

    // 1-Chạm bật Đường Cao SO/SH
    fireEvent.click(pillAltitude);
    expect(pillAltitude).toHaveAttribute('aria-pressed', 'true');

    // 1-Chạm bật Trung Điểm M, N, P
    fireEvent.click(pillMidpoints);
    expect(pillMidpoints).toHaveAttribute('aria-pressed', 'true');

    // 1-Chạm Khai Triển / Gập
    fireEvent.click(pillUnfold);
    // Đặt lại view
    fireEvent.click(pillReset);
  });
});
