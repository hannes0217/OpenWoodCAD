import { mkdirSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { production } from '../src/core/production';
import { sheetsToDxf } from '../src/drawing/dxf';
import { generateDrawings } from '../src/drawing/sheets';
import { placedSpec } from '../src/ui/geomClient';
import { projectViews } from '../src/geom/solids';
import { loadKernel } from './kernel-node';

beforeAll(loadKernel);

describe('drawings', () => {
  it('labels raw weight and warns that unavailable stock is not included in purchasing totals',async()=>{
    const d=emptyDocument('Oversize');d.elements=[{id:'p',kind:'panel',name:'Too large',frame:WORLD,length:10000,width:100,height:19,materialId:'chip19_white',processings:[]}];
    const ev=evaluate(d),prod=production(ev,d.settings);
    const sheets=await generateDrawings(ev,prod,{format:'A3',lang:'en',date:'2026-10-15',project:d.project,t:k=>k,projector:async()=>{throw new Error('No projections requested');},include:{overview:false,views:false,parts:false,lists:true,nesting:false}});
    expect(sheets.some(s=>s.svg.includes('Raw kg'))).toBe(true);expect(sheets.some(s=>s.svg.includes('safe.unpriced'))).toBe(true);
  });
  it('generates all sheets for a kommode', async () => {
    const d = emptyDocument('Kommode Test');
    d.generators.push({ id: 'k', type: 'kommode', name: 'Kommode', frame: WORLD, params: {} });
    const ev = evaluate(d);
    const prod = production(ev, d.settings);
    const sheets = await generateDrawings(ev, prod, {
      format: 'A3', lang: 'de', date: '15.10.2026', project: d.project, t: (k) => k,
      projector: async (els, views) => projectViews(els.map(placedSpec), views),
      include: { overview: true, views: true, parts: true, lists: true, nesting: true },
    });
    expect(sheets.length).toBeGreaterThan(5);
    for (const s of sheets) expect(s.svg).toContain('<svg');
    const dxf = sheetsToDxf(sheets);
    expect(dxf).toContain('ENTITIES');
    if (process.env.OWC_DUMP) {
      mkdirSync(process.env.OWC_DUMP, { recursive: true });
      sheets.forEach((s, i) => writeFileSync(`${process.env.OWC_DUMP}/sheet${i + 1}.svg`, s.svg));
      writeFileSync(`${process.env.OWC_DUMP}/all.dxf`, dxf);
    }
  });
});
