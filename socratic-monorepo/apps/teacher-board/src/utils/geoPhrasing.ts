/**
 * Cách nói thường gặp trong đề hình mà bộ dựng chưa hiểu → viết lại thành câu đơn mà nó đã hiểu (mọi điểm vẫn có công thức, kéo đỉnh thì theo):
 *   "K là điểm đối xứng của H qua BC" · "D là chân đường phân giác trong góc A" · "AD là phân giác góc A" · "BM cắt CN tại G"
 */
const PT = "[A-Z]'?";

export function expandPhrasing(text0: string): string {
  let t = text0;
  const SEG = "[A-Z]'?[A-Z]'?";
  // "tam giác ABC nhọn có trực tâm H" → H là trực tâm
  t = t.replace(new RegExp(`\\s*,?\\s*(?:có|với)\\s*trực tâm\\s*(?:là\\s*)?(?:điểm\\s*)?(${PT})(?![\\p{L}A-Z'])`, 'gu'), '; $1 là trực tâm');
  // "Điểm A di động trên cung lớn BC" → A thuộc cung lớn BC
  t = t.replace(new RegExp(`(?:[Đđ]iểm\\s*)?(?<![\\p{L}A-Z'])(${PT})\\s*(?:di động|di chuyển|chạy|thay đổi)\\s*trên\\s*cung`, 'gu'), '$1 thuộc cung');
  // "đường tròn (I) nội tiếp tam giác ABC" / "đường tròn tâm O ngoại tiếp tam giác ABC" → I là tâm đường tròn nội tiếp tam giác ABC (đặt tên tâm)
  t = t.replace(new RegExp(`đường tròn\\s*(?:\\(\\s*(${PT})\\s*\\)|tâm\\s*(${PT}))\\s*(nội|ngoại)\\s*tiếp\\s*(tam giác\\s*(?:${PT}){3})`, 'gu'), (_w: string, a: string | undefined, b: string | undefined, k: string, tri: string) => `${a ?? b} là tâm đường tròn ${k} tiếp ${tri}; đường tròn (${a ?? b})`);
  // "(I) tiếp xúc với các cạnh BC, CA, AB lần lượt tại D, E, F" → tiếp điểm = hình chiếu của tâm lên cạnh (kéo đỉnh thì theo)
  t = t.replace(
    new RegExp(`\\(\\s*(${PT})\\s*\\)\\s*,?\\s*tiếp xúc\\s*(?:với\\s*)?(?:các\\s*|ba\\s*|hai\\s*)?(?:cạnh\\s*)?((?:${SEG}\\s*(?:,|và)\\s*)*${SEG})\\s*(?:lần lượt\\s*)?(?:tại|ở)\\s*((?:${PT}\\s*(?:,|và)\\s*)*${PT})(?![\\p{L}A-Z'])`, 'gu'),
    (w: string, o: string, segs: string, ns: string) => {
      const ss = segs.match(new RegExp(SEG, 'g')) ?? [];
      const ps = ns.match(new RegExp(PT, 'g')) ?? [];
      return ss.length === ps.length ? `(${o}); ${ps.map((p, i) => `${p} là hình chiếu của ${o} trên ${ss[i]}`).join('; ')}` : w;
    },
  );
  // tia tiếp tuyến Ax, By: "cắt Ax, By lần lượt tại C, D" → "cắt tiếp tuyến tại A và B lần lượt tại C, D"
  const rays = [...t.matchAll(/tiếp tuyến\s*([A-Z])([a-z])\s*(?:,|và)?\s*(?:([A-Z])([a-z]))?/gu)].flatMap((r) => [[r[1], r[2]], ...(r[3] ? [[r[3], r[4]]] : [])]);
  for (const [P1, x1] of rays)
    for (const [P2, x2] of rays)
      if (P1 !== P2) t = t.replace(new RegExp(`cắt\\s*(?:các\\s*)?(?:tia\\s*)?${P1}${x1}\\s*(?:,|và)\\s*(?:tia\\s*)?${P2}${x2}(?![\\p{L}])`, 'gu'), `cắt tiếp tuyến tại ${P1} và ${P2}`);
  for (const [P1, x1] of rays) t = t.replace(new RegExp(`cắt\\s*(?:tia\\s*)?${P1}${x1}(?![\\p{L}])`, 'gu'), `cắt tiếp tuyến tại ${P1}`);
  // "Đường chéo BD cắt AN, CM lần lượt tại E và F" → BD giao AN tại E; BD giao CM tại F
  t = t.replace(
    new RegExp(`(?:[Đđ]ường chéo|[Đđ]ường thẳng|[Tt]ia|[Đđ]oạn(?: thẳng)?)?\\s*(?<![\\p{L}A-Z'])(${SEG})\\s*cắt\\s*(?:các\\s*)?(?:đường thẳng\\s*|cạnh\\s*|đoạn\\s*|tia\\s*)?(${SEG})\\s*(?:,|và)\\s*(?:đường thẳng\\s*|cạnh\\s*|đoạn\\s*|tia\\s*)?(${SEG})\\s*lần lượt\\s*(?:tại|ở)\\s*(?:các\\s*điểm\\s*|điểm\\s*)?(${PT})\\s*(?:,|và)\\s*(${PT})(?![\\p{L}A-Z'])`, 'gu'),
    (w: string, a: string, b: string, c: string, p: string, q: string, off: number, all: string) =>
      // "đường tròn đường kính BC cắt AB, AC lần lượt tại F, E": chủ ngữ là đường tròn, để bộ đọc đường tròn xử lý
      /đường tròn|đường kính|nửa đường|\(\s*[A-Z]'?\s*[;,)]|(?:song song|vuông góc|⊥|\/\/)\s*(?:với\s*)?$/u.test(all.slice(Math.max(0, all.lastIndexOf('.', off), all.lastIndexOf(';', off), all.lastIndexOf('\n', off)), off)) ? w : ` ${a} giao ${b} tại ${p}; ${a} giao ${c} tại ${q}`,
  );
  // "Tiếp tuyến tại C cắt tiếp tuyến tại A ở D và cắt AB ở E" → … ở D; Tiếp tuyến tại C cắt AB ở E (chủ ngữ lặp lại để câu sau không mất)
  t = t.replace(new RegExp(`(?<=^|[.;\\n]\\s*)([^.;\\n]*?)\\s+cắt\\s+([^.;\\n]*?(?:tại|ở)\\s*${PT})\\s*,?\\s*và\\s*cắt\\s+(?!(?:đường tròn|nửa đường|\\())`, 'gu'), (w: string, subj: string, first: string) => {
    const s = subj.slice(subj.lastIndexOf(',') + 1).replace(/^\s*(?:Gọi|Cho|Kẻ|Vẽ)\s+/u, '').trim();
    return /^(?:[Đđ]ường tròn|[Nn]ửa đường|\()/u.test(s) || !s ? w : `${subj} cắt ${first}; ${s} cắt `;
  });
  // "đáy ABCD là hình bình hành tâm O" → O là giao điểm hai đường chéo
  t = t.replace(new RegExp(`(hình\\s*(?:vuông|chữ nhật|bình hành|thoi)(?:\\s*(?:${PT}){4})?)\\s*(?:có\\s*)?tâm\\s*(?:là\\s*)?(${PT})(?![\\p{L}A-Z'])`, 'gu'), '$1; $2 là giao điểm hai đường chéo');
  // "I là giao điểm của SC và mặt phẳng (AMN)" → giao điểm của SC với mặt phẳng (AMN) là I
  t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])(${PT})\\s*là\\s*giao điểm\\s*(?:của\\s*)?(?:đường thẳng\\s*)?(${SEG})\\s*(?:và|với)\\s*(?:mặt phẳng\\s*|mp\\s*)?\\(\\s*((?:[A-Z]'?){3,5})\\s*\\)`, 'gu'), 'giao điểm của $2 với mặt phẳng ($3) là $1');
  // "Qua D kẻ đường thẳng song song với AB cắt AC tại E, kẻ đường thẳng song song với AC cắt AB tại F": câu sau cũng đi qua D
  t = t.replace(new RegExp(`([Qq]ua\\s*(?:điểm\\s*)?(${PT})\\s*,?\\s*(?:kẻ|vẽ|dựng)[^.;\\n]*?)\\s*(?:,|và)\\s*(?:kẻ|vẽ|dựng)\\s*(?=(?:đường thẳng\\s*|tia\\s*)?(?:song song|vuông góc))`, 'gu'), '$1; Qua $2 kẻ ');
  // "Chứng minh AH vuông góc với BC tại D" (D chưa có trước đó): D là giao của AH, BC
  t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])(${SEG})\\s*(?:vuông góc|⊥)\\s*(?:với\\s*)?(${SEG})\\s*tại\\s*(?:điểm\\s*)?(${PT})(?![\\p{L}A-Z'])`, 'gu'), (w: string, a: string, b: string, p: string, off: number, all: string) =>
    /chứng minh|cm/iu.test(all.slice(Math.max(0, all.lastIndexOf('.', off), all.lastIndexOf('\n', off)), off)) && !new RegExp(`(?<![\\p{L}'])(?:[A-Z]'?)*${p}(?!')`, 'u').test(all.slice(0, off)) && !a.includes(p) && !b.includes(p) ? `${w}; ${a} giao ${b} tại ${p}` : w,
  );
  // các đường trung tuyến BM, CN cắt nhau tại G (expandLore sẽ đổi "cắt nhau" thành "giao" làm mất chữ "trung tuyến")
  t = t.replace(new RegExp(`(?:các\\s*)?(?:đường\\s*)?trung tuyến\\s*([A-Z]'?[A-Z]'?)\\s*(?:,|và)\\s*([A-Z]'?[A-Z]'?)\\s*cắt nhau\\s*(?:tại|ở)\\s*(?:điểm\\s*)?(${PT})`, 'gu'), 'trung tuyến $1; trung tuyến $2; $3 là trọng tâm');
  // K là điểm đối xứng của/với H qua BC (hoặc qua điểm O)
  t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])(${PT})\\s*(?:là\\s*)?(?:điểm\\s*)?(?:là\\s*)?đối xứng\\s*(?:của|với)\\s*(?:điểm\\s*)?(${PT})\\s*qua`, 'gu'), '$1 đối xứng với $2 qua');
  // D là chân đường phân giác (trong) kẻ từ/của góc A
  t = t.replace(new RegExp(`(${PT})\\s*là\\s*chân\\s*(?:của\\s*)?(?:đường\\s*)?phân giác\\s*(?:trong\\s*|ngoài\\s*)?(?:kẻ từ\\s*|xuất phát từ\\s*|của\\s*|từ\\s*)?(?:góc\\s*)?(${PT})(?![A-Za-z'])`, 'gu'), 'phân giác $2$1');
  // D là giao điểm của phân giác góc A với BC
  t = t.replace(new RegExp(`(${PT})\\s*là\\s*giao điểm\\s*(?:của\\s*)?(?:đường\\s*)?phân giác\\s*(?:trong\\s*)?(?:góc\\s*)?(${PT})\\s*(?:với|và)\\s*(?:cạnh\\s*)?[A-Z]{2}`, 'gu'), 'phân giác $2$1');
  // AD là (đường) phân giác (trong) của góc A
  t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])(${PT})(${PT})\\s*là\\s*(?:đường\\s*)?phân giác\\s*(?:trong\\s*)?(?:của\\s*)?(?:góc\\s*)?${PT}?`, 'gu'), 'phân giác $1$2');
  // AM là (đường) trung tuyến / AH là (đường) cao của tam giác ABC → trung tuyến AM / đường cao AH
  t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])(${PT}${PT})\\s*là\\s*(?:đường\\s*)?(trung tuyến|đường cao|cao)(?![\\p{L}])`, 'gu'), (_w: string, seg: string, kind: string) => `${kind === 'trung tuyến' ? 'trung tuyến' : 'đường cao'} ${seg}`);
  // Tia phân giác của góc BAC cắt BC tại D (và cắt đường tròn (O) tại E) → phân giác AD; AD cắt đường tròn tại E
  t = t.replace(new RegExp(`(?:[Tt]ia\\s*|[Đđ]ường\\s*)?phân giác\\s*(?:trong\\s*)?(?:của\\s*)?góc\\s*(?:[A-Z]'?(${PT})[A-Z]'?|(${PT}))\\s*cắt\\s*(?:cạnh\\s*|đoạn\\s*)?[A-Z]{2}\\s*(?:tại|ở)\\s*(${PT})(?:\\s*(?:,|và)\\s*cắt\\s*đường tròn\\s*(?:\\(\\s*[A-Z]\\s*\\)\\s*)?(?:tại|ở)\\s*(${PT}))?`, 'gu'), (_w: string, v3: string | undefined, v1: string | undefined, d: string, e: string | undefined) => `phân giác ${v3 ?? v1}${d}${e ? `; ${v3 ?? v1}${d} cắt đường tròn tại ${e}` : ''}`);
  // đường tròn tâm A bán kính AH → đường tròn tâm A đi qua H (bán kính theo A, H khi kéo)
  t = t.replace(new RegExp(`đường tròn\\s*(?:\\(\\s*(${PT})\\s*\\)|tâm\\s*(${PT}))\\s*,?\\s*bán kính\\s*(?:=\\s*)?([A-Z]'?[A-Z]'?)(?![A-Za-z'\\d])`, 'gu'), (w: string, o1: string | undefined, o2: string | undefined, seg: string) => {
    const o = o1 ?? o2;
    const rest = seg[0] === o ? seg.slice(1) : seg[seg.length - 1] === o ? seg[0] : '';
    return rest ? `đường tròn tâm ${o} đi qua ${rest}` : w;
  });
  // BM cắt CN tại G (hai đoạn/đường thẳng; không đụng "đường tròn … cắt AB tại D")
  if (!/đường tròn|nửa đường|\(\s*[A-Z]'?\s*[;)]/u.test(t)) t = t.replace(new RegExp(`(?<![\\p{L}A-Z'])([A-Z]'?[A-Z]'?)\\s*cắt\\s*(?:đường thẳng\\s*|cạnh\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:tại|ở)\\s*(${PT})(?![A-Za-z'])`, 'gu'), (w: string, a: string, b: string, o: string, off: number) => {
    const clause = t.slice(Math.max(t.lastIndexOf(';', off), t.lastIndexOf('.', off), t.lastIndexOf('\n', off)) + 1, off);
    // "(qua D kẻ đường) song song với AB cắt AC tại E": AB không phải chủ ngữ của "cắt"
    return /đường tròn|đường kính|nửa đường|\(/u.test(clause) || /(?:song song|vuông góc|⊥|\/\/)\s*(?:với\s*)?$/u.test(clause) ? w : `${a} giao ${b} tại ${o}`;
  });
  return t;
}
