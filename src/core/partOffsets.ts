import type { Element, Joint } from './model';
import type { Vec3 } from './math';

/** Translation only; connected, machined and kinematic parts need a dependency solver. */
export function partOffsetBlock(part:Element,joints:Pick<Joint,'a'|'b'>[],hasStatics:boolean):string|null {
 if(hasStatics)return 'offset.statics';
 if(part.motion)return 'offset.motion';
 if(joints.some(j=>j.a===part.id||j.b===part.id))return 'offset.connected';
 if(part.processings.length)return 'offset.machined';
 return null;
}
export function validPartOffsets(value:unknown):value is Record<string,Vec3> {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const entries=Object.entries(value);return entries.length<=1000&&entries.every(([key,offset])=>
   !!key&&key.length<=200&&!['__proto__','prototype','constructor'].includes(key)&&Array.isArray(offset)&&offset.length===3&&offset.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e6));
}
export function partOffsetKey(generator:string,part:string):string {
 if(!part.startsWith(`${generator}/`)||part.length<=generator.length+1)throw new Error('offset.missing');
 return part.slice(generator.length+1);
}
