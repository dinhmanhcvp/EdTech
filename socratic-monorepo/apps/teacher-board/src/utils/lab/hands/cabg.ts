/**
 * Ca mổ tim thật cho bài "Phẫu thuật tim" (/lab): BẮC CẦU ĐỘNG MẠCH VÀNH (động mạch ngực trong trái → động mạch liên thất trước, LIMA–LAD)
 * có chạy máy tim phổi nhân tạo, theo đúng trình tự của một ca mổ: bảng kiểm trước rạch → heparin, chờ ACT → đặt ống động mạch chủ, ống nhĩ phải
 * → lên máy → kẹp ngang động mạch chủ → truyền dung dịch liệt tim (tim ngừng) → mở động mạch vành → khâu nối → thả kẹp (rung thất, sốc điện trong)
 * → thở lại, cai máy → rút ống tĩnh mạch, protamine, rút ống động mạch → đo lưu lượng cầu nối.
 * Logic thuần (không three.js): cảnh `HandsSurgery3D` chỉ đọc tay / chuột rồi gửi hành động.
 * Ca mổ đã mở xương ức và treo màng ngoài tim (cảnh có sẵn banh ngực, chỉ treo). Thời gian rút gọn để học trong vài phút; con số sinh lý là
 * mức điển hình trong y văn để học sinh thấy quan hệ nhân quả, KHÔNG dùng để hướng dẫn điều trị.
 */

export type CabgTool = 'scalpel' | 'clamp' | 'cannula' | 'needle';
export const CABG_TOOLS: CabgTool[] = ['scalpel', 'clamp', 'cannula', 'needle'];
export const CABG_TOOL_NAME: Record<CabgTool, string> = {scalpel: 'Dao mổ 11', clamp: 'Kẹp động mạch chủ', cannula: 'Ống thông (cannula)', needle: 'Kìm kẹp kim + chỉ 8-0'};
export type Rhythm = 'sinus' | 'slowing' | 'arrest' | 'vf';

export type CabgStep =
  | 'brief'
  | 'heparin'
  | 'cannAo'
  | 'cannRa'
  | 'pumpOn'
  | 'xclamp'
  | 'plegia'
  | 'arteriotomy'
  | 'anast'
  | 'deair'
  | 'unclamp'
  | 'defib'
  | 'wean'
  | 'decanRa'
  | 'protamine'
  | 'decanAo'
  | 'flow'
  | 'drains'
  | 'pacing'
  | 'count'
  | 'wires'
  | 'skin'
  | 'signout'
  | 'done';

/** ai làm bước này: phẫu thuật viên (dụng cụ trong trường mổ) hay kíp (nút ở bảng điều khiển) */
export const CABG_STEPS: {id: Exclude<CabgStep, 'done'>; name: string; who: 'team' | CabgTool; how: string; why: string}[] = [
  {id: 'brief', name: 'Dừng lại trước khi bắt đầu (kíp tim)', who: 'team', how: 'Đọc to và đánh dấu đủ các mục ở bảng điều khiển.', why: 'Ca mổ tim hở có nhiều người và nhiều máy: kíp phải thống nhất cầu nối dự kiến, máy tim phổi, dung dịch liệt tim, máu dự trữ.'},
  {id: 'heparin', name: 'Chống đông toàn thân: heparin', who: 'team', how: 'Bác sĩ gây mê tiêm heparin (nút ở bảng điều khiển), chờ ACT ≥ 480 giây.', why: 'Máu chạm ống nhựa của máy sẽ đông ngay; heparin liều cao và ACT đủ dài là điều kiện bắt buộc trước khi đặt ống.'},
  {id: 'cannAo', name: 'Đặt ống động mạch chủ', who: 'cannula', how: 'Cầm ống thông, đặt vào vòng cam trên đoạn xa động mạch chủ lên (sát quai).', why: 'Máu đã được máy làm giàu O₂ sẽ trả về cơ thể qua ống này; đặt xa gốc để còn chỗ kẹp và truyền liệt tim.'},
  {id: 'cannRa', name: 'Đặt ống tĩnh mạch vào nhĩ phải', who: 'cannula', how: 'Đặt ống thông vào vòng cam ở tiểu nhĩ phải.', why: 'Toàn bộ máu tĩnh mạch về tim được dẫn ra máy qua ống này.'},
  {id: 'pumpOn', name: 'Lên máy tim phổi nhân tạo', who: 'team', how: 'Kỹ thuật viên chạy máy: bấm "Lên máy" ở bảng điều khiển.', why: 'Máy thay tim bơm máu và thay phổi trao đổi khí: huyết áp thành đường phẳng (dòng liên tục), ngừng thở máy, EtCO₂ về 0.'},
  {id: 'xclamp', name: 'Kẹp ngang động mạch chủ', who: 'clamp', how: 'Cầm kẹp động mạch chủ, kẹp ở vòng cam: giữa ống động mạch và gốc động mạch chủ.', why: 'Cô lập tim khỏi vòng tuần hoàn của máy để làm tim ngừng đập và có trường mổ không máu.'},
  {id: 'plegia', name: 'Truyền dung dịch liệt tim', who: 'cannula', how: 'Đặt ống thông vào gốc động mạch chủ (vòng cam) rồi giữ chụm cho tới khi tim ngừng hẳn.', why: 'Dung dịch kali lạnh vào động mạch vành làm tim ngừng ở thì tâm trương và giảm nhu cầu O₂ của cơ tim trong lúc thiếu máu.'},
  {id: 'arteriotomy', name: 'Mở động mạch liên thất trước', who: 'scalpel', how: 'Dao 11: rạch dọc động mạch tại vòng cam (đoạn SAU chỗ hẹp vàng), dài khoảng 4–5 mm.', why: 'Miệng nối phải nằm sau chỗ hẹp để máu từ cầu nối tới được vùng cơ tim thiếu máu.'},
  {id: 'anast', name: 'Khâu nối động mạch ngực trong trái vào động mạch vành', who: 'needle', how: 'Khâu vắt 8 mũi theo thứ tự quanh miệng mở (gót → mũi → trở về gót): chụm đúng vòng cam đang sáng.', why: 'Mũi khâu phải đều, xuyên đủ lớp nội mạc của cả hai mạch; lệch mép làm hẹp miệng nối hoặc rò máu.'},
  {id: 'deair', name: 'Đuổi khí khỏi tim', who: 'cannula', how: 'Đặt ống thông vào kim hút ở gốc động mạch chủ (vòng cam) và GIỮ chụm: bọt khí sủi ra tới khi hết.', why: 'Mở mạch và khâu nối để lọt khí vào tim; thả kẹp khi còn khí thì bọt khí trôi vào động mạch vành, động mạch não gây thiếu máu cơ tim, đột quỵ.'},
  {id: 'unclamp', name: 'Thả kẹp động mạch chủ', who: 'clamp', how: 'Dùng kẹp chạm vào kẹp đang đặt trên động mạch chủ để mở ra.', why: 'Máu ấm vào lại động mạch vành, rửa trôi dung dịch liệt tim; tim thường rung thất khi vừa được tưới máu lại.'},
  {id: 'defib', name: 'Sốc điện trong (rung thất)', who: 'team', how: 'Đặt hai bản sốc lên tim và sốc 10–20 J: bấm "Sốc điện trong" ở bảng điều khiển.', why: 'Rung thất không bơm được máu; sốc điện đồng bộ hóa lại cơ tim để nút xoang dẫn nhịp.'},
  {id: 'wean', name: 'Thở lại và cai máy', who: 'team', how: 'Bấm "Thở lại, cai máy" khi đã có nhịp xoang.', why: 'Phổi phải được thông khí lại trước khi tim tự bơm; giảm dần lưu lượng máy cho tới khi huyết áp đập theo mạch.'},
  {id: 'decanRa', name: 'Rút ống tĩnh mạch', who: 'cannula', how: 'Chạm ống thông vào ống tĩnh mạch ở nhĩ phải để rút, buộc mũi khâu túi.', why: 'Rút ống tĩnh mạch trước: nếu cần lên máy lại vẫn còn đường động mạch.'},
  {id: 'protamine', name: 'Trung hòa heparin: protamine', who: 'team', how: 'Bác sĩ gây mê tiêm protamine (nút ở bảng điều khiển); ACT về gần mức nền.', why: 'Đảo ngược tác dụng chống đông để cầm máu trước khi đóng ngực.'},
  {id: 'decanAo', name: 'Rút ống động mạch chủ', who: 'cannula', how: 'Chạm ống thông vào ống ở động mạch chủ để rút, buộc mũi khâu túi.', why: 'Rút sau cùng, khi đã trung hòa heparin và huyết động ổn.'},
  {id: 'flow', name: 'Đo lưu lượng cầu nối', who: 'team', how: 'Bấm "Đo lưu lượng cầu nối" (đầu dò siêu âm thời gian truyền).', why: 'Lưu lượng đủ và chỉ số đập (PI) thấp cho biết miệng nối thông tốt trước khi đóng ngực.'},
  {id: 'drains', name: 'Đặt hai ống dẫn lưu', who: 'cannula', how: 'Cầm ống, đặt lần lượt vào hai vòng cam: dưới tim (khoang màng ngoài tim) và trước tim (trung thất).', why: 'Máu và dịch rỉ sau mổ phải được dẫn ra ngoài; ứ lại quanh tim gây chèn ép tim cấp.'},
  {id: 'pacing', name: 'Đặt dây điện cực tạm thời', who: 'needle', how: 'Kìm kẹp kim: khâu đầu dây điện cực vào mặt thất phải (vòng cam).', why: 'Sau mổ tim, dẫn truyền có thể chậm hoặc rối loạn; dây điện cực cho phép tạo nhịp ngay từ bên ngoài.'},
  {id: 'count', name: 'Đếm gạc, kim, dụng cụ', who: 'team', how: 'Y tá dụng cụ đếm: bấm "Đếm đủ" khi số gạc, kim, dụng cụ khớp số đã mở.', why: 'Phải đếm đủ trước khi đóng xương ức: dụng cụ sót trong ngực là sai sót nghiêm trọng nhưng phòng được.'},
  {id: 'wires', name: 'Tháo banh ngực, buộc chỉ thép xương ức', who: 'needle', how: 'Luồn 5 sợi chỉ thép: với mỗi sợi chụm điểm sáng ở mép xương ức phải rồi mép trái; đủ 5 sợi thì hai nửa xương ức được kéo khép và xoắn chặt.', why: 'Xương ức đã cưa đôi phải được cố định chắc để liền xương và để người bệnh thở, ho không đau.'},
  {id: 'skin', name: 'Khâu da, băng vết mổ', who: 'needle', how: 'Kìm kẹp kim: khâu trong da 6 mũi dọc đường giữa từ trên xuống (chụm đúng điểm sáng); đủ mũi thì băng vết mổ.', why: 'Đóng từng lớp giảm nhiễm khuẩn vết mổ xương ức, biến chứng nặng của mổ tim.'},
  {id: 'signout', name: 'Bảng kiểm trước khi rời phòng', who: 'team', how: 'Đánh dấu đủ các mục ở bảng điều khiển.', why: 'Kíp xác nhận tên phẫu thuật, số đếm, ống dẫn lưu, dây điện cực và điểm cần theo dõi khi bàn giao hồi sức.'},
];
/** bảng kiểm trước khi rời phòng mổ tim */
export const CABG_SIGNOUT = ['Ghi đúng tên phẫu thuật: bắc cầu động mạch vành 1 cầu nối (LIMA–LAD)', 'Số gạc, kim, dụng cụ đã đếm đủ', 'Hai ống dẫn lưu và dây điện cực đã ghi vị trí', 'Bàn giao hồi sức: lượng dịch dẫn lưu, nhịp tim, huyết áp mục tiêu'];
/** số sợi chỉ thép xương ức (mỗi sợi chạm mép phải rồi mép trái) */
export const WIRES = 5;
/** số mũi khâu trong da dọc đường giữa */
export const SKIN_STITCHES = 6;
/** khí trong buồng tim sau khi khâu nối (đơn vị tương đối) và tốc độ hút khí qua kim gốc động mạch chủ (mỗi giây) */
export const AIR_START = 1;
export const DEAIR_RATE = 0.4;
export const CABG_BRIEF = ['Xác nhận người bệnh, chẩn đoán hẹp động mạch liên thất trước, cầu nối dự kiến LIMA–LAD', 'Máy tim phổi đã mồi dịch, kiểm tra không còn bọt khí', 'Dung dịch liệt tim lạnh đã sẵn sàng', 'Có máu dự trữ, kháng sinh dự phòng trong 60 phút', 'Máy sốc điện trong đã nối, bản sốc nhỏ trên bàn'];

/** ACT (giây): nền, ngưỡng an toàn để chạy máy */
export const ACT_BASE = 125;
export const ACT_SAFE = 480;
/** mỗi giây thật của bài = bao nhiêu giây ACT tăng / giảm sau khi tiêm (rút gọn) */
export const ACT_RATE = 70;
/** giữ ống truyền liệt tim (s) để tim ngừng hẳn */
export const PLEGIA_TIME = 3;
/** số mũi khâu vắt của miệng nối */
export const STITCHES = 8;

export interface CabgState {
  brief: boolean[];
  tool: CabgTool | null;
  /** đồng hồ ca mổ, thời gian chạy máy, thời gian kẹp động mạch chủ (s, rút gọn) */
  t: number;
  cpbT: number;
  xclampT: number;
  heparin: boolean;
  act: number;
  cannAo: boolean;
  cannRa: boolean;
  pump: boolean;
  vent: boolean;
  xclamp: boolean;
  /** đã truyền liệt tim bao lâu (s) */
  plegia: number;
  rhythm: Rhythm;
  hr: number;
  /** tiến độ mở động mạch vành 0–1 */
  arteriotomy: number;
  stitches: number;
  /** mũi khâu lệch mép */
  misses: number;
  shocks: number;
  protamine: boolean;
  flow: {q: number; pi: number} | null;
  errors: number;
  warn: string;
  /** đã từng thả kẹp (để chỉ rung thất một lần) */
  reperfused: boolean;
  /** đóng ngực: số ống dẫn lưu, dây điện cực, đã đếm, số lần chạm chỉ thép (2 lần một sợi), đã khâu da, bảng kiểm cuối */
  drains: number;
  pacing: boolean;
  counted: boolean;
  wireTaps: number;
  skin: boolean;
  signout: boolean[];
  /** khí còn lại trong tim (0 = sạch); số mũi khâu da; dịch máu đã ra ống dẫn lưu (mL) */
  air: number;
  skinStitches: number;
  drainMl: number;
}
export const newCabg = (): CabgState => ({brief: CABG_BRIEF.map(() => false), tool: null, t: 0, cpbT: 0, xclampT: 0, heparin: false, act: ACT_BASE, cannAo: false, cannRa: false, pump: false, vent: true, xclamp: false, plegia: 0, rhythm: 'sinus', hr: 78, arteriotomy: 0, stitches: 0, misses: 0, shocks: 0, protamine: false, flow: null, errors: 0, warn: '', reperfused: false, drains: 0, pacing: false, counted: false, wireTaps: 0, skin: false, signout: CABG_SIGNOUT.map(() => false), air: AIR_START, skinStitches: 0, drainMl: 0});

export function cabgStep(s: CabgState): CabgStep {
  if (!s.brief.every(Boolean)) return 'brief';
  // các bước trước khi thả kẹp chỉ xét khi chưa tưới máu lại (sau đó ống được rút, ACT hạ theo protamine là đúng trình tự)
  if (!s.reperfused && (!s.heparin || (s.act < ACT_SAFE && !s.cannAo))) return 'heparin';
  if (!s.cannAo && !s.reperfused) return 'cannAo';
  if (!s.cannRa && !s.reperfused) return 'cannRa';
  if (!s.pump && !s.reperfused) return 'pumpOn';
  if (!s.reperfused) {
    if (!s.xclamp) return 'xclamp';
    if (s.rhythm !== 'arrest') return 'plegia';
    if (s.arteriotomy < 1) return 'arteriotomy';
    if (s.stitches < STITCHES) return 'anast';
    if (s.air > 0.02) return 'deair';
    return 'unclamp';
  }
  if (s.rhythm === 'vf') return 'defib';
  if (s.pump) return 'wean';
  if (s.cannRa) return 'decanRa';
  if (!s.protamine) return 'protamine';
  if (s.cannAo) return 'decanAo';
  if (!s.flow) return 'flow';
  if (s.drains < 2) return 'drains';
  if (!s.pacing) return 'pacing';
  if (!s.counted) return 'count';
  if (s.wireTaps < WIRES * 2) return 'wires';
  if (!s.skin) return 'skin';
  if (!s.signout.every(Boolean)) return 'signout';
  return 'done';
}
export const cabgTool = (step: CabgStep): CabgTool | null => (step === 'done' ? null : (CABG_STEPS.find((x) => x.id === step)!.who as CabgTool | 'team') === 'team' ? null : (CABG_STEPS.find((x) => x.id === step)!.who as CabgTool));

/** sinh hiệu theo trạng thái tuần hoàn: dòng máy liên tục (không mạch đập), tim ngừng, rung thất… */
export interface CabgVitals {
  hr: number;
  rhythm: Rhythm;
  /** áp lực động mạch có đập theo nhịp tim không (false = dòng liên tục của máy hoặc không có tuần hoàn) */
  pulsatile: boolean;
  sys: number;
  dia: number;
  spo2: number;
  etco2: number;
  vent: boolean;
  /** lưu lượng máy (L/phút), 0 = không chạy */
  pumpFlow: number;
}
export function cabgVitals(s: CabgState): CabgVitals {
  const beating = s.rhythm === 'sinus' || s.rhythm === 'slowing';
  if (s.pump) {
    // máy bơm dòng liên tục: áp lực trung bình 60–70, chênh tâm thu–tâm trương rất nhỏ; tim còn đập thì có gợn nhỏ
    return {hr: s.rhythm === 'arrest' || s.rhythm === 'vf' ? 0 : s.hr, rhythm: s.rhythm, pulsatile: false, sys: beating ? 72 : 66, dia: beating ? 60 : 64, spo2: 100, etco2: s.vent ? 28 : 0, vent: s.vent, pumpFlow: 4.6};
  }
  if (!beating) return {hr: 0, rhythm: s.rhythm, pulsatile: false, sys: 22, dia: 18, spo2: 88, etco2: 8, vent: s.vent, pumpFlow: 0};
  return {hr: s.hr, rhythm: s.rhythm, pulsatile: true, sys: s.reperfused ? 112 : 124, dia: s.reperfused ? 64 : 78, spo2: 99, etco2: 36, vent: s.vent, pumpFlow: 0};
}

export type CabgAction =
  | {t: 'tick'; dt: number}
  | {t: 'tool'; tool: CabgTool | null}
  | {t: 'brief'; i: number}
  | {t: 'heparin'}
  | {t: 'place'; at: 'ao' | 'ra' | 'clamp' | 'root'; ok: boolean}
  | {t: 'plegia'; dt: number}
  | {t: 'cut'; s: number}
  | {t: 'stitch'; ok: boolean}
  | {t: 'remove'; at: 'clamp' | 'ra' | 'ao'}
  | {t: 'pumpOn'}
  | {t: 'shock'}
  | {t: 'wean'}
  | {t: 'protamine'}
  | {t: 'flow'}
  | {t: 'drain'; ok: boolean}
  | {t: 'pace'; ok: boolean}
  | {t: 'count'}
  | {t: 'wire'; ok: boolean}
  | {t: 'skin'; ok: boolean}
  | {t: 'deair'; dt: number}
  | {t: 'signout'; i: number}
  | {t: 'wrong'; msg: string}
  | {t: 'reset'};

const err = (s: CabgState, warn: string): CabgState => ({...s, errors: s.errors + 1, warn});

export function cabgReducer(s: CabgState, a: CabgAction): CabgState {
  const step = cabgStep(s);
  switch (a.t) {
    case 'reset':
      return newCabg();
    case 'tool':
      return {...s, tool: a.tool, warn: ''};
    case 'wrong':
      return {...s, warn: a.msg};
    case 'brief':
      if (step !== 'brief') return s;
      return {...s, brief: s.brief.map((v, i) => (i === a.i ? !v : v)), warn: ''};
    case 'tick': {
      const act = s.heparin && !s.protamine ? Math.min(560, s.act + ACT_RATE * a.dt) : s.protamine ? Math.max(ACT_BASE + 10, s.act - ACT_RATE * 1.5 * a.dt) : s.act;
      // đang truyền liệt tim: nhịp chậm dần tới khi ngừng hẳn
      let {hr, rhythm} = s;
      if (rhythm === 'sinus' && s.reperfused && hr < 82) hr = Math.min(82, hr + 20 * a.dt);
      // ACT vừa đủ: bỏ dòng nhắc "chờ ACT"
      const warn = s.warn.startsWith('Đã tiêm heparin') && act >= ACT_SAFE ? '' : s.warn;
      // dịch máu ra ống dẫn lưu sau khi đặt: nhanh lúc đầu, chậm dần khi protamine đã trung hòa heparin (mL, thời gian rút gọn)
      const drainMl = s.drains > 0 ? s.drainMl + a.dt * (s.protamine ? 6 : 12) * Math.exp(-s.drainMl / 180) : s.drainMl;
      return {...s, t: s.t + a.dt, cpbT: s.cpbT + (s.pump ? a.dt : 0), xclampT: s.xclampT + (s.xclamp ? a.dt : 0), act, hr, rhythm, warn, drainMl};
    }
    case 'heparin':
      if (step !== 'heparin') return s;
      return s.heparin ? {...s, warn: `Đã tiêm heparin, chờ ACT đủ ${ACT_SAFE} giây (hiện ${Math.round(s.act)}).`} : {...s, heparin: true, warn: ''};
    case 'pumpOn':
      if (step !== 'pumpOn') return step === 'cannRa' || step === 'cannAo' ? err(s, 'Chưa đủ hai ống thông: không thể lên máy.') : s;
      return {...s, pump: true, vent: false, warn: ''};
    case 'place': {
      if (a.at === 'ao' || a.at === 'ra') {
        if (step === 'heparin' || (step === 'cannAo' && s.act < ACT_SAFE)) return err(s, `ACT mới ${Math.round(s.act)} giây (< ${ACT_SAFE}): đặt ống lúc này máu sẽ đông trong ống. Tiêm heparin và chờ đủ ACT.`);
        const want = a.at === 'ao' ? 'cannAo' : 'cannRa';
        if (step !== want) return s;
        if (!a.ok) return err(s, a.at === 'ao' ? 'Lệch vị trí: ống động mạch đặt ở đoạn xa động mạch chủ lên (vòng cam), không đặt ở gốc.' : 'Lệch vị trí: ống tĩnh mạch đặt vào tiểu nhĩ phải (vòng cam).');
        return a.at === 'ao' ? {...s, cannAo: true, warn: ''} : {...s, cannRa: true, warn: ''};
      }
      if (a.at === 'clamp') {
        if (!s.pump) return err(s, 'Chưa lên máy mà kẹp động mạch chủ: tim mất toàn bộ hậu gánh, não không còn máu nuôi. Lên máy trước.');
        if (step !== 'xclamp') return s;
        return a.ok ? {...s, xclamp: true, warn: ''} : err(s, 'Kẹp phải nằm giữa ống động mạch và gốc động mạch chủ (vòng cam).');
      }
      // gốc động mạch chủ: bắt đầu truyền
      if (!s.xclamp) return err(s, 'Chưa kẹp động mạch chủ: dung dịch liệt tim sẽ trôi ra toàn thân thay vì vào động mạch vành.');
      return s;
    }
    case 'plegia': {
      if (step !== 'plegia') return s;
      const plegia = s.plegia + a.dt;
      const f = Math.min(1, plegia / PLEGIA_TIME);
      const hr = Math.round(78 * (1 - f));
      return f >= 1 ? {...s, plegia, hr: 0, rhythm: 'arrest', warn: ''} : {...s, plegia, hr, rhythm: 'slowing', warn: ''};
    }
    case 'cut':
      if (step !== 'arteriotomy') {
        if (!s.reperfused && s.xclamp && s.rhythm !== 'arrest') return err(s, 'Tim còn đập: chưa thể mở động mạch vành. Truyền đủ dung dịch liệt tim trước.');
        return s;
      }
      return {...s, arteriotomy: Math.max(s.arteriotomy, Math.min(1, a.s)), warn: ''};
    case 'stitch':
      if (step !== 'anast') return s;
      return a.ok ? {...s, stitches: s.stitches + 1, warn: ''} : {...s, misses: s.misses + 1, errors: s.errors + 1, warn: 'Mũi khâu lệch mép: nguy cơ hẹp miệng nối. Khâu đúng vòng cam đang sáng.'};
    case 'remove': {
      if (a.at === 'clamp') {
        if (step === 'deair') return err(s, 'Còn khí trong tim: thả kẹp lúc này bọt khí trôi vào động mạch vành và não. Đuổi khí qua kim gốc động mạch chủ trước.');
        if (step !== 'unclamp') return step === 'anast' || step === 'arteriotomy' ? err(s, 'Chưa xong miệng nối: thả kẹp lúc này máu tràn trường mổ.') : s;
        return {...s, xclamp: false, reperfused: true, rhythm: 'vf', hr: 0, warn: 'Thả kẹp: tim được tưới máu lại và RUNG THẤT. Sốc điện trong.'};
      }
      const want = a.at === 'ra' ? 'decanRa' : 'decanAo';
      if (step !== want) {
        if (s.pump) return err(s, 'Đang chạy máy: không được rút ống.');
        if (a.at === 'ao' && s.cannRa) return err(s, 'Rút ống tĩnh mạch trước, ống động mạch sau cùng.');
        if (a.at === 'ao' && !s.protamine) return err(s, 'Tiêm protamine trước khi rút ống động mạch chủ.');
        return s;
      }
      return a.at === 'ra' ? {...s, cannRa: false, warn: ''} : {...s, cannAo: false, warn: ''};
    }
    case 'shock':
      if (step !== 'defib') return s.rhythm === 'sinus' ? err(s, 'Đang nhịp xoang: không sốc điện.') : s;
      return {...s, shocks: s.shocks + 1, rhythm: 'sinus', hr: 62, warn: ''};
    case 'wean':
      if (step !== 'wean') return s.rhythm === 'vf' ? err(s, 'Còn rung thất: không cai máy được, sốc điện trước.') : s;
      return {...s, pump: false, vent: true, warn: ''};
    case 'protamine':
      if (step !== 'protamine') return s.pump || s.cannRa ? err(s, 'Chưa rút ống tĩnh mạch / còn chạy máy: protamine lúc này làm máu đông trong máy.') : s;
      return {...s, protamine: true, heparin: true, warn: ''};
    case 'flow':
      if (step !== 'flow') return s;
      // miệng nối khâu đều: lưu lượng ~40 mL/phút, PI ~1,8; mỗi mũi lệch giảm lưu lượng, tăng PI
      return {...s, flow: {q: Math.max(4, 42 - 9 * s.misses), pi: +(1.8 + 0.9 * s.misses).toFixed(1)}, warn: ''};
    case 'drain':
      if (step !== 'drains') return s;
      return a.ok ? {...s, drains: s.drains + 1, warn: ''} : err(s, 'Ống dẫn lưu đặt ở vòng cam: một ống dưới tim, một ống trước tim.');
    case 'pace':
      if (step !== 'pacing') return s;
      return a.ok ? {...s, pacing: true, warn: ''} : err(s, 'Khâu dây điện cực vào mặt thất phải (vòng cam), tránh động mạch vành.');
    case 'count':
      if (step === 'wires' || step === 'skin') return s;
      if (step !== 'count') return err(s, 'Chưa tới lúc đếm: đặt đủ ống dẫn lưu và dây điện cực trước.');
      return {...s, counted: true, warn: ''};
    case 'wire':
      if (step !== 'wires') return step === 'count' ? err(s, 'Chưa đếm đủ gạc, kim, dụng cụ: không được đóng xương ức.') : s;
      return a.ok ? {...s, wireTaps: s.wireTaps + 1, warn: ''} : err(s, 'Luồn chỉ thép đúng điểm sáng: mỗi sợi đi qua mép xương ức phải rồi mép trái.');
    case 'deair': {
      if (step !== 'deair') return s;
      const air = Math.max(0, s.air - DEAIR_RATE * a.dt);
      return {...s, air: air <= 0.02 ? 0 : air, warn: ''};
    }
    case 'skin': {
      if (step !== 'skin') return s;
      if (!a.ok) return err(s, 'Mũi khâu da lệch: khâu đúng điểm sáng, từ trên xuống, hai mép da áp sát nhau.');
      const n = s.skinStitches + 1;
      return {...s, skinStitches: n, skin: n >= SKIN_STITCHES, warn: ''};
    }
    case 'signout':
      if (step !== 'signout') return s;
      return {...s, signout: s.signout.map((v, i) => (i === a.i ? !v : v)), warn: ''};
  }
}

/** nhận xét cuối ca */
export function cabgDebrief(s: CabgState): string {
  const mm = (x: number) => `${Math.floor(x / 60)} phút ${Math.round(x % 60)} giây`;
  const f = s.flow;
  const good = f && f.q >= 20 && f.pi <= 5;
  return `Thời gian chạy máy ${mm(s.cpbT)}, kẹp động mạch chủ ${mm(s.xclampT)} (rút gọn). ${f ? `Lưu lượng cầu nối ${f.q} mL/phút, PI ${f.pi}: ${good ? 'miệng nối thông tốt.' : 'miệng nối kém — thực tế phải làm lại miệng nối trước khi đóng ngực.'}` : ''} ${s.misses ? `${s.misses} mũi khâu lệch mép.` : 'Khâu đều, không lệch mép.'} ${s.errors ? `${s.errors} thao tác sai thứ tự / sai chỗ.` : 'Không sai thứ tự.'} Sốc điện ${s.shocks} lần.`.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ sóng monitor theo nhịp tim / tuần hoàn
/** rung thất: dao động hỗn loạn biên độ đổi dần (không có phức bộ QRS) */
export const vfAt = (t: number) => 0.45 * Math.sin(t * 31) * (0.6 + 0.4 * Math.sin(t * 2.3)) + 0.25 * Math.sin(t * 47 + 1.3) + 0.15 * Math.sin(t * 19 + 0.4);
export interface MonitorState {
  rhythm: Rhythm;
  pulsatile: boolean;
  vent: boolean;
}
/**
 * Ba làn sóng [điện tim, sóng mạch / huyết áp động mạch, CO₂] theo trạng thái: nhịp xoang dùng dạng sóng chuẩn (`ecg`, `pleth`, `capno` truyền vào),
 * ngừng tim là đường thẳng, rung thất là sóng hỗn loạn; chạy máy (không mạch đập) thì sóng mạch gần phẳng; ngừng thở máy thì CO₂ phẳng.
 */
export function monitorLanes(m: MonitorState, std: [number, number, number], t: number): [number, number, number] {
  const ecg = m.rhythm === 'arrest' ? 0.01 * Math.sin(t * 3) : m.rhythm === 'vf' ? vfAt(t) : std[0];
  const pleth = m.pulsatile ? std[1] : 0.04 * Math.sin(t * 1.7);
  const co2 = m.vent ? std[2] : 0;
  return [ecg, pleth, co2];
}
