import { describe,expect,it } from 'vitest';
import { rectangleSketch,sketchProfile,solveSketch,validSketch,type ParametricSketch } from '../src/core/sketch';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument,FORMAT_VERSION } from '../src/core/model';
import { WORLD } from '../src/core/math';
import { validateDocument } from '../src/core/validate';

describe('parametric line sketches',()=>{
  it('fully constrains a rectangle and changes its driving length without moving its fixed origin',()=>{
    const s=rectangleSketch(),before=JSON.stringify(s);const dimension=s.constraints.find(c=>c.id==='width');if(dimension?.type==='length')dimension.value=800;
    const result=solveSketch(s);expect(result.status).toBe('fullyConstrained');expect(result.degreesOfFreedom).toBe(0);expect(result.residual).toBeLessThan(1e-5);
    const p=sketchProfile(s,result);expect(p.length).toBeCloseTo(800,4);expect(p.width).toBeCloseTo(400,4);expect(p.offset[0]).toBeCloseTo(0,4);
    expect(JSON.parse(before).points).toEqual(s.points);
  });
  it('reports actual free coordinates and diagnoses redundant and conflicting dimensions',()=>{
    const s=rectangleSketch();s.constraints=[];expect(solveSketch(s).degreesOfFreedom).toBe(8);expect(solveSketch(s).status).toBe('underConstrained');
    const full=rectangleSketch();full.constraints.push({id:'same-width',type:'length',line:'l0',value:600});
    expect(solveSketch(full).status).toBe('overConstrained');expect(solveSketch(full).redundant).toBe(1);
    full.constraints.push({id:'different-width',type:'length',line:'l0',value:700});const bad=solveSketch(full);
    expect(bad.status).toBe('inconsistent');expect(bad.conflicts).toContain('different-width');expect(()=>sketchProfile(full,bad)).toThrow('sketch.invalid');
  });
  it('solves signed point distances, coincidence and equal segment lengths',()=>{
    const s=rectangleSketch();s.constraints=s.constraints.filter(c=>c.id!=='width'&&c.id!=='height');
    s.constraints.push({id:'dx',type:'distanceX',a:'p0',b:'p1',value:500},{id:'equal',type:'equal',a:'l0',b:'l1'});
    const solved=solveSketch(s),profile=sketchProfile(s,solved);expect(solved.status).toBe('fullyConstrained');expect(profile.length).toBeCloseTo(500,4);expect(profile.width).toBeCloseTo(500,4);
    const isolated:ParametricSketch={points:[{id:'a',x:0,y:0},{id:'b',x:5,y:6}],segments:[],constraints:[{id:'fix',type:'fixed',point:'a',x:10,y:20},{id:'same',type:'coincident',a:'a',b:'b'}]};
    expect(solveSketch(isolated).status).toBe('fullyConstrained');expect(solveSketch(isolated).sketch.points[1].x).toBeCloseTo(10,4);
    isolated.constraints=[{id:'fix',type:'fixed',point:'a',x:10,y:20},{id:'dy',type:'distanceY',a:'a',b:'b',value:-50},{id:'d',type:'distance',a:'a',b:'b',value:100}];
    const distance=solveSketch(isolated);expect(distance.sketch.points[1].y).toBeCloseTo(-30,4);expect(distance.status).toBe('fullyConstrained');
  });
  it('solves perpendicular, parallel and directed angle relationships',()=>{
    for(const type of ['perpendicular','angle'] as const){
      const s=rectangleSketch();s.constraints=s.constraints.filter(c=>c.id!=='v1');
      s.points[2].x+=50;s.points[3].x+=50;
      s.constraints.push(type==='angle'?{id:'relation',type,a:'l0',b:'l1',value:90}:{id:'relation',type,a:'l0',b:'l1'});
      const r=solveSketch(s);expect(r.status).toBe('fullyConstrained');expect(sketchProfile(s,r).length).toBeCloseTo(600,4);
    }
    const parallel=rectangleSketch();parallel.constraints=parallel.constraints.filter(c=>c.id!=='h2');parallel.constraints.push({id:'parallel',type:'parallel',a:'l0',b:'l2'});expect(solveSketch(parallel).status).toBe('fullyConstrained');
  });
  it('rejects invalid identities, values and references and bounds solver work',()=>{
    const s=rectangleSketch();expect(validSketch(s)).toBe(true);
    for(const mutate of [(v:ParametricSketch)=>{v.points[1].id='p0';},(v:ParametricSketch)=>{v.segments[0].a='missing';},(v:ParametricSketch)=>{v.points[0].x=Infinity;},(v:ParametricSketch)=>{v.constraints.push({id:'bad',type:'length',line:'missing',value:10});}]){const bad=structuredClone(s);mutate(bad);expect(validSketch(bad)).toBe(false);expect(solveSketch(bad).status).toBe('invalid');}
    const tooLarge=rectangleSketch();tooLarge.points=Array.from({length:33},(_,i)=>({id:`p${i}`,x:i,y:0}));expect(validSketch(tooLarge)).toBe(false);
    const conflicting=rectangleSketch();conflicting.constraints.push({id:'bad',type:'fixed',point:'p1',x:123,y:234});expect(solveSketch(conflicting).iterations).toBeLessThanOrEqual(80);
  });
  it('rejects open, disjoint, collapsed and crossing manufacturing contours',()=>{
    const open=rectangleSketch();open.constraints=[];open.segments.pop();expect(()=>sketchProfile(open)).toThrow('sketch.open');
    const crossing=rectangleSketch();crossing.constraints=[];[crossing.points[1],crossing.points[2]]=[{...crossing.points[1],x:600,y:400},{...crossing.points[2],x:600,y:0}];expect(()=>sketchProfile(crossing)).toThrow();
    const zero=rectangleSketch();zero.constraints=[];zero.points[1].x=0;expect(()=>sketchProfile(zero)).toThrow();
  });
  it('evaluates and migrates sketches into actual panel dimensions and rejects corrupt imported geometry',()=>{
    const doc=emptyDocument();doc.elements=[{id:'panel',kind:'panel',name:'Profile',frame:WORLD,length:600,width:400,height:19,materialId:'chip19_white',processings:[],sketch:rectangleSketch()}];
    const sketch=doc.elements[0].sketch!;const dimension=sketch.constraints.find(c=>c.id==='width');if(dimension?.type==='length')dimension.value=800;
    expect(evaluate(doc).elements[0].length).toBeCloseTo(800,4);expect(evaluate(doc).elements[0].outline).toHaveLength(4);
    expect(validateDocument(doc).errors).toEqual([]);const corrupted=structuredClone(doc);corrupted.elements[0].sketch!.segments[0].a='missing';expect(validateDocument(corrupted).doc).toBeNull();
    doc.version=4;delete doc.elements[0].sketch;const old=validateDocument(doc);expect(old.doc?.version).toBe(FORMAT_VERSION);expect(evaluate(old.doc!).elements[0].length).toBe(600);
  });
});
