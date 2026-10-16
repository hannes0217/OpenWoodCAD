import { beforeAll, expect, it } from 'vitest';
import { createBeam } from '../src/core/elements';
import { emptyDocument } from '../src/core/model';
import { reviewJoint } from '../src/ui/jointDraft';
import { applyFrame, buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { loadKernel } from './kernel-node';
beforeAll(loadKernel);
it('builds the previewed tenon and mortise as valid, non-overlapping solids',()=>{
 const doc=emptyDocument();doc.elements=[createBeam([0,0,0],[0,0,2000],140,140,{id:'post',name:'Post',materialId:'kvh_c24'}),createBeam([-1000,0,1000],[0,0,1000],100,200,{id:'beam',name:'Beam',materialId:'kvh_c24'})];
 const result=reviewJoint(doc,{id:'j',type:'tenon',a:'beam',b:'post',params:{length:80,thickness:40,shoulder:20,peg:false}});expect(result.valid).toBe(true);
 const locals=result.evaluation.elements.map(e=>buildLocalSolid(e,e.all));const world=locals.map((s,i)=>applyFrame(s.shape,result.evaluation.elements[i].frame));
 try {locals.forEach(s=>{expect(s.failed).toEqual([]);expect(volumeOf(s.shape)).toBeGreaterThan(0);});const overlap=world[0].intersect(world[1]);try{expect(volumeOf(overlap as never)).toBeLessThan(1);}finally{overlap.delete();}}
 finally{world.forEach(s=>s.delete());locals.forEach(s=>s.shape.delete());}
});
