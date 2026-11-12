import {condensateFraction, criticalT} from './bec';
import {no2} from './thptChemBio';
import type {Values} from './types';

/**
 * Cửa sổ vi mô (kính hiển vi ảo): biến các đại lượng vĩ mô của bài thành số HẠT minh họa. Logic thuần.
 * Chỉ minh họa tỉ lệ số lượng và chuyển động nhiệt, không đúng kích thước hay khoảng cách thật.
 */
export interface MicroGroup {
  id: string;
  label: string;
  color: string;
  /** số hạt (hoặc số cặp hạt khi `bond` = 2) đang vẽ */
  n: number;
  /** 2 = phân tử gồm hai nguyên tử nối với nhau */
  bond?: 2;
  /** đứng yên và dồn vào giữa (đám ngưng tụ) */
  still?: boolean;
}
export interface MicroView {
  title: string;
  groups: MicroGroup[];
  /** hệ số tốc độ chuyển động nhiệt, 0–1 */
  heat: number;
  note: string;
}

const UNITS = 40; // số "đơn vị N₂O₄" vẽ trong ống
const PER_MMOL = 30; // số ion vẽ cho mỗi mmol

export function microView(id: string, v: Values): MicroView | null {
  if (id === 'no2') {
    const q = no2(v.T, v.P);
    const split = Math.round(UNITS * q.alpha);
    return {
      title: 'NO₂ ⇌ N₂O₄',
      heat: Math.min(1, Math.sqrt((v.T + 273.15) / 373.15)),
      groups: [
        {id: 'mono', label: 'NO₂ (nâu)', color: '#C9621C', n: 2 * split},
        {id: 'dimer', label: 'N₂O₄ (không màu)', color: '#D9D4C7', n: UNITS - split, bond: 2},
      ],
      note: 'Số nguyên tử N và O không đổi: mỗi N₂O₄ tách thành hai NO₂ và ngược lại.',
    };
  }
  if (id === 'titration') {
    const base = v.V * v.cb;
    const mmol = (x: number) => Math.round(Math.max(0, x) * PER_MMOL);
    return {
      title: 'Các ion trong cốc',
      heat: 0.4,
      groups: [
        {id: 'h', label: 'H⁺', color: '#D9481C', n: mmol(2 - base)},
        {id: 'oh', label: 'OH⁻', color: '#2459C9', n: mmol(base - 2)},
        {id: 'na', label: 'Na⁺', color: '#9AA0B5', n: mmol(base)},
        {id: 'cl', label: 'Cl⁻', color: '#2E9B57', n: mmol(2)},
      ],
      note: 'Mỗi giọt NaOH thêm một lượng OH⁻ làm mất đúng bấy nhiêu H⁺ (tạo nước). Gần điểm tương đương H⁺ gần cạn nên pH nhảy vọt.',
    };
  }
  if (id === 'bec') {
    const f0 = condensateFraction(v.T, criticalT(v.N, v.f));
    const cond = Math.round(60 * f0);
    return {
      title: 'Nguyên tử trong bẫy',
      heat: Math.min(1, Math.sqrt(v.T / 1000) * 1.4),
      groups: [
        {id: 'cond', label: 'đã ngưng tụ', color: '#FFB35C', n: cond, still: true},
        {id: 'th', label: 'đám nhiệt', color: '#7F8FE8', n: 60 - cond},
      ],
      note: 'Dưới nhiệt độ tới hạn, ngày càng nhiều nguyên tử cùng dồn vào trạng thái cơ bản và đứng yên như một sóng vật chất.',
    };
  }
  return null;
}
