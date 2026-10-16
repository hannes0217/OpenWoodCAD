import { describe, expect, it } from 'vitest';
import { loadCombinations, resolveSiteLoads, roofSnow, sk, snowShape, windPressure } from '../src/core/statics/loads';
import type { StaticSystem } from '../src/core/statics/model';

function system(): StaticSystem {
  return {id:'s',name:'S',serviceClass:2,nodes:[{id:'a',x:0,z:0},{id:'b',x:4000,z:2000}],
    members:[{id:'m',name:'M',n1:'a',n2:'b',b:80,h:200,strengthClass:'C24'}],supports:[],
    cases:[{id:'s',name:'Snow',category:'S'},{id:'w',name:'Wind',category:'W'}],
    memberLoads:[{member:'m',case:'s',qx:0,qz:-1,site:'snow',projected:true},{member:'m',case:'w',qx:0,qz:-1,site:'wind',normal:true}],
    nodeLoads:[],loadWidth:600,pitch:30,cpe:0.6};
}
const site={altitude:300,snowZone:'2',windZone:2,terrain:'inland' as const};

describe('German site actions', () => {
  it('matches independent ground-snow hand calculations at several elevations', () => {
    // NA equations: zone 1 uses 0.19+0.91*t; zone 2 0.25+1.91*t;
    // zone 3 0.31+2.91*t; t=((A+140)/760)^2. No production helper in expected values.
    // Public source: INFORMATIONSDIENST HOLZ, Nagelplattenkonstruktionen nach EC5 (2017), snow actions.
    expect(sk('1',0)).toBe(0.65); expect(sk('1a',0)).toBe(0.81);
    expect(sk('2',0)).toBe(0.85); expect(sk('2a',0)).toBe(1.06); expect(sk('3',0)).toBe(1.10);
    expect(sk('1',620)).toBeCloseTo(1.10,12);
    expect(sk('2',620)).toBeCloseTo(2.16,12);
    expect(sk('3',620)).toBeCloseTo(3.22,12);
    expect(sk('1a',620)).toBeCloseTo(1.375,12);
    expect(sk('2a',620)).toBeCloseTo(2.7,12);
    expect(sk('2',300)).toBeCloseTo(0.25+1.91*(11/19)**2,12);
  });
  it('uses snow slope boundaries and Ce=Ct=1', () => {
    expect(snowShape(0)).toBe(0.8); expect(snowShape(30)).toBe(0.8);
    expect(snowShape(45)).toBeCloseTo(0.4,12); expect(snowShape(60)).toBe(0);
    expect(snowShape(70)).toBe(0); expect(snowShape(-45)).toBeCloseTo(0.4,12);
    expect(roofSnow('2',0,45)).toBeCloseTo(0.34,12);
    expect(() => sk('4',0)).toThrow(/snowOutsideScope/);
    expect(() => sk('1',1501)).toThrow(/snowOutsideScope/);
    expect(() => snowShape(91)).toThrow(/invalidInput/);
  });
  it('matches NA.B.3 at every height boundary', () => {
    // DGfM teaching portal 3.2.3, table 3-7, NA.B.3.
    expect([10,18,25].map((h) => windPressure(1,'inland',h))).toEqual([0.5,0.65,0.75]);
    expect([10,18,25].map((h) => windPressure(2,'inland',h))).toEqual([0.65,0.8,0.9]);
    expect([10,18,25].map((h) => windPressure(3,'inland',h))).toEqual([0.8,0.95,1.1]);
    expect([10,18,25].map((h) => windPressure(4,'inland',h))).toEqual([0.95,1.15,1.3]);
    expect([10,18,25].map((h) => windPressure(4,'coast',h))).toEqual([1.25,1.4,1.55]);
    expect(windPressure(2,'coast',10)).toBe(0.85);
    expect(windPressure(3,'coast',18)).toBe(1.2);
    expect(windPressure(4,'islands',10)).toBe(1.4);
    expect(windPressure(1,'inland',10.001)).toBe(0.65);
    expect(windPressure(1,'inland',18.001)).toBe(0.75);
  });
  it('refuses unsupported island, coastal, height and wind-zone values', () => {
    expect(() => windPressure(4,'islands',10.01)).toThrow(/windOutsideScope/);
    expect(() => windPressure(3,'islands',10)).toThrow(/windOutsideScope/);
    expect(() => windPressure(1,'coast',10)).toThrow(/windOutsideScope/);
    expect(() => windPressure(4,'inland',25.01)).toThrow(/windOutsideScope/);
    expect(() => windPressure(0,'inland',10)).toThrow(/windOutsideScope/);
  });
  it('resolves area units once without projecting or rotating prematurely', () => {
    const sys=system(), before=JSON.stringify(sys);
    const resolved=resolveSiteLoads(sys,{...site,altitude:0},{buildingHeight:10});
    // Snow = .85*.8 kN/m² * .001 N/mm² per kN/m² * 600mm = .408N/mm.
    expect(resolved.system.memberLoads[0].qz).toBeCloseTo(-0.408,12);
    expect(resolved.system.memberLoads[0].projected).toBe(true);
    expect(resolved.system.memberLoads[1].qz).toBeCloseTo(-0.65*0.6*0.001*600,12);
    expect(resolved.system.memberLoads.every((l) => l.site===undefined)).toBe(true);
    expect(JSON.stringify(sys)).toBe(before);
  });
  it('reports assumed height and coefficient and rejects missing load inputs', () => {
    const sys=system(); sys.cpe=undefined;
    const r=resolveSiteLoads(sys,site);
    expect(r.warnings.map((w) => w.key)).toContain('statics.warn.windHeightAssumed');
    expect(r.warnings.map((w) => w.key)).toContain('statics.warn.windCoefficientAssumed');
    sys.loadWidth=undefined;
    expect(() => resolveSiteLoads(sys,site)).toThrow(/invalidInput/);
    sys.loadWidth=600; sys.pitch=undefined;
    expect(() => resolveSiteLoads(sys,site)).toThrow(/pitch/);
  });
  it('rejects high-altitude combination assumptions rather than using lowland PSI', () => {
    expect(() => resolveSiteLoads(system(),{...site,altitude:1000})).toThrow(/snowCombinationOutsideScope/);
  });
});

describe('EN 1990 load combinations', () => {
  const cases=[{id:'g',name:'G',category:'G' as const},{id:'s',name:'S',category:'S' as const},{id:'w',name:'W',category:'W' as const}];
  it('makes snow and wind leading and handles favourable permanent actions', () => {
    const list=loadCombinations(cases);
    expect(list.some((c) => c.kind==='uls' && c.factors.g===1.35 && c.factors.s===1.5 && Math.abs(c.factors.w-0.9)<1e-12)).toBe(true);
    expect(list.some((c) => c.kind==='uls' && c.factors.g===1 && c.factors.w===1.5 && c.factors.s===0.75)).toBe(true);
    expect(list.some((c) => c.kind==='uls' && c.factors.g===1 && c.factors.w===1.5 && c.factors.s===0)).toBe(true);
    expect(list.some((c) => c.kind==='uls' && c.factors.g===1.35 && c.factors.s===0 && c.factors.w===0)).toBe(true);
  });
  it('provides SLS characteristic and quasi-permanent factors without duplicates', () => {
    const list=loadCombinations([...cases,{id:'q',name:'Q',category:'QA'}]);
    expect(list.some((c) => c.kind==='characteristic' && c.factors.s===1 && c.factors.w===0.6 && c.factors.q===0.7)).toBe(true);
    expect(list.some((c) => c.kind==='quasiPermanent' && c.factors.q===0.3 && c.factors.s===0 && c.factors.w===0)).toBe(true);
    expect(new Set(list.map((c) => `${c.kind}:${JSON.stringify(c.factors)}`)).size).toBe(list.length);
  });
  it('takes kmod duration from the shortest actually active action', () => {
    const list=loadCombinations(cases);
    expect(list.filter((c) => c.factors.s || c.factors.w).every((c) => c.duration==='short')).toBe(true);
    expect(list.filter((c) => !c.factors.s && !c.factors.w).every((c) => c.duration==='permanent')).toBe(true);
  });
});
