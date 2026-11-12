import {describe, expect, it} from 'vitest';
import {ORGANICS} from '../utils/presets/hoaScene2';
import {closestApproach} from '../utils/presets/lyScene2';
import {alphaTracks, countFormula, fieldLines3D, organic3D, outerOrbitals, shellCounts, turnDeg} from '../utils/presets/scene3dExtra';
import {STRUCT} from '../utils/presets/sinh2Scene';

describe('3D bổ sung: cấu hình electron theo lớp', () => {
  it('tổng electron các lớp bằng Z và đúng số quen thuộc', () => {
    for (let z = 1; z <= 36; z++) expect(shellCounts(z).reduce((a, b) => a + b, 0)).toBe(z);
    expect(shellCounts(11)).toEqual([2, 8, 1, 0]); // Na
    expect(shellCounts(26)).toEqual([2, 8, 14, 2]); // Fe
    expect(shellCounts(29)).toEqual([2, 8, 18, 1]); // Cu (ngoại lệ)
  });
  it('orbital p lớp ngoài cùng theo quy tắc Hund', () => {
    expect(outerOrbitals(7)).toEqual({n: 2, s: 2, p: [1, 1, 1]}); // N: ba electron độc thân
    expect(outerOrbitals(8).p).toEqual([2, 1, 1]); // O
    expect(outerOrbitals(10).p).toEqual([2, 2, 2]); // Ne
    expect(outerOrbitals(1)).toEqual({n: 1, s: 1, p: [0, 0, 0]});
  });
});

describe('3D bổ sung: hợp chất hữu cơ', () => {
  it.each(Object.keys(ORGANICS))('%s: số C, H, O của mô hình khớp công thức phân tử', (key) => {
    const m = ORGANICS[key];
    const {atoms} = organic3D(m);
    const want = countFormula(m.formula);
    for (const el of ['C', 'H', 'O']) expect(atoms.filter((a) => a.el === el).length).toBe(want[el] ?? 0);
  });
  it('không có hai nguyên tử chồng lên nhau', () => {
    for (const m of Object.values(ORGANICS)) {
      const {atoms} = organic3D(m);
      for (let i = 0; i < atoms.length; i++)
        for (let j = i + 1; j < atoms.length; j++) expect(Math.hypot(...(atoms[i].pos.map((c, k) => c - atoms[j].pos[k]) as [number, number, number]))).toBeGreaterThan(0.55);
    }
  });
});

describe('3D bổ sung: điện trường và tán xạ α', () => {
  it('đường sức quay quanh trục: có nhiều mặt phẳng và điểm đầu cách điện tích dương một đoạn nhỏ', () => {
    const lines = fieldLines3D(3, -3, 0.5);
    expect(lines.length).toBeGreaterThan(20);
    const start = lines[0][0];
    expect(Math.hypot(start[0] + 25 / 80 + 0.5 * 2.75, start[1], start[2])).toBeLessThan(0.2);
    expect(fieldLines3D(0, 0, 0.5)).toEqual([]);
  });
  it('hạt α đâm gần hạt nhân thì bật ngược, mẫu Thomson thì gần như đi thẳng', () => {
    const rutherford = alphaTracks(closestApproach(79, 5)).filter((t) => turnDeg(t) > 90).length;
    const thomson = alphaTracks(0.04).filter((t) => turnDeg(t) > 90).length;
    expect(rutherford).toBeGreaterThan(0);
    expect(thomson).toBe(0);
  });
});

describe('3D bổ sung: nhiễm sắc thể', () => {
  it('mọi dạng cấu trúc có ≤ 9 gene mỗi NST (đủ chỗ cho cảnh)', () => {
    for (const r of Object.values(STRUCT)) for (const seq of [...r.before, ...r.after]) expect(seq.length).toBeLessThanOrEqual(9);
  });
});

// ------------------------------------------------------------------ cảnh Blender
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {BLENDER_SCENES} from '../engines/families/Scenes3DBlender';
import {gaugeDeg, gaugeKPa, leverAngleDeg, neutronCount, polyAt, submerged, WIRE_RED} from '../utils/presets/scene3dExtra';

describe('3D Blender: hợp đồng tệp board-parts.glb', () => {
  it('có đủ các bộ phận mà cảnh gọi theo tên', () => {
    const buf = readFileSync(join(__dirname, '../../public/models/board-parts.glb'));
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {nodes: {name?: string}[]};
    const names = new Set(json.nodes.map((n) => n.name));
    for (const n of ['LeverBar', 'LeverFrame', 'Weight', 'TankGlass', 'TankFrame', 'TankWater', 'FloatCube', 'PressureProbe', 'GaugeBody', 'GaugeNeedle', 'CellBeaker', 'CellStatic', 'Electrode', 'Deposit', 'ReactorVessel', 'ReactorBase', 'FuelRod', 'ControlRod']) expect(names.has(n), n).toBe(true);
  });
  it('bốn template Blender nằm trong HAS_3D', () => {
    expect(Object.keys(BLENDER_SCENES).sort()).toEqual(['CHEM_ELECTROLYSIS', 'PHYS_FISSION_REACTOR', 'PHYS_FLUID_PRESSURE', 'PHYS_MOMENT_LEVER']);
  });
});

describe('3D Blender: phần tính', () => {
  it('đòn bẩy: bên trái nặng hơn thì đầu trái hạ (góc dương), cân bằng thì 0, bị chặn ±18°', () => {
    expect(leverAngleDeg(4, 2, 2, 4)).toBe(0);
    expect(leverAngleDeg(6, 2, 2, 2)).toBeGreaterThan(0);
    expect(leverAngleDeg(0, 2, 10, 4)).toBe(-18);
  });
  it('bể chất lỏng: vật nổi ngập ρ_vật/ρ, vật nặng chìm hết; kim đồng hồ chạy 270°', () => {
    expect(submerged(1000, 600)).toBeCloseTo(0.6);
    expect(submerged(1000, 2700)).toBe(1);
    expect(gaugeKPa(1000, 0)).toBeCloseTo(101.325);
    expect(gaugeDeg(0)).toBe(-135);
    expect(gaugeDeg(1500)).toBe(135);
    expect(gaugeDeg(9999)).toBe(135);
  });
  it('dây điện: điểm đầu và cuối của đường gấp khúc; số neutron tăng theo quần thể nhưng ≤ 80', () => {
    expect(polyAt(WIRE_RED, 0)).toEqual(WIRE_RED[0]);
    expect(polyAt(WIRE_RED, 0.999999)[1]).toBeCloseTo(WIRE_RED[3][1], 2);
    expect(neutronCount(1)).toBeLessThan(neutronCount(100));
    expect(neutronCount(1e9)).toBe(80);
  });
});

// ------------------------------------------------------------------ Blender 2 (Vật lí) và kéo thả
import {BLENDER2_SCENES} from '../engines/families/Scenes3DBlender2';
import {CIRC_PATHS, kinematicsX, niceMax, rampLayout} from '../utils/presets/scene3dPhys';

describe('3D Blender 2: hợp đồng board-parts2.glb và phần tính', () => {
  it('có đủ bộ phận theo tên', () => {
    const buf = readFileSync(join(__dirname, '../../public/models/board-parts2.glb'));
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {nodes: {name?: string}[]};
    const names = new Set(json.nodes.map((n) => n.name));
    for (const n of ['Track', 'Cart', 'Coil', 'SpringStand', 'Mass', 'RampPlank', 'Protractor', 'Block', 'RampBase', 'AtwoodStand', 'Pulley', 'VacuumTube', 'VacuumCaps', 'CircBoard', 'Battery', 'ResistorA', 'ResistorB', 'MeterBody', 'MeterNeedle', 'WiresS', 'WiresP']) expect(names.has(n), n).toBe(true);
    expect(Object.keys(BLENDER2_SCENES).sort()).toEqual(['PHYS_COLLISION_1D', 'PHYS_DC_CIRCUIT', 'PHYS_KINEMATICS_1D', 'PHYS_NEWTON_LAWS', 'PHYS_SHM', 'PHYS_SPRING_HOOKE', 'PHYS_WORK_ENERGY']);
  });
  it('động học: vị trí quy về đệm khí [−5, 5]; rơi tự do dừng ở chạm đáy', () => {
    for (const t of [0, 3, 8]) {
      const r = kinematicsX('accel', 2, 1, 20, t);
      expect(r.X).toBeGreaterThanOrEqual(-5.0001);
      expect(r.X).toBeLessThanOrEqual(5.0001);
    }
    const f = kinematicsX('fall', 0, 0, 20, 99);
    expect(f.x).toBeCloseTo(20, 5);
  });
  it('dốc vừa khung; thang đo chọn giá trị tròn; đường mạch có cả hai kiểu', () => {
    for (const [h, a] of [[1, 10], [5, 30], [10, 60], [10, 10]]) {
      const R = rampLayout(h, a);
      expect(R.L * Math.cos((a * Math.PI) / 180) * R.ku).toBeLessThanOrEqual(5.76);
      expect(R.topY).toBeLessThanOrEqual(5.76);
    }
    expect(niceMax(0.7, [0.1, 1, 10])).toBe(1);
    expect(niceMax(99, [0.1, 1, 10])).toBe(10);
    expect(CIRC_PATHS.series).toHaveLength(1);
    expect(CIRC_PATHS.parallel).toHaveLength(2);
  });
});

// ------------------------------------------------------------------ Blender 3 (Hóa, Sinh)
import {BLENDER3_SCENES} from '../engines/families/Scenes3DBlender3';
import {anticodon, formedCount, readingFrame} from '../utils/presets/scene3dExtra';

describe('3D Blender 3: hợp đồng board-parts3.glb và dịch mã', () => {
  it('có đủ bộ phận theo tên và đủ năm cảnh', () => {
    const buf = readFileSync(join(__dirname, '../../public/models/board-parts3.glb'));
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {nodes: {name?: string}[]};
    const names = new Set(json.nodes.map((n) => n.name));
    for (const n of ['TubeRack', 'TestTube', 'DropperBottle', 'Bunsen', 'WireLoop', 'Dish', 'GBeaker', 'SaltBridge', 'Plate', 'GalvMeter', 'GalvNeedle', 'Plug', 'Ribosome', 'TRNA']) expect(names.has(n), n).toBe(true);
    expect(Object.keys(BLENDER3_SCENES).sort()).toEqual(['BIO_TRANSCRIPTION_TRANSLATION', 'CHEM_ALKALI_EARTH', 'CHEM_HALOGEN_LAB', 'CHEM_REDOX', 'CHEM_VIRTUAL_TESTTUBE']);
  });
  it('khung đọc bắt đầu ở AUG, anticodon bổ sung codon, số amino acid đã nối tăng theo vị trí ribosome', () => {
    const f = readingFrame('GGAUGUUCUAAGG');
    expect(f.start).toBe(2);
    expect(f.codons).toEqual(['AUG', 'UUC', 'UAA']);
    expect(f.aa).toEqual(['M', 'F', '*']);
    expect(anticodon('AUG')).toBe('UAC');
    expect(formedCount(f, 0)).toBe(0);
    expect(formedCount(f, 1.2)).toBe(1);
    expect(formedCount(f, 99)).toBe(2); // mã kết thúc không thành amino acid
    expect(readingFrame('GGGCCC')).toEqual({start: -1, codons: [], aa: []});
  });
});

// ------------------------------------------------------------------ Blender 4 (cơ quan, sinh vật, phân tử, phổ)
import {PRESETS} from '../utils/presets';
import {BLENDER4_SCENES} from '../engines/families/Scenes3DBlender4';
import {BLENDER_ORGANS, FLOW_DIG, FLOW_EAR, FLOW_NEPH, FLOW_RES} from '../engines/families/Scenes3DOrgans2';
import {capture, nearestPyramid, scatter, stemPoints} from '../utils/presets/scene3dExtra';

describe('3D Blender 4: hợp đồng board-parts4.glb và phần tính', () => {
  it('có đủ bộ phận theo tên: mỗi id bộ phận của sơ đồ cơ quan là một lưới, cùng sinh vật và thiết bị', () => {
    const buf = readFileSync(join(__dirname, '../../public/models/board-parts4.glb'));
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {nodes: {name?: string}[]};
    const names = new Set(json.nodes.map((n) => n.name));
    for (const [id, pre] of [['BIO_DIGESTIVE_SYSTEM', 'dig_'], ['BIO_RESPIRATORY_SYSTEM', 'res_'], ['BIO_EAR_HEARING', 'ear_'], ['BIO_NEPHRON', 'neph_']] as const) {
      const parts = (PRESETS[id].data as {parts: {id: string}[]}).parts;
      for (const p of parts) expect(names.has(pre + p.id), pre + p.id).toBe(true);
      expect(Object.keys(BLENDER_ORGANS)).toContain(id);
    }
    for (const n of ['PlantPot', 'Lamp', 'Leaf', 'TipCap', 'PersonM', 'PersonF', 'Grass', 'Grasshopper', 'Frog', 'Snake', 'Eagle', 'Net', 'Arena', 'Beetle', 'Spectrometer']) expect(names.has(n), n).toBe(true);
    expect(Object.keys(BLENDER4_SCENES)).toHaveLength(8);
  });
  it('đường đi của cơ quan có đủ điểm và nằm trong khung cảnh', () => {
    for (const f of [FLOW_DIG, FLOW_EAR, FLOW_NEPH, ...FLOW_RES]) {
      expect(f.length).toBeGreaterThan(4);
      for (const [x, y] of f) {
        expect(Math.abs(x)).toBeLessThan(6);
        expect(y).toBeGreaterThan(-2);
        expect(y).toBeLessThan(8);
      }
    }
  });
  it('thân cây: chậu đứng nghiêng về phía sáng khi còn đỉnh, cắt đỉnh thì thẳng; chậu nằm ngang cong lên', () => {
    const lean = stemPoints('photo', 60, true, 1);
    expect(lean[lean.length - 1][0]).toBeGreaterThan(0.5);
    expect(stemPoints('photo', 60, false, 1)[24][0]).toBeCloseTo(0, 6);
    const grav = stemPoints('grav', 0, true, 1);
    expect(grav[1][0]).toBeGreaterThan(grav[1][1]); // đoạn đầu nằm ngang
    expect(grav[24][1]).toBeGreaterThan(1.5); // cuối cùng đã cong lên
    expect(stemPoints('grav', 0, false, 1)[24][1]).toBeCloseTo(0, 6); // cắt đỉnh thì không cong
  });
  it('tháp tuổi chọn dạng gần nhất; bắt lại lấy n con gần lưới nhất và đếm con đánh dấu', () => {
    expect(nearestPyramid(240, {expand: 250, stable: 170, decline: 90})).toBe('expand');
    expect(nearestPyramid(100, {expand: 250, stable: 170, decline: 90})).toBe('decline');
    const pts = scatter(400);
    expect(pts).toHaveLength(400);
    const r = capture(pts, 50, 60, 0, 0);
    expect(r.idx).toHaveLength(60);
    expect(new Set(r.idx).size).toBe(60);
    expect(r.marked).toBe(r.idx.filter((i) => i < 50).length);
  });
});
