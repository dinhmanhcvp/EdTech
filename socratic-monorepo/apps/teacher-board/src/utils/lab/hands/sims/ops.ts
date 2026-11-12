import type {SimSpec} from './types';

/**
 * Thao tác trực tiếp thay cho thanh trượt (nhóm Vật lí): tham số rời rạc là BỘ PHẬN để chọn (chạm vào quả cân, tấm catot, ống, lá kim loại…),
 * tham số liên tục là NÚM XOAY (xoay tay quanh núm). Tham số không khai báo ở `picks` tự thành núm xoay.
 */
export interface PickOption {
  label: string;
  value: number;
  color: string;
}
export interface PickDef {
  id: string;
  title: string;
  options: PickOption[];
}
/** nút bấm thật trên bàn: mỗi lần bấm tăng bộ đếm `live.events[id]`, cảnh đọc để làm việc tương ứng */
export interface ActionDef {
  id: string;
  label: string;
  color: string;
}
export interface OpsDef {
  picks: PickDef[];
  actions?: ActionDef[];
}

const opt = (label: string, value: number, color: string): PickOption => ({label, value, color});
const WEIGHTS = (id: string, title: string): PickDef => ({id, title: `${title} (g)`, options: [0.1, 0.2, 0.3, 0.4, 0.5].map((m) => opt(`${m * 1000}`, m, '#8A93A6'))});

export const OPS: Record<string, OpsDef> = {
  collision: {
    picks: [
      WEIGHTS('m1', 'Quả cân trên xe 1'),
      WEIGHTS('m2', 'Quả cân trên xe 2'),
      {id: 'e', title: 'Đệm va chạm', options: [opt('Đất sét', 0, '#B5835A'), opt('Cao su', 0.5, '#2459C9'), opt('Lò xo thép', 1, '#B9BEC5')]},
    ],
    // xe đứng ở vạch xuất phát cho tới khi thả: có thời gian đặt quả cân và gắn đệm
    actions: [{id: 'start', label: 'Thả xe', color: '#2E9B57'}, {id: 'stop', label: 'Đưa xe về vạch', color: '#C4261A'}],
  },
  eddy: {
    picks: [
      {id: 'sigma', title: 'Vật liệu ống', options: [opt('Chì', 4.8, '#5B6270'), opt('Thép', 7, '#8A93A6'), opt('Nhôm', 35, '#C9CED6'), opt('Đồng', 59, '#C8722A')]},
      {id: 'w', title: 'Bề dày thành (mm)', options: [0.5, 1, 2, 3, 5].map((w) => opt(`${w}`, w, '#8A93A6'))},
      {id: 'slit', title: 'Rãnh xẻ dọc', options: [opt('Nguyên', 0, '#C9CED6'), opt('Xẻ nửa', 50, '#E3B341'), opt('Xẻ hết', 100, '#D9481C')]},
    ],
  },
  photo: {
    picks: [
      {id: 'f', title: 'Đèn chiếu', options: [opt('Đỏ', 4.3, '#E5392B'), opt('Vàng', 5.2, '#E3B341'), opt('Lục', 5.7, '#2E9B57'), opt('Lam', 6.5, '#2459C9'), opt('Tím', 7.5, '#6B4BC8'), opt('UV', 10, '#C2184A')]},
      {id: 'A', title: 'Tấm catot', options: [opt('Cs', 1.95, '#E3B341'), opt('K', 2.3, '#B9BEC5'), opt('Na', 2.75, '#C9CED6'), opt('Zn', 4.3, '#8A93A6'), opt('Cu', 4.7, '#C8722A')]},
    ],
  },
  rutherford: {picks: [{id: 'Z', title: 'Lá kim loại', options: [opt('Al', 13, '#C9CED6'), opt('Fe', 26, '#8A93A6'), opt('Ag', 47, '#DADDE2'), opt('Au', 79, '#E3B341'), opt('Pb', 82, '#5B6270')]}]},
  shock: {picks: [{id: 'deg', title: 'Mũi nêm', options: [5, 10, 15, 25, 35, 45].map((d) => opt(`${d}°`, d, '#8A93A6'))}]},
  matterwave: {picks: [{id: 'm', title: 'Phân tử', options: [opt('C₆₀', 720, '#2F6FD0'), opt('C₇₀', 840, '#C2184A'), opt('C₈₄', 1008, '#2E9B57')]}]},
  gel: {picks: [{id: 'agar', title: 'Gel agarose (%)', options: [0.7, 1, 1.5, 2].map((a) => opt(`${a}`, a, '#2E9B57'))}]},
  morgan: {picks: [{id: 'n', title: 'Số ruồi con đếm', options: [20, 100, 500, 1000, 2000, 5000].map((n) => opt(`${n}`, n, '#C2184A'))}]},
  differential: {
    picks: [
      {id: 'mu', title: 'Mặt đường dưới bánh trái', options: [opt('Bùn', 0.1, '#7A5C3A'), opt('Sỏi', 0.35, '#A9A18F'), opt('Nhựa khô', 0.8, '#4A4F5C')]},
      {id: 'lock', title: 'Vi sai', options: [opt('Mở', 0, '#2E9B57'), opt('Khoá', 1, '#D9481C')]},
    ],
  },
  pid: {picks: [], actions: [{id: 'push', label: 'Đẩy xe', color: '#D9481C'}]},
  turbine: {picks: [], actions: [{id: 'start', label: 'Khởi động', color: '#2E9B57'}, {id: 'stop', label: 'Tắt máy', color: '#C4261A'}]},
  foc: {picks: [], actions: [{id: 'start', label: 'Đóng contactor', color: '#2E9B57'}, {id: 'stop', label: 'Cắt nguồn', color: '#C4261A'}]},
  stirling: {picks: [{id: 'gas', title: 'Khí công tác', options: [opt('Không khí', 1, '#9AA3C7'), opt('N₂', 2, '#2459C9'), opt('He', 3, '#E3B341'), opt('H₂', 4, '#D9481C')]}]},
  harmonic: {picks: [{id: 'zf', title: 'Bánh mềm (số răng)', options: [120, 160, 200, 240, 300].map((z) => opt(`${z}`, z, '#8A93A6'))}]},
  fatigue: {
    picks: [
      {id: 'alloy', title: 'Vật liệu', options: [opt('Nhôm', 1, '#C9CED6'), opt('Thép', 2, '#8A93A6'), opt('Titan', 3, '#6B7380')]},
      {id: 'a0', title: 'Vết nứt ban đầu (mm)', options: [0.5, 1, 2, 3, 5].map((a) => opt(`${a}`, a, '#C4261A'))},
    ],
  },
  quadruped: {picks: [{id: 'mu', title: 'Mặt sàn', options: [opt('Băng', 0.05, '#7FD4FF'), opt('Ướt', 0.3, '#2459C9'), opt('Gỗ', 0.5, '#7A5C3A'), opt('Nhám', 0.9, '#4A4F5C')]}], actions: [{id: 'kick', label: 'Đạp!', color: '#D9481C'}]},
  surgery: {picks: [{id: 'delay', title: 'Đường truyền', options: [opt('Cáp quang', 20, '#2E9B57'), opt('Wi-Fi', 60, '#2459C9'), opt('4G', 120, '#E3B341'), opt('Vệ tinh', 200, '#C4261A')]}]},
  slam: {
    picks: [
      {id: 'closure', title: 'Đóng vòng lặp', options: [opt('Tắt', 0, '#8A93A6'), opt('Bật', 1, '#2E9B57')]},
      {id: 'drift', title: 'Cảm biến bánh xe', options: [opt('Tốt', 0.5, '#2E9B57'), opt('Khá', 1.5, '#E3B341'), opt('Kém', 3, '#D9481C'), opt('Rất kém', 5, '#C4261A')]},
    ],
  },
  thomson: {picks: []},
  ligo: {picks: []},
  bec: {picks: []},
};

/** giá trị của tham số rời rạc gần nhất với `x` trong `pick` */
export const nearestOption = (pick: PickDef, x: number): number => pick.options.reduce((best, o, i) => (Math.abs(o.value - x) < Math.abs(pick.options[best].value - x) ? i : best), 0);
/** tham số nào là núm xoay: mọi tham số không phải bộ phận chọn */
export const knobParams = (spec: SimSpec, ops: OpsDef) => spec.params.filter((p) => !ops.picks.some((k) => k.id === p.id));
