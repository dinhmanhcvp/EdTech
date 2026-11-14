import React from 'react';
import {readFileSync} from 'fs';
import {join} from 'path';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {HandsLab} from '../engines/families/HandsLab';
import {LAB_ALIAS, LESSONS, LESSON_BY_ID} from '../engines/families/labLessons';
import {BENCH_MOVES, benchManual, benchOf, dragT, grabOf} from '../utils/lab/hands/benchMoves';
import {EXPERIMENT_BY_ID} from '../utils/lab/chem/experiments';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';

afterEach(cleanup);

/** tên mọi nút trong một tệp GLB (đọc khối JSON, không cần giải nén hình học) */
const nodes = (file: string): Set<string> => {
  const b = readFileSync(join(__dirname, '../../public/models', file));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]};
  return new Set(json.nodes.map((n) => n.name));
};
const GLB = {phys: nodes('bench-phys.glb'), bio: nodes('bench-bio.glb')};
const sgk = LESSONS.filter((l) => l.kind === 'sgk');

describe('/lab: bài thực hành SGK là thí nghiệm 3D điều khiển bằng tay, không thiếu bài nào', () => {
  it('danh mục không trùng mã; bài đã gộp không còn trong danh sách và trỏ về bài có thật', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const [old, kept] of Object.entries(LAB_ALIAS)) {
      expect(LESSON_BY_ID.has(old), old).toBe(false);
      expect(LESSON_BY_ID.has(kept), `${old} → ${kept}`).toBe(true);
    }
    for (const l of LESSONS) expect(l.subject, l.id).toBeTruthy();
  });

  it('mọi bài Vật lí / Sinh học của SGK đều có trong danh mục (hoặc đã gộp vào bài tay)', () => {
    for (const [prefix, list] of [['PHYS_LAB_', PHYS_EXPERIMENTS], ['BIO_LAB_', BIO_EXPERIMENTS]] as const) for (const e of list) expect(LESSON_BY_ID.has(LAB_ALIAS[prefix + e.id] ?? prefix + e.id), e.id).toBe(true);
  });

  for (const l of sgk) {
    it(`${l.id}: có cảnh 3D (bộ dụng cụ Blender hoặc bàn hóa học 3D) và hướng dẫn`, () => {
      const chem = /^CHEM_LAB_(.+)$/.exec(l.id)?.[1];
      if (chem) return expect(EXPERIMENT_BY_ID[chem], 'bài của bàn hóa học 3D').toBeTruthy();
      const b = benchOf(l.id)!;
      expect(b, 'bài đo đạc').toBeTruthy();
      expect(GLB[b.file].has(`Set_${b.e.id}`), `Set_${b.e.id} trong bench-${b.file}.glb`).toBe(true);
      for (const m of BENCH_MOVES[b.e.id] ?? []) {
        expect(GLB[b.file].has(`Mov_${b.e.id}_${m.n}`), `Mov_${b.e.id}_${m.n}`).toBe(true);
        expect(b.e.sliders.some((p) => p.key === m.param), `thanh trượt ${m.param}`).toBe(true);
      }
      const man = benchManual(l.id)!;
      expect(man.steps.length).toBe(b.e.steps.length);
      expect(man.tools!.length).toBeGreaterThan(0);
    });
  }

  it('phần động chỉ khai báo cho bài có thật', () => {
    const ids = new Set([...PHYS_EXPERIMENTS, ...BIO_EXPERIMENTS].map((e) => e.id));
    for (const id of Object.keys(BENCH_MOVES)) expect(ids.has(id), id).toBe(true);
  });

  it('mở bài đo: bảng điều khiển gọn (không còn hình 2D, không ô chọn bài), đo và làm theo mẫu được; tab Hướng dẫn lấy từ bài', () => {
    const r = render(<HandsLab experiment="PHYS_LAB_HOOKE" />);
    expect(r.getByTestId('phys-bench').getAttribute('data-experiment')).toBe('HOOKE');
    expect(r.queryByTestId('phys-scene')).toBeNull();
    expect(r.queryByTestId('phys-experiment')).toBeNull();
    fireEvent.click(r.getByTestId('phys-measure'));
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('1');
    fireEvent.click(r.getByTestId('phys-sample'));
    fireEvent.click(r.getByTestId('phys-check'));
    expect(r.getByTestId('phys-verdict').getAttribute('data-ok')).toBe('1');
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.getByTestId('lab-manual').textContent).toContain('Nút ĐO');
  });

  it('mở bài Hóa SGK: bàn hóa học 3D chọn sẵn đúng bài', () => {
    const r = render(<HandsLab experiment="CHEM_LAB_HALIDE_ID" />);
    expect((r.getByTestId('chem3d-experiment') as HTMLSelectElement).value).toBe('HALIDE_ID');
  });

  it('cầm trực tiếp dụng cụ: kéo bộ phận một quãng đổi đúng thang trượt, kẹp trong 0..1; bộ phận chỉ phóng to kéo ngang', () => {
    const boyle = grabOf('BOYLE', 'V')!;
    expect(boyle.what).toBe('pit-tông');
    // pit-tông lên cao hơn = thể tích lớn: kéo nửa quãng đi được nửa thang
    expect(dragT(boyle, 0, (boyle.b - boyle.a) / 2)).toBeCloseTo(0.5);
    expect(dragT(boyle, 0.9, 5)).toBe(1);
    expect(dragT(boyle, 0.1, -5)).toBe(0);
    // thang đảo chiều (cổng quang hạ thấp khi quãng rơi dài): kéo xuống = tăng
    expect(dragT(grabOf('FREE_FALL_G', 'h')!, 0.2, -0.55)).toBeCloseTo(0.7);
    // bộ phận chỉ phóng to: 2,2 đơn vị ngang = cả thang
    expect(dragT(grabOf('NEWTON2', 'F')!, 0.25, 1.1)).toBeCloseTo(0.75);
    // quả cân treo của lò xo là bộ phận cầm được; chính lò xo (co giãn) thì không
    expect(grabOf('HOOKE', 'm')!.n).toBe(2);
  });

  it('hướng dẫn nói rõ dụng cụ nào cầm kéo được, thông số khác vẫn dùng con trượt', () => {
    const t = benchManual('PHYS_LAB_BOYLE')!.tools!.join(' ');
    expect(t).toContain('Pit-tông: chụm vào chính dụng cụ');
    expect(benchManual('PHYS_LAB_OHM_LAW')!.tools!.join(' ')).toContain('Con trượt');
  });
});
