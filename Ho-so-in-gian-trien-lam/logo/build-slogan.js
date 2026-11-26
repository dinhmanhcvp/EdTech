// Bộ logo + khẩu hiệu Socratic "Learn the why. Own the future." (Tự học bản chất – Làm chủ tương lai), dùng lại cho mọi ấn phẩm.
// Chạy: node logo/build-slogan.js  → logo/slogan/*.pdf (chữ đã chuyển nét, mở được bằng Corel/Illustrator), *.svg, *.png
// Cần: Playwright + Chromium, Ghostscript (gs), pdftocairo.
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'slogan'), TMP = path.join(OUT, '.tmp');
const WM = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/socratic-wordmark.json'), 'utf8'));
// Bảng màu Socratic sáng (dùng chung với build-thi-cong.js)
const P = { navy: '#0E2C86', royal: '#1446D8', blue: '#2F6BFF', sky: '#8FE3FF', skyL: '#CDEEFF', orange: '#FF7A3D', white: '#FFFFFF' };
const BG = `linear-gradient(150deg,${P.royal} 0%,#2563FF 50%,#3D8BFF 100%)`;
const SLOGAN = { en: ['Learn the why.', 'Own the future.'], vi: ['Tự học bản chất.', 'Làm chủ tương lai.'] };

const wm = (h, c) => { const [X0, Y0, VW, VH] = WM.viewBox; return `<svg viewBox="${X0} ${Y0} ${VW} ${VH}" style="height:${h}mm;width:${(h * VW) / VH}mm;display:block"><path d="${WM.letters}" fill="${c.letters}"/><path d="${WM.hook.d}" fill="none" stroke="${c.letters}" stroke-width="${WM.hook.w}" stroke-linecap="round"/><path d="${WM.iris.d}" fill="none" stroke="${c.iris}" stroke-width="${WM.iris.w}" stroke-linecap="round"/><circle cx="${WM.dot.cx}" cy="${WM.dot.cy}" r="${WM.dot.r}" fill="${c.dot}"/></svg>`; };
const line1 = (s, col, t) => `<div style="font:800 ${s}mm/1.02 'Plus Jakarta Sans';letter-spacing:-.02em;color:${col};white-space:nowrap">${t}</div>`;
const line2 = (s, col, t) => `<div style="font:italic 400 ${s * 1.1}mm/1.02 'Newsreader';color:${col};white-space:nowrap">${t}</div>`;
const THEMES = {
  'nen-xanh': { bg: BG, letters: P.white, iris: P.sky, dot: P.orange, l1: P.white, l2: P.skyL, rule: P.sky, tag: P.skyL },
  'nen-trang': { bg: P.white, letters: P.navy, iris: P.blue, dot: P.orange, l1: P.navy, l2: P.blue, rule: P.blue, tag: P.blue },
  'trong-suot-chu-trang': { bg: 'transparent', letters: P.white, iris: P.sky, dot: P.orange, l1: P.white, l2: P.skyL, rule: P.sky, tag: P.skyL },
};
function lockup(kind, th, lang) { const t = THEMES[th], [a, b] = SLOGAN[lang], pad = 36;
  if (kind === 'ngang') return `<div id="L" style="display:inline-flex;align-items:center;gap:34mm;padding:${pad}mm ${pad + 8}mm;background:${t.bg}">${wm(100, t)}<div style="width:2.2mm;align-self:stretch;background:${t.rule};border-radius:1mm"></div><div>${line1(48, t.l1, a)}${line2(48, t.l2, b)}</div></div>`;
  if (kind === 'doc') return `<div id="L" style="display:inline-flex;flex-direction:column;align-items:center;gap:22mm;padding:${pad}mm ${pad + 10}mm;background:${t.bg}">${wm(110, t)}<div style="width:120mm;height:2.2mm;background:${t.rule};border-radius:1mm"></div><div style="text-align:center">${line1(50, t.l1, a)}${line2(50, t.l2, b)}</div></div>`;
  // chỉ khẩu hiệu, 1 dòng
  return `<div id="L" style="display:inline-flex;align-items:baseline;gap:16mm;padding:${pad * 0.6}mm ${pad}mm;background:${t.bg}">${line1(48, t.l1, a)}${line2(48, t.l2, b)}</div>`;
}
(async () => {
  fs.mkdirSync(TMP, { recursive: true }); const br = await chromium.launch(); const page = await br.newPage(); const made = [];
  const jobs = []; for (const kind of ['ngang', 'doc', 'chi-khau-hieu']) for (const th of Object.keys(THEMES)) for (const lang of ['en', 'vi']) { if (lang === 'vi' && th === 'trong-suot-chu-trang' && kind !== 'doc') continue; jobs.push([kind, th, lang]); }
  for (const [kind, th, lang] of jobs) {
    const name = `socratic-${kind === 'chi-khau-hieu' ? 'khau-hieu' : 'logo-khau-hieu-' + kind}-${th}${lang === 'vi' ? '-tieng-viet' : ''}`;
    const hf = path.join(TMP, 'p.html'); fs.writeFileSync(hf, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${ROOT}/fonts/fonts.css"><style>html,body{margin:0;background:transparent}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${lockup(kind, th, lang)}</body></html>`); await page.goto('file://' + hf, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
    const bb = await page.evaluate(() => { const r = document.getElementById('L').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const mm = (px) => ((px * 25.4) / 96).toFixed(2) + 'mm'; const raw = path.join(TMP, name + '.pdf'), pdf = path.join(OUT, name + '.pdf');
    await page.pdf({ path: raw, width: mm(Math.ceil(bb.w)), height: mm(Math.ceil(bb.h)), printBackground: true, omitBackground: th === 'trong-suot-chu-trang', pageRanges: '1' });
    execFileSync('gs', ['-q', '-o', pdf, '-sDEVICE=pdfwrite', '-dNoOutputFonts', '-dCompatibilityLevel=1.5', raw]); // chữ → nét
    execFileSync('pdftocairo', ['-svg', pdf, path.join(OUT, name + '.svg')]);
    execFileSync('pdftocairo', ['-png', '-singlefile', '-r', '200', ...(th === 'trong-suot-chu-trang' ? ['-transp'] : []), pdf, path.join(OUT, name)]);
    made.push(name); }
  await br.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(made.length + ' bộ → logo/slogan'); made.forEach((n) => console.log('  ' + n));
})();
