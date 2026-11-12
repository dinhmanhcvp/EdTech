// Thăm dò giao diện bảng mới: viết tay → khoanh → gõ gợi ý → trực quan hóa; chụp từng bước và liệt kê phần tử điều khiển.
// node tools/probe7.mjs <thư mục ra> <khóa nét trong hand-ink.json> "<gợi ý>"
import {record, sleep} from './recorder.mjs';
import path from 'node:path';

const [out, hand, hint] = process.argv.slice(2);
await record(`probe_${hand}`, out, async (a) => {
  const {page} = a;
  await page.screenshot({path: path.join(out, `${hand}_0start.png`)});
  const r = await a.inkHand(hand, {speed: 3});
  await page.screenshot({path: path.join(out, `${hand}_1ink.png`)});
  await a.click('[data-testid="tool-lasso"]', 400);
  await a.lasso(r, 600);
  await sleep(600);
  await page.screenshot({path: path.join(out, `${hand}_2lasso.png`)});
  const hasInput = await page.$('[data-testid="lasso-formula-input"]');
  console.log('lasso input:', !!hasInput);
  if (hasInput) await a.typeHint(hint, 8);
  const vis = (await page.$('[data-testid="btn-visualize"]')) ? '[data-testid="btn-visualize"]' : '[data-testid="top-toolbar-btn-visualize"]';
  await a.click(vis, 400);
  await sleep(3000);
  await page.screenshot({path: path.join(out, `${hand}_3sim.png`)});
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid).filter((t) => /slider|holo|dock|sim|engine|param|btn/.test(t)).join(' '));
  console.log('testids:', ids);
  const ranges = await page.evaluate(() => [...document.querySelectorAll('input[type=range]')].map((e) => `${e.getAttribute('data-testid') || '?'}:${e.min}-${e.max}=${e.value}`).join(' '));
  console.log('ranges:', ranges);
}, {url: 'http://localhost:3001'});
