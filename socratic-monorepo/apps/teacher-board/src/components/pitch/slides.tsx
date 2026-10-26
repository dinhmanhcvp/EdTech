'use client';
// 12 slide AXIOMA (phong cách Framer) cho cuộc thi Ý tưởng sáng tạo:
// Vấn đề → Tính mới → Khả thi kỹ thuật → Tác động → Kinh doanh & nhân rộng.
// Số liệu thí điểm đọc từ PILOT (packages/types/src/pilot2026.json); số dự kiến ghi rõ "dự kiến".
// Ảnh: khung hình thật của app trong public/pitch/*.jpg.
import React from 'react';
import {PILOT, vn} from '@socratic/types';
import {Big, C, Card, Frame, G, GRAD, Head, Mark, MONO, P, Pill, Pin, SANS, Shot, Tex} from './kit';

const {study, scores, parts, ops, feedback} = PILOT;
const quitPct = 100 - ops.persistence.before; // bỏ cuộc trước thí điểm = 100% − tỉ lệ kiên trì
type S = React.FC<{n: number; total: number}>;
const H3: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 36}) => (
  <div style={{fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: -size * 0.035, lineHeight: 1.08, color: C.text}}>{children}</div>
);

// ---------------------------------------------------------------- 01 · Bìa
const Cover: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[50, 78, C.violet], [25, 60, C.blue], [78, 62, C.pink]]}>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
      <Pill color={C.green}>Cuộc thi Ý tưởng sáng tạo · EdTech 2026</Pill>
      <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 200, letterSpacing: -12, lineHeight: 0.9, marginTop: 30}}>Axioma</div>
      <Head center size={50} width={1300} style={{marginTop: 26, fontWeight: 600}} text="Từ nét phấn tĩnh đến *thực tại 60 khung hình/giây.* Từ học vẹt đáp án đến *tự chủ tư duy.*" />
    </div>
    <div style={{position: 'absolute', left: 260, right: 260, bottom: -170}}>
      <Shot src="lasso" w={1200} h={520} fx={0.42} fy={0.43} z={1.5} tilt={22} glow={GRAD} />
    </div>
    <div style={{position: 'absolute', left: 0, bottom: 20, display: 'flex', flexDirection: 'column', gap: 26}}>
      {[[`< ${ops.api.inkMs} ms`, 'mỗi nét viết'], [`${vn(ops.offload.zeroToken)}%`, 'bước giải 0 token']].map(([v, l]) => (
        <div key={l}><div style={{fontSize: 40, fontWeight: 700, letterSpacing: -1.5}}>{v}</div><div style={{fontSize: 17, color: C.faint, marginTop: 2}}>{l}</div></div>
      ))}
    </div>
    <div style={{position: 'absolute', right: 0, bottom: 20, display: 'flex', flexDirection: 'column', gap: 26, textAlign: 'right'}}>
      {[[`${ops.api.costVnd} đ`, 'chi phí AI mỗi tiết'], [`N = ${study.N}`, 'học sinh thí điểm']].map(([v, l]) => (
        <div key={l}><div style={{fontSize: 40, fontWeight: 700, letterSpacing: -1.5}}>{v}</div><div style={{fontSize: 17, color: C.faint, marginTop: 2}}>{l}</div></div>
      ))}
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 02 · Vấn đề
const Problem: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[90, 10, C.pink], [10, 90, C.blue]]}>
    <Pill color={C.pink}>01 · Bài toán thực tiễn</Pill>
    <Head size={78} width={1600} style={{marginTop: 26}} text="Dạy Khoa học tự nhiên đang kẹt giữa *bảng viết tĩnh* và *thói quen chép đáp án.*" />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 500, display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 24}}>
      <Card glow={C.blue}>
        <P size={20} style={{color: C.faint}}>Trên bục giảng</P>
        <Big size={190} style={{marginTop: 70}}>{vn(ops.prepMin.before)}<span style={{fontSize: 56, letterSpacing: -1, color: C.sub}}> phút</span></Big>
        <P style={{position: 'absolute', bottom: 0}}>để tự dựng một mô phỏng động. Màn hình tương tác của trường vì thế chủ yếu dùng để chiếu slide tĩnh.</P>
      </Card>
      <Card glow={C.pink}>
        <P size={20} style={{color: C.faint}}>Khi tự học ở nhà</P>
        <Big size={150} grad="linear-gradient(90deg,#FF4D8D,#FFB547)" style={{marginTop: 90}}>{vn(quitPct)}%</Big>
        <P style={{position: 'absolute', bottom: 0}}>lượt học sinh bỏ cuộc hoặc chép lời giải có sẵn khi gặp bài khó (đo trước thí điểm).</P>
      </Card>
      <Card glow={C.violet}>
        <P size={20} style={{color: C.faint}}>Ứng dụng &quot;bọc&quot; AI tạo ảnh</P>
        <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 60}}>
          {['Chờ nhiều giây mỗi hình', 'Tính tiền theo từng lượt', 'Không bảo đảm đúng vật lý', 'Chatbot giải hộ, học sinh ngừng nghĩ'].map((t) => (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 26, fontWeight: 500, letterSpacing: -0.6}}>
              <span style={{width: 26, height: 26, borderRadius: 13, border: `1.5px solid ${C.pink}`, color: C.pink, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>✕</span>
              {t}
            </div>
          ))}
        </div>
      </Card>
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 03 · Ý tưởng
const Idea: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[25, 85, C.blue], [78, 85, C.violet]]}>
    <Pill>02 · Ý tưởng cốt lõi</Pill>
    <Head size={76} width={1650} style={{marginTop: 26}} text="Một ý tưởng, hai lời giải: *khoanh là thành thí nghiệm*, và *không bao giờ đưa đáp án.*" />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
      {[
        {src: 'phys', fx: 0.6, fy: 0.45, z: 1.1, g: C.blue, k: 'Trên lớp', t: 'Magic Lasso', d: 'Viết tay, khoanh vùng, AI biên dịch một lần thành mô phỏng tương tác.'},
        {src: 'tutor', fx: 0.5, fy: 0.55, z: 1.25, g: C.violet, k: 'Khi tự học', t: 'Ma sát nhận thức', d: 'Gia sư Socratic khóa bước sau và cho thấy vì sao lời giải sai.'},
      ].map((x) => (
        <Card key={x.k} glow={x.g} pad={0}>
          <div style={{padding: '34px 40px 0'}}>
            <Pill color={x.g}>{x.k}</Pill>
            <div style={{marginTop: 22}}><H3 size={46}>{x.t}</H3></div>
            <P style={{marginTop: 10, maxWidth: 700}}>{x.d}</P>
          </div>
          <div style={{position: 'absolute', left: 40, bottom: -60}}>
            <Shot src={x.src} w={820} h={330} fx={x.fx} fy={x.fy} z={x.z} />
          </div>
        </Card>
      ))}
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 04 · Kiến trúc
const Architecture: S = ({n, total}) => {
  const st: [string, string, string][] = [
    ['Cắt vùng', `Chỉ gửi vùng khoanh, ảnh < ${ops.api.cropKB} KB.`, C.blue],
    ['Biên dịch một lần', 'LaTeX, phương án OCR, tham số và câu hỏi Socratic trong một lần gọi.', C.violet],
    ['Dựng tại trình duyệt', 'Mô phỏng tất định 60 khung/giây; kéo thanh trượt không gọi lại AI.', C.pink],
    ['SVG dự phòng', 'Chủ đề ngoài thư viện vẫn có sơ đồ tương tác.', C.amber],
  ];
  return (
    <Frame n={n} total={total} glows={[[60, 70, C.violet], [15, 20, C.blue]]}>
      <Pill color={C.violet}>03 · Kiến trúc lõi</Pill>
      <Head size={76} width={1650} style={{marginTop: 26}} text="AI chỉ *biên dịch một lần.* Trình duyệt dựng phần còn lại với *chi phí tạo hình bằng 0.*" />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 110, height: 400, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24}}>
        {st.map(([t, d, c], i) => (
          <div key={t} style={{position: 'relative', borderRadius: 28, padding: 1.5, background: i === 2 ? GRAD : C.line}}>
            <Card glow={c} style={{height: '100%', border: 'none', borderRadius: 27}}>
              <div style={{width: 64, height: 64, borderRadius: 18, background: `${c}22`, border: `1px solid ${c}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: c}}>{i + 1}</div>
              <div style={{marginTop: 70}}><H3 size={38}>{t}</H3></div>
              <P size={21} style={{marginTop: 14}}>{d}</P>
            </Card>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', gap: 16}}>
        <Pill color={C.blue}>{vn(ops.api.callsPerLesson)} lần gọi AI / tiết</Pill>
        <Pill color={C.green}>&lt; {ops.api.inkMs} ms mỗi nét viết</Pill>
        <Pill color={C.pink}>−{vn(ops.api.reductionPct)}% chi phí API</Pill>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------- 05 · Công thái học
const Ergonomics: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[75, 60, C.blue], [10, 10, C.violet]]}>
    <div style={{display: 'flex', gap: 80, height: '100%'}}>
      <div style={{width: 600, display: 'flex', flexDirection: 'column'}}>
        <Pill color={C.blue}>04 · Công thái học bục giảng</Pill>
        <Head size={68} width={600} style={{marginTop: 26}} text="Không bàn phím trên màn hình 75 inch. *Không đứt mạch bài giảng.*" />
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 'auto'}}>
          {[
            ['1', 'Chạm-đổi ký tự OCR', 'Nhận nhầm α thành a: chạm bong bóng phương án, sửa trong 1 giây.'],
            ['2', 'Thanh trượt neo đáy', 'Tay giáo viên không che mô hình khi kéo.'],
            ['3', 'Vệt ma so sánh', 'Giữ trạng thái trước để cả lớp so sánh.'],
          ].map(([k, t, d]) => (
            <Card key={k} pad={24}>
              <div style={{display: 'flex', gap: 18}}>
                <div style={{width: 40, height: 40, borderRadius: 20, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flex: 'none'}}>{k}</div>
                <div><H3 size={28}>{t}</H3><P size={19} style={{marginTop: 6}}>{d}</P></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div style={{position: 'relative', flex: 1, alignSelf: 'flex-end'}}>
        <Shot src="phys" w={1040} h={790} fx={0.66} fy={0.56} z={1.2} glow={C.blue} />
        <Pin x={791} y={642} n="2" />
        <Pin x={430} y={262} n="3" />
      </div>
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 06 · Bốn môn
const Subjects: S = ({n, total}) => {
  const q = [
    {s: 'Vật lý', src: 'rlc', fx: 0.7, fy: 0.45, tex: String.raw`Z = \sqrt{R^2 + (Z_L - Z_C)^2}`, d: 'Ném xiên · Fresnel RLC · con lắc RK4', c: C.blue},
    {s: 'Hóa học', src: 'chem', fx: 0.66, fy: 0.47, tex: String.raw`k = A\,e^{-E_a/RT}`, d: 'Năng lượng hoạt hóa · xúc tác · benzen 3D', c: C.pink},
    {s: 'Sinh học', src: 'bio', fx: 0.66, fy: 0.56, tex: String.raw`p^2 + 2pq + q^2 = 1`, d: 'ADN tháo xoắn · khí khổng · Hardy–Weinberg', c: C.green},
    {s: 'Toán học', src: '', fx: 0, fy: 0, tex: String.raw`\textstyle\sum_{i=1}^{n} f(x_i^{*})\,\Delta x`, d: 'Tổng Riemann · chuỗi Taylor', c: C.amber},
  ];
  return (
    <Frame n={n} total={total} glows={[[50, 100, C.violet], [10, 30, C.blue]]}>
      <Pill color={C.green}>05 · Bốn môn · THPT &amp; Chuyên</Pill>
      <Head size={76} width={1650} style={{marginTop: 26}} text="Một bảng, *bốn môn.* Mô phỏng và đồ thị giải tích chạy song song." />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22}}>
        {q.map((x) => (
          <Card key={x.s} glow={x.c} pad={0}>
            <div style={{margin: 14}}>
              {x.src ? (
                <Shot src={x.src} w={404} h={330} fx={x.fx} fy={x.fy} z={1.0} radius={18} />
              ) : (
                // Toán: chưa có khung hình quay riêng, hiển thị công thức thay vì mượn ảnh môn khác
                <div style={{width: 404, height: 330, borderRadius: 18, background: '#111114', border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Tex tex={String.raw`\int_a^b f(x)\,dx`} size={64} />
                </div>
              )}
            </div>
            <div style={{padding: '12px 30px 0'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <span style={{width: 10, height: 10, borderRadius: 5, background: x.c, boxShadow: `0 0 14px ${x.c}`}} />
                <H3 size={34}>{x.s}</H3>
              </div>
              <div style={{marginTop: 14}}><Tex tex={x.tex} size={22} color="rgba(255,255,255,0.85)" /></div>
              <P size={18} style={{marginTop: 10, color: C.faint}}>{x.d}</P>
            </div>
          </Card>
        ))}
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------- 07 · Gia sư
const Tutor: S = ({n, total}) => {
  const tiers = [
    {t: 'SymPy · đại số & thứ nguyên', p: ops.offload.sympy, s: `< ${ops.offload.sympyMs} ms · 0 đ`, c: C.blue},
    {t: 'Kho gợi mở ngữ nghĩa', p: ops.offload.cache, s: `< ${ops.offload.cacheMs} ms · 0 đ`, c: C.violet},
    {t: 'LLM có rào chắn', p: ops.offload.llm, s: 'phao cứu sinh sau 3 lần sai', c: C.pink},
  ];
  return (
    <Frame n={n} total={total} glows={[[20, 70, C.blue], [85, 20, C.violet]]}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, height: '100%'}}>
        <Card glow={C.blue} pad={48}>
          <Pill color={C.blue}>06 · Gia sư Socratic</Pill>
          <Head size={56} width={760} style={{marginTop: 26}} text="Phần lớn bước giải được kiểm tra *mà không tốn một token AI nào.*" />
          <div style={{position: 'absolute', bottom: 0}}>
            <Big size={260} grad={GRAD}>{vn(ops.offload.zeroToken)}%</Big>
            <P style={{marginTop: 18}}>bước giải của học sinh xử lý với chi phí 0 đồng</P>
          </div>
        </Card>
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          {tiers.map((x, i) => (
            <Card key={x.t} glow={x.c} style={{flex: 1}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                <div>
                  <div style={{fontFamily: MONO, fontSize: 15, color: C.faint, letterSpacing: 2}}>TẦNG {i + 1}</div>
                  <div style={{marginTop: 8}}><H3 size={32}>{x.t}</H3></div>
                </div>
                <Big size={64} color={x.c}>{vn(x.p)}%</Big>
              </div>
              <div style={{height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginTop: 22}}>
                <div style={{height: 8, borderRadius: 4, width: `${x.p}%`, background: x.c, boxShadow: `0 0 18px ${x.c}`}} />
              </div>
              <P size={18} style={{marginTop: 12, color: C.faint}}>{x.s}</P>
            </Card>
          ))}
          <Card style={{flex: 0.8}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
              <Big size={72}>{ops.guard.blocked}/{ops.guard.total}</Big>
              <P size={21}>lượt xin đáp án bị chặn trong 4 tuần · {vn(ops.guard.pct)}%</P>
            </div>
          </Card>
        </div>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------- 08 · Gỡ lỗi & chốt chặn
const Debugger: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[30, 90, C.pink], [80, 90, C.amber]]}>
    <Pill color={C.amber}>07 · Gỡ lỗi thị giác · Chốt chặn bản chất</Pill>
    <Head size={72} width={1700} style={{marginTop: 26}} text="Học sinh *thấy hệ quả vật lý của lỗi đại số*, rồi phải *vượt bẫy Đúng/Sai* mới hoàn thành." />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
      {[
        {src: 'tutor', fx: 0.31, fy: 0.55, z: 1.3, g: C.pink, k: 'Gỡ lỗi hai chiều', d: 'Quên lực ma sát: vật trượt quá dốc, hệ thống báo lệch thứ nguyên.', tex: String.raw`\textstyle\sum \vec F \neq m\vec a`},
        {src: 'trap', fx: 0.66, fy: 0.62, z: 1.2, g: C.amber, k: 'Chốt chặn bản chất', d: 'Tự giải thích bằng giọng nói, hoặc săn bẫy mệnh đề ở điều kiện biên.', tex: String.raw`\alpha \to 90^\circ,\ \omega \to \infty`},
      ].map((x) => (
        <Card key={x.k} glow={x.g} pad={0}>
          <div style={{padding: '34px 40px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <div><H3 size={42}>{x.k}</H3><P size={21} style={{marginTop: 10, maxWidth: 540}}>{x.d}</P></div>
            <Tex tex={x.tex} size={26} color="rgba(255,255,255,0.85)" />
          </div>
          <div style={{position: 'absolute', left: 40, bottom: -50}}>
            <Shot src={x.src} w={790} h={330} fx={x.fx} fy={x.fy} z={x.z} />
          </div>
        </Card>
      ))}
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 09 · Vòng lặp
const Loop: S = ({n, total}) => {
  const c = [
    {src: 'qr', fx: 0.5, fy: 0.45, z: 1.3, k: 'Cuối tiết', t: 'Vở ghi QR 4,2 KB', d: 'Bài giảng và mô phỏng mở lại trên điện thoại học sinh.', g: C.blue},
    {src: 'heat', fx: 0.3, fy: 0.42, z: 1.2, k: 'Tối hôm đó', t: 'Bản đồ nhiệt điểm nghẽn', d: 'Mỗi lần bí khi tự học dồn về theo khái niệm.', g: C.violet},
    {src: 'heat', fx: 0.66, fy: 0.3, z: 1.2, k: 'Sáng hôm sau', t: 'Một chạm lên bảng', d: 'Đẩy bài khắc phục lên bảng lớp, ghi nhận người vượt khó.', g: C.pink},
  ];
  return (
    <Frame n={n} total={total} glows={[[50, 95, C.violet], [5, 40, C.blue], [95, 40, C.pink]]}>
      <Pill color={C.violet}>08 · Vòng lặp khép kín</Pill>
      <Head size={72} width={1650} style={{marginTop: 26}} text="Dữ liệu đi một vòng *từ bảng lớp về điện thoại học sinh*, rồi *quay lại bảng lớp.*" />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
        {c.map((x, i) => (
          <Card key={x.t} glow={x.g} pad={0}>
            <div style={{margin: 14}}><Shot src={x.src} w={540} h={290} fx={x.fx} fy={x.fy} z={x.z} radius={18} /></div>
            <div style={{padding: '14px 32px 0'}}>
              <div style={{fontFamily: MONO, fontSize: 15, letterSpacing: 2, color: x.g}}>{String(i + 1).padStart(2, '0')} · {x.k.toUpperCase()}</div>
              <div style={{marginTop: 10}}><H3 size={36}>{x.t}</H3></div>
              <P size={20} style={{marginTop: 10}}>{x.d}</P>
            </div>
          </Card>
        ))}
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------- 10 · Thực nghiệm
const Pilot: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[20, 80, C.blue], [80, 10, C.amber]]}>
    <div style={{display: 'grid', gridTemplateColumns: '1.05fr 1fr', gridTemplateRows: '1fr 0.42fr', gap: 24, height: '100%'}}>
      <Card glow={C.blue} pad={48} style={{gridRow: '1 / span 2'}}>
        <Pill color={C.green}>09 · Thực nghiệm đối chứng · {study.weeks} tuần · N = {study.N}</Pill>
        <Head size={54} width={800} style={{marginTop: 26}} text="Sau 4 tuần, nhóm dùng Axioma *vượt nhóm đối chứng gần một điểm.*" />
        <div style={{position: 'absolute', bottom: 0, left: 0, right: 0}}>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 50}}>
            <div>
              <Big size={240} grad={GRAD}>{vn(scores.post.exp.mean, 2)}</Big>
              <P size={20} style={{marginTop: 14}}>Thực nghiệm · {study.n1} học sinh</P>
            </div>
            <div>
              <Big size={110} color="rgba(255,255,255,0.35)">{vn(scores.post.control.mean, 2)}</Big>
              <P size={20} style={{marginTop: 14}}>Đối chứng · {study.n2}</P>
            </div>
          </div>
          <div style={{display: 'flex', gap: 14, marginTop: 34}}>
            <Pill color={C.green}>p = {scores.post.p.replace('.', ',')}</Pill>
            <Pill color={C.violet}>Cohen d = {vn(scores.cohenD, 2)}</Pill>
            <Pill color={C.faint}>trước: {vn(scores.pre.exp.mean, 2)} / {vn(scores.pre.control.mean, 2)}</Pill>
          </div>
        </div>
      </Card>
      <Card glow={C.amber}>
        <P size={19} style={{color: C.faint}}>Tỉ lệ làm đúng theo phần đề GDPT 2018 (điểm phần trăm)</P>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 24}}>
          {parts.map((pt) => {
            const hi = pt.key === 'II';
            return (
              <div key={pt.key}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                  <span style={{fontSize: 21, fontWeight: hi ? 700 : 500, color: hi ? C.text : C.sub}}>{pt.label}</span>
                  <span style={{fontSize: hi ? 44 : 28, fontWeight: 700, letterSpacing: -1, color: hi ? C.amber : C.text}}>+{vn(pt.delta)}</span>
                </div>
                <div style={{position: 'relative', height: 16, marginTop: 8}}>
                  <div style={{position: 'absolute', top: 0, height: 5, width: `${pt.control}%`, background: 'rgba(255,255,255,0.18)', borderRadius: 3}} />
                  <div style={{position: 'absolute', top: 8, height: 8, width: `${pt.exp}%`, background: hi ? C.amber : C.blue, borderRadius: 4, boxShadow: hi ? `0 0 16px ${C.amber}` : 'none'}} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
        <Card><Big size={72}>×{vn(ops.persistence.times)}</Big><P size={19} style={{marginTop: 10}}>kiên trì tự gỡ bí ({vn(ops.persistence.before)}% → {vn(ops.persistence.after)}%)</P></Card>
        <Card><Big size={72}>−{vn(Math.abs(ops.prepMin.pct))}%</Big><P size={19} style={{marginTop: 10}}>thời gian soạn ({vn(ops.prepMin.before)} → {vn(ops.prepMin.after)} phút)</P></Card>
      </div>
    </div>
  </Frame>
);

// ---------------------------------------------------------------- 11 · Kinh tế
const Business: S = ({n, total}) => {
  const rows: [string, string, string, string][] = [
    ['Mô phỏng đúng quy luật, tương tác', 'Có', 'Không', 'Không bảo đảm'],
    ['Dùng màn hình trường đã có', 'Có', 'Có', 'Có'],
    ['Học sinh tự tư duy, không chép', 'Có', '—', 'Không'],
    ['Chi phí AI mỗi tiết', `${ops.api.costVnd} đ`, '0 đ', 'Theo lượt tạo ảnh'],
  ];
  return (
    <Frame n={n} total={total} glows={[[15, 85, C.green], [85, 15, C.blue]]}>
      <div style={{display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gridTemplateRows: '1fr 0.62fr', gap: 24, height: '100%'}}>
        <Card glow={C.green} pad={48} style={{gridRow: '1 / span 2'}}>
          <Pill color={C.green}>10 · Kinh tế &amp; triển khai</Pill>
          <Head size={60} width={680} style={{marginTop: 26}} text="Rẻ đến mức *mọi lớp học đều dùng được.*" />
          <div style={{position: 'absolute', bottom: 0}}>
            <Big size={250} grad="linear-gradient(90deg,#3DDC97,#4DB8FF)">{ops.api.costVnd}<span style={{fontSize: 90, letterSpacing: -2}}>đ</span></Big>
            <P style={{marginTop: 16}}>chi phí AI mỗi tiết (≈ ${vn(ops.api.costUsd, 3)}) · giảm {vn(ops.api.reductionPct)}% chi phí API</P>
          </div>
        </Card>
        <Card pad={0}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 21}}>
            <thead>
              <tr style={{fontSize: 15, letterSpacing: 1.5, color: C.faint, textAlign: 'left'}}>
                <th style={{padding: '26px 30px 16px', fontWeight: 500}} />
                <th style={{padding: '26px 10px 16px', fontWeight: 700}}><G>AXIOMA</G></th>
                <th style={{padding: '26px 10px 16px', fontWeight: 500}}>BẢNG THƯỜNG</th>
                <th style={{padding: '26px 10px 16px', fontWeight: 500}}>APP BỌC AI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} style={{borderTop: `1px solid ${C.line}`}}>
                  {r.map((c, i) => (
                    <td key={i} style={{padding: i === 0 ? '20px 30px' : '20px 10px', color: i === 1 ? C.text : i === 0 ? C.sub : C.faint, fontWeight: i === 1 ? 700 : 400}}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
          <Card glow={C.blue}><Pill color={C.blue}>Giai đoạn 1 · B2B</Pill><div style={{marginTop: 18}}><H3 size={30}>Trường THPT &amp; Sở GD&amp;ĐT</H3></div><P size={19} style={{marginTop: 8}}>Cấp phép theo năm, cài lên màn hình tương tác sẵn có.</P></Card>
          <Card glow={C.violet}><Pill color={C.violet}>Giai đoạn 2 · B2C</Pill><div style={{marginTop: 18}}><H3 size={30}>Gia sư ôn thi tại nhà</H3></div><P size={19} style={{marginTop: 8}}>Mục tiêu biên lợi nhuận gộp trên 85% (dự kiến).</P></Card>
        </div>
      </div>
    </Frame>
  );
};

// ---------------------------------------------------------------- 12 · Tầm nhìn
const Vision: S = ({n, total}) => (
  <Frame n={n} total={total} glows={[[50, 50, C.violet], [20, 80, C.blue], [80, 80, C.pink]]}>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center'}}>
      <Mark size={120} />
      <Head center size={96} width={1600} style={{marginTop: 50}} text="Không để AI suy nghĩ thay thế hệ trẻ. *Dùng AI để đánh thức nhà khoa học trong mỗi học sinh.*" />
      <div style={{display: 'flex', gap: 18, marginTop: 70}}>
        <a href="/" className="pitch-live" style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: '22px 40px', borderRadius: 999, background: '#FFFFFF', color: '#000', fontFamily: SANS, fontSize: 24, fontWeight: 600, textDecoration: 'none'}}>
          Mở trình diễn trực tiếp →
        </a>
        <div style={{display: 'inline-flex', alignItems: 'center', padding: '22px 36px', borderRadius: 999, border: `1px solid ${C.line2}`, background: 'rgba(255,255,255,0.05)', fontSize: 24, fontWeight: 500, color: C.sub}}>
          {study.N} học sinh · {study.weeks} tuần · d = {vn(scores.cohenD, 2)}
        </div>
      </div>
      <P size={22} style={{marginTop: 50, maxWidth: 1200, fontStyle: 'italic', color: C.faint}}>“{feedback[0].quote}” — {feedback[0].who}</P>
    </div>
  </Frame>
);

export const SLIDES: S[] = [Cover, Problem, Idea, Architecture, Ergonomics, Subjects, Tutor, Debugger, Loop, Pilot, Business, Vision];
