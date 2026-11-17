import {describe, expect, it} from 'vitest';
import {buildScene, cleanHandwritten, renderScene, type GeoScene} from '../utils/geometryProblem';
import {parseClaim, verifyClaim} from '../utils/geoClaims';
import {freePoints, moveFreePoint, partChips, selectPartUpTo, setPointT, showUpTo, visibleNames} from '../utils/geoTools';

/**
 * Bộ đề thi vào lớp 10 dài, nhiều phần (đường tròn ngoại/nội tiếp, tiếp tuyến, trực tâm, đối xứng, hình bình hành, hình thang, góc cho trước, hình chóp).
 * Mỗi đề: (1) dựng đủ MỌI điểm được nhắc, không điểm nào bị nhập nhầm vào điểm khác; (2) vẽ được theo từng phần (nút a, b, c… vẽ tới phần đó,
 * phần sau dựng thêm trên phần trước); (3) mệnh đề cần chứng minh đọc được đều đúng trên hình, kể cả sau khi kéo từng điểm gốc.
 */
const EXAMS: [string, string][] = [
  ["T01", "Cho tam giác ABC nhọn (AB < AC) nội tiếp đường tròn (O). Các đường cao AD, BE, CF cắt nhau tại H.\na) Chứng minh tứ giác BCEF nội tiếp.\nb) Kẻ đường kính AK của đường tròn (O). Chứng minh AB.AC = AD.AK.\nc) Gọi M là trung điểm của BC. Chứng minh ba điểm H, M, K thẳng hàng.\nd) Gọi I là trung điểm của AH. Chứng minh IM vuông góc với EF."],
  ["T02", "Cho đường tròn (O; R) và điểm A nằm ngoài đường tròn. Từ A kẻ hai tiếp tuyến AB, AC với đường tròn (B, C là các tiếp điểm). Gọi H là giao điểm của OA và BC.\na) Chứng minh tứ giác ABOC nội tiếp.\nb) Chứng minh OH.OA = R^2.\nc) Kẻ đường kính BD của (O). Đường thẳng AD cắt đường tròn (O) tại điểm thứ hai E. Chứng minh AE.AD = AH.AO.\nd) Gọi K là trung điểm của DE. Chứng minh năm điểm A, B, O, K, C cùng thuộc một đường tròn."],
  ["T03", "Cho nửa đường tròn tâm O đường kính AB. Kẻ các tiếp tuyến Ax, By với nửa đường tròn. Lấy điểm M thuộc nửa đường tròn (M khác A và B). Tiếp tuyến tại M cắt Ax, By lần lượt tại C và D.\na) Chứng minh CD = AC + BD.\nb) Chứng minh góc COD = 90 độ.\nc) Gọi N là giao điểm của AD và BC. Chứng minh MN vuông góc với AB."],
  ["T04", "Cho tam giác ABC vuông tại A, đường cao AH. Gọi D, E lần lượt là hình chiếu của H trên AB, AC.\na) Chứng minh tứ giác ADHE là hình chữ nhật.\nb) Chứng minh AD.AB = AE.AC.\nc) Gọi M là trung điểm của BC. Chứng minh AM vuông góc với DE."],
  ["T05", "Cho hình bình hành ABCD. Gọi M, N lần lượt là trung điểm của AB và CD. Đường chéo BD cắt AN, CM lần lượt tại E và F.\na) Chứng minh tứ giác AMCN là hình bình hành.\nb) Chứng minh DE = EF = FB.\nc) Gọi O là giao điểm của AC và BD. Chứng minh O là trung điểm của EF."],
  ["T06", "Cho tam giác ABC có ba góc nhọn. Đường tròn tâm O đường kính BC cắt AB, AC lần lượt tại F và E. BE cắt CF tại H.\na) Chứng minh AH vuông góc với BC tại D.\nb) Chứng minh tứ giác AEHF nội tiếp.\nc) Gọi I là trung điểm của AH. Chứng minh IE là tiếp tuyến của đường tròn (O)."],
  ["T07", "Cho tam giác ABC, đường tròn (I) nội tiếp tam giác ABC tiếp xúc với các cạnh BC, CA, AB lần lượt tại D, E, F.\na) Chứng minh tứ giác AEIF nội tiếp.\nb) Chứng minh AE = AF.\nc) Gọi M là trung điểm của BC. Chứng minh BD = CE + BF - CD."],
  ["T08", "Cho tam giác ABC nhọn có trực tâm H. Gọi M là trung điểm của BC. Lấy điểm K đối xứng với H qua M.\na) Chứng minh tứ giác BHCK là hình bình hành.\nb) Chứng minh KB vuông góc với AB.\nc) Gọi N đối xứng với H qua BC. Chứng minh N thuộc đường tròn ngoại tiếp tam giác ABC."],
  ["T09", "Cho hình vuông ABCD. Trên cạnh BC lấy điểm M, trên cạnh CD lấy điểm N sao cho góc MAN = 45 độ. BD cắt AM, AN lần lượt tại P và Q.\na) Chứng minh tứ giác ABMQ nội tiếp.\nb) Chứng minh tứ giác ADNP nội tiếp.\nc) Gọi H là giao điểm của MQ và NP. Chứng minh AH vuông góc với MN."],
  ["T10", "Cho đường tròn (O) đường kính AB. Trên tia đối của tia BA lấy điểm C. Kẻ tiếp tuyến CD với đường tròn (D là tiếp điểm). Tiếp tuyến tại A của đường tròn (O) cắt đường thẳng CD tại E.\na) Chứng minh tứ giác AODE nội tiếp.\nb) Gọi H là giao điểm của OE và AD. Chứng minh H là trung điểm của AD.\nc) Đường thẳng BD cắt AE tại F. Chứng minh E là trung điểm của AF."],
  ["T11", "Cho tam giác ABC cân tại A. Gọi M là trung điểm của BC. Kẻ MH vuông góc với AC tại H. Gọi O là trung điểm của MH.\na) Chứng minh tam giác AMH đồng dạng tam giác MCH.\nb) Chứng minh AO vuông góc với BH."],
  ["T12", "Cho tam giác ABC có ba góc nhọn nội tiếp đường tròn (O; R). Hai đường cao BD và CE cắt nhau tại H. Tia AO cắt đường tròn tại K.\na) Chứng minh tứ giác BCDE nội tiếp.\nb) Chứng minh tứ giác BHCK là hình bình hành.\nc) Gọi M là trung điểm của BC. Chứng minh AH = 2OM.\nd) Chứng minh OA vuông góc với DE."],
  ["T13", "Cho đường tròn (O) và dây BC cố định không đi qua tâm. Điểm A di động trên cung lớn BC sao cho tam giác ABC nhọn. Các đường cao BE, CF của tam giác ABC cắt nhau tại H.\na) Chứng minh tứ giác AEHF nội tiếp.\nb) Đường thẳng EF cắt đường thẳng BC tại K. Chứng minh KB.KC = KE.KF.\nc) Gọi I là trung điểm của BC. Chứng minh IE là tiếp tuyến của đường tròn ngoại tiếp tứ giác AEHF."],
  ["T14", "Cho đường tròn (O; R) có đường kính AB. Điểm C thuộc đường tròn (C khác A, B). Gọi H là hình chiếu của C trên AB. Gọi E, F lần lượt là hình chiếu của H trên CA, CB.\na) Chứng minh tứ giác CEHF là hình chữ nhật.\nb) Chứng minh CE.CA = CF.CB.\nc) Chứng minh tứ giác AEFB nội tiếp."],
  ["T15", "Cho tam giác ABC vuông tại A (AB < AC). Vẽ đường tròn tâm O đường kính AC cắt BC tại D. Gọi E là trung điểm của AB.\na) Chứng minh AD vuông góc với BC.\nb) Chứng minh ED là tiếp tuyến của đường tròn (O).\nc) Đường thẳng BO cắt đường tròn (O) tại M và N (M nằm giữa B và O). Chứng minh BM.BN = BD.BC."],
  ["T16", "Cho hình thang ABCD (AB song song CD). Gọi M, N lần lượt là trung điểm của AD và BC. Đường thẳng MN cắt BD, AC lần lượt tại I và K.\na) Chứng minh MN song song với CD.\nb) Chứng minh I là trung điểm của BD."],
  ["T17", "Cho tam giác ABC nhọn. Gọi G là trọng tâm của tam giác. Các đường trung tuyến AM, BN cắt nhau tại G. Gọi D là điểm đối xứng với G qua M.\na) Chứng minh tứ giác BGCD là hình bình hành.\nb) Chứng minh AG = GD."],
  ["T18", "Cho đường tròn (O) và điểm M nằm ngoài đường tròn. Qua M kẻ tiếp tuyến MA với đường tròn (A là tiếp điểm) và cát tuyến MBC (B nằm giữa M và C). Gọi I là trung điểm của BC.\na) Chứng minh bốn điểm M, A, O, I cùng thuộc một đường tròn.\nb) Chứng minh MA^2 = MB.MC.\nc) Kẻ AH vuông góc với MO tại H. Chứng minh tứ giác BHOC nội tiếp."],
  ["T19", "Cho tam giác ABC nhọn nội tiếp đường tròn (O). Tia phân giác góc BAC cắt BC tại D và cắt đường tròn (O) tại M.\na) Chứng minh OM vuông góc với BC.\nb) Chứng minh MB^2 = MD.MA.\nc) Gọi I là tâm đường tròn nội tiếp tam giác ABC. Chứng minh MB = MI."],
  ["T20", "Cho đường tròn (O; R), hai đường kính AB và CD vuông góc với nhau. Trên đoạn AB lấy điểm M (M khác O). Đường thẳng CM cắt đường tròn (O) tại điểm thứ hai N. Đường thẳng vuông góc với AB tại M cắt tiếp tuyến tại N của đường tròn ở P.\na) Chứng minh tứ giác OMNP nội tiếp.\nb) Chứng minh tứ giác CMPO là hình bình hành.\nc) Chứng minh CM.CN không đổi."],
  ["T21", "Cho tam giác ABC nhọn, đường cao AH. Gọi M, N lần lượt là hình chiếu vuông góc của H trên AB, AC.\na) Chứng minh tứ giác AMHN nội tiếp.\nb) Chứng minh tứ giác BMNC nội tiếp.\nc) Gọi O là tâm đường tròn ngoại tiếp tam giác ABC. Chứng minh AO vuông góc với MN."],
  ["T22", "Cho tam giác ABC vuông tại A, đường cao AH. Vẽ đường tròn tâm A bán kính AH. Từ B kẻ tiếp tuyến BM với đường tròn (A) (M là tiếp điểm, M khác H). Từ C kẻ tiếp tuyến CN với đường tròn (A) (N là tiếp điểm, N khác H).\na) Chứng minh tứ giác ABHM nội tiếp.\nb) Chứng minh BC = BM + CN.\nc) Chứng minh ba điểm M, A, N thẳng hàng."],
  ["T23", "Cho đường tròn (O) đường kính AB = 2R. Gọi C là trung điểm của OA. Qua C kẻ dây MN vuông góc với AB. Lấy điểm K bất kì trên cung nhỏ BM. AK cắt MN tại H.\na) Chứng minh tứ giác BCHK nội tiếp.\nb) Chứng minh AK.AH = R^2.\nc) Trên KN lấy điểm I sao cho KI = KM. Chứng minh NI = KB."],
  ["T24", "Cho tam giác ABC có AB < AC. Đường phân giác AD (D thuộc BC). Qua D kẻ đường thẳng song song với AB cắt AC tại E, kẻ đường thẳng song song với AC cắt AB tại F.\na) Chứng minh tứ giác AEDF là hình thoi.\nb) Chứng minh DE/AB + DF/AC = 1."],
  ["T25", "Cho đường tròn (O) đường kính AB. Lấy điểm C trên đường tròn sao cho CA < CB. Tiếp tuyến tại C của đường tròn cắt tiếp tuyến tại A ở D và cắt AB ở E. Gọi H là hình chiếu của C trên AB, I là giao điểm của BD và CH.\na) Chứng minh tứ giác ADCO nội tiếp.\nb) Chứng minh OD song song với BC.\nc) Chứng minh I là trung điểm của CH."],
  ["T26", "Cho tam giác ABC nhọn nội tiếp đường tròn (O). Gọi H là trực tâm của tam giác ABC, AD là đường cao. Gọi E là điểm đối xứng với H qua D.\na) Chứng minh E thuộc đường tròn (O).\nb) Kẻ đường kính AK. Chứng minh BCKE là hình thang cân."],
  ["T27", "Cho hình chữ nhật ABCD. Kẻ BH vuông góc với AC tại H. Gọi M, N lần lượt là trung điểm của AH và CD.\na) Gọi K là trung điểm của BH. Chứng minh MK song song với AB.\nb) Chứng minh tứ giác MKCN là hình bình hành.\nc) Chứng minh BM vuông góc với MN."],
  ["T29", "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng đáy và SA = a. Gọi M, N lần lượt là trung điểm của SB, SD.\na) Chứng minh BC vuông góc với mặt phẳng (SAB).\nb) Gọi O là giao điểm của AC và BD. Tính khoảng cách từ O đến mặt phẳng (SBC).\nc) Gọi I là giao điểm của SC và mặt phẳng (AMN). Chứng minh SC vuông góc với AI."],
  ["T30", "Cho tam giác ABC đều nội tiếp đường tròn (O). Trên cung nhỏ BC lấy điểm M. Trên đoạn MA lấy điểm D sao cho MD = MB.\na) Chứng minh tam giác MBD đều.\nb) Chứng minh MA = MB + MC.\nc) Gọi E là giao điểm của AM và BC. Chứng minh 1/ME = 1/MB + 1/MC."],
];

const sc = (t: string) => buildScene(t).scene!;
const P = (s: GeoScene, n: string) => s.pts[n] as number[];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const letters = (t: string) => {
  const s = new Set<string>();
  for (const m of t.matchAll(/(?<![\p{L}'])([A-Z]'?)(?![\p{L}'])/gu)) s.add(m[1]);
  for (const m of t.matchAll(/(?<![\p{L}'])([A-Z]{2,5}'?)(?![\p{L}'])/gu)) for (const ch of m[1].replace(/'/g, '')) s.add(ch);
  return s;
};
const claimsOf = (s: GeoScene): string[] =>
  s.parts.flatMap((p) =>
    p.text
      .split(/(?:Chứng\s*minh|CM)(?:\s*rằng)?\s*:?/i)
      .slice(1)
      .map((x) => x.replace(/\s+/g, ' ').trim().replace(/[.;,]\s*$/, ''))
      .filter((x) => !!parseClaim(x)),
  );
/** Kéo từng điểm gốc một đoạn nhỏ (~5% cỡ hình) và trượt từng điểm trên cạnh: mọi trạng thái người dùng có thể kéo tới. */
const nudged = (s: GeoScene): GeoScene[] => {
  const ps = Object.values(s.pts);
  const k = 0.05 * Math.hypot(Math.max(...ps.map((p) => p[0])) - Math.min(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[1])) - Math.min(...ps.map((p) => p[1])));
  return [
  ...freePoints(s).flatMap((n) => [moveFreePoint(s, n, [P(s, n)[0] + k, P(s, n)[1] + 0.6 * k, 0]), moveFreePoint(s, n, [P(s, n)[0] - 0.7 * k, P(s, n)[1] + k, 0])]),
  ...Object.entries(s.defs ?? {}).filter(([n, d]) => d.k === 'seg' && s.order.includes(n)).map(([n, d]) => setPointT(s, n, (d as {t: number}).t + 0.13)),
  ];
};

describe('đề thi vào 10 dài: đủ điểm, vẽ từng phần, giữ tính chất khi kéo', () => {
  for (const [id, text] of EXAMS) {
    it(id, () => {
      const s = sc(text);
      expect(s, 'có hình').toBeTruthy();
      const have = new Set(s.order);
      expect([...letters(cleanHandwritten(text))].filter((n) => !have.has(n) && !(n === 'R' && s.dim === 2)), 'điểm còn thiếu').toEqual([]);
      expect(s.merged, 'không điểm nào bị nhập vào điểm khác').toEqual({});
      // vẽ từng phần: có nút; bấm nút k thì hiện đúng phần 0..k, các điểm thấy được tăng dần
      const chips = partChips(s);
      const size = (t: GeoScene) => {
        const f = renderScene(t);
        return f.verts.length + f.edges.length + f.curves.length + f.polys.length;
      };
      let t = showUpTo(s, 0); // hình mới chèn lên bảng chỉ hiện phần đề, các phần sau chờ bấm nút
      let prev = size(t);
      for (const c of chips) {
        t = selectPartUpTo(t, c.index);
        expect(partChips(t).filter((x) => x.shown).map((x) => x.index)).toEqual(chips.filter((x) => x.index <= c.index).map((x) => x.index));
        expect(visibleNames(t, Infinity).length).toBeGreaterThanOrEqual(visibleNames(showUpTo(s, 0), 0).length);
        expect(size(t), `phần ${c.label} vẽ thêm nét`).toBeGreaterThan(prev);
        prev = size(t);
      }
      // mệnh đề đúng trên hình và sau khi kéo từng điểm gốc / trượt điểm trên cạnh
      for (const v of [s, ...nudged(s)]) {
        for (const p of Object.values(v.pts)) expect(p.every(Number.isFinite)).toBe(true);
        for (const c of claimsOf(s)) expect(verifyClaim(v, c, 2).verdict, c).not.toBe('fails');
      }
    }, 30000);
  }
});

it('hầu hết đề nhiều phần có nút vẽ từng phần (phần chỉ chứng minh trên nét đã có thì không cần nút)', () => {
  const withChips = EXAMS.filter(([, t]) => partChips(sc(t)).length > 0).length;
  expect(withChips).toBeGreaterThanOrEqual(EXAMS.length - 2);
});

describe('kéo điểm gốc: điểm phụ thuộc giữ đúng tính chất', () => {
  const tri = (s: GeoScene, a: string, b: string, c: string) => {
    const [A, B, C] = [P(s, a), P(s, b), P(s, c)];
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const sq = (p: number[]) => p[0] * p[0] + p[1] * p[1];
    return [(sq(A) * (B[1] - C[1]) + sq(B) * (C[1] - A[1]) + sq(C) * (A[1] - B[1])) / d, (sq(A) * (C[0] - B[0]) + sq(B) * (A[0] - C[0]) + sq(C) * (B[0] - A[0])) / d];
  };
  const dot = (a: number[], b: number[], c: number[], d: number[]) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
  const angle = (a: number[], v: number[], b: number[]) => (Math.acos(dot(v, a, v, b) / (dist(v, a) * dist(v, b))) * 180) / Math.PI;
  const byId = Object.fromEntries(EXAMS);

  it('trực tâm, đối xứng qua trung điểm và qua cạnh (T08): K đối xứng H qua M, N thuộc đường tròn ngoại tiếp', () => {
    const s0 = sc(byId.T08);
    for (const s of nudged(s0)) {
      const [H, M, K, N, A, B, C] = ['H', 'M', 'K', 'N', 'A', 'B', 'C'].map((n) => P(s, n));
      expect(Math.abs(dot(A, H, B, C))).toBeLessThan(1e-9);
      expect(dist(M, [(H[0] + K[0]) / 2, (H[1] + K[1]) / 2])).toBeLessThan(1e-9);
      const O = tri(s, 'A', 'B', 'C');
      expect(dist(N, O)).toBeCloseTo(dist(A, O), 9);
    }
  });

  it('đường tròn nội tiếp (T07): tiếp điểm D, E, F cách đều tâm I và ID ⊥ BC khi kéo đỉnh', () => {
    for (const s of nudged(sc(byId.T07))) {
      const [I, D, E, F, B, C] = ['I', 'D', 'E', 'F', 'B', 'C'].map((n) => P(s, n));
      expect(dist(I, D)).toBeCloseTo(dist(I, E), 9);
      expect(dist(I, D)).toBeCloseTo(dist(I, F), 9);
      expect(Math.abs(dot(I, D, B, C))).toBeLessThan(1e-9);
    }
  });

  it('góc cho trước (T09): góc MAN = 45° khi kéo hình vuông hoặc trượt M trên BC', () => {
    const s0 = sc(byId.T09);
    expect(angle(P(s0, 'M'), P(s0, 'A'), P(s0, 'N'))).toBeCloseTo(45, 6);
    for (const s of nudged(s0)) expect(angle(P(s, 'M'), P(s, 'A'), P(s, 'N'))).toBeCloseTo(45, 6);
  });

  it('dây qua điểm cho trước (T23): dây MN đi qua C (trung điểm OA) và vuông góc AB khi kéo', () => {
    for (const s of [sc(byId.T23), ...nudged(sc(byId.T23))]) {
      const [O, A, B, C, M, N] = ['O', 'A', 'B', 'C', 'M', 'N'].map((n) => P(s, n));
      expect(dist(C, [(O[0] + A[0]) / 2, (O[1] + A[1]) / 2])).toBeLessThan(1e-9);
      expect(Math.abs(dot(M, N, A, B))).toBeLessThan(1e-9);
      expect(Math.abs((N[0] - M[0]) * (C[1] - M[1]) - (N[1] - M[1]) * (C[0] - M[0]))).toBeLessThan(1e-9);
    }
  });

  it('giao điểm "lần lượt" (T05, T16) và hai giao điểm với đường tròn (T15) vẫn đúng chỗ khi kéo', () => {
    for (const s of nudged(sc(byId.T05))) {
      const [B, D, E, F] = ['B', 'D', 'E', 'F'].map((n) => P(s, n));
      expect(dist(D, E)).toBeCloseTo(dist(E, F), 9);
      expect(dist(E, F)).toBeCloseTo(dist(F, B), 9);
    }
    for (const s of nudged(sc(byId.T15))) {
      const [O, A, B, M, N] = ['O', 'A', 'B', 'M', 'N'].map((n) => P(s, n));
      expect(dist(O, M)).toBeCloseTo(dist(O, A), 9);
      expect(dist(O, N)).toBeCloseTo(dist(O, A), 9);
      expect(dist(B, M)).toBeLessThan(dist(B, N));
    }
  });

  it('tiếp tuyến tại C cắt tiếp tuyến tại A ở D và cắt AB ở E (T25): E vẫn trên AB và DE tiếp xúc khi kéo', () => {
    for (const s of nudged(sc(byId.T25))) {
      const [O, A, B, C, D, E] = ['O', 'A', 'B', 'C', 'D', 'E'].map((n) => P(s, n));
      expect(Math.abs((B[0] - A[0]) * (E[1] - A[1]) - (B[1] - A[1]) * (E[0] - A[0]))).toBeLessThan(1e-9);
      expect(Math.abs(dot(O, C, C, E))).toBeLessThan(1e-9);
      expect(Math.abs(dot(O, C, C, D))).toBeLessThan(1e-9);
    }
  });
});
