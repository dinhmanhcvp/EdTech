import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {SPECS, type AssemblyKind} from '../utils/lab/hands/assembly';
import {CIRC_GAIN, DWELL, FASTENERS, HOLD_REV, KITS, TOOLS, allTight, crossOrder, driveRev, holdingMessage, initialScrews, orderMistake, seated, toolFor, toolMistake} from '../utils/lab/hands/fasteners';

const kinds = Object.keys(SPECS) as AssemblyKind[];
describe('tháo lắp bằng dụng cụ: luật vít, bu-lông, phe, cảo', () => {
  it('mọi chi tiết giữ khai báo đúng chi tiết có thật; mọi dụng cụ cần đều có trong hộp của bài', () => {
    for (const kind of kinds) {
      const ids = SPECS[kind].parts.map((p) => p.id);
      for (const [id, f] of Object.entries(FASTENERS[kind])) {
        expect(ids, `${kind}.${id}`).toContain(id);
        expect(KITS[kind], `${kind}.${id}`).toContain(f.tool);
        expect(KITS[kind], `${kind}.${id} (siết)`).toContain(toolFor(f, 'tighten'));
        expect(f.count).toBeGreaterThan(0);
      }
      for (const t of KITS[kind]) expect(TOOLS[t], `${kind}:${t}`).toBeTruthy();
      // hộp có ít nhất một dụng cụ KHÔNG dùng tới: học sinh phải chọn, không phải lấy hết
      const used = new Set(Object.values(FASTENERS[kind]).flatMap((f) => [f.tool, toolFor(f, 'tighten')]));
      expect(KITS[kind].some((t) => !used.has(t)), kind).toBe(true);
    }
  });

  it('thứ tự đường chéo: 4 con là 1-3-2-4, 6 con xen kẽ hai nửa; nới đi ngược lại', () => {
    expect(crossOrder(4)).toEqual([0, 2, 1, 3]);
    expect(crossOrder(6)).toEqual([0, 3, 1, 4, 2, 5]);
    const fa = FASTENERS.engine.head;
    expect(orderMistake(fa, [false, false, false, false], 0, 'tighten')).toBeNull();
    expect(orderMistake(fa, [false, false, false, false], 1, 'tighten')).toContain('đường chéo');
    expect(orderMistake(fa, [true, false, false, false], 2, 'tighten')).toBeNull();
    expect(orderMistake(fa, [true, true, true, true], 3, 'loosen')).toBeNull();
    expect(orderMistake(fa, [true, true, true, true], 0, 'loosen')).toContain('con số 4');
    expect(orderMistake(FASTENERS.motor.cowl, [true, true, true, true], 2, 'loosen')).toBeNull(); // vít thường: tuỳ ý
  });

  it('sai dụng cụ bị chặn kèm tên dụng cụ đúng; nắp máy tháo bằng tuýp 13 nhưng siết bằng cờ lê lực', () => {
    const cowl = FASTENERS.motor.cowl;
    expect(toolMistake(cowl, 'loosen', 'ph2')).toBeNull();
    expect(toolMistake(cowl, 'loosen', 'sock13')).toContain('Tua vít chữ thập PH2');
    const head = FASTENERS.engine.head;
    expect(toolFor(head, 'loosen')).toBe('sock13');
    expect(toolFor(head, 'tighten')).toBe('torque');
    expect(toolMistake(head, 'tighten', 'sock13')).toContain('Cờ lê lực');
  });

  it('chi tiết còn vít giữ thì không nhấc được; lắp lại thì vít còn lỏng (trừ chi tiết ép) và phải siết đủ mới xong', () => {
    const built = initialScrews('motor', SPECS.motor);
    expect(built.cowl).toEqual([true, true, true, true]);
    expect(holdingMessage('motor', 'cowl', built.cowl)).toContain('Còn 4');
    expect(holdingMessage('motor', 'rotor', undefined)).toBeNull(); // rôto không có vít
    expect(allTight('motor', built)).toBe(true);
    const apart = initialScrews('pc', SPECS.pc);
    expect(allTight('pc', apart)).toBe(false);
    expect(seated(FASTENERS.motor.pulley)).toEqual([true]); // ép vào: không cần siết lại
    expect(seated(FASTENERS.motor.cowl)).toEqual([false, false, false, false]);
    expect(seated(undefined)).toBeUndefined();
  });

  it('mọi mô hình dụng cụ có trong tools-parts.glb', () => {
    const buf = readFileSync(join(__dirname, '../../public/models/tools-parts.glb'));
    const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {nodes: {name?: string}[]};
    const names = json.nodes.map((n) => n.name);
    for (const t of Object.values(TOOLS)) expect(names, t.id).toContain(t.model);
    for (const n of ['ScrewPh', 'BoltHex', 'MagDish', 'ToolRack']) expect(names, n).toContain(n);
  });
});

describe('vặn vít bằng cử chỉ 2D (webcam thường, không xoay cổ tay)', () => {
  it('lướt qua đầu vít chưa đủ thời gian giữ thì không vặn; giữ đủ thì một vòng mỗi HOLD_REV giây', () => {
    expect(driveRev(DWELL - 0.01, 0.016, 0, 'loosen')).toBe(0);
    expect(driveRev(DWELL, HOLD_REV, 0, 'loosen')).toBeCloseTo(1, 10);
    expect(driveRev(1, 0.1, 0, 'tighten')).toBeCloseTo(0.1 / HOLD_REV, 10);
  });
  it('vẽ vòng tròn quanh đầu vít vặn nhanh hơn, và chỉ chiều đúng mới tính (nới = ngược chiều kim đồng hồ, siết = thuận)', () => {
    const quarter = Math.PI / 2;
    expect(driveRev(0, 0.016, quarter, 'loosen')).toBeCloseTo((quarter / (2 * Math.PI)) * CIRC_GAIN, 10); // chưa đủ DWELL: chỉ có phần vòng tròn
    expect(driveRev(0, 0.016, -quarter, 'loosen')).toBe(0);
    expect(driveRev(0, 0.016, -quarter, 'tighten')).toBeCloseTo((quarter / (2 * Math.PI)) * CIRC_GAIN, 10);
    expect(driveRev(DWELL, 0.016, quarter, 'tighten')).toBeCloseTo(0.016 / HOLD_REV, 10); // vòng sai chiều không cộng thêm
    expect(driveRev(DWELL, 0.016, quarter, 'loosen')).toBeGreaterThan(driveRev(DWELL, 0.016, 0, 'loosen'));
  });
});
