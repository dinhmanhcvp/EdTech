import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {handPointers, newInput} from '../engines/families/handsKit';
import {setLine, type Kit} from '../engines/families/Stage3D';

function fakeKit(): Kit {
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
  camera.position.set(0, 10, 8);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return {
    scene: new THREE.Scene(),
    camera,
    controls: {target: new THREE.Vector3(), enabled: true} as unknown as Kit['controls'],
    night: false,
    zUp: () => new THREE.Group(),
    line: (color: string, width: number, pts?: number[], segments = false) => {
      const o = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color, linewidth: width})) as ReturnType<Kit['line']>;
      o.userData.poly = !segments;
      if (pts) setLine(o, pts);
      return o;
    },
    arrow: () => Object.assign({obj: new THREE.Group()}, {set: () => undefined}),
    label: () => () => undefined,
    caption: () => undefined,
    card: () => () => undefined,
    pick: () => undefined,
    drag: () => () => undefined,
    set: () => undefined,
  } as unknown as Kit;
}

describe('ngón tay chạm màn hình cảm ứng', () => {
  it('con trỏ chuột đổi sang tầm bắt của tay khi sự kiện cuối là cảm ứng, và trở lại khi là chuột', () => {
    const input = newInput();
    const P = handPointers(fakeKit(), input, 0.3);
    const mouse = P.ptrs[2];
    P.step(1);
    expect([mouse.touch, mouse.reach]).toEqual([false, 0.07]);
    Object.assign(input.mouse, {touch: true, active: true, down: true});
    P.step(1);
    expect([mouse.touch, mouse.reach]).toEqual([true, 0.16]);
    expect(mouse.reach).toBe(P.ptrs[0].reach); // bằng tầm với của bàn tay
    input.mouse.touch = false;
    P.step(1);
    expect([mouse.touch, mouse.reach]).toEqual([false, 0.07]);
  });
});
