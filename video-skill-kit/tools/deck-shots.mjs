// Chụp từng slide của bộ trình bày web + xuất PDF: node tools/deck-shots.mjs <url> <thư mục ra> [số slide]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [url, out, n = '12'] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const browser = await puppeteer.launch({executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new'});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
await page.setViewport({width: 1920, height: 1080});
await page.goto(url, {waitUntil: 'networkidle0', timeout: 120000});
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));
for (let i = 1; i <= +n; i++) {
  await page.screenshot({path: path.join(out, `slide${String(i).padStart(2, '0')}.png`)});
  await page.keyboard.press('ArrowRight');
  await new Promise((r) => setTimeout(r, 250));
}
await page.pdf({path: path.join(out, 'deck.pdf'), width: '1920px', height: '1080px', printBackground: true});
await browser.close();
console.log('xong', out, errors.length ? `lỗi console: ${errors.join(' | ')}` : 'không có lỗi console');
