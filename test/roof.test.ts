import { describe, expect, it } from 'vitest';
import { staticChecks } from '../src/core/checks';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { production } from '../src/core/production';
import { rafterSystem } from '../src/core/generators/roof';

function roof(type: string, params: Record<string, number | string | boolean>) {
  const d = emptyDocument('t');
  d.generators.push({ id: 'g', type, name: type, frame: WORLD, params });
  const ev = evaluate(d);
  return { ev, issues: staticChecks(ev, production(ev, d.settings)) };
}

describe('roofs', () => {
  it('deduplicates supports at rafter endpoints and preserves the full timber self-weight', () => {
    const sys=rafterSystem('r','R',[{y:0},{y:4000}],-500,4000,0.5,80,200,'C24',600,550);
    expect(sys.nodes).toHaveLength(3);
    expect(sys.members).toHaveLength(2);
    expect(new Set(sys.nodes.map((n) => n.x)).size).toBe(sys.nodes.length);
    // 550N/m² * 600mm / 1e6 = .33N/mm; 4.2kN/m³ * .08m * .2m = .0672kN/m.
    const gravity=sys.memberLoads.find((l) => l.case==='g')!;
    expect(gravity.qz).toBeCloseTo(-0.3972,12);
    expect(sys.supports.map((s) => s.node)).toEqual(['n1','n2']);
  });
  it('purlin roof with battens has no issues and spliced battens within stock length', () => {
    const { ev, issues } = roof('satteldach', { battens: true });
    expect(issues).toEqual([]);
    const bat = ev.elements.filter((e) => e.role === 'batten');
    expect(bat.length).toBeGreaterThan(20);
    expect(Math.max(...bat.map((b) => b.length))).toBeLessThanOrEqual(4900);
  });
  it('collar roof laps collar ties onto rafters', () => {
    const { ev, issues } = roof('satteldach', { system: 'collar' });
    expect(issues).toEqual([]);
    const collars = ev.elements.filter((e) => e.role === 'collarTie');
    expect(collars.length).toBeGreaterThan(5);
    expect(collars[0].all.filter((p) => p.type === 'lap')).toHaveLength(2);
  });
  it('rafters get birdsmouths on both purlins and a plumb eaves cut', () => {
    const { ev } = roof('satteldach', {});
    const r = ev.elements.find((e) => e.role === 'rafter')!;
    expect(r.all.filter((p) => p.type === 'birdsMouth')).toHaveLength(2);
    expect(r.all.some((p) => p.type === 'jackRafterCut')).toBe(true);
    expect(r.all.some((p) => p.type === 'miter')).toBe(true);
  });
  it('emits a rafter statics system', () => {
    const { ev } = roof('satteldach', {});
    expect(ev.statics).toHaveLength(1);
    expect(ev.statics[0].supports).toHaveLength(2);
  });
  it('mono-pitch roof builds', () => {
    const { ev, issues } = roof('pultdach', { battens: true });
    expect(issues).toEqual([]);
    expect(ev.elements.filter((e) => e.role === 'rafter').length).toBeGreaterThan(5);
  });
  it('carport builds without issues', () => {
    const { ev, issues } = roof('carport', {});
    expect(issues).toEqual([]);
    // 5500 mm with max. 2600 mm spacing → 3 bays → 4 posts per row
    expect(ev.elements.filter((e) => e.role === 'post')).toHaveLength(8);
  });
});
