import {describe, expect, it} from 'vitest';
import {eraseInZone, rectOf, zoneAt} from '../utils/eraser';
import type {Stroke} from '../utils/lassoGeometry';

const line = (id: string, y: number, x0 = 0, x1 = 200): Stroke => ({id, color: '#000', width: 3, points: [{x: x0, y}, {x: x1, y}]});

describe('tẩy', () => {
  it('tẩy tròn chỉ cắt phần nét trong vòng, hai đầu còn lại', () => {
    const out = eraseInZone([line('a', 50)], zoneAt('round', {x: 100, y: 50}, 14), false);
    expect(out).toHaveLength(2);
    expect(Math.max(...out[0].points.map((p) => p.x))).toBeLessThan(100);
    expect(Math.min(...out[1].points.map((p) => p.x))).toBeGreaterThan(100);
  });

  it('tẩy theo nét xóa cả nét bị chạm, nét xa giữ nguyên', () => {
    const a = line('a', 50);
    const b = line('b', 300);
    const out = eraseInZone([a, b], zoneAt('stroke', {x: 100, y: 50}, 8), true);
    expect(out).toEqual([b]);
  });

  it('lau bảng quét một dải chữ nhật rộng: xóa nhiều nét ngắn cùng lúc', () => {
    const near = line('near', 60, 80, 130);
    const far = line('far', 200, 80, 130);
    const out = eraseInZone([near, far], zoneAt('wipe', {x: 100, y: 50}, 14), true);
    expect(out.map((s) => s.id)).toEqual(['far']);
    expect(eraseInZone([near], zoneAt('wipe', {x: 100, y: 50}, 14), false).length).toBeLessThanOrEqual(2);
  });

  it('kéo vùng xóa mọi thứ trong khung và cắt nét chạy ngang qua khung', () => {
    const inside: Stroke = {id: 'in', color: '#000', width: 3, points: [{x: 20, y: 20}, {x: 30, y: 30}]};
    const out = eraseInZone([inside, line('cross', 25, 0, 200)], rectOf({x: 10, y: 10}, {x: 60, y: 60}), false);
    expect(out.some((s) => s.id === 'in')).toBe(false);
    expect(out.every((s) => s.points.every((p) => p.x < 10 || p.x > 60))).toBe(true);
  });

  it('khối công thức chạm vùng thì xóa cả khối; trang ảnh không bao giờ bị tẩy; không đổi gì thì trả đúng mảng cũ', () => {
    const block: Stroke = {id: 'f', color: '#000', width: 1, points: [{x: 100, y: 100}], typeset: {latex: 'x', text: 'x', size: 20, w: 80, h: 30}};
    const img: Stroke = {id: 'i', color: '#000', width: 1, points: [{x: 0, y: 0}], typeset: {latex: '', text: '', size: 1, w: 1200, h: 675}, image: {assignmentId: 'a', page: 0}};
    const all = [block, img];
    expect(eraseInZone(all, rectOf({x: 90, y: 90}, {x: 120, y: 120}), false)).toEqual([img]);
    expect(eraseInZone(all, {x: 900, y: 900, r: 5}, false)).toBe(all);
  });
});
