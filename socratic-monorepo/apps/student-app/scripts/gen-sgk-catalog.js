// Sinh apps/student-app/src/data/sgkCatalog.ts từ danh mục preset của bảng (presets.json) + bảng đối chiếu bài KNTT dưới đây.
// Cách chạy lại khi preset của bảng đổi:
//  1) xuất preset: tạm tạo apps/teacher-board/src/__tests__/zz_dump.test.ts ghi
//     Object.entries(PRESETS).map(([id,s]) => ({id, title: s.title, question: s.question, family: s.family, engine: s.engine})) ra JSON,
//     chạy `DUMP=<tệp.json> npx vitest run <tệp test>` rồi xóa tệp test;
//  2) node apps/student-app/scripts/gen-sgk-catalog.js <tệp.json> apps/student-app/src/data/sgkCatalog.ts
//  Bộ sinh dừng và báo lỗi nếu có preset chưa được xếp vào bài nào.
const fs = require('fs');
const [, , src, out] = process.argv;
const presets = Object.fromEntries(JSON.parse(fs.readFileSync(src, 'utf8')).map((p) => [p.id, p]));

// phòng tự do và bài trùng (đã gộp trong /lab) không đưa vào; Trái Đất nghiêng thuộc Địa lí, không có trong SGK Lý KNTT
const SKIP = new Set(['CHEM_LAB_BENCH', 'PHYS_LAB_BENCH', 'BIO_LAB_BENCH', 'CHEM_HALOGEN_LAB', 'CHEM_VIRTUAL_TESTTUBE', 'PHYS_EARTH_SEASONS']);

// id | lớp | số bài để xếp | nhãn bài (đúng tên bài trong mục lục sách Kết nối tri thức, docs/sgk-notes)
const MAP = `
MATH_SET_LOGIC|10|1|Bài 1, 2. Mệnh đề; Tập hợp và các phép toán trên tập hợp
MATH_UNIT_CIRCLE|10|5|Bài 5. Giá trị lượng giác của một góc từ 0° đến 180°
MATH_TRIANGLE_SOLVER|10|6|Bài 6. Hệ thức lượng trong tam giác
MATH_VECTOR_2D|10|8|Bài 7–11. Vectơ: tổng, hiệu, tích với một số, toạ độ, tích vô hướng
MATH_APPROX_ERROR|10|12|Bài 12. Số gần đúng và sai số
MATH_STAT_DESCRIPTIVE|10|13|Bài 13, 14. Các số đặc trưng đo xu thế trung tâm và đo độ phân tán
MATH_QUADRATIC|10|16|Bài 16, 17. Hàm số bậc hai; Dấu của tam thức bậc hai
MATH_ANALYTIC_LINE_CIRCLE|10|19|Bài 19–21. Phương trình đường thẳng; Vị trí tương đối, góc, khoảng cách; Đường tròn
MATH_CONIC_LAB|10|22|Bài 22. Ba đường conic
MATH_COUNTING_TREE|10|23|Bài 23–25. Quy tắc đếm; Hoán vị, chỉnh hợp, tổ hợp; Nhị thức Newton
MATH_PROBABILITY_LAB|10|26|Bài 26, 27. Biến cố và định nghĩa cổ điển của xác suất; Thực hành tính xác suất
MATH_UNIT_CIRCLE|11|1|Bài 1, 3. Giá trị lượng giác của góc lượng giác; Hàm số lượng giác
MATH_SEQUENCE_LAB|11|5|Bài 5–7, 15. Dãy số; Cấp số cộng; Cấp số nhân; Giới hạn của dãy số
MATH_STAT_DESCRIPTIVE|11|8|Bài 8, 9. Mẫu số liệu ghép nhóm; Các số đặc trưng đo xu thế trung tâm
MATH_LIMIT_CONTINUITY|11|16|Bài 16, 17. Giới hạn của hàm số; Hàm số liên tục
MATH_EXP_LOG|11|18|Bài 18–21. Luỹ thừa, lôgarit, hàm số mũ và hàm số lôgarit
MATH_SPACE_RELATIONS|11|22|Bài 22–27. Quan hệ vuông góc, khoảng cách, góc và thể tích
MATH_PROBABILITY_LAB|11|28|Bài 28–30. Biến cố hợp, giao, độc lập; Công thức cộng, công thức nhân xác suất
MATH_DERIVATIVE_LAB|11|31|Bài 31. Định nghĩa và ý nghĩa của đạo hàm
MATH_FINANCE_GROWTH|11|99|Hoạt động trải nghiệm: Một vài áp dụng của Toán học trong tài chính
MATH_FUNCTION_STUDY|12|1|Bài 1–4. Đơn điệu, cực trị, GTLN–GTNN, tiệm cận; Khảo sát và vẽ đồ thị hàm số
MATH_OPTIMIZATION|12|5|Bài 5. Ứng dụng đạo hàm để giải quyết một số vấn đề thực tiễn
MATH_VECTOR_3D|12|6|Bài 6–8, 14–16. Vectơ và toạ độ trong không gian; Phương trình mặt phẳng, đường thẳng; Góc trong không gian
MATH_STAT_DESCRIPTIVE|12|9|Bài 9, 10. Khoảng biến thiên, khoảng tứ phân vị; Phương sai và độ lệch chuẩn
MATH_INTEGRAL_AREA|12|12|Bài 12, 13. Tích phân; Ứng dụng hình học của tích phân
MATH_QUADRIC_SURFACES|12|17|Bài 17. Phương trình mặt cầu (mở rộng: mặt bậc hai)
MATH_PROBABILITY_LAB|12|18|Bài 18, 19. Xác suất có điều kiện; Công thức xác suất toàn phần và công thức Bayes
PHYS_LAB_SAFETY|10|2|Bài 2. Các quy tắc an toàn trong phòng thực hành Vật lí
PHYS_LAB_ERROR_MEASURE|10|3|Bài 3. Thực hành tính sai số trong phép đo. Ghi kết quả đo
PHYS_MEASUREMENT_ERROR|10|3|Bài 3. Thực hành tính sai số trong phép đo. Ghi kết quả đo
PHYS_KINEMATICS_1D|10|4|Bài 4–10. Độ dịch chuyển, vận tốc, gia tốc, chuyển động thẳng biến đổi đều, rơi tự do
PHYS_RELATIVE_VELOCITY|10|5|Bài 5. Tốc độ và vận tốc (tổng hợp vận tốc)
PHYS_LAB_SPEED|10|6|Bài 6. Thực hành: Đo tốc độ của vật chuyển động
PHYS_LAB_FREE_FALL_G|10|11|Bài 11. Thực hành: Đo gia tốc rơi tự do
PHYS_LAB_PROJECTILE_HORIZONTAL|10|12|Bài 12. Chuyển động ném
PHYS_FORCE_COMPOSITION|10|13|Bài 13. Tổng hợp và phân tích lực. Cân bằng lực
PHYS_NEWTON_LAWS|10|15|Bài 15. Định luật 2 Newton
PHYS_LAB_NEWTON2|10|15|Bài 15. Định luật 2 Newton
PHYS_LAB_FRICTION|10|18|Bài 18. Lực ma sát
PHYS_MOMENT_LEVER|10|21|Bài 21. Moment lực. Cân bằng của vật rắn
PHYS_LAB_LEVER_MOMENT|10|21|Bài 21. Moment lực. Cân bằng của vật rắn
PHYS_LAB_FORCE_COMPOSITION|10|22|Bài 22. Thực hành tổng hợp lực
PHYS_WORK_ENERGY|10|23|Bài 23–26. Năng lượng, công cơ học; Động năng, thế năng; Định luật bảo toàn cơ năng
PHYS_COLLISION_1D|10|28|Bài 28, 29. Động lượng; Định luật bảo toàn động lượng
PHYS_NEWTON_CRADLE|10|28|Bài 28, 29. Động lượng; Định luật bảo toàn động lượng
PHYS_LAB_COLLISION_MOMENTUM|10|30|Bài 30. Thực hành xác định động lượng của vật trước và sau va chạm
PHYS_CIRCULAR_MOTION|10|31|Bài 31, 32. Động học của chuyển động tròn đều; Lực hướng tâm và gia tốc hướng tâm
PHYS_SPRING_HOOKE|10|33|Bài 33. Biến dạng của vật rắn
PHYS_LAB_HOOKE|10|33|Bài 33. Biến dạng của vật rắn
PHYS_FLUID_PRESSURE|10|34|Bài 34. Khối lượng riêng. Áp suất chất lỏng
PHYS_SHM|11|1|Bài 1–6. Dao động điều hoà; Năng lượng; Dao động tắt dần, cưỡng bức, cộng hưởng
PHYS_LAB_PENDULUM_G|11|2|Bài 1–5. Dao động điều hoà (thí nghiệm con lắc đơn)
PHYS_WAVE_MECH|11|8|Bài 8, 9, 13. Mô tả sóng; Sóng ngang, sóng dọc; Sóng dừng
PHYS_LAB_SOUND_FREQUENCY|11|10|Bài 10. Thực hành: Đo tần số của sóng âm
PHYS_OSCILLOSCOPE|11|10|Bài 10. Thực hành: Đo tần số của sóng âm (dao động kí)
PHYS_EM_WAVE_3D|11|11|Bài 11. Sóng điện từ
PHYS_EM_SPECTRUM|11|11|Bài 11. Sóng điện từ
PHYS_YOUNG_INTERFERENCE|11|12|Bài 12. Giao thoa sóng
PHYS_LAB_WAVE_INTERFERENCE|11|12|Bài 12. Giao thoa sóng
PHYS_LAB_STANDING_WAVE|11|13|Bài 13. Sóng dừng
PHYS_LAB_SOUND_SPEED|11|15|Bài 15. Thực hành: Đo tốc độ truyền âm
PHYS_ELECTRIC_FIELD|11|16|Bài 16–18. Lực tương tác giữa hai điện tích; Điện trường; Điện trường đều
PHYS_CAPACITOR|11|21|Bài 21. Tụ điện
PHYS_LAB_CAPACITOR_RC|11|21|Bài 21. Tụ điện (nạp tụ qua điện trở)
PHYS_LAB_OHM_LAW|11|23|Bài 23. Điện trở. Định luật Ohm
PHYS_DC_CIRCUIT|11|24|Bài 24, 25. Nguồn điện; Năng lượng và công suất điện
PHYS_LAB_EMF_INTERNAL_R|11|26|Bài 26. Thực hành: Đo suất điện động và điện trở trong của pin điện hoá
PHYS_STATES_OF_MATTER|12|1|Bài 1. Cấu trúc của chất. Sự chuyển thể
PHYS_THERMOMETER|12|3|Bài 3. Nhiệt độ. Thang nhiệt độ – nhiệt kế
PHYS_HEAT_CALORIMETRY|12|4|Bài 4–6. Nhiệt dung riêng; Nhiệt nóng chảy riêng; Nhiệt hoá hơi riêng
PHYS_LAB_SPECIFIC_HEAT|12|4|Bài 4. Nhiệt dung riêng
PHYS_LAB_LATENT_HEAT_FUSION|12|5|Bài 5. Nhiệt nóng chảy riêng
PHYS_KINETIC_GAS_PARTICLES|12|8|Bài 8, 12. Mô hình động học phân tử chất khí; Áp suất khí theo mô hình động học phân tử
PHYS_LAB_BOYLE|12|9|Bài 9. Định luật Boyle
PHYS_LAB_CHARLES|12|10|Bài 10. Định luật Charles
PHYS_MAGNETIC_FIELD|12|14|Bài 14, 15. Từ trường; Lực từ tác dụng lên dây dẫn mang dòng điện, cảm ứng từ
PHYS_LAB_MAGNETIC_FORCE|12|15|Bài 15. Lực từ tác dụng lên dây dẫn mang dòng điện. Cảm ứng từ
PHYS_EM_INDUCTION|12|16|Bài 16, 17. Từ thông, hiện tượng cảm ứng điện từ; Máy phát điện xoay chiều
PHYS_LAB_EM_INDUCTION|12|16|Bài 16. Từ thông. Hiện tượng cảm ứng điện từ
PHYS_TRANSFORMER_GRID|12|18|Bài 18. Ứng dụng hiện tượng cảm ứng điện từ
PHYS_LAB_TRANSFORMER|12|18|Bài 18. Ứng dụng hiện tượng cảm ứng điện từ (máy biến áp)
PHYS_EM_WAVE_3D|12|19|Bài 19. Điện từ trường. Mô hình sóng điện từ
PHYS_ALPHA_SCATTERING|12|21|Bài 21. Cấu trúc hạt nhân
PHYS_NUCLEAR_BINDING|12|22|Bài 22. Phản ứng hạt nhân và năng lượng liên kết
PHYS_RADIOACTIVE_DECAY|12|23|Bài 23. Hiện tượng phóng xạ
PHYS_FISSION_REACTOR|12|24|Bài 24. Công nghiệp hạt nhân
CHEM_SCIENCE_PROCESS|10|0|Bài mở đầu. Nhập môn hoá học (phương pháp nghiên cứu)
CHEM_ATOM_STRUCTURE|10|3|Bài 3. Cấu trúc lớp vỏ electron nguyên tử
CHEM_PERIODIC_TABLE|10|5|Bài 5, 6. Cấu tạo bảng tuần hoàn; Xu hướng biến đổi tính chất trong chu kì và nhóm
CHEM_LAB_NA_MG_WATER|10|6|Bài 6. Xu hướng biến đổi một số tính chất của nguyên tử trong một chu kì và một nhóm
CHEM_LAB_CL2_I2_STARCH|10|6|Bài 6. Xu hướng biến đổi một số tính chất của nguyên tử trong một chu kì và một nhóm
CHEM_LAB_CARBONATE_ACID|10|7|Bài 7. Xu hướng biến đổi thành phần và một số tính chất của hợp chất trong một chu kì
CHEM_BONDING|10|11|Bài 11, 12. Liên kết ion; Liên kết cộng hoá trị
CHEM_LAB_CONDUCTIVITY|10|11|Bài 11. Liên kết ion
CHEM_REDOX|10|15|Bài 15. Phản ứng oxi hoá – khử
CHEM_LAB_REDOX_FE|10|15|Bài 15. Phản ứng oxi hoá – khử
CHEM_ENERGETICS|10|17|Bài 17. Biến thiên enthalpy trong các phản ứng hoá học
CHEM_LAB_NEUTRAL_TEMP|10|17|Bài 17. Biến thiên enthalpy trong các phản ứng hoá học
CHEM_KINETICS|10|19|Bài 19. Tốc độ phản ứng
CHEM_LAB_RATE_CONC|10|19|Bài 19. Tốc độ phản ứng
CHEM_LAB_RATE_TEMP|10|19|Bài 19. Tốc độ phản ứng
CHEM_LAB_RATE_SURFACE|10|19|Bài 19. Tốc độ phản ứng
CHEM_LAB_RATE_CAT|10|19|Bài 19. Tốc độ phản ứng
CHEM_LAB_HALIDE_DISPLACE|10|21|Bài 21. Nhóm halogen
CHEM_LAB_HCL_METALS|10|22|Bài 22. Hydrogen halide. Muối halide
CHEM_LAB_HALIDE_ID|10|22|Bài 22. Hydrogen halide. Muối halide
CHEM_EQUILIBRIUM_GENERAL|11|1|Bài 1. Khái niệm về cân bằng hoá học
CHEM_ACID_BASE|11|2|Bài 2. Cân bằng trong dung dịch nước
CHEM_LAB_ACID_BASE_INDICATOR|11|2|Bài 2. Cân bằng trong dung dịch nước
CHEM_LAB_NH4_NAOH|11|5|Bài 5. Ammonia. Muối ammonium
CHEM_LAB_S_FE_HEAT|11|7|Bài 7. Sulfur và sulfur dioxide
CHEM_LAB_CU_H2SO4_CONC|11|8|Bài 8. Sulfuric acid và muối sulfate
CHEM_LAB_SULFATE_TEST|11|8|Bài 8. Sulfuric acid và muối sulfate
CHEM_LAB_CARBONATE_BARIUM|12|25|Bài 25. Nguyên tố nhóm IIA (phân biệt sulfate và carbonate)
CHEM_INDUSTRIAL_PROCESS|11|8|Bài 8. Sulfuric acid và muối sulfate (sản xuất theo phương pháp tiếp xúc)
CHEM_SPECTRA|11|10|Bài 10, 12. Hợp chất hữu cơ (phổ IR); Công thức phân tử (phổ MS)
CHEM_SEPARATION|11|11|Bài 11. Phương pháp tách biệt và tinh chế hợp chất hữu cơ
CHEM_ORGANIC_STRUCTURE|11|13|Bài 13. Cấu tạo hoá học hợp chất hữu cơ
CHEM_LAB_HEXANE_BR|11|15|Bài 15. Alkane
CHEM_BOILING_POINTS|11|15|Bài 15, 20, 23, 24. Nhiệt độ sôi: alkane, alcohol, hợp chất carbonyl, carboxylic acid
CHEM_ORGANIC_REACTIONS|11|16|Bài 16. Hydrocarbon không no
CHEM_LAB_C2H2_PREP|11|16|Bài 16. Hydrocarbon không no
CHEM_LAB_CU_OH_GLYCEROL|11|20|Bài 20. Alcohol
CHEM_LAB_TOLLENS|11|23|Bài 23. Hợp chất carbonyl
CHEM_LAB_ACETIC_ACID|11|24|Bài 24. Carboxylic acid
CHEM_LIPID_SOAP|12|1|Bài 1, 2. Ester – Lipid; Xà phòng và chất giặt rửa
CHEM_CARBOHYDRATE|12|4|Bài 4. Giới thiệu về carbohydrate. Glucose và fructose
CHEM_LAB_GLUCOSE_CU|12|4|Bài 4. Giới thiệu về carbohydrate. Glucose và fructose
CHEM_LAB_STARCH_IODINE|12|6|Bài 6. Tinh bột và cellulose
CHEM_LAB_ANILINE_BR|12|8|Bài 8. Amine
CHEM_AMINO_PROTEIN|12|9|Bài 9. Amino acid và peptide
CHEM_LAB_BIURET|12|10|Bài 10. Protein và enzyme
CHEM_POLYMER|12|12|Bài 12. Đại cương về polymer
CHEM_ELECTROCHEM_SERIES|12|15|Bài 15. Thế điện cực và nguồn điện hoá học
CHEM_ELECTROLYSIS|12|16|Bài 16. Điện phân
CHEM_LAB_METAL_SALT|12|19|Bài 19. Tính chất vật lí và tính chất hoá học của kim loại
CHEM_METALLURGY|12|20|Bài 20. Kim loại trong tự nhiên và phương pháp tách kim loại
CHEM_ALKALI_EARTH|12|24|Bài 24, 25. Nguyên tố nhóm IA; Nguyên tố nhóm IIA
CHEM_TRANSITION_COMPLEX|12|27|Bài 27, 28. Đại cương về kim loại chuyển tiếp dãy thứ nhất; Sơ lược về phức chất
CHEM_LAB_CATION_NAOH|12|25|Bài 25, 27. Nguyên tố nhóm IIA; Đại cương kim loại chuyển tiếp (nhận biết cation)
CHEM_LAB_FE3_SCN|12|27|Bài 27. Đại cương về kim loại chuyển tiếp dãy thứ nhất (nhận biết Fe³⁺)
CHEM_LAB_KMNO4_FE2|12|27|Bài 27. Đại cương về kim loại chuyển tiếp dãy thứ nhất (chuẩn độ Fe²⁺)
CHEM_LAB_CU_NH3_COMPLEX|12|29|Bài 29. Một số tính chất và ứng dụng của phức chất
BIO_BIOMOLECULES|10|4|Bài 4, 5. Các nguyên tố hoá học và nước; Các phân tử sinh học
BIO_LAB_BIOMOLECULES|10|6|Bài 6. Thực hành: Nhận biết một số phân tử sinh học
BIO_SCALE_CELL_TYPES|10|7|Bài 7, 8. Tế bào nhân sơ; Tế bào nhân thực
BIO_EUKARYOTE_CELL|10|8|Bài 8. Tế bào nhân thực
BIO_LAB_CELL_OBSERVE|10|9|Bài 9. Thực hành: Quan sát tế bào
BIO_MEMBRANE_TRANSPORT|10|10|Bài 10. Trao đổi chất qua màng tế bào
BIO_LAB_PLASMOLYSIS|10|11|Bài 11. Thực hành: Thí nghiệm co và phản co nguyên sinh
BIO_ENZYME_ACTIVITY|10|13|Bài 13. Khái quát về chuyển hoá vật chất và năng lượng (enzyme)
BIO_METABOLISM_PATHWAYS|10|14|Bài 14. Phân giải và tổng hợp các chất trong tế bào
BIO_LAB_ENZYME|10|15|Bài 15. Thực hành: Ảnh hưởng của các yếu tố đến hoạt tính enzyme amylase
BIO_MITOSIS|10|16|Bài 16. Chu kì tế bào và nguyên phân
BIO_MEIOSIS|10|17|Bài 17. Giảm phân
BIO_LAB_MITOSIS_SLIDE|10|18|Bài 18. Thực hành: Làm và quan sát tiêu bản nguyên phân, giảm phân
BIO_MICROBE_LAB|10|21|Bài 21. Trao đổi chất, sinh trưởng và sinh sản ở vi sinh vật
BIO_LAB_YOGURT|10|23|Bài 23. Thực hành: Một số phương pháp nghiên cứu vi sinh vật (lên men sữa chua)
BIO_VIRUS_CYCLE|10|24|Bài 24. Khái quát về virus
BIO_LAB_VIRUS_SURVEY|10|26|Bài 26. Thực hành: Điều tra một số bệnh do virus và tuyên truyền phòng chống
BIO_WATER_TRANSPORT_PLANT|11|2|Bài 2. Trao đổi nước và khoáng ở thực vật
BIO_MINERAL_NUTRITION|11|2|Bài 2. Trao đổi nước và khoáng ở thực vật
BIO_LAB_TRANSPIRATION|11|3|Bài 3. Thực hành: Trao đổi nước và khoáng ở thực vật
BIO_LIGHT_COMPENSATION|11|4|Bài 4. Quang hợp ở thực vật
BIO_LAB_PIGMENT|11|5|Bài 5. Thực hành: Quang hợp ở thực vật
BIO_LAB_LEAF_STARCH|11|5|Bài 5. Thực hành: Quang hợp ở thực vật
BIO_PLANT_RESPIRATION|11|6|Bài 6. Hô hấp ở thực vật
BIO_LAB_SEED_RESPIRATION|11|7|Bài 7. Thực hành: Hô hấp ở thực vật
BIO_DIGESTIVE_SYSTEM|11|8|Bài 8. Dinh dưỡng và tiêu hoá ở động vật
BIO_RESPIRATORY_SYSTEM|11|9|Bài 9. Hô hấp ở động vật
BIO_HEART_CIRCULATION|11|10|Bài 10. Tuần hoàn ở động vật
BIO_BLOOD_PRESSURE_REFLEX|11|10|Bài 10. Tuần hoàn ở động vật (điều hoà huyết áp)
BIO_LAB_CIRCULATION|11|11|Bài 11. Thực hành: Một số thí nghiệm về hệ tuần hoàn
BIO_IMMUNE_RESPONSE|11|12|Bài 12. Miễn dịch ở động vật
BIO_NEPHRON|11|13|Bài 13. Bài tiết và cân bằng nội môi
BIO_FEEDBACK_LOOP|11|13|Bài 13. Bài tiết và cân bằng nội môi
BIO_OSMOREGULATION_ADH|11|13|Bài 13. Bài tiết và cân bằng nội môi
BIO_PLANT_TROPISM|11|15|Bài 15. Cảm ứng ở thực vật
BIO_LAB_TROPISM|11|16|Bài 16. Thực hành: Cảm ứng ở thực vật
BIO_ACTION_POTENTIAL|11|17|Bài 17. Cảm ứng ở động vật
BIO_REFLEX_ARC|11|17|Bài 17. Cảm ứng ở động vật
BIO_EAR_HEARING|11|17|Bài 17. Cảm ứng ở động vật (cơ quan thụ cảm: tai)
BIO_SENSE_ORGANS|11|17|Bài 17. Cảm ứng ở động vật (cơ quan thụ cảm: mắt)
BIO_ANIMAL_BEHAVIOR|11|18|Bài 18. Tập tính ở động vật
BIO_PLANT_GROWTH|11|20|Bài 20. Sinh trưởng và phát triển ở thực vật
BIO_LAB_APICAL_DOMINANCE|11|21|Bài 21. Thực hành: Bấm ngọn, tỉa cành, tính tuổi cây
BIO_LAB_TREE_AGE|11|21|Bài 21. Thực hành: Bấm ngọn, tỉa cành, tính tuổi cây
BIO_ANIMAL_DEVELOPMENT|11|22|Bài 22. Sinh trưởng và phát triển ở động vật
BIO_LAB_METAMORPHOSIS|11|23|Bài 23. Thực hành: Quan sát biến thái ở động vật
BIO_FLOWER_STRUCTURE|11|25|Bài 25. Sinh sản ở thực vật
BIO_LAB_PROPAGATION|11|26|Bài 26. Thực hành: Nhân giống vô tính và thụ phấn cho cây
BIO_HUMAN_REPRODUCTION|11|27|Bài 27. Sinh sản ở động vật
BIO_DNA_FORK|12|1|Bài 1. DNA và cơ chế tái bản DNA
BIO_GENETIC_CODE_TABLE|12|2|Bài 2. Gene, sự truyền đạt thông tin di truyền và hệ gene
BIO_TRANSCRIPTION_TRANSLATION|12|2|Bài 2, 4. Gene, sự truyền đạt thông tin di truyền; Đột biến gene
BIO_GENE_ENGINEERING|12|5|Bài 5. Công nghệ di truyền
BIO_LAB_DNA_EXTRACT|12|6|Bài 6. Thực hành: Tách chiết DNA
BIO_MENDEL_EXTENDED|12|9|Bài 9, 11. Mở rộng học thuyết di truyền Mendel; Liên kết gene và hoán vị gene
BIO_CHROMOSOME|12|12|Bài 12. Đột biến nhiễm sắc thể
BIO_PEDIGREE|12|13|Bài 13. Di truyền học người và di truyền y học
BIO_LAB_CHROMOSOME_MUTATION|12|14|Bài 14. Thực hành: Quan sát đột biến nhiễm sắc thể
BIO_CYTOPLASMIC_INHERITANCE|12|15|Bài 15. Di truyền gene ngoài nhân
BIO_REACTION_NORM|12|16|Bài 16. Tương tác giữa kiểu gene với môi trường và thành tựu chọn giống
BIO_LAB_MODIFICATION|12|17|Bài 17. Thực hành: Thí nghiệm về thường biến ở cây trồng
BIO_EVIDENCE_PHYLOGENY|12|19|Bài 19. Các bằng chứng tiến hoá
BIO_POPULATION_EVOLUTION|12|21|Bài 18, 21. Di truyền quần thể; Học thuyết tiến hoá tổng hợp hiện đại
BIO_ORIGIN_OF_LIFE|12|22|Bài 22. Tiến hoá lớn và quá trình phát sinh chủng loại
BIO_ECOLOGICAL_LIMITS|12|23|Bài 23. Môi trường và các nhân tố sinh thái
BIO_POPULATION_GROWTH|12|24|Bài 24. Sinh thái học quần thể
BIO_POPULATION_ECOLOGY|12|24|Bài 24. Sinh thái học quần thể
BIO_LAB_QUADRAT|12|25|Bài 25. Thực hành: Xác định kiểu phân bố, ước tính mật độ và kích thước quần thể
BIO_LAB_COMMUNITY|12|27|Bài 27. Thực hành: Tìm hiểu một số đặc trưng cơ bản của quần xã
BIO_FOOD_WEB_ENERGY|12|29|Bài 29. Trao đổi vật chất và chuyển hoá năng lượng trong hệ sinh thái
BIO_SUCCESSION_CYCLES|12|30|Bài 30, 31. Diễn thế sinh thái; Sinh quyển và chu trình sinh – địa – hoá
BIO_LAB_MINI_ECOSYSTEM|12|32|Bài 32. Thực hành: Thiết kế hệ sinh thái nhân tạo
`.trim().split('\n').map((l) => l.split('|'));

const SUBJ = {MATH: 'toan', PHYSICS: 'ly', CHEMISTRY: 'hoa', BIOLOGY: 'sinh'};
const bad = [];
const rows = MAP.map(([id, grade, n, lesson]) => {
  const p = presets[id];
  if (!p) bad.push('không có preset: ' + id);
  return p && {id, subject: SUBJ[p.engine], grade: +grade, n: +n, lesson, title: ((t) => t.charAt(0).toUpperCase() + t.slice(1))(p.title.replace(/^Thực hành: (Thực hành |Thí nghiệm )?/, '')), question: p.question, lab: p.family === 'CHEM_BENCH' || p.family === 'PHYS_BENCH'};
}).filter(Boolean);
const mapped = new Set(MAP.map((r) => r[0]));
for (const id of Object.keys(presets)) if (!mapped.has(id) && !SKIP.has(id)) bad.push('chưa xếp bài: ' + id);
const seen = new Set();
for (const r of rows) {
  const k = r.id + '@' + r.grade;
  if (seen.has(k)) bad.push('trùng: ' + k);
  seen.add(k);
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
rows.sort((a, b) => a.subject.localeCompare(b.subject) || a.grade - b.grade || a.n - b.n || Number(a.lab) - Number(b.lab));
const q = (s) => JSON.stringify(s);
const body = rows.map((r) => `  [${q(r.id)}, ${q(r.subject)}, ${r.grade}, ${r.n}, ${q(r.lesson)}, ${q(r.title)}, ${q(r.question)}, ${r.lab}],`).join('\n');
fs.writeFileSync(out, `/**
 * Học liệu theo SGK Kết nối tri thức (Toán, Lí, Hoá, Sinh 10–12): mỗi dòng là một mô phỏng của bảng hoặc một bài thực hành 3D của /lab,
 * xếp đúng bài trong mục lục sách (đối chiếu docs/sgk-notes). Một mô phỏng dùng cho nhiều lớp thì có nhiều dòng.
 * Tên và câu hỏi khám phá chép từ preset của bảng (apps/teacher-board/src/utils/presets) vì hai app không được import lẫn nhau.
 * shortcut: dữ liệu chép tay một lần, preset của bảng đổi tên/thêm mới thì phải chạy lại bộ sinh (scripts/gen-sgk-catalog.js).
 */
export type SgkSubject = 'toan' | 'ly' | 'hoa' | 'sinh';

export interface SgkItem {
  /** mã preset trên bảng / mã bài ở /lab */
  id: string;
  subject: SgkSubject;
  grade: 10 | 11 | 12;
  /** số bài để xếp (0 = bài mở đầu, 99 = hoạt động trải nghiệm) */
  order: number;
  /** tên bài như trong mục lục SGK */
  lesson: string;
  title: string;
  question: string;
  /** true: bài thực hành 3D mở ở /lab; false: mô phỏng trực quan của bảng */
  lab: boolean;
}

type Row = [string, SgkSubject, 10 | 11 | 12, number, string, string, string, boolean];

const ROWS: Row[] = [
${body}
];

export const SGK_ITEMS: SgkItem[] = ROWS.map(([id, subject, grade, order, lesson, title, question, lab]) => ({id, subject, grade, order, lesson, title, question, lab}));

export const SGK_SUBJECTS: {id: SgkSubject; label: string}[] = [
  {id: 'toan', label: 'Toán'},
  {id: 'ly', label: 'Vật lí'},
  {id: 'hoa', label: 'Hoá học'},
  {id: 'sinh', label: 'Sinh học'},
];
`);
console.log('ok', rows.length, 'dòng,', new Set(rows.map((r) => r.id)).size, 'học liệu');
