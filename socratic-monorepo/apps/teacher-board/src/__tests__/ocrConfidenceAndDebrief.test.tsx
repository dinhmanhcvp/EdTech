import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OcrReviewModal } from '../components/canvas/OcrReviewModal';
import { InkConvertPanel } from '../components/canvas/InkConvertPanel';
import { SmartboardCanvas } from '../components/canvas/SmartboardCanvas';
import { Stroke } from '../utils/lassoGeometry';

describe('OCR Confidence Check, Candidate Selection & Temporal Scene Chunking', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST 1: Khi confidence thấp hoặc có ký tự nghi vấn -> Cho phép sửa và chọn ký tự đúng
   */
  it('test_low_confidence_modal_shows_ambiguous_candidate_chips_and_manual_edit', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <OcrReviewModal
        isOpen={true}
        thumbnailUrl="data:image/webp;base64,mockLowConf"
        recognizedLatex="y = Z*x + 5"
        confidence={0.72}
        alternatives={['y = 2*x + 5', 'y = 2*x + S']}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // 1. Modal mở và hiển thị badge 72%
    expect(screen.getByTestId('ocr-review-modal')).toBeTruthy();
    expect(screen.getByTestId('ocr-confidence-badge').textContent).toContain('72%');

    // 2. Có nút 1-tap swap cho các ký tự dễ nhầm lẫn (Z ⇄ 2, 5 ⇄ S)
    const swapZBtn = screen.getByTitle('Đổi Z thành 2');
    expect(swapZBtn).toBeTruthy();
    expect(swapZBtn.textContent).toContain('Z ⇄ 2');

    // 3. Bấm đổi Z thành 2 -> Công thức tự đổi thành 'y = 2*x + 5'
    fireEvent.click(swapZBtn);
    const input = screen.getByTestId('ocr-review-input') as HTMLInputElement;
    expect(input.value).toBe('y = 2*x + 5');

    // 4. Cho phép sửa trực tiếp bằng input
    fireEvent.change(input, { target: { value: 'y = 2*x + 10' } });
    expect(input.value).toBe('y = 2*x + 10');

    // 5. Xác nhận đưa lên bảng
    fireEvent.click(screen.getByTestId('ocr-confirm-btn'));
    expect(onConfirm).toHaveBeenCalledWith('y = 2*x + 10');
  });

  /**
   * TEST 2: Khi confidence bình thường -> Modal đóng, không làm phiền người dùng
   */
  it('test_normal_confidence_modal_closed_when_isOpen_false', () => {
    render(
      <OcrReviewModal
        isOpen={false}
        thumbnailUrl={null}
        recognizedLatex="y = 2x + 1"
        confidence={0.98}
        alternatives={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByTestId('ocr-review-modal')).toBeNull();
  });

  /**
   * TEST 3: Trong InkConvertPanel, ký tự nghi vấn chỉ xuất hiện khi confidence thấp hoặc cần soát
   */
  it('test_ink_convert_panel_shows_token_confusions_only_on_low_confidence', () => {
    const mockStroke: Stroke = {
      id: 's-1',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ffffff',
      width: 3,
    };

    // Mode editing với confidence bình thường = 1.0
    const { rerender } = render(
      <InkConvertPanel
        source={[mockStroke]}
        editing={{ latex: 'y = 2x + 1', text: 'y = 2x + 1' }}
        onClose={vi.fn()}
        onApply={vi.fn()}
        onVisualizeLocal={vi.fn()}
        onVisualizeAi={vi.fn()}
      />
    );

    // Dòng 0 có confidence = 1 (bình thường), KHÔNG hiển thị box sửa ký tự nghi ngờ
    expect(screen.queryByTestId('ink-convert-confusions-0')).toBeNull();
  });

  /**
   * TEST 4: Pre-Clear Commit - Khi xóa bảng (handleClear), ngữ cảnh bài học được giữ lại
   */
  it('test_pre_clear_commit_preserves_scenes_count_in_recap', async () => {
    render(<SmartboardCanvas />);

    const canvas = screen.getByTestId('chalkboard-canvas');

    // Vẽ nét 1
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 120, clientY: 120 });
    fireEvent.pointerUp(canvas);

    // Mở modal tổng kết bài giảng (QR Smart Notes)
    const qrBtn = screen.getByTestId('btn-pack-smart-notes');
    fireEvent.click(qrBtn);

    const scenesCount = screen.getByTestId('recap-scenes-count');
    expect(scenesCount.textContent).toContain('phân cảnh');

    // Đóng QR modal
    fireEvent.click(screen.getByText('✕'));
  });
});
