import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument } from '../src/core/model';
import { WORLD } from '../src/core/math';
import type { WorkerRequest, WorkerResponse } from '../src/geom/protocol';
import { GeomClient, geomSig, solidSpec } from '../src/ui/geomClient';

class FakeWorker {
 onmessage:((event:MessageEvent<WorkerResponse>)=>void)|null=null;
 onerror:((event:ErrorEvent)=>void)|null=null;
 onmessageerror:(()=>void)|null=null;
 requests:WorkerRequest[]=[];terminated=false;
 postMessage(request:WorkerRequest){this.requests.push(request);}
 terminate(){this.terminated=true;}
 reply(response:WorkerResponse){this.onmessage?.({data:response} as MessageEvent<WorkerResponse>);}
 crash(){this.onerror?.({message:'Worker crashed',preventDefault(){}} as ErrorEvent);}
}
async function tick(){for(let i=0;i<8;i++)await Promise.resolve();}
function setup(timeout=1000){const workers:FakeWorker[]=[];const client=new GeomClient(()=>{const w=new FakeWorker();workers.push(w);return w as unknown as Worker;},timeout);client.start();return {client,workers};}
async function ready(client:GeomClient,worker:FakeWorker){worker.reply({id:worker.requests[0].id,ok:true,type:'init'});await tick();expect(client.ready).toBe(true);}
function elements(){const d=emptyDocument();d.elements=[{id:'a',kind:'beam',name:'Beam',frame:WORLD,length:1000,width:100,height:200,materialId:'kvh_c24',processings:[{id:'drill-a',type:'drilling',geom:'drill',p:[500,50,200],dir:[0,0,-1],dia:10,depth:30,through:false}]}];return evaluate(d).elements;}
const mesh=()=>({vertices:new Float32Array(),normals:new Float32Array(),indices:new Uint32Array(),edges:new Float32Array()});
afterEach(()=>vi.useRealTimers());
describe('geometry worker lifecycle',()=>{
 it('handles startup failure without an unhandled rejection or endless automatic retries',async()=>{
  const {client,workers}=setup();workers[0].reply({id:workers[0].requests[0].id,ok:false,error:'WASM failed'});await tick();
  expect(client.error).toBe('WASM failed');expect(client.ready).toBe(false);client.start();expect(workers).toHaveLength(1);
  client.restart();await ready(client,workers[1]);expect(client.error).toBeNull();expect(workers[0].terminated).toBe(true);
 });
 it('times out pending exports, releases busy state and permits an explicit restart',async()=>{
  vi.useFakeTimers();const {client,workers}=setup(25);await ready(client,workers[0]);
  const result=expect(client.step(elements())).rejects.toThrow(/timed out/);await tick();await vi.advanceTimersByTimeAsync(26);await result;
  expect(client.ready).toBe(false);expect(client.busy).toBe(false);expect(workers[0].terminated).toBe(true);
  client.restart();await ready(client,workers[1]);
 });
 it('reports processing failures for the correct source IDs on geometrically identical parts',async()=>{
  const {client,workers}=setup();await ready(client,workers[0]);const [a]=elements(),b=structuredClone(a);b.id='b';b.all[0].id='drill-b';
  expect(geomSig(a)).toBe(geomSig(b));expect(solidSpec(a).procs[0].id).toBe('processing-1');
  client.request([a,b]);await tick();const request=workers[0].requests.at(-1)!;
  workers[0].reply({id:request.id,ok:true,type:'mesh',results:[{sig:geomSig(a),mesh:mesh(),failed:['processing-1']}]});await tick();
  expect(client.failuresFor(a)).toEqual(['drill-a']);expect(client.failuresFor(b)).toEqual(['drill-b']);expect(client.busy).toBe(false);
 });
 it('ignores late results and pending-batch cleanup from a terminated worker',async()=>{
  const {client,workers}=setup();await ready(client,workers[0]);const [a]=elements();client.request([a]);await tick();const old=workers[0].requests.at(-1)!;
  client.restart();await ready(client,workers[1]);client.request([a]);await tick();const current=workers[1].requests.at(-1)!;
  workers[0].reply({id:old.id,ok:true,type:'mesh',results:[{sig:geomSig(a),mesh:null,failed:['old']}]});await tick();
  expect(client.busy).toBe(true);expect(client.failed.size).toBe(0);
  const fresh=mesh();workers[1].reply({id:current.id,ok:true,type:'mesh',results:[{sig:geomSig(a),mesh:fresh,failed:[]}]});await tick();
  expect(client.mesh(geomSig(a))).toBe(fresh);expect(client.busy).toBe(false);
 });
 it('exposes worker crashes and missing mesh results rather than accepting successful geometry',async()=>{
  const {client,workers}=setup();await ready(client,workers[0]);const [a]=elements();client.request([a]);await tick();
  workers[0].reply({id:workers[0].requests.at(-1)!.id,ok:true,type:'mesh',results:[]});await tick();
  expect(client.failuresFor(a)).toEqual(['No geometry result']);workers[0].crash();expect(client.error).toBe('Worker crashed');
 });
 it('does not reuse rounded geometry for machining changes smaller than the display tolerance',()=>{
  const [a]=elements(),b=structuredClone(a);b.length+=.001;expect(geomSig(a)).not.toBe(geomSig(b));
  b.length=a.length;if(b.all[0].geom==='drill')b.all[0].p[0]+=.0001;expect(geomSig(a)).not.toBe(geomSig(b));
 });
});
