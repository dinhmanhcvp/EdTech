/**
 * socratic-monorepo/apps/teacher-board/src/utils/socraticTriggers.ts
 * Tầng Gợi Mở Socratic Thời Gian Thực Tự Động Theo Trạng Thái Mô Phỏng
 * Đặc tả theo Mục 8: Nghiên Cứu Hoàn Thiện Hệ Thống STEM Holographic
 */

import { ProceduralAudioEngine } from './audioFeedback';

export interface DynamicSocraticCue {
  id: string;
  templateId: string;
  title: string;
  question: string;
  scientificInsight: string;
  urgency: 'INFO' | 'ALERT' | 'EUREKA';
  thresholdStateKey: string;
}

export function evaluateDynamicSocraticCue(
  templateId: string,
  params: Record<string, number>,
  formula?: string
): DynamicSocraticCue | null {
  const fLow = (formula || '').toLowerCase();

  // 1. PHYS_RLC_PHASOR & Mạch điện xoay chiều RLC
  if (templateId === 'PHYS_RLC_PHASOR' || fLow.includes('rlc') || fLow.includes('fresnel')) {
    const r = params.R ?? params.r ?? 10;
    const l = params.L ?? params.l ?? 0.1;
    const c = params.C ?? params.c ?? 0.0001;
    const omega = params.omega ?? params.w ?? 314;

    // Đoản mạch: R <= 1.0 Ohm
    if (r <= 1.0) {
      return {
        id: 'rlc-short-circuit',
        templateId,
        title: 'Cảnh báo Đoản mạch / Ngắn mạch',
        question: 'Đường dây tải điện phát sáng đỏ rực. Theo định luật Joule-Lenz, nhiệt lượng tỏa ra tăng theo hàm bậc mấy của dòng điện?',
        scientificInsight: 'Nhiệt lượng tỏa ra tỷ lệ thuận với bình phương cường độ dòng điện (Q = I²Rt). Khi R_tải → 0, dòng ngắn mạch I vọt lên vô cực gây quá nhiệt và chập cháy.',
        urgency: 'ALERT',
        thresholdStateKey: `R_${r}`,
      };
    }

    // Cộng hưởng: Z_L ≈ Z_C => omega*L ≈ 1/(omega*C)
    const zL = omega * l;
    const zC = 1 / Math.max(1e-6, omega * c);
    if (Math.abs(zL - zC) < 5.0) {
      return {
        id: 'rlc-resonance',
        templateId,
        title: 'Cộng hưởng Điện trường - Từ trường RLC',
        question: 'Cường độ dòng điện vọt lên cực đại. Năng lượng đang luân chuyển như thế nào giữa cuộn cảm và tụ điện?',
        scientificInsight: 'Tại tần số cộng hưởng ω₀ = 1/√(LC), trở kháng thuần Z = R đạt cực tiểu, năng lượng điện trường trong tụ và từ trường trong cuộn cảm chuyển hóa qua lại tuần hoàn trọn vẹn 100%.',
        urgency: 'EUREKA',
        thresholdStateKey: `res_${omega}`,
      };
    }
  }

  // 2. BIO_STOMATA_GAS (Khí khổng & Quang hợp)
  if (templateId === 'BIO_STOMATA_GAS' || fLow.includes('stomata') || fLow.includes('khí khổng')) {
    const temp = params.temp ?? params.T ?? params.temperature ?? 25;
    const soilMoisture = params.soilMoisture ?? params.moisture ?? params.humidity ?? 50;

    // Nhiệt độ cao >= 45°C làm biến tính protein enzyme quang hợp
    if (temp >= 45) {
      return {
        id: 'stomata-denaturation',
        templateId,
        title: 'Ức chế Quang hợp do Nhiệt độ Cao',
        question: 'Cường độ ánh sáng vẫn rất cao nhưng tốc độ quang hợp lại rơi thẳng đứng về 0. Cấu trúc không gian của protein RuBisCO đã bị biến đổi ra sao?',
        scientificInsight: 'Ở nhiệt độ ≥ 45°C, các liên kết hydro và tương tác kỵ nước duy trì cấu trúc bậc 3, bậc 4 của enzyme RuBisCO bị bẻ gãy, trung tâm hoạt động biến tính hoàn toàn làm ngưng trệ chu trình Calvin.',
        urgency: 'ALERT',
        thresholdStateKey: `temp_${temp}`,
      };
    }

    // Độ ẩm đất cạn kiệt <= 10%
    if (soilMoisture <= 10) {
      return {
        id: 'stomata-drought',
        templateId,
        title: 'Cơ chế Đóng Khí khổng Cứu sinh',
        question: 'Khí khổng đã khép chặt để bảo toàn lượng nước. Hiện tượng này ảnh hưởng trực tiếp thế nào đến nồng độ CO₂ trong xoang gian bào?',
        scientificInsight: 'Hormone Axit Abscisic (ABA) kích hoạt dòng K⁺ và nước tràn ra khỏi tế bào hạt đậu làm khí khổng đóng chặt, ngăn thoát hơi nước nhưng đồng thời chặn dòng CO₂ khuếch tán vào mô giậu.',
        urgency: 'INFO',
        thresholdStateKey: `moist_${soilMoisture}`,
      };
    }
  }

  // 3. BIO_OSMOSIS_CELL (Thẩm thấu & Co nguyên sinh)
  if (templateId === 'BIO_OSMOSIS_CELL' || fLow.includes('thẩm thấu') || fLow.includes('osmosis')) {
    const cVal = params.cOut ?? params.C ?? params.conc ?? 0.9;

    // Ưu trương cao >= 2.0%
    if (cVal >= 2.0) {
      return {
        id: 'osmosis-hypertonic',
        templateId,
        title: 'Hiện tượng Co Nguyên sinh Tột độ',
        question: 'Nước đang thẩm thấu theo hướng nào qua lớp màng bán thấm? Áp suất thẩm thấu nội bào đang thấp hơn hay cao hơn ngoại bào?',
        scientificInsight: 'Nồng độ ngoại bào cao làm thế nước (Water Potential) bên ngoài thấp hơn bên trong, nước bị hút ồ ạt ra ngoài khiến không bào co rút và màng sinh chất tách rời thành tế bào.',
        urgency: 'ALERT',
        thresholdStateKey: `conc_${cVal}`,
      };
    }

    // Nhược trương cực đoan <= 0.2%
    if (cVal <= 0.2) {
      return {
        id: 'osmosis-hypotonic',
        templateId,
        title: 'Trương nước Tột độ (Turgor Pressure)',
        question: 'Nước ồ ạt tràn vào tế bào khiến áp suất trương nước tăng vọt. Vì sao tế bào thực vật không bị vỡ tung như hồng cầu?',
        scientificInsight: 'Thành tế bào thực vật cấu tạo từ mạng lưới vi sợi cellulose bền vững chịu được áp lực trương nước lên tới hàng chục atm, trong khi hồng cầu chỉ có màng sinh chất mỏng manh sẽ bị dung huyết (lysis).',
        urgency: 'INFO',
        thresholdStateKey: `conc_${cVal}`,
      };
    }
  }

  // 4. PHYS_PROJECTILE (Chuyển động ném xiên)
  if (templateId === 'PHYS_PROJECTILE' || fLow.includes('ném xiên') || fLow.includes('projectile')) {
    const alpha = params.alpha ?? params.angle ?? 45;
    const g = params.g ?? 9.8;

    // Góc ném lý tưởng 45 độ
    if (Math.abs(alpha - 45) <= 1.0) {
      return {
        id: 'projectile-optimal-45',
        templateId,
        title: 'Tầm Bắn Xa Cực Đại Lý Thuyết',
        question: 'Tầm bắn xa đạt cực đại khi góc ném là 45°. Trong thực tế có lực cản không khí, góc ném tối ưu sẽ lớn hơn hay nhỏ hơn 45°?',
        scientificInsight: 'Trong chân không, L = (v₀² sin 2α)/g đạt max khi sin 2α = 1 ⇒ α = 45°. Có lực cản không khí tỷ lệ với v², quỹ đạo bị ghì dốc xuống nên góc ném tối ưu thực tế thường rơi vào khoảng 35°–42°.',
        urgency: 'EUREKA',
        thresholdStateKey: `alpha_${alpha}`,
      };
    }

    // Trọng lực siêu cao (Sao Mộc g >= 24)
    if (g >= 24) {
      return {
        id: 'projectile-supergravity',
        templateId,
        title: 'Môi trường Siêu Trọng lực (Sao Mộc)',
        question: 'Tại sao thời gian bay và tầm ném xa trên Sao Mộc lại ngắn hơn gấp nhiều lần so với Trái Đất dù vận tốc ban đầu v₀ không đổi?',
        scientificInsight: 'Gia tốc trọng trường Sao Mộc g ≈ 24.8 m/s² kéo vật thể rơi nhanh gấp 2.5 lần, rút ngắn thời gian bay t_bay = 2v₀y/g.',
        urgency: 'INFO',
        thresholdStateKey: `g_${g}`,
      };
    }
  }

  // 5. PHYS_GAS_STATE_PV (Khí lý tưởng & Carnot)
  if (templateId === 'PHYS_GAS_STATE_PV' || fLow.includes('carnot') || fLow.includes('p-v')) {
    const tc = params.Tc ?? params.tc ?? 300;
    const th = params.Th ?? params.th ?? 600;

    if (tc <= 100 || Math.abs(th - tc) >= 500) {
      return {
        id: 'gas-carnot-limit',
        templateId,
        title: 'Định lý Giới hạn Hiệu suất Carnot',
        question: 'Hiệu suất nhiệt động học theo chu trình Carnot là η = 1 - Tc/Th. Liệu một động cơ nhiệt có thể đạt hiệu suất 100% không? Vì sao?',
        scientificInsight: 'Theo nguyên lý II nhiệt động lực học (Kelvin-Planck), không thể chế tạo được động cơ hoạt động tuần hoàn biến đổi toàn bộ nhiệt lượng nhận được thành công mà không truyền nhiệt cho nguồn lạnh (Tc > 0K).',
        urgency: 'EUREKA',
        thresholdStateKey: `tc_${tc}_th_${th}`,
      };
    }
  }

  // 6. CHEM_LE_CHATELIER_GAS (Chuyển dịch cân bằng)
  if (templateId === 'CHEM_LE_CHATELIER_GAS' || fLow.includes('chatelier') || fLow.includes('no2')) {
    const v = params.V ?? params.volume ?? 1.0;
    if (v <= 0.6) {
      return {
        id: 'le-chatelier-compression',
        templateId,
        title: 'Chuyển dịch Cân bằng theo Áp suất',
        question: 'Thể tích giảm một nửa làm màu khí NO₂ đậm đặc lên tức thì. Theo nguyên lý Le Chatelier, cân bằng sẽ chuyển dịch theo chiều nào?',
        scientificInsight: 'Khi nén thể tích (tăng áp suất), hệ chuyển dịch theo chiều làm giảm số mol khí (chiều thuận: 2 mol NO₂ nâu đỏ tạo thành 1 mol N₂O₄ không màu). Sau thời gian hồi phục, màu khí nhạt dần nhưng vẫn đậm hơn ban đầu.',
        urgency: 'EUREKA',
        thresholdStateKey: `v_${v}`,
      };
    }
  }

  // 7. CHEM_GALVANIC_DANIELL (Pin điện hóa)
  if (templateId === 'CHEM_GALVANIC_DANIELL' || fLow.includes('daniell') || fLow.includes('pin')) {
    const cuConc = params.cuConc ?? params.Cu ?? 1.0;
    if (cuConc <= 0.05) {
      return {
        id: 'daniell-depletion',
        templateId,
        title: 'Hiện tượng Pin Phóng Hết Điện (Dead Battery)',
        question: 'Suất điện động của pin sụt giảm gần về 0. Theo phương trình Nernst, yếu tố nào quyết định điện thế khi pin đạt cân bằng hóa học?',
        scientificInsight: 'Khi E = E° - (0.0592/2) log([Zn²⁺]/[Cu²⁺]) = 0, phản ứng oxy hóa khử đạt trạng thái cân bằng hóa học ΔG = 0, chênh lệch thế điện cực triệt tiêu hoàn toàn.',
        urgency: 'ALERT',
        thresholdStateKey: `cu_${cuConc}`,
      };
    }
  }

  // 8. MATH_GRAPH & Hàm số cực trị
  if (templateId === 'MATH_GRAPH' || templateId === 'MATH_FUNC_2D' || fLow.includes('cực trị') || fLow.includes('tiếp tuyến')) {
    const x0 = params.x0 ?? 0;
    if (Math.abs(x0 - 1.0) <= 0.05 || Math.abs(x0 + 1.0) <= 0.05) {
      return {
        id: 'math-extremum-tangent',
        templateId,
        title: 'Đặc trưng Tiếp tuyến Điểm Cực trị',
        question: 'Tiếp tuyến tại điểm cực trị đang nằm ngang song song Ox. Dấu của đạo hàm bậc hai f\'\'(x) cho biết điều gì về tính lồi lõm của đồ thị?',
        scientificInsight: 'Tại điểm cực trị, f\'(x₀) = 0. Nếu f\'\'(x₀) < 0 thì đồ thị lõm xuống (cực đại), nếu f\'\'(x₀) > 0 thì đồ thị lồi lên (cực tiểu).',
        urgency: 'EUREKA',
        thresholdStateKey: `x0_${x0}`,
      };
    }
  }

  return null;
}

/**
 * Trình kích hoạt âm thanh tự động khi xuất hiện gợi ý Socratic mới
 */
let lastTriggeredKey: string | null = null;

export function triggerSocraticAcousticFeedback(cue: DynamicSocraticCue | null): void {
  if (!cue) {
    lastTriggeredKey = null;
    return;
  }

  if (cue.thresholdStateKey !== lastTriggeredKey) {
    lastTriggeredKey = cue.thresholdStateKey;
    if (cue.urgency === 'EUREKA') {
      ProceduralAudioEngine.playEurekaChime();
    } else if (cue.urgency === 'ALERT') {
      ProceduralAudioEngine.playResonanceHum(220, 0.15);
    } else {
      ProceduralAudioEngine.playSnapClick();
    }
  }
}
