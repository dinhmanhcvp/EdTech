import React from 'react';
import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import {matchLegacyTemplate} from '../utils/legacyTemplates';
import {parseSphereCenter} from '../utils/advancedStemModels';
import {LIVE_CASES} from './liveDemoCases.test';

afterEach(cleanup);

describe('mọi template trong danh sách trình diễn đều dựng được widget', () => {
  for (const c of LIVE_CASES) {
    it(`${c.id} ← ${c.input.split('\n')[0]}`, () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const bp = matchInstantStemBlueprint(c.input)!;
      expect(bp?.templateId).toBe(c.id);
      const {container} = render(<SimulationWidget blueprint={bp} />);
      expect(container.querySelector(`[data-template-id="${c.id}"]`), 'widget mang đúng templateId').toBeTruthy();
      const bad = err.mock.calls.filter((a) => /Error|không hợp lệ|Cannot|undefined is not/i.test(String(a[0])) && !/not wrapped in act|ReactDOMTestUtils/.test(String(a[0])));
      err.mockRestore();
      expect(bad, 'không lỗi React khi dựng').toEqual([]);
    });
  }
});

describe('ba mô phỏng mới có đường mở cục bộ', () => {
  it('thấu kính: đọc f, d và nằm trong khoảng cho phép', () => {
    const b = matchLegacyTemplate('thấu kính hội tụ f = 120 d = 300')!;
    const p = Object.fromEntries(b.parameters.map((x) => [x.key, x.defaultValue]));
    expect(b.templateId).toBe('PHYS_OPTICS_LENS');
    expect(p.f).toBe(120);
    expect(p.d).toBe(300);
    expect(matchLegacyTemplate('thấu kính f = 999')!.parameters.find((x) => x.key === 'f')!.defaultValue).toBe(180);
    expect(matchInstantStemBlueprint('1/f = 1/d + 1/d\'')?.templateId).toBe('PHYS_OPTICS_LENS');
  });

  it('nhịp tim: đọc BPM, kẹp trong 40–180', () => {
    const bpm = (s: string) => matchLegacyTemplate(s)!.parameters[0].defaultValue;
    expect(bpm('nhịp tim 120 BPM')).toBe(120);
    expect(bpm('ECG 150 bpm')).toBe(150);
    expect(bpm('BPM = 90')).toBe(90);
    expect(bpm('nhịp tim 300')).toBe(180);
    expect(bpm('điện tâm đồ')).toBe(75);
  });

  it('phản ứng tạo khí: kim loại + axit, đọc nhiệt độ và nồng độ', () => {
    const b = matchLegacyTemplate('Mg + HCl 60°C 2M')!;
    const p = Object.fromEntries(b.parameters.map((x) => [x.key, x.defaultValue]));
    expect(b.templateId).toBe('CHEM_REACTION_LAB');
    expect(p.temperature).toBe(60);
    expect(p.concentration).toBe(2);
    for (const s of ['Zn + H2SO4', 'Zn + H_{2}SO_{4}', 'tốc độ phản ứng', 'bọt khí']) expect(matchLegacyTemplate(s)?.templateId, s).toBe('CHEM_REACTION_LAB');
  });

  it('không nuốt nhầm chuẩn độ, cân bằng, hay chữ thường', () => {
    expect(matchInstantStemBlueprint('chuẩn độ HCl bằng NaOH')?.templateId).toBe('CHEM_EQUILIBRIUM_TITRATION');
    expect(matchInstantStemBlueprint('Fe + O2 -> Fe2O3')?.templateId).toBe('CHEM_BALANCE_SCALE');
    for (const s of ['heartbreak hotel', 'Hà Nội', 'y = x^2', 'tính tiêu thụ điện']) expect(matchLegacyTemplate(s), s).toBeNull();
  });

  it('tên tiếng Việt cũng mở đúng (kể cả viết tay đọc sai dấu)', () => {
    expect(matchInstantStemBlueprint('chu kỳ tim')?.templateId).toBe('BIO_HEART_CYCLE');
    expect(matchInstantStemBlueprint('thau kinh hoi tu')?.templateId).toBe('PHYS_OPTICS_LENS');
    expect(matchInstantStemBlueprint('tốc độ phản ứng')?.templateId).toBe('CHEM_REACTION_LAB');
  });
});

describe('mặt cầu Oxyz có tâm', () => {
  it('đọc tâm từ (x - a)^2 + (y - b)^2 + (z - c)^2 = R^2', () => {
    expect(parseSphereCenter('(x-1)^2+(y+2)^2+(z-3)^2=16')).toEqual([1, -2, 3]);
    expect(parseSphereCenter('(x - 1.5)^{2} + y^2 + z^2 = 4')).toEqual([1.5, 0, 0]);
    expect(parseSphereCenter('x^2+y^2+z^2=9')).toBeNull();
    const bp = matchInstantStemBlueprint('(x-1)^{2}+(y+2)^{2}+(z-3)^{2}=16')!;
    expect(bp.templateId).toBe('MATH_3D_OXYZ');
    expect(bp.meta).toMatchObject({cx: 1, cy: -2, cz: 3, radius: 4});
  });

  it('widget đặt thanh trượt tâm và bán kính đúng với đề', () => {
    const bp = matchInstantStemBlueprint('(x-1)^2+(y+2)^2+(z-3)^2=25')!;
    const {container} = render(<SimulationWidget blueprint={bp} />);
    const val = (id: string) => Number((container.querySelector(`[data-testid="${id}"]`) as HTMLInputElement).value);
    expect([val('ox-center-0'), val('ox-center-1'), val('ox-center-2')]).toEqual([1, -2, 3]);
    expect(val('ox-r')).toBe(5);
  });
});
