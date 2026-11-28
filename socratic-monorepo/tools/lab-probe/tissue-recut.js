// Máy dò /lab?bai=soft-tissue (bản dev, cổng 3001): rạch cùng một đường thẳng nhiều nhát bằng chuột thật, sau mỗi nhát in độ sâu
// từng cột dọc đường rạch và các cột bên (k ± 1, ± 2) bị cắt nhầm. Nhát rạch lại phải làm rãnh sâu thêm, không lan sang cột bên.
// Chạy: node tools/lab-probe/tissue-recut.js [số nhát = 4] [z rạch = 0.06]
const {chromium} = require('playwright');
const PASSES = +(process.argv[2] || 4);
const Z = +(process.argv[3] || 0.06);
(async () => {
  const b = await chromium.launch({args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://localhost:3001/lab?bai=soft-tissue', {timeout: 180000});
  await p.waitForFunction(() => window.__tissueBody && window.__stage, null, {timeout: 120000});
  await p.waitForTimeout(2500);
  const scr = (x, y, z) => p.evaluate(([x, y, z]) => { const {camera} = window.__stage; const v = new camera.position.constructor(x, y, z).project(camera); const c = document.querySelector('[data-testid=scene-3d] canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; }, [x, y, z]);
  const depth = () => p.evaluate(() => {
    const T = window.__tissueBody; const {nx, nz} = T.spec;
    const top = []; for (let k = 0; k < nz; k++) { const row = []; for (let i = 0; i < nx; i++) row.push(T.topRow(i, k)); top.push(row); }
    return top;
  });
  const t0 = await depth();
  const {nz} = await p.evaluate(() => window.__tissueBody.spec);
  const kLine = Math.floor((Z / 2 + 0.5) * nz);
  const H = 0.64;
  for (let pass = 1; pass <= PASSES; pass++) {
    const a = await scr(-0.8, H, Z);
    const c = await scr(0.8, H, Z);
    await p.mouse.move(...a, {steps: 3});
    await p.mouse.down();
    await p.mouse.move(...c, {steps: 40});
    await p.mouse.up();
    await p.waitForTimeout(1200);
    const t = await depth();
    const show = (k) => t[k].map((v, i) => (v === t0[k][i] ? '.' : String(v))).join('');
    console.log(`nhát ${pass}: k=${kLine - 1} ${show(kLine - 1)} | k=${kLine} ${show(kLine)} | k=${kLine + 1} ${show(kLine + 1)} | k=${kLine + 2} ${show(kLine + 2)}`);
    if (pass === PASSES) await p.screenshot({path: '/tmp/claude-0/sp/tissue-recut.png'});
  }
  console.log('errors', errs.length, errs.slice(0, 2).join(' | '));
  await b.close();
})();
