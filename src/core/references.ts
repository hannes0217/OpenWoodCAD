import type { Evaluated } from './evaluate';
import { elementCorners } from './elements';
import { toWorld, type Vec3 } from './math';
import type { OwcDocument, ProcessingType } from './model';

/** Semantic references deliberately never contain transient OCCT edge/face indices. */
export type GeometryReference = { elementId:string;kind:'stockCorner';corner:number } |
  {elementId:string;kind:'processingOrigin';processingId:string;processingType:ProcessingType};
export type ReferenceResult = {ok:true;point:Vec3}|{ok:false;reason:'partMissing'|'featureMissing'|'unsupported'};
export function resolveGeometryReference(ev:Evaluated,ref:GeometryReference):ReferenceResult {
  const part=ev.elements.find(e=>e.id===ref.elementId);if(!part)return {ok:false,reason:'partMissing'};
  if(ref.kind==='stockCorner')return Number.isInteger(ref.corner)&&ref.corner>=0&&ref.corner<8?{ok:true,point:elementCorners(part)[ref.corner]}:{ok:false,reason:'unsupported'};
  const proc=part.all.find(p=>p.id===ref.processingId&&p.type===ref.processingType);
  if(!proc)return {ok:false,reason:'featureMissing'};
  if(proc.geom==='drill')return {ok:true,point:toWorld(part.frame,proc.p)};
  if(proc.geom==='cut'||proc.geom==='cutExcept')return {ok:true,point:toWorld(part.frame,proc.plane.p)};
  return {ok:false,reason:'unsupported'};
}
export const processingKey=(elementId:string,processingId:string)=>`proc:${encodeURIComponent(elementId)}|${encodeURIComponent(processingId)}`;
export function parseProcessingKey(key:string):{elementId:string;processingId:string}|null {
  if(!key.startsWith('proc:'))return null;
  const parts=key.slice(5).split('|');if(parts.length!==2)return null;
  try{return {elementId:decodeURIComponent(parts[0]),processingId:decodeURIComponent(parts[1])};}catch{return null;}
}
export interface DependencyNode {id:string;dependsOn:string[]}
/** Explicit stock -> joint/operation -> finished-body graph, separate from Undo. */
export function dependencyGraph(doc:OwcDocument,ev:Evaluated):DependencyNode[] {
  const nodes:DependencyNode[]=doc.groups.map(g=>({id:`group:${g.id}`,dependsOn:g.parent?[`group:${g.parent}`]:[]}));
  nodes.push(...doc.generators.map(g=>({id:`gen:${g.id}`,dependsOn:g.groupId?[`group:${g.groupId}`]:[]})));
  for(const part of ev.elements)nodes.push({id:`part:${part.id}`,dependsOn:part.generator?[`gen:${part.generator}`]:part.groupId?[`group:${part.groupId}`]:[]});
  for(const joint of ev.joints.filter(j=>!j.suppressed))nodes.push({id:`joint:${joint.id}`,dependsOn:[`part:${joint.a}`,`part:${joint.b}`]});
  for(const part of ev.elements){
    let previous=`part:${part.id}`;
    for(const proc of part.all){const id=processingKey(part.id,proc.id);nodes.push({id,dependsOn:[previous,...(proc.jointId?[`joint:${proc.jointId}`]:[])]});previous=id;}
    nodes.push({id:`body:${part.id}`,dependsOn:[previous]});
  }
  return nodes;
}
export function dependencyProblems(nodes:DependencyNode[]):string[] {
  const byId=new Map(nodes.map(n=>[n.id,n])),done=new Set<string>(),active=new Set<string>(),problems=new Set<string>();
  const visit=(id:string,depth:number)=>{
    if(done.has(id))return;
    if(!byId.has(id)){problems.add(`missing:${id}`);return;}
    if(active.has(id)||depth>1000){problems.add(`cycle:${id}`);return;}
    active.add(id);for(const dep of byId.get(id)!.dependsOn)visit(dep,depth+1);active.delete(id);done.add(id);
  };
  if(byId.size!==nodes.length)problems.add('duplicate');
  for(const node of nodes)visit(node.id,0);
  return [...problems];
}
