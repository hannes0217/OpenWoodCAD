import { findMaterial } from '../catalog';
import { createBeam, createBoxElement } from '../elements';
import { DEG, dirToLocal, norm, toLocal, type Vec3 } from '../math';
import type { Element, Joint, JointType, ParamValue } from '../model';
import type { StaticSystem } from '../statics/model';
import { bool, emptyOutput, num, str, type GenParams, type GeneratorDef, type GeneratorOutput } from './types';

// =====================================================================
// Roof generators: gable roof (purlin roof or collar roof), mono-pitch roof.
// Building footprint x ∈ [0, L] (eaves direction), y ∈ [0, B] (span), z up.
// The wall plates sit on top of the walls at height `plateZ`.
// =====================================================================

interface Ctx {
  out: GeneratorOutput;
  id: (s: string) => string;
  gen: string;
}

export function mk(out: GeneratorOutput, genId: string): Ctx {
  return { out, id: (s) => `${genId}/${s}`, gen: genId };
}

export function joint(c: Ctx, type: JointType, a: Element, b: Element, params: Record<string, ParamValue> = {}): Joint {
  const j: Joint = { id: c.id(`j-${a.id.split('/').pop()}-${b.id.split('/').pop()}`), type, a: a.id, b: b.id, params, generator: c.gen };
  c.out.joints.push(j);
  return j;
}

export function add(c: Ctx, e: Element): Element {
  c.out.elements.push(e);
  return e;
}

/** Plumb (vertical) cut at horizontal position y = yCut, removing the side beyond (sign −1: y < yCut). */
export function plumbCut(e: Element, yCut: number, sign: 1 | -1, procId: string) {
  const pw: Vec3 = [0, yCut, 0];
  const nw: Vec3 = [0, sign, 0];
  e.processings.push({ id: procId, type: 'jackRafterCut', geom: 'cut', plane: { p: toLocal(e.frame, pw), n: norm(dirToLocal(e.frame, nw)) }, info: { angle: 0 } });
}

const common = (p: GenParams) => ({
  L: num(p, 'length'), B: num(p, 'width'), alpha: num(p, 'pitch') * DEG,
  eo: num(p, 'eaves'), go: num(p, 'gable'), plateZ: num(p, 'plateHeight'),
  rb: num(p, 'rafterWidth'), rh: num(p, 'rafterHeight'), sp: num(p, 'spacing'), tk: num(p, 'birdsmouth'),
  pa: num(p, 'plateSize'),
});

const sharedParams = (defaults: { width: number; pitch: number; spacing: number }) => [
  { id: 'length', group: 'dimensions', type: 'number' as const, default: 8000, min: 1500, max: 40000, step: 10, unit: 'mm' },
  { id: 'width', group: 'dimensions', type: 'number' as const, default: defaults.width, min: 1500, max: 20000, step: 10, unit: 'mm' },
  { id: 'pitch', group: 'roof', type: 'number' as const, default: defaults.pitch, min: 2, max: 70, step: 0.5, unit: '°' },
  { id: 'eaves', group: 'roof', type: 'number' as const, default: 500, min: 0, max: 1500, step: 10, unit: 'mm' },
  { id: 'gable', group: 'roof', type: 'number' as const, default: 400, min: 0, max: 1500, step: 10, unit: 'mm' },
  { id: 'plateHeight', group: 'roof', type: 'number' as const, default: 2700, min: 0, max: 15000, step: 10, unit: 'mm' },
  { id: 'rafterWidth', group: 'members', type: 'number' as const, default: 80, min: 50, max: 200, step: 5, unit: 'mm' },
  { id: 'rafterHeight', group: 'members', type: 'number' as const, default: 200, min: 80, max: 400, step: 5, unit: 'mm' },
  { id: 'spacing', group: 'members', type: 'number' as const, default: defaults.spacing, min: 400, max: 1200, step: 5, unit: 'mm' },
  { id: 'birdsmouth', group: 'members', type: 'number' as const, default: 40, min: 10, max: 120, step: 5, unit: 'mm' },
  { id: 'plateSize', group: 'members', type: 'number' as const, default: 140, min: 80, max: 300, step: 5, unit: 'mm' },
  { id: 'battens', group: 'roof', type: 'boolean' as const, default: false },
  { id: 'battenSpacing', group: 'roof', type: 'number' as const, default: 330, min: 150, max: 450, step: 5, unit: 'mm', visible: (p: GenParams) => Boolean(p.battens) },
  { id: 'timber', group: 'materials', type: 'material' as const, default: 'kvh_c24', category: 'timber' as const },
  { id: 'purlinTimber', group: 'materials', type: 'material' as const, default: 'bsh_gl24h', category: 'timber' as const },
];

/** x positions (centres) of rafters, evenly distributed over the roof length incl. gable overhangs. */
export function rafterXs(L: number, go: number, b: number, sp: number): number[] {
  const x0 = -go + b / 2, x1 = L + go - b / 2;
  const n = Math.max(2, Math.ceil((x1 - x0) / sp - 1e-9) + 1);
  return Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
}

export function battens(c: Ctx, p: GenParams, rafters: Element[], side: 'l' | 'r', yEave: number, yRidge: number, zAt: (y: number) => number, alpha: number, L: number, go: number, material: string) {
  if (!bool(p, 'battens')) return;
  const bs = num(p, 'battenSpacing');
  const slope = Math.abs(yRidge - yEave) / Math.cos(alpha);
  const n = Math.floor((slope - 60) / bs);
  const dir = Math.sign(yRidge - yEave);
  // Battens are spliced on rafter centre lines; pieces never exceed the longest stock length.
  const maxLen = 4900;
  const centres = rafters.map((r) => r.frame.o[0] + r.width / 2).sort((a, b) => a - b);
  /** Greedy splice positions; `first` limits the first piece (shorter in alternate rows → staggered joints). */
  const splice = (first: number): number[] => {
    const out = [-go];
    let start = -go;
    let limit = first;
    for (let i = 0; i < centres.length - 1; i++) {
      if (centres[i + 1] - start > limit) { out.push(centres[i]); start = centres[i]; limit = maxLen; }
    }
    out.push(L + go);
    return out;
  };
  const even = splice(maxLen);
  const odd = even.length > 2 ? splice(maxLen / 2) : even;
  for (let k = 0; k <= n; k++) {
    const s = 40 + k * bs; // along the slope from the eaves
    const y = yEave + dir * s * Math.cos(alpha);
    const z = zAt(y);
    const pts = k % 2 ? odd : even;
    for (let j = 0; j < pts.length - 1; j++) {
      if (pts[j + 1] - pts[j] < 50) continue;
      add(c, createBeam([pts[j], y, z], [pts[j + 1], y, z], 50, 30, { id: c.id(`batten-${side}-${k + 1}-${j + 1}`), name: 'Dachlatte', role: 'batten', materialId: material, align: 'bottom', up: [0, -dir * Math.sin(alpha), Math.cos(alpha)], generator: c.gen }));
    }
  }
  c.out.hardware.push({ itemId: 'nail_28x65', qty: (n + 1) * rafters.length * 2, source: c.gen });
}

/** Simple rafter statics system (2D, along the rafter) for the statics workspace. */
export function rafterSystem(id: string, name: string, supports: { y: number }[], yEave: number, yEnd: number, alpha: number, rb: number, rh: number, cls: string, spacing: number, roofLoad: number): StaticSystem {
  // Coordinates in the system plane: x = horizontal distance, z = height (inclined member).
  // A ridge support may coincide with the rafter endpoint. One physical point
  // must be one FEM node; duplicates would create a zero-length member.
  const ys = [...new Set([yEave, ...supports.map((s) => s.y), yEnd])].sort((a, b) => a - b);
  const nodes = ys.map((y, i) => ({ id: `n${i}`, x: y - ys[0], z: (y - ys[0]) * Math.tan(alpha) }));
  const members = nodes.slice(0, -1).map((n, i) => ({ id: `m${i}`, name: `${name} ${i + 1}`, n1: n.id, n2: nodes[i + 1].id, b: rb, h: rh, strengthClass: cls, limitInst: 300, limitFin: 200 }));
  const supNodes = supports.map((s) => nodes[ys.indexOf(s.y)].id);
  return {
    id, name, nodes, members, serviceClass: 2, loadWidth: spacing, pitch: Math.round((alpha / DEG) * 10) / 10, cpe: 0.6,
    supports: supNodes.map((n, i) => ({ node: n, ux: i === 0, uz: true, ry: false })),
    cases: [{ id: 'g', name: 'Eigengewicht + Eindeckung', category: 'G' }, { id: 's', name: 'Schnee', category: 'S' }, { id: 'w', name: 'Wind (Druck)', category: 'W' }],
    memberLoads: members.flatMap((m) => [
      // Timber unit weight 4.2 kN/m³ = 4.2e-6 N/mm³; b*h converts to N/mm.
      { member: m.id, case: 'g', qx: 0, qz: -(roofLoad * spacing) / 1e6 - rb * rh * 4.2e-6 },
      { member: m.id, case: 's', qx: 0, qz: -1, projected: true, site: 'snow' as const },
      { member: m.id, case: 'w', qx: 0, qz: -1, normal: true, site: 'wind' as const },
    ]),
    nodeLoads: [],
    notes: [`Eindeckung ${roofLoad} N/m², Sparrenabstand ${spacing} mm`],
  };
}

// ------------------------------------------------------------ gable roof

export const satteldach: GeneratorDef = {
  type: 'satteldach',
  category: 'carpentry',
  params: [
    ...sharedParams({ width: 8000, pitch: 38, spacing: 800 }),
    { id: 'system', group: 'roof', type: 'select', default: 'purlin', options: ['purlin', 'collar'] },
    { id: 'ridgeWidth', group: 'members', type: 'number', default: 160, min: 80, max: 300, step: 5, unit: 'mm', visible: (p) => p.system === 'purlin' },
    { id: 'ridgeHeight', group: 'members', type: 'number', default: 240, min: 100, max: 600, step: 5, unit: 'mm', visible: (p) => p.system === 'purlin' },
    { id: 'postSpacing', group: 'members', type: 'number', default: 3500, min: 1500, max: 8000, step: 50, unit: 'mm', visible: (p) => p.system === 'purlin' },
    { id: 'postSize', group: 'members', type: 'number', default: 140, min: 100, max: 240, step: 5, unit: 'mm', visible: (p) => p.system === 'purlin' },
    { id: 'kneeBraces', group: 'members', type: 'boolean', default: true, visible: (p) => p.system === 'purlin' },
    { id: 'collarHeight', group: 'members', type: 'number', default: 2200, min: 1500, max: 6000, step: 10, unit: 'mm', visible: (p) => p.system === 'collar' },
    { id: 'roofLoad', group: 'statics', type: 'number', default: 550, min: 100, max: 2000, step: 10, unit: 'N/m²' },
  ],

  build(p, gctx) {
    const out = emptyOutput();
    const c = mk(out, gctx.id);
    const g = common(p);
    const { L, B, alpha, eo, go, plateZ, rb, rh, sp, tk, pa } = g;
    const timber = findMaterial(gctx.catalog, str(p, 'timber'));
    const purlinM = findMaterial(gctx.catalog, str(p, 'purlinTimber'));
    const tanA = Math.tan(alpha);
    const purlin = str(p, 'system') === 'purlin';
    if (B < 4 * pa || alpha <= 0) { out.warnings.push({ key: 'warn.dimensionsTooSmall' }); return out; }

    // wall plates (Fußpfetten), extended under the gable overhang
    const zt = plateZ + pa;
    const plateL = add(c, createBoxElement([-go, 0, plateZ], [L + 2 * go, pa, pa], { id: c.id('plate-l'), name: 'Fußpfette links', role: 'wallPlate', kind: 'beam', materialId: purlinM.id, grain: 'x', generator: c.gen }));
    const plateR = add(c, createBoxElement([-go, B - pa, plateZ], [L + 2 * go, pa, pa], { id: c.id('plate-r'), name: 'Fußpfette rechts', role: 'wallPlate', kind: 'beam', materialId: purlinM.id, grain: 'x', generator: c.gen }));

    // rafter underside: plumb depth tk at the outer plate edge
    const zuL = (y: number) => zt - tk + y * tanA;
    const zuR = (y: number) => zt - tk + (B - y) * tanA;
    const ridgeZ = zuL(B / 2) + rh / Math.cos(alpha);
    // ridge purlin
    let ridge: Element | null = null;
    const rw = num(p, 'ridgeWidth'), rhh = num(p, 'ridgeHeight');
    if (purlin) {
      const top = zuL(B / 2); // touches the rafter underside at the apex
      ridge = add(c, createBoxElement([-go, B / 2 - rw / 2, top - rhh], [L + 2 * go, rw, rhh], { id: c.id('ridge'), name: 'Firstpfette', role: 'ridgePurlin', kind: 'beam', materialId: purlinM.id, grain: 'x', generator: c.gen }));
    }

    const xs = rafterXs(L, go, rb, sp);
    const extEave = rh * Math.sin(alpha) + 20; // extra length for the plumb eaves cut
    const leftRafters: Element[] = [];
    const rightRafters: Element[] = [];
    xs.forEach((x, i) => {
      const nr = i + 1;
      const yA = -eo - extEave, yB = B / 2 + rh;
      const l = add(c, createBeam([x, yA, zuL(yA)], [x, yB, zuL(yB)], rb, rh, { id: c.id(`rafter-l-${nr}`), name: 'Sparren links', role: 'rafter', materialId: timber.id, align: 'bottom', generator: c.gen }));
      const yA2 = B + eo + extEave, yB2 = B / 2 - rh;
      const r = add(c, createBeam([x, yA2, zuR(yA2)], [x, yB2, zuR(yB2)], rb, rh, { id: c.id(`rafter-r-${nr}`), name: 'Sparren rechts', role: 'rafter', materialId: timber.id, align: 'bottom', generator: c.gen }));
      plumbCut(l, -eo, -1, `${l.id}:eave`);
      plumbCut(r, B + eo, 1, `${r.id}:eave`);
      joint(c, 'birdsMouth', l, plateL);
      joint(c, 'birdsMouth', r, plateR);
      if (ridge) { joint(c, 'birdsMouth', l, ridge); joint(c, 'birdsMouth', r, ridge); }
      joint(c, 'miter', l, r);
      leftRafters.push(l);
      rightRafters.push(r);
      out.hardware.push({ itemId: 'rafter_tie', qty: 2, source: c.gen });
    });
    out.hardware.push({ itemId: 'screw_8x200', qty: xs.length * (purlin ? 2 : 1), source: c.gen });

    if (purlin && ridge) {
      // posts under the ridge purlin, standing on the ceiling level (plateZ)
      const ps = num(p, 'postSize');
      const nPosts = Math.max(2, Math.ceil(L / num(p, 'postSpacing')) + 1);
      const postTop = ridge.frame.o[2];
      for (let k = 0; k < nPosts; k++) {
        const xc = ps / 2 + ((L - ps) * k) / (nPosts - 1);
        const post = add(c, createBoxElement([xc - ps / 2, B / 2 - ps / 2, plateZ], [ps, ps, postTop - plateZ + 60], { id: c.id(`post-${k + 1}`), name: 'Firststiel', role: 'post', kind: 'beam', materialId: timber.id, grain: 'z', generator: c.gen }));
        joint(c, 'tenon', post, ridge, { length: 50, thickness: 40, shoulder: 20, peg: true, pegDia: 20 });
        out.hardware.push({ itemId: 'post_base', qty: 1, source: c.gen });
        // knee braces along the purlin (45°), pegged mortise and tenon
        if (bool(p, 'kneeBraces')) {
          const kb = Math.min(800, (postTop - plateZ) * 0.35);
          for (const dir of [-1, 1]) {
            if ((k === 0 && dir < 0) || (k === nPosts - 1 && dir > 0)) continue;
            const x1 = xc + dir * (ps / 2), z1 = postTop - kb;
            const x2 = xc + dir * (ps / 2 + kb), z2 = postTop;
            const ext = 120;
            const d = norm([x2 - x1, 0, z2 - z1]);
            const brace = add(c, createBeam([x1 - d[0] * ext, B / 2, z1 - d[2] * ext], [x2 + d[0] * ext, B / 2, z2 + d[2] * ext], 100, 100, { id: c.id(`brace-${k + 1}-${dir > 0 ? 'r' : 'l'}`), name: 'Kopfband', role: 'kneeBrace', materialId: timber.id, align: 'center', up: [0, 1, 0], generator: c.gen }));
            joint(c, 'tenon', brace, post, { length: 40, thickness: 30, shoulder: 15, peg: true, pegDia: 16 });
            joint(c, 'tenon', brace, ridge, { length: 40, thickness: 30, shoulder: 15, peg: true, pegDia: 16 });
          }
        }
      }
      out.notes.push({ key: 'note.roof.posts', args: { n: nPosts } });
    }

    if (!purlin) {
      // collar ties (Kehlbalken) lapped onto each rafter pair
      const zc = Math.min(num(p, 'collarHeight') + plateZ, ridgeZ - rh * 2);
      const yl = (zc - (zt - tk)) / tanA; // rafter underside at collar height (left)
      xs.forEach((x, i) => {
        const yA = yl - 20, yB = B - yl + 20;
        const collar = add(c, createBeam([x, yA - rh, zc], [x, yB + rh, zc], rb, Math.round(rh * 0.8), { id: c.id(`collar-${i + 1}`), name: 'Kehlbalken', role: 'collarTie', materialId: timber.id, align: 'bottom', generator: c.gen }));
        joint(c, 'lap', collar, leftRafters[i], { ratio: 0.5, aOnTop: true });
        joint(c, 'lap', collar, rightRafters[i], { ratio: 0.5, aOnTop: true });
        // trim the collar ends flush with the rafter tops
        joint(c, 'trim', collar, leftRafters[i], { face: 'far' });
        joint(c, 'trim', collar, rightRafters[i], { face: 'far' });
      });
      out.hardware.push({ itemId: 'screw_8x200', qty: xs.length * 2, source: c.gen });
    }

    // battens on top of the rafters
    const topL = (y: number) => zuL(y) + rh / Math.cos(alpha);
    const topR = (y: number) => zuR(y) + rh / Math.cos(alpha);
    battens(c, p, leftRafters, 'l', -eo, B / 2, topL, alpha, L, go, 'lath_s10');
    battens(c, p, rightRafters, 'r', B + eo, B / 2, topR, alpha, L, go, 'lath_s10');

    // statics: rafter as beam over wall plate (and ridge purlin) with eaves cantilever
    const roofLoad = num(p, 'roofLoad');
    const cls = timber.strengthClass ?? 'C24';
    out.statics.push(purlin
      ? rafterSystem(c.id('st-rafter'), 'Sparren', [{ y: pa / 2 }, { y: B / 2 }], -eo, B / 2, alpha, rb, rh, cls, sp, roofLoad)
      : rafterSystem(c.id('st-rafter'), 'Sparren (vereinfacht)', [{ y: pa / 2 }, { y: B / 2 }], -eo, B / 2, alpha, rb, rh, cls, sp, roofLoad));
    out.notes.push({ key: purlin ? 'note.roof.purlin' : 'note.roof.collar' });
    return out;
  },
};

// ------------------------------------------------------------ mono-pitch roof

export const pultdach: GeneratorDef = {
  type: 'pultdach',
  category: 'carpentry',
  params: [
    ...sharedParams({ width: 5000, pitch: 10, spacing: 700 }),
    { id: 'roofLoad', group: 'statics', type: 'number', default: 550, min: 100, max: 2000, step: 10, unit: 'N/m²' },
  ],

  build(p, gctx) {
    const out = emptyOutput();
    const c = mk(out, gctx.id);
    const { L, B, alpha, eo, go, plateZ, rb, rh, sp, tk, pa } = common(p);
    const timber = findMaterial(gctx.catalog, str(p, 'timber'));
    const purlinM = findMaterial(gctx.catalog, str(p, 'purlinTimber'));
    const tanA = Math.tan(alpha);
    if (B < 3 * pa) { out.warnings.push({ key: 'warn.dimensionsTooSmall' }); return out; }
    const zt = plateZ + pa;
    const zu = (y: number) => zt - tk + y * tanA;
    // high side plate: its outer edge (y = B) gets the same plumb depth tk
    const zHighTop = zu(B - pa) + tk;
    const low = add(c, createBoxElement([-go, 0, plateZ], [L + 2 * go, pa, pa], { id: c.id('plate-low'), name: 'Fußpfette', role: 'wallPlate', kind: 'beam', materialId: purlinM.id, grain: 'x', generator: c.gen }));
    const high = add(c, createBoxElement([-go, B - pa, zHighTop - pa], [L + 2 * go, pa, pa], { id: c.id('plate-high'), name: 'Firstpfette (hoch)', role: 'purlin', kind: 'beam', materialId: purlinM.id, grain: 'x', generator: c.gen }));
    const xs = rafterXs(L, go, rb, sp);
    const ext = rh * Math.sin(alpha) + 20;
    const rafters: Element[] = [];
    xs.forEach((x, i) => {
      const yA = -eo - ext, yB = B + eo + ext;
      const r = add(c, createBeam([x, yA, zu(yA)], [x, yB, zu(yB)], rb, rh, { id: c.id(`rafter-${i + 1}`), name: 'Sparren', role: 'rafter', materialId: timber.id, align: 'bottom', generator: c.gen }));
      plumbCut(r, -eo, -1, `${r.id}:eave`);
      plumbCut(r, B + eo, 1, `${r.id}:top`);
      joint(c, 'birdsMouth', r, low);
      joint(c, 'birdsMouth', r, high);
      rafters.push(r);
    });
    out.hardware.push({ itemId: 'rafter_tie', qty: xs.length * 2, source: c.gen });
    battens(c, p, rafters, 'l', -eo, B + eo, (y) => zu(y) + rh / Math.cos(alpha), alpha, L, go, 'lath_s10');
    out.statics.push(rafterSystem(c.id('st-rafter'), 'Sparren', [{ y: pa / 2 }, { y: B - pa / 2 }], -eo, B + eo, alpha, rb, rh, timber.strengthClass ?? 'C24', sp, num(p, 'roofLoad')));
    out.notes.push({ key: 'note.roof.mono', args: { h: Math.round(zHighTop - zt) } });
    return out;
  },
};
