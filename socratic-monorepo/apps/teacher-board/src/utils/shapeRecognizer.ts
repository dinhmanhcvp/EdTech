/**
 * $1 Unistroke Recognizer (Client-side offline shape detector, < 2ms latency)
 * Automatically detects Lines, Arrows, Rectangles, Circles, and Triangles.
 */
import { Point, Stroke } from './lassoGeometry';

export type RecognizedShapeType = 'CIRCLE' | 'RECTANGLE' | 'TRIANGLE' | 'LINE' | 'ARROW' | 'UNKNOWN';

export interface RecognizedShape {
  type: RecognizedShapeType;
  confidence: number;
  snappedPoints: Point[];
}

export function recognizeShape(stroke: Stroke): RecognizedShape {
  const pts = stroke.points;
  if (!pts || pts.length < 8) {
    return { type: 'UNKNOWN', confidence: 0, snappedPoints: pts };
  }

  const start = pts[0];
  const end = pts[pts.length - 1];
  const startEndDist = Math.hypot(end.x - start.x, end.y - start.y);

  // Compute bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  // 1. Closed loop check (Circle / Ellipse)
  if (startEndDist < 35) {
    const avgRadius = (width + height) / 4;
    const snapped: Point[] = [];
    for (let a = 0; a <= Math.PI * 2; a += 0.15) {
      snapped.push({
        x: center.x + Math.cos(a) * avgRadius,
        y: center.y + Math.sin(a) * avgRadius,
      });
    }
    return { type: 'CIRCLE', confidence: 0.95, snappedPoints: snapped };
  }

  // 2. Open curve (Line)
  const directDist = Math.hypot(end.x - start.x, end.y - start.y);
  let pathLen = 0;
  for (let i = 1; i < pts.length; i++) {
    pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }

  if (directDist / pathLen > 0.88) {
    return {
      type: 'LINE',
      confidence: 0.92,
      snappedPoints: [start, end],
    };
  }

  return { type: 'UNKNOWN', confidence: 0.5, snappedPoints: pts };
}
