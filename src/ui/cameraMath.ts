import * as THREE from 'three';
export type ViewName = 'iso' | 'front' | 'back' | 'side' | 'left' | 'top' | 'bottom';
export type CadCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;
export const VIEW_DIRECTIONS: Record<ViewName,[number,number,number]> = {
  iso:[-.55,-.75,.45],front:[0,-1,0],back:[0,1,0],side:[1,0,0],left:[-1,0,0],top:[0,0,1],bottom:[0,0,-1],
};
export function visibleHeight(camera:CadCamera,target:THREE.Vector3):number {
  return camera instanceof THREE.PerspectiveCamera?2*camera.position.distanceTo(target)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/camera.zoom:(camera.top-camera.bottom)/camera.zoom;
}
export function resizeCamera(camera:CadCamera,aspect:number):void {
  if(camera instanceof THREE.PerspectiveCamera) camera.aspect=aspect;
  else {const half=(camera.top-camera.bottom)/2;camera.left=-half*aspect;camera.right=half*aspect;}
  camera.updateProjectionMatrix();
}
/** Preserve apparent size at the orbit target while changing projection. */
export function changeProjection(old:CadCamera,target:THREE.Vector3,projection:'perspective'|'orthographic',aspect:number):CadCamera {
  const height=Math.max(1,visibleHeight(old,target));
  const next:CadCamera=projection==='perspective'?new THREE.PerspectiveCamera(35,aspect,old.near,old.far):new THREE.OrthographicCamera(-height*aspect/2,height*aspect/2,height/2,-height/2,old.near,old.far);
  next.position.copy(old.position);next.up.copy(old.up);next.quaternion.copy(old.quaternion);
  if(next instanceof THREE.PerspectiveCamera) {
    const direction=old.position.clone().sub(target).normalize();
    if(!direction.lengthSq()) direction.set(0,-1,0);
    const distance=height/(2*Math.tan(THREE.MathUtils.degToRad(next.fov/2)));
    next.position.copy(target).addScaledVector(direction,distance);
    next.near=Math.max(.1,distance/10000);next.far=Math.max(100000,distance*100);
  }
  next.updateProjectionMatrix();return next;
}
/** Fit a bounding sphere in both screen dimensions, including portrait panes. */
export function fitCamera(camera:CadCamera,box:THREE.Box3,direction:THREE.Vector3,aspect:number):THREE.Vector3 {
  const center=box.getCenter(new THREE.Vector3()),radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,10),margin=1.18;
  const d=direction.clone().normalize();if(!d.lengthSq()) d.set(0,-1,0);
  let distance:number;
  camera.zoom=1;
  if(camera instanceof THREE.PerspectiveCamera) {
    const vertical=THREE.MathUtils.degToRad(camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*aspect);
    distance=radius*margin/Math.sin(Math.min(vertical,horizontal));
  } else {
    const half=radius*margin/Math.min(1,aspect);
    camera.top=half;camera.bottom=-half;camera.left=-half*aspect;camera.right=half*aspect;distance=radius*4;
  }
  camera.up.set(0,0,1);if(Math.abs(d.z)>.9999) camera.up.set(0,d.z>0?1:-1,0);
  camera.position.copy(center).addScaledVector(d,distance);camera.near=Math.max(.1,distance/10000);camera.far=Math.max(100000,distance*100);
  camera.lookAt(center);resizeCamera(camera,aspect);return center;
}
