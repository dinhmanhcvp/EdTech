# Huong Dan Trien Khai He Thong Ban Final Doc Lap Tren Bang Tuong Tac Thong Minh

Tai lieu nay huong dan quy trinh tich hop he thong chay truc tiep tren phan cung cua bang tuong tac thong minh ma khong can laptop hay day cap ngoai cam vao.

---

## 1. Ban Chat Phan Cung Cua Bang Tuong Tac Thong Minh

Cac dong bang tuong tac thong minh tren thi truong nhu MAXHUB, ViewSonic, Horion, Samsung Flip hay Hikvision duoc thiet ke theo 2 kien truc phan cung chinh:

1. **Bang co mo-dun may tinh OPS tich hop:**
   - Day la dang pho bien nhat o cac phong hoc hien nay.
   - Phia sau hoac ben hong bang co mot khe cam chua mot may tinh Mini PC chay he dieu hanh Windows 10 hoac Windows 11 chuyen dung.
   - Man hinh cam ung 86 inch chinh la man hinh truc tiep cua chiec may tinh Windows nay, ket noi thang voi khung cam ung hong ngoai qua mach noi bo.
   - Khi tich hop ban Final, toan bo he thong se duoc cai dat va chay truc tiep tren may tinh OPS nay.

2. **Bang chay he dieu hanh Android goc:**
   - Bang co chip xu ly chay Android va trinh duyet Chromium tich hop san.
   - Truong hop nay, he thong duoc dat tren mot may chu mini cua lop hoc hoac dong goi PWA chay toan man hinh truc tiep tren trinh duyet cua bang.

---

## 2. Quy Trinh Cai Dat Ban Final Tren May Tinh OPS Windows - Khong Can Ban Phim

Tren man hinh cam ung, ban hoan toan khong can ban phim vat ly hay go to hop phim Windows va R. Quy trinh nhu sau:

### Buoc 1: Chep thu muc du an vao bang
- Cam the nho USB vao cong USB o mat truoc cua bang.
- Dung dau ngon tay hoac but cam ung cham keo thu muc du an vao o dia D hoac o dia C tren bang.

### Buoc 2: Cai dat 1-cham tu dong bang file cai dat
- Trong thu muc du an tren bang, cham dup tay vao file: `cai-dat-khoi-dong-1-cham.bat`.
- File nay se tu dong:
  1. Tao bieu tuong loi tat Shortcut ngoai man hinh Desktop mang ten: `BANG_THONG_MINH_STEM` de khoi dong.
  2. Tao bieu tuong `TAT_HE_THONG_BANG` de dong sach may chu ngam khi can tra lai tai nguyen cho bang.
  3. Tu dong dang ky vao thu muc khoi dong cua Windows ma khong can go bat ky lenh nao.
- He thong khoi dong duoi dang Ung dung doc lap App Window: Co san nut Thu nho `-`, Phong to `🗖` va Dong `✕` o goc tren ben phai man hinh, hoan toan khong khoa cung man hinh Kiosk.

### Buoc 3: Chuyen ve tac vu goc cua bang va PowerPoint bat cu luc nao
- Tren thanh dieu khien tren cung cua bang co 2 nut cham dac biet:
  1. Nut `Toan man hinh / Thu nho`: Cham de chuyen doi linh hoat giua che do chiem tron man hinh va che do cua so.
  2. Nut `Ve tac vu goc`: Cham vao la man hinh lap tuc thu nho, hien thi thanh tac vu Windows phia duoi de thay co mo PowerPoint, trinh chieu PDF hay bang viet mac dinh cua truong.
- Khi day hoc xong: Thay co chi can cham vao dau `✕` goc tren hoac cham vao bieu tuong `TAT_HE_THONG_BANG` ngoai Desktop de tat sach toan bo dich vu.


---

## 3. Quy Trinh Chay Tren Bang Chay He Dieu Hanh Android

Nhieu dong bang tuong tac nhu ViewSonic, MAXHUB, Promethean khi bat len se vao giao dien Android goc. Ban co 2 truong hop:

### Truong hop A: Bang co 2 he dieu hanh - Android song song Windows OPS
- Cac dong bang cao cap luon co san ca 2 he dieu hanh.
- Giao dien ban dau hien thi Android, nhung o mep ben trai hoac mep ben phai man hinh co mot thanh Menu dieu khien noi.
- Thay co cham vao bieu tuong Nguon tin hieu Source hoac bieu tuong co chu `OPS` / `PC`.
- Ngay lap tuc, bang se chuyen thang sang man hinh Windows 10 hoac Windows 11 cua may tinh tich hop, va ap dung quy trinh 1-cham o Muc 2.

### Truong hop B: Bang thuan Android - Khong co module Windows
- Bang Android khong chay file bat hay Python truc tiep, nhung bang Android nao cung co san trinh duyet web Google Chrome hoac Chromium.
- Cach su dung nhanh nhat khong can mang day:
  1. May tinh xach tay cua ban chay san file `run-smartboard-standalone.bat` va bat chuc nang Phat Wi-Fi Mobile Hotspot.
  2. Tren bang Android: Vao Cai dat Wi-Fi ket noi vao mang Wi-Fi cua may tinh xach tay.
  3. Mo trinh duyet Chrome tren bang Android, go dia chi IP cua may tinh, vi du: `http://192.168.137.1:3001`.
  4. Tao bieu tuong 1-cham tren Android:
     - Tren trinh duyet Chrome cua bang, cham vao bieu tuong Menu ba cham o goc tren ben phai.
     - Chon dong: `Them vao man hinh chinh` hoac `Cai dat ung dung`.
     - Ngay lap tuc ngoai man hinh chinh Android cua bang se xuat hien bieu tuong App rieng biet.
  5. Khi giang day: Thay co chi can cham 1 lan vao bieu tuong tren man hinh chinh Android, ung dung se mo toan man hinh Kiosk, net but cam ung 20 diem cham va AI Vision hoat dong hoan hao 100%.

---

## 4. Kiem Thu Thuc Te Tren Mat Bang 86 Inch

Khi he thong da mo toan man hinh tren bang:

- **Cam but viet hoac ngon tay viet cong thuc:**
  Khung cam ung hong ngoai cua bang se nhan dien net ve truc tiep tren mat kinh.
- **Khoanh vung nhan dien bang cong cu Lasso:**
  Khoanh tron cong thuc bang ngon tay hoac but, bam Nut Truc quan hoa.
- **Di chuyen Hologram khap mat bang:**
  Dat ngon tay vao bat cu vi tri nao tren do thi de day truot do thi sang goc khac cua bang mot cach muot ma.
- **Keo thanh truot thong so truc quan:**
  Cham ngon tay vao thanh truot tham so de quan sat do thi bien doi 60 khung hinh tren giay.
- **Hoc sinh ket noi tu xa:**
  Hoc sinh trong lop su dung dien thoai ket noi vao mang Wi-Fi cua phong hoc va quet ma QR hien thi tren bang de nhan ban ghi bai giang dong bo tu bục giang.

