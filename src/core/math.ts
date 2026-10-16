// Small vector / frame library. Vectors are plain tuples so documents stay JSON.

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export const EPS = 1e-6;
export const DEG = Math.PI / 180;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
export const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));

export function norm(a: Vec3): Vec3 {
  const l = len(a);
  if (l < EPS) throw new Error('Cannot normalize zero vector');
  return scale(a, 1 / l);
}

export function round(v: number, step = 0.01): number {
  const r = Math.round(v / step) * step;
  return Math.abs(r) < step / 2 ? 0 : Number(r.toFixed(6));
}

export const roundVec = (a: Vec3, step = 0.001): Vec3 => [round(a[0], step), round(a[1], step), round(a[2], step)];

export function nearlyEqual(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) <= eps;
}

export function vecNearlyEqual(a: Vec3, b: Vec3, eps = 1e-4): boolean {
  return nearlyEqual(a[0], b[0], eps) && nearlyEqual(a[1], b[1], eps) && nearlyEqual(a[2], b[2], eps);
}

/** Rotate vector v around unit axis k by angle (radians), Rodrigues formula. */
export function rotateVec(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}

// ------------------------------------------------------------------ frames

/** Right-handed orthonormal coordinate system: local -> world. */
export interface Frame {
  o: Vec3;
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

export const WORLD: Frame = { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

export function toWorld(f: Frame, p: Vec3): Vec3 {
  return [
    f.o[0] + p[0] * f.x[0] + p[1] * f.y[0] + p[2] * f.z[0],
    f.o[1] + p[0] * f.x[1] + p[1] * f.y[1] + p[2] * f.z[1],
    f.o[2] + p[0] * f.x[2] + p[1] * f.y[2] + p[2] * f.z[2],
  ];
}

export function dirToWorld(f: Frame, d: Vec3): Vec3 {
  return [
    d[0] * f.x[0] + d[1] * f.y[0] + d[2] * f.z[0],
    d[0] * f.x[1] + d[1] * f.y[1] + d[2] * f.z[1],
    d[0] * f.x[2] + d[1] * f.y[2] + d[2] * f.z[2],
  ];
}

export function toLocal(f: Frame, p: Vec3): Vec3 {
  const d = sub(p, f.o);
  return [dot(d, f.x), dot(d, f.y), dot(d, f.z)];
}

export function dirToLocal(f: Frame, d: Vec3): Vec3 {
  return [dot(d, f.x), dot(d, f.y), dot(d, f.z)];
}

/**
 * Frame with x along `xDir` and z as close as possible to `up`.
 * Falls back to -Y (world) as up when x is vertical.
 */
export function frameFromX(o: Vec3, xDir: Vec3, up: Vec3 = [0, 0, 1]): Frame {
  const x = norm(xDir);
  let zc = sub(up, scale(x, dot(up, x)));
  if (len(zc) < 1e-9) {
    const alt: Vec3 = Math.abs(x[1]) < 0.9 ? [0, -1, 0] : [1, 0, 0];
    zc = sub(alt, scale(x, dot(alt, x)));
  }
  const z = norm(zc);
  const y = cross(z, x);
  return { o, x, y, z };
}

/** Frame from x and approximate y direction (z = x × y). */
export function frameFromXY(o: Vec3, xDir: Vec3, yDir: Vec3): Frame {
  const x = norm(xDir);
  const y = norm(sub(yDir, scale(x, dot(yDir, x))));
  return { o, x, y, z: cross(x, y) };
}

export function translateFrame(f: Frame, d: Vec3): Frame {
  return { ...f, o: add(f.o, d) };
}

/** Rotate a frame around a world axis through `center`. */
export function rotateFrame(f: Frame, center: Vec3, axis: Vec3, angle: number): Frame {
  const k = norm(axis);
  return {
    o: add(center, rotateVec(sub(f.o, center), k, angle)),
    x: rotateVec(f.x, k, angle),
    y: rotateVec(f.y, k, angle),
    z: rotateVec(f.z, k, angle),
  };
}

/** Mirror a frame on a plane; keeps right-handedness by flipping y. */
export function mirrorFrame(f: Frame, plane: Plane): Frame {
  const n = norm(plane.n);
  const mp = (p: Vec3): Vec3 => sub(p, scale(n, 2 * dot(sub(p, plane.p), n)));
  const md = (d: Vec3): Vec3 => sub(d, scale(n, 2 * dot(d, n)));
  const x = md(f.x);
  const z = md(f.z);
  return { o: mp(f.o), x, y: cross(z, x), z };
}

/** Compose: frame `inner` expressed in `outer` -> world frame. */
export function composeFrame(outer: Frame, inner: Frame): Frame {
  return {
    o: toWorld(outer, inner.o),
    x: dirToWorld(outer, inner.x),
    y: dirToWorld(outer, inner.y),
    z: dirToWorld(outer, inner.z),
  };
}

/** Express world frame `f` in coordinates of `ref`. */
export function relativeFrame(ref: Frame, f: Frame): Frame {
  return { o: toLocal(ref, f.o), x: dirToLocal(ref, f.x), y: dirToLocal(ref, f.y), z: dirToLocal(ref, f.z) };
}

/** Row-major 4x4 matrix (for three.js: Matrix4.set takes row-major). */
export function frameMatrix(f: Frame): number[] {
  return [f.x[0], f.y[0], f.z[0], f.o[0], f.x[1], f.y[1], f.z[1], f.o[1], f.x[2], f.y[2], f.z[2], f.o[2], 0, 0, 0, 1];
}

/** Euler angles (degrees, intrinsic Z-Y'-X'') describing the frame axes. */
export function frameToEuler(f: Frame): Vec3 {
  // R = Rz(a) * Ry(b) * Rx(c); columns are x, y, z.
  const r20 = f.x[2];
  const b = Math.asin(Math.max(-1, Math.min(1, -r20)));
  let a: number;
  let c: number;
  if (Math.abs(Math.cos(b)) > 1e-9) {
    a = Math.atan2(f.x[1], f.x[0]);
    c = Math.atan2(f.y[2], f.z[2]);
  } else {
    a = Math.atan2(-f.y[0], f.y[1]);
    c = 0;
  }
  return [round(a / DEG, 1e-6), round(b / DEG, 1e-6), round(c / DEG, 1e-6)];
}

export function frameFromEuler(o: Vec3, eulerDeg: Vec3): Frame {
  const [a, b, c] = eulerDeg.map((v) => v * DEG);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // R = Rz(a) Ry(b) Rx(c)
  const x: Vec3 = [ca * cb, sa * cb, -sb];
  const y: Vec3 = [ca * sb * sc - sa * cc, sa * sb * sc + ca * cc, cb * sc];
  const z: Vec3 = [ca * sb * cc + sa * sc, sa * sb * cc - ca * sc, cb * cc];
  return { o, x, y, z };
}

// ------------------------------------------------------------------ planes

/** Plane through p with normal n. Half-space "outside" = side n points to. */
export interface Plane {
  p: Vec3;
  n: Vec3;
}

export function planeToLocal(f: Frame, pl: Plane): Plane {
  return { p: toLocal(f, pl.p), n: dirToLocal(f, pl.n) };
}

export function planeToWorld(f: Frame, pl: Plane): Plane {
  return { p: toWorld(f, pl.p), n: dirToWorld(f, pl.n) };
}

export const signedDistance = (pl: Plane, q: Vec3): number => dot(sub(q, pl.p), norm(pl.n));

export const flipPlane = (pl: Plane): Plane => ({ p: pl.p, n: neg(pl.n) });

/** Intersection of line (p + t d) with plane, or null if parallel. */
export function linePlane(p: Vec3, d: Vec3, pl: Plane): number | null {
  const den = dot(d, pl.n);
  if (Math.abs(den) < 1e-12) return null;
  return dot(sub(pl.p, p), pl.n) / den;
}

/** Bisector plane between two planes through a common point (normals averaged). */
export function bisectorPlane(a: Plane, b: Plane, through: Vec3): Plane {
  return { p: through, n: norm(sub(norm(a.n), norm(b.n))) };
}

// ------------------------------------------------------------------ boxes

export interface AABB {
  min: Vec3;
  max: Vec3;
}

export function aabbOfPoints(points: Vec3[]): AABB {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i]);
      max[i] = Math.max(max[i], p[i]);
    }
  }
  return { min, max };
}

export function aabbUnion(a: AABB, b: AABB): AABB {
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  };
}

export function boxCorners(size: Vec3): Vec3[] {
  const [l, w, h] = size;
  return [
    [0, 0, 0], [l, 0, 0], [0, w, 0], [l, w, 0],
    [0, 0, h], [l, 0, h], [0, w, h], [l, w, h],
  ];
}

// ------------------------------------------------------------------ 2D

export function polygonArea(pts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function uid(prefix = 'e'): string {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${r}`;
}
