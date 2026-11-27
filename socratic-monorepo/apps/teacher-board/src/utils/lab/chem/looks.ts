/**
 * Hình dạng THẬT của chất rắn trong ống nghiệm / cốc (cảnh `HandsChem3D` vẽ theo bảng này):
 * hóa chất rắn trên kệ là mẩu, hạt, lá, đinh, bột, tinh thể như ngoài đời; chất rắn SINH RA trong dung dịch là kết tủa với kiểu riêng
 * (keo bông của hydroxide, vón cục của bạc halide, mịn lắng chặt của BaSO₄/CaCO₃, keo lơ lửng không lắng của lưu huỳnh keo).
 */
export type SolidLook =
  // mẩu hóa chất cho vào
  | 'float-metal' // kim loại nhẹ hơn nước, nổi và chạy trên mặt nước (Na)
  | 'turnings' // phoi bào xoắn (Mg)
  | 'granule' // hạt / viên cục không đều (Zn, đá vôi, đất đèn, vôi sống, Ca)
  | 'nail' // đinh sắt
  | 'foil' // lá kim loại (Cu, Al)
  | 'pellet' // viên dẹt (NaOH rắn)
  | 'powder' // bột (MnO₂, S, CuO, Fe₂O₃, NaHCO₃, đá vôi đập nhỏ…)
  | 'crystal' // tinh thể hạt (muối ăn, đường)
  | 'chunk' // mẩu sáp, nhựa, sợi
  | 'ice' // viên nước đá, nổi
  | 'mirror' // lớp kim loại bám thành ống (tráng bạc)
  // kết tủa sinh ra trong dung dịch
  | 'gel' // keo bông, xốp, lắng chậm, lớp dày (hydroxide kim loại)
  | 'curd' // vón cục như sữa đông, lắng nhanh (AgCl, AgBr, AgI, protein đông tụ, cặn xà phòng)
  | 'fine' // hạt mịn, lắng thành lớp mỏng chặt (BaSO₄, CaCO₃, sunfua…)
  | 'colloid'; // keo lơ lửng làm đục, không lắng (lưu huỳnh keo)

export const SOLID_LOOK: Record<string, SolidLook> = {
  Na: 'float-metal',
  Mg: 'turnings',
  Zn: 'granule',
  Ca: 'granule',
  CaC2: 'granule',
  CaO: 'granule',
  'CaCO3-coarse': 'granule',
  Fe: 'nail',
  'Fe(passive)': 'nail',
  Cu: 'foil',
  Al: 'foil',
  'Al(passive)': 'foil',
  'NaOH(s)': 'pellet',
  MnO2: 'powder',
  S: 'powder',
  CuO: 'powder',
  Fe2O3: 'powder',
  FeS: 'powder',
  'CaCO3-fine': 'powder',
  'NaHCO3(s)': 'powder',
  'C6H5COOH(s)': 'powder',
  'C(char)': 'powder',
  'Ag(s)': 'powder',
  'NaCl(s)': 'crystal',
  'sucrose(s)': 'crystal',
  'stearic(s)': 'chunk',
  'fat(s)': 'chunk',
  'PE(s)': 'chunk',
  'PVC(s)': 'chunk',
  'polyene(s)': 'chunk',
  'wool(s)': 'chunk',
  'cotton(s)': 'chunk',
  'novolac(s)': 'chunk',
  'nylon66(s)': 'chunk',
  ice: 'ice',
  'Ag-mirror': 'mirror',
  'Cu(OH)2': 'gel',
  'Fe(OH)2': 'gel',
  'Fe(OH)3': 'gel',
  'Al(OH)3': 'gel',
  'Zn(OH)2': 'gel',
  'Mg(OH)2': 'gel',
  'Pb(OH)2': 'gel',
  AgCl: 'curd',
  AgBr: 'curd',
  AgI: 'curd',
  'protein(coag)': 'curd',
  'Ca-stearate': 'curd',
  tribromophenol: 'curd',
  tribromoaniline: 'curd',
  xantho: 'curd',
  'S(coll)': 'colloid',
};
/** chất rắn không có trong bảng: kết tủa hạt mịn */
export const lookOf = (species: string): SolidLook => SOLID_LOOK[species] ?? 'fine';
/** kết tủa sinh ra trong dung dịch (vẽ thành lớp lắng + hạt lơ lửng) hay mẩu hóa chất cho vào (vẽ thành từng mẩu) */
export const isPrecip = (l: SolidLook): boolean => l === 'gel' || l === 'curd' || l === 'fine' || l === 'colloid';
/** chất rắn có ánh kim (vật liệu kim loại, bóng) */
export const isMetal = (l: SolidLook): boolean => l === 'float-metal' || l === 'turnings' || l === 'nail' || l === 'foil' || l === 'mirror';
/**
 * Độ xốp của lớp kết tủa khi lắng: cùng lượng chất, kết tủa keo bông chiếm thể tích gấp nhiều lần kết tủa hạt mịn (lớp đáy dày hơn);
 * tốc độ lắng tương đối (1 = vón cục lắng nhanh nhất; keo lơ lửng = 0, không lắng).
 */
export const SETTLE: Record<'gel' | 'curd' | 'fine' | 'colloid', {bulk: number; speed: number}> = {
  gel: {bulk: 2.4, speed: 0.35},
  curd: {bulk: 1.3, speed: 1},
  fine: {bulk: 0.7, speed: 0.6},
  colloid: {bulk: 0, speed: 0},
};
