import {describe, it, expect} from 'vitest';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';

const V: [string, string][] = [
  // Lý
  ['PHYS_PROJECTILE', 'Ném xiên'], ['PHYS_PROJECTILE', 'chuyển động ném xiên'], ['PHYS_PROJECTILE', 'ném ngang'], ['PHYS_PROJECTILE', 'bài toán ném xiên góc 45 độ'],
  ['PHYS_PENDULUM', 'Con lắc đơn'], ['PHYS_PENDULUM', 'dao động con lắc đơn'], ['PHYS_PENDULUM', 'con lắc'], ['PHYS_PENDULUM', 'chu kì con lắc đơn'],
  ['PHYS_INCLINED', 'Mặt phẳng nghiêng'], ['PHYS_INCLINED', 'vật trượt trên mặt phẳng nghiêng'], ['PHYS_INCLINED', 'lực ma sát'],
  ['PHYS_RIPPLE_TANK', 'Giao thoa sóng'], ['PHYS_RIPPLE_TANK', 'giao thoa sóng nước'], ['PHYS_RIPPLE_TANK', 'sóng cơ giao thoa hai nguồn'],
  ['PHYS_RLC_PHASOR', 'Mạch RLC'], ['PHYS_RLC_PHASOR', 'mạch điện xoay chiều RLC'], ['PHYS_RLC_PHASOR', 'giản đồ Fresnel'], ['PHYS_RLC_PHASOR', 'hiện tượng cộng hưởng điện'],
  ['PHYS_GAS_STATE_PV', 'Chu trình Carnot'], ['PHYS_GAS_STATE_PV', 'động cơ nhiệt'], ['PHYS_GAS_STATE_PV', 'khí lí tưởng'], ['PHYS_GAS_STATE_PV', 'đồ thị p-V'], ['PHYS_GAS_STATE_PV', 'chu trình Otto'], ['PHYS_GAS_STATE_PV', 'quá trình đẳng nhiệt đẳng áp đẳng tích'],
  ['PHYS_DOUBLE_PENDULUM', 'Con lắc kép'], ['PHYS_DOUBLE_PENDULUM', 'hỗn loạn con lắc kép'], ['PHYS_DOUBLE_PENDULUM', 'con lắc đôi'],
  ['PHYS_CORIOLIS_FORCE', 'Lực Coriolis'], ['PHYS_CORIOLIS_FORCE', 'lực quán tính Coriolis'], ['PHYS_CORIOLIS_FORCE', 'hệ quy chiếu quay'],
  ['PHYS_FRAUNHOFER_DIFF', 'Nhiễu xạ'], ['PHYS_FRAUNHOFER_DIFF', 'nhiễu xạ qua nhiều khe'], ['PHYS_FRAUNHOFER_DIFF', 'cách tử nhiễu xạ'], ['PHYS_FRAUNHOFER_DIFF', 'Fraunhofer 7 khe'],
  // Hóa
  ['CHEM_BALANCE_SCALE', 'cân bằng phương trình hóa học'], ['CHEM_BALANCE_SCALE', 'Fe + O2'], ['CHEM_BALANCE_SCALE', 'phản ứng oxi hóa khử'],
  ['CHEM_EQUILIBRIUM_TITRATION', 'Chuẩn độ'], ['CHEM_EQUILIBRIUM_TITRATION', 'chuẩn độ axit bazơ'], ['CHEM_EQUILIBRIUM_TITRATION', 'đường cong pH'],
  ['CHEM_MOLECULE_3D', 'Hình học phân tử'], ['CHEM_MOLECULE_3D', 'hình dạng phân tử nước'], ['CHEM_MOLECULE_3D', 'phân tử NH3'], ['CHEM_MOLECULE_3D', 'VSEPR'], ['CHEM_MOLECULE_3D', 'phân tử metan'],
  ['CHEM_LE_CHATELIER_GAS', 'Nguyên lí Le Chatelier'], ['CHEM_LE_CHATELIER_GAS', 'chuyển dịch cân bằng'], ['CHEM_LE_CHATELIER_GAS', 'cân bằng hóa học NO2'], ['CHEM_LE_CHATELIER_GAS', 'phản ứng thuận nghịch'],
  ['CHEM_GALVANIC_DANIELL', 'Pin điện hóa'], ['CHEM_GALVANIC_DANIELL', 'pin Zn-Cu'], ['CHEM_GALVANIC_DANIELL', 'pin Galvani'], ['CHEM_GALVANIC_DANIELL', 'phương trình Nernst'],
  ['CHEM_SN2_MECHANISM', 'cơ chế SN2'], ['CHEM_SN2_MECHANISM', 'phản ứng thế SN2'], ['CHEM_SN2_MECHANISM', 'nghịch đảo Walden'],
  ['CHEM_CFT_COMPLEX_3D', 'Thuyết trường tinh thể'], ['CHEM_CFT_COMPLEX_3D', 'phức chất bát diện'], ['CHEM_CFT_COMPLEX_3D', 'tách mức năng lượng orbital d'],
  ['CHEM_CRYSTAL_LATTICE', 'Mạng tinh thể'], ['CHEM_CRYSTAL_LATTICE', 'cấu trúc tinh thể kim loại'], ['CHEM_CRYSTAL_LATTICE', 'lập phương tâm diện'], ['CHEM_CRYSTAL_LATTICE', 'lập phương tâm khối'],
  ['CHEM_ORGANIC_SKELETAL', 'Cyclohexane'], ['CHEM_ORGANIC_SKELETAL', 'cấu dạng ghế'], ['CHEM_ORGANIC_SKELETAL', 'cấu dạng thuyền của xiclohexan'],
  // Sinh
  ['BIO_PHOTOSYNTHESIS', 'Quang hợp'], ['BIO_PHOTOSYNTHESIS', 'quá trình quang hợp ở thực vật'], ['BIO_PHOTOSYNTHESIS', 'quang hợp ở lá cây'],
  ['BIO_DNA_HELIX', 'ADN'], ['BIO_DNA_HELIX', 'nhân đôi ADN'], ['BIO_DNA_HELIX', 'cấu trúc phân tử DNA'], ['BIO_DNA_HELIX', 'tái bản ADN'],
  ['BIO_PUNNETT_SQUARE', 'Lai hai cặp tính trạng'], ['BIO_PUNNETT_SQUARE', 'bảng Punnett'], ['BIO_PUNNETT_SQUARE', 'quy luật Menđen'], ['BIO_PUNNETT_SQUARE', 'phép lai AaBb x AaBb'], ['BIO_PUNNETT_SQUARE', 'sơ đồ lai'],
  ['BIO_HARDY_WEINBERG', 'Hardy-Weinberg'], ['BIO_HARDY_WEINBERG', 'cân bằng di truyền quần thể'], ['BIO_HARDY_WEINBERG', 'cấu trúc di truyền quần thể'],
  ['BIO_STOMATA_GAS', 'Khí khổng'], ['BIO_STOMATA_GAS', 'sự đóng mở khí khổng'], ['BIO_STOMATA_GAS', 'tế bào hạt đậu'], ['BIO_STOMATA_GAS', 'thoát hơi nước ở lá'],
  ['BIO_OSMOSIS_CELL', 'Thẩm thấu'], ['BIO_OSMOSIS_CELL', 'hiện tượng thẩm thấu'], ['BIO_OSMOSIS_CELL', 'co nguyên sinh'], ['BIO_OSMOSIS_CELL', 'áp suất thẩm thấu'], ['BIO_OSMOSIS_CELL', 'hồng cầu trong dung dịch nhược trương'],
  ['BIO_OPERON_LAC', 'Operon Lac'], ['BIO_OPERON_LAC', 'điều hòa biểu hiện gen ở vi khuẩn'], ['BIO_OPERON_LAC', 'operon lactose'], ['BIO_OPERON_LAC', 'E. coli lactose'],
  ['BIO_CELL_RESPIRATION', 'Hô hấp tế bào'], ['BIO_CELL_RESPIRATION', 'chuỗi chuyền electron'], ['BIO_CELL_RESPIRATION', 'ti thể tổng hợp ATP'], ['BIO_CELL_RESPIRATION', 'chu trình Krebs'],
  ['BIO_LOTKA_VOLTERRA', 'Lotka-Volterra'], ['BIO_LOTKA_VOLTERRA', 'thỏ và sói'], ['BIO_LOTKA_VOLTERRA', 'quan hệ con mồi vật ăn thịt'], ['BIO_LOTKA_VOLTERRA', 'động thái quần thể'],
  ['BIO_CELL_SIGNALING', 'Truyền tin tế bào'], ['BIO_CELL_SIGNALING', 'thụ thể GPCR'], ['BIO_CELL_SIGNALING', 'chết theo chương trình'], ['BIO_CELL_SIGNALING', 'con đường cAMP'],
  // viết có \text{}
  ['BIO_STOMATA_GAS', '\\text{Khí khổng}'], ['PHYS_DOUBLE_PENDULUM', '\\text{con lắc kép}'], ['CHEM_MOLECULE_3D', '\\text{hình học phân tử}'],
];
describe('cách gọi tự nhiên bằng tiếng Việt (gõ hoặc Vision đọc ra)', () => {
  it(`mở đúng mô phỏng cho ${V.length} cách gọi`, () => {
    const bad = V.filter(([id, text]) => matchInstantStemBlueprint(text)?.templateId !== id).map(([id, text]) => `${id} <- "${text}"`);
    expect(bad).toEqual([]);
  });
});
