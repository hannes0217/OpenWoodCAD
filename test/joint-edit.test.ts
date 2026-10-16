import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBeam } from '../src/core/elements';
import { evaluate } from '../src/core/evaluate';
import { WORLD, frameFromEuler } from '../src/core/math';
import { emptyDocument, FORMAT_VERSION } from '../src/core/model';
import { validateDocument } from '../src/core/validate';
import { commitJoint, reviewJoint } from '../src/ui/jointDraft';
import { deleteSelection, duplicateSelection, explodeGenerator } from '../src/ui/actions';
import { getState, setState, undo } from '../src/ui/store';
const initial=getState();
function bench(){const doc=emptyDocument();doc.generators=[{id:'g',type:'werkbank',name:'Workbench',frame:WORLD,params:{}}];return doc;}
function free(){const doc=emptyDocument();doc.elements=[createBeam([0,0,0],[0,0,2000],140,140,{id:'post',name:'Post',materialId:'kvh_c24'}),createBeam([-1000,0,1000],[0,0,1000],100,200,{id:'beam',name:'Beam',materialId:'kvh_c24'})];doc.joints=[{id:'j',type:'tenon',a:'beam',b:'post',params:{length:60,thickness:40,shoulder:20,peg:false}}];return doc;}
beforeEach(()=>{vi.useFakeTimers();setState({...initial,doc:emptyDocument(),past:[],future:[],dirty:false,selection:[],jointPreview:null});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
describe('joint drafts and generated overrides',()=>{
 it('previews on a separate evaluation and commits exactly once with undo',()=>{
  const doc=free();setState({doc});const joint={...doc.joints[0],params:{...doc.joints[0].params,length:80}},json=JSON.stringify(doc);
  const review=reviewJoint(doc,joint);expect(review.valid).toBe(true);expect(review.evaluation.elements.find(e=>e.id==='beam')?.all).not.toEqual(evaluate(doc).elements.find(e=>e.id==='beam')?.all);
  expect(getState().doc).toBe(doc);expect(JSON.stringify(doc)).toBe(json);expect(getState().past).toEqual([]);
  expect(commitJoint(doc,joint)).toBe(true);expect(getState().past).toHaveLength(1);expect(getState().doc.joints[0].params.length).toBe(80);undo();expect(getState().doc).toBe(doc);
 });
 it('rejects a stale base, missing references and invalid parameters',()=>{
  const doc=free();setState({doc:structuredClone(doc)});expect(commitJoint(doc,doc.joints[0])).toBe(false);expect(getState().past).toEqual([]);
  expect(reviewJoint(doc,{...doc.joints[0],a:'missing'}).valid).toBe(false);
  expect(reviewJoint(doc,{...doc.joints[0],params:{length:10000}}).valid).toBe(false);
 });
 it('overrides a generated joint once and preserves it across version-2 save/load',()=>{
  const doc=bench(),original=evaluate(doc),joint=original.joints.find(j=>j.type==='tenon')!;
  doc.joints=[{...joint,params:{...joint.params,length:50}}];const changed=evaluate(doc);
  expect(changed.joints).toHaveLength(original.joints.length);expect(changed.joints.find(j=>j.id===joint.id)?.params.length).toBe(50);
  const restored=validateDocument(JSON.parse(JSON.stringify(doc)));expect(restored.repairs).toEqual([]);expect(restored.doc?.joints[0].id).toBe(joint.id);expect(restored.doc?.version).toBe(FORMAT_VERSION);
  expect(evaluate(restored.doc!).joints.find(j=>j.id===joint.id)?.params.length).toBe(50);expect(FORMAT_VERSION).toBeGreaterThanOrEqual(2);
 });
 it('migrates version 1 and retains valid external links to generated parts',()=>{
  const doc=bench(),ev=evaluate(doc);doc.elements=free().elements;doc.joints=[{id:'external',type:'trim',a:'beam',b:ev.elements[0].id,params:{}}];
  const result=validateDocument({...doc,version:1});expect(result.doc?.version).toBe(FORMAT_VERSION);expect(result.doc?.joints.map(j=>j.id)).toEqual(['external']);expect(result.repairs.some(r=>r.includes('Version 1'))).toBe(true);
 });
 it('suppresses a generated joint without deleting its template and can explode overrides',()=>{
  const doc=bench(),ev=evaluate(doc),j=ev.joints.find(j=>j.type==='tenon')!;setState({doc,selection:[`joint:${j.id}`]});deleteSelection();
  const hidden=evaluate(getState().doc);expect(getState().doc.generators).toHaveLength(1);expect(hidden.joints.find(x=>x.id===j.id)?.suppressed).toBe(true);expect(hidden.elements.flatMap(e=>e.all).some(p=>p.jointId===j.id)).toBe(false);
  expect(validateDocument(getState().doc).doc?.joints[0].suppressed).toBe(true);
  explodeGenerator('g');expect(getState().doc.generators).toEqual([]);expect(new Set(getState().doc.joints.map(x=>x.id)).size).toBe(getState().doc.joints.length);expect(getState().doc.joints.find(x=>x.id===j.id)?.suppressed).toBe(true);
 });
});
describe('connected part operations',()=>{
 it('copies internal free-part joints and keeps their endpoints on the copies',()=>{
  const doc=free();setState({doc,selection:['post','beam']});duplicateSelection();const next=getState().doc;
  expect(next.elements).toHaveLength(4);expect(next.joints).toHaveLength(2);expect(next.joints[1].a).not.toBe('beam');expect(next.joints[1].b).not.toBe('post');expect(getState().selection).toContain(next.joints[1].a);expect(evaluate(next).warnings).toEqual([]);
 });
 it('copies generated overrides to the new instance and cleans external joints when deleting a template',()=>{
  const doc=bench(),j=evaluate(doc).joints[0];doc.joints=[{...j,params:{...j.params,length:50}}];setState({doc,selection:['gen:g']});duplicateSelection();
  const copy=getState().doc.generators.find(g=>g.id!=='g')!;expect(getState().doc.joints.some(x=>x.generator===copy.id&&x.id.startsWith(`${copy.id}/`))).toBe(true);
  const next=structuredClone(getState().doc);next.elements=free().elements;next.joints.push({id:'external',type:'trim',a:'beam',b:j.b,params:{}});setState({doc:next,selection:['gen:g']});deleteSelection();
  expect(getState().doc.joints.some(x=>x.id==='external'||x.generator==='g')).toBe(false);
 });
 it('rotates drawer motion with a rotated generator',()=>{
  const doc=emptyDocument();doc.generators=[{id:'g',type:'kommode',name:'Chest',frame:frameFromEuler([0,0,0],[90,0,0]),params:{}}];
  const part=evaluate(doc).elements.find(e=>e.motion)!;expect(part.motion?.dir[0]).toBeCloseTo(1);expect(part.motion?.dir[1]).toBeCloseTo(0);
 });
});
