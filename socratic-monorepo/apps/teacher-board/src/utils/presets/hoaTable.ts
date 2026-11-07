import type {PresetSpec, TableCell} from './types';
import {CLASS_COLOR, CLASS_LABEL, ELEMENTS, classOf, periodicPosition, type ElementClass} from './hoaData';

/** Thế điện cực chuẩn (V) của một số cặp oxi hóa – khử trong chương trình, sắp theo thứ tự dãy điện hóa. */
export const SERIES: [string, string, number][] = [
  ['Li⁺/Li', 'Li', -3.04],
  ['K⁺/K', 'K', -2.93],
  ['Ba²⁺/Ba', 'Ba', -2.91],
  ['Ca²⁺/Ca', 'Ca', -2.87],
  ['Na⁺/Na', 'Na', -2.71],
  ['Mg²⁺/Mg', 'Mg', -2.37],
  ['Al³⁺/Al', 'Al', -1.66],
  ['Zn²⁺/Zn', 'Zn', -0.76],
  ['Fe²⁺/Fe', 'Fe', -0.44],
  ['Ni²⁺/Ni', 'Ni', -0.26],
  ['Sn²⁺/Sn', 'Sn', -0.14],
  ['Pb²⁺/Pb', 'Pb', -0.13],
  ['2H⁺/H₂', 'H₂', 0],
  ['Cu²⁺/Cu', 'Cu', 0.34],
  ['Ag⁺/Ag', 'Ag', 0.8],
  ['Hg²⁺/Hg', 'Hg', 0.85],
  ['Pt²⁺/Pt', 'Pt', 1.19],
  ['Au³⁺/Au', 'Au', 1.5],
];
/** Suất điện động chuẩn của pin ghép hai cặp: E = E°(cực dương) − E°(cực âm). */
export const cellEmf = (a: number, b: number) => Math.abs(a - b);

const ION_DATA: [string, string, string, string, string][] = [
  ['Sc³⁺', 'd⁰', 'không màu', '#F5F5F4', 'không có electron d nên không hấp thụ ánh sáng nhìn thấy'],
  ['Ti³⁺', 'd¹', 'tím', '#C4B5FD', '[Ti(H₂O)₆]³⁺ tím'],
  ['Cr³⁺', 'd³', 'lục (tím trong dạng hexaaqua)', '#86EFAC', '[Cr(H₂O)₆]³⁺ tím, đổi sang lục khi tạo phức clorua'],
  ['Mn²⁺', 'd⁵', 'hồng rất nhạt', '#FBCFE8', '[Mn(H₂O)₆]²⁺ hồng nhạt'],
  ['Fe³⁺', 'd⁵', 'vàng nâu', '#FCD34D', '[Fe(H₂O)₆]³⁺ vàng nâu; thành đỏ máu với SCN⁻'],
  ['Fe²⁺', 'd⁶', 'lục nhạt', '#BEF264', '[Fe(H₂O)₆]²⁺ lục nhạt'],
  ['Co²⁺', 'd⁷', 'hồng', '#F9A8D4', '[Co(H₂O)₆]²⁺ hồng; thành xanh lam với HCl đặc ([CoCl₄]²⁻)'],
  ['Ni²⁺', 'd⁸', 'lục', '#86EFAC', '[Ni(H₂O)₆]²⁺ lục; thành xanh tím với NH₃ dư'],
  ['Cu²⁺', 'd⁹', 'xanh lam', '#60A5FA', '[Cu(H₂O)₆]²⁺ xanh lam; thành xanh thẫm với NH₃ dư ([Cu(NH₃)₄]²⁺)'],
  ['Zn²⁺', 'd¹⁰', 'không màu', '#F5F5F4', 'phân lớp d đã bão hòa nên không có chuyển dời d–d: muối kẽm không màu'],
  ['Cu⁺', 'd¹⁰', 'không màu', '#E7E5E4', 'Cu⁺ có d¹⁰ nên không màu (CuCl, Cu₂O có màu do chuyển điện tích)'],
  ['V³⁺', 'd²', 'lục', '#6EE7B7', '[V(H₂O)₆]³⁺ lục'],
];

export const HOA_TABLE_PRESETS: Record<string, PresetSpec> = {
  CHEM_PERIODIC_TABLE: {
    family: 'TABLE_LAB',
    engine: 'CHEMISTRY',
    title: 'Bảng tuần hoàn các nguyên tố và xu hướng biến đổi tuần hoàn',
    question: 'Bán kính nguyên tử, độ âm điện và năng lượng ion hóa biến đổi thế nào theo chu kì và theo nhóm? Vì sao các nguyên tố trong cùng một nhóm có tính chất tương tự nhau?',
    keywords: /bang tuan hoan|xu huong bien doi tuan hoan|chu ki va nhom nguyen to|do am dien cua nguyen to|nang luong ion hoa|ban kinh nguyen tu|quy luat bien doi tinh chat/,
    examples: ['bảng tuần hoàn', 'xu hướng biến đổi tuần hoàn', 'độ âm điện của nguyên tố', 'năng lượng ion hóa', 'bán kính nguyên tử'],
    data: {
      cols: 18,
      rows: 6,
      dense: false,
      groups: (Object.keys(CLASS_LABEL) as ElementClass[]).map((k) => ({id: k, label: CLASS_LABEL[k], color: CLASS_COLOR[k]})),
      propDefs: [
        {key: 'z', label: 'Số hiệu nguyên tử Z'},
        {key: 'mass', label: 'Nguyên tử khối', numeric: true},
        {key: 'en', label: 'Độ âm điện (Pauling)', numeric: true},
        {key: 'r', label: 'Bán kính nguyên tử', unit: 'pm', numeric: true},
        {key: 'ie1', label: 'Năng lượng ion hóa I₁', unit: 'kJ/mol', numeric: true},
        {key: 'cls', label: 'Loại nguyên tố'},
      ],
      cells: ELEMENTS.flatMap((e): TableCell[] => {
        const pos = periodicPosition(e.z);
        if (!pos) return [];
        const k = classOf(e);
        return [{id: e.sym, label: e.sym, sub: String(e.z), row: pos.row, col: pos.col, group: k, title: `${e.name} (${e.sym}), Z = ${e.z}`, body: `Chu kì ${pos.row + 1}.`, props: {z: e.z, mass: e.mass, ...(e.en !== null ? {en: e.en} : {}), r: e.r, ie1: e.ie1, cls: CLASS_LABEL[k]}}];
      }),
      note: 'Bảng rút gọn (Z từ 1 đến 56 cùng Au, Hg, Pb; nhóm lantan không vẽ). Tô theo bán kính, độ âm điện, năng lượng ion hóa để thấy xu hướng: trong chu kì từ trái sang phải độ âm điện và I₁ tăng, bán kính giảm; trong nhóm từ trên xuống ngược lại.',
    },
  },

  CHEM_ELECTROCHEM_SERIES: {
    family: 'TABLE_LAB',
    engine: 'CHEMISTRY',
    title: 'Dãy điện hóa của kim loại và thế điện cực chuẩn',
    question: 'Kim loại đứng trước có tính khử mạnh hơn kim loại đứng sau như thế nào, và dựa vào thế điện cực chuẩn ta dự đoán phản ứng và suất điện động của pin ra sao?',
    keywords: /day dien hoa|the dien cuc chuan|quy tac alpha|suat dien dong cua pin dien hoa|tinh khu cua kim loai|day hoat dong hoa hoc cua kim loai|ac quy|pin nhien lieu/,
    examples: ['dãy điện hóa', 'thế điện cực chuẩn', 'quy tắc alpha', 'tính khử của kim loại', 'pin nhiên liệu'],
    data: {
      cols: 6,
      rows: 3,
      groups: [
        {id: 'strong', label: 'Tính khử rất mạnh (E° < −1,5 V)', color: '#FCA5A5'},
        {id: 'mid', label: 'Đứng trước H (đẩy được H₂ khỏi acid loãng)', color: '#FDE68A'},
        {id: 'h', label: 'Chuẩn: 2H⁺/H₂', color: '#E7E5E4'},
        {id: 'noble', label: 'Đứng sau H (không đẩy H₂)', color: '#BFDBFE'},
      ],
      propDefs: [
        {key: 'e0', label: 'Thế điện cực chuẩn E°', unit: 'V', numeric: true},
        {key: 'rule', label: 'Quy tắc'},
      ],
      cells: SERIES.map(([couple, sym, e0], i): TableCell => ({
        id: sym,
        label: couple,
        sub: `${e0 > 0 ? '+' : ''}${String(e0).replace('.', ',')} V`,
        row: Math.floor(i / 6),
        col: i % 6,
        group: e0 < -1.5 ? 'strong' : e0 < 0 ? 'mid' : e0 === 0 ? 'h' : 'noble',
        title: `Cặp ${couple}: E° = ${e0} V`,
        body: e0 < 0 ? `Dạng khử ${sym} có tính khử mạnh hơn H₂: đẩy được hydrogen khỏi dung dịch acid loãng.` : e0 === 0 ? 'Cặp chuẩn để so sánh, quy ước E° = 0,00 V.' : `Dạng oxi hóa mạnh hơn H⁺; ${sym} không tan trong acid loãng không có tính oxi hóa.`,
        props: {e0, rule: 'cặp có E° nhỏ hơn đóng vai trò cực âm (anot), cặp có E° lớn hơn là cực dương (catot)'},
      })),
      note: 'Quy tắc α: chất oxi hóa mạnh nhất phản ứng với chất khử mạnh nhất. Suất điện động chuẩn của pin: E°pin = E°(cực dương) − E°(cực âm); ví dụ pin Zn–Cu: 0,34 − (−0,76) = 1,10 V.',
    },
  },

  CHEM_TRANSITION_COMPLEX: {
    family: 'TABLE_LAB',
    engine: 'CHEMISTRY',
    title: 'Cấu hình d, màu của ion kim loại chuyển tiếp và phức chất',
    question: 'Vì sao nhiều ion kim loại chuyển tiếp có màu còn Zn²⁺ và Sc³⁺ thì không? Số electron d liên quan đến màu và phức chất như thế nào?',
    keywords: /ion kim loai chuyen tiep|mau cua ion|phuc chat|nguyen to nhom b|cau hinh electron cua ion|so phoi tri|ion phuc/,
    examples: ['ion kim loại chuyển tiếp', 'màu của ion', 'số phối trí'],
    data: {
      cols: 4,
      rows: 3,
      groups: ION_DATA.map(([ion, , , color], i) => ({id: `i${i}`, label: ion, color})),
      propDefs: [
        {key: 'cfg', label: 'Cấu hình d'},
        {key: 'color', label: 'Màu trong dung dịch'},
        {key: 'geo', label: 'Dạng phối trí phổ biến'},
      ],
      cells: ION_DATA.map(([ion, cfg, color, , note], i): TableCell => ({
        id: `i${i}`,
        label: ion,
        sub: `${cfg} · ${color}`,
        row: Math.floor(i / 4),
        col: i % 4,
        group: `i${i}`,
        title: `${ion}: ${cfg}, ${color}`,
        body: note,
        props: {cfg, color, geo: 'bát diện [M(H₂O)₆]ⁿ⁺ trong nước; phối tử cho cặp electron vào orbital trống của ion trung tâm'},
      })),
      note: 'Màu do electron d hấp thụ một phần ánh sáng nhìn thấy để chuyển giữa các mức d bị tách bởi phối tử; ion d⁰ và d¹⁰ không có chuyển dời d–d nên không màu.',
    },
  },
};
