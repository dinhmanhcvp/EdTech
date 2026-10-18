/**
 * Feature 1: High-Contrast Thick-Stroke Offscreen Exporter
 * 1. Calculate tight bounding box of selected strokes + 40px padding.
 * 2. Set minimum canvas dimensions to 512x256 (scale up proportionally).
 * 3. Fill entire canvas with solid pure white (#FFFFFF) BEFORE drawing any strokes.
 * 4. Render strokes in pure black (#000000) with thick, smooth curves: lineWidth = 8, lineCap = 'round', lineJoin = 'round' using quadratic curve smoothing.
 * 5. Export as image/png base64 data URL.
 */
import { Stroke, Point } from './lassoGeometry';

export interface IsolatedExportResult {
  blob: Blob;
  dataUrl: string;
  sizeKb: number;
  width: number;
  height: number;
}

export async function exportIsolatedWebp(
  enclosedStrokes: Stroke[],
  padding = 40
): Promise<IsolatedExportResult> {
  if (!enclosedStrokes || enclosedStrokes.length === 0) {
    throw new Error('No strokes selected for isolated export.');
  }

  // 1. Calculate tight bounding box of selected strokes
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const stroke of enclosedStrokes) {
    for (const pt of stroke.points) {
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y);
      maxY = Math.max(maxY, pt.y);
    }
  }

  const rawWidth = Math.max(maxX - minX, 40);
  const rawHeight = Math.max(maxY - minY, 25);

  // 2. Set minimum canvas dimensions to 512x256 (scale up proportionally so small handwriting becomes large and crisp)
  const minTargetW = 512;
  const minTargetH = 256;
  const scaleX = minTargetW / (rawWidth + padding * 2);
  const scaleY = minTargetH / (rawHeight + padding * 2);
  const scale = Math.max(1.8, Math.max(scaleX, scaleY));

  const canvasWidth = Math.max(minTargetW, Math.round((rawWidth + padding * 2) * scale));
  const canvasHeight = Math.max(minTargetH, Math.round((rawHeight + padding * 2) * scale));

  // Create Off-screen canvas
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;
  const ctx = offscreen.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create offscreen 2D context.');
  }

  // 3. CRITICAL: Fill the ENTIRE canvas with solid pure white BEFORE drawing any strokes
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 4. Render strokes in pure black (#000000) with thick, smooth curves: lineWidth = 8
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Center the scaled bounding box inside the canvas
  const scaledContentW = rawWidth * scale;
  const scaledContentH = rawHeight * scale;
  const startX = (canvasWidth - scaledContentW) / 2;
  const startY = (canvasHeight - scaledContentH) / 2;

  for (const stroke of enclosedStrokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    
    const pts = stroke.points.map((p) => ({
      x: startX + (p.x - minX) * scale,
      y: startY + (p.y - minY) * scale,
    }));

    if (pts.length === 1) {
      // Single dot (e.g. dot on 'i' or decimal point)
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      continue;
    }

    // Quadratic curve smoothing between points for ultra-clean edges
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (typeof ctx.quadraticCurveTo === 'function') {
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    } else {
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.stroke();
  }

  // 5. Export as image/png base64 data URL
  const dataUrl = offscreen.toDataURL('image/png');
  const blob: Blob = await new Promise((resolve) => {
    offscreen.toBlob((b) => resolve(b || new Blob()), 'image/png');
  });

  const sizeKb = Math.round((blob.size / 1024) * 10) / 10;
  return {
    blob,
    dataUrl,
    sizeKb,
    width: canvasWidth,
    height: canvasHeight,
  };
}

