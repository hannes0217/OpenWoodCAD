import * as THREE from 'three';
/** Orbit a Z-up CAD camera without requiring a middle mouse button. */
export function orbitCamera(camera: THREE.Camera, target: THREE.Vector3, yaw: number, pitch: number): void {
  if (![yaw, pitch].every(Number.isFinite)) return;
  const offset = camera.position.clone().sub(target), radius = offset.length();
  if (radius < 1e-9) return;
  const azimuth = Math.atan2(offset.y, offset.x) + yaw * Math.PI / 180;
  const elevation = Math.max(-Math.PI/2+1e-3, Math.min(Math.PI/2-1e-3, Math.asin(offset.z/radius) + pitch * Math.PI/180));
  camera.position.copy(target).add(new THREE.Vector3(radius*Math.cos(elevation)*Math.cos(azimuth),radius*Math.cos(elevation)*Math.sin(azimuth),radius*Math.sin(elevation)));
  camera.up.set(0,0,1); camera.lookAt(target); camera.updateMatrixWorld(true);
}
