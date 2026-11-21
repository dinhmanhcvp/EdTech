# Nguồn và giấy phép của `zanat-organs.glb`

Tệp này là **sản phẩm dẫn xuất** (cắt, đặt lại vị trí, giảm lưới, tô màu, đổ bóng ướt) từ:

- **Z-Anatomy — The libre 3D atlas of anatomy**, CC BY-SA 4.0 — https://github.com/Z-Anatomy/Models-of-human-anatomy
- mô hình gốc **BodyParts3D, © The Database Center for Life Science (DBCLS)**, CC BY-SA 2.1 Japan — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

Theo điều kiện chia sẻ tương tự (ShareAlike), `zanat-organs.glb` và các mô hình xuất từ nó
(`heart.glb` phần `heart_ext_*`, `board-parts4.glb` phần `res_*`, `dig_*`, `eye_*`, `ear_ossicles`, `dissect-parts.glb` phần `HUMAN_o_*`)
được phát hành theo **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/). Khi phân phối phải ghi nguồn như trên.

Không dùng phần có giấy phép cấm thương mại trong Z-Anatomy: thận ("Kidney – Lissie Cowley, CC-BY-NC 4.0") và tai trong
("Anatomy of the Inner Ear – University of Dundee, CC-BY-NC-SA 4.0"); các bộ phận đó vẫn dùng hình tự dựng.

Tạo lại: `tools/lab-models/zanat_extract.py` (trên `Startup.blend` của Z-Anatomy, chạy với `--disable-autoexec`) → `tools/lab-models/zanat_build.py`.
