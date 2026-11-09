'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Copy, RefreshCw} from 'lucide-react';
import {HubError, hub, studentAppBase, studentLink, type HubStudent, type ParentReport} from '../lib/hub';

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

  const [report, setReport] = useState<{id: string; r: ParentReport} | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const makeReport = async (s: HubStudent) => {
    setReporting(s.id);
    try {
      setReport({id: s.id, r: await hub.reportNow(s.id)});
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không tạo được báo cáo.');
    } finally {
      setReporting(null);
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
    <div data-testid="students-panel" className="mt-2 w-full rounded-xl border border-rule bg-stone-50 p-3">
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
              <th>Báo cáo tuần</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-stone-500">Chưa có học sinh. Dán danh sách tên bên dưới (mỗi dòng một em).</td>
              </tr>
            )}
            {list.map((s) => (
              <React.Fragment key={s.id}>
              <tr className="border-t border-rule">
                <td className="py-1.5 font-medium text-stone-800">{s.name}</td>
                <td className="font-mono text-stone-700">{s.loginCode}</td>
                <td className="flex items-center gap-1 py-1">
                  {s.parentToken && (
                    <button onClick={() => copy(studentLink(studentAppBase(), s.parentToken as string), s.id)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-brand-700 hover:bg-brand-50">
                      <Copy className="h-3 w-3" /> {copied === s.id ? 'Đã chép' : 'Chép link'}
                    </button>
                  )}
                  <button aria-label="Đổi link phụ huynh" title="Thu hồi link cũ, tạo link mới" onClick={() => rotate(s)} className="rounded p-1 text-stone-500 hover:bg-stone-100">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </td>
                <td>
                  <button data-testid="report-now" disabled={reporting === s.id} onClick={() => (report?.id === s.id ? setReport(null) : void makeReport(s))} className="rounded px-1.5 py-0.5 text-brand-700 hover:bg-brand-50 disabled:opacity-40">
                    {reporting === s.id ? 'Đang chốt…' : report?.id === s.id ? 'Ẩn' : 'Chốt & xem'}
                  </button>
                </td>
              </tr>
              {report?.id === s.id && (
                <tr>
                  <td colSpan={4} className="pb-2">
                    <div data-testid="report-preview" className="rounded-lg border border-rule bg-white p-2 text-stone-700">
                      <div className="font-semibold text-stone-900">Tuần {report.r.week} · {report.r.activeDays} ngày học · {report.r.minutes} phút · {report.r.done} câu</div>
                      <p className="mt-1">{report.r.comment}</p>
                      {report.r.improved.length > 0 && <p className="mt-1 text-emerald-700">Tiến bộ: {report.r.improved.join(', ')}</p>}
                      {report.r.needsHelp.length > 0 && <p className="mt-1 text-rose-700">Cần giúp: {report.r.needsHelp.join(', ')}</p>}
                      {report.r.tips.length > 0 && <ul className="mt-1 list-disc pl-4">{report.r.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
                      <p className="mt-1 text-stone-400">{report.r.source === 'ai' ? 'Nhận xét do AI viết từ số liệu.' : 'Nhận xét theo mẫu (AI chưa sẵn sàng).'} Phụ huynh xem bản này qua link phụ huynh.</p>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-2 flex gap-2">
        <textarea data-testid="students-names" rows={2} value={names} onChange={(e) => setNames(e.target.value)} placeholder="Dán tên học sinh, mỗi dòng một em" className="flex-1 rounded-lg border border-[#DCD9D0] px-2 py-1 text-xs" />
        <button data-testid="students-add" onClick={add} disabled={!names.trim() || !hubClassId} className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          Thêm học sinh
        </button>
      </div>
    </div>
  );
}
