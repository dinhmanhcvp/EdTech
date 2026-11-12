---
name: product-demo-screencast
description: Làm video demo sản phẩm từ chính ứng dụng thật - tự động quay màn hình bằng Puppeteer/CDP có con trỏ và vệt click, ghi lại mốc hành động và keyframe zoom, rồi dựng bằng Remotion (camera "thở" zoom-in/zoom-out, Metric Pill kỹ thuật, âm thanh xúc giác tự tổng hợp). Dùng khi có app web chạy được và muốn video giới thiệu/dự thi trông như sản phẩm triệu đô, không giống slide.
---

# Product demo screencast (app thật → video điện ảnh)

Rút từ dự án Socratic Vision Board. Nguyên tắc: **quay app thật bằng script (lặp lại được, 60 FPS), không dựng hình giả**; camera, nhãn kỹ thuật, âm thanh và phụ đề làm ở hậu kỳ trong Remotion để chỉnh sửa không phải quay lại.

## 1. Bốn nguyên tắc video EdTech/product hàng đầu
1. **8 giây đầu = cú "wow"**, không chào hỏi, không đọc tên nhóm. Giây ~3 phải là khoảnh khắc tính năng chính biến hình (vd khoanh công thức → mô phỏng 60 FPS). Tên tác giả để dạng lower-third nhỏ sau đó, lời cảm ơn ở cuối.
2. **Metric Pill** ở góc dưới trái: thẻ mono tối bo tròn, có chấm trạng thái + nhãn (PIPELINE / ENGINE / VERIFIER...) + thông số (`60 FPS • $0.00 API Cost`), đổi theo hành động, trượt/mờ mượt. Giám khảo kỹ thuật đọc được chiều sâu mà người nói không phải đọc số khô khan.
3. **Camera thở:** zoom ~1.5-1.8x khi khoanh vùng, kéo thanh trượt, chiếc cân nghiêng, hộp cảnh báo; lùi 1.0x khi cần thấy bố cục tổng thể. Đừng để zoom quá lâu một chỗ.
4. **Âm thanh xúc giác:** phấn viết sột soạt, whoosh trầm khi khoanh, click cơ học khi bấm, ding khi xác minh, thud khi chặn, chime khi thưởng; thêm nhạc ambient rất nhỏ. Video câm mất ~50% sức hút.

## 2. Quay màn hình bằng code (đã chạy ổn trên Windows)
- `puppeteer-core` + Chrome cài sẵn (`C:\Program Files\Google\Chrome\Application\chrome.exe`), `headless: 'new'`, viewport 1920x1080.
- Ghi bằng CDP `Page.startScreencast` (jpeg quality ~88, ack từng frame), lưu timestamp từng frame, ghép bằng ffmpeg concat với `duration` theo hiệu timestamp rồi `fps=30` → được ~45-60 khung/giây thật (mượt hơn `puppeteer-screen-recorder`). Nếu thư mục khung hình tạm không xóa được (EPERM) thì bỏ qua lỗi.
- **Con trỏ giả + vòng click:** `evaluateOnNewDocument` chèn SVG mũi tên và vòng tròn lan tỏa; di chuyển chuột bằng easing (`glide`), không "teleport". Thanh trượt: kéo từ vị trí hiện tại tới đích trong 1.5-2.5 s.
- `a.mark('click'|'whoosh'|...)` ghi mốc thời gian tương đối với frame đầu → dùng để đặt SFX chính xác.
- `a.zoom(selector, scale, ms)` **không** phóng to trong trang (CSS transform làm vỡ bố cục); chỉ ghi keyframe camera `{t, ms, cx, cy, s}` (tâm chuẩn hóa 0-1) vào JSON. Remotion dựng camera từ JSON.
- Chặn các request lưu/đọc dữ liệu của người dùng (vd nét viết thu sẵn) bằng `setRequestInterception` để cảnh demo luôn chạy bằng dữ liệu mẫu mặc định và không làm hỏng dữ liệu thật.
- Dùng sẵn các nút "director/demo trigger" của app (nếu có) thay vì mô phỏng thao tác phức tạp; liệt kê `data-testid` bằng một script thăm dò trước.
- Khóa selector theo `data-testid`; nút theo chữ dùng `clickText`.
- Quay mỗi hồi một clip riêng 20-45 s (dừng đủ lâu để người xem đọc), tránh một clip dài.

## 3. Dựng trong Remotion
- Dữ liệu một chỗ (`plan.ts`): danh sách hồi → các đoạn `{clip, from, rate}`, thời gian giữ khung cuối, lời thuyết minh, sự kiện Metric Pill, ánh xạ mốc → SFX. Từ đó tính tổng thời lượng và tốc độ đọc (ký tự/giây) bằng script kiểm tra (`esbuild` bundle plan vì JSON import cần bundler).
- `CamVideo`: `OffthreadVideo` (muted, `playbackRate`) bọc trong div `transform: translate scale`, tâm lấy từ keyframe có easing in-out; kẹp biên để không lộ nền. Dịch tâm xuống ~7% khi zoom để thanh trượt không bị phụ đề che. Giữ khung cuối bằng `<Freeze>`.
- Tăng tốc đoạn chờ bằng `playbackRate` 1.3-1.7 (mượt, không giật); làm chậm 0.8-0.85 nơi cần đọc.
- Phụ đề kiểu phim (không hộp, bóng chữ, lớp tối mờ dưới đáy), chia câu theo dấu chấm/phẩy, thời lượng tỉ lệ theo số ký tự; xuất `SCRIPT.md` để người dùng thu giọng. Nền sáng của app → Metric Pill/nhãn chương/author tag dùng nền tối bo tròn để tương phản.
- Thẻ số liệu và thẻ kết dùng đúng nền và phông của sản phẩm (vd giấy #F8F7F4) để liền mạch với footage.
- Âm thanh tự tổng hợp bằng Python (numpy + wave → ffmpeg mp3): chalk (nhiễu băng cao có rung), whoosh (nhiễu quét lowpass), click, ding, thud, warn, shimmer, blip, chime, pad ambient Am-F-C-G. `<Audio>` trong `<Sequence>` tại `actStart + mốc`.

## 3b. Nâng cấp "hợp lý + thu hút" (bài học vòng 2)

**Logic chủ đề (lỗi hay gặp nhất):** mỗi mô phỏng phải đi ngay sau **chính công thức/nội dung nó dựng ra**. Đừng dùng nút "kịch bản mẫu" của app nếu nó trộn nhiều chủ đề vào một cảnh (vd cảnh Vật lý trộn RLC + ném xiên). Thay vào đó quay đúng luồng thật của người dùng, **mỗi chủ đề một clip**: viết tay công thức → khoanh vùng → gõ gợi ý → bấm Trực quan hóa → mô phỏng cùng chủ đề → kéo thanh trượt của chính mô phỏng đó.
- **Viết tay bằng chuột thật:** phát lại các nét mẫu (lấy từ file preset của app, tách theo dòng bằng tọa độ y của tâm nét) lên canvas bảng, phóng to 2x, chọn mực màu thương hiệu, nét đậm; khoanh lasso bằng elip nhiều điểm. Đo thời gian thật: chuột tự động chậm (viết ~5-7 s, gõ ~3 s) → tăng tốc khi dựng bằng **speed ramp theo mốc** (`inkEnd`, `lassoEnd`, `typeEnd`): viết 2.6x, gõ 3x, khoanh 1.7x, phần mô phỏng giữ ~1.3x.
- **Camera bám đúng chữ:** thanh công cụ (lasso) hiện ra làm bảng dịch xuống → ghi lại tọa độ vùng chữ trước khi viết và **zoom lại sau khi bố cục dịch** (`zoomPoint`). Kết thúc cảnh mở màn khi camera đã lùi hẳn ra toàn cảnh.
- **Backend demo trả tham số chung chung:** nếu thanh trượt hiển thị sai chủ đề (A, ω, φ...), chặn response `compile-lasso` bằng `setRequestInterception`, gọi backend thật rồi **thay `parameters`, `recognizedLatex`, `socraticQuestion`** bằng bộ đúng chủ đề lấy từ chính mã app. Viết chuỗi LaTeX bằng `String.raw` (nếu không `\t`, `\a`, `\q`... bị hiểu thành ký tự điều khiển).
- **Backend có thể khớp sai theo luật từ khóa** (vd "alpha" chứa "ph" bị xếp thành chuẩn độ pH): gõ gợi ý đúng chủ đề (dùng "Ném xiên", "Mạch RLC", "ADN"...) và kiểm tra bằng `curl` trước khi quay; báo lỗi này cho người dùng.

**Ngôn ngữ dựng "app thật + motion graphics":**
- Nền tối điện ảnh (aurora + hạt) làm sân khấu; **app là cửa sổ nổi** (bo góc, đổ bóng, nghiêng 3D ~-4°) bay vào bằng bố cục `hero → split → full`; **cột trái**: nhãn lĩnh vực, tiêu đề chữ động to co dần từ giữa màn hình vào cột (kích thước tự tính theo dòng dài nhất), số liệu lớn, chip tính năng.
- **Camera zoom nằm *bên trong* cửa sổ** (keyframe đã ghi) nên viền cửa sổ giữ nguyên; có thể mở rộng cửa sổ ra toàn màn hình ở khoảnh khắc "wow".
- **Callout bám phần tử:** ghi `{t, dur, label, cx, cy, dx, dy, color}` khi quay (tâm phần tử chuẩn hóa), khi dựng tính vị trí qua đúng camera + vị trí cửa sổ; lật nhãn sang trái khi sát mép phải.
- Chuyển cảnh có chuyển động (`slide`, `wipe`, `iris` với `springTiming`) thay vì mờ dần; thẻ thương hiệu có hiệu ứng "vấn đề bị gạch bỏ → logo bật ra + tia sáng quét".
- Thẻ số liệu: số đếm lên, vòng tiến độ, thẻ kính sáng; thẻ kết cùng nền tối.
- Mỗi cảnh một `Scene` trong `plan.ts`: `segs` (tốc độ), `lead` (chờ cửa sổ bay vào), `layout`, `side`, `hud`, `voice`, `transition`; `withHold` tự làm chậm đoạn cuối cho vừa nhịp lời đọc thay vì đóng băng khung hình.

## 4. Trung thực nội dung (quan trọng khi dự thi)
- Chỉ nói/hiển thị tính năng **thực sự có trong footage hoặc mã**. Kịch bản người dùng có thể nhắc tính năng chưa có (vd Comet/Ghost Trail, Dual-View, 12 ms): đối chiếu với repo, dùng số của báo cáo kiểm thử, ghi "mục tiêu thiết kế" cho số chưa đo.
- Nếu tính năng nằm ở app khác trong monorepo (vd app học sinh), chạy app đó và quay từ đó thay vì giả lập.
- Máy không có giọng tiếng Việt: để người dùng tự thu giọng theo `SCRIPT.md` (khuyên thu giọng trước, rồi chỉnh nhịp nếu cần).

## 4b. Giọng đọc AI (ElevenLabs) ghép vào video Remotion

Mẫu đã chạy trong dự án Socratic Vision Board (`tools/tts.mjs`, `src/demo2/voice.ts`, `VoiceTrack.tsx`):
- **Khóa API**: người dùng tự đặt vào `.env` (đã `.gitignore`) hoặc biến môi trường; không yêu cầu dán vào chat, không in ra. Không có khóa thì chỉ chuẩn bị đường ống rồi dừng lại.
- **Một nguồn lời**: lời hiển thị (phụ đề) giữ nguyên; lời gửi TTS qua bảng chuẩn hóa phát âm tiếng Việt (thuật ngữ, ký hiệu, chữ viết tắt: `AI`→"ây ai", `THPT`→"trung học phổ thông", `ω`→"ô-mê-ga", số→chữ). Xem lời đã chuẩn hóa bằng `tts.mjs text` (không tốn credit).
- **Endpoint `with-timestamps`** trả `alignment` theo ký tự → ánh xạ về từng cụm phụ đề (`voiceParts`), lưu `voice.json` = `{cảnh: {file, dur, caps:[[bắt đầu, kết thúc, chữ]]}}`. `previous_text`/`next_text` giữ ngữ điệu liền mạch giữa các cảnh. Cache theo băm (văn bản+giọng+mô hình+cài đặt) để chạy lại chỉ tốn credit cho cảnh đã đổi.
- **Độ dài cảnh theo giọng thật**: `sceneDur = VOICE_AT + dur + VOICE_TAIL` (có `voice.json`) thay cho ước lượng ký tự/giây; footage tự làm chậm đoạn cuối (tối thiểu 0,75x) hoặc giữ khung thay vì cắt lời.
- **Chọn giọng**: `voices` liệt kê giọng tài khoản + thư viện tiếng Việt (`/v1/shared-voices?language=vi`; giọng thư viện cần gói trả phí khi gọi API, lỗi 402 thì dùng giọng có sẵn); `sample` tạo mẫu; kiểm độ rõ lời bằng whisper (`asr_check.py`, CER thấp = rõ). **Lời đọc xưng "tôi" + tên tác giả thì giọng phải khớp tác giả: hỏi người dùng, đừng suy giới tính từ tên.**
- Kiểm thử đường ống bằng máy chủ giả lập cục bộ (đặt `ELEVENLABS_API_BASE`) trước khi dùng khóa thật, rồi **dọn dữ liệu giả** (`voice.json` về `{}`, xóa `public/voice`).
- Trộn âm: nhạc nền hạ ≤0.2 dưới giọng; SFX vừa phải; sau render chuẩn hóa `loudnorm=I=-16`.

## 5. Checklist
- [ ] Giây 2-3 đã có khoảnh khắc "wow"; không có màn chào hỏi mở đầu
- [ ] Mỗi hồi có Metric Pill phù hợp và camera vào/ra ít nhất một lần
- [ ] SFX khớp hành động (mark), âm lượng không át giọng sẽ thu sau (nhạc ≤ 0.16)
- [ ] Số liệu có nguồn; tính năng nói ra đều thấy trong footage
- [ ] MP4 `yuv420p`, 1080p, `+faststart`; xem lại khung hình từ file cuối
