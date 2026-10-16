import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { nestLinear, nestSheets, type SheetPiece } from '../src/core/nesting';
import { production } from '../src/core/production';

function overlaps(a: { x: number; y: number; dx: number; dy: number }, b: typeof a) {
  return a.x < b.x + b.dx - 1e-6 && b.x < a.x + a.dx - 1e-6 && a.y < b.y + b.dy - 1e-6 && b.y < a.y + a.dy - 1e-6;
}

describe('sheet nesting', () => {
  it('places all pieces without overlap inside the trimmed sheet', () => {
    const pieces: SheetPiece[] = Array.from({ length: 30 }, (_, i) => ({ id: String(i), label: String(i), l: 300 + (i % 7) * 90, w: 200 + (i % 5) * 60, grain: i % 3 === 0 }));
    const r = nestSheets(pieces, { sheetLength: 2800, sheetWidth: 2070, kerf: 4, trim: 10 });
    expect(r.oversize).toEqual([]);
    const placed = r.sheets.flatMap((s) => s.placements);
    expect(placed).toHaveLength(30);
    for (const s of r.sheets) {
      for (const p of s.placements) {
        expect(p.x).toBeGreaterThanOrEqual(10);
        expect(p.y).toBeGreaterThanOrEqual(10);
        expect(p.x + p.dx).toBeLessThanOrEqual(2790 + 1e-6);
        expect(p.y + p.dy).toBeLessThanOrEqual(2060 + 1e-6);
        if (p.piece.grain) expect(p.rotated).toBe(false);
      }
      for (let i = 0; i < s.placements.length; i++)
        for (let j = i + 1; j < s.placements.length; j++) expect(overlaps(s.placements[i], s.placements[j])).toBe(false);
    }
  });

  it('reports oversize pieces', () => {
    const r = nestSheets([{ id: 'a', label: 'a', l: 3000, w: 100, grain: true }], { sheetLength: 2800, sheetWidth: 2070, kerf: 4, trim: 10 });
    expect(r.oversize).toHaveLength(1);
  });
});

describe('linear nesting', () => {
  it('fits pieces into stock lengths with kerf', () => {
    const r = nestLinear([{ id: 'a', label: '1', length: 2500 }, { id: 'b', label: '1', length: 2500 }, { id: 'c', label: '2', length: 900 }], [3000, 4000, 5000, 6000], 4);
    expect(r.bars.reduce((s, b) => s + b.pieces.length, 0)).toBe(3);
    for (const b of r.bars) expect(b.pieces.reduce((s, p) => s + p.length, 0) + 4 * (b.pieces.length - 1)).toBeLessThanOrEqual(b.stock);
    expect(r.bars).toHaveLength(1);
    expect(r.bars[0].stock).toBe(6000);
  });
});

describe('production of a kommode', () => {
  it('does not invent stock lengths or charge normal sheets for oversized parts',()=>{
    const d=emptyDocument();
    d.elements=[{id:'panel',kind:'panel',name:'Oversize panel',frame:WORLD,length:10000,width:100,height:19,materialId:'chip19_white',processings:[]},
      {id:'beam',kind:'beam',name:'Oversize beam',frame:WORLD,length:30000,width:100,height:200,materialId:'kvh_c24',processings:[]}];
    const p=production(evaluate(d),d.settings);
    expect(p.unavailable).toHaveLength(2);expect(p.cost.complete).toBe(false);
    expect(p.shopping.filter(s=>s.kind==='sheet'||s.kind==='timber')).toEqual([]);expect(p.cost.material).toBe(0);
    expect(p.rows).toHaveLength(2);expect(p.cost.labour).toBeGreaterThan(0);
  });
  it('creates shopping list and cost breakdown', () => {
    const d = emptyDocument('t');
    d.generators.push({ id: 'k', type: 'kommode', name: 'Kommode', frame: WORLD, params: {} });
    const p = production(evaluate(d), d.settings);
    expect(p.cost.complete).toBe(true);expect(p.unavailable).toEqual([]);
    expect(p.shopping.find((s) => s.itemId === 'chip19_white')?.qty).toBe(1);
    expect(p.shopping.some((s) => s.kind === 'edge')).toBe(true);
    expect(p.cost.gross).toBeGreaterThan(p.cost.net);
    expect(p.cost.labourMinutes).toBeGreaterThan(30);
  });
});
