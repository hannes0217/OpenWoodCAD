import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WORLD } from '../src/core/math';
import type { SolidSpec } from '../src/geom/protocol';
import { clearCache, meshFor, overlapVolumes, projectViews, stepFile, stlFile, volumes } from '../src/geom/solids';
import { loadKernel } from './kernel-node';
beforeAll(loadKernel);afterAll(clearCache);
describe('manufacturing geometry safety',()=>{
 it('retains a diagnostic preview but blocks all derived geometry when a real OCCT processing fails',()=>{
  const spec:SolidSpec={sig:'bad-drilling',length:500,width:100,height:100,procs:[{id:'bad',type:'drilling',geom:'drill',p:[100,50,100],dir:[0,0,-1],dia:-10,depth:20,through:false}]};
  const preview=meshFor(spec);expect(preview.failed).toEqual(['bad']);expect(preview.mesh.vertices.length).toBeGreaterThan(0);
  const placed={...spec,frame:WORLD};
  expect(()=>stepFile([{...placed,name:'Bad part'}])).toThrow(/incomplete/);
  expect(()=>stlFile([placed])).toThrow(/incomplete/);expect(()=>projectViews([placed],[{kind:'plane',plane:'front'}])).toThrow(/incomplete/);
  expect(()=>volumes([spec])).toThrow(/incomplete/);expect(()=>overlapVolumes([placed,placed],[[0,1]])).toThrow(/incomplete/);
 });
 it('continues to export a correctly constructed solid',()=>{
  const placed={sig:'good-box',length:500,width:100,height:100,procs:[],frame:WORLD};
  expect(stepFile([{...placed,name:'Good part'}]).size).toBeGreaterThan(100);
  expect(stlFile([placed]).byteLength).toBeGreaterThan(84);expect(volumes([placed])[0]).toBeCloseTo(500*100*100,-2);
 });
});
