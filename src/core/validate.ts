import { FORMAT, FORMAT_VERSION, emptyDocument, type DrawingView, type Element, type GeneratorInstance, type Joint, type OwcDocument } from './model';

import { evaluate } from './evaluate';
import { JOINT_PARAMS } from './joints';
import { groupPath } from './assemblies';
import { dot, cross } from './math';

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
  // v2 adds explicit overrides/suppression of generated joints; v1 needs no edits.
  1: () => {},
  // v3 adds workshop views; old documents have none.
  2: () => {},
  // v4 interprets legacy groups as identity assemblies and adds operation suppression.
  3: () => {},
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
    let motion = e.motion as Element['motion'];
    if (motion) {
      const rotation = motion.rotation;
      if (typeof motion.group !== 'string' || !isVec(motion.dir) || !isNum(motion.travel) || rotation && (!isVec(rotation.pivot) || !isVec(rotation.axis) || Math.hypot(...rotation.axis) < 1e-9 || !isNum(rotation.angle))) {
        repairs.push(`Bewegung von Bauteil ${i+1} war ungültig und wurde entfernt.`); motion=undefined;
      }
    }
    elements.push({ ...(e as unknown as Element), motion, name: typeof e.name === 'string' ? e.name : `Bauteil ${i + 1}`, processings: Array.isArray(e.processings) ? (e.processings as Element['processings']) : [] });
  }
  const ids = new Set(elements.map((e) => e.id));
  const generators: GeneratorInstance[] = [];
  for (const [i, g] of ((Array.isArray(d.generators) ? d.generators : []) as Record<string, unknown>[]).entries()) {
    if (!g || typeof g.id !== 'string' || typeof g.type !== 'string' || !isFrame(g.frame)) { repairs.push(`Assistent ${i + 1} ist unvollständig und wurde entfernt.`); continue; }
    generators.push({ id: g.id, type: g.type, name: typeof g.name === 'string' ? g.name : g.type, frame: g.frame as GeneratorInstance['frame'], params: (g.params && typeof g.params === 'object' ? g.params : {}) as GeneratorInstance['params'], hidden: !!g.hidden, ...(typeof g.groupId==='string'?{groupId:g.groupId}:{}) });
  }
  const project = (d.project && typeof d.project === 'object' ? d.project : {}) as Partial<OwcDocument['project']>;
  const doc: OwcDocument = {
    ...base,
    project: { ...base.project, ...project, name: typeof project.name === 'string' && project.name ? project.name : base.project.name, site: { ...base.project.site, ...(project.site ?? {}) } },
    elements,
    joints: [],
    generators,
    groups: Array.isArray(d.groups) ? (d.groups as OwcDocument['groups']) : [],
    hardware: Array.isArray(d.hardware) ? (d.hardware as OwcDocument['hardware']).filter((h) => h && typeof h.itemId === 'string' && isNum(h.qty)) : [],
    prices: d.prices && typeof d.prices === 'object' ? Object.fromEntries(Object.entries(d.prices as Record<string, unknown>).filter(([, v]) => isNum(v))) as OwcDocument['prices'] : {},
    customMaterials: Array.isArray(d.customMaterials) ? (d.customMaterials as OwcDocument['customMaterials']) : [],
    settings: { ...base.settings, ...(d.settings && typeof d.settings === 'object' ? d.settings as object : {}) },
    statics: Array.isArray(d.statics) ? (d.statics as OwcDocument['statics']) : [],
    version: FORMAT_VERSION,
  };
  // Never repair broken assembly coordinates by silently placing members at the origin.
  try {
    const groupIds=new Set<string>();
    for(const group of doc.groups){
      if(!group || typeof group.id!=='string' || !group.id || groupIds.has(group.id) || typeof group.name!=='string' || group.parent!==undefined&&typeof group.parent!=='string')throw new Error('invalid assembly');
      groupIds.add(group.id);
      if(group.frame){
        const f=group.frame;
        if(!isFrame(f)||[f.x,f.y,f.z].some(v=>Math.abs(dot(v,v)-1)>1e-6)||Math.abs(dot(cross(f.x,f.y),f.z)-1)>1e-6)throw new Error('invalid assembly frame');
      }
    }
    for(const group of doc.groups)groupPath(doc,group.id);
    for(const member of [...doc.elements,...doc.generators])groupPath(doc,member.groupId);
    for(const element of doc.elements){
      const processingIds=new Set<string>();
      for(const processing of element.processings){
        if(!processing||typeof processing.id!=='string'||!processing.id||processingIds.has(processing.id)||processing.suppressed!==undefined&&typeof processing.suppressed!=='boolean')throw new Error('invalid feature identity');
        processingIds.add(processing.id);
      }
    }
    if(new Set([...elements.map(e=>e.id),...generators.map(g=>g.id)]).size!==elements.length+generators.length)throw new Error('duplicate object ID');
  }catch{return {doc:null,errors:['Ungültige Baugruppenplatzierung oder Bearbeitungsreferenz.'],repairs};}
  // Resolve generated part IDs before validating links, including external
  // links and explicit overrides. Never rebind a missing ID to a different part.
  try { for (const e of evaluate(doc).elements) ids.add(e.id); }
  catch { return {doc:null,errors:['Bauteilreferenzen konnten nicht sicher ausgewertet werden.'],repairs}; }
  if (d.drawingViews !== undefined) {
    const views: NonNullable<OwcDocument['drawingViews']> = [];
    const idsSeen = new Set<string>();
    const smallNumber = (value:unknown) => isNum(value) && Math.abs(value) <= 1e7;
    const point = (value:unknown): boolean => {
      if (!value || typeof value !== 'object') return false;
      const ref=value as Record<string,unknown>;
      return Number.isInteger(ref.corner) && Number(ref.corner)>=0 && Number(ref.corner)<8 && (ref.elementId===undefined || typeof ref.elementId==='string'&&ref.elementId.length<=200);
    };
    for (const rawView of Array.isArray(d.drawingViews)?d.drawingViews.slice(0,20):[]) {
      const v=rawView as DrawingView;
      if (!v || typeof v.id!=='string' || !v.id || v.id.length>100 || idsSeen.has(v.id) || typeof v.title!=='string' || v.title.length>120 || !['front','side','top'].includes(v.view) || v.sectionOffset!==undefined&&!smallNumber(v.sectionOffset) || v.detail && (![v.detail.u,v.detail.v,v.detail.width,v.detail.height].every(smallNumber)||v.detail.width<=0||v.detail.height<=0) || !Array.isArray(v.dimensions)) {
        repairs.push('Eine ungültige Zeichnungsansicht wurde entfernt.'); continue;
      }
      if(v.dimensions.length>100)repairs.push('Zeichnungsmaße wurden auf 100 je Ansicht begrenzt.');
      const dimensionIds=new Set<string>();
      const dimensions=v.dimensions.slice(0,100).filter(dim=>{
        if (!dim || typeof dim.id!=='string' || !dim.id || dim.id.length>100 || dimensionIds.has(dim.id) || !point(dim.a)||!point(dim.b)||!['h','v','aligned'].includes(dim.orientation)||!isNum(dim.offset)||Math.abs(dim.offset)>80) { repairs.push('Ein ungültiges Zeichnungsmaß wurde entfernt.');return false; }
        dimensionIds.add(dim.id);return true;
      });
      views.push({id:v.id,title:v.title,view:v.view,dimensions,...(v.sectionOffset!==undefined?{sectionOffset:v.sectionOffset}:{}),...(v.detail?{detail:v.detail}:{})});idsSeen.add(v.id);
    }
    if(!Array.isArray(d.drawingViews)||d.drawingViews.length>20)repairs.push('Zeichnungsansichten wurden auf gültige Einträge begrenzt.');
    doc.drawingViews=views;
  }
  const seen = new Set<string>();
  for (const rawJoint of Array.isArray(d.joints) ? d.joints : []) {
    const j = rawJoint as Record<string, unknown> | null;
    if (!j || typeof j.id !== 'string' || seen.has(j.id) || typeof j.type !== 'string' || !Object.prototype.hasOwnProperty.call(JOINT_PARAMS, j.type) || j.a === j.b || !ids.has(j.a as string) || !ids.has(j.b as string)) {
      repairs.push('Eine Verbindung verwies auf fehlende Bauteile oder war ungültig und wurde entfernt.'); continue;
    }
    const params = j.params && typeof j.params === 'object' && !Array.isArray(j.params) ? Object.fromEntries(Object.entries(j.params).filter(([,v]) => typeof v === 'boolean' || typeof v === 'string' || isNum(v))) : {};
    doc.joints.push({ id:j.id, type:j.type as Joint['type'], a:j.a as string, b:j.b as string, params, ...(typeof j.generator === 'string' && generators.some(g => g.id === j.generator) ? {generator:j.generator} : {}), ...(j.suppressed === true ? {suppressed:true} : {}) });
    seen.add(j.id);
  }
  return { doc, errors, repairs: [...new Set(repairs)] };
}
