import { movableRoots, objectWorldFrame, setObjectWorldFrame } from '../core/assemblies';
import type { Evaluated } from '../core/evaluate';
import { add, dot, rotateFrame, scale, sub, type Frame, type Vec3 } from '../core/math';
import type { OwcDocument } from '../core/model';
import { getState, updateDoc } from './store';

export type MoveAxis='x'|'y'|'z'|null;
export interface MoveRay {origin:Vec3;dir:Vec3}
const axes:Record<Exclude<MoveAxis,null>,Vec3>={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
export interface MoveTransaction {doc:OwcDocument;projectId:string;roots:string[];frames:Frame[];anchor:Vec3;normal:Vec3;startRay:MoveRay}
export function beginDirectMove(doc:OwcDocument,ev:Evaluated,selection:string[],projectId:string,anchor:Vec3,normal:Vec3,startRay:MoveRay):MoveTransaction|null {
  const roots=movableRoots(doc,ev,selection);if(!roots.length)return null;
  return {doc,projectId,roots,frames:roots.map(key=>structuredClone(objectWorldFrame(doc,key))),anchor,normal,startRay};
}
function onPlane(ray:MoveRay,anchor:Vec3,normal:Vec3):Vec3|null {
  const denominator=dot(ray.dir,normal);if(Math.abs(denominator)<1e-8)return null;
  const t=dot(sub(anchor,ray.origin),normal)/denominator;if(t<0)return null;
  return add(ray.origin,scale(ray.dir,t));
}
/** Closest coordinate of the world axis to the cursor ray. Unlike merely
 * projecting a camera-plane delta, this remains usable for steep depth axes. */
function onAxis(ray:MoveRay,anchor:Vec3,axis:Vec3):number|null {
  const cosine=dot(ray.dir,axis),denominator=1-cosine*cosine;if(denominator<1e-6)return null;
  const relative=sub(ray.origin,anchor);
  return (dot(relative,axis)-cosine*dot(relative,ray.dir))/denominator;
}
export function directMoveDelta(transaction:MoveTransaction,ray:MoveRay,axis:MoveAxis,snap:number):Vec3|null {
  let delta:Vec3;
  if(axis){const a=axes[axis],start=onAxis(transaction.startRay,transaction.anchor,a),end=onAxis(ray,transaction.anchor,a);if(start===null||end===null)return null;delta=scale(a,end-start);}
  else {const start=onPlane(transaction.startRay,transaction.anchor,transaction.normal),end=onPlane(ray,transaction.anchor,transaction.normal);if(!start||!end)return null;delta=sub(end,start);}
  if(snap>0)delta=delta.map(value=>Math.round(value/snap)*snap) as Vec3;
  return delta.every(Number.isFinite)&&delta.every(value=>Math.abs(value)<=1e6)?delta:null;
}
/** No preview touches the document. A stale or cancelled transaction cannot commit. */
export function commitDirectMove(transaction:MoveTransaction,delta:Vec3):boolean {
  return commitRigidMove(transaction,delta);
}
export function commitRigidMove(transaction:MoveTransaction,delta:Vec3,rotation?:{axis:Vec3;angle:number}):boolean {
  const state=getState();
  if(state.doc!==transaction.doc||state.projectId!==transaction.projectId||Math.hypot(...delta)<1e-6&&Math.abs(rotation?.angle??0)<1e-8||!delta.every(Number.isFinite))return false;
  if(rotation&&(!Number.isFinite(rotation.angle)||!rotation.axis.every(Number.isFinite)||Math.hypot(...rotation.axis)<1e-9))return false;
  updateDoc(doc=>{transaction.roots.forEach((key,index)=>{const f=rotation?rotateFrame(transaction.frames[index],transaction.anchor,rotation.axis,rotation.angle):transaction.frames[index];setObjectWorldFrame(doc,key,{...f,o:add(f.o,delta)});});});
  return true;
}
