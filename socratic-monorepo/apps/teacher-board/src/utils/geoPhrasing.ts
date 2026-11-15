/**
 * Cách nói thường gặp trong đề hình mà bộ dựng chưa hiểu → viết lại thành câu đơn mà nó đã hiểu (mọi điểm vẫn có công thức, kéo đỉnh thì theo):
 *   "K là điểm đối xứng của H qua BC" · "D là chân đường phân giác trong góc A" · "AD là phân giác góc A" · "BM cắt CN tại G"
 */
const PT = "[A-Z]'?";

export function expandPhrasing(text0: string): string {
  let t = text0;
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
    return /đường tròn|đường kính|nửa đường|\(/u.test(clause) ? w : `${a} giao ${b} tại ${o}`;
  });
  return t;
}
