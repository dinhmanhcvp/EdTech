// Quay các tính năng mới của bảng (bản Launch v3): viết tay → khoanh → gợi ý → mô phỏng (định tuyến cục bộ, không cần backend)
// rồi tương tác thật với thanh trượt / hologram. node tools/clips4.mjs <thư mục ra> <khóa> [khóa...]
import {record, sleep} from './recorder.mjs';

const [out, ...keys] = process.argv.slice(2);
const W = '[data-testid="simulation-widget"]';
const safe = (p) => p.catch((e) => console.log('  ! bỏ qua:', String(e.message).slice(0, 120)));

// khóa → gợi ý gõ sau khi khoanh (định tuyến bằng utils/localRouter.ts)
const HINT = {
  oxyz: 'Oxyz mặt cầu x^2+y^2+z^2=9 và mặt phẳng (P): z = 1',
  revolve: 'khối tròn xoay Riemann y = sqrt(x)',
  lattice: 'ô mạng tinh thể FCC lập phương tâm diện',
  sn2: 'cơ chế SN2 nghịch đảo Walden',
  cyclo: 'cyclohexane cấu dạng ghế',
  etc: 'chuỗi truyền electron ti thể ATP synthase',
  lotka: 'Lotka Volterra thỏ sói mặt phẳng pha',
  pendulum: 'con lắc kép hỗn loạn',
  graph: 'đồ thị y = sin(x); y = x^2/4',
};

/** Kéo lần lượt các thanh trượt trong mô phỏng (tối đa n thanh): lên gần max rồi về giữa. */
async function playSliders(a, n = 2) {
  const ids = await a.page.evaluate((W) => [...document.querySelectorAll(`${W} input[type=range]`)].map((e) => e.getAttribute('data-testid')).filter(Boolean), W);
  for (const id of ids.slice(0, n)) {
    const sel = `[data-testid="${id}"]`;
    const info = await a.page.$eval(sel, (e) => ({min: +e.min, max: +e.max, v: +e.value}));
    a.mark('slide');
    await safe(a.dragSlider(sel, info.min + (info.max - info.min) * 0.88, 1700));
    await sleep(500);
    a.mark('slide');
    await safe(a.dragSlider(sel, info.min + (info.max - info.min) * 0.35, 1500));
    await sleep(500);
  }
}

async function feature(a, key) {
  const {page} = a;
  const r = await a.inkHand(key, {speed: 1.5, onRect: async (rect) => a.zoomPoint(rect.x0 + rect.w / 2, rect.y0 + rect.h / 2, 1.8, 0)});
  a.mark('inkEnd');
  await sleep(200);
  await a.click('[data-testid="tool-lasso"]', 380);
  a.mark('lasso');
  await a.lasso(r, 650);
  a.mark('lassoEnd');
  await sleep(350);
  await a.typeHint(HINT[key], 12);
  a.mark('typeEnd');
  await sleep(200);
  a.mark('click');
  a.mark('compile');
  await a.click('[data-testid="btn-visualize"]', 380);
  await page.waitForSelector(W, {visible: true, timeout: 20000});
  a.mark('whoosh-out');
  await sleep(500);
  await a.zoom(W, 1.45, 1000);
  await sleep(900);
  await orbit(a);
  await playSliders(a, 2);
  await sleep(1200);
}

/** Xoay / kéo mô hình bằng tay trên khung mô phỏng (mô hình 3D xoay theo; mô hình 2D bỏ qua thao tác). */
async function orbit(a) {
  const el = await a.page.$('[data-testid="engine-canvas-container"]');
  if (!el) return;
  const b = await el.boundingBox();
  const cx = b.x + b.width / 2;
  const cy = b.y + Math.min(b.height, 300) / 2;
  await a.glide(cx - 120, cy, 400);
  await a.page.mouse.down();
  a.mark('slide');
  await a.glide(cx + 160, cy - 30, 1300);
  await a.glide(cx - 40, cy + 20, 900);
  await a.page.mouse.up();
  await sleep(400);
}

const special = {
  // Chữ viết tay → công thức chuẩn (nhận dạng cục bộ), rồi dựng đồ thị đa hàm từ hai hàm viết tay
  async conv(a) {
    const {page} = a;
    const r = await a.inkHand('conv', {speed: 1.5, onRect: async (rect) => a.zoomPoint(rect.x0 + rect.w / 2, rect.y0 + rect.h / 2, 1.8, 0)});
    a.mark('inkEnd');
    await a.click('[data-testid="tool-lasso"]', 380);
    a.mark('lasso');
    await a.lasso(r, 650);
    a.mark('lassoEnd');
    await sleep(400);
    await a.zoom(null, 1, 700);
    await a.click('[data-testid="ai-fab"]', 500);
    await sleep(400);
    a.mark('click');
    await a.click('[data-testid="tool-convert-ink"]', 450);
    await page.waitForSelector('[data-testid="ink-convert-panel"]', {visible: true, timeout: 15000});
    a.mark('compile');
    await sleep(300);
    await a.zoom('[data-testid="ink-convert-panel"]', 1.35, 900);
    await sleep(2600);
    // từ công thức vừa nhận dạng, dựng đồ thị ngay
    await a.zoom(null, 1, 700);
    a.mark('click');
    await safe(a.click('[data-testid="ink-convert-visualize-local"]', 500));
    await safe(page.waitForSelector(W, {visible: true, timeout: 15000}));
    a.mark('whoosh-out');
    await sleep(500);
    await a.zoom(W, 1.45, 1000);
    await sleep(800);
    await playSliders(a, 1);
    await sleep(1000);
  },
  // Hologram: mô phỏng nổi trên mặt bảng, kéo đi và phóng to bằng tay
  async holo(a) {
    await feature(a, 'oxyz');
    await a.zoom(null, 1, 900);
    const g = await a.center('[data-testid="hologram-drag-grip"]');
    await a.glide(g.x, g.y, 500);
    await a.page.mouse.down();
    a.mark('slide');
    await a.glide(g.x - 520, g.y + 40, 1400);
    await a.page.mouse.up();
    await sleep(400);
    for (let i = 0; i < 2; i++) {
      a.mark('click');
      await safe(a.click('[data-testid="holo-zoom-in"]', 400));
      await sleep(350);
    }
    await sleep(1500);
  },
};

for (const key of keys) {
  await record(`v3_${key}`, out, async (a) => {
    if (special[key]) await special[key](a);
    else await feature(a, key);
  }, {url: 'http://localhost:3001'});
}
