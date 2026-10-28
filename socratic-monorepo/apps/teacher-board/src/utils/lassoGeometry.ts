/**
 * Feature 1: Point-in-Polygon Vector Hit-Testing & Forgiving Bounding Box Overlap
 * Selects strokes if:
 * 1. At least 25% of points are inside the Lasso polygon, OR
 * 2. Stroke's bounding box intersects/overlaps with Lasso's bounding box by >= 30%.
 * Automatically expands selection bounding box by 24px to capture nearby dots, accents, or subscripts.
 */

export interface Point {
  x: number;
  y: number;
  /** Áp lực bút 0..1 (bút cảm ứng); không có với chuột/ngón tay. */
  p?: number;
}

/** Đối tượng "công thức chuẩn" thay thế nét viết tay: neo tại points[0] (góc trên-trái), vẽ bằng KaTeX phía trên canvas. */
export interface TypesetMeta {
  latex: string;
  text: string;
  /** cỡ chữ theo đơn vị canvas (px của bảng 1200×675) */
  size: number;
  /** cạnh phải/dưới ước lượng, đơn vị canvas — để chọn bằng lasso và tẩy */
  w: number;
  h: number;
}

/**
 * Hình học tại chỗ: nét vẽ tay được thay bằng hình sạch trên bảng. Neo tại points[0] (góc trên-trái);
 * đỉnh/kích thước tính theo px canvas tương đối với neo nên di chuyển bằng lasso vẫn đúng.
 */
export interface ShapeMeta {
  kind: 'plane' | 'solid';
  title: string;
  plane?: {verts: {x: number; y: number}[]; euler: boolean};
  solid?: {kind: string; dims: Record<string, number | undefined>; yaw: number; pitch: number};
  /**
   * Hình khối giữ nguyên theo nét người vẽ (đã nắn thẳng, nối đỉnh), tọa độ tương đối với neo.
   * Có `sketch` thì vẽ theo đây, không vẽ lại từ khối mẫu; `solid` còn lại để mở mô hình 3D đầy đủ.
   */
  sketch?: {
    verts: {x: number; y: number}[];
    edges: {a: number; b: number; hidden: boolean; aux?: boolean}[];
    labels: string[];
    /** tên điểm (hình dựng từ đề): dùng để chọn điểm bằng chạm */
    names?: string[];
    /** chỉ số đỉnh vẽ chấm (điểm phụ) */
    marks?: number[];
    /** đa giác tô nhạt (thiết diện) */
    polys?: number[][];
    /** hình dựng từ đề: đỉnh không kéo được, chạm để chọn điểm */
    fixed?: boolean;
  };
  /** hình dựng từ đề bài: giữ cả cảnh để thêm/bớt từng phần và vẽ thêm */
  geo?: {scene: import('./geometryProblem').GeoScene; upTo: number; origin: {x: number; y: number}; source: string};
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  typeset?: TypesetMeta;
  /** có `shape` thì `typeset` chỉ giữ w/h để chọn, tẩy, di chuyển như công thức chuẩn */
  shape?: ShapeMeta;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeBoundingBox(points: Point[], expandBy = 0): BoundingBox {
  if (!points || points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX: minX - expandBy,
    minY: minY - expandBy,
    maxX: maxX + expandBy,
    maxY: maxY + expandBy,
  };
}

export function getBoundingBoxOverlapRatio(boxA: BoundingBox, boxB: BoundingBox): number {
  const overlapMinX = Math.max(boxA.minX, boxB.minX);
  const overlapMinY = Math.max(boxA.minY, boxB.minY);
  const overlapMaxX = Math.min(boxA.maxX, boxB.maxX);
  const overlapMaxY = Math.min(boxA.maxY, boxB.maxY);

  if (overlapMaxX <= overlapMinX || overlapMaxY <= overlapMinY) {
    return 0;
  }

  const overlapArea = (overlapMaxX - overlapMinX) * (overlapMaxY - overlapMinY);
  const areaA = (boxA.maxX - boxA.minX) * (boxA.maxY - boxA.minY);
  if (areaA <= 0) return 1.0;
  return overlapArea / areaA;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const { x, y } = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

export function filterEnclosedStrokes(
  strokes: Stroke[],
  lassoLoop: Point[],
  pointRatioThreshold = 0.25,
  bboxOverlapThreshold = 0.30,
  expansionPad = 24
): Stroke[] {
  if (!lassoLoop || lassoLoop.length < 3 || !strokes || strokes.length === 0) return [];

  const lassoBox = computeBoundingBox(lassoLoop);

  // 1. Initial forgiving selection: >= 25% points inside OR >= 30% BBox overlap
  const selectedSet = new Set<Stroke>();

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    let pointsInside = 0;
    for (const pt of stroke.points) {
      if (isPointInPolygon(pt, lassoLoop)) {
        pointsInside++;
      }
    }

    const pointRatio = pointsInside / stroke.points.length;
    const strokeBox = computeBoundingBox(stroke.points);
    const overlapRatio = getBoundingBoxOverlapRatio(strokeBox, lassoBox);

    if (pointRatio >= pointRatioThreshold || overlapRatio >= bboxOverlapThreshold) {
      selectedSet.add(stroke);
    }
  }

  // 2. Expand final selection bounding box by 24px to capture nearby dots, accents, or subscripts
  if (selectedSet.size > 0 && expansionPad > 0) {
    const allSelectedPts: Point[] = [];
    for (const s of selectedSet) {
      allSelectedPts.push(...s.points);
    }
    const expandedBox = computeBoundingBox(allSelectedPts, expansionPad);

    for (const stroke of strokes) {
      if (selectedSet.has(stroke) || !stroke.points || stroke.points.length === 0) continue;
      const sBox = computeBoundingBox(stroke.points);
      // If the stroke's center or entire bounding box is inside the expanded box, capture it
      const centerX = (sBox.minX + sBox.maxX) / 2;
      const centerY = (sBox.minY + sBox.maxY) / 2;
      if (
        centerX >= expandedBox.minX &&
        centerX <= expandedBox.maxX &&
        centerY >= expandedBox.minY &&
        centerY <= expandedBox.maxY
      ) {
        selectedSet.add(stroke);
      }
    }
  }

  return Array.from(selectedSet);
}

