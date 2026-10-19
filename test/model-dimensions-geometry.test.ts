import { beforeAll, expect, it } from 'vitest';
import { emptyDocument } from '../src/core/model';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { buildLocalSolid, volumeOf } from '../src/geom/kernel';
import { dimensionCandidate, modelDimensions } from '../src/ui/modelDimensions';
import { loadKernel } from './kernel-node';
beforeAll(loadKernel);
it('rebuilds a resized blank with an unchanged real drilling instead of scaling the finished mesh',()=>{
 const doc=emptyDocument();doc.elements=[{id:'beam',name:'Beam',kind:'beam',frame:WORLD,length:600,width:80,height:40,materialId:'kvh_c24',processings:[{id:'hole',type:'drilling',geom:'drill',p:[100,40,40],dir:[0,0,-1],dia:10,depth:40,through:true}]}];
 const ev=evaluate(doc),dimension=modelDimensions(doc,ev,['beam']).find(d=>d.field==='length')!;
 const edited=evaluate(dimensionCandidate(doc,dimension,'800')).elements[0],original=buildLocalSolid(ev.elements[0],ev.elements[0].all),resized=buildLocalSolid(edited,edited.all);
 try {
  expect(resized.failed).toEqual([]);expect(volumeOf(resized.shape)-volumeOf(original.shape)).toBeCloseTo(200*80*40,-1);
  expect(edited.all).toEqual(ev.elements[0].all);expect(doc.elements[0].length).toBe(600);
 }finally{original.shape.delete();resized.shape.delete();}
});
