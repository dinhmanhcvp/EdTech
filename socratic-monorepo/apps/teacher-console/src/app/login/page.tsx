'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ApiError, api, backendBase, boardBase, setBackendBase, setBoardBase, setToken} from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [invite, setInvite] = useState('');
  const [server, setServer] = useState('');
  const [board, setBoard] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setServer(backendBase());
    setBoard(boardBase());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setBackendBase(server);
    setBoardBase(board);
    try {
      const r = mode === 'login' ? await api.login(username, password) : await api.register(username, password, displayName, invite);
      setToken(r.token);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không đăng nhập được.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'rounded-xl border border-[#DCD9D0] px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none';
  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={submit} data-testid="login-form" className="flex w-full max-w-sm flex-col gap-3.5 rounded-2xl border border-[#E6E4DD] bg-white p-6 shadow-lg">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Socratic Vision Board</div>
          <h1 className="text-xl font-semibold text-stone-900">Trang quản lý giáo viên</h1>
          <p className="mt-1 text-xs text-stone-500">Soạn tiết, quản lý lớp và điều khiển bảng thông minh từ máy của bạn.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-100 p-1" role="tablist">
          {(['login', 'register'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} data-testid={`tab-${m}`} onClick={() => (setMode(m), setError(null))} className="flex-1 rounded-lg py-1.5 text-sm text-stone-600 aria-selected:bg-white aria-selected:font-semibold aria-selected:text-stone-900 aria-selected:shadow-sm">
              {m === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          ))}
        </div>
        <input data-testid="username" className={input} autoComplete="username" placeholder="Tên đăng nhập (không dấu)" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} required />
        {mode === 'register' && <input data-testid="display-name" className={input} placeholder="Tên hiển thị (VD: Cô Lan)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />}
        <input data-testid="password" className={input} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Mật khẩu (ít nhất 8 ký tự)' : 'Mật khẩu'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === 'register' && <input data-testid="invite" className={input} placeholder="Mã mời của trường (nếu có)" value={invite} onChange={(e) => setInvite(e.target.value)} />}
        {error && (
          <p data-testid="login-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <button data-testid="login-submit" type="submit" disabled={busy || !username || !password} className="rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        <details className="text-xs text-stone-500">
          <summary className="cursor-pointer">Địa chỉ máy chủ và bảng chiếu</summary>
          <label className="mt-2 flex flex-col gap-1">
            Máy chủ AI
            <input data-testid="server-url" className="rounded-lg border border-[#DCD9D0] px-2 py-1.5 text-sm" value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://127.0.0.1:8000" />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            Địa chỉ bảng chiếu (cho học sinh vào lớp)
            <input data-testid="board-url" className="rounded-lg border border-[#DCD9D0] px-2 py-1.5 text-sm" value={board} onChange={(e) => setBoard(e.target.value)} placeholder="http://localhost:3002" />
          </label>
        </details>
      </form>
    </div>
  );
}
