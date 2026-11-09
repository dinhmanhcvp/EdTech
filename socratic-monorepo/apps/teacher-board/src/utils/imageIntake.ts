/**
 * Ảnh từ ngoài đưa lên bảng (dán Ctrl+V, tải tệp, kéo thả): chụp màn hình đề bài, ảnh chụp sách…
 * Thu nhỏ và nén về JPEG để lưu cùng bài giảng không phình (ảnh lưu thẳng trong nét: Stroke.image.src).
 */
import {BOARD_H, BOARD_W} from './boardImage';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 1600;
const TARGET_BYTES = 450 * 1024;

export const isImageFile = (f: {type: string}) => /^image\/(png|jpe?g|gif|webp|bmp)$/i.test(f.type);

/** Lấy ảnh đầu tiên từ dữ liệu dán/kéo thả (clipboardData hoặc dataTransfer). */
export function firstImage(dt: {files?: ArrayLike<File> | null; items?: ArrayLike<DataTransferItem> | null} | null | undefined): File | null {
  for (const f of Array.from(dt?.files ?? [])) if (isImageFile(f)) return f;
  for (const it of Array.from(dt?.items ?? [])) {
    if (it.kind === 'file' && /^image\//.test(it.type)) {
      const f = it.getAsFile();
      if (f && isImageFile(f)) return f;
    }
  }
  return null;
}

/** Kích thước ảnh trên bảng: vừa trong 85% bề ngang và 50% bề dọc, không phóng to quá cỡ gốc. */
export function fitOnBoard(width: number, height: number): {w: number; h: number} {
  const k = Math.min((BOARD_W * 0.85) / width, (BOARD_H * 0.5) / height, 1.5);
  return {w: Math.round(width * k), h: Math.round(height * k)};
}

/** Kích thước sau khi thu nhỏ để cạnh dài nhất không quá MAX_SIDE. */
export function shrink(width: number, height: number, max = MAX_SIDE): {w: number; h: number} {
  const k = Math.min(1, max / Math.max(width, height));
  return {w: Math.max(1, Math.round(width * k)), h: Math.max(1, Math.round(height * k))};
}

export interface IntakeImage {
  src: string;
  width: number;
  height: number;
}

/** Đọc tệp ảnh → ảnh đã thu nhỏ/nén (data URL JPEG, nền trắng). Ném Error có thông báo tiếng Việt khi không dùng được. */
export async function loadImageFile(file: File): Promise<IntakeImage> {
  if (!isImageFile(file)) throw new Error('Tệp này không phải ảnh (dùng PNG, JPG, GIF, WEBP hoặc BMP)');
  if (file.size > MAX_FILE_BYTES) throw new Error('Ảnh lớn quá 15 MB, hãy chụp/cắt nhỏ hơn');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(new Error('Không đọc được ảnh này'));
      i.src = url;
    });
    const {w, h} = shrink(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không xử lý được ảnh');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let src = '';
    for (const q of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      src = canvas.toDataURL('image/jpeg', q);
      if (src.length * 0.75 <= TARGET_BYTES) break;
    }
    return {src, width: w, height: h};
  } finally {
    URL.revokeObjectURL(url);
  }
}
