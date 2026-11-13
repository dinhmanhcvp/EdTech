import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {compactLabel, compactLabels} from '../utils/quantityLabel';
import {PRESETS} from '../utils/presets';
import {SceneLab} from '../engines/families/SceneLab';
import {LabelModeProvider} from '../engines/LabelMode';
import type {SceneData} from '../utils/presets/types';

describe('nhãn đại lượng gọn', () => {
  it('cụm chữ dài đầu nhãn → kí hiệu SGK; nhãn ngắn để nguyên; "Tên: công thức" → công thức', () => {
    expect(compactLabel('Khối lượng riêng chất lỏng (kg/m³)', 'PHYSICS').short).toBe('ρ chất lỏng (kg/m³)');
    expect(compactLabel('Lực đẩy Archimedes lên khối 1 L ngập hoàn toàn', 'PHYSICS').short).toBe('Fₐ (khối 1 L ngập hẳn)');
    expect(compactLabel('Khối lượng (kg)', 'PHYSICS').short).toBe('Khối lượng (kg)');
    expect(compactLabel('Áp suất tại độ sâu h: p = p₀ + ρgh', 'PHYSICS').short).toBe('p = p₀ + ρgh');
    expect(compactLabel('Khối lượng xe m (hoặc m₁ ở máy Atwood) (kg)', 'PHYSICS').short).toBe('m xe (kg)');
  });
  it('không đổi nghĩa: nhãn tự nêu kí hiệu khác giữ chữ; môn Sinh không dùng kí hiệu Vật lý; danh sách để nguyên', () => {
    expect(compactLabel('Tần số alen A sau nhiều thế hệ', 'BIOLOGY').sym).toBeUndefined();
    expect(compactLabel('Biên độ dao động của điện trường E₀ (V/m)', 'PHYSICS').sym).toBeUndefined();
    expect(compactLabel('Thế năng · động năng · nhiệt lượng tỏa ra', 'PHYSICS').sym).toBeUndefined();
  });
  it('trong một mô phỏng, hai đại lượng trùng kí hiệu (P trọng lượng / P công suất) hoặc rút gọn ra cùng chuỗi thì giữ chữ để phân biệt', () => {
    const [a, b, c] = compactLabels(['Trọng lượng của vật nặng (N)', 'Công suất của động cơ kéo (W)', 'Khối lượng riêng của dầu (kg/m³)'], 'PHYSICS');
    expect(a.short).toBe('Trọng lượng của vật nặng (N)');
    expect(b.short).toBe('Công suất của động cơ kéo (W)');
    expect(c.short).toBe('ρ của dầu (kg/m³)');
    const [d, e] = compactLabels(['Độ cao ban đầu của vật (m)', 'Độ sâu ban đầu của vật (m)'], 'PHYSICS');
    expect(d.short).not.toBe(e.short);
  });
  it('mọi nhãn thanh trượt / số đọc của các mô phỏng sau khi gọn đều vừa ô (rà toàn bộ template)', () => {
    const tooLong: string[] = [];
    // công thức hoặc bảng chú giải bước giữ nguyên dù dài
    const allow = /=|Bước \(|đột biến|chuông|Liều cho|Góc \(F|n = 3|Đường ăn vào/;
    for (const [id, spec] of Object.entries(PRESETS)) {
      const d = spec.data as unknown as {sliders?: {label: string; unit?: string}[]; params?: {label: string; unit?: string}[]; readouts?: {label: string}[]};
      const labels = [...(d.sliders ?? []), ...(d.params ?? [])].map((q) => `${q.label}${q.unit ? ` (${q.unit})` : ''}`).concat((d.readouts ?? []).map((r) => r.label));
      compactLabels(labels, spec.engine).forEach((c) => {
        if (c.short.length > 34 && !allow.test(c.short)) tooLong.push(`${id}: ${c.short}`);
      });
    }
    expect(tooLong).toEqual([]);
  });
});

describe('nút Kí hiệu / Chữ trên mô phỏng', () => {
  it('mặc định kí hiệu kèm dòng chú giải; bấm "Chữ" thì hiện nguyên văn; luôn có tên đầy đủ khi rê chuột', async () => {
    const data = PRESETS.PHYS_FLUID_PRESSURE.data as SceneData;
    render(
      <LabelModeProvider subject="PHYSICS">
        <SceneLab id="PHYS_FLUID_PRESSURE" data={data} />
      </LabelModeProvider>,
    );
    const readouts = screen.getByTestId('scene-readouts');
    expect(readouts.textContent).toContain('Fₐ (khối 1 L ngập hẳn)');
    expect(readouts.querySelector('[title="Lực đẩy Archimedes lên khối 1 L ngập hoàn toàn"]')).toBeTruthy();
    expect(screen.getByTestId('label-legend').textContent).toContain('ρ: khối lượng riêng');
    await act(async () => {
      fireEvent.click(screen.getByTestId('label-mode-word'));
    });
    expect(screen.getByTestId('scene-readouts').textContent).toContain('Lực đẩy Archimedes lên khối 1 L ngập hoàn toàn');
    expect(screen.queryByTestId('label-legend')).toBeNull();
  });
});
