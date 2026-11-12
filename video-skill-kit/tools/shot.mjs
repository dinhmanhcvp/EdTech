// Chụp một trang HTML cục bộ ra PNG: node tools/shot.mjs <trang.html> <ra.png> [rộng] [cao]
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [src, out, w = '1920', h = '1080'] = process.argv.slice(2);
const browser = await puppeteer.launch({executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new'});
const page = await browser.newPage();
await page.setViewport({width: +w, height: +h, deviceScaleFactor: 1});
await page.goto(pathToFileURL(path.resolve(src)).href, {waitUntil: 'networkidle0'});
await page.evaluate(() => document.fonts.ready);
await page.screenshot({path: out, omitBackground: true});
await browser.close();
console.log('ok', out);
