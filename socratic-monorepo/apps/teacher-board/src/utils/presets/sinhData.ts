/** Mã di truyền chuẩn: thứ tự U C A G ở cả ba vị trí. */
const AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
const BASES = 'UCAG';
export const AA_NAME: Record<string, string> = {F: 'Phe', L: 'Leu', S: 'Ser', Y: 'Tyr', '*': 'Stop', C: 'Cys', W: 'Trp', P: 'Pro', H: 'His', Q: 'Gln', R: 'Arg', I: 'Ile', M: 'Met', T: 'Thr', N: 'Asn', K: 'Lys', V: 'Val', A: 'Ala', D: 'Asp', E: 'Glu', G: 'Gly'};
export const AA_FULL: Record<string, string> = {F: 'phenylalanine', L: 'leucine', S: 'serine', Y: 'tyrosine', '*': 'mã kết thúc', C: 'cysteine', W: 'tryptophan', P: 'proline', H: 'histidine', Q: 'glutamine', R: 'arginine', I: 'isoleucine', M: 'methionine (mã mở đầu)', T: 'threonine', N: 'asparagine', K: 'lysine', V: 'valine', A: 'alanine', D: 'aspartic acid', E: 'glutamic acid', G: 'glycine'};
export type AaClass = 'nonpolar' | 'polar' | 'acidic' | 'basic' | 'stop';
export const AA_CLASS: Record<string, AaClass> = {G: 'nonpolar', A: 'nonpolar', V: 'nonpolar', L: 'nonpolar', I: 'nonpolar', M: 'nonpolar', F: 'nonpolar', W: 'nonpolar', P: 'nonpolar', S: 'polar', T: 'polar', C: 'polar', Y: 'polar', N: 'polar', Q: 'polar', D: 'acidic', E: 'acidic', K: 'basic', R: 'basic', H: 'basic', '*': 'stop'};

/** Mọi codon (64) theo thứ tự bảng chuẩn, kèm amino acid một chữ cái. */
export const CODONS: {codon: string; aa: string}[] = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) CODONS.push({codon: BASES[i] + BASES[j] + BASES[k], aa: AA[16 * i + 4 * j + k]});
export const CODON_AA: Record<string, string> = Object.fromEntries(CODONS.map((c) => [c.codon, c.aa]));

const COMP: Record<string, string> = {A: 'U', T: 'A', G: 'C', C: 'G'};
/** Phiên mã từ mạch gốc 3′→5′: mRNA 5′→3′ theo nguyên tắc bổ sung. */
export const transcribe = (template: string) => template.toUpperCase().split('').map((b) => COMP[b] ?? '?').join('');
/** Dịch mã: từ codon AUG đầu tiên tới mã kết thúc (hoặc hết mRNA). */
export function translate(mrna: string): string[] {
  const start = mrna.indexOf('AUG');
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const aa = CODON_AA[mrna.slice(i, i + 3)];
    if (!aa) break;
    out.push(aa);
    if (aa === '*') break;
  }
  return out;
}
export type MutationKind = 'none' | 'sub' | 'ins' | 'del';
/** Đột biến điểm trên mạch gốc: thay, thêm (sau vị trí pos, 1-based) hoặc mất một cặp nucleotide. */
export function mutate(template: string, kind: MutationKind, pos: number, base: string): string {
  const t = template.toUpperCase();
  const i = Math.max(0, Math.min(t.length - 1, pos - 1));
  if (kind === 'sub') return t.slice(0, i) + base + t.slice(i + 1);
  if (kind === 'ins') return t.slice(0, i + 1) + base + t.slice(i + 1);
  if (kind === 'del') return t.slice(0, i) + t.slice(i + 1);
  return t;
}
export function classifyMutation(orig: string[], mut: string[], kind: MutationKind): string {
  if (kind === 'none') return 'chưa có đột biến';
  const same = orig.length === mut.length && orig.every((a, i) => a === mut[i]);
  if (same) return 'đột biến im lặng hoặc nằm ngoài vùng mã hóa: chuỗi polypeptide không đổi';
  if (kind !== 'sub') return 'đột biến dịch khung: từ vị trí đột biến trở đi các bộ ba bị đọc lệch, chuỗi polypeptide thay đổi nhiều';
  if (mut.length < orig.length && mut[mut.length - 1] === '*') return 'đột biến vô nghĩa: xuất hiện mã kết thúc sớm, chuỗi bị cắt ngắn';
  return 'đột biến nhầm nghĩa: một amino acid bị thay bằng amino acid khác';
}
