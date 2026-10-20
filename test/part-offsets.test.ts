import { afterEach,beforeAll,describe,expect,it,vi } from 'vitest';
import { copyObjects } from '../src/core/assemblies';
import { evaluate } from '../src/core/evaluate';
import { frameFromEuler,toWorld,WORLD } from '../src/core/math';
import { emptyDocument,FORMAT_VERSION } from '../src/core/model';
import { partOffsetBlock,partOffsetKey,validPartOffsets } from '../src/core/partOffsets';
import { validateDocument } from '../src/core/validate';
import { commitPartPlacement,partPlacementCandidate,partPlacementInfo } from '../src/ui/partPlacement';
import { getState,setState,undo,updateDoc } from '../src/ui/store';
import { applyFrame,buildLocalSolid,volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';
const initial=getState();beforeAll(loadKernel);
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
function fixture(){const doc=emptyDocument();doc.generators=[{id:'g',type:'regal',name:'Regal',frame:structuredClone(WORLD),params:{}}];
 const ev=evaluate(doc),part=ev.elements.find(e=>e.role==='shelf')!;return {doc,ev,part,key:partOffsetKey('g',part.id)};}
describe('generator-local part offsets',()=>{
 it('moves an independent shelf in template axes, retains driving dimensions after resizing, and round trips format 6',()=>{
  const {doc,part,key}=fixture();doc.generators[0].frame=frameFromEuler([100,200,300],[90,0,0]);
  const candidate=partPlacementCandidate(doc,part.id,[0,0,64]).doc;
  const before=evaluate(doc).elements.find(e=>e.id===part.id)!,after=evaluate(candidate).elements.find(e=>e.id===part.id)!;
  expect(after.frame.o).toEqual(toWorld(doc.generators[0].frame,[part.frame.o[0],part.frame.o[1],part.frame.o[2]+64]));
  expect(after.length).toBe(before.length);candidate.generators[0].params.width=1000;
  const unshifted=structuredClone(candidate);delete unshifted.generators[0].partOffsets;
  const resized=evaluate(candidate).elements.find(e=>e.id===part.id)!,nominal=evaluate(unshifted).elements.find(e=>e.id===part.id)!;
  expect(resized.length).toBeGreaterThan(before.length);expect(resized.frame.o[2]-nominal.frame.o[2]).toBeCloseTo(64);
  const restored=validateDocument(JSON.parse(JSON.stringify(candidate)));expect(restored.errors).toEqual([]);expect(restored.doc?.version).toBe(FORMAT_VERSION);expect(restored.doc?.generators[0].partOffsets?.[key]).toEqual([0,0,64]);
 });
 it('keeps offsets local through rotated parent assemblies and copied generator IDs',()=>{
  const {doc,part,key}=fixture();doc.groups=[{id:'a',name:'A',frame:frameFromEuler([300,400,500],[30,20,10])}];doc.generators[0].groupId='a';
  doc.generators[0].partOffsets={[key]:[0,0,32]};
  const ev=evaluate(doc),original=ev.elements.find(e=>e.id===part.id)!;
  const copied=copyObjects(doc,ev,['group:a'],[2000,0,0]),out=evaluate(doc),copy=out.elements.find(e=>e.generator!=='g'&&e.role==='shelf')!;
  expect(copied).toHaveLength(1);expect(doc.generators[1].partOffsets).toEqual({[key]:[0,0,32]});
  expect(copy.frame.o.map((v,i)=>v-original.frame.o[i])).toEqual([2000,0,0]);expect(validateDocument(doc).errors).toEqual([]);
 });
 it('rejects malformed, missing and newly connected offsets instead of silently rebinding IDs',()=>{
  const {doc,part,key}=fixture();expect(validPartOffsets({[key]:[0,NaN,0]})).toBe(false);expect(validPartOffsets({[key]:[0,0,1e7]})).toBe(false);
  const candidate=partPlacementCandidate(doc,part.id,[0,0,64]).doc;
  candidate.generators[0].params.shelves=0;
  expect(evaluate(candidate).warnings.some(w=>w.key==='offset.missing')).toBe(true);expect(validateDocument(candidate).doc).toBeNull();
  candidate.generators[0].partOffsets={'deleted-part':[0,0,64]};expect(evaluate(candidate).warnings.some(w=>w.key==='offset.missing')).toBe(true);expect(validateDocument(candidate).doc).toBeNull();
  const connected=partPlacementCandidate(doc,part.id,[0,0,64]).doc;
  connected.joints=[{id:'external',type:'dowel',a:part.id,b:doc.generators[0].id+'/side-l',params:{}}];
  expect(evaluate(connected).warnings.some(w=>w.key==='offset.blocked')).toBe(true);expect(validateDocument(connected).doc).toBeNull();
  const unknown=partPlacementCandidate(doc,part.id,[0,0,64]).doc;unknown.generators[0].type='missing-generator';expect(validateDocument(unknown).doc).toBeNull();
  const legacy=structuredClone(doc);legacy.version=5;expect(validateDocument(legacy).doc?.version).toBe(FORMAT_VERSION);
 });
 it('blocks connected/machined/moving/structural members, commits once, resets, and refuses stale projects',()=>{
  vi.useFakeTimers();const {doc,ev,part}=fixture();
  expect(partOffsetBlock({...part,motion:{group:'door',dir:[1,0,0],travel:100}},[],false)).toBe('offset.motion');
  expect(partOffsetBlock(part,[],true)).toBe('offset.statics');
  expect(partOffsetBlock({...part,processings:[{id:'hole',type:'drilling',geom:'drill',p:[0,0,0],dir:[0,0,1],dia:5,depth:10,through:false}]},[],false)).toBe('offset.machined');
  const malformed=structuredClone(doc);malformed.generators[0].partOffsets={[partOffsetKey('g',part.id)]:[0,0,Infinity]};expect(validateDocument(malformed).doc).toBeNull();
  const side=ev.elements.find(e=>e.role==='side')!;expect(partPlacementInfo(doc,ev,side.id)?.blocked).toBeTruthy();expect(()=>partPlacementCandidate(doc,side.id,[0,0,32])).toThrow();
  setState({...initial,doc,projectId:'offset',past:[],future:[]});expect(commitPartPlacement(doc,'other',part.id,[0,0,32])).toBe(false);
  expect(commitPartPlacement(doc,'offset',part.id,[0,0,32])).toBe(true);expect(getState().past).toHaveLength(1);
  const saved=getState().doc;expect(updateDoc(d=>{d.generators[0].params.shelves=0;})).toBe(false);expect(getState().doc).toBe(saved);expect(getState().past).toHaveLength(1);
  expect(commitPartPlacement(doc,'offset',part.id,[0,0,64])).toBe(false);undo();expect(getState().doc).toBe(doc);
  const adjusted=partPlacementCandidate(doc,part.id,[0,0,32]).doc;expect(partPlacementCandidate(adjusted,part.id,[0,0,0]).doc.generators[0].partOffsets).toBeUndefined();
 });
 it('builds the adjusted shelf as real OCCT geometry with unchanged volume and no intersections at +64 mm',()=>{
  const {doc,part}=fixture(),ev=partPlacementCandidate(doc,part.id,[0,0,64]).evaluation;
  const e=ev.elements.find(e=>e.id===part.id)!,built=buildLocalSolid(e,e.all);expect(built.failed).toEqual([]);expect(volumeOf(built.shape)).toBeCloseTo(e.length*e.width*e.height,0);
  const solid=applyFrame(built.shape,e.frame);
  try{for(const other of ev.elements.filter(p=>p.id!==e.id)){
   const builtOther=buildLocalSolid(other,other.all);expect(builtOther.failed).toEqual([]);const shape=applyFrame(builtOther.shape,other.frame),intersection=solid.intersect(shape);
   try{expect(volumeOf(intersection)).toBeLessThan(1);}finally{intersection.delete();shape.delete();}
  }}finally{solid.delete();}
 });
});
