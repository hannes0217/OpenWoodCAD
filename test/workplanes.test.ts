import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import { WORLD,cross,dot,frameFromEuler,type Vec3 } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { drawingPlane,faceWorkPlane,offsetWorkPlane,planeCoordinates } from '../src/ui/workplanes';
import { ToolController,type ViewApi } from '../src/ui/tools';
import { getState,setState,undo } from '../src/ui/store';
const initial=getState();
class Label {style={};parentNode=null;setAttribute(){}remove(){}}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('Element',Label);vi.stubGlobal('document',{createElement:()=>new Label()});setState({...initial,doc:emptyDocument(),projectId:'planes',past:[],future:[],tool:'beam',workPlane:'xy',drawingPlane:null,planePick:false,workZ:0,snap:10});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();setState(initial);});
function view():ViewApi {return {ray:(x,y)=>({origin:[x,y,1000],dir:[0,0,-1]}),pickDetailed:()=>({id:'surface',point:[10,20,250],normal:[0,0,1]}),toScreen:p=>[p[0],p[1]],snapEdges:()=>[],layer:new THREE.Group(),render:()=>{}};}
describe('explicit construction planes',()=>{
 it('ignores other face and edge depths when drawing on a fixed XY plane',()=>{
  const tool=new ToolController(),v=view();v.snapEdges=()=>[{id:'above',a:[0,0,250],b:[100,0,250]}];tool.attach(v);
  expect(tool.snap(30,0)?.p).toEqual([30,0,0]);tool.click(0,0);tool.click(100,0);
  expect(getState().doc.elements[0].frame.o[2]).toBe(0);expect(getState().past).toHaveLength(1);undo();expect(getState().doc.elements).toEqual([]);
 });
 it('captures a face in a separate click and freezes the plane before any material is created',()=>{
  const tool=new ToolController(),v=view();tool.attach(v);setState({planePick:true});const doc=getState().doc;
  tool.click(10,20);expect(getState().planePick).toBe(false);expect(getState().drawingPlane?.o).toEqual([10,20,250]);
  expect(tool.points).toEqual([]);expect(getState().doc).toBe(doc);
  v.pickDetailed=()=>({id:'other',point:[200,0,500],normal:[1,0,0]});
  tool.click(10,20);tool.click(110,20);expect(getState().doc.elements[0].frame.o[2]).toBe(250);
  expect(getState().doc.elements[0].length).toBe(100);expect(getState().drawingPlane?.n).toEqual([0,0,1]);
 });
 it('builds beam cross-sections and typed panels with the same outward normal as a vertical face plane',()=>{
  const plane=faceWorkPlane([0,120,0],[0,-1,0],WORLD),tool=new ToolController(),v=view();
  setState({workPlane:'auto',drawingPlane:plane});v.ray=(x,y)=>({origin:[x,-1000,y],dir:[0,1,0]});v.toScreen=p=>[p[0],p[2]];tool.attach(v);
  tool.click(0,0);tool.setInput('600@30');expect(tool.applyInput()).toBe(true);
  const beam=getState().doc.elements[0];expect(beam.frame.o[1]).toBeCloseTo(120);expect(beam.frame.z).toEqual(plane.n);
  tool.reset();setState({tool:'rect'});tool.click(0,0);tool.setInput('600x400');expect(tool.applyInput()).toBe(true);
  const panel=getState().doc.elements[1];expect(panel.frame.z).toEqual(plane.n);expect(panel.frame.o[1]).toBe(120);expect(panel.width).toBe(400);
 });
 it('does not permit an axis lock to leave a plane and blocks a parallel ray instead of retaining a stale point',()=>{
  const tool=new ToolController(),v=view();tool.attach(v);tool.click(0,0);
  tool.key({key:'z'} as KeyboardEvent);expect(tool.axisLock).toBeNull();tool.move(20,20);expect(tool.current).not.toBeNull();
  v.ray=()=>({origin:[0,0,10],dir:[1,0,0]});tool.move(20,20);expect(tool.current).toBeNull();expect(getState().toolDraft.blocked).toBe(true);
  tool.click(20,20);expect(getState().doc.elements).toEqual([]);
 });
 it('keeps measurement spatial and clears face selection on project/tool cancellation',()=>{
  const tool=new ToolController(),v=view();tool.attach(v);setState({tool:'measure'});
  expect(tool.snap(10,20)?.p).toEqual([10,20,250]);
  setState({tool:'beam',planePick:true});setState({tool:'select'});expect(getState().planePick).toBe(false);
  setState({drawingPlane:faceWorkPlane([1,2,3],[0,0,1]),workPlane:'auto',planePick:true});setState({projectId:'new'});
  expect(getState().drawingPlane).toBeNull();expect(getState().planePick).toBe(false);
  expect(getState().workPlane).toBe('xy');expect(getState().workZ).toBe(0);
 });
 it('provides a right-handed rotated frame, signed normal offsets and local coordinates',()=>{
  const frame=frameFromEuler([10,20,30],[35,20,10]),p=faceWorkPlane(frame.o,frame.z,frame);
  const normal=cross(p.u,p.v);normal.forEach((n,i)=>expect(n).toBeCloseTo(p.n[i]));expect(dot(p.u,p.v)).toBeCloseTo(0);
  const shifted=offsetWorkPlane(p,25);expect(dot(shifted.o.map((n,i)=>n-p.o[i]) as Vec3,p.n)).toBeCloseTo(25);
  expect(planeCoordinates(p,p.o)).toEqual([0,0]);expect(drawingPlane({workPlane:'auto',drawingPlane:p,workZ:25})).toEqual(shifted);
  expect(()=>faceWorkPlane([0,0,0],[0,0,0])).toThrow();
  expect(faceWorkPlane([20,30,50],[0,0,1],WORLD).o).toEqual(faceWorkPlane([120,230,50],[0,0,1],WORLD).o);
 });
});
