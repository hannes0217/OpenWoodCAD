/// <reference lib="webworker" />
import opencascade from 'replicad-opencascadejs';
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import { initKernel } from './kernel';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { meshFor, overlapVolumes, projectViews, stepFile, stlFile, volumes } from './solids';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const ready = initKernel(() => (opencascade as unknown as (o: object) => Promise<never>)({ locateFile: () => wasmUrl }));

ctx.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    await ready;
    let res: WorkerResponse;
    switch (req.type) {
      case 'init':
        res = { id: req.id, ok: true, type: 'init' };
        break;
      case 'mesh': {
        const results = req.items.map((it) => {
          try {
            const { mesh, failed } = meshFor(it, req.tolerance);
            return { sig: it.sig, mesh, failed };
          } catch (err) {
            return { sig: it.sig, mesh: null, failed: [], error: String(err) };
          }
        });
        const transfer = results.flatMap((r) => (r.mesh ? [r.mesh.vertices.buffer, r.mesh.normals.buffer, r.mesh.indices.buffer, r.mesh.edges.buffer] : []));
        ctx.postMessage({ id: req.id, ok: true, type: 'mesh', results } satisfies WorkerResponse, transfer as Transferable[]);
        return;
      }
      case 'project':
        res = { id: req.id, ok: true, type: 'project', projections: projectViews(req.items, req.views) };
        break;
      case 'step': {
        const data = await stepFile(req.items).arrayBuffer();
        ctx.postMessage({ id: req.id, ok: true, type: 'step', data } satisfies WorkerResponse, [data]);
        return;
      }
      case 'stl': {
        const data = stlFile(req.items);
        ctx.postMessage({ id: req.id, ok: true, type: 'stl', data } satisfies WorkerResponse, [data]);
        return;
      }
      case 'volume':
        res = { id: req.id, ok: true, type: 'volume', volumes: volumes(req.items) };
        break;
      case 'overlaps':
        res = { id: req.id, ok: true, type: 'overlaps', volumes: overlapVolumes(req.items, req.pairs) };
        break;
    }
    ctx.postMessage(res);
  } catch (err) {
    ctx.postMessage({ id: req.id, ok: false, error: String((err as Error)?.message ?? err) } satisfies WorkerResponse);
  }
};
