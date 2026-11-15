// Chụp ảnh sản phẩm cho poster: khung hình từ các cảnh quay sẵn (/demo/*.mp4) và phòng thực hành /lab đang chạy.
// Chạy (cần bảng ở cổng 3001): cd socratic-video && node ../docs/poster-visef/chup_anh.cjs
const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));
const OUT = path.join(__dirname, 'assets', 'chup');
const BASE = 'http://localhost:3001';
// [cảnh, phần thời lượng]
const FRAMES = [['08', .5], ['08', .95], ['06-07', .6], ['06-07', .95], ['10b', .9], ['10c', .9], ['10d', .9], ['10e', .9], ['10f', .9],
  ['11', .95], ['12a', .9], ['12b', .9], ['13', .5], ['13', .95], ['13-phone', .9], ['13A', .9], ['13B', .9], ['14a', .9], ['14b', .9]];
const LABS = ['PHYS_LAB_HOOKE', 'titration', 'balance', 'chem', 'BIO_LAB_BIOMOLECULES', 'PHYS_LAB_BOYLE'];

(async () => {
  require('fs').mkdirSync(OUT, {recursive: true});
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1920, height: 1080});
  for (const [id, f] of FRAMES) {
    await page.goto(`${BASE}/demo/${id}.mp4`);
    await page.evaluate((f) => new Promise((ok, no) => {
      const v = document.querySelector('video');
      v.pause(); v.controls = false; v.style.cssText = 'width:100vw;height:100vh;object-fit:contain';
      v.onerror = () => no(new Error('video'));
      v.onseeked = () => setTimeout(ok, 200);
      const go = () => { v.currentTime = v.duration * f; };
      if (v.readyState >= 1) go(); else v.onloadedmetadata = go;
    }), f);
    await page.screenshot({path: path.join(OUT, `demo-${id}-${Math.round(f * 100)}.png`)});
    console.log('demo', id, f);
  }
  for (const id of LABS) {
    await page.goto(`${BASE}/lab?bai=${id}`, {waitUntil: 'networkidle2', timeout: 120000}).catch((e) => console.log('goto', id, e.message));
    await new Promise((r) => setTimeout(r, 9000));
    await page.screenshot({path: path.join(OUT, `lab-${id}.png`)});
    console.log('lab', id);
  }
  await browser.close();
})();
