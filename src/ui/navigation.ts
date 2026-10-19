import { MOUSE } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CadSettings } from './cadSettings';
/** OrbitControls changes PAN to ROTATE with Shift. Keep left clicks free for
 * selection in CAD mode. Fixed construction planes permit camera rotation
 * during drawing; only classic left-button orbit conflicts with point placement.
 */
export function configureCadNavigation(controls:OrbitControls,profile:CadSettings['navigation'],drawing:boolean):void {
 const modern=profile!=='classic';
 controls.mouseButtons.LEFT=modern?-1 as MOUSE:MOUSE.ROTATE;
 controls.mouseButtons.MIDDLE=profile==='solidworks'?MOUSE.ROTATE:profile==='cad'?MOUSE.PAN:MOUSE.DOLLY;
 controls.mouseButtons.RIGHT=modern?-1 as MOUSE:MOUSE.PAN;
 // Precise CAD gestures stop with the pointer instead of drifting into the next gesture.
 controls.enableDamping=false;
 controls.zoomToCursor=profile==='solidworks';
 controls.enableRotate=modern||!drawing;
}

/** Recover missed releases without accessing OrbitControls' private pointer list.
 * A normal release fires `end` after releasing capture, so check capture loss
 * after the current event instead of interrupting a successfully ended gesture. */
export function installNavigationRecovery(controls:OrbitControls,reset:()=>void) {
 let active=false,closed=false;
 const surface=controls.domElement;
 const start=()=>{active=true;},end=()=>{active=false;};
 const cancel=()=>{if(!closed&&active){active=false;reset();}};
 const lost=()=>{queueMicrotask(()=>{if(!closed)cancel();});};
 controls.addEventListener('start',start);controls.addEventListener('end',end);
 surface?.addEventListener('lostpointercapture',lost);
 return {cancel,dispose:()=>{closed=true;active=false;controls.removeEventListener('start',start);controls.removeEventListener('end',end);surface?.removeEventListener('lostpointercapture',lost);}};
}
