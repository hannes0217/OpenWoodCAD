import { catalogFor, type Catalog } from './catalog';
import { groupFrame, groupPath, transformMotion } from './assemblies';
import { GENERATORS } from './generators';
import { withDefaults, type GeneratorOutput } from './generators/types';
import { applyJoint } from './joints';
import { composeFrame, round, type Frame } from './math';
import type { Element, HardwareUse, Joint, Msg, OwcDocument, Processing } from './model';
import type { StaticSystem } from './statics/model';

export interface EvalElement extends Element {
  assemblyPath?: string[];
  /** Explicit + joint-derived processings in local coordinates. */
  all: Processing[];
  /** Position number (identical parts share it). */
  pos: number;
}

export interface Evaluated {
  elements: EvalElement[];
  joints: Joint[];
  hardware: HardwareUse[];
  warnings: Msg[];
  notes: Msg[];
  mounting: GeneratorOutput['mounting'];
  statics: StaticSystem[];
  catalog: Catalog;
}

function transformElement(e: Element, f: Frame): Element {
  return { ...e, frame: composeFrame(f, e.frame), motion:transformMotion(e.motion,f) };
}

/** Run generators and joints. Pure function of the document. */
export function evaluate(doc: OwcDocument): Evaluated {
  const catalog = catalogFor(doc);
  const elements: (Element & {assemblyPath?:string[]})[] = doc.elements.map(e=>({...transformElement(e,groupFrame(doc,e.groupId)),assemblyPath:groupPath(doc,e.groupId),hidden:e.hidden||groupPath(doc,e.groupId).some(id=>doc.groups.find(g=>g.id===id)?.hidden),processings:[...e.processings]}));
  const joints: Joint[] = [...doc.joints];
  const hardware: HardwareUse[] = [...doc.hardware];
  const warnings: Msg[] = [];
  const notes: Msg[] = [];
  const mounting: GeneratorOutput['mounting'] = [];
  const statics: StaticSystem[] = [...doc.statics];

  for (const g of doc.generators) {
    const def = GENERATORS[g.type];
    if (!def) {
      warnings.push({ key: 'warn.unknownGenerator', args: { type: g.type } });
      continue;
    }
    let outp: GeneratorOutput;
    try {
      outp = def.build(withDefaults(def, g.params), { catalog, id: g.id });
    } catch (err) {
      warnings.push({ key: 'warn.generatorFailed', args: { name: g.name, error: String((err as Error).message ?? err) } });
      continue;
    }
    const assemblyPath=groupPath(doc,g.groupId),frame=composeFrame(groupFrame(doc,g.groupId),g.frame);
    for (const e of outp.elements) elements.push({ ...transformElement(e, frame), assemblyPath, hidden: e.hidden || g.hidden || assemblyPath.some(id=>doc.groups.find(g=>g.id===id)?.hidden), generator: g.id });
    // Explicit entries with the same stable ID override generator defaults.
    joints.push(...outp.joints.filter(j => !doc.joints.some(override => override.id === j.id)));
    hardware.push(...outp.hardware);
    warnings.push(...outp.warnings);
    notes.push(...outp.notes);
    mounting.push(...outp.mounting);
    statics.push(...outp.statics.map((s) => ({ ...s, generator: g.id })));
  }

  const byId = new Map(elements.map((e) => [e.id, e]));
  const derived = new Map<string, Processing[]>();
  for (const j of joints) {
    if (j.suppressed) continue;
    const a = byId.get(j.a);
    const b = byId.get(j.b);
    if (!a || !b) {
      warnings.push({ key: 'warn.jointMissing', args: { id: j.id } });
      continue;
    }
    const res = applyJoint(j, a, b);
    for (const { elementId, processing } of res.processings) {
      if (!derived.has(elementId)) derived.set(elementId, []);
      derived.get(elementId)!.push(processing);
    }
    hardware.push(...res.hardware);
    warnings.push(...res.warnings);
  }

  const evals: EvalElement[] = elements.map((e) => ({ ...e, all: [...e.processings.filter(p=>!p.suppressed), ...(derived.get(e.id) ?? [])], pos: 0 }));
  assignPositions(evals);
  return { elements: evals, joints, hardware, warnings, notes, mounting, statics, catalog };
}

// ------------------------------------------------------------ positions

const f2 = (v: number) => round(v, 0.1).toFixed(1);
const f3 = (v: number) => round(v, 0.001).toFixed(3);

function procSignature(p: Processing): string {
  const pl = (x: { p: number[]; n: number[] }) => `${x.p.map(f2).join(',')}|${x.n.map(f3).join(',')}`;
  switch (p.geom) {
    case 'cut': return `c:${pl(p.plane)}`;
    case 'polytope': return `P:${p.planes.map(pl).sort().join(';')}`;
    case 'drill': return `d:${p.p.map(f2).join(',')}|${p.dir.map(f3).join(',')}|${f2(p.dia)}|${f2(p.depth)}|${p.through}`;
    case 'cutExcept': return `x:${pl(p.plane)}/${p.keep.map(pl).sort().join(';')}`;
  }
}

/** Identity of a part for position numbering (geometry + material, ignoring placement). */
export function partSignature(e: EvalElement): string {
  const edges = Object.entries(e.edges ?? {}).filter(([, v]) => v).map(([k]) => k).sort().join('');
  return [e.kind, e.materialId, f2(e.length), f2(e.width), f2(e.height), edges, (e.outline ?? []).map((p) => p.map(f2).join(',')).join(';'), e.all.map(procSignature).sort().join('#')].join('~');
}

const ROLE_ORDER = [
  'sill', 'post', 'column', 'beam', 'girder', 'purlin', 'ridgePurlin', 'wallPlate', 'rafter', 'hipRafter', 'valleyRafter', 'jackRafter',
  'collarTie', 'tieBeam', 'strut', 'brace', 'kneeBrace', 'joist', 'trimmer', 'stud', 'plate', 'header', 'nogging', 'batten', 'board',
  'top', 'side', 'bottom', 'shelf', 'divider', 'plinth', 'back', 'door', 'front', 'drawerSide', 'drawerFront', 'drawerBack', 'drawerBottom', 'leg', 'apron',
];

export function assignPositions(elements: EvalElement[]): void {
  const groups = new Map<string, EvalElement[]>();
  for (const e of elements) {
    const k = partSignature(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  const roleRank = (r?: string) => {
    const i = ROLE_ORDER.indexOf(r ?? '');
    return i < 0 ? ROLE_ORDER.length : i;
  };
  const sorted = [...groups.values()].sort((a, b) => {
    const ea = a[0], eb = b[0];
    if (ea.kind !== eb.kind) return ea.kind === 'beam' ? -1 : 1;
    const ra = roleRank(ea.role), rb = roleRank(eb.role);
    if (ra !== rb) return ra - rb;
    return eb.length * eb.width * eb.height - ea.length * ea.width * ea.height;
  });
  sorted.forEach((g, i) => g.forEach((e) => (e.pos = i + 1)));
}
