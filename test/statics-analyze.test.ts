import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { GENERATOR_LIST } from '../src/core/generators';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { analyzeSystem } from '../src/core/statics/analyze';
import type { StaticSystem } from '../src/core/statics/model';

const site={altitude:0,snowZone:'2',windZone:2,terrain:'inland' as const};
function rafter():StaticSystem {
  return {id:'r',name:'Rafter',serviceClass:2,pitch:30,loadWidth:600,
    nodes:[{id:'a',x:0,z:0},{id:'b',x:4000,z:4000/Math.sqrt(3)}],
    members:[{id:'m',name:'Rafter',n1:'a',n2:'b',b:80,h:240,strengthClass:'C24',limitInst:300,limitFin:200}],
    supports:[{node:'a',ux:true,uz:true,ry:false},{node:'b',ux:true,uz:true,ry:false}],
    cases:[{id:'g',name:'G',category:'G'},{id:'s',name:'S',category:'S'}],
    memberLoads:[{member:'m',case:'g',qx:0,qz:-0.5},{member:'m',case:'s',qx:0,qz:-1,projected:true,site:'snow'}],nodeLoads:[]};
}

describe('preliminary structural report', () => {
  it('matches a complete independent inclined-rafter hand calculation', () => {
    // Reference derivation: equilibrium of a simply supported inclined beam and
    // integration EI*v''''=qnormal; EN1995-1-1 (6.11),(6.13), 2.2.3.
    // EC5 formula reference: INFORMATIONSDIENST HOLZ, Bemessung von BS-Holz-Bauteilen
    // nach EN1995-1-1 (2016), examples + appendix (own C24 arithmetic below):
    // https://informationsdienst-holz.de/fileadmin/Publikationen/2_Holzbau_Handbuch/R02_T01_F02_Bemessung-von-BS-Holz-Bauteilen-nach-EN-1995%E2%80%911%E2%80%911_2016-08.pdf
    // Tributary snow .85*.8*.6=.408 N/mm horizontal projection.
    // qGnormal=.5*cos30; qSnormal=.408*cos30²=.306 N/mm.
    const sys=rafter(), before=JSON.stringify(sys), report=analyzeSystem(sys,site), m=report.members[0];
    const L=4000*2/Math.sqrt(3), qG=0.5*Math.sqrt(3)/2, qS=0.306, qd=1.35*qG+1.5*qS;
    const I=80*240**3/12, W=80*240**2/6, fmd=0.9*24/1.3;
    const bending=m.checks.find((c) => c.key==='bending')!;
    expect(bending.eta).toBeCloseTo((qd*L*L/8/W)/fmd,9);
    const shear=m.checks.find((c) => c.key==='shear')!;
    expect(shear.eta).toBeCloseTo((1.5*(qd*L/2)/(0.67*80*240))/(0.9*4/1.3),9);
    const w=5*(qG+qS)*L**4/(384*11000*I);
    const wFin=5*(qG*1.8+qS)*L**4/(384*11000*I);
    expect(m.checks.find((c) => c.key==='instantaneous')!.eta).toBeCloseTo(w/(L/300),8);
    expect(m.checks.find((c) => c.key==='final')!.eta).toBeCloseTo(wFin/(L/200),8);
    expect(report.preliminary).toBe(true);
    expect(report.maxUtilization).toBeGreaterThan(0);
    expect(report.maxUtilization).toBeLessThan(1);
    expect(JSON.stringify(sys)).toBe(before);
    expect(m.envelope.length).toBeGreaterThanOrEqual(41);
    expect(m.checks.every((c) => c.combination && Number.isFinite(c.eta))).toBe(true);
  });
  it('does not hide opposite-direction wind by always combining it with snow', () => {
    const sys=rafter();
    sys.cases.push({id:'w',name:'Wind uplift',category:'W'});
    sys.memberLoads.push({member:'m',case:'w',qx:0,qz:3});
    const report=analyzeSystem(sys,site), envelopes=report.members[0].envelope;
    expect(envelopes.some((p) => p.M.min<0 && p.M.max>0)).toBe(true);
    const min=Math.min(...envelopes.map((p) => p.M.min));
    const governing=envelopes.find((p) => p.M.min===min)!;
    const combo=report.combinations.find((c) => c.id===governing.M.minCombination)!;
    expect(combo.factors.s).toBe(0);
    expect(combo.factors.g).toBe(1);
  });
  it('keeps physical serviceability span when a beam is split into FE segments', () => {
    const sys=rafter(); sys.nodes=[{id:'a',x:0,z:0},{id:'b',x:2000,z:0},{id:'c',x:4000,z:0}];
    sys.members=[{...sys.members[0],n2:'b'},{...sys.members[0],id:'m2',n1:'b',n2:'c'}];
    sys.supports=[{node:'a',ux:true,uz:true,ry:false},{node:'c',ux:false,uz:true,ry:false}];
    sys.memberLoads=[{member:'m',case:'g',qx:0,qz:-1},{member:'m2',case:'g',qx:0,qz:-1}];
    const report=analyzeSystem(sys,site);
    expect(report.members.map((m) => m.designLength)).toEqual([4000,4000]);
    const expected=5*4000**4/(384*11000*(80*240**3/12))/(4000/300);
    expect(report.members[0].checks.find((c) => c.key==='instantaneous')!.eta).toBeCloseTo(expected,8);
  });
  it('identifies a cantilever and reports assumptions rather than full structural approval', () => {
    const sys=rafter(); sys.supports=[{node:'a',ux:true,uz:true,ry:true}];
    const report=analyzeSystem(sys,site);
    expect(report.members[0].cantilever).toBe(true);
    expect(report.warnings.some((w) => w.key==='statics.warn.preliminary')).toBe(true);
    expect(report.warnings.some((w) => w.key==='statics.warn.lateralRestraintAssumed')).toBe(true);
    expect(report.assumptions.some((s) => s.includes('notches'))).toBe(true);
  });
  it('analyzes all actual roof/carport generator systems with finite, traceable results', () => {
    let analyzed=0;
    for (const generator of GENERATOR_LIST) {
      const doc=emptyDocument(); doc.generators.push({id:'g',type:generator.type,name:generator.type,frame:WORLD,params:{}});
      for (const sys of evaluate(doc).statics) {
        const nodes=new Map(sys.nodes.map((n) => [n.id,n]));
        expect(sys.members.some((m) => {
          const a=nodes.get(m.n1)!, b=nodes.get(m.n2)!;
          return a.x===b.x && a.z===b.z;
        })).toBe(false);
        const report=analyzeSystem(sys,site,{buildingHeight:10});
        analyzed++;
        expect(Number.isFinite(report.maxUtilization),`${generator.type}/${sys.id}`).toBe(true);
        expect(report.members).toHaveLength(sys.members.length);
        expect(report.results.length).toBeGreaterThan(0);
        for (const m of report.members) expect(m.checks.every((c) => Number.isFinite(c.eta))).toBe(true);
      }
    }
    expect(analyzed).toBeGreaterThan(0);
  });
});
