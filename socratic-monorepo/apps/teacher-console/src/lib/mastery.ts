/** Ba mức nắm vững hiển thị trên ma trận lớp. Ngưỡng theo xác suất đã nắm vững (BKT) mà hub tính từ các lần làm bài. */
export type Level = 'stuck' | 'hint' | 'mastery';

export const STUCK_BELOW = 0.4;
export const MASTERY_FROM = 0.7;

export const levelOf = (p: number): Level => (p < STUCK_BELOW ? 'stuck' : p < MASTERY_FROM ? 'hint' : 'mastery');

export const LEVEL: Record<Level, {label: string; pill: string; dot: string}> = {
  stuck: {label: 'Mắc kẹt', pill: 'border-stuck-bd bg-stuck-bg text-stuck-fg', dot: 'bg-stuck-fg'},
  hint: {label: 'Cần gợi mở', pill: 'border-hint-bd bg-hint-bg text-hint-fg', dot: 'bg-hint-fg'},
  mastery: {label: 'Đạt chuẩn', pill: 'border-mastery-bd bg-mastery-bg text-mastery-fg', dot: 'bg-mastery-fg'},
};
