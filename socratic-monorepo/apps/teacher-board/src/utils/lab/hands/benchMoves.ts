import {BIO_BY_ID} from '../bio/experiments';
import {PHYS_BY_ID} from '../phys/experiments';
import type {PhysExperiment} from '../phys/types';
import type {Manual} from './manual';
import {isToggle} from './benchPick';
import {connect, place, press, pour, squeeze, stir, turn, type BenchAct} from './benchActs';

/**
 * Phần động của bộ dụng cụ Blender (`tools/lab-models/bench_parts.py` → `bench-phys.glb`, `bench-bio.glb`) trong các bài thực hành SGK:
 * nút `Mov_<MÃ BÀI>_<n>` dịch (x, y, z), co giãn dọc (sy) hoặc phóng to đều (s) theo một thanh trượt, tuyến tính từ `a` (thanh trượt ở min) tới `b` (ở max).
 * Phép dịch tính từ gốc của nút (chốt treo, điểm tựa) như trong tệp GLB.
 */
export interface BenchMove {
  n: number;
  param: string;
  /** `rz`: núm vặn quay quanh trục hướng về người nhìn (rad); kéo ngang để vặn */
  axis: 'x' | 'y' | 'z' | 'sy' | 's' | 'rz';
  a: number;
  b: number;
  /** tên bộ phận để học sinh CẦM và kéo trực tiếp (chụm vào rồi di chuyển); bỏ trống = bộ phận chỉ chạy theo, không cầm được */
  what?: string;
}
const mv = (n: number, param: string, axis: BenchMove['axis'], a: number, b: number, what?: string): BenchMove => ({n, param, axis, a, b, what});

/** Kéo bộ phận một quãng `d` (đơn vị cảnh, đã chia tỉ lệ phóng) từ lúc cầm (`startT` ∈ 0..1 của thanh trượt) → `t` mới. Bộ phận chỉ phóng to/co: 2,2 đơn vị = cả thang. */
export function dragT(m: BenchMove, startT: number, d: number): number {
  const dt = m.axis === 's' || m.axis === 'sy' || m.axis === 'rz' ? d / 2.2 : d / (m.b - m.a);
  return Math.min(1, Math.max(0, startT + dt));
}
export const BENCH_MOVES: Record<string, BenchMove[]> = {
  SPEED: [mv(1, 's', 'x', -0.6, 2.2, 'cổng quang thứ hai')],
  // núm vặn thật trên máy (kéo ngang sang phải = vặn theo chiều kim đồng hồ = tăng)
  STANDING_WAVE: [mv(9, 'L', 'x', -0.38, 1.9, 'cầu chặn dây')], // dây dao động từ máy phát (x = −1,9) tới cầu: 3,8 đơn vị = 1 m
  OHM_LAW: [mv(9, 'U', 'rz', 2.3, -2.3, 'núm chỉnh điện áp của bộ nguồn')],
  TRANSFORMER: [mv(9, 'U1', 'rz', 2.3, -2.3, 'núm chỉnh điện áp của bộ nguồn')],
  WAVE_INTERFERENCE: [mv(9, 'f', 'rz', 2.3, -2.3, 'núm tần số của cần rung')],
  SOUND_FREQUENCY: [mv(9, 'td', 'rz', 2.3, -2.3, 'núm thang thời gian của dao động kí')], // cổng quang thứ hai
  FREE_FALL_G: [mv(1, 'h', 'y', 1.55, 0.45, 'cổng quang')], // cổng quang hạ thấp khi quãng rơi dài hơn
  EMF_INTERNAL_R: [mv(1, 'R', 'x', 1.15, 2.3, 'con chạy biến trở')], // con chạy biến trở
  NEWTON2: [mv(1, 'F', 's', 0.6, 1.4, 'quả cân treo')], // quả cân treo
  FRICTION: [mv(1, 'm', 's', 0.6, 1.5, 'quả cân trên khối gỗ')], // quả cân đặt trên khối gỗ
  HOOKE: [mv(1, 'm', 'sy', 1, 1.9), mv(2, 'm', 'y', 0, -0.648, 'quả cân treo')], // lò xo dãn, quả cân hạ theo (lò xo dài 0,72)
  PENDULUM_G: [mv(1, 'l', 'sy', 0.6, 1.9), mv(2, 'l', 'y', 0.4, -0.9, 'quả nặng')], // dây dài 1,0 ở tỉ lệ 1
  BOYLE: [mv(1, 'V', 'y', 0.5, 1.3, 'pit-tông')], // pit-tông
  CHARLES: [mv(1, 'T', 'x', 0.5, 1.3, 'pit-tông')], // pit-tông bị khí nóng đẩy ra
  EM_INDUCTION: [mv(1, 'v', 'x', 0.9, -0.2, 'nam châm')], // nam châm đưa vào lòng cuộn dây
  LEVER_MOMENT: [mv(1, 'd1', 'x', -0.4, -1.6, 'quả cân bên trái')], // quả cân trái: mỗi lỗ 10 cm
  PROJECTILE_HORIZONTAL: [mv(1, 'h', 'y', 0.5, 1.5, 'bệ máng ném')], // bệ máng ném
  ENZYME: [mv(9, 'pH', 'x', 0, 1.0, 'cần chọn pH dung dịch đệm'), mv(1, 'T', 'x', -1.1, -0.2, 'cần gạt nhiệt độ bể')],
  YOGURT: [mv(9, 't', 'x', 0, 1.0, 'cần thời gian ủ'), mv(1, 'T', 'x', -0.14, 0.34, 'cần gạt nhiệt độ ủ')],
  SEED_RESPIRATION: [mv(1, 'T', 'x', -1.55, -0.45, 'cần gạt nhiệt độ bể')],
  CELL_OBSERVE: [mv(1, 'focus', 'y', 0.44, 0.56, 'bàn kính')], // bàn kính
  TRANSPIRATION: [mv(1, 'L', 'x', 2.2, 0.6, 'đèn')], // đèn lại gần cây
  TREE_AGE: [mv(1, 'D', 's', 0.4, 1.5, 'lát cắt thân cây')], // lát cắt thân cây
  PLASMOLYSIS: [mv(9, 't', 'x', 0, 1.0, 'cần thời gian ngâm tiêu bản')],
  VIRUS_SURVEY: [mv(9, 'n', 'x', 0, 1.0, 'cần số phiếu khảo sát')],
  PIGMENT: [mv(9, 'ds', 'x', 0, 1.0, 'cần quãng chạy của dung môi')],
  LEAF_STARCH: [mv(9, 'h', 'x', 0, 1.0, 'cần số giờ chiếu sáng')],
  TROPISM: [mv(9, 'd', 'x', 0, 1.0, 'cần số ngày nuôi')],
  APICAL_DOMINANCE: [mv(9, 'd', 'x', 0, 1.0, 'cần số ngày sau khi bấm ngọn')],
  METAMORPHOSIS: [mv(9, 'd', 'x', 0, 1.0, 'cần số ngày nuôi')],
  PROPAGATION: [mv(9, 'd', 'x', 0, 1.0, 'cần số ngày giâm cành')],
  DNA_EXTRACT: [mv(9, 'mass', 'x', 0, 1.0, 'cần khối lượng mẫu')],
  MODIFICATION: [mv(9, 'N', 'x', 0, 1.0, 'cần liều phân đạm')],
  MINI_ECOSYSTEM: [mv(1, 'pl', 's', 0.2, 1.3, 'cây thủy sinh'), mv(9, 'fi', 'x', 0, 1.0, 'cần số cá thả vào bể'), mv(8, 'L', 'x', 0, 1.0, 'cần số giờ chiếu sáng')], // cây thủy sinh
};

/**
 * KÉO–THẢ vật chuyển động để làm thí nghiệm (thay cho "giữ chụm"): chụm vào vật `n`, kéo lệch theo hướng `dir` (hệ bộ dụng cụ, đã chuẩn hoá) tới `max`,
 * thả ra ≥ 0,2 thì thí nghiệm chạy (xe lao đi, trụ thép rơi, bi lăn, khối gỗ bị kéo…). Vật dịch theo tay khi đang kéo rồi bật về chỗ cũ.
 */
export interface BenchPull {
  n: number;
  dir: [number, number, number];
  max: number;
  what: string;
}
export const BENCH_PULL: Record<string, BenchPull> = {
  SPEED: {n: 2, dir: [-1, 0, 0], max: 0.8, what: 'xe lăn: kéo lùi rồi thả cho xe lao qua hai cổng quang'},
  NEWTON2: {n: 2, dir: [-1, 0, 0], max: 0.8, what: 'xe lăn: kéo lùi rồi thả cho quả cân kéo xe đi'},
  FREE_FALL_G: {n: 2, dir: [0, -1, 0], max: 0.45, what: 'trụ thép: kéo xuống khỏi nam châm rồi thả để rơi'},
  PROJECTILE_HORIZONTAL: {n: 2, dir: [-1, 0, 0], max: 0.5, what: 'viên bi: kéo lùi lên máng rồi thả cho bi lăn xuống'},
  FRICTION: {n: 2, dir: [1, 0, 0], max: 0.7, what: 'khối gỗ: kéo ra theo lực kế rồi thả'},
  // Sinh
  BIOMOLECULES: {n: 1, dir: [-1, 0, 0], max: 0.9, what: 'ống nhỏ giọt: kéo sang miệng ống mẫu rồi thả để nhỏ thuốc thử'},
  QUADRAT: {n: 1, dir: [1, 0, 0], max: 1.0, what: 'khung ô 1 m × 1 m: kéo sang vị trí mới rồi thả để đặt khung'},
  COMMUNITY: {n: 1, dir: [1, 0, 0], max: 1.0, what: 'khung ô tiêu chuẩn: kéo sang vị trí mới rồi thả để đặt khung'},
};

/** Bài điện / có nguồn: thao tác LÀM là đóng KHÓA DAO (lưỡi đồng quay mở → đóng); bài khác không có vật kéo được thì gạt CẦN TRƯỢT trên ray. */
export const BENCH_KNIFE = new Set(['OHM_LAW', 'EMF_INTERNAL_R', 'CAPACITOR_RC', 'TRANSFORMER', 'SPECIFIC_HEAT', 'WAVE_INTERFERENCE', 'STANDING_WAVE', 'SOUND_FREQUENCY']);

/**
 * Thao tác LÀM thí nghiệm của từng bài: học sinh chạm (chụm) vào chính dụng cụ để thực hiện, thí nghiệm chạy rồi số đo mới được ghi vào bảng.
 * Bài không có trong bảng (vd. quy tắc an toàn) không có phép đo.
 */
export const BENCH_ACTION: Record<string, string> = {
  ERROR_MEASURE: 'Kẹp thước, đo thanh',
  SPEED: 'Thả xe qua hai cổng quang',
  FREE_FALL_G: 'Ngắt nam châm, thả trụ thép',
  FORCE_COMPOSITION: 'Kéo ba lực kế, đọc số',
  SOUND_FREQUENCY: 'Gõ âm thoa',
  SOUND_SPEED: 'Kéo pit-tông tìm cộng hưởng',
  EMF_INTERNAL_R: 'Đóng khóa K, đọc U và I',
  NEWTON2: 'Thả xe',
  FRICTION: 'Kéo đều khối gỗ',
  HOOKE: 'Treo quả cân, đọc độ dãn',
  PENDULUM_G: 'Thả con lắc, bấm giờ 20 dao động',
  BOYLE: 'Giữ pit-tông, đọc áp kế',
  OHM_LAW: 'Đóng mạch, đọc I',
  SPECIFIC_HEAT: 'Bật điện trở nung',
  CHARLES: 'Đợi cân bằng nhiệt, đọc thể tích',
  EM_INDUCTION: 'Đưa nam châm vào cuộn dây',
  WAVE_INTERFERENCE: 'Bật cần rung',
  STANDING_WAVE: 'Bật máy phát, chỉnh ra sóng dừng',
  CAPACITOR_RC: 'Đóng khóa nạp tụ',
  LATENT_HEAT_FUSION: 'Thả nước đá vào nhiệt lượng kế',
  LEVER_MOMENT: 'Dịch quả cân phải tới khi thăng bằng',
  PROJECTILE_HORIZONTAL: 'Thả bi trên máng',
  TRANSFORMER: 'Đóng nguồn, đọc U₂',
  BIOMOLECULES: 'Nhỏ thuốc thử vào ống',
  CELL_OBSERVE: 'Nhìn vào thị kính, đo tế bào',
  PLASMOLYSIS: 'Nhỏ dung dịch lên tiêu bản',
  ENZYME: 'Trộn enzyme, bấm giờ',
  MITOSIS_SLIDE: 'Đếm tế bào trong thị trường',
  YOGURT: 'Đo pH hũ sữa',
  VIRUS_SURVEY: 'Phát phiếu khảo sát',
  TRANSPIRATION: 'Cân chậu cây sau 1 giờ',
  PIGMENT: 'Nhúng giấy vào dung môi',
  LEAF_STARCH: 'Nhỏ iodine lên lá',
  SEED_RESPIRATION: 'Dẫn khí qua nước vôi, đọc CO₂',
  CIRCULATION: 'Bóp bóng đo huyết áp, đếm mạch',
  TROPISM: 'Đo góc uốn của cây mầm',
  APICAL_DOMINANCE: 'Đếm cành bên, đo chiều cao',
  TREE_AGE: 'Đếm vòng gỗ',
  METAMORPHOSIS: 'Quan sát, đo chiều dài',
  PROPAGATION: 'Đếm cành sống',
  DNA_EXTRACT: 'Rót cồn, vớt DNA',
  CHROMOSOME_MUTATION: 'Đếm nhiễm sắc thể',
  MODIFICATION: 'Thu hoạch, cân năng suất',
  QUADRAT: 'Đặt khung, đếm cá thể',
  COMMUNITY: 'Đặt khung, đếm từng loài',
  MINI_ECOSYSTEM: 'Đo oxygen sau 7 ngày',
};

/**
 * LỰA CHỌN trên chính dụng cụ: mỗi lựa chọn của bài (mẫu, thuốc thử, dung dịch, giống…) gắn với MỘT dụng cụ thật trên bàn;
 * chạm vào dụng cụ đó (vòng vàng nhỏ) là đổi sang lựa chọn kế tiếp, nhãn ngay trên dụng cụ ghi lựa chọn hiện tại.
 * Toạ độ theo hệ của bộ dụng cụ Blender (`tools/lab-models/bench_parts.py`).
 */
export const BENCH_PICK: Record<string, Record<string, [number, number, number]>> = {
  // Vật lí: chọn dụng cụ ngay trên bàn (âm thoa, mặt phẳng, lò xo, điện trở, cuộn dây…)
  ERROR_MEASURE: {inst: [-0.2, 0.2, 0.45]},
  SOUND_FREQUENCY: {fork: [-1.8, 0.7, 0]},
  SOUND_SPEED: {f: [-1.9, 0.7, 0]},
  FRICTION: {surf: [-1.25, 0.16, 0.95]},
  HOOKE: {spring: [0.3, 1.75, -0.2]},
  OHM_LAW: {res: [-0.4, 0.3, 0.72]},
  CAPACITOR_RC: {R: [-0.2, 0.22, 0.3]},
  EM_INDUCTION: {N: [-0.6, 0.95, 0]},
  TRANSFORMER: {ratio: [-0.5, 1.0, 0]},
  BIOMOLECULES: {sample: [-1.5, 0.62, 0], reagent: [0.45, 0.55, 0.5]},
  CELL_OBSERVE: {sample: [0.6, 0.12, 0.5], obj: [-0.6, 0.95, 0.05]},
  PLASMOLYSIS: {sol: [1.45, 0.4, -0.3]},
  ENZYME: {inh: [1.85, 0.4, -0.3]},
  MITOSIS_SLIDE: {sample: [0.2, 0.6, -0.3], stain: [1.0, 0.4, -0.3]},
  YOGURT: {st: [-1.0, 0.55, 0]},
  VIRUS_SURVEY: {d: [-1.2, 0.45, 0.4]},
  TRANSPIRATION: {c: [1.9, 0.3, 0.5]},
  PIGMENT: {b: [-0.6, 0.35, -0.4]},
  LEAF_STARCH: {dark: [-1.62, 1.05, 0.05], leaf: [1.7, 0.15, 0.4]},
  SEED_RESPIRATION: {g: [-1.0, 0.6, 0]},
  CIRCULATION: {st: [-0.9, 0.5, 0]},
  TROPISM: {ty: [-0.5, 1.0, -0.4], grp: [-1.9, 0.55, 0]},
  APICAL_DOMINANCE: {cut: [0.7, 1.0, 0]},
  METAMORPHOSIS: {sp: [-1.4, 0.55, 0]},
  PROPAGATION: {m: [-1.8, 0.45, 0.3], tr: [1.2, 0.35, -0.3]},
  DNA_EXTRACT: {grind: [-2.2, 0.4, 0.2], lysis: [2.6, 0.35, -0.3], filter: [-0.45, 0.95, -0.3], eth: [0.7, 0.35, 0.2]},
  CHROMOSOME_MUTATION: {sl: [-0.2, 0.2, 0.5]},
  MODIFICATION: {g: [0.9, 0.55, -0.2]},
  QUADRAT: {site: [-0.6, 0.25, 0.85]},
  COMMUNITY: {site: [-0.6, 0.25, 0.85]},
};

/**
 * CHUẨN BỊ thí nghiệm: các thao tác làm MỘT lần, theo thứ tự, trên chính dụng cụ (đặt, nối, treo, nhúng…) trước khi thao tác đo (`BENCH_ACTION`) chạy.
 * Mỗi bước là một vòng cam trên dụng cụ; chạm vào vòng thì sang bước kế. Toạ độ theo hệ của bộ dụng cụ Blender (`tools/lab-models/bench_parts.py`).
 */
export interface BenchStep {
  label: string;
  at: [number, number, number];
  /** thao tác thật với vật thật (đặt, rót, khuấy, bóp bóng); bỏ trống = kéo cục cam vào vòng cam */
  act?: BenchAct;
}
const sp = (label: string, x: number, y: number, z: number): BenchStep => ({label, at: [x, y, z]});
export const BENCH_SETUP: Record<string, BenchStep[]> = {
  ERROR_MEASURE: [sp('Đặt thanh kim loại lên thước', 0, 0.3, -0.3), sp('Khép hàm thước kẹp vào thanh', -0.4, 0.3, 0.55)],
  SPEED: [sp('Đặt xe vào vạch xuất phát', -2.0, 0.55, 0), sp('Đặt cổng quang thứ hai đúng vạch', -0.1, 0.9, 0.3)],
  FREE_FALL_G: [sp('Gắn trụ thép vào nam châm điện', 0, 1.95, -0.2), sp('Đưa cổng quang về đúng độ cao', 0, 0.9, 0.1)],
  FORCE_COMPOSITION: [sp('Móc ba lực kế vào vòng nhẫn', 0, 1.0, -0.3), sp('Đặt thước đo góc lên bảng từ', 0, 0.75, -0.3)],
  SOUND_FREQUENCY: [sp('Đặt micro sát âm thoa', -0.75, 0.65, 0), sp('Bật dao động kí', 1.85, 0.7, 0.2)],
  SOUND_SPEED: [sp('Bật loa phát tần số', -1.9, 0.75, 0), sp('Đặt thước đo dọc ống', 0.2, 0.15, 0.45)],
  EMF_INTERNAL_R: [sp('Nối pin – biến trở – ampe kế', -1.1, 0.7, -0.4), sp('Nối vôn kế song song với pin', 0.2, 0.7, -0.4)],
  NEWTON2: [sp('Đặt xe lên đường ray', -1.6, 1.15, 0), sp('Buộc dây qua ròng rọc, treo quả cân', 2.3, 1.3, 0)],
  FRICTION: [sp('Đặt khối gỗ lên mặt phẳng', -0.8, 0.55, 0), sp('Móc lực kế vào khối gỗ', 0.75, 0.35, 0)],
  HOOKE: [sp('Treo lò xo lên giá', 0, 2.15, -0.2), sp('Đặt thước sát lò xo, chỉnh số 0', 0.3, 1.5, -0.2)],
  PENDULUM_G: [sp('Treo quả nặng vào đầu dây', 0, 2.3, -0.2), sp('Chuẩn bị đồng hồ bấm giây', 1.5, 0.35, 0.5)],
  BOYLE: [sp('Lắp xi lanh khít với áp kế', 0.7, 0.45, 0), sp('Đưa pit-tông về vạch 40 mL', 0, 1.2, 0)],
  OHM_LAW: [sp('Mắc điện trở nối tiếp ampe kế', -0.3, 0.35, 0.5), sp('Mắc vôn kế song song với điện trở', 1.2, 0.7, -0.4)],
  SPECIFIC_HEAT: [sp('Đổ nước vào nhiệt lượng kế, cân', -0.4, 0.7, 0), sp('Cắm điện trở nung vào nguồn', -1.3, 0.6, 0.1)],
  CHARLES: [sp('Nhúng bình khí vào cốc nước', -1.4, 0.7, 0.2), sp('Đặt nhiệt kế vào cốc', -1.6, 1.0, 0.1)],
  EM_INDUCTION: [sp('Nối cuộn dây với milivôn kế', 0.6, 0.45, 0.2), sp('Đặt nam châm sát miệng cuộn dây', 0.4, 0.55, 0)],
  WAVE_INTERFERENCE: [sp('Đổ nước vào khay', 0, 0.55, 0.4), sp('Nhúng hai mũi nhọn vào mặt nước', 0, 0.7, -0.3)],
  STANDING_WAVE: [sp('Nối dây với máy phát dao động', -1.9, 0.8, 0), sp('Vắt dây qua ròng rọc, treo quả cân', 2.12, 0.5, 0)],
  CAPACITOR_RC: [sp('Mắc tụ nối tiếp điện trở', -0.5, 0.35, 0.1), sp('Mắc vôn kế song song với tụ', 1.2, 0.7, -0.4)],
  LATENT_HEAT_FUSION: [sp('Cân nước ấm trong nhiệt lượng kế', -1.0, 0.7, 0), sp('Lau khô nước đá trên đĩa', 0.4, 0.3, 0.5)],
  LEVER_MOMENT: [sp('Vặn ốc cân bằng cho thanh nằm ngang', 1.75, 1.5, 0), sp('Treo quả cân bên phải', 1.2, 1.2, 0)],
  PROJECTILE_HORIZONTAL: [sp('Đặt giấy than lên tờ giấy trắng', 1.3, 0.1, 0), sp('Đặt bi ở đầu máng', -1.0, 0.75, 0)],
  TRANSFORMER: [sp('Mắc cuộn sơ cấp vào nguồn xoay chiều', -0.5, 0.95, 0.2), sp('Mắc vôn kế vào cuộn thứ cấp', 0.5, 0.95, 0.2)],
  BIOMOLECULES: [sp('Đặt ống mẫu thử vào giá', -1.5, 0.55, 0), sp('Đặt lọ thuốc thử cạnh ống', 0.62, 0.45, 0.5)],
  CELL_OBSERVE: [sp('Đặt tiêu bản lên bàn kính', -0.6, 0.55, 0.08), sp('Bật đèn, chỉnh gương', -0.6, 0.25, 0.08)],
  PLASMOLYSIS: [sp('Đặt tiêu bản lên bàn kính', -0.8, 0.55, 0.08), sp('Đậy lamen', -0.8, 0.6, 0.08)],
  ENZYME: [sp('Đặt giá ống vào bể ổn nhiệt', -0.9, 0.4, 0), sp('Cho hồ tinh bột và enzyme vào ống', -1.4, 0.65, 0)],
  MITOSIS_SLIDE: [sp('Nhuộm đầu rễ bằng orcein', 0.3, 0.3, 0.55), sp('Đặt tiêu bản lên bàn kính', -1.4, 0.55, 0.08)],
  YOGURT: [sp('Rót sữa vào hũ, thêm men cái', -1.0, 0.55, 0), sp('Đặt hũ vào thùng ủ ấm', -1.0, 0.4, 0)],
  VIRUS_SURVEY: [sp('Phát phiếu khảo sát', -1.6, 0.25, 0.3), sp('Thu phiếu về bàn tổng hợp', 0.7, 0.35, 0.2)],
  TRANSPIRATION: [sp('Bọc túi nilon quanh gốc chậu', -0.6, 0.5, 0), sp('Bật đèn chiếu', 1.7, 1.5, -0.2)],
  PIGMENT: [sp('Chấm dịch chiết lên giấy sắc kí', 0.8, 0.35, 0), sp('Đổ dung môi vào ống đong', 0.8, 0.2, 0)],
  LEAF_STARCH: [sp('Bọc giấy bạc lên một phần lá', -1.62, 0.95, 0.05), sp('Bật đèn chiếu sáng', -0.4, 1.5, -0.5)],
  SEED_RESPIRATION: [sp('Cho hạt vào bình, đậy nút', -1.5, 0.5, 0), sp('Nối ống dẫn khí tới nước vôi trong', 0.4, 1.15, 0.3)],
  CIRCULATION: [sp('Quấn vòng bít vào cánh tay', -1.3, 0.4, 0), sp('Bật máy đo huyết áp', 1.7, 0.6, 0)],
  TROPISM: [sp('Đặt cây mầm vào hộp', -1.9, 0.4, 0), sp('Bật nguồn kích thích (đèn / clinostat)', -1.0, 0.5, 0)],
  APICAL_DOMINANCE: [sp('Đánh dấu nhóm cây đối chứng', -1.3, 0.3, 0.35), sp('Cắt ngọn nhóm thí nghiệm', 0.7, 0.9, 0)],
  TREE_AGE: [sp('Đặt lát cắt dưới kính lúp', 1.6, 0.3, 0.2), sp('Đặt thước ngang lát cắt', 0, 0.2, 0.85)],
  METAMORPHOSIS: [sp('Đổ nước sạch vào bể nuôi', -1.4, 0.65, 0), sp('Đặt thước và kính lúp', 2.0, 0.3, 0.3)],
  PROPAGATION: [sp('Chuẩn bị cành, bầu giâm', -1.9, 0.45, 0.3), sp('Quét auxin lên cành', 1.2, 0.35, -0.3)],
  DNA_EXTRACT: [sp('Nghiền mẫu trong cối', -2.2, 0.35, 0.2), sp('Thêm nước rửa chén và muối', 2.6, 0.45, -0.3)],
  CHROMOSOME_MUTATION: [sp('Đặt tiêu bản lên bàn kính', -1.6, 0.55, 0.08), sp('Bật màn hình hiển thị', 1.6, 0.8, -0.3)],
  MODIFICATION: [sp('Cắm thẻ chia hai hàng giống A, B', -2.75, 0.3, 0.05), sp('Bón phân đạm đều các chậu', 0.9, 0.5, -0.2)],
  QUADRAT: [sp('Cắm cọc quanh khu vực', -1.7, 0.3, 0.85), sp('Đặt khung ô 1 m × 1 m', -0.6, 0.15, 0)],
  COMMUNITY: [sp('Cắm cọc quanh khu vực', -1.5, 0.3, 0.85), sp('Đặt khung ô tiêu chuẩn', -0.6, 0.15, 0)],
  MINI_ECOSYSTEM: [sp('Rải cát, trồng cây thủy sinh', -0.5, 0.2, 0.2), sp('Thả cá vào bể', -0.5, 0.6, -0.2), sp('Bật đèn bể', -0.5, 1.2, -0.2)],
};

/**
 * Bước chuẩn bị làm THẬT bằng vật thật (xem `benchActs.ts`): đặt lam kính lên bàn kính, đặt giá ống vào bể, rót, khuấy, bóp bóng…
 * Vật nằm sẵn ở mép bàn phía người nhìn (z = 1,6), gốc vật ở giữa đáy; `at` là chỗ đặt / miệng dụng cụ cần rót / tâm cối cần khuấy.
 * Chỉ thay bước tương ứng; các bước khác của bài giữ nguyên.
 */
const edge = (x: number): [number, number, number] => [Math.max(-2.8, Math.min(2.8, x)), 0, 1.6];
const WATER_C = '#8CC8F0';
const withAct = (id: string, i: number, step: BenchStep) => {
  const list = BENCH_SETUP[id];
  if (list) list[i] = step;
};
// Sinh: đặt tiêu bản lên bàn kính (lam kính thật), đậy lamen, đặt giá ống vào bể, rót, nghiền, bóp bóng bơm
withAct('CELL_OBSERVE', 0, place('Đặt tiêu bản lên bàn kính', 'slide', edge(0.2), [-0.6, 0.56, 0.08]));
withAct('PLASMOLYSIS', 0, place('Đặt tiêu bản lên bàn kính', 'slide', edge(0.0), [-0.8, 0.56, 0.08]));
withAct('PLASMOLYSIS', 1, place('Đậy lamen', 'cover', edge(0.6), [-0.78, 0.575, 0.08]));
withAct('MITOSIS_SLIDE', 1, place('Đặt tiêu bản lên bàn kính', 'slide', edge(-0.6), [-1.4, 0.56, 0.08]));
withAct('CHROMOSOME_MUTATION', 0, place('Đặt tiêu bản lên bàn kính', 'slide', edge(-0.8), [-1.6, 0.56, 0.08]));
withAct('ENZYME', 0, place('Đặt giá ống vào bể ổn nhiệt', 'rack', edge(-0.4), [-0.9, 0.4, 0], {rest: [-0.9, 0.2, 0]}));
withAct('ENZYME', 1, pour('Cho hồ tinh bột và enzyme vào ống', 'bottle', edge(-1.3), [-1.4, 0.65, 0], {color: '#EFE7D2'}));
withAct('YOGURT', 1, pour('Rót sữa vào hũ, thêm men cái', 'jug', edge(-1.4), [-1.0, 0.55, 0], {color: '#F6F1E4'}));
withAct('YOGURT', 0, place('Đặt hũ vào thùng ủ ấm', 'jar', edge(0.2), [-1.0, 0.4, 0], {rest: [-1.0, 0.09, 0]}));
withAct('DNA_EXTRACT', 0, stir('Nghiền mẫu trong cối', 'pestle', edge(-1.4), [-2.2, 0.35, 0.2], {n: 3}));
withAct('DNA_EXTRACT', 1, pour('Thêm nước rửa chén và muối', 'bottle', edge(2.2), [2.6, 0.45, -0.3], {color: '#BFE3F2'}));
withAct('PIGMENT', 1, pour('Đổ dung môi vào ống đong', 'bottle', edge(2.0), [0.8, 0.2, 0], {color: '#E3B341'}));
withAct('LEAF_STARCH', 0, place('Bọc giấy bạc lên một phần lá', 'foil', edge(-1.6), [-1.62, 0.95, 0.05], {rot: 0.4}));
withAct('TREE_AGE', 0, place('Đặt lát cắt dưới kính lúp', 'disc', edge(-0.4), [-1.6, 0.3, 0.5], {rest: [-1.6, 0.06, 0.5]}));
withAct('CIRCULATION', 1, squeeze('Bóp bóng bơm căng vòng bít', 'bulb', edge(-0.2), [-0.2, 0.3, 1.1], {n: 5}));
BENCH_SETUP.CIRCULATION.push(sp('Bật máy đo huyết áp', 1.7, 0.6, 0));
// Vật lí: rót nước vào nhiệt lượng kế / khay sóng, nhúng bình vào cốc
withAct('SPECIFIC_HEAT', 0, pour('Đổ nước vào nhiệt lượng kế, cân', 'jug', edge(-1.2), [-0.4, 0.7, 0], {color: WATER_C}));
withAct('LATENT_HEAT_FUSION', 0, pour('Cân nước ấm trong nhiệt lượng kế', 'jug', edge(-1.5), [-1.0, 0.7, 0], {color: WATER_C}));
withAct('WAVE_INTERFERENCE', 0, pour('Đổ nước vào khay', 'jug', edge(-1.2), [0, 0.55, 0.4], {color: WATER_C}));
withAct('CHARLES', 0, place('Nhúng bình khí vào cốc nước', 'flask', edge(-1.6), [-1.4, 0.7, 0], {rest: [-1.4, 0.24, 0]}));

// Vật lí: bước NỐI DÂY làm bằng phích cắm có dây. Mỗi dây có đầu CỐ ĐỊNH ở cực của thiết bị (`src`) và chốt cần cắm (`at`) đúng như mạch trong
// bộ dụng cụ Blender (`bench_parts.py` đã bỏ đúng những dây này khỏi hình tĩnh nên không bị trùng). Dây đỏ = cực dương, đen = cực âm, xanh = nhánh vôn kế.
type P3 = [number, number, number];
const RED_W = {color: '#C4261A', r: 0.014};
const BLK_W = {color: '#1D1B16', r: 0.014};
const BLU_W = {color: '#2459C9', r: 0.014};
const wireUp = (id: string, i: number, src: P3, to: P3, cable = RED_W, label?: string) => {
  const st = BENCH_SETUP[id]?.[i];
  if (!st) return;
  st.at = to;
  if (label) st.label = label;
  st.act = connect(st.label, 'plug', edge(to[0] + (to[0] < src[0] ? -0.6 : 0.6)), to, {src, cable}).act;
};
wireUp('EMF_INTERNAL_R', 0, [-2.32, 0.1, -0.6], [-1.1, 0.56, -0.5], RED_W, 'Nối khóa K tới cực (+) ampe kế');
wireUp('EMF_INTERNAL_R', 1, [2.45, 0.4, 0.3], [0, 0.56, -0.5], BLU_W, 'Nối biến trở tới vôn kế');
wireUp('OHM_LAW', 0, [-0.2, 0.14, 0.5], [0.5, 0.56, -0.4], RED_W, 'Mắc điện trở nối tiếp ampe kế');
wireUp('OHM_LAW', 1, [-0.6, 0.14, 0.5], [1.7, 0.56, -0.4], BLU_W, 'Mắc vôn kế song song với điện trở');
wireUp('CAPACITOR_RC', 0, [-0.38, 0.1, -0.25], [-0.4, 0.14, 0.3], RED_W, 'Mắc khóa K nối tiếp điện trở');
wireUp('CAPACITOR_RC', 1, [-0.8, 0.46, 0], [1.0, 0.56, -0.4], BLU_W, 'Mắc vôn kế song song với tụ');
wireUp('TRANSFORMER', 0, [-2.5, 0.12, 0.24], [-0.8, 0.5, 0.2], RED_W, 'Mắc cuộn sơ cấp vào nguồn xoay chiều');
wireUp('TRANSFORMER', 1, [0.8, 0.5, 0.2], [1.7, 0.56, -0.1], BLU_W, 'Mắc vôn kế vào cuộn thứ cấp');
wireUp('EM_INDUCTION', 0, [-0.9, 0.2, 0.3], [1.7, 0.56, -0.4], RED_W, 'Nối cuộn dây với milivôn kế');
wireUp('SPECIFIC_HEAT', 1, [-0.5, 0.62, 0], [-2.3, 0.12, 0.14], RED_W, 'Cắm điện trở nung vào cực (+) nguồn');
// sợi dây đàn hồi của bài sóng dừng: đầu kia đã vắt qua ròng rọc, học sinh buộc đầu này vào cần rung của máy phát
wireUp('STANDING_WAVE', 0, [2.0, 0.66, 0], [-1.9, 0.78, 0], {color: '#EDE7D6', r: 0.007}, 'Buộc dây vào cần rung của máy phát');
void BLK_W;

// Ống mềm: một đầu đã gắn vào thiết bị, học sinh cầm ĐẦU ỐNG còn lại cắm khít vào núm (áp kế ↔ xi lanh; nút bình hạt ↔ ống nước vôi)
const HOSE = {color: '#2B2C30', r: 0.03};
const SILICONE = {color: '#D9E6EC', r: 0.026, opacity: 0.55};
const hoseUp = (id: string, i: number, label: string, src: P3, to: P3, cable: {color: string; r: number; opacity?: number}) => {
  const list = BENCH_SETUP[id];
  if (!list) return;
  list[i] = connect(label, 'nozzle', edge(to[0] + (to[0] < src[0] ? -0.7 : 0.7)), to, {src, cable, verb: 'Cắm'});
};
hoseUp('BOYLE', 0, 'Cắm ống áp kế khít vào núm xi lanh', [1.05, 0.2, 0], [0.36, 0.2, 0], HOSE);
BENCH_SETUP.SEED_RESPIRATION.splice(2, 0, sp('', 0, 0, 0));
hoseUp('SEED_RESPIRATION', 1, 'Nối ống dẫn khí bình hạt sống → ống nước vôi 1', [-1.5, 0.98, 0], [1.0, 0.66, 0.3], SILICONE);
hoseUp('SEED_RESPIRATION', 2, 'Nối ống dẫn khí bình hạt luộc → ống nước vôi 2', [-0.5, 0.98, 0], [1.5, 0.66, 0.3], SILICONE);

// các bước "Bật máy / đèn": bấm công tắc thật trên chính thiết bị (giữ nhãn và chỗ `at`)
for (const [id, i] of [['SOUND_FREQUENCY', 1], ['SOUND_SPEED', 0], ['CELL_OBSERVE', 1], ['TRANSPIRATION', 1], ['LEAF_STARCH', 1], ['CIRCULATION', 2], ['CHROMOSOME_MUTATION', 1], ['PENDULUM_G', 1]] as const) {
  const st = BENCH_SETUP[id]?.[i];
  if (st) st.act = press(st.label, '', [0, 0, 0], st.at).act;
}

// Cơ học: cầm CHÍNH phần động của bộ dụng cụ (xe, cổng quang, quả cân, khối gỗ, bi, pit-tông, lò xo…) đặt vào chỗ của nó; không dựng thêm vật nên không trùng
const fit = (id: string, i: number, part: number) => {
  const st = BENCH_SETUP[id]?.[i];
  if (st) st.act = place(st.label, '', edge(st.at[0] + (st.at[0] < 0 ? 0.9 : -0.9)), st.at, {part}).act;
};
for (const [id, i, part] of [['SPEED', 0, 2], ['SPEED', 1, 1], ['NEWTON2', 0, 2], ['NEWTON2', 1, 1], ['FREE_FALL_G', 0, 2], ['FREE_FALL_G', 1, 1], ['FRICTION', 0, 2], ['HOOKE', 0, 1], ['PENDULUM_G', 0, 2], ['BOYLE', 1, 1], ['LEVER_MOMENT', 1, 3], ['PROJECTILE_HORIZONTAL', 1, 2], ['ERROR_MEASURE', 1, 1], ['EM_INDUCTION', 1, 1], ['QUADRAT', 1, 1], ['COMMUNITY', 1, 1]] as const) fit(id, i, part);

// Sinh thực vật và thí nghiệm "rót / quét / bón / phát phiếu": dùng lọ, hũ, tờ phiếu và vòng bít thật (bench-props.glb)
withAct('MITOSIS_SLIDE', 0, pour('Nhuộm đầu rễ bằng orcein', 'bottle', edge(0.9), [0.3, 0.3, 0.55], {color: '#C0392B', n: 1.4}));
withAct('PIGMENT', 0, pour('Chấm dịch chiết lên giấy sắc kí', 'bottle', edge(1.4), [0.8, 0.35, 0], {color: '#3F8F3A', n: 1.2}));
withAct('PROPAGATION', 1, pour('Quét auxin lên cành', 'bottle', edge(0.4), [1.2, 0.35, -0.3], {color: '#E3B341', n: 1.4}));
withAct('MODIFICATION', 1, pour('Bón phân đạm đều các chậu', 'jar', edge(0.2), [0.9, 0.5, -0.2], {color: '#DDE6EE'}));
withAct('MINI_ECOSYSTEM', 0, pour('Rải cát, trồng cây thủy sinh', 'jar', edge(-1.4), [-0.5, 0.2, 0.2], {color: '#D9C49A'}));
withAct('SEED_RESPIRATION', 0, pour('Cho hạt vào bình, đậy nút', 'jar', edge(-0.6), [-1.5, 0.5, 0], {color: '#C9A66A', n: 1.4}));
withAct('VIRUS_SURVEY', 0, place('Phát phiếu khảo sát', 'paper', edge(-0.7), [-1.6, 0.25, 0.3]));
withAct('VIRUS_SURVEY', 1, place('Thu phiếu về bàn tổng hợp', 'paper', edge(0.1), [0.7, 0.35, 0.2]));
withAct('CIRCULATION', 0, place('Quấn vòng bít vào cánh tay', 'cuff', edge(-0.4), [-1.3, 0.4, 0], {rest: [-1.3, 0.3, 0]}));

// Phần còn lại của danh sách "cục cam": vật đã có sẵn trong bộ dụng cụ nay là phần động riêng (bench_parts.py) để học sinh cầm CHÍNH nó đặt vào chỗ
for (const [id, i, part] of [
  ['ERROR_MEASURE', 0, 2], // thanh kim loại lên thước
  ['FORCE_COMPOSITION', 0, 1], // vòng nhẫn có ba lực kế lên chốt bảng từ
  ['FORCE_COMPOSITION', 1, 2], // thước đo góc
  ['SOUND_FREQUENCY', 0, 3], // micro
  ['SOUND_SPEED', 1, 1], // thước dọc ống
  ['FRICTION', 1, 4], // lực kế
  ['HOOKE', 1, 3], // thước đứng
  ['CHARLES', 1, 2], // nhiệt kế
  ['WAVE_INTERFERENCE', 1, 1], // thanh hai mũi nhọn
  ['STANDING_WAVE', 1, 1], // dây + quả cân
  ['PROJECTILE_HORIZONTAL', 0, 3], // giấy than
  ['BIOMOLECULES', 0, 3], // giá ống mẫu
  ['BIOMOLECULES', 1, 4], // bốn lọ thuốc thử
  ['TRANSPIRATION', 0, 2], // túi nilon
  ['APICAL_DOMINANCE', 1, 3], // kéo
  ['TREE_AGE', 1, 2], // thước
  ['METAMORPHOSIS', 1, 2], // kính lúp + thước
  ['PROPAGATION', 0, 1], // bầu giâm có cành
] as const) fit(id, i, part);
withAct('LATENT_HEAT_FUSION', 1, stir('Lau khô nước đá trên đĩa', 'towel', edge(1.3), [0.45, 0.12, 0.5], {n: 2, verb: 'Lau'}));
withAct('TROPISM', 0, place('Đặt cây mầm vào hộp', 'pot', edge(-1.0), [-1.9, 0.4, 0], {rest: [-1.9, 0.03, 0]}));
withAct('APICAL_DOMINANCE', 0, place('Cắm thẻ đánh dấu nhóm cây đối chứng', 'card', edge(-0.6), [-1.3, 0.3, 0.35], {rest: [-1.3, 0, 0.35]}));
withAct('MODIFICATION', 0, place('Cắm thẻ chia hai hàng giống A, B', 'card', edge(-2.0), [-2.75, 0.3, 0.05], {rest: [-2.75, 0, 0.05], rot: Math.PI / 2}));
withAct('METAMORPHOSIS', 0, pour('Đổ nước sạch vào bể nuôi', 'jug', edge(-0.4), [-1.4, 0.65, 0], {color: WATER_C}));
withAct('MINI_ECOSYSTEM', 1, pour('Thả cá vào bể (rót cả cốc nước có cá)', 'jug', edge(0.6), [-0.5, 0.6, -0.2], {color: WATER_C}));
// thanh đòn lúc đầu lệch (đầu phải chúc xuống); cầm ốc cân bằng ở đầu thanh và vặn đủ 2 vòng thì thanh về nằm ngang
withAct('LEVER_MOMENT', 0, turn('Vặn ốc cân bằng cho thanh nằm ngang', '', [0, 0, 0], [1.86, 1.5, 0], {n: 2, tilt: {part: 2, angle: -0.14}}));
for (const [id, i] of [['TROPISM', 1], ['MINI_ECOSYSTEM', 2]] as const) {
  const st = BENCH_SETUP[id]?.[i];
  if (st) st.act = press(st.label, '', [0, 0, 0], st.at).act;
}

// Sinh thái: mang BỘ 4 CỌC (phần động `Mov_*_2`) ra cắm quanh khu vực; vòng cam ở giữa khu vực
for (const [id, cx] of [['QUADRAT', -0.8], ['COMMUNITY', -0.6]] as const) {
  const st = BENCH_SETUP[id]?.[0];
  if (st) {
    st.at = [cx, 0.3, 0];
    fit(id, 0, 2);
    st.act!.from[2] = 2.0; // hai cọc sau phải nằm NGOÀI thảm cỏ (cọc ở z ∓0,85 so với tâm bộ cọc): mang ra mép bàn rồi mới cắm
  }
}

/** cách làm bằng tay của từng kiểu thao tác thật (cho tab Hướng dẫn); chỉ cần chụm, kéo, giữ yên, vẽ vòng, chụm–nhả */
const PROP_NAME: Record<string, string> = {slide: 'lam kính', cover: 'lamen', rack: 'giá ống nghiệm', bottle: 'lọ thuốc thử', jug: 'cốc nước', pestle: 'chày', rod: 'đũa thủy tinh', bulb: 'bóng bơm', flask: 'bình tam giác', disc: 'lát cắt thân cây', foil: 'lá nhôm', jar: 'hũ', plug: 'phích cắm', cuff: 'vòng bít', paper: 'tờ phiếu', towel: 'giấy thấm', card: 'thẻ', pot: 'chậu cây', nozzle: 'đầu ống mềm'};
const ACT_HOW: Record<BenchAct['kind'], (a: BenchAct) => string> = {
  place: (a) => a.part !== undefined ? 'Đặt đúng chỗ: chụm bộ phận của dụng cụ (đang để ở mép bàn gần bạn), kéo tới vòng cam rồi buông; thả lệch thì bộ phận tự về mép bàn.' : `Đặt ${PROP_NAME[a.prop] ?? 'vật'}: chụm vật đang nằm ở mép bàn gần bạn, kéo tới vòng cam rồi buông; thả lệch thì vật tự trở về chỗ cũ.`,
  pour: (a) => `Rót từ ${PROP_NAME[a.prop] ?? 'lọ'}: chụm lọ, đưa MIỆNG LỌ tới vòng cam rồi giữ yên: lọ tự nghiêng và rót, giữ càng lâu càng được nhiều (cần chừng ${a.n ?? 2} giây); nhấc ra thì ngừng, phần đã rót vẫn còn.`,
  stir: (a) => `${a.verb} bằng ${PROP_NAME[a.prop] ?? 'dụng cụ'}: chụm, đưa vật vào vòng cam rồi vẽ vòng tròn quanh tâm vòng (${a.n ?? 3} vòng, theo chiều nào cũng được); nhãn ghi số vòng đã ${a.verb.toLowerCase()}.`,
  press: () => 'Bật: đưa con trỏ tới vòng cam ở công tắc của thiết bị rồi chụm một lần (như bấm công tắc thật); vòng chớp sáng là đã bật.',
  connect: (a) =>
    a.prop === 'nozzle'
      ? 'Cắm ống: một đầu ống đã gắn sẵn vào thiết bị; chụm đầu ống còn lại ở mép bàn, kéo tới núm (vòng cam) rồi buông để cắm khít; thả lệch thì ống tự về chỗ cũ.'
      : 'Nối dây: dây đã gắn sẵn một đầu vào cực của thiết bị; chụm phích ở đầu kia (nằm ở mép bàn), kéo tới chốt cần nối (vòng cam) rồi buông; thả lệch thì phích tự về chỗ cũ.',
  turn: (a) => `Vặn ốc: chụm vào ốc (vòng cam) rồi vẽ vòng tròn quanh ốc, đủ ${a.n ?? 2} vòng thì xong; thanh dịch dần theo từng vòng vặn.`,
  squeeze: (a) => `Bóp ${PROP_NAME[a.prop] ?? 'bóng'}: chụm giữ trên bóng để bóp, nhả ra cho phồng lại; mỗi lần chụm rồi nhả là một nhịp, cần ${a.n ?? 5} nhịp.`,
};

/** thông số THỜI GIAN (đơn vị s, phút, giờ, ngày): chỉnh bằng đồng hồ hẹn giờ trên bàn thay cho con trượt */
export const isTimeUnit = (unit?: string): boolean => /^(s|phút|giờ|ngày)$/.test(unit ?? '');

/** Bộ phận cầm được của một thanh trượt (nếu có): bài đó kéo thẳng dụng cụ thay vì kéo con trượt trên ray. */
export function grabOf(expId: string, param: string): (BenchMove & {what: string}) | undefined {
  const all = (BENCH_MOVES[expId] ?? []).filter((m): m is BenchMove & {what: string} => m.param === param && !!m.what);
  return all.find((m) => m.axis !== 's') ?? all[0];
}

/** cách làm thí nghiệm (sau chuẩn bị) của bài có bảng số liệu: kéo–thả vật, đóng khóa dao, hoặc gạt cần trượt — đúng như cảnh `HandsBench3D` dựng */
function doHow(id: string): string {
  const pull = BENCH_PULL[id];
  if (pull) return `chụm vào ${pull.what.split(':')[0]}, kéo lệch rồi thả (${pull.what.split(': ')[1] ?? 'thả ra để chạy'}); vật bật về chỗ cũ, kéo lại để đo lần nữa.`;
  if (BENCH_KNIFE.has(id)) return 'nắm tay cầm của KHÓA DAO trước bộ dụng cụ, gạt lưỡi đồng xuống đóng hẳn mạch; thả ra khóa tự bật mở.';
  return 'nắm núm CẦN TRƯỢT trên ray trước bộ dụng cụ, gạt hết sang ô xanh; thả ra cần tự bật về.';
}

/** Bài thực hành SGK theo mã preset (`PHYS_LAB_<MÃ>` / `BIO_LAB_<MÃ>`); `file` = tệp mô hình chứa bộ dụng cụ. */
export function benchOf(presetId: string): {e: PhysExperiment; file: 'phys' | 'bio'} | null {
  const m = /^(PHYS|BIO)_LAB_(.+)$/.exec(presetId);
  if (!m) return null;
  const e = (m[1] === 'PHYS' ? PHYS_BY_ID : BIO_BY_ID)[m[2]];
  return e ? {e, file: m[1] === 'PHYS' ? 'phys' : 'bio'} : null;
}

/** Tab "Hướng dẫn" của bài thực hành SGK, suy ra từ chính khai báo của bài (bước làm, dụng cụ, câu hỏi sau thí nghiệm). */
export function benchManual(presetId: string): Manual | null {
  const b = benchOf(presetId);
  if (!b) return null;
  const {e} = b;
  return {
    goal: e.goal,
    tools: [
      `Trên bàn: ${e.apparatus}.`,
      ...e.sliders.map((p) => {
        const g = grabOf(e.id, p.key);
        const range = `từ ${p.min} đến ${p.max}${p.unit ? ` ${p.unit}` : ''}`;
        return g
          ? `${g.what[0].toUpperCase()}${g.what.slice(1)}: chụm vào chính dụng cụ này rồi kéo để đổi "${p.label}" (${range}); vòng con trỏ chuyển cam khi chạm đúng.`
          : isTimeUnit(p.unit)
            ? `Đồng hồ hẹn giờ "${p.label}" (mép bàn phía trước, bên trái): chụm vào đồng hồ rồi kéo ngang để quay kim; ${range}.`
            : `Núm vặn "${p.label}" (mép bàn phía trước, cùng hàng với đồng hồ hẹn giờ): chụm vào núm rồi kéo ngang, sang phải là tăng, vạch trên núm chỉ trên thang chia; ${range}.`;
      }),
      ...(e.choices ?? []).map((c) => {
        const labels = c.options.map((o) => o[1]);
        return isToggle(labels)
          ? `Chọn "${c.label}": trên khay ở mép bàn có một vật (${labels[1]}); chụm cầm vật đó đặt vào vòng vàng ở dụng cụ là "${labels[1]}", nhấc ra để về khay là "${labels[0]}".`
          : `Chọn "${c.label}": trên khay ở mép bàn bày từng phương án (${labels.join('; ')}); chụm cầm một vật rồi đặt vào vòng vàng ở dụng cụ để chọn, vật đang chọn tự về khay.`;
      }),
      ...(b.file === 'phys' ? ['Dụng cụ tự chuyển động đúng theo quy luật của bài (xe lăn, bi rơi, con lắc đung đưa, dòng điện chạy, sóng lan…); vặn núm hoặc kéo bộ phận để đổi thông số thì chuyển động đổi theo ngay.'] : []),
      ...((BENCH_SETUP[e.id] ?? []).length ? [`CHUẨN BỊ (làm một lần, theo thứ tự): ${(BENCH_SETUP[e.id] ?? []).map((s, i) => `${i + 1}. ${s.label}`).join('; ')}. Mỗi bước là một vòng cam trên dụng cụ; xong bước này vòng sang bước kế.`] : []),
      ...(BENCH_SETUP[e.id] ?? []).flatMap((s, i) => (s.act ? [`Bước ${i + 1} làm bằng vật thật: ${ACT_HOW[s.act.kind](s.act)}`] : [])),
      ...(e.columns.length ? [`LÀM thí nghiệm (sau khi chuẩn bị xong) — "${BENCH_ACTION[e.id] ?? 'Đo'}": ${doHow(e.id)} Mỗi lần làm, thí nghiệm chạy và một dòng số đo được ghi vào bảng ở tab Thao tác.`] : []),
    ],
    steps: e.steps.map((s) => ({do: s.text, why: ''})),
    conclude: e.questions.map((q) => q.why).join(' '),
  };
}
