import type {PresetSpec} from './types';

const dot = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

export const SINH_ANATOMY_PRESETS: Record<string, PresetSpec> = {
  BIO_EUKARYOTE_CELL: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Tế bào nhân thực và các bào quan',
    question:
      'Bào quan nào tổng hợp protein, bào quan nào đóng gói và vận chuyển protein, bào quan nào tạo ATP? Vì sao tế bào nhân thực cần hệ thống màng bên trong như vậy?',
    keywords: /te bao nhan thuc|cac bao quan|cau truc te bao|bo may golgi|luoi noi chat|\blysosome\b|\bribosome\b/,
    examples: ['tế bào nhân thực', 'các bào quan', 'cấu trúc tế bào'],
    data: {
      viewBox: [340, 300],
      tour: ['membrane', 'nucleus', 'ribosome', 'er', 'golgi', 'mito', 'lysosome'],
      parts: [
        {
          id: 'membrane', label: 'Màng sinh chất', d: 'M30 150 a140 110 0 1 0 280 0 a140 110 0 1 0 -280 0 Z', fill: '#FEF9C3', stroke: '#A16207', strokeWidth: 3, labelAt: [36, 36],
          title: 'Màng sinh chất',
          body: 'Màng khảm động gồm lớp kép phospholipid và protein; bao bọc tế bào và kiểm soát sự ra vào của các chất.',
          facts: [['Cấu trúc', 'lớp kép phospholipid + protein'], ['Chức năng', 'vận chuyển chọn lọc, truyền tin']],
        },
        {
          id: 'nucleus', label: 'Nhân', d: 'M108 140 a42 42 0 1 0 84 0 a42 42 0 1 0 -84 0 Z', fill: '#BFDBFE', stroke: '#1D4ED8', strokeWidth: 2.5, labelAt: [128, 142],
          title: 'Nhân tế bào',
          body: 'Chứa DNA; là trung tâm điều khiển hoạt động của tế bào. Màng nhân có các lỗ nhân cho phép trao đổi chất với tế bào chất.',
          facts: [['Chứa', 'DNA (vật chất di truyền)'], ['Chức năng', 'điều khiển hoạt động tế bào']],
        },
        {
          id: 'ribosome', label: 'Ribosome', d: `${dot(80, 110, 4)} ${dot(95, 100, 4)} ${dot(70, 190, 4)} ${dot(205, 90, 4)} ${dot(250, 120, 4)}`, fill: '#374151', stroke: '#111827', labelAt: [40, 96],
          title: 'Ribosome',
          body: 'Bào quan nhỏ không có màng; tổng hợp protein theo thông tin của mRNA. Có thể tự do trong tế bào chất hoặc bám trên lưới nội chất hạt.',
          facts: [['Chức năng', 'tổng hợp protein (dịch mã)']],
        },
        {
          id: 'er', label: 'Lưới nội chất', d: 'M205 118 q22 -12 22 8 t22 8 t-22 8 t22 8', stroke: '#8B5CF6', strokeWidth: 7, labelAt: [226, 108],
          title: 'Lưới nội chất',
          body: 'Hệ thống ống và túi màng thông với màng nhân. Lưới nội chất hạt có ribosome bám, tổng hợp protein; lưới nội chất trơn tổng hợp lipid và giải độc.',
          facts: [['Hạt', 'tổng hợp protein (có ribosome)'], ['Trơn', 'tổng hợp lipid, giải độc']],
        },
        {
          id: 'golgi', label: 'Bộ máy Golgi', d: 'M205 195 q25 -8 50 0 M205 205 q25 -8 50 0 M205 215 q25 -8 50 0', stroke: '#F59E0B', strokeWidth: 6, labelAt: [200, 238],
          title: 'Bộ máy Golgi',
          body: 'Chồng túi màng dẹt; biến đổi, đóng gói protein và lipid vào túi tiết rồi phân phối đến nơi cần thiết hoặc xuất bào.',
          facts: [['Chức năng', 'biến đổi, đóng gói, phân phối']],
        },
        {
          id: 'mito', label: 'Ti thể', d: 'M84 215 a26 13 0 1 0 52 0 a26 13 0 1 0 -52 0 Z M92 215 q9 -8 18 0 t18 0', fill: '#FCA5A5', stroke: '#B91C1C', strokeWidth: 2, labelAt: [84, 245],
          title: 'Ti thể',
          body: 'Bào quan có màng kép; màng trong gấp nếp. Là nơi diễn ra hô hấp tế bào, tổng hợp phần lớn ATP cung cấp năng lượng cho tế bào; có DNA riêng.',
          facts: [['Chức năng', 'hô hấp tế bào, tạo ATP'], ['Cấu trúc', 'màng kép, màng trong gấp nếp']],
        },
        {
          id: 'lysosome', label: 'Lysosome', d: dot(272, 160, 12), fill: '#86EFAC', stroke: '#15803D', strokeWidth: 2, labelAt: [250, 192],
          title: 'Lysosome',
          body: 'Túi màng chứa enzyme thủy phân; tiêu hóa các thành phần của tế bào đã già hoặc hỏng và các vật liệu đưa vào bằng thực bào.',
          facts: [['Chứa', 'enzyme thủy phân'], ['Chức năng', 'tiêu hóa nội bào']],
        },
      ],
      note: 'Tế bào thực vật còn có thành tế bào, lục lạp và không bào lớn (không vẽ ở đây).',
    },
  },

  BIO_HEART_CIRCULATION: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Cấu tạo tim và vòng tuần hoàn máu',
    question:
      'Máu đi qua những ngăn tim và mạch nào theo thứ tự trong vòng tuần hoàn phổi và vòng tuần hoàn hệ thống? Van tim có vai trò gì?',
    keywords: /tuan hoan (?:mau|kin|kep)|cau tao (?:cua )?tim|bon ngan tim|van tim|vong tuan hoan/,
    examples: ['tuần hoàn máu', 'cấu tạo tim', 'van tim và bốn ngăn tim'],
    data: {
      viewBox: [340, 400],
      tour: ['vc', 'ra', 'valve-r', 'rv', 'pa', 'lung', 'pv', 'la', 'valve-l', 'lv', 'aorta', 'body'],
      flow: {
        label: 'Đường đi của máu',
        color: '#DC2626',
        d: 'M60 350 V150 H115 V230 H165 V74 C165 50 190 45 240 60 V140 H225 V240 H250 V250 H305 V345 Q305 372 250 372 H70 Q60 372 60 350',
      },
      parts: [
        {
          id: 'lung', label: 'Phổi', d: 'M70 45 a100 26 0 1 0 200 0 a100 26 0 1 0 -200 0 Z', fill: '#FBCFE8', stroke: '#BE185D', labelAt: [140, 49],
          title: 'Phổi',
          body: 'Nơi trao đổi khí: máu nhận O₂ và thải CO₂ rồi theo tĩnh mạch phổi về tim.',
          facts: [['Vòng', 'tuần hoàn phổi']],
        },
        {
          id: 'body', label: 'Các cơ quan của cơ thể', d: 'M50 360 a120 22 0 1 0 240 0 a120 22 0 1 0 -240 0 Z', fill: '#E7E5E4', stroke: '#78716C', labelAt: [100, 364],
          title: 'Các cơ quan',
          body: 'Mao mạch trao đổi chất với tế bào: máu nhường O₂ và chất dinh dưỡng, nhận CO₂ và chất thải rồi về tim theo tĩnh mạch chủ.',
          facts: [['Vòng', 'tuần hoàn hệ thống']],
        },
        {
          id: 'vc', label: 'Tĩnh mạch chủ', d: 'M60 345 V150 H82', stroke: '#3B82F6', strokeWidth: 12, labelAt: [6, 250],
          title: 'Tĩnh mạch chủ',
          body: 'Đưa máu nghèo O₂ từ các cơ quan về tâm nhĩ phải.',
          facts: [['Máu', 'nghèo O₂'], ['Về', 'tâm nhĩ phải']],
        },
        {
          id: 'ra', label: 'Tâm nhĩ phải', d: 'M82 110 h70 v62 h-70 Z', fill: '#93C5FD', stroke: '#1D4ED8', strokeWidth: 2, labelAt: [88, 144],
          title: 'Tâm nhĩ phải',
          body: 'Nhận máu từ tĩnh mạch chủ, co lại đẩy máu xuống tâm thất phải.',
          facts: [['Nhận', 'máu từ tĩnh mạch chủ']],
        },
        {
          id: 'valve-r', label: '', d: 'M86 175 h64', stroke: '#111827', strokeWidth: 6, labelAt: [86, 172],
          title: 'Van nhĩ thất phải (van ba lá)',
          body: 'Giữa tâm nhĩ và tâm thất có van tim cho máu đi theo một chiều, từ nhĩ xuống thất.',
          facts: [['Chức năng', 'máu đi một chiều']],
        },
        {
          id: 'rv', label: 'Tâm thất phải', d: 'M82 180 h72 v100 q0 24 -36 24 q-36 0 -36 -24 Z', fill: '#60A5FA', stroke: '#1D4ED8', strokeWidth: 2, labelAt: [86, 240],
          title: 'Tâm thất phải',
          body: 'Co bóp đẩy máu vào động mạch phổi (vòng tuần hoàn phổi).',
          facts: [['Bơm máu vào', 'động mạch phổi']],
        },
        {
          id: 'pa', label: 'Động mạch phổi', d: 'M152 190 H165 V76', stroke: '#2563EB', strokeWidth: 10, labelAt: [52, 98],
          title: 'Động mạch phổi',
          body: 'Đưa máu nghèo O₂ từ tâm thất phải lên phổi. Van động mạch không cho máu chảy ngược về tim.',
          facts: [['Máu', 'nghèo O₂']],
        },
        {
          id: 'pv', label: 'Tĩnh mạch phổi', d: 'M240 70 V110', stroke: '#EF4444', strokeWidth: 10, labelAt: [246, 92],
          title: 'Tĩnh mạch phổi',
          body: 'Đưa máu giàu O₂ từ phổi về tâm nhĩ trái.',
          facts: [['Máu', 'giàu O₂']],
        },
        {
          id: 'la', label: 'Tâm nhĩ trái', d: 'M190 110 h70 v62 h-70 Z', fill: '#FCA5A5', stroke: '#B91C1C', strokeWidth: 2, labelAt: [196, 144],
          title: 'Tâm nhĩ trái',
          body: 'Nhận máu giàu O₂ từ tĩnh mạch phổi, co lại đẩy máu xuống tâm thất trái.',
          facts: [['Nhận', 'máu từ tĩnh mạch phổi']],
        },
        {
          id: 'valve-l', label: '', d: 'M196 175 h64', stroke: '#111827', strokeWidth: 6, labelAt: [196, 172],
          title: 'Van nhĩ thất trái (van hai lá)',
          body: 'Van tim giữa tâm nhĩ trái và tâm thất trái, chỉ cho máu đi từ nhĩ xuống thất.',
          facts: [['Chức năng', 'máu đi một chiều']],
        },
        {
          id: 'lv', label: 'Tâm thất trái', d: 'M180 180 h90 v100 q0 24 -45 24 q-45 0 -45 -24 Z', fill: '#F87171', stroke: '#B91C1C', strokeWidth: 2, labelAt: [190, 240],
          title: 'Tâm thất trái',
          body: 'Thành cơ dày nhất; co bóp đẩy máu vào động mạch chủ đi nuôi cơ thể (vòng tuần hoàn hệ thống).',
          facts: [['Bơm máu vào', 'động mạch chủ'], ['Thành cơ', 'dày nhất']],
        },
        {
          id: 'aorta', label: 'Động mạch chủ', d: 'M270 250 H305 V345', stroke: '#DC2626', strokeWidth: 12, labelAt: [196, 326],
          title: 'Động mạch chủ',
          body: 'Đưa máu giàu O₂ từ tâm thất trái đến các cơ quan.',
          facts: [['Máu', 'giàu O₂']],
        },
      ],
      note: 'Chu kì tim ở người trưởng thành khoảng 0,8 s: tâm nhĩ co 0,1 s, tâm thất co 0,3 s, dãn chung 0,4 s (≈ 75 nhịp/phút). Hình là sơ đồ (tim vẽ theo vị trí người đối diện).',
    },
  },

  BIO_NEPHRON: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Nephron và sự tạo thành nước tiểu',
    question:
      'Từ khoảng 180 L dịch lọc mỗi ngày, vì sao chỉ còn 1,5–2 L nước tiểu thải ra ngoài? Ba giai đoạn lọc, tái hấp thu và tiết diễn ra ở đâu?',
    keywords: /nephron|tao (?:thanh )?nuoc tieu|he tiet nieu|cau than|nang bowman|\bong than\b/,
    examples: ['nephron', 'sự tạo thành nước tiểu', 'cầu thận và nang Bowman'],
    data: {
      viewBox: [340, 390],
      tour: ['arteriole', 'capsule', 'glomerulus', 'tubule', 'capillary', 'collecting', 'pelvis'],
      flow: {label: 'Đường đi của dịch lọc', color: '#D97706', d: 'M150 100 C230 100 240 160 200 170 S120 200 160 230 S250 250 288 210 V320 q0 30 -30 40'},
      parts: [
        {
          id: 'capsule', label: 'Nang Bowman', d: 'M100 70 a50 50 0 1 0 100 0 a50 50 0 1 0 -100 0 Z', fill: '#FEF3C7', stroke: '#D97706', strokeWidth: 2.5, labelAt: [96, 22],
          title: 'Nang Bowman',
          body: 'Bao quanh cầu thận, thu nhận dịch lọc. Huyết áp đẩy nước và các chất hòa tan nhỏ từ máu qua lỗ lọc vào lòng nang.',
          facts: [['Giai đoạn', '1. Lọc'], ['Dịch lọc', '~180 L/ngày (từ 1700–1800 L máu); không có tế bào máu và protein']],
        },
        {
          id: 'glomerulus', label: 'Cầu thận', d: 'M110 70 a20 20 0 1 0 40 0 a20 20 0 1 0 -40 0 Z M118 70 q12 -14 24 0 q-12 14 -24 0', fill: '#FCA5A5', stroke: '#B91C1C', strokeWidth: 2, labelAt: [112, 112],
          title: 'Cầu thận',
          body: 'Búi mao mạch: máu từ tiểu động mạch đến bị lọc ở đây; phần không lọc theo tiểu động mạch đi ra.',
          facts: [['Giai đoạn', '1. Lọc']],
        },
        {
          id: 'arteriole', label: 'Tiểu động mạch đến', d: 'M24 70 H108', stroke: '#EF4444', strokeWidth: 9, labelAt: [10, 52],
          title: 'Tiểu động mạch đến',
          body: 'Đưa máu có huyết áp cao vào cầu thận để lọc.',
          facts: [['Mang', 'máu từ động mạch thận']],
        },
        {
          id: 'capillary', label: 'Mao mạch quanh ống thận', d: 'M110 108 C60 160 60 230 150 270', stroke: '#F87171', strokeWidth: 5, labelAt: [14, 214],
          title: 'Mao mạch quanh ống thận',
          body: 'Nhận lại nước và các chất được tái hấp thu từ ống thận, đồng thời đưa chất độc và ion dư thừa sang ống thận để tiết.',
          facts: [['Giai đoạn', '2. Tái hấp thu · 3. Tiết']],
        },
        {
          id: 'tubule', label: 'Ống thận', d: 'M180 100 C230 100 240 160 200 170 S120 200 160 230 S250 250 288 210', stroke: '#FBBF24', strokeWidth: 14, labelAt: [210, 266],
          title: 'Ống thận',
          body: 'Tế bào ống thận tái hấp thu nước, glucose, amino acid, các ion cần thiết (Na⁺, HCO₃⁻…) trả về máu và tiết chất độc, ion dư (H⁺, K⁺) vào dịch lọc.',
          facts: [['2. Tái hấp thu', 'nước, glucose, amino acid, Na⁺, HCO₃⁻…'], ['3. Tiết', 'chất độc, H⁺, K⁺ dư thừa']],
        },
        {
          id: 'collecting', label: 'Ống góp', d: 'M288 40 V300', stroke: '#B45309', strokeWidth: 18, labelAt: [296, 130],
          title: 'Ống góp',
          body: 'Nhận nước tiểu từ nhiều nephron, hấp thụ bớt nước rồi chuyển nước tiểu chính thức vào bể thận. Mỗi ngày chỉ còn khoảng 1,5–2 L nước tiểu.',
          facts: [['Kết quả', '1,5–2 L nước tiểu/ngày']],
        },
        {
          id: 'pelvis', label: 'Bể thận → niệu quản', d: 'M288 300 q0 36 -30 56', stroke: '#8B5CF6', strokeWidth: 14, labelAt: [200, 372],
          title: 'Bể thận và niệu quản',
          body: 'Nước tiểu chảy vào bể thận, theo niệu quản xuống bàng quang để lưu trữ trước khi thải ra ngoài.',
          facts: [['Tiếp theo', 'niệu quản → bàng quang → niệu đạo']],
        },
      ],
      note: 'Mỗi quả thận có khoảng một triệu nephron. Hình vẽ rút gọn: chỉ một nephron.',
    },
  },

  BIO_FLOWER_STRUCTURE: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Cấu tạo hoa và thụ tinh kép',
    question:
      'Bộ phận nào của hoa chứa hạt phấn, bộ phận nào chứa noãn? Vì sao thụ tinh ở thực vật có hoa gọi là thụ tinh kép và sản phẩm của nó là gì?',
    keywords: /cau tao (?:cua )?hoa|hoa luong tinh|hoa don tinh|bao phan|tui phoi|thu tinh kep|\bong phan\b/,
    examples: ['cấu tạo hoa', 'túi phôi và thụ tinh kép', 'hoa lưỡng tính'],
    data: {
      viewBox: [300, 330],
      tour: ['sepal', 'petal', 'filament', 'anther', 'stigma', 'style', 'ovary', 'ovule'],
      parts: [
        {
          id: 'petal', label: 'Cánh hoa', d: 'M150 285 C70 275 40 190 90 150 C120 195 140 235 150 285 Z M150 285 C230 275 260 190 210 150 C180 195 160 235 150 285 Z', fill: '#F9A8D4', stroke: '#BE185D', strokeWidth: 2, labelAt: [6, 160],
          title: 'Cánh hoa',
          body: 'Thường có màu sắc sặc sỡ, thu hút côn trùng giúp thụ phấn.',
          facts: [['Chức năng', 'thu hút sinh vật thụ phấn'], ['Bộ phận', 'không sinh sản']],
        },
        {
          id: 'sepal', label: 'Đài hoa', d: 'M150 310 C100 315 80 292 85 270 C115 282 138 288 150 292 Z M150 310 C200 315 220 292 215 270 C185 282 162 288 150 292 Z', fill: '#86EFAC', stroke: '#15803D', strokeWidth: 2, labelAt: [6, 300],
          title: 'Lá đài (đài hoa)',
          body: 'Thường màu lục, bao bọc và bảo vệ chồi hoa trước khi hoa nở.',
          facts: [['Chức năng', 'bảo vệ chồi hoa'], ['Bộ phận', 'không sinh sản']],
        },
        {
          id: 'filament', label: 'Chỉ nhị', d: 'M115 288 L100 198 M185 288 L200 198', stroke: '#CA8A04', strokeWidth: 5, labelAt: [214, 246],
          title: 'Chỉ nhị',
          body: 'Phần cuống của nhị, đỡ bao phấn.',
          facts: [['Thuộc', 'nhị (bộ phận sinh sản đực)']],
        },
        {
          id: 'anther', label: 'Bao phấn', d: 'M91 184 a9 14 0 1 0 18 0 a9 14 0 1 0 -18 0 Z M191 184 a9 14 0 1 0 18 0 a9 14 0 1 0 -18 0 Z', fill: '#FACC15', stroke: '#A16207', strokeWidth: 2, labelAt: [214, 180],
          title: 'Bao phấn',
          body: 'Chứa các túi bào tử (tiểu bào tử). Tế bào mẹ giảm phân tạo bốn tiểu bào tử đơn bội; mỗi tiểu bào tử nguyên phân thành hạt phấn (thể giao tử đực), chứa nhân ống phấn và nhân sinh sản.',
          facts: [['Tạo ra', 'hạt phấn'], ['Hạt phấn', 'tế bào có thành dày, chứa 2 nhân đơn bội']],
        },
        {
          id: 'stigma', label: 'Núm nhụy', d: 'M138 152 a12 8 0 1 0 24 0 a12 8 0 1 0 -24 0 Z', fill: '#4ADE80', stroke: '#15803D', strokeWidth: 2, labelAt: [168, 148],
          title: 'Núm nhụy',
          body: 'Nơi tiếp nhận hạt phấn trong quá trình thụ phấn.',
          facts: [['Chức năng', 'nhận hạt phấn']],
        },
        {
          id: 'style', label: 'Vòi nhụy', d: 'M150 160 V248', stroke: '#16A34A', strokeWidth: 7, labelAt: [160, 210],
          title: 'Vòi nhụy',
          body: 'Ống phấn do hạt phấn nảy ra sinh trưởng kéo dài theo vòi nhụy tới túi phôi, mang hai tinh tử.',
          facts: [['Đường đi của ống phấn', 'núm nhụy → vòi nhụy → noãn']],
        },
        {
          id: 'ovary', label: 'Bầu nhụy', d: 'M128 270 a22 28 0 1 0 44 0 a22 28 0 1 0 -44 0 Z', fill: '#BBF7D0', stroke: '#15803D', strokeWidth: 2, labelAt: [176, 276],
          title: 'Bầu nhụy',
          body: 'Chứa một hay nhiều noãn. Sau thụ tinh, bầu nhụy phát triển thành quả (bảo vệ và phát tán hạt).',
          facts: [['Phát triển thành', 'quả']],
        },
        {
          id: 'ovule', label: 'Noãn', d: 'M142 272 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z', fill: '#FEF08A', stroke: '#A16207', strokeWidth: 2, labelAt: [90, 275],
          title: 'Noãn và túi phôi',
          body: 'Trong noãn, tế bào mẹ đại bào tử giảm phân tạo 4 đại bào tử, 3 tiêu biến, 1 nguyên phân 3 lần thành túi phôi 8 nhân (thể giao tử cái): 1 tế bào trứng, 2 nhân cực, 3 tế bào đối cực, 2 tế bào kèm. Thụ tinh kép: 1 tinh tử + trứng → hợp tử (2n); 1 tinh tử + 2 nhân cực → nhân tam bội (3n) phát triển thành nội nhũ. Noãn thành hạt.',
          facts: [['Túi phôi', '8 nhân, 7 tế bào'], ['Thụ tinh kép', 'hợp tử 2n + nội nhũ 3n'], ['Noãn phát triển thành', 'hạt']],
        },
      ],
      note: 'Hoa lưỡng tính có cả nhị và nhụy (như hình); hoa đơn tính chỉ có nhị hoặc chỉ có nhụy.',
    },
  },
};
