'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Copy, RefreshCw} from 'lucide-react';
import {HubError, hub, studentAppBase, studentLink, type HubStudent} from '../lib/hub';

/** Học sinh thật của một lớp (lưu ở hub): mã đăng nhập app học sinh và link phụ huynh. */
export function StudentsPanel({consoleClassId}: {consoleClassId: string}) {
  const [hubClassId, setHubClassId] = useState<string | null>(null);
  const [list, setList] = useState<HubStudent[] | null>(null);
  const [names, setNames] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (cid: string) => setList(await hub.students(cid)), []);

  useEffect(() => {
    let alive = true;
    hub.linkClass(consoleClassId)
      .then(async ({hubClassId: cid}) => {
        if (!alive) return;
        setHubClassId(cid);
        await load(cid);
      })
      .catch((e) => alive && setError(e instanceof HubError ? e.message : 'Không tải được danh sách học sinh.'));
    return () => {
      alive = false;
    };
  }, [consoleClassId, load]);

  const add = async () => {
    const clean = names.split('\n').map((n) => n.trim()).filter(Boolean);
    if (!hubClassId || !clean.length) return;
    setError(null);
    try {
      await hub.addStudents(hubClassId, clean);
      setNames('');
      await load(hubClassId);
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không thêm được học sinh.');
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };

  const rotate = async (s: HubStudent) => {
    try {
      await hub.rotateParentLink(s.id);
      if (hubClassId) await load(hubClassId);
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không đổi được link.');
    }
  };

  return (
    <div data-testid="students-panel" className="mt-2 w-full rounded-xl border border-[#E6E4DD] bg-stone-50 p-3">
      {error && <div className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      {list === null ? (
        <div className="text-xs text-stone-500">Đang tải học sinh…</div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-stone-500">
            <tr>
              <th className="py-1">Học sinh</th>
              <th>Mã vào app</th>
              <th>Link phụ huynh</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-stone-500">Chưa có học sinh. Dán danh sách tên bên dưới (mỗi dòng một em).</td>
              </tr>
            )}
            {list.map((s) => (
              <tr key={s.id} className="border-t border-[#E6E4DD]">
                <td className="py-1.5 font-medium text-stone-800">{s.name}</td>
                <td className="font-mono text-stone-700">{s.loginCode}</td>
                <td className="flex items-center gap-1 py-1">
                  {s.parentToken && (
                    <button onClick={() => copy(studentLink(studentAppBase(), s.parentToken as string), s.id)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-blue-700 hover:bg-blue-50">
                      <Copy className="h-3 w-3" /> {copied === s.id ? 'Đã chép' : 'Chép link'}
                    </button>
                  )}
                  <button aria-label="Đổi link phụ huynh" title="Thu hồi link cũ, tạo link mới" onClick={() => rotate(s)} className="rounded p-1 text-stone-500 hover:bg-stone-100">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-2 flex gap-2">
        <textarea data-testid="students-names" rows={2} value={names} onChange={(e) => setNames(e.target.value)} placeholder="Dán tên học sinh, mỗi dòng một em" className="flex-1 rounded-lg border border-[#DCD9D0] px-2 py-1 text-xs" />
        <button data-testid="students-add" onClick={add} disabled={!names.trim() || !hubClassId} className="self-start rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          Thêm học sinh
        </button>
      </div>
    </div>
  );
}
