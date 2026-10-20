import { movableRoots,objectWorldFrame,setObjectWorldFrame } from '../core/assemblies';
import { evaluate } from '../core/evaluate';
import { add,cross,dot,len,norm,rotateFrame,scale,sub,type Vec3 } from '../core/math';
import type { OwcDocument } from '../core/model';
import { resolveSelection } from './selection';
import { motionOpenness } from './motion';
import { getState,setState,toast,updateDoc } from './store';
import { t } from './i18n';

export interface AlignmentFace {id:string;point:Vec3;normal:Vec3}
export interface AlignmentDraft {
 base:OwcDocument;projectId:string;roots:string[];source:AlignmentFace|null;target:AlignmentFace|null;
 input:string;reverse:boolean;mode:'plane'|'point';error:string|null;
 openGroups:Record<string,number>;drawerOpen:number;
}
const finite=(v:Vec3)=>v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6);
/** Rigid placement of a source plane, preserving tangential position unless point mode is chosen. */
export function faceAlignment(source:AlignmentFace,target:AlignmentFace,gap:number,reverse=false,mode:'plane'|'point'='plane'){
 if(!finite(source.point)||!finite(target.point)||!finite(source.normal)||!finite(target.normal)||!Number.isFinite(gap)||Math.abs(gap)>1e6)throw new Error('align.invalid');
 const n=norm(target.normal),from=norm(source.normal),to=scale(n,reverse?1:-1);
 const cosine=Math.min(1,Math.max(-1,dot(from,to))),angle=Math.acos(cosine);
 let axis=cross(from,to);if(len(axis)<1e-8)axis=cross(from,Math.abs(from[0])<.8?[1,0,0]:[0,1,0]);axis=norm(axis);
 const delta=mode==='point'?sub(add(target.point,scale(n,gap)),source.point):scale(n,dot(sub(target.point,source.point),n)+gap);
 return {axis,angle,delta,center:source.point};
}
export function alignmentCandidate(base:OwcDocument,roots:string[],source:AlignmentFace,target:AlignmentFace,gap:number,reverse=false,mode:'plane'|'point'='plane'){
 const ev=evaluate(base),normalized=movableRoots(base,ev,roots),ids=resolveSelection(ev,normalized);
 if(!normalized.length||!ids.includes(source.id)||ids.includes(target.id)||!ev.elements.some(e=>e.id===target.id))throw new Error('align.outside');
 const transform=faceAlignment(source,target,gap,reverse,mode);
 if(transform.angle>1e-8&&ev.statics.some(s=>s.generator&&ev.elements.some(e=>ids.includes(e.id)&&e.generator===s.generator)))throw new Error('align.statics');
 const doc=structuredClone(base),frames=normalized.map(key=>({key,frame:rotateFrame(objectWorldFrame(base,key),transform.center,transform.axis,transform.angle)}));
 for(const {key,frame} of frames){const placed={...frame,o:add(frame.o,transform.delta)};if(!finite(placed.o))throw new Error('align.invalid');setObjectWorldFrame(doc,key,placed);}
 const evaluation=evaluate(doc);
 if(evaluation.warnings.some(w=>w.key.startsWith('offset.')))throw new Error('align.invalid');
 return {doc,evaluation,ids,transform};
}
export function beginAlignment():boolean{
 const s=getState(),ev=evaluate(s.doc),roots=movableRoots(s.doc,ev,s.selection),ids=resolveSelection(ev,roots);
 if(!roots.length)return false;
 if(ev.elements.some(e=>ids.includes(e.id)&&e.motion&&motionOpenness(s,e.motion.group)>0)){toast(t('align.motion'),'error');return false;}
 setState({alignmentEdit:{base:s.doc,projectId:s.projectId,roots,source:null,target:null,input:'0',reverse:false,mode:'plane',error:null,openGroups:s.openGroups,drawerOpen:s.drawerOpen},
  dialog:{type:'align'},jointPreview:null,dimensionEdit:null,contextMenu:null,contextPreview:null,hover:null,tool:'select',workspace:'model'});return true;
}
export function alignmentStale(edit:AlignmentDraft){const s=getState();return s.doc!==edit.base||s.projectId!==edit.projectId||s.tool!=='select'||s.openGroups!==edit.openGroups||s.drawerOpen!==edit.drawerOpen;}
export function captureAlignmentFace(hit:AlignmentFace):void{
 const edit=getState().alignmentEdit;if(!edit||alignmentStale(edit))return;
 const ev=evaluate(edit.base),ids=resolveSelection(ev,edit.roots),part=ev.elements.find(e=>e.id===hit.id);
 if(!part||(!edit.source?!ids.includes(hit.id):ids.includes(hit.id))){setState({alignmentEdit:{...edit,error:'align.outside'}});return;}
 if(part.motion&&motionOpenness(getState(),part.motion.group)>0){setState({alignmentEdit:{...edit,error:'align.motion'}});return;}
 setState({alignmentEdit:{...edit,...(!edit.source?{source:hit}:{target:hit}),error:null},hover:null});
}
export function closeAlignment(){setState({alignmentEdit:null,jointPreview:null,dialog:null});}
export function commitAlignment(edit:AlignmentDraft,gap:number):boolean{
 if(getState().alignmentEdit!==edit||alignmentStale(edit)||!edit.source||!edit.target)return false;
 const candidate=alignmentCandidate(edit.base,edit.roots,edit.source,edit.target,gap,edit.reverse,edit.mode);
 if(len(candidate.transform.delta)<1e-8&&Math.abs(candidate.transform.angle)<1e-8){closeAlignment();return true;}
 const applied=updateDoc(doc=>Object.assign(doc,candidate.doc));if(applied)closeAlignment();return applied;
}
