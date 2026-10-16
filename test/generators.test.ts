import { beforeAll, describe, expect, it } from 'vitest';
import { elementAABB } from '../src/core/elements';
import { evaluate, type Evaluated } from '../src/core/evaluate';
import { GENERATOR_LIST } from '../src/core/generators';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { production } from '../src/core/production';
import { applyFrame, buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);

function evalGen(type: string, params: Record<string, number | string | boolean> = {}): Evaluated {
  const d = emptyDocument('t');
  d.generators.push({ id: 'g', type, name: type, frame: WORLD, params });
  return evaluate(d);
}

/** Pairs of parts whose final solids intersect (> 1 cm³). */
function overlaps(ev: Evaluated): string[] {
  const solids = ev.elements.map((e) => {
    const r = buildLocalSolid(e, e.all);
    expect(r.failed, e.name).toEqual([]);
    return applyFrame(r.shape, e.frame);
  });
  const boxes = ev.elements.map(elementAABB);
  const out: string[] = [];
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.max[0] <= b.min[0] || b.max[0] <= a.min[0] || a.max[1] <= b.min[1] || b.max[1] <= a.min[1] || a.max[2] <= b.min[2] || b.max[2] <= a.min[2]) continue;
      const v = volumeOf(solids[i].intersect(solids[j]) as never);
      if (v > 1000) out.push(`${ev.elements[i].name} ↔ ${ev.elements[j].name}: ${Math.round(v / 1000)} cm³`);
    }
  return out;
}

describe('all generators', () => {
  for (const g of GENERATOR_LIST) {
    it(`${g.type}: defaults build without warnings, overlaps or failed processings`, () => {
      const ev = evalGen(g.type);
      expect(ev.warnings).toEqual([]);
      expect(ev.elements.length).toBeGreaterThan(3);
      expect(overlaps(ev)).toEqual([]);
      const p = production(ev, emptyDocument().settings);
      expect(p.cost.gross).toBeGreaterThan(0);
    });
  }
});

describe('regal', () => {
  it('fixed shelves with two bays create dividers and joints', () => {
    const ev = evalGen('regal', { columns: 2, shelfType: 'fixed', shelves: 3 });
    expect(ev.elements.filter((e) => e.role === 'divider')).toHaveLength(1);
    expect(ev.elements.filter((e) => e.role === 'shelf')).toHaveLength(6);
    expect(overlaps(ev)).toEqual([]);
  });
  it('adjustable shelves drill shelf-pin rows', () => {
    const ev = evalGen('regal', { shelfType: 'adjustable' });
    const side = ev.elements.find((e) => e.name === 'Seite links')!;
    expect(side.all.filter((p) => p.type === 'drilling' && p.geom === 'drill' && p.dia === 5).length).toBeGreaterThan(20);
  });
});

describe('wand', () => {
  it('window opening gets king/jack studs, header and sill', () => {
    const ev = evalGen('wand');
    expect(ev.elements.some((e) => e.role === 'header')).toBe(true);
    expect(ev.elements.filter((e) => e.name.startsWith('Auflagerständer'))).toHaveLength(2);
    expect(ev.elements.some((e) => e.name.startsWith('Brüstungsriegel'))).toBe(true);
    const osb = ev.elements.filter((e) => e.role === 'board');
    expect(osb.some((e) => e.all.some((p) => p.type === 'pocket'))).toBe(true);
  });
  it('door splits the sole plate', () => {
    const ev = evalGen('wand', { o1Type: 'door', o1X: 1500 });
    expect(ev.elements.filter((e) => e.name === 'Schwelle')).toHaveLength(2);
    expect(overlaps(ev)).toEqual([]);
  });
});

describe('werkbank', () => {
  it('uses mortise and tenon joints', () => {
    const ev = evalGen('werkbank');
    const tenons = ev.elements.flatMap((e) => e.all.filter((p) => p.type === 'tenon'));
    const mortises = ev.elements.flatMap((e) => e.all.filter((p) => p.type === 'mortise'));
    expect(tenons).toHaveLength(16);
    expect(mortises).toHaveLength(16);
  });
});
