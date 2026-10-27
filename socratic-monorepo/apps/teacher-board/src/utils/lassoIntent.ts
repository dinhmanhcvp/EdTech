import { Stroke } from './lassoGeometry';

export type LassoIntent = 'VISUALIZE' | 'GRADE';

export interface LassoIntentResult {
  intent: LassoIntent;
  confidence: number;
  reason: string;
  features: {
    strokeCount: number;
    area: number;
    width: number;
    height: number;
    aspectRatio: number;
    lineCount: number;
    hasKeywords: boolean;
    hasDerivation: boolean;
    gradeScore: number;
    visualizeScore: number;
  };
}

export function getStrokesBounds(strokes: Stroke[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) {
    if (!s.points) continue;
    for (const p of s.points) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  }
  if (x0 === Infinity) {
    return { x0: 0, y0: 0, x1: 1, y1: 1 };
  }
  return { x0, y0, x1, y1 };
}

/**
 * Đếm số cụm dòng chữ viết tay phân bố theo trục dọc Y.
 * Các nét chữ thuộc cùng một dòng sẽ có dải tọa độ Y chồng lấn hoặc cách nhau không quá một khoảng nhỏ.
 */
export function estimateLineClusters(strokes: Stroke[]): number {
  if (strokes.length === 0) return 0;
  if (strokes.length === 1) return 1;

  // Tính hộp bao y0, y1 cho từng nét
  const strokeSpans: { y0: number; y1: number }[] = [];
  for (const s of strokes) {
    if (!s.points || s.points.length === 0) continue;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of s.points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (minY !== Infinity) {
      strokeSpans.push({ y0: minY, y1: maxY });
    }
  }

  if (strokeSpans.length === 0) return 1;

  // Sắp xếp theo y0 tăng dần
  strokeSpans.sort((a, b) => a.y0 - b.y0);

  // Hợp nhất các dải Y có chồng lấn hoặc cách nhau < 16px (khoảng cách giữa các nét trong 1 dòng)
  const mergedLines: { y0: number; y1: number }[] = [];
  let cur = { ...strokeSpans[0] };

  for (let i = 1; i < strokeSpans.length; i++) {
    const next = strokeSpans[i];
    if (next.y0 <= cur.y1 + 16) {
      // Chồng lấn hoặc liền kề -> gom vào cùng 1 dòng
      cur.y1 = Math.max(cur.y1, next.y1);
    } else {
      mergedLines.push(cur);
      cur = { ...next };
    }
  }
  mergedLines.push(cur);

  return Math.max(1, mergedLines.length);
}

/**
 * Tự động phân loại mục đích khoanh vùng Lasso của giáo viên:
 * - 'VISUALIZE': Công thức toán, hàm số, đồ thị, hiện tượng STEM (cần dựng mô phỏng trực quan 60FPS).
 * - 'GRADE': Lời giải bài tập của học sinh gồm nhiều bước, có suy luận, cần chấm bài và đối chiếu đáp án.
 *
 * Thuật toán kết hợp các đặc trưng:
 * 1. Không gian hình học: Số nét (stroke count), diện tích (area), tỷ lệ H/W, số dòng phân tầng (line count).
 * 2. Ngữ nghĩa: Từ khóa dẫn dắt (bài làm, lời giải, ta có, suy ra, đáp số...), ký hiệu suy luận (=>, <=>, = liên tiếp).
 */
export function classifyLassoIntent(
  strokes: Stroke[],
  recognizedText?: string,
  hint?: string
): LassoIntentResult {
  const strokeCount = strokes.length;
  const bb = getStrokesBounds(strokes);
  const width = Math.max(1, bb.x1 - bb.x0);
  const height = Math.max(1, bb.y1 - bb.y0);
  const area = width * height;
  const aspectRatio = height / width; // > 0.65 thường là khối bài giải xếp dọc; < 0.4 thường là công thức viết ngang

  const lineCount = estimateLineClusters(strokes);

  // Kiểm tra từ khóa ngữ nghĩa
  const combinedText = `${recognizedText || ''} ${hint || ''}`.toLowerCase();

  const hasKeywords = Boolean(
    combinedText.match(/(bài\s*làm|lời\s*giải|ta\s*có|suy\s*ra|đáp\s*số|kết\s*quả|\bđs\b|\bkq\b|bước|thay\s*vào|chứng\s*minh|giải\s*ra)/i)
  );

  const hasDerivation = Boolean(
    combinedText.match(/(=>|\\Rightarrow|\\Leftrightarrow|\\therefore)/) ||
    (combinedText.match(/=/g) || []).length >= 3
  );

  let gradeScore = 0;
  let visualizeScore = 0;

  // 1. Phân tích ngữ nghĩa văn bản (trọng số cao nhất)
  if (hasKeywords) {
    gradeScore += 65;
  }
  if (hasDerivation) {
    gradeScore += 45;
  }

  // 2. Phân tích số lượng nét bút
  if (strokeCount >= 35) {
    gradeScore += 40;
  } else if (strokeCount >= 24) {
    gradeScore += 20;
  } else if (strokeCount <= 14) {
    visualizeScore += 35;
  } else {
    visualizeScore += 15;
  }

  // 3. Phân tích số dòng phân tầng theo chiều dọc
  if (lineCount >= 3) {
    gradeScore += 35;
  } else if (lineCount === 2 && height > 160) {
    gradeScore += 15;
  } else if (lineCount === 1) {
    visualizeScore += 30;
  }

  // 4. Phân tích diện tích và kích thước
  if (area >= 85000 && height >= 180) {
    gradeScore += 25;
  } else if (area <= 55000) {
    visualizeScore += 25;
  }

  // 5. Phân tích tỷ lệ khung bao H/W
  if (aspectRatio >= 0.65 && height >= 180) {
    gradeScore += 20;
  } else if (aspectRatio <= 0.45) {
    visualizeScore += 20;
  }

  // Ra quyết định phân loại
  const intent: LassoIntent = gradeScore > (visualizeScore + 15) ? 'GRADE' : 'VISUALIZE';
  const confidence = Math.min(
    0.98,
    Math.max(0.72, Math.round((Math.abs(gradeScore - visualizeScore) / 120 + 0.68) * 100) / 100)
  );

  let reason = '';
  if (intent === 'GRADE') {
    const reasons: string[] = [];
    if (hasKeywords) reasons.push('chứa từ khóa bài làm');
    if (hasDerivation) reasons.push('chứa suy luận toán học liên tiếp');
    if (lineCount >= 3) reasons.push(`${lineCount} dòng phân tầng`);
    if (strokeCount >= 30) reasons.push(`${strokeCount} nét viết`);
    reason = `Phát hiện bài làm học sinh: ${reasons.join(', ') || 'khối chữ nhật đứng nhiều bước'}`;
  } else {
    const reasons: string[] = [];
    if (lineCount <= 2) reasons.push(`${lineCount} dòng công thức`);
    if (strokeCount < 25) reasons.push(`${strokeCount} nét`);
    if (aspectRatio < 0.5) reasons.push('khung ngang chuẩn công thức');
    reason = `Phát hiện công thức STEM: ${reasons.join(', ') || 'biểu thức đơn dòng'}`;
  }

  return {
    intent,
    confidence,
    reason,
    features: {
      strokeCount,
      area,
      width,
      height,
      aspectRatio,
      lineCount,
      hasKeywords,
      hasDerivation,
      gradeScore,
      visualizeScore,
    },
  };
}
