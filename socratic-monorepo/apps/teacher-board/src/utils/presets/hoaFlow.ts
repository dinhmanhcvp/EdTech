import type {PresetSpec, ProcessItem} from './types';

const rect = (id: string, x: number, y: number, w: number, h: number, fill: string, label: string, from: number, extra: Partial<ProcessItem> = {}): ProcessItem => ({id, kind: 'rect', w, h, fill, stroke: '#44403C', label, frames: [{at: from, x, y}], ...extra});
const txt = (id: string, label: string, frames: {at: number; x: number; y: number; o?: number; label?: string}[], fill = '#1C1917'): ProcessItem => ({id, kind: 'text', fill, label, frames});

export const HOA_FLOW_PRESETS: Record<string, PresetSpec> = {
  CHEM_INDUSTRIAL_PROCESS: {
    family: 'PROCESS_STEPS',
    engine: 'CHEMISTRY',
    title: 'Sản xuất sulfuric acid theo phương pháp tiếp xúc',
    question: 'Vì sao SO₃ không được hấp thụ trực tiếp bằng nước mà bằng H₂SO₄ đặc? Các điều kiện nhiệt độ và xúc tác của giai đoạn oxi hóa SO₂ được chọn để cân bằng yếu tố nào?',
    keywords: /san xuat (?:sulfuric acid|h2so4|axit sunfuric)|phuong phap tiep xuc|oleum|san xuat amoniac|san xuat axit nitric|quy trinh san xuat acid/,
    examples: ['sản xuất sulfuric acid', 'phương pháp tiếp xúc', 'oleum', 'quy trình sản xuất acid'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Đốt nguyên liệu lấy SO₂', body: 'Đốt lưu huỳnh (hoặc quặng pirit FeS₂) trong không khí khô: S + O₂ → SO₂. Khí được làm sạch bụi và hơi nước để không làm hỏng xúc tác.'},
        {title: 'Oxi hóa SO₂ thành SO₃', body: '2SO₂ + O₂ ⇌ 2SO₃ (ΔH < 0) ở 450–500 °C, xúc tác V₂O₅. Nhiệt độ vừa phải giữ tốc độ đủ nhanh mà cân bằng vẫn thuận lợi cho SO₃.'},
        {title: 'Hấp thụ SO₃ bằng H₂SO₄ 98 %', body: 'SO₃ được hấp thụ vào H₂SO₄ đặc tạo oleum H₂SO₄·nSO₃. Không dùng nước vì SO₃ + H₂O tỏa nhiều nhiệt, tạo sương mù acid khó thu hồi.'},
        {title: 'Pha loãng oleum', body: 'Pha oleum với lượng nước thích hợp để được H₂SO₄ có nồng độ mong muốn: H₂SO₄·nSO₃ + nH₂O → (n + 1)H₂SO₄.'},
        {title: 'Sản phẩm và tuần hoàn', body: 'Thu được H₂SO₄ 98 % dùng làm phân bón, hóa chất, ắc quy. Khí SO₂ chưa chuyển hóa được dẫn trở lại tháp tiếp xúc để tăng hiệu suất.'},
      ],
      items: [
        rect('furnace', 20, 110, 110, 80, '#FED7AA', 'Lò đốt S', 0),
        txt('a1', '→', [{at: 1, x: 150, y: 150}], '#44403C'),
        rect('conv', 170, 90, 130, 120, '#FDE68A', 'Tháp tiếp xúc V₂O₅ 450 °C', 1),
        txt('a2', '→', [{at: 2, x: 320, y: 150}], '#44403C'),
        rect('abs', 340, 90, 120, 120, '#BFDBFE', 'Tháp hấp thụ H₂SO₄ 98 %', 2),
        txt('a3', '→', [{at: 3, x: 480, y: 150}], '#44403C'),
        rect('dil', 500, 110, 110, 80, '#DDD6FE', 'Pha loãng với nước', 3),
        {id: 'gas', kind: 'pill', w: 70, h: 26, fill: '#FCA5A5', stroke: '#B91C1C', label: 'SO₂', frames: [{at: 0, x: 60, y: 215}, {at: 1, x: 205, y: 225, label: 'SO₃'}, {at: 2, x: 375, y: 225, label: 'oleum'}, {at: 3, x: 535, y: 215, label: 'H₂SO₄ loãng'}, {at: 4, x: 520, y: 215, label: 'H₂SO₄ 98 %', fill: '#BBF7D0'}]},
        txt('note', 'S + O₂ → SO₂', [{at: 0, x: 70, y: 50, label: 'S + O₂ → SO₂'}, {at: 1, x: 235, y: 50, label: '2SO₂ + O₂ ⇌ 2SO₃'}, {at: 2, x: 400, y: 50, label: 'SO₃ + H₂SO₄ → oleum'}, {at: 3, x: 555, y: 50, label: 'oleum + H₂O → H₂SO₄'}, {at: 4, x: 320, y: 50, label: 'thu sản phẩm, tuần hoàn SO₂ dư'}], '#9A3412'),
      ],
      note: 'Sơ đồ rút gọn bốn công đoạn. Hiệu suất chuyển SO₂ thành SO₃ cao nhờ xúc tác V₂O₅ và nhiều tầng làm nguội.',
    },
  },

  CHEM_ORGANIC_REACTIONS: {
    family: 'PROCESS_STEPS',
    engine: 'CHEMISTRY',
    title: 'Cộng HBr vào propene theo quy tắc Markovnikov',
    question: 'Vì sao khi cộng HBr vào propene sản phẩm chính là 2-bromopropane chứ không phải 1-bromopropane? Độ bền của carbocation quyết định điều đó thế nào?',
    keywords: /quy tac markovnikov|markovnikov|phan ung cong (?:hbr|vao anken|hydrogen halide)|carbocation|phan ung the va cong|phan ung este hoa|phan ung trung hop anken/,
    examples: ['quy tắc Markovnikov', 'phản ứng cộng HBr vào anken', 'carbocation'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Chất tham gia', body: 'Propene CH₃–CH=CH₂ có liên kết đôi giàu electron π; HBr là tác nhân electrophile (H⁺ mang điện dương).'},
        {title: 'Hai hướng cộng H⁺', body: 'H⁺ có thể gắn vào C1 (tạo cation bậc II ở C2) hoặc vào C2 (tạo cation bậc I ở C1). Hai cation có độ bền khác nhau.'},
        {title: 'Cation bậc II bền hơn', body: 'Nhóm alkyl đẩy electron làm bền carbocation: bậc III > bậc II > bậc I, nên đường đi qua cation bậc II được ưu tiên.'},
        {title: 'Br⁻ tấn công cation', body: 'Anion Br⁻ cộng vào cation bậc II tạo 2-bromopropane CH₃–CHBr–CH₃, sản phẩm chính.'},
        {title: 'Quy tắc Markovnikov', body: 'Trong phản ứng cộng HX vào alkene bất đối, H gắn vào C mang nhiều H hơn, X gắn vào C mang ít H hơn. Sản phẩm phụ 1-bromopropane chỉ chiếm rất ít.'},
      ],
      items: [
        txt('main', 'CH₃–CH=CH₂ + H–Br', [{at: 0, x: 320, y: 70}, {at: 1, x: 320, y: 70, label: 'CH₃–CH=CH₂ + H⁺ + Br⁻'}, {at: 2, x: 320, y: 70, label: 'CH₃–C⁺H–CH₃  (bậc II, bền hơn)'}, {at: 3, x: 320, y: 70, label: 'CH₃–CHBr–CH₃  (2-bromopropane)'}, {at: 4, x: 320, y: 70, label: 'sản phẩm chính: 2-bromopropane'}]),
        rect('major', 90, 130, 200, 70, '#BBF7D0', 'cation bậc II', 1, {frames: [{at: 1, x: 90, y: 130}, {at: 3, x: 90, y: 130, fill: '#86EFAC'}]}),
        rect('minor', 350, 130, 200, 70, '#FECACA', 'cation bậc I (kém bền)', 1, {frames: [{at: 1, x: 350, y: 130}, {at: 3, x: 350, y: 130, o: 0.25}]}),
        txt('arrow-major', '→ sản phẩm chính ~ 90 %', [{at: 3, x: 190, y: 235}], '#166534'),
        txt('arrow-minor', '→ 1-bromopropane (phụ)', [{at: 3, x: 450, y: 235, o: 0.4}], '#991B1B'),
      ],
      note: 'Quy tắc Markovnikov là hệ quả của độ bền carbocation trung gian. Các phản ứng đặc trưng khác: thế (alkane + Cl₂, ánh sáng), cộng (alkene + H₂, Br₂), este hóa (acid + alcohol ⇌ ester + H₂O, H₂SO₄ đặc).',
    },
  },

  CHEM_SCIENCE_PROCESS: {
    family: 'PROCESS_STEPS',
    engine: 'CHEMISTRY',
    title: 'Quy trình nghiên cứu khoa học trong hóa học',
    question: 'Một nghiên cứu khoa học trải qua những bước nào, và vì sao phải kiểm soát biến số trong thí nghiệm? Hãy áp dụng cho việc tìm hiểu ảnh hưởng của nhiệt độ đến thời gian tan của viên sủi?',
    keywords: /quy trinh nghien cuu khoa hoc|phuong phap nghien cuu hoa hoc|gia thuyet khoa hoc|bien so doc lap|thiet ke thi nghiem|bao cao ket qua nghien cuu/,
    examples: ['quy trình nghiên cứu khoa học', 'phương pháp nghiên cứu hóa học', 'giả thuyết khoa học', 'thiết kế thí nghiệm'],
    data: {
      viewBox: [640, 280],
      steps: [
        {title: 'Đặt vấn đề', body: 'Từ quan sát: viên sủi tan nhanh hơn trong nước nóng. Câu hỏi nghiên cứu: nhiệt độ ảnh hưởng thế nào đến tốc độ phản ứng?'},
        {title: 'Đưa ra giả thuyết', body: 'Giả thuyết: nhiệt độ càng cao thì tốc độ phản ứng càng lớn vì va chạm hiệu quả nhiều hơn. Giả thuyết phải kiểm chứng được.'},
        {title: 'Thiết kế thí nghiệm', body: 'Biến độc lập: nhiệt độ nước. Biến phụ thuộc: thời gian tan hết. Giữ cố định: khối lượng viên, thể tích nước, khuấy.'},
        {title: 'Thu thập dữ liệu', body: 'Lặp lại mỗi mức nhiệt độ ít nhất ba lần, ghi bảng số liệu kèm đơn vị, tính giá trị trung bình và sai số.'},
        {title: 'Phân tích và kết luận', body: 'Vẽ đồ thị thời gian theo nhiệt độ, đối chiếu giả thuyết; nếu số liệu ủng hộ thì kết luận, nếu không thì điều chỉnh giả thuyết.'},
        {title: 'Trình bày và công bố', body: 'Viết báo cáo nêu mục tiêu, phương pháp, kết quả, hạn chế; để người khác kiểm chứng lại được.'},
      ],
      items: [
        rect('s0', 30, 40, 170, 60, '#DBEAFE', 'Đặt vấn đề', 0),
        rect('s1', 235, 40, 170, 60, '#E0E7FF', 'Giả thuyết', 1),
        rect('s2', 440, 40, 170, 60, '#FEF3C7', 'Thiết kế thí nghiệm', 2),
        rect('s3', 30, 170, 170, 60, '#FED7AA', 'Thu thập dữ liệu', 3),
        rect('s4', 235, 170, 170, 60, '#BBF7D0', 'Phân tích, kết luận', 4),
        rect('s5', 440, 170, 170, 60, '#F5D0FE', 'Trình bày, công bố', 5),
        txt('cur', '▲', [{at: 0, x: 115, y: 120}, {at: 1, x: 320, y: 120}, {at: 2, x: 525, y: 120}, {at: 3, x: 115, y: 250}, {at: 4, x: 320, y: 250}, {at: 5, x: 525, y: 250}], '#B91C1C'),
      ],
      note: 'Quy trình lặp lại: kết quả có thể đặt ra câu hỏi mới. An toàn thí nghiệm (kính, găng, thông gió) luôn được đánh giá ở bước thiết kế.',
    },
  },

  CHEM_SEPARATION: {
    family: 'ANATOMY_FLOW',
    engine: 'CHEMISTRY',
    title: 'Chưng cất phân đoạn dầu mỏ và các phương pháp tách chất',
    question: 'Các phân đoạn dầu mỏ được tách theo tiêu chí nào trong tháp chưng cất? Vì sao phân đoạn nhẹ lên đỉnh tháp còn cặn nặng ở đáy?',
    keywords: /chung cat (?:phan doan )?dau mo|thap chung cat|phan doan dau mo|phuong phap tach chat|chiet\b|ket tinh\b|sac ky|cracking|crackinh|tach chat ra khoi hon hop/,
    examples: ['chưng cất phân đoạn dầu mỏ', 'tháp chưng cất', 'phương pháp tách chất', 'cracking'],
    data: {
      viewBox: [520, 420],
      tour: ['furnace', 'residue', 'mazut', 'diesel', 'kerosene', 'gasoline', 'lpg'],
      flow: {label: 'Dầu thô đi vào rồi hơi bay lên', color: '#EA580C', d: 'M80 345 H230 M280 380 V50'},
      parts: [
        {id: 'furnace', label: 'Lò nung', d: 'M30 300 H130 V390 H30 Z', fill: '#FCA5A5', stroke: '#B91C1C', labelAt: [30, 292], title: 'Lò nung', body: 'Dầu thô được đun nóng tới khoảng 350–400 °C, hóa hơi phần lớn rồi đưa vào gần đáy tháp.', facts: [['Nhiệt độ', '≈ 350–400 °C']]},
        {id: 'lpg', label: 'Khí (LPG)', d: 'M220 40 H340 V90 H220 Z', fill: '#BFDBFE', stroke: '#1D4ED8', labelAt: [350, 70], title: 'Khí đốt, LPG', body: 'C₁–C₄, nhiệt độ sôi dưới 40 °C, ra ở đỉnh tháp.', facts: [['Số C', 'C₁–C₄'], ['Sôi', '< 40 °C'], ['Dùng', 'khí đốt, nguyên liệu hóa dầu']]},
        {id: 'gasoline', label: 'Xăng', d: 'M220 90 H340 V150 H220 Z', fill: '#BBF7D0', stroke: '#15803D', labelAt: [350, 125], title: 'Phân đoạn xăng', body: 'C₅–C₁₀, nhiệt độ sôi 40–180 °C. Dùng làm nhiên liệu động cơ xăng; chất lượng đo bằng chỉ số octane.', facts: [['Số C', 'C₅–C₁₀'], ['Sôi', '40–180 °C']]},
        {id: 'kerosene', label: 'Dầu hỏa', d: 'M220 150 H340 V210 H220 Z', fill: '#FEF08A', stroke: '#A16207', labelAt: [350, 185], title: 'Phân đoạn dầu hỏa (kerosene)', body: 'C₁₀–C₁₆, sôi 180–250 °C; nhiên liệu máy bay phản lực, đèn dầu.', facts: [['Số C', 'C₁₀–C₁₆'], ['Sôi', '180–250 °C']]},
        {id: 'diesel', label: 'Diesel', d: 'M220 210 H340 V270 H220 Z', fill: '#FDBA74', stroke: '#C2410C', labelAt: [350, 245], title: 'Phân đoạn diesel', body: 'C₁₄–C₂₀, sôi 250–350 °C; nhiên liệu cho động cơ diesel; đo bằng chỉ số cetane.', facts: [['Số C', 'C₁₄–C₂₀'], ['Sôi', '250–350 °C']]},
        {id: 'mazut', label: 'Mazut', d: 'M220 270 H340 V325 H220 Z', fill: '#D6D3D1', stroke: '#57534E', labelAt: [350, 302], title: 'Phân đoạn mazut', body: 'C₂₀–C₇₀, sôi trên 350 °C; nhiên liệu đốt lò, tàu biển; còn được cracking để tạo xăng và nguyên liệu hóa dầu.', facts: [['Số C', 'C₂₀–C₇₀'], ['Sôi', '> 350 °C'], ['Xử lí', 'cracking tạo hydrocarbon nhẹ']]},
        {id: 'residue', label: 'Cặn (bitum)', d: 'M220 325 H340 V380 H220 Z', fill: '#78716C', stroke: '#1C1917', labelAt: [350, 360], title: 'Cặn chưng cất, bitum', body: 'Hydrocarbon rất nặng không bay hơi; dùng làm nhựa đường, được chưng cất chân không để lấy thêm dầu nhờn.', facts: [['Dùng', 'nhựa đường, dầu nhờn']]},
      ],
      note: 'Quy tắc chung: nhiệt độ sôi giảm từ đáy lên đỉnh tháp, nên chất nhẹ lên cao. Các phương pháp tách khác: chiết (dựa vào độ tan), kết tinh (độ tan thay đổi theo nhiệt độ), sắc kí (tốc độ di chuyển khác nhau).',
    },
  },

  CHEM_METALLURGY: {
    family: 'ANATOMY_FLOW',
    engine: 'CHEMISTRY',
    title: 'Lò cao luyện gang: các vùng phản ứng',
    question: 'Quặng sắt được khử dần qua những giai đoạn nào khi đi xuống trong lò cao, và vai trò của than cốc, CO và đá vôi là gì?',
    keywords: /lo cao|luyen gang|luyen thep|san xuat gang|tach kim loai|an mon dien hoa|hop kim|quang sat|khu oxit kim loai/,
    examples: ['lò cao luyện gang', 'sản xuất gang', 'luyện thép', 'ăn mòn điện hóa'],
    data: {
      viewBox: [520, 440],
      tour: ['charge', 'zone1', 'zone2', 'zone3', 'combustion', 'hearth'],
      flow: {label: 'Nguyên liệu đi xuống, khí CO đi lên', color: '#EA580C', d: 'M230 50 V360 M290 380 V60'},
      parts: [
        {id: 'charge', label: 'Cửa nạp liệu', d: 'M200 20 H320 V60 H200 Z', fill: '#E7E5E4', stroke: '#44403C', labelAt: [330, 44], title: 'Cửa nạp liệu', body: 'Nạp từ trên xuống: quặng sắt (Fe₂O₃, Fe₃O₄), than cốc và đá vôi. Khí lò (CO, CO₂, N₂) thoát ra ở đỉnh và được tận dụng.', facts: [['Nguyên liệu', 'quặng sắt, than cốc, đá vôi']]},
        {id: 'zone1', label: 'Vùng 200–700 °C', d: 'M185 60 H335 V140 H185 Z', fill: '#FDE68A', stroke: '#A16207', labelAt: [345, 104], title: 'Vùng 200–700 °C', body: 'CO khử oxit sắt bậc cao: 3Fe₂O₃ + CO → 2Fe₃O₄ + CO₂.', facts: [['Phản ứng', '3Fe₂O₃ + CO → 2Fe₃O₄ + CO₂']]},
        {id: 'zone2', label: 'Vùng 700–1000 °C', d: 'M170 140 H350 V215 H170 Z', fill: '#FDBA74', stroke: '#C2410C', labelAt: [358, 180], title: 'Vùng 700–1000 °C', body: 'Fe₃O₄ + CO → 3FeO + CO₂. Đá vôi phân hủy: CaCO₃ → CaO + CO₂.', facts: [['Phản ứng', 'Fe₃O₄ + CO → 3FeO + CO₂'], ['Đá vôi', 'CaCO₃ → CaO + CO₂']]},
        {id: 'zone3', label: 'Vùng 1000–1500 °C', d: 'M155 215 H365 V290 H155 Z', fill: '#FCA5A5', stroke: '#B91C1C', labelAt: [372, 256], title: 'Vùng 1000–1500 °C', body: 'FeO + CO → Fe + CO₂. Tạo xỉ: CaO + SiO₂ → CaSiO₃ (xỉ nổi trên gang lỏng).', facts: [['Phản ứng', 'FeO + CO → Fe + CO₂'], ['Xỉ', 'CaO + SiO₂ → CaSiO₃']]},
        {id: 'combustion', label: 'Vùng cháy ≈ 1800 °C', d: 'M170 290 H350 V350 H170 Z', fill: '#EF4444', stroke: '#7F1D1D', labelAt: [358, 322], title: 'Vùng cháy', body: 'Không khí nóng thổi vào đốt than cốc: C + O₂ → CO₂; rồi CO₂ + C → 2CO tạo chất khử CO.', facts: [['Phản ứng', 'C + O₂ → CO₂; CO₂ + C → 2CO']]},
        {id: 'hearth', label: 'Nồi lò, gang lỏng', d: 'M190 350 H330 V395 H190 Z', fill: '#9CA3AF', stroke: '#1F2937', labelAt: [340, 376], title: 'Nồi lò', body: 'Gang lỏng (Fe với 2–5 % C) chảy xuống đáy, xỉ nhẹ hơn nổi lên trên; cả hai được tháo ra qua lỗ riêng.', facts: [['Gang', '2–5 % C'], ['Tháo', 'gang và xỉ qua hai lỗ riêng']]},
      ],
      note: 'Khử oxit sắt bằng CO là phản ứng chủ yếu trong lò cao; thép được luyện từ gang bằng cách oxi hóa bớt carbon và tạp chất. Ăn mòn điện hóa của sắt xảy ra khi có cặp Fe–C hoặc Fe–kim loại yếu hơn trong dung dịch điện li.',
    },
  },
};
