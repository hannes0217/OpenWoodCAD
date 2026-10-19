import { beforeAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rectangleSketch, solveSketch, sketchProfile } from '../src/core/sketch';
import { emptyDocument } from '../src/core/model';
import { evaluate } from '../src/core/evaluate';
import { frameFromEuler, WORLD } from '../src/core/math';
import { createAssembly, objectWorldFrame } from '../src/core/assemblies';
import { resolveGeometryReference } from '../src/core/references';
import { validateDocument } from '../src/core/validate';
import { buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { commitSketch, sketchFromElement } from '../src/ui/sketchDraft';
import { beginDimensionEdit, commitDimensionEdit, dimensionCandidate, modelDimensions, previewDimension } from '../src/ui/modelDimensions';
import { getState, setState, undo } from '../src/ui/store';
import { loadKernel } from './kernel-node';
const initial=getState();
beforeAll(loadKernel);
beforeEach(()=>{vi.useFakeTimers();setState({...initial,doc:emptyDocument(),projectId:'sketch-test',past:[],future:[]});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
const options=()=>({projectId:'sketch-test',sketch:rectangleSketch(),name:'Panel',materialId:'chip19_white',thickness:19,frame:WORLD});
describe('sketch manufacturing workflow',()=>{
 it('commits a real plate with one undo, preserves its driving dimensions through save/reopen and subsequent editing',()=>{
  const base=getState().doc,draft=options();const width=draft.sketch.constraints.find(c=>c.id==='width');if(width?.type==='length')width.value=800;
  expect(base.elements).toEqual([]);expect(commitSketch(base,draft)).toBe(true);expect(getState().past).toHaveLength(1);
  const saved=validateDocument(JSON.parse(JSON.stringify(getState().doc)));expect(saved.errors).toEqual([]);
  const part=evaluate(saved.doc!).elements[0],solid=buildLocalSolid(part,part.all);
  try{expect(solid.failed).toEqual([]);expect(volumeOf(solid.shape)).toBeCloseTo(800*400*19,-1);}finally{solid.shape.delete();}
  const source=sketchFromElement(saved.doc!.elements[0])!;expect(solveSketch(source).degreesOfFreedom).toBe(0);
  const height=source.constraints.find(c=>c.id==='height');if(height?.type==='length')height.value=500;
  setState({doc:saved.doc!});expect(commitSketch(saved.doc!,{...draft,id:part.id,sketch:source})).toBe(true);
  expect(evaluate(getState().doc).elements[0].width).toBeCloseTo(500,4);undo();expect(evaluate(getState().doc).elements[0].width).toBeCloseTo(400,4);
 });
 it('does not commit stale projects, inconsistent/open contours or invalid extrusion thickness',()=>{
  const base=getState().doc,draft=options();setState({projectId:'other'});expect(commitSketch(base,draft)).toBe(false);setState({projectId:'sketch-test'});
  const invalid=options();invalid.sketch.segments.pop();expect(commitSketch(base,invalid)).toBe(false);
  const conflict=options();conflict.sketch.constraints.push({id:'conflict',type:'length',line:'l0',value:100});expect(commitSketch(base,conflict)).toBe(false);
  expect(commitSketch(base,{...draft,thickness:Infinity})).toBe(false);expect(getState().past).toEqual([]);expect(base.elements).toEqual([]);
  setState({doc:structuredClone(base)});expect(commitSketch(base,draft)).toBe(false);
 });
 it('preserves sketch origins and stable points under rotated parent assemblies and negative profile coordinates',()=>{
  const base=getState().doc,draft=options();draft.sketch.constraints=[];draft.sketch.points.forEach(p=>{p.x-=100;p.y-=50;});
  expect(commitSketch(base,draft)).toBe(true);const doc=structuredClone(getState().doc),id=doc.elements[0].id;
  const group=createAssembly(doc,evaluate(doc),[id],'Group');doc.groups.find(g=>g.id===group)!.frame=frameFromEuler([1000,0,0],[90,0,0]);
  const ev=evaluate(doc),reference=resolveGeometryReference(ev,{elementId:id,kind:'sketchPoint',pointId:'p0'});
  expect(reference.ok).toBe(true);if(reference.ok){expect(reference.point[0]).toBeCloseTo(1050);expect(reference.point[1]).toBeCloseTo(-100);}
  expect(objectWorldFrame(doc,id).o).toEqual([1000,0,0]);expect(sketchProfile(doc.elements[0].sketch!).offset).toEqual([-100,-50]);
 });
 it('reports an empty draft as invalid rather than fully constrained',()=>{
  expect(solveSketch({points:[],segments:[],constraints:[]}).status).toBe('invalid');
 });
 it('edits a driving sketch dimension from the 3D viewport without replacing it by a box',()=>{
  expect(commitSketch(getState().doc,options())).toBe(true);const base=getState().doc,id=base.elements[0].id;
  const dimensions=modelDimensions(base,evaluate(base),[id]);expect(dimensions.some(d=>d.kind==='size')).toBe(false);
  const width=dimensions.find(d=>d.kind==='sketch'&&d.field==='width')!;
  beginDimensionEdit(width);previewDimension('90cm');expect(getState().doc).toBe(base);
  expect(getState().dimensionEdit?.evaluation?.elements[0].length).toBeCloseTo(900,4);
  expect(commitDimensionEdit()).toBe(true);expect(evaluate(getState().doc).elements[0].length).toBeCloseTo(900,4);
  expect(getState().doc.elements[0].sketch).toBeDefined();undo();expect(getState().doc).toBe(base);
 });
 it('rejects a conflicting on-model sketch edit and retains the original constrained profile',()=>{
  const draft=options();draft.sketch.constraints.push({id:'same-width',type:'length',line:'l0',value:600});
  expect(commitSketch(getState().doc,draft)).toBe(true);const doc=getState().doc,id=doc.elements[0].id;
  const dimension=modelDimensions(doc,evaluate(doc),[id]).find(d=>d.kind==='sketch'&&d.field==='width')!;
  expect(()=>dimensionCandidate(doc,dimension,'800')).toThrow('sketch.invalid');expect(evaluate(doc).elements[0].length).toBeCloseTo(600,4);
 });
});
