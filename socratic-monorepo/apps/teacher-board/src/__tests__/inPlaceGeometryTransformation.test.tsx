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
    expect(hudBadge.textContent).toContain('Chế độ trực quan hình học');

    // Kiểm tra chấm báo hiệu trên nút Hình
    expect(screen.getByTestId('dock-geo-live-indicator')).toBeInTheDocument();

    // Bấm tắt từ nút X trên banner
    const closeBtn = screen.getByTestId('geo-live-mode-close');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('geo-live-mode-badge')).not.toBeInTheDocument();
  });

  it('Biến nét vẽ 2D tam giác thành hình học động tương tác tại chỗ trên bảng khi bấm nút nhận diện', async () => {
    render(
      <SmartboardCanvas
        initialStrokes={triangleStrokes}
        initialSelectedStrokes={triangleStrokes}
      />
    );

    // Nút biến nét vẽ thành hình tương tác xuất hiện trên thanh công cụ vùng chọn
    const inplaceBtn = await screen.findByTestId('sel-btn-geo-inplace');
    expect(inplaceBtn).toBeInTheDocument();
    expect(inplaceBtn.textContent).toContain('Tam giác vuông');
    expect(inplaceBtn.textContent).toContain('Tương tác tại chỗ');

    // Bấm nút chuyển đổi tại chỗ
    await act(async () => {
      fireEvent.click(inplaceBtn);
    });

    // Mô hình tương tác hình học 2D xuất hiện trên bảng dạng Hologram không nền
    const holoOverlay = await screen.findByTestId('hologram-simulation-overlay');
    expect(holoOverlay).toBeInTheDocument();

    // Các đỉnh kéo được trên bảng của DynamicGeometryEngine xuất hiện
    const point0 = await screen.findByTestId('geo-point-0');
    expect(point0).toBeInTheDocument();
  });

  it('Biến nét vẽ 3D hình lập phương thành hình khối tương tác xoay 3D tại chỗ trên bảng', async () => {
    render(
      <SmartboardCanvas
        initialStrokes={cubeStrokes}
        initialSelectedStrokes={cubeStrokes}
      />
    );

    const inplaceBtn = await screen.findByTestId('sel-btn-geo-inplace');
    expect(inplaceBtn).toBeInTheDocument();
    expect(inplaceBtn.textContent).toContain('Hình lập phương');
    expect(inplaceBtn.textContent).toContain('Tương tác tại chỗ');

    await act(async () => {
      fireEvent.click(inplaceBtn);
    });

    // Khối 3D lập phương xuất hiện ngay tại chỗ trên bảng
    const holoOverlay = await screen.findByTestId('hologram-simulation-overlay');
    expect(holoOverlay).toBeInTheDocument();
    expect(await screen.findByTestId('geo-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('geo-title').textContent).toContain('Hình lập phương');
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
