import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {BookShelf, bookX, subjectFromText, type Book} from '../components/BookShelf';

const book = (id: string, title: string, group: string, over: Partial<Book> = {}): Book => ({id, title, tag: `Slide · Toán`, meta: '3 trang', hue: 218, group, search: title.toLowerCase(), ...over});
const BOOKS = [book('a', 'Hàm số', 'slides'), book('b', 'Đề 15 phút', 'exam'), book('c', 'Giới hạn', 'slides')];
const TABS = [{key: 'slides', label: 'Slide', testId: 'tab-slides'}, {key: 'exam', label: 'Đề', testId: 'tab-exam'}];
const caption = () => screen.getByTestId('shelf-caption');

describe('nhận môn từ chữ tự do', () => {
  it('khớp theo từ nguyên vẹn, có hoặc không dấu', () => {
    expect(subjectFromText('Toán 10')).toBe('MATH');
    expect(subjectFromText('Lý 11')).toBe('PHYSICS');
    expect(subjectFromText('Vật lí 12')).toBe('PHYSICS');
    expect(subjectFromText('Hóa học 11')).toBe('CHEMISTRY');
    expect(subjectFromText('Sinh 10')).toBe('BIOLOGY');
    expect(subjectFromText('Liên môn')).toBe('OTHER'); // "li" nằm trong từ khác
    expect(subjectFromText('Hoạt động ngoại khóa')).toBe('OTHER');
    expect(subjectFromText('')).toBe('OTHER');
  });
});

describe('hình học kệ', () => {
  it('cuốn đang chọn ở giữa; hai bên đối xứng, cách đều nhau bằng bề ngang gáy', () => {
    expect(bookX(0)).toBe(0);
    expect(bookX(-3)).toBe(-bookX(3));
    expect(bookX(2) - bookX(1)).toBe(bookX(3) - bookX(2));
    expect(bookX(1)).toBeGreaterThan(0);
  });
});

describe('BookShelf', () => {
  const shelf = (over: Partial<React.ComponentProps<typeof BookShelf>> = {}) =>
    render(<BookShelf testId="shelf" books={BOOKS} tabs={TABS} searchTestId="q" emptyAll="Kệ trống" actions={(b) => <button data-testid="act">Mở {b.id}</button>} {...over} />);

  it('mở bìa cuốn đầu; mũi tên và phím ←/→ đổi cuốn; không đi quá hai đầu', () => {
    shelf();
    expect(caption()).toHaveTextContent('Hàm số');
    expect(screen.getByLabelText('Cuốn trước')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Cuốn sau'));
    expect(caption()).toHaveTextContent('Đề 15 phút');
    fireEvent.keyDown(screen.getByTestId('shelf'), {key: 'ArrowRight'});
    expect(caption()).toHaveTextContent('Giới hạn');
    expect(screen.getByLabelText('Cuốn sau')).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('shelf'), {key: 'ArrowLeft'});
    expect(caption()).toHaveTextContent('Đề 15 phút');
    expect(screen.getByTestId('act')).toHaveTextContent('Mở b');
  });

  it('chạm một gáy để mở bìa; chỉ cuốn đang mở có aria-selected', () => {
    shelf();
    fireEvent.click(screen.getAllByTestId('shelf-item')[2]);
    expect(caption()).toHaveTextContent('Giới hạn');
    expect(screen.getAllByRole('option', {selected: true})).toHaveLength(1);
  });

  it('tab lọc theo nhóm, tìm kiếm thu hẹp, không có kết quả thì báo', () => {
    shelf();
    fireEvent.click(screen.getByTestId('tab-slides'));
    expect(screen.getAllByTestId('shelf-item')).toHaveLength(2);
    fireEvent.change(screen.getByTestId('q'), {target: {value: 'giới'}});
    expect(screen.getAllByTestId('shelf-item')).toHaveLength(1);
    expect(caption()).toHaveTextContent('Giới hạn');
    fireEvent.change(screen.getByTestId('q'), {target: {value: 'zzz'}});
    expect(screen.getByTestId('shelf-empty')).toHaveTextContent('Không có cuốn nào khớp.');
    fireEvent.change(screen.getByTestId('q'), {target: {value: ''}});
    fireEvent.click(screen.getByTestId('shelf-tab-all'));
    expect(screen.getAllByTestId('shelf-item')).toHaveLength(3);
  });

  it('kệ trống / đang tải', () => {
    const {rerender} = shelf({books: []});
    expect(screen.getByTestId('shelf-empty')).toHaveTextContent('Kệ trống');
    rerender(<BookShelf testId="shelf" books={null} emptyAll="x" />);
    expect(screen.getByText('Đang tải…')).toBeInTheDocument();
  });

  it('focusId mở bìa cuốn vừa thêm; cuốn đã chọn cho tiết có dấu hiệu', () => {
    const {rerender} = shelf({focusId: 'c', marked: ['a']});
    expect(caption()).toHaveTextContent('Giới hạn');
    expect(screen.getByLabelText('Hàm số (đã chọn cho tiết)')).toBeInTheDocument();
    const more = [...BOOKS, book('d', 'Mới', 'exam')];
    rerender(<BookShelf testId="shelf" books={more} focusId="d" emptyAll="x" />);
    expect(caption()).toHaveTextContent('Mới');
    fireEvent.click(screen.getByLabelText('Cuốn trước'));
    rerender(<BookShelf testId="shelf" books={[...more]} focusId="d" emptyAll="x" />); // tải lại danh sách: giữ lựa chọn của người dùng
    expect(caption()).toHaveTextContent('Giới hạn');
  });

  it('tải ảnh bìa cho cuốn đang mở, mỗi cuốn một lần; lỗi thì dùng bìa tự vẽ', async () => {
    const loadCover = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'b') throw new Error('x');
      return `blob:${id}`;
    });
    shelf({loadCover});
    await waitFor(() => expect(loadCover).toHaveBeenCalledWith('a'));
    fireEvent.click(screen.getByLabelText('Cuốn sau'));
    await waitFor(() => expect(loadCover).toHaveBeenCalledWith('b'));
    fireEvent.click(screen.getByLabelText('Cuốn trước'));
    expect(loadCover).toHaveBeenCalledTimes(2);
    expect(caption()).toHaveTextContent('Hàm số');
  });
});
