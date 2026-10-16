import { elementCorners } from '../core/elements';
import type { Evaluated } from '../core/evaluate';
import { add, boxCorners, cross, dot, neg, scale, sub, type Plane, type Vec3 } from '../core/math';
import type { DrawingPointRef, DrawingView } from '../core/model';
import type { ViewSpec } from '../geom/protocol';

export const DRAWING_AXES = {
  front: { direction:[0,-1,0] as Vec3, u:[1,0,0] as Vec3, v:[0,0,1] as Vec3 },
  side: { direction:[-1,0,0] as Vec3, u:[0,-1,0] as Vec3, v:[0,0,1] as Vec3 },
  top: { direction:[0,0,1] as Vec3, u:[1,0,0] as Vec3, v:[0,1,0] as Vec3 },
};
export function drawingPoint(ev: Evaluated, ref: DrawingPointRef): Vec3 {
  if(!Number.isInteger(ref.corner)||ref.corner<0||ref.corner>7)throw new Error('Invalid corner');
  if(ref.elementId){const part=ev.elements.find(e=>e.id===ref.elementId);if(!part)throw new Error(`Missing part: ${ref.elementId}`);return elementCorners(part)[ref.corner];}
  const points=ev.elements.flatMap(elementCorners);if(!points.length)throw new Error('Empty model');
  const min:Vec3=[Infinity,Infinity,Infinity],max:Vec3=[-Infinity,-Infinity,-Infinity];
  for(const p of points)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  return add(min,boxCorners(sub(max,min))[ref.corner]);
}
export function projectDrawingPoint(point: Vec3, view: DrawingView['view']): [number,number] {
  const axes=DRAWING_AXES[view];return [dot(point,axes.u),-dot(point,axes.v)];
}
export function customProjection(view: DrawingView): ViewSpec {
  const axes=DRAWING_AXES[view.view],planes:Plane[]=[];
  if(view.sectionOffset!==undefined){
    const axisIndex=view.view==='front'?1:view.view==='side'?0:2;
    const p:Vec3=[0,0,0];p[axisIndex]=view.sectionOffset;
    planes.push({p,n:axes.direction});
  }
  if(view.detail){
    const {u,v,width,height}=view.detail;
    for(const [axis,center,size] of [[axes.u,u,width],[axes.v,v,height]] as [Vec3,number,number][]){planes.push({p:scale(axis,center+size/2),n:axis},{p:scale(axis,center-size/2),n:neg(axis)});}
  }
  return {kind:'camera',position:[0,0,0],direction:axes.direction,xAxis:axes.u,clipPlanes:planes};
}
/** Both supplied axes must remain orthogonal and match the OCCT convention. */
export function validDrawingAxes(): boolean {return Object.values(DRAWING_AXES).every(a=>dot(cross(a.direction,a.u),a.v)>0.999);}
