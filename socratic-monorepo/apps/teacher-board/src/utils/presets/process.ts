import type {PresetSpec} from './types';

export const PROCESS_PRESETS: Record<string, PresetSpec> = {
  BIO_GENE_ENGINEERING: {
    family: 'PROCESS_STEPS',
    engine: 'BIOLOGY',
    title: 'DNA tái tổ hợp và chuyển gene',
    question:
      'Vì sao phải dùng cùng một loại enzyme giới hạn để cắt gene và plasmid? Điều gì cho phép vi khuẩn sản xuất protein của người sau khi nhận plasmid tái tổ hợp?',
    keywords: /(?:dna|adn) tai to hop|cong nghe (?:dna|adn|gene|gen)\b|plasmid|enzyme gioi han|recombinant/,
    examples: ['DNA tái tổ hợp', 'plasmid và enzyme giới hạn', 'công nghệ gene'],
    data: {
      viewBox: [640, 300],
      steps: [
        {title: 'Tách gene và plasmid', body: 'Tách DNA từ tế bào cho (ví dụ gene insulin của người) và plasmid từ vi khuẩn dùng làm vector. Plasmid là DNA vòng nhỏ, có khả năng tái bản.'},
        {title: 'Cắt bằng enzyme giới hạn', body: 'Cùng một enzyme giới hạn cắt gene và cắt mở vòng plasmid, tạo hai đầu dính bổ sung.'},
        {title: 'Nối bằng ligase', body: 'Enzyme ligase nối gene vào plasmid theo nguyên tắc bổ sung ở đầu dính, tạo plasmid tái tổ hợp.'},
        {title: 'Biến nạp vào E. coli', body: 'Đưa plasmid tái tổ hợp vào tế bào vi khuẩn. Plasmid tái bản cùng tế bào chủ.'},
        {title: 'Nhân dòng và biểu hiện', body: 'Vi khuẩn phân chia thành nhiều tế bào mang gene chuyển và tổng hợp protein của gene (ví dụ insulin người); sản phẩm được tách và tinh chế.'},
      ],
      items: [
        {id: 'cell', kind: 'pill', w: 200, h: 120, fill: '#F1F5F9', stroke: '#64748B', label: '', frames: [{at: 3, x: 380, y: 130}]},
        {id: 'cell-label', kind: 'text', fill: '#334155', label: 'E. coli', frames: [{at: 3, x: 450, y: 256}]},
        {id: 'cell2', kind: 'pill', w: 90, h: 56, fill: '#F1F5F9', stroke: '#64748B', label: '', frames: [{at: 4, x: 380, y: 30}]},
        {id: 'cell3', kind: 'pill', w: 90, h: 56, fill: '#F1F5F9', stroke: '#64748B', label: '', frames: [{at: 4, x: 490, y: 30}]},
        {id: 'dna', kind: 'rect', w: 190, h: 26, fill: '#BFDBFE', stroke: '#2563EB', label: 'DNA người', frames: [{at: 0, x: 24, y: 36}]},
        {id: 'gene', kind: 'rect', w: 56, h: 26, fill: '#F59E0B', stroke: '#B45309', label: 'gene', frames: [{at: 0, x: 150, y: 36}, {at: 1, x: 250, y: 36, label: 'gene (đầu dính)'}, {at: 2, x: 84, y: 206, o: 0}]},
        {id: 'plasmid', kind: 'circle', r: 46, fill: '#DCFCE7', stroke: '#16A34A', label: 'plasmid', frames: [{at: 0, x: 120, y: 214}, {at: 1, x: 120, y: 214, label: 'plasmid mở', fill: '#F0FDF4'}, {at: 2, x: 120, y: 214, label: 'tái tổ hợp', fill: '#FDE68A'}, {at: 3, x: 480, y: 190}]},
        {id: 'enzyme', kind: 'pill', w: 150, h: 26, fill: '#FECACA', stroke: '#DC2626', label: 'enzyme giới hạn', frames: [{at: 1, x: 170, y: 118}, {at: 2, x: 170, y: 118, o: 0}]},
        {id: 'ligase', kind: 'pill', w: 90, h: 26, fill: '#E9D5FF', stroke: '#7C3AED', label: 'ligase', frames: [{at: 2, x: 190, y: 118}, {at: 3, x: 190, y: 118, o: 0}]},
        {id: 'prod1', kind: 'circle', r: 9, fill: '#EF4444', frames: [{at: 4, x: 430, y: 160}]},
        {id: 'prod2', kind: 'circle', r: 9, fill: '#EF4444', frames: [{at: 4, x: 560, y: 150}]},
        {id: 'prod3', kind: 'circle', r: 9, fill: '#EF4444', frames: [{at: 4, x: 520, y: 100}]},
        {id: 'prod-label', kind: 'text', fill: '#B91C1C', label: 'insulin (protein của gene chuyển)', frames: [{at: 4, x: 360, y: 290}]},
      ],
      note: 'Bấm "Bước tiếp" hoặc ▶ để chạy quy trình; chạm một bước để nhảy tới.',
    },
  },
};
