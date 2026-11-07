# Đề xuất hoàn thiện bộ template trực quan theo SGK mới (Kết nối tri thức, 15 quyển)

Trạng thái: **ĐÃ DUYỆT và ĐÃ LÀM XONG toàn bộ danh mục (2026-11-07): 127 preset (Toán 22, Lý 30, Hóa 26, Sinh 49), thêm 3 họ SCENE_LAB/TRIAL_LAB/TABLE_LAB.** Lịch sử: Đợt 0 đã làm xong (khung preset + 4 họ engine E1/E5/E6/E12 + 6 preset thí điểm, xem `.ai/HANDOFF.md`). Đợt 1 đã bắt đầu với Sinh: 14 preset (xem `.ai/HANDOFF.md`).

## 1. Đã làm gì

Đọc **toàn bộ 15 quyển** (Toán 10/11/12 ×2 tập, Lý 10/11/12, Hóa 10/11/12, Sinh 10/11/12; PDF là bản quét nên đã dựng quy trình OCR + xem ảnh từng trang). Với mỗi bài ghi: hình (Hình x.y), công thức, số liệu, thí nghiệm, và đối chiếu với template đang có. Ghi chú chi tiết theo bài nằm ở [`docs/sgk-notes/`](sgk-notes/INDEX.md) (15 file, ~575 KB) — đó là bằng chứng "không bỏ sót"; tài liệu này chỉ là bản tổng hợp.

## 2. Hiện trạng: ~42 mô phỏng, phủ rất mỏng so với sách

| Môn | Đã có | Phủ được |
|---|---|---|
| Toán (11) | MATH_GRAPH (nhiều hàm, ẩn, nghiệm, cực trị, giao điểm, tiếp tuyến, Riemann), TRIG_WAVE, FUNC_2D, GEO_SOLID, 3D_OXYZ, INTEGRAL_3D_REVOLVE, DYNAMIC_GEOMETRY, LINEAR_PROGRAMMING, COBWEB_CHAOS, STAT_BOXPLOT, VARIATION_TABLE | Đồ thị hàm bất kì; khối đa diện; mặt cầu–mặt phẳng; quy hoạch tuyến tính; hộp |
| Lý (10) | PROJECTILE, PENDULUM, INCLINED, RIPPLE_TANK, RLC_PHASOR, GAS_STATE_PV, DOUBLE_PENDULUM, CORIOLIS, FRAUNHOFER, OPTICS_LENS | Ném xiên, con lắc, mặt phẳng nghiêng, giao thoa nước, RLC, p–V, thấu kính |
| Hóa (10) | BALANCE_SCALE, EQUILIBRIUM_TITRATION, MOLECULE_3D (VSEPR), LE_CHATELIER_GAS, GALVANIC_DANIELL, REACTION_LAB, SN2, CFT_COMPLEX_3D, CRYSTAL_LATTICE, ORGANIC_SKELETAL | Cân bằng PT, chuẩn độ, hình học phân tử, pin Daniell, tốc độ phản ứng, tinh thể |
| Sinh (11) | PHOTOSYNTHESIS, DNA_HELIX, HEART_CYCLE, PUNNETT_SQUARE, HARDY_WEINBERG, STOMATA_GAS, OSMOSIS_CELL, OPERON_LAC, CELL_RESPIRATION, LOTKA_VOLTERRA, CELL_SIGNALING | Quang hợp, ADN, tim, lai Menđen, Hardy–Weinberg, khí khổng, thẩm thấu, operon Lac |

Đã đối chiếu theo `docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md` và mã engine. Trước khi viết mỗi template mới sẽ kiểm lại engine liên quan một lần nữa (nếu engine cũ đã đủ thì chỉ thêm "chế độ" chứ không tạo mới).

**Kết luận đối chiếu:** nội dung sách có nhiều cụm lớn chưa có mô phỏng nào — động học–động lực học, dao động–sóng, điện–từ trường, nhiệt–khí–hạt nhân; vectơ, Oxy–conic, đếm–xác suất–thống kê, dãy số–giới hạn–hàm mũ–log, đạo hàm–khảo sát–tích phân ứng dụng; cấu tạo nguyên tử–liên kết–bảng tuần hoàn, hữu cơ (cấu tạo–phản ứng), điện phân, polymer, kim loại; và gần như **toàn bộ Sinh 10–11** (tế bào, vi sinh, vi rút, tiêu hóa, hô hấp, tuần hoàn, thần kinh, miễn dịch, bài tiết, sinh trưởng, sinh sản) + phần lớn **Sinh 12** (phiên mã–dịch mã, NST, phả hệ, tiến hóa, sinh thái học).

## 3. Kiến trúc đề xuất: ít engine dùng chung, nhiều "preset" nội dung

Làm ~118 engine riêng lẻ thì quá đắt và khó bảo trì (engine hiện nay dài 400–3300 dòng/file). Đề xuất **12 họ engine dùng chung**, mỗi mô phỏng mới là một *preset dữ liệu* (có `templateId` riêng để định tuyến theo từ khóa, hướng dẫn và kiểm thử):

| Họ | Việc nó làm | Dùng cho (ví dụ) |
|---|---|---|
| E1 CURVE_LAB | Đồ thị đáp ứng có thanh trượt, nhãn trục/đơn vị theo miền, mốc chú thích, so nhiều đường | v–t, d–t, N(t) phóng xạ, enzyme, giới hạn sinh thái, logistic J/S, đồ thị chuyển thể, đặc tuyến, thang pH |
| E2 SCENE_2D | Cảnh vật lí 2D kéo-thả (vật, vectơ lực, dây, lò xo, điện tích) với bộ giải nhẹ | lực, đòn bẩy, va chạm, tròn đều, điện trường, từ trường, thuyền qua sông |
| E3 PARTICLE_SIM | Mô phỏng hạt | khí, Maxwell, phóng xạ, ion, thẩm thấu, phân hạch dây chuyền |
| E4 GEOM_CONSTRUCT | Dựng hình 2D/3D có công cụ đo (mở rộng DynamicGeometry/GEO_SOLID) | Oxy, conic, giải tam giác, vectơ, khoảng cách–góc trong không gian |
| E5 ANATOMY_FLOW | Hình giải phẫu/sơ đồ phân lớp SVG, điểm chạm, dòng chảy động | tiêu hóa, hô hấp, tim–mạch, nephron, mắt, tai, hoa, tế bào, vi rút, lò cao, tháp chưng cất |
| E6 PROCESS_STEPS | Chuỗi bước/chu trình có trạng thái, bật–tắt tác nhân | nguyên phân–giảm phân, DNA tái tổ hợp, nhân giống, chu kì vi rút, chu trình C–N–nước |
| E7 TABLE_EXPLORER | Bảng tương tác | bảng mã di truyền, bảng tuần hoàn, bảng chân trị, bảng tần số |
| E8 MOLECULE_STRUCT | Cấu trúc phân tử/phản ứng hữu cơ (mở rộng MOLECULE_3D/ORGANIC) | đồng phân, zigzag, thế–cộng, glucose vòng, amino acid, polymer |
| E9 PROB_STAT_LAB | Đếm–xác suất–thống kê | cây đếm, Pascal, xúc xắc, Bayes, histogram |
| E10 GENETICS_LAB | Mở rộng Punnett | phả hệ, hoán vị gene, đột biến NST, tiến hóa 5 nhân tố, phiên mã–dịch mã |
| E11 VIRTUAL_LAB | Ống nghiệm ảo nhận biết/phản ứng | halogen, ion kim loại, màu ngọn lửa, thử đường |
| E12 FEEDBACK_SYSTEM | Sơ đồ điều hòa ngược/hệ thống mở/bể chứa | huyết áp, glucose, ADH, GnRH–FSH–LH, diễn thế, chu trình sinh–địa–hóa |

Tác động lên hệ thống (đã kiểm): `TemplateId` trong `packages/types` đã là `… | string` nên **không cần đổi hợp đồng kiểu**. Bộ định tuyến cục bộ (`localRouter.ts`, `matchAdvancedKeywords`) đủ để mở mô phỏng mới từ chữ gõ/viết. Backend `services/ai-engine/routers/visualize.py` có `OFFLINE_TEMPLATE_REGISTRY` và lời nhắc LLM liệt kê mã mẫu; đường **AI-nhận-dạng** muốn biết mã mới thì phải cập nhật hai chỗ đó (làm ở Đợt 2, không chặn Đợt 1). Mỗi mô phỏng mới chạm: `ADVANCED_TEMPLATES` (`utils/advancedStemModels.ts`), regex từ khóa (`matchAdvancedKeywords`), danh sách `localRouter.ts`, `SimulationWidget.tsx`, thêm dòng vào `docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md` (bị `guideExamples.test.ts` kiểm), ca trong `liveDemoCases.test.ts`/`viNaturalPhrases.test.ts`, và chạy `keywordRoutingFalsePositives.test.ts` (rủi ro lớn nhất: từ khóa mới nuốt nhầm câu của template cũ — mỗi đợt phải có bộ kiểm va chạm từ khóa).

## 4. Danh mục mô phỏng mới (★ cốt lõi · ● quan trọng · ○ bổ trợ)

Nguồn: tên file ghi chú trong `docs/sgk-notes/` (T=Toán, L=Lý, H=Hóa, S=Sinh).

### 4.1 Toán — 22
| # | ID | Nội dung | Nguồn | Họ | Ưu tiên |
|---|---|---|---|---|---|
| 1 | MATH_SET_LOGIC | Venn, khoảng–đoạn trên trục số, bảng chân trị, mệnh đề | T10 t1 | E7/E9 | ● |
| 2 | MATH_UNIT_CIRCLE | Đường tròn lượng giác, cung liên quan, PT lượng giác, đồ thị sin/cos sinh từ đường tròn, cộng sóng | T10 t1, T11 t1 | E4/E1 | ★ |
| 3 | MATH_TRIANGLE_SOLVER | Giải tam giác (sin, cos, Heron, trường hợp mơ hồ SSA), đo khoảng cách không tới được | T10 t1 | E4 | ★ |
| 4 | MATH_VECTOR_2D | Tổng, hiệu, tích với số, tọa độ, tích vô hướng, góc, chiếu, lực, thuyền qua sông | T10 t1 | E4/E2 | ★ |
| 5 | MATH_VECTOR_3D | Vectơ Oxyz, tích có hướng, mp/đt, vị trí tương đối, góc, khoảng cách | T12 t1/t2 | E4 | ★ |
| 6 | MATH_QUADRATIC | Parabol (a,b,c), Δ, đỉnh, trục, dấu tam thức, BPT bậc hai, đồng/nghịch biến (x₁<x₂) | T10 t2 B15–18 | E1/E4 | ★ |
| 7 | MATH_ANALYTIC_LINE_CIRCLE | Đường thẳng (n, u, PT tổng quát–tham số), góc, khoảng cách điểm–đường, đường tròn, tiếp tuyến | T10 t2 B19–21 | E4 | ★ |
| 8 | MATH_CONIC_LAB | Elip/hypebol/parabol: sợi dây, tiêu điểm, đường chuẩn, tia phản xạ, Kepler, LORAN | T10 t2 B22 | E4 | ★ |
| 9 | MATH_COUNTING_TREE | Sơ đồ cây đếm, quy tắc cộng–nhân, hoán vị–chỉnh hợp–tổ hợp, Pascal, nhị thức Newton | T10 t2 B23–25 | E9 | ★ |
| 10 | MATH_PROBABILITY_LAB | Xúc xắc/đồng xu/túi bi, không gian mẫu, Venn biến cố, cây xác suất, xác suất có điều kiện, Bayes, Monty Hall, luật số lớn | T10 t2, T11 t2, T12 t2 | E9 | ★ |
| 11 | MATH_STAT_DESCRIPTIVE | Dot-plot, histogram, mẫu ghép nhóm, trung bình–trung vị–mốt–tứ phân vị–phương sai, so sánh hai mẫu | T10, T11 t2, T12 t2 | E9 | ★ |
| 12 | MATH_APPROX_ERROR | Số gần đúng, sai số tuyệt đối/tương đối, quy tròn | T10 t1 | E1 | ○ |
| 13 | MATH_SEQUENCE_LAB | Dãy số, CSC/CSN, giới hạn dãy ε–N, tổng CSN lùi vô hạn | T11 t1 | E1 | ★ |
| 14 | MATH_LIMIT_CONTINUITY | Giới hạn hàm số ε–δ, liên tục, tiệm cận | T11 t1 | E1 | ● |
| 15 | MATH_EXP_LOG | aˣ, logₐx, đối xứng qua y=x, PT/BPT, lãi kép, thang pH–Richter–dB | T11 t1 | E1 | ★ |
| 16 | MATH_SPACE_RELATIONS | Song song–vuông góc, ba đường vuông góc, phép chiếu song song, khoảng cách, góc, nhị diện, thể tích | T11 t2 | E4 | ★ |
| 17 | MATH_DERIVATIVE_LAB | Cát tuyến→tiếp tuyến, ý nghĩa s–v–a, f và f′ | T11 t2 | E1 | ★ |
| 18 | MATH_FUNCTION_STUDY | Khảo sát hàm số chiều xuôi: TXĐ→f′→bảng biến thiên→tiệm cận→đồ thị, GTLN/GTNN | T12 t1 | E1 | ★ |
| 19 | MATH_OPTIMIZATION | Tối ưu thực tiễn (hộp, hàng rào, chi phí, Fermat) | T12 t1, T10 B16 | E1/E4 | ★ |
| 20 | MATH_INTEGRAL_AREA | Diện tích dưới/giữa hai đường, Riemann (trái/phải/trung điểm/hình thang), quãng đường, thể tích mặt cắt | T12 t1 | E1 | ★ |
| 21 | MATH_FINANCE_GROWTH | Lãi đơn/kép, trả góp | T11 t1, T12 t2 | E1 | ○ |
| 22 | MATH_QUADRIC_SURFACES | Mặt bậc hai, dải Möbius | T12 t1 | E4 | ○ |

### 4.2 Vật lí — 30
| # | ID | Nội dung | Nguồn | Họ | Ưu tiên |
|---|---|---|---|---|---|
| 1 | PHYS_KINEMATICS_1D | Đồ thị d–t, v–t, a–t kéo được; rơi tự do; ống Newton; độ dịch chuyển vs quãng đường | L10 | E1/E2 | ★ |
| 2 | PHYS_RELATIVE_VELOCITY | Tổng hợp vận tốc, thuyền qua sông | L10 | E2 | ● |
| 3 | PHYS_MEASUREMENT_ERROR | Sai số phép đo | L10 | E1 | ○ |
| 4 | PHYS_FORCE_COMPOSITION | Tổng hợp–phân tích lực, cân bằng 3 lực | L10 | E2 | ★ |
| 5 | PHYS_MOMENT_LEVER | Moment, đòn bẩy, ngẫu lực, trọng tâm | L10 | E2 | ★ |
| 6 | PHYS_NEWTON_LAWS | ĐL2 Newton, Atwood, kéo xe | L10 | E2 | ★ |
| 7 | PHYS_SPRING_HOOKE | Lò xo Hooke, ghép lò xo | L10 | E2 | ● |
| 8 | PHYS_FLUID_PRESSURE | Áp suất chất lỏng, Archimedes, lực cản | L10 | E2 | ● |
| 9 | PHYS_WORK_ENERGY | Công–công suất, động–thế năng, bảo toàn cơ năng, Sankey hiệu suất | L10 | E2/E1 | ★ |
| 10 | PHYS_COLLISION_1D | Va chạm, động lượng, con lắc Newton, phản lực | L10 | E2 | ★ |
| 11 | PHYS_CIRCULAR_MOTION | Tròn đều, lực hướng tâm, vệ tinh | L10 | E2 | ★ |
| 12 | PHYS_SHM | Dao động điều hòa: lò xo, x–v–a, vòng pha, năng lượng, lệch pha, cộng hưởng, tắt dần | L11 | E1/E2 | ★ |
| 13 | PHYS_WAVE_MECH | Sóng ngang/dọc, sóng dừng, sóng âm, độ lệch pha | L11 | E1/E2 | ★ |
| 14 | PHYS_YOUNG_INTERFERENCE | Giao thoa Young ánh sáng | L11 | E1 | ● |
| 15 | PHYS_EM_SPECTRUM | Sóng điện từ E–B, thang sóng | L11, L12 | E1 | ○ |
| 16 | PHYS_ELECTRIC_FIELD | Coulomb, đường sức, điện tích trong điện trường đều, thế năng | L11 | E2 | ★ |
| 17 | PHYS_CAPACITOR | Tụ điện, năng lượng, ghép tụ | L11 | E2 | ● |
| 18 | PHYS_DC_CIRCUIT | Định luật Ôm, đặc tuyến, nguồn điện toàn mạch, nối tiếp/song song, công suất, tốc độ trôi | L11 | E2/E1 | ★ |
| 19 | PHYS_OSCILLOSCOPE | Dao động kí | L11 | E1 | ○ |
| 20 | PHYS_KINETIC_GAS_PARTICLES | Hạt khí, áp suất, nhiệt độ, phân bố tốc độ, đẳng quá trình p–V/p–T/V–T, Clapeyron | L12 | E3/E1 | ★ |
| 21 | PHYS_STATES_OF_MATTER | Mô hình phân tử rắn–lỏng–khí, chuyển thể, nội năng | L12 | E3 | ● |
| 22 | PHYS_HEAT_CALORIMETRY | c, λ, L, đồ thị chuyển thể, cân bằng nhiệt, ĐL I NĐLH | L12 | E1 | ★ |
| 23 | PHYS_THERMOMETER | Nhiệt độ, thang nhiệt | L12 | E1 | ○ |
| 24 | PHYS_MAGNETIC_FIELD | Đường sức từ, quy tắc bàn tay phải, lực từ/Lorentz | L12 | E2 | ★ |
| 25 | PHYS_EM_INDUCTION | Faraday, Lenz, máy phát xoay chiều 1–3 pha | L12 | E2/E1 | ★ |
| 26 | PHYS_TRANSFORMER_GRID | Máy biến áp, truyền tải điện, hao phí | L12 | E2/E1 | ● |
| 27 | PHYS_ALPHA_SCATTERING | Tán xạ α Rutherford, cấu trúc hạt nhân | L12 | E3 | ● |
| 28 | PHYS_NUCLEAR_BINDING | Năng lượng liên kết riêng | L12 | E1 | ● |
| 29 | PHYS_RADIOACTIVE_DECAY | N(t), chu kì bán rã, C-14, an toàn bức xạ | L12 | E3/E1 | ★ |
| 30 | PHYS_FISSION_REACTOR | Phân hạch dây chuyền, lò phản ứng, nhà máy điện hạt nhân | L12 | E3/E5 | ● |

### 4.3 Hóa học — 26
| # | ID | Nội dung | Nguồn | Họ | Ưu tiên |
|---|---|---|---|---|---|
| 1 | CHEM_ATOM_STRUCTURE | Cấu hình electron–orbital (Aufbau, Hund, Pauli), phổ khối, nguyên tử khối TB, mô hình nguyên tử | H10 | E7/E4 | ★ |
| 2 | CHEM_PERIODIC_TABLE | Bảng tuần hoàn tương tác, xu hướng (bán kính, I₁, độ âm điện) | H10 | E7 | ★ |
| 3 | CHEM_BONDING | Lewis–octet, liên kết ion/cộng hóa trị, xen phủ σ/π, năng lượng liên kết, liên kết H, van der Waals | H10 | E8 | ★ |
| 4 | CHEM_REDOX | Số oxi hóa, thăng bằng electron, chuyển electron | H10, H12 | E6 | ★ |
| 5 | CHEM_ENERGETICS | Giản đồ enthalpy, E_b, ΔfH, nhiệt lượng kế, Hess | H10 | E1 | ★ |
| 6 | CHEM_KINETICS | Thuyết va chạm, E_a, xúc tác, đồ thị C–t (mở rộng REACTION_LAB) | H10 | E1/E3 | ★ |
| 7 | CHEM_HALOGEN_LAB | Halogen, nhận biết halide | H10 | E11 | ● |
| 8 | CHEM_EQUILIBRIUM_GENERAL | K_C, Q so K, Haber–Bosch (tổng quát hóa LE_CHATELIER) | H11 | E1/E3 | ★ |
| 9 | CHEM_ACID_BASE | Điện li, thang pH, axit yếu, dung dịch đệm | H11 | E1 | ★ |
| 10 | CHEM_INDUSTRIAL_PROCESS | Sản xuất H₂SO₄, NH₃, HNO₃ (sơ đồ công nghệ) | H11 | E5/E6 | ● |
| 11 | CHEM_SPECTRA | Phổ IR/MS, lập CTPT | H11 | E1 | ● |
| 12 | CHEM_SEPARATION | Chưng cất, chiết, kết tinh, sắc kí, chưng cất dầu mỏ, cracking | H11 | E5 | ★ |
| 13 | CHEM_ORGANIC_STRUCTURE | Nhóm chức, đồng phân, đồng đẳng, zigzag, danh pháp | H11 | E8 | ★ |
| 14 | CHEM_ORGANIC_REACTIONS | Thế, cộng, Markovnikov, trùng hợp, arene; alcohol–aldehyde–acid; este hóa | H11 | E8 | ★ |
| 15 | CHEM_BOILING_POINTS | Nhiệt độ sôi theo họ chất, liên kết H | H11 | E1 | ○ |
| 16 | CHEM_LIPID_SOAP | Chất béo, acid béo, micelle, xà phòng hóa | H12 | E8 | ● |
| 17 | CHEM_CARBOHYDRATE | Glucose vòng–hở, disaccharide, polysaccharide | H12 | E8 | ★ |
| 18 | CHEM_AMINO_PROTEIN | Amine, amino acid (điện di, pI), peptide–protein | H12 | E8 | ● |
| 19 | CHEM_POLYMER | Trùng hợp, trùng ngưng, lưu hóa | H12 | E8 | ● |
| 20 | CHEM_ELECTROLYSIS | Điện phân NaCl/CuSO₄/Al₂O₃, mạ điện, tinh luyện, Faraday | H12 | E2/E5 | ★ |
| 21 | CHEM_ELECTROCHEM_SERIES | Dãy điện hóa, quy tắc α, pin khác (acquy, nhiên liệu) | H12 | E7 | ● |
| 22 | CHEM_METALLURGY | Tách kim loại, lò cao, hợp kim, ăn mòn điện hóa | H12 | E5 | ● |
| 23 | CHEM_ALKALI_EARTH | Kiềm–kiềm thổ, màu ngọn lửa, độ tan, nước cứng, Solvay | H12 | E11/E7 | ● |
| 24 | CHEM_TRANSITION_COMPLEX | Cấu hình d, màu ion, phức chất | H12 | E7 | ○ |
| 25 | CHEM_VIRTUAL_TESTTUBE | Ống nghiệm ảo nhận biết chất (kết tủa, khí, màu) | H10–12 | E11 | ★ |
| 26 | CHEM_SCIENCE_PROCESS | Quy trình nghiên cứu khoa học (sơ đồ khối) | H10 | E6 | ○ |

### 4.4 Sinh học — 40
| # | ID | Nội dung | Nguồn | Họ | Ưu tiên |
|---|---|---|---|---|---|
| 1 | BIO_SCALE_CELL_TYPES | Cấp độ tổ chức, nhân sơ vs nhân thực, bào quan, tỉ lệ S/V, kính hiển vi ảo | S10 | E5 | ★ |
| 2 | BIO_BIOMOLECULES | Nước–liên kết H, lipid–phospholipid, protein 4 bậc, DNA/RNA | S10 | E8/E5 | ★ |
| 3 | BIO_ENZYME_ATP | Enzyme (nhiệt độ, pH, cơ chất, ức chế), ATP | S10 | E1/E5 | ★ |
| 4 | BIO_MEMBRANE_TRANSPORT | Vận chuyển qua màng, màng khảm động (mở rộng OSMOSIS) | S10 | E3/E5 | ★ |
| 5 | BIO_METABOLISM_PATHWAYS | Lên men, quang hợp C₃/C₄/CAM, điểm bù–bão hòa, phổ hấp thụ | S10, S11 | E1/E6 | ★ |
| 6 | BIO_CELL_DIVISION | Chu kì tế bào, nguyên phân, giảm phân, trao đổi chéo | S10, S12 | E6 | ★ |
| 7 | BIO_MICROBE_LAB | Nhuộm Gram, phân lập, kháng sinh đồ, 4 pha sinh trưởng, lên men | S10 | E11/E1 | ● |
| 8 | BIO_VIRUS | Cấu tạo vi rút, sinh tan–tiềm tan, HIV, cúm, SIR, vaccine | S10 | E6 | ★ |
| 9 | BIO_WATER_TRANSPORT_PLANT | Hút nước, mạch gỗ, đai Caspary, mạch rây (khí khổng đã có) | S11 | E5/E6 | ★ |
| 10 | BIO_MINERAL_NUTRITION | Triệu chứng thiếu khoáng, đường cong liều phân bón | S11 | E1 | ○ |
| 11 | BIO_PLANT_RESPIRATION | Hô hấp thực vật: hạt nảy mầm + nước vôi, yếu tố ảnh hưởng | S11 | E1/E11 | ● |
| 12 | BIO_DIGESTIVE_SYSTEM | Hệ tiêu hóa người: enzyme–pH từng đoạn, mật, lông ruột | S11 | E5 | ★ |
| 13 | BIO_RESPIRATORY_SYSTEM | Thông khí phổi, mang cá ngược chiều, phổi chim, ống khí | S11 | E5 | ★ |
| 14 | BIO_CIRCULATION | Chu kì tim 0,8 s + ECG + dẫn truyền, huyết áp–vận tốc theo tiết diện, tim ếch + adrenaline (mở rộng HEART_CYCLE) | S11 | E5/E1 | ★ |
| 15 | BIO_IMMUNE | Viêm–sốt, T/B/kháng thể khóa–chìa, đáp ứng nguyên phát–thứ phát, HIV–CD4, dị ứng | S11 | E5/E1 | ★ |
| 16 | BIO_EXCRETION_HOMEOSTASIS | Nephron lọc–tái hấp thu–tiết, ADH, insulin–glucagon, xét nghiệm | S11 | E5/E12 | ★ |
| 17 | BIO_NERVE_IMPULSE | Điện thế nghỉ–hoạt động mV–t, nhảy cóc myelin, synapse, cung phản xạ | S11 | E1/E5 | ★ |
| 18 | BIO_SENSE_ORGANS | Mắt (tạo ảnh, điều tiết), tai, ốc tai | S11 | E5 | ● |
| 19 | BIO_PLANT_TROPISM | Hướng động (sáng, trọng lực, nước, hóa), auxin, trinh nữ cụp lá | S11 | E2/E5 | ★ |
| 20 | BIO_ANIMAL_BEHAVIOR | Điều kiện hóa Pavlov/Skinner, pheromone, di cư, in vết | S11 | E1/E3 | ○ |
| 21 | BIO_PLANT_GROWTH | Mô phân sinh, vòng gỗ, hormone (auxin–GA–cytokinin–ABA–ethylene), ưu thế ngọn, quang chu kì | S11 | E5/E1 | ★ |
| 22 | BIO_ANIMAL_DEVELOPMENT | Biến thái hoàn toàn/không hoàn toàn, hormone, phôi người | S11 | E6 | ● |
| 23 | BIO_FLOWER_REPRODUCTION | Hoa, giảm phân tạo hạt phấn–túi phôi, thụ tinh kép, hạt–quả; giâm–chiết–ghép–in vitro | S11 | E5/E6 | ★ |
| 24 | BIO_HUMAN_REPRODUCTION | Sinh tinh–sinh trứng, thụ tinh, chu kì kinh nguyệt + hormone, oxytocin, tránh thai | S11 | E5/E12 | ★ |
| 25 | BIO_FEEDBACK_LOOP | Sơ đồ điều hòa ngược tham số hóa (huyết áp, ADH, glucose, GnRH–FSH–LH) | S11 | E12 | ★ |
| 26 | BIO_DNA_REPLICATION | Chạc sao chép, mạch liên tục–gián đoạn Okazaki (mở rộng DNA_HELIX) | S12 B1 | E5/E6 | ★ |
| 27 | BIO_TRANSCRIPTION_TRANSLATION | Phiên mã–dịch mã, bảng mã, ribosome A/P/E, đột biến gene (dịch khung) | S12 B2,B4 | E7/E10 | ★ |
| 28 | BIO_GENE_ENGINEERING | DNA tái tổ hợp (enzyme giới hạn–ligase–plasmid), GMO, tách chiết DNA | S12 B5–6 | E6/E11 | ● |
| 29 | BIO_CHROMOSOME | Cấu trúc NST nhiều cấp, đột biến NST (4 dạng, lệch bội, đa bội), karyotype | S12 B7,B12 | E10 | ★ |
| 30 | BIO_MENDEL_EXTENDED | Trội không hoàn toàn, đồng trội ABO, cộng gộp, liên kết giới tính, liên kết–hoán vị, bản đồ DT (mở rộng PUNNETT) | S12 B8–11 | E10 | ★ |
| 31 | BIO_PEDIGREE | Phả hệ, xác suất bệnh di truyền, tư vấn | S12 B13 | E10 | ★ |
| 32 | BIO_CYTOPLASMIC_INHERITANCE | Di truyền tế bào chất (Correns), phân chia lục lạp | S12 B15 | E10 | ○ |
| 33 | BIO_REACTION_NORM | Mức phản ứng của kiểu gene (thỏ Himalaya, ruồi giấm cánh cụt) | S12 B16 | E1 | ○ |
| 34 | BIO_POPULATION_EVOLUTION | 5 nhân tố tiến hóa: phiêu bạt, dòng gene, CLTN, giao phối cận huyết (mở rộng HARDY_WEINBERG) | S12 B18,B21 | E10/E1 | ★ |
| 35 | BIO_EVIDENCE_PHYLOGENY | Cytochrome C, cây phát sinh chủng loại, hóa thạch–đồng hồ phóng xạ | S12 B19,B22 | E5/E1 | ● |
| 36 | BIO_ORIGIN_OF_LIFE | Miller–Urey, nội cộng sinh, niên biểu địa chất, phát sinh loài người | S12 B22 | E6 | ● |
| 37 | BIO_ECOLOGICAL_LIMITS | Giới hạn sinh thái, nhịp sinh học | S12 B23 | E1 | ★ |
| 38 | BIO_POPULATION_ECOLOGY | Logistic J/S, tháp tuổi, kiểu phân bố, ô vuông, đánh dấu–bắt lại | S12 B24–25 | E1/E9 | ★ |
| 39 | BIO_FOOD_WEB_ENERGY | Chuỗi–lưới thức ăn, tháp sinh thái, hiệu suất 10%, phóng đại sinh học | S12 B28–29 | E5/E1 | ★ |
| 40 | BIO_SUCCESSION_CYCLES | Diễn thế, phú dưỡng, chu trình C–N–nước, bảo tồn–phát triển bền vững | S12 B30–34 | E12/E6 | ● |

Tổng: **Toán 22 + Lý 30 + Hóa 26 + Sinh 40 = 118 mô phỏng mới**, trong đó ★ ≈ 70, ● ≈ 34, ○ ≈ 14.

## 5. Lộ trình chia đợt (mỗi đợt xong: test + hướng dẫn + ca trình diễn + chạy `tsc`, `vitest`)

- **Đợt 0 — Nền tảng:** E1 CURVE_LAB, E5 ANATOMY_FLOW, E6 PROCESS_STEPS, E12 FEEDBACK_SYSTEM; khung đăng ký preset (một nơi khai báo → tự vào router, `allTemplatesRender`, hướng dẫn); bộ kiểm va chạm từ khóa chạy trước mỗi lần thêm.
- **Đợt 1 — Cốt lõi (★ ≈ 70):** chia theo môn, mỗi môn một nhánh/phiên làm riêng để không đụng file nhau.
- **Đợt 2 — Quan trọng (●):** họ E2/E3/E8/E11 và phần còn lại.
- **Đợt 3 — Bổ trợ (○) + rà soát:** đối chiếu lại từng bài sách với danh mục, lấp chỗ sót, đo thực tế bằng người dùng (giáo viên) rồi chỉnh từ khóa.

## 6. Cần anh/chị quyết định

1. Duyệt **kiến trúc "12 họ engine + preset"** (mục 3) thay vì mỗi mô phỏng một engine riêng?
2. **Thứ tự môn/khối** cho Đợt 1 (ví dụ theo lịch dạy sắp tới, hay theo môn video demo cần).
3. Ngưỡng "đủ": làm hết ★ trước rồi mới tính ●/○, hay làm đủ theo từng bài sách?
4. Cho phép tách việc thành **nhiều phiên song song** (mỗi môn một phiên) không?

Chưa có gì được commit; các ghi chú đọc sách đang ở `docs/sgk-notes/` (chưa add vào git).
