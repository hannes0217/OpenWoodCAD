import * as THREE from 'three';
import type { Element } from '../core/model';

export function motionMatrix(base: THREE.Matrix4, motion: NonNullable<Element['motion']>, openness: number): THREE.Matrix4 {
  const open = Math.max(0, Math.min(1, Number.isFinite(openness) ? openness : 0));
  if (motion.rotation) {
    const {pivot,axis,angle}=motion.rotation;
    const direction=new THREE.Vector3(...axis);
    if (![...pivot,...axis,angle].every(Number.isFinite)||direction.lengthSq()<1e-12)return base.clone();
    return new THREE.Matrix4().makeTranslation(...pivot)
      .multiply(new THREE.Matrix4().makeRotationAxis(direction.normalize(),angle*open*Math.PI/180))
      .multiply(new THREE.Matrix4().makeTranslation(-pivot[0],-pivot[1],-pivot[2]))
      .multiply(base);
  }
  const result=base.clone(),distance=motion.travel*open;
  result.elements[12]+=motion.dir[0]*distance;result.elements[13]+=motion.dir[1]*distance;result.elements[14]+=motion.dir[2]*distance;
  return result;
}

export function motionOpenness(state: { drawerOpen: number; openGroups: Record<string,number> }, group: string): number {
  const value=state.openGroups[group]??state.drawerOpen;
  return Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
}
