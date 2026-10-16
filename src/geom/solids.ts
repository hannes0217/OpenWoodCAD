// Solid cache shared by worker and tests: one OCCT solid per geometry signature.

import { ProjectionCamera, exportSTEP, type Shape3D } from 'replicad';
import { applyFrame, buildLocalSolid, compound, meshShape, project, volumeOf, type MeshData, type Projection } from './kernel';
import type { PlacedSpec, SolidSpec, ViewSpec } from './protocol';

const cache = new Map<string, { shape: Shape3D; failed: string[] }>();
const MAX = 3000;

export function solidFor(spec: SolidSpec): { shape: Shape3D; failed: string[] } {
  const hit = cache.get(spec.sig);
  if (hit) {
    cache.delete(spec.sig);
    cache.set(spec.sig, hit);
    return hit;
  }
  const res = buildLocalSolid({ id: spec.sig, kind: 'beam', name: '', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, length: spec.length, width: spec.width, height: spec.height, outline: spec.outline, materialId: '', processings: [] }, spec.procs);
  cache.set(spec.sig, res);
  if (cache.size > MAX) {
    const oldest = cache.keys().next().value as string;
    cache.get(oldest)?.shape.delete();
    cache.delete(oldest);
  }
  return res;
}

export function meshFor(spec: SolidSpec, tolerance = 0.5): { mesh: MeshData; failed: string[] } {
  const s = solidFor(spec);
  return { mesh: meshShape(s.shape, tolerance), failed: s.failed };
}

export function placed(items: PlacedSpec[]): Shape3D[] {
  const shapes:Shape3D[]=[];
  try {
    for(const it of items)shapes.push(applyFrame(completeSolid(it),it.frame));
    return shapes;
  }catch(error){shapes.forEach(s=>s.delete());throw error;}
}

/** A preview may show a partly machined body, but a drawing, calculation or
 * export must never silently use that body as the finished construction.
 */
function completeSolid(spec:SolidSpec):Shape3D {
  const s=solidFor(spec);
  if(s.failed.length)throw new Error(`Geometry is incomplete: ${s.failed.join(', ')}`);
  return s.shape;
}

export function projectViews(items: PlacedSpec[], views: ViewSpec[]): Projection[] {
  const shapes = placed(items);
  if (shapes.length === 0) return views.map(() => ({ visible: [], hidden: [], bounds: [0, 0, 0, 0] as [number, number, number, number] }));
  const all = compound(shapes);
  try {return views.map((v) => {
    if (v.kind === 'plane') return project(all, v.plane);
    const cam = new ProjectionCamera(v.position, v.direction, v.xAxis);
    try{return project(all,cam);}finally{cam.delete();}
  });
  }finally{all.delete();}
}

export function stepFile(items: (PlacedSpec & { name: string; color?: string })[]): Blob {
  const shapes = placed(items);
  try{return exportSTEP(shapes.map((shape, i) => ({ shape, name: items[i].name || `part_${i + 1}`, color: items[i].color })));}
  finally{shapes.forEach(s=>s.delete());}
}

export function stlFile(items: PlacedSpec[]): ArrayBuffer {
  // Binary STL from meshes of the placed solids.
  const shapes = placed(items);
  const tris: number[] = [];
  try {for (const s of shapes) {
    const m = s.mesh({ tolerance: 0.2, angularTolerance: 10 });
    for (let i = 0; i < m.triangles.length; i++) {
      const v = m.triangles[i] * 3;
      tris.push(m.vertices[v], m.vertices[v + 1], m.vertices[v + 2]);
    }
  }}finally{shapes.forEach(s=>s.delete());}
  const n = tris.length / 9;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, n, true);
  let off = 84;
  for (let t = 0; t < n; t++) {
    const p = tris.slice(t * 9, t * 9 + 9);
    const ux = p[3] - p[0], uy = p[4] - p[1], uz = p[5] - p[2];
    const vx = p[6] - p[0], vy = p[7] - p[1], vz = p[8] - p[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const val of [nx, ny, nz, ...p]) { dv.setFloat32(off, val, true); off += 4; }
    dv.setUint16(off, 0, true);
    off += 2;
  }
  return buf;
}

export function volumes(items: SolidSpec[]): number[] {
  return items.map((it) => volumeOf(completeSolid(it)));
}

export function clearCache(): void {
  for (const v of cache.values()) v.shape.delete();
  cache.clear();
}

/** Intersection volume for the given index pairs of placed parts. */
export function overlapVolumes(items: PlacedSpec[], pairs: [number, number][]): number[] {
  const placedCache = new Map<number, Shape3D>();
  const get = (i: number) => {
    let s = placedCache.get(i);
    if (!s) { s = applyFrame(completeSolid(items[i]), items[i].frame); placedCache.set(i, s); }
    return s;
  };
  try {return pairs.map(([i, j]) => {
      const x = get(i).intersect(get(j)) as Shape3D;
      try{return volumeOf(x);}finally{x.delete();}
  });
  }finally{placedCache.forEach(s=>s.delete());}
}
