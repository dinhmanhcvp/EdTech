import {describe, expect, it} from 'vitest';
import {buildScene, cleanHandwritten} from '../utils/geometryProblem';
import {parseClaim, verifyClaim} from '../utils/geoClaims';

/**
 * Đề thật trong chuyên đề "Các mô hình thường gặp và các bài toán tổng hợp hình học ôn thi vào lớp 10" (dán nguyên văn từ PDF, gồm cả ký hiệu font Symbol U+F0xx).
 * Mỗi đề phải: dựng đủ MỌI điểm được nêu (trừ lỗi đánh máy của đề, ghi ở cột thứ ba) và mọi mệnh đề cần chứng minh đọc được đều ĐÚNG trên hình,
 * kể cả khi kéo đỉnh (verifyClaim thử kéo các đỉnh tự do rồi kiểm lại).
 */
const PROBLEMS: [string, string, string][] = [
  ["M13", "Cho (O), đường kính AB, dây CD ⊥ AB tại H. Tiếp tuyến tại C cắt AB tại M. Chứng minh: BM .AH = BH.AM", ""],
  ["M14", "Cho (O; R), đường kính AB, C ∈ (O), CH ⊥ AB tại H. Tiếp tuyến tại B, C cắt nhau tại D. Chứng minh: AD qua trung điểm I của CH.", ""],
  ["C1", "Cho tam giác ABC nhọn ( AB < AC ) nội tiếp đường tròn (O). Hai đường cao BE và CF của\ntam giác ABC cắt nhau tại điểm H. Gọi K là trung điểm BC. a) Chứng minh ΔAEF đồng dạng ΔABC.\nb) Chứng minh đường thẳng OA vuông góc với đường thẳng EF.\nc) Đường phân giác góc FHB cắt AB và AC lần lượt tại M và N. Gọi I là trung điểm của MN, J là trung điểm của AH. Chứng minh tứ giác AFHI nội tiếp và ba điểm I , J , K thẳng hàng.", ""],
  ["C2", "Cho đường tròn ( O ) , dây CD cố định. Gọi B là điểm chính giữa cung nhỏ CD , kẻ đường kính\nAB cắt CD tại I . Lấy điểm H bất kỳ trên cung lớn CD , HB cắt CD tại E . Đường thẳng AH cắt đường thẳng CD tại P . a). Chứng minh: Tứ giác PHIB nội tiếp.\nb). Chứng minh: AH.AP = AI.AB .\nc). Gọi K là giao điểm của đường thẳng AE và BP . Kẻ KM ⊥ AB cắt AB tại M , cắt\nđường tròn ( O ) tại N . Chứng minh N, I , H thẳng hàng.", ""],
  ["C3", "Cho đường tròn tâm (O) và dây BC cố định không đi qua O . Trên cung lớn BC lấy điểm A sao cho AB \uf03c AC . Kẻ đường kính AK,E là hình chiếu của C trên AK . M là trung điểm của BC . a) Chứng minh bốn C,E, M,O cùng thuộc một đường tròn.\nb) Kẻ AD \uf05e BC tại D . Chứng minh AD.AK \uf03d AB.AC và \uf044MDE cân. c) Gọi F là hình chiếu của B trên AK . Chứng minh khi A di chuyển trên cung lớn BC thì tâm đường tròn ngoại tiếp \uf044DEF là 1 điểm cố định.", ""],
  ["C4", "Tứ giác ABCD nội tiếp đường tròn tâm O đường kính AD. Hai đường chéo AC,BD cắt nhau tại E. Từ E kẻ EF vuông góc với AD ( F \uf0ce AD ). Đường thẳng CF cắt đường tròn tại điểm thứ hai là M. Giao điểm của BD và CF là N . Chứng minh: a)CEFD là tứ giác nội tiếp. b) FA là tia phân giác của B\uf0b7 FM .\nc) BE.DN \uf03d EN.BD .", ""],
  ["C5", "Trên nửa đường tròn (O; R) đường kính BC , lấy điểm A sao cho BA = R. a) Chứng minh tam giác ABC vuông tại A và tính số đo các góc B, C của tam giác vuông ABC\nb) Qua B kẻ tiếp tuyến với nửa đường tròn (O) , nó cắt tia CA tại D . Qua D kẻ tiếp tuyến DE với nửa đường tròn (O) ( E là tiếp điểm). Gọi I là giao điểm của OD và BE . Chứng minh rằng 𝑂𝑂𝑂𝑂 ⊥ 𝐵𝐵𝐵𝐵 𝑣𝑣à 𝐷𝐷𝐷𝐷. 𝐷𝐷𝐷𝐷 = 𝐷𝐷𝐷𝐷. 𝐷𝐷𝐷𝐷\nc) Kẻ EH vuông góc với BC tại H . EH cắt CD tại G . Chứng minh IG song song với BC.", ""],
  ["C6", "Cho đường tròn (O) cố định. Từ một điểm A cố định ở bên ngoài đường tròn (O), kẻ các tiếp tuyến AM và AN với đường tròn ( M;N là các tiếp điểm). Đường thẳng đi qua A cắt đường tròn (O) tại hai điểm B và C (B nằm giữa A và C). Gọi I là trung điểm của dây BC. a). Chứng minh rằng: AMON là tứ giác nội tiếp.\nb). Gọi K là giao điểm của MN và BC. Chứng minh rằng: AK.AI = AB.AC\nc). Xác định vị trí của cát tuyến ABC để IM = 2IN .", ""],
  ["C7", "Cho đường tròn (O ; R) , đường kính AB vuông góc với dây CD tại điểm I ( I nằm giữa A và\nO ). Lấy điểm E bất kì trên cung nhỏ BC ( E khác B và C ). AE cắt CD tại K . a) Chứng minh bốn điểm K, E, B, I cùng thuộc một đường tròn.\nb) Chứng minh AK.AE = AI.AB .\nc) Gọi P là giao điểm của tia BE và tia DC , Q là giao điểm của AP và BK . Chứng minh IK là phân giác của E\uf0b7IQ . Chứng minh OQ là tiếp tuyến của đường tròn ngoại tiếp tam giác PQE .", ""],
  ["C8", "Cho đường tròn \uf028O\uf029 đường kính AB . Dây cung MN vuông góc với AB , ( AM \uf03c BM ). Hai\nđường thẳng BM và NA cắt nhau tại K . Gọi H là chân đường vuông góc kẻ từ K đến đường thẳng AB . a) Chứng minh tứ giác AHKM nội tiếp trong một đường tròn.\nb) Chứng minh rằng NB . HK \uf03d AN . HB .\nc) Chứng minh HM là tiếp tuyến của đường tròn \uf028O\uf029.", ""],
  ["C12", "Cho đường tròn (O; R) và điểm M nằm ngoài đường tròn. Qua M kẻ hai tiếp tuyến MA , MB với đường tròn (O; R) ( A , B là các tiếp điểm). Đoạn thẳng OM cắt đường thẳng AB tại H và cắt đường tròn (O; R) tại điểm I .\na) Chứng minh bốn điểm M , A , B , O cùng thuộc một đường tròn.\nb) Kẻ đường kính AD của (O; R) . Đoạn thẳng MD cắt đường tròn (O; R) tại điểm C khác\nD Chứng min= h MA2 M= H.MO MC.MD .\nc) Chứng minh IH.IO = IM .OH .", ""],
  ["C14", "Cho đường tròn (O, R) và dây AB cố định (AB không là đường kính). Gọi N là trung điểm của AB. Qua N , kẻ đường kính CD của đường tròn (O) ( C thuộc cung nhỏ AB ). Lấy điểm M bất kỳ trên cung lớn AB (M ≠ A, M ≠ B) , MC cắt AB tại F. Hai đường thẳng DM và AB cắt nhau tại E . a) Chứng minh bốn điểm M , N ,C, E cùng thuộc một đường tròn.\nb) Hai đường thẳng DF và CE cắt nhau tại I . Chứng minh KI.KM = KC.KD và NE là tia phân giác của M\uf0b7 NI\nc) Chứng minh rằng: KC = CN KD DN", "K"],
  ["C17", "Cho (O;R) đường kính AB cố định. Dây CD vuông góc với AB tại H nằm giữa A và O. Lấy điểm F thuộc cung AC nhỏ. BF cắt CD tại I; AF cắt tia DC tại K. a) Chứng minh rằng tứ giác AHIF là tứ giác nội tiếp.\nb) Chứng minh rằng: HA.HB = HI.HK.\nc) Đường tròn ngoại tiếp ∆ KIF cắt AI tại E. Chứng minh rằng khi H chuyển động trên đoạn OA thì E thuộc một đường tròn cố định.", ""],
  ["C18", "Cho đường tròn (O) đường kính BC. Điểm A thuộc đường tròn thỏa mãn AB < AC (A khác B, A khác C). Lấy điểm D trên cạnh AC sao cho AD = AB. Vẽ hình vuông BADE. Tia AE cắt (O)\ntại F. a) Tam giác FBC là tam giác gì? Tại sao? b) Chứng minh: F\uf0b7 DC = F\uf0b7 CD .\nc) Vẽ tia Bx là tiếp tuyến của (O) tại B, Bx cắt CF tại I. Chứng minh ba điểm D, E, I thẳng hàng.", ""],
  ["C20", "Cho nửa đường tròn (O) đường kính AB. Điểm M nằm trên nửa đường tròn (M ≠ A; B). Tiếp tuyến tại M cắt tiếp tuyến tại A và B của đường tròn (O) lần lượt tại C và D a) Chứng minh rằng: tứ giác ACMO nội tiếp.\nb) Gọi P là giao điểm CD và AB. Chứng minh: PA.PO = PC.PM c) Gọi E là giao điểm của AM và BD; F là giao điểm của AC và BM. Chứng minh: Ba điểm E; F; P thẳng hàng.", ""],
  ["C22", "Cho hình vuông ABCD có độ dài cạnh bằng 4 cm . Vẽ đường tròn tâm O đường kính AD; kẻ\nBM là tiếp tuyến của đường tròn tâm O ( M là tiếp điểm, M ≠ A ), BM cắt CD tại K . a) Chứng minh 4 điểm A, B, M , O cùng thuộc một đường tròn.\nb) Chứng minh OB ⊥ OK và BM . MK = AB2 . 4\nc) Đường thẳng AM cắt CD tại E . Chứng minh K là trung điểm của đoạn thẳng ED và tính chu vi của tứ giác ABKD .", ""],
  ["C26", "Cho đường tròn tâm (O) , đường kính AB = 2R . Trên đường tròn (O) lấy điểm C bất kì ( C không trùng với A và B ). Tiếp tuyến của đường tròn (O) tại A cắt tia BC ở điểm D. Gọi H là hình chiếu của A trên đường thẳng DO. Tia AH cắt đường tròn (O) tại điểm F (không\ntrùng với A ). a) Chứng minh tứ giác AHCD nội tiếp được một đường tròn. b) Chứng minh ∆CFH là tam giác vuông. c) Tính giá trị của biểu thức S = BH.BC .\nBF", ""],
  ["C27", "Từ điểm M nằm ngoài đường tròn (O) , kẻ các tiếp tuyến MA, MB với (O) ( B, C là các tiếp điểm). Kẻ đường kính AC của (O) . Đoạn thẳng MC cắt AB tại K và cắt đường tròn (O) tại điểm thứ hai D . Gọi I , H lần lượt là các giao điểm của MO với BD, AB.\na) Chứng minh bốn điểm M , A, O, B cùng thuộc một đường tròn.\nb) Chứng minh MO song song với BC và IM 2 = ID.IB .\nc) Gọi L là giao điểm của IK , HC . Chứng minh ba điểm M , B, L thẳng hàng.", ""],
  ["C28", "Cho nửa (O) đường kính AB = 2R , C là điểm bất kì nằm trên nửa đường tròn sao cho C khác A\nvà AC < CB . Điểm D thuộc cung nhỏ BC sao cho: C\uf0b7 OD = 900 . Gọi E là giao điểm của AD và BC , F là giao điểm của AC và BD , I là trung điểm của EF .\na) Chứng minh: CEDF là tứ giác nội tiếp\nb) Chứng minh: FC.FA = FD.FB\nc) Chứng minh IC là tiếp tuyến của (O)\nd) Hỏi khi C thay đổi thỏa mãn điều kiện Câu toán, E thuộc đường tròn cố định nào?", ""],
  ["C29", "Cho đường tròn (O; R) và dây MN cố định ( MN < 2R ). Kẻ đường kính AB vuông góc với dây\nMN tại E (điểm A thuộc cung nhỏ MN ). Lấy điểm C thuộc dây MN ( C khác M , N , E ).\nĐường thẳng BC cắt (O; R) tại điểm K ( K khác B ).\na. Chứng minh AKCE là tứ giác nội tiếp.\nb.\nChứng\nminh\n2\nBM=\nBK ⋅ BC .\nc. Gọi I là giao điểm của hai đường thẳng AK và MN ; D là giao điểm của hai đường thẳng AC và BI . Chứng minh điểm C cách đều ba cạnh của ∆DEK .", ""],
  ["C30", "Cho nửa đường tròn tâm O , bán kính AB = 2R và tia tiếp tuyến Ax cùng phía với nửa đường\ntròn đối với AB. Từ điểm M trên Ax kẻ tiếp tuyến thứ hai MC với nửa đường tròn ( C là tiếp điểm). AC cắt OM tại E ; MB cắt nửa đường tròn (O) tại D ( D ≠ B ).\na) Chứng minh rằng bốn điểm A, M ,C,O cùng thuộc một đường tròn. b) Tính diện tích hình quạt OCB theo R , trong trường hợp \uf0b7 AMC = 60\uf06f và chứng minh \uf0b7 ADE = \uf0b7 ACO .\nc) Gọi H là hình chiếu của C trên AB. Chứng minh rằng MB đi qua trung điểm của CH .", ""],
  ["C31", "Từ điểm M nằm ngoài đường tròn (O ; R) kẻ các tiếp tuyến MP và MQ với đường tròn (O; R) , ( P và Q là các tiếp điểm). Kẻ đường kính PA . Tiếp tuyến tại A với đường tròn (O; R) cắt\nPQ tại B . a) Chứng minh: AQ song song với OM .\nb) Chứng minh: PQ.PB = 4R2 .\nc) Gọi K là trung điểm của MO . Tia PK cắt AQ tại I . Chứng minh tứ giác MIAO là hình bình hành.", ""],
  ["C35", "Cho đường tròn (O) và dây cung AB . Trên tia đối của tia AB lấy điểm C. Từ điểm chính giữa\nP của cung lớn AB kẻ đường kính PQ của đường tròn (O) cắt dây AB tại D . Tia CP cắt\nđường tròn (O) tại điểm I ( điểm I khác điểm P ). Các dây AB và QI cắt nhau tại K\na) Chứng minh tứ giác PDKI nội tiếp\nb) Chứng minh rằng CI.CP = CK.CD và IC là phân giác góc ngoài tại đỉnh I của tam giác AIB .\nc) Giả sử ba điểm A; B;C cố định. Chứng minh khi đường tròn (O) thay đổi nhưng vẫn đi qua\nhai điểm A và B thì đường thẳng QI luôn đi qua một điểm cố định.", ""],
  ["C36", "Cho đường tròn (O) , từ điểm A ở ngoài đường tròn vẽ hai tiếp tuyến AB và AC ( B, C là các\ntiếp điểm), OA cắt BC tại E. a) Chứng minh tứ giác ABOC nội tiếp.\nb) Chứng minh BC vuông góc với OA và BA.BE = AE.BO .\nc) Gọi I thuộc đoạn thẳng BE , đường thẳng qua I và vuông góc OI cắt các tia AB, AC theo thứ tự tại D và F . Chứng minh F là trung điểm của AC .", ""],
  ["C39", "Cho đường tròn (O; R) có hai đường kính AB và CD vuông góc tại O . Gọi I là trung điểm của OB . Tia CI cắt đường tròn (O) tại E . Gọi H là giao điểm của AE và CD .\na) Chứng minh bốn điểm O , I , E , D cùng thuộc một đường tròn.\nb) Chứng minh: AH. AE = 2R2 và OA= 3⋅OH .\nc) Gọi K là hình chiếu của O trên BD , Q là giao điểm của AD và BE . Chứng minh: Q, K, I thẳng hàng.", ""],
  ["C40", "Cho (O) đường kính AB . Kẻ đường kính CD vuông góc với AB . Lấy M thuộc cung nhỏ BC , AM cắt CD tại E . Qua D kẻ tiếp tuyến với (O) cắt đường thẳng BM tại N . Gọi P là hình chiếu vuông góc của B lên DN a) Chứng minh các điểm M , N , D, E cùng thuộc một đường tròn. b ) Chứng minh EN // CB . c) Chứng minh AM .BN = 2R2 và tìm vị trí điểm M trên cung nhỏ BC để diện tích tam giác BNC đạt giá trị lớn nhất.", ""],
  ["C44", "Cho tam giác ABC nhọn ( AB < AC ) có đường cao AD và đường phân giác trong AO ( D , O\nthuộc cạnh BC ). Kẻ OM ⊥ AB tại M , ON ⊥ AC tại N . a) Chứng minh bốn điểm O , M , D , N cùng nằm trên một đường tròn. (dấu cách của dấu phảy, dấu chấm viết không đúng) b) Chứng minh: B\uf0b7 DM = O\uf0b7 DN . c) Qua O kẻ đường thẳng vuông góc với BC cắt MN tại I , AI cắt BC tại K . Chứng minh K là trung điểm của BC .", ""],
  ["C45", "Cho (O; R) đường kính AB . Bán kính CO vuông góc với AB , M là điểm bất kì trên cung nhỏ\nAC ( M khác A và C ), MB cắt AC tại H . Gọi K là hình chiếu của H trên AB . a) Chứng minh bốn điểm C, B, H , K cùng thuộc một đường tròn. b) Chứng minh CA là phân giác M\uf0b7 CK .\nc) Kẻ Ax là tiếp tuyến của nửa đường tròn tại A . Lấy P ∈ Ax sao cho AP.MB = R . MA\nChứng minh PB đi qua trung điểm của đoạn thẳng HK .", ""],
  ["C46", "Từ điểm A nằm ngoài (O) vẽ hai tiếp tuyến AB, AC với đường tròn ( B, C là các tiếp điểm).\nKẻ đường kính CD của (O) .\na) Chứng minh BD//AO .\nb) AD cắt (O) tại E ( A, E, D theo thứ tự). Chứng minh rằng AB2 = AE.AD .\nc) Vẽ BH ⊥ DC tại H . Gọi I là trung điểm của BH . Chứng minh ba điểm A, I , D thẳng\nhàng.", ""],
  ["C48", "Cho tam giác ABC nhọn. Đường tròn (O) đường kính BC cắt AB , AC lần lượt tại E và D ; BD cắt CE tại H , AH cắt BC tại I . Từ A kẻ tiếp tuyến AM , AN của đường tròn (O) ( M\n, N là tiếp điểm). a) Chứng minh tứ giác AEHD nội tiếp.\nb) Chứng minh AB.BE = BI.BC , từ đó suy ra AB.BE + AC.CD = BC2\nc) Chứng minh ba điểm M , H , N thẳng hàng.", "VG"],
];

const claimsOf = (parts: {label: string; text: string}[]): string[] => {
  const out: string[] = [];
  for (const pt of parts) {
    for (const s0 of pt.text.split(/(?:Chứng\s*minh|CM|Cmr)(?:\s*rằng)?\s*:?/i).slice(1)) {
      const s1 = s0.replace(/\s+/g, ' ').trim().replace(/[.;,]\s*$/, '');
      const pieces = s1.split(/\s+và\s+|(?<=[^\s.A-Z])\.\s+/).map((x) => x.trim()).filter(Boolean);
      const cands = pieces.some((x) => parseClaim(x.replace(/[.;,]\s*$/, ''))) ? pieces : [s1];
      for (const c of cands) if (parseClaim(c.replace(/[.;,]\s*$/, ''))) out.push(c.replace(/[.;,]\s*$/, ''));
    }
  }
  return out;
};

describe('đề trong chuyên đề hình học lớp 10 (PDF)', () => {
  for (const [id, text, skip] of PROBLEMS) {
    it(`${id}: dựng đủ điểm và các mệnh đề cần chứng minh đều đúng trên hình`, () => {
      const sc = buildScene(text).scene!;
      expect(sc, 'có hình').toBeTruthy();
      const clean = cleanHandwritten(text);
      const mentioned = new Set<string>();
      for (const m of clean.matchAll(/(?<![\p{L}'])([A-Z]'?)(?![\p{L}'])/gu)) mentioned.add(m[1]);
      for (const m of clean.matchAll(/(?<![\p{L}'])([A-Z]{2,5}'?)(?![\p{L}'])/gu)) for (const ch of m[1].replace(/'/g, '')) mentioned.add(ch);
      const have = new Set([...sc.order, ...Object.values(sc.merged).flat()]);
      const missing = [...mentioned].filter((n) => !have.has(n) && !['R', 'S'].includes(n) && !skip.includes(n));
      expect(missing, 'điểm còn thiếu').toEqual([]);
      for (const c of claimsOf(sc.parts)) {
        const v = verifyClaim(sc, c);
        expect(v.verdict, `${c}: ${v.detail}`).not.toBe('fails');
      }
    });
  }
});
