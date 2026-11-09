import {api} from './api';

const key = (periodId: string) => `console_pair_${periodId}`;

/** Mã ghép bảng chỉ lộ ra lúc bắt đầu tiết (máy chủ không cho đọc lại), nên giữ trong phiên trình duyệt để các màn hình cùng hiện được. */
export function readPair(periodId: string): string | null {
  try {
    return window.sessionStorage.getItem(key(periodId));
  } catch {
    return null;
  }
}

/** Bắt đầu tiết (hoặc lấy mã ghép mới nếu tiết đang dạy) và nhớ mã. */
export async function startAndRemember(periodId: string): Promise<string> {
  const r = await api.startPeriod(periodId);
  try {
    window.sessionStorage.setItem(key(periodId), r.pairCode);
  } catch {
    /* trình duyệt chặn lưu trữ: mã vẫn trả về cho lần hiển thị này */
  }
  return r.pairCode;
}
