import React from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {LessonLibraryPanel} from '../components/canvas/LessonLibraryPanel';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import {DRAFT_KEY, LibraryError, localLessonStore, makeRecord, saveDraft, serializeLesson, type LessonStore} from '../utils/lessonLibrary';
import type {Stroke} from '../utils/lassoGeometry';

const ink = (id: string): Stroke => ({id, points: [{x: 10, y: 10}, {x: 50, y: 50}], color: '#111', width: 3});
const PAGES = [[ink('a')], [ink('b'), ink('c')]];

const memStore = (): LessonStore & {fail?: boolean} => {
  const mem = new Map<string, string>();
  const s = localLessonStore({getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k)});
  return s;
};

afterEach(() => localStorage.clear());

const mount = (over: Partial<React.ComponentProps<typeof LessonLibraryPanel>> = {}) => {
  const loadPages = vi.fn();
  const getPages = vi.fn(() => PAGES);
  const store = over.store ?? memStore();
  const r = render(<LessonLibraryPanel getPages={getPages} loadPages={loadPages} store={store} autosaveMs={0} {...over} />);
  fireEvent.click(screen.getByTestId('lesson-library-open'));
  return {...r, loadPages, getPages, store};
};

describe('Thư viện bài giảng', () => {
  it('bảng trống: không cho lưu; chưa có bài thì báo rõ', () => {
    mount({getPages: () => [[]]});
    expect(screen.getByTestId('lesson-empty').textContent).toContain('Chưa có bài nào');
    expect(screen.getByTestId('lesson-save')).toBeDisabled();
  });

  it('lưu bảng → hiện trong danh sách, ghi số trang/đối tượng; lưu lại thì cập nhật chứ không nhân đôi', () => {
    const {store} = mount();
    fireEvent.change(screen.getByTestId('lesson-title'), {target: {value: 'Chương 1'}});
    fireEvent.change(screen.getByTestId('lesson-folder'), {target: {value: 'Toán 10'}});
    fireEvent.click(screen.getByTestId('lesson-save'));
    expect(screen.getByTestId('lesson-msg').textContent).toContain('Đã lưu “Chương 1” (2 trang)');
    expect(screen.getAllByTestId('lesson-item')).toHaveLength(1);
    expect(screen.getByTestId('lesson-item').textContent).toContain('Toán 10 · 2 trang · 3 đối tượng');
    expect(screen.getByTestId('lesson-save').textContent).toContain('Cập nhật');
    fireEvent.click(screen.getByTestId('lesson-save'));
    expect(screen.getByTestId('lesson-msg').textContent).toContain('Đã cập nhật');
    expect(store.list()).toHaveLength(1);
    fireEvent.click(screen.getByTestId('lesson-save-new'));
    expect(store.list()).toHaveLength(2);
  });

  it('mở bài khi bảng đang có nội dung phải xác nhận; Hủy thì không đổi bảng; Mở bài thì nạp đủ trang', () => {
    const store = memStore();
    store.put(makeRecord({title: 'Bài cũ', pages: [[ink('z')]], id: 'OLD'}));
    const {loadPages} = mount({store});
    fireEvent.click(screen.getByTestId('lesson-open'));
    expect(screen.getByTestId('lesson-confirm').textContent).toContain('Mở bài');
    fireEvent.click(screen.getByTestId('lesson-cancel'));
    expect(loadPages).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('lesson-open'));
    fireEvent.click(screen.getByTestId('lesson-confirm'));
    expect(loadPages).toHaveBeenCalledTimes(1);
    expect(loadPages.mock.calls[0][0][0][0].id).toBe('z');
    expect(screen.queryByTestId('lesson-library')).toBeNull(); // đóng sau khi mở
  });

  it('bảng trống thì mở bài luôn, không hỏi', () => {
    const store = memStore();
    store.put(makeRecord({title: 'Bài', pages: [[ink('z')]], id: 'X'}));
    const {loadPages} = mount({store, getPages: () => [[]]});
    fireEvent.click(screen.getByTestId('lesson-open'));
    expect(loadPages).toHaveBeenCalledTimes(1);
  });

  it('xóa phải xác nhận; nhân bản thêm một bài; tìm kiếm lọc theo tên/thư mục', () => {
    const store = memStore();
    store.put(makeRecord({title: 'Hàm số', folder: 'Toán', pages: PAGES, id: 'A'}, 2));
    store.put(makeRecord({title: 'Con lắc', folder: 'Lý', pages: PAGES, id: 'B'}, 1));
    mount({store});
    fireEvent.change(screen.getByTestId('lesson-search'), {target: {value: 'lý'}});
    expect(screen.getAllByTestId('lesson-item')).toHaveLength(1);
    fireEvent.change(screen.getByTestId('lesson-search'), {target: {value: ''}});
    fireEvent.click(screen.getAllByTestId('lesson-duplicate')[0]);
    expect(store.list()).toHaveLength(3);
    fireEvent.click(screen.getAllByTestId('lesson-delete')[0]);
    expect(store.list()).toHaveLength(3); // chưa xóa khi chưa xác nhận
    fireEvent.click(screen.getByTestId('lesson-confirm'));
    expect(store.list()).toHaveLength(2);
  });

  it('bộ nhớ đầy: hiện lỗi tiếng Việt, không sập, bài cũ còn', () => {
    const store = memStore();
    store.put(makeRecord({title: 'Cũ', pages: PAGES, id: 'OLD'}));
    store.put = () => {
      throw new LibraryError('Bộ nhớ trình duyệt đã đầy. Hãy xuất các bài cũ.');
    };
    mount({store});
    fireEvent.click(screen.getByTestId('lesson-save'));
    expect(screen.getByTestId('lesson-msg').textContent).toContain('Bộ nhớ trình duyệt đã đầy');
    expect(screen.getAllByTestId('lesson-item')).toHaveLength(1);
  });

  it('nhập tệp: nhận tệp đúng định dạng, từ chối tệp lạ bằng thông báo', async () => {
    const {store} = mount();
    const good = new File([serializeLesson(makeRecord({title: 'Từ tệp', pages: PAGES, id: 'EXT'}))], 'a.json', {type: 'application/json'});
    fireEvent.change(screen.getByTestId('lesson-import-file'), {target: {files: [good]}});
    await waitFor(() => expect(screen.getByTestId('lesson-msg').textContent).toContain('Đã nhập “Từ tệp”'));
    expect(store.list()).toHaveLength(1);
    const bad = new File(['{"x":1}'], 'b.json', {type: 'application/json'});
    fireEvent.change(screen.getByTestId('lesson-import-file'), {target: {files: [bad]}});
    await waitFor(() => expect(screen.getByTestId('lesson-msg').textContent).toContain('không phải tệp bài giảng'));
    expect(store.list()).toHaveLength(1);
  });
});

describe('Bản nháp tự lưu', () => {
  it('mở trang với bảng trống và có bản nháp: hỏi khôi phục; Khôi phục nạp đúng các trang', () => {
    saveDraft(localStorage, PAGES, Date.now());
    const loadPages = vi.fn();
    render(<LessonLibraryPanel getPages={() => [[]]} loadPages={loadPages} autosaveMs={0} />);
    expect(screen.getByTestId('lesson-draft')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lesson-draft-restore'));
    expect(loadPages.mock.calls[0][0]).toHaveLength(2);
    expect(screen.queryByTestId('lesson-draft')).toBeNull();
  });

  it('đang hiện hỏi khôi phục mà giáo viên đã bắt đầu viết thì tự ẩn (khôi phục sẽ thay bảng)', () => {
    saveDraft(localStorage, PAGES, Date.now());
    let pages: Stroke[][] = [[]];
    const {rerender} = render(<LessonLibraryPanel getPages={() => pages} loadPages={vi.fn()} autosaveMs={0} />);
    expect(screen.getByTestId('lesson-draft')).toBeInTheDocument();
    pages = [[ink('mới')]];
    rerender(<LessonLibraryPanel getPages={() => pages} loadPages={vi.fn()} autosaveMs={0} />);
    expect(screen.queryByTestId('lesson-draft')).toBeNull();
  });

  it('Bỏ thì xóa bản nháp; bảng đã có nội dung thì không làm phiền', () => {
    saveDraft(localStorage, PAGES, Date.now());
    const {unmount} = render(<LessonLibraryPanel getPages={() => PAGES} loadPages={vi.fn()} autosaveMs={0} />);
    expect(screen.queryByTestId('lesson-draft')).toBeNull();
    unmount();
    render(<LessonLibraryPanel getPages={() => [[]]} loadPages={vi.fn()} autosaveMs={0} />);
    fireEvent.click(screen.getByTestId('lesson-draft-discard'));
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('tự lưu định kỳ khi bảng có nội dung và có thay đổi; bảng trống thì không xóa bản nháp cũ', () => {
    vi.useFakeTimers();
    let pages: Stroke[][] = [[]];
    saveDraft(localStorage, PAGES, 1); // bản nháp cũ chờ quyết định
    render(<LessonLibraryPanel getPages={() => pages} loadPages={vi.fn()} autosaveMs={1000} />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).savedAt).toBe(1); // không bị bảng trống ghi đè/xóa
    pages = [[ink('new')]];
    act(() => void vi.advanceTimersByTime(1000));
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).pages[0][0].id).toBe('new');
    vi.useRealTimers();
  });
});

describe('Thư viện trên bảng thật', () => {
  it('lưu bảng đang có (kể cả trang khác) rồi mở lại: nét trở lại, về trang đầu', () => {
    const a = ink('keep-me');
    render(<SmartboardCanvas initialStrokes={[a]} />);
    fireEvent.click(screen.getByTestId('page-next')); // chưa có trang 2: không đổi
    fireEvent.click(screen.getByTestId('page-add'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('2 / 2');
    fireEvent.click(screen.getByTestId('lesson-library-open'));
    fireEvent.change(screen.getByTestId('lesson-title'), {target: {value: 'Bài thử'}});
    fireEvent.click(screen.getByTestId('lesson-save'));
    const id = screen.getByTestId('lesson-item').getAttribute('data-id')!;
    const rec = JSON.parse(localStorage.getItem(`socratic_lesson_${id}`)!);
    expect(rec.pageCount).toBe(2);
    expect(rec.pages[0][0].id).toBe('keep-me');
    // xóa hết rồi mở lại
    fireEvent.click(screen.getByTestId('lesson-library-close'));
    fireEvent.click(screen.getByTestId('page-delete'));
    fireEvent.click(screen.getByTestId('lesson-library-open'));
    fireEvent.click(screen.getByTestId('lesson-open'));
    if (screen.queryByTestId('lesson-confirm')) fireEvent.click(screen.getByTestId('lesson-confirm'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 2');
  });
});
