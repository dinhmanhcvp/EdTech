/** Dữ liệu nguyên tố dùng chung: số hiệu Z, kí hiệu, tên, khối lượng nguyên tử, độ âm điện (Pauling), bán kính nguyên tử (pm), năng lượng ion hóa thứ nhất (kJ/mol). */
export interface Element {
  z: number;
  sym: string;
  name: string;
  mass: number;
  en: number | null;
  r: number;
  ie1: number;
}

// z|kí hiệu|tên|khối lượng|độ âm điện (- nếu không có)|bán kính|IE1
const RAW = `1|H|Hydrogen|1.008|2.20|25|1312
2|He|Helium|4.003|-|31|2372
3|Li|Lithium|6.94|0.98|145|520
4|Be|Beryllium|9.012|1.57|105|900
5|B|Boron|10.81|2.04|85|801
6|C|Carbon|12.011|2.55|70|1086
7|N|Nitrogen|14.007|3.04|65|1402
8|O|Oxygen|15.999|3.44|60|1314
9|F|Fluorine|18.998|3.98|50|1681
10|Ne|Neon|20.180|-|38|2081
11|Na|Sodium|22.990|0.93|180|496
12|Mg|Magnesium|24.305|1.31|150|738
13|Al|Aluminium|26.982|1.61|125|578
14|Si|Silicon|28.085|1.90|110|787
15|P|Phosphorus|30.974|2.19|100|1012
16|S|Sulfur|32.06|2.58|100|1000
17|Cl|Chlorine|35.45|3.16|100|1251
18|Ar|Argon|39.948|-|71|1521
19|K|Potassium|39.098|0.82|220|419
20|Ca|Calcium|40.078|1.00|180|590
21|Sc|Scandium|44.956|1.36|160|633
22|Ti|Titanium|47.867|1.54|140|659
23|V|Vanadium|50.942|1.63|135|651
24|Cr|Chromium|51.996|1.66|140|653
25|Mn|Manganese|54.938|1.55|140|717
26|Fe|Iron|55.845|1.83|140|763
27|Co|Cobalt|58.933|1.88|135|760
28|Ni|Nickel|58.693|1.91|135|737
29|Cu|Copper|63.546|1.90|135|745
30|Zn|Zinc|65.38|1.65|135|906
31|Ga|Gallium|69.723|1.81|130|579
32|Ge|Germanium|72.630|2.01|125|762
33|As|Arsenic|74.922|2.18|115|947
34|Se|Selenium|78.971|2.55|115|941
35|Br|Bromine|79.904|2.96|115|1140
36|Kr|Krypton|83.798|3.00|88|1351
37|Rb|Rubidium|85.468|0.82|235|403
38|Sr|Strontium|87.62|0.95|200|550
39|Y|Yttrium|88.906|1.22|180|600
40|Zr|Zirconium|91.224|1.33|155|640
41|Nb|Niobium|92.906|1.60|145|652
42|Mo|Molybdenum|95.95|2.16|145|684
43|Tc|Technetium|98|1.90|135|702
44|Ru|Ruthenium|101.07|2.20|130|710
45|Rh|Rhodium|102.906|2.28|135|720
46|Pd|Palladium|106.42|2.20|140|804
47|Ag|Silver|107.868|1.93|160|731
48|Cd|Cadmium|112.414|1.69|155|868
49|In|Indium|114.818|1.78|155|558
50|Sn|Tin|118.710|1.96|145|709
51|Sb|Antimony|121.760|2.05|145|834
52|Te|Tellurium|127.60|2.10|140|869
53|I|Iodine|126.904|2.66|140|1008
54|Xe|Xenon|131.293|2.60|108|1170
55|Cs|Caesium|132.905|0.79|260|376
56|Ba|Barium|137.327|0.89|215|503
79|Au|Gold|196.967|2.54|135|890
80|Hg|Mercury|200.592|2.00|150|1007
82|Pb|Lead|207.2|2.33|180|716`;

export const ELEMENTS: Element[] = RAW.split('\n').map((line) => {
  const [z, sym, name, mass, en, r, ie1] = line.split('|');
  return {z: Number(z), sym, name, mass: Number(mass), en: en === '-' ? null : Number(en), r: Number(r), ie1: Number(ie1)};
});
export const ELEMENT_BY_SYM: Record<string, Element> = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]));

/** Cột (0–17) của nguyên tố trong bảng tuần hoàn dạng 18 cột; trả null với nguyên tố họ lantan. */
export function periodicPosition(z: number): {row: number; col: number} | null {
  if (z === 1) return {row: 0, col: 0};
  if (z === 2) return {row: 0, col: 17};
  const spans: [number, number, number][] = [[3, 10, 1], [11, 18, 2], [19, 36, 3], [37, 54, 4], [55, 86, 5]];
  for (const [lo, hi, row] of spans) {
    if (z < lo || z > hi) continue;
    if (row <= 2) return {row, col: z - lo < 2 ? z - lo : z - lo + 10};
    if (row <= 4) return {row, col: z - lo};
    if (z <= 56) return {row, col: z - lo};
    if (z >= 72) return {row, col: z - lo - 14};
    return null;
  }
  return null;
}

export type ElementClass = 'alkali' | 'alkaline' | 'transition' | 'post' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble';
export function classOf(e: Element): ElementClass {
  const s = e.sym;
  if (['He', 'Ne', 'Ar', 'Kr', 'Xe'].includes(s)) return 'noble';
  if (['F', 'Cl', 'Br', 'I'].includes(s)) return 'halogen';
  if (['Li', 'Na', 'K', 'Rb', 'Cs'].includes(s)) return 'alkali';
  if (['Be', 'Mg', 'Ca', 'Sr', 'Ba'].includes(s)) return 'alkaline';
  if (['B', 'Si', 'Ge', 'As', 'Sb', 'Te'].includes(s)) return 'metalloid';
  if (['H', 'C', 'N', 'O', 'P', 'S', 'Se'].includes(s)) return 'nonmetal';
  if (['Al', 'Ga', 'In', 'Sn', 'Pb'].includes(s)) return 'post';
  return 'transition';
}
export const CLASS_LABEL: Record<ElementClass, string> = {
  alkali: 'Kim loại kiềm',
  alkaline: 'Kim loại kiềm thổ',
  transition: 'Kim loại chuyển tiếp',
  post: 'Kim loại sau chuyển tiếp',
  metalloid: 'Á kim',
  nonmetal: 'Phi kim',
  halogen: 'Halogen',
  noble: 'Khí hiếm',
};
export const CLASS_COLOR: Record<ElementClass, string> = {
  alkali: '#FCA5A5',
  alkaline: '#FDBA74',
  transition: '#FDE68A',
  post: '#BEF264',
  metalloid: '#99F6E4',
  nonmetal: '#A5B4FC',
  halogen: '#F9A8D4',
  noble: '#DDD6FE',
};

// ------------------------------------------------------------------ cấu hình electron (Z ≤ 36)
export interface Subshell {
  sub: string;
  n: number;
  orbitals: number;
  e: number;
}
const ORDER: [string, number, number][] = [['1s', 1, 1], ['2s', 2, 1], ['2p', 2, 3], ['3s', 3, 1], ['3p', 3, 3], ['4s', 4, 1], ['3d', 3, 5], ['4p', 4, 3]];
/** Cấu hình electron theo quy tắc Aufbau, có hai ngoại lệ Cr và Cu (bán bão hòa, bão hòa). */
export function configuration(z: number): Subshell[] {
  let left = z;
  const out: Subshell[] = ORDER.map(([sub, n, orbitals]) => {
    const e = Math.min(left, orbitals * 2);
    left -= e;
    return {sub, n, orbitals, e};
  });
  const set = (sub: string, e: number) => {
    const s = out.find((x) => x.sub === sub);
    if (s) s.e = e;
  };
  if (z === 24) {
    set('4s', 1);
    set('3d', 5);
  }
  if (z === 29) {
    set('4s', 1);
    set('3d', 10);
  }
  return out;
}
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = (n: number) => String(n).split('').map((d) => SUP[Number(d)]).join('');
/** Cấu hình viết theo thứ tự lớp (1s 2s 2p 3s 3p 3d 4s 4p). */
export function configString(z: number): string {
  const c = configuration(z).filter((s) => s.e > 0);
  const byShell = [...c].sort((a, b) => a.n - b.n || 'spdf'.indexOf(a.sub[1]) - 'spdf'.indexOf(b.sub[1]));
  return byShell.map((s) => `${s.sub}${sup(s.e)}`).join(' ');
}
/** Số electron độc thân (quy tắc Hund: điền độc thân trước, rồi mới ghép đôi). */
export function unpaired(z: number): number {
  return configuration(z).reduce((a, s) => a + (s.e <= s.orbitals ? s.e : 2 * s.orbitals - s.e), 0);
}
export const valenceElectrons = (z: number): number => {
  const c = configuration(z);
  const nmax = Math.max(...c.filter((s) => s.e > 0).map((s) => s.n));
  const outer = c.filter((s) => s.n === nmax && s.e > 0).reduce((a, s) => a + s.e, 0);
  const dUnfilled = c.find((s) => s.sub === '3d' && s.e > 0 && s.e < 10 && nmax === 4);
  return dUnfilled ? outer + dUnfilled.e : outer;
};
