import {
  type AABB, type Frame, type Plane, type Vec3,
  aabbOfPoints, add, boxCorners, cross, dirToWorld, dot, frameFromX, len, neg, norm, scale, sub, toWorld, uid,
} from './math';
import type { EdgeId, Element, ElementKind } from './model';

export interface BeamOptions {
  id?: string;
  name: string;
  role?: string;
  materialId: string;
  /** Where the p1→p2 line lies in the cross-section. */
  align?: 'center' | 'bottom' | 'top';
  /** Preferred direction of the local z (height) axis. */
  up?: Vec3;
  /** Rotation of the cross-section around the axis (degrees). */
  roll?: number;
  generator?: string;
  groupId?: string;
}

/** Beam from p1 to p2 with cross-section width × height. */
export function createBeam(p1: Vec3, p2: Vec3, width: number, height: number, o: BeamOptions): Element {
  const axis = sub(p2, p1);
  const L = len(axis);
  if (L < 1) throw new Error('Beam too short');
  let f = frameFromX(p1, axis, o.up ?? [0, 0, 1]);
  if (o.roll) {
    const a = (o.roll * Math.PI) / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const y = add(scale(f.y, c), scale(f.z, s));
    const z = cross(f.x, y);
    f = { ...f, y, z };
  }
  const zOff = o.align === 'bottom' ? 0 : o.align === 'top' ? height : height / 2;
  const origin = sub(sub(p1, scale(f.y, width / 2)), scale(f.z, zOff));
  return {
    id: o.id ?? uid('b'),
    kind: 'beam',
    name: o.name,
    role: o.role,
    frame: { ...f, o: origin },
    length: L,
    width,
    height,
    materialId: o.materialId,
    processings: [],
    generator: o.generator,
    groupId: o.groupId,
  };
}

type AxisName = 'x' | 'y' | 'z';
const UNIT: Record<AxisName, Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const IDX: Record<AxisName, number> = { x: 0, y: 1, z: 2 };

export interface BoxOptions {
  id?: string;
  kind?: ElementKind;
  name: string;
  role?: string;
  materialId: string;
  /** World axis of the grain (element length). */
  grain: AxisName;
  /** World axis of the thickness (element height). Defaults to the thinnest remaining axis. */
  thick?: AxisName;
  /** Edge banding by world side: e.g. { y: 'min' } bands the front edge (front = −Y). */
  band?: Partial<Record<AxisName, 'min' | 'max' | 'both'>>;
  generator?: string;
  groupId?: string;
}

/** Axis-aligned element filling the world box [min, min + size]. */
export function createBoxElement(min: Vec3, size: Vec3, o: BoxOptions): Element {
  const gx = o.grain;
  const rest = (['x', 'y', 'z'] as AxisName[]).filter((a) => a !== gx);
  const tz = o.thick ?? (size[IDX[rest[0]]] <= size[IDX[rest[1]]] ? rest[0] : rest[1]);
  const ty = rest.find((a) => a !== tz)!;
  const x = UNIT[gx];
  const z = UNIT[tz];
  const y = cross(z, x);
  const ySign = dot(y, UNIT[ty]);
  const origin: Vec3 = [...min];
  if (ySign < 0) origin[IDX[ty]] += size[IDX[ty]];
  const edges: Partial<Record<EdgeId, boolean>> = {};
  for (const [axis, side] of Object.entries(o.band ?? {}) as [AxisName, 'min' | 'max' | 'both'][]) {
    const local = axis === gx ? 'x' : axis === ty ? 'y' : null;
    if (!local) continue;
    const flip = local === 'y' && ySign < 0;
    const wantMin = side === 'min' || side === 'both';
    const wantMax = side === 'max' || side === 'both';
    if (wantMin) edges[`${local}${flip ? 1 : 0}` as EdgeId] = true;
    if (wantMax) edges[`${local}${flip ? 0 : 1}` as EdgeId] = true;
  }
  return {
    id: o.id ?? uid('p'),
    kind: o.kind ?? 'panel',
    name: o.name,
    role: o.role,
    frame: { o: origin, x, y, z },
    length: size[IDX[gx]],
    width: size[IDX[ty]],
    height: size[IDX[tz]],
    materialId: o.materialId,
    edges,
    processings: [],
    generator: o.generator,
    groupId: o.groupId,
  };
}

export function elementSize(e: Element): Vec3 {
  return [e.length, e.width, e.height];
}

export function elementCorners(e: Element): Vec3[] {
  return boxCorners(elementSize(e)).map((p) => toWorld(e.frame, p));
}

export function elementAABB(e: Element): AABB {
  return aabbOfPoints(elementCorners(e));
}

export function elementCenter(e: Element): Vec3 {
  return toWorld(e.frame, [e.length / 2, e.width / 2, e.height / 2]);
}

/** Axis line through the cross-section centre. */
export function elementAxis(e: Element): [Vec3, Vec3] {
  return [toWorld(e.frame, [0, e.width / 2, e.height / 2]), toWorld(e.frame, [e.length, e.width / 2, e.height / 2])];
}

export type FaceId = 'x0' | 'x1' | 'y0' | 'y1' | 'z0' | 'z1';

/** World planes of the base box faces, normals pointing outwards. */
export function facePlanes(e: Element): Record<FaceId, Plane> {
  const f = e.frame;
  const far = toWorld(f, [e.length, e.width, e.height]);
  return {
    x0: { p: f.o, n: neg(f.x) },
    x1: { p: far, n: f.x },
    y0: { p: f.o, n: neg(f.y) },
    y1: { p: far, n: f.y },
    z0: { p: f.o, n: neg(f.z) },
    z1: { p: far, n: f.z },
  };
}

export function boxPlanes(e: Element): Plane[] {
  return Object.values(facePlanes(e));
}

export function baseVolume(e: Element): number {
  return e.length * e.width * e.height;
}

/** Point inside the base box (with tolerance). */
export function containsPoint(e: Element, q: Vec3, tol = 1e-6): boolean {
  return boxPlanes(e).every((pl) => dot(sub(q, pl.p), pl.n) <= tol);
}

/** Direction of the element axis (unit). */
export function axisDir(e: Element): Vec3 {
  return norm(e.frame.x);
}

/** Express a local direction in world. */
export function localDir(e: Element, d: Vec3): Vec3 {
  return dirToWorld(e.frame, d);
}

export function frameOf(e: Element): Frame {
  return e.frame;
}
