import { describe, expect, it } from 'vitest';
import { bucklingFactor, checkDeflection, checkMember, displacementAt, lateralFactor, resistance, sizeFactor } from '../src/core/statics/ec5';
import { solveFrame } from '../src/core/statics/fem2d';
import type { SMember, StaticSystem } from '../src/core/statics/model';

const member:SMember={id:'m',name:'M',n1:'a',n2:'b',b:100,h:200,strengthClass:'C24'};
function system(): StaticSystem {
  return {id:'s',name:'S',serviceClass:1,nodes:[{id:'a',x:0,z:0},{id:'b',x:4000,z:0}],members:[member],
    supports:[{node:'a',ux:true,uz:true,ry:false},{node:'b',ux:false,uz:true,ry:false}],
    cases:[{id:'g',name:'G',category:'G'}],memberLoads:[{member:'m',case:'g',qx:0,qz:-1}],nodeLoads:[]};
}

describe('EC5 rectangular timber checks', () => {
  it('matches hand-calculated stresses and resistances for C24', () => {
    // Independent rectangle statics: A=20000mm², W=666666.667mm³.
    // q=1N/mm, L=4000mm => M=2e6Nmm, V=2000N. sigma=3MPa, tau=1.5*2000/(.67*20000).
    // EN1995-1-1 (6.11),(6.13), C24 fmk=24,fvk=4; kmod=.9,gammaM=1.3,kh=1.
    const result=solveFrame(system(),{g:1}).members[0];
    const checks=checkMember(member,result,1,'short');
    expect(checks.find((c) => c.key==='bending')!.eta).toBeCloseTo(3/(0.9*24/1.3),10);
    expect(checks.find((c) => c.key==='shear')!.eta).toBeCloseTo((1.5*2000/(0.67*20000))/(0.9*4/1.3),10);
    expect(checks.every((c) => c.reference.includes('EN 1995'))).toBe(true);
    expect(checks.every((c) => Number.isFinite(c.eta))).toBe(true);
  });
  it('uses size-factor bounds and glulam sizing independently of solid timber', () => {
    expect(sizeFactor('solid',150)).toBe(1);
    expect(sizeFactor('solid',100)).toBeCloseTo(1.5**0.2,12);
    expect(sizeFactor('solid',20)).toBe(1.3);
    expect(sizeFactor('solid',50,750)).toBe(1);
    expect(sizeFactor('glulam',600)).toBe(1);
    expect(sizeFactor('glulam',300)).toBeCloseTo(2**0.1,12);
    expect(sizeFactor('glulam',100)).toBe(1.1);
  });
  it('matches Euler-relative slenderness and EC5 buckling reduction', () => {
    // lambda_rel=(L/(h/sqrt(12)))/pi*sqrt(fc0k/E005).
    const r=resistance(member,4000,1,'short');
    const ly=4000/(200/Math.sqrt(12))/Math.PI*Math.sqrt(21/7400);
    const lz=4000/(100/Math.sqrt(12))/Math.PI*Math.sqrt(21/7400);
    const k=0.5*(1+0.2*(lz-0.3)+lz*lz);
    expect(r.lambdaY).toBeCloseTo(ly,12);
    expect(r.lambdaZ).toBeCloseTo(lz,12);
    expect(r.kcZ).toBeCloseTo(1/(k+Math.sqrt(k*k-lz*lz)),12);
    expect(r.kcZ).toBeLessThan(r.kcY);
    expect(bucklingFactor(0.2,'solid')).toBe(1);
    expect(bucklingFactor(1,'glulam')).toBeGreaterThan(bucklingFactor(1,'solid'));
  });
  it('uses lateral restraint spacing and all kcrit branches', () => {
    // EN1995-1-1 6.3.3: rectangular approximation sigma_mcrit=.78*b²*E005/(h*lef).
    // Additional top-edge-load effective length 2h; uniform-moment shape is conservative.
    const r=resistance({...member,lateralSpacing:4000},4000,1,'short');
    expect(r.effectiveLateralLength).toBe(4400);
    expect(r.lambdaM).toBeCloseTo(Math.sqrt(24/(0.78*10000*7400/(200*4400))),12);
    expect(r.kcrit).toBe(1); // This stocky section is below lambda_rel,m=.75.
    expect(resistance({...member,b:50,lateralSpacing:4000},4000,1,'short').kcrit).toBeLessThan(1);
    expect(resistance(member,4000,1,'short').kcrit).toBe(1);
    expect(lateralFactor(0.75)).toBe(1);
    expect(lateralFactor(1)).toBeCloseTo(0.81,12);
    expect(lateralFactor(2)).toBe(0.25);
  });
  it('checks coincident tension/compression with bending rather than isolated stresses only', () => {
    const sys=system(); sys.nodeLoads=[{node:'b',case:'g',fx:100000,fz:0}];
    let checks=checkMember(member,solveFrame(sys,{g:1}).members[0],1,'short');
    expect(checks.find((c) => c.key==='tensionBending')!.eta).toBeGreaterThan(checks.find((c) => c.key==='bending')!.eta);
    sys.nodeLoads[0].fx=-100000;
    checks=checkMember(member,solveFrame(sys,{g:1}).members[0],1,'short');
    expect(checks.find((c) => c.key==='compressionBending')!.eta).toBeGreaterThan(checks.find((c) => c.key==='bending')!.eta);
    expect(checks.find((c) => c.key==='buckling')!.eta).toBeGreaterThan(checks.find((c) => c.key==='compression')!.eta);
  });
  it('uses signed SLS displacement and doubles the reference length for cantilevers', () => {
    const stations=[{x:0,instantaneous:0,final:0},{x:4000,instantaneous:-20,final:-30}];
    const ordinary=checkDeflection(member,4000,2,stations);
    const cantilever=checkDeflection(member,4000,2,stations,{cantilever:true});
    expect(ordinary[0].eta).toBeCloseTo(20/(4000/300),12);
    expect(cantilever[0].eta).toBeCloseTo(ordinary[0].eta/2,12);
    expect(ordinary[1].values.kdef).toBe(0.8);
  });
  it('evaluates exact uniform-load displacement between stored sample stations', () => {
    const result=solveFrame(system(),{g:1}).members[0], x=1377;
    // Integrated beam equation, simply supported: q*x*(L³-2Lx²+x³)/(24EI).
    const expected=-x*(4000**3-2*4000*x*x+x**3)/(24*(11000*100*200**3/12));
    expect(displacementAt(result,x)).toBeCloseTo(expected,10);
  });
});
