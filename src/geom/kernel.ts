// OpenCascade (via replicad) geometry: element solids, meshes, projections.
// Runs in a Web Worker in the app and directly in Node for tests.

import {
  Transformation, cast, draw, drawProjection, getOC, makeBox, makeCompound, makeCylinder, setOC,
  type AnyShape, type ProjectionCamera, type ProjectionPlane, type Shape3D,
} from 'replicad';
import { cross, norm, type Frame, type Plane, type Vec3 } from '../core/math';
import type { Element, Processing } from '../core/model';

type OC = Parameters<typeof setOC>[0];

let ready = false;

export async function initKernel(load: () => Promise<OC>): Promise<void> {
  if (ready) return;
  setOC(await load());
  ready = true;
}

export function kernelReady(): boolean {
  return ready;
}

/** Apply a frame (local -> world) to a shape. Returns a new shape. */
export function applyFrame<T extends AnyShape>(shape: T, f: Frame): T {
  const oc = getOC();
  const trsf = new oc.gp_Trsf();
  trsf.SetValues(f.x[0], f.y[0], f.z[0], f.o[0], f.x[1], f.y[1], f.z[1], f.o[1], f.x[2], f.y[2], f.z[2], f.o[2]);
  const t = new Transformation(trsf);
  const out = cast(t.transform(shape.wrapped)) as T;
  t.delete();
  return out;
}

/** Frame whose x axis is the given normal. */
function frameForNormal(p: Vec3, n: Vec3): Frame {
  const x = norm(n);
  const helper: Vec3 = Math.abs(x[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const y = norm(cross(helper, x));
  const z = cross(x, y);
  return { o: p, x, y, z };
}

/** Large box covering the half-space on the normal side of the plane. */
function halfSpace(pl: Plane, size: number): Shape3D {
  const b = makeBox([0, -size, -size], [size, size, size]);
  const out = applyFrame(b, frameForNormal(pl.p, pl.n));
  b.delete();
  return out;
}

function boundsBox(e: Element, margin: number): Shape3D {
  return makeBox([-margin, -margin, -margin], [e.length + margin, e.width + margin, e.height + margin]);
}

/** Convex region inside all planes, clipped to the element bounds + margin. */
function polytope(e: Element, planes: Plane[], margin: number, size: number): Shape3D {
  let shape: Shape3D = boundsBox(e, margin);
  for (const pl of planes) {
    const h = halfSpace(pl, size);
    const next = shape.cut(h) as Shape3D;
    h.delete();
    shape.delete();
    shape = next;
  }
  return shape;
}

function toolFor(e: Element, p: Processing): Shape3D {
  const diag = Math.hypot(e.length, e.width, e.height);
  const margin = diag + 100;
  const size = 4 * diag + 2000;
  switch (p.geom) {
    case 'cut':
      return halfSpace(p.plane, size);
    case 'polytope':
      return polytope(e, p.planes, margin, size);
    case 'drill': {
      const depth = p.through ? Math.max(p.depth, 2 * diag + 4000) : p.depth;
      const start: Vec3 = p.through ? [p.p[0] - p.dir[0] * (depth / 2), p.p[1] - p.dir[1] * (depth / 2), p.p[2] - p.dir[2] * (depth / 2)] : p.p;
      return makeCylinder(p.dia / 2, depth, start, norm(p.dir));
    }
    case 'cutExcept': {
      const h = halfSpace(p.plane, size);
      const keep = polytope(e, p.keep, margin, size);
      const out = h.cut(keep) as Shape3D;
      h.delete();
      keep.delete();
      return out;
    }
  }
}

export interface SolidResult {
  shape: Shape3D;
  failed: string[];
}

/** Base prism of an element in local coordinates. */
function baseSolid(e: Element): Shape3D {
  if (e.outline && e.outline.length >= 2) {
    const pts = e.outline;
    let pen = draw([pts[0][0], pts[0][1]]);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const bulge = a[2] ?? 0;
      const last = i === pts.length - 1;
      if (last && Math.abs(bulge) < 1e-9) break; // close() draws the final straight segment
      if (Math.abs(bulge) > 1e-9) pen = pen.bulgeArcTo([b[0], b[1]], bulge);
      else pen = pen.lineTo([b[0], b[1]]);
    }
    const sketch = pen.close().sketchOnPlane('XY') as unknown as { extrude: (h: number) => Shape3D };
    return sketch.extrude(e.height);
  }
  return makeBox([0, 0, 0], [e.length, e.width, e.height]);
}

/** Solid of an element with all processings, in LOCAL coordinates. */
export function buildLocalSolid(e: Element, processings: Processing[]): SolidResult {
  let shape = baseSolid(e);
  const failed: string[] = [];
  // Cuts first (they shorten the part), then the rest; keeps booleans small.
  const ordered = [...processings].sort((a, b) => (a.geom === 'cut' ? 0 : 1) - (b.geom === 'cut' ? 0 : 1));
  for (const p of ordered) {
    try {
      const tool = toolFor(e, p);
      const next = shape.cut(tool) as Shape3D;
      tool.delete();
      shape.delete();
      shape = next;
    } catch (err) {
      failed.push(p.id);
    }
  }
  return { shape, failed };
}

export interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  edges: Float32Array;
}

export function meshShape(shape: AnyShape, tolerance = 0.5): MeshData {
  const s = shape as Shape3D;
  const m = s.mesh({ tolerance, angularTolerance: 15 });
  const e = s.meshEdges({ tolerance, angularTolerance: 15 });
  return {
    vertices: new Float32Array(m.vertices),
    normals: new Float32Array(m.normals),
    indices: new Uint32Array(m.triangles),
    edges: new Float32Array(e.lines),
  };
}

/** Compound of several shapes. Note: replicad consumes (deletes) the input shapes. */
export function compound(shapes: AnyShape[]): AnyShape {
  return shapes.length === 1 ? shapes[0] : makeCompound(shapes);
}

export function volumeOf(shape: Shape3D): number {
  const oc = getOC();
  const props = new oc.GProp_GProps();
  oc.BRepGProp.VolumeProperties(shape.wrapped, props, false, false, false);
  const v = props.Mass();
  props.delete();
  return v;
}

export interface Projection {
  visible: string[];
  hidden: string[];
  /** Bounding box of the visible drawing in projection coordinates. */
  bounds: [number, number, number, number];
}

function drawingBounds(paths: { boundingBox: { bounds: [[number, number], [number, number]] } }): [number, number, number, number] {
  const [[x0, y0], [x1, y1]] = paths.boundingBox.bounds;
  return [x0, y0, x1, y1];
}

/** Hidden-line projection of one shape (use `compound` for several). Paths are (u, v) with v up. */
export function project(shape: AnyShape, view: ProjectionPlane | ProjectionCamera): Projection {
  const { visible, hidden } = drawProjection(shape, view);
  const vis = visible.toSVGPaths().flat() as string[];
  const hid = hidden.toSVGPaths().flat() as string[];
  let bounds: [number, number, number, number] = [0, 0, 0, 0];
  try {
    bounds = drawingBounds(visible as unknown as { boundingBox: { bounds: [[number, number], [number, number]] } });
  } catch {
    /* empty drawing */
  }
  return { visible: vis, hidden: hid, bounds };
}

