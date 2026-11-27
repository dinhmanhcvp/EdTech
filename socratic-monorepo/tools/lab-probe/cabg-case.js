// Máy dò /lab (bản dev, cổng 3001): chạy trọn ca bắc cầu động mạch vành của bài heart-surgery (tới đóng ngực) bằng chuột thật; in từng bước và lỗi. Ảnh lưu ở /tmp/claude-0/sp (sửa đường dẫn nếu cần).
// chạy trọn ca bắc cầu: bước dụng cụ bằng chuột thật trên tim, bước của kíp bằng nút ở bảng điều khiển
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1280, height: 800}});
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  console.log('start'); await p.goto('http://localhost:3001/lab?bai=heart-surgery', {timeout: 180000}); console.log('goto ok');
  await p.waitForFunction(() => window.__cabgScene && window.__surgery, null, {timeout: 120000});
  await p.waitForTimeout(1500); console.log('scene ok');
  const st = () => p.evaluate(() => { const c = window.__surgery.cabg; return {tool: c.tool, warn: c.warn, errors: c.errors, stitches: c.stitches, rhythm: c.rhythm, act: Math.round(c.act)}; });
  const scr = (name, idx) => p.evaluate(([name, idx]) => { const S = window.__cabgScene; const v = (idx !== undefined ? S.stitchPts[idx] : S.T[name]).clone(); v.project(S.cam); const c = document.querySelector('[data-testid=scene-3d] canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; }, [name, idx]);
  const tool = (t) => p.evaluate((t) => window.__surgery.cabgDispatch({t: 'tool', tool: t}), t);
  const click = async (xy) => { await p.mouse.move(...xy, {steps: 4}); await p.waitForTimeout(150); await p.mouse.down(); await p.waitForTimeout(120); await p.mouse.up(); await p.waitForTimeout(400); };
  await p.getByText('Mở bảng điều khiển').click({timeout: 15000}); await p.waitForTimeout(800); console.log('panel ok');
  const btn = async (id) => { await p.click(`[data-testid=${id}]`); await p.waitForTimeout(400); };
  const log = [];
  for (let k = 0; k < 60; k++) {
    const s = await p.evaluate(() => document.querySelector('[data-testid=cabg-status]')?.getAttribute('data-step') ?? 'NOPANEL'); console.log('step', s);
    if (s === 'done') break;
    if (s === 'brief') for (let i = 0; i < 5; i++) await btn(`cabg-brief-${i}`);
    else if (s === 'heparin') { await btn('cabg-heparin'); await p.waitForTimeout(6000); }
    else if (s === 'pumpOn') await btn('cabg-pumpOn');
    else if (s === 'defib') await btn('cabg-shock');
    else if (s === 'wean') await btn('cabg-wean');
    else if (s === 'protamine') await btn('cabg-protamine');
    else if (s === 'flow') await btn('cabg-flow');
    else if (s === 'count') await btn('cabg-count');
    else if (s === 'skin') { await tool('needle'); const n = await p.evaluate(() => window.__surgery.cabg.skinStitches); if (n === 0) { await p.waitForTimeout(2500); await p.screenshot({path: '/tmp/claude-0/sp/cabg-closed.png'}); } const xy = await p.evaluate((i) => { const S = window.__cabgScene; const v = S.skinPts[i].clone(); v.project(S.cam); const c = document.querySelector('[data-testid=scene-3d] canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; }, n); await click(xy); }
    else if (s === 'deair') { await tool('cannula'); const xy = await scr('root'); await p.mouse.move(...xy, {steps: 4}); await p.mouse.down(); await p.waitForTimeout(1200); await p.screenshot({path: '/tmp/claude-0/sp/cabg-deair.png'}); await p.waitForFunction(() => window.__surgery.cabg.air === 0, null, {timeout: 25000}).catch(() => {}); await p.mouse.up(); }
    else if (s === 'signout') for (let i = 0; i < 4; i++) await btn(`cabg-signout-${i}`);
    else if (s === 'drains') { await tool('cannula'); const n = await p.evaluate(() => window.__surgery.cabg.drains); await click(await scr(n ? 'drainM' : 'drainP')); }
    else if (s === 'pacing') { await tool('needle'); await click(await scr('pace')); }
    else if (s === 'wires') { await tool('needle'); const n = await p.evaluate(() => window.__surgery.cabg.wireTaps); if (n === 0) await p.screenshot({path: '/tmp/claude-0/sp/cabg-predrain.png'}); const xy = await p.evaluate((i) => { const S = window.__cabgScene; const v = S.wirePts[i].clone(); v.project(S.cam); const c = document.querySelector('[data-testid=scene-3d] canvas').getBoundingClientRect(); return [c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]; }, n); await click(xy); }
    else if (s === 'cannAo' || s === 'decanAo') { await tool('cannula'); await click(await scr('ao')); }
    else if (s === 'cannRa' || s === 'decanRa') { await tool('cannula'); await click(await scr('ra')); }
    else if (s === 'xclamp' || s === 'unclamp') { await tool('clamp'); await click(await scr('clamp')); }
    else if (s === 'plegia') { await tool('cannula'); const xy = await scr('root'); await p.mouse.move(...xy, {steps: 4}); await p.mouse.down(); await p.waitForFunction(() => window.__surgery.cabg.rhythm === 'arrest', null, {timeout: 25000}).catch(() => {}); await p.mouse.up(); await p.screenshot({path: '/tmp/claude-0/sp/cabg-arrest.png'}); }
    else if (s === 'arteriotomy') { await tool('scalpel'); await p.waitForTimeout(3000); const a = await p.evaluate(() => { const S = window.__cabgScene; const out = []; for (const f of [-0.6, 0.6]) { const v = S.T.lad.clone().addScaledVector(S.T.u, 0.07 * f / 0.5); v.project(S.cam); const c = document.querySelector('[data-testid=scene-3d] canvas').getBoundingClientRect(); out.push([c.left + (v.x + 1) / 2 * c.width, c.top + (1 - v.y) / 2 * c.height]); } return out; }); await p.mouse.move(...a[0], {steps: 4}); await p.mouse.down(); await p.mouse.move(...a[1], {steps: 20}); await p.waitForTimeout(300); await p.mouse.up(); await p.waitForTimeout(300); }
    else if (s === 'anast') { await tool('needle'); const n = (await st()).stitches; if (!n) await p.waitForTimeout(1500); await click(await scr(null, n)); if (n === 3) await p.screenshot({path: '/tmp/claude-0/sp/cabg-anast.png'}); }
    const after = await p.evaluate(() => document.querySelector('[data-testid=cabg-status]').getAttribute('data-step'));
    const x = await st();
    console.log(`${s} → ${after}${x.warn ? ' ⚠ ' + x.warn : ''}`);
    if (s === 'pumpOn' && after !== s) await p.screenshot({path: '/tmp/claude-0/sp/cabg-pump.png'});
    if (s === 'unclamp' && after !== s) await p.screenshot({path: '/tmp/claude-0/sp/cabg-vf.png'});
  }
  console.log(log.join('\n'));
  console.log('FINAL', JSON.stringify(await st()), await p.evaluate(() => document.querySelector('[data-testid=cabg-debrief]')?.textContent));
  await p.screenshot({path: '/tmp/claude-0/sp/cabg-done.png'});
  console.log('errs', errs.slice(0, 3)); await b.close();
})();
