import { GENERATORS } from '../core/generators';
import { withDefaults } from '../core/generators/types';
import { WORLD, uid, type Vec3 } from '../core/math';
import { emptyDocument, type Element, type OwcDocument } from '../core/model';
import { validateDocument } from '../core/validate';
import { t } from './i18n';
import { assignNewProject, evaluated, flushPersistence, getState, replaceDoc, setState, toast, updateDoc } from './store';

export function download(name: string, data: BlobPart, type: string): void {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export function safeName(s: string): string {
  return (s || 'projekt').replace(/[^\p{L}\p{N}_\- ]+/gu, '').trim().replace(/\s+/g, '_') || 'projekt';
}

let fileRequest=0;
export async function newDocument(): Promise<void> {
  if (getState().dirty && !confirm(t('file.newConfirm'))) return;
  const original=getState().doc,projectId=getState().projectId,request=++fileRequest;
  try {await flushPersistence();}catch(err){toast(t('safe.saveFailed',{error:String(err)}),'error');return;}
  if(request!==fileRequest || original!==getState().doc || projectId!==getState().projectId){toast(t('safe.documentChanged'),'error');return;}
  replaceDoc(emptyDocument(getState().lang === 'de' ? 'Neues Projekt' : 'New project'));
  assignNewProject();
}

export function openFile(): void {
  const original=getState().doc,projectId=getState().projectId,request=++fileRequest;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.owc,.json,application/json';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      let raw: unknown;
      try { raw = JSON.parse(await f.text()); } catch { throw new Error(getState().lang === 'de' ? 'Datei ist kein gültiges JSON.' : 'File is not valid JSON.'); }
      const v = validateDocument(raw);
      if (!v.doc) throw new Error(v.errors.join(' '));
      if(request!==fileRequest || original!==getState().doc || projectId!==getState().projectId){toast(t('safe.documentChanged'),'error');return;}
      if(getState().dirty && !confirm(t('safe.replaceConfirm')))return;
      await flushPersistence();
      if(request!==fileRequest || original!==getState().doc || projectId!==getState().projectId){toast(t('safe.documentChanged'),'error');return;}
      replaceDoc(v.doc, f.name);
      assignNewProject();
      toast(t('file.opened', { name: f.name }) + (v.repairs.length ? ` – ${v.repairs.join(' ')}` : ''), v.repairs.length ? 'error' : 'info');
    } catch (err) {
      toast(t('file.openError', { error: String((err as Error).message) }), 'error');
    }
  };
  input.click();
}

export function saveFile(): void {
  const s = getState();
  const name = s.fileName ?? `${safeName(s.doc.project.name)}.owc`;
  download(name, JSON.stringify(s.doc, null, 1), 'application/json');
  setState({ dirty: false, fileName: name });
  toast(t('file.saved', { name }));
}

/** Place a new generator next to the existing model. */
export function insertGenerator(type: string): void {
  const def = GENERATORS[type];
  if (!def) return;
  const ev = evaluated();
  let x = 0;
  if (ev.elements.length) {
    let maxX = -Infinity;
    for (const e of ev.elements) for (const c of [e.frame.o]) maxX = Math.max(maxX, c[0] + Math.abs(e.frame.x[0]) * e.length + Math.abs(e.frame.y[0]) * e.width + Math.abs(e.frame.z[0]) * e.height);
    x = Math.ceil((maxX + 500) / 100) * 100;
  }
  const id = uid('g');
  updateDoc((d) => {
    d.generators.push({ id, type, name: t(`gen.${type}`), frame: { ...WORLD, o: [x, 0, 0] }, params: withDefaults(def, {}) });
  });
  setState({ selection: [`gen:${id}`], dialog: null, workspace: 'model' });
  // First template ever: offer the short guided tour.
  try {
    if (!localStorage.getItem('openwoodcad.tourSeen')) setTimeout(() => setState({ tourStep: 0 }), 1200);
  } catch { /* storage unavailable */ }
}

export function deleteSelection(): void {
  const sel = getState().selection;
  if (!sel.length) return;
  const ev = evaluated();
  const gens = new Set(sel.filter((s) => s.startsWith('gen:')).map((s) => s.slice(4)));
  const joints = new Set(sel.filter((s) => s.startsWith('joint:')).map((s) => s.slice(6)));
  const elems = new Set<string>();
  for (const s of sel) {
    const e = ev.elements.find((x) => x.id === s);
    if (!e) continue;
    if (e.generator) gens.add(e.generator);
    else elems.add(e.id);
  }
  updateDoc((d) => {
    d.generators = d.generators.filter((g) => !gens.has(g.id));
    d.elements = d.elements.filter((e) => !elems.has(e.id));
    d.joints = d.joints.filter((j) => !joints.has(j.id) && !elems.has(j.a) && !elems.has(j.b));
  });
  setState({ selection: [] });
}

export function duplicateSelection(offset: Vec3 = [200, 200, 0]): void {
  const sel = getState().selection;
  const ev = evaluated();
  const newSel: string[] = [];
  updateDoc((d) => {
    const genIds = new Set(sel.filter((s) => s.startsWith('gen:')).map((s) => s.slice(4)));
    for (const s of sel) {
      const e = ev.elements.find((x) => x.id === s);
      if (e?.generator) genIds.add(e.generator);
    }
    for (const g of d.generators.filter((x) => genIds.has(x.id))) {
      const id = uid('g');
      d.generators.push({ ...structuredClone(g), id, name: `${g.name} (2)`, frame: { ...g.frame, o: [g.frame.o[0] + offset[0], g.frame.o[1] + offset[1], g.frame.o[2] + offset[2]] } });
      newSel.push(`gen:${id}`);
    }
    for (const e of d.elements.filter((x) => sel.includes(x.id))) {
      const id = uid('b');
      d.elements.push({ ...structuredClone(e), id, frame: { ...e.frame, o: [e.frame.o[0] + offset[0], e.frame.o[1] + offset[1], e.frame.o[2] + offset[2]] } });
      newSel.push(id);
    }
  });
  setState({ selection: newSel });
}

/** Turn a generator into free elements and joints (keeps geometry, loses parameters). */
export function explodeGenerator(genId: string): void {
  const ev = evaluated();
  const g = getState().doc.generators.find((x) => x.id === genId);
  if (!g) return;
  const elems: Element[] = ev.elements
    .filter((e) => e.generator === genId)
    .map((e) => ({ id: e.id, kind: e.kind, name: e.name, role: e.role, frame: e.frame, length: e.length, width: e.width, height: e.height, outline: e.outline, materialId: e.materialId, edges: e.edges, processings: e.processings, motion: e.motion, tags: e.tags }));
  const joints = ev.joints.filter((j) => j.generator === genId).map((j) => ({ ...j, generator: undefined }));
  const hw = ev.hardware.filter((h) => h.source === genId);
  updateDoc((d: OwcDocument) => {
    d.generators = d.generators.filter((x) => x.id !== genId);
    d.elements.push(...elems);
    d.joints.push(...joints);
    d.hardware.push(...hw);
  });
  setState({ selection: elems.map((e) => e.id) });
}

export function selectAll(): void {
  setState({ selection: evaluated().elements.map((e) => e.id) });
}
