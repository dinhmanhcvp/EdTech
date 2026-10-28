/**
 * Địa chỉ máy chủ AI (FastAPI) và ứng dụng giáo viên, dùng chung cho mọi lời gọi từ trình duyệt (xem bản của teacher-board).
 * Trên web: NEXT_PUBLIC_BACKEND_URL (= địa chỉ Render) → trình duyệt gọi thẳng Render; không bao giờ gọi 127.0.0.1 từ trang công khai.
 */
const isLocalHost = (h: string) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]';

export function apiBase(): string {
  let stored = '';
  try {
    stored = typeof window !== 'undefined' ? window.localStorage.getItem('backend_url') || '' : '';
  } catch {
    /* localStorage bị chặn */
  }
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL || '' : '';
  const chosen = (stored || env).trim().replace(/\/+$/, '');
  if (chosen) return chosen;
  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) return 'http://127.0.0.1:8000';
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000';
  return '';
}

/** Liên kết sang bảng giáo viên (cổng 3001 khi phát triển; trên web đặt NEXT_PUBLIC_TEACHER_URL). */
export function teacherAppUrl(): string {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TEACHER_URL || '' : '';
  if (!env && typeof window !== 'undefined' && !isLocalHost(window.location.hostname)) return '#';
  return (env || 'http://localhost:3001').replace(/\/+$/, '');
}
