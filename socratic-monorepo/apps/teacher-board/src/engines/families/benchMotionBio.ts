import * as THREE from 'three';
import {clamp, cyc, display, dots, fix, glow, mat, restart, type FxBuild, type FxCtx, type FxLive} from './benchMotion';

/**
 * Chuyển động của các bài thực hành SGK môn SINH trong /lab (cùng khung với `benchMotion.ts` của môn Lí): dụng cụ và mẫu vật phản ứng theo
 * đúng thanh trượt và lựa chọn của bài. Mọi con số (mức co nguyên sinh, thời gian mất màu, pH, góc uốn, năng suất, số cá thể…) lấy từ chính
 * hàm `measure` của bài với nhiễu bằng 0, nên hình và bảng số liệu luôn nói cùng một điều. Toạ độ theo bộ dụng cụ Blender (`bench_parts.py`, hàm `bio`).
 */

/** phần động chạy tự do (không gắn thanh trượt) của các bài Sinh */
export const BIO_FX_PARTS: Record<string, number[]> = {
  BIOMOLECULES: [1],
  TROPISM: [1],
  APICAL_DOMINANCE: [1, 2],
  METAMORPHOSIS: [1],
  DNA_EXTRACT: [1],
  MODIFICATION: [1, 2],
  QUADRAT: [1],
  COMMUNITY: [1],
};

// ------------------------------------------------------------------ dụng cụ vẽ nhỏ
type Row = Record<string, number>;
/** số đo "thật" của bài ở trạng thái hiện tại (nhiễu 0); nhớ theo trạng thái để không tính lại mỗi khung hình */
function truth(c: FxCtx) {
  let key = '';
  let row: Row = {};
  return (L: FxLive, s: Record<string, string> = L.s): Row => {
    const k = JSON.stringify([L.p, s]);
    if (s !== L.s) return c.e.measure(L.p, s, () => 0.5, 0);
    if (k !== key) {
      key = k;
      row = c.e.measure(L.p, L.s, () => 0.5, 0);
    }
    return row;
  };
}
const num = (v: number, d = 0) => (Number.isFinite(v) ? v : d);
const solid = (root: THREE.Object3D, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, glowing = 0.15) => {
  const m = new THREE.Mesh(geo, mat(color, {emissive: glowing}));
  m.position.set(x, y, z);
  root.add(m);
  return m;
};
const tint = (m: THREE.Mesh, from: string, to: string, t: number) => {
  const c = (m.material as THREE.MeshStandardMaterial).color.set(from).lerp(new THREE.Color(to), clamp(t, 0, 1));
  (m.material as THREE.MeshStandardMaterial).emissive.copy(c);
};
/** số ngẫu nhiên lặp lại được */
const rand = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
/**
 * Màn quan sát: thị trường kính hiển vi (tròn) hoặc màn hình (chữ nhật) vẽ bằng canvas, đặt nghiêng về phía người nhìn.
 * `draw(key, fn)` chỉ vẽ lại khi `key` đổi; `fn` vẽ trong hệ 256 × 256 (hoặc 256 × cao).
 */
function screen(root: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, round: boolean) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = Math.round((256 * h) / w);
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  const face = new THREE.Mesh(round ? new THREE.CircleGeometry(w / 2, 48) : new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex}));
  face.position.set(x, y, z);
  face.rotation.x = -0.5;
  root.add(face);
  if (round) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(w / 2, w / 2 + 0.05, 48), new THREE.MeshBasicMaterial({color: '#1D1B16'}));
    face.add(rim);
  }
  let last = '';
  return (key: string, fn: (g: CanvasRenderingContext2D, W: number, H: number) => void) => {
    if (key === last || !g) return;
    last = key;
    g.save();
    g.filter = 'none';
    g.fillStyle = '#F6F3E8';
    g.fillRect(0, 0, cv.width, cv.height);
    fn(g, cv.width, cv.height);
    g.restore();
    tex.needsUpdate = true;
  };
}
/** bọt / hơi / giọt: `n` hạt đi từ đáy lên (dir = 1) hoặc rơi xuống (dir = −1) trong một cột, số hạt hiện theo `rate` 0..1 */
function stream(root: THREE.Object3D, n: number, r: number, color: string, x: number, y0: number, z: number, h: number, spread: number, dir = 1) {
  const d = dots(root, n, r, color, 0.5);
  const R = rand(n * 7 + Math.round(x * 100));
  const off = Array.from({length: n}, () => [R(), (R() - 0.5) * spread, (R() - 0.5) * spread] as const);
  return (T: number, rate: number, speed = 0.5, X = x, Y = y0, Z = z) => {
    for (let i = 0; i < n; i++) {
      const u = (off[i][0] + T * speed) % 1;
      d.put(i, X + off[i][1], Y + (dir > 0 ? u : 1 - u) * h, Z + off[i][2], i < Math.round(clamp(rate, 0, 1) * n) ? 1 : 0);
    }
  };
}

/** tế bào trong thị trường kính: lưới chữ nhật (hành), mảng tròn (miệng, men, rễ) */
function cells(g: CanvasRenderingContext2D, W: number, o: {size: number; shape: 'brick' | 'blob' | 'yeast' | 'round'; wall: string; fill: string; inner?: (x: number, y: number, s: number, i: number) => void}) {
  const R = rand(11);
  let i = 0;
  if (o.shape === 'brick') {
    for (let y = -o.size; y < W + o.size; y += o.size * 0.62) {
      const shift = (Math.round(y / (o.size * 0.62)) % 2) * o.size * 0.5;
      for (let x = -o.size + shift; x < W + o.size; x += o.size) {
        g.fillStyle = o.fill;
        g.strokeStyle = o.wall;
        g.lineWidth = Math.max(1.5, o.size * 0.05);
        g.fillRect(x, y, o.size, o.size * 0.62);
        g.strokeRect(x, y, o.size, o.size * 0.62);
        o.inner?.(x + o.size / 2, y + o.size * 0.31, o.size, i++);
      }
    }
    return;
  }
  const n = Math.round(clamp((W / o.size) ** 2 * (o.shape === 'round' ? 0.75 : 0.4), 3, 90));
  for (let k = 0; k < n; k++) {
    const x = R() * W;
    const y = R() * W;
    const s = o.size * (0.8 + R() * 0.4);
    g.fillStyle = o.fill;
    g.strokeStyle = o.wall;
    g.lineWidth = Math.max(1.2, s * 0.05);
    g.beginPath();
    g.ellipse(x, y, s * 0.5, s * (o.shape === 'yeast' ? 0.36 : 0.44), R() * 3, 0, 6.3);
    g.fill();
    g.stroke();
    if (o.shape === 'yeast' && k % 3 === 0) {
      g.beginPath();
      g.ellipse(x + s * 0.5, y + s * 0.1, s * 0.22, s * 0.18, 0, 0, 6.3);
      g.fill();
      g.stroke();
    }
    o.inner?.(x, y, s, i++);
  }
}
const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) => {
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, 6.3);
  g.fill();
};

// ------------------------------------------------------------------ từng bài
export const BIO_FX: Record<string, FxBuild> = {
  // ống nhỏ giọt lấy thuốc thử ở lọ đang chọn, nhỏ vào ống mẫu đang chọn; dung dịch trong ống đổi màu theo kết quả dương / âm tính
  BIOMOLECULES: (c) => {
    const tr = truth(c);
    const r = restart();
    const SAMPLES = ['starch', 'glucose', 'protein', 'lipid', 'water'];
    const REAGENTS = ['iodine', 'benedict', 'biuret', 'sudan'];
    const BASE = ['#C9963A', '#4A9BE0', '#6BB4E8', '#E07A5A'];
    const POS = ['#2A1B5E', '#C4502A', '#7A3FB0', '#D4261A'];
    const liquid = solid(c.root, new THREE.CylinderGeometry(0.047, 0.047, 0.22, 14), '#FFFFFF', 0, 0.22, 0, 0.3);
    const drop = stream(c.root, 3, 0.022, '#FFFFFF', 0, 0.3, 0, 0.3, 0, -1);
    const flame = glow(c.root, 0.4, 0.42, -0.4, 0.1, '#FFB35C');
    let sig = '';
    return (_dt, L, T) => {
      const i = Math.max(0, SAMPLES.indexOf(L.s.sample));
      const j = Math.max(0, REAGENTS.indexOf(L.s.reagent));
      if (`${i}${j}` !== sig) sig = `${i}${j}`;
      const t = cyc(r(L, T) + 0.001, 7) * 7;
      const tube: [number, number] = [-1.94 + 0.22 * i, 0];
      const bottle: [number, number] = [0.1 + 0.35 * j, 0.5];
      const go = clamp((t - 1.2) / 1.5, 0, 1);
      const e = go * go * (3 - 2 * go);
      const pip = c.part(1);
      if (pip) {
        pip.position.set(bottle[0] + (tube[0] - bottle[0]) * e, 0.62 + Math.sin(e * Math.PI) * 0.5 + (t < 1.2 ? -0.18 * Math.sin((t / 1.2) * Math.PI) : 0), bottle[1] + (tube[1] - bottle[1]) * e);
      }
      const dropping = t > 2.8 && t < 4;
      drop(T, dropping ? 1 : 0, 1.6, tube[0], 0.3, tube[1]);
      liquid.position.set(tube[0], 0.22, tube[1]);
      liquid.visible = t > 3.1;
      const pos = tr(L).pos > 0.5;
      // Benedict phải đun cách thủy mới đổi màu: màu chuyển chậm hơn
      tint(liquid, BASE[j], pos ? POS[j] : BASE[j], (t - 3.3) / (j === 1 ? 2.6 : 1));
      flame(0.55 + 0.25 * Math.sin(T * 17) + 0.15 * Math.sin(T * 29));
    };
  },

  // thị trường kính hiển vi: tế bào theo tiêu bản, to nhỏ theo vật kính, mờ theo ốc chỉnh nét
  CELL_OBSERVE: (c) => {
    const view = screen(c.root, 1.0, 1.15, -0.95, 1.2, 1.2, true);
    const light = glow(c.root, -0.6, 0.2, 0.08, 0.09, '#FFF3C4');
    return (_dt, L, T) => {
      const obj = Number(L.s.obj) || 4;
      const blur = Math.abs(L.p.focus ?? 0) * 0.9;
      light(0.6 + 0.1 * Math.sin(T * 3));
      view(`${L.s.sample}|${obj}|${blur}`, (g, W) => {
        g.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none';
        const size = {4: 22, 10: 52, 40: 150}[obj] ?? 40;
        if (L.s.sample === 'onion') cells(g, W, {size: size * 1.5, shape: 'brick', wall: '#7A4E8A', fill: '#EFE3F2', inner: (x, y, s) => dot(g, x + s * 0.2, y, s * 0.07, '#5B2E7A')});
        else if (L.s.sample === 'cheek') cells(g, W, {size: size * 1.2, shape: 'blob', wall: '#6FA3C9', fill: '#DCEBF5', inner: (x, y, s) => dot(g, x, y, s * 0.1, '#2459C9')});
        else cells(g, W, {size: size * 0.45, shape: 'yeast', wall: '#9A8A4A', fill: '#F3EBC2'});
      });
    };
  },

  // nhỏ dung dịch lên lam kính; trong thị trường, khối nguyên sinh chất co lại (NaCl) rồi căng trở lại (nước cất)
  PLASMOLYSIS: (c) => {
    const tr = truth(c);
    const view = screen(c.root, 0.6, 1.15, -0.95, 1.2, 1.2, true);
    const drip = stream(c.root, 4, 0.022, '#9FD3F0', -0.8, 0.55, 0.08, 0.55, 0.02, -1);
    const r = restart();
    let shown = 100;
    return (dt, L, T) => {
      const R = clamp(num(tr(L).R, 100), 20, 100);
      shown += (R - shown) * Math.min(1, dt * 2.5);
      drip(T, cyc(r(L, T) + 0.001, 4) < 0.45 ? 1 : 0, 1.4);
      view(`${Math.round(shown)}`, (g, W) =>
        cells(g, W, {
          size: 74,
          shape: 'brick',
          wall: '#5B2E5A',
          fill: '#FBF7F0',
          inner: (x, y, s) => {
            const k = shown / 100;
            g.fillStyle = '#A0429A';
            g.beginPath();
            g.ellipse(x, y, s * 0.47 * k, s * 0.27 * k, 0, 0, 6.3);
            g.fill();
          },
        }),
      );
    };
  },

  // năm ống hồ tinh bột + iodine trong bể ổn nhiệt: màu xanh đen nhạt dần nhanh hay chậm theo hoạt tính enzyme; nước sôi lăn tăn khi quá nóng
  ENZYME: (c) => {
    const tr = truth(c);
    const tubes = [0, 1, 2, 3, 4].map((i) => solid(c.root, new THREE.CylinderGeometry(0.046, 0.046, 0.2, 12), '#1B1D4A', -1.4 + 0.25 * i, 0.36, 0, 0.2));
    const show = display(c.root, -1.4, 0.06, 0.459, 0.28, 0.09, '#FFB36B');
    const boil = stream(c.root, 18, 0.02, '#FFFFFF', -0.9, 0.16, 0, 0.36, 1.2);
    const r = restart();
    return (_dt, L, T) => {
      const row = tr(L);
      const minutes = num(row.t, 60);
      const active = num(row.v, 0) > 1;
      // 1 giây trên màn ≈ 1 phút thí nghiệm; enzyme biến tính thì không bao giờ mất màu
      const t = cyc(r(L, T) + 0.001, clamp(minutes, 3, 14) + 3) * (clamp(minutes, 3, 14) + 3);
      tubes.forEach((m, i) => tint(m, '#1B1D4A', '#E8DDA0', active ? (t - i * 0.5) / clamp(minutes, 1.5, 14) : 0));
      show(`${fix(L.p.T, 0)} °C`);
      boil(T, (L.p.T - 60) / 30, 0.9);
    };
  },

  // thị trường kính: tế bào chóp rễ / bao phấn, phần đang phân chia có nhiễm sắc thể xếp hàng hoặc tách hai cực; chưa nhuộm thì gần như không thấy gì
  MITOSIS_SLIDE: (c) => {
    const tr = truth(c);
    const view = screen(c.root, -0.35, 1.2, -1.0, 1.2, 1.2, true);
    const flame = glow(c.root, 2.1, 0.42, 0.1, 0.1, '#FFB35C');
    return (_dt, L, T) => {
      const row = tr(L);
      const stained = L.s.stain === 'yes';
      const share = stained ? clamp(num(row.D, 0) / Math.max(1, num(row.n, 40)), 0, 1) : 0;
      flame(0.5 + 0.3 * Math.sin(T * 19));
      view(`${L.s.sample}|${stained}|${share.toFixed(2)}`, (g, W) =>
        cells(g, W, {
          size: L.s.sample === 'anther' ? 46 : 38,
          shape: 'round',
          wall: stained ? '#8A4A5A' : '#D9D2C2',
          fill: stained ? '#F7E3E6' : '#F3EFE6',
          inner: (x, y, s, i) => {
            if (!stained) return;
            const dividing = (i * 0.618) % 1 < share;
            g.strokeStyle = '#8E1B3A';
            g.lineWidth = 2.4;
            if (!dividing) return dot(g, x, y, s * 0.17, '#B03A5A');
            const phase = i % 3;
            for (const side of phase === 0 ? [0] : [-1, 1]) {
              g.beginPath();
              g.moveTo(x + side * s * (phase === 1 ? 0.14 : 0.25), y - s * 0.22);
              g.lineTo(x + side * s * (phase === 1 ? 0.14 : 0.25), y + s * 0.22);
              g.stroke();
            }
          },
        }),
      );
    };
  },

  // sữa trong bốn hũ đông dần và ngả màu khi pH hạ; hơi ấm bốc lên theo nhiệt độ ủ; hộp điều nhiệt hiện nhiệt độ và pH
  YOGURT: (c) => {
    const tr = truth(c);
    const curd = [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([dx, dz]) => solid(c.root, new THREE.CylinderGeometry(0.183, 0.183, 0.03, 20), '#FFFFFF', -1 + dx, 0.39, dz, 0.2));
    const steam = stream(c.root, 16, 0.025, '#FFFFFF', -1, 0.6, 0, 0.7, 1);
    const show = display(c.root, 0.1, 0.1, 0.932, 0.62, 0.11, '#FFB36B');
    return (dt, L, T) => {
      const pH = num(tr(L).pH, 6.6);
      const set = clamp((6.6 - pH) / 2, 0, 1);
      curd.forEach((m) => {
        tint(m, '#FFFFFF', '#F1E2B0', set);
        m.scale.y += (1 + set * 2.5 - m.scale.y) * Math.min(1, dt * 2);
      });
      steam(T, (L.p.T - 30) / 20, 0.35);
      show(`${fix(L.p.T, 0)}°C pH ${fix(pH, 1)}`);
    };
  },

  // người được khảo sát lần lượt tới bàn; ba cột trên máy tính bảng: số người, tỉ lệ mắc, tỉ lệ biết cách phòng
  VIRUS_SURVEY: (c) => {
    const tr = truth(c);
    const bars = ['#2459C9', '#C4261A', '#1F7A4D'].map((col, i) => solid(c.root, new THREE.BoxGeometry(0.22, 1, 0.22), col, 0.3 + i * 0.4, 0.03, 0.25, 0.3));
    const people = dots(c.root, 20, 0.06, '#E3B341', 0.3);
    const virus = solid(c.root, new THREE.IcosahedronGeometry(0.16, 0), '#C4261A', 2.4, 1.15, -0.4, 0.5);
    const COLOR: Record<string, string> = {flu: '#2459C9', dengue: '#C4261A', hfmd: '#D9481C'};
    const r = restart();
    return (dt, L, T) => {
      const row = tr(L);
      const h = [L.p.n / 200, num(row.kp) / 100, num(row.yp) / 100];
      bars.forEach((b, i) => {
        b.scale.y += (Math.max(0.02, h[i] * 0.9) - b.scale.y) * Math.min(1, dt * 3);
        b.position.y = 0.03 + b.scale.y / 2;
      });
      const t = r(L, T);
      const n = Math.round(L.p.n / 10);
      for (let i = 0; i < 20; i++) {
        const arrived = clamp(t * 4 - i * 0.6, 0, 1);
        people.put(i, -2.9 + (i % 5) * 0.22 + arrived * 0.5, 0.08 + 0.04 * Math.abs(Math.sin(T * 5 + i)), 0.95 - Math.floor(i / 5) * 0.2, i < n ? 1 : 0);
      }
      (virus.material as THREE.MeshStandardMaterial).color.set(COLOR[L.s.d] ?? '#C4261A');
      virus.rotation.set(T * 0.7, T, 0);
    };
  },

  // hơi nước bốc khỏi lá nhiều hay ít theo ánh sáng và cách xử lí lá; số trên cân giảm dần; đèn sáng theo cường độ
  TRANSPIRATION: (c) => {
    const tr = truth(c);
    const vapor = stream(c.root, 26, 0.022, '#BFE6FF', -0.6, 0.9, 0, 0.9, 0.7);
    const bulb = glow(c.root, 1.7, 1.55, -0.2, 0.16, '#FFF3C4');
    const show = display(c.root, -0.6, 0.12, 0.2575, 0.66, 0.13);
    const r = restart();
    return (_dt, L, T) => {
      const m = num(tr(L).m, 0);
      vapor(T, m / 3, 0.25 + m * 0.08);
      const lamp = c.part(1);
      if (lamp) bulb.mesh.position.set(lamp.position.x - 0.5, 1.55, -0.2);
      bulb(L.p.L / 45);
      // 1 giây ≈ 1 giờ: khối lượng chậu giảm đúng bằng lượng nước mất
      show(`${fix(352.18 - m * (cyc(r(L, T) + 0.001, 12) * 12), 2)} g`);
    };
  },

  // dung môi dâng trên giấy sắc kí kéo bốn vạch sắc tố lên các độ cao khác nhau (Rf riêng của từng chất); vạch đang đo có chấm sáng
  PIGMENT: (c) => {
    const tr = truth(c);
    const BANDS = ['car', 'xan', 'chla', 'chlb'];
    const COLORS = ['#E8922A', '#E3C341', '#2E7D5B', '#9DB341'];
    const band = COLORS.map((col) => solid(c.root, new THREE.BoxGeometry(0.19, 0.035, 0.01), col, 0.8, 0.25, 0.006, 0.35));
    const front = solid(c.root, new THREE.BoxGeometry(0.2, 0.008, 0.01), '#7FB8E8', 0.8, 0.25, 0.006, 0.6);
    const mark = glow(c.root, 0.95, 0.25, 0.02, 0.035, '#FFFFFF');
    const r = restart();
    return (_dt, L, T) => {
      const rise = clamp(cyc(r(L, T) + 0.001, 9) * 9 / 5, 0, 1);
      const top = 0.25 + (L.p.ds / 10) * 0.85 * rise;
      front.position.y = top;
      BANDS.forEach((b, i) => {
        const row = tr(L, {...L.s, b});
        band[i].position.y = 0.25 + (top - 0.25) * clamp(num(row.Rf, 0.5), 0, 1);
        if (b === L.s.b) mark.mesh.position.y = band[i].position.y;
      });
      mark(0.6 + 0.4 * Math.sin(T * 5));
    };
  },

  // ánh sáng từ đèn tới lá; cồn sôi tẩy diệp lục; mảnh lá thử iodine đổi sang xanh tím đậm nhạt theo lượng tinh bột
  LEAF_STARCH: (c) => {
    const tr = truth(c);
    const leaf = solid(c.root, new THREE.BoxGeometry(0.26, 0.014, 0.14), '#E8E3C2', 1.7, 0.036, 0.4, 0.2);
    const bulb = glow(c.root, -1.4, 1.55, -0.5, 0.16, '#FFF3C4');
    const photons = dots(c.root, 10, 0.03, '#FFE27A', 1);
    const boil = stream(c.root, 10, 0.018, '#FFFFFF', 0.5, 0.2, 0, 0.4, 0.2);
    return (_dt, L, T) => {
      const on = L.p.h > 0;
      tint(leaf, '#E8E3C2', '#1B1D3A', num(tr(L).S) / 100);
      bulb(on ? 0.8 : 0);
      for (let i = 0; i < 10; i++) {
        const u = (i / 10 + T * 0.5) % 1;
        photons.put(i, -1.4 - 0.4 * u, 1.45 - 0.6 * u, -0.5 + 0.5 * u, on ? 1 : 0);
      }
      boil(T, 0.8, 0.8);
    };
  },

  // khí từ bình hạt đang chọn sục qua nước vôi trong: hạt sống thải CO₂ làm nước vôi đục, hạt luộc thì không; cảm biến hiện số
  SEED_RESPIRATION: (c) => {
    const tr = truth(c);
    const bubble = stream(c.root, 12, 0.018, '#FFFFFF', 1, 0.12, 0.3, 0.3, 0.05);
    const gas = dots(c.root, 8, 0.02, '#BFE6FF', 0.8);
    const cloud = [0, 1].map((i) => solid(c.root, new THREE.CylinderGeometry(0.047, 0.047, 0.26, 12), '#CFE3F0', 1 + i * 0.5, 0.23, 0.3, 0.2));
    cloud.forEach((m) => ((m.material as THREE.MeshStandardMaterial).transparent = true));
    const show = display(c.root, 2.3, 0.24, -0.148, 0.5, 0.12);
    const turbid = [0, 0];
    return (dt, L, T) => {
      const co2 = num(tr(L).co2, 0);
      const i = L.s.g === 'boiled' ? 1 : 0;
      const sx = i ? -0.5 : -1.5;
      const tx = 1 + i * 0.5;
      const path: [number, number, number][] = [[sx, 0.82, 0], [sx, 1.1, 0], [sx + 0.3, 1.2, 0.3], [tx, 1.0, 0.3], [tx, 0.3, 0.3]];
      for (let k = 0; k < 8; k++) {
        const u = ((k / 8 + T * (0.05 + co2 * 0.012)) % 1) * 4;
        const a = path[Math.floor(u)];
        const b = path[Math.min(4, Math.floor(u) + 1)];
        const f = u % 1;
        gas.put(k, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, co2 > 0.3 ? 1 : 0);
      }
      bubble(T, co2 / 15, 0.6 + co2 * 0.05, tx, 0.12, 0.3);
      turbid[i] = clamp(turbid[i] + dt * co2 * 0.01, 0, 1);
      cloud.forEach((m, k) => tint(m, '#CFE3F0', '#FFFFFF', turbid[k]));
      cloud.forEach((m, k) => ((m.material as THREE.MeshStandardMaterial).opacity = 0.25 + 0.7 * turbid[k]));
      show(`CO2 ${fix(co2, 1)}`);
    };
  },

  // mạch đập ở cổ tay theo đúng nhịp tim của trạng thái đang chọn; máu chạy dọc cánh tay; vòng bít phồng lên khi đo; máy hiện huyết áp và mạch
  CIRCULATION: (c) => {
    const tr = truth(c);
    const pulse = glow(c.root, -0.1, 0.42, 0.05, 0.09, '#FF4D5E');
    const cuff = glow(c.root, -1.3, 0.3, 0, 0.27, '#7FB8E8');
    const blood = dots(c.root, 10, 0.025, '#E0352B', 0.8);
    const show = display(c.root, 1.7, 0.3, 0.3075, 0.56, 0.2, '#7CFFB2');
    const r = restart();
    let beat = 0;
    return (dt, L, T) => {
      const row = tr(L);
      const hr = clamp(num(row.hr, 70), 40, 200);
      beat += (dt * hr) / 60;
      const k = Math.max(0, Math.sin(beat * 6.283)) ** 6;
      pulse(0.15 + 0.85 * k);
      for (let i = 0; i < 10; i++) {
        const u = (i / 10 + beat * 0.35) % 1;
        blood.put(i, -1.7 + 1.6 * u, 0.48, 0.03 * Math.sin(i * 2.1), 1 + 0.5 * k);
      }
      const t = r(L, T);
      cuff(t < 2.5 ? 0.25 + 0.2 * Math.sin(t * 4) : 0.06);
      show(`${Math.round(num(row.sbp, 110))} / ${Math.round(hr)}`);
    };
  },

  // ba cây mầm trong hộp uốn dần về phía kích thích theo số ngày (nhóm đối chứng mọc thẳng); đèn sáng, nước nhỏ, đĩa clinostat quay
  TROPISM: (c) => {
    const tr = truth(c);
    const stems = [0, 1, 2].map((i) => {
      const x = -2.15 + i * 0.25;
      solid(c.root, new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), '#7DB341', x, 0.18, 0, 0.2);
      const top = new THREE.Group();
      top.position.set(x, 0.31, 0);
      c.root.add(top);
      solid(top, new THREE.CylinderGeometry(0.012, 0.014, 0.3, 8), '#7DB341', 0, 0.15, 0, 0.2);
      solid(top, new THREE.SphereGeometry(0.035, 10, 8), '#2E8B3A', 0, 0.31, 0, 0.2);
      return top;
    });
    const bulb = glow(c.root, -1.0, 0.75, -0.4, 0.14, '#FFF3C4');
    const water = stream(c.root, 8, 0.02, '#7FB8E8', 2.6, 0.12, 0.3, 0.5, 0.05, -1);
    let shown = 0;
    return (dt, L, T) => {
      const a = num(tr(L).a, 0);
      shown += (a - shown) * Math.min(1, dt * 2);
      stems.forEach((g, i) => (g.rotation.z = -((shown * Math.PI) / 180) * (0.85 + i * 0.1)));
      bulb(L.s.ty === 'light' ? 0.8 : 0);
      water(T, L.s.ty === 'water' ? 1 : 0, 0.8);
      const disc = c.part(1);
      // đối chứng của hướng trọng lực: clinostat quay đều nên trọng lực tác dụng đều mọi phía
      if (disc && L.s.ty === 'gravity' && L.s.grp === 'ctrl') disc.rotation.z = T * 1.2;
    };
  },

  // cây bấm ngọn: cành bên mọc dài dần theo ngày; cây để nguyên: ngọn tiếp tục vươn cao, không ra cành bên
  APICAL_DOMINANCE: (c) => {
    const tr = truth(c);
    let side = 0.05;
    let topH = 0.05;
    return (dt, L) => {
      const cut = L.s.cut === 'yes';
      const row = tr(L);
      const wantSide = cut ? clamp(num(row.side) / 4, 0.05, 1.15) : 0.05;
      const wantTop = cut ? 0.05 : clamp(0.1 + L.p.d / 28, 0.05, 1.1);
      side += (wantSide - side) * Math.min(1, dt * 2);
      topH += (wantTop - topH) * Math.min(1, dt * 2);
      c.part(1)?.scale.setScalar(side);
      const top = c.part(2);
      if (top) {
        top.position.y = 1.7;
        top.scale.set(1, topH, 1);
      }
    };
  },

  // đếm vòng gỗ: chấm sáng chạy từ tâm ra vỏ qua từng vòng; bảng nhỏ hiện số vòng (= số năm)
  TREE_AGE: (c) => {
    const tr = truth(c);
    const count = dots(c.root, 1, 0.035, '#FFE27A', 1);
    const show = display(c.root, 0, 1.0, -0.7, 0.9, 0.2, '#FFE27A');
    return (_dt, L, T) => {
      const n = Math.max(1, Math.round(num(tr(L).n, 10)));
      const slice = c.part(1);
      const R = 0.5 * (slice ? slice.scale.x : 1);
      const k = Math.floor(cyc(T, 5) * n);
      const a = T * 2.2;
      count.put(0, ((k + 0.5) / n) * R * Math.cos(a), 0.14 * (slice ? slice.scale.y : 1) + 0.03, ((k + 0.5) / n) * R * Math.sin(a));
      show(`${k + 1} / ${n} vòng`);
    };
  },

  // ếch: nòng nọc bơi và lớn dần rồi thành ếch; bướm: sâu → nhộng → bướm vỗ cánh; châu chấu: con non lớn dần và nhảy
  METAMORPHOSIS: (c) => {
    const tr = truth(c);
    const wings = [-1, 1].map((s) => {
      const w = solid(c.root, new THREE.CircleGeometry(0.16, 3), '#E8922A', 0.7, 0.62, 0, 0.5);
      (w.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      w.userData.s = s;
      return w;
    });
    const pupa = glow(c.root, 0.95, 0.4, 0.1, 0.07, '#B5C94A');
    const hopper = solid(c.root, new THREE.BoxGeometry(0.2, 0.06, 0.06), '#7DB341', 0.6, 0.1, 0.2, 0.3);
    const show = display(c.root, -0.35, 1.05, -0.5, 1.5, 0.2, '#FFE27A');
    const NAMES: Record<string, string[]> = {frog: ['trứng', 'nòng nọc', 'nòng nọc có chân', 'ếch con', 'ếch'], butterfly: ['trứng', 'sâu non', 'nhộng', 'bướm'], grasshopper: ['trứng', 'ấu trùng', 'châu chấu']};
    return (_dt, L, T) => {
      const row = tr(L);
      const k = Math.max(1, Math.round(num(row.k, 1)));
      const names = NAMES[L.s.sp] ?? NAMES.frog;
      const adult = k >= names.length;
      const tad = c.part(1);
      if (tad) {
        tad.visible = L.s.sp === 'frog' && !adult;
        tad.scale.setScalar(clamp(0.4 + num(row.L, 10) / 40, 0.3, 1.8));
        tad.position.x += 0.25 * Math.sin(T * 1.3);
        tad.position.z += 0.08 * Math.sin(T * 2.1);
      }
      const fly = L.s.sp === 'butterfly' && adult;
      wings.forEach((w) => {
        w.visible = fly;
        w.rotation.set(-Math.PI / 2 + 0.2, 0, (w.userData.s as number) * (0.3 + 0.9 * Math.abs(Math.sin(T * 9))));
        w.position.set(0.7 + (w.userData.s as number) * 0.08, 0.62 + 0.05 * Math.sin(T * 2), 0);
      });
      pupa(L.s.sp === 'butterfly' && !adult && k >= 3 ? 0.5 + 0.3 * Math.sin(T * 2) : 0);
      hopper.visible = L.s.sp === 'grasshopper';
      hopper.scale.setScalar(clamp(0.4 + num(row.L, 10) / 45, 0.3, 1.6));
      hopper.position.set(0.5 + 0.3 * cyc(T, 2.4), 0.1 + 0.25 * Math.abs(Math.sin(cyc(T, 1.2) * Math.PI)), 0.2);
      show(`${k}. ${names[Math.min(names.length, k) - 1]}`);
    };
  },

  // vòng sáng chỉ vào cách nhân giống đang chọn; hàng 20 cành ở mép bàn xanh dần theo số cành sống / bén rễ / đậu quả
  PROPAGATION: (c) => {
    const tr = truth(c);
    const AT: Record<string, [number, number, number]> = {cutting: [-1.8, 0.6, 0.3], layering: [-0.6, 0.6, -0.2], grafting: [0.4, 0.2, 0.6], pollination: [2.2, 1.35, 0]};
    const spot = glow(c.root, 0, 0, 0, 0.2, '#FFE27A');
    const ok = dots(c.root, 20, 0.05, '#35C46A', 0.6);
    const idle = dots(c.root, 20, 0.05, '#6B6F8A', 0.1);
    let shown = 0;
    return (dt, L, T) => {
      const at = AT[L.s.m] ?? AT.cutting;
      spot.mesh.position.set(...at);
      spot(0.35 + 0.25 * Math.sin(T * 4));
      shown += (num(tr(L).k, 0) - shown) * Math.min(1, dt * 2);
      for (let i = 0; i < 20; i++) {
        const live = i < Math.round(shown);
        ok.put(i, -1.9 + i * 0.2, 0.06 + (live ? 0.03 * Math.abs(Math.sin(T * 3 + i)) : 0), 0.95, live ? 1 : 0);
        idle.put(i, -1.9 + i * 0.2, 0.06, 0.95, live ? 0 : 1);
      }
    };
  },

  // chày giã quay trong cối; bọt dịch chiết; dịch lọc nhỏ giọt qua phễu; sợi DNA trắng nổi lên trong lớp cồn lạnh
  DNA_EXTRACT: (c) => {
    const tr = truth(c);
    const foam = stream(c.root, 10, 0.02, '#FFFFFF', -1.4, 0.06, -0.3, 0.2, 0.25);
    const drip = stream(c.root, 4, 0.02, '#C9A07A', -0.45, 0.22, -0.3, 0.4, 0, -1);
    const dna = dots(c.root, 14, 0.016, '#FFFFFF', 0.9);
    let shown = 0;
    return (dt, L, T) => {
      const pestle = c.part(1);
      if (pestle && L.s.grind === 'yes') {
        pestle.position.x += 0.07 * Math.cos(T * 6);
        pestle.position.z += 0.07 * Math.sin(T * 6);
        pestle.rotation.z = 0.25 * Math.sin(T * 6);
      }
      foam(T, L.s.lysis === 'yes' ? 1 : 0, 0.5);
      drip(T, L.s.filter === 'yes' ? 1 : 0, 1.2);
      const row = tr(L);
      // sợi DNA chỉ hiện rõ khi đủ quy trình; cồn ấm cho rất ít
      const want = clamp(num(row.y, 0) / 2, 0, 1) * (L.s.eth === 'cold' ? 1 : 0.35);
      shown += (want - shown) * Math.min(1, dt * 1.5);
      for (let i = 0; i < 14; i++) dna.put(i, 1.79 + 0.022 * Math.sin(i * 1.3 + T * 2), 0.3 + i * 0.022, 0.022 * Math.cos(i * 1.3 + T * 2), i < Math.round(shown * 14) ? 1 : 0);
    };
  },

  // màn hình hiện bộ nhiễm sắc thể của tiêu bản đang chọn: các cặp tương đồng, chiếc thừa tô đỏ
  CHROMOSOME_MUTATION: (c) => {
    const tr = truth(c);
    const view = screen(c.root, 1.6, 0.75, -0.262, 1.36, 0.86, false);
    const light = glow(c.root, -1.6, 0.2, 0.08, 0.09, '#FFF3C4');
    return (_dt, L, T) => {
      const n = Math.round(num(tr(L).n, 16));
      light(0.6 + 0.1 * Math.sin(T * 3));
      view(`${L.s.sl}|${n}`, (g, W, H) => {
        const sets = {normal: 2, trisomy: 2, triploid: 3, tetraploid: 4}[L.s.sl as 'normal'] ?? 2;
        const kinds = 8;
        const R = rand(5);
        g.lineCap = 'round';
        for (let k = 0; k < kinds; k++) {
          const copies = sets + (L.s.sl === 'trisomy' && k === 2 ? 1 : 0);
          for (let j = 0; j < copies; j++) {
            const x = 22 + k * ((W - 44) / (kinds - 1)) + (j - (copies - 1) / 2) * 7;
            const y = H * 0.5 + (R() - 0.5) * 12;
            const len = 16 + (kinds - k) * 4.5;
            g.strokeStyle = j >= sets || (sets > 2 && j >= 2) ? '#C4261A' : '#5B2E7A';
            g.lineWidth = 4.5;
            g.beginPath();
            g.moveTo(x, y - len);
            g.lineTo(x, y + len);
            g.stroke();
          }
        }
        g.fillStyle = '#1D1B16';
        g.font = '700 20px sans-serif';
        g.textAlign = 'center';
        g.fillText(`${n} nhiễm sắc thể`, W / 2, H - 10);
      });
    };
  },

  // hai hàng cây (giống A, giống B) cao thấp theo năng suất ở lượng đạm đang chọn; hạt phân rơi xuống hàng đang đo; cân hiện năng suất
  MODIFICATION: (c) => {
    const tr = truth(c);
    const grain = stream(c.root, 14, 0.02, '#F4F4F0', -1.4, 0.3, -0.35, 0.9, 1.9, -1);
    const show = display(c.root, 2.2, 0.12, 0.3575, 0.6, 0.13);
    const h = [0.4, 0.4];
    return (dt, L, T) => {
      ['A', 'B'].forEach((g, i) => {
        const y = num(tr(L, {...L.s, g}).y, 3);
        h[i] += (clamp(0.35 + y / 7, 0.3, 1.7) - h[i]) * Math.min(1, dt * 2);
        c.part(i + 1)?.scale.set(1, h[i], 1);
      });
      grain(T, L.p.N / 200, 0.7, -1.4, 0.3, L.s.g === 'B' ? 0.45 : -0.35);
      show(`${fix(num(tr(L).y), 1)} t/ha`);
    };
  },

  // khung ô tiêu chuẩn chuyển sang khu đang chọn; các cá thể trong ô sáng lên đúng bằng số đếm được
  QUADRAT: (c) => {
    const tr = truth(c);
    const X: Record<string, number> = {A: -1.7, B: -0.6, C: 0.5};
    const found = dots(c.root, 30, 0.045, '#FFE27A', 0.9);
    let x = -0.6;
    return (dt, L, T) => {
      x += ((X[L.s.site] ?? -0.6) - x) * Math.min(1, dt * 3);
      const frame = c.part(1);
      // khung nhấc lên khi đang chuyển chỗ rồi hạ xuống ô mới
      frame?.position.set(x, 0.02 + Math.min(0.3, Math.abs((X[L.s.site] ?? -0.6) - x)), 0);
      const n = Math.round(num(tr(L).n, 0));
      const R = rand((L.s.site ?? 'A').charCodeAt(0));
      for (let i = 0; i < 30; i++) found.put(i, x + (R() - 0.5) * 0.8, 0.26 + 0.03 * Math.sin(T * 4 + i), (R() - 0.5) * 0.8, i < n ? 1 : 0);
    };
  },

  // khung ô chuyển sang quần xã đang chọn; năm loài hiện bằng năm màu, mỗi màu đúng số cá thể đếm được
  COMMUNITY: (c) => {
    const tr = truth(c);
    const X: Record<string, number> = {forest: -1.7, grass: -0.6, rice: 0.5};
    const COLORS = ['#35C46A', '#FFE27A', '#FF8FB1', '#B48CFF', '#7FD3FF'];
    const sp = COLORS.map((col) => dots(c.root, 14, 0.045, col, 0.9));
    let x = -0.6;
    return (dt, L, T) => {
      const want = X[L.s.site] ?? -0.6;
      x += (want - x) * Math.min(1, dt * 3);
      c.part(1)?.position.set(x, 0.02 + Math.min(0.3, Math.abs(want - x)), 0);
      const row = tr(L);
      const R = rand((L.s.site ?? 'f').charCodeAt(0) * 3);
      ['a', 'b', 'c', 'd', 'e'].forEach((key, k) => {
        const n = Math.round(num(row[key], 0));
        for (let i = 0; i < 14; i++) sp[k].put(i, x + (R() - 0.5) * 0.9, 0.26 + 0.03 * Math.sin(T * 4 + i + k), (R() - 0.5) * 0.9, i < n ? 1 : 0);
      });
    };
  },

  // cá bơi trong bể (thiếu oxygen thì ngoi lên mặt nước), cây thủy sinh nhả bọt khí theo ánh sáng, đèn sáng theo số giờ chiếu, máy hiện O₂ hòa tan
  MINI_ECOSYSTEM: (c) => {
    const tr = truth(c);
    const fish = dots(c.root, 10, 0.07, '#FF8A3D', 0.5);
    fish.mesh.scale.set(1, 0.6, 0.5);
    const o2 = stream(c.root, 18, 0.018, '#FFFFFF', -0.5, 0.15, 0, 0.6, 1.6);
    const lamp = glow(c.root, -0.5, 1.09, -0.2, 0.3, '#FFF3C4');
    const show = display(c.root, 1.7, 0.15, 0.506, 0.28, 0.1);
    return (_dt, L, T) => {
      const row = tr(L);
      const O2 = num(row.O2, 5);
      const gasp = clamp((3 - O2) / 3, 0, 1);
      const n = Math.round(L.p.fi);
      for (let i = 0; i < 10; i++) {
        const a = T * (0.5 + i * 0.07) + i * 1.7;
        // InstancedMesh bị co theo y, z để ra dáng cá nên chia lại toạ độ
        fish.put(i, -0.5 + 0.95 * Math.cos(a), (0.3 + (i % 4) * 0.09 + gasp * (0.7 - 0.3 - (i % 4) * 0.09)) / 0.6, (0.3 * Math.sin(a * 1.3)) / 0.5, i < n ? 1 : 0);
      }
      o2(T, (L.p.pl / 10) * (L.p.L / 16), 0.5);
      lamp(L.p.L / 20);
      show(fix(O2, 1));
    };
  },
};
