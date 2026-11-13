/**
 * Coach Socratic cho bài hình: KHÔNG đưa lời giải. Dẫn học sinh qua 4 mức bằng câu hỏi; ở mức 3 gợi ý một đường phụ (dạng câu hỏi "em thử…?")
 * kèm nút vẽ giúp, vì nhiều bài hình chỉ giải được sau khi vẽ thêm. Chạy ngoại tuyến từ hình + đề (không cần AI);
 * AI (ask-board, chế độ coach) chỉ làm câu hỏi phong phú hơn, vẫn qua cùng danh sách đường phụ hợp lệ.
 */
import type {GeoScene} from './geometryProblem';
import type {GeoTool} from '../components/canvas/GeometryProblemPanel';
import {claimPoints, detectFacts, parseClaim, verifyClaim, type Claim} from './geoClaims';

export interface AuxIdea {
  tool: GeoTool;
  names: string[];
  /** nhãn nút */
  label: string;
  /** câu hỏi gợi ý (không nói đường phụ này dùng để chứng minh bước nào) */
  question: string;
}

export interface CoachHint {
  level: 1 | 2 | 3 | 4;
  title: string;
  question: string;
  aux?: AuxIdea;
}

/** Mệnh đề cần chứng minh trong lời đề: lấy mệnh đề cuối cùng đọc được ("Chứng minh rằng …"). */
export function goalOf(text: string): {claim: Claim; text: string} | null {
  const flat = (text || '').replace(/\s*\n\s*/g, ' ');
  const found = [...flat.matchAll(/Chứng\s*minh(?:\s*rằng)?\s+(.+?)(?:\.\s|\.$|$)/giu)];
  for (let i = found.length - 1; i >= 0; i--) {
    const clause = found[i][1].replace(/\s+/g, ' ').trim();
    const claim = parseClaim(clause);
    if (claim) return {claim, text: clause};
  }
  return null;
}

const claimNames = (c: Claim): string[] => [...new Set(claimPoints(c))];
const segsOf = (c: Claim): [string, string][] => (c.k === 'eq' || c.k === 'perp' || c.k === 'par' ? [c.a, c.b] : c.k === 'ratio' ? [c.a, c.b, c.c, c.d] : c.k === 'ang' ? [[c.a[0], c.a[1]], [c.a[1], c.a[2]], [c.b[0], c.b[1]], [c.b[1], c.b[2]]] : []);

/** Đường phụ có thể gợi ý, theo thứ tự hợp lý; chỉ những cái dùng điểm có thật và chưa có trên hình. */
export function auxIdeas(sc: GeoScene, claim: Claim): AuxIdea[] {
  if (sc.dim !== 2) return [];
  const has = (a: string, b: string) => [...sc.edges, ...sc.aux.map(([x, y]) => [x, y] as [string, string])].some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const ok = (...n: string[]) => n.every((x) => sc.pts[x]);
  const out: AuxIdea[] = [];
  const ns = claimNames(claim).filter((n) => sc.pts[n]);
  if (claim.k === 'cyc' && claim.pts.length >= 4 && ok(...claim.pts.slice(0, 3)) && !(sc.circles ?? []).some((c) => c.of?.f === 'circum' && c.of.n.join() === claim.pts.slice(0, 3).join())) {
    const [a, b, c, d] = claim.pts;
    out.push({tool: 'circle3', names: [a, b, c], label: `Đường tròn qua ${a}, ${b}, ${c}`, question: `Nếu vẽ đường tròn đi qua ${a}, ${b}, ${c}, điểm ${d} nằm ở đâu so với nó? Em dự đoán rồi thử.`});
  }
  // a² = b·c: đoạn bình phương là tiếp tuyến của đường tròn qua đầu mút còn lại và hai điểm thẳng hàng với đỉnh chung (BK² = KI·KD → đường tròn qua B, I, D)
  if (claim.k === 'pow') {
    const k = claim.b.find((n) => claim.c.includes(n));
    const [t0] = claim.a.filter((n) => n !== k);
    const rest = [...claim.b, ...claim.c].filter((n) => n !== k);
    if (k && t0 && rest.length === 2 && ok(t0, ...rest) && !(sc.circles ?? []).some((c) => c.of?.f === 'circum' && [t0, ...rest].every((n) => c.of!.n.includes(n)))) {
      out.push({tool: 'circle3', names: [t0, ...rest], label: `Đường tròn qua ${t0}, ${rest.join(', ')}`, question: `Thử vẽ đường tròn đi qua ${t0}, ${rest.join(', ')}. Đường thẳng ${k}${t0} có quan hệ gì với đường tròn này? Hệ thức ${claim.a.join('')}² = ${claim.b.join('')}·${claim.c.join('')} nhắc em đến định lí nào?`});
    }
  }
  // nối hai điểm của mệnh đề mà trên hình chưa có đoạn nối
  for (let i = 0; i < ns.length; i++)
    for (let j = i + 1; j < ns.length; j++) if (!has(ns[i], ns[j]) && out.filter((o) => o.tool === 'segment').length < 3) out.push({tool: 'segment', names: [ns[i], ns[j]], label: `Nối ${ns[i]}${ns[j]}`, question: `Hai điểm ${ns[i]} và ${ns[j]} chưa được nối. Nếu nối ${ns[i]}${ns[j]}, em thấy xuất hiện tam giác hay tứ giác nào quen thuộc?`});
  // trung điểm của đoạn trong mệnh đề (thường dùng cho bài bằng nhau / tỉ số)
  if (claim.k === 'eq' || claim.k === 'ratio' || claim.k === 'par')
    for (const [a, b] of segsOf(claim).slice(0, 2)) if (ok(a, b)) out.push({tool: 'midpoint', names: [a, b], label: `Trung điểm ${a}${b}`, question: `Thử lấy trung điểm của ${a}${b}. Nó giúp so sánh hai đoạn/tỉ số đang xét như thế nào?`});
  // đường qua một điểm song song với đoạn khác (tỉ số, Thales)
  if (claim.k === 'ratio' || claim.k === 'par') {
    const [s1, s2] = segsOf(claim);
    if (s1 && s2 && ok(s1[0], s2[0], s2[1])) out.push({tool: 'parallel', names: [s1[0], s2[0], s2[1]], label: `Qua ${s1[0]} song song ${s2[0]}${s2[1]}`, question: `Kẻ từ ${s1[0]} đường thẳng song song với ${s2[0]}${s2[1]}. Định lí nào về đường thẳng song song và tỉ lệ đoạn thẳng dùng được?`});
  }
  // chân đường vuông góc (bằng nhau, vuông góc, góc)
  if (claim.k === 'eq' || claim.k === 'perp' || claim.k === 'ang') {
    const [s1, s2] = segsOf(claim);
    if (s1 && s2 && ok(s1[0], s2[0], s2[1])) out.push({tool: 'foot', names: [s1[0], s2[0], s2[1]], label: `Hạ ${s1[0]} xuống ${s2[0]}${s2[1]}`, question: `Hạ đường vuông góc từ ${s1[0]} xuống ${s2[0]}${s2[1]}. Xuất hiện tam giác vuông nào, có liên quan gì tới điều cần chứng minh?`});
  }
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.tool + o.names.join()) ? false : (seen.add(o.tool + o.names.join()), true)));
}

const KIND_QUESTION: Record<Claim['k'], string> = {
  eq: 'Hai đoạn này có thể là hai cạnh tương ứng của hai tam giác bằng nhau (hoặc cùng bằng một đoạn thứ ba) không? Em thử tìm hai tam giác đó.',
  ratio: 'Hai tỉ số này có thể là tỉ số các cạnh tương ứng của hai tam giác đồng dạng, hay là hệ quả của đường thẳng song song (định lí Thales) không?',
  perp: 'Góc 90° ở đây có thể suy ra từ đâu: tam giác vuông, đường cao, góc nội tiếp chắn nửa đường tròn, hay hai góc phụ nhau?',
  par: 'Hai đường song song thường đến từ cặp góc so le trong / đồng vị bằng nhau, hoặc cùng vuông góc với một đường thứ ba. Em thấy khả năng nào?',
  col: 'Ba điểm thẳng hàng thường chứng minh bằng hai góc kề bù, hoặc hai đoạn cùng song song/vuông góc với một đường. Em chọn hướng nào?',
  cyc: 'Tứ giác nội tiếp khi hai góc đối bù nhau, hoặc hai đỉnh cùng nhìn một cạnh dưới hai góc bằng nhau. Em thử so sánh những góc nào?',
  sim: 'Hai tam giác đồng dạng khi có hai cặp góc bằng nhau (g.g) hoặc các cạnh tương ứng tỉ lệ. Em tìm những cặp góc nào bằng nhau (góc chung, đối đỉnh, cùng chắn một cung, tiếp tuyến–dây cung)?',
  mid: 'Trung điểm gợi nhớ đến đường trung bình, đường trung tuyến, hoặc tính chất "đường kính vuông góc dây thì chia đôi dây". Em thấy tính chất nào dùng được?',
  tang: 'Đường thẳng là tiếp tuyến khi vuông góc với bán kính tại tiếp điểm, hoặc khi góc giữa tiếp tuyến và dây bằng góc nội tiếp chắn cung đó. Em chọn cách nào?',
  par4: 'Tứ giác là hình bình hành khi hai cặp cạnh đối song song, hoặc hai đường chéo cắt nhau tại trung điểm mỗi đường. Em chứng minh được điều nào trước?',
  iso: 'Tam giác cân khi có hai cạnh bằng nhau hoặc hai góc ở đáy bằng nhau. Em so sánh được cặp cạnh hay cặp góc nào?',
  right: 'Tam giác vuông khi có một góc 90°: góc nội tiếp chắn nửa đường tròn, trung tuyến bằng nửa cạnh huyền, hoặc Pythagore đảo. Em chọn hướng nào?',
  prod: 'Tích hai đoạn bằng tích hai đoạn khác thường đến từ hai tam giác đồng dạng (tỉ số cạnh), hoặc phương tích của một điểm đối với đường tròn. Em tìm hai tam giác (hoặc hai cát tuyến) liên quan chưa?',
  pow: 'Hệ thức dạng a² = b·c thường đến từ hai tam giác đồng dạng (chung một góc), hoặc từ tiếp tuyến và cát tuyến của một đường tròn. Em thấy đường tròn nào ở đây?',
  ang: 'Hai góc này nằm trong những tam giác nào, hoặc cùng chắn một cung nào? Có liên hệ nào qua tam giác đồng dạng hay góc nội tiếp không?',
};

/** Bốn mức gợi ý theo khung 4 bước Polya (Tìm hiểu đề → Lập kế hoạch → Thực hiện; bước ④ Kiểm tra lại nằm ở `reviewAttempt`) cho một mệnh đề cần chứng minh. `aux` ở mức 3 là đường phụ thứ `auxIndex` (đổi ý tưởng khác khi học sinh bấm "Ý khác"). */
export function coachHint(sc: GeoScene, statement: string, level: 1 | 2 | 3 | 4, auxIndex = 0): CoachHint {
  const goal = goalOf(statement);
  const goalText = goal?.text ?? 'điều đề yêu cầu';
  if (level === 1)
    return {level, title: '① Tìm hiểu đề', question: `Em nói lại bằng lời của mình: đề cho những điều kiện nào, và cần chứng minh «${goalText}»? Trên hình, em chỉ ra từng điều kiện đã cho (đoạn nào vuông góc, song song, bằng nhau…).`};
  const names = goal ? claimNames(goal.claim) : [];
  const facts = detectFacts(sc, 60).filter((f) => names.some((n) => new RegExp(`(^|[^A-Z])${n}([^A-Z']|$)`).test(f))).slice(0, 3);
  if (level === 2)
    return {level, title: '② Lập kế hoạch', question: `${goal ? KIND_QUESTION[goal.claim.k] : 'Trong các điều kiện đã cho, điều nào liên quan trực tiếp đến điều cần chứng minh?'}${facts.length ? ` Hình đang có: ${facts.join('; ')}. Quan hệ nào trong số này có ích?` : ''}`};
  const ideas = goal ? auxIdeas(sc, goal.claim) : [];
  if (level === 3) {
    const aux = ideas.length ? ideas[auxIndex % ideas.length] : undefined;
    return aux
      ? {level, title: '② Lập kế hoạch: cần vẽ thêm?', question: `Chỉ với hình hiện tại em đã nối được giả thiết với điều cần chứng minh chưa? Nếu còn thiếu một mắt xích, hãy thử: ${aux.question}`, aux}
      : {level, title: '② Lập kế hoạch: cần vẽ thêm?', question: 'Em thử dùng dụng cụ trên thanh công cụ để vẽ thêm một đường (đường nối, trung điểm, vuông góc, song song) tạo ra tam giác hoặc góc mới có chứa các điểm trong mệnh đề. Em định vẽ đường nào, vì sao?'};
  }
  return {level, title: '③ Thực hiện', question: 'Sau khi vẽ thêm, hình có thêm quan hệ nào mới (tam giác đồng dạng, góc bằng nhau, đoạn song song…)? Em dùng nó để đi từ giả thiết tới điều cần chứng minh như thế nào? Viết bước đầu tiên, tôi sẽ cùng em kiểm tra trên hình.'};
}

/** Hai mệnh đề cùng nói một điều (không phân biệt thứ tự đầu/cuối của đoạn, thứ tự hai vế)? */
const sameClaim = (x: Claim | null, y: Claim | null): boolean => {
  if (!x || !y || x.k !== y.k) return false;
  const sg = (a: [string, string]) => [...a].sort().join('');
  if (x.k === 'eq' || x.k === 'perp' || x.k === 'par') {
    const norm = (c: typeof x) => [sg(c.a), sg(c.b)].sort().join('|');
    return norm(x) === norm(y as typeof x);
  }
  return JSON.stringify(x) === JSON.stringify(y);
};

/**
 * Quan hệ MỚI xuất hiện sau khi vẽ thêm (so với trước): để hỏi "em thấy gì mới?" mà không nói ra chứng minh.
 * Bỏ quan hệ trùng đúng điều đề yêu cầu chứng minh (`goal`), vì nêu ra là nói thẳng đáp án.
 */
export const newFacts = (before: GeoScene, after: GeoScene, goal?: Claim | null): string[] => {
  const old = new Set(detectFacts(before, 80));
  return detectFacts(after, 80).filter((f) => !old.has(f) && !sameClaim(parseClaim(f), goal ?? null));
};

/** Nhận xét kiểu Socratic cho một khẳng định học sinh viết: kiểm trên hình rồi hỏi tiếp, không chứng minh hộ. */
export function reviewAttempt(sc: GeoScene, text: string): {verdict: ReturnType<typeof verifyClaim>['verdict']; message: string} {
  const v = verifyClaim(sc, text);
  const message =
    v.verdict === 'holds'
      ? `④ Kiểm tra lại: ${v.detail} Vậy vì sao nó đúng? Em dựa vào định lí hay tính chất nào để viết thành một bước chứng minh? Và nếu kéo đỉnh sang vị trí khác thì lập luận của em còn đúng không?`
      : v.verdict === 'fails'
        ? `${v.detail} Em thử xem lại bước vừa rồi: giả thiết nào em đã dùng?`
        : v.detail;
  return {verdict: v.verdict, message};
}
