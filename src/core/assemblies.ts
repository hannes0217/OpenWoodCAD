import { composeFrame, relativeFrame, WORLD, uid, dirToWorld, dirToLocal, toWorld, toLocal, type Frame, type Vec3 } from './math';
import type { OwcDocument, Element } from './model';
import type { Evaluated } from './evaluate';

/** Root-to-leaf assembly path. Reject rather than reinterpret broken placement. */
export function groupPath(doc: OwcDocument, id?: string): string[] {
  const path: string[] = [];
  while (id) {
    if (path.includes(id) || path.length >= 64) throw new Error('assembly.cycle');
    const group = doc.groups.find(g => g.id === id);
    if (!group) throw new Error('assembly.missing');
    path.push(id); id = group.parent;
  }
  return path.reverse();
}
export function groupFrame(doc: OwcDocument, id?: string): Frame {
  return groupPath(doc,id).reduce((frame,key) => composeFrame(frame,doc.groups.find(g=>g.id===key)!.frame ?? WORLD),WORLD);
}
export function transformMotion(motion: Element['motion'], frame: Frame, inverse = false): Element['motion'] {
  if (!motion) return undefined;
  const point=inverse?toLocal:toWorld, direction=inverse?dirToLocal:dirToWorld;
  return {...motion,dir:direction(frame,motion.dir),...(motion.rotation?{rotation:{...motion.rotation,pivot:point(frame,motion.rotation.pivot),axis:direction(frame,motion.rotation.axis)}}:{})};
}
export function objectFor(doc: OwcDocument, key: string) {
  if (key.startsWith('group:')) {
    const group=doc.groups.find(g=>g.id===key.slice(6));
    return group ? {object:group,parent:group.parent,frame:group.frame??WORLD} : undefined;
  }
  const object=key.startsWith('gen:')?doc.generators.find(g=>g.id===key.slice(4)):doc.elements.find(e=>e.id===key);
  return object ? {object,parent:object.groupId,frame:object.frame} : undefined;
}
export function objectWorldFrame(doc: OwcDocument, key: string): Frame {
  const target=objectFor(doc,key);if(!target)throw new Error('assembly.missing');
  return composeFrame(groupFrame(doc,target.parent),target.frame);
}
export function setObjectWorldFrame(doc: OwcDocument, key: string, frame: Frame): void {
  const target=objectFor(doc,key);if(!target)throw new Error('assembly.missing');
  const local=relativeFrame(groupFrame(doc,target.parent),frame);
  if('processings' in target.object)target.object.motion=transformMotion(transformMotion(target.object.motion,target.frame,true),local);
  target.object.frame=local;
}
/** Normalize movable roots so selecting an assembly plus a child never moves twice. */
export function movableRoots(doc: OwcDocument, ev: Evaluated, selection: string[]): string[] {
  const keys=new Set(selection.map(key=>ev.elements.find(e=>e.id===key)?.generator?`gen:${ev.elements.find(e=>e.id===key)!.generator}`:key).filter(key=>objectFor(doc,key)));
  return [...keys].filter(key=>!groupPath(doc,objectFor(doc,key)?.parent).some(parent=>keys.has(`group:${parent}`)));
}
export function reparentObject(doc: OwcDocument, key: string, parent?: string): void {
  const target=objectFor(doc,key);if(!target)throw new Error('assembly.missing');
  if (key.startsWith('group:') && groupPath(doc,parent).includes(key.slice(6))) throw new Error('assembly.cycle');
  const world=objectWorldFrame(doc,key),oldParentFrame=groupFrame(doc,target.parent),newParentFrame=groupFrame(doc,parent);
  if ('processings' in target.object) target.object.motion=transformMotion(transformMotion(target.object.motion,oldParentFrame),newParentFrame,true);
  if (key.startsWith('group:')) (target.object as OwcDocument['groups'][number]).parent=parent;
  else (target.object as Element).groupId=parent;
  target.object.frame=relativeFrame(newParentFrame,world);
}
export function createAssembly(doc: OwcDocument, ev: Evaluated, selection: string[], name: string): string {
  const roots=movableRoots(doc,ev,selection);if(!roots.length)throw new Error('assembly.empty');
  const id=uid('assembly');doc.groups.push({id,name,frame:structuredClone(WORLD)});
  for(const key of roots)reparentObject(doc,key,id);
  return id;
}
/** Dissolve just this level, preserving members, IDs, geometry and descendants. */
export function dissolveAssembly(doc: OwcDocument, id: string): void {
  const group=doc.groups.find(g=>g.id===id);if(!group)return;
  const members=[...doc.groups.filter(g=>g.parent===id).map(g=>`group:${g.id}`),...doc.generators.filter(g=>g.groupId===id).map(g=>`gen:${g.id}`),...doc.elements.filter(e=>e.groupId===id).map(e=>e.id)];
  for(const member of members)reparentObject(doc,member,group.parent);
  doc.groups=doc.groups.filter(g=>g.id!==id);
}

/** Copy a subtree and its internal links, retaining local placements. */
export function copyObjects(doc: OwcDocument, ev: Evaluated, selection: string[], offset: Vec3): string[] {
  const roots=movableRoots(doc,ev,selection),groups=new Set(roots.filter(k=>k.startsWith('group:')).map(k=>k.slice(6)));
  for(const group of doc.groups)if(groupPath(doc,group.parent).some(id=>groups.has(id)))groups.add(group.id);
  const selected=(key:string,parent?:string)=>roots.includes(key)||!!parent&&groups.has(parent);
  const groupMap=new Map([...groups].map(id=>[id,uid('assembly')]));
  const genMap=new Map(doc.generators.filter(g=>selected(`gen:${g.id}`,g.groupId)).map(g=>[g.id,uid('g')]));
  const partMap=new Map(doc.elements.filter(e=>selected(e.id,e.groupId)).map(e=>[e.id,uid('b')]));
  const originalGroups=[...doc.groups],originalGens=[...doc.generators],originalElements=[...doc.elements],originalJoints=[...doc.joints];
  const motionGroups=new Map<string,string>();
  for(const g of originalGroups)if(groupMap.has(g.id))doc.groups.push({...structuredClone(g),id:groupMap.get(g.id)!,name:`${g.name} (2)`,parent:g.parent?groupMap.get(g.parent)??g.parent:undefined});
  for(const g of originalGens)if(genMap.has(g.id))doc.generators.push({...structuredClone(g),id:genMap.get(g.id)!,name:`${g.name} (2)`,groupId:g.groupId?groupMap.get(g.groupId)??g.groupId:undefined});
  for(const e of originalElements)if(partMap.has(e.id)) {
    const id=partMap.get(e.id)!;
    if(e.motion&&!motionGroups.has(e.motion.group))motionGroups.set(e.motion.group,uid('motion'));
    doc.elements.push({...structuredClone(e),id,groupId:e.groupId?groupMap.get(e.groupId)??e.groupId:undefined,
      processings:e.processings.map(p=>({...structuredClone(p),id:uid('proc')})),
      ...(e.motion?{motion:{...structuredClone(e.motion),group:motionGroups.get(e.motion.group)!}}:{})});
  }
  const remap=(id:string):string|undefined=>{
    if(partMap.has(id))return partMap.get(id);
    for(const [oldId,newId]of genMap)if(id.startsWith(`${oldId}/`))return `${newId}${id.slice(oldId.length)}`;
    return undefined;
  };
  for(const joint of originalJoints){
    const a=remap(joint.a),b=remap(joint.b);if(!a||!b)continue;
    const generator=joint.generator?genMap.get(joint.generator):undefined;
    doc.joints.push({...structuredClone(joint),id:generator&&joint.generator&&joint.id.startsWith(`${joint.generator}/`)?`${generator}${joint.id.slice(joint.generator.length)}`:uid('j'),a,b,generator});
  }
  const result=roots.map(key=>key.startsWith('group:')?`group:${groupMap.get(key.slice(6))}`:key.startsWith('gen:')?`gen:${genMap.get(key.slice(4))}`:partMap.get(key)!);
  for(const key of result){const world=objectWorldFrame(doc,key);setObjectWorldFrame(doc,key,{...world,o:[world.o[0]+offset[0],world.o[1]+offset[1],world.o[2]+offset[2]]});}
  return result;
}
