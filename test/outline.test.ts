import { beforeAll, describe, expect, it } from 'vitest';
import type { Element } from '../src/core/model';
import { buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);

const base = (outline: Element['outline'], L: number, W: number, H: number): Element => ({
  id: 'x', kind: 'panel', name: 'x', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, length: L, width: W, height: H, materialId: 'mdf19', processings: [], outline,
});

describe('outlines', () => {
  it('builds a round table top from two bulge arcs', () => {
    const r = 400;
    const e = base([[2 * r, r, 1], [0, r, 1]], 2 * r, 2 * r, 20);
    const { shape, failed } = buildLocalSolid(e, []);
    expect(failed).toEqual([]);
    expect(volumeOf(shape)).toBeCloseTo(Math.PI * r * r * 20, -3);
  });
  it('builds a polygon with a rounded corner', () => {
    const e = base([[0, 0], [500, 0], [500, 200, 0.4142135], [700, 400], [0, 400]], 700, 400, 18);
    const { shape } = buildLocalSolid(e, []);
    const v = volumeOf(shape);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(700 * 400 * 18);
  });
});
