import { describe, expect, it } from 'vitest';
import { frameFromEuler, frameFromX, frameToEuler, rotateFrame, toLocal, toWorld, vecNearlyEqual, type Vec3 } from '../src/core/math';

describe('frames', () => {
  it('toWorld and toLocal are inverse', () => {
    const f = frameFromX([100, 200, 300], [1, 2, 0.5]);
    const p: Vec3 = [12, -7, 33];
    expect(vecNearlyEqual(toLocal(f, toWorld(f, p)), p)).toBe(true);
  });
  it('frameFromX keeps z close to up and is right-handed', () => {
    const f = frameFromX([0, 0, 0], [1, 0, 1]);
    expect(f.z[2]).toBeGreaterThan(0.7);
    const c = [f.x[1] * f.y[2] - f.x[2] * f.y[1], f.x[2] * f.y[0] - f.x[0] * f.y[2], f.x[0] * f.y[1] - f.x[1] * f.y[0]] as Vec3;
    expect(vecNearlyEqual(c, f.z)).toBe(true);
  });
  it('euler roundtrip', () => {
    const e: Vec3 = [30, -20, 45];
    const f = frameFromEuler([1, 2, 3], e);
    const back = frameToEuler(f);
    expect(back.map((v) => Math.round(v * 1000) / 1000)).toEqual(e);
  });
  it('rotateFrame rotates origin around centre', () => {
    const f = frameFromX([10, 0, 0], [1, 0, 0]);
    const r = rotateFrame(f, [0, 0, 0], [0, 0, 1], Math.PI / 2);
    expect(vecNearlyEqual(r.o, [0, 10, 0])).toBe(true);
    expect(vecNearlyEqual(r.x, [0, 1, 0])).toBe(true);
  });
});
