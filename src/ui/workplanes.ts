import { add, cross, dot, len, norm, scale, sub, type Frame, type Vec3 } from '../core/math';
import { standardPlane, type PlaneChoice, type WorkPlane } from './precision';

export function drawingPlane(settings:{workPlane:PlaneChoice;workZ:number;drawingPlane:WorkPlane|null}):WorkPlane|null {
  if(settings.workPlane!=='auto')return standardPlane(settings.workPlane,settings.workZ);
  return settings.drawingPlane?offsetWorkPlane(settings.drawingPlane,settings.workZ):null;
}

/** Freeze a plane from a displayed triangle hit; never bind to a mesh face index. */
export function faceWorkPlane(point:Vec3,normal:Vec3,frame?:Frame,elementId?:string):WorkPlane {
  if(![...point,...normal].every(Number.isFinite)||len(normal)<1e-8)throw new Error('Invalid face plane');
  const n=norm(normal),axes=frame?[frame.x,frame.y,frame.z]:[[1,0,0],[0,1,0],[0,0,1]] as Vec3[];
  const sorted=[...axes].sort((a,b)=>Math.abs(dot(a,n))-Math.abs(dot(b,n)));
  let u=norm(sub(sorted[0],scale(n,dot(sorted[0],n)))),v=cross(n,u);
  if(Math.abs(u[2])>Math.abs(v[2])+1e-6){u=v;v=cross(n,u);}
  const o=frame?sub(frame.o,scale(n,dot(sub(frame.o,point),n))):[...point] as Vec3;
  return {o,u,v,n,elementId};
}

/** Signed offset is along the chosen face's outward normal. */
export function offsetWorkPlane(plane:WorkPlane,distance:number):WorkPlane {
  return {...plane,o:add(plane.o,scale(plane.n,distance))};
}

/** Coordinates are rounded relative to the plane origin, never to world XYZ. */
export function planeCoordinates(plane:WorkPlane,p:Vec3):[number,number] {
  return [dot(sub(p,plane.o),plane.u),dot(sub(p,plane.o),plane.v)];
}
