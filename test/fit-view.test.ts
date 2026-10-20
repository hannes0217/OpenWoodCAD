import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitCamera, fitCurrentView, type CadCamera, VIEW_DIRECTIONS } from '../src/ui/cameraMath';

describe('zoom all and zoom selection preserve the construction view', () => {
  for (const projection of ['perspective', 'orthographic'] as const) {
    it(`${projection}: preserves normal direction and up axis on standard and tilted planes`, () => {
      const box = new THREE.Box3(new THREE.Vector3(0, -60, 0), new THREE.Vector3(2000, 0, 2400));
      for (const [normal, up] of [
        [[0, -1, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]],
        [[1, 0, 0], [0, 0, 1]], [[1, 1, 1], [-1, -1, 2]],
      ]) {
        const camera: CadCamera = projection === 'perspective'
          ? new THREE.PerspectiveCamera(35, 1, 0.1, 100000)
          : new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 100000);
        const target = new THREE.Vector3(30, 40, 50);
        camera.position.copy(target).addScaledVector(new THREE.Vector3(...normal).normalize(), 1000);
        camera.up.set(...up as [number, number, number]).normalize(); camera.lookAt(target);
        const before = camera.quaternion.clone(), beforeUp = camera.up.clone();
        const center = fitCurrentView(camera, box, target, 0.7);
        expect(center.equals(box.getCenter(new THREE.Vector3()))).toBe(true);
        expect(camera.quaternion.angleTo(before)).toBeLessThan(1e-7);
        expect(camera.up.equals(beforeUp)).toBe(true);
        camera.updateMatrixWorld();
        for (const x of [0, 2000]) for (const y of [-60, 0]) for (const z of [0, 2400]) {
          const screen = new THREE.Vector3(x, y, z).project(camera);
          expect(Math.abs(screen.x)).toBeLessThan(1); expect(Math.abs(screen.y)).toBeLessThan(1);
        }
        // An explicit standard view remains an intentional change of direction.
        fitCamera(camera, box, new THREE.Vector3(...VIEW_DIRECTIONS.iso), 0.7);
        expect(camera.position.clone().sub(center).normalize().distanceTo(new THREE.Vector3(...VIEW_DIRECTIONS.iso).normalize())).toBeLessThan(1e-10);
      }
    });
  }
});
