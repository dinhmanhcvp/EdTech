// Máy dò /lab (chỉ bản dev, cần `npm run dev` cổng 3001 và Playwright): kéo thử bằng chuột thật trọn các bước CHUẨN BỊ của bài thực hành SGK.
// Dùng: node tools/lab-probe/bench-setup.js PHYS_LAB_HOOKE BIO_LAB_ENZYME …  → in PASS/FAIL từng bước; ảnh chụp ở thư mục PROBE_OUT (mặc định thư mục hiện tại).
// Dựa vào móc dev `window.__bench` (stageOf, setup, grabPt, cam, root) của HandsBench3D.tsx.
const {chromium} = require('playwright');
const ids = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !/api|500|Failed to load resource|404/.test(m.text()) && errs.push(m.text()));
  const info = () => p.evaluate(() => {
    const B = window.__bench; const V = B.cam.position.constructor;
    const scr = (v) => { const w = v.clone(); B.root.localToWorld(w); w.project(B.cam); const c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + (w.x + 1) / 2 * c.width, c.top + (1 - w.y) / 2 * c.height]; };
    const st = B.stageOf(); const s = B.setup[st];
    if (!s) return {st, done: true, n: B.setup.length};
    const a = s.act; const g = a && a.kind !== 'press' ? B.grabPt() : null;
    return {st, n: B.setup.length, label: s.label, kind: a ? a.kind : 'blob', k: a && a.n, from: g ? scr(g) : null, to: scr(new V(...s.at))};
  });
  let bad = 0;
  for (const id of ids) {
    errs.length = 0;
    await p.goto(`http://localhost:3001/lab?bai=${id}`, {timeout: 180000});
    try { await p.waitForFunction(() => window.__bench && window.__bench.A.for >= 0, null, {timeout: 120000}); } catch { console.log(id, 'LOAD TIMEOUT'); bad++; continue; }
    await p.waitForTimeout(600);
    const out = [];
    let ok = true;
    for (let k = 0; k < 8; k++) {
      const i = await info();
      if (i.done) break;
      const m = p.mouse;
      if (i.kind === 'press') { await m.move(...i.to); await m.down(); await p.waitForTimeout(80); await m.up(); }
      else if (!i.from) { out.push(`[${i.st}] ${i.label}: không có vật`); ok = false; break; }
      else if (i.kind === 'squeeze') { await m.move(...i.from); for (let t = 0; t < (i.k || 5) + 1; t++) { await m.down(); await p.waitForTimeout(120); await m.up(); await p.waitForTimeout(120); } }
      else {
        await m.move(...i.from); await p.waitForTimeout(120); await m.down(); await p.waitForTimeout(120);
        if (i.kind === 'pour') { await m.move(...i.to, {steps: 15}); for (let w = 0; w < 30 && (await p.evaluate(() => window.__bench.A.prog)) < 1 && (await p.evaluate(() => window.__bench.stageOf())) === i.st; w++) await p.waitForTimeout(500); }
        else if (i.kind === 'stir' || i.kind === 'turn') { await m.move(...i.to, {steps: 10}); for (let t = 0; t <= ((i.k || 3) + 1) * 24; t++) { const a = t / 24 * 2 * Math.PI; await m.move(i.to[0] + 45 * Math.cos(a), i.to[1] + 22 * Math.sin(a)); await p.waitForTimeout(16); } }
        else { await m.move(...i.to, {steps: 15}); }
        await p.waitForTimeout(150); await m.up();
      }
      await p.waitForTimeout(600);
      const j = await info();
      const pass = j.st > i.st;
      out.push(`[${i.st}] ${i.kind} "${i.label}" ${pass ? 'OK' : 'FAIL'}`);
      if (!pass) { ok = false; break; }
    }
    await p.waitForTimeout(400);
    await p.screenshot({path: `${process.env.PROBE_OUT || '.'}/done-${id}.png`});
    if (!ok || errs.length) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} :: ${out.join(' | ')}${errs.length ? ' ERR ' + errs.slice(0, 2).join(' ; ') : ''}`);
  }
  console.log('BAD', bad);
  await b.close();
})();
