/**
 * Đề "đường tròn tiếp xúc hai cạnh rồi kẻ tiếp tuyến cắt hai cạnh" (đề HSG / chuyên): viết lại các câu về tiếp xúc, "lần lượt", hình bình hành, đối xứng, giao điểm
 * thành các mệnh đề đơn mà bộ dựng hình hiểu, để MỌI điểm đều có CÔNG THỨC theo điểm gốc và kéo đỉnh thì tính chất giữ nguyên:
 *   - tiếp điểm R, Q = hình chiếu của tâm O lên hai cạnh; đường tròn tâm O đi qua Q (tính lại theo O, Q khi kéo)
 *   - F là điểm trượt trên cạnh chứa tiếp điểm Q; tiếp điểm P của tiếp tuyến thứ hai kẻ từ F = đối xứng của Q qua FO; E = giao của FP với cạnh còn lại
 *   - trực tâm, giao điểm, đối xứng, hình bình hành: viết lại từ dạng "lần lượt" về từng câu một
 */
const PT = "[A-Z]'?";
const key = (s: string) => s.split('').sort().join('');

/** "X, Y lần lượt …" cho từng loại quan hệ → câu riêng cho từng điểm */
export function expandTangentLore(text0: string): string {
  let t = text0;
  // "H, K lần lượt là trực tâm của các tam giác OFB, OEC"
  t = t.replace(new RegExp(`(${PT})\\s*(?:,|và)\\s*(${PT})\\s*lần lượt\\s*là\\s*trực tâm\\s*(?:của\\s*)?(?:các\\s*)?(?:tam giác\\s*)?([A-Z]{3})\\s*(?:,|và)\\s*(?:tam giác\\s*)?([A-Z]{3})`, 'gu'), '$1 là trực tâm tam giác $3; $2 là trực tâm tam giác $4');
  // "Gọi giao điểm của HE, FK với BC lần lượt là M, N"
  t = t.replace(new RegExp(`giao điểm của\\s*([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})\\s*với\\s*([A-Z]{2})\\s*lần lượt\\s*(?:là|tại)\\s*(${PT})\\s*(?:,|và)\\s*(${PT})`, 'gu'), '$4 là giao điểm của $1 và $3; $5 là giao điểm của $2 và $3');
  // "S, T lần lượt đối xứng với Q, R qua đường thẳng BC" (hoặc qua điểm O)
  t = t.replace(new RegExp(`(${PT})\\s*(?:,|và)\\s*(${PT})\\s*lần lượt\\s*đối xứng\\s*(?:với\\s*)?(${PT})\\s*(?:,|và)\\s*(${PT})\\s*qua\\s*(?:đường thẳng\\s*|điểm\\s*)?([A-Z]'?[A-Z]?'?)(?![A-Za-z'])`, 'gu'), '$1 đối xứng với $3 qua $5; $2 đối xứng với $4 qua $5');
  // "Dựng điểm G sao cho tứ giác OHGK là hình bình hành" → "hình bình hành OHGK"
  t = t.replace(/(?:Dựng|Lấy|Vẽ)\s*(?:thêm\s*)?điểm\s*[A-Z]'?\s*sao cho\s*(?:tứ giác\s*)?([A-Z]{4})\s*là\s*hình bình hành/gu, 'hình bình hành $1');
  t = t.replace(/(?:tứ giác\s*)([A-Z]{4})\s*là\s*hình bình hành/gu, 'hình bình hành $1');

  // đường tròn tâm O tiếp xúc với các cạnh CA, AB theo thứ tự tại R, Q
  const tangent = new Map<string, string>();
  let center = '';
  t = t.replace(new RegExp(`đường tròn\\s*(?:tâm\\s*(${PT})|\\(\\s*(${PT})\\s*\\))\\s*tiếp xúc với\\s*(?:các\\s*)?(?:cạnh\\s*)?([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})\\s*(?:theo thứ tự\\s*)?(?:tại|ở)\\s*(?:các điểm\\s*)?(${PT})\\s*(?:,|và)\\s*(${PT})`, 'gu'), (_w, o1: string, o2: string, s1: string, s2: string, p1: string, p2: string) => {
    center = o1 ?? o2;
    tangent.set(key(s1), p1);
    tangent.set(key(s2), p2);
    return `${p1} là hình chiếu của ${center} trên ${s1}; ${p2} là hình chiếu của ${center} trên ${s2}; đường tròn tâm ${center} đi qua ${p2}`;
  });

  // "Trên các cạnh CA, AB lần lượt lấy E, F (…) sao cho EF tiếp xúc với đường tròn tâm O tại P" (+ "và EF không song song với BC")
  if (center) {
    t = t.replace(
      new RegExp(`(?:[Tt]rên)\\s*(?:các\\s*)?cạnh\\s*([A-Z]{2})\\s*(?:,|và)\\s*([A-Z]{2})\\s*lần lượt\\s*lấy\\s*(?:các\\s*)?(?:điểm\\s*)?([A-Z])\\s*(?:,|và)\\s*([A-Z])\\s*(?:\\([^)]*\\)\\s*)?sao cho\\s*\\3\\4\\s*tiếp xúc với\\s*(?:đường tròn\\s*)?(?:tâm\\s*[A-Z]|\\(\\s*[A-Z]\\s*\\))\\s*(?:tại|ở)\\s*(${PT})(?:\\s*(?:,|và)\\s*[A-Z]{2}\\s*không\\s*song song\\s*(?:với\\s*)?[A-Z]{2})?`, 'gu'),
      (w, s1: string, s2: string, e: string, f: string, p: string) => {
        const q = tangent.get(key(s2));
        const r = tangent.get(key(s1));
        // F trượt trên cạnh s2 (có tiếp điểm q); P đối xứng q qua FO; E = giao của FP với cạnh s1
        if (!q || !r) return w;
        return `${f} thuộc cạnh ${s2}; ${p} đối xứng với ${q} qua ${f}${center}; ${e} là giao điểm của ${f}${p} và ${s1}; đoạn ${center}${p}; đoạn ${center}${f}; đoạn ${center}${e}`;
      },
    );
  }
  return t;
}
