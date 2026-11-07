import type {Rule} from './types';

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Kết tủa từ ion: cation (điện tích cz) + anion (điện tích az) → chất rắn. */
function precip(cat: string, cz: number, an: string, az: number, product: string, eq: string, text: string): Rule {
  const g = gcd(cz, az);
  const nc = az / g;
  const na = cz / g;
  return {id: `p:${cat}+${an}`, priority: 4, reactants: {[cat]: nc, [an]: na}, products: {[product]: 1}, eq, text};
}

const PRECIP: Rule[] = [
  precip('Cu2+', 2, 'OH-', 1, 'Cu(OH)2', 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓', 'xuất hiện kết tủa xanh lam Cu(OH)₂'),
  precip('Fe2+', 2, 'OH-', 1, 'Fe(OH)2', 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓', 'xuất hiện kết tủa trắng xanh Fe(OH)₂'),
  precip('Fe3+', 3, 'OH-', 1, 'Fe(OH)3', 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓', 'xuất hiện kết tủa nâu đỏ Fe(OH)₃'),
  precip('Al3+', 3, 'OH-', 1, 'Al(OH)3', 'Al³⁺ + 3OH⁻ → Al(OH)₃↓', 'xuất hiện kết tủa keo trắng Al(OH)₃'),
  precip('Zn2+', 2, 'OH-', 1, 'Zn(OH)2', 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓', 'xuất hiện kết tủa trắng Zn(OH)₂'),
  precip('Mg2+', 2, 'OH-', 1, 'Mg(OH)2', 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓', 'xuất hiện kết tủa trắng Mg(OH)₂'),
  precip('Pb2+', 2, 'OH-', 1, 'Pb(OH)2', 'Pb²⁺ + 2OH⁻ → Pb(OH)₂↓', 'xuất hiện kết tủa trắng Pb(OH)₂'),
  precip('Ca2+', 2, 'OH-', 1, 'Ca(OH)2(s)', 'Ca²⁺ + 2OH⁻ → Ca(OH)₂↓', 'xuất hiện kết tủa trắng Ca(OH)₂'),
  {id: 'p:Ag+OH-', priority: 4, reactants: {'Ag+': 2, 'OH-': 2}, products: {Ag2O: 1}, eq: '2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O', text: 'xuất hiện kết tủa nâu đen Ag₂O'},
  precip('Ag+', 1, 'Cl-', 1, 'AgCl', 'Ag⁺ + Cl⁻ → AgCl↓', 'xuất hiện kết tủa trắng AgCl'),
  precip('Ag+', 1, 'Br-', 1, 'AgBr', 'Ag⁺ + Br⁻ → AgBr↓', 'xuất hiện kết tủa vàng nhạt AgBr'),
  precip('Ag+', 1, 'I-', 1, 'AgI', 'Ag⁺ + I⁻ → AgI↓', 'xuất hiện kết tủa vàng AgI'),
  precip('Pb2+', 2, 'Cl-', 1, 'PbCl2', 'Pb²⁺ + 2Cl⁻ → PbCl₂↓', 'xuất hiện kết tủa trắng PbCl₂'),
  precip('Pb2+', 2, 'I-', 1, 'PbI2', 'Pb²⁺ + 2I⁻ → PbI₂↓', 'xuất hiện kết tủa vàng tươi PbI₂'),
  precip('Ba2+', 2, 'SO4 2-', 2, 'BaSO4', 'Ba²⁺ + SO₄²⁻ → BaSO₄↓', 'xuất hiện kết tủa trắng BaSO₄ (không tan trong acid)'),
  precip('Pb2+', 2, 'SO4 2-', 2, 'PbSO4', 'Pb²⁺ + SO₄²⁻ → PbSO₄↓', 'xuất hiện kết tủa trắng PbSO₄'),
  precip('Ba2+', 2, 'CO3 2-', 2, 'BaCO3', 'Ba²⁺ + CO₃²⁻ → BaCO₃↓', 'xuất hiện kết tủa trắng BaCO₃'),
  precip('Ca2+', 2, 'CO3 2-', 2, 'CaCO3', 'Ca²⁺ + CO₃²⁻ → CaCO₃↓', 'xuất hiện kết tủa trắng CaCO₃'),
  precip('Mg2+', 2, 'CO3 2-', 2, 'MgCO3', 'Mg²⁺ + CO₃²⁻ → MgCO₃↓', 'xuất hiện kết tủa trắng MgCO₃'),
  precip('Cu2+', 2, 'CO3 2-', 2, 'CuCO3', 'Cu²⁺ + CO₃²⁻ → CuCO₃↓', 'xuất hiện kết tủa xanh lục CuCO₃ (bazơ)'),
  {id: 'p:Ag+CO3', priority: 4, reactants: {'Ag+': 2, 'CO3 2-': 1}, products: {Ag2CO3: 1}, eq: '2Ag⁺ + CO₃²⁻ → Ag₂CO₃↓', text: 'xuất hiện kết tủa trắng ngà Ag₂CO₃'},
  {id: 'p:Al+CO3', priority: 4, reactants: {'Al3+': 2, 'CO3 2-': 3}, products: {'Al(OH)3': 2, CO2: 3}, eq: '2Al³⁺ + 3CO₃²⁻ + 3H₂O → 2Al(OH)₃↓ + 3CO₂↑', text: 'có kết tủa keo trắng Al(OH)₃ và sủi bọt khí CO₂'},
  precip('Cu2+', 2, 'S2-', 2, 'CuS', 'Cu²⁺ + S²⁻ → CuS↓', 'xuất hiện kết tủa đen CuS'),
  precip('Pb2+', 2, 'S2-', 2, 'PbS', 'Pb²⁺ + S²⁻ → PbS↓', 'xuất hiện kết tủa đen PbS'),
  precip('Fe2+', 2, 'S2-', 2, 'FeS(p)', 'Fe²⁺ + S²⁻ → FeS↓', 'xuất hiện kết tủa đen FeS'),
];

/** Kết tủa hydroxide/carbonate tan trong acid. */
const ACID_DISSOLVE: Rule[] = [
  ['Cu(OH)2', 'Cu2+', 2, 'Cu(OH)₂ + 2H⁺ → Cu²⁺ + 2H₂O', 'kết tủa Cu(OH)₂ tan, dung dịch xanh lam'],
  ['Fe(OH)3', 'Fe3+', 3, 'Fe(OH)₃ + 3H⁺ → Fe³⁺ + 3H₂O', 'kết tủa Fe(OH)₃ tan, dung dịch vàng nâu'],
  ['Fe(OH)2', 'Fe2+', 2, 'Fe(OH)₂ + 2H⁺ → Fe²⁺ + 2H₂O', 'kết tủa Fe(OH)₂ tan'],
  ['Al(OH)3', 'Al3+', 3, 'Al(OH)₃ + 3H⁺ → Al³⁺ + 3H₂O', 'kết tủa Al(OH)₃ tan trong acid'],
  ['Zn(OH)2', 'Zn2+', 2, 'Zn(OH)₂ + 2H⁺ → Zn²⁺ + 2H₂O', 'kết tủa Zn(OH)₂ tan trong acid'],
  ['Mg(OH)2', 'Mg2+', 2, 'Mg(OH)₂ + 2H⁺ → Mg²⁺ + 2H₂O', 'kết tủa Mg(OH)₂ tan trong acid'],
].map(([s, ion, n, eq, text]) => ({id: `ad:${s}`, priority: 5, reactants: {[s as string]: 1, 'H+': n as number}, products: {[ion as string]: 1}, eq: eq as string, text: text as string}))
  .concat(
    [
      ['CaCO3', 'Ca2+', 'CaCO₃'],
      ['BaCO3', 'Ba2+', 'BaCO₃'],
      ['MgCO3', 'Mg2+', 'MgCO₃'],
      ['CuCO3', 'Cu2+', 'CuCO₃'],
    ].map(([s, ion, f]) => ({id: `ad:${s}`, priority: 5, reactants: {[s]: 1, 'H+': 2}, products: {[ion]: 1, CO2: 1}, eq: `${f} + 2H⁺ → ${ion.replace('2+', '²⁺')} + CO₂↑ + H₂O`, text: `kết tủa ${f} tan, sủi bọt khí CO₂`})),
  );

const SERIES: {m: string; ion: string; z: number; metalLabel: string; ionLabel: string; k: number}[] = [
  {m: 'Mg', ion: 'Mg2+', z: 2, metalLabel: 'Mg', ionLabel: 'Mg²⁺', k: 0.05},
  {m: 'Al', ion: 'Al3+', z: 3, metalLabel: 'Al', ionLabel: 'Al³⁺', k: 0.01},
  {m: 'Zn', ion: 'Zn2+', z: 2, metalLabel: 'Zn', ionLabel: 'Zn²⁺', k: 0.03},
  {m: 'Fe', ion: 'Fe2+', z: 2, metalLabel: 'Fe', ionLabel: 'Fe²⁺', k: 0.008},
  {m: 'Cu', ion: 'Cu2+', z: 2, metalLabel: 'Cu', ionLabel: 'Cu²⁺', k: 0.01},
  {m: 'Ag(s)', ion: 'Ag+', z: 1, metalLabel: 'Ag', ionLabel: 'Ag⁺', k: 0},
];
const DEPOSIT: Record<string, string> = {Cu: 'đồng đỏ bám lên', 'Ag(s)': 'bạc trắng xám bám lên', Fe: 'sắt bám lên', Zn: 'kẽm bám lên'};

/** Kim loại mạnh đẩy ion kim loại yếu ra khỏi muối (dãy hoạt động hóa học). */
const DISPLACEMENT: Rule[] = [];
for (let i = 0; i < SERIES.length; i++) {
  for (let j = i + 1; j < SERIES.length; j++) {
    const a = SERIES[i];
    const b = SERIES[j];
    const g = gcd(a.z, b.z);
    const na = b.z / g; // số mol kim loại a
    const nb = a.z / g; // số mol ion b
    const dep = DEPOSIT[b.m] ?? 'kim loại mới bám lên';
    DISPLACEMENT.push({
      id: `d:${a.m}+${b.ion}`,
      priority: 6,
      k: a.k,
      rateSpecies: [b.ion],
      reactants: {[a.m]: na, [b.ion]: nb},
      products: {[a.ion]: na, [b.m]: nb},
      eq: `${na > 1 ? na : ''}${a.metalLabel} + ${nb > 1 ? nb : ''}${b.ionLabel} → ${na > 1 ? na : ''}${a.ionLabel} + ${nb > 1 ? nb : ''}${b.metalLabel}`,
      text: `${a.metalLabel} tan dần, ${dep} thanh kim loại, màu dung dịch ${b.ion === 'Cu2+' ? 'xanh nhạt dần' : 'thay đổi'}`,
    });
  }
}

const METAL_ACID: Rule[] = [
  {id: 'ma:Mg+H', priority: 6, k: 0.02, rateSpecies: ['H+'], reactants: {Mg: 1, 'H+': 2}, products: {'Mg2+': 1, H2: 1}, eq: 'Mg + 2H⁺ → Mg²⁺ + H₂↑', heat: -466, text: 'Mg tan nhanh, sủi bọt khí H₂ mạnh, ống nghiệm nóng lên'},
  {id: 'ma:Zn+H', priority: 6, k: 0.002, rateSpecies: ['H+'], reactants: {Zn: 1, 'H+': 2}, products: {'Zn2+': 1, H2: 1}, eq: 'Zn + 2H⁺ → Zn²⁺ + H₂↑', text: 'Zn tan, sủi bọt khí H₂ đều'},
  {id: 'ma:Fe+H', priority: 6, k: 0.0004, rateSpecies: ['H+'], reactants: {Fe: 1, 'H+': 2}, products: {'Fe2+': 1, H2: 1}, eq: 'Fe + 2H⁺ → Fe²⁺ + H₂↑', text: 'Fe tan chậm, sủi bọt khí H₂ ít, dung dịch dần có màu lục nhạt'},
  {id: 'ma:Al+H', priority: 6, k: 0.0008, rateSpecies: ['H+'], reactants: {Al: 1, 'H+': 3}, products: {'Al3+': 1, H2: 1.5}, eq: '2Al + 6H⁺ → 2Al³⁺ + 3H₂↑', text: 'Al tan chậm lúc đầu (lớp oxide) rồi sủi bọt khí H₂'},
  {id: 'ma:Mg+AcOH', priority: 6, k: 0.0005, rateSpecies: ['CH3COOH'], reactants: {Mg: 1, CH3COOH: 2}, products: {'Mg2+': 1, 'CH3COO-': 2, H2: 1}, eq: 'Mg + 2CH₃COOH → (CH₃COO)₂Mg + H₂↑', text: 'Mg tan, sủi bọt khí H₂'},
];

export const RULES: Rule[] = [
  // trung hòa và acid–base (ưu tiên 1)
  {id: 'neut', priority: 1, reactants: {'H+': 1, 'OH-': 1}, products: {}, eq: 'H⁺ + OH⁻ → H₂O', heat: -57.3},
  {id: 'neut-ac', priority: 1, reactants: {CH3COOH: 1, 'OH-': 1}, products: {'CH3COO-': 1}, eq: 'CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O', heat: -55},
  {id: 'nh3-h', priority: 1, reactants: {'NH3(aq)': 1, 'H+': 1}, products: {'NH4+': 1}, eq: 'NH₃ + H⁺ → NH₄⁺'},
  {id: 'h2so4-dil', priority: 1, wet: true, reactants: {'H2SO4(conc)': 1}, products: {'H+': 2, 'SO4 2-': 1}, eq: 'H₂SO₄ đặc + nước → 2H⁺ + SO₄²⁻', heat: -75, text: 'ống nghiệm nóng lên rất mạnh khi acid đặc gặp nước'},
  {id: 'nacl-dissolve', priority: 1, wet: true, reactants: {'NaCl(s)': 1}, products: {'Na+': 1, 'Cl-': 1}, eq: 'NaCl (rắn) → Na⁺ + Cl⁻'},
  {id: 'sugar-dissolve', priority: 1, wet: true, reactants: {'sucrose(s)': 1}, products: {sucrose: 1}, eq: 'saccharose (rắn) → saccharose (dung dịch)'},
  {id: 'nahco3-dissolve', priority: 1, wet: true, reactants: {'NaHCO3(s)': 1}, products: {'Na+': 1, 'HCO3-': 1}, eq: 'NaHCO₃ (rắn) → Na⁺ + HCO₃⁻'},
  // sinh khí (ưu tiên 2)
  {id: 'co3-h', priority: 2, reactants: {'CO3 2-': 1, 'H+': 2}, products: {CO2: 1}, eq: 'CO₃²⁻ + 2H⁺ → CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'hco3-h', priority: 2, reactants: {'HCO3-': 1, 'H+': 1}, products: {CO2: 1}, eq: 'HCO₃⁻ + H⁺ → CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'co3-ac', priority: 2, reactants: {'CO3 2-': 1, CH3COOH: 2}, products: {CO2: 1, 'CH3COO-': 2}, eq: 'CO₃²⁻ + 2CH₃COOH → 2CH₃COO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'hco3-ac', priority: 2, reactants: {'HCO3-': 1, CH3COOH: 1}, products: {CO2: 1, 'CH3COO-': 1}, eq: 'HCO₃⁻ + CH₃COOH → CH₃COO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 's2-h', priority: 2, reactants: {'S2-': 1, 'H+': 2}, products: {H2S: 1}, eq: 'S²⁻ + 2H⁺ → H₂S↑', text: 'có khí mùi trứng thối (H₂S, độc)'},
  {id: 'nh4-oh', priority: 2, reactants: {'NH4+': 1, 'OH-': 1}, products: {'NH3(aq)': 1}, eq: 'NH₄⁺ + OH⁻ → NH₃ + H₂O'},
  {id: 'nh3-heat', priority: 2, k: 0.2, minTemp: 55, reactants: {'NH3(aq)': 1}, products: {'NH3(g)': 1}, eq: 'NH₃ (dd) → NH₃↑ (khi đun nóng)', text: 'thoát khí mùi khai (NH₃), làm xanh quỳ tím ẩm'},
  {id: 'co2-limewater', priority: 2, reactants: {CO2: 1, 'Ca(OH)2(aq)': 1}, products: {CaCO3: 1}, eq: 'CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O', text: 'nước vôi trong vẩn đục (CaCO₃)'},
  // kim loại với nước
  {id: 'na-water', priority: 3, wet: true, reactants: {Na: 2}, products: {'Na+': 2, 'OH-': 2, H2: 1}, eq: '2Na + 2H₂O → 2NaOH + H₂↑', heat: -368, text: 'Na nóng chảy thành giọt tròn, chạy trên mặt nước, sủi bọt khí H₂ rất mạnh, dung dịch kiềm'},
  {id: 'mg-water', priority: 6, wet: true, k: 0.0002, reactants: {Mg: 1}, products: {'Mg(OH)2': 1, H2: 1}, eq: 'Mg + 2H₂O → Mg(OH)₂ + H₂↑', text: 'Mg tan chậm, có ít bọt khí H₂, dung dịch hóa kiềm yếu'},
  // halogen và oxi hóa khử (ưu tiên 3)
  {id: 'cl2-br', priority: 3, reactants: {'Cl2(aq)': 1, 'Br-': 2}, products: {'Cl-': 2, 'Br2(aq)': 1}, eq: 'Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂', text: 'dung dịch chuyển sang màu cam (Br₂ được giải phóng)'},
  {id: 'cl2-i', priority: 3, reactants: {'Cl2(aq)': 1, 'I-': 2}, products: {'Cl-': 2, 'I2(aq)': 1}, eq: 'Cl₂ + 2I⁻ → 2Cl⁻ + I₂', text: 'dung dịch chuyển sang màu nâu (I₂ được giải phóng)'},
  {id: 'br2-i', priority: 3, reactants: {'Br2(aq)': 1, 'I-': 2}, products: {'Br-': 2, 'I2(aq)': 1}, eq: 'Br₂ + 2I⁻ → 2Br⁻ + I₂', text: 'dung dịch chuyển sang màu nâu (I₂ được giải phóng)'},
  {id: 'starch-i2', priority: 4, catalysts: ['starch'], reactants: {'I2(aq)': 1}, products: {'I2-starch': 1}, eq: 'I₂ + hồ tinh bột → hợp chất màu xanh tím', text: 'xuất hiện màu xanh tím đặc trưng của iodine với hồ tinh bột'},
  {id: 'mno4-fe2', priority: 3, reactants: {'MnO4-': 1, 'Fe2+': 5, 'H+': 8}, products: {'Mn2+': 1, 'Fe3+': 5}, eq: 'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O', text: 'màu tím của KMnO₄ nhạt dần rồi mất màu'},
  {id: 'fe3-scn', priority: 4, reactants: {'Fe3+': 1, 'SCN-': 1}, products: {'FeSCN2+': 1}, eq: 'Fe³⁺ + SCN⁻ → [Fe(SCN)]²⁺', text: 'dung dịch hóa đỏ máu'},
  {id: 'fe2-air', priority: 6, k: 0.003, reactants: {'Fe(OH)2': 4}, products: {'Fe(OH)3': 4}, eq: '4Fe(OH)₂ + O₂ + 2H₂O → 4Fe(OH)₃', text: 'kết tủa trắng xanh hóa nâu đỏ dần khi tiếp xúc không khí'},
  ...PRECIP,
  // tạo phức, lưỡng tính (ưu tiên 5)
  {id: 'al-amph', priority: 5, reactants: {'Al(OH)3': 1, 'OH-': 1}, products: {'Al(OH)4-': 1}, eq: 'Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻', text: 'kết tủa Al(OH)₃ tan trong NaOH dư (lưỡng tính)'},
  {id: 'zn-amph', priority: 5, reactants: {'Zn(OH)2': 1, 'OH-': 2}, products: {'Zn(OH)4 2-': 1}, eq: 'Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻', text: 'kết tủa Zn(OH)₂ tan trong NaOH dư (lưỡng tính)'},
  {id: 'al-rev', priority: 5, reactants: {'Al3+': 1, 'Al(OH)4-': 3}, products: {'Al(OH)3': 4}, eq: 'Al³⁺ + 3[Al(OH)₄]⁻ → 4Al(OH)₃↓', text: 'kết tủa keo trắng Al(OH)₃ xuất hiện lại'},
  {id: 'cu-nh3', priority: 4, reactants: {'Cu2+': 1, 'NH3(aq)': 2}, products: {'Cu(OH)2': 1, 'NH4+': 2}, eq: 'Cu²⁺ + 2NH₃ + 2H₂O → Cu(OH)₂↓ + 2NH₄⁺', text: 'xuất hiện kết tủa xanh lam Cu(OH)₂'},
  {id: 'cu-nh3-ex', priority: 5, reactants: {'Cu(OH)2': 1, 'NH3(aq)': 4}, products: {'Cu(NH3)4 2+': 1}, eq: 'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻', text: 'kết tủa tan trong NH₃ dư tạo dung dịch xanh thẫm [Cu(NH₃)₄]²⁺'},
  {id: 'ag-nh3', priority: 4, reactants: {'Ag+': 2, 'NH3(aq)': 2}, products: {Ag2O: 1, 'NH4+': 2}, eq: '2Ag⁺ + 2NH₃ + H₂O → Ag₂O↓ + 2NH₄⁺', text: 'xuất hiện kết tủa nâu Ag₂O'},
  {id: 'ag-nh3-ex', priority: 5, reactants: {Ag2O: 1, 'NH3(aq)': 4}, products: {'Ag(NH3)2+': 2}, eq: 'Ag₂O + 4NH₃ + H₂O → 2[Ag(NH₃)₂]⁺ + 2OH⁻', text: 'kết tủa tan trong NH₃ dư tạo dung dịch trong suốt [Ag(NH₃)₂]⁺'},
  {id: 'mg-nh3', priority: 4, reactants: {'Mg2+': 1, 'NH3(aq)': 2}, products: {'Mg(OH)2': 1, 'NH4+': 2}, eq: 'Mg²⁺ + 2NH₃ + 2H₂O → Mg(OH)₂↓ + 2NH₄⁺', text: 'xuất hiện kết tủa trắng Mg(OH)₂'},
  {id: 'al-nh3', priority: 4, reactants: {'Al3+': 1, 'NH3(aq)': 3}, products: {'Al(OH)3': 1, 'NH4+': 3}, eq: 'Al³⁺ + 3NH₃ + 3H₂O → Al(OH)₃↓ + 3NH₄⁺', text: 'xuất hiện kết tủa keo trắng Al(OH)₃ (không tan trong NH₃ dư)'},
  {id: 'fe3-nh3', priority: 4, reactants: {'Fe3+': 1, 'NH3(aq)': 3}, products: {'Fe(OH)3': 1, 'NH4+': 3}, eq: 'Fe³⁺ + 3NH₃ + 3H₂O → Fe(OH)₃↓ + 3NH₄⁺', text: 'xuất hiện kết tủa nâu đỏ Fe(OH)₃'},
  {id: 'cu-glycerol', priority: 5, reactants: {'Cu(OH)2': 1, glycerol: 2}, products: {'Cu-polyol': 1}, eq: 'Cu(OH)₂ + 2C₃H₅(OH)₃ → phức tan màu xanh thẫm', text: 'kết tủa Cu(OH)₂ tan tạo dung dịch xanh thẫm (hợp chất phức, đặc trưng polyalcohol)'},
  {id: 'cu-glucose', priority: 5, reactants: {'Cu(OH)2': 1, glucose: 2}, products: {'Cu-polyol': 1}, eq: 'Cu(OH)₂ + 2C₆H₁₂O₆ → phức tan màu xanh thẫm', text: 'kết tủa Cu(OH)₂ tan tạo dung dịch xanh thẫm (glucose có nhiều nhóm –OH liền kề)'},
  {id: 'cu-sucrose', priority: 5, reactants: {'Cu(OH)2': 1, sucrose: 2}, products: {'Cu-polyol': 1}, eq: 'Cu(OH)₂ + 2C₁₂H₂₂O₁₁ → phức tan màu xanh thẫm', text: 'kết tủa Cu(OH)₂ tan tạo dung dịch xanh thẫm (saccharose có nhóm –OH liền kề)'},
  {id: 'glucose-cu2o', priority: 6, k: 0.05, minTemp: 60, reactants: {'Cu-polyol': 2, glucose: 1}, products: {Cu2O: 1, gluconate: 1}, eq: 'RCHO + 2Cu(OH)₂ → RCOOH + Cu₂O↓ + 2H₂O (đun nóng)', text: 'đun nóng xuất hiện kết tủa đỏ gạch Cu₂O (glucose có nhóm –CHO)'},
  {id: 'biuret', priority: 5, reactants: {protein: 1, 'Cu(OH)2': 1}, products: {'Cu-biuret': 1}, eq: 'peptide + Cu(OH)₂ → phức màu tím (phản ứng biuret)', text: 'dung dịch xuất hiện màu tím đặc trưng (phản ứng biuret)'},
  {id: 'aniline-br', priority: 4, reactants: {aniline: 1, 'Br2(aq)': 3}, products: {tribromoaniline: 1, 'Br-': 3, 'H+': 3}, eq: 'C₆H₅NH₂ + 3Br₂ → C₆H₂Br₃NH₂↓ + 3HBr', text: 'nước bromine mất màu, xuất hiện kết tủa trắng 2,4,6-tribromoaniline'},
  {id: 'c2h2-br', priority: 4, reactants: {C2H2: 1, 'Br2(aq)': 2}, products: {C2H2Br4: 1}, eq: 'C₂H₂ + 2Br₂ → C₂H₂Br₄', text: 'nước bromine mất màu (C₂H₂ có liên kết ba)'},
  {id: 'tollens', priority: 6, k: 0.05, minTemp: 50, catalysts: [], reactants: {'Ag(NH3)2+': 2, CH3CHO: 1}, products: {'Ag-mirror': 2, 'CH3COO-': 1}, eq: 'CH₃CHO + 2[Ag(NH₃)₂]OH → CH₃COONH₄ + 2Ag↓ + 3NH₃ + H₂O', text: 'có lớp bạc sáng bóng bám thành ống nghiệm (phản ứng tráng bạc)'},
  {id: 'hexane-br', priority: 6, k: 0.01, needsLight: true, reactants: {hexane: 1, 'Br2(aq)': 1}, products: {C6H13Br: 1, 'Br-': 1, 'H+': 1}, eq: 'C₆H₁₄ + Br₂ → C₆H₁₃Br + HBr (ánh sáng)', text: 'dưới ánh sáng nước bromine nhạt màu dần, có khói trắng HBr'},
  {id: 'starch-hydrolysis', priority: 6, k: 0.02, minTemp: 90, catalysts: ['H+'], reactants: {starch: 1}, products: {glucose: 1}, eq: '(C₆H₁₀O₅)ₙ + nH₂O → nC₆H₁₂O₆ (H⁺, đun nóng)', text: 'tinh bột bị thủy phân thành glucose khi đun với acid'},
  // chất xúc tác và tốc độ
  {id: 'h2o2-cat', priority: 6, k: 0.004, rateSpecies: ['H2O2'], catalysts: ['MnO2'], reactants: {H2O2: 2}, products: {O2: 1}, eq: '2H₂O₂ → 2H₂O + O₂↑ (xúc tác MnO₂)', text: 'sủi bọt khí O₂ rất mạnh khi có MnO₂', heat: -50},
  {id: 'h2o2-nocat', priority: 6, k: 0.000002, rateSpecies: ['H2O2'], reactants: {H2O2: 2}, products: {O2: 1}, eq: '2H₂O₂ → 2H₂O + O₂↑', text: 'H₂O₂ phân hủy rất chậm khi không có xúc tác'},
  {id: 's2o3-h', priority: 6, k: 0.002, rateSpecies: ['S2O3 2-'], reactants: {'S2O3 2-': 1, 'H+': 2}, products: {'S(coll)': 1, SO2: 1}, eq: 'Na₂S₂O₃ + H₂SO₄ → Na₂SO₄ + S↓ + SO₂ + H₂O', text: 'dung dịch dần đục màu vàng nhạt do lưu huỳnh tách ra'},
  {id: 'caco3c-h', priority: 6, k: 0.001, rateSpecies: ['H+'], reactants: {'CaCO3-coarse': 1, 'H+': 2}, products: {'Ca2+': 1, CO2: 1}, eq: 'CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O', text: 'đá vôi tan dần, sủi bọt khí CO₂'},
  {id: 'caco3f-h', priority: 6, k: 0.001, rateSpecies: ['H+'], reactants: {'CaCO3-fine': 1, 'H+': 2}, products: {'Ca2+': 1, CO2: 1}, eq: 'CaCO₃ + 2HCl → CaCl₂ + CO₂↑ + H₂O', text: 'đá vôi tan dần, sủi bọt khí CO₂'},
  // chất rắn và đun nóng
  {id: 'fe-s', priority: 6, k: 0.05, minTemp: 250, reactants: {Fe: 1, S: 1}, products: {FeS: 1}, eq: 'Fe + S → FeS (đun nóng)', heat: -100, text: 'hỗn hợp nóng sáng đỏ, thu được chất rắn màu đen (FeS)'},
  {id: 'cu-h2so4', priority: 6, k: 0.01, minTemp: 80, reactants: {Cu: 1, 'H2SO4(conc)': 2}, products: {'Cu2+': 1, 'SO4 2-': 1, SO2: 1}, eq: 'Cu + 2H₂SO₄ (đặc) → CuSO₄ + SO₂↑ + 2H₂O', text: 'Cu tan khi đun nóng, thoát khí SO₂ mùi hắc, dung dịch chuyển xanh lam'},
  {id: 'cac2-water', priority: 6, wet: true, k: 0.02, reactants: {CaC2: 1}, products: {C2H2: 1, 'Ca(OH)2(aq)': 1}, eq: 'CaC₂ + 2H₂O → C₂H₂↑ + Ca(OH)₂', text: 'thoát khí C₂H₂ mạnh (mùi tỏi)'},
  ...ACID_DISSOLVE,
  ...METAL_ACID,
  ...DISPLACEMENT,
];
