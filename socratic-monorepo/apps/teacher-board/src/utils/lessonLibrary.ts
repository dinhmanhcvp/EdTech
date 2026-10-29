/**
 * Thư viện bài giảng: lưu cả bảng (mọi trang) thành một bài có tên và thư mục, mở lại ở buổi sau, nhân bản, xuất/nhập tệp để
 * sao lưu hoặc chuyển máy. Lưu trong trình duyệt của giáo viên (không máy chủ, không tài khoản). Thuần tính toán + một lớp
 * lưu trữ thay được (kiểm thử dùng bộ nhớ giả).
 *
 * shortcut: localStorage giới hạn ~5 MB mỗi trang web (đủ cho vài chục bài toàn nét viết thưa nhờ làm tròn tọa độ), đầy thì báo rõ
 * chứ không mất bài cũ; cần nhiều hơn thì chuyển sang IndexedDB, giữ nguyên giao diện LessonStore.
 */
import type {Stroke} from './lassoGeometry';

export interface LessonMeta {
  id: string;
  title: string;
  folder: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  strokeCount: number;
}

export interface LessonRecord extends LessonMeta {
  pages: Stroke[][];
}

export class LibraryError extends Error {}

export interface LessonStore {
  list(): LessonMeta[];
  get(id: string): LessonRecord | null;
  put(rec: LessonRecord): void;
  remove(id: string): void;
}

export const MAX_PAGES = 100;
export const MAX_STROKES = 30_000;
export const FILE_FORMAT = 'socratic-lesson';
export const FILE_MAX_CHARS = 8 * 1024 * 1024;

const INDEX_KEY = 'socratic_lessons_index';
const BODY_KEY = (id: string) => `socratic_lesson_${id}`;
export const DRAFT_KEY = 'socratic_board_draft';

const r1 = (v: number) => Math.round(v * 10) / 10;

/** làm tròn tọa độ 0,1 px để bài nhỏ hơn mà mắt không thấy khác */
export function compactPages(pages: Stroke[][]): Stroke[][] {
  return pages.map((pg) => pg.map((s) => ({...s, points: s.points.map((p) => ({...p, x: r1(p.x), y: r1(p.y)}))})));
}

export const countStrokes = (pages: Stroke[][]) => pages.reduce((n, p) => n + p.length, 0);
export const isEmptyBoard = (pages: Stroke[][]) => countStrokes(pages) === 0;

export const newLessonId = () => `ls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function makeRecord(input: {title: string; folder?: string; pages: Stroke[][]; id?: string; createdAt?: number}, now = Date.now()): LessonRecord {
  const pages = compactPages(input.pages.length ? input.pages : [[]]);
  return {
    id: input.id ?? newLessonId(),
    title: input.title.trim().slice(0, 120) || 'Bài chưa đặt tên',
    folder: (input.folder ?? '').trim().slice(0, 60),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    pages,
    pageCount: pages.length,
    strokeCount: countStrokes(pages),
  };
}

const metaOf = ({pages: _pages, ...meta}: LessonRecord): LessonMeta => meta;

/** Kho trong localStorage: danh sách nhẹ ở một khóa, nội dung từng bài ở khóa riêng (mở danh sách không phải đọc cả bài). */
export function localLessonStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): LessonStore {
  const readIndex = (): LessonMeta[] => {
    try {
      const v = JSON.parse(storage.getItem(INDEX_KEY) || '[]');
      return Array.isArray(v) ? v.filter((m) => m && typeof m.id === 'string') : [];
    } catch {
      return [];
    }
  };
  const write = (k: string, v: string) => {
    try {
      storage.setItem(k, v);
    } catch {
      throw new LibraryError('Bộ nhớ trình duyệt đã đầy. Hãy xuất các bài cũ ra tệp rồi xóa bớt trước khi lưu thêm.');
    }
  };
  return {
    list: () => readIndex().sort((a, b) => b.updatedAt - a.updatedAt),
    get: (id) => {
      try {
        const rec = JSON.parse(storage.getItem(BODY_KEY(id)) || 'null');
        return rec && Array.isArray(rec.pages) ? (rec as LessonRecord) : null;
      } catch {
        return null;
      }
    },
    put: (rec) => {
      // ghi nội dung trước, danh sách sau: nếu đầy giữa chừng thì danh sách không trỏ tới bài hỏng
      write(BODY_KEY(rec.id), JSON.stringify(rec));
      write(INDEX_KEY, JSON.stringify([...readIndex().filter((m) => m.id !== rec.id), metaOf(rec)]));
    },
    remove: (id) => {
      storage.removeItem(BODY_KEY(id));
      write(INDEX_KEY, JSON.stringify(readIndex().filter((m) => m.id !== id)));
    },
  };
}

export function duplicateLesson(store: LessonStore, id: string, now = Date.now()): LessonRecord | null {
  const src = store.get(id);
  if (!src) return null;
  const copy = makeRecord({title: `${src.title} (bản sao)`, folder: src.folder, pages: src.pages}, now);
  store.put(copy);
  return copy;
}

export const folders = (list: LessonMeta[]): string[] => [...new Set(list.map((m) => m.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));

/** lọc theo từ khóa trong tên hoặc thư mục, không phân biệt hoa thường */
export function searchLessons(list: LessonMeta[], q: string): LessonMeta[] {
  const k = q.trim().toLowerCase();
  return k ? list.filter((m) => `${m.title} ${m.folder}`.toLowerCase().includes(k)) : list;
}

// ------------------------------------------------------------------ tệp xuất/nhập
export function serializeLesson(rec: LessonRecord): string {
  return JSON.stringify({format: FILE_FORMAT, version: 1, lesson: rec});
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function cleanStroke(s: any): Stroke | null {
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !Array.isArray(s.points) || s.points.length > 20_000) return null;
  const points = s.points.filter((p: any) => p && num(p.x) && num(p.y));
  if (points.length === 0) return null;
  const out: Stroke = {id: s.id.slice(0, 80), points, color: typeof s.color === 'string' ? s.color.slice(0, 40) : '#18181B', width: num(s.width) ? s.width : 3};
  if (s.typeset && typeof s.typeset === 'object') out.typeset = s.typeset;
  if (s.shape && typeof s.shape === 'object') out.shape = s.shape;
  if (s.cover && typeof s.cover.hidden === 'boolean' && num(s.cover.order)) out.cover = {hidden: s.cover.hidden, order: s.cover.order};
  return out;
}

/** Trang nhận từ nguồn ngoài (máy chủ, tệp): giữ nét hợp lệ, bỏ nét hỏng; luôn trả ít nhất một trang. */
export function cleanPages(raw: unknown): Stroke[][] {
  const pages: Stroke[][] = Array.isArray(raw) ? raw.slice(0, MAX_PAGES).map((pg: unknown) => (Array.isArray(pg) ? pg.map(cleanStroke).filter((s: Stroke | null): s is Stroke => !!s) : [])) : [];
  return pages.length ? pages : [[]];
}

/** Đọc tệp bài giảng; ném LibraryError tiếng Việt nếu không phải tệp của hệ thống hoặc quá lớn. Cấp id mới để không đè bài đang có. */
export function parseLesson(text: string, now = Date.now()): LessonRecord {
  if (text.length > FILE_MAX_CHARS) throw new LibraryError('Tệp quá lớn (tối đa 8 MB).');
  let v: any;
  try {
    v = JSON.parse(text);
  } catch {
    throw new LibraryError('Tệp không phải JSON hợp lệ.');
  }
  const l = v?.format === FILE_FORMAT ? v.lesson : null;
  if (!l || !Array.isArray(l.pages)) throw new LibraryError('Đây không phải tệp bài giảng của Socratic Vision Board.');
  if (l.pages.length > MAX_PAGES) throw new LibraryError(`Bài có quá nhiều trang (tối đa ${MAX_PAGES}).`);
  const pages: Stroke[][] = l.pages.map((pg: unknown) => (Array.isArray(pg) ? pg.map(cleanStroke).filter((s: Stroke | null): s is Stroke => !!s) : []));
  if (countStrokes(pages) > MAX_STROKES) throw new LibraryError('Bài có quá nhiều nét.');
  return makeRecord({title: typeof l.title === 'string' ? l.title : 'Bài nhập từ tệp', folder: typeof l.folder === 'string' ? l.folder : '', pages, createdAt: num(l.createdAt) ? l.createdAt : now}, now);
}

// ------------------------------------------------------------------ bản nháp tự lưu
export interface Draft {
  savedAt: number;
  pages: Stroke[][];
}

export function saveDraft(storage: Pick<Storage, 'setItem' | 'removeItem'>, pages: Stroke[][], now = Date.now()): boolean {
  try {
    if (isEmptyBoard(pages)) {
      storage.removeItem(DRAFT_KEY);
      return true;
    }
    storage.setItem(DRAFT_KEY, JSON.stringify({savedAt: now, pages: compactPages(pages)} satisfies Draft));
    return true;
  } catch {
    return false; // bản nháp là phụ: đầy bộ nhớ thì bỏ qua, không làm phiền giáo viên
  }
}

export function loadDraft(storage: Pick<Storage, 'getItem'>): Draft | null {
  try {
    const d = JSON.parse(storage.getItem(DRAFT_KEY) || 'null');
    return d && num(d.savedAt) && Array.isArray(d.pages) && !isEmptyBoard(d.pages) ? (d as Draft) : null;
  } catch {
    return null;
  }
}
