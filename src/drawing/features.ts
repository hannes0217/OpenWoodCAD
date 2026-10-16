import { dot, sub, type Plane, type Vec3 } from '../core/math';
import type { Element, Processing } from '../core/model';

/** Inner planes of the base box (normals outward). */
function boxPlanes(e: Pick<Element, 'length' | 'width' | 'height'>): Plane[] {
  return [
    { p: [0, 0, 0], n: [-1, 0, 0] }, { p: [e.length, 0, 0], n: [1, 0, 0] },
    { p: [0, 0, 0], n: [0, -1, 0] }, { p: [0, e.width, 0], n: [0, 1, 0] },
    { p: [0, 0, 0], n: [0, 0, -1] }, { p: [0, 0, e.height], n: [0, 0, 1] },
  ];
}

function solve3(a: Plane, b: Plane, c: Plane): Vec3 | null {
  const [n1, n2, n3] = [a.n, b.n, c.n];
  const d1 = dot(n1, a.p), d2 = dot(n2, b.p), d3 = dot(n3, c.p);
  const det = n1[0] * (n2[1] * n3[2] - n2[2] * n3[1]) - n1[1] * (n2[0] * n3[2] - n2[2] * n3[0]) + n1[2] * (n2[0] * n3[1] - n2[1] * n3[0]);
  if (Math.abs(det) < 1e-9) return null;
  const x = (d1 * (n2[1] * n3[2] - n2[2] * n3[1]) - n1[1] * (d2 * n3[2] - n2[2] * d3) + n1[2] * (d2 * n3[1] - n2[1] * d3)) / det;
  const y = (n1[0] * (d2 * n3[2] - n2[2] * d3) - d1 * (n2[0] * n3[2] - n2[2] * n3[0]) + n1[2] * (n2[0] * d3 - d2 * n3[0])) / det;
  const z = (n1[0] * (n2[1] * d3 - d2 * n3[1]) - n1[1] * (n2[0] * d3 - d2 * n3[0]) + d1 * (n2[0] * n3[1] - n2[1] * n3[0])) / det;
  return [x, y, z];
}

/** Vertices of the convex polytope {q | n·(q−p) ≤ 0 for all planes}. */
export function polytopeVertices(planes: Plane[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < planes.length; i++)
    for (let j = i + 1; j < planes.length; j++)
      for (let k = j + 1; k < planes.length; k++) {
        const v = solve3(planes[i], planes[j], planes[k]);
        if (!v) continue;
        if (planes.every((pl) => dot(sub(v, pl.p), pl.n) <= 1e-6 * Math.max(1, Math.hypot(...pl.n)) + 1e-6)) {
          if (!out.some((o) => Math.abs(o[0] - v[0]) + Math.abs(o[1] - v[1]) + Math.abs(o[2] - v[2]) < 1e-6)) out.push(v);
        }
      }
  return out;
}

export interface FeatureExtent {
  min: Vec3;
  max: Vec3;
}

/** Local extent of the material removed by a processing (clipped to the base box). */
export function featureExtent(e: Pick<Element, 'length' | 'width' | 'height'>, p: Processing): FeatureExtent | null {
  const box = boxPlanes(e);
  let verts: Vec3[] = [];
  switch (p.geom) {
    case 'cut':
    case 'cutExcept':
      // Removed side: n·(q−p) ≥ 0 → flipped plane as inner constraint.
      verts = polytopeVertices([...box, { p: p.plane.p, n: [-p.plane.n[0], -p.plane.n[1], -p.plane.n[2]] }]);
      break;
    case 'polytope':
      verts = polytopeVertices([...box, ...p.planes]);
      break;
    case 'drill': {
      const d = p.through ? Math.hypot(e.length, e.width, e.height) : p.depth;
      const q: Vec3 = [p.p[0] + p.dir[0] * d, p.p[1] + p.dir[1] * d, p.p[2] + p.dir[2] * d];
      verts = [p.p, q];
      break;
    }
  }
  if (verts.length === 0) return null;
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const v of verts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], v[i]); max[i] = Math.max(max[i], v[i]); }
  const lim = [e.length, e.width, e.height];
  for (let i = 0; i < 3; i++) { min[i] = Math.max(0, min[i]); max[i] = Math.min(lim[i], max[i]); }
  return { min, max };
}

/** Sorted unique positions along local x where features start or end (for chain dimensions). */
export function featureStations(e: Pick<Element, 'length' | 'width' | 'height'>, procs: Processing[], axis = 0): number[] {
  const set = new Set<number>();
  for (const p of procs) {
    if (p.geom === 'drill') {
      set.add(Math.round(p.p[axis] * 10) / 10);
      continue;
    }
    const ext = featureExtent(e, p);
    if (!ext) continue;
    set.add(Math.round(ext.min[axis] * 10) / 10);
    set.add(Math.round(ext.max[axis] * 10) / 10);
  }
  const lim = [e.length, e.width, e.height][axis];
  set.add(0);
  set.add(Math.round(lim * 10) / 10);
  return [...set].filter((v) => v >= -0.01 && v <= lim + 0.01).sort((a, b) => a - b);
}
