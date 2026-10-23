export interface ProblemStep {
  index: number;
  title: string;
  phaseLabel: string;
  socraticPrompt: string;
  expectedAnswerClean: string;
  expectedLatex: string;
  hintStrike1: string;
  hintStrike2: string;
  microStepLifeline: {
    questionA: string;
    answerA: string;
    questionB: string;
    answerB: string;
  };
  tokenChips: string[];
}

export interface DimensionalAudit {
  leftHandUnit: string;
  rightHandUnit: string;
  isConsistent: boolean;
  explanation: string;
  limitingCases: {
    condition: string;
    behavior: string;
    physicalMeaning: string;
  }[];
}

export interface MasteryNode {
  id: string;
  title: string;
  status: 'MASTERED' | 'IN_PROGRESS' | 'PREREQUISITE';
  category: string;
}

export interface TrapStatement {
  id: 'a' | 'b' | 'c' | 'd';
  label: string;
  correctVal: boolean;
  explanation: string;
}

export interface SocraticProblem {
  id: string;
  subject: 'PHYSICS' | 'CHEMISTRY' | 'MATH' | 'BIOLOGY';
  subjectLabel: string;
  curriculumCategory: string; // e.g. "Vật lý 12 • Động lực học & Dao động"
  title: string;
  subtitle: string;
  difficultyBadge: 'Chuẩn THPT' | 'Chuyên / HSG';
  problemStatement: string;
  givenParameters: Record<string, string | number>;
  steps: ProblemStep[];
  dimensionalAudit: DimensionalAudit;
  masteryNodes: MasteryNode[];
  targetKeywords: string[];
  causalBlocks: { id: number; step: string; text: string }[];
  trapStatements: TrapStatement[];
}

export const SOCRATIC_PROBLEMS: SocraticProblem[] = [
  // 1. PHYSICS
  {
    id: 'PHYSICS_INCLINE',
    subject: 'PHYSICS',
    subjectLabel: 'Vật lý',
    curriculumCategory: 'Vật lý 12 • Cơ học Newton & Năng lượng',
    title: 'Chuyển động trên Mặt phẳng nghiêng có Ma sát & Bảo toàn Cơ năng',
    subtitle: 'Khảo sát gia tốc a và điều kiện trượt trên dốc nghiêng góc α có hệ số ma sát μ',
    difficultyBadge: 'Chuẩn THPT',
    problemStatement:
      'Một vật khối lượng m = 2\\text{ kg} bắt đầu trượt không vận tốc đầu từ đỉnh mặt phẳng nghiêng góc \\alpha = 30^\\circ có chiều dài s = 10\\text{ m}. Hệ số ma sát trượt giữa vật và mặt dốc là \\mu = 0.2. Lấy g = 9.8\\text{ m/s}^2. Hãy thiết lập phương trình động lực học và tính vận tốc v_{max} của vật ở chân dốc.',
    givenParameters: {
      m: '2.0 kg',
      alpha: '30°',
      mu: '0.2',
      g: '9.8 m/s²',
      s: '10.0 m',
    },
    steps: [
      {
        index: 1,
        title: 'Xác định phản lực pháp tuyến N',
        phaseLabel: 'BƯỚC 01 / 04 • CÂN BẰNG PHƯƠNG PHÁP TUYẾN',
        socraticPrompt:
          'Để tính lực ma sát trượt F_{ms} = \\mu N, em hãy chiếu phương trình định luật II Newton lên trục Oy vuông góc với mặt phẳng nghiêng.',
        expectedAnswerClean: 'N=mgcos(alpha)',
        expectedLatex: 'N = mg\\cos\\alpha = 16.97\\text{ N}',
        hintStrike1:
          'Trên phương vuông góc mặt phẳng nghiêng, vật không chuyển động (a_y = 0). Phản lực N cân bằng với thành phần nào của trọng lực?',
        hintStrike2:
          'Quan sát vector N và P_y trên Mô phỏng bên trái. Em cần dùng hàm cos(α) vì thành phần này kề với góc nghiêng!',
        microStepLifeline: {
          questionA: 'Thành phần trọng lực vuông góc với mặt phẳng nghiêng là P_y = ?',
          answerA: 'mg*cos(alpha)',
          questionB: 'Vì vật không rời khỏi mặt dốc, suy ra N = ?',
          answerB: 'mg*cos(alpha)',
        },
        tokenChips: ['N', 'mg\\cos(\\alpha)', 'mg\\sin(\\alpha)', 'F_{ms}', '\\mu N'],
      },
      {
        index: 2,
        title: 'Thiết lập phương trình Động lực học dọc dốc',
        phaseLabel: 'BƯỚC 02 / 04 • ĐỊNH LUẬT II NEWTON DỌC TRỤC Ox',
        socraticPrompt:
          'Em hãy viết phương trình định luật II Newton chiếu lên phương chuyển động Ox dọc theo mặt dốc (chiều dương hướng xuống dốc).',
        expectedAnswerClean: 'ma=mgsin(alpha)-mumgcos(alpha)',
        expectedLatex: 'ma = mg\\sin\\alpha - \\mu mg\\cos\\alpha',
        hintStrike1:
          'Thành phần trọng lực nào kéo vật xuống dốc? Và lực ma sát cản trở theo hướng nào?',
        hintStrike2:
          'Chú ý dấu trừ của lực ma sát cản trở! Vector lực ma sát F_{ms} đang ngược chiều Ox trên hình vẽ bên trái.',
        microStepLifeline: {
          questionA: 'Thành phần kéo vật xuống dốc là:',
          answerA: 'mg*sin(alpha)',
          questionB: 'Lực ma sát cản trở trượt ngược chiều là:',
          answerB: 'mu*mg*cos(alpha)',
        },
        tokenChips: ['ma', 'mg\\sin(\\alpha)', '-\\mu mg\\cos(\\alpha)', 'P_x - F_{ms}', 'g(\\sin\\alpha - \\mu\\cos\\alpha)'],
      },
      {
        index: 3,
        title: 'Rút gọn biểu thức gia tốc chuyển động a',
        phaseLabel: 'BƯỚC 03 / 04 • BIỂU THỨC GIA TỐC a',
        socraticPrompt:
          'Em hãy triệt tiêu khối lượng m ở hai vế để tìm biểu thức tường minh của gia tốc a.',
        expectedAnswerClean: 'a=g(sin(alpha)-mucos(alpha))',
        expectedLatex: 'a = g(\\sin\\alpha - \\mu\\cos\\alpha) = 3.20\\text{ m/s}^2',
        hintStrike1:
          'Khối lượng m xuất hiện ở cả hai vế nên có thể chia cả 2 vế cho m. Gia tốc có phụ thuộc vào khối lượng của vật không?',
        hintStrike2:
          'Hãy đặt thừa số chung g ra ngoài: a = g(...). Kiểm tra xem thứ nguyên có đúng là gia tốc (m/s²) không!',
        microStepLifeline: {
          questionA: 'Chia cả 2 vế của ma = mg(sin α - μ cos α) cho m ta được a = ?',
          answerA: 'g*(sin(alpha)-mu*cos(alpha))',
          questionB: 'Thay số g=9.8, α=30°, μ=0.2 ta được a xấp xỉ:',
          answerB: '3.2',
        },
        tokenChips: ['a', 'g(\\sin\\alpha - \\mu\\cos\\alpha)', 'g\\sin(\\alpha)', '\\mu g\\cos(\\alpha)', '3.2 m/s²'],
      },
      {
        index: 4,
        title: 'Tính vận tốc cực đại ở chân dốc v_{max}',
        phaseLabel: 'BƯỚC 04 / 04 • ĐỊNH LÝ ĐỘNG NĂNG & VẬN TỐC',
        socraticPrompt:
          'Áp dụng công thức độc lập thời gian v^2 - v_0^2 = 2as (với v_0 = 0), em hãy tính vận tốc cực đại v_{max} ở chân dốc.',
        expectedAnswerClean: 'v=sqrt(2as)',
        expectedLatex: 'v_{max} = \\sqrt{2as} \\approx 8.00\\text{ m/s}',
        hintStrike1:
          'Vì vật bắt đầu trượt không vận tốc đầu (v₀ = 0), ta có v² = 2as. Suy ra v = ?',
        hintStrike2:
          'Thay a = 3.20 m/s² và s = 10 m vào căn bậc hai: √(2 × 3.20 × 10) = √64 = 8.0 m/s.',
        microStepLifeline: {
          questionA: 'Công thức tính v theo a và s khi v₀ = 0 là:',
          answerA: 'sqrt(2*a*s)',
          questionB: 'Giá trị vận tốc tại chân dốc là:',
          answerB: '8.0 m/s',
        },
        tokenChips: ['v', '\\sqrt{2as}', '2as', '8.0 m/s', '\\sqrt{2gh}'],
      },
    ],
    dimensionalAudit: {
      leftHandUnit: 'm/s²',
      rightHandUnit: 'm/s²',
      isConsistent: true,
      explanation: '[Vế trái: a (m/s²)] = [Vế phải: g (m/s²) × (sin α - μ cos α) không thứ nguyên] ➔ Thứ nguyên hoàn toàn chính xác theo hệ SI.',
      limitingCases: [
        {
          condition: 'α → 90° (dốc thẳng đứng)',
          behavior: 'sin 90° = 1, cos 90° = 0 ➔ a = g',
          physicalMeaning: 'Vật rơi tự do, không còn áp lực lên mặt dốc nên lực ma sát triệt tiêu.',
        },
        {
          condition: 'μ → 0 (mặt dốc nhẵn bóng)',
          behavior: 'a = g·sin(α)',
          physicalMeaning: 'Bảo toàn cơ năng tuyệt đối, không có nhiệt lượng sinh ra do ma sát.',
        },
        {
          condition: 'tan(α) ≤ μ',
          behavior: 'a ≤ 0',
          physicalMeaning: 'Lực ma sát nghỉ cực đại lớn hơn lực kéo xuống, vật đứng yên không tự trượt.',
        },
      ],
    },
    masteryNodes: [
      { id: 'newton2', title: 'Định luật II Newton', status: 'MASTERED', category: 'Cơ học' },
      { id: 'fbd', title: 'Phân tích Lực (FBD)', status: 'MASTERED', category: 'Kỹ năng' },
      { id: 'friction', title: 'Lực ma sát trượt', status: 'IN_PROGRESS', category: 'Động lực học' },
      { id: 'work_energy', title: 'Công & Năng lượng', status: 'IN_PROGRESS', category: 'Bảo toàn' },
    ],
    targetKeywords: ['bảo toàn cơ năng', 'công của lực ma sát', 'điều kiện trượt', 'thứ nguyên gia tốc'],
    causalBlocks: [
      { id: 1, step: 'Bước A', text: 'Trọng lực phân rã: Thành phần P·sin(α) kéo vật trượt xuống dốc với gia tốc ban đầu.' },
      { id: 2, step: 'Bước B', text: 'Ma sát cản trở: Áp lực N = mg·cos(α) sinh ra lực cản Fms = μN ngược chiều chuyển động.' },
      { id: 3, step: 'Bước C', text: 'Bảo toàn năng lượng: Thế năng ban đầu chuyển thành động năng và công nhiệt ma sát: mgh = ½mv² + Q.' },
    ],
    trapStatements: [
      {
        id: 'a',
        label: 'a) Khi góc nghiêng α tăng từ 30° lên 60°, lực ma sát trượt tác dụng lên vật sẽ tăng lên vì vật trượt nhanh hơn.',
        correctVal: false,
        explanation: 'SAI: Lực ma sát trượt Fms = μmg·cos(α). Khi α tăng thì cos(α) giảm, do đó Fms giảm, không phụ thuộc vào tốc độ trượt.',
      },
      {
        id: 'b',
        label: 'b) Nếu tăng khối lượng vật lên gấp đôi (m = 4 kg), gia tốc trượt a của vật sẽ không thay đổi.',
        correctVal: true,
        explanation: 'ĐÚNG: Khối lượng m triệt tiêu ở cả hai vế (ma = mg·sin α - μmg·cos α), gia tốc a chỉ phụ thuộc g, α và μ.',
      },
      {
        id: 'c',
        label: 'c) Tại điều kiện biên tan(α) = μ, nếu truyền cho vật vận tốc v₀ ban đầu dọc dốc thì vật sẽ chuyển động thẳng đều.',
        correctVal: true,
        explanation: 'ĐÚNG: Khi tan(α) = μ thì mg·sin(α) = μmg·cos(α) ➔ Hợp lực tác dụng F = 0 ➔ Vật chuyển động thẳng đều theo Quán tính.',
      },
      {
        id: 'd',
        label: 'd) Công của phản lực pháp tuyến N có giá trị dương vì mặt phẳng nghiêng luôn nâng đỡ vật.',
        correctVal: false,
        explanation: 'SAI: Phản lực pháp tuyến N luôn vuông góc với quỹ đạo chuyển động (N ⊥ v) nên công A_N = N·s·cos(90°) = 0.',
      },
    ],
  },

  // 2. CHEMISTRY
  {
    id: 'CHEMISTRY_REDOX',
    subject: 'CHEMISTRY',
    subjectLabel: 'Hóa học',
    curriculumCategory: 'Hóa học 11-12 • Phản ứng Oxi hóa - Khử & Cân bằng Hóa học',
    title: 'Cân bằng Oxi hóa - Khử Bảo toàn Electron & Chuyển dịch Le Chatelier',
    subtitle: 'Bảo toàn electron đa mức oxi hóa Fe3O4 + HNO3 và cân bằng Haber N2 + 3H2 ⇌ 2NH3',
    difficultyBadge: 'Chuyên / HSG',
    problemStatement:
      'Cân bằng phản ứng oxi hóa khử sau bằng phương pháp thăng bằng electron: \\text{Fe}_3\\text{O}_4 + \\text{HNO}_3 \\rightarrow \\text{Fe(NO}_3)_3 + \\text{NO} \\uparrow + \\text{H}_2\\text{O}. Xác định chất khử, chất oxi hóa và tỉ lệ mol chất khử : chất oxi hóa đóng vai trò môi trường.',
    givenParameters: {
      Fe_ox: '+8/3',
      N_ox_reactant: '+5',
      N_ox_product: '+2',
      product_gas: 'NO (Khí không màu hóa nâu)',
    },
    steps: [
      {
        index: 1,
        title: 'Xác định số oxi hóa và quá trình nhường e',
        phaseLabel: 'BƯỚC 01 / 04 • QUÁ TRÌNH OXI HÓA (NHƯỜNG ELECTRON)',
        socraticPrompt:
          'Trong Fe₃O₄, số oxi hóa trung bình của Fe là bao nhiêu? Viết quá trình nhường electron của 3 nguyên tử Fe.',
        expectedAnswerClean: '3Fe(+8/3)->3Fe(+3)+1e',
        expectedLatex: '3\\text{Fe}^{+8/3} \\rightarrow 3\\text{Fe}^{+3} + 1e^-',
        hintStrike1:
          'Trong Fe₃O₄ (FeO·Fe₂O₃), số oxi hóa của Oxi là -2. Gọi số oxi hóa trung bình của Fe là x: 3x + 4(-2) = 0.',
        hintStrike2:
          'x = +8/3. Khi lên Fe(+3), 3 nguyên tử Fe sẽ nhường: 3 × (3 - 8/3) = 1 electron!',
        microStepLifeline: {
          questionA: 'Số oxi hóa trung bình của Fe trong Fe₃O₄ là:',
          answerA: '+8/3',
          questionB: 'Quá trình nhường electron của 3Fe(+8/3) lên 3Fe(+3) là:',
          answerB: '3Fe(+8/3) -> 3Fe(+3) + 1e',
        },
        tokenChips: ['3\\text{Fe}^{+8/3}', '\\rightarrow 3\\text{Fe}^{+3}', '+ 1e^-', '\\text{Chất khử}', '+8/3'],
      },
      {
        index: 2,
        title: 'Viết quá trình nhận electron của Nitơ',
        phaseLabel: 'BƯỚC 02 / 04 • QUÁ TRÌNH KHỬ (NHẬN ELECTRON)',
        socraticPrompt:
          'Nitơ trong HNO₃ có số oxi hóa +5 giảm xuống bao nhiêu trong phân tử khí NO? Viết quá trình nhận electron.',
        expectedAnswerClean: 'N(+5)+3e->N(+2)',
        expectedLatex: '\\text{N}^{+5} + 3e^- \\rightarrow \\text{N}^{+2}',
        hintStrike1:
          'Trong NO, Oxi có số oxi hóa -2. Do phân tử trung hòa điện, số oxi hóa của Nitơ trong NO là bao nhiêu?',
        hintStrike2:
          'Số oxi hóa của N giảm từ +5 xuống +2. Quá trình nhận: N(+5) + (5 - 2)e = N(+5) + 3e → N(+2).',
        microStepLifeline: {
          questionA: 'Số oxi hóa của Nitơ trong khí NO là:',
          answerA: '+2',
          questionB: 'Số electron mà 1 ion N(+5) nhận để thành N(+2) là:',
          answerB: '3e',
        },
        tokenChips: ['\\text{N}^{+5}', '+ 3e^-', '\\rightarrow \\text{N}^{+2}', '\\text{Chất oxi hóa}', 'NO'],
      },
      {
        index: 3,
        title: 'Nhân hệ số chéo thăng bằng electron',
        phaseLabel: 'BƯỚC 03 / 04 • BẢO TOÀN ELECTRON',
        socraticPrompt:
          'Tìm bội chung nhỏ nhất giữa 1 electron nhường và 3 electron nhận. Xác định hệ số nhân vào Fe₃O₄ và NO.',
        expectedAnswerClean: '3Fe3O4+1NO',
        expectedLatex: '3 \\times (3\\text{Fe}^{+8/3} \\rightarrow 3\\text{Fe}^{+3} + 1e) \\quad \\& \\quad 1 \\times (\\text{N}^{+5} + 3e \\rightarrow \\text{N}^{+2})',
        hintStrike1:
          'BCNN của 1 và 3 là 3. Nhân 3 vào quá trình nhường e và nhân 1 vào quá trình nhận e.',
        hintStrike2:
          'Hệ số của Fe₃O₄ là 3, và hệ số của NO là 1. Hãy kiểm tra tổng số electron nhường và nhận có bằng 3e không!',
        microStepLifeline: {
          questionA: 'Bội chung nhỏ nhất của số electron trao đổi là:',
          answerA: '3',
          questionB: 'Hệ số điền trước Fe₃O₄ và NO lần lượt là:',
          answerB: '3 và 1',
        },
        tokenChips: ['3 \\text{Fe}_3\\text{O}_4', '1 \\text{NO}', '9 \\text{Fe(NO}_3)_3', '3e^- \\text{ nhường}', '3e^- \\text{ nhận}'],
      },
      {
        index: 4,
        title: 'Hoàn thành phương trình phân tử cân bằng',
        phaseLabel: 'BƯỚC 04 / 04 • PHƯƠNG TRÌNH PHÂN TỬ ĐÃ CÂN BẰNG',
        socraticPrompt:
          'Đếm số nguyên tử Fe để điền hệ số Fe(NO₃)₃, đếm tổng N để điền HNO₃ và đếm H để điền H₂O. Nhập phương trình hoàn chỉnh.',
        expectedAnswerClean: '3Fe3O4+28HNO3->9Fe(NO3)3+NO+14H2O',
        expectedLatex: '3\\text{Fe}_3\\text{O}_4 + 28\\text{HNO}_3 \\rightarrow 9\\text{Fe(NO}_3)_3 + \\text{NO} + 14\\text{H}_2\\text{O}',
        hintStrike1:
          'Có 3 phân tử Fe₃O₄ nghĩa là có 9 nguyên tử Fe ➔ Điền 9 vào Fe(NO₃)₃. Tổng N ở vế phải là 9 × 3 + 1 = 28!',
        hintStrike2:
          'Điền 28 vào HNO₃ ➔ Vế trái có 28 H ➔ Điền 14 vào H₂O. Kiểm tra số Oxi ở hai vế: 3×4 + 28×3 = 96 = 9×9 + 1 + 14!',
        microStepLifeline: {
          questionA: 'Tổng số nguyên tử Nitơ ở vế phải (trong Fe(NO₃)₃ và NO) là:',
          answerA: '28',
          questionB: 'Phương trình phân tử cân bằng hoàn chỉnh là:',
          answerB: '3Fe3O4 + 28HNO3 -> 9Fe(NO3)3 + NO + 14H2O',
        },
        tokenChips: [
          '3\\text{Fe}_3\\text{O}_4',
          '28\\text{HNO}_3',
          '9\\text{Fe(NO}_3)_3',
          '\\text{NO}',
          '14\\text{H}_2\\text{O}',
          '4Fe + 3O₂ → 2Fe₂O₃',
        ],
      },
    ],
    dimensionalAudit: {
      leftHandUnit: 'mol nguyên tử / electron',
      rightHandUnit: 'mol nguyên tử / electron',
      isConsistent: true,
      explanation: 'Định luật bảo toàn nguyên tố và bảo toàn electron: 9 Fe, 28 N, 28 H, 96 O ở cả hai vế ➔ Cân bằng tuyệt đối.',
      limitingCases: [
        {
          condition: 'Dung dịch HNO₃ rất loãng & nhiệt độ thấp',
          behavior: 'Sản phẩm khử có thể tạo NH₄NO₃ (+3e → -3e)',
          physicalMeaning: 'Độ âm điện và tính oxi hóa của HNO₃ biến thiên theo nồng độ dung dịch.',
        },
        {
          condition: 'Dung dịch HNO₃ đặc nóng',
          behavior: 'Sản phẩm khử ưu tiên tạo NO₂ (khí màu nâu đỏ)',
          physicalMeaning: 'N⁺⁵ chỉ nhận 1e tạo N⁺⁴ do thế điện cực chuẩn của cặp oxi hóa khử thay đổi.',
        },
        {
          condition: 'Nhiệt độ phản ứng tổng hợp NH₃ tăng (Le Chatelier)',
          behavior: 'N₂ + 3H₂ ⇌ 2NH₃ (ΔH < 0) chuyển dịch sang trái',
          physicalMeaning: 'Phản ứng tỏa nhiệt thì tăng nhiệt độ làm giảm hiệu suất tạo amoniac.',
        },
      ],
    },
    masteryNodes: [
      { id: 'oxidation_state', title: 'Xác định số Oxi hóa', status: 'MASTERED', category: 'Cơ sở Hóa học' },
      { id: 'redox_half', title: 'Bán phản ứng e nhường/nhận', status: 'MASTERED', category: 'Kỹ năng' },
      { id: 'electron_balance', title: 'Định luật Bảo toàn Electron', status: 'IN_PROGRESS', category: 'Chuyên sâu' },
      { id: 'le_chatelier', title: 'Cân bằng động học Le Chatelier', status: 'IN_PROGRESS', category: 'Động học' },
    ],
    targetKeywords: ['bảo toàn electron', 'chất khử nhường e', 'chất oxi hóa nhận e', 'chuyển dịch cân bằng'],
    causalBlocks: [
      { id: 1, step: 'Bước A', text: 'Quá trình nhường: Fe₃O₄ đóng vai trò chất khử, 3 nguyên tử Fe nhường 1 electron.' },
      { id: 2, step: 'Bước B', text: 'Quá trình nhận: Axit nitric HNO₃ đóng vai trò chất oxi hóa, N⁺⁵ nhận 3 electron tạo khí NO.' },
      { id: 3, step: 'Bước C', text: 'Bảo toàn điện tích: Tổng số electron nhường bằng tổng electron nhận (3e), số oxi hóa 2 vế trung hòa tuyệt đối.' },
    ],
    trapStatements: [
      {
        id: 'a',
        label: 'a) Trong phản ứng trên, toàn bộ 28 phân tử HNO₃ đều đóng vai trò chất oxi hóa nhận electron.',
        correctVal: false,
        explanation: 'SAI: Chỉ có 1 phân tử HNO₃ đóng vai trò chất oxi hóa (tạo 1 NO), còn lại 27 phân tử đóng vai trò môi trường tạo muối nitrat.',
      },
      {
        id: 'b',
        label: 'b) Tỉ lệ số phân tử HNO₃ đóng vai trò môi trường so với số phân tử HNO₃ bị khử là 27 : 1.',
        correctVal: true,
        explanation: 'ĐÚNG: Trong 28 mol HNO₃ phản ứng, có 27 mol tạo muối Fe(NO₃)₃ (môi trường) và 1 mol tạo NO (bị khử). Tỉ lệ là 27 : 1.',
      },
      {
        id: 'c',
        label: 'c) Đối với phản ứng Haber N₂ + 3H₂ ⇌ 2NH₃ (ΔH < 0), khi tăng áp suất chung của hệ thì cân bằng sẽ chuyển dịch theo chiều thuận.',
        correctVal: true,
        explanation: 'ĐÚNG: Vế trái có 4 mol khí (1 N₂ + 3 H₂), vế phải có 2 mol khí (2 NH₃). Tăng áp suất làm chuyển dịch theo chiều giảm số mol khí (chiều thuận).',
      },
      {
        id: 'd',
        label: 'd) Trong phản ứng oxi hóa sắt Fe + O₂ → Fe₂O₃, số mol electron trao đổi luôn bằng 6 mol cho mỗi 2 mol Fe₂O₃ tạo thành.',
        correctVal: false,
        explanation: 'SAI: 4Fe → 4Fe³⁺ + 12e⁻. Để tạo thành 2 mol Fe₂O₃ cần 4 mol Fe, tổng electron trao đổi là 12 mol e, không phải 6 mol.',
      },
    ],
  },

  // 3. MATH
  {
    id: 'MATH_EXTREMA',
    subject: 'MATH',
    subjectLabel: 'Toán học',
    curriculumCategory: 'Toán 12 • Giải tích & Khảo sát Hàm số',
    title: 'Cực trị Hàm bậc ba Đối xứng qua Gốc tọa độ & Tích phân Riemann',
    subtitle: 'Tìm tham số m để đồ thị có 2 cực trị đối xứng qua O(0,0) và tính diện tích hình phẳng',
    difficultyBadge: 'Chuyên / HSG',
    problemStatement:
      'Cho hàm số y = f(x) = x^3 - 3mx^2 + 3(m^2 - 1)x. Tìm tất cả các giá trị của tham số m để đồ thị hàm số có 2 điểm cực trị A, B đối xứng nhau qua gốc tọa độ O(0, 0). Khi m = 0, hãy tính diện tích hình phẳng S giới hạn bởi đồ thị và trục Ox trên đoạn [-2, 2].',
    givenParameters: {
      degree: 3,
      a: 1,
      b: '-3m',
      c: '3(m² - 1)',
      symmetry_point: 'O(0, 0)',
    },
    steps: [
      {
        index: 1,
        title: 'Tính đạo hàm bậc nhất y\'',
        phaseLabel: 'BƯỚC 01 / 04 • ĐẠO HÀM BẬC NHẤT',
        socraticPrompt:
          'Để khảo sát cực trị của hàm số, em hãy tính đạo hàm bậc nhất y\' = f\'(x).',
        expectedAnswerClean: 'y\'=3x^2-6mx+3(m^2-1)',
        expectedLatex: 'y\' = 3x^2 - 6mx + 3(m^2 - 1)',
        hintStrike1:
          'Quy tắc đạo hàm hàm đa thức: (x^n)\' = n·x^{n-1}. Đạo hàm của x³ là 3x², đạo hàm của -3mx² là gì?',
        hintStrike2:
          'y\' = 3x² - 6mx + 3(m² - 1). Em có thể đặt nhân tử chung là 3: y\' = 3[x² - 2mx + (m² - 1)].',
        microStepLifeline: {
          questionA: 'Đạo hàm của x³ - 3mx² là:',
          answerA: '3x^2 - 6mx',
          questionB: 'Đạo hàm của 3(m² - 1)x theo x là:',
          answerB: '3(m^2 - 1)',
        },
        tokenChips: ['y\'', '3x^2', '- 6mx', '+ 3(m^2 - 1)', '3(x^2 - 2mx + m^2 - 1)'],
      },
      {
        index: 2,
        title: 'Điều kiện tồn tại 2 điểm cực trị (Δ\' > 0)',
        phaseLabel: 'BƯỚC 02 / 04 • ĐIỀU KIỆN 2 CỰC TRỊ',
        socraticPrompt:
          'Để hàm bậc ba có 2 điểm cực trị, phương trình y\' = 0 phải có 2 nghiệm phân biệt. Hãy tính biệt thức thu gọn Δ\'.',
        expectedAnswerClean: 'Delta\'=9>0',
        expectedLatex: '\\Delta\' = b\'^2 - ac = (-3m)^2 - 3 \\cdot 3(m^2 - 1) = 9 > 0 \\quad (\\forall m)',
        hintStrike1:
          'Xét phương trình x² - 2mx + (m² - 1) = 0. Biệt thức Δ\' = (-m)² - 1·(m² - 1) = ?',
        hintStrike2:
          'Δ\' = m² - (m² - 1) = 1 > 0 (hoặc 9 > 0 với y\'). Vì Δ\' luôn dương với mọi m, hàm số luôn có 2 cực trị với mọi m!',
        microStepLifeline: {
          questionA: 'Biệt thức thu gọn Δ\' của x² - 2mx + m² - 1 = 0 là:',
          answerA: '1',
          questionB: 'Vì Δ\' > 0 với mọi m, số điểm cực trị của hàm số là:',
          answerB: '2',
        },
        tokenChips: ['\\Delta\' = 1 > 0', '\\Delta\' = 9 > 0', '\\forall m \\in \\mathbb{R}', 'x_1, x_2', 'f\'(x) = 0'],
      },
      {
        index: 3,
        title: 'Áp dụng đối xứng Viète qua gốc tọa độ O',
        phaseLabel: 'BƯỚC 03 / 04 • TỌA ĐỘ ĐỐI XỨNG QUA GỐC O',
        socraticPrompt:
          'Hai điểm A(x₁, y₁) và B(x₂, y₂) đối xứng nhau qua gốc tọa độ O(0,0) khi và chỉ khi x₁ + x₂ = 0 và y₁ + y₂ = 0. Hãy dùng định lý Viète để tìm m.',
        expectedAnswerClean: 'm=0',
        expectedLatex: 'x_1 + x_2 = 2m = 0 \\iff m = 0 \\implies y_1 + y_2 = 0',
        hintStrike1:
          'Theo định lý Viète, tổng 2 nghiệm của phương trình x² - 2mx + m² - 1 = 0 là x₁ + x₂ = -b/a = 2m.',
        hintStrike2:
          'Để O(0,0) là trung điểm của AB thì hoành độ thỏa mãn x₁ + x₂ = 0 ➔ 2m = 0 ➔ m = 0. Thử lại với y: khi m=0 hàm lẻ, tự động thỏa mãn y₁ + y₂ = 0!',
        microStepLifeline: {
          questionA: 'Tổng hai nghiệm theo Viète x₁ + x₂ = ?',
          answerA: '2m',
          questionB: 'Để x₁ + x₂ = 0 thì m = ?',
          answerB: '0',
        },
        tokenChips: ['m = 0', 'x_1 + x_2 = 2m = 0', 'y_1 + y_2 = 0', 'O(0, 0)', 'x_1 x_2 = m^2 - 1'],
      },
      {
        index: 4,
        title: 'Tính diện tích hình phẳng Riemann khi m = 0',
        phaseLabel: 'BƯỚC 04 / 04 • TÍCH PHÂN TÍNH DIỆN TÍCH',
        socraticPrompt:
          'Khi m = 0, hàm số là y = x³ - 3x. Hãy tính diện tích hình phẳng S = ∫_{-2}^{2} |x³ - 3x| dx giới hạn bởi đồ thị và trục Ox.',
        expectedAnswerClean: 'S=6',
        expectedLatex: 'S = \\int_{-2}^{2} |x^3 - 3x|\\,dx = 2\\int_{0}^{2} |x^3 - 3x|\\,dx = 6',
        hintStrike1:
          'Hàm số y = x³ - 3x cắt trục Ox tại x = -√3, 0, √3. Tận dụng tính đối xứng hàm số lẻ: S = 2·[∫_0^{√3} (3x - x³)dx + ∫_{√3}^2 (x³ - 3x)dx].',
        hintStrike2:
          'Tính tích phân từng đoạn: 2 × [9/4 + 3/4] = 2 × 3 = 6 đơn vị diện tích.',
        microStepLifeline: {
          questionA: 'Các giao điểm của y = x³ - 3x với trục hoành trên [-2, 2] là:',
          answerA: '-sqrt(3), 0, sqrt(3)',
          questionB: 'Giá trị diện tích hình phẳng tích phân S là:',
          answerB: '6',
        },
        tokenChips: ['S = 6', '\\int_{-2}^{2} |x^3 - 3x| dx', '2 \\int_{0}^{2} |x^3 - 3x| dx', 'm = 0', '6 \\text{ đvdt}'],
      },
    ],
    dimensionalAudit: {
      leftHandUnit: 'đơn vị diện tích (L²)',
      rightHandUnit: 'đơn vị diện tích (L²)',
      isConsistent: true,
      explanation: 'Tích phân hàm số bậc ba: [∫ y dx] = [L] × [L] = [L²] ➔ Thứ nguyên diện tích phẳng chuẩn.',
      limitingCases: [
        {
          condition: 'm ≠ 0',
          behavior: 'Trung điểm uốn I(m, f(m)) rời xa gốc tọa độ O',
          physicalMeaning: 'Đồ thị mất tính đối xứng tâm qua gốc tọa độ O(0,0), tâm đối xứng chuyển thành điểm uốn I.',
        },
        {
          condition: 'Đoạn tích phân mở rộng [-a, a]',
          behavior: 'Do tính chất đối xứng hàm lẻ, ∫_{-a}^a f(x) dx = 0',
          physicalMeaning: 'Tích phân đại số triệt tiêu bằng 0 nhưng diện tích hình học luôn dương S > 0.',
        },
        {
          condition: 'Khoảng cách cực trị AB',
          behavior: 'AB = √[(x₂ - x₁)² + (y₂ - y₁)²] = 2√10 khi m = 0',
          physicalMeaning: 'Khoảng cách giữa hai điểm cực trị đạt giá trị cực tiểu khi m = 0.',
        },
      ],
    },
    masteryNodes: [
      { id: 'diff', title: 'Đạo hàm hàm đa thức', status: 'MASTERED', category: 'Giải tích 12' },
      { id: 'viete', title: 'Định lý Viète', status: 'MASTERED', category: 'Đại số' },
      { id: 'extrema_symmetry', title: 'Tâm đối xứng Cực trị', status: 'IN_PROGRESS', category: 'Chuyên sâu' },
      { id: 'riemann_integral', title: 'Tích phân Diện tích Riemann', status: 'IN_PROGRESS', category: 'Hình học Giải tích' },
    ],
    targetKeywords: ['đạo hàm y\'', 'định lý viète', 'tâm đối xứng', 'tích phân diện tích'],
    causalBlocks: [
      { id: 1, step: 'Bước A', text: 'Điều kiện cực trị: y\' = 3x² - 6mx + 3(m² - 1) có Δ\' = 9 > 0 luôn có 2 nghiệm phân biệt.' },
      { id: 2, step: 'Bước B', text: 'Đối xứng tâm: Điểm uốn I(m, f(m)) là tâm đối xứng của hàm bậc ba; I trùng O khi và chỉ khi m = 0.' },
      { id: 3, step: 'Bước C', text: 'Tích phân Riemann: Diện tích S được phân hoạch thành các dải hẹp, lấy trị tuyệt đối đường cong: S = 6.' },
    ],
    trapStatements: [
      {
        id: 'a',
        label: 'a) Điểm uốn của đồ thị hàm số bậc ba luôn luôn là tâm đối xứng của hai điểm cực trị.',
        correctVal: true,
        explanation: 'ĐÚNG: Với mọi hàm số bậc ba, đồ thị nhận điểm uốn I làm tâm đối xứng, và I luôn là trung điểm của đoạn thẳng nối 2 điểm cực trị.',
      },
      {
        id: 'b',
        label: 'b) Tích phân đại số ∫_{-2}^{2} (x³ - 3x) dx bằng 6 đơn vị diện tích.',
        correctVal: false,
        explanation: 'SAI: Do y = x³ - 3x là hàm số lẻ nên tích phân đại số ∫_{-2}^{2} (x³ - 3x) dx = 0. Diện tích hình học phải lấy trị tuyệt đối S = 6.',
      },
      {
        id: 'c',
        label: 'c) Tồn tại giá trị m > 0 để hai điểm cực trị A, B nằm cùng một phía so với trục tung Oy.',
        correctVal: false,
        explanation: 'SAI: Tích 2 nghiệm x₁x₂ = m² - 1. Khi m = 0 thì x₁x₂ = -1 < 0, nhưng nếu m > 1 thì x₁x₂ > 0 và x₁ + x₂ = 2m > 0 nên 2 cực trị cùng nằm bên phải Oy.',
      },
      {
        id: 'd',
        label: 'd) Đường thẳng đi qua hai điểm cực trị của hàm số khi m = 0 có phương trình là y = -2x.',
        correctVal: true,
        explanation: 'ĐÚNG: Chia y cho y\' ta được phần dư là phương trình đường thẳng đi qua 2 cực trị. Khi m = 0, y = (x/3)·(3x² - 3) - 2x ➔ y = -2x.',
      },
    ],
  },

  // 4. BIOLOGY
  {
    id: 'BIOLOGY_GENETICS',
    subject: 'BIOLOGY',
    subjectLabel: 'Sinh học',
    curriculumCategory: 'Sinh học 12 • Di truyền Quần thể & Cơ chế Phân tử',
    title: 'Cân bằng Di truyền Hardy-Weinberg & Điều hòa Operon Lac',
    subtitle: 'Khảo sát cấu trúc di truyền p²AA + 2pqAa + q²aa = 1 dưới áp lực chọn lọc tự nhiên và đột biến Operon',
    difficultyBadge: 'Chuyên / HSG',
    problemStatement:
      'Một quần thể thực vật giao phấn ngẫu nhiên ban đầu có tần số alen A là p = 0.6 và alen a là q = 0.4. Khi quần thể đạt trạng thái cân bằng Hardy-Weinberg, tính tỉ lệ kiểu gen. Nếu chọn lọc tự nhiên đào thải 50% cá thể mang kiểu hình lặn aa (s = 0.5), hãy xác định tần số alen a ở thế hệ tiếp theo và giải thích cơ chế khi Operon Lac đột biến vùng vận hành O.',
    givenParameters: {
      p: 0.6,
      q: 0.4,
      selection_coeff_s: 0.5,
      operon: 'Lac (Escherichia coli)',
    },
    steps: [
      {
        index: 1,
        title: 'Xác định cấu trúc di truyền cân bằng Hardy-Weinberg',
        phaseLabel: 'BƯỚC 01 / 04 • CÂN BẰNG HARDY-WEINBERG',
        socraticPrompt:
          'Với p(A) = 0.6 và q(a) = 0.4, em hãy tính tỉ lệ các kiểu gen p² AA, 2pq Aa và q² aa theo định luật Hardy-Weinberg.',
        expectedAnswerClean: '0.36AA+0.48Aa+0.16aa=1',
        expectedLatex: '0.36\\text{ AA} + 0.48\\text{ Aa} + 0.16\\text{ aa} = 1.0',
        hintStrike1:
          'Công thức Hardy-Weinberg: p² + 2pq + q² = 1. Tính p² = (0.6)², 2pq = 2·0.6·0.4, q² = (0.4)².',
        hintStrike2:
          '0.6² = 0.36 AA; 2 × 0.6 × 0.4 = 0.48 Aa; 0.4² = 0.16 aa. Tổng = 0.36 + 0.48 + 0.16 = 1.00!',
        microStepLifeline: {
          questionA: 'Tần số kiểu gen đồng hợp trội AA là p² = (0.6)² = ?',
          answerA: '0.36',
          questionB: 'Tần số kiểu gen dị hợp tử Aa là 2pq = 2*0.6*0.4 = ?',
          answerB: '0.48',
        },
        tokenChips: ['0.36 \\text{AA}', '0.48 \\text{Aa}', '0.16 \\text{aa}', 'p^2 + 2pq + q^2 = 1', 'p + q = 1'],
      },
      {
        index: 2,
        title: 'Tính tần số alen a sau chọn lọc tự nhiên (s = 0.5)',
        phaseLabel: 'BƯỚC 02 / 04 • CHỌN LỌC TỰ NHIÊN ĐÀO THẢI',
        socraticPrompt:
          'Khi kiểu hình lặn aa bị đào thải 50% (hệ số chọn lọc s = 0.5), hãy tính tần số alen a ở thế hệ F1 theo công thức: q₁ = q(1 - s) / (1 - s·q²).',
        expectedAnswerClean: 'q1=0.217',
        expectedLatex: 'q_1 = \\frac{q(1 - s)}{1 - s \\cdot q^2} = \\frac{0.4(1 - 0.5)}{1 - 0.5 \\cdot (0.4)^2} = \\frac{0.20}{0.92} \\approx 0.217',
        hintStrike1:
          'Tử số: q(1 - s) = 0.4 × 0.5 = 0.20. Mẫu số: 1 - s·q² = 1 - 0.5 × 0.16 = 1 - 0.08 = 0.92.',
        hintStrike2:
          'q₁ = 0.20 / 0.92 ≈ 0.217. Tần số alen lặn có hại giảm từ 0.40 xuống 0.217 do áp lực chọn lọc.',
        microStepLifeline: {
          questionA: 'Độ thích nghi trung bình của quần thể w̄ = 1 - s·q² = ?',
          answerA: '0.92',
          questionB: 'Tần số alen lặn q₁ sau chọn lọc là 0.20 / 0.92 xấp xỉ:',
          answerB: '0.217',
        },
        tokenChips: ['q_1 \\approx 0.217', 'p_1 \\approx 0.783', 's = 0.5', 'w = 1 - s', '\\text{Đào thải kiểu hình lặn}'],
      },
      {
        index: 3,
        title: 'Phân tích cơ chế điều hòa Operon Lac',
        phaseLabel: 'BƯỚC 03 / 04 • CƠ CHẾ ĐIỀU HÒA PHÂN TỬ OPERON',
        socraticPrompt:
          'Khi môi trường có đường lactose, chất cảm ứng allolactose liên kết với thành phần nào để mở phiên mã?',
        expectedAnswerClean: 'protein uoc che',
        expectedLatex: '\\text{Allolactose} + \\text{Protein ức chế} \\rightarrow \\text{Biến đổi cấu hình, tách khỏi Operator } O',
        hintStrike1:
          'Chất cảm ứng liên kết với protein do gen điều hòa R tổng hợp, làm protein này mất hoạt tính.',
        hintStrike2:
          'Đó là protein ức chế (repressor protein). Khi bị liên kết, nó biến đổi cấu hình không gian và rời khỏi vùng vận hành O.',
        microStepLifeline: {
          questionA: 'Gen điều hòa R tổng hợp phân tử nào?',
          answerA: 'protein uoc che',
          questionB: 'Khi có lactose, chất cảm ứng allolactose sẽ gắn vào:',
          answerB: 'protein uoc che',
        },
        tokenChips: ['Protein ức chế', 'Vùng vận hành O', 'RNA Polymerase', 'Gen điều hòa R', 'Allolactose'],
      },
      {
        index: 4,
        title: 'Dự đoán đột biến vùng vận hành Operator O',
        phaseLabel: 'BƯỚC 04 / 04 • ĐỘT BIẾN OPERON VÀ PHIÊN MÃ',
        socraticPrompt:
          'Nếu vùng vận hành O bị đột biến làm protein ức chế không thể gắn vào, điều gì sẽ xảy ra với các gen cấu trúc Z, Y, A?',
        expectedAnswerClean: 'phien ma lien tuc',
        expectedLatex: '\\text{RNA Polymerase liên tục phiên mã các gen } Z, Y, A \\text{ kể cả khi không có lactose}',
        hintStrike1:
          'Vì protein ức chế không thể bám vào vùng O để chặn RNA Polymerase, enzyme này có bị cản trở không?',
        hintStrike2:
          'RNA Polymerase sẽ tự do di chuyển và phiên mã liên tục (constitutive expression) bất kể môi trường có hay không có đường lactose!',
        microStepLifeline: {
          questionA: 'Protein ức chế có ngăn được RNA Polymerase khi vùng O bị đột biến không?',
          answerA: 'khong',
          questionB: 'Hậu quả là các gen cấu trúc Z, Y, A sẽ được:',
          answerB: 'phien ma lien tuc',
        },
        tokenChips: ['Phiên mã liên tục', 'Gen cấu trúc Z, Y, A', 'Không phụ thuộc lactose', 'Đột biến vùng O', 'Enzyme phân giải'],
      },
    ],
    dimensionalAudit: {
      leftHandUnit: 'tần số tỉ lệ (0 đến 1)',
      rightHandUnit: 'tần số tỉ lệ (0 đến 1)',
      isConsistent: true,
      explanation: 'Tổng tần số alen: p + q = 1 và tổng kiểu gen p² + 2pq + q² = 1 ➔ Nhất quán không thứ nguyên chuẩn di truyền học.',
      limitingCases: [
        {
          condition: 's = 1 (chết phôi hoàn toàn kiểu hình aa)',
          behavior: 'q₁ = q / (1 + q) = 0.4 / 1.4 ≈ 0.286',
          physicalMeaning: 'Chọn lọc chống lại alen lặn có hại diễn ra chậm vì alen a vẫn ẩn trong thể dị hợp tử Aa.',
        },
        {
          condition: 'Không có chọn lọc (s = 0)',
          behavior: 'q₁ = q = 0.4',
          physicalMeaning: 'Quần thể duy trì trạng thái cân bằng di truyền Hardy-Weinberg qua vô số thế hệ.',
        },
        {
          condition: 'Đột biến gen điều hòa R không tạo protein',
          behavior: 'Hậu quả giống hệt đột biến vùng vận hành O',
          physicalMeaning: 'Mất liên kết kìm hãm dẫn đến phiên mã cấu trúc liên tục lãng phí năng lượng của tế bào vi khuẩn.',
        },
      ],
    },
    masteryNodes: [
      { id: 'hardy_weinberg', title: 'Cân bằng Hardy-Weinberg', status: 'MASTERED', category: 'Di truyền Quần thể' },
      { id: 'natural_selection', title: 'Áp lực Chọn lọc tự nhiên', status: 'MASTERED', category: 'Tiến hóa' },
      { id: 'operon_lac', title: 'Cấu trúc Operon Lac', status: 'IN_PROGRESS', category: 'Di truyền Phân tử' },
      { id: 'gene_regulation', title: 'Điều hòa Biểu hiện Gen', status: 'IN_PROGRESS', category: 'Chuyên sâu' },
    ],
    targetKeywords: ['cân bằng hardy-weinberg', 'chọn lọc tự nhiên đào thải', 'protein ức chế', 'phiên mã liên tục'],
    causalBlocks: [
      { id: 1, step: 'Bước A', text: 'Cân bằng ban đầu: Giao phấn ngẫu nhiên tạo tần số kiểu gen p² AA + 2pq Aa + q² aa = 1.' },
      { id: 2, step: 'Bước B', text: 'Áp lực chọn lọc: Kiểu hình aa bị đào thải 50% làm giảm tần số alen lặn q từ 0.40 xuống 0.217.' },
      { id: 3, step: 'Bước C', text: 'Cơ chế điều hòa: Đột biến vùng O làm mất vị trí bám của protein ức chế, RNA Polymerase phiên mã liên tục.' },
    ],
    trapStatements: [
      {
        id: 'a',
        label: 'a) Chọn lọc tự nhiên có thể loại bỏ hoàn toàn một alen lặn gây chết ra khỏi quần thể ngẫu phối chỉ sau một thế hệ.',
        correctVal: false,
        explanation: 'SAI: Alen lặn gây chết vẫn được bảo tồn và truyền qua các thế hệ nhờ các cá thể dị hợp tử Aa không biểu hiện kiểu hình.',
      },
      {
        id: 'b',
        label: 'b) Trong Operon Lac, ba gen cấu trúc Z, Y, A có chung một vùng khởi động (Promoter) và một vùng vận hành (Operator).',
        correctVal: true,
        explanation: 'ĐÚNG: Operon là cụm các gen cấu trúc có liên quan về chức năng được điều hòa phiên mã chung bởi một Promoter và một Operator.',
      },
      {
        id: 'c',
        label: 'c) Khi nồng độ glucose trong tế bào cao, Operon Lac vẫn được phiên mã mạnh mẽ nếu có mặt allolactose.',
        correctVal: false,
        explanation: 'SAI: Cơ chế ức chế dị hóa (Catabolite Repression): Khi có glucose, nồng độ cAMP thấp, phức hợp CAP-cAMP không gắn vào promoter được nên phiên mã rất yếu.',
      },
      {
        id: 'd',
        label: 'd) Đột biến gen điều hòa R làm mất khả năng tổng hợp protein ức chế cũng dẫn đến hiện tượng phiên mã liên tục.',
        correctVal: true,
        explanation: 'ĐÚNG: Không có protein ức chế bám vào vùng O, RNA Polymerase tự do phiên mã liên tục mà không cần chất cảm ứng allolactose.',
      },
    ],
  },

  // 5. CHEMISTRY - STOICHIOMETRY BALANCE
  {
    id: 'CHEMISTRY_BALANCE',
    subject: 'CHEMISTRY',
    subjectLabel: 'Hóa học',
    curriculumCategory: 'Hóa học 10 • Định luật Bảo toàn Khối lượng & Cân bằng Phản ứng',
    title: 'Cân bằng phản ứng oxi hóa sắt: Fe + O2 -> Fe2O3',
    subtitle: 'Khảo sát số nguyên tử hai vế và thăng bằng hệ số phản ứng',
    difficultyBadge: 'Chuẩn THPT',
    problemStatement:
      'Cho sắt tác dụng với khí oxi tạo thành gỉ sắt: \\text{Fe} + \\text{O}_2 \\rightarrow \\text{Fe}_2\\text{O}_3. Hãy cân bằng phản ứng và giải thích bảo toàn khối lượng.',
    givenParameters: {
      Reactants: 'Fe, O₂',
      Product: 'Fe₂O₃',
    },
    steps: [
      {
        index: 1,
        title: 'Bước 1: Cân bằng phương trình Hóa học',
        phaseLabel: 'BƯỚC 01 / 02 • THĂNG BẰNG NGUYÊN TỬ',
        socraticPrompt:
          'Em hãy nhập phương trình cân bằng cho phản ứng Fe + O₂ → Fe₂O₃.',
        expectedAnswerClean: '4fe+3o2->2fe2o3',
        expectedLatex: '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
        hintStrike1: 'Quan sát số nguyên tử Oxi ở hai đĩa cân: BCNN của 2 và 3 là 6!',
        hintStrike2: 'Nhân 3 cho O₂ (3×2=6) và 2 cho Fe₂O₃ (2×3=6), sau đó nhân 4 cho Fe.',
        microStepLifeline: {
          questionA: 'BCNN của 2 nguyên tử O và 3 nguyên tử O là:',
          answerA: '6',
          questionB: 'Hệ số trước Fe, O₂, Fe₂O₃ lần lượt là:',
          answerB: '4, 3, 2',
        },
        tokenChips: ['Fe', '+', 'O₂', '→', 'Fe₂O₃', '4', '3', '2'],
      },
      {
        index: 2,
        title: 'Bước 2: Cổng Khái Niệm Ngược',
        phaseLabel: 'BƯỚC 02 / 02 • BẢO TOÀN KHỐI LƯỢNG',
        socraticPrompt:
          'Dùng giọng nói hoặc bàn phím giải thích tại sao khối lượng các chất trước và sau phản ứng phải bằng nhau.',
        expectedAnswerClean: 'bao toan khoi luong',
        expectedLatex: '\\sum m_{\\text{tham gia}} = \\sum m_{\\text{sản phẩm}}',
        hintStrike1: 'Theo định luật Lomonosov - Lavoisier.',
        hintStrike2: 'Tổng khối lượng chất phản ứng bằng tổng khối lượng chất tạo thành.',
        microStepLifeline: {
          questionA: 'Định luật nào chi phối?',
          answerA: 'Bảo toàn khối lượng',
          questionB: 'Nguyên tử có bị mất đi không?',
          answerB: 'Không, chỉ sắp xếp lại',
        },
        tokenChips: ['Bảo toàn khối lượng', 'Lomonosov', 'Nguyên tử', 'Hệ số'],
      },
    ],
    dimensionalAudit: {
      leftHandUnit: 'mol',
      rightHandUnit: 'mol',
      isConsistent: true,
      explanation: 'Bảo toàn số mol nguyên tố Fe và O ở hai vế phương trình.',
      limitingCases: [
        {
          condition: 'Oxi dư',
          behavior: 'Fe cháy hoàn toàn thành Fe₂O₃',
          physicalMeaning: 'Phản ứng xảy ra hoàn toàn sinh ra gỉ sắt.',
        },
      ],
    },
    masteryNodes: [
      { id: 'mass_conservation', title: 'Bảo toàn khối lượng', status: 'MASTERED', category: 'Hóa vô cơ' },
      { id: 'stoichiometry', title: 'Cân bằng phản ứng', status: 'IN_PROGRESS', category: 'Kỹ năng hóa' },
    ],
    targetKeywords: ['bảo toàn khối lượng', 'số nguyên tử', 'hệ số tỉ lượng'],
    causalBlocks: [
      { id: 1, step: 'Bước A', text: 'Đếm số nguyên tử: Fe vế trái là 1, vế phải là 2. O vế trái là 2, vế phải là 3.' },
      { id: 2, step: 'Bước B', text: 'Tìm BCNN cho Oxi: 2 × 3 = 6 ➔ 3O₂ và 2Fe₂O₃.' },
      { id: 3, step: 'Bước C', text: 'Cân bằng sắt: 2 × 2 = 4 Fe ➔ 4Fe.' },
    ],
    trapStatements: [
      {
        id: 'a',
        label: 'a) Sau phản ứng tổng khối lượng chất rắn tăng lên vì sắt đã liên kết với oxi từ không khí.',
        correctVal: true,
        explanation: 'ĐÚNG: Khối lượng Fe₂O₃ = m_Fe + m_O₂ phản ứng.',
      },
      {
        id: 'b',
        label: 'b) Có thể viết Fe₂ + O₃ → Fe₂O₃ vì các chỉ số đã bằng nhau.',
        correctVal: false,
        explanation: 'SAI: Đơn chất sắt ở điều kiện thường là kim loại Fe, không tồn tại Fe₂.',
      },
      {
        id: 'c',
        label: 'c) Số nguyên tử trước và sau phản ứng luôn được bảo toàn.',
        correctVal: true,
        explanation: 'ĐÚNG: Nguyên tử chỉ liên kết lại theo trật tự mới.',
      },
      {
        id: 'd',
        label: 'd) Số mol phân tử hai vế luôn phải bằng nhau.',
        correctVal: false,
        explanation: 'SAI: Tổng số mol 4 + 3 = 7 mol giảm xuống còn 2 mol Fe₂O₃.',
      },
    ],
  },
];
