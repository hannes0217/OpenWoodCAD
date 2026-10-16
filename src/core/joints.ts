import {
  type Plane, type Vec3,
  add, cross, dirToLocal, dot, len, neg, norm, planeToLocal, rotateVec, round, scale, sub, toLocal, toWorld,
} from './math';
import { boxPlanes, elementAxis, elementCenter, facePlanes, type FaceId } from './elements';
import type { Element, HardwareUse, Joint, JointType, Msg, ParamValue, Processing, ProcessingType } from './model';

// =====================================================================
// Joints turn two elements into processings on one or both of them.
// All construction happens in world coordinates; results are converted
// to the local frame of the processed element.
// =====================================================================

export interface JointResult {
  processings: { elementId: string; processing: Processing }[];
  hardware: HardwareUse[];
  warnings: Msg[];
}

export interface JointParamDef {
  id: string;
  type: 'number' | 'select' | 'boolean';
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  unit?: string;
}

export const JOINT_PARAMS: Record<JointType, JointParamDef[]> = {
  trim: [{ id: 'face', type: 'select', options: ['near', 'far'], default: 'near' }, { id: 'gap', type: 'number', default: 0, min: 0, max: 50, step: 0.5, unit: 'mm' }],
  miter: [],
  house: [{ id: 'clearance', type: 'number', default: 0, min: 0, max: 10, step: 0.5, unit: 'mm' }, { id: 'kind', type: 'select', options: ['house', 'notch', 'birdsMouth'], default: 'house' }],
  birdsMouth: [{ id: 'clearance', type: 'number', default: 0, min: 0, max: 10, step: 0.5, unit: 'mm' }],
  lap: [{ id: 'ratio', type: 'number', default: 0.5, min: 0.1, max: 0.9, step: 0.05 }, { id: 'aOnTop', type: 'boolean', default: true }],
  tenon: [
    { id: 'thickness', type: 'number', default: 0, min: 0, max: 200, step: 1, unit: 'mm' },
    { id: 'length', type: 'number', default: 60, min: 10, max: 300, step: 1, unit: 'mm' },
    { id: 'shoulder', type: 'number', default: 20, min: 0, max: 200, step: 1, unit: 'mm' },
    { id: 'clearance', type: 'number', default: 2, min: 0, max: 20, step: 0.5, unit: 'mm' },
    { id: 'peg', type: 'boolean', default: true },
    { id: 'pegDia', type: 'number', default: 24, min: 8, max: 40, step: 1, unit: 'mm' },
  ],
  dovetail: [
    { id: 'width', type: 'number', default: 0, min: 0, max: 300, step: 1, unit: 'mm' },
    { id: 'length', type: 'number', default: 30, min: 10, max: 100, step: 1, unit: 'mm' },
    { id: 'angle', type: 'number', default: 15, min: 5, max: 25, step: 1, unit: '°' },
    { id: 'bottom', type: 'number', default: 20, min: 0, max: 200, step: 1, unit: 'mm' },
  ],
  stepJoint: [{ id: 'depth', type: 'number', default: 0, min: 0, max: 100, step: 1, unit: 'mm' }],
  dowel: [{ id: 'spacing', type: 'number', default: 128, min: 32, max: 400, step: 1, unit: 'mm' }],
  confirmat: [{ id: 'spacing', type: 'number', default: 200, min: 50, max: 500, step: 1, unit: 'mm' }],
  screw: [{ id: 'spacing', type: 'number', default: 150, min: 30, max: 500, step: 1, unit: 'mm' }, { id: 'size', type: 'select', options: ['4x50', '4x40', '4x30', '3x16', '6x120', '8x300'], default: '4x50' }],
};

export function jointParam<T extends ParamValue>(j: Joint, id: string): T {
  if (j.params[id] !== undefined) return j.params[id] as T;
  const def = JOINT_PARAMS[j.type].find((p) => p.id === id);
  return def?.default as T;
}

let seq = 0;
const pid = (j: Joint, tag: string) => `${j.id}:${tag}:${seq++}`;

function localPlane(e: Element, pl: Plane): Plane {
  const l = planeToLocal(e.frame, pl);
  return { p: l.p, n: norm(l.n) };
}

const offsetPlane = (pl: Plane, d: number): Plane => ({ p: add(pl.p, scale(norm(pl.n), d)), n: norm(pl.n) });

/** Angle of a cut plane relative to the element axis, for lists (degrees). */
function cutAngles(e: Element, worldPlane: Plane): { angle: number; inclination: number } {
  const n = norm(dirToLocal(e.frame, worldPlane.n));
  const angle = (Math.atan2(Math.abs(n[1]), Math.abs(n[0])) * 180) / Math.PI;
  const inclination = (Math.atan2(Math.abs(n[2]), Math.abs(n[0])) * 180) / Math.PI;
  return { angle: round(90 - angle, 0.1), inclination: round(90 - inclination, 0.1) };
}

interface Entry {
  plane: Plane; // B face plane, outward normal
  face: FaceId;
  hit: Vec3; // axis hit point on that plane
  dir: Vec3; // direction of A towards B
}

/** Find where A's axis enters (or leaves) B's base box, approaching from A's far end. */
export function axisEntry(a: Element, b: Element, which: 'near' | 'far' = 'near'): Entry | null {
  const [s, e] = elementAxis(a);
  const cB = elementCenter(b);
  const towardsEnd = len(sub(e, cB)) < len(sub(s, cB));
  const from = towardsEnd ? s : e;
  const to = towardsEnd ? e : s;
  const dir = norm(sub(to, from));
  const planes = facePlanes(b);
  let tEnter = -Infinity;
  let tExit = Infinity;
  let enter: FaceId | null = null;
  let exit: FaceId | null = null;
  for (const [id, pl] of Object.entries(planes) as [FaceId, Plane][]) {
    const den = dot(dir, pl.n);
    const num = dot(sub(pl.p, from), pl.n);
    if (Math.abs(den) < 1e-9) {
      if (num < -1e-6) return null; // parallel and outside
      continue;
    }
    const t = num / den;
    if (den < 0) {
      if (t > tEnter) { tEnter = t; enter = id; }
    } else if (t < tExit) { tExit = t; exit = id; }
  }
  if (tEnter > tExit + 1e-6) return null;
  const face = which === 'near' ? enter : exit;
  if (!face) return null;
  const t = which === 'near' ? tEnter : tExit;
  return { plane: planes[face], face, hit: add(from, scale(dir, t)), dir };
}

function cutProcessing(j: Joint, e: Element, worldPlane: Plane, type?: ProcessingType): Processing {
  const { angle, inclination } = cutAngles(e, worldPlane);
  const t: ProcessingType = type ?? (Math.abs(angle) < 0.05 && Math.abs(inclination) < 0.05 ? 'endCut' : 'jackRafterCut');
  return { id: pid(j, 'cut'), type: t, geom: 'cut', plane: localPlane(e, worldPlane), jointId: j.id, info: { angle, inclination } };
}

// ----------------------------------------------------------- joint kinds

function trim(j: Joint, a: Element, b: Element, r: JointResult) {
  const which = jointParam<string>(j, 'face') === 'far' ? 'far' : 'near';
  const entry = axisEntry(a, b, which);
  if (!entry) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const gap = jointParam<number>(j, 'gap');
  // Remove everything beyond the face, i.e. on the side A travels to.
  const n = which === 'near' ? neg(entry.plane.n) : entry.plane.n;
  const plane = { p: add(entry.plane.p, scale(n, -gap)), n };
  r.processings.push({ elementId: a.id, processing: cutProcessing(j, a, plane) });
}

function closestAxisPoint(a: Element, b: Element): Vec3 {
  const [p1, p2] = elementAxis(a);
  const [q1, q2] = elementAxis(b);
  const d1 = sub(p2, p1), d2 = sub(q2, q1), r0 = sub(p1, q1);
  const aa = dot(d1, d1), bb = dot(d1, d2), cc = dot(d2, d2), dd = dot(d1, r0), ee = dot(d2, r0);
  const den = aa * cc - bb * bb;
  if (Math.abs(den) < 1e-9) return p2;
  const s = (bb * ee - cc * dd) / den;
  const t = (aa * ee - bb * dd) / den;
  return scale(add(add(p1, scale(d1, s)), add(q1, scale(d2, t))), 0.5);
}

function towards(e: Element, p: Vec3): Vec3 {
  const [s, en] = elementAxis(e);
  return len(sub(en, p)) < len(sub(s, p)) ? norm(sub(en, s)) : norm(sub(s, en));
}

function miter(j: Joint, a: Element, b: Element, r: JointResult) {
  const x = closestAxisPoint(a, b);
  const dA = towards(a, x);
  const dB = towards(b, x);
  const nA = sub(dA, dB);
  if (len(nA) < 1e-6) return r.warnings.push({ key: 'warn.jointParallel', args: { a: a.name, b: b.name } });
  const plane = { p: x, n: norm(nA) };
  r.processings.push({ elementId: a.id, processing: cutProcessing(j, a, plane, 'miter') });
  r.processings.push({ elementId: b.id, processing: cutProcessing(j, b, { p: x, n: neg(plane.n) }, 'miter') });
}

function boxOverlaps(a: Element, b: Element): boolean {
  // Separating axis test on the face normals of both boxes (sufficient for our use).
  const cornersA = cornersOf(a);
  const cornersB = cornersOf(b);
  for (const pl of [...boxPlanes(a), ...boxPlanes(b)]) {
    const n = norm(pl.n);
    const pa = cornersA.map((c) => dot(c, n));
    const pb = cornersB.map((c) => dot(c, n));
    if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
  }
  return true;
}

function cornersOf(e: Element): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [0, e.length]) for (const y of [0, e.width]) for (const z of [0, e.height]) out.push(toWorld(e.frame, [x, y, z]));
  return out;
}

function house(j: Joint, a: Element, b: Element, r: JointResult, type: ProcessingType) {
  if (!boxOverlaps(a, b)) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const c = jointParam<number>(j, 'clearance') ?? 0;
  const planes = boxPlanes(b).map((pl) => localPlane(a, offsetPlane(pl, c)));
  r.processings.push({ elementId: a.id, processing: { id: pid(j, 'house'), type, geom: 'polytope', planes, jointId: j.id, info: { element: b.name } } });
}

function lap(j: Joint, a: Element, b: Element, r: JointResult) {
  if (!boxOverlaps(a, b)) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const c = cross(a.frame.x, b.frame.x);
  // Crossing direction: perpendicular to both axes; for parallel members use A's height axis.
  const n = len(c) > 1e-6 ? norm(c) : a.frame.z;
  const proj = (e: Element) => {
    const v = cornersOf(e).map((p) => dot(p, n));
    return [Math.min(...v), Math.max(...v)];
  };
  const [a0, a1] = proj(a);
  const [b0, b1] = proj(b);
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  const ratio = jointParam<number>(j, 'ratio');
  const aOnTop = jointParam<boolean>(j, 'aOnTop');
  const split = aOnTop ? hi - (hi - lo) * ratio : lo + (hi - lo) * ratio;
  const splitPt = scale(n, split);
  const side = (e: Element) => boxPlanes(e).filter((pl) => Math.abs(dot(norm(pl.n), n)) < 0.99);
  // A loses the part inside B's footprint on its "lower" side (or upper if A is below).
  const aLimit: Plane = aOnTop ? { p: splitPt, n } : { p: splitPt, n: neg(n) };
  const bLimit: Plane = { p: splitPt, n: neg(aLimit.n) };
  const depthA = round(aOnTop ? split - a0 : a1 - split, 0.1);
  const depthB = round(aOnTop ? b1 - split : split - b0, 0.1);
  r.processings.push({ elementId: a.id, processing: { id: pid(j, 'lap'), type: 'lap', geom: 'polytope', planes: [...side(b), aLimit].map((pl) => localPlane(a, pl)), jointId: j.id, info: { depth: depthA } } });
  r.processings.push({ elementId: b.id, processing: { id: pid(j, 'lap'), type: 'lap', geom: 'polytope', planes: [...side(a), bLimit].map((pl) => localPlane(b, pl)), jointId: j.id, info: { depth: depthB } } });
}

/** Orthonormal tenon axes in the entry face, derived from A's cross-section axes. */
function faceAxes(a: Element, nF: Vec3): { ty: Vec3; tz: Vec3; extY: number; extZ: number } {
  const project = (v: Vec3) => sub(v, scale(nF, dot(v, nF)));
  let tz = project(a.frame.z);
  if (len(tz) < 1e-6) tz = project(a.frame.x);
  tz = norm(tz);
  const ty = norm(cross(nF, tz));
  // Extent of A's cross-section along the face axes (measured perpendicular to A's axis).
  const ext = (t: Vec3) => Math.abs(dot(t, a.frame.y)) * a.width + Math.abs(dot(t, a.frame.z)) * a.height;
  return { ty, tz, extY: ext(ty), extZ: ext(tz) };
}

function tenon(j: Joint, a: Element, b: Element, r: JointResult) {
  const entry = axisEntry(a, b, 'near');
  if (!entry) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const nF = norm(entry.plane.n);
  const inward = neg(nF);
  const { ty, tz, extY, extZ } = faceAxes(a, nF);
  const tParam = jointParam<number>(j, 'thickness');
  const t = tParam > 0 ? tParam : Math.max(20, Math.round(extY / 3 / 5) * 5);
  const shoulder = jointParam<number>(j, 'shoulder');
  const h = Math.max(10, extZ - 2 * shoulder);
  const l = jointParam<number>(j, 'length');
  const clr = jointParam<number>(j, 'clearance');
  const H = entry.hit;
  const sideCheck = (v: Vec3) => Math.abs(dot(v, nF));
  if (sideCheck(a.frame.x) < 0.5) r.warnings.push({ key: 'warn.tenonAngle', args: { a: a.name } });
  const bDepth = Math.abs(dot(inward, b.frame.x)) * b.length + Math.abs(dot(inward, b.frame.y)) * b.width + Math.abs(dot(inward, b.frame.z)) * b.height;
  if (l > bDepth) r.warnings.push({ key: 'warn.tenonTooLong', args: { a: a.name, b: b.name } });
  const region = (extra: number, depthExtra: number): Plane[] => [
    { p: add(H, scale(ty, t / 2 + extra)), n: ty },
    { p: add(H, scale(ty, -t / 2 - extra)), n: neg(ty) },
    { p: add(H, scale(tz, h / 2 + extra)), n: tz },
    { p: add(H, scale(tz, -h / 2 - extra)), n: neg(tz) },
    { p: add(H, scale(inward, l + depthExtra)), n: inward },
  ];
  const cutPlane: Plane = { p: H, n: inward };
  r.processings.push({
    elementId: a.id,
    processing: { id: pid(j, 'tenon'), type: 'tenon', geom: 'cutExcept', plane: localPlane(a, cutPlane), keep: region(0, 0).map((pl) => localPlane(a, pl)), jointId: j.id, info: { width: round(t), height: round(h), length: l } },
  });
  const mortise = [...region(0, clr), { p: add(H, scale(nF, 1)), n: nF }];
  r.processings.push({
    elementId: b.id,
    processing: { id: pid(j, 'mortise'), type: 'mortise', geom: 'polytope', planes: mortise.map((pl) => localPlane(b, pl)), jointId: j.id, info: { width: round(t), height: round(h), depth: l + clr } },
  });
  if (jointParam<boolean>(j, 'peg')) {
    const dia = jointParam<number>(j, 'pegDia');
    const c = add(H, scale(inward, l / 2));
    const start = add(c, scale(ty, -1000));
    for (const e of [a, b]) {
      r.processings.push({
        elementId: e.id,
        processing: { id: pid(j, 'peg'), type: 'drilling', geom: 'drill', p: toLocal(e.frame, start), dir: norm(dirToLocal(e.frame, ty)), dia, depth: 2000, through: true, jointId: j.id, info: { dia, peg: 1 } },
      });
    }
    r.hardware.push({ itemId: 'peg_24', qty: 1, source: j.id });
  }
}

function dovetail(j: Joint, a: Element, b: Element, r: JointResult) {
  const entry = axisEntry(a, b, 'near');
  if (!entry) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const nF = norm(entry.plane.n);
  const inward = neg(nF);
  const { ty, tz, extY, extZ } = faceAxes(a, nF);
  const wParam = jointParam<number>(j, 'width');
  const w = wParam > 0 ? wParam : Math.round((extY * 0.6) / 5) * 5;
  const l = jointParam<number>(j, 'length');
  const ang = (jointParam<number>(j, 'angle') * Math.PI) / 180;
  const bottom = jointParam<number>(j, 'bottom');
  const H = entry.hit;
  const topZ = extZ / 2;
  const botZ = -extZ / 2 + bottom;
  // Flanks widen towards the inside of B (dovetail locks against pulling out).
  const flank = (s: 1 | -1, extra: number): Plane => {
    const n0 = scale(ty, s);
    const n = norm(rotateVec(n0, scale(tz, s), -ang));
    return { p: add(H, scale(ty, s * (w / 2 + extra))), n };
  };
  const keep = [flank(1, 0), flank(-1, 0), { p: add(H, scale(tz, botZ)), n: neg(tz) }, { p: add(H, scale(inward, l)), n: inward }, { p: add(H, scale(tz, topZ)), n: tz }];
  r.processings.push({
    elementId: a.id,
    processing: { id: pid(j, 'dt'), type: 'dovetailTenon', geom: 'cutExcept', plane: localPlane(a, { p: H, n: inward }), keep: keep.map((pl) => localPlane(a, pl)), jointId: j.id, info: { width: w, length: l, angle: jointParam<number>(j, 'angle') } },
  });
  // Mortise open towards the top so A can be lowered in.
  const mortise = [flank(1, 0.5), flank(-1, 0.5), { p: add(H, scale(tz, botZ - 0.5)), n: neg(tz) }, { p: add(H, scale(inward, l + 1)), n: inward }, { p: add(H, scale(nF, 1)), n: nF }];
  r.processings.push({
    elementId: b.id,
    processing: { id: pid(j, 'dm'), type: 'dovetailMortise', geom: 'polytope', planes: mortise.map((pl) => localPlane(b, pl)), jointId: j.id, info: { width: w, depth: l + 1, angle: jointParam<number>(j, 'angle') } },
  });
}

function stepJoint(j: Joint, a: Element, b: Element, r: JointResult) {
  const entry = axisEntry(a, b, 'near');
  if (!entry) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const nF = norm(entry.plane.n);
  const d = entry.dir;
  const sinB = -dot(d, nF);
  const uRaw = sub(d, scale(nF, dot(d, nF)));
  if (sinB > 0.985 || len(uRaw) < 1e-6) return r.warnings.push({ key: 'warn.stepJointAngle', args: { a: a.name } });
  const u = norm(uRaw);
  const cosB = dot(d, u);
  const w = norm(cross(nF, u));
  const q = norm(sub(nF, scale(d, dot(nF, d))));
  const ext = (t: Vec3) => Math.abs(dot(t, a.frame.y)) * a.width + Math.abs(dot(t, a.frame.z)) * a.height;
  const hs = ext(q);
  const ws = ext(w);
  const hB = Math.abs(dot(nF, b.frame.x)) * b.length + Math.abs(dot(nF, b.frame.y)) * b.width + Math.abs(dot(nF, b.frame.z)) * b.height;
  const betaDeg = (Math.asin(sinB) * 180) / Math.PI;
  const maxDepth = betaDeg <= 50 ? hB / 4 : betaDeg >= 60 ? hB / 6 : hB / 4 - ((betaDeg - 50) / 10) * (hB / 4 - hB / 6);
  const dParam = jointParam<number>(j, 'depth');
  const tv = dParam > 0 ? dParam : Math.max(10, Math.floor(Math.min(maxDepth, 0.25 * hs) / 5) * 5);
  if (tv > maxDepth + 0.5) r.warnings.push({ key: 'warn.stepJointDepth', args: { a: a.name, max: round(maxDepth, 1) } });
  const H = entry.hit;
  const off = hs / 2 / sinB;
  const F1 = add(H, scale(u, off));
  const B1 = add(H, scale(u, -off));
  const bv = norm(add(scale(u, 1 - cosB), scale(nF, sinB)));
  const P2 = sub(F1, scale(bv, tv / dot(bv, nF)));
  // Front (bearing) face: contains w and bv; normal points forward/down (away from the notch).
  let nFront = norm(cross(bv, w));
  if (dot(nFront, u) < 0) nFront = neg(nFront);
  // Heel face: through P2 and B1, normal pointing away from the notch interior (down/back).
  const heelDir = norm(sub(P2, B1));
  let nHeel = norm(cross(heelDir, w));
  if (dot(nHeel, nF) > 0) nHeel = neg(nHeel);
  r.processings.push({ elementId: a.id, processing: { id: pid(j, 'sj'), type: 'stepJoint', geom: 'cut', plane: localPlane(a, { p: F1, n: nFront }), jointId: j.id, info: { depth: tv, angle: round(betaDeg, 0.1) } } });
  r.processings.push({ elementId: a.id, processing: { id: pid(j, 'sjh'), type: 'stepJoint', geom: 'cut', plane: localPlane(a, { p: B1, n: nHeel }), jointId: j.id, info: { depth: tv, angle: round(betaDeg, 0.1) } } });
  const notch: Plane[] = [
    { p: F1, n: nFront },
    { p: B1, n: nHeel },
    { p: add(H, scale(nF, 1)), n: nF },
    { p: add(H, scale(w, ws / 2 + 0.5)), n: w },
    { p: add(H, scale(w, -ws / 2 - 0.5)), n: neg(w) },
  ];
  r.processings.push({ elementId: b.id, processing: { id: pid(j, 'sjn'), type: 'stepJointNotch', geom: 'polytope', planes: notch.map((pl) => localPlane(b, pl)), jointId: j.id, info: { depth: tv, width: round(ws), angle: round(betaDeg, 0.1) } } });
}

// --------------------------------------------------- panel connectors

interface ConnectorSpec {
  itemId: string;
  diaFace: number;
  diaEdge: number;
  length: number;
  throughFace: boolean;
  edgeDistance: number;
  capItem?: string;
}

const CONNECTORS: Record<string, ConnectorSpec> = {
  dowel: { itemId: 'dowel_8x35', diaFace: 8, diaEdge: 8, length: 35, throughFace: false, edgeDistance: 32 },
  confirmat: { itemId: 'confirmat_7x50', diaFace: 7, diaEdge: 5, length: 50, throughFace: true, edgeDistance: 50, capItem: 'confirmat_cap' },
  '4x50': { itemId: 'screw_4x50', diaFace: 4.5, diaEdge: 2.5, length: 50, throughFace: true, edgeDistance: 40 },
  '4x40': { itemId: 'screw_4x40', diaFace: 4.5, diaEdge: 2.5, length: 40, throughFace: true, edgeDistance: 30 },
  '4x30': { itemId: 'screw_4x30', diaFace: 4.5, diaEdge: 2.5, length: 30, throughFace: true, edgeDistance: 25 },
  '3x16': { itemId: 'screw_3x16', diaFace: 3, diaEdge: 2, length: 16, throughFace: true, edgeDistance: 30 },
  '6x120': { itemId: 'screw_6x120', diaFace: 6.5, diaEdge: 4, length: 120, throughFace: true, edgeDistance: 40 },
  '8x300': { itemId: 'screw_8x300', diaFace: 8.5, diaEdge: 5, length: 300, throughFace: true, edgeDistance: 50 },
};

export function connectorPositions(lo: number, hi: number, edgeDistance: number, maxSpacing: number): number[] {
  const l = hi - lo;
  if (l < 40) return [round((lo + hi) / 2, 0.1)];
  const e = Math.min(edgeDistance, l / 4);
  const inner = l - 2 * e;
  const n = Math.max(2, Math.ceil(inner / maxSpacing - 1e-9) + 1);
  return Array.from({ length: n }, (_, i) => round(lo + e + (inner * i) / (n - 1), 0.1));
}

/** Contact between a face of `face` element and a face of `edge` element (coplanar, opposite). */
function findContact(edge: Element, face: Element): { pf: Plane; pe: Plane } | null {
  const fe = facePlanes(edge);
  const ff = facePlanes(face);
  let best: { pf: Plane; pe: Plane; score: number } | null = null;
  for (const pe of Object.values(fe)) {
    for (const pf of Object.values(ff)) {
      if (dot(norm(pe.n), norm(pf.n)) > -0.999) continue;
      if (Math.abs(dot(sub(pe.p, pf.p), norm(pf.n))) > 0.05) continue;
      const score = 1;
      if (!best || score > best.score) best = { pf, pe, score };
    }
  }
  return best ? { pf: best.pf, pe: best.pe } : null;
}

function panelConnector(j: Joint, a: Element, b: Element, r: JointResult) {
  // a butts with an edge against a face of b.
  const contact = findContact(a, b);
  if (!contact) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const n = norm(contact.pf.n); // outward normal of b's face, pointing into a
  // Overlap rectangle of a's footprint on the contact plane, in b's local frame.
  const proj = (e: Element) => cornersOf(e).filter((c) => Math.abs(dot(sub(c, contact.pf.p), n)) < 0.05);
  const ca = proj(a).map((c) => toLocal(b.frame, c));
  const cbAll = cornersOf(b).filter((c) => Math.abs(dot(sub(c, contact.pf.p), n)) < 0.05).map((c) => toLocal(b.frame, c));
  const nl = norm(dirToLocal(b.frame, n));
  const axesIdx = [0, 1, 2].filter((i) => Math.abs(nl[i]) < 0.5);
  const range = (pts: Vec3[], i: number) => [Math.min(...pts.map((p) => p[i])), Math.max(...pts.map((p) => p[i]))];
  const rects = axesIdx.map((i) => {
    const [a0, a1] = range(ca, i);
    const [b0, b1] = range(cbAll, i);
    return [Math.max(a0, b0), Math.min(a1, b1)];
  });
  if (rects.some(([lo, hi]) => hi - lo <= 0.01)) return r.warnings.push({ key: 'warn.jointNoContact', args: { a: a.name, b: b.name } });
  const lens = rects.map(([lo, hi]) => hi - lo);
  const alongI = lens[0] >= lens[1] ? 0 : 1;
  const acrossI = 1 - alongI;
  const kind = j.type === 'screw' ? jointParam<string>(j, 'size') : j.type;
  const spec = CONNECTORS[kind] ?? CONNECTORS.dowel;
  const spacing = jointParam<number>(j, 'spacing');
  const positions = connectorPositions(rects[alongI][0], rects[alongI][1], spec.edgeDistance, spacing);
  const mid = (rects[acrossI][0] + rects[acrossI][1]) / 2;
  const planeCoord = toLocal(b.frame, contact.pf.p);
  const nIdx = [0, 1, 2].find((i) => Math.abs(nl[i]) >= 0.5)!;
  const tB = [b.length, b.width, b.height][nIdx];
  const tA = Math.abs(dot(n, a.frame.x)) * a.length + Math.abs(dot(n, a.frame.y)) * a.width + Math.abs(dot(n, a.frame.z)) * a.height;
  const depthFace = spec.throughFace ? tB : Math.min(Math.round(tB * 0.65), tB - 4);
  const depthEdge = spec.throughFace ? Math.min(spec.length - tB + 3, tA) : Math.min(spec.length - depthFace + 2, tA);
  // The connector has to reach far enough into the second part (rule of thumb: ≥ 4 × diameter for screws).
  const minGrip = spec.throughFace ? Math.max(10, 4 * spec.diaEdge) : 10;
  if (depthEdge < minGrip) {
    r.warnings.push({ key: 'warn.connectorTooShort', args: { a: a.name, b: b.name, len: spec.length, t: Math.round(tB) } });
    return;
  }
  for (const pos of positions) {
    const pl: Vec3 = [0, 0, 0];
    pl[nIdx] = planeCoord[nIdx];
    pl[axesIdx[alongI]] = pos;
    pl[axesIdx[acrossI]] = mid;
    const pw = toWorld(b.frame, pl);
    if (spec.throughFace) {
      const start = sub(pw, scale(n, tB));
      r.processings.push({ elementId: b.id, processing: { id: pid(j, 'cf'), type: 'drilling', geom: 'drill', p: toLocal(b.frame, start), dir: norm(dirToLocal(b.frame, n)), dia: spec.diaFace, depth: tB, through: true, jointId: j.id, info: { dia: spec.diaFace, depth: tB } } });
    } else {
      r.processings.push({ elementId: b.id, processing: { id: pid(j, 'df'), type: 'drilling', geom: 'drill', p: toLocal(b.frame, pw), dir: norm(dirToLocal(b.frame, neg(n))), dia: spec.diaFace, depth: depthFace, through: false, jointId: j.id, info: { dia: spec.diaFace, depth: depthFace } } });
    }
    r.processings.push({ elementId: a.id, processing: { id: pid(j, 'de'), type: 'drilling', geom: 'drill', p: toLocal(a.frame, pw), dir: norm(dirToLocal(a.frame, n)), dia: spec.diaEdge, depth: depthEdge, through: false, jointId: j.id, info: { dia: spec.diaEdge, depth: depthEdge } } });
  }
  r.hardware.push({ itemId: spec.itemId, qty: positions.length, source: j.id });
  if (spec.capItem) r.hardware.push({ itemId: spec.capItem, qty: positions.length, source: j.id });
}

// ------------------------------------------------------------- dispatch

export function applyJoint(j: Joint, a: Element, b: Element): JointResult {
  seq = 0;
  const r: JointResult = { processings: [], hardware: [], warnings: [] };
  switch (j.type) {
    case 'trim': trim(j, a, b, r); break;
    case 'miter': miter(j, a, b, r); break;
    case 'house': house(j, a, b, r, (jointParam<string>(j, 'kind') as ProcessingType) ?? 'house'); break;
    case 'birdsMouth': house(j, a, b, r, 'birdsMouth'); break;
    case 'lap': lap(j, a, b, r); break;
    case 'tenon': tenon(j, a, b, r); break;
    case 'dovetail': dovetail(j, a, b, r); break;
    case 'stepJoint': stepJoint(j, a, b, r); break;
    case 'dowel':
    case 'confirmat':
    case 'screw': panelConnector(j, a, b, r); break;
  }
  return r;
}

/** Joint types that make sense for two elements (UI suggestions). */
export function suggestJoints(a: Element, b: Element): JointType[] {
  if (a.kind === 'panel' && b.kind === 'panel') return ['dowel', 'confirmat', 'screw', 'miter', 'house', 'trim'];
  const parallel = Math.abs(dot(norm(a.frame.x), norm(b.frame.x))) > 0.999;
  if (parallel) return ['lap', 'house', 'screw'];
  const entry = axisEntry(a, b, 'near');
  const out: JointType[] = [];
  if (entry) {
    const perpendicular = Math.abs(dot(entry.dir, norm(entry.plane.n))) > 0.98;
    out.push('trim', 'tenon', 'dovetail');
    if (!perpendicular) out.push('stepJoint');
  }
  out.push('birdsMouth', 'lap', 'house', 'miter');
  return [...new Set(out)];
}
