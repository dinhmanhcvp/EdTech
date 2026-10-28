import {describe, it, expect} from 'vitest';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';

/**
 * Kịch bản trình diễn trực tiếp: mỗi mô phỏng có một câu để viết/gõ vào ô công thức.
 * Cùng danh sách này được in ở docs/KICH_BAN_LIVE_DEMO.md; test giữ cho danh sách luôn đúng với bộ định tuyến.
 */
export const LIVE_CASES: {id: string; input: string}[] = [
  // Toán
  {id: 'MATH_GRAPH', input: 'y = x^2 ; y = 2x + 3'},
  {id: 'MATH_TRIG_WAVE', input: 'y = 2sin(3x)'},
  {id: 'MATH_FUNC_2D', input: 'nguyên hàm của x^3'},
  {id: 'GEO_SOLID', input: 'hình chóp S.ABCD'},
  {id: 'MATH_3D_OXYZ', input: 'x^2 + y^2 + z^2 = 9'},
  {id: 'MATH_INTEGRAL_3D_REVOLVE', input: 'y = sqrt(x); a = 0; b = 4 tròn xoay'},
  {id: 'MATH_DYNAMIC_GEOMETRY', input: 'đường Euler tam giác'},
  {id: 'MATH_LINEAR_PROGRAMMING', input: 'x + y <= 6; x >= 0; y >= 0; max 3x+2y'},
  {id: 'MATH_COBWEB_CHAOS', input: 'x_{n+1} = 3.9 x_n (1 - x_n)'},
  {id: 'MATH_STAT_BOXPLOT', input: 'Min=1, Q1=5, Q2=8, Q3=12, Max=20'},
  {id: 'MATH_VARIATION_TABLE', input: "x | -∞ -1 1 +∞\ny' | + 0 - 0 +\ny | -∞ ↗ 3 ↘ -1 ↗ +∞"},
  // Vật lí
  {id: 'PHYS_PROJECTILE', input: 'ném xiên v0 = 22 m/s'},
  {id: 'PHYS_PENDULUM', input: 'con lắc đơn'},
  {id: 'PHYS_INCLINED', input: 'mặt phẳng nghiêng có ma sát'},
  {id: 'PHYS_RIPPLE_TANK', input: 'giao thoa sóng hai nguồn'},
  {id: 'PHYS_RLC_PHASOR', input: 'mạch RLC cộng hưởng'},
  {id: 'PHYS_GAS_STATE_PV', input: 'chu trình Carnot'},
  {id: 'PHYS_DOUBLE_PENDULUM', input: 'con lắc kép'},
  {id: 'PHYS_CORIOLIS_FORCE', input: 'lực Coriolis'},
  {id: 'PHYS_FRAUNHOFER_DIFF', input: 'nhiễu xạ 5 khe'},
  {id: 'PHYS_OPTICS_LENS', input: 'thấu kính hội tụ f = 100'},
  // Hóa học
  {id: 'CHEM_BALANCE_SCALE', input: 'Fe + O2 -> Fe2O3'},
  {id: 'CHEM_EQUILIBRIUM_TITRATION', input: 'chuẩn độ HCl bằng NaOH'},
  {id: 'CHEM_MOLECULE_3D', input: 'SF6'},
  {id: 'CHEM_LE_CHATELIER_GAS', input: '2NO2 ⇌ N2O4'},
  {id: 'CHEM_GALVANIC_DANIELL', input: 'Pin Daniell'},
  {id: 'CHEM_SN2_MECHANISM', input: 'SN2'},
  {id: 'CHEM_CFT_COMPLEX_3D', input: 'CFT d6'},
  {id: 'CHEM_CRYSTAL_LATTICE', input: 'FCC'},
  {id: 'CHEM_ORGANIC_SKELETAL', input: 'cyclohexane ghế'},
  {id: 'CHEM_REACTION_LAB', input: 'Mg + HCl 40°C'},
  // Sinh học
  {id: 'BIO_PHOTOSYNTHESIS', input: 'quang hợp'},
  {id: 'BIO_DNA_HELIX', input: 'ADN'},
  {id: 'BIO_HEART_CYCLE', input: 'nhịp tim 120 BPM'},
  {id: 'BIO_PUNNETT_SQUARE', input: 'P: AaBb × AaBb'},
  {id: 'BIO_HARDY_WEINBERG', input: '0,04AA + 0,32Aa + 0,64aa = 1'},
  {id: 'BIO_STOMATA_GAS', input: 'khí khổng'},
  {id: 'BIO_OSMOSIS_CELL', input: 'thẩm thấu'},
  {id: 'BIO_OPERON_LAC', input: 'Operon Lac'},
  {id: 'BIO_CELL_RESPIRATION', input: 'chuỗi truyền electron ATP synthase'},
  {id: 'BIO_LOTKA_VOLTERRA', input: 'Lotka-Volterra'},
  {id: 'BIO_CELL_SIGNALING', input: 'GPCR apoptosis'},
];

describe('kịch bản live demo', () => {
  for (const c of LIVE_CASES) {
    it(`${c.id} ← ${c.input.split('\n')[0]}`, () => {
      expect(matchInstantStemBlueprint(c.input)?.templateId).toBe(c.id);
    });
  }
  it('mỗi mô phỏng có đúng một câu', () => {
    expect(new Set(LIVE_CASES.map((c) => c.id)).size).toBe(LIVE_CASES.length);
  });
});
