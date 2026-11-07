import type {PresetSpec} from './types';

export const SINH2_ANAT_PRESETS: Record<string, PresetSpec> = {
  BIO_RESPIRATORY_SYSTEM: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Hệ hô hấp ở người và trao đổi khí ở phế nang',
    question: 'Không khí đi qua những bộ phận nào trước khi tới phế nang, và vì sao phế nang là nơi trao đổi khí hiệu quả? Cơ hoành và cơ liên sườn giúp thông khí thế nào?',
    keywords: /he ho hap|phe nang|khi quan|phe quan|thong khi o phoi|trao doi khi o phoi|co hoanh|ho hap o nguoi/,
    examples: ['hệ hô hấp', 'phế nang', 'trao đổi khí ở phổi', 'cơ hoành'],
    data: {
      viewBox: [340, 430],
      tour: ['nose', 'trachea', 'bronchi', 'lungs', 'alveoli', 'diaphragm'],
      flow: {label: 'Đường đi của không khí khi hít vào', color: '#2563EB', d: 'M170 40 V170 L125 215 L108 292'},
      parts: [
        {id: 'nose', label: 'Mũi', d: 'M150 40 a20 14 0 1 0 40 0 a20 14 0 1 0 -40 0 Z', fill: '#FBCFE8', stroke: '#BE185D', labelAt: [200, 36], title: 'Mũi và khoang mũi', body: 'Lông mũi và chất nhầy giữ bụi, mao mạch dày đặc sưởi ấm, hơi ẩm làm ẩm không khí trước khi vào phổi.', facts: [['Chức năng', 'lọc, làm ẩm, làm ấm']]},
        {id: 'trachea', label: 'Khí quản', d: 'M170 54 V170', stroke: '#93C5FD', strokeWidth: 14, labelAt: [100, 96], title: 'Khí quản', body: 'Ống dẫn khí có các vòng sụn hình chữ C giữ cho ống luôn mở; niêm mạc có lông rung quét chất nhầy và bụi ra ngoài.', facts: [['Cấu tạo', 'vòng sụn chữ C, lông rung'], ['Chức năng', 'dẫn khí, bảo vệ']]},
        {id: 'bronchi', label: 'Phế quản', d: 'M170 170 L120 215 M170 170 L220 215', stroke: '#60A5FA', strokeWidth: 10, labelAt: [248, 98], title: 'Phế quản', body: 'Khí quản chia thành hai phế quản chính, rồi phân nhánh nhiều lần thành tiểu phế quản đến các phế nang.', facts: [['Phân nhánh', 'tới tận phế nang']]},
        {id: 'lungs', label: 'Phổi', d: 'M110 110 C60 130 55 290 90 335 C125 345 150 300 150 210 C150 160 135 110 110 110 Z M230 110 C280 130 285 290 250 335 C215 345 190 300 190 210 C190 160 205 110 230 110 Z', fill: '#FECACA', stroke: '#B91C1C', labelAt: [20, 230], title: 'Hai lá phổi', body: 'Mỗi phổi gồm hàng trăm triệu phế nang, được bao ngoài bởi hai lớp màng phổi có chất dịch giúp giảm ma sát khi thở.', facts: [['Số phế nang', '300–700 triệu'], ['Màng phổi', 'hai lớp, có dịch']]},
        {id: 'alveoli', label: 'Phế nang', d: 'M92 280 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z M114 296 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z M98 304 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 Z M236 280 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z M214 296 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z', fill: '#FCA5A5', stroke: '#7F1D1D', labelAt: [262, 330], title: 'Phế nang', body: 'Túi khí nhỏ, thành chỉ dày một lớp tế bào, bao quanh bởi lưới mao mạch. O₂ khuếch tán từ phế nang vào máu, CO₂ khuếch tán theo chiều ngược lại do chênh lệch phân áp.', facts: [['Thành', 'một lớp tế bào dẹt'], ['Diện tích trao đổi', '≈ 70–100 m²'], ['Cơ chế', 'khuếch tán theo chênh lệch phân áp']]},
        {id: 'diaphragm', label: 'Cơ hoành', d: 'M60 362 Q170 322 280 362', stroke: '#C2410C', strokeWidth: 8, labelAt: [190, 392], title: 'Cơ hoành và cơ liên sườn', body: 'Hít vào: cơ hoành co và dẹt xuống, cơ liên sườn ngoài co nâng xương sườn, thể tích lồng ngực tăng, áp suất giảm nên khí tràn vào. Thở ra: các cơ dãn, thể tích giảm, khí bị đẩy ra.', facts: [['Hít vào', 'cơ hoành co, lồng ngực mở rộng'], ['Thở ra', 'cơ dãn, thể tích giảm']]},
      ],
      note: 'Hình minh họa đơn giản. Hô hấp ở các nhóm động vật khác: da (giun đất), ống khí (côn trùng), mang (cá, ngược dòng giữa nước và máu), phổi và hệ thống túi khí (chim).',
    },
  },

  BIO_WATER_TRANSPORT_PLANT: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Vận chuyển nước và chất hữu cơ ở thực vật',
    question: 'Nước đi từ đất lên lá qua những con đường và nhờ những lực nào? Mạch rây vận chuyển chất hữu cơ từ đâu đến đâu?',
    keywords: /mach go|mach ray|hut nuoc o re|long hut|dai caspary|dong mach go|van chuyen nuoc o thuc vat|ap suat re/,
    examples: ['mạch gỗ và mạch rây', 'hút nước ở rễ', 'lông hút', 'đai Caspary'],
    data: {
      viewBox: [360, 440],
      tour: ['hair', 'xylem', 'stomata', 'phloem'],
      flow: {label: 'Dòng nước và ion khoáng đi lên', color: '#2563EB', d: 'M150 395 L172 340 V110 L230 80'},
      parts: [
        {id: 'soil', label: 'Đất', d: 'M10 360 H350 V430 H10 Z', fill: '#B45309', stroke: '#78350F', labelAt: [20, 424], title: 'Đất', body: 'Dung dịch đất chứa nước và ion khoáng. Nước vào rễ theo chênh lệch thế nước (thẩm thấu) từ đất ưu trương hơn tế bào lông hút kém.', facts: [['Điều kiện hút nước', 'dịch tế bào lông hút ưu trương so với dung dịch đất']]},
        {id: 'hair', label: 'Lông hút', d: 'M150 372 l-24 22 M165 378 l-12 30 M180 380 v34 M195 378 l12 30 M210 372 l24 22', stroke: '#FDE68A', strokeWidth: 3, labelAt: [240, 400], title: 'Lông hút của rễ', body: 'Tế bào biểu bì kéo dài thành lông, tăng diện tích tiếp xúc với đất. Nước và khoáng đi vào theo hai con đường: gian bào và tế bào chất; tới nội bì, đai Caspary buộc mọi chất đi qua tế bào chất (chọn lọc).', facts: [['Hút nước', 'thẩm thấu (thụ động)'], ['Hút khoáng', 'thụ động và chủ động'], ['Đai Caspary', 'ở nội bì, buộc đi qua tế bào chất']]},
        {id: 'xylem', label: 'Mạch gỗ', d: 'M168 345 V92', stroke: '#60A5FA', strokeWidth: 10, labelAt: [96, 230], title: 'Mạch gỗ', body: 'Các tế bào chết nối thành ống thông suốt. Nước đi lên nhờ ba lực: lực hút do thoát hơi nước ở lá (chủ yếu), lực đẩy của rễ (áp suất rễ) và lực liên kết giữa các phân tử nước với nhau và với thành mạch.', facts: [['Dòng', 'nước và ion khoáng, đi lên'], ['Động lực', 'thoát hơi nước (lực hút), áp suất rễ, lực dính']]},
        {id: 'phloem', label: 'Mạch rây', d: 'M192 345 V92', stroke: '#F59E0B', strokeWidth: 6, labelAt: [256, 230], title: 'Mạch rây', body: 'Tế bào sống (ống rây) vận chuyển saccharose từ cơ quan nguồn (lá) tới cơ quan chứa (rễ, quả, hạt) nhờ chênh lệch áp suất thẩm thấu; dòng đi hai chiều tùy nhu cầu.', facts: [['Dòng', 'saccharose, amino acid, đi từ nguồn đến đích'], ['Động lực', 'chênh lệch áp suất thẩm thấu']]},
        {id: 'leaf', label: 'Lá', d: 'M168 92 C120 60 120 20 190 30 C250 40 265 85 200 95 Z', fill: '#86EFAC', stroke: '#166534', labelAt: [270, 40], title: 'Lá cây', body: 'Cơ quan thoát hơi nước và quang hợp: cung cấp lực hút nước kéo cột nước trong mạch gỗ lên và là nơi tạo đường để đưa vào mạch rây.', facts: [['Thoát hơi nước', 'qua khí khổng (≈ 90 %) và cutin']]},
        {id: 'stomata', label: 'Khí khổng', d: 'M205 62 a12 6 0 1 0 24 0 a12 6 0 1 0 -24 0 Z', fill: '#FDE68A', stroke: '#92400E', labelAt: [236, 58], title: 'Khí khổng', body: 'Hai tế bào hình hạt đậu quanh một khe: mở khi tế bào no nước, đóng khi mất nước. Thoát hơi nước tạo lực hút và làm mát lá; đóng khí khổng khi hạn nhờ hormone ABA.', facts: [['Chức năng', 'trao đổi khí, thoát hơi nước'], ['Điều khiển', 'độ no nước, ánh sáng, ABA']]},
      ],
      note: 'Hình sơ đồ rút gọn. Mạch gỗ và mạch rây nằm trong bó mạch; không có cây nào vận chuyển nước lên đỉnh cây cao nhờ bơm sinh học, mà nhờ sức hút của thoát hơi nước và tính liên kết của nước.',
    },
  },

  BIO_SENSE_ORGANS: {
    family: 'ANATOMY_FLOW',
    engine: 'BIOLOGY',
    title: 'Cấu tạo mắt và sự tạo ảnh',
    question: 'Ánh sáng đi qua những cấu trúc nào của mắt trước khi tạo ảnh trên võng mạc? Thể thủy tinh thay đổi thế nào khi nhìn vật gần và vật xa?',
    keywords: /cau tao cua mat|cau tao mat|vong mac|the thuy tinh|giac mac|diem vang|can thi|vien thi|co quan thi giac|te bao que va te bao non|dieu tiet cua mat/,
    examples: ['cấu tạo của mắt', 'võng mạc', 'thể thủy tinh', 'cận thị viễn thị', 'cơ quan thị giác'],
    data: {
      viewBox: [420, 330],
      tour: ['cornea', 'iris', 'lens', 'vitreous', 'retina', 'fovea', 'nerve'],
      flow: {label: 'Đường đi của tia sáng', color: '#F59E0B', d: 'M20 165 H122 L150 165 L338 165'},
      parts: [
        {id: 'vitreous', label: 'Dịch kính', d: 'M130 165 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0 Z', fill: '#E0F2FE', stroke: '#94A3B8', labelAt: [250, 100], title: 'Dịch kính', body: 'Chất lỏng trong suốt, sệt chiếm phần lớn nhãn cầu, duy trì hình dạng cầu và cho ánh sáng đi qua tới võng mạc.', facts: [['Đặc điểm', 'trong suốt, giữ hình dạng nhãn cầu']]},
        {id: 'cornea', label: 'Giác mạc', d: 'M122 108 Q86 165 122 222', stroke: '#38BDF8', strokeWidth: 7, labelAt: [20, 120], title: 'Giác mạc', body: 'Màng trong suốt phía trước, là nơi khúc xạ ánh sáng mạnh nhất (khoảng hai phần ba công suất hội tụ của mắt).', facts: [['Chức năng', 'khúc xạ mạnh nhất, bảo vệ']]},
        {id: 'iris', label: 'Mống mắt, đồng tử', d: 'M136 118 V143 M136 187 V212', stroke: '#92400E', strokeWidth: 8, labelAt: [20, 245], title: 'Mống mắt và đồng tử', body: 'Mống mắt chứa sắc tố và cơ vòng, cơ nan hoa điều chỉnh đường kính đồng tử: ánh sáng mạnh thì đồng tử co nhỏ, ánh sáng yếu thì giãn rộng.', facts: [['Điều chỉnh', 'lượng ánh sáng vào mắt']]},
        {id: 'lens', label: 'Thể thủy tinh', d: 'M152 165 a14 38 0 1 0 28 0 a14 38 0 1 0 -28 0 Z', fill: '#BAE6FD', stroke: '#0369A1', labelAt: [170, 112], title: 'Thể thủy tinh (thấu kính)', body: 'Thấu kính hội tụ trong suốt, đàn hồi. Nhìn gần: cơ thể mi co làm thể thủy tinh phồng dày hơn; nhìn xa: cơ thể mi giãn, thể thủy tinh dẹt lại để ảnh luôn rơi đúng trên võng mạc (điều tiết).', facts: [['Điều tiết', 'đổi độ cong của thể thủy tinh'], ['Cận thị', 'ảnh hội tụ trước võng mạc: dùng kính phân kì'], ['Viễn thị', 'ảnh hội tụ sau võng mạc: dùng kính hội tụ']]},
        {id: 'retina', label: 'Võng mạc', d: 'M252 70 A100 100 0 0 1 252 260', stroke: '#F472B6', strokeWidth: 6, labelAt: [330, 90], title: 'Võng mạc', body: 'Lớp trong cùng chứa tế bào thụ cảm: tế bào que nhạy ánh sáng yếu (nhìn ban đêm, không phân biệt màu) và tế bào nón nhận màu sắc (ba loại: đỏ, lục, lam). Ảnh tạo thành là ảnh thật, ngược chiều, nhỏ hơn vật; não xử lí lại thành ảnh thẳng.', facts: [['Tế bào que', 'ánh sáng yếu, không màu'], ['Tế bào nón', 'màu sắc, ánh sáng mạnh'], ['Ảnh', 'thật, ngược chiều, nhỏ hơn vật']]},
        {id: 'fovea', label: 'Điểm vàng', d: 'M334 165 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z', fill: '#FACC15', stroke: '#A16207', labelAt: [350, 195], title: 'Điểm vàng', body: 'Vùng trên trục thị giác tập trung nhiều tế bào nón nhất nên hình ảnh rõ nét nhất.', facts: [['Đặc điểm', 'mật độ tế bào nón lớn nhất']]},
        {id: 'nerve', label: 'Dây thần kinh thị giác', d: 'M330 205 L395 262', stroke: '#FBBF24', strokeWidth: 12, labelAt: [330, 285], title: 'Dây thần kinh thị giác', body: 'Truyền xung thần kinh từ võng mạc về vùng thị giác ở thùy chẩm của não; chỗ dây đi ra là điểm mù (không có tế bào thụ cảm).', facts: [['Dẫn truyền', 'xung thần kinh về não'], ['Điểm mù', 'chỗ dây đi ra khỏi võng mạc']]},
      ],
      note: 'Hình minh họa mặt cắt ngang nhãn cầu. Tai cũng là cơ quan cảm giác: sóng âm làm rung màng nhĩ, chuỗi xương con khuếch đại rung động đến ốc tai, nơi tế bào lông chuyển thành xung thần kinh.',
    },
  },
};
