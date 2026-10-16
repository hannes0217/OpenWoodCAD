import { MOUSE } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
/** OrbitControls changes PAN to ROTATE with Shift. Keep left clicks free for
 * selection in CAD mode, and do not orbit while placing drawing points.
 */
export function configureCadNavigation(controls:OrbitControls,profile:'cad'|'classic',drawing:boolean):void {
 const cad=profile==='cad';
 controls.mouseButtons.LEFT=cad?-1 as MOUSE:MOUSE.ROTATE;
 controls.mouseButtons.MIDDLE=cad?MOUSE.PAN:MOUSE.DOLLY;
 controls.mouseButtons.RIGHT=cad?-1 as MOUSE:MOUSE.PAN;
 controls.enableRotate=!drawing;
}
