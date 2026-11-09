'use client';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {BookOpen, CalendarDays, ClipboardList, FlaskConical, FolderOpen, GraduationCap, LayoutDashboard, LogOut} from 'lucide-react';
import {api, clearToken, getToken} from '../lib/api';
import type {ClassInfo, Period, Teacher} from '../lib/types';

const TeacherCtx = createContext<Teacher | null>(null);
export const useTeacher = () => useContext(TeacherCtx);

/** Ba trạng thái của một tiết dạy: toàn bộ trang tổng quan xoay quanh chúng. */
export type Stage = 'before' | 'live' | 'after';
export const STAGES: {key: Stage; label: string}[] = [
  {key: 'before', label: 'Trước giờ học'},
  {key: 'live', label: 'Đang dạy'},
  {key: 'after', label: 'Sau giờ học'},
];

interface ConsoleState {
  classes: ClassInfo[];
  classId: string;
  setClassId: (id: string) => void;
  stage: Stage;
  setStage: (s: Stage) => void;
  periods: Period[];
  reload: () => void;
}
const ConsoleCtx = createContext<ConsoleState>({classes: [], classId: '', setClassId: () => {}, stage: 'before', setStage: () => {}, periods: [], reload: () => {}});
export const useConsole = () => useContext(ConsoleCtx);

const NAV = [
  {href: '/', label: 'Tổng quan', icon: LayoutDashboard, group: 'Làm việc'},
  {href: '/classes', label: 'Lớp & học sinh', icon: GraduationCap, group: 'Lớp'},
  {href: '/periods', label: 'Hồ sơ tiết học', icon: CalendarDays, group: 'Lớp'},
  {href: '/resources', label: 'Kho tài nguyên', icon: FolderOpen, group: 'Kho'},
  {href: '/lessons', label: 'Bài soạn', icon: BookOpen, group: 'Kho'},
  {href: '/plans', label: 'Giáo án', icon: ClipboardList, group: 'Kho'},
  {href: '/simulations', label: 'Kho mô phỏng', icon: FlaskConical, group: 'Kho'},
];

const read = (k: string) => {
  try {
    return window.localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* trình duyệt chặn lưu trữ: lựa chọn chỉ sống trong phiên */
  }
};
const isStage = (v: string): v is Stage => STAGES.some((s) => s.key === v);
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);

/** Khung chung của các trang cần đăng nhập: thanh bên, chọn lớp, thanh gạt ba trạng thái; chưa có phiên hợp lệ thì chuyển về /login. */
export function Shell({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const path = usePathname();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [checked, setChecked] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classId, setClassIdState] = useState('');
  const [stage, setStageState] = useState<Stage>('before');

  const reload = useCallback(() => {
    // lỗi ở đây không chặn việc làm việc: từng trang tự báo lỗi riêng
    void (async () => setClasses(await api.classes()))().catch(() => setClasses([]));
    void (async () => setPeriods(await api.periods()))().catch(() => setPeriods([]));
  }, []);

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then((r) => {
        if (!alive) return;
        setTeacher(r.teacher);
        setChecked(true);
        const saved = read('console_stage');
        if (isStage(saved)) setStageState(saved);
        setClassIdState(read('console_class'));
        reload();
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.status === 401) {
          clearToken();
          router.replace('/login');
        } else setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [router, reload]);

  // lớp đã lưu không còn (bị xóa) hoặc chưa chọn: lấy lớp đầu tiên
  const activeClass = classes.some((c) => c.id === classId) ? classId : classes[0]?.id ?? '';
  const setClassId = useCallback((id: string) => (setClassIdState(id), write('console_class', id)), []);
  const setStage = useCallback(
    (s: Stage) => {
      setStageState(s);
      write('console_stage', s);
      if (path !== '/') router.push('/');
    },
    [path, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const s = STAGES[Number(e.key) - 1];
      if (s) setStage(s.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setStage]);

  const ctx = useMemo<ConsoleState>(() => ({classes, classId: activeClass, setClassId, stage, setStage, periods, reload}), [classes, activeClass, setClassId, stage, setStage, periods, reload]);

  if (!checked) return <div className="p-8 text-sm text-mute">Đang tải…</div>;

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* phiên hết hạn hoặc mất mạng: vẫn đăng xuất phía trình duyệt */
    }
    clearToken();
    router.replace('/login');
  };

  const liveNow = periods.some((p) => p.status === 'live');
  const upcoming = periods
    .filter((p) => (p.status === 'live' || p.status === 'planned') && (!activeClass || p.class_id === activeClass || !p.class_id))
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live'))
    .slice(0, 4);
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name;
  const onNav = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const field = 'rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm text-ink';

  return (
    <TeacherCtx.Provider value={teacher}>
      <ConsoleCtx.Provider value={ctx}>
        <div className="min-h-screen bg-paper text-ink">
          <header className="sticky top-0 z-20 border-b border-rule bg-paper/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
              <Link href="/" className="flex items-baseline gap-2" aria-label="AXIOMA, trang tổng quan">
                <span className="font-serif text-xl font-semibold tracking-[.18em] text-brand-600">AXIOMA</span>
                <span className="hidden text-[11px] uppercase tracking-wider text-mute lg:inline">Quản lý giáo viên</span>
              </Link>
              <select data-testid="class-picker" aria-label="Lớp đang xem" value={activeClass} onChange={(e) => setClassId(e.target.value)} className={field} disabled={classes.length === 0}>
                {classes.length === 0 && <option value="">Chưa có lớp</option>}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </select>
              <div role="tablist" aria-label="Giai đoạn của tiết dạy" className="mx-auto flex rounded-xl border border-rule bg-sunk p-0.5">
                {STAGES.map((s, i) => (
                  <button
                    key={s.key}
                    role="tab"
                    data-testid={`stage-${s.key}`}
                    aria-selected={stage === s.key}
                    onClick={() => setStage(s.key)}
                    title={`Phím ${i + 1}`}
                    className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm text-mute transition-colors hover:text-ink aria-selected:bg-white aria-selected:font-semibold aria-selected:text-ink aria-selected:shadow-card"
                  >
                    <kbd className="rounded border border-rule bg-white px-1 font-mono text-[10px] text-mute">{i + 1}</kbd>
                    {s.label}
                    {s.key === 'live' && liveNow && <span aria-label="có tiết đang dạy" className="h-1.5 w-1.5 rounded-full bg-mastery-fg shadow-[0_0_6px_#15803D]" />}
                  </button>
                ))}
              </div>
              <span data-testid="teacher-name" className="ml-auto text-sm text-mute">
                {teacher?.display_name}
              </span>
              <button data-testid="logout" onClick={() => void logout()} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-mute hover:bg-sunk" title="Đăng xuất">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="mx-auto flex max-w-[1400px] flex-col md:flex-row">
            <aside className="shrink-0 border-b border-rule p-3 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:w-[220px] md:overflow-y-auto md:border-b-0 md:border-r">
              <nav aria-label="Điều hướng" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
                {NAV.map(({href, label, icon: Icon, group}, i) => (
                  <React.Fragment key={href}>
                    {(i === 0 || NAV[i - 1].group !== group) && <div className="mt-3 hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-mute first:mt-0 md:block">{group}</div>}
                    <Link href={href} aria-current={onNav(href) ? 'page' : undefined} className="relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mute transition-colors hover:bg-sunk hover:text-ink aria-[current=page]:bg-white aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-card aria-[current=page]:before:absolute aria-[current=page]:before:left-0 aria-[current=page]:before:top-2 aria-[current=page]:before:h-[calc(100%-1rem)] aria-[current=page]:before:w-[3px] aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-brand-600">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </React.Fragment>
                ))}
              </nav>
              <div data-testid="upcoming" className="mt-6 hidden border-t border-rule pt-4 md:block">
                <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-mute">Tiết sắp tới</div>
                {upcoming.length === 0 && <p className="px-3 text-xs text-mute">Chưa có tiết nào đã soạn.</p>}
                {upcoming.map((p) => (
                  <Link key={p.id} href={`/periods/${p.id}`} data-testid="upcoming-item" className="block rounded-lg px-3 py-2 hover:bg-sunk">
                    <span className="flex items-center gap-1.5 text-[11px] text-mute">
                      {p.status === 'live' ? <span className="h-1.5 w-1.5 rounded-full bg-mastery-fg shadow-[0_0_6px_#15803D]" /> : <span className="h-1.5 w-1.5 rounded-full bg-hint-fg" />}
                      <span className="font-mono">{className(p.class_id) ?? 'Chưa chọn lớp'}</span>
                      <span>{p.status === 'live' ? 'đang dạy' : 'đã soạn'}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink">{p.title}</span>
                  </Link>
                ))}
              </div>
            </aside>
            <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </ConsoleCtx.Provider>
    </TeacherCtx.Provider>
  );
}

export function ErrorNote({error}: {error: string | null}) {
  return error ? (
    <p data-testid="error-note" role="alert" className="rounded-lg border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">
      {error}
    </p>
  ) : null;
}
