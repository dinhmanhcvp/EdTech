import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

vi.mock('next/navigation', () => ({useRouter: () => ({replace: vi.fn(), push: vi.fn()}), usePathname: () => '/resources'}));
vi.mock('next/link', () => ({default: ({href, children, ...rest}: any) => <a href={href} {...rest}>{children}</a>}));

const mockApi = vi.hoisted(() => ({me: vi.fn(), classes: vi.fn()}));
vi.mock('../lib/api', async () => ({...(await vi.importActual<typeof import('../lib/api')>('../lib/api')), api: mockApi}));

const hub = vi.hoisted(() => ({
  linkClass: vi.fn(), students: vi.fn(), addStudents: vi.fn(), rotateParentLink: vi.fn(),
  resources: vi.fn(), upload: vi.fn(), remove: vi.fn(), resource: vi.fn(), extract: vi.fn(), quickKey: vi.fn(), save: vi.fn(),
  pageBlobUrl: vi.fn(),
}));
vi.mock('../lib/hub', async () => ({...(await vi.importActual<typeof import('../lib/hub')>('../lib/hub')), hub}));

import {HubError, hubFetch, studentLink} from '../lib/hub';
import {setToken} from '../lib/api';
import {StudentsPanel} from '../components/StudentsPanel';
import {ResourceList} from '../components/ResourceList';
import {ResourceEditor} from '../components/ResourceEditor';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setToken('tok-console');
  hub.pageBlobUrl.mockResolvedValue('blob:x');
});

describe('hub client', () => {
  it('sends the console token and maps hub errors to Vietnamese', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({detail: 'in_use'}), {status: 409}));
    await expect(hubFetch('DELETE', '/assignments/a1', undefined, fetchImpl as unknown as typeof fetch)).rejects.toThrow('Tài nguyên đã được giao cho lớp, không xóa được.');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/hub\/assignments\/a1$/);
    expect(init.headers.Authorization).toBe('Bearer tok-console');
    expect(new HubError('x', 1)).toBeInstanceOf(Error);
  });

  it('does not set a JSON content type for uploads', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({id: 'a', pages: 2}), {status: 200}));
    const form = new FormData();
    await hubFetch('POST', '/assignments/upload', form, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
    expect(fetchImpl.mock.calls[0][1].body).toBe(form);
  });

  it('builds the parent link from the token', () => {
    expect(studentLink('http://hs.local/', 'tokABC')).toBe('http://hs.local/parent/tokABC');
  });
});

describe('StudentsPanel', () => {
  it('links the class, lists students with codes and adds pasted names', async () => {
    hub.linkClass.mockResolvedValue({hubClassId: 'cc-1'});
    hub.students.mockResolvedValueOnce([{id: 's-1', name: 'Lan', loginCode: 'AB2345', parentToken: 'p1'}])
      .mockResolvedValueOnce([{id: 's-1', name: 'Lan', loginCode: 'AB2345', parentToken: 'p1'}, {id: 's-2', name: 'Minh', loginCode: 'CD2345', parentToken: 'p2'}]);
    hub.addStudents.mockResolvedValue([]);
    render(<StudentsPanel consoleClassId="c1" />);
    expect(await screen.findByText('AB2345')).toBeInTheDocument();
    expect(hub.linkClass).toHaveBeenCalledWith('c1');
    fireEvent.change(screen.getByTestId('students-names'), {target: {value: 'Minh\n\n  Hoa  '}});
    fireEvent.click(screen.getByTestId('students-add'));
    await waitFor(() => expect(hub.addStudents).toHaveBeenCalledWith('cc-1', ['Minh', 'Hoa']));
    expect(await screen.findByText('CD2345')).toBeInTheDocument();
  });
});

describe('ResourceList', () => {
  const items = [
    {id: 'a1', title: 'Bài giảng hàm số', subject: 'MATH', kind: 'slides', source: 'file', currentVersion: 1, pageCount: 12, updatedAt: 1},
    {id: 'a2', title: 'Đề 15 phút', subject: 'MATH', kind: 'exam', source: 'file', currentVersion: 0, pageCount: 2, updatedAt: 2},
  ];

  it('filters by kind and marks unreviewed exams', async () => {
    hub.resources.mockResolvedValue(items);
    render(<ResourceList />);
    expect(await screen.findByText('Bài giảng hàm số')).toBeInTheDocument();
    expect(screen.getByText('Chưa duyệt câu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('kind-slides'));
    expect(screen.queryByText('Đề 15 phút')).not.toBeInTheDocument();
  });

  it('uploads a file with the chosen kind and subject', async () => {
    hub.resources.mockResolvedValue([]);
    hub.upload.mockResolvedValue({id: 'a3', pages: 3});
    render(<ResourceList />);
    await waitFor(() => expect(hub.resources).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('upload-title'), {target: {value: 'Slide tuần 3'}});
    fireEvent.change(screen.getByTestId('upload-kind'), {target: {value: 'slides'}});
    const file = new File(['%PDF'], 'tuan3.pdf', {type: 'application/pdf'});
    fireEvent.change(screen.getByTestId('upload-file'), {target: {files: [file]}});
    fireEvent.click(screen.getByTestId('upload-submit'));
    await waitFor(() => expect(hub.upload).toHaveBeenCalledWith({title: 'Slide tuần 3', subject: 'MATH', kind: 'slides', files: [file]}));
  });

  it('asks before deleting and shows the in-use message', async () => {
    hub.resources.mockResolvedValue(items);
    hub.remove.mockRejectedValue(new HubError('Tài nguyên đã được giao cho lớp, không xóa được.', 409));
    render(<ResourceList />);
    const row = (await screen.findByText('Bài giảng hàm số')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByTestId('resource-delete'));
    fireEvent.click(within(row).getByTestId('resource-confirm-delete'));
    expect(await screen.findByText('Tài nguyên đã được giao cho lớp, không xóa được.')).toBeInTheDocument();
  });
});

describe('ResourceEditor', () => {
  const draft = {id: 'a2', teacherId: 't', version: 0, body: null, pages: [{page: 0, width: 1131, height: 1600}], source: 'file', title: 'Đề 15 phút', subject: 'MATH', kind: 'exam'};

  it('fills questions from AI extraction and saves them', async () => {
    hub.resource.mockResolvedValue(draft);
    hub.extract.mockResolvedValue({source: 'ai', questions: [{id: 'q1', type: 'choice', label: 'Câu 1', text: 'Chọn', options: ['1', '2', '3', '4'], answer: '1', page: 0, kcs: []}]});
    hub.save.mockResolvedValue({id: 'a2', version: 1});
    render(<ResourceEditor id="a2" />);
    fireEvent.click(await screen.findByTestId('extract'));
    expect(await screen.findByDisplayValue('Chọn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('save'));
    await waitFor(() => expect(hub.save).toHaveBeenCalled());
    const [id, body, base] = hub.save.mock.calls[0];
    expect(id).toBe('a2') ;
    expect(base).toBe(0);
    expect(body).toMatchObject({title: 'Đề 15 phút', subject: 'MATH', kind: 'exam', questions: [{id: 'q1', type: 'choice', answer: '1', options: ['1', '2', '3', '4']}]});
  });

  it('says AI is unavailable when extraction is offline and offers the quick key', async () => {
    hub.resource.mockResolvedValue(draft);
    hub.extract.mockResolvedValue({source: 'offline', questions: []});
    hub.quickKey.mockResolvedValue([{id: 'q1', type: 'essay', label: 'Câu 1', text: 'Câu 1', answer: 'x=2', kcs: []}]);
    render(<ResourceEditor id="a2" />);
    fireEvent.click(await screen.findByTestId('extract'));
    expect(await screen.findByText(/AI chưa đọc được đề/)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('quick-key'), {target: {value: '1: x=2'}});
    fireEvent.click(screen.getByTestId('quick-key-apply'));
    expect(await screen.findByDisplayValue('x=2')).toBeInTheDocument();
  });
});
