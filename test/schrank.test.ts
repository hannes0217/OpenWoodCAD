import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { staticChecks } from '../src/core/checks';
import { evaluate } from '../src/core/evaluate';
import { HINGE_PATTERNS, hingeLevels } from '../src/core/fittings';
import { toWorld, WORLD, frameFromEuler, dirToWorld } from '../src/core/math';
import { validateDocument } from '../src/core/validate';
import { emptyDocument } from '../src/core/model';
import { production } from '../src/core/production';
import { motionMatrix, motionOpenness } from '../src/ui/motion';
import { applyFrame, buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';
beforeAll(loadKernel);
function cabinet(params:Record<string,string|number|boolean>={}){const doc=emptyDocument();doc.generators=[{id:'g',name:'Cabinet',type:'schrank',frame:WORLD,params}];return {doc,ev:evaluate(doc)};}
describe('cabinet with concealed hinges',()=>{
 it('passes construction checks and includes doors, hinge sets, fasteners and handles',()=>{
  const {doc,ev}=cabinet();expect(ev.warnings).toEqual([]);expect(ev.elements.filter(e=>e.motion?.rotation)).toHaveLength(2);expect(ev.hardware.filter(h=>h.itemId==='hinge_110').reduce((n,h)=>n+h.qty,0)).toBe(6);
  expect(ev.hardware.filter(h=>h.itemId==='hinge_screw_3_5x15').reduce((n,h)=>n+h.qty,0)).toBe(12);expect(ev.hardware.filter(h=>h.itemId==='handle_128')).toHaveLength(2);expect(staticChecks(ev,production(ev,doc.settings))).toEqual([]);
 });
 it('computes the 35/45/9.5 drilling pattern and hinge elevations by hand',()=>{
  // Blum TD-032/1EN p.3: cup 35, depth 13, fixing centres 45, offset 9.5.
  // Width 800, gap 2: each door (800-3*2)/2 = 397.
  // Cup centre x = 2 + 35/2 + 4.5 = 24. Door bottom 62,
  // height 1736; 100 end margins => z 162, 930, 1698.
  const {ev}=cabinet(),door=ev.elements.find(e=>e.id==='g/door-1')!;
  const cups=door.all.filter(p=>p.geom==='drill'&&p.dia===35);expect(cups).toHaveLength(3);
  const points=cups.map(p=>p.geom==='drill'?toWorld(door.frame,p.p):[0,0,0]);expect(points.map(p=>p[2])).toEqual([162,930,1698]);expect(points[0][0]).toBe(24);
  for(const cup of cups)if(cup.geom==='drill')expect(cup.depth).toBe(13);
  expect(HINGE_PATTERNS.cup35_45.fixingSpacing).toBe(45);expect(hingeLevels(62,1736,3)).toEqual([162,930,1698]);
 });
 it('builds a single right-hand door and optional adjustable shelves without invalid bores',()=>{
  const {doc,ev}=cabinet({doors:1,handing:'right',height:900,shelves:1,shelfType:'adjustable',hingeCount:2,handle:'knob'});expect(ev.warnings).toEqual([]);expect(staticChecks(ev,production(ev,doc.settings))).toEqual([]);
  const door=ev.elements.find(e=>e.id==='g/door-1')!;expect(door.motion?.rotation?.angle).toBe(110);const local=buildLocalSolid(door,door.all);try{expect(local.failed).toEqual([]);expect(volumeOf(local.shape)).toBeGreaterThan(0);}finally{local.shape.delete();}
 });
 it('rejects incompatible materials and impossible hinge counts rather than inventing fittings',()=>{
  expect(cabinet({frontMaterial:'hdf3_white'}).ev.warnings[0]?.key).toBe('warn.schrank.layout');expect(cabinet({height:300,hingeCount:6}).ev.warnings[0]?.key).toBe('warn.schrank.layout');expect(()=>hingeLevels(0,1000,1)).toThrow();
 });
 it('keeps doors clear of the carcass in the closed manufacturing model',()=>{
  const {ev}=cabinet(),door=ev.elements.find(e=>e.id==='g/door-1')!,side=ev.elements.find(e=>e.id==='g/side-l')!;
  const locals=[door,side].map(e=>buildLocalSolid(e,e.all)),world=locals.map((s,i)=>applyFrame(s.shape,[door,side][i].frame));
  try{expect(locals.flatMap(s=>s.failed)).toEqual([]);const overlap=world[0].intersect(world[1]);try{expect(volumeOf(overlap as never)).toBeLessThan(1);}finally{overlap.delete();}}finally{world.forEach(s=>s.delete());locals.forEach(s=>s.shape.delete());}
 });
 it('preserves exploded door rotations on load and rejects invalid preview data safely',()=>{
  const {doc,ev}=cabinet();const door=ev.elements.find(e=>e.motion?.rotation)!;doc.generators=[];doc.elements=[door];
  expect(validateDocument(doc).doc?.elements[0].motion?.rotation).toEqual(door.motion?.rotation);
  const invalid=structuredClone(doc);invalid.elements[0].motion!.rotation!.axis=[0,0,0];const checked=validateDocument(invalid);expect(checked.doc?.elements[0].motion).toBeUndefined();expect(checked.doc?.elements[0].length).toBe(door.length);expect(checked.repairs).toHaveLength(1);
 });
 it('allows a single door to close after opening all doors',()=>{expect(motionOpenness({drawerOpen:1,openGroups:{door:0}},'door')).toBe(0);expect(motionOpenness({drawerOpen:1,openGroups:{}},'door')).toBe(1);});
 it('rotates doors about their hinge pivot, preserves closed geometry and transforms rotated cabinet motion',()=>{
  const {doc,ev}=cabinet(),door=ev.elements.find(e=>e.id==='g/door-1')!,motion=door.motion!,pivot=new THREE.Vector3(...motion.rotation!.pivot);
  const matrix=motionMatrix(new THREE.Matrix4(),motion,1);expect(pivot.clone().applyMatrix4(matrix).distanceTo(pivot)).toBeLessThan(1e-8);expect(motionMatrix(new THREE.Matrix4(),motion,0).equals(new THREE.Matrix4())).toBe(true);
  const before=JSON.stringify(doc);doc.generators[0].frame=frameFromEuler([1000,200,0],[90,0,0]);const rotated=evaluate(doc).elements.find(e=>e.id===door.id)!;
  expect(rotated.motion!.rotation!.pivot).toEqual(toWorld(doc.generators[0].frame,motion.rotation!.pivot));expect(rotated.motion!.rotation!.axis).toEqual(dirToWorld(doc.generators[0].frame,motion.rotation!.axis));
  expect(JSON.parse(before).elements).toEqual([]);
 });
});
