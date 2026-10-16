import { findMaterial } from './catalog';
import type { EvalElement, Evaluated } from './evaluate';
import type { Msg } from './model';
import type { Production } from './production';

export type Severity = 'error' | 'warning' | 'info';

export type Fix =
  | { kind: 'addJoint'; type: 'house' | 'lap'; a: string; b: string }
  | { kind: 'setDrillDepth'; elementId: string; procId: string; depth: number }
  | { kind: 'select'; ids: string[] };

export interface Issue {
  id: string;
  severity: Severity;
  msg: Msg;
  elementIds: string[];
  fix?: Fix;
}

const TOL = 0.05;

function inside(e: EvalElement, p: [number, number, number], tol = TOL): boolean {
  return p[0] >= -tol && p[0] <= e.length + tol && p[1] >= -tol && p[1] <= e.width + tol && p[2] >= -tol && p[2] <= e.height + tol;
}

/** Remaining material from p along dir until leaving the base box. */
function travel(e: EvalElement, p: [number, number, number], d: [number, number, number]): number {
  let tMax = Infinity;
  const lim = [e.length, e.width, e.height];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) continue;
    const tt = d[i] > 0 ? (lim[i] - p[i]) / d[i] : (0 - p[i]) / d[i];
    tMax = Math.min(tMax, tt);
  }
  return tMax;
}

/** Checks that need no solid geometry. */
export function staticChecks(ev: Evaluated, prod?: Production): Issue[] {
  const out: Issue[] = [];
  for (const e of ev.elements) {
    if (!(e.length > 0.5 && e.width > 0.5 && e.height > 0.5)) {
      out.push({ id: `dim:${e.id}`, severity: 'error', msg: { key: 'check.badDims', args: { name: e.name } }, elementIds: [e.id] });
      continue;
    }
    for (const p of e.all) {
      if (p.geom !== 'drill' || p.through) continue;
      // Entry must lie on the part, the hole must not break out of the other side.
      if (!inside(e, p.p, 1)) {
        out.push({ id: `drillout:${e.id}:${p.id}`, severity: 'error', msg: { key: 'check.drillOutside', args: { name: e.name, dia: p.dia } }, elementIds: [e.id] });
        continue;
      }
      const room = travel(e, p.p, p.dir);
      if (p.depth > room - 2) {
        const fixable = !e.generator && e.processings.some((x) => x.id === p.id);
        out.push({
          id: `drillthrough:${e.id}:${p.id}`, severity: p.depth > room ? 'error' : 'warning',
          msg: { key: p.depth > room ? 'check.drillBreaksOut' : 'check.drillThinWall', args: { name: e.name, dia: p.dia, depth: Math.round(p.depth), room: Math.round(room) } },
          elementIds: [e.id], fix: fixable ? { kind: 'setDrillDepth', elementId: e.id, procId: p.id, depth: Math.max(1, Math.floor(room - 3)) } : undefined,
        });
      }
    }
  }
  if (prod) {
    for (const s of prod.sheets) {
      for (const pc of s.result.oversize) {
        const ids = ev.elements.filter((e) => String(e.pos) === pc.label).map((e) => e.id);
        let mname = s.materialId;
        try { mname = findMaterial(ev.catalog, s.materialId).name.de; } catch { /* keep id */ }
        out.push({ id: `oversize:${pc.id}`, severity: 'error', msg: { key: 'check.oversizeSheet', args: { pos: pc.label, l: Math.round(pc.l), w: Math.round(pc.w), material: mname } }, elementIds: ids, fix: { kind: 'select', ids } });
      }
    }
    for (const l of prod.linear) {
      for (const pc of l.result.oversize) {
        const ids = ev.elements.filter((e) => String(e.pos) === pc.label).map((e) => e.id);
        out.push({ id: `overlength:${pc.id}`, severity: 'warning', msg: { key: 'check.overLength', args: { pos: pc.label, l: Math.round(pc.length) } }, elementIds: ids, fix: { kind: 'select', ids } });
      }
    }
  }
  // de-duplicate by id
  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Overlap issues from pairwise intersection volumes (computed by the geometry kernel). */
export function overlapIssues(ev: Evaluated, pairs: { a: string; b: string; volume: number }[]): Issue[] {
  const byId = new Map(ev.elements.map((e) => [e.id, e]));
  return pairs
    .filter((p) => p.volume > 500)
    .map((p) => {
      const a = byId.get(p.a)!, b = byId.get(p.b)!;
      // Suggest a housing on the smaller part (it gets notched around the bigger one).
      const va = a.length * a.width * a.height, vb = b.length * b.width * b.height;
      const [small, big] = va <= vb ? [a, b] : [b, a];
      const editable = !small.generator && !big.generator;
      // Two beams crossing each other (neither ends inside the other) → lap joint.
      const crossing = a.kind === 'beam' && b.kind === 'beam' && Math.abs(a.frame.x[0] * b.frame.x[0] + a.frame.x[1] * b.frame.x[1] + a.frame.x[2] * b.frame.x[2]) < 0.99 && p.volume > 0.15 * Math.min(a.width * a.height * b.width, a.width * a.height * b.height);
      return {
        id: `overlap:${p.a}:${p.b}`, severity: 'warning' as Severity,
        msg: { key: 'check.overlap', args: { a: a.name, b: b.name, cm3: Math.round(p.volume / 1000) } },
        elementIds: [a.id, b.id],
        fix: editable ? { kind: 'addJoint' as const, type: crossing ? ('lap' as const) : ('house' as const), a: small.id, b: big.id } : { kind: 'select' as const, ids: [a.id, b.id] },
      };
    });
}
