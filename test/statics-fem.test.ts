import { describe, expect, it } from 'vitest';
import { solveFrame } from '../src/core/statics/fem2d';
import type { StaticSystem } from '../src/core/statics/model';

function beam(): StaticSystem {
  return { id:'beam',name:'Beam',serviceClass:1,nodes:[{id:'a',x:0,z:0},{id:'b',x:4000,z:0}],
    members:[{id:'m',name:'Beam',n1:'a',n2:'b',b:100,h:200,strengthClass:'C24'}],
    supports:[{node:'a',ux:true,uz:true,ry:false},{node:'b',ux:false,uz:true,ry:false}],
    cases:[{id:'g',name:'Uniform load',category:'G'}],memberLoads:[{member:'m',case:'g',qx:0,qz:-1}],nodeLoads:[] };
}
const EI=11000*100*200**3/12;

describe('2D Euler-Bernoulli frame', () => {
  it('matches a simply supported beam under uniform load, including exact interior deflection', () => {
    // Independent integration: EI*w''''=q, w(0)=w(L)=M(0)=M(L)=0.
    // Mmid=qL²/8; wmid=5qL⁴/(384EI); each reaction=qL/2.
    const result=solveFrame(beam(),{g:1}), m=result.members[0], mid=m.stations.find((p) => p.x===2000)!;
    expect(mid.M).toBeCloseTo(4000**2/8,5);
    expect(mid.v).toBeCloseTo(-5*4000**4/(384*EI),8);
    expect(m.stations[0].M).toBeCloseTo(0,5);
    expect(m.stations.at(-1)!.M).toBeCloseTo(0,5);
    expect(result.reactions.map((r) => r.fz)).toEqual([2000,2000]);
    expect(m.stations.length).toBeGreaterThanOrEqual(21);
  });
  it('matches cantilever reaction, root moment, tip displacement and rotation', () => {
    // Direct integration, built-in at x=0: M0=-qL²/2, wL=-qL⁴/(8EI), theta=-qL³/(6EI).
    const sys=beam(); sys.supports=[{node:'a',ux:true,uz:true,ry:true}];
    const r=solveFrame(sys,{g:1}), m=r.members[0];
    expect(m.stations[0].M).toBeCloseTo(-(4000**2)/2,4);
    expect(m.stations.at(-1)!.M).toBeCloseTo(0,4);
    expect(m.stations.at(-1)!.v).toBeCloseTo(-(4000**4)/(8*EI),7);
    expect(r.nodes[1].ry).toBeCloseTo(-(4000**3)/(6*EI),10);
    expect(r.reactions[0].fz).toBeCloseTo(4000,6);
    expect(r.reactions[0].my).toBeCloseTo(8000000,4);
  });
  it('matches the interior support moment of a two equal-span continuous beam', () => {
    // Three-moment theorem for two equally loaded spans: MB=-qL²/8.
    const sys=beam();
    sys.nodes.push({id:'c',x:8000,z:0});
    sys.members.push({...sys.members[0],id:'m2',n1:'b',n2:'c'});
    sys.supports.push({node:'c',ux:false,uz:true,ry:false});
    sys.memberLoads.push({...sys.memberLoads[0],member:'m2'});
    const r=solveFrame(sys,{g:1});
    expect(r.members[0].stations.at(-1)!.M).toBeCloseTo(-(4000**2)/8,4);
    expect(r.members[1].stations[0].M).toBeCloseTo(-(4000**2)/8,4);
    expect(r.reactions.reduce((s,r) => s+r.fz,0)).toBeCloseTo(8000,6);
  });
  it('condenses and recovers one end release with the correct load vector', () => {
    // Fixed-pinned uniformly loaded beam: MA=-qL²/8, RA=5qL/8, RB=3qL/8.
    const sys=beam(); sys.supports[0].ry=true; sys.members[0].hingeEnd=true;
    const r=solveFrame(sys,{g:1});
    expect(r.members[0].endForces[5]).toBeCloseTo(0,5);
    expect(r.members[0].stations[0].M).toBeCloseTo(-(4000**2)/8,4);
    expect(r.reactions[0].fz).toBeCloseTo(2500,6);
    expect(r.reactions[1].fz).toBeCloseTo(1500,6);
    expect(r.members[0].displacements[5]).not.toBe(0);
  });
  it('handles two releases without treating unused rotations as a mechanism', () => {
    const sys=beam(); sys.members[0].hingeStart=true; sys.members[0].hingeEnd=true;
    const m=solveFrame(sys,{g:1}).members[0];
    expect(m.endForces[2]).toBeCloseTo(0,5); expect(m.endForces[5]).toBeCloseTo(0,5);
    expect(m.stations.find((p) => p.x===2000)!.v).toBeCloseTo(-5*4000**4/(384*EI),8);
  });
  it('reports an actual internal hinge mechanism and a loaded disconnected rotation', () => {
    const sys=beam(); sys.supports=[];
    expect(() => solveFrame(sys,{g:1})).toThrow(/singularSystem/);
    sys.supports=beam().supports; sys.members[0].hingeStart=sys.members[0].hingeEnd=true;
    sys.nodeLoads=[{node:'a',case:'g',fx:0,fz:0,my:100}];
    expect(() => solveFrame(sys,{g:1})).toThrow(/singularSystem/);
  });
  it('applies horizontal projection once, then transforms inclined global loading', () => {
    const sys=beam(); sys.nodes[1]={id:'b',x:4000,z:3000}; sys.memberLoads[0].projected=true;
    // L=5000, cos=0.8. Total downward force=1*4000. qnormal=-0.8*0.8=-0.64.
    const r=solveFrame(sys,{g:1}), mid=r.members[0].stations.find((p) => p.x===2500)!;
    expect(r.reactions.reduce((s,r) => s+r.fz,0)).toBeCloseTo(4000,6);
    expect(mid.M).toBeCloseTo(0.64*5000**2/8,4);
    expect(r.members[0].qx).toBeCloseTo(-0.48,10);
  });
  it('rotates a normal wind load into the global force vector', () => {
    const sys=beam(); sys.nodes[1]={id:'b',x:4000,z:3000}; sys.memberLoads[0].normal=true;
    // Local qv=-1, global qx=+0.6, qz=-0.8, L=5000.
    const r=solveFrame(sys,{g:1});
    expect(r.reactions.reduce((s,r) => s+r.fx,0)).toBeCloseTo(-3000,6);
    expect(r.reactions.reduce((s,r) => s+r.fz,0)).toBeCloseTo(4000,6);
    expect(r.members[0].stations.find((p) => p.x===2500)!.M).toBeCloseTo(5000**2/8,4);
  });
  it('matches axial bar displacement and conserves nodal load and moment', () => {
    const sys=beam(); sys.memberLoads=[]; sys.nodeLoads=[{node:'b',case:'g',fx:10000,fz:0}];
    const r=solveFrame(sys,{g:1});
    // u=NL/(EA), N is positive in tension.
    expect(r.nodes[1].ux).toBeCloseTo(10000*4000/(11000*100*200),10);
    expect(r.members[0].stations[0].N).toBeCloseTo(10000,6);
    expect(r.reactions[0].fx).toBeCloseTo(-10000,6);
  });
  it('validates references, finite values, sections and unresolved site actions', () => {
    const sys=beam(); sys.members[0].b=0;
    expect(() => solveFrame(sys,{g:1})).toThrow(/positive/);
    sys.members[0].b=100; sys.nodes[1].x=NaN;
    expect(() => solveFrame(sys,{g:1})).toThrow(/finite/);
    sys.nodes[1].x=4000; sys.memberLoads[0].site='snow';
    expect(() => solveFrame(sys,{g:1})).toThrow(/unresolvedSiteLoad/);
    sys.memberLoads[0].site=undefined; sys.memberLoads[0].case='missing';
    expect(() => solveFrame(sys,{g:1})).toThrow(/Unknown/);
  });
  it('does not depend on member orientation or mutate the input', () => {
    const sys=beam(), snapshot=JSON.stringify(sys), normal=solveFrame(sys,{g:1});
    expect(JSON.stringify(sys)).toBe(snapshot);
    [sys.members[0].n1,sys.members[0].n2]=['b','a'];
    const reversed=solveFrame(sys,{g:1});
    expect(reversed.reactions[0].fz).toBeCloseTo(normal.reactions[0].fz,6);
    // Local normal reverses as well, so M and v change local signs.
    expect(reversed.members[0].stations.find((p) => p.x===2000)!.M).toBeCloseTo(-2000000,5);
    expect(reversed.members[0].stations.find((p) => p.x===2000)!.v).toBeCloseTo(-normal.members[0].stations.find((p) => p.x===2000)!.v,7);
  });
});
