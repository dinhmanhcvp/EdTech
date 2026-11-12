/**
 * Hướng dẫn thí nghiệm chi tiết cho MỌI bài trong phòng thực hành `/lab`: mục tiêu, từng bước (làm gì + vì sao), và kết luận.
 * Hiện ở tab "Hướng dẫn" của bảng điều khiển. Lời giải thích viết theo kiến thức phổ thông và theo đúng mô hình của từng bài;
 * số liệu trong các bài là mô phỏng, không phải số đo thật.
 */
import {SIM_BY_ID} from './sims';
import {OPS, knobParams} from './sims/ops';
import {fmt, type SimSpec} from './sims/types';

export interface ManualStep {
  /** việc cần làm, nói bằng thao tác trên dụng cụ */
  do: string;
  /** vì sao làm vậy / điều sẽ thấy và cách hiểu */
  why: string;
  /** từng động tác theo thứ tự: chụm vào đâu, đưa tay đi đâu, buông khi nào */
  how?: string[];
  /** điều phải nhìn thấy khi làm đúng (để tự kiểm tra trước khi sang bước sau) */
  see?: string;
}
export interface Manual {
  goal: string;
  /** dụng cụ trên bàn, nằm ở đâu và điều khiển bằng động tác nào; bỏ trống thì suy ra từ khai báo thao tác của bài (`toolsOf`) */
  tools?: string[];
  steps: ManualStep[];
  conclude: string;
}
const st = (d: string, why: string, how?: string[], see?: string): ManualStep => ({do: d, why, how, see});

/** Cách dùng tay chung cho mọi bài: đọc một lần trước khi làm. */
export const BASICS: string[] = [
  'Bật camera ở tab Thao tác (nút "Bật camera"). Camera đặt cố định phía trên, nhìn thẳng xuống mặt bàn; hai bàn tay hiện ngay trong phòng thí nghiệm.',
  'Vòng tròn trắng giữa đầu ngón cái và ngón trỏ là con trỏ. Đưa con trỏ tới vật: vòng tròn chuyển cam nghĩa là vật đó cầm được.',
  'CẦM: chụm ngón cái với ngón trỏ. GIỮ: vẫn chụm và di chuyển bàn tay. BUÔNG: tách hai ngón ra.',
  'NGHIÊNG LỌ: cầm lọ (chụm), mang tới trên miệng dụng cụ rồi xoay cổ tay như đang nghiêng lọ; lọ trên màn hình nghiêng theo, nghiêng càng nhiều thì rót càng nhanh, đưa cổ tay thẳng lại là ngừng. Dùng chuột thì chỉ cần giữ lọ trên miệng dụng cụ.',
  'NÚT − / +: giữ ngón tay (không cần chụm) trên nút đỏ − hoặc xanh + để đổi giá trị; giữ lâu thì đổi nhanh dần. Mỗi núm xoay có cặp nút ngay cạnh; các bài thao tác trực tiếp có dải nút ở mép trước bàn.',
  'SỰ CỐ: làm sai như ngoài đời (chập mạch, đấu quá áp, rót nước vào acid đặc, đun chất dễ cháy, đổ hóa chất ra bàn, quá nhiệt, quá tải…) thì thí nghiệm xảy ra hậu quả: tia lửa, cháy, nổ, vũng acid loang, hơi nước nóng, có âm thanh; thẻ đỏ ở góc trên bên trái giải thích chuyện gì xảy ra, ngoài đời sẽ ra sao và cách tránh. Bấm “Đã hiểu” để đóng hoặc “Làm lại thí nghiệm”.',
  'Bấm nút trên bảng bên phải: đưa con trỏ tới nút (nút có viền cam) rồi chụm một lần.',
  'Tay ra sát mép thì mép màn hình sáng vàng: đưa tay vào giữa. Tay bị che dưới nửa giây thì vật đang cầm vẫn được giữ.',
  'Không có camera: dùng chuột (nhấn giữ = chụm, thả = buông) hoặc các thanh trượt ở tab Thao tác.',
];

/** Dụng cụ và cách điều khiển của một bài: lấy phần viết tay nếu có, không thì suy ra từ tham số và khai báo thao tác (`OPS`) của bài. */
export function toolsOf(id: string): string[] {
  const own = MANUAL[id]?.tools;
  if (own) return own;
  const spec = SIM_BY_ID[id];
  if (!spec) return [];
  const range = (p: SimSpec['params'][number]) => `${fmt(p, p.min)} đến ${fmt(p, p.max)}`;
  const ops = OPS[id];
  if (!ops) return [...spec.params.map((p) => `Con trượt "${p.label}" (trên ray ở mép bàn bên trái): chụm vào con trượt màu vàng và kéo dọc ray; khoảng chỉnh ${range(p)}.`), 'Số đo hiện tại của từng đại lượng nằm trên dải ô ở đầu màn hình.'];
  const out = knobParams(spec, ops).map((p, i) => `Núm xoay "${p.label}" (núm thứ ${i + 1} từ trái sang, hàng núm phía trước): chụm vào núm rồi đưa tay vòng quanh núm để xoay; hoặc đặt ngón tay lên nút tròn đỏ "−" / xanh "+" ngay trước núm và giữ (giữ lâu đổi nhanh dần). Khoảng chỉnh ${range(p)}.`);
  for (const g of ops.picks) out.push(`Khay "${g.title}" (hàng vật ở mép bàn gần bạn): gồm ${g.options.map((o) => o.label).join(', ')}. Chụm để cầm một vật, đưa tới vòng vàng "Ổ lắp: ${g.title}" ngay phía trên khay rồi buông; buông ngoài ổ thì vật về khay.`);
  const acts = ops.actions ?? [];
  const start = acts.find((a) => a.id === 'start');
  const stop = acts.find((a) => a.id === 'stop');
  if (start && stop) out.push(`Công tắc dao (bên phải bàn): chụm vào đầu cần gạt màu cam, gạt sang phải để "${start.label}", gạt về trái để "${stop.label}"; đèn báo sáng xanh khi công tắc đang đóng.`);
  for (const a of acts) if (!(start && stop) || (a !== start && a !== stop)) out.push(`Cần "${a.label}" (bên phải bàn): chụm vào tay nắm, kéo về bên trái cho dây cao su giãn rồi buông tay.`);
  out.push('Số đo hiện tại của từng đại lượng nằm trên dải ô ở đầu màn hình; dòng chữ ở góc dưới bên trái mô tả điều đang xảy ra.');
  return out;
}

export const MANUAL: Record<string, Manual> = {
  // ------------------------------------------------------------------ Vật lí
  balance: {
    goal: 'Xác định chiều của lực từ lên dây dẫn mang dòng điện và đo cảm ứng từ B của nam châm điện bằng cân dòng điện.',
    tools: [
      'Cân dòng điện ở giữa bàn: đòn cân, khung dây 200 vòng treo ở đầu phải, nam châm điện ở hai bên, lực kế ở đầu trái và kính lúp phóng đại phần khung dây.',
      'Bàn điều khiển (phía trước): công tắc K ở giữa (gạt để đóng hoặc ngắt dòng), hai công tắc "Đảo chiều" ở hai bên (dòng qua khung và dòng qua nam châm), hai núm biến trở (dòng khung và dòng nam châm) và cuốn sổ ghi số đo.',
      'Chọn thí nghiệm ở đầu bảng bên phải: thí nghiệm 1 xác định chiều lực, thí nghiệm 2 đo B. Có nút "Làm lại" và nút xem mẫu từng bước.',
      'Mọi công tắc, núm biến trở và cuốn sổ đều có nút tương ứng ở tab Thao tác để dùng khi chưa có camera.',
    ],
    steps: [
      st('Quan sát bố trí: khung dây 200 vòng treo ở đầu phải đòn cân, cạnh đáy nằm ngang trong khe nam châm; đầu trái móc vào lực kế.', 'Chỉ cạnh đáy nằm trong từ trường nên lực từ lên khung chính là lực lên cạnh này; đòn cân truyền lực đó sang lực kế để đọc.', ['Chưa chạm vào gì, nhìn kính lúp ở phía trên để thấy cạnh đáy khung giữa hai cực nam châm.', 'Nhìn đầu trái đòn cân móc vào lực kế.'], 'Đòn cân nằm ngang; công tắc K còn mở.'),
      st('Khi công tắc K còn mở, đọc số chỉ ban đầu của lực kế (0,100 N).', 'Lực kế được căng sẵn để đo được cả lực hướng lên lẫn hướng xuống. Lực từ = số chỉ lúc có dòng trừ số chỉ ban đầu.', ['Nhìn kim và thang đọc của lực kế.', 'Ghi số chỉ ban đầu.'], 'Lực kế chỉ 0,100 N.'),
      st('Đóng công tắc K, nhìn đòn cân và kính lúp.', 'Có dòng qua khung thì cạnh đáy chịu lực từ F = N·B·I·L. Đòn cân dao động vài nhịp rồi dừng ở vị trí cân bằng mới.', ['Chụm vào cần công tắc K ở giữa bàn điều khiển và gạt sang vị trí đóng.', 'Chờ vài giây cho đòn cân dừng, rồi đọc lực kế.'], 'Đòn cân nghiêng và dao động vài nhịp rồi dừng; số chỉ lực kế đổi khác 0,100 N; có mũi tên lực ở kính lúp.'),
      st('Lần lượt gạt hai công tắc "Đảo chiều".', 'Mỗi lần đảo chiều I hoặc B thì lực đổi chiều; đảo cả hai thì lực giữ nguyên. Kiểm tra bằng quy tắc bàn tay trái trong kính lúp.', ['Gạt công tắc "Đảo chiều" bên phải (dòng qua khung); đọc lực kế.', 'Gạt lại về vị trí cũ rồi gạt công tắc "Đảo chiều" bên trái (dòng qua nam châm); đọc lực kế.', 'Gạt cả hai cùng lúc và đọc lại.'], 'Một công tắc đảo: lực đổi chiều (số chỉ lực kế nằm bên kia 0,100 N). Cả hai cùng đảo: lực trở về như ban đầu.'),
      st('Chọn thí nghiệm 2 và đo F theo I.', 'F tỉ lệ thuận với I khi B không đổi. Đo nhiều điểm rồi lấy độ dốc đường F theo I sẽ chính xác hơn một điểm, vì lực kế chỉ chia tới 0,005 N.', ['Chọn "thí nghiệm 2" ở bảng. Giữ núm biến trở nam châm cố định.', 'Chụm vào núm biến trở khung và xoay, hoặc giữ nút "+" / "−" cạnh núm, tới dòng khoảng 0,2 A; chờ cân đứng yên.', 'Chụm vào cuốn sổ để ghi. Lặp lại với 0,4 · 0,6 · 0,8 A.'], 'Mỗi lần ghi, cuốn sổ có thêm một dòng (I, F); các điểm nằm gần một đường thẳng đi qua gốc.'),
      st('Đọc B ở ô kết quả: B = (độ dốc F/I) / (N·L) với N = 200, L = 8 cm.', 'Từ F = N·B·I·L suy ra F/I = N·B·L. Đây chính là cách định nghĩa cảm ứng từ: lực trên một đơn vị dòng điện và chiều dài.', ['Nhìn ô kết quả sau khi đã ghi đủ điểm.', 'Tự kiểm tra lại: lấy hai điểm bất kì trong sổ, chia F cho I rồi chia tiếp cho N·L.'], 'Ô kết quả hiện B ước lượng từ độ dốc; hai cách tính cho kết quả gần nhau.'),
      st('Tăng biến trở nam châm rồi đo lại; thử cho cả hai dòng thật lớn.', 'B của nam châm điện tăng theo dòng qua nó nên độ dốc F/I tăng. Dòng quá lớn làm lực vượt thang 0,5 N của lực kế: số đọc khi đó không dùng được.', ['Xoay núm biến trở nam châm lên một nấc, đo lại hai ba điểm.', 'Tăng cả hai dòng thật lớn và nhìn lực kế.'], 'Độ dốc F/I lớn hơn; khi dòng quá lớn lực kế chạm thang tối đa và báo vượt thang.'),
    ],
    conclude: 'Lực từ lên dây dẫn vuông góc với cả dòng điện và từ trường, có độ lớn F = B·I·L cho mỗi vòng dây. Đo F theo I cho ra B.',
  },
  collision: {
    goal: 'Kiểm chứng định luật bảo toàn động lượng và xem động năng thay đổi thế nào theo loại va chạm.',
    tools: [
      'Băng đệm khí (giữa bàn): hai xe trượt, xe 1 màu xanh bên trái tì vào lò xo bắn, xe 2 màu cam đứng giữa băng.',
      'Giá quả cân (phía trước, bên trái): các quả cân đĩa 100 g. Chụm vào một quả để cầm, đưa tới trên xe rồi buông; mỗi xe chở tối đa 4 quả. Muốn bớt thì chụm vào quả cân trên xe, đưa ra ngoài rồi buông.',
      'Ba miếng đệm (phía trước, bên phải): đất sét (e = 0), cao su (e = 0,5), lò xo thép (e = 1). Cầm một miếng đưa tới xe rồi buông để gắn vào đầu xe 2.',
      'Đuôi xe 1 (đầu sát lò xo): chụm vào đây và kéo sang trái để nén lò xo; nén càng sâu thì vận tốc bắn càng lớn (0,2 đến 1,0 m/s). Buông tay thì xe được chốt giữ.',
      'Nút thả xe (góc trái phía trước): xanh = bấm để thả xe; sau khi chạy xong nút chuyển đỏ = bấm để đưa xe về vạch.',
      'Hai cổng quang điện bắc ngang băng: nhãn phía trên hiện vận tốc xe vừa đi qua và chiều đi.',
    ],
    steps: [
      st('Chuẩn bị va chạm đàn hồi với hai xe bằng nhau.', 'Đệm lò xo thép cho va chạm gần đàn hồi hoàn toàn (e = 1): cơ năng không bị mất vào biến dạng.', ['Nhìn nhãn trên hai xe: mỗi xe đang 0,2 kg (thân xe 0,1 kg và một quả cân).', 'Chụm vào miếng đệm "Lò xo thép" ở phía trước bên phải, đưa tới xe 2 rồi buông tay.', 'Kiểm tra dòng chữ cuối màn hình: "đệm lò xo thép (e = 1)".'], 'Miếng đệm màu bạc bay tới gắn vào đầu xe 2, phía quay về xe 1.'),
      st('Chọn vận tốc bắn rồi thả xe.', 'Băng đệm khí khử ma sát nên trong lúc va chạm hệ hai xe gần như kín: tổng động lượng trước và sau bằng nhau.', ['Chụm vào đuôi xe 1 (đầu sát lò xo), kéo sang trái tới khi nhãn báo v₁ khoảng 0,60 m/s, rồi buông tay.', 'Bấm nút xanh "Bấm: thả xe" ở góc trái phía trước.', 'Theo dõi nhãn "Cổng 1" (vận tốc xe 1 trước va chạm) và "Cổng 2" (vận tốc xe 2 sau va chạm).'], 'Xe 1 lao tới, chạm xe 2 rồi DỪNG HẲN; xe 2 chạy đi với đúng vận tốc cũ của xe 1 và dừng ở cuối băng.'),
      st('Đọc kết quả và kiểm tra hai định luật.', 'Hai xe bằng nhau va chạm đàn hồi thì "đổi vận tốc" cho nhau: cả động lượng lẫn động năng đều bảo toàn.', ['Đọc hai dòng chữ cuối màn hình: v₁′, v₂′, phần động năng mất và hai giá trị động lượng trước / sau.', 'So sánh: động lượng trước = sau; động năng mất 0 %.', 'Bấm nút (đã chuyển đỏ) để đưa hai xe về vạch.'], 'v₁′ = 0,00 m/s, v₂′ = 0,60 m/s; động năng mất 0 %.'),
      st('Làm lại với va chạm mềm.', 'Va chạm mềm (e = 0): hai xe dính nhau. Động lượng vẫn bảo toàn nhưng động năng mất (1 − e²)·m₂/(m₁ + m₂), biến thành nhiệt và biến dạng.', ['Cầm miếng "Đất sét" gắn vào xe 2 (miếng lò xo tự về chỗ cũ).', 'Bấm nút xanh để thả xe với cùng vận tốc.', 'Đọc lại kết quả ở cuối màn hình.'], 'Hai xe dính nhau đi cùng vận tốc 0,30 m/s; động năng mất 50 % nhưng động lượng trước và sau vẫn bằng nhau.'),
      st('Đổi khối lượng: xe nhẹ đâm xe nặng, rồi xe nặng đâm xe nhẹ.', 'Tỉ số khối lượng quyết định xe 1 bật lại, dừng hay đi tiếp; trong mọi trường hợp m₁v₁ = m₁v₁′ + m₂v₂′.', ['Gắn lại đệm lò xo thép. Cầm thêm hai quả cân ở giá đặt lên xe 2 (xe 2 thành 0,4 kg), thả xe và quan sát.', 'Đưa xe về vạch. Chuyển hai quả cân đó sang xe 1 (chụm vào quả cân trên xe 2, đưa sang xe 1 rồi buông), thả xe lần nữa.'], 'Xe nhẹ đâm xe nặng: xe 1 bật ngược lại (cổng 1 hiện mũi tên ←). Xe nặng đâm xe nhẹ: cả hai cùng đi tới, xe 2 nhanh hơn.'),
    ],
    conclude: 'Động lượng luôn bảo toàn khi không có ngoại lực; động năng chỉ bảo toàn trong va chạm đàn hồi.',
  },
  thomson: {
    goal: 'Đo tỉ số điện tích trên khối lượng e/m của electron như J. J. Thomson.',
    steps: [
      st('Đặt điện áp gia tốc và hiệu điện thế hai bản, để dòng cuộn dây bằng 0.', 'Electron được gia tốc tới vận tốc v với eU = ½mv². Điện trường giữa hai bản kéo chùm tia lệch về một phía.', ['Nhìn hàng núm phía trước: từ trái sang là "Hiệu điện thế hai bản" (U), "Dòng điện cuộn dây" (I), "Điện áp gia tốc" (Ua).', 'Giữ U = 200 V, Ua = 3000 V, I = 0 A (đây cũng là giá trị ban đầu).', 'Đọc dòng chữ cuối màn hình.'], 'Chùm tia lệch khoảng 10,7 mm về phía lực điện; từ trường B = 0.'),
      st('Tăng dòng điện cuộn Helmholtz.', 'Cuộn dây tạo từ trường đều vuông góc với chùm tia; lực từ evB ngược chiều lực điện eE nên chùm tia bị kéo trở lại.', ['Đặt ngón tay lên nút "+" tròn xanh ngay trước núm "Dòng điện cuộn dây" và giữ (giữ lâu thì đổi nhanh dần); hoặc chụm vào núm rồi đưa tay vòng quanh núm.', 'Nhả tay khi I khoảng 0,5 A rồi xem độ lệch.'], 'Độ lệch nhỏ dần; ở I = 1 A tia đã bị kéo quá tay, lệch khoảng 2,8 mm sang phía lực từ.'),
      st('Chỉnh tinh tới khi chùm tia đi thẳng.', 'Khi đó eE = evB nên v = E/B: ta biết vận tốc mà không cần biết e hay m.', ['Đặt ngón tay lên nút "−" hoặc "+" của núm dòng điện, giữ thật ngắn rồi nhả; lặp lại từng nhịp nhỏ.', 'Dừng khi dòng chữ báo độ lệch dưới 0,5 mm (I khoảng 0,79 A).'], 'Dòng chữ báo "Chùm tia đi thẳng"; B khoảng 0,62 mT; v = 3,25·10⁷ m/s.'),
      st('Đọc e/m rồi đổi điện áp gia tốc và cân bằng lại.', 'Thay v = E/B vào eU = ½mv² được e/m = E²/(2U·B²) ≈ 1,76·10¹¹ C/kg, không đổi với mọi điện áp: mọi electron giống hệt nhau.', ['Đọc e/m ở cuối màn hình và ô kết quả ở tab Thao tác.', 'Chỉnh núm "Điện áp gia tốc" lên 4000 V: tia lệch lại.', 'Chỉnh dòng I về khoảng 0,68 A cho tia đi thẳng và đọc lại e/m.'], 'e/m vẫn khoảng 1,76·10¹¹ C/kg dù Ua đổi; dòng cân bằng giảm vì electron nhanh hơn thì cần từ trường nhỏ hơn.'),
    ],
    conclude: 'Cân bằng lực điện và lực từ cho phép đo vận tốc, từ đó suy ra e/m của electron.',
  },
  eddy: {
    goal: 'Thấy dòng điện xoáy Foucault hãm chuyển động của nam châm và điều gì quyết định lực hãm.',
    steps: [
      st('Lắp ống đồng, thành dày, không xẻ rãnh rồi thả nam châm.', 'Nam châm rơi làm từ thông qua từng vòng của thành ống biến thiên, sinh dòng điện xoáy. Theo định luật Lenz dòng này chống lại chuyển động.', ['Chụm vào vật "Đồng" ở khay "Vật liệu ống", đưa tới vòng vàng "Ổ lắp: Vật liệu ống" rồi buông.', 'Làm tương tự: "3" ở khay bề dày thành (mm), "Nguyên" ở khay "Rãnh xẻ dọc".', 'Nam châm tự rơi khi ống đã lắp; đọc thời gian rơi 1 m ở cuối màn hình.'], 'Nam châm trôi xuống rất chậm, mất khoảng 15 giây; vận tốc giới hạn khoảng 6,6 cm/s; ô kết quả báo "Đạt".'),
      st('Đổi sang ống nhôm, thép, chì có cùng bề dày.', 'Kim loại dẫn điện kém hơn cho dòng xoáy yếu hơn nên lực hãm nhỏ hơn, nam châm rơi nhanh hơn.', ['Đặt bề dày 1 mm. Lắp ống "Nhôm", đọc thời gian rơi.', 'Lắp ống "Chì" (hoặc "Thép"), đọc lại.'], 'Nhôm 1 mm: khoảng 3 giây. Chì 1 mm: khoảng 0,6 giây, gần như rơi tự do.'),
      st('Đổi bề dày thành ống.', 'Thành dày cho dòng xoáy chạy qua tiết diện lớn hơn (điện trở nhỏ hơn) nên hãm mạnh hơn.', ['Lắp ống "Đồng", lần lượt lắp bề dày 0,5, 1, 2, 3, 5 mm.', 'Ghi thời gian rơi sau mỗi lần.'], 'Thành càng dày thì nam châm càng rơi chậm.'),
      st('Lắp ống xẻ rãnh dọc.', 'Rãnh cắt đứt đường đi khép kín của dòng xoáy quanh ống: gần như không còn lực hãm, nam châm rơi gần như tự do.', ['Lắp ống "Đồng" 3 mm, khay "Rãnh xẻ dọc" chọn "Xẻ hết".', 'Thử thêm "Xẻ nửa" và so sánh.'], 'Xẻ hết: thời gian rơi chỉ còn khoảng 0,45 giây dù là ống đồng dày; xẻ nửa: nằm giữa hai mức.'),
    ],
    conclude: 'Lực hãm từ tỉ lệ với độ dẫn điện, bề dày và vận tốc; nam châm nhanh chóng đạt vận tốc giới hạn. Đây là nguyên lí phanh từ của tàu cao tốc.',
  },
  photo: {
    goal: 'Kiểm chứng phương trình Einstein về hiệu ứng quang điện và đo hằng số Planck.',
    steps: [
      st('Lắp tấm catot Cs và đèn tím; để điện áp hãm bằng 0.', 'Photon tím có năng lượng hf lớn hơn công thoát A của Cs nên electron bật ra, có dòng quang điện.', ['Chụm vào vật "Cs" ở khay "Tấm catot", đưa tới "Ổ lắp: Tấm catot" rồi buông.', 'Chụm vào vật "Tím" ở khay "Đèn chiếu", đưa tới "Ổ lắp: Đèn chiếu" rồi buông.', 'Kiểm tra núm "Điện áp hãm" đang ở 0 V.'], 'Đèn sáng tím; dòng quang điện còn 100 %; năng lượng photon hf khoảng 3,10 eV.'),
      st('Tăng điện áp hãm tới khi dòng vừa về 0.', 'Điện áp hãm đẩy electron quay lại catot. Dòng tắt khi e·U_h bằng động năng cực đại: e·U_h = hf − A.', ['Giữ ngón tay trên nút "+" của núm "Điện áp hãm" và theo dõi dòng chữ "Dòng quang điện còn … %".', 'Khi gần tới 0 thì nhả tay và chỉnh từng nhịp ngắn bằng nút "+" / "−".', 'Ghi U_h khi dòng đúng bằng 0.'], 'Dòng tắt ở U_h khoảng 1,15 V (= 3,10 − 1,95).'),
      st('Đổi sang đèn lam, lục, vàng rồi lặp lại.', 'Tần số thấp hơn cho U_h nhỏ hơn. U_h theo f là đường thẳng có độ dốc h/e: từ đó tính ra h.', ['Chụm vào vật "Lam" đặt vào ổ đèn, tìm lại U_h; làm tiếp với "Lục", "Vàng".', 'Ghi bốn cặp (f, U_h). Đèn có f: Vàng 5,2 · Lục 5,7 · Lam 6,5 · Tím 7,5 (đơn vị 10¹⁴ Hz).'], 'U_h lần lượt khoảng 0,20 · 0,41 · 0,74 · 1,15 V: các điểm nằm trên một đường thẳng, mỗi 10¹⁴ Hz tăng thêm 0,41 V (h/e).'),
      st('Thử đèn đỏ, hoặc đổi catot sang Zn hay Cu.', 'Khi hf < A không electron nào bật ra dù ánh sáng mạnh đến đâu: ánh sáng trao năng lượng theo từng photon, không cộng dồn.', ['Lắp đèn "Đỏ" với catot "Cs" và đọc dòng chữ cuối màn hình.', 'Lắp catot "Zn" rồi thử "Tím", sau đó thử "UV".'], 'Đèn đỏ với Cs: "Không có electron bật ra: tần số dưới giới hạn quang điện" (f₀ = 4,72·10¹⁴ Hz). Zn có A = 4,3 eV nên cả đèn tím (3,10 eV) và UV (4,14 eV) đều không đủ.'),
    ],
    conclude: 'Năng lượng ánh sáng đến theo từng lượng tử hf. Có tần số giới hạn f₀ = A/h, và h đo được từ độ dốc U_h theo f.',
  },
  rutherford: {
    goal: 'Hiểu vì sao thí nghiệm tán xạ hạt α dẫn tới mẫu nguyên tử có hạt nhân.',
    steps: [
      st('Lắp lá vàng (Au), để tham số va chạm b lớn rồi quan sát quỹ đạo.', 'Hạt bay xa hạt nhân chỉ chịu lực đẩy Coulomb rất yếu nên gần như đi thẳng: nguyên tử hầu hết là khoảng trống.', ['Chụm vào vật "Au" ở khay "Lá kim loại", đưa tới "Ổ lắp: Lá kim loại" rồi buông.', 'Hàng núm phía trước từ trái sang: "Động năng hạt α", "Tham số va chạm b". Để động năng 5 MeV, b khoảng 300 fm.', 'Đọc góc lệch ở cuối màn hình.'], 'Hạt α gần như đi thẳng, chỉ lệch khoảng 8,7°.'),
      st('Giảm dần b.', 'Càng bay sát hạt nhân lực đẩy càng mạnh, góc lệch θ tăng theo tan(θ/2) = d/(2b), với d là khoảng cách gần nhất khi bắn trực diện.', ['Giữ ngón tay trên nút "−" của núm "Tham số va chạm b" (thang đo chia theo logarit nên mỗi nhịp đổi nhiều ở giá trị lớn).', 'Dừng ở b khoảng 100 fm và đọc góc lệch.'], 'Góc lệch tăng lên khoảng 25,6°.'),
      st('Giảm b tới khi hạt bật ngược (θ > 90°).', 'Chỉ xảy ra khi b < d/2, cỡ vài chục fm, trong khi nguyên tử rộng 100 000 fm. Vì thế chỉ khoảng một trên vài chục nghìn hạt bật ngược.', ['Tiếp tục giữ nút "−" tới b khoảng 10 fm.', 'Đọc dòng chữ cuối màn hình về khoảng cách gần nhất d và tỉ lệ hạt bật ngược.'], 'Hạt bật ngược, lệch khoảng 133°; d = 45,5 fm; ước tính một trên khoảng 26 000 hạt bật ngược. Ô kết quả báo "Đạt".'),
      st('Đổi lá kim loại sang Al, hoặc tăng động năng hạt α.', 'Điện tích hạt nhân nhỏ hơn hoặc hạt nhanh hơn thì bị lệch ít hơn: lực là lực Coulomb giữa hai điện tích dương.', ['Giữ b = 10 fm. Chụm vào vật "Al" đặt vào ổ lá kim loại và so góc lệch.', 'Đặt lại "Au", tăng núm "Động năng hạt α" lên 10 MeV và so lại.'], 'Nhôm (Z = 13): chỉ lệch khoảng 41° và d chỉ còn 7,5 fm. Tăng động năng thì hạt tiến sát hạt nhân hơn nên d giảm.'),
    ],
    conclude: 'Điện tích dương và gần hết khối lượng nguyên tử dồn vào một hạt nhân rất nhỏ ở tâm.',
  },
  optics: {
    goal: 'Dùng định luật phản xạ để dẫn tia laser vòng qua vật cản vào đúng trục đầu thu.',
    tools: [
      'Nguồn laser (bên trái) bắn tia ngang; vách đen chắn đường thẳng; đầu thu là một ống ở bên phải, chỉ nhận tia đi gần song song với trục ống.',
      'Ba gương phẳng nằm sẵn ở phía trước bàn (Gương 1, 2, 3). Chụm vào THÂN gương để dời gương tới chỗ khác trên bàn.',
      'Núm vàng ở đầu mỗi gương: chụm vào núm rồi đưa tay vòng quanh gương để xoay góc gương. Gương xoay góc α thì tia phản xạ quay 2α nên phải xoay nhẹ tay.',
      'Bảng bên phải: mỗi gương có bốn nút xoay −1°, −0,1°, +0,1°, +1° để chỉnh tinh; nút "Xếp mẫu 3 gương" xem đáp án mẫu; nút "Làm lại" trả ba gương về vị trí đầu.',
    ],
    steps: [
      st('Xác định đường tia từ laser và vị trí vách đen chắn đường thẳng tới đầu thu.', 'Ánh sáng truyền thẳng nên muốn tới đầu thu phải đổi hướng tia bằng gương.', ['Nhìn tia laser đi thẳng từ nguồn tới vách đen.', 'Nhìn vị trí và hướng miệng ống của đầu thu, nghĩ xem tia phải đi theo đường gấp khúc nào.', 'Đọc dòng "Tia chưa tới đầu thu" ở bảng.'], 'Tia dừng ở vách đen; chưa gương nào được chạm (nhãn "tia chưa chạm").'),
      st('Đặt gương thứ nhất vào đường tia.', 'Tại gương, góc phản xạ bằng góc tới (đo so với pháp tuyến của gương).', ['Chụm vào thân gương 1, kéo ra giữa đường tia (phía trước vách) rồi buông.', 'Nhìn nhãn "góc tới" của gương 1 ở bảng: số xuất hiện nghĩa là tia đã chạm gương.'], 'Tia gãy khúc tại gương 1 và đi theo hướng mới; bảng ghi "Gương 1: góc tới …°".'),
      st('Xoay gương để tia phản xạ đi tới gương kế tiếp.', 'Xoay gương một góc α thì tia phản xạ quay 2α: phải xoay rất nhẹ tay.', ['Chụm vào núm vàng ở đầu gương 1.', 'Đưa tay vòng quanh gương từ từ cho tới khi tia nhắm vào vị trí định đặt gương 2; buông tay.', 'Chụm vào thân gương 2, kéo tới đúng điểm tia đang chiếu rồi buông.'], 'Tia phản xạ lần hai tại gương 2; bảng ghi "tia phản xạ 2 lần".'),
      st('Đặt gương cuối để tia vào miệng ống thu rồi chỉnh tinh.', 'Đầu thu chỉ nhận tia đi gần song song với trục ống, giống ghép tia vào sợi quang.', ['Dời gương cuối tới chỗ tia chiếu tới và xoay bằng núm vàng sao cho tia hướng vào miệng ống.', 'Mở tab Thao tác, bấm các nút ±0,1° của gương cuối cho tới khi dòng trạng thái báo lệch trục dưới 6°.', 'Muốn thử thách: chỉ dùng hai gương, đưa gương còn lại ra ngoài đường tia.'], 'Dòng trạng thái đổi sang "Đạt với … gương: đầu thu nhận đủ tín hiệu"; tia sáng bừng ở miệng ống.'),
    ],
    conclude: 'Hai gương là đủ để chỉnh cả vị trí lẫn hướng của một tia: đây là cách căn chỉnh quang học trong phòng thí nghiệm thật.',
  },
  shock: {
    goal: 'Quan sát sóng xung kích xuất hiện khi dòng khí vượt tốc độ âm thanh.',
    steps: [
      st('Lắp mũi nêm nhọn và để số Mach dưới 1.', 'Dưới âm, nhiễu áp suất truyền ngược dòng được nên dòng khí "biết trước" vật cản và uốn êm quanh nó.', ['Chụm vào vật "15°" ở khay "Mũi nêm", đưa tới "Ổ lắp: Mũi nêm" rồi buông.', 'Núm "Số Mach" đang ở 0,8 (giá trị ban đầu).', 'Đọc dòng chữ cuối màn hình.'], 'Dòng chữ báo "Dưới âm: chưa có sóng xung kích"; không có đường sóng nào trên hình.'),
      st('Tăng số Mach lên trên 1.', 'Nhiễu không còn chạy kịp lên phía trước, dồn lại thành mặt sóng xiên bám vào mũi nêm; góc Mach μ = arcsin(1/M).', ['Đặt ngón tay lên nút "+" của núm "Số Mach" và giữ cho tới khi M khoảng 2.', 'Nhả tay, đọc góc sóng và áp suất.'], 'Xuất hiện sóng xiên khoảng 45° với áp suất sau sóng gấp khoảng 2,2 lần; góc Mach μ = 30°.'),
      st('Tăng tiếp tới Mach 3 và đọc tỉ số áp suất.', 'Sóng nghiêng sát vào thân hơn, áp suất sau sóng tăng vọt theo p₂/p₁ = 1 + 2γ/(γ + 1)·(M²sin²β − 1).', ['Giữ nút "+" tới M khoảng 3, nhả tay.', 'So góc sóng và tỉ số áp suất với bước trước.'], 'Sóng xiên nghiêng còn khoảng 32° (sát mũi hơn); áp suất tăng lên khoảng 2,8 lần.'),
      st('Lắp mũi nêm tù (35°, 45°).', 'Mỗi số Mach chỉ bẻ được dòng tới một góc tối đa. Vượt quá thì sóng tách khỏi mũi thành sóng cung, lực cản và nhiệt tăng mạnh.', ['Giữ Mach = 3. Chụm vào vật "25°" đặt vào ổ mũi nêm và đọc kết quả.', 'Đặt tiếp "45°".'], 'Mũi 45° ở Mach 3: dòng chữ báo "Sóng TÁCH khỏi mũi (sóng cung): mũi quá tù so với số Mach này"; sóng cung nằm phía trước mũi.'),
    ],
    conclude: 'Trên Mach 1 khí bị nén đột ngột qua sóng xung kích; hình dạng mũi quyết định sóng bám hay tách.',
  },
  matterwave: {
    goal: 'Thấy phân tử lớn C₆₀ cũng giao thoa như sóng và vì sao va chạm làm mất giao thoa.',
    steps: [
      st('Hạ áp suất khí dư xuống thấp rồi chờ vài trăm phân tử rơi lên màn.', 'Từng phân tử rơi ở một chỗ ngẫu nhiên, nhưng gộp lại thành vân sáng tối: mỗi phân tử đi qua nhiều khe như một sóng.', ['Hàng núm phía trước từ trái sang: "Nhiệt độ lò", "Áp suất khí dư". Giá trị ban đầu của áp suất là cao nhất (10⁻⁶ mbar): chưa thấy vân.', 'Giữ ngón tay trên nút "−" của núm "Áp suất khí dư" tới khoảng 10⁻⁸ mbar rồi nhả.', 'Chờ khoảng 10 giây, nhìn màn đầu dò ở bên phải (nhìn từ trên).'], 'Các chấm xanh rơi dần lên màn và tập trung thành các vạch song song sáng tối xen kẽ; độ tương phản khoảng 78 %.'),
      st('Tăng nhiệt độ lò.', 'Phân tử nhanh hơn có bước sóng de Broglie λ = h/(mv) ngắn hơn nên các vân sít lại.', ['Giữ nút "+" của núm "Nhiệt độ lò" tới khoảng 1100 K, nhả tay.', 'Chờ màn thu lại (đổi thông số thì màn bị xóa) và so khoảng cách giữa hai vân.'], 'λ giảm từ 3,41 pm xuống 3,08 pm; khoảng cách vân thu lại từ 42,6 µm còn 38,5 µm.'),
      st('Lắp phân tử nặng hơn (C₇₀, C₈₄).', 'Khối lượng lớn hơn cũng làm λ ngắn lại: vật càng nặng tính sóng càng khó thấy.', ['Chụm vào vật "C₈₄" ở khay "Phân tử", đưa tới "Ổ lắp: Phân tử" rồi buông.', 'Đặt lại nhiệt độ lò 900 K, chờ màn thu lại.'], 'λ còn khoảng 2,88 pm; vân sít hơn nữa (khoảng cách vân 36 µm).'),
      st('Tăng dần áp suất khí dư.', 'Mỗi va chạm với phân tử khí để lộ đường đi của C₆₀ (một phép "đo"), làm mất kết hợp: vân mờ dần thành vệt đều.', ['Giữ nút "+" của núm "Áp suất khí dư" từ 10⁻⁸ lên 10⁻⁶ mbar.', 'Chờ màn thu lại và nhìn độ rõ của vân.'], 'Vân mờ dần; ở 10⁻⁶ mbar độ tương phản về 0 % và dòng chữ báo "Khí dư làm phân tử mất kết hợp".'),
    ],
    conclude: 'Mọi vật chất đều có tính sóng; ta không thấy ở vật lớn vì λ quá nhỏ và vì môi trường liên tục làm mất kết hợp.',
  },
  ligo: {
    goal: 'Tìm tín hiệu sóng hấp dẫn chìm trong nhiễu bằng phương pháp lọc khớp mẫu.',
    steps: [
      st('Nhìn dải dữ liệu trên cùng khi chưa chỉnh gì.', 'Tín hiệu yếu hơn nhiễu nên mắt thường không thấy được.', ['Nhìn ba dải trên mặt bàn: trên cùng là dữ liệu cảm biến, giữa là dạng sóng mẫu, dưới cùng là đầu ra bộ lọc.', 'Đọc dòng chữ cuối màn hình: giá trị ρ và ngưỡng 8.'], 'Dải dữ liệu chỉ là đường ngoằn ngoèo nhiễu; đầu ra bộ lọc thấp hơn đường ngưỡng đỏ (ρ nhỏ hơn 8).'),
      st('Chỉnh khối lượng hai lỗ đen để đổi dạng sóng mẫu.', 'Hai lỗ đen quay quanh nhau càng lúc càng nhanh trước khi sáp nhập; tần số tăng dần ("chirp") phụ thuộc khối lượng.', ['Hàng núm phía trước từ trái sang: "Khối lượng lỗ đen 1", "Khối lượng lỗ đen 2", "Mức nhiễu".', 'Giữ nút "+" của núm lỗ đen 1 tới khoảng 36 M☉, rồi núm lỗ đen 2 tới khoảng 29 M☉.', 'Quan sát dải giữa (sóng mẫu) đổi dạng và đỉnh ở dải dưới.'], 'Dải sóng mẫu có dạng "chirp" dao động nhanh dần rồi tắt; đỉnh của đầu ra bộ lọc cao lên.'),
      st('Chỉnh tới khi đỉnh đầu ra vượt ngưỡng ρ = 8.', 'Nhân dữ liệu với mẫu rồi cộng dồn: nhiễu ngẫu nhiên tự triệt tiêu, còn tín hiệu khớp mẫu thì cộng lên thành đỉnh.', ['Hạ núm "Mức nhiễu" xuống khoảng 1,5 bằng nút "−".', 'Chỉnh tinh hai núm khối lượng (từng nhịp ngắn) cho tới khi dòng chữ đổi.'], 'Dòng chữ báo "Phát hiện: ρ = 16,0 vượt ngưỡng 8"; ô kết quả báo "Đạt".'),
      st('Thử cặp 40 và 26 khối lượng Mặt Trời thay cho 36 và 29; rồi tăng mức nhiễu.', 'Hai cặp có cùng khối lượng chirp nên đỉnh gần như nhau: đó là đại lượng đo chính xác nhất. Nhiễu lớn hơn làm ρ giảm.', ['Chỉnh lỗ đen 1 lên 40, lỗ đen 2 xuống 26 và so ρ.', 'Đặt lại 36 và 29, giữ nút "+" của núm "Mức nhiễu" lên 4 rồi đọc ρ.'], 'Cặp 40 + 26: khối lượng chirp 27,9 (so với 28,1) và ρ vẫn bằng 16,0. Nhiễu 4: ρ chỉ còn 6,0, dưới ngưỡng.'),
    ],
    conclude: 'Biết trước dạng sóng cần tìm cho phép rút tín hiệu ra khỏi nhiễu mạnh hơn nó nhiều lần.',
  },
  bec: {
    goal: 'Làm lạnh đám nguyên tử tới khi ngưng tụ Bose–Einstein xuất hiện.',
    steps: [
      st('Quan sát ảnh đám nguyên tử ở nhiệt độ ban đầu.', 'Trên nhiệt độ tới hạn T_c đám khí là một đám mây nhiệt rộng, mật độ dạng chuông.', ['Nhìn bảng ảnh hấp thụ nằm trên mặt bàn (nhìn từ trên): các chấm cam là nguyên tử.', 'Hàng núm phía trước từ trái sang: "Nhiệt độ đám khí", "Số nguyên tử", "Tần số bẫy".', 'Đọc dòng chữ cuối màn hình: T/T_c.'], 'Đám chấm cam rộng và thưa; T/T_c khoảng 3,8; ngưng tụ 0 %.'),
      st('Giảm nhiệt độ qua T_c.', 'Dưới T_c một đỉnh hẹp và đặc mọc lên giữa đám mây: các nguyên tử dồn vào cùng trạng thái lượng tử thấp nhất.', ['Giữ ngón tay trên nút "−" của núm "Nhiệt độ đám khí" (thang chia theo logarit).', 'Nhả tay ở 300 nK rồi đọc, sau đó giảm tiếp xuống khoảng 150 nK.'], 'Ở 300 nK vẫn là đám nhiệt (T/T_c = 1,14). Ở 150 nK xuất hiện lõi hẹp ở giữa và đỉnh nhọn trên đường mật độ.'),
      st('Tiếp tục làm lạnh tới khi hơn nửa số nguyên tử ngưng tụ.', 'Tỉ lệ ngưng tụ N₀/N = 1 − (T/T_c)³ với khí lí tưởng trong bẫy điều hòa.', ['Giữ nút "−" tới 150 nK rồi tới 50 nK.', 'Đọc phần trăm ngưng tụ ở mỗi mức.'], 'T_c khoảng 264 nK. 150 nK: ngưng tụ 82 %. 50 nK: 99 % và lõi hầu như chiếm hết.'),
      st('Đổi số nguyên tử và tần số bẫy.', 'T_c tỉ lệ với ω·N^(1/3): bẫy chặt hơn hoặc nhiều nguyên tử hơn thì ngưng tụ ở nhiệt độ cao hơn.', ['Giữ nhiệt độ 150 nK. Tăng núm "Tần số bẫy" lên 300 Hz và núm "Số nguyên tử" lên 10⁶.', 'Đọc T_c mới ở dòng chữ cuối màn hình.'], 'T_c tăng lên khoảng 1350 nK nên T/T_c chỉ còn 0,11: gần như toàn bộ nguyên tử đã ngưng tụ.'),
    ],
    conclude: 'Ở nhiệt độ đủ thấp các boson cùng chiếm một trạng thái lượng tử và hành xử như một sóng vật chất khổng lồ.',
  },

  // ------------------------------------------------------------------ Hóa học
  chem: {
    goal: 'Tự do tiến hành phản ứng với các chất trên kệ, quan sát hiện tượng và viết phương trình.',
    tools: [
      'Kệ hóa chất (phía sau): chai hóa chất theo từng nhóm; dải màu trước kệ chọn nhóm (acid, base, muối, kim loại, hữu cơ…). Chạm vào một chai để đọc tên, tính chất vật lí và hóa học ở bảng bên phải.',
      'Giá ống nghiệm và cốc thủy tinh (giữa bàn): chụm vào ống để nhấc ra thùng thải khi muốn đổ bỏ.',
      'Kính bảo hộ (góc trái): chạm vào để đeo. Đèn cồn (bên phải): chụm vào rồi đưa dưới ống để đun.',
      'Vòng vàng ở miệng ống: chụm và kéo sang ống khác để dẫn khí sinh ra. Thùng thải (góc phải).',
      'Nhãn trên mỗi ống ghi nhiệt độ, pH và các chất bên trong; bảng nhật kí ghi hiện tượng và phương trình.',
    ],
    steps: [
      st('Đeo kính bảo hộ trước khi lấy hóa chất.', 'Quy tắc an toàn đầu tiên của phòng thí nghiệm; bài sẽ ghi lại vi phạm nếu quên.', ['Đưa con trỏ tới kính bảo hộ ở góc trái và chạm (chụm một lần).', 'Kiểm tra bảng có dòng báo đã đeo kính.'], 'Kính bảo hộ sáng lên và không còn cảnh báo vi phạm.'),
      st('Chọn nhóm chất và ống nghiệm.', 'Chất được xếp theo nhóm (acid, base, muối, kim loại, hữu cơ…) như kệ hóa chất thật.', ['Chạm một ô màu ở dải trước kệ để đổi nhóm, ví dụ "Muối".', 'Chạm vào chai "AgNO₃ 0,1 M" và đọc thẻ tính chất ở bảng bên phải.', 'Chọn một ống nghiệm còn trống trên giá.'], 'Kệ hiện các chai của nhóm vừa chọn; thẻ ghi tính chất vật lí (màu, tan, nhiệt độ sôi…) và các phản ứng của chất.'),
      st('Rót chất vào ống.', 'Lượng rót quyết định chất nào dư, chất nào hết; rót từ từ để thấy hiện tượng xuất hiện dần.', ['Chụm vào chai "AgNO₃ 0,1 M" và kéo lên trên miệng ống nghiệm; chai nghiêng khi đã đúng chỗ.', 'Vẫn chụm và giữ khoảng 1–2 giây rồi nhả để dừng.', 'Lặp lại với chai "NaCl 0,1 M" vào cùng ống.'], 'Cho NaCl vào AgNO₃: dung dịch đục ngay rồi có kết tủa trắng AgCl lắng xuống đáy; phương trình Ag⁺ + Cl⁻ → AgCl↓ hiện ở bảng.'),
      st('Quan sát hiện tượng và phương trình.', 'Mỗi dấu hiệu ứng với một loại phản ứng: kết tủa (trao đổi ion), sủi khí, đổi màu chỉ thị (acid–base), nóng lên (tỏa nhiệt).', ['Nhìn ống: màu dung dịch, lớp kết tủa, bọt khí.', 'Đọc nhãn nhiệt độ, pH và nhật kí hiện tượng.', 'Thử ống khác: cho Na₂CO₃ rồi HCl và nhìn bọt khí.'], 'Na₂CO₃ + HCl: sủi bọt CO₂ mạnh, nhãn thể tích khí tăng; có chỉ thị phenolphtalein thì màu hồng mất khi pH giảm.'),
      st('Đun nóng hoặc dẫn khí khi cần.', 'Nhiều phản ứng chỉ xảy ra khi đun; dẫn khí sang ống thứ hai để nhận biết khí sinh ra.', ['Chụm vào đèn cồn, đưa tới dưới ống nghiệm và giữ vài giây.', 'Chụm vào vòng vàng ở miệng ống, kéo sang ống thứ hai chứa nước vôi trong rồi buông.'], 'Ống nóng lên, nhãn nhiệt độ tăng; khí CO₂ dẫn sang làm nước vôi trong đục (CaCO₃).'),
      st('Đổ bỏ khi xong.', 'Không đổ hóa chất thừa trở lại chai và không trộn bừa các chất thải.', ['Chụm vào ống nghiệm, kéo tới thùng thải rồi buông.'], 'Ống trống rỗng, nhật kí ghi đã đổ bỏ.'),
    ],
    conclude: 'Mở thẻ của từng chất để xem các phản ứng đặc trưng và nút "Thử với" các chất làm cặp.',
  },
  chlorine: {
    goal: 'Tìm ra chất thật sự tẩy màu trong nước clo.',
    tools: [
      'Bình điều chế (bên trái): KMnO₄ trong bình tam giác, HCl đặc trong phễu nhỏ giọt. Chụm và GIỮ vào khóa phễu màu xanh để nhỏ acid; giữ càng lâu khí clo trong bình thu càng đậm (tới 100 %).',
      'Bình rửa khí (giữa đường ống): đang lắp bình H₂SO₄ đặc màu hổ phách, làm khô khí. Bình còn lại (nước, màu xanh) để ở phía trước; cầm nó đặt vào giữa đường ống rồi buông để đổi.',
      'Bình thu khí (bên phải): khí clo màu vàng lục, đậm dần theo nồng độ.',
      'Mảnh vải màu hồng: chụm để cầm, thả vào bình thu khí thì đồng hồ bắt đầu chạy; đưa ra ngoài rồi buông thì thay bằng mảnh vải mới.',
    ],
    steps: [
      st('Thử với khí clo KHÔ.', 'Khí Cl₂ khô không làm mất màu vải dù để lâu: bản thân phân tử Cl₂ không phải là chất tẩy màu.', ['Kiểm tra bình giữa đường ống là bình "H₂SO₄ đặc (làm khô khí)".', 'Chụm và giữ khóa phễu xanh khoảng 3 giây cho khí clo đậm lên (nhìn màu vàng lục trong bình thu).', 'Nếu vải đang ở ngoài: chụm vào mảnh vải, đưa tới trên bình thu khí rồi buông.', 'Chờ 10 giây, đọc nhãn phía trên mảnh vải.'], 'Nhãn báo "mất 0 % màu"; vải vẫn hồng đậm.'),
      st('Đổi sang khí clo ẨM.', 'Cl₂ tác dụng với nước: Cl₂ + H₂O ⇌ HCl + HClO. Chỉ khi có nước mới sinh ra HClO.', ['Chụm vào bình "Nước (khí ẩm)" ở phía trước, đưa tới giữa đường ống (chỗ bình H₂SO₄ đang đứng) rồi buông.', 'Chụm vào mảnh vải, đưa ra ngoài bình rồi buông để lấy mảnh vải mới.', 'Thả mảnh vải mới vào bình thu khí.'], 'Trong bình xuất hiện các giọt hơi nước li ti; vải nhạt màu dần ngay trong vài giây đầu.'),
      st('Tẩy trắng hoàn toàn.', 'HClO là chất oxi hóa mạnh, phá vỡ phân tử chất màu. Nồng độ clo và thời gian tiếp xúc càng lớn thì tẩy càng nhanh.', ['Giữ khóa phễu cho tới khi nhãn báo khí clo 100 %.', 'Để vải trong bình tới khi nhãn báo mất trên 95 % màu.', 'Mở tab Thao tác để xem ô kết quả báo "Đạt".'], 'Vải chuyển từ hồng sang trắng ngà trong khoảng 2 đến 4 giây.'),
    ],
    conclude: 'Tác nhân tẩy màu là acid hipoclorơ HClO chứ không phải Cl₂ khô. Clo rất độc: ngoài đời phải làm trong tủ hút.',
  },
  alkali: {
    goal: 'So sánh mức độ hoạt động của các kim loại kiềm khi tác dụng với nước.',
    tools: [
      'Năm lọ kim loại ngâm dầu (hàng phía trước): Li, Na, K, Rb, Cs. Chụm để cầm một lọ, đặt lên tấm cắt màu trắng rồi buông: thỏi kim loại trên tấm cắt đổi sang kim loại đó.',
      'Tấm cắt có thước mm (bên trái): chụm vào con dao và kéo dọc thỏi kim loại để chọn cỡ mẩu từ 1 đến 20 mm.',
      'Mẩu kim loại (phần sáng màu bên trái lưỡi dao): chụm để cầm, đưa tới trên chậu nước rồi buông.',
      'Chậu thủy tinh (bên phải): nước có sẵn phenolphtalein, không màu khi chưa có kiềm.',
    ],
    steps: [
      st('Thả một mẩu natri nhỏ.', 'Na nhẹ hơn nước nên nổi, phản ứng tỏa nhiệt làm nó nóng chảy thành giọt tròn chạy trên mặt nước: 2Na + 2H₂O → 2NaOH + H₂↑.', ['Nhìn nhãn trên tấm cắt: đang là Na. Nếu không, cầm lọ "Na" đặt lên tấm cắt.', 'Chụm vào con dao, kéo tới vạch 4 mm rồi buông.', 'Chụm vào mẩu kim loại vừa cắt, đưa tới trên chậu nước rồi buông tay.'], 'Mẩu natri vo tròn, chạy vòng quanh mặt nước khoảng 7 giây rồi tan hết; không có lửa.'),
      st('Nhìn màu dung dịch sau phản ứng.', 'NaOH là base mạnh nên phenolphtalein chuyển hồng (pH trên 8,2).', ['Chờ mẩu kim loại tan hết.', 'Đọc dòng chữ cuối màn hình và giá trị pH ở tab Thao tác.'], 'Nước trong chậu chuyển sang hồng; pH khoảng 11.'),
      st('Đi lần lượt từ Li tới Cs với cùng cỡ mẩu 4 mm.', 'Đi xuống nhóm IA, electron ngoài cùng càng xa hạt nhân càng dễ nhường nên phản ứng mãnh liệt dần.', ['Cầm lọ "Li" đặt lên tấm cắt (chậu được thay nước mới), thả mẩu 4 mm, quan sát.', 'Làm tương tự với K, rồi Rb, rồi Cs.', 'Ghi lại mức độ của từng kim loại.'], 'Li: sủi bọt êm. Na: chạy trên mặt nước. K: khí H₂ bốc cháy với ngọn lửa tím. Rb và Cs: nổ.'),
      st('Tăng cỡ mẩu natri.', 'Mẩu lớn tỏa nhiều nhiệt hơn mức nước kịp tản đi, khí H₂ bốc cháy rồi nổ, bắn kiềm nóng. Vì thế trong thực tế chỉ dùng mẩu bằng hạt đậu xanh.', ['Đặt lại lọ "Na" lên tấm cắt.', 'Kéo dao tới 10 mm, thả mẩu; rồi kéo tới 20 mm, thả mẩu.'], 'Mẩu 10 mm: H₂ cháy với ngọn lửa vàng. Mẩu 20 mm: nổ.'),
    ],
    conclude: 'Tính khử của kim loại kiềm tăng dần từ Li tới Cs; luôn dùng mẩu nhỏ và đứng xa.',
  },
  no2: {
    goal: 'Kiểm chứng nguyên lí Le Chatelier với cân bằng 2NO₂ (nâu đỏ) ⇌ N₂O₄ (không màu).',
    tools: [
      'Xi-lanh thủy tinh nằm ngang (giữa bàn): chứa hỗn hợp khí; chấm nâu là NO₂, chấm trắng là N₂O₄.',
      'Cán pít-tông (đĩa trắng ở đầu bên phải): chụm vào và đẩy sang trái để nén (tới 5 atm), kéo sang phải để giãn (tới 0,5 atm).',
      'Bể nước bao quanh xi-lanh: màu bể đổi từ xanh (lạnh) sang cam (nóng); nhãn phía trước ghi nhiệt độ.',
      'Cốc "Nước đá" và cốc "Nước sôi" (phía trước): chụm để cầm, đưa tới trên bể thì cốc tự nghiêng và rót; giữ càng lâu nhiệt độ đổi càng nhiều (khoảng 25 °C mỗi giây).',
    ],
    steps: [
      st('Quan sát trạng thái ban đầu ở 25 °C, 1 atm.', 'Hỗn hợp cân bằng có cả NO₂ nâu đỏ và N₂O₄ không màu nên ống màu nâu vừa.', ['Chưa chạm vào gì. Đọc dòng chữ cuối màn hình: phần trăm NO₂ và N₂O₄.', 'Nhìn tỉ lệ chấm nâu và chấm trắng trong xi-lanh.'], 'Khoảng 30 % số phân tử là NO₂.'),
      st('Đun nóng rồi làm lạnh bể nước.', 'Chiều tạo N₂O₄ tỏa nhiệt (ΔH = −57 kJ). Đun nóng thì cân bằng dịch về chiều thu nhiệt, tạo NO₂ (đậm màu); làm lạnh thì về N₂O₄ (nhạt màu).', ['Chụm vào cốc "Nước sôi", đưa tới trên bể và giữ cho tới khi nhãn bể báo khoảng 80 °C, rồi đưa cốc ra và buông.', 'Quan sát màu xi-lanh.', 'Chụm vào cốc "Nước đá", giữ trên bể tới khi nhãn báo 0 °C.'], 'Ở 80 °C ống nâu đậm, chấm nâu chiếm đa số. Ở 0 °C ống nhạt hẳn.'),
      st('Nén khí bằng pít-tông.', 'Chiều tạo N₂O₄ giảm số mol khí (2 → 1) nên tăng áp suất đẩy cân bằng về phía N₂O₄.', ['Chụm vào đĩa trắng ở đầu cán pít-tông.', 'Đẩy từ từ sang trái tới khi nhãn báo khoảng 3 atm, rồi buông tay.'], 'Cột khí ngắn lại; phần trăm NO₂ giảm, số chấm nâu ít đi.'),
      st('Kết hợp lạnh và nén để ống gần như mất màu.', 'Số nguyên tử không đổi, chỉ tỉ lệ giữa hai dạng phân tử thay đổi theo điều kiện.', ['Giữ bể ở 0 °C và pít-tông ở khoảng 3 atm.', 'Đọc phần trăm NO₂: phải dưới 10 %.', 'Mở cửa sổ vi mô (nút kính lúp) để đếm hạt.'], 'NO₂ còn dưới 10 %; tab Thao tác báo "Đạt".'),
    ],
    conclude: 'Hệ cân bằng dịch chuyển theo chiều chống lại tác động bên ngoài (nhiệt độ, áp suất).',
  },
  titration: {
    goal: 'Chuẩn độ HCl bằng NaOH và hiểu bước nhảy pH quanh điểm tương đương.',
    tools: [
      'Giá sắt kẹp buret (bên trái): buret chia vạch chứa NaOH; bên dưới là bình tam giác có 20 mL HCl 0,1 M và vài giọt phenolphtalein.',
      'Khóa buret (tay vặn xanh ngay trên đầu vòi): chụm rồi nhả thật nhanh = một giọt 0,05 mL; chụm và GIỮ quá nửa giây = chảy thành dòng, giữ lâu chảy nhanh dần (tới 4 mL mỗi giây).',
      'Ba chai NaOH (phía trước, bên trái): 0,05 M, 0,1 M, 0,2 M. Cầm một chai đưa lên miệng buret rồi buông để rót đầy; buret trở về 0 mL và bình tam giác được thay mẻ acid mới.',
      'Bảng đường cong pH (bên phải): chấm cam là trạng thái hiện tại; đường ngang là pH 7.',
    ],
    steps: [
      st('Nạp NaOH 0,1 M vào buret.', 'Điểm tương đương là khi số mol OH⁻ thêm vào bằng số mol H⁺ ban đầu: V = n(HCl)/C(NaOH) = 2 mmol / 0,1 M = 20 mL.', ['Chụm vào chai "NaOH 0,1 M", đưa lên miệng buret (nhãn "Rót NaOH vào đây").', 'Khi chai nghiêng thì buông tay.', 'Đọc dòng chữ cuối màn hình: "0,00 mL NaOH 0,100 M".'], 'Cột dung dịch trong buret đầy; chấm cam nằm ở góc trái dưới của đường cong (pH = 1).'),
      st('Nhỏ nhanh tới khoảng 18 mL.', 'Xa điểm tương đương còn nhiều H⁺ dư nên pH tăng rất chậm.', ['Chụm vào khóa buret và giữ; dòng chảy nhanh dần.', 'Theo dõi số mL ở cuối màn hình; nhả tay khi tới khoảng 17 đến 18 mL.'], 'Cột NaOH trong buret hạ xuống; pH mới lên khoảng 2,3; dung dịch vẫn không màu.'),
      st('Nhỏ từng giọt quanh 20 mL.', 'Gần điểm tương đương H⁺ gần cạn, một giọt base đổi nồng độ H⁺ hàng nghìn lần; pH là lôgarit nên nhảy từ 4 lên 10.', ['Chụm rồi nhả khóa thật nhanh: mỗi lần thêm 0,05 mL.', 'Sau mỗi giọt nhìn màu bình tam giác và chấm cam trên đường cong.', 'Dừng ngay khi dung dịch vừa chuyển hồng.'], 'Từ 19,95 đến 20,05 mL chấm cam nhảy vọt từ pH 4 lên pH 10; dung dịch chuyển hồng.'),
      st('Đọc kết quả.', 'Phenolphtalein đổi màu ở pH 8,2, nằm trong bước nhảy nên sai số nhỏ hơn một giọt.', ['Đọc thể tích NaOH đã dùng ở cuối màn hình.', 'Mở tab Thao tác: ô kết quả báo "Đạt" nếu lệch không quá 0,1 mL so với 20,00 mL.', 'Nếu nhỏ quá tay: rót lại chai NaOH vào buret để làm lại từ đầu.'], 'Dừng ở 20,00 ± 0,10 mL.'),
      st('Làm lại với NaOH 0,2 M.', 'Nồng độ base gấp đôi thì thể tích cần dùng giảm một nửa: V = 2 mmol / 0,2 M = 10 mL.', ['Cầm chai "NaOH 0,2 M" rót vào buret.', 'Dự đoán điểm tương đương rồi chuẩn độ như trên.'], 'Dung dịch chuyển hồng ở khoảng 10 mL.'),
    ],
    conclude: 'Chất chỉ thị đổi màu trong khoảng bước nhảy pH cho biết điểm kết thúc chuẩn độ.',
  },
  bz: {
    goal: 'Quan sát một phản ứng hóa học tự dao động và tìm điều kiện để nó dao động.',
    tools: [
      'Cốc BZ trên máy khuấy từ (bên trái): màu dung dịch đổi đỏ ↔ xanh theo mức oxi hóa của chất xúc tác ferroin; đồ thị biên độ vẽ phía sau bên phải.',
      'Bốn lọ thuốc thử ở hàng trước: acid malonic (tăng f), natri bromat (giảm f), H₂SO₄ loãng (giảm ε, khâu tự xúc tác nhanh hơn), nước cất (tăng ε). Chụm vào lọ, mang tới trên miệng cốc rồi NGHIÊNG lọ (xoay cổ tay) để rót; nghiêng càng nhiều rót càng nhanh, đưa cổ tay thẳng lại hoặc buông tay thì ngừng. Số đọc cộng dồn theo thời gian nghiêng nên tay run không làm giật.',
      'Bảng điều khiển bên phải vẫn có hai thanh trượt f (0,2 đến 4) và ε (0,02 đến 0,2, thang logarit) làm bản dự phòng khi không có camera.',
    ],
    steps: [
      st('Nhìn bình ở giá trị f ban đầu.', 'Dung dịch dừng ở một màu: hệ đang ở trạng thái dừng bền.', ['Chưa chạm vào gì, nhìn bình và đọc dòng chữ cuối màn hình.'], 'Dòng chữ báo "Không dao động: dung dịch dừng ở một màu" (f = 3,5, biên độ 0).'),
      st('Kéo f về quanh 1.', 'Màu bắt đầu đổi đỏ ↔ xanh tuần hoàn. Chất xúc tác ferroin bị oxi hóa rồi khử luân phiên vì có khâu tự xúc tác và khâu ức chế chậm.', ['Chụm vào lọ natri bromat, mang tới trên miệng cốc rồi nghiêng lọ (xoay cổ tay) cho tới khi nhãn trên cốc báo f khoảng 1,0 (nghiêng hết cỡ thì mất khoảng 5 giây).', 'Chờ vài giây và nhìn màu cốc.'], 'Màu đổi qua lại tuần hoàn (chu kì khoảng 4,8 đơn vị thời gian); ô kết quả báo "Đạt".'),
      st('Quét f từ nhỏ tới lớn và ghi hai bờ của khoảng dao động.', 'Dao động chỉ tồn tại trong một khoảng f; ngoài khoảng đó trạng thái dừng bền trở lại.', ['Rót tiếp natri bromat cho f xuống 0,3 và đọc kết quả.', 'Rót acid malonic để f tăng từng chút, dừng mỗi lần chừng 0,3 đơn vị, ghi nơi bắt đầu và nơi hết dao động.'], 'Ở f = 0,3 và f = 3,5 màu đứng yên; chỉ trong khoảng giữa mới có dao động.'),
      st('Đổi tỉ lệ thời gian ε.', 'ε cho biết khâu tự xúc tác nhanh hơn khâu ức chế bao nhiêu: nó đổi hình dạng xung và chu kì.', ['Giữ f = 1, rót H₂SO₄ loãng để ε nhỏ đi (về khoảng 0,02), rồi rót nước cất để ε lớn lên (về khoảng 0,2).', 'So hình dạng xung và chu kì trên đồ thị.'], 'ε nhỏ thì xung nhọn và dài; ε lớn thì dao động gần hình sin hơn và ngắn lại.'),
    ],
    conclude: 'Phản ứng xa cân bằng có phản hồi dương và phản hồi âm trễ có thể tự dao động, giống đồng hồ sinh học.',
  },

  // ------------------------------------------------------------------ Sinh học
  gel: {
    goal: 'Tách các đoạn DNA theo kích thước bằng điện di và so mẫu hiện trường với hai nghi phạm.',
    steps: [
      st('Lắp gel agarose 1 % và đặt hiệu điện thế khoảng 100 V.', 'DNA mang điện âm do nhóm phosphate nên chạy từ cực âm (giếng) về cực dương.', ['Chụm vào vật "1" ở khay "Gel agarose (%)", đưa tới "Ổ lắp: Gel agarose (%)" rồi buông.', 'Hàng núm phía trước từ trái sang: "Hiệu điện thế", "Thời gian chạy". Giữ núm hiệu điện thế ở 100 V (giá trị ban đầu).', 'Nhìn bốn làn: Thang chuẩn, Hiện trường, Nghi phạm 1, Nghi phạm 2, mẫu đều nằm ở các giếng phía cực âm.'], 'Cả bốn làn còn nằm sát giếng; thời gian chạy đang 0 phút.'),
      st('Tăng thời gian chạy và nhìn các vạch tách ra.', 'Gel là một mạng lưới: đoạn ngắn luồn qua nhanh hơn đoạn dài nên đi xa hơn.', ['Giữ ngón tay trên nút "+" của núm "Thời gian chạy" tới khoảng 10 phút rồi nhả.', 'Nhìn các vạch rời giếng chạy về cực dương, nhãn số cặp base nằm cạnh thang chuẩn.'], 'Sau 10 phút các vạch đã tách nhưng 600 và 900 cặp base mới cách nhau khoảng 0,21 cm: chưa đủ rõ.'),
      st('Dừng đúng lúc: 600 và 900 tách rõ mà 100 chưa ra khỏi gel.', 'Chạy quá ngắn thì các vạch còn chồng nhau; quá dài thì đoạn nhỏ trôi mất.', ['Tiếp tục giữ nút "+" tới khoảng 27 phút rồi nhả; kiểm tra bằng từng nhịp "−" / "+" ngắn.', 'Thử chạy 60 phút để thấy hậu quả rồi trả về khoảng 27 phút.'], 'Ở 27 phút ô kết quả báo "Đạt: các vạch tách rõ". Ở 60 phút vạch 100 cặp base biến mất khỏi gel: "Chạy quá lâu".'),
      st('So vạch của từng làn với thang chuẩn.', 'Thang chuẩn cho biết độ dài từng đoạn. Hai mẫu cùng người sẽ có vạch trùng nhau hoàn toàn.', ['Nhìn nhãn số cặp base của thang chuẩn.', 'Dùng mắt kẻ ngang từ vạch hiện trường sang hai làn nghi phạm.'], 'Hiện trường có hai vạch 1500 và 600 cặp base, trùng hoàn toàn với Nghi phạm 2; Nghi phạm 1 có vạch 900 thay cho 600.'),
      st('Đổi sang gel 2 % và chạy lại.', 'Gel đặc hơn làm mọi đoạn chậm lại nhưng tách tốt hơn các đoạn ngắn.', ['Đưa vật "2" vào ổ lắp gel agarose.', 'Chạy lại với cùng thời gian 27 phút.'], 'Các vạch đi gần giếng hơn (chậm hơn): vạch 600 và 900 mới cách nhau khoảng 0,29 cm, chưa đạt tiêu chí; cần chạy lâu hơn.'),
    ],
    conclude: 'Điện di biến khác biệt về độ dài DNA thành khác biệt về vị trí vạch: cơ sở của giám định ADN.',
  },
  morgan: {
    goal: 'Tính tần số hoán vị gen từ phép lai phân tích ruồi giấm và hiểu vai trò của cỡ mẫu.',
    steps: [
      st('Đếm 20 ruồi con và xem bốn khay kiểu hình.', 'Ruồi cái F1 dị hợp hai cặp gen lai với đực đồng hợp lặn: kiểu hình ruồi con cho biết trực tiếp loại giao tử của mẹ.', ['Chụm vào vật "20" ở khay "Số ruồi con đếm", đưa tới "Ổ lắp: Số ruồi con đếm" rồi buông (đây cũng là giá trị ban đầu).', 'Nhìn bốn khay: Xám dài, Đen cụt, Xám cụt ✱, Đen dài ✱ (✱ là tái tổ hợp).', 'Đọc số con ở nhãn trên mỗi khay và dòng chữ cuối màn hình.'], 'Số con rất ít và các khay không cân đối; f ước lượng dao động mạnh quanh 17 %, sai số chuẩn lớn.'),
      st('Tính f = số ruồi ở hai khay tái tổ hợp chia cho tổng số.', 'Nếu hai gen phân li độc lập thì bốn lớp bằng nhau (f = 50 %). Hai lớp tái tổ hợp ít hơn hẳn chứng tỏ hai gen liên kết.', ['Cộng số con ở hai khay có dấu ✱ rồi chia cho tổng số con.', 'So với giá trị f mà dòng chữ cuối màn hình báo.'], 'Với 500 con: xám dài 199, đen cụt 219, xám cụt 45, đen dài 37 nên f = (45 + 37)/500 = 16,4 %.'),
      st('Tăng số ruồi lên 500, 2000, 5000.', 'Sai số chuẩn của f giảm theo 1/√N. Với 20 con f lệch rất nhiều; vì thế Morgan phải đếm hàng nghìn con.', ['Lần lượt đưa các vật "500", "2000", "5000" vào ổ lắp.', 'Đọc "f = … ± …" sau mỗi lần.'], 'Sai số chuẩn giảm: 500 con ±1,7 %; 2000 con khoảng ±0,8 %; 5000 con còn nhỏ hơn. Dưới 1 % thì ô kết quả báo "Đạt".'),
      st('Đổi khoảng cách hai gen.', 'Hai gen càng xa nhau trên nhiễm sắc thể càng dễ có trao đổi chéo ở giữa: 1 % hoán vị = 1 cM.', ['Giữ 5000 con. Hàng núm phía trước có núm "Khoảng cách hai gen".', 'Giữ nút "+" lên khoảng 40 cM rồi nhả; đọc f.'], 'f xấp xỉ 40 %: hai khay tái tổ hợp tiến sát hai khay còn lại (gần mức 50 %, tức phân li độc lập).'),
    ],
    conclude: 'Tần số hoán vị đo khoảng cách tương đối giữa các gen: đây là cách lập bản đồ di truyền đầu tiên.',
  },
  tweezers: {
    goal: 'Kéo dãn một phân tử DNA bằng kẹp quang học và đo tính đàn hồi của nó.',
    tools: [
      'Sợi DNA λ dài 16,5 µm căng giữa hai hạt nhựa: một hạt dính ở bề mặt (đầu cố định), hạt kia nằm trong bẫy laser.',
      'Vòng đỏ (tâm bẫy laser): chụm vào vòng rồi kéo sang phải để kéo dãn sợi DNA. Thanh trượt "Vị trí tâm bẫy" ở tab Thao tác đặt tâm bẫy chính xác hơn.',
      'Đồ thị lực – độ giãn (ở bảng): đường xám là đường lí thuyết, chấm cam là trạng thái hiện tại, đường đỏ đứt là mức 65 pN.',
      'Nút "Ghi điểm" lưu một điểm đo (có nhiễu giả lập 5 %) và nút "Khớp P" ước lượng độ dài bền P từ các điểm đã ghi.',
    ],
    steps: [
      st('Kéo chậm tâm bẫy.', 'Hạt nhựa bị giữ trong bẫy kéo theo đầu sợi DNA; hạt lệch khỏi tâm bẫy bao nhiêu thì lực bấy nhiêu.', ['Chụm vào vòng đỏ ở tâm bẫy.', 'Kéo từ từ sang phải khoảng một phần ba chiều dài rồi giữ yên tay.', 'Đọc nhãn lực và độ giãn ở bảng.'], 'Lực rất nhỏ (dưới 1 pN) khi sợi mới được duỗi thẳng; chấm cam trên đồ thị bắt đầu đi lên.'),
      st('Ghi ít nhất 6 điểm ở các độ giãn khác nhau khi lực còn nhỏ.', 'Ở lực nhỏ DNA như một cuộn chỉ rối: kéo thẳng nó là chống lại chuyển động nhiệt (đàn hồi entropy), mô tả bằng mô hình chuỗi mềm.', ['Kéo tâm bẫy tới một độ giãn rồi bấm "Ghi điểm" ở tab Thao tác.', 'Kéo thêm một đoạn nhỏ, bấm "Ghi điểm" lần nữa; làm ít nhất 6 lần, tất cả trước vùng lực lớn.', 'Nhìn các chấm xanh trên đồ thị nằm sát đường xám.'], 'Đồ thị có ít nhất 6 chấm xanh; dòng trạng thái báo số điểm "trong vùng chuỗi mềm".'),
      st('Khớp độ dài bền P.', 'Độ dài bền P ≈ 50 nm cho biết DNA cứng tới mức nào: trên đoạn ngắn hơn P nó gần như thẳng.', ['Bấm "Khớp P" ở tab Thao tác.', 'Đọc giá trị P ở dòng trạng thái.'], 'P khớp được khoảng 40–60 nm (xấp xỉ 50 nm).'),
      st('Kéo tiếp qua mức 65 pN.', 'Lực không tăng nữa dù sợi dài thêm gần gấp đôi: chuỗi xoắn kép bị duỗi ra thành một dạng khác (quá kéo giãn).', ['Chụm vào vòng đỏ, kéo tiếp sang phải tới khi chấm cam chạm đường đỏ đứt 65 pN và đi tiếp.', 'Nhìn đồ thị: lực gần như nằm ngang trong một đoạn dài.'], 'Dòng trạng thái ghi "đã vượt vùng quá kéo giãn"; kết hợp với P hợp lệ thì ô kết quả báo "Đạt".'),
    ],
    conclude: 'Đường lực – độ giãn của một phân tử tiết lộ cấu trúc của nó. Điểm ghi có nhiễu đo giả lập 5 %.',
  },

  // ------------------------------------------------------------------ Kĩ thuật – Công nghệ
  'three-phase': {
    goal: 'Đấu động cơ không đồng bộ ba pha vào lưới 380 V đúng kiểu, an toàn.',
    tools: [
      'Thanh cái lưới 3 pha (phía sau): ba cọc L1, L2, L3 và thanh nối đất PE. Hộp đấu dây động cơ (giữa bàn): sáu cọc U1, V1, W1 và W2, U2, V2, cùng bu lông vỏ máy.',
      'Aptomat (bên phải): chụm vào cần gạt để đóng hoặc cắt. Động cơ chỉ chạy khi aptomat đóng.',
      'Dây điện: chụm vào một cọc, kéo sang cọc khác rồi buông để nối. Chụm vào hạt trắng ở giữa dây để gỡ dây đó.',
      'Bảng bên phải: nhãn động cơ (Δ/Y 220/380 V hoặc Δ/Y 380/660 V), nút "Đóng aptomat", "Gỡ hết dây" và ba nút "Đấu mẫu" (Sao, Tam giác, Ngắn mạch) để xem đáp án.',
    ],
    steps: [
      st('Kiểm tra aptomat đang CẮT trước khi chạm vào bất kì dây nào.', 'Không bao giờ đấu dây khi mạch có điện; bài sẽ chặn và nhắc nếu vi phạm.', ['Nhìn cần aptomat ở bên phải: phải đang ở vị trí cắt.', 'Đọc dòng trạng thái: "Aptomat đang cắt: an toàn để đấu dây".'], 'Không có cảnh báo; số dây đã đấu là 0.'),
      st('Đọc nhãn động cơ: Δ/Y 220/380 V nghĩa là mỗi cuộn dây chịu 220 V.', 'Lưới 380 V là điện áp giữa hai dây pha. Đấu sao thì mỗi cuộn nhận 380/√3 ≈ 220 V, đúng định mức.', ['Ở bảng bên phải, bấm nhãn "Δ/Y 220/380 V" cho động cơ này.', 'Suy ra: lưới 380 V thì phải đấu sao (Y).'], 'Nhãn được chọn đổi sang màu đậm; chưa có dây nào.'),
      st('Nối ba pha vào ba đầu U1, V1, W1.', 'Ba đầu cuộn dây nối vào ba pha lệch nhau 120° tạo ra từ trường quay.', ['Chụm vào cọc L1, kéo tới cọc U1 rồi buông.', 'Chụm vào cọc L2, kéo tới cọc V1; chụm vào L3, kéo tới W1.'], 'Ba dây hiện ra; số dây đã đấu là 3.'),
      st('Nối tắt ba đầu còn lại U2–V2–W2 (đấu sao).', 'Đây là điểm trung tính của cách đấu sao. Nếu nhãn là 380/660 V thì phải đấu tam giác để mỗi cuộn nhận 380 V.', ['Chụm vào cọc U2, kéo tới cọc V2; chụm vào V2, kéo tới W2.', 'Nếu nối nhầm thì chụm vào hạt trắng giữa dây đó để gỡ.'], 'Số dây đã đấu là 5.'),
      st('Nối vỏ máy với dây bảo vệ PE.', 'Nếu cách điện hỏng, dòng rò chạy theo dây đất thay vì qua người.', ['Chụm vào bu lông vỏ máy, kéo tới thanh PE rồi buông.'], 'Số dây đã đấu là 6; vỏ máy đã nối đất.'),
      st('Đóng aptomat và đọc kết quả.', 'Đấu sai kiểu gây quá áp (cháy cuộn) hoặc thiếu áp (yếu, nóng); đổi chỗ hai dây pha làm từ trường quay ngược nên động cơ đảo chiều.', ['Chụm vào cần aptomat, gạt sang vị trí đóng.', 'Đọc dòng trạng thái ở bảng bên phải.', 'Cắt aptomat, đổi chỗ hai dây pha (ví dụ nối L1 vào V1 và L2 vào U1) rồi đóng lại để thử.'], 'Báo "Đấu sao (Y): chạy đúng định mức"; động cơ quay thuận. Sau khi đổi hai pha động cơ quay ngược chiều.'),
    ],
    conclude: 'Kiểu đấu sao hay tam giác chọn theo điện áp định mức của cuộn dây so với điện áp lưới; luôn nối đất vỏ máy.',
  },
  motor: {
    goal: 'Tháo rời rồi lắp lại động cơ điện bằng dụng cụ đúng cỡ để hiểu cấu tạo, thứ tự và cách dùng cảo.',
    tools: [
      'Động cơ điện ba pha (phía sau bàn) đang lắp hoàn chỉnh; trên mặt trên của mỗi chi tiết có các đầu vít, bu-lông (hình tròn hoặc lục giác sáng bạc).',
      'Hộp dụng cụ (phía trước bàn, trên tấm gỗ): tua vít chữ thập PH2, tua vít dẹt, tuýp 10 và tuýp 13 có cần tự động, kìm mở phe, cảo ba chấu, chìa lục giác 4 mm, cờ lê vòng miệng. Rê con trỏ tới một dụng cụ để hiện tên.',
      'Cầm dụng cụ: chụm vào tay cầm. Đưa mũi dụng cụ tới đầu vít (mũi tự khớp nếu ĐÚNG dụng cụ; sai thì có lời nhắc và tính một lần sai). Vặn bằng cổ tay: xoay NGƯỢC chiều kim đồng hồ để nới, THUẬN chiều để siết; xoay qua lại như vặn cần tự động. Dùng chuột thì giữ nút trên đầu vít.',
      'Khay từ (góc phải trước): vít, bu-lông đã tháo nằm ở đây; nhãn ghi số vít đang nằm ngoài.',
      'Sau khi nới HẾT vít của một chi tiết mới nhấc được chi tiết đó: chụm vào chi tiết, kéo ra khay rồi buông. Lắp lại thì đưa chi tiết về vòng cam, rồi siết đủ vít.',
      'Bảng bên phải: số vít đang siết, thẻ dụng cụ đang cầm, danh sách hộp dụng cụ; có hai nút "Nới hết / Siết hết vít (xem mẫu)" làm lối tắt khi chưa có camera.',
    ],
    steps: [
      st('Mở hộp đấu dây: nới vít nắp bằng tua vít dẹt.', 'Hộp đấu dây che sáu đầu dây U1 V1 W1 / W2 U2 V2; vít rãnh thẳng cần tua vít dẹt vừa rãnh, dùng sai cỡ làm toét đầu vít.', ['Chụm vào tua vít dẹt (tay cầm xanh dương) ở hộp dụng cụ.', 'Đưa mũi tới từng đầu vít trên nắp hộp đấu dây (2 con); mũi tự khớp, thẻ dụng cụ hiện "Đang nới vít rãnh thẳng…".', 'Xoay cổ tay ngược chiều kim đồng hồ (rồi nhấc về xoay tiếp) tới khi con vít nhô lên và biến mất, nhãn khay từ tăng 1.', 'Nới hết 2 con rồi buông tua vít; chụm vào Nắp hộp đấu dây, kéo ra khay.'], 'Vít nhô lên khỏi mặt nắp khi quay; nhãn "n/18 vít ngoài khay" tăng; nắp hộp nhấc ra được.'),
      st('Tháo nắp che quạt và quạt (tua vít PH2, kìm mở phe).', 'Nắp che quạt bắt bằng 4 vít chữ thập M5; quạt giữ trên đuôi trục bằng một vòng hãm (phe) phải mở bằng kìm mở phe chuyên dụng.', ['Đặt tua vít dẹt về giá, cầm tua vít chữ thập PH2 (cán đỏ), nới 4 vít nắp che quạt; thử cầm nhầm tua vít dẹt trước để thấy lời nhắc.', 'Kéo Nắp che quạt ra khay.', 'Cầm kìm mở phe, đưa mũi tới phe ở đuôi trục, xoay cổ tay để mở phe rồi nhấc Quạt làm mát ra.'], 'Cầm sai dụng cụ: lời nhắc nêu đúng tên dụng cụ cần và số lần sai thứ tự tăng. Đúng dụng cụ: vít nhô lên, chi tiết nhấc được.'),
      st('Tháo nắp máy sau bằng tuýp 13 theo đường chéo.', 'Bốn bu-lông xuyên M8 (đầu 13) ép hai nắp máy vào thân stato; nới theo đường chéo để nắp không bị vênh và ổ bi không kẹt.', ['Cầm tuýp 13 có cần tự động (cần đỏ).', 'Nới con 1, rồi con 3 (đối diện), con 2, con 4: bài nhắc nếu sai thứ tự đường chéo.', 'Kéo Nắp máy sau ra khay.'], 'Nới con sai lượt: có lời nhắc "con kế tiếp là con số …". Đủ 4 con thì nắp máy sau nhấc ra được.'),
      st('Rút ổ bi và puli bằng cảo ba chấu.', 'Ổ bi và puli ép chặt trên trục (lắp dôi): gõ búa làm hỏng ổ bi, phải dùng cảo. Cảo chụm ba chấu vào vành rồi vặn trục vít cái để kéo từ từ.', ['Cầm cảo ba chấu (tay vặn chữ T màu cam).', 'Đưa mũi trục vít cái tới tâm Ổ bi sau, xoay cổ tay ngược chiều kim đồng hồ vài nhịp cho tới khi ổ bi tuột ra, rồi kéo ra khay.', 'Làm tương tự với Puli.'], 'Thanh trục vít cái của cảo xoay, chi tiết tuột khỏi trục, nhãn khay từ không đổi vì cảo không có vít rời.'),
      st('Tháo nắp máy trước (tuýp 13), ổ bi trước (cảo), rồi rút rôto.', 'Rôto lồng sóc đi qua lỗ nắp máy sau: phải mở hai nắp máy và rút hai ổ bi trước khi rôto ra được.', ['Nới 4 bu-lông nắp máy trước bằng tuýp 13 theo đường chéo, kéo Nắp máy trước ra khay.', 'Dùng cảo rút Ổ bi trước.', 'Chụm vào Rôto lồng sóc (không có vít) và kéo ra khay.'], 'Stato trống ở giữa bàn; cả 9 chi tiết nằm trên khay.'),
      st('Lắp lại và siết đủ vít.', 'Lắp ngược thứ tự tháo; mỗi chi tiết đặt vào vòng cam rồi siết đủ bu-lông / vít, theo đường chéo với nắp máy. Ổ bi và puli ép vào chỗ nên không cần siết lại.', ['Đặt Rôto, ổ bi trước, nắp máy trước vào đúng vị trí rồi siết 4 bu-lông bằng tuýp 13 theo đường chéo.', 'Tiếp tục lắp ổ bi sau, nắp máy sau, quạt (đóng phe bằng kìm), nắp che quạt (4 vít PH2), puli, nắp hộp đấu dây (vít dẹt).', 'Kiểm tra bảng: "Vít, bu-lông đang siết" phải bằng tổng số.'], 'Khi mọi chi tiết đã lắp và mọi vít đã siết, trạng thái báo "Hoàn thành" và động cơ chạy thử.'),
    ],
    conclude: 'Thứ tự tháo lắp đi theo quan hệ "chi tiết nào giữ chi tiết nào"; dụng cụ đúng cỡ và siết theo đường chéo bảo vệ chi tiết và giữ động cơ chạy êm.',
  },
  engine: {
    goal: 'Tháo rời và lắp lại động cơ đốt trong 4 kì bằng dụng cụ đúng cỡ: nới đều theo đường chéo, siết nắp máy bằng cờ lê lực.',
    tools: [
      'Động cơ xăng một xi-lanh đang lắp hoàn chỉnh; vít và bu-lông là các đầu tròn hoặc lục giác sáng bạc trên mặt trên từng chi tiết.',
      'Hộp dụng cụ (phía trước bàn): tua vít PH2 và dẹt, tuýp 10 và tuýp 13 có cần tự động, tuýp bugi, cờ lê lực, kìm mở phe, cờ lê vòng miệng. Rê con trỏ tới dụng cụ để hiện tên; mỗi dụng cụ ghi cỡ vít nó dùng.',
      'Chụm vào tay cầm để cầm dụng cụ; đưa mũi tới đầu vít thì mũi tự khớp nếu đúng dụng cụ. Vặn bằng cổ tay: ngược chiều kim đồng hồ để nới, thuận chiều để siết, xoay qua lại như vặn cần tự động. Chuột: giữ nút trên đầu vít.',
      'Bu-lông nắp máy và chân xi-lanh phải nới và siết theo đường chéo (con 1, 3, 2, 4); nắp máy tháo bằng tuýp 13 nhưng siết lại bằng cờ lê lực (kêu "cạch" khi đủ lực).',
      'Khay từ: vít đã tháo nằm ở đây. Chi tiết chỉ nhấc được khi mọi vít giữ nó đã nới hết; chụm vào chi tiết, kéo ra khay.',
    ],
    steps: [
      st('Tháo nắp dàn cò và bugi.', 'Nắp dàn cò che trục cam, bắt bằng 4 vít chữ thập; bugi ren M10 nằm sâu trong lỗ nên cần tuýp bugi dài ôm sứ cách điện, không dùng kìm hay cờ lê thường.', ['Cầm tua vít chữ thập PH2, nới 4 vít nắp dàn cò, kéo nắp ra khay.', 'Đặt PH2 về giá, cầm tuýp bugi (tay quay chữ T), đưa mũi tới bugi và xoay cổ tay ngược chiều kim đồng hồ tới khi bugi tuột ra.'], 'Nắp dàn cò nhấc ra, thấy trục cam; bugi nằm trên khay (không có vít rời).'),
      st('Tháo trục cam và cụm xu-páp.', 'Trục cam giữ bằng hai gối đỡ bu-lông M6 (đầu 10). Sau khi gỡ trục cam mới tới cụm xu-páp.', ['Cầm tuýp 10 có cần tự động, nới 2 bu-lông gối trục cam.', 'Kéo Trục cam ra khay, rồi kéo Cụm xu-páp ra khay.'], 'Nếu cầm tuýp 13 thì có lời nhắc "không vừa bu-lông M6": dùng tuýp 10.'),
      st('Nới nắp máy theo đường chéo bằng tuýp 13.', 'Nắp máy ép gioăng kín buồng cháy bằng 4 bu-lông: nới và siết theo đường chéo để nắp không vênh, gioăng không rò khí.', ['Cầm tuýp 13 (cần đỏ) từ hộp dụng cụ.', 'Nới bu-lông theo thứ tự ngược với thứ tự siết (1, 3, 2, 4): bài báo con kế tiếp nếu sai lượt.', 'Kéo Nắp máy ra khay.'], 'Mỗi lượt đúng, bu-lông nhô lên và biến mất, nhãn khay từ tăng; nắp máy nhấc ra khi đủ 4 con.'),
      st('Tháo xi-lanh, pít-tông, thanh truyền.', 'Xi-lanh bắt chân bằng 4 bu-lông M6; chốt pít-tông giữ bằng hai phe; đầu to thanh truyền bắt bằng hai bu-lông M6.', ['Dùng tuýp 10 nới 4 bu-lông chân xi-lanh theo đường chéo, kéo Xi-lanh ra khay.', 'Cầm kìm mở phe, mở 2 phe chốt pít-tông rồi kéo Pít-tông ra khay.', 'Dùng tuýp 10 nới 2 bu-lông đầu to, kéo Thanh truyền ra khay.'], 'Trục khuỷu lộ ra, bánh đà còn gắn.'),
      st('Tháo bánh đà bằng cờ lê vòng miệng.', 'Bánh đà giữ bằng một đai ốc lộ ra ngoài, vặn bằng cờ lê vòng miệng đúng cỡ.', ['Cầm cờ lê vòng miệng (nằm phẳng trên giá), đưa miệng tới đai ốc bánh đà.', 'Xoay cổ tay ngược chiều kim đồng hồ nhiều nhịp (đai ốc ren thuận cần vặn lâu hơn vít nhỏ), rồi kéo Bánh đà và Trục khuỷu ra khay.'], 'Cả 10 chi tiết nằm trên khay; khay từ đầy vít.'),
      st('Lắp lại, siết nắp máy bằng cờ lê lực.', 'Nắp máy là mối ghép quan trọng: siết bằng cờ lê lực theo đường chéo và dừng khi nghe "cạch" để đủ lực mà không làm biến dạng nắp.', ['Lắp từ trong ra ngoài: trục khuỷu, bánh đà (siết đai ốc), thanh truyền, pít-tông (đóng phe), xi-lanh.', 'Lắp nắp máy; cầm cờ lê lực siết con 1, 3, 2, 4; mỗi con tới khi có thông báo "Cạch!".', 'Lắp cụm xu-páp, trục cam, bugi, nắp dàn cò; siết đủ vít.'], 'Dòng trạng thái báo "Hoàn thành", động cơ nổ máy và thấy bốn kì.'),
    ],
    conclude: 'Dụng cụ đúng cỡ, nới và siết theo đường chéo, và cờ lê lực cho mối ghép quan trọng là ba quy tắc cơ bản của tháo lắp động cơ.',
  },
  robot: {
    goal: 'Lắp cánh tay robot bằng dụng cụ đúng cỡ rồi điều khiển đầu gắp bằng động học ngược.',
    tools: [
      'Các chi tiết nằm trên khay: servo đế, mâm xoay, servo vai, cánh tay dưới, servo khuỷu, cánh tay trên, tay kẹp, bo mạch điều khiển, pin.',
      'Hộp dụng cụ (phía trước bàn): tua vít chữ thập PH1 và PH2, chìa lục giác 2,5 và 4 mm, tua vít dẹt, tuýp 10. Servo và bo mạch dùng vít M3 chữ thập nhỏ (PH1); các khâu nhôm dùng vít lục giác chìm M5 (chìa 4 mm).',
      'Chụm vào chi tiết, kéo tới vòng cam để đặt vào chỗ; chi tiết vừa đặt thì vít còn lỏng (ô xanh hiện ở chỗ cần siết).',
      'Cầm dụng cụ đúng cỡ, đưa mũi tới ô xanh, xoay cổ tay THUẬN chiều kim đồng hồ (nhấc về, xoay tiếp) để siết; chuột thì giữ nút. Khi đã siết đủ mọi vít, tay robot hoạt động.',
      'Chụm vào tay kẹp rồi kéo trên mặt bàn để điều khiển đầu gắp sau khi lắp xong.',
    ],
    steps: [
      st('Lắp servo đế và mâm xoay, siết vít.', 'Servo đế bắt xuống đế bằng 4 vít M3; mâm xoay bắt lên trục servo bằng 4 vít lục giác chìm M5. Chọn đúng dụng cụ cho từng loại vít.', ['Chụm vào Servo đế, kéo tới vòng cam trên đế rồi buông.', 'Cầm tua vít PH1, siết 4 vít M3 (ô xanh); sai dụng cụ (PH2) sẽ có lời nhắc.', 'Đặt Mâm xoay lên, cầm chìa lục giác 4 mm và siết 4 vít.'], 'Ô xanh biến thành đầu vít khi siết xong; số vít đang siết trên bảng tăng.'),
      st('Lắp servo vai, cánh tay dưới, servo khuỷu.', 'Mỗi khâu gắn lên khâu trước: phải siết xong khâu dưới mới lắp tiếp khâu trên (thứ tự kèm điều kiện thực tế).', ['Lắp Servo vai và siết 4 vít PH1.', 'Lắp Cánh tay dưới và siết 2 vít lục giác 4 mm.', 'Lắp Servo khuỷu và siết 4 vít PH1.'], 'Nếu đặt chi tiết sai thứ tự: lời nhắc cần lắp chi tiết nào trước.'),
      st('Lắp cánh tay trên, tay kẹp, bo mạch và pin.', 'Cánh tay trên bắt bằng vít lục giác M5; tay kẹp và bo mạch bằng vít chữ thập M3. Pin gắn bằng dây dán nên không có vít.', ['Lắp Cánh tay trên, siết 2 vít bằng chìa 4 mm.', 'Lắp Tay kẹp, siết 2 vít PH1.', 'Lắp Bo mạch, siết 4 vít PH1; đặt Pin vào chỗ.'], 'Dòng trạng thái báo "Hoàn thành"; mọi vít đã siết.'),
      st('Điều khiển đầu gắp bằng động học ngược.', 'Bộ điều khiển giải bài toán động học ngược: từ vị trí (x, y) mong muốn tính ra góc từng khớp.', ['Chụm vào tay kẹp rồi kéo trên mặt bàn.', 'Kéo ra xa dần để thấy giới hạn tầm với.'], 'Tay máy uốn theo; khi duỗi thẳng thì đầu gắp dừng ở biên.'),
    ],
    conclude: 'Động học thuận tính vị trí từ góc khớp; động học ngược tính góc khớp từ vị trí. Lắp đúng thứ tự, đúng dụng cụ, siết đủ là điều kiện để cánh tay chính xác.',
  },
  drone: {
    goal: 'Lắp drone bốn cánh bằng dụng cụ đúng cỡ và hiểu cách nó bay và chuyển hướng.',
    tools: [
      'Các chi tiết trên khay: khung chữ X, hai động cơ quay thuận, hai động cơ quay ngược, mạch điều tốc (ESC), mạch điều khiển bay, bộ thu sóng, pin LiPo, cánh quay thuận, cánh quay ngược.',
      'Hộp dụng cụ (phía trước bàn): tua vít PH1 và PH2, chìa lục giác 2,5 mm và 4 mm, cờ lê vòng miệng, tua vít dẹt. Vít động cơ là vít chữ thập M3 (PH1); khung và mạch bay dùng vít lục giác chìm M3 (chìa 2,5 mm); đai ốc cánh dùng cờ lê vòng miệng.',
      'Đặt chi tiết vào vòng cam, rồi cầm dụng cụ đúng cỡ siết các ô xanh; xoay cổ tay thuận chiều kim đồng hồ, xoay qua lại như vặn cần; chuột thì giữ nút.',
      'Khi lắp xong và siết đủ, drone cất cánh; chụm vào drone rồi kéo để dẫn nó đi.',
    ],
    steps: [
      st('Lắp khung và các động cơ.', 'Hai cặp động cơ đối diện quay ngược chiều nhau để mô-men xoắn triệt tiêu, thân không tự xoay.', ['Đặt Khung chữ X vào vòng cam, siết 4 vít lục giác M3 bằng chìa 2,5 mm.', 'Đặt hai Động cơ quay thuận, siết mỗi con 4 vít PH1.', 'Đặt hai Động cơ quay ngược, siết bằng PH1.'], 'Vít xuất hiện ở các ô xanh khi siết; dùng PH2 thì lời nhắc nêu đúng PH1.'),
      st('Lắp mạch điều tốc, mạch bay, bộ thu, pin.', 'Mạch bay bắt qua cột đệm bằng vít lục giác M3; mạch điều tốc, bộ thu và pin cố định bằng dây rút hoặc dây dán nên không có vít.', ['Đặt Mạch điều tốc, Bộ thu sóng, Pin vào vị trí.', 'Đặt Mạch điều khiển bay, siết 4 vít bằng chìa lục giác 2,5 mm.'], 'Số vít đang siết trên bảng tăng; thứ tự sai thì có lời nhắc.'),
      st('Gắn cánh sau cùng và siết đai ốc bằng cờ lê.', 'Cánh gắn cuối cùng để an toàn. Cánh thuận lắp vào động cơ thuận: lắp nhầm thì lực đẩy hướng xuống, drone lật ngay khi cất cánh.', ['Đặt Cánh quay thuận lên động cơ thuận, Cánh quay ngược lên động cơ ngược.', 'Cầm cờ lê vòng miệng, đưa miệng tới từng đai ốc (2 con mỗi cặp) và xoay cổ tay thuận chiều.'], 'Dòng trạng thái báo "Hoàn thành" và drone cất cánh.'),
      st('Dẫn drone đi.', 'Muốn bay ngang, drone nghiêng thân: lực nâng có thành phần nằm ngang, gia tốc a = g·tanθ.', ['Chụm vào drone, kéo sang một bên rồi giữ.'], 'Thân drone nghiêng về hướng bay; thả tay thì drone trở về thăng bằng.'),
    ],
    conclude: 'Drone điều khiển bằng cách đổi tốc độ từng động cơ. Lắp đúng thứ tự và siết đúng dụng cụ, đặc biệt là cánh thuận / ngược, quyết định chuyến bay đầu tiên có thành công.',
  },
  pc: {
    goal: 'Lắp ráp một máy tính để bàn đúng thứ tự và đúng dụng cụ.',
    tools: [
      'Các linh kiện trên khay: bo mạch chủ, CPU, tản nhiệt CPU, RAM, SSD M.2, card đồ họa, bộ nguồn, cáp nguồn, nắp kính.',
      'Hộp dụng cụ (phía trước bàn): tua vít chữ thập PH1 (vít M2 nhỏ của SSD) và PH2 (vít M3 của bo mạch, nguồn, tản nhiệt, thùng máy), tua vít dẹt, chìa lục giác, tuýp 10. Vít máy tính là vít chữ thập nên không cần chìa hay tuýp.',
      'Đặt linh kiện vào vòng cam trong thùng máy, rồi cầm tua vít đúng cỡ siết các ô xanh; xoay cổ tay thuận chiều kim đồng hồ, nhấc về xoay tiếp; chuột thì giữ nút.',
      'Tản nhiệt và nguồn bắt nhiều vít: siết theo đường chéo để lực ép đều lên CPU và thùng máy.',
    ],
    steps: [
      st('Lắp bo mạch chủ và CPU.', 'Bo mạch chủ bắt lên các chân đỡ bằng vít, không để mặt sau chạm vỏ thùng (chập mạch). CPU đặt đúng góc có dấu tam giác, không dùng lực.', ['Đặt Bo mạch chủ vào vòng cam, cầm tua vít PH2 và siết 6 vít.', 'Đặt CPU vào đế (không có vít).'], 'Số vít đang siết trên bảng là 6; dùng PH1 sẽ có lời nhắc nêu đúng PH2.'),
      st('Lắp tản nhiệt, RAM, SSD.', 'Tản nhiệt ép keo tản nhiệt vào CPU: siết 4 vít theo đường chéo. Khe M.2 nằm dưới card đồ họa nên SSD phải lắp trước card.', ['Đặt Tản nhiệt CPU, siết 4 vít PH2 theo đường chéo (1, 3, 2, 4).', 'Đặt hai thanh RAM (ấn tới khi lẫy khoá).', 'Đặt SSD M.2, đổi sang tua vít PH1 và siết 1 vít M2.'], 'Siết sai đường chéo: lời nhắc con kế tiếp. SSD chỉ siết được bằng PH1.'),
      st('Lắp card đồ họa, bộ nguồn, cáp, nắp kính.', 'Card đồ họa cần thanh chắn bắt vít; bộ nguồn bắt vào thùng bằng 4 vít; nắp kính đậy sau cùng.', ['Đặt Card đồ họa, siết 2 vít PH2.', 'Đặt Bộ nguồn, siết 4 vít theo đường chéo.', 'Đặt Cáp nguồn rồi Nắp kính; siết 4 vít tai hồng.'], 'Dòng trạng thái báo "Hoàn thành": quạt quay, đèn sáng, máy khởi động.'),
    ],
    conclude: 'Thứ tự lắp theo nguyên tắc: thứ nằm dưới và bị che lắp trước. Dụng cụ đúng cỡ và siết đều tay (theo đường chéo) bảo vệ linh kiện đắt tiền.',
  },
  cartpole: {
    goal: 'Giữ con lắc ngược đứng thẳng bằng điều khiển phản hồi.',
    tools: [
      'Xe chạy trên ray (giữa bàn) mang một cột có bản lề ở đáy; khối lượng xe và cột, chiều dài cột ghi ở cuối bảng.',
      'Vòng xanh: chụm vào vòng rồi kéo để dời vị trí mong muốn của xe khi bộ điều khiển đang BẬT. Khi bộ điều khiển TẮT thì chụm vào xe và kéo xe bằng tay.',
      'Tab Thao tác: hộp "Bộ điều khiển phản hồi", bốn thanh trượt kx, kv, kθ, kω, nút "Đẩy cột" và nút "Làm lại"; dòng trạng thái ghi thời gian cột đã đứng.',
    ],
    steps: [
      st('Để bộ điều khiển bật và dời xe.', 'Bộ điều khiển đo góc cột và vị trí xe rồi tự đẩy xe về phía cột đang đổ để đỡ nó.', ['Đảm bảo hộp "Bộ điều khiển phản hồi" đang được chọn.', 'Chụm vào vòng xanh và kéo chậm sang trái hoặc phải rồi buông.', 'Nhìn dòng trạng thái "Đứng … s".'], 'Xe đi theo vòng xanh trong khi cột vẫn đứng; bộ đếm thời gian đứng tăng.'),
      st('Đẩy cột một cái.', 'Hệ chịu được nhiễu vì lực điều khiển u = kx·(x − x_ref) + kv·v + kθ·θ + kω·ω luôn kéo sai lệch về 0.', ['Bấm nút "Đẩy cột" ở tab Thao tác.', 'Nhìn cột nghiêng rồi được xe đỡ trở lại.'], 'Cột lắc nhẹ rồi lại đứng; đứng đủ 10 giây thì báo "Đạt".'),
      st('Giảm dần kθ rồi kω.', 'kθ là "độ cứng" đỡ cột, kω là giảm chấn. Thiếu kθ cột đổ; thiếu kω cột lắc ngày càng mạnh.', ['Kéo thanh trượt kθ giảm dần rồi bấm "Đẩy cột" sau mỗi lần.', 'Đặt lại kθ, rồi giảm kω và so cách cột dao động.'], 'kθ quá thấp: dòng trạng thái báo "Cột đã ngã". kω quá thấp: cột dao động ngày càng rộng.'),
      st('Tắt bộ điều khiển và tự giữ cột.', 'Con người phản ứng chậm (khoảng 0,2 s) nên rất khó: vị trí thẳng đứng là cân bằng không bền.', ['Bỏ chọn hộp "Bộ điều khiển phản hồi".', 'Chụm vào xe và kéo qua lại để đỡ cột.', 'Bấm "Làm lại" khi cột đổ.'], 'Cột đổ rất nhanh nếu tay không đủ nhanh; điều này cho thấy vì sao cần bộ điều khiển.'),
    ],
    conclude: 'Một hệ không bền có thể được giữ ổn định nhờ phản hồi đủ nhanh và đủ mạnh.',
  },
  differential: {
    goal: 'Hiểu bộ vi sai chia chuyển động cho hai bánh xe và vì sao cần khoá vi sai.',
    tools: [
      'Cầu xe đặt trên giá (giữa bàn): hai bánh xe, hai bán trục, vỏ vi sai màu cam mang vành chậu, hai bánh răng hành tinh màu đỏ có vạch trắng, trục các-đăng dẫn động từ phía sau.',
      'Ba tấm mặt đường (phía trước, bên trái): Bùn, Sỏi, Nhựa khô. Chụm để cầm một tấm, đưa tới dưới bánh trái rồi buông.',
      'Cần khóa vi sai (phía trước, giữa): chụm vào núm đỏ, gạt sang phải = KHÓA, sang trái = MỞ.',
      'Vô lăng (phía trước, bên phải): chụm vào vành và đưa tay vòng ngược chiều kim đồng hồ để đánh lái sang trái (bán kính cua từ 100 m xuống 4 m); vòng ngược lại để trả lái.',
    ],
    steps: [
      st('Cho xe đi thẳng trên đường tốt.', 'Đi thẳng thì hai bánh quay cùng tốc độ, bánh răng hành tinh chỉ quay theo vỏ chứ không tự xoay quanh trục của nó.', ['Chụm vào tấm "Nhựa khô", đưa tới dưới bánh trái rồi buông.', 'Kiểm tra cần khóa đang ở MỞ và vô lăng thẳng (vạch đỏ ở đỉnh).', 'Nhìn vạch trắng trên bánh răng hành tinh màu đỏ.'], 'Nhãn hai bánh cùng ghi ×1,00; vạch trắng trên bánh răng hành tinh không xoay.'),
      st('Đánh lái vào cua.', 'Bánh ngoài đi quãng đường dài hơn nên phải quay nhanh hơn. Bánh răng hành tinh tự xoay để bù; trung bình hai bánh vẫn bằng tốc độ vỏ vi sai.', ['Chụm vào vành vô lăng.', 'Đưa tay vòng ngược chiều kim đồng hồ tới khi dòng chữ cuối màn hình báo bán kính cua khoảng 5 m.', 'Buông tay và so sánh nhãn hai bánh.'], 'Bánh trái (phía trong) chậm lại còn khoảng ×0,84, bánh phải nhanh lên khoảng ×1,16; bánh răng hành tinh xoay đều.'),
      st('Cho bánh trái sa lầy.', 'Vi sai mở chia mô-men đều: bánh trong bùn bám được bao nhiêu thì bánh kia cũng chỉ nhận bấy nhiêu.', ['Trả lái về thẳng (vòng tay theo chiều kim đồng hồ tới 100 m).', 'Cầm tấm "Bùn" đặt dưới bánh trái.'], 'Bánh trái quay tít ×2,00, bánh phải đứng yên ×0,00; dòng chữ báo "xe sa lầy".'),
      st('Khóa vi sai để thoát lầy.', 'Hai bán trục bị nối cứng, bánh còn bám đường nhận đủ mô-men để kéo xe ra.', ['Chụm vào núm đỏ của cần khóa.', 'Gạt sang phải tới chữ KHÓA rồi buông.'], 'Hai bánh cùng quay ×1,00; dòng chữ báo "Vi sai KHÓA · xe chạy"; tab Thao tác báo "Đạt".'),
      st('Thử vào cua khi đang khóa.', 'Khóa thì hai bánh buộc quay cùng tốc độ dù quãng đường khác nhau: lốp bị trượt, mòn nhanh và khó lái. Vì vậy chỉ khóa khi sa lầy.', ['Giữ cần ở KHÓA, đánh vô lăng sang trái.', 'So sánh nhãn hai bánh với bước 2, rồi gạt cần về MỞ.'], 'Dù vào cua, hai bánh vẫn ×1,00; bánh răng hành tinh không xoay.'),
    ],
    conclude: 'Vi sai cho hai bánh quay khác tốc độ khi vào cua; khoá vi sai chỉ dùng khi một bánh mất độ bám.',
  },
  pid: {
    goal: 'Chỉnh bộ điều khiển PID để xe hai bánh tự đứng thẳng.',
    steps: [
      st('Đặt K_i = K_d = 0, tăng dần K_p rồi đẩy xe.', 'K_p nhỏ hơn khoảng 33 thì lực đỡ nhỏ hơn mô-men trọng lực: xe ngã. Lớn hơn thì xe không ngã nhưng lắc mãi.', ['Hàng núm phía trước từ trái sang: "K_p (tỉ lệ)", "K_i (tích phân)", "K_d (vi phân)". Giữ K_i và K_d ở 0.', 'Chụm vào tay nắm của cần "Đẩy xe" (bên phải bàn), kéo về bên trái cho dây cao su giãn rồi buông: mô phỏng chạy lại.', 'Giữ nút "+" của núm K_p tới khoảng 60, nhả tay rồi đẩy xe lại.'], 'Với K_p = 5: xe ngã (dòng chữ "Xe ngã"). Với K_p = 60: xe đứng nhưng lắc mãi với biên độ khoảng ±26°.'),
      st('Thêm K_d.', 'Thành phần vi phân phản ứng theo tốc độ nghiêng, như một giảm chấn: dao động tắt dần.', ['Giữ nút "+" của núm K_d tới khoảng 8 rồi nhả.', 'Kéo cần "Đẩy xe" và buông; nhìn đồ thị góc nghiêng.'], 'Dao động co lại còn khoảng ±3°.'),
      st('Nhìn đồ thị góc nghiêng sau vài giây.', 'Xe đứng nhưng còn nghiêng một góc nhỏ không đổi vì trọng tâm lệch: chỉ P và D không khử được sai số tĩnh.', ['Nhìn đường xanh lá trên bảng góc theo thời gian (5 giây) so với đường zero.', 'Đọc dòng chữ cuối màn hình.'], 'Đường góc không về đúng 0 mà nằm lệch nhẹ; dòng chữ báo xe còn lắc vài độ.'),
      st('Thêm K_i.', 'Thành phần tích phân cộng dồn sai số theo thời gian, nên chừng nào còn lệch nó còn tăng lực cho tới khi độ lệch về 0.', ['Giữ nút "+" của núm K_i tới khoảng 40 rồi nhả.', 'Kéo cần "Đẩy xe", buông và chờ đồ thị chạy hết 5 giây.'], 'Đường góc quay về đúng 0°; ô kết quả báo "Đạt: xe đứng vững, lệch cuối 0,00°" (bộ hệ số mẫu K_p 60, K_i 40, K_d 8).'),
    ],
    conclude: 'P phản ứng theo sai số hiện tại, D theo xu hướng, I theo sai số tích lũy: ba thành phần bù cho nhau.',
  },
  turbine: {
    goal: 'Vận hành động cơ phản lực micro theo chu trình Brayton trong giới hạn an toàn.',
    tools: [
      'Động cơ cắt bổ (giữa bàn), từ trái sang phải: bánh công tác máy nén li tâm, ống lửa của buồng đốt, đĩa tuabin, ống phun. Một trục nối máy nén với tuabin.',
      'Cần ga (phía trước, bên phải): chụm vào tay nắm màu cam. Kéo hết về phía mình = CẮT nhiên liệu (máy tắt). Đẩy ra xa = khởi động rồi tăng ga từ 10 đến 100 %.',
      'Van nhiên liệu (phía trước, giữa): chụm vào tay van đỏ và đưa tay vòng quanh nó. Vòng ngược chiều kim đồng hồ để mở (hỗn hợp giàu hơn), cùng chiều để khép; từ 6 đến 35 g nhiên liệu trên mỗi kg không khí.',
    ],
    steps: [
      st('Khởi động máy.', 'Máy nén hút và nén không khí, buồng đốt cấp nhiệt, khí nóng giãn nở qua tuabin và ống phun tạo lực đẩy. Tuabin chỉ lấy vừa đủ công để kéo máy nén qua trục chung.', ['Chụm vào tay nắm cần ga.', 'Đẩy cần ra xa khỏi chữ CẮT một đoạn ngắn rồi buông.', 'Quan sát trục và hai bánh cánh.'], 'Máy nén và tuabin cùng quay nhanh dần; ống lửa sáng đỏ; luồng phụt màu cam hiện ra sau ống phun.'),
      st('Tăng ga dần.', 'Lưu lượng khí và tỉ số nén tăng theo vòng quay nên lực đẩy tăng.', ['Chụm lại vào cần ga, đẩy dần về phía chữ TỐI ĐA.', 'Dừng ở vài mức (30 %, 60 %, 100 %) và đọc lực đẩy ở cuối màn hình.'], 'Luồng phụt dài ra; lực đẩy tăng theo mức ga.'),
      st('Làm nghèo hỗn hợp cho tới khi tắt lửa.', 'Hỗn hợp quá nghèo không giữ được ngọn lửa: buồng đốt tắt, lực đẩy về 0 dù máy còn quay theo quán tính.', ['Chụm vào tay van đỏ.', 'Đưa tay vòng cùng chiều kim đồng hồ tới khi nhãn van báo dưới 9 g/kg.'], 'Ống lửa tối đi, luồng phụt biến mất; dòng chữ báo "Tắt lửa".'),
      st('Làm giàu hỗn hợp tới sát giới hạn nhiệt.', 'Nhiệt độ trước tuabin càng cao thì lực đẩy càng lớn, nhưng vượt 1100 °C thì cánh tuabin mềm ra và biến dạng.', ['Để ga 100 %. Vòng tay van ngược chiều kim đồng hồ từ từ.', 'Theo dõi nhiệt độ trước tuabin ở cuối màn hình; dừng khi còn dưới 1100 °C (khoảng 22 g/kg).', 'Thử mở quá tay để thấy cảnh báo, rồi khép lại.'], 'Dưới giới hạn: luồng phụt cam, tab Thao tác báo "Đạt". Vượt giới hạn: luồng phụt đỏ, báo cánh tuabin quá nhiệt.'),
      st('Tắt máy đúng cách.', 'Cắt nhiên liệu thì ngọn lửa tắt ngay, nhưng rô-to có quán tính nên quay chậm dần chứ không dừng lập tức.', ['Chụm vào cần ga, kéo hết về phía mình tới chữ CẮT.'], 'Dòng chữ báo "Đang giảm tốc…"; trục quay chậm dần rồi dừng.'),
    ],
    conclude: 'Lực đẩy của động cơ phản lực bị giới hạn bởi nhiệt độ mà cánh tuabin chịu được.',
  },
  foc: {
    goal: 'Điều khiển động cơ đồng bộ nam châm vĩnh cửu vượt tốc độ định mức bằng cách làm yếu từ thông.',
    steps: [
      st('Đóng điện và tăng i_q với i_d = 0.', 'Trong hệ trục quay theo rô-to, i_q vuông góc với từ thông nam châm nên sinh mô-men: T tỉ lệ với i_q.', ['Chụm vào đầu cần gạt công tắc dao (bên phải bàn), gạt sang phải để "Đóng contactor"; đèn báo sáng xanh.', 'Hàng núm phía trước từ trái sang: "Tốc độ", "Dòng i_q (sinh mô-men)", "Dòng i_d (từ thông)". Giữ i_q = 40 A và i_d = 0.', 'Đọc dòng chữ cuối màn hình.'], 'Rô-to quay; dòng chữ báo "12,0 N·m ở 6000 vòng/phút"; hai mũi tên dòng điện và điện áp nằm trong vòng tròn.'),
      st('Tăng tốc độ và nhìn mũi tên điện áp.', 'Sức phản điện động ω·λ tăng theo tốc độ; tới lúc mũi tên điện áp chạm vòng giới hạn của bộ nghịch lưu thì không tăng tốc được nữa.', ['Giữ nút "+" của núm "Tốc độ" tới 12 000 vòng/phút.', 'Nhìn mũi tên xanh lá (điện áp) so với vòng tròn giới hạn.'], 'Mũi tên điện áp chui ra ngoài vòng; dòng chữ báo "Thiếu điện áp: cần 271 V, nghịch lưu chỉ có 202 V".'),
      st('Đưa i_d về phía âm.', 'Dòng i_d âm tạo từ thông ngược với nam châm, trừ bớt sức phản điện động: điện áp cần giảm xuống, động cơ chạy tiếp được.', ['Giữ nút "−" của núm "Dòng i_d" tới khoảng −80 A rồi nhả.', 'Nhìn lại mũi tên điện áp.'], 'Mũi tên điện áp rút lại vào trong vòng; điện áp cần giảm từ 271 V xuống còn khoảng 131 V (v_q).'),
      st('Giữ dòng tổng dưới 100 A và mô-men trên 12 N·m ở 12 000 vòng/phút.', 'Dòng tổng là tổng vectơ của i_d và i_q: dùng nhiều i_d để yếu từ thì còn ít chỗ cho i_q sinh mô-men.', ['Đọc dòng tổng và mô-men ở cuối màn hình.', 'Nếu dòng tổng vượt 100 A, giảm i_q một chút; nếu mô-men dưới 12 N·m thì tăng i_q.', 'Gạt công tắc về trái để "Cắt nguồn" khi xong.'], 'Ô kết quả báo "Đạt: 15,8 N·m ở 12 000 vòng/phút" với dòng tổng khoảng 89 A.'),
    ],
    conclude: 'Tách dòng thành thành phần sinh mô-men và thành phần từ thông cho phép điều khiển động cơ xoay chiều như động cơ một chiều.',
  },
  stirling: {
    goal: 'Tìm cách tăng công suất của động cơ Stirling.',
    tools: [
      'Động cơ Stirling kiểu alpha (giữa bàn): xi-lanh nóng có chụp đồng (phía sau), xi-lanh lạnh có cánh tản nhiệt (phía trước), hai pít-tông nối vào hai chốt khuỷu lệch nhau 90°, bánh đà bên phải.',
      'Đèn khò (bên trái xi-lanh nóng): chụm vào bình gas xanh và kéo lại gần chụp đồng để nung nóng hơn (tới 800 °C), kéo ra xa để nguội bớt (300 °C).',
      'Bơm tay (phía trước, bên phải): chụm vào cán chữ T, kéo lên hết rồi ấn xuống hết; mỗi nhát tăng áp suất khoảng 60 % (tối đa 100 bar).',
      'Đồng hồ áp suất (cạnh bơm): chụm và GIỮ vào đồng hồ để mở van xả, áp suất tụt dần về 1 bar.',
      'Bốn bình khí (phía trước): không khí, N₂, He, H₂. Cầm một bình đặt vào vòng vàng "Cổng nạp khí" rồi buông; khí cũ được xả và áp suất về 1 bar.',
      'Bảng chu trình P–V (phía trước, bên trái): chấm cam chạy quanh vòng theo góc quay của trục.',
    ],
    steps: [
      st('Quan sát máy chạy ở điều kiện ban đầu.', 'Khí được nung ở xi-lanh nóng, giãn nở sinh công, rồi bị nén ở xi-lanh lạnh. Diện tích vòng P–V là công mỗi chu trình.', ['Chưa chạm vào gì. Nhìn hai pít-tông: pít-tông nóng luôn đi trước pít-tông lạnh một phần tư vòng.', 'Nhìn chấm cam chạy quanh vòng P–V.', 'Đọc công suất ở cuối màn hình.'], 'Công suất chỉ khoảng 11 W với không khí ở 1 bar, 400 °C.'),
      st('Nung nóng hơn.', 'Chênh lệch nhiệt độ lớn hơn thì vòng P–V rộng hơn; hiệu suất tối đa là 1 − T_lạnh/T_nóng.', ['Chụm vào bình gas xanh của đèn khò.', 'Kéo sang phải, lại gần chụp đồng, tới khi nhãn báo 800 °C.'], 'Chụp đồng đỏ rực; vòng P–V cao lên; công suất tăng khoảng gấp rưỡi.'),
      st('Bơm thêm khí.', 'Nhiều khí hơn trong cùng thể tích thì áp suất mọi điểm của chu trình cao hơn: công tỉ lệ thuận với áp suất nạp.', ['Chụm vào cán bơm, kéo lên hết, ấn xuống hết.', 'Lặp lại khoảng 10 nhát; nhìn kim đồng hồ sau mỗi nhát.', 'Dừng khi đồng hồ báo 100 bar.'], 'Kim đồng hồ quay dần sang phải; công suất tăng gần 100 lần so với 1 bar.'),
      st('Đổi khí công tác.', 'Khí nhẹ (He, H₂) dẫn nhiệt tốt và ít nhớt nên kịp nhận và nhả nhiệt khi máy chạy nhanh.', ['Cầm bình "He" đặt vào cổng nạp khí (áp suất về 1 bar), bơm lại tới 100 bar, đọc công suất.', 'Làm tương tự với bình "H₂".'], 'Cùng 100 bar và 800 °C: He cho công suất gần gấp đôi không khí, H₂ cao nhất; bánh đà quay nhanh hơn.'),
      st('Xả khí và kiểm tra lại quan hệ với áp suất.', 'Công suất tỉ lệ với áp suất nạp nên xả khí thì công suất giảm theo.', ['Chụm và giữ vào đồng hồ áp suất khoảng 1 giây, rồi nhả.', 'Đọc áp suất và công suất mới.'], 'Áp suất giảm còn khoảng một phần mười thì công suất cũng giảm còn khoảng một phần mười.'),
    ],
    conclude: 'Công suất Stirling tăng theo áp suất nạp, chênh lệch nhiệt độ và khả năng trao đổi nhiệt của khí công tác.',
  },
  harmonic: {
    goal: 'Hiểu cách bộ truyền bánh răng sóng đạt tỉ số truyền rất lớn trong một cấp.',
    steps: [
      st('Quan sát ba bộ phận: bộ tạo sóng hình elip, bánh mềm và vành cứng.', 'Bộ tạo sóng ép bánh mềm thành elip nên nó ăn khớp với vành cứng ở hai đầu trục dài.', ['Nhìn vành cứng (vòng kim loại xám), bánh mềm (vòng xanh lá biến dạng thành elip) và bộ tạo sóng (thanh vàng ở giữa).', 'Nhìn chấm trắng ở đầu ra: nó quay chậm hơn nhiều.'], 'Bánh mềm bị ép thành elip và ăn khớp với vành cứng ở hai đầu; chấm trắng đầu ra quay ngược chiều.'),
      st('Xoay tốc độ động cơ và nhìn chấm trắng đầu ra.', 'Bánh mềm ít hơn vành cứng 2 răng. Mỗi vòng của bộ tạo sóng, bánh mềm chỉ lùi 2 răng: tỉ số truyền = số răng bánh mềm / 2.', ['Hàng núm phía trước từ trái sang: "Tốc độ động cơ", "Mô-men tải". Giữ nút "+" của núm tốc độ tới khoảng 3000 vòng/phút.', 'Đọc dòng chữ cuối màn hình: tỉ số truyền và tốc độ đầu ra.'], 'Với bánh mềm 200 răng: tỉ số 100:1, đầu ra 30 vòng/phút; chấm trắng quay chậm hơn 100 lần.'),
      st('Lắp bánh mềm nhiều răng hơn để tăng tỉ số truyền.', 'Tốc độ ra = tốc độ vào / tỉ số truyền, quay ngược chiều.', ['Chụm vào vật "300" ở khay "Bánh mềm (số răng)", đưa tới "Ổ lắp: Bánh mềm (số răng)" rồi buông.', 'Giữ tốc độ động cơ khoảng 3000 vòng/phút và đọc dòng chữ.'], 'Tỉ số 150:1, đầu ra khoảng 20 vòng/phút; ô kết quả báo kết quả so với yêu cầu của bài.'),
      st('Tăng mô-men tải quá 130 % danh định.', 'Bánh mềm biến dạng quá mức và nhảy qua răng vành cứng (trượt răng), làm hỏng bộ truyền.', ['Giữ nút "+" của núm "Mô-men tải" tới khoảng 140 % rồi nhả.', 'Nhìn màu bánh mềm và dòng chữ cuối màn hình.'], 'Bánh mềm đổi sang màu đỏ; dòng chữ báo "TRƯỢT RĂNG: quá tải, bánh mềm nhảy qua răng vành cứng".'),
    ],
    conclude: 'Chênh lệch 2 răng giữa bánh mềm và vành cứng tạo tỉ số truyền hàng trăm lần, không có độ rơ: lí do nó được dùng ở khớp robot.',
  },
  fatigue: {
    goal: 'Dự đoán tuổi thọ của chi tiết có vết nứt dưới tải lặp lại.',
    steps: [
      st('Lắp tấm nhôm với vết nứt 2 mm, đặt biên độ ứng suất 200 MPa.', 'Mỗi chu kì tải vết nứt dài thêm một chút: da/dN = C·ΔK³, với ΔK = Y·Δσ·√(πa) tăng theo chiều dài vết nứt.', ['Chụm vào vật "Nhôm" ở khay "Vật liệu", đưa tới "Ổ lắp: Vật liệu" rồi buông.', 'Chụm vào vật "2" ở khay "Vết nứt ban đầu (mm)", đưa tới ổ lắp tương ứng rồi buông.', 'Hàng núm phía trước chỉ còn "Biên độ ứng suất Δσ": giữ ở 200 MPa.'], 'Vết nứt đỏ lan dần trên tấm; dòng chữ báo ΔK ban đầu khoảng 17,8 MPa√m.'),
      st('Theo dõi tới lúc gãy.', 'Vết nứt bò rất chậm lúc đầu rồi tăng tốc. Khi ΔK đạt độ dai phá hủy K_IC thì gãy giòn đột ngột.', ['Nhìn đường nứt đỏ lan dần trên tấm và đầu vết nứt (chấm cam) to dần; mỗi 7 giây cảnh chạy lại từ đầu.', 'Đọc dòng chữ cuối màn hình khi tấm tách đôi (GÃY GIÒN) để lấy tuổi thọ.'], 'Nhôm 7075-T6 gãy sau khoảng 5 541 chu kì khi vết nứt dài khoảng 5,3 mm (K đạt K_IC = 29).'),
      st('Giảm biên độ ứng suất.', 'Tuổi thọ tỉ lệ nghịch với lập phương của ứng suất: giảm tải một nửa thì sống lâu ít nhất 8 lần.', ['Giữ nút "−" của núm "Biên độ ứng suất Δσ" tới 100 MPa rồi nhả.', 'Đọc số chu kì tới lúc gãy.'], 'Gãy sau khoảng 79 000 chu kì, hơn 14 lần so với 200 MPa.'),
      st('Lắp tấm titan và vết nứt ban đầu 0,5 mm.', 'Vật liệu có K_IC cao và tốc độ nứt thấp chịu lâu hơn; phát hiện vết nứt khi còn nhỏ cho thêm rất nhiều chu kì.', ['Chụm vào vật "Titan" đặt vào ổ vật liệu; chụm vào vật "0.5" đặt vào ổ vết nứt.', 'Giảm Δσ xuống 80 MPa và đọc kết quả; thử lại với Δσ = 200 MPa.'], 'Ti-6Al-4V, 80 MPa, vết nứt 0,5 mm: gãy sau khoảng 2 010 000 chu kì, ô kết quả báo "Đạt". Ở 200 MPa chỉ còn khoảng 126 000 chu kì.'),
    ],
    conclude: 'Phần lớn tuổi thọ mỏi nằm ở giai đoạn vết nứt còn nhỏ, nên kiểm tra định kì để phát hiện sớm là quan trọng nhất.',
  },
  quadruped: {
    goal: 'Tìm điều kiện để robot bốn chân không trượt và không lật khi bị đạp ngang.',
    steps: [
      st('Đặt mặt sàn "Băng" rồi đạp.', 'Chân chỉ truyền được lực ngang tối đa μ·m·g. Trên băng μ rất nhỏ nên robot trượt.', ['Chụm vào vật "Băng" ở khay "Mặt sàn", đưa tới "Ổ lắp: Mặt sàn" rồi buông.', 'Hàng núm phía trước từ trái sang: "Chiều cao trọng tâm", "Lực đạp ngang". Để chiều cao 0,40 m và lực 60 N.', 'Chụm vào tay nắm cần "Đạp!" (bên phải bàn), kéo về bên trái cho dây cao su giãn rồi buông.'], 'Robot bị đạp trượt đi; dòng chữ báo "Trượt chân: lực ngang vượt nón ma sát" (không trượt chỉ tới 6 N).'),
      st('Đổi mặt sàn sang "Nhám" và đạp lại với thân cao.', 'Không trượt nữa nhưng robot lật: lực đạp tạo mô-men F·h quanh hàng chân bên kia, lớn hơn mô-men giữ m·g·w.', ['Đặt vật "Nhám" vào ổ mặt sàn.', 'Kéo cần "Đạp!" và buông.'], 'Robot đứng yên chân nhưng bị lật; dòng chữ báo "Lật: trọng tâm bị đẩy ra ngoài đa giác đỡ" (ngưỡng lật 44 N).'),
      st('Hạ thấp trọng tâm rồi đạp lại.', 'Cánh tay đòn h ngắn lại nên mô-men lật nhỏ đi, trọng tâm còn nằm trong đa giác đỡ.', ['Giữ nút "−" của núm "Chiều cao trọng tâm" tới khoảng 0,25 m rồi nhả.', 'Kéo cần "Đạp!" và buông.'], 'Robot trụ vững trước lực 60 N; ô kết quả báo "Đạt". Ngưỡng lật tăng lên khoảng 70 N.'),
      st('Tăng lực đạp tới khi robot thua.', 'Giới hạn là giá trị nhỏ hơn trong hai ngưỡng: trượt (μ·m·g) và lật (m·g·w/h).', ['Giữ nút "+" của núm "Lực đạp ngang" tới khoảng 200 N rồi nhả.', 'Kéo cần "Đạp!" và buông.'], 'Robot thua ở ngưỡng nhỏ hơn trong hai ngưỡng; dòng chữ báo nguyên nhân (trượt hoặc lật).'),
    ],
    conclude: 'Bộ điều khiển giỏi đến đâu cũng phải nằm trong nón ma sát và đa giác đỡ; robot thật còn bước chân ra để mở rộng đa giác đỡ.',
  },
  surgery: {
    goal: 'Giảm run tay của bác sĩ xuống mức khâu được mạch máu 1 mm qua robot phẫu thuật.',
    steps: [
      st('Nhìn hai đường khi chưa bật gì.', 'Tỉ lệ 1:1 thì mọi rung động của tay truyền nguyên sang dụng cụ.', ['Nhìn đường tay bác sĩ run và đường đầu kim bên cạnh.', 'Đọc dòng chữ cuối màn hình: độ lệch của đầu kim.'], 'Ở K = 1, bộ lọc 0 %, đường truyền cáp quang: đầu kim lệch 0,600 mm (run 0,500 mm cộng trễ 0,100 mm).'),
      st('Tăng tỉ lệ thu nhỏ chuyển động.', 'Tay đi 10 mm thì đầu kim đi 1 mm: cả chuyển động chủ ý lẫn run đều nhỏ đi K lần.', ['Hàng núm phía trước từ trái sang: "Tỉ lệ thu nhỏ chuyển động", "Bộ lọc khử run". Giữ nút "+" của núm tỉ lệ tới 10 : 1.', 'Đọc lại độ lệch đầu kim.'], 'Độ lệch giảm còn khoảng 0,060 mm: nhỏ hơn 10 lần.'),
      st('Tăng bộ lọc khử run.', 'Run sinh lí nằm ở dải 8–12 Hz, nhanh hơn chuyển động chủ ý nên lọc bỏ được mà không ảnh hưởng thao tác.', ['Giữ nút "+" của núm "Bộ lọc khử run" tới khoảng 80 % rồi nhả.', 'Đọc dòng chữ cuối màn hình.'], 'Run còn lại chỉ 0,010 mm; đầu kim lệch 0,020 mm và ô kết quả báo "Đạt".'),
      st('Đổi đường truyền từ cáp quang sang 4G rồi vệ tinh.', 'Độ trễ làm đầu kim luôn đi sau ý định của tay; trễ lớn thì sai lệch tăng và vòng điều khiển dễ mất ổn định.', ['Chụm vào vật "4G" ở khay "Đường truyền", đưa tới "Ổ lắp: Đường truyền" rồi buông; đọc độ lệch.', 'Đặt tiếp "Vệ tinh" và đọc lại.'], 'Với vệ tinh (200 ms) độ lệch tăng lên khoảng 0,110 mm dù run đã bị lọc: phần trễ chiếm đa số.'),
    ],
    conclude: 'Thu nhỏ chuyển động và lọc run cho độ chính xác vượt bàn tay người; độ trễ mạng là giới hạn của phẫu thuật từ xa.',
  },
  slam: {
    goal: 'Hiểu vì sao bản đồ của robot bị trôi và cách đóng vòng lặp sửa nó.',
    steps: [
      st('Để "Đóng vòng lặp" tắt và xem sai số sau một vòng chạy.', 'Robot ước lượng vị trí bằng cách cộng dồn quãng đường bánh xe; sai số nhỏ mỗi bước cộng lại thành trôi lớn.', ['Hàng khay phía trước: "Đóng vòng lặp" (Tắt/Bật) và "Cảm biến bánh xe" (Tốt, Khá, Kém, Rất kém). Kiểm tra vật "Tắt" đang ở ổ.', 'Hàng núm: "Chiều dài vòng chạy", "Số điểm đặc trưng nhận lại". Để chiều dài 100 m, cảm biến "Kém".', 'Nhìn đường cam (quỹ đạo ước lượng) so với đường thật.'], 'Quỹ đạo ước lượng không khép kín: sai số cuối vòng 3,00 m sau 100 m.'),
      st('Lắp cảm biến bánh xe tốt hơn, rồi kéo dài vòng chạy.', 'Độ trôi giảm nhưng không bao giờ về 0, và luôn tăng theo quãng đường.', ['Chụm vào vật "Tốt" ở khay "Cảm biến bánh xe", đưa tới "Ổ lắp" rồi buông: đọc sai số (0,50 m).', 'Đặt lại "Kém"; giữ nút "+" của núm "Chiều dài vòng chạy" tới 200 m và đọc lại.'], 'Cảm biến tốt: sai số cuối vòng giảm xuống 0,50 m. Vòng dài gấp đôi: sai số cũng gấp đôi (6,00 m).'),
      st('Bật "Đóng vòng lặp".', 'Khi nhận ra đã quay về chỗ cũ, robot có thêm một ràng buộc: điểm đầu và điểm cuối trùng nhau. Tối ưu lại cả quỹ đạo sẽ chia đều sai số.', ['Chụm vào vật "Bật" ở khay "Đóng vòng lặp", đưa tới ổ lắp rồi buông.', 'Đọc lại sai số cuối vòng.'], 'Quỹ đạo được kéo khép lại; sai số cuối vòng giảm mạnh so với khi tắt.'),
      st('Tăng số điểm đặc trưng nhận lại.', 'Càng nhiều điểm khớp giữa hai lần nhìn thì ràng buộc càng chắc, sai số còn lại càng nhỏ.', ['Giữ nút "+" của núm "Số điểm đặc trưng nhận lại" tới khoảng 500 (thang logarit).', 'Đọc dòng chữ cuối màn hình.'], 'Với 500 điểm: sai số cuối vòng chỉ còn khoảng 0,06 m và ô kết quả báo "Đạt".'),
    ],
    conclude: 'Cộng dồn chuyển động luôn trôi; phải có mốc bên ngoài (nhận lại cảnh cũ) để sửa.',
  },
};
