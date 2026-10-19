import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { changeProjection, fitCamera, resizeCamera, VIEW_DIRECTIONS, visibleHeight, type CadCamera } from '../src/ui/cameraMath';
import { DEFAULT_CAD, readCadSettings } from '../src/ui/cadSettings';
import { cadCommands, filterCommands } from '../src/ui/commands';
import { getState, setState } from '../src/ui/store';
import { cadDe, cadEn } from '../src/ui/i18n-cad';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { configureCadNavigation } from '../src/ui/navigation';

/** Real OrbitControls pointer handling without a WebGL context. The event
 * target supplies only the canvas APIs that controls use, not a mock camera.
 */
class ControlSurface extends EventTarget {
 style={touchAction:''};clientWidth=800;clientHeight=600;
 getRootNode(){return this;}
 setPointerCapture(){} releasePointerCapture(){}
 drag(button:number,shiftKey=false,ctrlKey=false){
  for(const [type,x,y] of [['pointerdown',100,100],['pointermove',150,120],['pointerup',150,120]] as const) {
   const event=new Event(type,{cancelable:true});
   Object.assign(event,{button,shiftKey,ctrlKey,metaKey:false,pointerType:'mouse',pointerId:1,clientX:x,clientY:y,pageX:x,pageY:y});
   this.dispatchEvent(event);
  }
 }
}

describe('CAD navigation gestures',()=>{
 it('uses SOLIDWORKS middle-button rotation and Ctrl+middle panning without inertial drift',()=>{
  const surface=new ControlSurface(),camera=new THREE.PerspectiveCamera(35,4/3,.1,100000);camera.up.set(0,0,1);camera.position.set(1000,-1200,800);
  const controls=new OrbitControls(camera,surface as unknown as HTMLElement),direction=()=>camera.position.clone().sub(controls.target).normalize();
  configureCadNavigation(controls,'solidworks',false);expect(controls.enableDamping).toBe(false);expect(controls.zoomToCursor).toBe(true);
  const before=direction();surface.drag(1);expect(direction().distanceTo(before)).toBeGreaterThan(.01);expect(controls.target.length()).toBeLessThan(1e-8);
  const orbit=direction();surface.drag(1,false,true);expect(controls.target.length()).toBeGreaterThan(1);expect(direction().distanceTo(orbit)).toBeLessThan(1e-8);
  const position=camera.position.clone();surface.drag(0);expect(camera.position.distanceTo(position)).toBeLessThan(1e-8);
  configureCadNavigation(controls,'solidworks',true);const drawing=direction();surface.drag(1);expect(direction().distanceTo(drawing)).toBeLessThan(1e-8);controls.dispose();
 });
 it('reserves left drag for selection, pans with middle, orbits with Shift+middle and suppresses orbit while drawing',()=>{
  const surface=new ControlSurface(),camera=new THREE.PerspectiveCamera(35,4/3,.1,100000);camera.up.set(0,0,1);camera.position.set(1000,-1200,800);
  const controls=new OrbitControls(camera,surface as unknown as HTMLElement);
  const direction=()=>camera.position.clone().sub(controls.target).normalize();
  configureCadNavigation(controls,'cad',false);
  const initial=camera.position.clone(),initialDirection=direction();
  surface.drag(0);expect(camera.position.distanceTo(initial)).toBeLessThan(1e-8);
  surface.drag(1);expect(controls.target.length()).toBeGreaterThan(1);expect(direction().distanceTo(initialDirection)).toBeLessThan(1e-8);
  const target=controls.target.clone(),before=direction();surface.drag(1,true);
  expect(controls.target.distanceTo(target)).toBeLessThan(1e-8);expect(direction().distanceTo(before)).toBeGreaterThan(.01);
  configureCadNavigation(controls,'cad',true);const drawing=direction();surface.drag(1,true);expect(direction().distanceTo(drawing)).toBeLessThan(1e-8);
  configureCadNavigation(controls,'classic',false);surface.drag(0);expect(direction().distanceTo(drawing)).toBeGreaterThan(.01);
  controls.dispose();
 });
});

describe('CAD camera geometry',()=>{
 it('fits all model corners in every standard view, for portrait and landscape viewports',()=>{
  const box=new THREE.Box3(new THREE.Vector3(-1400,700,-100),new THREE.Vector3(700,1100,2400));
  for(const aspect of [.35,1,2.5]) for(const direction of Object.values(VIEW_DIRECTIONS)) for(const kind of ['perspective','orthographic']) {
   const camera:CadCamera=kind==='perspective'?new THREE.PerspectiveCamera(35,aspect,.1,100000):new THREE.OrthographicCamera(-1,1,1,-1,.1,100000);
   fitCamera(camera,box,new THREE.Vector3(...direction),aspect);camera.updateMatrixWorld(true);
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
    const p=new THREE.Vector3(x,y,z).project(camera);
    expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);expect(Math.abs(p.z)).toBeLessThan(1);
   }
  }
 });
 it('preserves apparent size and orbit target when switching projection after zoom',()=>{
  const camera=new THREE.PerspectiveCamera(35,1.7,.1,100000),target=new THREE.Vector3(100,200,300);
  camera.position.set(-1200,-2200,1300);camera.up.set(0,0,1);camera.zoom=2;camera.lookAt(target);
  const height=visibleHeight(camera,target),parallel=changeProjection(camera,target,'orthographic',1.7);
  expect(visibleHeight(parallel,target)).toBeCloseTo(height,8);expect(parallel.up.equals(camera.up)).toBe(true);
  parallel.zoom=3;
  const perspective=changeProjection(parallel,target,'perspective',1.7);
  expect(visibleHeight(perspective,target)).toBeCloseTo(height/3,8);
  expect(perspective.position.clone().sub(target).normalize().distanceTo(camera.position.clone().sub(target).normalize())).toBeLessThan(1e-10);
 });
 it('produces parallel picking rays and preserves vertical scale after resize',()=>{
  const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,10000);camera.position.set(0,-1000,0);camera.up.set(0,0,1);camera.lookAt(0,0,0);
  resizeCamera(camera,2);camera.updateMatrixWorld(true);
  const a=new THREE.Raycaster(),b=new THREE.Raycaster();a.setFromCamera(new THREE.Vector2(-.8,.4),camera);b.setFromCamera(new THREE.Vector2(.8,-.4),camera);
  expect(a.ray.direction.distanceTo(b.ray.direction)).toBeLessThan(1e-12);expect(a.ray.origin.distanceTo(b.ray.origin)).toBeGreaterThan(100);
  expect(camera.right-camera.left).toBe(400);expect(camera.top-camera.bottom).toBe(200);
 });
});
describe('CAD settings and commands',()=>{
 it('validates saved settings instead of trusting persisted JSON',()=>{
  expect(readCadSettings(null)).toEqual(DEFAULT_CAD);
  expect(readCadSettings({navigation:'evil',projection:'bad',leftWidth:Infinity,rightWidth:-99,leftOpen:'yes',rightOpen:false})).toEqual({...DEFAULT_CAD,rightWidth:200,rightOpen:false});
  expect(readCadSettings({leftWidth:9999}).leftWidth).toBe(460);
 });
 it('matches German and English keys and preserves translated command search',()=>{
  expect(Object.keys(cadDe).sort()).toEqual(Object.keys(cadEn).sort());
  const previous=getState();
  try {
   for(const lang of ['de','en'] as const) {
    setState({lang,selection:[],past:[],future:[]});const commands=cadCommands();
    expect(new Set(commands.map(c=>c.id)).size).toBe(commands.length);
    expect(commands.find(c=>c.id==='delete')?.disabled).toBe(true);
    expect(commands.find(c=>c.id==='fitSelection')?.disabled).toBe(true);
    expect(filterCommands(commands,lang==='de'?'ruckgangig':'undo').some(c=>c.id==='undo')).toBe(true);
    expect(filterCommands(commands,'  view   front ').map(c=>c.id)).toContain('view.front');
    setState({gizmoMode:'rotate'});commands.find(c=>c.id==='tool.select')!.run();
    expect(getState().gizmoMode).toBe('none');
   }
  }finally{setState(previous);}
 });
});
