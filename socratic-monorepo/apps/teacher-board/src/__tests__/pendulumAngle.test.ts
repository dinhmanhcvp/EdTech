import {describe, expect, it} from 'vitest';
import {pendulumStartAngle} from '../utils/pendulumAngle';

describe('pendulum start angle (θ₀ comes in rad from the board, in degrees from some AI blueprints)', () => {
  it('reads small values as radians: the rad slider spans 0.1 to 2.8', () => {
    expect(pendulumStartAngle(1.2)).toBeCloseTo(1.2);
    expect(pendulumStartAngle(0.785)).toBeCloseTo(Math.PI / 4);
  });
  it('reads larger values as degrees', () => {
    expect(pendulumStartAngle(30)).toBeCloseTo(Math.PI / 6);
    expect(pendulumStartAngle(45)).toBeCloseTo(Math.PI / 4);
  });
  it('defaults to 35 degrees when missing', () => {
    expect(pendulumStartAngle(undefined)).toBeCloseTo((35 * Math.PI) / 180);
  });
});
