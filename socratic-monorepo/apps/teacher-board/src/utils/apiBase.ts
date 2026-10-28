/**
 * Địa chỉ máy chủ AI (FastAPI) và địa chỉ ứng dụng anh em, dùng chung cho mọi lời gọi từ trình duyệt.
 *
 * Thứ tự ưu tiên của máy chủ AI:
 *  1. `backend_url` do người dùng nhập trong hộp thoại Kết nối AI (localStorage);
 *  2. `NEXT_PUBLIC_BACKEND_URL` đặt lúc build (trên Vercel = địa chỉ Render) → trình duyệt gọi THẲNG Render, bỏ một chặng proxy;
 *  3. chạy trên localhost → `http://127.0.0.1:8000` (môi trường phát triển);
 *  4. còn lại → '' (cùng tên miền, đi qua rewrite của Next). Không bao giờ gọi 127.0.0.1 từ một trang công khai
 *     (Chrome sẽ hỏi quyền "truy cập thiết bị trong mạng nội bộ" và lời gọi cũng không tới đâu).
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
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000'; // render phía máy chủ/test
  return '';
}

/** Liên kết sang ứng dụng học sinh (cổng 3002 khi phát triển; trên web đặt NEXT_PUBLIC_STUDENT_URL). */
export function studentAppUrl(query = ''): string {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STUDENT_URL || '' : '';
  const base = (env || 'http://localhost:3002').replace(/\/+$/, '');
  if (!env && typeof window !== 'undefined' && !isLocalHost(window.location.hostname)) return '#';
  return query ? `${base}${query.startsWith('?') ? '' : '/'}${query}` : base;
}
