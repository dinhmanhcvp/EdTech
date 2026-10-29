/**
 * Nhập/xuất bài soạn bằng tệp `.socrlesson.json` (cùng định dạng thư viện bài trên bảng chiếu). Trang quản lý chỉ kiểm tra khung
 * (danh sách trang, giới hạn kích thước); nét vẽ bên trong do bảng chiếu hiểu.
 */
export const FILE_FORMAT = 'socratic-lesson';
export const FILE_MAX_CHARS = 8 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_STROKES = 30_000;

export interface ParsedLesson {
  title: string;
  folder: string;
  pages: unknown[][];
}

export class LessonFileError extends Error {}

export function parseLessonFile(text: string): ParsedLesson {
  if (text.length > FILE_MAX_CHARS) throw new LessonFileError('Tệp quá lớn (tối đa 8 MB).');
  let v: any;
  try {
    v = JSON.parse(text);
  } catch {
    throw new LessonFileError('Tệp không phải JSON hợp lệ.');
  }
  const l = v?.format === FILE_FORMAT ? v.lesson : null;
  if (!l || !Array.isArray(l.pages) || l.pages.length === 0) throw new LessonFileError('Đây không phải tệp bài giảng của Socratic Vision Board.');
  if (l.pages.length > MAX_PAGES) throw new LessonFileError(`Bài có quá nhiều trang (tối đa ${MAX_PAGES}).`);
  const pages: unknown[][] = l.pages.map((pg: unknown) => (Array.isArray(pg) ? pg.filter((s) => s && typeof s === 'object') : []));
  if (pages.reduce((n, p) => n + p.length, 0) > MAX_STROKES) throw new LessonFileError('Bài có quá nhiều đối tượng.');
  return {title: typeof l.title === 'string' && l.title.trim() ? l.title.trim().slice(0, 120) : 'Bài nhập từ tệp', folder: typeof l.folder === 'string' ? l.folder.slice(0, 60) : '', pages};
}

export function lessonToFile(title: string, folder: string, pages: unknown[][]): string {
  return JSON.stringify({format: FILE_FORMAT, version: 1, lesson: {title, folder, pages}});
}
