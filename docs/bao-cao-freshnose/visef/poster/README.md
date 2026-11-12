# Poster KHKT – FreshNose AI (bộ 3 tấm gập 60×120 – 120×150 – 60×120 cm)

Dựng theo `master-prompt-poster-KHKT-ViSEF.md`, bố cục học từ ba poster mẫu TIF (dải tiêu đề màu cho từng mục, tên dự án trên dải xanh, quy trình, hình cấu tạo lớn có chú giải đánh số). Số liệu lấy từ báo cáo bản cuối `visef/bao-cao_final-mau-2026.md` và các file `PhuLuc*.csv`.

## File dùng để in và chỉnh sửa
| File | Dùng làm gì |
|---|---|
| `tam-trai.pdf`, `tam-giua.pdf`, `tam-phai.pdf` | Bản in (vector, ảnh ≥ 200 dpi), kích thước thật 60×120, 120×150, 60×120 cm. Nền trắng nên không cần xén bleed |
| `pptx/poster_tam-trai.pptx`, `poster_tam-giua.pptx`, `poster_tam-phai.pptx` | PowerPoint chỉnh sửa được, tỉ lệ 1:2 (30×60, 60×75, 30×60 cm, chữ chia đôi); mỗi mục ①–⑨, dải tên dự án, chân trang là một nhóm (group), bấm đúp để sửa chữ |
| `pptx/poster_tung-khoi.pptx` | 10 slide, mỗi khối một slide (tên dự án, ①–⑨), tiện sửa từng phần |
| `xem_truoc/ba-tam-ghep.png` | Ảnh xem nhanh bố cục ba tấm |
| `so_lieu_poster.md` | Sổ số liệu (con số, vị trí trong báo cáo), danh sách hình, kịch bản 1 phút, 10 câu hỏi, rà soát |

In từ PPTX: đặt in phóng 200 %. Font là Roboto; máy in hoặc máy mở file nên cài Roboto (miễn phí) để chữ không bị đổi font.
Biểu đồ, sơ đồ trong PPTX là ảnh PNG; muốn sửa số, sửa script rồi dựng lại (bên dưới).

## Dựng lại
```
python -X utf8 ve_bieu_do.py      # 5 biểu đồ từ dữ liệu thật
python -X utf8 ve_asset.py        # sơ đồ lây lan, ô vuông khảo sát, ma trận thí nghiệm, pin, bảng điểm, sơ đồ kho
python -X utf8 dung_poster.py     # HTML + PDF 3 tấm + kiểm tra tràn, đếm chữ (cần Chrome)
python -X utf8 xuat_pptx.py       # PPTX (cần python-pptx)
```
`dung_poster.py` được ghép từ `_head.txt` (CSS) và `_body.txt` (nội dung); sửa hai file đó rồi ghép lại: `python -X utf8 -c "open('dung_poster.py','w',encoding='utf8').write(open('_head.txt',encoding='utf8').read()+open('_body.txt',encoding='utf8').read())"`.

Ảnh 3D (`assets/node_3d.png`, `hub_3d.png`, `node_hero.png`) dựng bằng Remotion/three.js từ mã sẵn có trong `socratic-video/src/freshnose/` (thêm thư mục `poster/` mới, không sửa file cũ):
`cd socratic-video && npx remotion still src/freshnose/poster/index.tsx PosterNode out.png --frame=0 --gl=angle` (hoặc `PosterHub`, `PosterNodeHero`).

## Bản v2 (08/11/2026, màu và chất lượng in)
- Bảng màu FreshNose: xanh lá #0E6B47, xanh dương #1C66C2, hổ phách #F2A31B, đỏ #D9452B; nền mint #E4F2E9, mỗi khối là thẻ trắng có dải tiêu đề chuyển màu.
- Thêm 3 ô số thật ở dải tên (87,5 %; 6,2 %; 26,3 giờ), ảnh kho 3D dựng bằng Remotion (`assets/kho_*.png`, composition `PosterKho`) ở khối ⑦ và ⑨, biểu đồ đổi sang màu xanh lá.
- Tổng chữ nay 791 từ (chưa tính chữ trong hình); sát trần 800.
- PPTX: dải tiêu đề chuyển màu được thay bằng xanh lá đặc, nền mint toàn tấm và các hình xéo trang trí không có trong PPTX (chỉ có trong PDF).
- In: PDF là RGB (không có Ghostscript trên máy này). Nhờ nhà in chuyển CMYK; xanh dương #1C66C2 và hổ phách có thể xỉn nhẹ. Chưa làm bản có bleed 5 mm và dấu cắt: xin nhà in thông số xén rồi mở rộng nền mint thêm 5 mm mỗi cạnh.
