import { afterEach,beforeAll,describe,expect,it,vi } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { objectWorldFrame } from '../src/core/assemblies';
import { add,frameFromEuler,rotateVec,WORLD,type Vec3 } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { applyFrame,buildLocalSolid,volumeOf } from '../src/geom/kernel';
import { alignmentCandidate,beginAlignment,captureAlignmentFace,closeAlignment,commitAlignment,faceAlignment } from '../src/ui/faceAlignment';
import { getState,setState,undo } from '../src/ui/store';
import { loadKernel } from './kernel-node';
const initial=getState();beforeAll(loadKernel);
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
function fixture(){const doc=emptyDocument();doc.elements=[
 {id:'beam',name:'Beam',kind:'beam',frame:{...structuredClone(WORLD),o:[50,50,100]},length:100,width:50,height:80,materialId:'kvh_c24',processings:[]},
 {id:'panel',name:'Panel',kind:'panel',frame:structuredClone(WORLD),length:600,width:400,height:19,materialId:'chip19_white',processings:[]},
 ];return {doc,source:{id:'beam',point:[75,75,100] as Vec3,normal:[0,0,-1] as Vec3},target:{id:'panel',point:[300,200,19] as Vec3,normal:[0,0,1] as Vec3}};}
describe('one-time face placement',()=>{
 it('sets plane distance without tangential movement, or matches picked points explicitly',()=>{
  const {doc,source,target}=fixture(),saved=JSON.stringify(doc);
  const plane=alignmentCandidate(doc,['beam'],source,target,10);
  expect(objectWorldFrame(plane.doc,'beam').o).toEqual([50,50,29]);expect(JSON.stringify(doc)).toBe(saved);
  const point=faceAlignment(source,target,10,false,'point');expect(add(source.point,point.delta)).toEqual([300,200,29]);
  expect(plane.evaluation.elements.find(e=>e.id==='panel')?.frame.o).toEqual([0,0,0]);
 });
 it('handles opposite, oblique and same-direction normals as a rigid rotation around the captured source point',()=>{
  const {source,target}=fixture();source.normal=[0,0,1];
  const flipped=faceAlignment(source,target,0);expect(flipped.angle).toBeCloseTo(Math.PI);
  expect(rotateVec(source.normal,flipped.axis,flipped.angle)[2]).toBeCloseTo(-1);
  expect(faceAlignment(source,target,0,true).angle).toBeCloseTo(0);
  source.normal=[1,0,0];const oblique=faceAlignment(source,target,0);
  expect(rotateVec(source.normal,oblique.axis,oblique.angle)[2]).toBeCloseTo(-1);
  expect(()=>faceAlignment({...source,normal:[0,0,0]},target,0)).toThrow();expect(()=>faceAlignment(source,target,Infinity)).toThrow();
 });
 it('moves a nested assembly once even when a child is selected too, retaining world placement under a rotated parent',()=>{
  const {doc,source,target}=fixture();
  doc.groups=[{id:'parent',name:'Parent',frame:frameFromEuler([200,100,0],[30,0,0])},{id:'a',name:'A',parent:'parent',frame:structuredClone(WORLD)}];doc.elements[0].groupId='a';
  const before=objectWorldFrame(doc,'beam'),result=alignmentCandidate(doc,['group:a','beam'],source,target,0);
  const after=objectWorldFrame(result.doc,'beam');expect(after.o[2]-before.o[2]).toBeCloseTo(-81);expect(after.o[0]).toBeCloseTo(before.o[0]);
  expect(objectWorldFrame(result.doc,'group:parent')).toEqual(objectWorldFrame(doc,'group:parent'));
 });
 it('rejects an internal target, wrong source and rotation of a structural template',()=>{
  const {doc,source,target}=fixture();expect(()=>alignmentCandidate(doc,['beam','panel'],source,target,0)).toThrow('align.outside');
  expect(()=>alignmentCandidate(doc,['panel'],source,target,0)).toThrow('align.outside');
  doc.generators=[{id:'roof',name:'Roof',type:'satteldach',frame:structuredClone(WORLD),params:{}}];
  const roof=evaluate(doc).elements.find(e=>e.generator==='roof')!;
  expect(()=>alignmentCandidate(doc,['gen:roof'],{...source,id:roof.id,normal:[0,0,1]},target,0)).toThrow('align.statics');
 });
 it('captures valid faces without mutating the document, commits once, undoes and rejects stale projects',()=>{
  vi.useFakeTimers();const {doc,source,target}=fixture();setState({...initial,doc,projectId:'align',selection:['beam'],past:[],future:[]});
  expect(beginAlignment()).toBe(true);captureAlignmentFace(target);expect(getState().alignmentEdit?.error).toBe('align.outside');
  captureAlignmentFace(source);captureAlignmentFace(target);const edit=getState().alignmentEdit!;
  expect(getState().doc).toBe(doc);expect(getState().past).toEqual([]);setState({projectId:'different'});expect(commitAlignment(edit,0)).toBe(false);setState({projectId:'align'});
  expect(commitAlignment(edit,0)).toBe(true);expect(getState().past).toHaveLength(1);expect(objectWorldFrame(getState().doc,'beam').o[2]).toBe(19);
  undo();expect(getState().doc).toBe(doc);beginAlignment();closeAlignment();expect(getState().doc).toBe(doc);
 });
 it('creates valid contacting manufacturing solids without an intersection',()=>{
  const {doc,source,target}=fixture(),ev=alignmentCandidate(doc,['beam'],source,target,0).evaluation;
  const solids=ev.elements.map(e=>{const s=buildLocalSolid(e,e.all);expect(s.failed).toEqual([]);return applyFrame(s.shape,e.frame);});
  const intersection=solids[0].intersect(solids[1]);try{expect(volumeOf(intersection)).toBeLessThan(1);expect(volumeOf(solids[0])).toBeCloseTo(100*50*80,0);}finally{intersection.delete();solids.forEach(s=>s.delete());}
 });
});
