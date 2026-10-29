import {describe, expect, it} from 'vitest';
import {demoKey, type DemoState} from '../utils/demoPlayer';

const s = (over: Partial<DemoState> = {}): DemoState => ({index: 0, count: 3, phase: 'ready', ...over});

describe('demo player keys (no visible controls)', () => {
  it('Space / Enter / PageDown play the scene that is waiting on its first frame', () => {
    for (const k of [' ', 'Enter', 'PageDown', 'ArrowRight']) expect(demoKey(s(), k)).toEqual({...s(), phase: 'playing'});
  });

  it('the same key after a scene ends loads the next scene, paused on its first frame', () => {
    expect(demoKey(s({phase: 'ended'}), 'PageDown')).toEqual(s({index: 1, phase: 'ready'}));
    expect(demoKey(s({index: 2, phase: 'ended'}), 'PageDown')).toEqual(s({index: 2, phase: 'replay'}));
  });

  it('a one-scene link (?scene=08) replays the same scene on every press after it ends, so a shot can be retaken at once', () => {
    expect(demoKey({index: 0, count: 1, phase: 'ended'}, ' ')).toEqual({index: 0, count: 1, phase: 'replay'});
    expect(demoKey({index: 0, count: 1, phase: 'replay'}, ' ')).toEqual({index: 0, count: 1, phase: 'replay'});
  });

  it('pressing play while playing does nothing (a double click on the remote must not skip)', () => {
    expect(demoKey(s({phase: 'playing'}), ' ')).toEqual(s({phase: 'playing'}));
  });

  it('PageUp goes back a scene, R restarts, digits jump; all stop on the first frame', () => {
    expect(demoKey(s({index: 1, phase: 'playing'}), 'PageUp')).toEqual(s({index: 0, phase: 'ready'}));
    expect(demoKey(s({index: 1, phase: 'ended'}), 'r')).toEqual(s({index: 1, phase: 'ready'}));
    expect(demoKey(s(), '3')).toEqual(s({index: 2, phase: 'ready'}));
    expect(demoKey(s(), '9')).toEqual(s());
  });

  it('B / . blank the screen and the next key brings it back', () => {
    const black = demoKey(s(), 'b');
    expect(black.phase).toBe('black');
    expect(demoKey(black, '.')).toEqual(s({phase: 'ready'}));
  });
});
