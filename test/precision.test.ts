import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { orbitCamera } from '../src/ui/orbit';
import { closestEdgePoint, parseMeasure, parseToolDimensions, standardPlane, validOutline } from '../src/ui/precision';
import { ToolController, type ViewApi } from '../src/ui/tools';
import { emptyDocument } from '../src/core/model';
import { cross, dot } from '../src/core/math';
import { getState, setState, undo } from '../src/ui/store';
import { precisionDe, precisionEn } from '../src/ui/i18n-precision';
const initial = getState();
beforeEach(() => { vi.useFakeTimers(); setState({ ...initial, doc: emptyDocument(), past: [], future: [], tool: 'beam', workPlane: 'xy', workZ: 0, snap: 10, dirty: false }); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); setState(initial); });
describe('safe dimension expressions', () => {
  it('converts units and respects precedence, decimal commas and parentheses', () => {
    expect(parseMeasure('1,2 m + 2*19mm')).toBe(1238);
    expect(parseMeasure('(60cm - 2*19)/2')).toBe(281);
    expect(parseMeasure('2in')).toBe(50.8);
    expect(parseToolDimensions('600+2*19 x 40cm', true)).toEqual({length:638,width:400});
    expect(parseToolDimensions('1m@-45°', false)).toEqual({length:1000,angle:-45});
  });
  it('rejects executable input, wrong units, division by zero, huge or incomplete expressions', () => {
    for (const input of ['', 'Infinity', 'NaN', '1/0', '1e309', '1 +', '(2+3', 'globalThis.x=1', '1;alert(1)', 'Math.max(1,2)', '10000001', '1mmjunk', '4deg', '('.repeat(40)+'1'+')'.repeat(40)]) expect(() => parseMeasure(input), input).toThrow();
    expect(() => parseMeasure('10mm', 'angle')).toThrow();
    for (const input of ['-1', '0', '10@20@30']) expect(() => parseToolDimensions(input,false)).toThrow();
    expect(() => parseToolDimensions('600x0',true)).toThrow();
  });
});
describe('work planes and real edge points', () => {
  it('provides right-handed orthonormal XY/XZ/YZ planes with coordinate offsets', () => {
    for (const choice of ['xy','xz','yz'] as const) {
      const p=standardPlane(choice,120); expect(cross(p.u,p.v)).toEqual(p.n); expect(dot(p.n,p.u)).toBe(0);
      expect(p.o[{xy:2,xz:1,yz:0}[choice]]).toBe(120);
    }
  });
  it('snaps continuously along finite edges, clamps endpoints and intersects a work plane', () => {
    const edge={a:[0,0,0] as [number,number,number], b:[100,0,0] as [number,number,number],id:'part'};
    expect(closestEdgePoint(edge,{origin:[37,4,10],dir:[0,0,-1]})).toEqual([37,0,0]);
    expect(closestEdgePoint(edge,{origin:[170,4,10],dir:[0,0,-1]})).toEqual([100,0,0]);
    expect(closestEdgePoint({...edge,a:[0,0,-10],b:[100,0,10]}, {origin:[25,0,100],dir:[0,0,-1]},standardPlane('xy',0))).toEqual([50,0,0]);
    expect(closestEdgePoint({...edge,a:[0,0,5],b:[100,0,5]}, {origin:[25,0,100],dir:[0,0,-1]},standardPlane('xy',0))).toBeNull();
  });
  it('uses supplied geometry edges instead of inventing bounding-box corners', () => {
    const tool=new ToolController();
    const view:ViewApi={ray:(x,y)=>({origin:[x,y,100],dir:[0,0,-1]}),pickDetailed:()=>null,toScreen:p=>[p[0],p[1]],snapEdges:()=>[{id:'cut',a:[0,0,0],b:[100,100,0]}],layer:new THREE.Group(),render:()=>{}};
    tool.attach(view); const snap=tool.snap(31,32)!; expect(snap.kind).toBe('edge'); expect(snap.p[0]).toBeCloseTo(31.5); expect(snap.p[1]).toBeCloseTo(31.5);
    setState({workPlane:'xz',workZ:25}); const side=tool.snap(30,30); expect(side?.p[1]).toBeCloseTo(25);
  });
});
describe('construction transactions', () => {
  it('commits a typed beam once, supports undo and leaves invalid input editable', () => {
    const tool=new ToolController(); tool.points=[[0,0,0]]; tool.setInput('1m@45°');
    expect(tool.applyInput()).toBe(true); expect(getState().doc.elements).toHaveLength(1); expect(getState().past).toHaveLength(1);
    expect(getState().doc.elements[0].length).toBeCloseTo(1000); expect(getState().doc.elements[0].frame.x[0]).toBeCloseTo(Math.SQRT1_2);
    const doc=getState().doc; tool.setInput('100/0'); expect(tool.applyInput()).toBe(false); expect(tool.input).toBe('100/0'); expect(getState().doc).toBe(doc);
    tool.reset(); expect(getState().doc).toBe(doc); undo(); expect(getState().doc.elements).toHaveLength(0);
  });
  it('constructs a vertical panel with exact dimensions in one history entry', () => {
    setState({tool:'rect',workPlane:'xz',workZ:120});
    const tool=new ToolController(); tool.plane=standardPlane('xz',120); tool.points=[[0,120,0]]; tool.setInput('600+2*19 x 400'); expect(tool.applyInput()).toBe(true);
    const part=getState().doc.elements[0]; expect(part.length).toBe(638); expect(part.width).toBe(400); expect(part.frame.o[1]).toBe(120); expect(part.frame.y).toEqual([0,0,1]); expect(getState().past).toHaveLength(1);
  });
  it('keeps unsupported angle expressions and degenerate polygons out of the document', () => {
    setState({tool:'circle'}); const tool=new ToolController();tool.plane=standardPlane('xy',0);tool.points=[[0,0,0]];tool.setInput('100@45');expect(tool.applyInput()).toBe(false);expect(getState().doc.elements).toHaveLength(0);
    setState({tool:'poly'});tool.points=[[0,0,0],[100,100,0],[0,100,0],[100,0,0]];tool.setInput('');expect(tool.applyInput()).toBe(false);expect(getState().doc.elements).toHaveLength(0);expect(tool.points).toHaveLength(4);
    expect(validOutline([[0,0],[100,0],[100,100],[0,100]])).toBe(true);expect(validOutline([[0,0],[0,0],[100,0]])).toBe(false);
  });
  it('previews typed dimensions without committing and orbits either camera without changing distance', () => {
    const tool=new ToolController(); tool.points=[[0,0,0]]; tool.setInput('1m@30');
    expect(tool.current?.p[0]).toBeCloseTo(1000*Math.cos(Math.PI/6)); expect(getState().doc.elements).toHaveLength(0); expect(getState().past).toHaveLength(0);
    for (const camera of [new THREE.PerspectiveCamera(),new THREE.OrthographicCamera()]) {
      const target=new THREE.Vector3(30,40,50); camera.position.set(30,-960,550); const distance=camera.position.distanceTo(target);
      orbitCamera(camera,target,15,20); expect(camera.position.distanceTo(target)).toBeCloseTo(distance);expect(camera.position.z).toBeGreaterThan(550);
      orbitCamera(camera,target,0,1000);expect(camera.position.z).toBeLessThan(target.z+distance);expect(camera.matrixWorld.elements.every(Number.isFinite)).toBe(true);
    }
  });
  it('keeps German and English precision labels complete' , () => { expect(Object.keys(precisionDe).sort()).toEqual(Object.keys(precisionEn).sort()); });
});
