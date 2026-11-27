// Máy dò /lab (bản dev, cổng 3001): làm các việc CHUẨN BỊ theo thứ tự NGƯỢC để kiểm chứng thao tác tự do như phòng thật.
// Việc có ràng buộc vật lí (BENCH_AFTER) làm trước việc nó cần thì phải bị chặn kèm lời nhắc; sau đó làm nốt. Cuối cùng thử bước LÀM thí nghiệm.
// Dùng: node tools/lab-probe/bench-free.js PHYS_LAB_HOOKE BIO_LAB_PLASMOLYSIS …
const {chromium} = require('playwright');
const ids = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !/api|500|Failed to load resource|404/.test(m.text()) && errs.push(m.text()));
  const info = (j) => p.evaluate((j) => {
    const B = window.__bench; const c = document.querySelector('canvas').getBoundingClientRect();
    const toScr = (w) => { const v = w.clone().project(B.cam); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; };
    const s = B.setup[j]; const a = s.act; const g = B.grip(j); const at = B.root.localToWorld(new B.cam.position.constructor(...s.at));
    return {label: s.label, kind: a ? a.kind : 'blob', k: a && a.n, from: g ? toScr(g) : null, to: toScr(at), done: B.doneOf(), dep: B.after[j]};
  }, j);
  let bad = 0;
  for (const id of ids) {
    errs.length = 0;
    await p.goto(`http://localhost:3001/lab?bai=${id}`, {timeout: 180000});
    try { await p.waitForFunction(() => window.__bench && window.__bench.grip && window.__bench.setup.every((_, j) => window.__bench.grip(j)) && (window.__bench.setup.length || performance.now() > 15000), null, {timeout: 120000}); } catch { console.log(id, 'LOAD TIMEOUT'); bad++; continue; }
    await p.waitForTimeout(600);
    const n = await p.evaluate(() => window.__bench.setup.length);
    const out = [];
    let ok = true;
    const m = p.mouse;
    const act = async (i) => {
      if (i.kind === 'press') { await m.move(...i.to); await m.down(); await p.waitForTimeout(80); await m.up(); return; }
      if (i.kind === 'squeeze') { await m.move(...i.from); for (let t = 0; t < (i.k || 5) + 1; t++) { await m.down(); await p.waitForTimeout(120); await m.up(); await p.waitForTimeout(120); } return; }
      await m.move(...i.from); await p.waitForTimeout(120); await m.down(); await p.waitForTimeout(120);
      if (i.kind === 'pour') { await m.move(...i.to, {steps: 15}); for (let w = 0; w < 120 && (await p.evaluate(() => window.__bench.A.prog)) < 1; w++) await p.waitForTimeout(500); // máy ảo vài khung/giây: rót 2,2 s mô phỏng mất tới cả phút }
      else if (i.kind === 'stir' || i.kind === 'turn') { await m.move(...i.to, {steps: 10}); for (let t = 0; t <= ((i.k || 3) + 1) * 24; t++) { const a = t / 24 * 2 * Math.PI; await m.move(i.to[0] + 45 * Math.cos(a), i.to[1] + 22 * Math.sin(a)); await p.waitForTimeout(16); } }
      else await m.move(...i.to, {steps: 15});
      await p.waitForTimeout(150); await m.up();
    };
    const order = [...Array(n).keys()].reverse();
    const blockedSeen = [];
    for (let pass = 0; pass < 2 && ok; pass++)
      for (const j of order) {
        const i = await info(j);
        if (i.done[j]) continue;
        const depOpen = i.dep !== undefined && !i.done[i.dep];
        if (depOpen) {
          // ràng buộc vật lí: chụm vào vật phải bị chặn và có lời nhắc
          await m.move(...(i.from || i.to)); await m.down(); await p.waitForTimeout(100); await m.up(); await p.waitForTimeout(300);
          const w = await p.evaluate(() => window.__bench.warnOf());
          const still = !(await info(j)).done[j];
          blockedSeen.push(j);
          out.push(`[${j}] chặn ${w && still ? 'OK' : 'FAIL'}`);
          if (!(w && still)) ok = false;
          continue;
        }
        if (!i.from && i.kind !== 'press') { out.push(`[${j}] không có vật`); ok = false; break; }
        await act(i);
        await p.waitForTimeout(600);
        const pass1 = (await info(j)).done[j];
        out.push(`[${j}] ${i.kind} "${i.label}" ${pass1 ? 'OK' : 'FAIL'}`);
        if (!pass1) { ok = false; break; }
      }
    if (ok) {
      const L = await p.evaluate(() => {
        const B = window.__bench; if (!B.lev) return null; const l = B.lev(); if (!l.on) return {off: true};
        const c = document.querySelector('canvas').getBoundingClientRect();
        const scr = (w) => { const v = w.clone().project(B.cam); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; };
        return {kind: l.kind, from: scr(l.grip), to: scr(l.end), done: l.done};
      });
      if (L && !L.off) {
        await m.move(...L.from); await p.waitForTimeout(120); await m.down(); await p.waitForTimeout(150);
        if (L.kind !== 'watch') await m.move(...L.to, {steps: 20});
        await p.waitForTimeout(300); await m.up(); await p.waitForTimeout(600);
        const done = await p.evaluate(() => window.__bench.lev().done);
        out.push(`[làm] ${L.kind} ${done > L.done ? 'OK' : 'FAIL'}`);
        if (!(done > L.done)) ok = false;
      }
    }
    await p.screenshot({path: `${process.env.PROBE_OUT || '.'}/free-${id}.png`});
    if (!ok || errs.length) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} :: ${out.join(' | ')}${errs.length ? ' ERR ' + errs.slice(0, 2).join(' ; ') : ''}`);
  }
  console.log('BAD', bad);
  await b.close();
})();
