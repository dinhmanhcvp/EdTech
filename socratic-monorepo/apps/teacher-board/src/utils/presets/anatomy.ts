import type {PresetSpec} from './types';

export const ANATOMY_PRESETS: Record<string, PresetSpec> = {
  BIO_DIGESTIVE_SYSTEM: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Hệ tiêu hóa ở người',
    question:
      'Thức ăn đi qua những đoạn nào của ống tiêu hóa, và ở mỗi đoạn enzyme nào biến đổi chất nào? Vì sao phần lớn việc hấp thụ diễn ra ở ruột non?',
    keywords: /he tieu hoa|ong tieu hoa|tieu hoa (?:o )?nguoi|enzyme tieu hoa|digestive/,
    examples: ['hệ tiêu hóa', 'ống tiêu hóa ở người', 'tiêu hóa ở người'],
    data: {
      viewBox: [340, 450],
      tour: ['mouth', 'esophagus', 'stomach', 'liver', 'gallbladder', 'pancreas', 'small', 'large', 'anus'],
      flow: {
        label: 'Đường đi của thức ăn',
        color: '#2563EB',
        d: 'M162 34 V120 C175 150 190 175 196 238 C250 248 250 268 196 274 S150 296 196 304 S250 324 196 332 S150 350 196 358 L130 360 L118 352 V236 H272 V352 Q272 395 220 405 V426',
      },
      parts: [
        {
          id: 'mouth', label: 'Miệng', d: 'M128 34 a34 16 0 1 0 68 0 a34 16 0 1 0 -68 0 Z', fill: '#F3A6A6', stroke: '#B45353', labelAt: [206, 24],
          title: 'Miệng',
          body: 'Răng, lưỡi nhai và trộn thức ăn với nước bọt (tiêu hóa cơ học). Enzyme amylase trong nước bọt bắt đầu thủy phân tinh bột thành đường maltose (tiêu hóa hóa học).',
          facts: [['Cơ học', 'nhai, trộn với nước bọt'], ['Enzyme', 'amylase nước bọt'], ['Sản phẩm', 'maltose']],
        },
        {
          id: 'esophagus', label: 'Thực quản', d: 'M162 50 V126', stroke: '#E8A598', strokeWidth: 12, labelAt: [178, 90],
          title: 'Thực quản',
          body: 'Phản xạ nuốt chuyển thức ăn từ miệng xuống thực quản. Thực quản bóp tạo nhu động kiểu lan sóng, đẩy thức ăn xuống dạ dày.',
          facts: [['Cơ học', 'nhu động lan sóng'], ['Tiêu hóa hóa học', 'không có']],
        },
        {
          id: 'liver', label: 'Gan', d: 'M70 128 C70 100 130 98 150 118 L150 160 C120 178 78 168 70 128 Z', fill: '#A0522D', stroke: '#6B3410', labelAt: [22, 104],
          title: 'Gan',
          body: 'Sản xuất dịch mật. Mật làm giảm sức căng bề mặt của các giọt lipid lớn, tạo giọt nhỏ, tăng diện tích tác dụng của lipase.',
          facts: [['Dịch tiết', 'mật'], ['Tác dụng', 'nhũ tương hóa lipid']],
        },
        {
          id: 'gallbladder', label: 'Túi mật', d: 'M132 168 q10 -6 12 8 q-2 14 -12 8 q-6 -8 0 -16 Z', fill: '#5B8C3A', stroke: '#3B5E24', labelAt: [60, 196],
          title: 'Túi mật',
          body: 'Chứa dịch mật do gan tiết ra, đổ vào ruột non khi có thức ăn chứa lipid.',
          facts: [['Chứa', 'dịch mật']],
        },
        {
          id: 'stomach', label: 'Dạ dày', d: 'M150 124 C128 130 128 186 160 196 C204 206 240 180 232 150 C226 128 196 112 168 120 Z', fill: '#F2A7A0', stroke: '#B45353', labelAt: [236, 140],
          title: 'Dạ dày',
          body: 'Co bóp làm nhỏ thức ăn và trộn với dịch vị (tiêu hóa cơ học). Enzyme pepsin và HCl trong dịch vị phân giải protein thành các peptide. Nhu động đẩy thức ăn qua môn vị xuống ruột non.',
          facts: [['Cơ học', 'co bóp, trộn dịch vị'], ['Enzyme', 'pepsin + HCl'], ['Sản phẩm', 'peptide']],
        },
        {
          id: 'pancreas', label: 'Tụy', d: 'M170 214 q40 -14 78 -2 q4 12 -20 16 q-40 6 -58 -14 Z', fill: '#F6D77B', stroke: '#B8902B', labelAt: [256, 214],
          title: 'Tuyến tụy',
          body: 'Tiết dịch tụy vào ruột non, chứa các enzyme amylase, lipase và protease (trypsin, chymotrypsin).',
          facts: [['Enzyme', 'amylase, lipase, protease']],
        },
        {
          id: 'small', label: 'Ruột non', d: 'M196 240 C250 248 250 268 196 274 S150 296 196 304 S250 324 196 332 S150 350 196 358', stroke: '#E9967A', strokeWidth: 13, labelAt: [132, 386],
          title: 'Ruột non',
          body: 'Nơi tiêu hóa hóa học chủ yếu và hấp thụ chất dinh dưỡng. Có nếp gấp, lông ruột và vi nhung mao tạo diện tích hấp thụ khoảng 250–300 m².',
          facts: [
            ['Tinh bột', 'amylase, maltase, lactase, sucrase → đường đơn'],
            ['Lipid', 'mật + lipase → glycerol, acid béo (monoglyceride)'],
            ['Protein', 'trypsin, chymotrypsin, peptidase → amino acid'],
            ['Hấp thụ', 'vận chuyển chủ động và thụ động; ~250–300 m²'],
          ],
        },
        {
          id: 'large', label: 'Ruột già', d: 'M118 352 V236 H272 V352', stroke: '#C98F5E', strokeWidth: 18, labelAt: [56, 300],
          title: 'Ruột già',
          body: 'Phần còn lại của thức ăn hầu như không còn chất dinh dưỡng đi vào ruột già, nhu động của ruột già đẩy về phía trực tràng và biến đổi thành phân.',
          facts: [['Cơ học', 'nhu động đẩy về trực tràng']],
        },
        {
          id: 'anus', label: 'Hậu môn', d: 'M272 352 Q272 395 220 405 V418 M212 426 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 Z', stroke: '#A86B3C', strokeWidth: 12, fill: '#7A4A2B', labelAt: [240, 436],
          title: 'Trực tràng và hậu môn',
          body: 'Phân được thải ra ngoài qua hậu môn.',
          facts: [['Chức năng', 'thải phân']],
        },
      ],
      note: 'Chạm một bộ phận để xem enzyme và sản phẩm; bấm "Đi theo thức ăn" để lần lượt qua từng bộ phận.',
    },
  },
};
