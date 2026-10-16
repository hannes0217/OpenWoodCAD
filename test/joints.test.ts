import { beforeAll, describe, expect, it } from 'vitest';
import { createBeam } from '../src/core/elements';
import { applyJoint } from '../src/core/joints';
import type { Element, Joint, JointType } from '../src/core/model';
import { applyFrame, buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);

function solidsAfter(type: JointType, a: Element, b: Element, params: Joint['params'] = {}) {
  const j: Joint = { id: 'j', type, a: a.id, b: b.id, params };
  const res = applyJoint(j, a, b);
  const procs = (e: Element) => res.processings.filter((p) => p.elementId === e.id).map((p) => p.processing);
  const sa = buildLocalSolid(a, procs(a));
  const sb = buildLocalSolid(b, procs(b));
  expect(sa.failed).toEqual([]);
  expect(sb.failed).toEqual([]);
  const wa = applyFrame(sa.shape, a.frame);
  const wb = applyFrame(sb.shape, b.frame);
  const overlap = volumeOf(wa.intersect(wb) as never);
  return { res, va: volumeOf(sa.shape), vb: volumeOf(sb.shape), overlap };
}

const mat = 'kvh_c24';

describe('joints', () => {
  it('trim cuts a beam flush against a post', () => {
    const post = createBeam([0, 0, 0], [0, 0, 2000], 140, 140, { id: 'post', name: 'Pfosten', materialId: mat });
    const beam = createBeam([-1000, 0, 1000], [200, 0, 1000], 100, 200, { id: 'beam', name: 'Riegel', materialId: mat });
    const { va, overlap, res } = solidsAfter('trim', beam, post);
    expect(res.warnings).toEqual([]);
    expect(overlap).toBeLessThan(1);
    // Beam ends at x = -70: length 930.
    expect(va).toBeCloseTo(930 * 100 * 200, -2);
  });

  it('tenon and mortise do not overlap and keep the tenon', () => {
    const post = createBeam([0, 0, 0], [0, 0, 2000], 140, 140, { id: 'post', name: 'Pfosten', materialId: mat });
    const beam = createBeam([-1000, 0, 1000], [0, 0, 1000], 100, 200, { id: 'beam', name: 'Riegel', materialId: mat });
    const { va, vb, overlap, res } = solidsAfter('tenon', beam, post, { length: 60, thickness: 40, shoulder: 20, peg: false });
    expect(res.warnings).toEqual([]);
    expect(overlap).toBeLessThan(1);
    const shoulderVol = 930 * 100 * 200;
    expect(va).toBeCloseTo(shoulderVol + 60 * 40 * 160, -2);
    // Mortise fits the tenon tightly on its cheeks, 2 mm extra depth.
    expect(vb).toBeCloseTo(2000 * 140 * 140 - 40 * 160 * 62, -2);
  });

  it('peg drilling goes through tenon and post', () => {
    const post = createBeam([0, 0, 0], [0, 0, 2000], 140, 140, { id: 'post', name: 'Pfosten', materialId: mat });
    const beam = createBeam([-1000, 0, 1000], [0, 0, 1000], 100, 200, { id: 'beam', name: 'Riegel', materialId: mat });
    const { res, overlap } = solidsAfter('tenon', beam, post, { length: 60, thickness: 40, shoulder: 20, peg: true, pegDia: 20 });
    expect(overlap).toBeLessThan(1);
    expect(res.processings.filter((p) => p.processing.type === 'drilling')).toHaveLength(2);
    expect(res.hardware).toEqual([{ itemId: 'peg_24', qty: 1, source: 'j' }]);
  });

  it('lap joint removes half of each beam at a crossing', () => {
    const a = createBeam([-500, 0, 0], [500, 0, 0], 100, 200, { id: 'a', name: 'A', materialId: mat });
    const b = createBeam([0, -500, 0], [0, 500, 0], 100, 200, { id: 'b', name: 'B', materialId: mat });
    const { va, vb, overlap } = solidsAfter('lap', a, b);
    expect(overlap).toBeLessThan(1);
    expect(va).toBeCloseTo(1000 * 100 * 200 - 100 * 100 * 100, -2);
    expect(vb).toBeCloseTo(1000 * 100 * 200 - 100 * 100 * 100, -2);
  });

  it('birdsmouth houses a rafter on a purlin', () => {
    const purlin = createBeam([0, -2000, 0], [0, 2000, 0], 120, 160, { id: 'p', name: 'Pfette', materialId: mat, align: 'top' });
    // Rafter pitched 35°, bottom edge 30 mm below the purlin top at the purlin axis.
    const a = (35 * Math.PI) / 180;
    const rafter = createBeam([-1500, 0, -1500 * Math.tan(a) - 30], [1500, 0, 1500 * Math.tan(a) - 30], 80, 200, { id: 'r', name: 'Sparren', materialId: mat, align: 'bottom' });
    const { vb, va, overlap } = solidsAfter('birdsMouth', rafter, purlin);
    expect(overlap).toBeLessThan(1);
    expect(vb).toBeCloseTo(4000 * 120 * 160, -2);
    expect(va).toBeLessThan(rafter.length * 80 * 200);
  });

  it('step joint fits strut into beam without overlap', () => {
    const beam = createBeam([-1500, 0, 0], [1500, 0, 0], 160, 200, { id: 'b', name: 'Balken', materialId: mat, align: 'top' });
    const strut = createBeam([-1200, 0, 1200], [100, 0, -100], 160, 160, { id: 's', name: 'Strebe', materialId: mat });
    const { res, va, vb, overlap } = solidsAfter('stepJoint', strut, beam, { depth: 40 });
    expect(res.warnings).toEqual([]);
    expect(overlap).toBeLessThan(5);
    expect(vb).toBeLessThan(3000 * 160 * 200);
    expect(va).toBeLessThan(strut.length * 160 * 160);
  });

  it('dovetail fits into its mortise', () => {
    const main = createBeam([0, -1000, 0], [0, 1000, 0], 160, 240, { id: 'm', name: 'Hauptträger', materialId: mat });
    const sec = createBeam([-1500, 0, 0], [0, 0, 0], 100, 200, { id: 's', name: 'Nebenträger', materialId: mat });
    const { overlap, res } = solidsAfter('dovetail', sec, main);
    expect(res.warnings).toEqual([]);
    expect(overlap).toBeLessThan(1);
  });

  it('miter cuts two beams at a corner', () => {
    const a = createBeam([-1000, 0, 0], [50, 0, 0], 100, 100, { id: 'a', name: 'A', materialId: mat });
    const b = createBeam([0, -1000, 0], [0, 50, 0], 100, 100, { id: 'b', name: 'B', materialId: mat });
    const { overlap, va, vb } = solidsAfter('miter', a, b);
    expect(overlap).toBeLessThan(1);
    expect(va).toBeCloseTo(vb, -2);
  });
});
