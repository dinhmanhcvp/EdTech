import React from 'react';
import {readFileSync} from 'fs';
import {join} from 'path';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {DISSECTIONS, DISSECT_BY_ID, TAG_X, current, cutAdvance, dissectReducer, newDissect, pathLength, pointAt, reachable, stepDone, tagSlots, toolOf, type DAction, type DissectSpec, type DissectState} from '../utils/lab/hands/dissect';
import {ALL_EXPERIMENTS, HandsLab} from '../engines/families/HandsLab';
import {LESSON_BY_ID} from '../engines/families/labLessons';
import {MANUAL} from '../utils/lab/hands/manual';
import {SUBJECT_OF} from '../utils/lab/hands/sims/catalog';
import {HEART_LOOPS, HEART_PARTS, cardiacPhase} from '../engines/families/heart3d';
import {PRESETS} from '../utils/presets';

afterEach(cleanup);

/** tên các nút trong một GLB (khối JSON đầu tệp) */
function nodes(file: string): Set<string> {
  const b = readFileSync(join(__dirname, '../../public/models', file));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]};
  return new Set(json.nodes.map((n) => n.name));
}
const run = (spec: DissectSpec, acts: DAction[], st: DissectState = newDissect()) => acts.reduce((s, a) => dissectReducer(spec, s, a), st);
/** làm đúng từng bước của một bài: cầm đúng dụng cụ rồi thao tác */
function perfect(spec: DissectSpec): DAction[] {
  return spec.steps.flatMap((s): DAction[] => {
    const tool = toolOf(s);
    const take: DAction[] = tool ? [{t: 'tool', tool}] : [];
    switch (s.kind) {
      case 'pin':
        return [...take, ...s.targets.map((_, i): DAction => ({t: 'pin', i}))];
      case 'cut':
        return [...take, {t: 'cut', s: 0.4}, {t: 'cut', s: 0.98}];
      case 'open':
        return [...take, ...s.flaps.map((flap): DAction => ({t: 'open', flap, v: 1}))];
      case 'drop':
        return [...take, {t: 'drop'}];
      case 'name':
        return s.organs.map((organ): DAction => ({t: 'name', organ}));
    }
  });
}

describe('bài mổ / quan sát cấu tạo (Sinh)', () => {
  it('năm bài: ếch, tim lợn, cá, hoa, mô hình người — đều nằm trong nhóm thực hành SGK của môn Sinh, có hướng dẫn đủ bước', () => {
    expect(DISSECTIONS.map((d) => d.model).sort()).toEqual(['FISH', 'FLOWER', 'FROG', 'HUMAN', 'PIG']);
    for (const d of DISSECTIONS) {
      expect(ALL_EXPERIMENTS.some(([id]) => id === d.id), d.id).toBe(true);
      expect(SUBJECT_OF[d.id]).toBe('sinh');
      expect(LESSON_BY_ID.get(d.id)?.kind, d.id).toBe('sgk');
      expect(MANUAL[d.id].steps.length).toBe(d.steps.length);
      // mọi cơ quan có tên + chức năng, và được gọi tên ở đúng một bước
      for (const [id, o] of Object.entries(d.organs)) {
        expect(o.fn.length, `${d.id}/${id}`).toBeGreaterThan(20);
        expect(d.steps.filter((s) => s.kind === 'name' && s.organs.includes(id)).length, `${d.id}/${id}`).toBe(1);
      }
      // lớp nào cũng được mở ở một bước kẹp; bài nào cũng dùng ít nhất 3 loại thao tác
      for (const f of Object.keys(d.flaps)) expect(d.steps.some((s) => s.kind === 'open' && s.flaps.includes(f)), `${d.id}/${f}`).toBe(true);
      expect(new Set(d.steps.map((s) => s.kind)).size, d.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('mô hình Blender có đủ nút cho mọi cơ quan, lớp mở, khay và năm dụng cụ', () => {
    const g = nodes('dissect-parts.glb');
    for (const n of ['TRAY', 'TOOLTRAY', 'TOOL_scalpel', 'TOOL_scissors', 'TOOL_forceps', 'TOOL_pin', 'TOOL_dropper']) expect(g.has(n), n).toBe(true);
    for (const d of DISSECTIONS) {
      expect([...g].some((n) => n.startsWith(`${d.model}_body`)), d.model).toBe(true);
      for (const [id, o] of Object.entries(d.organs)) expect(g.has(o.mesh ? `${d.model}_${o.mesh}` : `${d.model}_o_${id}`), `${d.model} ${id}`).toBe(true);
      // lớp không có lưới riêng chỉ được phép khi là nhóm gom các cơ quan đi theo (chùm nhị)
      for (const f of Object.keys(d.flaps)) expect(g.has(`${d.model}_f_${f}`) || Object.values(d.organs).some((o) => o.on === f), `${d.model} lớp ${f}`).toBe(true);
    }
  });

  it.each(DISSECTIONS.map((d) => [d.id]))('%s: làm đúng trình tự thì xong mọi bước', (id) => {
    const spec = DISSECT_BY_ID[id];
    const st = run(spec, perfect(spec));
    expect(current(spec, st)).toBe(spec.steps.length);
    expect(st.warn).toBe('');
  });

  it.each(DISSECTIONS.map((d) => [d.id]))('%s: gọi tên cơ quan không bắt buộc — bỏ qua mọi lần chỉ tên vẫn xong bài, cơ quan vẫn chỉ được sau khi lộ ra', (id) => {
    const spec = DISSECT_BY_ID[id];
    const st = run(spec, perfect(spec).filter((a) => a.t !== 'name'));
    expect(current(spec, st)).toBe(spec.steps.length);
    expect(st.named).toEqual([]);
    for (const organ of Object.keys(spec.organs)) expect(reachable(spec, st, organ), organ).toBe(true);
  });

  it('cầm sai dụng cụ, làm sai thứ tự, chỉ cơ quan chưa lộ ra: không tính và có lời nhắc', () => {
    const frog = DISSECT_BY_ID['dissect-frog'];
    let st = run(frog, [{t: 'tool', tool: 'scalpel'}, {t: 'pin', i: 0}]);
    expect(st.pins[0]).toBeUndefined();
    expect(st.warn).toContain('kim ghim');
    st = run(frog, [{t: 'tool', tool: 'scissors'}, {t: 'cut', s: 0.5}], st);
    expect(st.cut[1]).toBeUndefined();
    expect(st.warn).toContain('Chưa tới lúc này');
    st = run(frog, [{t: 'name', organ: 'heart'}], st);
    expect(st.named).toEqual([]);
    expect(reachable(frog, st, 'heart')).toBe(false);
    // ghim một kim hai lần chỉ tính một
    st = run(frog, [{t: 'tool', tool: 'pin'}, {t: 'pin', i: 0}, {t: 'pin', i: 0}]);
    expect(st.pins[0]).toEqual([0]);
    expect(stepDone(frog, st, 0)).toBe(false);
  });

  it('kéo vạt quá nửa rồi thả thì mở hẳn; nhỏ adrenaline làm tim ếch đập nhanh hơn', () => {
    const frog = DISSECT_BY_ID['dissect-frog'];
    const upTo = (n: number) => perfect(frog).slice(0, perfect(frog).findIndex((a, i, arr) => current(frog, run(frog, arr.slice(0, i + 1))) >= n) + 1);
    let st = run(frog, upTo(2));
    expect(current(frog, st)).toBe(2);
    st = run(frog, [{t: 'tool', tool: 'forceps'}, {t: 'open', flap: 'left', v: 0.4}], st);
    expect(stepDone(frog, st, 2)).toBe(false);
    st = run(frog, [{t: 'open', flap: 'left', v: 1}, {t: 'open', flap: 'right', v: 1}], st);
    expect(stepDone(frog, st, 2)).toBe(true);
    const done = run(frog, perfect(frog));
    expect(done.drops).toBe(1);
    expect(frog.beat![1]).toBeGreaterThan(frog.beat![0]);
  });

  it('lưỡi dao bám đường cắt: tay lệch nhẹ vẫn cắt, không nhảy cóc ra xa phía trước, tay xa đường thì không cắt', () => {
    const path: [number, number][] = [[0, 0], [1, 0], [2, 0]];
    expect(pathLength(path)).toBe(2);
    expect(pointAt(path, 0.75)).toEqual([1.5, 0]);
    // lệch 0,2 khỏi đường, ngay đầu đường: cắt được tới đó
    let r = cutAdvance(path, 0, 0.5, 0.2);
    expect(r.s).toBeCloseTo(0.25, 5);
    expect(r.at).toEqual([0.5, 0]);
    // đưa tay ra cuối đường ngay lập tức: chỉ tiến tối đa 0,6 đơn vị mỗi lần
    r = cutAdvance(path, 0.25, 1.95, 0);
    expect(r.s).toBeLessThan(0.6);
    // xa đường quá dung sai: không cắt thêm
    expect(cutAdvance(path, 0.25, 0.8, 1).s).toBe(0.25);
    // không bao giờ lùi
    expect(cutAdvance(path, 0.5, 0.1, 0).s).toBe(0.5);
  });

  it('nhãn ✓ của cơ quan: mọi nhãn nằm trong mép sau khay, nhãn cùng hàng cách nhau đủ rộng (không chồng nhau) kể cả khi gọi tên hết 11 bộ phận tim lợn', () => {
    // bài nhiều cơ quan nhất (tim lợn, 11): ba hàng còn vừa tới 12 nhãn
    const most = Math.max(...DISSECTIONS.map((d) => Object.keys(d.organs).length));
    expect(most).toBeLessThanOrEqual(12);
    for (let n = 1; n <= most; n++) {
      for (const mid of [-3, -0.4, 0, 1.2, 3]) {
        const slots = tagSlots(n, mid);
        expect(slots).toHaveLength(n);
        for (const [x] of slots) {
          expect(x).toBeGreaterThanOrEqual(TAG_X[0] - 1e-9);
          expect(x).toBeLessThanOrEqual(TAG_X[1] + 1e-9);
        }
        // nhãn dài nhất (≈ 1,2 đơn vị ở góc nhìn hẹp nhất) không đè nhãn cùng hàng
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (slots[i][1] === slots[j][1]) expect(Math.abs(slots[i][0] - slots[j][0])).toBeGreaterThanOrEqual(1.25);
      }
    }
    // ít nhãn thì giữ cách đều 0,85 quanh tâm các cơ quan
    expect(tagSlots(3, 0).map(([x]) => +x.toFixed(2))).toEqual([-0.85, 0, 0.85]);
  });
  it('bảng điều khiển: chọn dụng cụ bằng nút, bước đang làm và lời nhắc khi cầm sai', () => {
    const r = render(<HandsLab experiment="dissect-frog" />);
    expect(r.getByTestId('dissect-status').getAttribute('data-step')).toBe('0');
    fireEvent.click(r.getByTestId('dissect-tool-pin'));
    expect(r.getByTestId('dissect-tool-pin').getAttribute('aria-pressed')).toBe('true');
    expect(r.getByTestId('dissect-status').textContent).toContain('kim ghim');
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.getByTestId('lab-manual').textContent).toContain('Ghim bốn chân');
    fireEvent.click(r.getByTestId('lab-panel-do'));
    fireEvent.click(r.getByTestId('dissect-reset'));
    expect(r.getByTestId('dissect-tool-pin').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('tim 3D của bảng (BIO_HEART_CIRCULATION)', () => {
  it('mô hình Blender có đủ mọi bộ phận của template, cùng id', () => {
    const g = nodes('heart.glb');
    const ids = (PRESETS.BIO_HEART_CIRCULATION.data as {parts: {id: string}[]}).parts.map((p) => p.id);
    expect([...HEART_PARTS].sort()).toEqual([...ids].sort());
    for (const id of ids) expect(g.has(`heart_${id}`), id).toBe(true);
  });

  it('hai vòng máu kín đi qua phổi và lưới mao mạch; máu ở động mạch phổi nghèo O₂, ở động mạch chủ giàu O₂', () => {
    for (const l of HEART_LOOPS) {
      const i = l.pts.findIndex((q) => q === l.lung);
      const aorta = l.pts.findIndex((q) => q[0] === 1.45 && q[1] === 0.3);
      const pa = l.pts.findIndex((q) => q[0] === 0.0 && q[1] === 0.9);
      expect(i).toBeGreaterThan(pa);
      expect(aorta).toBeGreaterThan(i);
      expect(l.pts.some((q) => q[1] < -2.5)).toBe(true);
    }
  });

  it('chu kì tim: nhĩ co trước, thất co sau, có lúc giãn chung', () => {
    expect(cardiacPhase(0.05).atria).toBeGreaterThan(0.5);
    expect(cardiacPhase(0.05).ventricles).toBe(0);
    expect(cardiacPhase(0.8 * 0.28).ventricles).toBeGreaterThan(0.9);
    const rest = cardiacPhase(0.8 * 0.7);
    expect(rest.atria + rest.ventricles).toBe(0);
  });
});
