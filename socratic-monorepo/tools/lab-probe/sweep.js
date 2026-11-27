// Máy dò quét TOÀN BỘ /lab (cần `npm run dev` cổng 3001 và Playwright): mở từng bài, kéo chuột vài lần trên khung 3D,
// ghi lỗi trang / console và thời gian JS mỗi khung (tổng thời gian các lệnh gọi requestAnimationFrame).
// Dùng: node tools/lab-probe/sweep.js [mã bài …]   (bỏ trống = mọi bài trong ids.json, tệp do PROBE_IDS chỉ)
// Lưu ý: Chromium phần mềm trên máy ảo — tin số ms JS/khung, đừng tin FPS.
const {chromium} = require('playwright');
const fs = require('fs');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : JSON.parse(fs.readFileSync(process.env.PROBE_IDS || 'ids.json', 'utf8')).map((x) => x[0]);
const OUT = process.env.PROBE_OUT || '.';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1280, height: 800}});
  await p.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__js = [];
    window.__long = 0;
    let frameT = 0, frameAt = -1;
    window.requestAnimationFrame = (cb) => raf((t) => {
      if (t !== frameAt) { if (frameAt >= 0) window.__js.push(frameT); frameAt = t; frameT = 0; }
      const s = performance.now();
      try { cb(t); } finally { frameT += performance.now() - s; }
    });
    try { new PerformanceObserver((l) => { window.__long += l.getEntries().length; }).observe({entryTypes: ['longtask']}); } catch {}
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGE ' + String(e).slice(0, 200)));
  p.on('console', (m) => m.type() === 'error' && !/api|Failed to load resource|404|500|webcam|camera|getUserMedia|NotAllowed|NotFound|mediapipe/i.test(m.text()) && errs.push(m.text().slice(0, 200)));
  const rows = [];
  for (const id of ids) {
    errs.length = 0;
    try {
    const t0 = Date.now();
    try {
      await p.goto(`http://localhost:3001/lab?bai=${id}`, {timeout: 240000});
      await p.waitForSelector('canvas', {timeout: 120000});
    } catch (e) { rows.push({id, load: 'TIMEOUT'}); console.log(id, 'LOAD TIMEOUT'); continue; }
    await p.waitForTimeout(4000);
    const c = await p.$eval('canvas', (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
    await p.evaluate(() => { window.__js.length = 0; window.__long = 0; });
    // kéo bằng sự kiện con trỏ tổng hợp, đo thời gian xử lý JS của từng sự kiện (không phụ thuộc tốc độ vẽ phần mềm của máy ảo)
    const ev = await p.evaluate(([x, y]) => {
      const cv = document.querySelector('canvas');
      const fire = (type, px, py) => {
        const s = performance.now();
        cv.dispatchEvent(new PointerEvent(type, {clientX: px, clientY: py, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true}));
        return performance.now() - s;
      };
      const t = [];
      for (const [dx, dy] of [[-150, 0], [150, 60], [0, -120], [-80, 40]]) {
        t.push(fire('pointerdown', x, y));
        for (let i = 1; i <= 10; i++) t.push(fire('pointermove', x + (dx * i) / 10, y + (dy * i) / 10));
        t.push(fire('pointerup', x + dx, y + dy));
      }
      const s0 = performance.now();
      cv.dispatchEvent(new WheelEvent('wheel', {clientX: x, clientY: y, deltaY: -200, bubbles: true, cancelable: true}));
      t.push(performance.now() - s0);
      t.sort((u, v) => u - v);
      return {evMax: +t[t.length - 1].toFixed(1), evMean: +(t.reduce((u, v) => u + v, 0) / t.length).toFixed(2)};
    }, c);
    await p.waitForTimeout(2500);
    const st = await p.evaluate(() => {
      const a = window.__js.slice().sort((x, y) => x - y);
      const q = (f) => a.length ? +a[Math.min(a.length - 1, Math.floor(f * a.length))].toFixed(1) : null;
      return {n: a.length, mean: a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : null, p95: q(0.95), max: q(1), long: window.__long, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null};
    });
    await p.screenshot({path: `${OUT}/sweep-${id}.png`});
    const row = {id, sec: Math.round((Date.now() - t0) / 1000), ...ev, ...st, errs: [...new Set(errs)].slice(0, 3)};
    rows.push(row);
    console.log(JSON.stringify(row));
    } catch (e) { rows.push({id, crash: String(e).slice(0, 200)}); console.log(id, 'CRASH', String(e).slice(0, 200)); }
  }
  fs.writeFileSync(`${OUT}/sweep.json`, JSON.stringify(rows, null, 1));
  await b.close();
})();
