'use client';

import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Search} from 'lucide-react';

/** Một cuốn trên kệ: tài nguyên, bài soạn… Màu lấy từ `hue`, gáy và bìa tự vẽ nên không cần ảnh. */
export interface Book {
  id: string;
  title: string;
  /** nhãn nhỏ trên bìa, ví dụ "Slide · Toán" */
  tag: string;
  /** dòng chú thích dưới kệ, ví dụ "12 trang" */
  meta: string;
  /** 0–360 */
  hue: number;
  /** nhóm để lọc bằng tab */
  group: string;
  /** chuỗi để tìm kiếm (chữ thường) */
  search: string;
  /** dấu nhắc nhỏ, ví dụ "Chưa duyệt câu" */
  note?: string;
}

export interface ShelfTab {
  key: string;
  label: string;
  testId?: string;
}

interface Props {
  /** null = đang tải */
  books: Book[] | null;
  testId: string;
  tabs?: ShelfTab[];
  searchTestId?: string;
  searchPlaceholder?: string;
  emptyAll: string;
  emptyMatch?: string;
  /** id các cuốn đã chọn dùng cho tiết (hiện dấu ✓ trên gáy) */
  marked?: string[];
  /** cuốn nên được chọn sẵn (ví dụ cuốn vừa tải lên) */
  focusId?: string | null;
  /** tải ảnh trang đầu làm bìa; trả null nếu không có */
  loadCover?: (id: string) => Promise<string | null>;
  /** nút thao tác cho cuốn đang mở bìa */
  actions?: (book: Book) => React.ReactNode;
}

// kích thước (px): gáy, bìa mở, chiều cao tối đa, khoảng cách giữa bìa mở và các gáy bên cạnh
const SPINE = 46;
const COVER = 196;
const HEIGHT = 268;
const GAP = 10;
const PITCH = SPINE + 4;
const REACH = 14; // chỉ dựng các cuốn cách cuốn đang chọn tối đa ngần này vị trí

/** Màu bìa theo môn; nhận diện môn từ chữ tự do (tên thư mục của bài soạn). */
export const SUBJECT_HUE: Record<string, number> = {MATH: 218, PHYSICS: 24, CHEMISTRY: 150, BIOLOGY: 96, OTHER: 275};
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
export function subjectFromText(text: string): keyof typeof SUBJECT_HUE {
  const t = fold(text);
  // khớp theo từ nguyên vẹn: "li" không được khớp trong "lien", "hoa" không khớp trong "hoat"
  if (/\b(toan|hinh hoc|dai so|giai tich)\b/.test(t)) return 'MATH';
  if (/\b(vat li|vat ly|li|ly|physics)\b/.test(t)) return 'PHYSICS';
  if (/\b(hoa|hoa hoc|chemistry)\b/.test(t)) return 'CHEMISTRY';
  if (/\b(sinh|sinh hoc|biology)\b/.test(t)) return 'BIOLOGY';
  return 'OTHER';
}
export const SUBJECT_LABEL: Record<string, string> = {MATH: 'Toán', PHYSICS: 'Vật lí', CHEMISTRY: 'Hóa học', BIOLOGY: 'Sinh học', OTHER: 'Khác'};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const shade = (hue: number, l: number, s = 40) => `hsl(${hue} ${s}% ${l}%)`;

/** Vị trí ngang của cuốn lệch `o` ô so với cuốn đang chọn: cuốn chọn chiếm bề ngang của bìa, các cuốn khác chỉ chiếm bề ngang gáy. */
export const bookX = (o: number): number => (o === 0 ? 0 : Math.sign(o) * (COVER / 2 + GAP + (Math.abs(o) - 0.5) * PITCH));

/**
 * Kệ sách 3D: gáy xếp hàng, chọn một cuốn thì cuốn đó xoay lộ bìa. Có tab lọc, tìm kiếm, mũi tên, phím ←/→, vuốt/cuộn.
 * Cuốn đang mở bìa là cuốn "được chọn"; thao tác (mở, xóa, dùng cho tiết) hiển thị bên dưới qua `actions`.
 */
export function BookShelf({books, testId, tabs, searchTestId, searchPlaceholder = 'Tìm…', emptyAll, emptyMatch, marked = [], focusId, loadCover, actions}: Props) {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({left: 0, width: 0});
  const swipe = useRef<number | null>(null);
  const wheelAt = useRef(0);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (books ?? []).filter((b) => (tab === 'all' || b.group === tab) && (!needle || b.search.includes(needle)));
  }, [books, tab, query]);

  const found = shown.findIndex((b) => b.id === selId);
  const idx = found >= 0 ? found : 0;
  const cur = shown[idx] ?? null;

  // giữ cuốn đang mở làm mốc khi danh sách lọc đổi; cuốn được yêu cầu (vừa tải lên) chạy SAU nên luôn thắng
  useEffect(() => {
    if (cur && cur.id !== selId) setSelId(cur.id);
  }, [cur, selId]);
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (focusId && focusId !== focused.current && books?.some((b) => b.id === focusId)) {
      focused.current = focusId; // mỗi giá trị chỉ áp dụng một lần: tải lại danh sách không kéo người dùng về cuốn đó
      setSelId(focusId);
    }
  }, [focusId, books]);

  useEffect(() => {
    if (!cur || !loadCover || cur.id in covers) return;
    let alive = true;
    loadCover(cur.id)
      .then((u) => alive && setCovers((c) => ({...c, [cur.id]: u})))
      .catch(() => alive && setCovers((c) => ({...c, [cur.id]: null})));
    return () => {
      alive = false;
    };
  }, [cur, loadCover, covers]);

  // đo lại khi đổi tab và mỗi khi tab đổi kích thước (font tải xong, cửa sổ co giãn)
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (!el) return;
    const measure = () => setInd((p) => (p.left === el.offsetLeft && p.width === el.offsetWidth ? p : {left: el.offsetLeft, width: el.offsetWidth}));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, tabs]);

  const go = (d: number) => shown.length && setSelId(shown[Math.min(shown.length - 1, Math.max(0, idx + d))].id);
  const allTabs: ShelfTab[] = [{key: 'all', label: 'Tất cả', testId: `${testId}-tab-all`}, ...(tabs ?? [])];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {tabs && (
          <nav aria-label="Lọc theo nhóm" className="relative flex">
            <span aria-hidden className="absolute top-0 h-full bg-blue-700 transition-all duration-500 motion-reduce:transition-none" style={{left: ind.left, width: ind.width}} />
            {allTabs.map((t, i) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el;
                }}
                data-testid={t.testId}
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`relative z-10 -ml-px border border-stone-400/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-500 motion-reduce:transition-none ${i === 0 ? 'ml-0' : ''} ${tab === t.key ? 'text-white' : 'text-stone-600 hover:text-stone-900'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <label className="relative ml-auto">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input data-testid={searchTestId} aria-label="Tìm trên kệ" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="w-56 rounded-full border border-stone-300 bg-white/80 py-1.5 pl-8 pr-3 text-sm" />
        </label>
      </div>

      <section
        data-testid={testId}
        role="listbox"
        aria-label="Kệ sách"
        aria-activedescendant={cur ? `${testId}-${cur.id}` : undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') (e.preventDefault(), go(1));
          if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1));
        }}
        onPointerDown={(e) => {
          swipe.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipe.current !== null && Math.abs(e.clientX - swipe.current) > 50) go(e.clientX < swipe.current ? 1 : -1);
          swipe.current = null;
        }}
        onWheel={(e) => {
          const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0; // cuộn ngang mới chuyển sách; cuộn dọc vẫn cuộn trang
          if (d && Date.now() - wheelAt.current > 250) (wheelAt.current = Date.now(), go(d > 0 ? 1 : -1));
        }}
        className="relative overflow-hidden rounded-2xl border border-[#DDD9CF] bg-[#EDEBE6] outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{height: HEIGHT + 64, perspective: 1500, touchAction: 'pan-y'}}
      >
        {books === null && <p className="absolute inset-0 grid place-items-center text-sm text-stone-500">Đang tải…</p>}
        {books !== null && shown.length === 0 && (
          <p data-testid={`${testId}-empty`} className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-stone-500">
            {books.length === 0 ? emptyAll : emptyMatch ?? 'Không có cuốn nào khớp.'}
          </p>
        )}
        {shown.length > 0 && (
          <>
            <div aria-hidden className="absolute left-0 right-0 border-t border-[#CFC9BB]" style={{top: HEIGHT / 2 + 58 + HEIGHT / 2 - 8}} />
            <div className="absolute left-1/2 top-1/2 h-0 w-0" style={{transformStyle: 'preserve-3d', transform: 'translateY(-14px)'}}>
              {shown.map((b, i) => {
                const o = i - idx;
                if (Math.abs(o) > REACH) return null;
                const open = o === 0;
                const h = HEIGHT - (hash(b.id) % 5) * 9;
                const l = 30 + (hash(b.title) % 3) * 4;
                const picked = marked.includes(b.id);
                const cover = covers[b.id];
                return (
                  <div
                    key={b.id}
                    id={`${testId}-${b.id}`}
                    role="option"
                    aria-selected={open}
                    aria-label={`${b.title}${picked ? ' (đã chọn cho tiết)' : ''}`}
                    data-testid={`${testId}-item`}
                    data-id={b.id}
                    onClick={() => setSelId(b.id)}
                    className="absolute left-0 top-0 h-0 w-0 cursor-pointer transition-transform duration-[650ms] ease-out motion-reduce:transition-none"
                    style={{transformStyle: 'preserve-3d', transform: `translateX(${bookX(o)}px) translateZ(${open ? 40 : -Math.min(Math.abs(o), 8) * 12}px) rotateY(${open ? -90 : 0}deg)`}}
                  >
                    {/* gáy */}
                    <div className="absolute flex flex-col items-center justify-between overflow-hidden rounded-[3px] py-2 text-[#F7F1E3]" style={{width: SPINE, height: h, left: -SPINE / 2, top: -HEIGHT / 2 + (HEIGHT - h), transform: `translateZ(${COVER / 2}px)`, backfaceVisibility: 'hidden', background: shade(b.hue, l), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)'}}>
                      <span className="text-[8px] font-semibold tracking-widest">{picked ? '✓' : '●'}</span>
                      <span className="min-h-0 flex-1 overflow-hidden px-1 py-1 text-center font-serif text-[13px] uppercase leading-tight tracking-wide" style={{writingMode: 'vertical-rl'}}>
                        {b.title}
                      </span>
                      <span className="text-[7px] font-semibold tracking-wider opacity-80">{b.tag.split(' · ')[0]}</span>
                    </div>
                    {/* bìa */}
                    <div
                      className="absolute flex flex-col justify-between overflow-hidden rounded-[6px] p-4 text-[#F7F1E3]"
                      style={{width: COVER, height: h, left: -COVER / 2, top: -HEIGHT / 2 + (HEIGHT - h), transform: `rotateY(90deg) translateZ(${SPINE / 2}px)`, backfaceVisibility: 'hidden', background: cover ? `linear-gradient(to top, ${shade(b.hue, 14)} 8%, transparent 55%), center / cover url(${cover})` : `radial-gradient(circle at 50% 86%, ${shade(b.hue, 40, 40)} 0 16%, transparent 17%), ${shade(b.hue, 30)}`, boxShadow: open ? '0 40px 60px -28px rgba(20,16,10,.65)' : undefined, outline: picked ? '3px solid #F5C451' : undefined, outlineOffset: -3}}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-[.2em] opacity-90">{b.tag}</span>
                      <strong className="font-serif text-[22px] font-normal leading-tight drop-shadow">{b.title}</strong>
                      <span className="flex items-end justify-between text-[10px] opacity-90">
                        <span>{b.meta}</span>
                        {picked && <span className="rounded border border-current px-1 py-0.5 text-[8px] font-bold tracking-widest">ĐÃ CHỌN</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button aria-label="Cuốn trước" data-testid={`${testId}-prev`} disabled={idx === 0} onClick={() => go(-1)} className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-stone-600 hover:bg-white/70 disabled:opacity-25">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button aria-label="Cuốn sau" data-testid={`${testId}-next`} disabled={idx === shown.length - 1} onClick={() => go(1)} className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-stone-600 hover:bg-white/70 disabled:opacity-25">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </section>

      {cur && (
        <div data-testid={`${testId}-caption`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E6E4DD] bg-white px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-lg text-stone-900">{cur.title}</div>
            <div className="text-xs text-stone-500">
              {cur.tag} · {cur.meta} · {idx + 1}/{shown.length}
              {cur.note && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">{cur.note}</span>}
            </div>
          </div>
          {actions?.(cur)}
        </div>
      )}
    </div>
  );
}
