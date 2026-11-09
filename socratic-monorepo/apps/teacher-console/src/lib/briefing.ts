import type {ClassMetrics} from './hub';
import {MASTERY_FROM} from './mastery';

export interface Briefing {
  /** các câu hiển thị trên thẻ, theo thứ tự quan trọng */
  sentences: string[];
  active: number;
  total: number;
  needs: string[];
  weak: {id: string; label: string; avg: number; below: number} | null;
  /** câu gợi ý đầu giờ; null khi chưa đủ số liệu để khuyên điều gì */
  advice: string | null;
}

const DAY = 24 * 3600;

/**
 * Tóm tắt sáng từ chỉ số thật của hub (không gọi AI, không bịa): ai học trong 24 giờ qua, ai cần hỗ trợ, kiến thức yếu nhất của lớp.
 * `nowSec` tính bằng giây (cùng đơn vị với `lastActive`).
 */
export function buildBriefing(className: string, m: ClassMetrics, nowSec: number): Briefing {
  const total = m.students.length;
  if (total === 0) return {sentences: [`Lớp ${className} chưa có học sinh. Thêm danh sách ở mục Lớp để bắt đầu theo dõi.`], active: 0, total: 0, needs: [], weak: null, advice: null};

  const label = (id: string) => m.kcs.find((k) => k.id === id)?.label ?? id;
  const everDone = m.students.some((s) => s.lastActive !== null);
  const active = m.students.filter((s) => s.lastActive !== null && nowSec - s.lastActive <= DAY).length;
  const needsList = m.students.filter((s) => s.needsSupport);
  const needs = needsList.map((s) => s.name);

  // kiến thức yếu nhất: trung bình nắm vững thấp nhất, cần số liệu của ít nhất 2 em để không kết luận từ một em
  const kcIds = [...new Set(m.students.flatMap((s) => Object.keys(s.mastery)))];
  const stats = kcIds
    .map((id) => {
      const ps = m.students.map((s) => s.mastery[id]).filter((p): p is number => p !== undefined);
      return {id, label: label(id), n: ps.length, avg: ps.reduce((a, b) => a + b, 0) / (ps.length || 1), below: ps.filter((p) => p < MASTERY_FROM).length};
    })
    .filter((k) => k.n >= 2 && k.avg < MASTERY_FROM)
    .sort((a, b) => a.avg - b.avg);
  const weak = stats[0] ? {id: stats[0].id, label: stats[0].label, avg: stats[0].avg, below: stats[0].below} : null;

  const sentences: string[] = [];
  if (!everDone) sentences.push(`Lớp ${className} chưa có số liệu học sau giờ. Giao một bài tập trong tiết để bắt đầu có chỉ số.`);
  else if (active === 0) sentences.push(`Trong 24 giờ qua chưa em nào của lớp ${className} học sau giờ.`);
  else sentences.push(`Trong 24 giờ qua có ${active}/${total} học sinh lớp ${className} học sau giờ.`);
  if (needs.length) {
    const shown = needs.slice(0, 3).join(', ');
    sentences.push(`${needs.length} em cần hỗ trợ: ${shown}${needs.length > 3 ? ` và ${needs.length - 3} em khác` : ''}.`);
  }
  if (weak) sentences.push(`Kiến thức yếu nhất của lớp: ${weak.label}, nắm vững trung bình ${Math.round(weak.avg * 100)}% (${weak.below} em chưa đạt chuẩn).`);

  const advice = weak ? `Đầu giờ ôn nhanh “${weak.label}”: ${weak.below} em chưa đạt chuẩn.${needs.length ? ` Chú ý ${needs.slice(0, 3).join(', ')}.` : ''}` : needs.length ? `Chú ý ${needs.slice(0, 3).join(', ')} khi làm bài đầu giờ.` : null;
  return {sentences, active, total, needs, weak, advice};
}

export const BRIEFING_TAG = '[Gợi ý từ số liệu học sau giờ]';

/** Thêm gợi ý vào ghi chú của tiết; chạy lại không nhân đôi (thay đoạn cũ có cùng nhãn). */
export function withAdvice(notes: string, advice: string): string {
  const lines = notes.split('\n').filter((l) => !l.startsWith(BRIEFING_TAG));
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return [...lines, `${BRIEFING_TAG} ${advice}`].join('\n');
}
