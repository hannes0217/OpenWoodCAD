import { FORMAT, FORMAT_VERSION, emptyDocument, type Element, type GeneratorInstance, type Joint, type OwcDocument } from './model';

// Strict validation and migration of documents loaded from files or storage.

export interface ValidationResult {
  doc: OwcDocument | null;
  /** Problems that made the file unusable. */
  errors: string[];
  /** Repairs that were applied (invalid entries dropped etc.). */
  repairs: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isVec = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isFrame = (f: unknown): boolean => !!f && typeof f === 'object' && ['o', 'x', 'y', 'z'].every((k) => isVec((f as Record<string, unknown>)[k]));

/** Migrations from older format versions, applied in order. */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => void> = {
  // version 0 (pre-release): elements had `outline` as {x,y} objects
  0: (d) => {
    for (const e of (d.elements as Record<string, unknown>[]) ?? []) {
      const o = e.outline as unknown[] | undefined;
      if (o && o.length && typeof o[0] === 'object' && !Array.isArray(o[0])) e.outline = (o as { x: number; y: number }[]).map((p) => [p.x, p.y]);
    }
  },
};

export function validateDocument(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const repairs: string[] = [];
  if (!raw || typeof raw !== 'object') return { doc: null, errors: ['Keine gültige JSON-Struktur.'], repairs };
  const d = structuredClone(raw) as Record<string, unknown>;
  if (d.format !== FORMAT) return { doc: null, errors: ['Keine OpenWoodCAD-Datei (Kennung „format“ fehlt).'], repairs };
  const version = isNum(d.version) ? d.version : 0;
  if (version > FORMAT_VERSION) errors.push(`Datei stammt aus einer neueren Programmversion (${version} > ${FORMAT_VERSION}).`);
  for (let v = version; v < FORMAT_VERSION; v++) {
    MIGRATIONS[v]?.(d);
    repairs.push(`Format von Version ${v} auf ${v + 1} aktualisiert.`);
  }
  if (errors.length) return { doc: null, errors, repairs };
  const base = emptyDocument();
  const elements: Element[] = [];
  for (const [i, e] of ((Array.isArray(d.elements) ? d.elements : []) as Record<string, unknown>[]).entries()) {
    const ok = e && typeof e.id === 'string' && (e.kind === 'beam' || e.kind === 'panel') && isFrame(e.frame) && isNum(e.length) && isNum(e.width) && isNum(e.height) && e.length > 0 && e.width > 0 && e.height > 0 && typeof e.materialId === 'string';
    if (!ok) { repairs.push(`Bauteil ${i + 1} ist unvollständig und wurde entfernt.`); continue; }
    elements.push({ ...(e as unknown as Element), name: typeof e.name === 'string' ? e.name : `Bauteil ${i + 1}`, processings: Array.isArray(e.processings) ? (e.processings as Element['processings']) : [] });
  }
  const ids = new Set(elements.map((e) => e.id));
  const generators: GeneratorInstance[] = [];
  for (const [i, g] of ((Array.isArray(d.generators) ? d.generators : []) as Record<string, unknown>[]).entries()) {
    if (!g || typeof g.id !== 'string' || typeof g.type !== 'string' || !isFrame(g.frame)) { repairs.push(`Assistent ${i + 1} ist unvollständig und wurde entfernt.`); continue; }
    generators.push({ id: g.id, type: g.type, name: typeof g.name === 'string' ? g.name : g.type, frame: g.frame as GeneratorInstance['frame'], params: (g.params && typeof g.params === 'object' ? g.params : {}) as GeneratorInstance['params'], hidden: !!g.hidden });
  }
  const joints: Joint[] = [];
  for (const j of ((Array.isArray(d.joints) ? d.joints : []) as Record<string, unknown>[])) {
    if (!j || typeof j.id !== 'string' || typeof j.type !== 'string' || !ids.has(j.a as string) || !ids.has(j.b as string)) { repairs.push('Eine Verbindung verwies auf fehlende Bauteile und wurde entfernt.'); continue; }
    joints.push({ ...(j as unknown as Joint), params: (j.params as Joint['params']) ?? {} });
  }
  const project = (d.project && typeof d.project === 'object' ? d.project : {}) as Partial<OwcDocument['project']>;
  const doc: OwcDocument = {
    ...base,
    project: { ...base.project, ...project, name: typeof project.name === 'string' && project.name ? project.name : base.project.name, site: { ...base.project.site, ...(project.site ?? {}) } },
    elements,
    joints,
    generators,
    groups: Array.isArray(d.groups) ? (d.groups as OwcDocument['groups']) : [],
    hardware: Array.isArray(d.hardware) ? (d.hardware as OwcDocument['hardware']).filter((h) => h && typeof h.itemId === 'string' && isNum(h.qty)) : [],
    prices: d.prices && typeof d.prices === 'object' ? Object.fromEntries(Object.entries(d.prices as Record<string, unknown>).filter(([, v]) => isNum(v))) as OwcDocument['prices'] : {},
    customMaterials: Array.isArray(d.customMaterials) ? (d.customMaterials as OwcDocument['customMaterials']) : [],
    settings: { ...base.settings, ...(d.settings && typeof d.settings === 'object' ? d.settings as object : {}) },
    statics: Array.isArray(d.statics) ? (d.statics as OwcDocument['statics']) : [],
    version: FORMAT_VERSION,
  };
  return { doc, errors, repairs: [...new Set(repairs)] };
}
