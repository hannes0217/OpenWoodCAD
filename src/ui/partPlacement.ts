import { evaluate,type Evaluated } from '../core/evaluate';
import { partOffsetBlock,partOffsetKey,validPartOffsets } from '../core/partOffsets';
import type { OwcDocument } from '../core/model';
import type { Vec3 } from '../core/math';
import { getState,updateDoc,setState } from './store';

export function partPlacementInfo(doc:OwcDocument,ev:Evaluated,id:string){
 const part=ev.elements.find(e=>e.id===id),generator=doc.generators.find(g=>g.id===part?.generator);
 if(!part||!generator)return null;
 const key=partOffsetKey(generator.id,part.id);
 return {part,generator,key,offset:generator.partOffsets?.[key]??[0,0,0] as Vec3,
  blocked:partOffsetBlock(part,ev.joints,ev.statics.some(s=>s.generator===generator.id))};
}
export function partPlacementCandidate(base:OwcDocument,id:string,offset:Vec3):{doc:OwcDocument;evaluation:Evaluated}{
 const info=partPlacementInfo(base,evaluate(base),id);
 if(!info||info.blocked||!validPartOffsets({[info.key]:offset}))throw new Error(info?.blocked??'offset.invalid');
 const doc=structuredClone(base),g=doc.generators.find(g=>g.id===info.generator.id)!;
 const entries={...g.partOffsets};
 if(offset.every(v=>Math.abs(v)<1e-8))delete entries[info.key];else entries[info.key]=[...offset];
 g.partOffsets=Object.keys(entries).length?entries:undefined;
 const evaluation=evaluate(doc);
 if(evaluation.warnings.some(w=>w.key.startsWith('offset.')))throw new Error('offset.invalid');
 return {doc,evaluation};
}
export function commitPartPlacement(base:OwcDocument,projectId:string,id:string,offset:Vec3):boolean{
 const state=getState();if(state.doc!==base||state.projectId!==projectId)return false;
 const info=partPlacementInfo(base,evaluate(base),id);if(!info)return false;
 const candidate=partPlacementCandidate(base,id,offset).doc;
 setState({jointPreview:null,dialog:null});
 if(info.offset.every((v,i)=>Math.abs(v-offset[i])<1e-8))return true;
 return updateDoc(d=>Object.assign(d,candidate));
}
