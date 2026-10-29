import {describe, expect, it} from 'vitest';
import type {Stroke} from '../utils/lassoGeometry';
import {DRAFT_KEY, LibraryError, compactPages, duplicateLesson, folders, loadDraft, localLessonStore, makeRecord, parseLesson, saveDraft, searchLessons, serializeLesson} from '../utils/lessonLibrary';

class MemStorage {
  data = new Map<string, string>();
  limit = Infinity;
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => {
    const used = [...this.data.entries()].filter(([kk]) => kk !== k).reduce((n, [, vv]) => n + vv.length, 0);
    if (used + v.length > this.limit) throw new DOMException('Quota', 'QuotaExceededError');
    this.data.set(k, v);
  };
  removeItem = (k: string) => void this.data.delete(k);
}

const ink = (id: string, x = 10.123, y = 20.987): Stroke => ({id, points: [{x, y}, {x: x + 5.555, y: y + 5.555}], color: '#111', width: 3});
const formula: Stroke = {id: 'f1', points: [{x: 100, y: 100}], color: '#111', width: 3, typeset: {latex: 'x^2', text: 'x²', size: 20, w: 80, h: 30}};
const cover: Stroke = {id: 'c1', points: [{x: 5, y: 5}], color: '#475569', width: 3, typeset: {latex: '', text: '', size: 20, w: 50, h: 20}, cover: {hidden: true, order: 2}};
const PAGES = [[ink('a'), formula], [cover]];

describe('lưu / mở / nhân bản bài', () => {
  it('lưu rồi mở lại đủ trang, đủ nét (công thức và tấm che nguyên vẹn), tọa độ làm tròn 0,1', () => {
    const store = localLessonStore(new MemStorage());
    store.put(makeRecord({title: ' Chương 1 ', folder: 'Toán 10', pages: PAGES, id: 'L1'}, 1000));
    const meta = store.list()[0];
    expect(meta).toMatchObject({id: 'L1', title: 'Chương 1', folder: 'Toán 10', pageCount: 2, strokeCount: 3, updatedAt: 1000});
    expect('pages' in meta).toBe(false); // danh sách không mang nội dung
    const rec = store.get('L1')!;
    expect(rec.pages[0][0].points[0]).toEqual({x: 10.1, y: 21});
    expect(rec.pages[0][1].typeset?.latex).toBe('x^2');
    expect(rec.pages[1][0].cover).toEqual({hidden: true, order: 2});
  });

  it('lưu đè cùng id chỉ cập nhật một bản; danh sách xếp bài mới sửa lên đầu', () => {
    const store = localLessonStore(new MemStorage());
    store.put(makeRecord({title: 'A', pages: PAGES, id: 'A'}, 1));
    store.put(makeRecord({title: 'B', pages: PAGES, id: 'B'}, 2));
    store.put(makeRecord({title: 'A mới', pages: PAGES, id: 'A', createdAt: 1}, 3));
    expect(store.list().map((m) => m.title)).toEqual(['A mới', 'B']);
  });

  it('nhân bản có id mới và tên có chữ bản sao; xóa gỡ cả nội dung lẫn danh sách', () => {
    const mem = new MemStorage();
    const store = localLessonStore(mem);
    store.put(makeRecord({title: 'Bài', pages: PAGES, id: 'L'}, 1));
    const copy = duplicateLesson(store, 'L', 5)!;
    expect(copy.id).not.toBe('L');
    expect(copy.title).toBe('Bài (bản sao)');
    expect(store.list()).toHaveLength(2);
    store.remove('L');
    expect(store.get('L')).toBeNull();
    expect(store.list().map((m) => m.id)).toEqual([copy.id]);
    expect(mem.getItem('socratic_lesson_L')).toBeNull();
    expect(duplicateLesson(store, 'khong-co')).toBeNull();
  });

  it('bộ nhớ đầy: báo lỗi tiếng Việt, bài cũ còn nguyên, danh sách không trỏ tới bài hỏng', () => {
    const mem = new MemStorage();
    const store = localLessonStore(mem);
    store.put(makeRecord({title: 'Cũ', pages: PAGES, id: 'OLD'}, 1));
    mem.limit = mem.data.get('socratic_lesson_OLD')!.length + 50;
    const big: Stroke[] = Array.from({length: 500}, (_, i) => ink(`s${i}`));
    expect(() => store.put(makeRecord({title: 'Lớn', pages: [big], id: 'BIG'}, 2))).toThrow(LibraryError);
    expect(store.list().map((m) => m.id)).toEqual(['OLD']);
    expect(store.get('OLD')?.title).toBe('Cũ');
  });

  it('dữ liệu hỏng trong kho không làm sập: bỏ qua', () => {
    const mem = new MemStorage();
    mem.setItem('socratic_lessons_index', '{không phải json');
    mem.setItem('socratic_lesson_X', '###');
    const store = localLessonStore(mem);
    expect(store.list()).toEqual([]);
    expect(store.get('X')).toBeNull();
  });
});

describe('tìm kiếm và thư mục', () => {
  const list = [makeRecord({title: 'Hàm số bậc hai', folder: 'Toán 10', pages: []}), makeRecord({title: 'Con lắc lò xo', folder: 'Lý 11', pages: []}), makeRecord({title: 'Tam giác', folder: 'Toán 10', pages: []})];
  it('lọc theo tên hoặc thư mục, không phân biệt hoa thường; thư mục không trùng, sắp xếp', () => {
    expect(searchLessons(list, 'LÒ XO').map((m) => m.title)).toEqual(['Con lắc lò xo']);
    expect(searchLessons(list, 'toán 10')).toHaveLength(2);
    expect(searchLessons(list, '  ')).toHaveLength(3);
    expect(folders(list)).toEqual(['Lý 11', 'Toán 10']);
  });
});

describe('xuất / nhập tệp', () => {
  it('xuất rồi nhập lại giữ nội dung, cấp id mới (không đè bài đang có)', () => {
    const rec = makeRecord({title: 'Bài', folder: 'Lý', pages: PAGES, id: 'ORIG'}, 10);
    const back = parseLesson(serializeLesson(rec), 99);
    expect(back.id).not.toBe('ORIG');
    expect(back).toMatchObject({title: 'Bài', folder: 'Lý', pageCount: 2, strokeCount: 3, createdAt: 10, updatedAt: 99});
    expect(back.pages[1][0].cover).toEqual({hidden: true, order: 2});
  });

  it('tệp lạ bị từ chối bằng tiếng Việt; nét hỏng bị lọc thay vì làm hỏng bảng', () => {
    expect(() => parseLesson('không phải json')).toThrow(/JSON/);
    expect(() => parseLesson(JSON.stringify({a: 1}))).toThrow(/không phải tệp bài giảng/);
    expect(() => parseLesson(JSON.stringify({format: 'socratic-lesson', lesson: {pages: Array(101).fill([])}}))).toThrow(/quá nhiều trang/);
    expect(() => parseLesson('x'.repeat(8 * 1024 * 1024 + 1))).toThrow(/quá lớn/);
    const dirty = JSON.stringify({format: 'socratic-lesson', lesson: {title: 5, pages: [[{id: 's', points: [{x: 1, y: 2}, {x: 'a', y: 3}], color: '#000', width: 3}, {id: 9}, null, {id: 'e', points: []}]]}});
    const rec = parseLesson(dirty);
    expect(rec.title).toBe('Bài nhập từ tệp');
    expect(rec.pages[0]).toHaveLength(1);
    expect(rec.pages[0][0].points).toEqual([{x: 1, y: 2}]);
  });
});

describe('bản nháp tự lưu', () => {
  it('lưu bản nháp khi bảng có nội dung, bảng trống thì xóa bản nháp; đọc lại đúng', () => {
    const mem = new MemStorage();
    expect(saveDraft(mem, PAGES, 777)).toBe(true);
    expect(loadDraft(mem)).toMatchObject({savedAt: 777});
    expect(loadDraft(mem)!.pages[0]).toHaveLength(2);
    saveDraft(mem, [[]], 800);
    expect(mem.getItem(DRAFT_KEY)).toBeNull();
    expect(loadDraft(mem)).toBeNull();
  });
  it('đầy bộ nhớ: bản nháp bỏ qua lặng lẽ, trả false', () => {
    const mem = new MemStorage();
    mem.limit = 5;
    expect(saveDraft(mem, PAGES)).toBe(false);
  });
  it('compactPages không đụng nét gốc', () => {
    const src = [[ink('z')]];
    compactPages(src);
    expect(src[0][0].points[0].x).toBe(10.123);
  });
});
