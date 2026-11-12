/**
 * Tính chất vật lí của từng chất trên kệ (khoá = id trong `species.ts`). Số liệu tra theo sổ tay hóa học, làm tròn;
 * với dung dịch thì nhiệt độ nóng chảy / sôi là của CHẤT TAN nguyên chất. Độ tan tính ở khoảng 20 °C.
 */
export interface Physical {
  /** trạng thái, màu sắc, dạng bề ngoài */
  look: string;
  smell: string;
  /** tính tan trong nước */
  water: string;
  /** nhiệt độ nóng chảy và sôi (°C) */
  mp?: string;
  bp?: string;
  /** khối lượng riêng (g/cm³) */
  rho?: string;
  /** tính chất vật lí đáng chú ý khác */
  more?: string;
}
const p = (look: string, smell: string, water: string, mp?: string, bp?: string, rho?: string, more?: string): Physical => ({look, smell, water, mp, bp, rho, more});
const NONE = 'không mùi';
const HCL = p('dung dịch trong suốt, không màu', 'mùi xốc của khí HCl (rõ ở dung dịch đặc)', 'khí HCl tan rất nhiều: khoảng 500 lít khí trong 1 lít nước', '−114', '−85', undefined, 'dẫn điện tốt; dung dịch đặc "bốc khói" trong không khí ẩm');
const NAOH = p('dung dịch không màu, sờ thấy nhờn; NaOH nguyên chất là chất rắn trắng', NONE, 'tan rất nhiều (khoảng 1090 g/L), tỏa nhiều nhiệt khi tan', '318', '1388', '2,13', 'hút ẩm mạnh, để ngoài không khí thì chảy rữa và hấp thụ CO₂');
const NACL = p('tinh thể lập phương không màu (hạt trắng), vị mặn', NONE, 'tan tốt: 360 g/L, độ tan gần như không đổi theo nhiệt độ', '801', '1465', '2,16', 'rắn không dẫn điện; nóng chảy hoặc tan trong nước thì dẫn điện');
const SUGAR = p('tinh thể không màu (hạt trắng), vị ngọt', NONE, 'tan rất nhiều: khoảng 2000 g/L, tan nhiều hơn khi nóng', '186 (chảy rồi hóa nâu thành caramen)', undefined, '1,59', 'dung dịch không dẫn điện');
const THIO = p('dung dịch không màu; Na₂S₂O₃·5H₂O là tinh thể không màu', NONE, 'tan rất nhiều: khoảng 700 g/L', '48 (dạng ngậm 5 nước)', undefined, '1,67');
const CACO3 = p('chất rắn trắng (đá vôi, đá phấn, vỏ sò)', NONE, 'hầu như không tan (0,013 g/L); tan dần trong nước có hòa tan CO₂', 'không nóng chảy: phân hủy ở khoảng 900', undefined, '2,71');

export const PHYSICAL: Record<string, Physical> = {
  hcl: HCL,
  hcl_dil: HCL,
  h2so4: p('dung dịch không màu', NONE, 'H₂SO₄ tan vô hạn trong nước, tỏa rất nhiều nhiệt', '10', '337', '1,03 (dung dịch 0,5 M)', 'không bay hơi; dẫn điện tốt'),
  hno3: p('dung dịch không màu', 'mùi hắc nhẹ', 'tan vô hạn', '−42', '83', '1,02 (dung dịch 0,5 M)', 'kém bền: để ngoài ánh sáng lâu ngả vàng vì phân hủy ra NO₂'),
  ch3cooh: p('dung dịch không màu', 'mùi chua của giấm', 'tan vô hạn', '16,6', '118', '1,01 (dung dịch 10 %)', 'acid yếu nên dẫn điện kém'),
  h2so4_conc: p('chất lỏng sánh như dầu, không màu', NONE, 'tan vô hạn, tỏa rất nhiều nhiệt: phải rót từ từ acid vào nước, không làm ngược lại', '10', '337', '1,84 (nặng gần gấp đôi nước)', 'không bay hơi; hút ẩm rất mạnh nên dùng làm khô khí'),
  naoh: NAOH,
  naoh10: NAOH,
  naoh_s: {...NAOH, look: 'viên rắn màu trắng, hút ẩm nhanh nên bề mặt ướt và nhờn'},
  koh: p('dung dịch không màu, nhờn; KOH nguyên chất là chất rắn trắng', NONE, 'tan rất nhiều (khoảng 1120 g/L), tỏa nhiệt', 'khoảng 400', '1327', '2,04', 'hút ẩm mạnh, chảy rữa trong không khí'),
  nh3: p('dung dịch không màu', 'mùi khai và xốc', 'khí NH₃ tan rất nhiều: khoảng 700 lít khí trong 1 lít nước', '−77,7', '−33,3', '0,99 (dung dịch 1 M)', 'khí NH₃ nhẹ hơn không khí; đun nóng thì khí thoát khỏi dung dịch'),
  limewater: p('dung dịch trong suốt, không màu', NONE, 'Ca(OH)₂ ít tan (khoảng 1,7 g/L) và tan ÍT HƠN khi nóng', 'phân hủy ở 580', undefined, '2,21 (Ca(OH)₂ rắn)', 'để ngoài không khí có váng trắng CaCO₃ do hấp thụ CO₂'),
  nacl: NACL,
  nacl_s: NACL,
  naf: p('dung dịch không màu; NaF là chất rắn trắng', NONE, 'tan vừa: khoảng 40 g/L', '993', '1695', '2,56', 'độc nếu nuốt lượng lớn'),
  nabr: p('dung dịch không màu; NaBr là tinh thể trắng', NONE, 'tan rất nhiều: khoảng 900 g/L', '747', '1390', '3,21'),
  nai: p('dung dịch không màu; NaI là tinh thể trắng, để lâu ngả vàng', NONE, 'tan rất nhiều: khoảng 1800 g/L', '661', '1304', '3,67', 'ngả vàng vì I⁻ bị oxi không khí oxi hóa chậm thành I₂'),
  ki: p('dung dịch không màu; KI là tinh thể trắng', NONE, 'tan rất nhiều: khoảng 1400 g/L, thu nhiệt khi tan (ống nghiệm lạnh đi)', '681', '1330', '3,12', 'hòa tan được I₂ (tạo I₃⁻ màu nâu)'),
  na2co3: p('dung dịch không màu; Na₂CO₃ khan là bột trắng', NONE, 'tan tốt: khoảng 215 g/L, tỏa nhiệt', '851', undefined, '2,54', 'dung dịch có tính kiềm, sờ thấy nhờn'),
  na2so4: p('dung dịch không màu; Na₂SO₄ là tinh thể trắng', NONE, 'tan tốt: khoảng 195 g/L', '884', undefined, '2,66'),
  na2s: p('dung dịch không màu', 'mùi trứng thối nhẹ (bị thủy phân, thoát ít H₂S)', 'tan tốt: khoảng 186 g/L', '1176', undefined, '1,86', 'dung dịch có tính kiềm mạnh'),
  bacl2: p('dung dịch không màu; BaCl₂ là tinh thể trắng', NONE, 'tan tốt: khoảng 360 g/L', '962', '1560', '3,86', 'độc; ngọn lửa có màu lục vàng'),
  agno3: p('dung dịch không màu; AgNO₃ là tinh thể không màu', NONE, 'tan rất nhiều: khoảng 2200 g/L', '212', 'phân hủy ở 440', '4,35', 'nhạy ánh sáng: dây ra da thành vết đen (bạc kim loại), phải đựng trong lọ nâu'),
  cuso4: p('dung dịch màu xanh lam; CuSO₄ khan màu trắng, ngậm 5 nước màu xanh lam', NONE, 'tan tốt: khoảng 200 g/L', 'mất nước ở 110–250, phân hủy trên 650', undefined, '2,29 (dạng ngậm 5 nước)', 'CuSO₄ khan trắng gặp nước hóa xanh: dùng để phát hiện vết nước'),
  feso4: p('dung dịch màu lục nhạt', NONE, 'tan tốt: khoảng 260 g/L', 'dạng ngậm 7 nước chảy ở 64', undefined, '1,90 (dạng ngậm 7 nước)', 'để ngoài không khí ngả vàng nâu vì Fe²⁺ bị oxi hóa thành Fe³⁺'),
  fecl3: p('dung dịch màu vàng nâu; FeCl₃ khan là chất rắn nâu đen', 'mùi xốc nhẹ của HCl (bị thủy phân)', 'tan rất nhiều: khoảng 920 g/L, tỏa nhiệt', '306', '315', '2,90', 'hút ẩm mạnh, chảy rữa trong không khí'),
  alcl3: p('dung dịch không màu; AlCl₃ khan là chất rắn trắng', NONE, 'tan tốt: khoảng 460 g/L, tỏa nhiều nhiệt', 'thăng hoa ở 180', undefined, '2,48', 'AlCl₃ khan bốc khói trong không khí ẩm'),
  znso4: p('dung dịch không màu; ZnSO₄ là chất rắn trắng', NONE, 'tan tốt: khoảng 580 g/L', 'phân hủy ở 680', undefined, '3,54'),
  mgcl2: p('dung dịch không màu, vị đắng chát; MgCl₂ là chất rắn trắng', NONE, 'tan tốt: khoảng 540 g/L', '714', '1412', '2,32', 'hút ẩm mạnh'),
  cacl2: p('dung dịch không màu; CaCl₂ là chất rắn trắng', NONE, 'tan rất nhiều: khoảng 745 g/L, tỏa nhiệt', '772', '1935', '2,15', 'hút ẩm rất mạnh: dùng làm chất làm khô; ngọn lửa màu đỏ cam'),
  nh4cl: p('dung dịch không màu; NH₄Cl là tinh thể trắng', NONE, 'tan tốt: khoảng 370 g/L, thu nhiệt khi tan (ống nghiệm lạnh đi)', 'thăng hoa ở 338 (phân hủy thành NH₃ và HCl rồi kết hợp lại)', undefined, '1,53'),
  pbno3: p('dung dịch không màu; Pb(NO₃)₂ là tinh thể trắng', NONE, 'tan tốt: khoảng 540 g/L', 'phân hủy ở 470', undefined, '4,53', 'độc (hợp chất của chì)'),
  kscn: p('dung dịch không màu; KSCN là tinh thể không màu', NONE, 'tan rất nhiều: khoảng 2170 g/L, thu nhiệt mạnh khi tan', '173', 'phân hủy ở 500', '1,89', 'hút ẩm'),
  ch3coona: p('dung dịch không màu; CH₃COONa là tinh thể trắng', 'mùi giấm rất nhẹ', 'tan rất nhiều: khoảng 1230 g/L', '324', undefined, '1,53', 'dung dịch có tính kiềm yếu'),
  kmno4: p('dung dịch màu tím; KMnO₄ là tinh thể tím đen có ánh kim', NONE, 'tan vừa: khoảng 64 g/L; chỉ một hạt nhỏ đã nhuộm tím cả cốc nước', 'phân hủy ở 240 (giải phóng O₂)', undefined, '2,70', 'làm ố nâu da và vải'),
  na2s2o3_005: THIO,
  na2s2o3_010: THIO,
  na2s2o3_030: THIO,
  cl2w: p('dung dịch màu vàng lục rất nhạt; Cl₂ là khí màu vàng lục', 'mùi xốc (mùi nước tẩy)', 'khí Cl₂ tan vừa: khoảng 7 g/L', '−101', '−34', undefined, 'khí Cl₂ nặng gấp 2,5 lần không khí, độc; nước chlorine để ngoài ánh sáng mất dần màu'),
  br2w: p('dung dịch màu vàng cam; Br₂ là chất lỏng màu nâu đỏ', 'mùi hắc, xốc', 'Br₂ tan vừa: khoảng 35 g/L; tan nhiều hơn trong hexane, benzene', '−7,2', '58,8', '3,10 (Br₂ lỏng)', 'dễ bay hơi, hơi màu nâu đỏ, độc và gây bỏng'),
  i2w: p('dung dịch màu vàng nâu; I₂ là tinh thể tím đen có ánh kim', 'mùi hắc nhẹ', 'I₂ rất ít tan trong nước (0,3 g/L); tan tốt trong dung dịch KI, ethanol, hexane (màu tím)', '113,7', '184', '4,93', 'đun nhẹ thì thăng hoa thành hơi màu tím'),
  na: p('kim loại trắng bạc, mềm (cắt được bằng dao), vết cắt sáng rồi xỉn nhanh', NONE, 'không tan mà PHẢN ỨNG với nước; bảo quản ngâm trong dầu hỏa', '97,8', '883', '0,97 (nổi trên nước)', 'dẫn điện, dẫn nhiệt tốt; ngọn lửa màu vàng'),
  mg: p('kim loại trắng bạc, nhẹ', NONE, 'không tan trong nước lạnh', '650', '1090', '1,74', 'cháy trong không khí với ngọn lửa trắng chói'),
  zn: p('kim loại màu lam nhạt, giòn ở nhiệt độ thường', NONE, 'không tan', '419,5', '907', '7,14'),
  fe: p('kim loại trắng xám, dẻo', NONE, 'không tan', '1538', '2862', '7,87', 'có tính nhiễm từ (bị nam châm hút); dẫn điện, dẫn nhiệt tốt'),
  cu: p('kim loại màu đỏ, dẻo, dễ dát mỏng và kéo sợi', NONE, 'không tan', '1085', '2562', '8,96', 'dẫn điện, dẫn nhiệt rất tốt (chỉ kém bạc)'),
  al: p('kim loại trắng bạc, nhẹ, mềm, dễ dát mỏng', NONE, 'không tan (có lớp oxide mỏng bền bảo vệ)', '660', '2470', '2,70', 'dẫn điện, dẫn nhiệt tốt'),
  ca: p('kim loại trắng bạc, mềm hơn nhôm nhưng cứng hơn natri', NONE, 'không tan mà PHẢN ỨNG với nước', '842', '1484', '1,55', 'ngọn lửa màu đỏ cam'),
  mno2: p('bột màu đen', NONE, 'không tan', 'phân hủy ở 535', undefined, '5,03'),
  s: p('bột màu vàng chanh', 'gần như không mùi', 'không tan trong nước; tan trong CS₂, benzene', '115 (chảy thành chất lỏng vàng, nóng thêm thì hóa nâu và sánh lại)', '445', '2,07', 'không dẫn điện, dẫn nhiệt kém; giòn'),
  caco3_c: CACO3,
  caco3_f: CACO3,
  nahco3: p('bột trắng mịn', NONE, 'tan vừa: khoảng 96 g/L', 'không nóng chảy: phân hủy dần khi đun (rõ từ khoảng 100)', undefined, '2,20', 'dung dịch có tính kiềm yếu'),
  sugar: SUGAR,
  saccharose: SUGAR,
  cac2: p('chất rắn màu xám đen, cứng', 'mùi tỏi khó chịu (do tạp chất khi gặp hơi ẩm)', 'không tan mà PHẢN ỨNG mạnh với nước', '2160', undefined, '2,22'),
  ethanol: p('chất lỏng không màu, dễ bay hơi', 'mùi thơm nhẹ đặc trưng của rượu', 'tan vô hạn', '−114', '78,3', '0,789 (nhẹ hơn nước)', 'dễ cháy, ngọn lửa xanh nhạt; hòa tan được iodine, benzene'),
  glycerol: p('chất lỏng sánh, không màu, vị ngọt', NONE, 'tan vô hạn', '18', '290', '1,26', 'hút ẩm, giữ ẩm tốt'),
  hexane: p('chất lỏng không màu, dễ bay hơi', 'mùi xăng nhẹ', 'không tan; nhẹ hơn nước nên nổi thành lớp phía trên', '−95', '69', '0,655', 'dễ cháy; hòa tan tốt dầu mỡ, bromine, iodine'),
  aniline: p('chất lỏng không màu, để lâu trong không khí chuyển nâu đen', 'mùi khó chịu, hơi giống cá ươn', 'ít tan (khoảng 36 g/L); nặng hơn nước nên chìm thành giọt ở đáy', '−6', '184', '1,02', 'độc, thấm qua da'),
  ch3cho: p('dung dịch không màu; CH₃CHO nguyên chất là chất lỏng rất dễ bay hơi', 'mùi xốc, hơi giống táo xanh', 'tan vô hạn', '−123', '20,2', '0,78 (nguyên chất)'),
  glucose: p('dung dịch không màu; glucose là tinh thể trắng, vị ngọt kém đường mía', NONE, 'tan tốt: khoảng 900 g/L', '146', undefined, '1,54'),
  starch: p('dung dịch keo trắng đục (hồ); tinh bột là bột trắng vô định hình', NONE, 'không tan trong nước lạnh; trong nước nóng trương lên thành hồ', 'không nóng chảy (bị phân hủy)', undefined, '1,5'),
  protein: p('dung dịch keo nhớt, trong, hơi vàng', 'mùi tanh nhẹ', 'tan tạo dung dịch keo', 'không nóng chảy: đông tụ không thuận nghịch khi đun trên khoảng 60'),
  h2o2: p('dung dịch không màu', NONE, 'tan vô hạn', '−0,4', '150 (phân hủy trước khi sôi)', '1,03 (dung dịch 10 %)', 'kém bền: ánh sáng, nhiệt và chất xúc tác làm phân hủy ra O₂; đựng trong lọ tối màu'),
  hno3_conc: p('chất lỏng không màu, để lâu ngả vàng; bốc khói trong không khí ẩm', 'mùi hắc, xốc mạnh', 'tan vô hạn', '−42', '83 (dung dịch 68 % sôi ở 121)', '1,41', 'bị ánh sáng phân hủy ra NO₂ (màu vàng); làm vàng da'),
  h3po4: p('dung dịch không màu; H₃PO₄ nguyên chất là tinh thể không màu', NONE, 'tan vô hạn', '42,4', undefined, '1,88 (nguyên chất)', 'không bay hơi; dung dịch đặc sánh như sirô'),
  oxalic: p('dung dịch không màu; oxalic acid là tinh thể trắng', NONE, 'tan vừa: khoảng 95 g/L', '189 (phân hủy); dạng ngậm 2 nước chảy ở 101', undefined, '1,90', 'độc nếu nuốt'),
  na3po4: p('dung dịch không màu; Na₃PO₄ là chất rắn trắng', NONE, 'tan tốt: khoảng 120 g/L', '1583', undefined, '2,54', 'dung dịch có tính kiềm mạnh'),
  k2cro4: p('dung dịch màu vàng chanh; K₂CrO₄ là tinh thể vàng', NONE, 'tan tốt: khoảng 630 g/L', '968', undefined, '2,73', 'độc (hợp chất crom(VI))'),
  cuo: p('bột màu đen', NONE, 'không tan', '1326', undefined, '6,31'),
  fe2o3: p('bột màu nâu đỏ', NONE, 'không tan', '1565', undefined, '5,24'),
  cao: p('chất rắn màu trắng (cục hoặc bột)', NONE, 'không tan mà PHẢN ỨNG với nước, tỏa rất nhiều nhiệt (tôi vôi)', '2572', undefined, '3,34', 'hút ẩm: dùng làm khô khí NH₃'),
  phenol: p('dung dịch không màu; phenol là tinh thể không màu, để lâu chuyển hồng', 'mùi đặc trưng của thuốc sát trùng', 'ít tan trong nước lạnh (khoảng 83 g/L); trên 66 °C tan vô hạn', '40,5', '181,7', '1,07', 'độc, gây bỏng da'),
  benzene: p('chất lỏng không màu, dễ bay hơi', 'mùi thơm đặc trưng', 'không tan; nhẹ hơn nước nên nổi thành lớp phía trên', '5,5', '80,1', '0,876', 'độc; dễ cháy, ngọn lửa nhiều muội; dung môi tốt của bromine, iodine, dầu mỡ'),
  ch3cooh_glacial: p('chất lỏng không màu; dưới 16,6 °C đông thành tinh thể như nước đá', 'mùi chua rất hắc', 'tan vô hạn', '16,6', '118', '1,049', 'gây bỏng da'),
  hcooh: p('dung dịch không màu; HCOOH nguyên chất là chất lỏng bốc khói nhẹ', 'mùi xốc mạnh', 'tan vô hạn', '8,4', '100,8', '1,22 (nguyên chất)', 'có trong nọc kiến; gây bỏng da'),
  citric: p('dung dịch không màu, vị chua; citric acid là tinh thể trắng', NONE, 'tan rất nhiều', '153', 'phân hủy trên 175', '1,66'),
  benzoic: p('tinh thể trắng hình kim hoặc vảy', 'mùi thơm nhẹ', 'ít tan trong nước lạnh (khoảng 3 g/L), tan nhiều trong nước nóng', '122', '249', '1,27', 'dễ thăng hoa'),
  oleic: p('chất lỏng sánh như dầu, không màu tới vàng nhạt', 'mùi mỡ nhẹ', 'không tan; nhẹ hơn nước nên nổi', '13–14', '360', '0,895'),
  stearic: p('chất rắn trắng như sáp', 'mùi nhẹ của nến', 'không tan; nhẹ hơn nước nên nổi', '69,3', '361', '0,94'),
  ch3nh2: p('dung dịch không màu; CH₃NH₂ là chất khí không màu', 'mùi khai, hơi giống cá ươn', 'tan rất nhiều trong nước', '−93', '−6,3'),
  glycine: p('dung dịch không màu; glycine là tinh thể trắng, vị ngọt', NONE, 'tan tốt: khoảng 250 g/L', 'phân hủy ở 233', undefined, '1,61', 'tồn tại ở dạng ion lưỡng cực nên nhiệt độ nóng chảy cao'),
  ethyl_acetate: p('chất lỏng không màu, dễ bay hơi', 'mùi thơm (giống nước rửa sơn móng tay)', 'ít tan (khoảng 83 g/L); nhẹ hơn nước nên nổi thành lớp phía trên', '−84', '77', '0,90', 'dễ cháy'),
  fat: p('chất rắn trắng ngà, mềm, sờ thấy nhờn', 'mùi mỡ nhẹ', 'không tan; nhẹ hơn nước nên nổi; tan trong hexane, benzene', '55–72', undefined, '0,86'),
  acetamide: p('dung dịch không màu; acetamide là tinh thể trắng', 'gần như không mùi (mẫu không tinh khiết có mùi chuột)', 'tan rất nhiều: khoảng 2000 g/L', '81', '221', '1,16'),
  urea: p('dung dịch không màu; urea là tinh thể trắng', NONE, 'tan rất nhiều: khoảng 1080 g/L, thu nhiệt khi tan', '133 (phân hủy khi nóng hơn)', undefined, '1,32'),
  lysine: p('dung dịch không màu; lysine là chất rắn trắng', NONE, 'tan rất tốt', 'phân hủy ở khoảng 215'),
  glutamic: p('dung dịch không màu, vị chua nhẹ; glutamic acid là tinh thể trắng', NONE, 'ít tan: khoảng 8,6 g/L', 'phân hủy ở khoảng 200', undefined, '1,46'),
  alanine: p('dung dịch không màu; alanine là tinh thể trắng, vị hơi ngọt', NONE, 'tan tốt: khoảng 167 g/L', 'phân hủy trên 250', undefined, '1,42'),
  nano2: p('dung dịch không màu tới vàng rất nhạt; NaNO₂ là tinh thể trắng hơi vàng', NONE, 'tan rất nhiều: khoảng 820 g/L', '271', 'phân hủy trên 320', '2,17', 'độc; hút ẩm'),
  ice: p('chất rắn trong suốt, không màu', NONE, 'chính là nước ở thể rắn', '0', '100', '0,917 (nhẹ hơn nước lỏng nên nổi)', 'thu 334 J để làm tan mỗi gam: dùng để làm lạnh'),
  naphthol: p('dung dịch không màu tới vàng nhạt; β-naphthol là tinh thể trắng', 'mùi phenol nhẹ', 'β-naphthol rất ít tan trong nước (0,7 g/L) nhưng tan trong dung dịch kiềm', '122', '285', '1,28'),
  hcho: p('dung dịch không màu (formalin); HCHO là chất khí không màu', 'mùi xốc, cay mắt', 'tan rất nhiều trong nước', '−92', '−19', undefined, 'độc; làm đông tụ protein'),
  hmda: p('dung dịch không màu; hexamethylenediamine là chất rắn trắng', 'mùi khai của amine', 'tan tốt', '42', '205', '0,84'),
  adipoyl: p('chất lỏng không màu tới vàng nhạt', 'mùi hắc, xốc', 'không tan mà bị nước thủy phân chậm, thoát khí HCl', undefined, '105–107 ở áp suất 2 mmHg', '1,26', 'bốc khói trong không khí ẩm; gây bỏng'),
  pe: p('chất rắn trắng đục hoặc trong mờ, mềm dẻo', NONE, 'không tan, không thấm nước', 'mềm và chảy ở 105–135', undefined, '0,91–0,96 (nổi trên nước)', 'cách điện; không tan trong dung môi ở nhiệt độ thường'),
  pvc: p('chất rắn trắng, cứng', NONE, 'không tan', 'mềm ở khoảng 80; trên 140 bị phân hủy, thoát HCl', undefined, '1,38 (chìm trong nước)', 'cách điện tốt; khó cháy hơn PE'),
  wool: p('sợi màu trắng ngà, xoăn, giữ ấm tốt', 'khi đốt có mùi tóc cháy', 'không tan, hút ẩm tốt', 'không nóng chảy (bị phân hủy)', undefined, '1,31'),
  cotton: p('sợi màu trắng, mềm, dai', 'khi đốt có mùi giấy cháy', 'không tan nhưng thấm nước rất tốt', 'không nóng chảy (bị phân hủy)', undefined, '1,5'),
  water: p('chất lỏng trong suốt, không màu, không vị', NONE, '—', '0', '100', '1,00 (lớn nhất ở 4 °C)', 'nước cất gần như không dẫn điện; nhiệt dung riêng lớn: 4,18 J/(g·K)'),
  pp: p('dung dịch không màu; phenolphtalein là bột trắng', NONE, 'hầu như không tan trong nước, tan trong ethanol (dung dịch dùng trong phòng thí nghiệm pha bằng ethanol)', '260'),
  litmus: p('dung dịch màu tím; quỳ là bột tím lam chiết từ địa y', NONE, 'tan trong nước'),
  mo: p('dung dịch màu da cam; methyl da cam là bột màu cam', NONE, 'ít tan: khoảng 5 g/L', 'phân hủy trên 300'),
};
