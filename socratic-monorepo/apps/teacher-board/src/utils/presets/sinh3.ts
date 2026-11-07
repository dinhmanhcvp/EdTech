import type {PresetSpec, ProcessItem, Shape} from './types';
import {C, box, dot, f1, seeded, txt} from './sceneKit';

const rect = (id: string, x: number, y: number, w: number, h: number, fill: string, label: string, from: number, frames?: ProcessItem['frames']): ProcessItem => ({id, kind: 'rect', w, h, fill, stroke: '#44403C', label, frames: frames ?? [{at: from, x, y}]});
const chr = (id: string, fill: string, frames: ProcessItem['frames']): ProcessItem => ({id, kind: 'rect', w: 14, h: 56, fill, stroke: '#1F2937', frames});

/** Ước lượng kích thước quần thể bằng phương pháp đánh dấu – bắt lại (Lincoln–Petersen). */
export const lincolnPetersen = (M: number, n: number, m: number) => (m > 0 ? (M * n) / m : Infinity);
export const PYRAMIDS: Record<string, {label: string; widths: [number, number, number]; trend: string}> = {
  expand: {label: 'Dạng phát triển (đáy rộng)', widths: [250, 150, 60], trend: 'nhóm tuổi trước sinh sản đông: quần thể tăng nhanh'},
  stable: {label: 'Dạng ổn định', widths: [170, 170, 120], trend: 'ba nhóm tuổi gần bằng nhau: quần thể giữ ổn định'},
  decline: {label: 'Dạng suy giảm (đáy hẹp)', widths: [90, 150, 190], trend: 'nhóm trước sinh sản ít: quần thể suy giảm'},
};

export const SINH3_PRESETS: Record<string, PresetSpec> = {
  BIO_MEIOSIS: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Giảm phân và trao đổi chéo',
    question: 'Vì sao giảm phân tạo ra các tế bào con có số NST giảm một nửa còn nguyên phân thì không? Trao đổi chéo ở kì đầu I làm tăng đa dạng di truyền như thế nào?',
    keywords: /giam phan|trao doi cheo|tiep hop nhiem sac the|meiosis|giao tu|bo nst don boi/,
    examples: ['giảm phân', 'trao đổi chéo', 'tiếp hợp nhiễm sắc thể', 'hình thành giao tử'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'Tế bào mẹ 2n', body: 'Chỉ vẽ một cặp NST tương đồng: NST đỏ từ mẹ, NST xanh từ bố, mỗi NST là một chromatid.'},
        {title: 'Kì trung gian: nhân đôi', body: 'DNA nhân đôi, mỗi NST thành NST kép gồm hai chromatid chị em.'},
        {title: 'Kì đầu I: tiếp hợp và trao đổi chéo', body: 'Hai NST kép tương đồng bắt cặp; các chromatid không chị em trao đổi các đoạn tương ứng (trao đổi chéo) tạo tổ hợp gene mới.'},
        {title: 'Kì giữa I', body: 'Các cặp NST kép tương đồng xếp thành hai hàng ở mặt phẳng xích đạo.'},
        {title: 'Kì sau I', body: 'Hai NST kép trong cặp tương đồng phân li về hai cực (chromatid chị em vẫn dính nhau): tạo hai tế bào có n NST kép.'},
        {title: 'Giảm phân II', body: 'Các chromatid chị em tách nhau: tạo 4 tế bào con, mỗi tế bào n NST đơn, khác nhau về tổ hợp gene.'},
      ],
      items: [
        {id: 'cell', kind: 'pill', w: 280, h: 200, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 0, x: 180, y: 50}, {at: 4, x: 180, y: 50, o: 0}]},
        {id: 'cellL', kind: 'pill', w: 170, h: 190, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 4, x: 100, y: 55}, {at: 5, x: 100, y: 55, o: 0}]},
        {id: 'cellR', kind: 'pill', w: 170, h: 190, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 4, x: 370, y: 55}, {at: 5, x: 370, y: 55, o: 0}]},
        ...[40, 160, 330, 450].map((x, i): ProcessItem => ({id: `g${i}`, kind: 'pill', w: 110, h: 150, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 5, x, y: 75}]})),
        chr('ra', '#EF4444', [{at: 0, x: 280, y: 100}, {at: 1, x: 280, y: 100}, {at: 2, x: 290, y: 100}, {at: 3, x: 280, y: 100}, {at: 4, x: 160, y: 100}, {at: 5, x: 80, y: 110}]),
        chr('rb', '#EF4444', [{at: 0, x: 280, y: 100, o: 0}, {at: 1, x: 296, y: 100}, {at: 2, x: 306, y: 100}, {at: 3, x: 296, y: 100}, {at: 4, x: 176, y: 100}, {at: 5, x: 192, y: 110}]),
        chr('ba', '#3B82F6', [{at: 0, x: 340, y: 160}, {at: 1, x: 340, y: 160}, {at: 2, x: 324, y: 100}, {at: 3, x: 330, y: 190}, {at: 4, x: 440, y: 100}, {at: 5, x: 365, y: 110}]),
        chr('bb', '#3B82F6', [{at: 0, x: 340, y: 160, o: 0}, {at: 1, x: 356, y: 160}, {at: 2, x: 340, y: 100}, {at: 3, x: 346, y: 190}, {at: 4, x: 456, y: 100}, {at: 5, x: 485, y: 110}]),
        {id: 'x1', kind: 'rect', w: 14, h: 18, fill: '#3B82F6', stroke: '#1F2937', label: '', frames: [{at: 2, x: 306, y: 118}, {at: 3, x: 296, y: 118}, {at: 4, x: 176, y: 118}, {at: 5, x: 192, y: 128}]},
        {id: 'x2', kind: 'rect', w: 14, h: 18, fill: '#EF4444', stroke: '#1F2937', label: '', frames: [{at: 2, x: 324, y: 118}, {at: 3, x: 330, y: 208}, {at: 4, x: 440, y: 118}, {at: 5, x: 365, y: 128}]},
      ],
      note: 'Giảm phân gồm hai lần phân bào liên tiếp nhưng chỉ một lần nhân đôi NST. Đa dạng giao tử tạo bởi trao đổi chéo và sự phân li độc lập, tổ hợp tự do của các cặp NST.',
    },
  },

  BIO_REFLEX_ARC: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Cung phản xạ và dẫn truyền qua synapse',
    question: 'Một phản xạ đi qua những thành phần nào của cung phản xạ? Xung thần kinh truyền qua synapse hóa học bằng chất trung gian nào và theo mấy chiều?',
    keywords: /cung phan xa|phan xa tuy song|synapse|xinap|chat trung gian hoa hoc|acetylcholine|dan truyen xung than kinh|ket noi than kinh/,
    examples: ['cung phản xạ', 'synapse', 'chất trung gian hóa học'],
    data: {
      viewBox: [640, 260],
      steps: [
        {title: 'Thụ thể tiếp nhận kích thích', body: 'Thụ thể ở da (đau, nóng) biến kích thích thành xung thần kinh.'},
        {title: 'Nơ-ron cảm giác (hướng tâm)', body: 'Xung truyền theo sợi cảm giác về trung ương thần kinh (tủy sống).'},
        {title: 'Trung ương thần kinh xử lí', body: 'Xung qua synapse sang nơ-ron trung gian rồi nơ-ron vận động. Ở synapse hóa học: xung làm bóng chứa chất trung gian (acetylcholine) vỡ, chất này khuếch tán qua khe synapse, gắn vào thụ thể màng sau, tạo xung mới. Chỉ truyền một chiều.'},
        {title: 'Nơ-ron vận động (li tâm)', body: 'Xung truyền theo sợi vận động đến cơ quan đáp ứng.'},
        {title: 'Cơ quan đáp ứng', body: 'Cơ co, rụt tay lại: phản xạ hoàn tất trong chưa đầy một phần giây, thường trước khi não nhận biết.'},
      ],
      items: [
        rect('r', 20, 100, 100, 60, '#FDE68A', 'Thụ thể (da)', 0),
        rect('s', 150, 100, 110, 60, '#BAE6FD', 'Nơ-ron cảm giác', 1),
        rect('c', 290, 100, 110, 60, '#BBF7D0', 'Tủy sống (synapse)', 2),
        rect('m', 430, 100, 90, 60, '#DDD6FE', 'Nơ-ron vận động', 3),
        rect('e', 540, 100, 80, 60, '#FBCFE8', 'Cơ co', 4),
        {id: 'impulse', kind: 'circle', r: 9, fill: '#EF4444', frames: [{at: 0, x: 70, y: 200}, {at: 1, x: 205, y: 200}, {at: 2, x: 345, y: 200}, {at: 3, x: 475, y: 200}, {at: 4, x: 580, y: 200}]},
        {id: 'cap', kind: 'text', fill: '#9A3412', label: 'xung thần kinh', frames: [{at: 0, x: 130, y: 232}, {at: 2, x: 345, y: 232, label: 'acetylcholine qua khe synapse'}, {at: 4, x: 500, y: 232, label: 'phản xạ hoàn tất'}]},
      ],
      note: 'Cung phản xạ gồm 5 thành phần: thụ thể, đường dẫn truyền vào, trung ương, đường dẫn truyền ra, cơ quan đáp ứng. Synapse điện hiếm hơn; synapse hóa học là loại phổ biến ở người.',
    },
  },

  BIO_EAR_HEARING: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Cấu tạo tai và cơ chế nghe',
    question: 'Sóng âm được chuyển thành xung thần kinh qua những bộ phận nào của tai? Vì sao chuỗi xương con giúp khuếch đại âm thanh?',
    keywords: /cau tao cua tai|cau tao tai|oc tai|mang nhi|xuong con|co quan thinh giac|co che nghe|ong tai|tai trong|tai giua/,
    examples: ['cấu tạo của tai', 'ốc tai', 'màng nhĩ', 'cơ chế nghe', 'chuỗi xương con'],
    data: {
      viewBox: [440, 300],
      tour: ['pinna', 'canal', 'drum', 'ossicles', 'cochlea', 'nerve'],
      flow: {label: 'Đường truyền của sóng âm', color: '#2563EB', d: 'M20 150 H150 L225 150 L275 150'},
      parts: [
        {id: 'pinna', label: 'Vành tai', d: 'M30 100 C10 140 20 190 55 200 C70 160 65 120 30 100 Z', fill: '#FBCFE8', stroke: '#BE185D', labelAt: [14, 90], title: 'Vành tai', body: 'Hứng và hướng sóng âm vào ống tai ngoài, giúp xác định hướng của âm thanh.', facts: [['Chức năng', 'thu và định hướng âm thanh']]},
        {id: 'canal', label: 'Ống tai', d: 'M62 150 H148', stroke: '#F9A8D4', strokeWidth: 12, labelAt: [90, 135], title: 'Ống tai ngoài', body: 'Dẫn sóng âm tới màng nhĩ; có lông và dịch ráy tai giữ bụi, bảo vệ.', facts: [['Chức năng', 'dẫn âm, bảo vệ']]},
        {id: 'drum', label: 'Màng nhĩ', d: 'M152 120 V180', stroke: '#F59E0B', strokeWidth: 5, labelAt: [150, 112], title: 'Màng nhĩ', body: 'Màng mỏng rung theo sóng âm, ngăn tai ngoài với tai giữa.', facts: [['Chức năng', 'rung theo sóng âm']]},
        {id: 'ossicles', label: 'Xương búa, đe, bàn đạp', d: 'M165 150 L195 140 L225 152', stroke: '#92400E', strokeWidth: 7, labelAt: [195, 124], title: 'Chuỗi xương con', body: 'Ba xương nhỏ nhất cơ thể (búa, đe, bàn đạp) truyền và khuếch đại rung động từ màng nhĩ vào cửa sổ bầu dục của tai trong (diện tích nhỏ hơn nên áp suất tăng).', facts: [['Chức năng', 'khuếch đại rung động'], ['Bảo vệ', 'cơ nhỏ giảm rung khi âm quá to']]},
        {id: 'cochlea', label: 'Ốc tai', d: 'M260 150 a40 40 0 1 1 -20 35 a24 24 0 1 1 22 -20', stroke: '#16A34A', strokeWidth: 9, labelAt: [310, 214], title: 'Ốc tai', body: 'Ống xoắn chứa dịch; rung động của dịch làm màng cơ sở rung, các tế bào lông chuyển rung động thành xung thần kinh (đoạn đầu ốc tai nhận âm cao, đoạn cuối nhận âm trầm).', facts: [['Cấu tạo', 'ống xoắn chứa dịch và tế bào lông'], ['Chức năng', 'biến rung động cơ học thành xung thần kinh']]},
        {id: 'nerve', label: 'Dây thần kinh thính giác', d: 'M298 118 L388 70', stroke: '#FBBF24', strokeWidth: 8, labelAt: [330, 88], title: 'Dây thần kinh thính giác', body: 'Truyền xung thần kinh về vùng thính giác ở thùy thái dương của não, nơi diễn ra cảm nhận âm thanh.', facts: [['Về', 'thùy thái dương của não']]},
        {id: 'canals', label: 'Ống bán khuyên', d: 'M232 80 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 Z', fill: 'none', stroke: '#7C3AED', strokeWidth: 5, labelAt: [160, 66], title: 'Ống bán khuyên (tiền đình)', body: 'Không tham gia nghe mà giữ thăng bằng: dịch trong ba ống vuông góc nhau cảm nhận chuyển động đầu.', facts: [['Chức năng', 'cảm nhận thăng bằng']]},
      ],
      note: 'Tai gồm ba phần: tai ngoài (vành tai, ống tai), tai giữa (màng nhĩ, xương con, vòi nhĩ cân bằng áp suất) và tai trong (ốc tai, bộ phận tiền đình).',
    },
  },

  BIO_POPULATION_ECOLOGY: {
    family: 'SCENE_LAB',
    engine: 'BIOLOGY',
    title: 'Tháp tuổi và ước lượng kích thước quần thể (đánh dấu – bắt lại)',
    question: 'Hình dạng tháp tuổi cho biết quần thể đang tăng, ổn định hay suy giảm thế nào? Làm sao ước lượng số cá thể của quần thể khi không thể đếm hết?',
    keywords: /thap tuoi|nhom tuoi cua quan the|danh dau bat lai|danh dau va bat lai|uoc luong kich thuoc quan the|mat do quan the|kieu phan bo cua quan the|ti le gioi tinh/,
    examples: ['tháp tuổi', 'nhóm tuổi của quần thể', 'phương pháp đánh dấu bắt lại', 'ước lượng kích thước quần thể'],
    data: {
      viewBox: [560, 300],
      choices: [
        {key: 'mode', label: 'Nội dung', value: 'pyr', options: [['pyr', 'Tháp tuổi'], ['mr', 'Đánh dấu – bắt lại']]},
        {key: 'kind', label: 'Dạng tháp tuổi', value: 'expand', options: Object.entries(PYRAMIDS).map(([k, v]) => [k, v.label] as [string, string])},
      ],
      sliders: [
        {key: 'N', label: 'Số cá thể thực của quần thể', min: 100, max: 1000, step: 50, value: 400},
        {key: 'M', label: 'Số cá thể đánh dấu lần 1', min: 10, max: 100, step: 5, value: 50},
        {key: 'n', label: 'Số cá thể bắt lần 2', min: 10, max: 100, step: 5, value: 60},
      ],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'pyr') {
          const pr = PYRAMIDS[s.kind];
          ['Sau sinh sản', 'Đang sinh sản', 'Trước sinh sản'].forEach((lab, i) => {
            const w = pr.widths[2 - i];
            out.push(box(280 - w, 40 + i * 70, 2 * w, 60, ['#FCA5A5', '#FDE68A', '#BBF7D0'][i], C.ink), txt(280, 76 + i * 70, lab, {size: 13, bold: true}));
          });
          out.push(txt(280, 28, pr.label, {size: 13, bold: true}));
          return out;
        }
        const rng = seeded(21);
        const shown = Math.min(220, Math.round(p.N / 3));
        const markedShown = Math.min(shown, Math.round((p.M / p.N) * shown));
        out.push(box(30, 30, 500, 240, '#F0FDF4', C.green));
        for (let i = 0; i < shown; i++) out.push(dot(45 + rng() * 470, 45 + rng() * 210, 3.5, i < markedShown ? C.red : C.grey));
        out.push(txt(280, 290, 'chấm đỏ = cá thể đã đánh dấu; chấm xám = chưa đánh dấu (vẽ 1/3 số cá thể thật)', {size: 10, fill: C.grey}));
        return out;
      },
      readouts: [
        {label: 'Xu hướng quần thể', value: (_p, _t, s) => PYRAMIDS[s.kind].trend},
        {label: 'Số cá thể bắt lại có đánh dấu (kì vọng)', value: (p) => String(Math.round((p.n * p.M) / p.N))},
        {label: 'Ước lượng N = M·n/m', value: (p) => {
          const m = Math.round((p.n * p.M) / p.N);
          return m === 0 ? 'chưa bắt lại được cá thể đánh dấu: không ước lượng được' : `${f1(lincolnPetersen(p.M, p.n, m))} (thực: ${p.N})`;
        }},
      ],
      note: 'Phương pháp đánh dấu – bắt lại giả sử cá thể đánh dấu phân bố đều, không chết hoặc di cư giữa hai lần bắt. Kết quả càng chính xác khi số cá thể bắt lại càng lớn.',
    },
  },
};
