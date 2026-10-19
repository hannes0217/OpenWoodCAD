import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument } from '../src/core/model';
import { frameFromEuler, frameToEuler, WORLD } from '../src/core/math';
import { createAssembly, objectWorldFrame } from '../src/core/assemblies';
import { beginDimensionEdit, commitDimensionEdit, dimensionCandidate, dimensionReview, modelDimensions, previewDimension } from '../src/ui/modelDimensions';
import { getState, setState, undo } from '../src/ui/store';
const initial=getState();
function fixture(){const doc=emptyDocument();doc.elements=[{id:'a',name:'A',kind:'beam',frame:frameFromEuler([100,200,300],[45,0,0]),length:600,width:80,height:40,materialId:'kvh_c24',processings:[]}];return doc;}
beforeEach(()=>{vi.useFakeTimers();setState({...initial,workspace:'model',tool:'select',doc:fixture(),past:[],future:[],selection:['a'],projectId:'dimensions-test'});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});
describe('driving dimensions in the viewport',()=>{
 it('edits local dimensions in a rotated part with a cancellable preview and a single undo',()=>{
  const doc=getState().doc,original=JSON.stringify(doc),dim=modelDimensions(doc,evaluate(doc),['a']).find(d=>d.field==='length')!;
  expect(dim.value).toBe(600);beginDimensionEdit(dim);previewDimension('1m+2*19');
  expect(getState().dimensionEdit?.evaluation?.elements[0].length).toBe(1038);
  expect(JSON.stringify(getState().doc)).toBe(original);expect(getState().past).toHaveLength(0);
  setState({dimensionEdit:null});expect(getState().doc).toBe(doc);
  beginDimensionEdit(dim);previewDimension('80cm');expect(commitDimensionEdit()).toBe(true);
  expect(getState().doc.elements[0].length).toBe(800);expect(getState().doc.elements[0].frame).toEqual(doc.elements[0].frame);
  expect(getState().past).toHaveLength(1);undo();expect(getState().doc).toBe(doc);
 });
 it('keeps malformed expressions for correction and cancels stale previews on document/project/selection change',()=>{
  const doc=getState().doc,dim=modelDimensions(doc,evaluate(doc),['a'])[0];
  for(const input of ['0','-1','1/0','NaN','4deg','2000000'])expect(()=>dimensionCandidate(doc,dim,input)).toThrow();
  beginDimensionEdit(dim);previewDimension('1/0');expect(getState().dimensionEdit?.input).toBe('1/0');expect(commitDimensionEdit()).toBe(false);
  previewDimension('700');setState({projectId:'other'});expect(getState().dimensionEdit).toBeNull();expect(commitDimensionEdit()).toBe(false);
  beginDimensionEdit(dim);setState({selection:[]});expect(getState().dimensionEdit).toBeNull();
  setState({selection:['a']});beginDimensionEdit(dim);setState({doc:structuredClone(doc)});expect(getState().dimensionEdit).toBeNull();expect(getState().past).toHaveLength(0);
 });
 it('edits world Euler angles under a rotated parent without moving the object origin',()=>{
  const doc=getState().doc,group=createAssembly(doc,evaluate(doc),['a'],'Assembly');
  doc.groups.find(g=>g.id===group)!.frame=frameFromEuler([500,0,0],[0,20,0]);
  const before=objectWorldFrame(doc,'a'),dimension=modelDimensions(doc,evaluate(doc),['a']).find(d=>d.kind==='rotation'&&d.field==='2')!;
  const next=dimensionCandidate(doc,dimension,'30deg');
  expect(objectWorldFrame(next,'a').o).toEqual(before.o);expect(frameToEuler(objectWorldFrame(next,'a'))[2]).toBeCloseTo(30);
  expect(modelDimensions(doc,evaluate(doc),[`group:${group}`]).every(d=>d.kind==='rotation')).toBe(true);
 });
 it('edits template width and roof pitch through the owning generator, preserving parametrization',()=>{
  const doc=emptyDocument();doc.generators=[{id:'roof',type:'satteldach',name:'Roof',frame:WORLD,params:{}}];
  const ev=evaluate(doc),part=ev.elements[0],dimensions=modelDimensions(doc,ev,[part.id]);
  const pitch=dimensions.find(d=>d.field==='pitch')!,width=dimensions.find(d=>d.field==='width')!;
  expect(dimensions.some(d=>d.kind==='size')).toBe(false);expect(pitch.object).toBe('gen:roof');
  const next=dimensionCandidate(doc,pitch,'42°');expect(next.generators[0].params.pitch).toBe(42);
  expect(evaluate(next).elements.find(e=>e.role==='rafter')!.frame).not.toEqual(ev.elements.find(e=>e.role==='rafter')!.frame);
  expect(dimensionCandidate(doc,width,'9m').generators[0].params.width).toBe(9000);
  expect(()=>dimensionCandidate(doc,pitch,'90')).toThrow();expect(next.elements).toEqual([]);
 });
 it('does not offer fictitious box dimensions for custom contours or mixed selections',()=>{
  const doc=getState().doc;doc.elements[0].outline=[[0,0],[600,0],[0,80]];
  expect(modelDimensions(doc,evaluate(doc),['a']).every(d=>d.kind==='rotation')).toBe(true);
  expect(modelDimensions(doc,evaluate(doc),[])).toEqual([]);
 });
 it('gates the exact candidate on geometry readiness, machining errors, and failed results',()=>{
  const doc=getState().doc;beginDimensionEdit(modelDimensions(doc,evaluate(doc),['a'])[0]);previewDimension('800');
  const edit=getState().dimensionEdit!,geometry={mesh:(_sig:string):unknown=>undefined,failed:new Map<string,unknown>(),error:null as string|null},signature=()=> 'candidate';
  expect(dimensionReview(edit,geometry,signature)).toBe('pending');geometry.mesh=()=>({});
  expect(dimensionReview(edit,geometry,signature)).toBe('ready');geometry.failed.set('old-preview',true);
  expect(dimensionReview(edit,geometry,signature)).toBe('ready');geometry.failed.set('candidate',true);
  expect(dimensionReview(edit,geometry,signature)).toBe('failed');geometry.failed.clear();geometry.error='Worker failed';
  expect(dimensionReview(edit,geometry,signature)).toBe('failed');geometry.error=null;
  edit.evaluation!.elements[0].all=[{id:'outside',type:'drilling',geom:'drill',p:[900,40,40],dir:[0,0,-1],dia:10,depth:20,through:false}];
  expect(dimensionReview(edit,geometry,signature)).toBe('invalid');
 });
});
