import type {PlanBody, ResourceItem} from './hub';
import type {SimEntry} from './types';

export interface Scene {
  key: string;
  kind: 'board' | 'plan' | 'sim' | 'resource';
  title: string;
  detail: string;
  chips: string[];
}

const KIND: Record<string, string> = {slides: 'Slide', exercise: 'Bài tập', exam: 'Đề'};
const short = (t: string) => t.replace(/^Thực hành:\s*/, '');

/**
 * Kịch bản tiết học dạng "playlist" ghép từ những gì giáo viên đã chuẩn bị: bài soạn nạp lên bảng, từng phần của giáo án,
 * mô phỏng định mở chưa nằm trong giáo án, và tài nguyên mở sẵn. Chỉ đọc: muốn đổi thứ tự thì sửa ở Giáo án.
 */
export function buildScenes(p: {lessonTitle?: string | null; plan?: PlanBody | null; resources: ResourceItem[]; sims: string[]; catalog: SimEntry[]}): Scene[] {
  const simTitle = (id: string) => short(p.catalog.find((c) => c.id === id)?.title ?? id);
  const scenes: Scene[] = [];
  if (p.lessonTitle) scenes.push({key: 'board', kind: 'board', title: 'Bảng soạn sẵn', detail: p.lessonTitle, chips: ['nạp lên bảng khi ghép']});

  const inPlan = new Set<string>();
  p.plan?.sections.forEach((s, i) => {
    const chips: string[] = [];
    const count = (type: string) => s.items.filter((it) => it.type === type).length;
    if (count('formula')) chips.push(`${count('formula')} công thức`);
    if (count('problem')) chips.push(`${count('problem')} bài tập`);
    if (count('poll')) chips.push(`${count('poll')} câu hỏi nhanh`);
    for (const it of s.items) {
      if (it.type === 'sim') {
        inPlan.add(it.templateId);
        chips.push(`▶ ${simTitle(it.templateId)}`);
      }
    }
    scenes.push({key: `plan-${s.id}`, kind: 'plan', title: s.title, detail: s.objective || `Phần ${i + 1} của giáo án`, chips});
  });

  for (const id of p.sims) if (!inPlan.has(id)) scenes.push({key: `sim-${id}`, kind: 'sim', title: simTitle(id), detail: 'Mô phỏng mở sẵn trên bảng', chips: []});
  for (const r of p.resources) scenes.push({key: `res-${r.id}`, kind: 'resource', title: r.title, detail: `${KIND[r.kind] ?? r.kind} · ${r.pageCount} trang`, chips: []});
  return scenes;
}
