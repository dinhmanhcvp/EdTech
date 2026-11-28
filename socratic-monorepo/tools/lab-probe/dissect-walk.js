// Máy dò /lab (bản dev, cổng 3001): đi trọn từng bài mổ dissect-* qua window.__dissect.dispatch, chụp ảnh sau mỗi bước
// (và giữa lúc lật vạt) để xem bằng mắt; in lỗi trang và cảnh báo. Ảnh lưu ở /tmp/claude-0/sp/dis (sửa đường dẫn nếu cần).
// Chạy: node tools/lab-probe/dissect-walk.js [dissect-frog dissect-heart ...]
const {chromium} = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/sp/dis';
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['dissect-frog', 'dissect-heart', 'dissect-fish', 'dissect-flower', 'dissect-human'];
(async () => {
  const b = await chromium.launch({args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist']});
  for (const id of IDS) {
    const p = await b.newPage({viewport: {width: 1280, height: 800}});
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(`http://localhost:3001/lab?bai=${id}`, {timeout: 180000});
    await p.waitForFunction(() => window.__dissect, null, {timeout: 120000});
    await p.waitForTimeout(2500);
    const shot = (n) => p.screenshot({path: `${OUT}/${id}-${n}.png`});
    await shot('00-start');
    const steps = await p.evaluate(() => window.__dissect.spec.steps.map((s) => ({kind: s.kind, flaps: s.flaps, targets: s.targets?.length, organs: s.organs, tool: s.tool})));
    const D = (a) => p.evaluate((a) => window.__dissect.dispatch(a), a);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const tool = s.kind === 'pin' ? 'pin' : s.kind === 'cut' ? s.tool : s.kind === 'open' ? 'forceps' : s.kind === 'drop' ? 'dropper' : null;
      await D({t: 'tool', tool});
      if (s.kind === 'pin') for (let k = 0; k < s.targets; k++) { await D({t: 'pin', i: k}); await p.waitForTimeout(150); }
      else if (s.kind === 'cut') for (let v = 0.1; v <= 1.001; v += 0.1) { await D({t: 'cut', s: Math.min(1, v)}); await p.waitForTimeout(60); }
      else if (s.kind === 'open') {
        for (const f of s.flaps) {
          for (let v = 0.1; v <= 1.001; v += 0.1) {
            await D({t: 'open', flap: f, v: Math.min(1, v)});
            await p.waitForTimeout(60);
            if (Math.abs(v - 0.5) < 0.01) { await p.waitForTimeout(400); await shot(`${String(i + 1).padStart(2, '0')}-${f}-half`); }
          }
        }
      } else if (s.kind === 'drop') await D({t: 'drop'});
      else if (s.kind === 'name') for (const o of s.organs) { await D({t: 'name', organ: o}); await p.waitForTimeout(80); }
      await p.waitForTimeout(900);
      const st = await p.evaluate(() => ({warn: window.__dissect.st.warn}));
      console.log(id, i + 1, s.kind, st.warn ? 'WARN ' + st.warn : 'ok');
      await shot(`${String(i + 1).padStart(2, '0')}-${s.kind}`);
    }
    console.log(id, 'errors', errs.length, errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
})();
