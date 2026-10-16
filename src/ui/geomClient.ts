import { elementAABB } from '../core/elements';
import type { EvalElement } from '../core/evaluate';
import type { Processing } from '../core/model';
import type { MeshData, Projection } from '../geom/kernel';
import type { PlacedSpec, SolidSpec, ViewSpec, WorkerRequest, WorkerResponse } from '../geom/protocol';

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void; timer:ReturnType<typeof setTimeout>; type:WorkerRequest['type'] };
type Req = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

/** Signature of an element's local geometry (shared by identical parts). */
export function geomSig(e: Pick<EvalElement, 'length' | 'width' | 'height' | 'outline' | 'all'>): string {
  // Display rounding is never a valid cache key for manufacturing geometry.
  return JSON.stringify([e.length,e.width,e.height,e.outline??null,e.all.map((p)=>{
    const {id:_,jointId:__,info:___,type:____,...geometry}=p;return geometry;
  })]);
}

export function solidSpec(e: EvalElement): SolidSpec {
  // Canonical IDs keep diagnostics correct when identical geometry is shared
  // between parts whose original processing IDs differ.
  return { sig: geomSig(e), length: e.length, width: e.width, height: e.height, outline: e.outline, procs: e.all.map((p,i)=>({...p,id:`processing-${i+1}`} as Processing)) };
}

export function placedSpec(e: EvalElement): PlacedSpec {
  return { ...solidSpec(e), frame: e.frame };
}

export class GeomClient {
  private worker: Worker | null = null;
  private seq = 1;
  private pending = new Map<number, Pending>();
  private meshes = new Map<string, MeshData | null>();
  private inflight = new Set<string>();
  private listeners = new Set<() => void>();
  ready = false;
  error:string|null=null;
  private generation=0;
  private initialization:Promise<void>|null=null;
  failed: Map<string, string[]> = new Map();

  constructor(private readonly createWorker:()=>Worker=()=>new Worker(new URL('../geom/worker.ts',import.meta.url),{type:'module'}),private readonly timeoutMs=120000){}

  start(): void {
    if (this.worker || this.error) return;
    let worker:Worker;
    try {worker=this.createWorker();this.worker=worker;}catch(err){this.fail(err);return;}
    worker.onerror=(ev)=>{ev.preventDefault();if(this.worker===worker)this.fail(new Error(ev.message||'Geometry worker failed'));};
    worker.onmessageerror=()=>{if(this.worker===worker)this.fail(new Error('Invalid geometry worker message'));};
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      if(this.worker!==worker)return;
      const p = this.pending.get(ev.data.id);
      if (!p) return;
      this.pending.delete(ev.data.id);
      clearTimeout(p.timer);
      if (ev.data.ok && ev.data.type!==p.type)p.reject(new Error('Unexpected geometry response type'));
      else if (ev.data.ok) p.resolve(ev.data);
      else p.reject(new Error(ev.data.error));
    };
    this.initialization=this.send({ type: 'init' }).then(() => {
      if(this.worker!==worker)return;
      this.ready = true;
      this.emit();
    }).catch((error)=>{if(this.worker===worker)this.fail(error);});
  }

  private async call(req: Req, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const generation=this.generation;
    this.start();
    await this.initialization;
    if(generation!==this.generation)throw new Error('Geometry request cancelled by worker restart/failure');
    if(this.error || !this.ready || !this.worker)throw new Error(this.error??'Geometry worker is unavailable');
    return this.send(req,transfer);
  }

  private send(req:Req,transfer:Transferable[]=[]):Promise<WorkerResponse> {
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      const timer=setTimeout(()=>this.fail(new Error(`Geometry request timed out (${req.type})`)),this.timeoutMs);
      this.pending.set(id, { resolve, reject,timer,type:req.type });
      try{this.worker!.postMessage({ ...req, id } as WorkerRequest, transfer);}catch(err){this.fail(err);}
    });
  }

  private fail(reason:unknown):void {
    const error=reason instanceof Error?reason:new Error(String(reason));
    this.worker?.terminate();this.worker=null;this.ready=false;this.error=error.message;this.generation++;
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}
    this.pending.clear();this.inflight.clear();this.emit();
  }

  restart():void {
    this.fail(new Error('Geometry worker restarted'));
    this.error=null;this.meshes.clear();this.failed.clear();this.initialization=null;
    this.start();this.emit();
  }

  failuresFor(e:EvalElement):string[] {
    return (this.failed.get(geomSig(e))??[]).map((id)=>{
      const match=/^processing-(\d+)$/.exec(id);return match?e.all[Number(match[1])-1]?.id??id:id;
    });
  }

  get revision():number{return this.generation;}

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  mesh(sig: string): MeshData | null | undefined {
    return this.meshes.get(sig);
  }

  /** Request meshes for elements whose geometry is not cached yet. */
  request(elements: EvalElement[]): void {
    if(this.error)return;
    if(!this.ready){this.start();return;}
    const generation=this.generation;
    const todo = new Map<string, SolidSpec>();
    for (const e of elements) {
      const s = solidSpec(e);
      if (this.meshes.has(s.sig) || this.inflight.has(s.sig) || todo.has(s.sig)) continue;
      todo.set(s.sig, s);
    }
    if (todo.size === 0) return;
    const items = [...todo.values()];
    items.forEach((i) => this.inflight.add(i.sig));
    // Small batches keep the first parts appearing quickly.
    for (let i = 0; i < items.length; i += 12) {
      const batch = items.slice(i, i + 12);
      this.call({ type: 'mesh', items: batch })
        .then((r) => {
          if(generation!==this.generation)return;
          if (r.ok && r.type === 'mesh') {
            for(const item of batch){this.inflight.delete(item.sig);if(!r.results.some(res=>res.sig===item.sig)){this.meshes.set(item.sig,null);this.failed.set(item.sig,['No geometry result']);}}
            for (const res of r.results) {
              this.meshes.set(res.sig, res.mesh);
              this.inflight.delete(res.sig);
              const failures=[...res.failed,...(res.error?[res.error]:!res.mesh?['No geometry mesh']:[])];
              if (failures.length) this.failed.set(res.sig, failures);else this.failed.delete(res.sig);
            }
          }
          this.emit();
        })
        .catch((error) => {if(generation!==this.generation)return;for(const b of batch){this.inflight.delete(b.sig);this.meshes.set(b.sig,null);this.failed.set(b.sig,[String(error)]);}this.emit();});
    }
    this.emit();
  }

  async project(elements: EvalElement[], views: ViewSpec[]): Promise<Projection[]> {
    const r = await this.call({ type: 'project', items: elements.map(placedSpec), views });
    if (r.ok && r.type === 'project') return r.projections;
    throw new Error('projection failed');
  }

  async step(elements: EvalElement[]): Promise<ArrayBuffer> {
    const r = await this.call({ type: 'step', items: elements.map((e) => ({ ...placedSpec(e), name: `${e.pos}_${e.name}` })) });
    if (r.ok && r.type === 'step') return r.data;
    throw new Error('STEP export failed');
  }

  async stl(elements: EvalElement[]): Promise<ArrayBuffer> {
    const r = await this.call({ type: 'stl', items: elements.map(placedSpec) });
    if (r.ok && r.type === 'stl') return r.data;
    throw new Error('STL export failed');
  }

  /** Intersection volumes of all part pairs whose bounding boxes overlap. */
  async overlaps(elements: EvalElement[]): Promise<{ a: string; b: string; volume: number }[]> {
    const boxes = elements.map(elementAABB);
    const pairs: [number, number][] = [];
    for (let i = 0; i < elements.length; i++)
      for (let j = i + 1; j < elements.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.max[0] - 0.5 <= b.min[0] || b.max[0] - 0.5 <= a.min[0] || a.max[1] - 0.5 <= b.min[1] || b.max[1] - 0.5 <= a.min[1] || a.max[2] - 0.5 <= b.min[2] || b.max[2] - 0.5 <= a.min[2]) continue;
        pairs.push([i, j]);
      }
    if (!pairs.length) return [];
    const r = await this.call({ type: 'overlaps', items: elements.map((e) => ({ ...placedSpec(e), id: e.id })), pairs });
    if (!(r.ok && r.type === 'overlaps')) return [];
    return pairs.map(([i, j], k) => ({ a: elements[i].id, b: elements[j].id, volume: r.volumes[k] }));
  }

  get busy(): boolean {
    return this.inflight.size > 0;
  }
}

export const geom = new GeomClient();
