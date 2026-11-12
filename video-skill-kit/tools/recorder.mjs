// Bộ ghi hình app thật bằng Chrome DevTools screencast, xuất MP4 30 fps.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export const FF = 'C:/Users/Admin/AppData/Local/Programs/Python/Python312/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = (key, label, unit, defaultValue, min, max, step) => ({key, label, unit, defaultValue, min, max, step});
const chemBp = JSON.parse(fs.readFileSync(new URL('./ink-blueprints.json', import.meta.url), 'utf8')).SCENE_2_CHEMISTRY;
// Thanh trượt + câu hỏi Socratic đúng chủ đề cho từng mô phỏng (backend demo trả tham số chung chung).
export const BP_PATCH = {
  PHYS_PROJECTILE: {
    latex: String.raw`v_0 = 24\text{ m/s}, \quad \alpha = 45^\circ`,
    params: [P('v0', 'Vận tốc đầu (v₀)', 'm/s', 24, 5, 50, 1), P('alpha', 'Góc ném (α)', 'độ', 45, 15, 85, 5), P('g', 'Gia tốc g', 'm/s²', 9.8, 1.6, 25, 0.1)],
    question: 'Tại sao với cùng vận tốc đầu v₀, góc ném 45° lại cho tầm xa cực đại trên mặt đất bằng phẳng?',
  },
  PHYS_RLC_PHASOR: {
    latex: String.raw`Z = \sqrt{R^2 + (Z_L - Z_C)^2}`,
    params: [P('R', 'Điện trở (R)', 'Ω', 50, 10, 200, 10), P('L', 'Độ tự cảm (L)', 'H', 0.5, 0.1, 2, 0.1), P('C', 'Điện dung (C)', 'μF', 50, 10, 200, 10), P('omega', 'Tần số góc (ω)', 'rad/s', 200, 50, 500, 10), P('U', 'Điện áp (U)', 'V', 120, 20, 240, 10)],
    question: 'Khi điều chỉnh tần số góc ω tiến dần về giá trị cộng hưởng ω₀ = 1/√(LC), góc lệch pha φ giữa u và i biến đổi thế nào và vì sao công suất mạch đạt cực đại?',
  },
  CHEM_REACTION_LAB: {
    latex: String.raw`N_2 + 3H_2 \rightleftharpoons 2NH_3 \quad (\Delta H < 0)`,
    params: chemBp.parameters,
    question: chemBp.socraticQuestion,
  },
  BIO_DNA_HELIX: {
    latex: String.raw`\text{ADN: } A = T, \; G \equiv X`,
    params: [P('helicaseProgress', 'Tiến trình Helicase tách mạch', '%', 40, 0, 100, 5), P('temperature', 'Nhiệt độ (T)', '°C', 25, 0, 60, 5)],
    question: 'Enzyme Helicase tách hai mạch ADN bằng cách phá vỡ loại liên kết nào, và vì sao cặp G≡X cần nhiều năng lượng hơn cặp A=T?',
  },
};
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const CURSOR = `(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div');
    c.id = '__cur';
    c.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none';
    c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.7-7.6L21 10.7z" fill="#18181B" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const ring = document.createElement('div');
    ring.id = '__ring';
    ring.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #2563EB;z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.4)';
    document.documentElement.appendChild(ring);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { ring.animate([{opacity: .9, transform: 'scale(.4)'}, {opacity: 0, transform: 'scale(1.5)'}], {duration: 450, easing: 'ease-out'}); }, true);
  };
  if (document.readyState !== 'loading') mk(); else addEventListener('DOMContentLoaded', mk);
  new MutationObserver(mk).observe(document, {childList: true});
})();`;

export async function record(name, outDir, script, opts = {}) {
  const {w = 1920, h = 1080, dsf = 1.5, url = 'http://localhost:3001', settle = 2500, quality = 88} = opts;
  fs.mkdirSync(outDir, {recursive: true});
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: {width: w, height: h, deviceScaleFactor: dsf},
    args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(CURSOR);
  // Không đọc/ghi nét viết thu sẵn trên ổ đĩa của người dùng: dùng bộ nét mẫu mặc định của app.
  await page.setRequestInterception(true);
  page.on('request', async (r) => {
    const u = r.url();
    if (u.includes('/api/v1/canvas/user-ink')) {
      return r.respond({status: 200, contentType: 'application/json', body: r.method() === 'GET' ? '{}' : '{"ok":true}'});
    }
    if (u.includes('/api/v1/canvas/compile-lasso') && r.method() === 'POST') {
      try {
        const resp = await fetch('http://127.0.0.1:8000/api/v1/canvas/compile-lasso', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: r.postData()});
        const j = await resp.json();
        const pt = BP_PATCH[j.simulation_blueprint?.templateId];
        if (pt) {
          j.ocr_result.recognized_latex = pt.latex;
          j.simulation_blueprint.recognizedLatex = pt.latex;
          j.simulation_blueprint.parameters = pt.params;
          j.simulation_blueprint.socraticQuestion = pt.question;
        }
        return r.respond({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(j)});
      } catch {
        return r.continue();
      }
    }
    return r.continue();
  });
  page.on('pageerror', (e) => console.log('PAGEERR', String(e.message).slice(0, 100)));
  await page.goto(url, {waitUntil: 'networkidle2', timeout: 90000});
  await sleep(settle);

  let mx = w / 2;
  let my = h / 2;
  await page.mouse.move(mx, my);
  const marks = [];
  const cams = [];
  const callouts = [];
  const api = {
    page,
    sleep,
    // Gắn nhãn chỉ vào một phần tử giao diện (toạ độ chuẩn hóa theo khung hình chưa zoom).
    async callout(label, sel, {dx = 170, dy = -110, dur = 3.2, color = '#2563EB'} = {}) {
      const el = await page.waitForSelector(sel, {visible: true, timeout: 15000});
      const b = await el.boundingBox();
      callouts.push({t: Date.now() / 1000, dur, label, cx: +((b.x + b.width / 2) / w).toFixed(4), cy: +((b.y + b.height / 2) / h).toFixed(4), dx, dy, color});
    },
    mark(name) { marks.push({name, t: Date.now() / 1000}); },
    async glide(x, y, ms = 600) {
      const x0 = mx;
      const y0 = my;
      const t0 = Date.now();
      for (;;) {
        const k = Math.min(1, (Date.now() - t0) / ms);
        const e = ease(k);
        await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
        if (k >= 1) break;
        await sleep(8);
      }
      mx = x;
      my = y;
    },
    async center(sel) {
      const el = await page.waitForSelector(sel, {visible: true, timeout: 15000});
      await el.evaluate((n) => n.scrollIntoView({block: 'nearest'}));
      const b = await el.boundingBox();
      return {x: b.x + b.width / 2, y: b.y + b.height / 2, box: b};
    },
    async click(sel, ms = 650) {
      const c = await api.center(sel);
      await api.glide(c.x, c.y, ms);
      await sleep(120);
      await page.mouse.down();
      await sleep(70);
      await page.mouse.up();
    },
    async dragSlider(sel, to, ms = 1400) {
      const el = await page.waitForSelector(sel, {visible: true, timeout: 15000});
      const info = await el.evaluate((n) => ({min: +n.min, max: +n.max, v: +n.value}));
      const b = await el.boundingBox();
      const pos = (v) => b.x + 9 + ((v - info.min) / (info.max - info.min)) * (b.width - 18);
      const y = b.y + b.height / 2;
      await api.glide(pos(info.v), y, 500);
      await page.mouse.down();
      await sleep(60);
      await api.glide(pos(to), y, ms);
      await page.mouse.up();
    },
    // Ghi keyframe camera (Remotion sẽ dựng chuyển động): s = 1 là toàn cảnh.
    async zoom(sel, s = 1.8, ms = 1000, dy = 0) {
      let cx = 0.5;
      let cy = 0.5;
      if (sel && s > 1) {
        const el = await page.waitForSelector(sel, {visible: true, timeout: 15000});
        const r = await el.boundingBox();
        cx = (r.x + r.width / 2) / w;
        cy = (r.y + r.height / 2 + dy) / h;
      }
      cams.push({t: Date.now() / 1000, ms, cx: +cx.toFixed(4), cy: +cy.toFixed(4), s});
      await sleep(ms + 80);
    },
    // Camera theo toạ độ điểm ảnh của khung hình (không cần selector).
    async zoomPoint(x, y, scale = 2, ms = 800) {
      cams.push({t: Date.now() / 1000, ms, cx: +(x / w).toFixed(4), cy: +(y / h).toFixed(4), s: scale});
      await sleep(ms + 60);
    },
    async scrollBy(px, ms = 700) {
      await page.evaluate((px) => { const els = [document.scrollingElement, ...document.querySelectorAll('div')].filter((e) => e && e.scrollHeight > e.clientHeight + 40); const t = els.find((e) => e.clientHeight > 500) || els[0]; t && t.scrollBy({top: px, behavior: 'smooth'}); }, px);
      await sleep(ms);
    },
    // Viết tay thật bằng chuột: phát lại một dòng nét mẫu của app lên canvas bảng.
    async ink(sceneId, line, {scale = 1.9, ox = 150, oy = 150, total = 3.2, onRect} = {}) {
      const scenes = JSON.parse(fs.readFileSync(new URL('./ink-scenes.json', import.meta.url), 'utf8'));
      const sc = scenes.find((x) => x.id === sceneId);
      const cy = (st) => st.points.reduce((n, p) => n + p.y, 0) / st.points.length;
      const strokes = sc.strokes.filter((st) => (line === 1 ? cy(st) < 164 : cy(st) >= 164));
      const box = await (await page.$('[data-testid="chalkboard-canvas"]')).boundingBox();
      const xs = strokes.flatMap((st) => st.points.map((p) => p.x));
      const ys = strokes.flatMap((st) => st.points.map((p) => p.y));
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      const toScr = (p) => ({x: box.x + ((p.x - x0) * scale + ox) * (box.width / 1200), y: box.y + ((p.y - y0) * scale + oy) * (box.height / 675)});
      const rectOut = {x0: box.x + ox * (box.width / 1200), y0: box.y + oy * (box.height / 675), w: (Math.max(...xs) - x0) * scale * (box.width / 1200), h: (Math.max(...ys) - y0) * scale * (box.height / 675)};
      if (onRect) await onRect(rectOut, box);
      const perStroke = (total * 1000) / strokes.length;
      for (const st of strokes) {
        const pts = st.points.map(toScr);
        await api.glide(pts[0].x, pts[0].y, 45);
        await page.mouse.down();
        const t0 = Date.now();
        const segs = pts.length - 1;
        for (let i = 1; i <= segs; i++) {
          const a0 = pts[i - 1];
          const a1 = pts[i];
          const steps = 3;
          for (let k = 1; k <= steps; k++) {
            await page.mouse.move(a0.x + ((a1.x - a0.x) * k) / steps, a0.y + ((a1.y - a0.y) * k) / steps);
            await sleep(Math.max(3, (perStroke * 0.62) / (segs * steps)));
          }
        }
        await page.mouse.up();
        mx = pts[pts.length - 1].x;
        my = pts[pts.length - 1].y;
        const rest = perStroke - (Date.now() - t0);
        if (rest > 0) await sleep(rest * 0.5);
      }
      return rectOut;
    },
    // Viết tay "người thật": phát lại nét sinh bởi tools/handwriting.py theo đúng nhịp bút từng điểm
    // (nhanh giữa nét, chậm ở chỗ gấp, nhấc bút giữa các nét). Mỗi nét ghi mốc 'stroke' để lồng tiếng bút.
    async inkHand(id, {capPx = 44, ox = 150, oy = 190, speed = 1.3, onRect} = {}) {
      const d = JSON.parse(fs.readFileSync(new URL('./hand-ink.json', import.meta.url), 'utf8'))[id];
      const box = await (await page.$('[data-testid="chalkboard-canvas"]')).boundingBox();
      const kx = box.width / 1200;
      const ky = box.height / 675;
      const toScr = (p) => ({x: box.x + ox * kx + p[0] * capPx, y: box.y + oy * ky + p[1] * capPx});
      const rectOut = {x0: box.x + ox * kx, y0: box.y + oy * ky, w: d.w * capPx, h: d.h * capPx};
      if (onRect) await onRect(rectOut, box);
      const first = toScr(d.strokes[0][0]);
      await api.glide(first.x, first.y, 260);
      const t0 = Date.now();
      const at = (ms) => t0 + ms / speed;
      for (const st of d.strokes) {
        const p0 = toScr(st[0]);
        // di bút tới đầu nét trong lúc nhấc bút
        const wait = at(st[0][2]) - Date.now();
        await api.glide(p0.x, p0.y, Math.max(16, wait - 4));
        await page.mouse.down();
        api.mark('stroke');
        // mỗi lần di chuột tốn vài ms qua CDP: nhảy tới điểm mới nhất đã tới hạn để giữ đúng nhịp bút
        let i = 1;
        while (i < st.length) {
          const w = at(st[i][2]) - Date.now();
          if (w > 2) await sleep(w);
          while (i < st.length - 1 && at(st[i + 1][2]) <= Date.now()) i++;
          const p = toScr(st[i]);
          await page.mouse.move(p.x, p.y);
          i++;
        }
        await page.mouse.up();
        mx = toScr(st[st.length - 1]).x;
        my = toScr(st[st.length - 1]).y;
      }
      return rectOut;
    },
    // Khoanh Magic Lasso quanh vùng chữ vừa viết (hình elip nhiều điểm).
    async lasso(r, ms = 1100, pad = 36) {
      const cx = r.x0 + r.w / 2;
      const cy = r.y0 + r.h / 2;
      const rx = r.w / 2 + pad + 30;
      const ry = r.h / 2 + pad;
      // vòng tay người: không tròn đều, bắt đầu lệch góc, vẽ quá điểm đầu một đoạn, tăng tốc giữa vòng
      const N = 90;
      const a0 = -2.6;
      const sweep = Math.PI * 2 * 1.12;
      const pt = (u) => {
        const th = a0 - sweep * u;
        const k = 1 + 0.06 * Math.sin(2 * th + 0.7) + 0.03 * Math.sin(3 * th + 2.1) + 0.05 * u;
        return {x: cx + rx * k * Math.cos(th), y: cy + ry * k * Math.sin(th) + 6 * u};
      };
      const s = pt(0);
      await api.glide(s.x, s.y, 380);
      await page.mouse.down();
      const t0 = Date.now();
      for (let i = 1; i <= N; i++) {
        const u = ease(i / N);
        const p = pt(u);
        await page.mouse.move(p.x, p.y);
        const w = t0 + (ms * i) / N - Date.now();
        if (w > 1) await sleep(w);
      }
      await page.mouse.up();
      const e = pt(1);
      mx = e.x;
      my = e.y;
    },
    async typeHint(text, delay = 22) {
      await api.click('[data-testid="lasso-formula-input"]', 520);
      await page.keyboard.type(text, {delay});
    },
    async clickText(text, ms = 650, scope = 'button') {
      const h = await page.evaluateHandle(([text, scope]) => [...document.querySelectorAll(scope)].find((e) => e.offsetParent !== null && (e.innerText || '').includes(text)), [text, scope]);
      const el = h.asElement();
      if (!el) throw new Error('không thấy: ' + text);
      await el.evaluate((n) => n.scrollIntoView({block: 'nearest'}));
      const b = await el.boundingBox();
      await api.glide(b.x + b.width / 2, b.y + b.height / 2, ms);
      await sleep(120);
      await page.mouse.down();
      await sleep(70);
      await page.mouse.up();
    },
    async blur() {
      await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    },
    async scrollTop(ms = 600) {
      await page.evaluate(() => document.querySelectorAll('div').forEach((d) => { if (d.scrollTop > 0) d.scrollTo({top: 0, behavior: 'smooth'}); }));
      await sleep(ms);
    },
    async scrollInto(sel, block = 'center', ms = 700) {
      await page.evaluate(([sel, block]) => document.querySelector(sel)?.scrollIntoView({block, behavior: 'smooth'}), [sel, block]);
      await sleep(ms);
    },
  };

  const frames = [];
  const cdp = await page.createCDPSession();
  cdp.on('Page.screencastFrame', async (ev) => {
    frames.push({ts: ev.metadata.timestamp, data: ev.data});
    try {
      await cdp.send('Page.screencastFrameAck', {sessionId: ev.sessionId});
    } catch {}
  });
  await cdp.send('Page.startScreencast', {format: 'jpeg', quality, everyNthFrame: 1, maxWidth: w * dsf, maxHeight: h * dsf});
  await sleep(300);
  try {
    await script(api);
  } finally {
    await sleep(400);
    await cdp.send('Page.stopScreencast');
    await browser.close();
  }

  const fdir = path.join(outDir, `${name}_frames_${Date.now()}`);
  fs.mkdirSync(fdir, {recursive: true});
  const lines = [];
  frames.forEach((f, i) => {
    const file = path.join(fdir, `f${String(i).padStart(5, '0')}.jpg`).replace(/\\/g, '/');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    const dur = i < frames.length - 1 ? Math.max(0.001, frames[i + 1].ts - f.ts) : 0.4;
    lines.push(`file '${file}'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file '${path.join(fdir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`).replace(/\\/g, '/')}'`);
  const list = path.join(outDir, `${name}.txt`);
  fs.writeFileSync(list, lines.join('\n'));
  const outFile = path.join(outDir, `${name}.mp4`);
  const r = spawnSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', outFile], {encoding: 'utf8'});
  if (r.status !== 0) console.log(r.stderr.slice(-600));
  const t0 = frames[0]?.ts ?? 0;
  fs.writeFileSync(path.join(outDir, `${name}.marks.json`), JSON.stringify({marks: marks.map((m) => ({name: m.name, t: +(m.t - t0).toFixed(2)})), cams: cams.map((c) => ({...c, t: +(c.t - t0).toFixed(2)})), callouts: callouts.map((c) => ({...c, t: +(c.t - t0).toFixed(2)})), duration: +((frames[frames.length - 1]?.ts ?? t0) - t0 + 0.4).toFixed(2)}, null, 1));
  const span = frames.length > 1 ? frames[frames.length - 1].ts - frames[0].ts : 0;
  console.log(`${name}: ${frames.length} khung, ${span.toFixed(1)}s thực tế, ~${(frames.length / Math.max(span, 0.1)).toFixed(1)} khung/giây -> ${outFile}`);
  try { fs.rmSync(fdir, {recursive: true, force: true}); } catch {}
  return outFile;
}
