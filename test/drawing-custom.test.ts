import { beforeAll, describe, expect, it } from 'vitest';
import { createBoxElement } from '../src/core/elements';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument, FORMAT_VERSION, type DrawingView } from '../src/core/model';
import { production } from '../src/core/production';
import { validateDocument } from '../src/core/validate';
import { customProjection, drawingPoint, projectDrawingPoint, validDrawingAxes } from '../src/drawing/custom';
import { sheetsToDxf } from '../src/drawing/dxf';
import { generateDrawings } from '../src/drawing/sheets';
import { Sheet } from '../src/drawing/sheet';
import { DrawingJobs, drawingPrintHtml } from '../src/ui/drawingJobs';
import { placedSpec } from '../src/ui/geomClient';
import { clipShape, volumeOf } from '../src/geom/kernel';
import { projectViews, solidFor } from '../src/geom/solids';
import { loadKernel } from './kernel-node';
import { drawingDe, drawingEn } from '../src/ui/i18n-drawing';
beforeAll(loadKernel);
const fixture=()=>{const doc=emptyDocument('Workshop');doc.elements=[createBoxElement([0,0,0],[600,400,18],{id:'part',name:'Panel',materialId:'chip19_white',grain:'x',thick:'z'})];return doc;};
const view:DrawingView={id:'custom',title:'Measured panel',view:'top',dimensions:[{id:'dimension',a:{elementId:'part',corner:0},b:{elementId:'part',corner:3},orientation:'h',offset:10}]};
const options=(doc:ReturnType<typeof fixture>,customViews:DrawingView[])=>({format:'A3' as const,lang:'en' as const,date:'2026-10-16',project:doc.project,t:(k:string)=>k,projector:async(els:Parameters<typeof placedSpec>[0][],views:Parameters<typeof projectViews>[1])=>projectViews(els.map(placedSpec),views),include:{overview:false,views:false,parts:false,lists:false,nesting:false},customViews});
describe('workshop views and dimensions',()=>{
 it('recomputes stock-corner references and projected dimensions after a size change',async()=>{
  const doc=fixture(),ev=evaluate(doc);expect(validDrawingAxes()).toBe(true);expect(drawingPoint(ev,view.dimensions[0].b)).toEqual([600,400,0]);expect(projectDrawingPoint([600,400,0],'top')).toEqual([600,-400]);
  const first=await generateDrawings(ev,production(ev,doc.settings),options(doc,[view]));expect(first).toHaveLength(1);expect(first[0].prims.some(p=>p.text?.s==='600')).toBe(true);
  doc.elements[0].length=800;const changed=evaluate(doc),next=await generateDrawings(changed,production(changed,doc.settings),options(doc,[view]));expect(next[0].prims.some(p=>p.text?.s==='800')).toBe(true);expect(first[0].svg).not.toEqual(next[0].svg);
 });
 it('cuts real solids without changing cached manufacturing geometry and creates a cropped view',async()=>{
  const doc=fixture(),ev=evaluate(doc),spec=placedSpec(ev.elements[0]),source=solidFor(spec),before=volumeOf(source.shape);
  const clipped=clipShape(source.shape,{p:[300,0,0],n:[1,0,0]});try{expect(volumeOf(clipped)).toBeCloseTo(before/2,-2);}finally{clipped.delete();}
  expect(volumeOf(source.shape)).toBeCloseTo(before,-2);
  const detail:DrawingView={id:'detail',title:'Detail',view:'top',sectionOffset:9,detail:{u:300,v:200,width:200,height:100},dimensions:[]};const projection=customProjection(detail);expect(projection.clipPlanes).toHaveLength(5);
  const sheets=await generateDrawings(ev,production(ev,doc.settings),options(doc,[detail]));expect(sheets[0].svg).toContain('drawing.sectionNote');expect(sheets[0].svg).toContain('drawing.detail');expect(volumeOf(source.shape)).toBeCloseTo(before,-2);
 });
 it('refuses missing references, zero dimensions and references outside a detail window',async()=>{
  const doc=fixture(),ev=evaluate(doc),prod=production(ev,doc.settings);
  await expect(generateDrawings(ev,prod,options(doc,[{...view,dimensions:[{...view.dimensions[0],a:{elementId:'deleted',corner:0}}]}]))).rejects.toThrow('drawing.missingReference');
  await expect(generateDrawings(ev,prod,options(doc,[{...view,dimensions:[{...view.dimensions[0],b:{elementId:'part',corner:0}}]}]))).rejects.toThrow('drawing.zeroDimension');
  await expect(generateDrawings(ev,prod,options(doc,[{...view,detail:{u:300,v:200,width:100,height:100}}]))).rejects.toThrow('drawing.outsideDetail');
 });
 it('keeps hidden parts in the same drawing and manufacturing scope',async()=>{
  const doc=fixture();doc.elements[0].hidden=true;const ev=evaluate(doc),projected:string[]=[];
  const sheets=await generateDrawings(ev,production(ev,doc.settings),{...options(doc,[]),include:{overview:true,views:false,parts:false,lists:false,nesting:false},projector:async(els,views)=>{projected.push(...els.map(e=>e.id));return projectViews(els.map(placedSpec),views);}});
  expect(projected).toContain('part');expect(sheets).toHaveLength(1);
 });
 it('exports aligned text rotation and arrowheads to DXF',()=>{
  const sheet=new Sheet('A3',{project:'P',title:'T',date:'D',scale:'1:1',sheet:'1'});sheet.dimAligned(30,30,80,80,10,'70.7');
  const label=sheet.prims.find(p=>p.text?.s==='70.7')!;expect(label.text?.rotate).toBe(45);expect(sheet.prims.filter(p=>p.layer==='DIM'&&p.segs?.some(s=>s.c==='Z'))).toHaveLength(2);
  const dxf=sheetsToDxf([{id:'one',title:'T',svg:sheet.toSVG(),prims:sheet.prims,w:sheet.w,h:sheet.h}]);expect(dxf.includes('50\r\n315')).toBe(true);
 });
 it('migrates old files and preserves bounded custom drawing data',()=>{
  const doc=fixture();doc.drawingViews=[view];const result=validateDocument({...doc,version:2});expect(result.doc?.version).toBe(FORMAT_VERSION);expect(result.doc?.drawingViews).toEqual([view]);
  const invalid=structuredClone(doc);invalid.drawingViews![0].dimensions[0].a.corner=99;expect(validateDocument(invalid).doc?.drawingViews?.[0].dimensions).toEqual([]);
 });
});
describe('drawing result safety',()=>{
 it('rejects old jobs after model, options, project or unmount changes',()=>{
  const jobs=new DrawingJobs(),a={},b={},old=jobs.begin(a,'A3-de'),next=jobs.begin(b,'A4-en');expect(jobs.current(old,a,'A3-de')).toBe(false);expect(jobs.current(next,b,'A4-en')).toBe(true);expect(jobs.current(next,b,'A3-de')).toBe(false);expect(jobs.current(next,{},'A4-en')).toBe(false);jobs.cancel();expect(jobs.current(next,b,'A4-en')).toBe(false);
 });
 it('escapes print titles and keeps translations complete',()=>{
  const html=drawingPrintHtml('</title><script>alert(1)</script>','A3',['<svg/>']);expect(html).not.toContain('<script>');expect(html).toContain('&lt;/title&gt;');expect(html).toContain('<svg/>');expect(Object.keys(drawingDe).sort()).toEqual(Object.keys(drawingEn).sort());
 });
});
