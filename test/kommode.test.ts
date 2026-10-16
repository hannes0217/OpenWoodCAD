import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument, type OwcDocument } from '../src/core/model';
import { buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);

function doc(params: Record<string, number | string> = {}): OwcDocument {
  const d = emptyDocument('Test');
  d.generators.push({ id: 'k1', type: 'kommode', name: 'Kommode', frame: WORLD, params });
  return d;
}

describe('kommode', () => {
  it('builds carcass and drawers without warnings', () => {
    const ev = evaluate(doc());
    expect(ev.warnings).toEqual([]);
    expect(ev.elements).toHaveLength(7 + 4 * 6);
    const hw = Object.fromEntries(ev.hardware.reduce((m, h) => m.set(h.itemId, (m.get(h.itemId) ?? 0) + h.qty), new Map<string, number>()));
    expect(hw.slide_400).toBe(4);
    expect(hw.handle_128).toBe(4);
    expect(hw.dowel_8x35).toBeGreaterThan(10);
  });

  it('fronts fill the front area with equal gaps', () => {
    const ev = evaluate(doc({ drawers: 3, gap: 4 }));
    const fronts = ev.elements.filter((e) => e.role === 'front');
    expect(fronts).toHaveLength(3);
    const total = fronts.reduce((s, f) => s + f.width, 0);
    // plinth 80 .. side top (850-19) - gap
    const avail = 850 - 19 - 4 - 80 - 2 * 4;
    expect(total).toBeLessThanOrEqual(avail);
    expect(total).toBeGreaterThan(avail - 3 * 0.5);
    // Identical fronts share one position number.
    expect(new Set(fronts.map((f) => f.pos)).size).toBe(1);
  });

  it('graduated layout makes lower drawers higher', () => {
    const ev = evaluate(doc({ layout: 'graduated' }));
    const fronts = ev.elements.filter((e) => e.role === 'front').sort((a, b) => b.frame.o[2] - a.frame.o[2]);
    for (let i = 1; i < fronts.length; i++) expect(fronts[i].width).toBeGreaterThan(fronts[i - 1].width);
  });

  it('warns when the depth is too small for slides', () => {
    const ev = evaluate(doc({ depth: 260 }));
    expect(ev.warnings.map((w) => w.key)).toContain('warn.noSlide');
  });

  it('all parts build as valid solids with their drillings', () => {
    const ev = evaluate(doc({ drawers: 2 }));
    for (const e of ev.elements) {
      const { shape, failed } = buildLocalSolid(e, e.all);
      expect(failed, e.name).toEqual([]);
      const v = volumeOf(shape);
      const base = e.length * e.width * e.height;
      expect(v, e.name).toBeLessThanOrEqual(base + 1);
      expect(v, e.name).toBeGreaterThan(base * 0.9);
      shape.delete();
    }
  });

  it('confirmat joinery adds cover caps', () => {
    const ev = evaluate(doc({ joinery: 'confirmat' }));
    expect(ev.hardware.some((h) => h.itemId === 'confirmat_cap')).toBe(true);
  });
});
