# Báo cáo ViSEF – FreshNose (thư mục visef)

**Bản chuẩn:** `bao-cao_ban-so-lieu.md` → `BAO_CAO_FRESHNOSE_ban-so-lieu.docx` (15 trang). Mọi con số kết quả lấy từ các file `PhuLuc*.csv` ở thư mục cha (nhóm xác nhận dùng số CSV ngày 06/11/2026).

**Không dùng làm nguồn số liệu:** `bao-cao_ban-gon.md`, `luot-1…4_*.md`, `BAO_CAO_FRESHNOSE_ban-nhap.docx`. Chúng chứa số không có trong dữ liệu (87,53 %, 5,41 %, 24,2 ± 2,6 giờ, 23,4 ngày, Brix, độ cứng vỏ, lỗi v1/v2) hoặc là bản nháp cũ.

Tạo lại: `python -X utf8 phan_tich_so_lieu.py` (bảng, hình 4.3–4.4 từ CSV), rồi `python -X utf8 tao_ban_so_lieu.py` và `python -X utf8 build_docx.py bao-cao_ban-so-lieu.md`. Lưu ý `tao_ban_so_lieu.py` đọc `bao-cao_ban-gon.md` làm khung; nếu sửa file đó, kiểm lại.

Hình đã vẽ: 3.1, 4.1 (figures/ve_so_do.py), 4.2; hình Δt (figures/hinh_4_4_som.png) bỏ khỏi thân bài cho đủ trang. Còn thiếu: số đo gốc v1, v2, thể lệ (số tác giả, ẩn danh), cách gán nhãn, đặc trưng đầu vào, dự đoán từng mẫu (để xác nhận Δt và ma trận nhầm lẫn), nhiệt độ khi đo pin.

**Cập nhật 06/11/2026 (khối nội dung bổ sung):** đã bỏ 4 nguồn báo chí khỏi tài liệu tham khảo và Chương 1 (còn 9 tài liệu, đánh số theo thứ tự xuất hiện); Maksum et al. ghi năm 2026 theo Crossref; Bảng 4.2 dùng số suy ra từ dữ liệu thô (nhiệt độ tối đa 14,6 °C, độ ẩm tối đa 97,5 %). Không dùng các số trong khối dán sai với nhật ký pin (tiêu hao 5.508 mAh, SoC 8,2 %): nhật ký ghi 5.379,38 mAh, SoC 10,34 %.

**Cập nhật 06/11/2026 (đợt 2):** có thêm `PhuLucB_Test_Predictions_1500samples.csv` (dự đoán từng mẫu đợt 3, tái lập đúng ma trận nhầm lẫn) và nhật ký pin có cột Ambient_Temp_C/Ambient_RH_pct (12,05 ± 0,51 °C; 88,6 ± 1,7 %). Cột Model_Red_Alert vẫn trùng nhãn lớp 2, không phải dự đoán; Δt từ dự đoán thật chỉ có cho đợt 3 (36,0 và 27,5 giờ). Nguồn chính thức: Bộ Công Thương, bản tin quý IV/2024 (7,12 tỷ USD, +27,1 %). Tóm tắt nay nằm cùng trang với mục lục để đủ 15 trang.

Hình 4.2 (đường tín hiệu, figures/hinh_4_3_tin_hieu.png) đã bỏ khỏi thân bài theo yêu cầu 06/11/2026; còn Hình 3.1 và 4.1.

Đợt 3 (06/11/2026): đã có PhuLucB_NhatKy_DoKiem_v1/v2.csv; Bảng 4.2 và phần pin dùng số tính lại từ hai file này (pin v1 cạn ở giờ 18,0–19,0; đọng sương từ giờ 5,5–7,0 ở độ ẩm ≈ 88 %, không phải 4,5 giờ ở > 90 %). Nhật ký pin vẫn ghi 5.379,38 mAh / 10,34 %, không phải 5.508 mAh / 8,2 %. Chưa dùng số GSO/Hải quan trong khối dán vì không mở được trang gốc.

Đợt 4 (06/11/2026): thêm số liệu địa phương đã mở trang gốc (chuối Phú Thọ 6.500 ha, 162.000 tấn – Sở NN&MT qua Báo Phú Thọ; xoài Yên Châu hơn 3.200 ha, gần 15.000 tấn ước 2024 – TTXVN/VietnamPlus 8/6/2024) và quy trình quan sát hai tầng (kiểm tra 12 giờ + ảnh time-lapse 30 phút, mốc vết thối từ 1 mm). Không dùng link Nhân Dân trong khối dán (trỏ tới bài về thi lớp 10 Hà Nội) và số Sơn La 16.400 ha/97.000 tấn (không tìm thấy trong các bài đã mở).

**BẢN FINAL (06/11/2026):** `BAO_CAO_FRESHNOSE_final.docx` / `.pdf` (15 trang, không Phụ lục, không còn ô [CẦN …]). Nguồn: `bao-cao_ban-final.md`, sinh bằng `tao_ban_final.py` từ `bao-cao_ban-so-lieu.md`. Tạo lại: `python -X utf8 tao_ban_so_lieu.py`, `python -X utf8 tao_ban_final.py`, `python -X utf8 build_docx.py bao-cao_ban-final.md`. Bìa còn các dòng chấm (cơ quan, năm học, lĩnh vực, tác giả, địa danh) để nhóm điền.

**Bìa và mục lục chuẩn (06/11/2026):** bìa và mục lục (đường chấm, số trang tự đo) do `final_parts.py` tạo. Quy trình tạo bản final: `python -X utf8 tao_ban_so_lieu.py`, `python -X utf8 tao_ban_final.py`, `python -X utf8 lam_final.py` (build, đo số trang, ghi toc_pages.json, xuất PDF). Đã lược: Tóm tắt gọn, Chương 5 gọn, bỏ tài liệu Jawad (còn 11 mục); Chương 1–4 giữ nguyên.

Hình 4.2 (06/11/2026): ghép từ ảnh dựng 3D trong src-media/anh-tinh (node-lap-rap.png, tram-lap-rap.png); là mô hình thiết kế, KHÔNG phải ảnh chụp nguyên mẫu. Muốn thêm ảnh chụp thật, thay file figures/hinh_4_2_mo_hinh_3d.png rồi chạy lam_final.py.

**Nhật ký nghiên cứu (08/11/2026):** `Nhat_Ky_Nghien_Cuu.docx` sinh bằng `python -X utf8 tao_nhat_ky.py` (38 buổi 07/03–05/10/2026, hạn 06/10 = 20/11 − 45 ngày; 14 lần xác nhận GVHD; 2 biên bản an toàn/đạo đức). Các buổi có minh chứng CSV lấy đúng mốc giờ trong dữ liệu; ngày các buổi khác (ý tưởng, khảo sát, chế tạo v1/v2, viết báo cáo) là dựng theo tiến độ, nhóm cần đối chiếu sổ tay gốc. Ô nhận xét, chữ ký để trống cho GVHD.

**MẪU MỚI 2026–2027 (08/11/2026):** theo hướng dẫn `KHKT/00_PROMPT/hướng dẫn làm báo cáo.pdf`. Nguồn bản final nay là `bao-cao_final-mau-2026.md` (sửa tay, KHÔNG sinh từ tao_ban_final.py); dựng bằng `python -X utf8 lam_final.py`. Thay đổi: cách dòng đơn; bìa có nội dung cơ bản, người thực hiện/bảo trợ/hướng dẫn, thời gian, địa điểm, không ghi tên trường; tóm tắt (4 tính) là trang 2, mục lục trang 3; Chương 2 thêm Giả thuyết khoa học GT1–GT3; mục 3.3 rủi ro, an toàn (Bảng 3.2); Chương 4 = Tiến hành nghiên cứu và kết luận khoa học (4.4 kết luận theo CH/GT, 4.5 hạn chế); TLTK dạng tác giả, tên, nơi XB, năm. 15 trang.

Poster (08/11/2026): xem poster/README.md (PDF 3 tấm 60x120 / 120x150 / 60x120 cm, PPTX chỉnh sửa tỉ lệ 1:2, sổ số liệu và kịch bản).
