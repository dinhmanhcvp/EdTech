import {describe, expect, it} from 'vitest';
import {MAX_ZOOM, MIN_ZOOM, clampScale, fitTo, focusBox, panBy, toPage, zoomAt, type View} from '../utils/viewport';
import {annotationsToBoard, imageStroke, insertPageStrokes} from '../utils/boardImage';

const page = {w: 1000, h: 1400};
const screen = {w: 1600, h: 900};

describe('viewport', () => {
  it('fits the page inside the screen and centres it', () => {
    const v = fitTo(page, screen);
    expect(v.scale).toBeCloseTo(900 / 1400);
    expect(v.x).toBeCloseTo((1600 - 1000 * v.scale) / 2);
    expect(v.y).toBeCloseTo(0);
    expect(v.fit).toBeCloseTo(v.scale);
  });

  it('zooms around the pointer: the page point under the finger stays put', () => {
    const v = fitTo(page, screen);
    const finger = {x: 700, y: 400};
    const before = toPage(v, finger);
    const z = zoomAt(v, finger, 2.5);
    const after = toPage(z, finger);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(z.scale).toBeCloseTo(v.scale * 2.5);
  });

  it('clamps zoom between 0.5x and 5x of the fit scale', () => {
    const v = fitTo(page, screen);
    expect(zoomAt(v, {x: 0, y: 0}, 100).scale).toBeCloseTo(v.fit * MAX_ZOOM);
    expect(zoomAt(v, {x: 0, y: 0}, 0.01).scale).toBeCloseTo(v.fit * MIN_ZOOM);
    expect(clampScale(v, v.fit * 7)).toBeCloseTo(v.fit * 5);
  });

  it('pans by screen pixels', () => {
    const v: View = {scale: 1, x: 10, y: 20, fit: 1};
    expect(panBy(v, 5, -7)).toEqual({scale: 1, x: 15, y: 13, fit: 1});
  });

  it('focuses a question box with a margin, centred', () => {
    const v = focusBox({x: 0.1, y: 0.5, w: 0.8, h: 0.1}, page, screen, 0.1);
    const box = {x: 100, y: 700, w: 800, h: 140};
    const shown = {w: box.w * v.scale, h: box.h * v.scale};
    expect(shown.w).toBeLessThanOrEqual(1600 * 0.8 + 0.01);
    expect(shown.h).toBeLessThanOrEqual(900 * 0.8 + 0.01);
    const centre = {x: v.x + (box.x + box.w / 2) * v.scale, y: v.y + (box.y + box.h / 2) * v.scale};
    expect(centre.x).toBeCloseTo(800);
    expect(centre.y).toBeCloseTo(450);
    expect(v.scale).toBeLessThanOrEqual(v.fit * MAX_ZOOM + 1e-9);
  });
});

describe('board image object', () => {
  it('fits a portrait page into the 1200x675 board keeping its ratio', () => {
    const s = imageStroke({assignmentId: 'asg-1', page: 2, width: 1000, height: 1400});
    expect(s.image).toEqual({assignmentId: 'asg-1', page: 2});
    const t = s.typeset!;
    expect(t.h).toBeCloseTo(675 * 0.94);
    expect(t.w / t.h).toBeCloseTo(1000 / 1400);
    expect(s.points[0].x).toBeCloseTo((1200 - t.w) / 2);
    expect(s.points[0].y).toBeCloseTo((675 - t.h) / 2);
  });

  it('maps page-relative ink onto the image box as ordinary strokes', () => {
    const img = imageStroke({assignmentId: 'a', page: 0, width: 1000, height: 1000});
    const [ink] = annotationsToBoard([{p: [[0, 0], [1, 1]], c: '#e11d48', w: 4}], img);
    const t = img.typeset!;
    expect(ink.points[0]).toEqual({x: img.points[0].x, y: img.points[0].y});
    expect(ink.points[1].x).toBeCloseTo(img.points[0].x + t.w);
    expect(ink.points[1].y).toBeCloseTo(img.points[0].y + t.h);
    expect(ink.color).toBe('#e11d48') ;
    expect(ink.image).toBeUndefined();
  });

  it('builds the inserted page: image first, then ink, all with unique ids', () => {
    const strokes = insertPageStrokes({assignmentId: 'a', page: 0, width: 1000, height: 800}, [{p: [[0.5, 0.5]], c: '#000000', w: 3}, {p: [[0.2, 0.2]], c: '#000000', w: 3}]);
    expect(strokes).toHaveLength(3);
    expect(strokes[0].image).toBeDefined();
    expect(new Set(strokes.map((s) => s.id)).size).toBe(3);
  });
});
