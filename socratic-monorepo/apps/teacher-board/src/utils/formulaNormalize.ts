/**
 * Chuẩn hóa chuỗi công thức do nhận dạng chữ viết tay trả về (LaTeX) về dạng bộ định tuyến hiểu:
 * `x^{2}+y^{2}+z^{2}=9.` → `x^2+y^2+z^2=9`, `2NO_{2} \rightleftharpoons N_{2}O_{4}` → `2NO2 ⇌ N2O4`.
 * Bộ định tuyến thử dạng chuẩn hóa trước rồi mới tới nguyên bản, nên chỉ cần giữ ý nghĩa, không cần giữ hình thức.
 */

const SUPERSCRIPTS: Record<string, string> = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'};

export function canonicalFormula(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return s;

  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + [...m].map((c) => SUPERSCRIPTS[c] ?? c).join(''));

  // dấu xuống dòng LaTeX \\ ngăn cách các phương trình: giữ lại dưới dạng ';'
  s = s.replace(/\\\\/g, ' ; ');
  // trang trí LaTeX không mang nghĩa
  s = s.replace(/\\(?:left|right|displaystyle|big|Big|bigg|Bigg)(?![a-zA-Z])\s*/g, '');
  s = s.replace(/\\[,;:!]|\\ |\\quad|\\qquad/g, ' ');
  // \text{...}, \mathrm{...}: lấy phần chữ bên trong
  s = s.replace(/\\(?:text|textrm|mathrm|textbf|mathbf|operatorname)\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');

  // mũi tên và dấu nhân
  s = s.replace(/\\(?:rightleftharpoons|leftrightharpoons|rightleftarrows|leftrightarrow)(?![a-zA-Z])|<=>|<->/g, ' ⇌ ');
  s = s.replace(/\\(?:longrightarrow|rightarrow|to)(?![a-zA-Z])/g, ' -> ');
  s = s.replace(/\\times(?![a-zA-Z])/g, ' × ').replace(/\\infty(?![a-zA-Z])/g, '∞');

  // mũ một ký hiệu: ^{2} → ^2, ^{-1} → ^-1 chỉ khi không phải biểu thức dài
  s = s.replace(/\^\{\s*(-?[A-Za-z0-9]+)\s*\}/g, '^$1');
  // chỉ số hóa học sau ký hiệu nguyên tố/ngoặc: O_{2} → O2, Fe_{2} → Fe2, (NO_3)_2 → (NO3)2
  s = s.replace(/([A-Z][a-z]?|\))_\{?(\d+)\}?/g, '$1$2');
  // chỉ số một ký hiệu: v_{0} → v_0, x_{n} → x_n (x_{n+1} giữ nguyên)
  s = s.replace(/_\{\s*([A-Za-z0-9])\s*\}/g, '_$1');

  // dấu chấm/phẩy cuối câu do nhận dạng thêm vào
  s = s.replace(/[\s.,;]+$/g, '').replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}
