import { movableRoots, objectWorldFrame, setObjectWorldFrame } from '../core/assemblies';
import { evaluate, type Evaluated } from '../core/evaluate';
import { GENERATORS } from '../core/generators';
import { withDefaults } from '../core/generators/types';
import { frameFromEuler, frameToEuler } from '../core/math';
import type { OwcDocument } from '../core/model';
import { parseMeasure } from './precision';
import { staticChecks } from '../core/checks';
import { getState, setState, updateDoc } from './store';

export interface ModelDimension {
  key:string; object:string; field:string; kind:'size'|'parameter'|'rotation';
  label:string; value:number; unit:string; min:number; max:number;
}
export interface DimensionEdit {
  base:OwcDocument; projectId:string; selection:string[]; dimension:ModelDimension;
  input:string; candidate:OwcDocument|null; evaluation:Evaluated|null; error:boolean;
}

/** Driving values only. A world bounding box is never a resize parameter. */
export function modelDimensions(doc:OwcDocument, ev:Evaluated, selection:string[]):ModelDimension[] {
  const roots=movableRoots(doc,ev,selection);
  if(roots.length!==1)return [];
  const object=roots[0], result:ModelDimension[]=[];
  const add=(kind:ModelDimension['kind'],field:string,label:string,value:number,unit:string,min:number,max:number)=>result.push({key:`${object}/${kind}/${field}`,object,kind,field,label,value,unit,min,max});
  if(object.startsWith('gen:')) {
    const gen=doc.generators.find(g=>`gen:${g.id}`===object),def=gen&&GENERATORS[gen.type];
    if(gen&&def){const values=withDefaults(def,gen.params);
      for(const p of def.params)if(p.type==='number'&&(!p.visible||p.visible(values))&&
        (['length','width','height','depth','plateHeight'].includes(p.id)||p.unit==='°'))
        add('parameter',p.id,`param.${p.id}`,Number(values[p.id]),p.unit??'mm',p.min,p.max);
    }
  } else if(!object.startsWith('group:')) {
    const e=doc.elements.find(e=>e.id===object);
    // Custom outlines retain their real contour; they cannot be resized by changing a box.
    if(e&&!e.outline&&!('sketch' in e))for(const field of ['length','width','height'] as const)
      add('size',field,`props.${field}`,e[field],'mm',1,1000000);
  }
  const angles=frameToEuler(objectWorldFrame(doc,object));
  for(const [i,axis] of ['Z','Y','X'].entries())add('rotation',String(i),`dimension.rotation${axis}`,angles[i],'°',-36000,36000);
  return result;
}

export function dimensionCandidate(base:OwcDocument,dimension:ModelDimension,input:string):OwcDocument {
  const value=parseMeasure(input,dimension.unit==='°'?'angle':'length');
  if(value<dimension.min||value>dimension.max)throw new Error('Out of range');
  const doc=structuredClone(base);
  if(dimension.kind==='rotation') {
    const frame=objectWorldFrame(doc,dimension.object),angles=frameToEuler(frame);
    angles[Number(dimension.field)]=value;
    setObjectWorldFrame(doc,dimension.object,frameFromEuler(frame.o,angles));
  } else if(dimension.kind==='parameter') {
    const g=doc.generators.find(g=>`gen:${g.id}`===dimension.object);
    if(!g)throw new Error('Missing generator');
    g.params[dimension.field]=value;
  } else {
    const e=doc.elements.find(e=>e.id===dimension.object);
    if(!e||e.outline||'sketch' in e)throw new Error('Derived dimensions');
    e[dimension.field as 'length'|'width'|'height']=value;
  }
  return doc;
}
export function beginDimensionEdit(dimension:ModelDimension):void {
  const s=getState();
  if(s.dialog||s.directMove||s.jointPreview)return;
  const current=modelDimensions(s.doc,evaluate(s.doc),s.selection).find(d=>d.key===dimension.key);
  if(!current)return;
  setState({dimensionEdit:{base:s.doc,projectId:s.projectId,selection:s.selection,dimension:current,input:String(current.value),candidate:null,evaluation:null,error:false}});
  previewDimension(String(current.value));
}
export function previewDimension(input:string):void {
  const edit=getState().dimensionEdit;if(!edit)return;
  try {
    const candidate=dimensionCandidate(edit.base,edit.dimension,input),evaluation=evaluate(candidate);
    if(!evaluation.elements.length||evaluation.elements.some(e=>![e.length,e.width,e.height].every(n=>Number.isFinite(n)&&n>0)))throw new Error('Invalid model');
    setState({dimensionEdit:{...edit,input,candidate,evaluation,error:false}});
  } catch {setState({dimensionEdit:{...edit,input,candidate:null,evaluation:null,error:true}});}
}
export function commitDimensionEdit():boolean {
  const s=getState(),edit=s.dimensionEdit;
  if(!edit||edit.base!==s.doc||edit.projectId!==s.projectId||edit.selection!==s.selection||!edit.candidate||edit.error)return false;
  const value=parseMeasure(edit.input,edit.dimension.unit==='°'?'angle':'length');
  setState({dimensionEdit:null});
  if(Math.abs(value-edit.dimension.value)<1e-9)return true;
  const candidate=edit.candidate;
  updateDoc(d=>Object.assign(d,candidate));
  return true;
}

/** Same geometry gate for keyboard and button commits, without accepting stale jobs. */
export function dimensionReview(edit:DimensionEdit,geometry:{mesh:(sig:string)=>unknown;failed:Map<string,unknown>;error:string|null},signature:(element:Evaluated['elements'][number])=>string):'invalid'|'failed'|'pending'|'ready' {
  if(edit.error||!edit.candidate||!edit.evaluation)return 'invalid';
  if(staticChecks(edit.evaluation).some(i=>i.severity==='error'))return 'invalid';
  const elements=edit.evaluation.elements;
  if(geometry.error||elements.some(e=>geometry.failed.has(signature(e))))return 'failed';
  return elements.length>0&&elements.every(e=>!!geometry.mesh(signature(e)))?'ready':'pending';
}
