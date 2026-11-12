/**
 * Phân nhóm bài theo môn, mỗi môn một màu theo bảng màu trầm của hệ thống (Lí #2459C9, Hóa #0E7C66, Sinh #C2184A, tia/lực & kĩ thuật #D9481C).
 * Học từ bộ lọc phân tầng của thư viện think: 30 bài không còn là một danh sách phẳng.
 */
export const SUBJECTS = [
  {id: 'ly', label: 'Vật lí', color: '#2459C9'},
  {id: 'hoa', label: 'Hóa học', color: '#0E7C66'},
  {id: 'sinh', label: 'Sinh học', color: '#C2184A'},
  {id: 'kt', label: 'Kĩ thuật – Công nghệ', color: '#D9481C'},
] as const;
export type SubjectId = (typeof SUBJECTS)[number]['id'];

const BY: Record<SubjectId, string[]> = {
  ly: ['balance', 'collision', 'thomson', 'eddy', 'photo', 'rutherford', 'matterwave', 'ligo', 'bec', 'optics', 'shock'],
  hoa: ['chem', 'chlorine', 'alkali', 'no2', 'titration', 'bz'],
  sinh: ['gel', 'morgan', 'tweezers'],
  kt: ['three-phase', 'motor', 'engine', 'robot', 'drone', 'pc', 'cartpole', 'pid', 'differential', 'turbine', 'foc', 'stirling', 'harmonic', 'fatigue', 'quadruped', 'surgery', 'slam'],
};
export const SUBJECT_OF: Record<string, SubjectId> = Object.fromEntries((Object.keys(BY) as SubjectId[]).flatMap((s) => BY[s].map((id) => [id, s] as const)));
