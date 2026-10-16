import { beforeAll, afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyObjects, createAssembly, dissolveAssembly, groupFrame, movableRoots, objectWorldFrame, reparentObject, setObjectWorldFrame } from '../src/core/assemblies';
import { evaluate } from '../src/core/evaluate';
import { editExplicitProcessing } from '../src/core/features';
import { WORLD, frameFromEuler, type Frame } from '../src/core/math';
import { emptyDocument, FORMAT_VERSION, type Element } from '../src/core/model';
import { dependencyGraph, dependencyProblems, parseProcessingKey, processingKey, resolveGeometryReference } from '../src/core/references';
import { validateDocument } from '../src/core/validate';
import { deleteSelection, duplicateSelection, explodeGenerator } from '../src/ui/actions';
import { groupSelection } from '../src/ui/assemblyActions';
import { resolveSelection } from '../src/ui/selection';
import { evaluated, getState, setState, undo } from '../src/ui/store';
import { loadKernel } from './kernel-node';
import { clearCache, volumes } from '../src/geom/solids';
import { geomSig } from '../src/ui/geomClient';

function part(id:string,x=0):Element {return {id,name:id,kind:'beam',frame:{...WORLD,o:[x,0,0]},length:600,width:80,height:40,materialId:'kvh_c24',processings:[]};}
function fixture(){const doc=emptyDocument();doc.elements=[part('a'),part('b',600)];doc.joints=[{id:'ab',type:'trim',a:'a',b:'b',params:{}}];return doc;}
function sameFrame(a:Frame,b:Frame){for(const key of ['o','x','y','z'] as const)for(let i=0;i<3;i++)expect(a[key][i]).toBeCloseTo(b[key][i],8);}
const initial=getState();
beforeAll(loadKernel);afterAll(clearCache);
beforeEach(()=>{vi.useFakeTimers();setState({...initial,doc:emptyDocument(),selection:[],past:[],future:[]});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();setState(initial);});

describe('assembly placement, persistence and feature references',()=>{
  it('composes nested local frames and normalizes mixed parent/child selection',()=>{
    const doc=fixture(),id=createAssembly(doc,evaluate(doc),['a','b'],'Frame');
    doc.groups.find(g=>g.id===id)!.frame=frameFromEuler([100,200,300],[90,0,0]);
    const ev=evaluate(doc);expect(ev.elements[0].frame.o).toEqual([100,200,300]);expect(ev.elements[1].frame.o[1]).toBeCloseTo(800);
    expect(movableRoots(doc,ev,[`group:${id}`,'a'])).toEqual([`group:${id}`]);
    expect(resolveSelection(ev,[`group:${id}`])).toEqual(['a','b']);
    doc.groups.push({id:'parent',name:'Parent',frame:frameFromEuler([0,0,500],[0,0,0])});
    reparentObject(doc,`group:${id}`,'parent');sameFrame(groupFrame(doc,id),frameFromEuler([100,200,300],[90,0,0]));
    setObjectWorldFrame(doc,'group:parent',frameFromEuler([0,0,700],[0,0,0]));expect(evaluate(doc).elements[0].frame.o[2]).toBeCloseTo(500);
  });
  it('preserves geometry and door axes when reparenting and dissolving generated assemblies',()=>{
    const doc=emptyDocument();doc.generators.push({id:'cabinet',type:'schrank',name:'Cabinet',frame:frameFromEuler([200,300,400],[30,0,0]),params:{}});
    const original=evaluate(doc),id=createAssembly(doc,original,['gen:cabinet'],'Room');
    doc.groups.push({id:'rotated',name:'Room',frame:frameFromEuler([1000,2000,3000],[45,0,0])});reparentObject(doc,`group:${id}`,'rotated');
    const moved=evaluate(doc);original.elements.forEach((e,i)=>sameFrame(moved.elements[i].frame,e.frame));
    dissolveAssembly(doc,id);original.elements.forEach((e,i)=>{sameFrame(evaluate(doc).elements[i].frame,e.frame);const r=e.motion?.rotation;if(r)evaluate(doc).elements[i].motion?.rotation?.pivot.forEach((x,j)=>expect(x).toBeCloseTo(r.pivot[j],8));});
    const restored=validateDocument(JSON.parse(JSON.stringify(doc)));expect(restored.errors).toEqual([]);expect(restored.doc?.version).toBe(FORMAT_VERSION);
    original.elements.forEach((e,i)=>sameFrame(evaluate(restored.doc!).elements[i].frame,e.frame));
  });
  it('copies nested members and internal links exactly once and preserves relative placements',()=>{
    const doc=fixture();doc.elements[0].motion={group:'door',dir:[0,1,0],travel:100};doc.elements[1].motion={group:'door',dir:[0,1,0],travel:100};
    const child=createAssembly(doc,evaluate(doc),['a','b'],'Child'),root=createAssembly(doc,evaluate(doc),[`group:${child}`],'Parent');
    setObjectWorldFrame(doc,`group:${root}`,frameFromEuler([100,200,300],[90,0,0]));
    const original=evaluate(doc),keys=copyObjects(doc,original,[`group:${root}`,'a'],[2000,0,0]),out=evaluate(doc),copied=resolveSelection(out,keys);
    expect(doc.groups).toHaveLength(4);expect(copied).toHaveLength(2);expect(doc.joints).toHaveLength(2);
    const copies=copied.map(id=>out.elements.find(e=>e.id===id)!);
    copies.forEach((copy,i)=>{expect(copy.frame.o[0]).toBeCloseTo(original.elements[i].frame.o[0]+2000);expect(copy.frame.o[1]).toBeCloseTo(original.elements[i].frame.o[1]);});
    expect(copies[0].motion?.group).toBe(copies[1].motion?.group);expect(copies[0].motion?.group).not.toBe('door');
    expect(doc.joints[1].a).toBe(copied[0]);expect(doc.joints[1].b).toBe(copied[1]);
    expect(dependencyProblems(dependencyGraph(doc,out))).toEqual([]);
  });
  it('groups, duplicates, deletes and undoes complete hierarchies through the UI actions',()=>{
    setState({doc:fixture(),selection:['a','b']});groupSelection();const groupKey=getState().selection[0];
    expect(getState().past).toHaveLength(1);duplicateSelection([2000,0,0]);expect(getState().doc.elements).toHaveLength(4);expect(getState().doc.joints).toHaveLength(2);
    const copy=getState().selection[0];deleteSelection();expect(getState().doc.elements).toHaveLength(2);expect(getState().doc.groups).toHaveLength(1);
    undo();expect(getState().doc.elements).toHaveLength(4);expect(resolveSelection(evaluated(),[copy])).toHaveLength(2);
    setState({selection:[groupKey]});deleteSelection();expect(getState().doc.elements).toHaveLength(2);expect(getState().doc.joints).toHaveLength(1);expect(validateDocument(getState().doc).errors).toEqual([]);
  });
  it('explodes a placed template inside an assembly without changing its world geometry',()=>{
    const doc=emptyDocument();doc.groups=[{id:'room',name:'Room',frame:frameFromEuler([100,200,300],[45,0,0])}];doc.generators=[{id:'g',type:'schrank',name:'Cabinet',frame:WORLD,groupId:'room',params:{}}];
    setState({doc});const original=evaluated();explodeGenerator('g');const result=evaluated();
    expect(getState().doc.generators).toEqual([]);expect(getState().doc.elements.every(e=>e.groupId==='room')).toBe(true);
    result.elements.forEach((e,i)=>sameFrame(e.frame,original.elements[i].frame));
    for(const e of result.elements.filter(e=>e.motion?.rotation))expect(e.motion!.rotation!.pivot.map((x,i)=>x-original.elements.find(p=>p.id===e.id)!.motion!.rotation!.pivot[i])).toEqual([0,0,0]);
  });
  it('suppresses an explicit drilling in actual OCCT geometry and rejects stale feature references',()=>{
    const doc=emptyDocument();doc.elements=[part('a')];doc.elements[0].processings=[{id:'bore',type:'drilling',geom:'drill',p:[100,40,40],dir:[0,0,-1],dia:10,depth:10,through:false}];
    const ref={elementId:'a',kind:'processingOrigin' as const,processingId:'bore',processingType:'drilling' as const},ev=evaluate(doc),e=ev.elements[0];
    expect(resolveGeometryReference(ev,ref)).toEqual({ok:true,point:[100,40,40]});
    expect(volumes([{sig:geomSig(e),length:e.length,width:e.width,height:e.height,procs:e.all}])[0]).toBeCloseTo(600*80*40-Math.PI*25*10,2);
    doc.elements[0].processings[0].suppressed=true;const suppressed=evaluate(doc).elements[0];expect(suppressed.all).toEqual([]);
    expect(volumes([{sig:geomSig(suppressed),length:600,width:80,height:40,procs:suppressed.all}])[0]).toBeCloseTo(600*80*40,2);
    expect(resolveGeometryReference(evaluate(doc),ref)).toEqual({ok:false,reason:'featureMissing'});
    expect(parseProcessingKey(processingKey('a|:%','b|:%'))).toEqual({elementId:'a|:%',processingId:'b|:%'});
    expect(resolveSelection(ev,[processingKey('a','bore')])).toEqual(['a']);
  });
  it('updates stock references after resizing and diagnoses deleted parts and graph cycles',()=>{
    const doc=fixture(),ref={elementId:'a',kind:'stockCorner' as const,corner:7};
    expect(resolveGeometryReference(evaluate(doc),ref)).toEqual({ok:true,point:[600,80,40]});doc.elements[0].length=800;
    expect(resolveGeometryReference(evaluate(doc),ref)).toEqual({ok:true,point:[800,80,40]});doc.elements=[];
    expect(resolveGeometryReference(evaluate(doc),ref)).toEqual({ok:false,reason:'partMissing'});
    expect(dependencyProblems([{id:'a',dependsOn:['b']},{id:'b',dependsOn:['a','missing']}])).toEqual(expect.arrayContaining(['cycle:a','missing:missing']));
  });
  it('migrates identity groups and rejects corrupt or cyclic placements',()=>{
    const doc=fixture();doc.version=3;doc.groups=[{id:'legacy',name:'Legacy'}];doc.elements[0].groupId='legacy';
    const loaded=validateDocument(doc);expect(loaded.doc?.version).toBe(FORMAT_VERSION);sameFrame(evaluate(loaded.doc!).elements[0].frame,doc.elements[0].frame);
    for(const mutate of [(d:typeof doc)=>{d.groups[0].parent='missing';},(d:typeof doc)=>{d.groups[0].parent='legacy';},(d:typeof doc)=>{d.groups[0].frame={...WORLD,x:[2,0,0]};}]){const bad=structuredClone(doc);mutate(bad);expect(validateDocument(bad).doc).toBeNull();}
    expect(()=>reparentObject(loaded.doc!,'group:legacy','legacy')).toThrow('assembly.cycle');
    sameFrame(objectWorldFrame(loaded.doc!,'a'),doc.elements[0].frame);
  });
  it('copies generated joint overrides into a new assembly without linking to originals',()=>{
    const doc=emptyDocument();doc.generators=[{id:'g',name:'Bench',type:'werkbank',frame:WORLD,params:{}}];
    const ev=evaluate(doc),joint=ev.joints.find(j=>j.type==='tenon')!;doc.joints=[{...joint,params:{...joint.params,length:50}}];
    const root=createAssembly(doc,evaluate(doc),['gen:g'],'Bench group'),keys=copyObjects(doc,evaluate(doc),[`group:${root}`],[3000,0,0]);
    const copyGen=doc.generators.find(g=>g.id!=='g')!,override=doc.joints.find(j=>j.generator===copyGen.id)!;
    expect(override.a.startsWith(`${copyGen.id}/`)).toBe(true);expect(override.b.startsWith(`${copyGen.id}/`)).toBe(true);expect(override.params.length).toBe(50);
    expect(resolveSelection(evaluate(doc),keys)).toHaveLength(ev.elements.length);expect(dependencyProblems(dependencyGraph(doc,evaluate(doc)))).toEqual([]);
    expect(validateDocument(doc).repairs).toEqual([]);
  });
  it('retains suppression/order across save-load and rejects ambiguous feature identities',()=>{
    const doc=fixture();const cut={id:'cut',type:'endCut' as const,geom:'cut' as const,plane:{p:[500,0,0] as [number,number,number],n:[1,0,0] as [number,number,number]}};
    doc.elements[0].processings=[{...cut,id:'disabled',suppressed:true},cut];
    const loaded=validateDocument(doc);expect(loaded.errors).toEqual([]);expect(evaluate(loaded.doc!).elements[0].all.map(p=>p.id)).toEqual(['cut','ab:cut:0']);
    const duplicate=structuredClone(doc);duplicate.elements[0].processings[1].id='disabled';expect(validateDocument(duplicate).doc).toBeNull();
    const invalid=JSON.parse(JSON.stringify(doc));invalid.elements[0].processings[0].suppressed='false';expect(validateDocument(invalid).doc).toBeNull();
  });
  it('refreshes drill dimensions and discards unverifiable metadata after convex cut edits',()=>{
    const doc=fixture();doc.elements[0].processings=[{id:'bore',type:'drilling',geom:'drill',p:[10,20,40],dir:[0,0,-1],dia:10,depth:20,through:false,info:{dia:10,depth:20}}];
    expect(editExplicitProcessing(doc,'a','bore',p=>{if(p.geom==='drill')p.dia=16;})).toBe(true);expect(doc.elements[0].processings[0].info).toEqual({dia:16,depth:20});
    editExplicitProcessing(doc,'a','bore',p=>{p.suppressed=true;});expect(doc.elements[0].processings[0].info).toEqual({dia:16,depth:20});
    doc.elements[0].processings=[{id:'cut',type:'pocket',geom:'polytope',planes:[{p:[10,0,0],n:[1,0,0]}],info:{width:10}}];
    editExplicitProcessing(doc,'a','cut',p=>{if(p.geom==='polytope')p.planes[0].p[0]=20;});expect(doc.elements[0].processings[0].info).toBeUndefined();
    expect(editExplicitProcessing(doc,'a','cut',p=>{p.id='other';})).toBe(false);expect(doc.elements[0].processings[0].id).toBe('cut');
  });
});
