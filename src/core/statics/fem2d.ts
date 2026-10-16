import { strengthClass } from '../timber';
import type { StaticSystem } from './model';

/** Positive rotation is positive slope in the x/z plane. N: tension, M: sagging.
 * Linear, small-displacement Euler-Bernoulli frame; shear deformation is omitted.
 */
export interface Station {
  x: number;
  N: number;
  V: number;
  M: number;
  u: number;
  v: number;
}
export interface MemberResult {
  id: string;
  length: number;
  EA: number;
  EI: number;
  qx: number;
  qv: number;
  /** Local end displacements [u1,v1,rotation1,u2,v2,rotation2], including releases. */
  displacements: number[];
  endForces: number[];
  stations: Station[];
}
export interface NodeResult { id: string; ux: number; uz: number; ry: number }
export interface Reaction { node: string; fx: number; fz: number; my: number }
export interface FrameResult {
  nodes: NodeResult[];
  members: MemberResult[];
  reactions: Reaction[];
}
export class StaticsError extends Error {
  constructor(public readonly code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'StaticsError';
  }
}
type Matrix = number[][];
const zeros = (n: number, m = n): Matrix => Array.from({ length: n }, () => Array<number>(m).fill(0));
const mul = (a: Matrix, x: number[]) => a.map((r) => r.reduce((v, k, i) => v + k * x[i], 0));
export function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new StaticsError('invalidInput', `${label} must be finite`);
}
export function positive(value: number, label: string): void {
  finite(value, label);
  if (value <= 0) throw new StaticsError('invalidInput', `${label} must be positive`);
}

/** Diagonal equilibration makes the singularity criterion independent of units. */
function solve(a: Matrix, b: number[]): number[] {
  if (!b.length) return [];
  const scale = a.map((r, i) => Math.sqrt(Math.abs(r[i])));
  if (scale.some((s) => !(s > 0))) throw new StaticsError('singularSystem', 'Unrestrained degree of freedom');
  const m = a.map((r, i) => [...r.map((v, j) => v / (scale[i] * scale[j])), b[i] / scale[i]]);
  const n = b.length;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(m[i][k]) > Math.abs(m[p][k])) p = i;
    if (Math.abs(m[p][k]) < 1e-11) throw new StaticsError('singularSystem', 'Mechanism or ill-conditioned frame');
    [m[k], m[p]] = [m[p], m[k]];
    for (let i = k + 1; i < n; i++) {
      const ratio = m[i][k] / m[k][k];
      for (let j = k; j <= n; j++) m[i][j] -= ratio * m[k][j];
    }
  }
  const x = Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = (m[i][n] - m[i].slice(i + 1, n).reduce((v, k, j) => v + k * x[i + 1 + j], 0)) / m[i][i];
  }
  return x.map((v, i) => v / scale[i]);
}

function uniqueIds(items: { id: string }[], label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.id || ids.has(item.id)) throw new StaticsError('invalidInput', `Duplicate or empty ${label} ID: ${item.id}`);
    ids.add(item.id);
  }
}

export function validateSystem(sys: StaticSystem): void {
  if (!sys.nodes.length || !sys.members.length) throw new StaticsError('invalidInput', 'A frame needs nodes and members');
  uniqueIds(sys.nodes, 'node'); uniqueIds(sys.members, 'member'); uniqueIds(sys.cases, 'case');
  if (![1, 2, 3].includes(sys.serviceClass)) throw new StaticsError('invalidInput', 'Invalid service class');
  const nodes = new Map(sys.nodes.map((n) => [n.id, n]));
  const members = new Set(sys.members.map((m) => m.id));
  const cases = new Set(sys.cases.map((c) => c.id));
  for (const n of sys.nodes) { finite(n.x, n.id); finite(n.z, n.id); }
  for (const c of sys.cases) if (!['G', 'S', 'W', 'QA', 'QH'].includes(c.category)) throw new StaticsError('invalidInput', `Unknown action ${c.category}`);
  for (const m of sys.members) {
    const a = nodes.get(m.n1), b = nodes.get(m.n2);
    if (!a || !b) throw new StaticsError('invalidInput', `Unknown endpoint of ${m.id}`);
    positive(Math.hypot(b.x - a.x, b.z - a.z), `Length of ${m.id}`);
    positive(m.b, 'b'); positive(m.h, 'h'); strengthClass(m.strengthClass);
    for (const v of [m.bucklingFactor, m.lateralSpacing, m.limitInst, m.limitFin]) if (v !== undefined) positive(v, m.id);
  }
  for (const s of sys.supports) if (!nodes.has(s.node)) throw new StaticsError('invalidInput', `Unknown support node ${s.node}`);
  for (const l of sys.memberLoads) {
    if (!members.has(l.member) || !cases.has(l.case)) throw new StaticsError('invalidInput', 'Unknown member/load case');
    finite(l.qx, 'qx'); finite(l.qz, 'qz');
    if (l.site !== undefined && l.site !== 'snow' && l.site !== 'wind') throw new StaticsError('invalidInput', 'Unknown site action');
  }
  for (const l of sys.nodeLoads) {
    if (!nodes.has(l.node) || !cases.has(l.case)) throw new StaticsError('invalidInput', 'Unknown node/load case');
    finite(l.fx, 'fx'); finite(l.fz, 'fz'); finite(l.my ?? 0, 'my');
  }
}

interface ElementMatrix {
  id: string; length: number; EA: number; EI: number; qx: number; qv: number;
  dofs: number[]; T: Matrix; K: Matrix; f: number[]; condensedK: Matrix; condensedF: number[]; releases: number[];
}

function element(sys: StaticSystem, index: number, factors: Record<string, number>): ElementMatrix {
  const member = sys.members[index];
  const a = sys.nodes.findIndex((n) => n.id === member.n1), b = sys.nodes.findIndex((n) => n.id === member.n2);
  const dx = sys.nodes[b].x - sys.nodes[a].x, dz = sys.nodes[b].z - sys.nodes[a].z;
  const L = Math.hypot(dx, dz), c = dx / L, s = dz / L;
  const E = strengthClass(member.strengthClass).E0mean;
  const EA = E * member.b * member.h, EI = E * member.b * member.h ** 3 / 12;
  positive(EA, 'Axial rigidity'); positive(EI, 'Flexural rigidity');
  const A = EA / L, B = 12 * EI / L ** 3, C = 6 * EI / L ** 2, D = 4 * EI / L, F = 2 * EI / L;
  const K = [[A,0,0,-A,0,0],[0,B,C,0,-B,C],[0,C,D,0,-C,F],[-A,0,0,A,0,0],[0,-B,-C,0,B,-C],[0,C,F,0,-C,D]];
  const T = [[c,s,0,0,0,0],[-s,c,0,0,0,0],[0,0,1,0,0,0],[0,0,0,c,s,0],[0,0,0,-s,c,0],[0,0,0,0,0,1]];
  let qx = 0, qv = 0;
  for (const l of sys.memberLoads.filter((l) => l.member === member.id)) {
    if (l.site) throw new StaticsError('unresolvedSiteLoad', 'Resolve site actions before solving');
    const factor = (factors[l.case] ?? 0) * (l.projected ? Math.abs(c) : 1);
    // For normal loads qx remains the local axial component; qz is local normal.
    qx += factor * (l.normal ? l.qx : c * l.qx + s * l.qz);
    qv += factor * (l.normal ? l.qz : -s * l.qx + c * l.qz);
  }
  finite(qx, 'Combined axial load'); finite(qv, 'Combined transverse load');
  const f = [qx*L/2,qv*L/2,qv*L*L/12,qx*L/2,qv*L/2,-qv*L*L/12];
  const releases = [...(member.hingeStart ? [2] : []), ...(member.hingeEnd ? [5] : [])];
  const condensedK = K.map((r) => [...r]), condensedF = [...f];
  if (releases.length) {
    const rr = releases.map((i) => releases.map((j) => K[i][j]));
    const rf = solve(rr, releases.map((i) => f[i]));
    const columns = K.map((_, j) => solve(rr, releases.map((i) => K[i][j])));
    for (let i = 0; i < 6; i++) {
      condensedF[i] -= releases.reduce((v, r, k) => v + K[i][r] * rf[k], 0);
      for (let j = 0; j < 6; j++) condensedK[i][j] -= releases.reduce((v, r, k) => v + K[i][r] * columns[j][k], 0);
    }
    for (const r of releases) {
      condensedF[r] = 0;
      for (let j = 0; j < 6; j++) condensedK[r][j] = condensedK[j][r] = 0;
    }
  }
  return { id: member.id, length:L, EA, EI, qx, qv, dofs:[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2], T,K,f,condensedK,condensedF,releases };
}

/** Solve specified load-case factors. Unspecified cases are zero. At least 21 stations. */
export function solveFrame(sys: StaticSystem, factors: Record<string, number>, stationCount = 41): FrameResult {
  validateSystem(sys);
  for (const [id, value] of Object.entries(factors)) {
    if (!sys.cases.some((c) => c.id === id)) throw new StaticsError('invalidInput', `Unknown load case ${id}`);
    finite(value, `Factor ${id}`);
  }
  if (!Number.isInteger(stationCount) || stationCount < 21 || stationCount > 10001) throw new StaticsError('invalidInput', 'Station count must be 21..10001');
  const n = sys.nodes.length * 3, K = zeros(n), f = Array<number>(n).fill(0);
  const elements = sys.members.map((_, i) => element(sys, i, factors));
  for (const e of elements) {
    for (let i = 0; i < 6; i++) {
      f[e.dofs[i]] += e.T.reduce((v, row, j) => v + row[i] * e.condensedF[j], 0);
      for (let j = 0; j < 6; j++) {
        let value = 0;
        for (let p = 0; p < 6; p++) for (let q = 0; q < 6; q++) value += e.T[p][i] * e.condensedK[p][q] * e.T[q][j];
        K[e.dofs[i]][e.dofs[j]] += value;
      }
    }
  }
  for (const l of sys.nodeLoads) {
    const i = sys.nodes.findIndex((n) => n.id === l.node) * 3, factor = factors[l.case] ?? 0;
    f[i] += factor*l.fx; f[i+1] += factor*l.fz; f[i+2] += factor*(l.my ?? 0);
  }
  const fixed = new Set<number>();
  for (const s of sys.supports) {
    const i = sys.nodes.findIndex((n) => n.id === s.node) * 3;
    if (s.ux) fixed.add(i); if (s.uz) fixed.add(i+1); if (s.ry) fixed.add(i+2);
  }
  const free: number[] = [];
  for (let i = 0; i < n; i++) if (!fixed.has(i)) {
    if (i % 3 === 2 && K[i].every((v) => Math.abs(v) < 1e-14)) {
      if (Math.abs(f[i]) > 1e-12) throw new StaticsError('singularSystem', 'Moment applied to a released nodal rotation');
      continue;
    }
    free.push(i);
  }
  const values = solve(free.map((i) => free.map((j) => K[i][j])), free.map((i) => f[i]));
  values.forEach((value) => finite(value, 'Solved displacement'));
  const u = Array<number>(n).fill(0);
  free.forEach((i, k) => { u[i] = values[k]; });
  const residual = mul(K, u).map((v, i) => v - f[i]);
  const members = elements.map((e): MemberResult => {
    const local = mul(e.T, e.dofs.map((i) => u[i]));
    if (e.releases.length) {
      const rr = e.releases.map((i) => e.releases.map((j) => e.K[i][j]));
      const rhs = e.releases.map((i) => e.f[i] - e.K[i].reduce((v, k, j) => v + (e.releases.includes(j) ? 0 : k * local[j]), 0));
      solve(rr, rhs).forEach((v, k) => { local[e.releases[k]] = v; });
    }
    const endForces = mul(e.K, local).map((v, i) => v - e.f[i]);
    const L = e.length;
    const points = Array.from({ length: stationCount }, (_, i) => L*i/(stationCount-1));
    const critical = e.qv ? -endForces[1]/e.qv : -1;
    if (critical > 0 && critical < L) points.push(critical);
    const stations = [...new Set(points)].sort((a,b) => a-b).map((x): Station => {
      const t = x/L;
      const v = (1-3*t*t+2*t*t*t)*local[1] + L*(t-2*t*t+t*t*t)*local[2]
        + (3*t*t-2*t*t*t)*local[4] + L*(-t*t+t*t*t)*local[5] + e.qv*x*x*(L-x)**2/(24*e.EI);
      return { x, N:-endForces[0]-e.qx*x, V:endForces[1]+e.qv*x, M:-endForces[2]+endForces[1]*x+e.qv*x*x/2,
        u:(1-t)*local[0]+t*local[3]+e.qx*x*(L-x)/(2*e.EA), v };
    });
    return { id:e.id, length:L, EA:e.EA, EI:e.EI, qx:e.qx, qv:e.qv, displacements:local, endForces, stations };
  });
  return {
    nodes:sys.nodes.map((node,i) => ({ id:node.id, ux:u[3*i], uz:u[3*i+1], ry:u[3*i+2] })),
    members,
    reactions:sys.nodes.flatMap((node,i) => [0,1,2].some((j) => fixed.has(3*i+j)) ? [{ node:node.id,
      fx:fixed.has(3*i)?residual[3*i]:0, fz:fixed.has(3*i+1)?residual[3*i+1]:0, my:fixed.has(3*i+2)?residual[3*i+2]:0 }] : []),
  };
}
