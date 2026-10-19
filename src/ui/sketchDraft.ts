import { uid, type Frame } from '../core/math';
import type { Element, OwcDocument } from '../core/model';
import { rectangleSketch, sketchProfile, solveSketch, type ParametricSketch } from '../core/sketch';
import { getState, setState, updateDoc } from './store';

export function sketchFromElement(element:Element):ParametricSketch|null {
  if(element.sketch)return structuredClone(element.sketch);
  if(element.kind!=='panel'||element.generator||element.outline?.some(p=>p[2]))return null;
  if(!element.outline)return rectangleSketch(element.length,element.width);
  const points=element.outline.map((p,i)=>({id:`p${i}`,x:p[0],y:p[1]}));
  return {points,segments:points.map((p,i)=>({id:`l${i}`,a:p.id,b:points[(i+1)%points.length].id})),constraints:[]};
}
export function commitSketch(base:OwcDocument,options:{projectId:string;id?:string;sketch:ParametricSketch;name:string;materialId:string;thickness:number;frame:Frame}):boolean {
  if(getState().doc!==base||getState().projectId!==options.projectId||!Number.isFinite(options.thickness)||options.thickness<1||options.thickness>1000)return false;
  const solution=solveSketch(options.sketch);let profile:ReturnType<typeof sketchProfile>;
  try{profile=sketchProfile(options.sketch,solution);}catch{return false;}
  if(options.id&&!base.elements.some(e=>e.id===options.id&&!e.generator))return false;
  const id=options.id??uid('p');
  updateDoc(doc=>{
    const existing=doc.elements.find(e=>e.id===id);
    if(existing){existing.sketch=solution.sketch;existing.length=profile.length;existing.width=profile.width;existing.outline=profile.outline;existing.height=options.thickness;existing.materialId=options.materialId;existing.name=options.name;}
    else doc.elements.push({id,kind:'panel',name:options.name,role:'board',frame:options.frame,sketch:solution.sketch,length:profile.length,width:profile.width,height:options.thickness,outline:profile.outline,materialId:options.materialId,processings:[]});
  });
  setState({selection:[id],dialog:null,workspace:'model'});return true;
}
