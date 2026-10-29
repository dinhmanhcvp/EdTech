'use client';

import React, {createContext, useContext, useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {BookOpen, CalendarDays, GraduationCap, LogOut, FolderOpen} from 'lucide-react';
import {api, clearToken, getToken} from '../lib/api';
import type {Teacher} from '../lib/types';

const TeacherCtx = createContext<Teacher | null>(null);
export const useTeacher = () => useContext(TeacherCtx);

const NAV = [
  {href: '/', label: 'Tiết học', icon: CalendarDays},
  {href: '/classes', label: 'Lớp', icon: GraduationCap},
  {href: '/lessons', label: 'Bài soạn', icon: BookOpen},
  {href: '/resources', label: 'Tài nguyên', icon: FolderOpen},
];

/** Khung chung của các trang cần đăng nhập: chưa có phiên hợp lệ thì chuyển về /login. */
export function Shell({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const path = usePathname();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then((r) => alive && (setTeacher(r.teacher), setChecked(true)))
      .catch((e) => {
        if (!alive) return;
        if (e?.status === 401) {
          clearToken();
          router.replace('/login');
        } else setChecked(true); // lỗi mạng: vẫn cho vào, từng trang sẽ báo lỗi riêng
      });
    return () => {
      alive = false;
    };
  }, [router]);

  if (!checked) return <div className="p-8 text-sm text-stone-500">Đang tải…</div>;

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* phiên hết hạn hoặc mất mạng: vẫn đăng xuất phía trình duyệt */
    }
    clearToken();
    router.replace('/login');
  };

  return (
    <TeacherCtx.Provider value={teacher}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-[#E6E4DD] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
            <span className="text-sm font-semibold text-stone-900">Quản lý giáo viên</span>
            <nav className="flex gap-1" aria-label="Điều hướng">
              {NAV.map(({href, label, icon: Icon}) => {
                const on = href === '/' ? path === '/' || path.startsWith('/periods') : path.startsWith(href);
                return (
                  <Link key={href} href={href} aria-current={on ? 'page' : undefined} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 aria-[current=page]:bg-blue-50 aria-[current=page]:font-semibold aria-[current=page]:text-blue-700">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <span data-testid="teacher-name" className="ml-auto text-sm text-stone-600">
              {teacher?.display_name}
            </span>
            <button data-testid="logout" onClick={() => void logout()} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100" title="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </div>
    </TeacherCtx.Provider>
  );
}

export function ErrorNote({error}: {error: string | null}) {
  return error ? (
    <p data-testid="error-note" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {error}
    </p>
  ) : null;
}
