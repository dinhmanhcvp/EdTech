import type {PresetSpec, ProcessItem} from './types';

/** NST gồm hai chromatid chị em (a, b); `at` = bước hiện ra; vị trí theo từng bước. */
function chromosome(id: string, color: string, bAt: number, pos: [number, number, number, number][]): ProcessItem[] {
  // pos[step] = [ax, ay, bx, by]
  const frames = (which: 0 | 1) => pos.map((p, i) => ({at: i, x: p[which * 2], y: p[which * 2 + 1], o: which === 1 && i < bAt ? 0 : 1}));
  return [
    {id: `${id}a`, kind: 'rect', w: 15, h: 58, fill: color, stroke: '#1F2937', frames: frames(0)},
    {id: `${id}b`, kind: 'rect', w: 15, h: 58, fill: color, stroke: '#1F2937', frames: frames(1)},
  ];
}

export const SINH_PROCESS_PRESETS: Record<string, PresetSpec> = {
  BIO_MITOSIS: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Nguyên phân',
    question:
      'Vì sao tế bào con tạo ra từ nguyên phân có bộ NST giống hệt tế bào mẹ? Hoạt động nào của NST ở kì giữa và kì sau bảo đảm điều đó?',
    keywords: /nguyen phan|mitosis|\bki (?:dau|giua|sau|cuoi)\b/,
    examples: ['nguyên phân', 'các kì của nguyên phân', 'kì giữa kì sau'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'Trước nhân đôi: mỗi NST là một chromatid', body: 'Tế bào mẹ 2n = 4 có 2 cặp NST; mỗi NST ở dạng sợi đơn (hình minh họa vẽ 2 NST đại diện).'},
        {title: 'Kì trung gian: nhân đôi NST', body: 'DNA nhân đôi, mỗi NST thành NST kép gồm hai chromatid chị em dính nhau ở tâm động.'},
        {title: 'Kì đầu', body: 'NST kép co xoắn và đóng xoắn dần, thoi phân bào hình thành, màng nhân tiêu biến.'},
        {title: 'Kì giữa', body: 'Các NST kép co xoắn cực đại, xếp thành một hàng ở mặt phẳng xích đạo, mỗi NST kép gắn vào sợi thoi phân bào ở tâm động.'},
        {title: 'Kì sau', body: 'Hai chromatid chị em tách nhau, mỗi chromatid (nay là một NST đơn) được kéo về một cực của tế bào.'},
        {title: 'Kì cuối và phân chia tế bào chất', body: 'NST dãn xoắn, màng nhân tái lập, tế bào chất phân chia tạo hai tế bào con có bộ NST 2n giống tế bào mẹ.'},
      ],
      items: [
        {id: 'cell', kind: 'pill', w: 260, h: 210, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 0, x: 190, y: 45}, {at: 5, x: 190, y: 45, o: 0}]},
        {id: 'cell-label', kind: 'text', fill: '#713F12', label: 'tế bào mẹ (2n = 4)', frames: [{at: 0, x: 255, y: 72}, {at: 5, x: 255, y: 72, o: 0}]},
        {id: 'cellL', kind: 'pill', w: 150, h: 180, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 5, x: 120, y: 60}]},
        {id: 'cellR', kind: 'pill', w: 150, h: 180, fill: '#FEF9C3', stroke: '#A16207', label: '', frames: [{at: 5, x: 370, y: 60}]},
        ...chromosome('c1', '#EF4444', 1, [
          [292, 90, 292, 90],
          [292, 90, 306, 90],
          [262, 80, 276, 80],
          [314, 70, 328, 70],
          [200, 80, 440, 80],
          [165, 95, 455, 95],
        ]),
        ...chromosome('c2', '#3B82F6', 1, [
          [340, 150, 340, 150],
          [340, 150, 354, 150],
          [360, 140, 374, 140],
          [314, 130, 328, 130],
          [200, 150, 440, 150],
          [165, 150, 455, 150],
        ]),
      ],
      note: 'Đỏ và xanh là hai NST đại diện. Số NST ở mỗi tế bào con (2n) bằng tế bào mẹ vì mỗi NST kép tách thành hai chromatid chia đều cho hai cực.',
    },
  },

  BIO_VIRUS_CYCLE: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Chu kì nhân lên của virus (sinh tan)',
    question:
      'Vì sao virus chỉ nhân lên được trong tế bào chủ? Chu kì sinh tan khác chu kì tiềm tan ở điểm nào?',
    keywords: /sinh tan|tiem tan|chu k[yi] nhan len|virus nhan len|thuc khuan the|\bphage\b/,
    examples: ['chu kì sinh tan của virus', 'chu kì nhân lên của virus', 'thực khuẩn thể'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'Hấp phụ', body: 'Virus bám đặc hiệu lên thụ thể trên bề mặt tế bào chủ.'},
        {title: 'Xâm nhập', body: 'Virus đưa vật chất di truyền (ở thực khuẩn thể là DNA) vào tế bào chủ; vỏ protein ở lại bên ngoài.'},
        {title: 'Sinh tổng hợp', body: 'Dùng nguyên liệu và enzyme của tế bào chủ, virus nhân bản DNA và tổng hợp protein vỏ; DNA tế bào chủ bị phân hủy.'},
        {title: 'Lắp ráp', body: 'DNA và protein vỏ được lắp ráp thành các virus mới hoàn chỉnh.'},
        {title: 'Phóng thích', body: 'Tế bào chủ bị phá vỡ (tan), các virus mới thoát ra và đi xâm nhiễm tế bào khác.'},
      ],
      items: [
        {id: 'cell', kind: 'pill', w: 270, h: 150, fill: '#F1F5F9', stroke: '#64748B', label: '', frames: [{at: 0, x: 290, y: 110}, {at: 4, x: 290, y: 110, o: 0.12}]},
        {id: 'cell-label', kind: 'text', fill: '#334155', label: 'tế bào vi khuẩn (chủ)', frames: [{at: 0, x: 330, y: 280}, {at: 4, x: 330, y: 280, label: 'tế bào chủ bị phá vỡ'}]},
        {id: 'host', kind: 'rect', w: 120, h: 8, fill: '#64748B', label: '', frames: [{at: 0, x: 380, y: 200}, {at: 2, x: 380, y: 200, o: 0.15}, {at: 3, x: 380, y: 200, o: 0}]},
        {id: 'head', kind: 'rect', w: 30, h: 30, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 0, x: 400, y: 36}, {at: 1, x: 400, y: 36, fill: '#DDD6FE'}]},
        {id: 'tail', kind: 'rect', w: 8, h: 44, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 0, x: 411, y: 66}]},
        {id: 'dna1', kind: 'rect', w: 56, h: 8, fill: '#F97316', label: '', frames: [{at: 0, x: 402, y: 46, o: 0}, {at: 1, x: 410, y: 150}]},
        {id: 'dna2', kind: 'rect', w: 56, h: 8, fill: '#F97316', label: '', frames: [{at: 2, x: 330, y: 170}, {at: 3, x: 330, y: 170, o: 0}]},
        {id: 'dna3', kind: 'rect', w: 56, h: 8, fill: '#F97316', label: '', frames: [{at: 2, x: 430, y: 235}, {at: 3, x: 430, y: 235, o: 0}]},
        {id: 'p1', kind: 'circle', r: 8, fill: '#22C55E', frames: [{at: 2, x: 350, y: 215}, {at: 3, x: 350, y: 215, o: 0}]},
        {id: 'p2', kind: 'circle', r: 8, fill: '#22C55E', frames: [{at: 2, x: 480, y: 170}, {at: 3, x: 480, y: 170, o: 0}]},
        {id: 'p3', kind: 'circle', r: 8, fill: '#22C55E', frames: [{at: 2, x: 540, y: 220}, {at: 3, x: 540, y: 220, o: 0}]},
        {id: 'n1', kind: 'pill', w: 34, h: 20, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 3, x: 340, y: 180}, {at: 4, x: 90, y: 60}]},
        {id: 'n2', kind: 'pill', w: 34, h: 20, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 3, x: 420, y: 160}, {at: 4, x: 90, y: 150}]},
        {id: 'n3', kind: 'pill', w: 34, h: 20, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 3, x: 480, y: 215}, {at: 4, x: 90, y: 240}]},
        {id: 'n4', kind: 'pill', w: 34, h: 20, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 3, x: 520, y: 175}, {at: 4, x: 180, y: 100}]},
        {id: 'n5', kind: 'pill', w: 34, h: 20, fill: '#7C3AED', stroke: '#4C1D95', label: '', frames: [{at: 3, x: 390, y: 225}, {at: 4, x: 180, y: 200}]},
      ],
      note: 'Chu kì tiềm tan: DNA virus gắn vào NST của tế bào chủ, nhân lên cùng tế bào; khi điều kiện thuận lợi có thể chuyển sang chu kì sinh tan. Tím = virus, cam = DNA virus, xanh lá = protein vỏ.',
    },
  },

  BIO_DNA_FORK: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'Chạc sao chép DNA: mạch liên tục và đoạn Okazaki',
    question:
      'Vì sao một mạch mới được tổng hợp liên tục còn mạch kia phải tổng hợp thành từng đoạn Okazaki? Vì sao gọi là nguyên tắc bán bảo toàn?',
    keywords: /okazaki|chac sao chep|diem khoi dau sao chep|ban bao toan|(?:dna|adn) polymerase|mach lien tuc/,
    examples: ['đoạn Okazaki', 'chạc sao chép', 'nguyên tắc bán bảo toàn'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'DNA mẹ xoắn kép', body: 'Hai mạch của phân tử DNA mẹ liên kết bổ sung với nhau (A–T, G–C).'},
        {title: 'Khởi đầu: tháo xoắn tạo chạc hình chữ Y', body: 'Protein và enzyme liên kết vào điểm khởi đầu sao chép, tách DNA thành hai mạch đơn, tạo chạc sao chép hình chữ Y. Mỗi mạch đơn làm khuôn.'},
        {title: 'Đoạn mồi', body: 'Enzyme RNA polymerase tổng hợp đoạn RNA ngắn (đoạn mồi) trên mạch khuôn, cung cấp đầu 3′-OH cho DNA polymerase.'},
        {title: 'Tổng hợp mạch mới', body: 'DNA polymerase chỉ nối nucleotide vào đầu 3′-OH nên mạch mới luôn kéo dài theo chiều 5′→3′. Một mạch được tổng hợp liên tục, mạch kia tổng hợp từng đoạn ngắn.'},
        {title: 'Mạch gián đoạn: các đoạn Okazaki', body: 'Trên mạch khuôn còn lại, mạch mới được tổng hợp thành từng đoạn ngắn gọi là đoạn Okazaki, mỗi đoạn có mồi riêng.'},
        {title: 'Nối các đoạn Okazaki', body: 'Một loại enzyme nối nối các đoạn Okazaki lại thành mạch hoàn chỉnh.'},
        {title: 'Kết quả: bán bảo toàn', body: 'Từ một DNA mẹ tạo hai DNA con giống nhau và giống mẹ; mỗi DNA con gồm một mạch cũ (của mẹ) và một mạch mới tổng hợp.'},
      ],
      items: [
        {id: 's1L', kind: 'rect', w: 240, h: 10, fill: '#7C3AED', label: '', frames: [{at: 0, x: 60, y: 120}]},
        {id: 's2L', kind: 'rect', w: 240, h: 10, fill: '#2563EB', label: '', frames: [{at: 0, x: 60, y: 136}]},
        {id: 's1R', kind: 'rect', w: 280, h: 10, fill: '#7C3AED', label: '', frames: [{at: 0, x: 300, y: 120}, {at: 1, x: 300, y: 64}]},
        {id: 's2R', kind: 'rect', w: 280, h: 10, fill: '#2563EB', label: '', frames: [{at: 0, x: 300, y: 136}, {at: 1, x: 300, y: 192}]},
        {id: 'helicase', kind: 'pill', w: 130, h: 24, fill: '#FECACA', stroke: '#DC2626', label: 'enzyme tháo xoắn', frames: [{at: 1, x: 236, y: 150}, {at: 3, x: 236, y: 150, o: 0}]},
        {id: 'primer1', kind: 'rect', w: 24, h: 10, fill: '#EF4444', label: '', frames: [{at: 2, x: 300, y: 78}]},
        {id: 'primer2', kind: 'rect', w: 20, h: 10, fill: '#EF4444', label: '', frames: [{at: 2, x: 300, y: 178}]},
        {id: 'primer-label', kind: 'text', fill: '#B91C1C', label: 'đoạn mồi RNA', frames: [{at: 2, x: 300, y: 266}, {at: 3, x: 300, y: 266, o: 0}]},
        {id: 'n1a', kind: 'rect', w: 120, h: 10, fill: '#C4B5FD', label: '', frames: [{at: 3, x: 324, y: 78}]},
        {id: 'n1b', kind: 'rect', w: 160, h: 10, fill: '#C4B5FD', label: '', frames: [{at: 4, x: 444, y: 78}]},
        {id: 'o1', kind: 'rect', w: 70, h: 10, fill: '#93C5FD', label: '', frames: [{at: 3, x: 322, y: 178}, {at: 5, x: 322, y: 178, o: 0}]},
        {id: 'o2', kind: 'rect', w: 70, h: 10, fill: '#93C5FD', label: '', frames: [{at: 4, x: 400, y: 178}, {at: 5, x: 400, y: 178, o: 0}]},
        {id: 'o3', kind: 'rect', w: 70, h: 10, fill: '#93C5FD', label: '', frames: [{at: 4, x: 478, y: 178}, {at: 5, x: 478, y: 178, o: 0}]},
        {id: 'n2', kind: 'rect', w: 226, h: 10, fill: '#93C5FD', label: '', frames: [{at: 5, x: 322, y: 178}]},
        {id: 'ligase', kind: 'pill', w: 100, h: 22, fill: '#E9D5FF', stroke: '#7C3AED', label: 'enzyme nối', frames: [{at: 5, x: 420, y: 216}, {at: 6, x: 420, y: 216, o: 0}]},
        {id: 'ok-label', kind: 'text', fill: '#1E40AF', label: 'đoạn Okazaki', frames: [{at: 4, x: 400, y: 168}, {at: 5, x: 400, y: 168, o: 0}]},
        {id: 'res1', kind: 'text', fill: '#4C1D95', label: 'DNA con 1: cũ (đậm) + mới (nhạt)', frames: [{at: 6, x: 60, y: 40}]},
        {id: 'res2', kind: 'text', fill: '#1E3A8A', label: 'DNA con 2: cũ (đậm) + mới (nhạt)', frames: [{at: 6, x: 60, y: 252}]},
      ],
      note: 'Hình minh họa đơn giản: chỉ vẽ một chạc sao chép; đoạn mới ngắn hơn thực tế.',
    },
  },
};
