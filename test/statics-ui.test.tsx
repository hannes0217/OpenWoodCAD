import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { analyzeSystem } from '../src/core/statics/analyze';
import { staticsDe, staticsEn } from '../src/ui/i18n-statics';
import { StaticsReportContent } from '../src/ui/views/Statics';

describe('preliminary structural report UI', () => {
  it('provides matching German and English translations with identical parameters', () => {
    expect(Object.keys(staticsDe).sort()).toEqual(Object.keys(staticsEn).sort());
    for (const key of Object.keys(staticsDe)) {
      expect(staticsDe[key]).not.toBe(''); expect(staticsEn[key]).not.toBe('');
      expect(staticsDe[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(staticsEn[key].match(/\{\w+\}/g)?.sort() ?? []);
    }
  });
  it('renders actual roof results, equations, diagrams and warnings in both languages', () => {
    const doc=emptyDocument('Roof <script>alert(1)</script>');
    doc.generators.push({id:'g',type:'satteldach',name:'Roof',frame:WORLD,params:{}});
    const system=evaluate(doc).statics[0];
    const report=analyzeSystem(system,doc.project.site);
    for (const lang of ['de','en'] as const) {
      const html=renderToStaticMarkup(createElement(StaticsReportContent,{report,system,site:doc.project.site,lang,
        combinationId:report.combinations[0].id,quantity:'M',projectName:doc.project.name}));
      expect(html).toContain(lang==='de'?'Statische Vorbemessung':'Preliminary structural design');
      expect(html).toContain('EN 1995-1-1'); expect(html).toContain('<svg'); expect(html).toContain('25 m');
      expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
      expect(html).not.toMatch(/statics\.(warn|assumption|check)\./);
      expect(html).not.toContain('NaN'); expect(html).not.toContain('Infinity');
    }
  });
});
