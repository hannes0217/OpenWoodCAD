import { MOUSE } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CadSettings } from './cadSettings';
/** OrbitControls changes PAN to ROTATE with Shift. Keep left clicks free for
 * selection in CAD mode, and do not orbit while placing drawing points.
 */
export function configureCadNavigation(controls:OrbitControls,profile:CadSettings['navigation'],drawing:boolean):void {
 const modern=profile!=='classic';
 controls.mouseButtons.LEFT=modern?-1 as MOUSE:MOUSE.ROTATE;
 controls.mouseButtons.MIDDLE=profile==='solidworks'?MOUSE.ROTATE:profile==='cad'?MOUSE.PAN:MOUSE.DOLLY;
 controls.mouseButtons.RIGHT=modern?-1 as MOUSE:MOUSE.PAN;
 // Precise CAD gestures stop with the pointer instead of drifting into the next gesture.
 controls.enableDamping=false;
 controls.zoomToCursor=profile==='solidworks';
 controls.enableRotate=!drawing;
}
