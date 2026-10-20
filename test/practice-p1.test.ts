import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { elementAABB } from '../src/core/elements';
import { evaluate } from '../src/core/evaluate';
import { totals } from '../src/core/lists';
import { type OwcDocument } from '../src/core/model';
import { production } from '../src/core/production';
import { validateDocument } from '../src/core/validate';
import { generateDrawings } from '../src/drawing/sheets';
import { applyFrame, buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { projectViews } from '../src/geom/solids';
import { placedSpec } from '../src/ui/geomClient';
import { translate } from '../src/ui/i18n';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);
const root = new URL('../examples/practice-p1/', import.meta.url);
function fixture(name: string): OwcDocument {
  const raw = JSON.parse(readFileSync(new URL(`${name}.owc`, root), 'utf8'));
  const result = validateDocument(raw);
  expect(result.errors).toEqual([]); expect(result.repairs).toEqual([]);
  expect(result.doc).not.toBeNull();
  expect(result.doc!.generators).toEqual([]); // Actually free parts, not exploded templates.
  return result.doc!;
}
function size(doc: OwcDocument) {
  const boxes = evaluate(doc).elements.map(elementAABB);
  return [0, 1, 2].map(i => Math.max(...boxes.map(b => b.max[i])) - Math.min(...boxes.map(b => b.min[i])));
}

describe('P1 browser-built reference projects', () => {
  it('preserves stable part/joint IDs through shelf width and shelf-height changes', () => {
    const base = fixture('regal-800'), next = fixture('regal-900');
    expect(size(base)).toEqual([800, 300, 1200]); expect(size(next)).toEqual([900, 300, 1200]);
    expect(next.elements.map(e => e.id)).toEqual(base.elements.map(e => e.id));
    expect(next.joints).toEqual(base.joints); expect(next.joints).toHaveLength(4);
    for (const doc of [base, next]) {
      expect(doc.elements).toHaveLength(6); expect(doc.elements.every(e => e.height === 19)).toBe(true);
      const ev = evaluate(doc); expect(ev.warnings).toEqual([]);
      expect(ev.hardware.filter(h => h.itemId === 'confirmat_7x50').reduce((n, h) => n + h.qty, 0)).toBe(8);
    }
    expect(next.elements.find(e => e.name === 'Einlegeboden unten')!.frame.o[2]).toBe(450);
    expect(base.elements.find(e => e.name === 'Einlegeboden unten')!.frame.o[2]).toBe(400);
    expect(next.elements.filter(e => !e.name.startsWith('Seite')).map(e => e.length)).toEqual([862, 862, 862, 862]);
  });

  it('persists the edited lap and its complementary 24/36 mm cuts without changing frame dimensions', () => {
    const base = fixture('holzrahmen-2000'), next = fixture('holzrahmen-2000-edited');
    expect(next.elements).toEqual(base.elements);
    size(next).forEach((v, i) => expect(v).toBeCloseTo([2000, 60, 2400][i], 6));
    expect(next.elements).toHaveLength(6); expect(next.elements.every(e => e.width === 120 && e.height === 60)).toBe(true);
    expect(next.joints).toHaveLength(4);
    const changed = next.joints.filter(j => j.params.ratio === 0.6); expect(changed).toHaveLength(1);
    const old = base.joints.find(j => j.id === changed[0].id)!;
    expect(old.params.ratio ?? 0.5).toBe(0.5);
    expect([changed[0].a, changed[0].b]).toEqual([old.a, old.b]);
    const ev = evaluate(next); expect(ev.warnings).toEqual([]);
    expect(ev.elements.flatMap(e => e.all).filter(p => p.jointId === old.id).map(p => p.info!.depth).sort()).toEqual([24, 36]);
  });

  for (const name of ['regal-800', 'regal-900', 'holzrahmen-2000', 'holzrahmen-2000-edited']) {
    it(`${name}: valid round trip, complete procurement and real non-overlapping OCCT solids`, () => {
      const doc = fixture(name), ev = evaluate(doc), prod = production(ev, doc.settings);
      expect(evaluate(validateDocument(JSON.parse(JSON.stringify(doc))).doc!)).toEqual(ev);
      expect(prod.unavailable).toEqual([]); expect(prod.cost.complete).toBe(true); expect(totals(prod.rows).parts).toBe(6);
      const nested = prod.sheets.flatMap(s => s.result.sheets.flatMap(s => s.placements)).length
        + prod.linear.flatMap(s => s.result.bars.flatMap(b => b.pieces)).length;
      expect(nested).toBe(6);
      const solids = ev.elements.map(e => {
        const result = buildLocalSolid(e, e.all); expect(result.failed, e.name).toEqual([]);
        const placed = applyFrame(result.shape, e.frame); result.shape.delete(); return placed;
      });
      try {
        const volume = solids.reduce((n, s) => n + volumeOf(s), 0);
        if (name.startsWith('holzrahmen')) {
          // Stock: (2*2000+2*2400+2*2160)*120*60. Four corner
          // overlaps: 120*120*60 each, shared by the complementary laps.
          expect(volume).toBeCloseTo(94464000 - 4 * 120 * 120 * 60, 0);
        } else {
          // 8 through face drills Ø7*19 plus 8 blind edge drills Ø5*34.
          const stock = ev.elements.reduce((n, e) => n + e.length * e.width * e.height, 0);
          expect(volume).toBeCloseTo(stock - 8 * Math.PI * (3.5 ** 2 * 19 + 2.5 ** 2 * 34), 0);
        }
        for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
          const overlap = solids[i].intersect(solids[j]);
          try { expect(volumeOf(overlap), `${ev.elements[i].name}/${ev.elements[j].name}`).toBeLessThan(1); }
          finally { overlap.delete(); }
        }
      } finally { solids.forEach(s => s.delete()); }
    });
  }

  for (const [name, width] of [['regal-900', 900], ['holzrahmen-2000-edited', 2000]] as const) {
    it(`${name}: workshop drawings and exported CSV agree with evaluated positions`, async () => {
      const doc = fixture(name), ev = evaluate(doc), prod = production(ev, doc.settings);
      const csv = readFileSync(new URL(`${name}.csv`, root), 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1)
        .map(line => line.slice(1, -1).split('";"'));
      expect(csv.map(r => [Number(r[0]), r[1], ...r.slice(3, 7).map(Number)]))
        .toEqual(prod.rows.map(r => [r.pos, r.names.join(' / '), r.length, r.width, r.height, r.qty]));
      const sheets = await generateDrawings(ev, prod, {
        format: 'A3', lang: 'de', date: '2026-10-20', project: doc.project,
        t: (k, args) => translate('de', k, args),
        projector: async (els, views) => projectViews(els.map(placedSpec), views),
        include: { overview: true, views: true, parts: true, lists: true, nesting: true },
      });
      const views = sheets.find(s => s.title === 'Ansichten')!;
      expect(views.prims.some(p => p.text?.s === String(width))).toBe(true);
      expect(views.prims.some(p => p.text?.s === String(name.startsWith('regal') ? 1200 : 2400))).toBe(true);
      for (const row of prod.rows) {
        expect(sheets.some(s => s.svg.includes(`Pos. ${row.pos} –`))).toBe(true);
        expect(sheets.some(s => s.svg.includes(row.names.join(' / ')))).toBe(true);
      }
      const pdf = readFileSync(new URL(`${name}.pdf`, root));
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)]).toHaveLength(sheets.length);
    });
  }
});
