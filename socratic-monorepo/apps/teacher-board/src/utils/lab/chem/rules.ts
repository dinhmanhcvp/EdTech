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
  precip('Ca2+', 1, 'F-', 2, 'CaF2', 'Ca²⁺ + 2F⁻ → CaF₂↓', 'xuất hiện kết tủa trắng CaF₂ (ít tan)'),
  precip('Pb2+', 1, 'F-', 2, 'PbF2', 'Pb²⁺ + 2F⁻ → PbF₂↓', 'xuất hiện kết tủa trắng PbF₂'),
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

/** Đợt bổ sung: oxit kim loại, acid HNO₃, phosphate, chromate, phenol, benzene, este hóa, oxalic + KMnO₄ (tự xúc tác). */
const NEW_RULES: Rule[] = [
  {id: 'cuo-h', priority: 6, k: 0.02, minTemp: 40, rateSpecies: ['H+'], reactants: {CuO: 1, 'H+': 2}, products: {'Cu2+': 1}, eq: 'CuO + 2H⁺ → Cu²⁺ + H₂O', text: 'bột đen tan dần khi đun nóng nhẹ, dung dịch chuyển xanh lam (Cu²⁺)'},
  {id: 'fe2o3-h', priority: 6, k: 0.005, minTemp: 50, rateSpecies: ['H+'], reactants: {Fe2O3: 1, 'H+': 6}, products: {'Fe3+': 2}, eq: 'Fe₂O₃ + 6H⁺ → 2Fe³⁺ + 3H₂O', text: 'bột nâu đỏ tan chậm khi đun nóng, dung dịch chuyển vàng nâu (Fe³⁺)'},
  {id: 'cao-water', priority: 3, wet: true, reactants: {CaO: 1}, products: {'Ca(OH)2(aq)': 1}, eq: 'CaO + H₂O → Ca(OH)₂', heat: -65, text: 'tỏa rất nhiều nhiệt, vôi sống tan và vỡ vụn, tạo nước vôi (hơi đục)'},
  {id: 'cao-h', priority: 3, reactants: {CaO: 1, 'H+': 2}, products: {'Ca2+': 1}, eq: 'CaO + 2H⁺ → Ca²⁺ + H₂O', heat: -190, text: 'vôi sống tan nhanh trong acid, ống nóng lên mạnh'},
  {id: 'naoh-s-dissolve', priority: 1, wet: true, reactants: {'NaOH(s)': 1}, products: {'Na+': 1, 'OH-': 1}, eq: 'NaOH (rắn) → Na⁺ + OH⁻', heat: -44.5, text: 'viên NaOH tan nhanh, ống nghiệm nóng lên rõ rệt'},
  {id: 'ca-water', priority: 3, wet: true, k: 0.05, reactants: {Ca: 1}, products: {'Ca(OH)2(aq)': 1, H2: 1}, eq: 'Ca + 2H₂O → Ca(OH)₂ + H₂↑', heat: -414, text: 'canxi chìm, sủi bọt khí H₂ đều, dung dịch đục dần vì Ca(OH)₂ ít tan'},
  {id: 'ca-h', priority: 3, reactants: {Ca: 1, 'H+': 2}, products: {'Ca2+': 1, H2: 1}, eq: 'Ca + 2H⁺ → Ca²⁺ + H₂↑', heat: -543, text: 'sủi bọt khí H₂ rất mạnh, ống nóng lên'},
  {id: 'hno3-dil', priority: 1, wet: true, reactants: {'HNO3(conc)': 1}, products: {'H+': 1, 'NO3-': 1}, eq: 'HNO₃ đặc + nước → H⁺ + NO₃⁻', heat: -33, text: 'pha loãng HNO₃ đặc: ống nóng lên (luôn rót acid vào nước)'},
  {id: 'cu-hno3-conc', priority: 3, reactants: {Cu: 1, 'HNO3(conc)': 4}, products: {'Cu2+': 1, 'NO3-': 2, NO2: 2}, eq: 'Cu + 4HNO₃ (đặc) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O', heat: -150, text: 'đồng tan nhanh, dung dịch xanh lục, thoát khí NO₂ màu nâu đỏ, mùi hắc (rất độc)'},
  {id: 'cu-hno3-dil', priority: 6, k: 0.002, rateSpecies: ['H+'], reactants: {Cu: 3, 'H+': 8, 'NO3-': 2}, products: {'Cu2+': 3, NO: 2}, eq: '3Cu + 8H⁺ + 2NO₃⁻ → 3Cu²⁺ + 2NO↑ + 4H₂O', text: 'đồng tan chậm, dung dịch xanh lam, khí NO không màu thoát ra rồi hóa nâu đỏ khi gặp không khí'},
  precip('Ag+', 1, 'PO4 3-', 3, 'Ag3PO4', '3Ag⁺ + PO₄³⁻ → Ag₃PO₄↓', 'xuất hiện kết tủa vàng Ag₃PO₄'),
  precip('Ba2+', 2, 'PO4 3-', 3, 'Ba3(PO4)2', '3Ba²⁺ + 2PO₄³⁻ → Ba₃(PO₄)₂↓', 'xuất hiện kết tủa trắng Ba₃(PO₄)₂'),
  precip('Ca2+', 2, 'PO4 3-', 3, 'Ca3(PO4)2', '3Ca²⁺ + 2PO₄³⁻ → Ca₃(PO₄)₂↓', 'xuất hiện kết tủa trắng Ca₃(PO₄)₂'),
  precip('Ba2+', 2, 'CrO4 2-', 2, 'BaCrO4', 'Ba²⁺ + CrO₄²⁻ → BaCrO₄↓', 'xuất hiện kết tủa vàng BaCrO₄'),
  precip('Pb2+', 2, 'CrO4 2-', 2, 'PbCrO4', 'Pb²⁺ + CrO₄²⁻ → PbCrO₄↓', 'xuất hiện kết tủa vàng PbCrO₄'),
  precip('Ag+', 1, 'CrO4 2-', 2, 'Ag2CrO4', '2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄↓', 'xuất hiện kết tủa đỏ gạch Ag₂CrO₄'),
  {id: 'cro4-h', priority: 3, reactants: {'CrO4 2-': 2, 'H+': 2}, products: {'Cr2O7 2-': 1}, eq: '2CrO₄²⁻ + 2H⁺ ⇌ Cr₂O₇²⁻ + H₂O', text: 'màu vàng của chromate chuyển sang da cam (dichromate) khi thêm acid'},
  {id: 'cr2o7-oh', priority: 3, reactants: {'Cr2O7 2-': 1, 'OH-': 2}, products: {'CrO4 2-': 2}, eq: 'Cr₂O₇²⁻ + 2OH⁻ ⇌ 2CrO₄²⁻ + H₂O', text: 'màu da cam trở lại vàng khi thêm base'},
  {id: 'phenol-br', priority: 4, reactants: {C6H5OH: 1, 'Br2(aq)': 3}, products: {tribromophenol: 1}, eq: 'C₆H₅OH + 3Br₂ → C₆H₂Br₃OH↓ + 3HBr', text: 'màu cam của nước brom mất ngay, xuất hiện kết tủa trắng 2,4,6-tribromophenol'},
  {id: 'phenol-fe3', priority: 4, reactants: {C6H5OH: 6, 'Fe3+': 1}, products: {'Fe-phenol': 1}, eq: '6C₆H₅OH + Fe³⁺ → [Fe(OC₆H₅)₆]³⁻ + 6H⁺', text: 'dung dịch xuất hiện màu tím đặc trưng (nhận biết phenol)'},
  {id: 'phenol-oh', priority: 2, reactants: {C6H5OH: 1, 'OH-': 1}, products: {'C6H5O-': 1}, eq: 'C₆H₅OH + OH⁻ → C₆H₅O⁻ + H₂O', text: 'phenol (đục nhẹ) tan, tạo dung dịch trong suốt natri phenolat: phenol có tính acid yếu'},
  {id: 'benzene-br', priority: 6, k: 0.003, catalysts: ['Fe'], reactants: {C6H6: 1, 'Br2(aq)': 1}, products: {C6H5Br: 1}, eq: 'C₆H₆ + Br₂ → C₆H₅Br + HBr (xúc tác bột Fe)', text: 'màu cam của brom nhạt dần, có khói trắng HBr; không có bột sắt thì benzene KHÔNG làm mất màu nước brom'},
  {id: 'esterify', priority: 6, k: 0.004, minTemp: 60, catalysts: ['H2SO4(conc)'], reactants: {CH3COOH: 1, C2H5OH: 1}, products: {CH3COOC2H5: 1}, eq: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O (H₂SO₄ đặc, đun nóng)', text: 'có mùi thơm dịu của este (ethyl acetate), lớp chất lỏng nhẹ không tan nổi lên trên'},
  {id: 'oxalic-mno4-slow', priority: 6, k: 0.002, rateSpecies: ['MnO4-'], reactants: {H2C2O4: 5, 'MnO4-': 2, 'H+': 6}, products: {CO2: 10, 'Mn2+': 2}, eq: '5H₂C₂O₄ + 2MnO₄⁻ + 6H⁺ → 10CO₂↑ + 2Mn²⁺ + 8H₂O', text: 'màu tím nhạt đi rất chậm lúc đầu'},
  {id: 'oxalic-mno4-auto', priority: 6, k: 0.08, rateSpecies: ['MnO4-'], catalysts: ['Mn2+'], reactants: {H2C2O4: 5, 'MnO4-': 2, 'H+': 6}, products: {CO2: 10, 'Mn2+': 2}, eq: '5H₂C₂O₄ + 2MnO₄⁻ + 6H⁺ → 10CO₂↑ + 2Mn²⁺ + 8H₂O (Mn²⁺ xúc tác)', text: 'sau một lúc màu tím mất nhanh, sủi bọt CO₂: Mn²⁺ tạo ra làm phản ứng tự tăng tốc'},
  // ---- acid hữu cơ
  {id: 'hcooh-co3', priority: 2, reactants: {'CO3 2-': 1, HCOOH: 2}, products: {CO2: 1, 'HCOO-': 2}, eq: 'CO₃²⁻ + 2HCOOH → 2HCOO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂): formic acid mạnh hơn H₂CO₃'},
  {id: 'hcooh-hco3', priority: 2, reactants: {'HCO3-': 1, HCOOH: 1}, products: {CO2: 1, 'HCOO-': 1}, eq: 'HCO₃⁻ + HCOOH → HCOO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'hcooh-oh', priority: 1, reactants: {HCOOH: 1, 'OH-': 1}, products: {'HCOO-': 1}, eq: 'HCOOH + OH⁻ → HCOO⁻ + H₂O', text: 'mùi xốc của acid nhạt dần, dung dịch ấm lên', heat: -55},
  {id: 'hcooh-mg', priority: 6, k: 0.0008, rateSpecies: ['HCOOH'], reactants: {Mg: 1, HCOOH: 2}, products: {'Mg2+': 1, 'HCOO-': 2, H2: 1}, eq: 'Mg + 2HCOOH → (HCOO)₂Mg + H₂↑', text: 'Mg tan, sủi bọt khí H₂'},
  {id: 'hcooh-tollens', priority: 6, k: 0.05, minTemp: 50, reactants: {'Ag(NH3)2+': 2, HCOOH: 1}, products: {'Ag-mirror': 2}, eq: 'HCOOH + 2[Ag(NH₃)₂]⁺ → CO₂ + 2Ag↓ + 4NH₃ + H₂O (đun nóng)', text: 'có lớp bạc sáng bóng bám thành ống: formic acid có nhóm –CHO nên tráng bạc được (acetic acid thì không)'},
  {id: 'hcooh-mno4', priority: 6, k: 0.03, rateSpecies: ['MnO4-'], reactants: {HCOOH: 5, 'MnO4-': 2, 'H+': 6}, products: {CO2: 5, 'Mn2+': 2}, eq: '5HCOOH + 2MnO₄⁻ + 6H⁺ → 5CO₂↑ + 2Mn²⁺ + 8H₂O', text: 'màu tím của KMnO₄ nhạt dần, sủi bọt CO₂: formic acid có tính khử'},
  {id: 'citric-hco3', priority: 2, reactants: {citric: 1, 'HCO3-': 3}, products: {CO2: 3, 'Cit3-': 1}, eq: 'H₃Cit + 3HCO₃⁻ → Cit³⁻ + 3CO₂↑ + 3H₂O', text: 'sủi bọt mạnh khí CO₂ (viên sủi: citric acid + NaHCO₃)'},
  {id: 'citric-co3', priority: 2, reactants: {citric: 2, 'CO3 2-': 3}, products: {CO2: 3, 'Cit3-': 2}, eq: '2H₃Cit + 3CO₃²⁻ → 2Cit³⁻ + 3CO₂↑ + 3H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'citric-oh', priority: 1, reactants: {citric: 1, 'OH-': 3}, products: {'Cit3-': 1}, eq: 'H₃Cit + 3OH⁻ → Cit³⁻ + 3H₂O', text: 'không đổi màu; dung dịch ấm lên và hết vị chua', heat: -150},
  {id: 'benzoic-oh', priority: 5, reactants: {'C6H5COOH(s)': 1, 'OH-': 1}, products: {'C6H5COO-': 1}, eq: 'C₆H₅COOH (rắn) + OH⁻ → C₆H₅COO⁻ + H₂O', text: 'bột trắng ít tan trong nước tan hết trong NaOH, tạo natri benzoat'},
  {id: 'benzoate-h', priority: 4, reactants: {'C6H5COO-': 1, 'H+': 1}, products: {'C6H5COOH(s)': 1}, eq: 'C₆H₅COO⁻ + H⁺ → C₆H₅COOH↓', text: 'xuất hiện kết tủa trắng acid benzoic (acid mạnh đẩy acid yếu, ít tan)'},
  {id: 'benzoic-hco3', priority: 6, k: 0.01, reactants: {'C6H5COOH(s)': 1, 'HCO3-': 1}, products: {'C6H5COO-': 1, CO2: 1}, eq: 'C₆H₅COOH + HCO₃⁻ → C₆H₅COO⁻ + CO₂↑ + H₂O', text: 'bột trắng tan dần, sủi bọt khí CO₂'},
  {id: 'oleic-br', priority: 6, k: 0.03, reactants: {oleic: 1, 'Br2(aq)': 1}, products: {'oleic-Br2': 1}, eq: 'C₁₇H₃₃COOH + Br₂ → C₁₇H₃₃Br₂COOH', text: 'màu cam của nước brom nhạt dần rồi mất màu: oleic acid có nối đôi C=C (stearic acid thì không)'},
  {id: 'stearic-oh', priority: 6, k: 0.01, minTemp: 60, reactants: {'stearic(s)': 1, 'OH-': 1}, products: {stearate: 1}, eq: 'C₁₇H₃₅COOH + OH⁻ → C₁₇H₃₅COO⁻ + H₂O (đun nóng)', text: 'sáp tan dần khi đun nóng với kiềm, tạo xà phòng (muối stearate)'},
  // ---- amine và amino acid
  {id: 'mea-h', priority: 1, reactants: {CH3NH2: 1, 'H+': 1}, products: {'CH3NH3+': 1}, eq: 'CH₃NH₂ + H⁺ → CH₃NH₃⁺', text: 'mùi tanh giảm dần: methylamine là base, bị acid trung hòa'},
  {id: 'mea-ac', priority: 1, reactants: {CH3NH2: 1, CH3COOH: 1}, products: {'CH3NH3+': 1, 'CH3COO-': 1}, eq: 'CH₃NH₂ + CH₃COOH → CH₃NH₃⁺ + CH₃COO⁻', text: 'mùi khai của amine và mùi giấm cùng nhạt đi, dung dịch ấm lên', heat: -50},
  {id: 'mea-fe3', priority: 4, reactants: {CH3NH2: 3, 'Fe3+': 1}, products: {'Fe(OH)3': 1, 'CH3NH3+': 3}, eq: 'Fe³⁺ + 3CH₃NH₂ + 3H₂O → Fe(OH)₃↓ + 3CH₃NH₃⁺', text: 'xuất hiện kết tủa nâu đỏ Fe(OH)₃ (amine làm môi trường kiềm)'},
  {id: 'mea-al3', priority: 4, reactants: {CH3NH2: 3, 'Al3+': 1}, products: {'Al(OH)3': 1, 'CH3NH3+': 3}, eq: 'Al³⁺ + 3CH₃NH₂ + 3H₂O → Al(OH)₃↓ + 3CH₃NH₃⁺', text: 'xuất hiện kết tủa keo trắng Al(OH)₃ (không tan trong amine dư)'},
  {id: 'mea-cu2', priority: 4, reactants: {CH3NH2: 2, 'Cu2+': 1}, products: {'Cu(OH)2': 1, 'CH3NH3+': 2}, eq: 'Cu²⁺ + 2CH₃NH₂ + 2H₂O → Cu(OH)₂↓ + 2CH₃NH₃⁺', text: 'xuất hiện kết tủa xanh lam Cu(OH)₂'},
  {id: 'mea-cu2-ex', priority: 5, reactants: {'Cu(OH)2': 1, CH3NH2: 4}, products: {'Cu(MeNH2)4 2+': 1}, eq: 'Cu(OH)₂ + 4CH₃NH₂ → [Cu(CH₃NH₂)₄]²⁺ + 2OH⁻', text: 'kết tủa tan trong amine dư tạo dung dịch xanh thẫm (phức)'},
  {id: 'aniline-h', priority: 2, reactants: {aniline: 1, 'H+': 1}, products: {'C6H5NH3+': 1}, eq: 'C₆H₅NH₂ + H⁺ → C₆H₅NH₃⁺', text: 'aniline (ít tan, giọt dầu) tan tạo dung dịch trong suốt phenylammonium: aniline là base yếu'},
  {id: 'aniline-oh', priority: 2, reactants: {'C6H5NH3+': 1, 'OH-': 1}, products: {aniline: 1}, eq: 'C₆H₅NH₃⁺ + OH⁻ → C₆H₅NH₂ + H₂O', text: 'dung dịch trong trở lại: base mạnh hơn đẩy aniline ra khỏi muối'},
  {id: 'gly-h', priority: 1, reactants: {Gly: 1, 'H+': 1}, products: {'GlyH+': 1}, eq: 'H₂NCH₂COOH + H⁺ → ⁺H₃NCH₂COOH', text: 'glycine nhận H⁺ ở nhóm –NH₂: có tính base'},
  {id: 'gly-oh', priority: 1, reactants: {Gly: 1, 'OH-': 1}, products: {'Gly-': 1}, eq: 'H₂NCH₂COOH + OH⁻ → H₂NCH₂COO⁻ + H₂O', text: 'glycine nhường H⁺ ở nhóm –COOH: có tính acid (lưỡng tính)'},
  // ---- este và chất béo: thủy phân, xà phòng hóa
  {id: 'ester-oh', priority: 6, k: 0.002, minTemp: 60, reactants: {CH3COOC2H5: 1, 'OH-': 1}, products: {'CH3COO-': 1, C2H5OH: 1}, eq: 'CH₃COOC₂H₅ + NaOH → CH₃COONa + C₂H₅OH (đun nóng)', text: 'lớp este nổi phía trên tan dần, mất mùi thơm, dung dịch thành đồng nhất: thủy phân trong kiềm là một chiều'},
  {id: 'ester-h', priority: 6, k: 0.00005, minTemp: 70, catalysts: ['H+'], reactants: {CH3COOC2H5: 1}, products: {CH3COOH: 1, C2H5OH: 1}, eq: 'CH₃COOC₂H₅ + H₂O ⇌ CH₃COOH + C₂H₅OH (H⁺, đun nóng)', text: 'lớp este vơi rất chậm và vẫn còn mùi thơm: thủy phân trong acid là thuận nghịch, không hoàn toàn'},
  {id: 'fat-oh', priority: 6, k: 0.002, minTemp: 80, reactants: {'fat(s)': 1, 'OH-': 3}, products: {stearate: 3, glycerol: 1}, eq: '(C₁₇H₃₅COO)₃C₃H₅ + 3NaOH → 3C₁₇H₃₅COONa + C₃H₅(OH)₃ (đun nóng)', text: 'mỡ tan dần khi đun với kiềm, dung dịch sánh và có bọt: xà phòng hóa tạo xà phòng và glycerol'},
  {id: 'soap-ca', priority: 4, reactants: {stearate: 2, 'Ca2+': 1}, products: {'Ca-stearate': 1}, eq: '2C₁₇H₃₅COO⁻ + Ca²⁺ → (C₁₇H₃₅COO)₂Ca↓', text: 'xuất hiện kết tủa trắng canxi stearate: nước cứng làm xà phòng mất tác dụng'},
  {id: 'soap-h', priority: 4, reactants: {stearate: 1, 'H+': 1}, products: {'stearic(s)': 1}, eq: 'C₁₇H₃₅COO⁻ + H⁺ → C₁₇H₃₅COOH↓', text: 'acid béo tách ra thành váng trắng: acid mạnh đẩy acid béo khỏi xà phòng'},
  // ---- amide và urea
  {id: 'amide-oh', priority: 6, k: 0.002, minTemp: 80, reactants: {CH3CONH2: 1, 'OH-': 1}, products: {'CH3COO-': 1, 'NH3(aq)': 1}, eq: 'CH₃CONH₂ + NaOH → CH₃COONa + NH₃↑ (đun nóng)', text: 'đun với kiềm: amide bị thủy phân, có khí mùi khai làm xanh quỳ ẩm'},
  {id: 'amide-h', priority: 6, k: 0.002, minTemp: 80, reactants: {CH3CONH2: 1, 'H+': 1}, products: {CH3COOH: 1, 'NH4+': 1}, eq: 'CH₃CONH₂ + H₂O + H⁺ → CH₃COOH + NH₄⁺ (đun nóng)', text: 'đun với acid: amide bị thủy phân, có mùi giấm (không có khí khai vì NH₃ bị giữ ở dạng NH₄⁺)'},
  {id: 'urea-oh', priority: 6, k: 0.002, minTemp: 80, reactants: {urea: 1, 'OH-': 2}, products: {'CO3 2-': 1, 'NH3(aq)': 2}, eq: '(NH₂)₂CO + 2NaOH → Na₂CO₃ + 2NH₃↑ (đun nóng)', text: 'đun urea với kiềm: thoát khí mùi khai (NH₃)'},
  {id: 'urea-h', priority: 6, k: 0.002, minTemp: 80, reactants: {urea: 1, 'H+': 2}, products: {CO2: 1, 'NH4+': 2}, eq: '(NH₂)₂CO + H₂O + 2H⁺ → CO₂↑ + 2NH₄⁺ (đun nóng)', text: 'đun urea với acid: sủi bọt khí CO₂'},
  {id: 'urea-hno2', priority: 3, reactants: {urea: 1, 'NO2-': 2, 'H+': 2}, products: {CO2: 1, N2: 2}, eq: '(NH₂)₂CO + 2HNO₂ → CO₂↑ + 2N₂↑ + 3H₂O', text: 'sủi bọt mạnh khí không màu (N₂ và CO₂): urea khử nitrous acid'},
  // ---- protein
  {id: 'xantho', priority: 0, catalysts: ['HNO3(conc)'], reactants: {protein: 1}, products: {xantho: 1}, eq: 'protein (vòng benzene của tyrosine) + HNO₃ đặc → sản phẩm nitro hóa màu vàng', text: 'lòng trắng trứng đông lại và chuyển màu vàng: phản ứng màu của protein với HNO₃ đặc'},
  {id: 'protein-coag', priority: 5, minTemp: 70, reactants: {protein: 1}, products: {'protein(coag)': 1}, eq: 'protein (tan) → protein đông tụ (đun nóng)', text: 'dung dịch vẩn đục rồi đóng thành mảng trắng: protein đông tụ khi đun nóng'},
  {id: 'protein-hydro-h', priority: 6, k: 0.002, minTemp: 90, catalysts: ['H+'], reactants: {'protein(coag)': 1}, products: {'aa-mix': 5}, eq: 'protein + nH₂O → các amino acid (H⁺, đun sôi)', text: 'đun sôi lâu với acid: mảng protein tan dần, bị thủy phân thành các amino acid (không còn phản ứng biuret)'},
  {id: 'protein-hydro-oh', priority: 6, k: 0.002, minTemp: 90, catalysts: ['OH-'], reactants: {'protein(coag)': 1}, products: {'aa-mix': 5}, eq: 'protein + nH₂O → các amino acid (OH⁻, đun sôi)', text: 'đun sôi lâu với kiềm: mảng protein tan dần, bị thủy phân thành muối của các amino acid'},
  // ---- amino acid khác
  {id: 'lys-h', priority: 1, reactants: {Lys: 1, 'H+': 2}, products: {'LysH2 2+': 1}, eq: 'Lys + 2H⁺ → LysH₂²⁺', text: 'lysine có hai nhóm –NH₂ nên nhận tới hai H⁺: dung dịch lysine làm quỳ tím hóa xanh'},
  {id: 'lys-oh', priority: 1, reactants: {Lys: 1, 'OH-': 1}, products: {'Lys-': 1}, eq: 'Lys + OH⁻ → Lys⁻ + H₂O', text: 'không thấy thay đổi bằng mắt; pH giảm dần so với kiềm ban đầu vì nhóm COOH của lysine đã trung hòa OH⁻'},
  {id: 'glu-h', priority: 1, reactants: {Glu: 1, 'H+': 1}, products: {'GluH+': 1}, eq: 'Glu + H⁺ → GluH⁺', text: 'không thấy thay đổi bằng mắt; pH tăng so với acid ban đầu vì nhóm NH₂ của glutamic acid đã nhận H⁺'},
  {id: 'glu-oh', priority: 1, reactants: {Glu: 1, 'OH-': 1}, products: {'Glu-': 1}, eq: 'HOOC[CH₂]₂CH(NH₂)COOH + NaOH → mononatri glutamat + H₂O', text: 'glutamic acid có hai nhóm –COOH nên làm quỳ tím hóa đỏ; trung hòa một nấc tạo mononatri glutamat (mì chính)'},
  {id: 'glu-oh2', priority: 1, reactants: {'Glu-': 1, 'OH-': 1}, products: {'Glu2-': 1}, eq: 'mononatri glutamat + NaOH → đinatri glutamat + H₂O', text: 'không thấy thay đổi bằng mắt; nhóm COOH thứ hai bị trung hòa, dung dịch bớt kiềm'},
  {id: 'glu-hco3', priority: 2, reactants: {Glu: 1, 'HCO3-': 1}, products: {'Glu-': 1, CO2: 1}, eq: 'Glu + HCO₃⁻ → Glu⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí CO₂: glutamic acid mạnh hơn H₂CO₃'},
  {id: 'ala-h', priority: 1, reactants: {Ala: 1, 'H+': 1}, products: {'AlaH+': 1}, eq: 'CH₃CH(NH₂)COOH + H⁺ → CH₃CH(NH₃⁺)COOH', text: 'không thấy thay đổi bằng mắt; pH tăng so với acid ban đầu vì nhóm NH₂ của alanine đã nhận H⁺'},
  {id: 'ala-oh', priority: 1, reactants: {Ala: 1, 'OH-': 1}, products: {'Ala-': 1}, eq: 'CH₃CH(NH₂)COOH + OH⁻ → CH₃CH(NH₂)COO⁻ + H₂O', text: 'alanine lưỡng tính như glycine: tác dụng được với cả acid và base'},
  {id: 'gly-hno2', priority: 3, reactants: {'GlyH+': 1, 'NO2-': 1}, products: {glycolic: 1, N2: 1}, eq: 'H₂NCH₂COOH + HNO₂ → HOCH₂COOH + N₂↑ + H₂O', text: 'sủi bọt khí N₂: nhóm –NH₂ bậc một của amino acid bị HNO₂ thay bằng –OH'},
  {id: 'ala-hno2', priority: 3, reactants: {'AlaH+': 1, 'NO2-': 1}, products: {lactic: 1, N2: 1}, eq: 'CH₃CH(NH₂)COOH + HNO₂ → CH₃CH(OH)COOH + N₂↑ + H₂O', text: 'sủi bọt khí N₂, tạo lactic acid'},
  // ---- diazo hóa aniline (phải làm lạnh 0–5 °C)
  {id: 'ice-melt', priority: 1, reactants: {ice: 1}, products: {}, eq: 'nước đá → nước (thu nhiệt)', heat: 6.01, text: 'nước đá tan, ống nghiệm lạnh hẳn đi'},
  {id: 'diazo', priority: 3, reactants: {'C6H5NH3+': 1, 'NO2-': 1, 'H+': 1}, products: {'C6H5N2+': 1}, eq: 'C₆H₅NH₂ + NaNO₂ + 2HCl → C₆H₅N₂⁺Cl⁻ + NaCl + 2H₂O (0–5 °C)', text: 'tạo muối benzenediazonium, dung dịch trong suốt; muối này chỉ bền khi giữ lạnh 0–5 °C'},
  {id: 'diazo-decomp', priority: 6, k: 0.05, minTemp: 10, reactants: {'C6H5N2+': 1}, products: {C6H5OH: 1, N2: 1, 'H+': 1}, eq: 'C₆H₅N₂⁺ + H₂O → C₆H₅OH + N₂↑ + H⁺', text: 'dung dịch ấm lên: muối diazonium phân hủy, sủi bọt khí N₂ và có mùi phenol'},
  {id: 'azo', priority: 2, reactants: {'C6H5N2+': 1, naphtholate: 1}, products: {'azo-dye': 1}, eq: 'C₆H₅N₂⁺ + C₁₀H₇O⁻ → C₆H₅–N=N–C₁₀H₆OH↓', text: 'xuất hiện ngay kết tủa đỏ cam: phẩm nhuộm azo (phản ứng ghép đôi)'},
  {id: 'mea-hno2', priority: 3, reactants: {'CH3NH3+': 1, 'NO2-': 1}, products: {CH3OH: 1, N2: 1}, eq: 'CH₃NH₂ + HNO₂ → CH₃OH + N₂↑ + H₂O', text: 'sủi bọt khí N₂ ngay cả khi lạnh: amine béo bậc một không cho muối diazonium bền như aniline'},
  // ---- nitro hóa benzene
  {id: 'nitration', priority: 6, k: 0.01, minTemp: 50, catalysts: ['H2SO4(conc)'], reactants: {C6H6: 1, 'HNO3(conc)': 1}, products: {C6H5NO2: 1}, eq: 'C₆H₆ + HNO₃ (đặc) → C₆H₅NO₂ + H₂O (H₂SO₄ đặc, 50–60 °C)', text: 'xuất hiện chất lỏng sánh màu vàng nhạt, mùi hạnh nhân đắng, nặng hơn nước (nitrobenzene, độc)'},
  // ---- polime
  {id: 'pe-melt', priority: 5, minTemp: 110, reactants: {'PE(s)': 1}, products: {'PE(melt)': 1}, eq: 'PE (rắn) → PE (chảy nhớt) khi đun nóng', text: 'mẩu PE mềm ra rồi chảy thành chất lỏng nhớt, để nguội lại rắn: nhựa nhiệt dẻo; PE không tác dụng với acid và kiềm'},
  {id: 'pvc-oh', priority: 6, k: 0.002, minTemp: 80, reactants: {'PVC(s)': 1, 'OH-': 1}, products: {'polyene(s)': 1, 'Cl-': 1}, eq: '(C₂H₃Cl)ₙ + nNaOH → (C₂H₂)ₙ + nNaCl + nH₂O (đun nóng)', text: 'đun với kiềm: mẩu PVC ngả nâu, clo tách ra thành ion Cl⁻ trong dung dịch (acid hóa bằng HNO₃ rồi thử AgNO₃)'},
  {id: 'pvc-heat', priority: 6, k: 0.05, minTemp: 200, reactants: {'PVC(s)': 1}, products: {'polyene(s)': 1, 'HCl(g)': 1}, eq: '(C₂H₃Cl)ₙ → (C₂H₂)ₙ + nHCl↑ (nung nóng)', text: 'PVC hóa nâu đen, thoát khói trắng mùi xốc (HCl)'},
  {id: 'wool-oh', priority: 6, k: 0.002, minTemp: 80, catalysts: ['OH-'], reactants: {'wool(s)': 1}, products: {peptide: 1}, eq: 'sợi len (protein) + H₂O → polypeptide tan (OH⁻, đun nóng)', text: 'sợi len tan dần trong kiềm nóng (liên kết peptide bị thủy phân); sợi bông thì không tan'},
  {id: 'biuret-peptide', priority: 5, reactants: {peptide: 1, 'Cu(OH)2': 1}, products: {'Cu-biuret': 1}, eq: 'polypeptide + Cu(OH)₂ → phức màu tím (phản ứng biuret)', text: 'dung dịch xuất hiện màu tím: len là protein'},
  {id: 'cotton-char', priority: 6, k: 0.02, catalysts: ['H2SO4(conc)'], reactants: {'cotton(s)': 1}, products: {'C(char)': 1}, eq: '(C₆H₁₀O₅)ₙ → 6nC + 5nH₂O (H₂SO₄ đặc hút nước)', text: 'sợi bông hóa đen: H₂SO₄ đặc hút nước làm cellulose bị than hóa; bông không tan trong kiềm'},
  {id: 'novolac', priority: 6, k: 0.005, minTemp: 80, catalysts: ['H+'], reactants: {C6H5OH: 1, HCHO: 1}, products: {'novolac(s)': 1}, eq: 'nC₆H₅OH + nHCHO → nhựa novolac + nH₂O (H⁺, đun nóng)', text: 'dung dịch đục dần rồi tách ra khối nhựa dẻo màu hồng nhạt: trùng ngưng phenol với formaldehyde'},
  {id: 'hcho-tollens', priority: 6, k: 0.05, minTemp: 50, reactants: {'Ag(NH3)2+': 4, HCHO: 1}, products: {'Ag-mirror': 4, 'CO3 2-': 1}, eq: 'HCHO + 4[Ag(NH₃)₂]OH → (NH₄)₂CO₃ + 4Ag↓ + 6NH₃ + 2H₂O', text: 'có lớp bạc sáng bóng bám thành ống: một phân tử formaldehyde cho tới 4 Ag'},
  {id: 'nylon', priority: 4, reactants: {HMDA: 1, adipoyl: 1}, products: {'nylon66(s)': 1, 'Cl-': 2, 'H+': 2}, eq: 'nH₂N[CH₂]₆NH₂ + nClOC[CH₂]₄COCl → nilon-6,6 + 2nHCl', text: 'ở mặt tiếp xúc hai chất lỏng xuất hiện ngay một màng trắng dai, kéo lên được thành sợi (nilon-6,6: trùng ngưng)'},
  // ---- thụ động hóa Fe, Al trong acid đặc nguội
  {id: 'fe-passive-hno3', priority: 2, catalysts: ['HNO3(conc)'], reactants: {Fe: 1}, products: {'Fe(passive)': 1}, eq: 'Fe + HNO₃ đặc, nguội → không tan (thụ động hóa)', text: 'sắt KHÔNG tan trong HNO₃ đặc nguội: một màng oxide bền phủ kín bề mặt; sắt đã thụ động cũng không đẩy được Cu²⁺ khỏi dung dịch'},
  {id: 'al-passive-hno3', priority: 2, catalysts: ['HNO3(conc)'], reactants: {Al: 1}, products: {'Al(passive)': 1}, eq: 'Al + HNO₃ đặc, nguội → không tan (thụ động hóa)', text: 'nhôm KHÔNG tan trong HNO₃ đặc nguội (thụ động hóa): vì thế dùng thùng nhôm, thùng sắt chở HNO₃ đặc'},
  {id: 'fe-passive-h2so4', priority: 2, catalysts: ['H2SO4(conc)'], reactants: {Fe: 1}, products: {'Fe(passive)': 1}, eq: 'Fe + H₂SO₄ đặc, nguội → không tan (thụ động hóa)', text: 'sắt KHÔNG tan trong H₂SO₄ đặc nguội (thụ động hóa)'},
  {id: 'al-passive-h2so4', priority: 2, catalysts: ['H2SO4(conc)'], reactants: {Al: 1}, products: {'Al(passive)': 1}, eq: 'Al + H₂SO₄ đặc, nguội → không tan (thụ động hóa)', text: 'nhôm KHÔNG tan trong H₂SO₄ đặc nguội (thụ động hóa)'},
  {id: 'fe-hno3-hot', priority: 6, k: 0.02, minTemp: 60, reactants: {'Fe(passive)': 1, 'HNO3(conc)': 6}, products: {'Fe3+': 1, 'NO3-': 3, NO2: 3}, eq: 'Fe + 6HNO₃ (đặc, nóng) → Fe(NO₃)₃ + 3NO₂↑ + 3H₂O', text: 'đun nóng: màng thụ động bị phá, sắt tan, thoát khí NO₂ nâu đỏ (rất độc), dung dịch vàng nâu'},
  {id: 'al-hno3-hot', priority: 6, k: 0.02, minTemp: 60, reactants: {'Al(passive)': 1, 'HNO3(conc)': 6}, products: {'Al3+': 1, 'NO3-': 3, NO2: 3}, eq: 'Al + 6HNO₃ (đặc, nóng) → Al(NO₃)₃ + 3NO₂↑ + 3H₂O', text: 'đun nóng: nhôm tan, thoát khí NO₂ nâu đỏ (rất độc)'},
];

export const RULES: Rule[] = [
  // trung hòa và acid–base (ưu tiên 1)
  {id: 'neut', priority: 1, reactants: {'H+': 1, 'OH-': 1}, products: {}, eq: 'H⁺ + OH⁻ → H₂O', text: 'không có kết tủa hay khí; ống nghiệm ấm lên vì phản ứng trung hòa tỏa nhiệt (có chất chỉ thị thì thấy đổi màu)', heat: -57.3},
  {id: 'neut-ac', priority: 1, reactants: {CH3COOH: 1, 'OH-': 1}, products: {'CH3COO-': 1}, eq: 'CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O', text: 'mùi giấm nhạt dần, dung dịch ấm lên', heat: -55},
  {id: 'nh3-h', priority: 1, reactants: {'NH3(aq)': 1, 'H+': 1}, products: {'NH4+': 1}, eq: 'NH₃ + H⁺ → NH₄⁺', text: 'mùi khai mất dần, dung dịch vẫn trong suốt không màu'},
  {id: 'h2so4-dil', priority: 1, wet: true, reactants: {'H2SO4(conc)': 1}, products: {'H+': 2, 'SO4 2-': 1}, eq: 'H₂SO₄ đặc + nước → 2H⁺ + SO₄²⁻', heat: -75, text: 'ống nghiệm nóng lên rất mạnh khi acid đặc gặp nước'},
  {id: 'nacl-dissolve', priority: 1, wet: true, reactants: {'NaCl(s)': 1}, products: {'Na+': 1, 'Cl-': 1}, eq: 'NaCl (rắn) → Na⁺ + Cl⁻', text: 'hạt muối tan dần, dung dịch trong suốt không màu, dẫn điện'},
  {id: 'sugar-dissolve', priority: 1, wet: true, reactants: {'sucrose(s)': 1}, products: {sucrose: 1}, eq: 'saccharose (rắn) → saccharose (dung dịch)', text: 'đường tan dần, dung dịch trong suốt, hơi sánh, không dẫn điện'},
  {id: 'nahco3-dissolve', priority: 1, wet: true, reactants: {'NaHCO3(s)': 1}, products: {'Na+': 1, 'HCO3-': 1}, eq: 'NaHCO₃ (rắn) → Na⁺ + HCO₃⁻', text: 'bột trắng tan dần, dung dịch không màu có tính kiềm yếu'},
  // sinh khí (ưu tiên 2)
  {id: 'ac-h', priority: 2, reactants: {'CH3COO-': 1, 'H+': 1}, products: {CH3COOH: 1}, eq: 'CH₃COO⁻ + H⁺ → CH₃COOH', text: 'có mùi giấm (CH₃COOH): acid mạnh đẩy acid yếu ra khỏi muối'},
  {id: 'mno2-hcl', priority: 6, k: 0.01, minTemp: 80, rateSpecies: ['H+'], reactants: {MnO2: 1, 'H+': 4, 'Cl-': 2}, products: {'Mn2+': 1, 'Cl2(aq)': 1}, eq: 'MnO₂ + 4HCl → MnCl₂ + Cl₂↑ + 2H₂O', text: 'đun nóng: chất rắn đen tan dần, thoát khí vàng lục mùi hắc (Cl₂, độc)'},
  {id: 'ethanol-mno4', priority: 6, k: 0.02, rateSpecies: ['MnO4-'], reactants: {C2H5OH: 5, 'MnO4-': 4, 'H+': 12}, products: {CH3COOH: 5, 'Mn2+': 4}, eq: '5C₂H₅OH + 4MnO₄⁻ + 12H⁺ → 5CH₃COOH + 4Mn²⁺ + 11H₂O', text: 'màu tím của KMnO₄ nhạt dần: ethanol bị oxi hóa thành acetic acid'},
  {id: 'co3-h', priority: 2, reactants: {'CO3 2-': 1, 'H+': 2}, products: {CO2: 1}, eq: 'CO₃²⁻ + 2H⁺ → CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'hco3-h', priority: 2, reactants: {'HCO3-': 1, 'H+': 1}, products: {CO2: 1}, eq: 'HCO₃⁻ + H⁺ → CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'co3-ac', priority: 2, reactants: {'CO3 2-': 1, CH3COOH: 2}, products: {CO2: 1, 'CH3COO-': 2}, eq: 'CO₃²⁻ + 2CH₃COOH → 2CH₃COO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 'hco3-ac', priority: 2, reactants: {'HCO3-': 1, CH3COOH: 1}, products: {CO2: 1, 'CH3COO-': 1}, eq: 'HCO₃⁻ + CH₃COOH → CH₃COO⁻ + CO₂↑ + H₂O', text: 'sủi bọt khí không màu (CO₂)'},
  {id: 's2-h', priority: 2, reactants: {'S2-': 1, 'H+': 2}, products: {H2S: 1}, eq: 'S²⁻ + 2H⁺ → H₂S↑', text: 'có khí mùi trứng thối (H₂S, độc)'},
  {id: 'nh4-oh', priority: 2, reactants: {'NH4+': 1, 'OH-': 1}, products: {'NH3(aq)': 1}, eq: 'NH₄⁺ + OH⁻ → NH₃ + H₂O', text: 'thoát khí mùi khai (rõ hơn khi đun nhẹ), giấy quỳ ẩm đặt ở miệng ống hóa xanh'},
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
  ...NEW_RULES,
];
