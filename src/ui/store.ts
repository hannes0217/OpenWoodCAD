import { useSyncExternalStore } from 'react';
import { evaluate, type Evaluated } from '../core/evaluate';
import { uid } from '../core/math';
import { emptyDocument, type OwcDocument } from '../core/model';
import { validateDocument } from '../core/validate';
import { addPoint, loadProject, saveProject } from './projects';
import type { PlaneChoice } from './precision';
import { readCadSettings, type CadSettings } from './cadSettings';
import type { SelectionFilter } from './selection';

export type Workspace = 'model' | 'drawings' | 'lists' | 'nesting' | 'shopping' | 'statics' | 'project';
export type Tool = 'select' | 'beam' | 'rect' | 'circle' | 'poly' | 'measure' | 'cutRect' | 'cutCircle';
export type Lang = 'de' | 'en';

export interface AppState {
  directMove: {delta:[number,number,number];axis:'x'|'y'|'z'|null;blocked?:boolean}|null;
  selectionFilter:SelectionFilter;
  visibilityOverrides:Record<string,boolean>;
  isolatedIds:string[]|null;
  jointPreview: { base: OwcDocument; evaluation: Evaluated; ids: string[]; showContext: boolean } | null;
  contextMenu:{x:number;y:number;ids:string[];source?:'selection'}|null;
  contextPreview:string|null;
  cad: CadSettings;
  doc: OwcDocument;
  past: OwcDocument[];
  future: OwcDocument[];
  /** Selected ids: element ids, `gen:<id>` or `joint:<id>`. */
  selection: string[];
  workspace: Workspace;
  lang: Lang;
  tool: Tool;
  drawerOpen: number;
  /** Individually opened drawers/doors: motion group -> 0..1. */
  openGroups: Record<string, number>;
  gizmoMode: 'none' | 'translate' | 'rotate';
  hover: { id: string; x: number; y: number } | null;
  toolHint: string;
  /** Elements flagged by the design check (tinted red in 3D). */
  issueIds: string[];
  colorBy: 'material' | 'role' | 'pos';
  showLabels: boolean;
  xray: boolean;
  section: { enabled: boolean; axis: 'x' | 'y' | 'z'; offset: number };
  dirty: boolean;
  fileName: string | null;
  toast: { text: string; kind: 'info' | 'error' } | null;
  dialog: null | { type: 'insert' } | { type: 'about' } | { type: 'joint'; a: string; b: string; id?: string } | { type: 'shortcuts' } | { type: 'projects' };
  /** Chosen entry: furniture, carpentry or free drawing. */
  mode: 'furniture' | 'carpentry' | 'free' | null;
  tourStep: number | null;
  /** Local project id (IndexedDB). */
  projectId: string;
  saveStatus: { state: 'idle' | 'saving' | 'saved' | 'error'; at?: number; error?: string };
  /** Beam/panel creation settings. */
  beamSection: [number, number];
  beamMaterial: string;
  panelThickness: number;
  panelMaterial: string;
  workPlane: PlaneChoice;
  toolDraft: { input: string; points: number; error: boolean; snap: string };
  workZ: number;
  snap: number;
}

const AUTOSAVE_KEY = 'openwoodcad.autosave';
const PREFS_KEY = 'openwoodcad.prefs';

const LAST_KEY = 'openwoodcad.lastProject';

function loadAutosave(): OwcDocument | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? validateDocument(JSON.parse(raw)).doc : null;
  } catch {
    return null;
  }
}

function loadPrefs(): Partial<AppState> {
  try {
    const raw=JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    // Allow only preferences; imported/stale storage must not replace document,
    // selection or undo state through the spread in the initial state.
    if(!raw || typeof raw!=='object' || Array.isArray(raw)) return {};
    const out:Partial<AppState>={cad:readCadSettings(raw.cad)};
    if(raw.lang==='de' || raw.lang==='en') out.lang=raw.lang;
    if(['material','role','pos'].includes(raw.colorBy)) out.colorBy=raw.colorBy;
    if(['furniture','carpentry','free'].includes(raw.mode)) out.mode=raw.mode;
    for(const key of ['beamMaterial','panelMaterial'] as const) if(typeof raw[key]==='string') out[key]=raw[key];
    if(Number.isFinite(raw.snap) && raw.snap>=1 && raw.snap<=10000) out.snap=raw.snap;
    if(Number.isFinite(raw.panelThickness) && raw.panelThickness>0 && raw.panelThickness<=1000) out.panelThickness=raw.panelThickness;
    if(Array.isArray(raw.beamSection) && raw.beamSection.length===2 && raw.beamSection.every((v:unknown) => typeof v==='number' && Number.isFinite(v) && v>=10 && v<=10000)) out.beamSection=raw.beamSection;
    return out;
  } catch {
    return {};
  }
}

const browserLang: Lang = typeof navigator !== 'undefined' && !navigator.language?.startsWith('de') ? 'en' : 'de';

let state: AppState = {
  directMove:null,
  jointPreview:null,selectionFilter:'all',visibilityOverrides:{},isolatedIds:null,contextMenu:null,contextPreview:null,
  cad: readCadSettings(null),
  doc: loadAutosave() ?? emptyDocument(),
  projectId: (() => { try { return localStorage.getItem(LAST_KEY) ?? uid('prj'); } catch { return uid('prj'); } })(),
  saveStatus: { state: 'idle' },
  mode: null,
  tourStep: null,
  past: [],
  future: [],
  selection: [],
  workspace: 'model',
  lang: browserLang,
  tool: 'select',
  drawerOpen: 0,
  openGroups: {},
  gizmoMode: 'none',
  hover: null,
  toolHint: '',
  issueIds: [],
  colorBy: 'material',
  showLabels: false,
  xray: false,
  section: { enabled: false, axis: 'x', offset: 0.5 },
  dirty: false,
  fileName: null,
  toast: null,
  dialog: null,
  beamSection: [80, 200],
  beamMaterial: 'kvh_c24',
  panelThickness: 19,
  panelMaterial: 'chip19_white',
  workPlane: 'auto',
  toolDraft: { input: '', points: 0, error: false, snap: '' },
  workZ: 0,
  snap: 10,
  ...loadPrefs(),
};

const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: {doc:OwcDocument;projectId:string}|null=null;
let saveChain:Promise<void>=Promise.resolve();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  if ('cad' in p || 'lang' in p || 'colorBy' in p || 'beamSection' in p || 'beamMaterial' in p || 'panelMaterial' in p || 'panelThickness' in p || 'snap' in p || 'mode' in p) {
    try {
      const { cad, lang, colorBy, beamSection, beamMaterial, panelMaterial, panelThickness, snap, mode } = state;
      localStorage.setItem(PREFS_KEY, JSON.stringify({ cad, lang, colorBy, beamSection, beamMaterial, panelMaterial, panelThickness, snap, mode }));
    } catch { /* storage unavailable */ }
  }
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useApp<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state));
}

let lastPointAt = 0;

async function saveSnapshot({doc,projectId}:{doc:OwcDocument;projectId:string}) {
  const current=()=>state.doc===doc && state.projectId===projectId;
  if(current())setState({ saveStatus: { state: 'saving', at: state.saveStatus.at } });
  let error: string | undefined;
  try {
    await saveProject(projectId, doc);
    if (current() && Date.now() - lastPointAt > 10 * 60 * 1000) {
      await addPoint(projectId, doc, 'auto');
      if(current())lastPointAt=Date.now();
    }
  } catch (err) {
    error = String((err as Error)?.message ?? err);
  }
  // Quick synchronous fallback for crash recovery.
  try {
    if(current()) {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
      localStorage.setItem(LAST_KEY, projectId);
    }
  } catch (err) {
    error = error ?? String((err as Error)?.message ?? err);
  }
  if (error) {
    if(current())setState({ saveStatus: { state: 'error', error, at: state.saveStatus.at } });
    throw new Error(error);
  } else if(current())setState({ saveStatus: { state: 'saved', at: Date.now() } });
}

function persist(snapshot={doc:state.doc,projectId:state.projectId}):Promise<void> {
  // A slow older IndexedDB transaction must never overwrite a newer snapshot.
  const job=saveChain.catch(()=>{}).then(()=>saveSnapshot(snapshot));
  saveChain=job;return job;
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  pendingSave={doc:state.doc,projectId:state.projectId};
  setState({saveStatus:{state:'saving',at:state.saveStatus.at}});
  saveTimer = setTimeout(() => {
    const snapshot=pendingSave;pendingSave=null;saveTimer=null;
    if(snapshot)void persist(snapshot).catch(()=>{});
  },700);
}

/** Flush the outgoing document before changing the active project. */
export async function flushPersistence():Promise<void> {
  if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}
  const snapshot=pendingSave;pendingSave=null;
  if(snapshot)await persist(snapshot);
  else if(state.saveStatus.state==='error')await persist();
  else await saveChain;
}

/** Load the last project from IndexedDB at start (falls back to the localStorage copy). */
export async function bootPersistence(): Promise<void> {
  const initialDoc=state.doc,initialId=state.projectId;
  try {
    const doc = await loadProject(initialId);
    if(state.doc!==initialDoc || state.projectId!==initialId)return;
    if (doc) {
      const v = validateDocument(doc);
      if (v.doc) setState({ doc: v.doc, past: [], future: [], saveStatus: { state: 'saved', at: Date.now() } });
      else throw new Error(v.errors.join(' '));
    } else if (state.doc.elements.length || state.doc.generators.length) {
      await persist();
    }
  } catch (err) {
    if(state.doc===initialDoc && state.projectId===initialId)setState({ saveStatus: { state: 'error', error: String(err) } });
  }
}

/** Start a fresh project id for the current document (new / imported file). */
export function assignNewProject(): void {
  setState({ projectId: uid('prj') });
  lastPointAt = 0;
  scheduleSave();
}

/** Switch to a stored project. */
export async function switchProject(id: string, doc: OwcDocument):Promise<boolean> {
  const initialDoc=state.doc,initialId=state.projectId;
  await flushPersistence();
  if(state.doc!==initialDoc || state.projectId!==initialId)return false;
  setState({ projectId: id, doc, past: [], future: [], selection: [], dirty: false, fileName: null,tool:'select',gizmoMode:'none',issueIds:[],hover:null,openGroups:{},jointPreview:null,selectionFilter:'all',visibilityOverrides:{},isolatedIds:null,contextMenu:null,contextPreview:null });
  lastPointAt = 0;
  try { localStorage.setItem(LAST_KEY, id); } catch { /* ignore */ }
  scheduleSave();return true;
}

export async function createRestorePoint(label: string): Promise<void> {
  const projectId=state.projectId,doc=state.doc;
  await addPoint(projectId,doc,label);
  if(state.projectId===projectId && state.doc===doc)lastPointAt=Date.now();
}

/** Change the document through a mutating function on a deep copy (undoable). */
export function updateDoc(fn: (d: OwcDocument) => void): void {
  const next = structuredClone(state.doc);
  fn(next);
  setState({ doc: next, past: [...state.past.slice(-99), state.doc], future: [], dirty: true });
  scheduleSave();
}

/** Replace the document (load/new) – clears history. */
export function replaceDoc(doc: OwcDocument, fileName: string | null = null): void {
  setState({ doc, past: [], future: [], selection: [], dirty: false, fileName,tool:'select',gizmoMode:'none',issueIds:[],hover:null,openGroups:{},jointPreview:null,selectionFilter:'all',visibilityOverrides:{},isolatedIds:null,contextMenu:null,contextPreview:null,directMove:null });
  scheduleSave();
}

export function undo(): void {
  const prev = state.past.at(-1);
  if (!prev) return;
  setState({ doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], dirty: true });
  scheduleSave();
}

export function redo(): void {
  const next = state.future[0];
  if (!next) return;
  setState({ doc: next, past: [...state.past, state.doc], future: state.future.slice(1), dirty: true });
  scheduleSave();
}

export function toast(text: string, kind: 'info' | 'error' = 'info'): void {
  setState({ toast: { text, kind } });
  setTimeout(() => {
    if (state.toast?.text === text) setState({ toast: null });
  }, 4000);
}

// --------------------------------------------------------- evaluation memo

let lastDoc: OwcDocument | null = null;
let lastEval: Evaluated | null = null;

export function evaluated(doc = state.doc): Evaluated {
  if (doc !== lastDoc || !lastEval) {
    lastEval = evaluate(doc);
    lastDoc = doc;
  }
  return lastEval;
}

export function useEvaluated(): Evaluated {
  const doc = useApp((s) => s.doc);
  return evaluated(doc);
}
