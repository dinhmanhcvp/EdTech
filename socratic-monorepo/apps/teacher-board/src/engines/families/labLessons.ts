/** Danh mục bài của phòng thực hành /lab (trang `app/lab/page.tsx` và test dùng chung). */
import {ALL_EXPERIMENTS} from './HandsLab';
import {PRESETS} from '../../utils/presets';
import {SUBJECT_OF, type SubjectId} from '../../utils/lab/hands/sims/catalog';

const ENGINE_SUBJECT: Record<string, SubjectId> = {PHYSICS: 'ly', CHEMISTRY: 'hoa', BIOLOGY: 'sinh'};
/** Hai nhóm bài trong mỗi môn; cả hai đều là thí nghiệm 3D điều khiển bằng tay. */
export const KINDS = [
  ['sgk', 'Thực hành theo sách giáo khoa'],
  ['hands', 'Thí nghiệm khám phá'],
] as const;
type Kind = (typeof KINDS)[number][0];
export interface Lesson {
  id: string;
  name: string;
  subject: SubjectId;
  kind: Kind;
}
/**
 * Bài trùng nội dung đã gộp: mã cũ (còn dùng trong liên kết từ bảng, `?bai=`) → bài giữ lại.
 * Phòng tự do trùng bài đầu của môn; hai "ống nghiệm ảo" và chuẩn độ trùng bài trên bàn hóa học 3D; va chạm và lực từ đã có bài tay riêng.
 */
export const LAB_ALIAS: Record<string, string> = {
  CHEM_LAB_BENCH: 'chem',
  CHEM_VIRTUAL_TESTTUBE: 'CHEM_LAB_CATION_NAOH',
  CHEM_HALOGEN_LAB: 'CHEM_LAB_HALIDE_ID',
  CHEM_EQUILIBRIUM_TITRATION: 'titration',
  PHYS_LAB_COLLISION_MOMENTUM: 'collision',
  PHYS_LAB_MAGNETIC_FORCE: 'balance',
  PHYS_LAB_BENCH: 'PHYS_LAB_SAFETY',
  BIO_LAB_BENCH: 'BIO_LAB_BIOMOLECULES',
};
/** Tên trong danh sách bỏ tiền tố lặp ("Thực hành…", "Thí nghiệm…") vì tiêu đề nhóm đã nói; viết hoa chữ đầu. */
const short = (t: string) => {
  const s = t.replace(/^Thực hành: /, '').replace(/^(?:Thực hành thí nghiệm|Thực hành|Thí nghiệm) /, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
/** Mọi bài của phòng thực hành, chia theo môn: bài thực hành SGK (mã preset `*_LAB_*`, nay dựng 3D) và bài tay khám phá. */
export const LESSONS: Lesson[] = [
  ...Object.entries(PRESETS)
    .filter(([id]) => /^(CHEM|PHYS|BIO)_LAB_/.test(id) && !(id in LAB_ALIAS))
    .map(([id, s]): Lesson => ({id, name: short(s.title), subject: ENGINE_SUBJECT[s.engine], kind: 'sgk'})),
  ...ALL_EXPERIMENTS.map(([id, name]): Lesson => ({id, name, subject: SUBJECT_OF[id], kind: 'hands'})),
];
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
