import {BIO_BY_ID} from '../bio/experiments';
import {PHYS_BY_ID} from '../phys/experiments';
import type {PhysExperiment} from '../phys/types';
import type {Manual} from './manual';

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
}
const sp = (label: string, x: number, y: number, z: number): BenchStep => ({label, at: [x, y, z]});
export const BENCH_SETUP: Record<string, BenchStep[]> = {
  ERROR_MEASURE: [sp('Đặt thanh kim loại lên thước', 0, 0.3, -0.3), sp('Khép hàm thước kẹp vào thanh', -0.4, 0.3, 0.55)],
  SPEED: [sp('Đặt xe vào vạch xuất phát', -2.0, 0.55, 0), sp('Đặt cổng quang thứ hai đúng vạch', -0.1, 0.9, 0.3)],
  FREE_FALL_G: [sp('Gắn trụ thép vào nam châm điện', 0, 1.95, -0.2), sp('Đưa cổng quang về đúng độ cao', 0, 0.9, 0.1)],
  FORCE_COMPOSITION: [sp('Móc ba lực kế vào vòng nhẫn', 0, 1.0, -0.3), sp('Đặt thước đo góc lên bảng từ', 0, 1.45, -0.3)],
  SOUND_FREQUENCY: [sp('Đặt micro sát âm thoa', -0.75, 0.65, 0), sp('Bật dao động kí', 1.85, 0.7, 0.2)],
  SOUND_SPEED: [sp('Bật loa phát tần số', -1.9, 0.75, 0), sp('Đặt thước đo dọc ống', 0.2, 0.7, 0.45)],
  EMF_INTERNAL_R: [sp('Nối pin – biến trở – ampe kế', -1.1, 0.7, -0.4), sp('Nối vôn kế song song với pin', 0.2, 0.7, -0.4)],
  NEWTON2: [sp('Đặt xe lên đường ray', -1.6, 1.15, 0), sp('Buộc dây qua ròng rọc, treo quả cân', 2.3, 1.3, 0)],
  FRICTION: [sp('Đặt khối gỗ lên mặt phẳng', -0.8, 0.55, 0), sp('Móc lực kế vào khối gỗ', 0.2, 0.4, 0)],
  HOOKE: [sp('Treo lò xo lên giá', 0, 2.15, -0.2), sp('Đặt thước sát lò xo, chỉnh số 0', 0.3, 1.5, -0.2)],
  PENDULUM_G: [sp('Treo quả nặng vào đầu dây', 0, 2.3, -0.2), sp('Chuẩn bị đồng hồ bấm giây', 1.5, 0.35, 0.5)],
  BOYLE: [sp('Lắp xi lanh khít với áp kế', 0.7, 0.45, 0), sp('Đưa pit-tông về vạch 40 mL', 0, 1.2, 0)],
  OHM_LAW: [sp('Mắc điện trở nối tiếp ampe kế', -0.3, 0.35, 0.5), sp('Mắc vôn kế song song với điện trở', 1.2, 0.7, -0.4)],
  SPECIFIC_HEAT: [sp('Đổ nước vào nhiệt lượng kế, cân', -0.4, 0.7, 0), sp('Cắm điện trở nung vào nguồn', -1.3, 0.6, 0.1)],
  CHARLES: [sp('Nhúng bình khí vào cốc nước', -1.4, 0.7, 0.2), sp('Đặt nhiệt kế vào cốc', -1.6, 1.0, 0.1)],
  EM_INDUCTION: [sp('Nối cuộn dây với milivôn kế', 0.6, 0.45, 0.2), sp('Đặt nam châm sát miệng cuộn dây', 0.4, 0.55, 0)],
  WAVE_INTERFERENCE: [sp('Đổ nước vào khay', 0, 0.55, 0.4), sp('Nhúng hai mũi nhọn vào mặt nước', 0, 0.7, -0.3)],
  STANDING_WAVE: [sp('Nối dây với máy phát dao động', -1.9, 0.8, 0), sp('Vắt dây qua ròng rọc, treo quả cân', 2.1, 0.7, 0)],
  CAPACITOR_RC: [sp('Mắc tụ nối tiếp điện trở', -0.5, 0.35, 0.1), sp('Mắc vôn kế song song với tụ', 1.2, 0.7, -0.4)],
  LATENT_HEAT_FUSION: [sp('Cân nước ấm trong nhiệt lượng kế', -1.0, 0.7, 0), sp('Lau khô nước đá trên đĩa', 0.4, 0.3, 0.5)],
  LEVER_MOMENT: [sp('Chỉnh thanh nằm ngang', 0, 1.6, 0), sp('Treo quả cân bên phải', 1.2, 1.2, 0)],
  PROJECTILE_HORIZONTAL: [sp('Đặt giấy than lên tờ giấy trắng', 1.3, 0.1, 0), sp('Đặt bi ở đầu máng', -1.0, 0.75, 0)],
  TRANSFORMER: [sp('Mắc cuộn sơ cấp vào nguồn xoay chiều', -0.5, 0.95, 0.2), sp('Mắc vôn kế vào cuộn thứ cấp', 0.5, 0.95, 0.2)],
  BIOMOLECULES: [sp('Đặt ống mẫu thử vào giá', -1.5, 0.55, 0), sp('Đặt lọ thuốc thử cạnh ống', 0.45, 0.45, 0.5)],
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
  TROPISM: [sp('Đặt cây mầm vào hộp', -1.9, 0.4, 0), sp('Chọn nguồn kích thích', -1.0, 0.5, 0)],
  APICAL_DOMINANCE: [sp('Đánh dấu nhóm cây đối chứng', -1.3, 1.3, 0), sp('Cắt ngọn nhóm thí nghiệm', 0.7, 0.9, 0)],
  TREE_AGE: [sp('Đặt lát cắt dưới kính lúp', 1.6, 0.3, 0.2), sp('Đặt thước ngang lát cắt', 0, 0.2, 0.85)],
  METAMORPHOSIS: [sp('Đặt mẫu vào bể / hộp quan sát', -1.4, 0.35, 0), sp('Đặt thước và kính lúp', 2.0, 0.3, 0.5)],
  PROPAGATION: [sp('Chuẩn bị cành, bầu giâm', -1.9, 0.45, 0.3), sp('Quét auxin lên cành', 1.2, 0.35, -0.3)],
  DNA_EXTRACT: [sp('Nghiền mẫu trong cối', -2.2, 0.35, 0.2), sp('Thêm nước rửa chén và muối', 2.6, 0.45, -0.3)],
  CHROMOSOME_MUTATION: [sp('Đặt tiêu bản lên bàn kính', -1.6, 0.55, 0.08), sp('Bật màn hình hiển thị', 1.6, 0.8, -0.3)],
  MODIFICATION: [sp('Chia hai hàng chậu giống A, B', -1.0, 0.3, 0), sp('Bón phân đạm đều các chậu', 0.9, 0.5, -0.2)],
  QUADRAT: [sp('Cắm cọc quanh khu vực', -1.7, 0.3, 0.85), sp('Đặt khung ô 1 m × 1 m', -0.6, 0.15, 0)],
  COMMUNITY: [sp('Cắm cọc quanh khu vực', -1.5, 0.3, 0.85), sp('Đặt khung ô tiêu chuẩn', -0.6, 0.15, 0)],
  MINI_ECOSYSTEM: [sp('Rải cát, trồng cây thủy sinh', -0.5, 0.2, 0.2), sp('Thả cá vào bể, bật đèn', -0.5, 0.6, -0.2)],
};

/** thông số THỜI GIAN (đơn vị s, phút, giờ, ngày): chỉnh bằng đồng hồ hẹn giờ trên bàn thay cho con trượt */
export const isTimeUnit = (unit?: string): boolean => /^(s|phút|giờ|ngày)$/.test(unit ?? '');

/** Bộ phận cầm được của một thanh trượt (nếu có): bài đó kéo thẳng dụng cụ thay vì kéo con trượt trên ray. */
export function grabOf(expId: string, param: string): (BenchMove & {what: string}) | undefined {
  const all = (BENCH_MOVES[expId] ?? []).filter((m): m is BenchMove & {what: string} => m.param === param && !!m.what);
  return all.find((m) => m.axis !== 's') ?? all[0];
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
      ...(e.choices ?? []).map((c) => `Công tắc xoay "${c.label}" (mép bàn bên phải): chụm một lần để vặn sang nấc kế tiếp (${c.options.map((o) => o[1]).join(', ')}).`),
      ...(b.file === 'phys' ? ['Dụng cụ tự chuyển động đúng theo quy luật của bài (xe lăn, bi rơi, con lắc đung đưa, dòng điện chạy, sóng lan…): chạm (chụm) vào vật đang chuyển động hoặc bấm ĐO để cho chạy lại từ đầu; kéo thanh trượt thì chuyển động đổi theo ngay.'] : []),
      ...((BENCH_SETUP[e.id] ?? []).length ? [`CHUẨN BỊ (làm một lần, theo thứ tự): ${(BENCH_SETUP[e.id] ?? []).map((s, i) => `${i + 1}. ${s.label}`).join('; ')}. Mỗi bước là một vòng cam trên dụng cụ: chạm (chụm một lần) vào vòng đó để làm, xong bước này vòng sang bước kế.`] : []),
      ...(e.columns.length ? [`LÀM thí nghiệm (sau khi chuẩn bị xong): chạm (chụm một lần) vào chính dụng cụ có nhãn xanh "${BENCH_ACTION[e.id] ?? 'Đo'}"; thí nghiệm chạy và một dòng số đo được ghi vào bảng ở tab Thao tác. Không với tới thì bấm nút cam ở mép bàn bên phải (mỗi lần bấm làm một bước).`] : []),
    ],
    steps: e.steps.map((s) => ({do: s.text, why: ''})),
    conclude: e.questions.map((q) => q.why).join(' '),
  };
}
