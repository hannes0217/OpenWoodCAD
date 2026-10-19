import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { beginDirectMove,commitDirectMove,commitRigidMove,directMoveDelta } from '../src/ui/directMove';
import { emptyDocument } from '../src/core/model';
import { WORLD,norm,sub } from '../src/core/math';
import { evaluate } from '../src/core/evaluate';
import { createAssembly } from '../src/core/assemblies';
import { getState,setState,undo } from '../src/ui/store';
const initial=getState(),start={origin:[0,0,1000] as [number,number,number],dir:[0,0,-1] as [number,number,number]};
function fixture(){const doc=emptyDocument();doc.elements=[{id:'a',name:'A',kind:'beam' as const,frame:WORLD,length:600,width:80,height:40,materialId:'kvh_c24',processings:[]}];return doc;}
beforeEach(()=>{vi.useFakeTimers();setState({...initial,doc:fixture(),past:[],future:[],projectId:'move-test'});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
describe('direct object movement',()=>{
 it('previews without document writes, snaps by delta and commits one undo step',()=>{
  const doc=getState().doc,saved=JSON.stringify(doc),tx=beginDirectMove(doc,evaluate(doc),['a'],'move-test',[0,0,0],[0,0,1],start)!;
  const ray={origin:[115,37,1000] as [number,number,number],dir:start.dir};
  expect(directMoveDelta(tx,ray,null,10)).toEqual([120,40,0]);expect(directMoveDelta(tx,ray,null,0)).toEqual([115,37,0]);
  expect(JSON.stringify(doc)).toBe(saved);expect(getState().past).toHaveLength(0);
  expect(commitDirectMove(tx,[120,40,0])).toBe(true);expect(getState().past).toHaveLength(1);expect(getState().doc.elements[0].frame.o).toEqual([120,40,0]);
  expect(commitDirectMove(tx,[10,0,0])).toBe(false);undo();expect(getState().doc).toBe(doc);
 });
 it('keeps axis moves on the world axis and refuses a view-parallel axis',()=>{
  const doc=getState().doc,tx=beginDirectMove(doc,evaluate(doc),['a'],'move-test',[0,0,0],[0,0,1],start)!;
  expect(directMoveDelta(tx,{origin:[115,37,1000],dir:start.dir},'x',10)).toEqual([120,0,0]);
  expect(directMoveDelta(tx,{origin:[115,37,1000],dir:start.dir},'y',10)).toEqual([0,40,0]);
  expect(directMoveDelta(tx,start,'z',10)).toBeNull();
  const origin:[number,number,number]=[100,-100,100],a={origin,dir:norm(sub([0,0,0],origin))},b={origin,dir:norm(sub([80,0,0],origin))};
  const perspective=beginDirectMove(doc,evaluate(doc),['a'],'move-test',[0,0,0],[0,0,1],a)!;
  expect(directMoveDelta(perspective,b,'x',0)![0]).toBeCloseTo(80,8);
 });
 it('rejects changed projects/documents, empty selections, zero and invalid movement',()=>{
  const doc=getState().doc,tx=beginDirectMove(doc,evaluate(doc),['a'],'move-test',[0,0,0],[0,0,1],start)!;
  expect(beginDirectMove(doc,evaluate(doc),['unknown'],'move-test',[0,0,0],[0,0,1],start)).toBeNull();
  expect(commitDirectMove(tx,[0,0,0])).toBe(false);expect(commitDirectMove(tx,[Infinity,0,0])).toBe(false);
  setState({projectId:'other'});expect(commitDirectMove(tx,[100,0,0])).toBe(false);setState({projectId:'move-test',doc:structuredClone(doc)});expect(commitDirectMove(tx,[100,0,0])).toBe(false);expect(getState().past).toEqual([]);
 });
 it('moves an assembly and a selected child once and rotates around all three world axes',()=>{
  const doc=getState().doc,group=createAssembly(doc,evaluate(doc),['a'],'Group');setState({doc});
  const tx=beginDirectMove(doc,evaluate(doc),[`group:${group}`,'a'],'move-test',[0,0,0],[0,0,1],start)!;expect(tx.roots).toEqual([`group:${group}`]);
  expect(commitRigidMove(tx,[100,0,0],{axis:[1,0,0],angle:Math.PI/2})).toBe(true);
  const part=evaluate(getState().doc).elements[0];expect(part.frame.o).toEqual([100,0,0]);expect(part.frame.y[2]).toBeCloseTo(1);expect(part.frame.z[1]).toBeCloseTo(-1);expect(getState().past).toHaveLength(1);
 });
});
