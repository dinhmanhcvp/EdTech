import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {SmartboardDock, AiFab, type SmartboardDockProps} from '../components/canvas/SmartboardDock';

const dockProps = (over: Partial<SmartboardDockProps> = {}): SmartboardDockProps => ({
  tool: 'PEN',
  onTool: vi.fn(),
  selectedShape: 'CIRCLE',
  onShape: vi.fn(),
  strokeColor: '#18181B',
  onColor: vi.fn(),
  strokeWidth: 3.5,
  onWidth: vi.fn(),
  palette: [{name: 'Mực than', value: '#18181B'}, {name: 'Xanh', value: '#2563EB'}],
  widths: [{label: 'Thanh', value: 2.5}, {label: 'Đậm', value: 9}],
  canUndo: false,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  gridPattern: 'DOTS',
  onCycleGrid: vi.fn(),
  onClear: vi.fn(),
  onExport: vi.fn(),
  isSplitView: true,
  onToggleSplit: vi.fn(),
  onOpenQr: vi.fn(),
  isRecorderOpen: false,
  onToggleRecorder: vi.fn(),
  customSlotCount: 0,
  scenes: [{id: 'S1', shortLabel: 'Vật lý', hotkey: 1, active: false, custom: false}],
  onScene: vi.fn(),
  busyLabel: null,
  onOpenClassroom: vi.fn(),
  classroomStudents: null,
  ...over,
});

describe('SmartboardDock: thanh tác vụ duy nhất', () => {
  it('có đủ chức năng của bảng thông minh', () => {
    render(<SmartboardDock {...dockProps()} />);
    for (const id of ['tool-lasso', 'tool-pen', 'tool-shape', 'tool-eraser', 'tool-clear', 'btn-classroom', 'btn-more']) expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('chọn công cụ và hình gọi đúng hàm', () => {
    const p = dockProps();
    render(<SmartboardDock {...p} />);
    fireEvent.click(screen.getByTestId('tool-eraser'));
    expect(p.onTool).toHaveBeenCalledWith('ERASER');
    fireEvent.click(screen.getByTestId('tool-lasso'));
    expect(p.onTool).toHaveBeenCalledWith('LASSO');
    fireEvent.click(screen.getByTestId('tool-shape'));
    fireEvent.click(screen.getByTestId('tool-rect'));
    expect(p.onShape).toHaveBeenCalledWith('RECTANGLE');
  });

  it('bút đang chọn: chạm lần nữa mở bảng màu; đổi màu và độ dày', () => {
    const p = dockProps();
    render(<SmartboardDock {...p} />);
    const pop = screen.getByTestId('pen-popover');
    expect(pop.className).toContain('hidden');
    fireEvent.click(screen.getByTestId('tool-pen'));
    expect(screen.getByTestId('pen-popover').className).toContain('flex');
    expect(screen.getByTestId('pen-popover').className).not.toMatch(/(^|\s)hidden(\s|$)/);
    fireEvent.click(screen.getByTitle('Xanh'));
    expect(p.onColor).toHaveBeenCalledWith('#2563EB');
    fireEvent.click(screen.getByText('Đậm'));
    expect(p.onWidth).toHaveBeenCalledWith(9);
  });

  it('bút chưa chọn: chạm một lần chỉ chọn bút, không bật bảng màu', () => {
    const p = dockProps({tool: 'ERASER'});
    render(<SmartboardDock {...p} />);
    fireEvent.click(screen.getByTestId('tool-pen'));
    expect(p.onTool).toHaveBeenCalledWith('PEN');
    expect(screen.getByTestId('pen-popover').className).toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('"Thêm" chứa nửa bảng, QR, xuất ảnh, phòng thu, cảnh mẫu', () => {
    const p = dockProps();
    render(<SmartboardDock {...p} />);
    fireEvent.click(screen.getByTestId('btn-more'));
    fireEvent.click(screen.getByTestId('btn-split-view-toggle'));
    expect(p.onToggleSplit).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('btn-pack-smart-notes'));
    expect(p.onOpenQr).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('director-scene-btn-1'));
    expect(p.onScene).toHaveBeenCalledWith('S1');
  });

  it('hoàn tác/làm lại bị khóa khi không có lịch sử; lớp học hiện sĩ số', () => {
    const {rerender} = render(<SmartboardDock {...dockProps()} />);
    expect((screen.getByText('Hoàn tác').closest('button') as HTMLButtonElement).disabled).toBe(true);
    rerender(<SmartboardDock {...dockProps({canUndo: true, classroomStudents: 7})} />);
    expect((screen.getByText('Hoàn tác').closest('button') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId('btn-classroom').textContent).toContain('7');
  });
});

describe('AiFab: một nút AI nổi, bung ra các chức năng nhỏ', () => {
  const fab = (over = {}) => ({selectionCount: 0, busy: false, listening: false, onConvert: vi.fn(), onVisualize: vi.fn(), onLasso: vi.fn(), onVoice: vi.fn(), ...over});

  it('đóng thì các chức năng ẩn; chạm nút để bung ra', () => {
    render(<AiFab {...fab()} />);
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(screen.getByTestId('ai-fab'));
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('false');
    for (const id of ['tool-convert-ink', 'top-toolbar-btn-visualize', 'ai-fab-lasso', 'ai-fab-voice']) expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('chọn chức năng gọi hàm tương ứng rồi tự thu gọn', () => {
    const p = fab({selectionCount: 3});
    render(<AiFab {...p} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.click(screen.getByTestId('tool-convert-ink'));
    expect(p.onConvert).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.click(screen.getByTestId('top-toolbar-btn-visualize'));
    expect(p.onVisualize).toHaveBeenCalledTimes(1);
  });

  it('Esc thu gọn menu', () => {
    render(<AiFab {...fab()} />);
    fireEvent.click(screen.getByTestId('ai-fab'));
    fireEvent.keyDown(window, {key: 'Escape'});
    expect(screen.getByTestId('ai-fab-menu').getAttribute('aria-hidden')).toBe('true');
  });
});
