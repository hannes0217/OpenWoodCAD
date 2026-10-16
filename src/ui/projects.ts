// Local project storage in IndexedDB: projects + restore points.

import type { OwcDocument } from '../core/model';

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  parts: number;
}

export interface RestorePoint {
  id: string;
  projectId: string;
  createdAt: number;
  label: string;
}

const DB = 'openwoodcad';
const MAX_POINTS = 30;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('points')) db.createObjectStore('points', { keyPath: 'id' }).createIndex('project', 'projectId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r ? (r as IDBRequest<T>).result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('aborted'));
  }));
}

export function countParts(doc: OwcDocument): number {
  return doc.elements.length + doc.generators.length;
}

export async function saveProject(id: string, doc: OwcDocument): Promise<void> {
  await tx('projects', 'readwrite', (s) => s.put({ id, name: doc.project.name, updatedAt: Date.now(), parts: countParts(doc), doc }));
}

export async function loadProject(id: string): Promise<OwcDocument | null> {
  const r = await tx<{ doc: OwcDocument } | undefined>('projects', 'readonly', (s) => s.get(id));
  return r?.doc ?? null;
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await tx<{ id: string; name: string; updatedAt: number; parts: number }[]>('projects', 'readonly', (s) => s.getAll());
  return all.map(({ id, name, updatedAt, parts }) => ({ id, name, updatedAt, parts })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  await tx('projects', 'readwrite', (s) => s.delete(id));
  const pts = await listPoints(id);
  await tx('points', 'readwrite', (s) => { for (const p of pts) s.delete(p.id); });
}

export async function addPoint(projectId: string, doc: OwcDocument, label: string): Promise<void> {
  const id = `${projectId}:${Date.now()}`;
  await tx('points', 'readwrite', (s) => s.put({ id, projectId, createdAt: Date.now(), label, doc }));
  const pts = await listPoints(projectId);
  const old = pts.slice(MAX_POINTS);
  if (old.length) await tx('points', 'readwrite', (s) => { for (const p of old) s.delete(p.id); });
}

export async function listPoints(projectId: string): Promise<RestorePoint[]> {
  const all = await tx<(RestorePoint & { doc: OwcDocument })[]>('points', 'readonly', (s) => s.index('project').getAll(projectId));
  return all.map(({ id, projectId: p, createdAt, label }) => ({ id, projectId: p, createdAt, label })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadPoint(id: string): Promise<OwcDocument | null> {
  const r = await tx<{ doc: OwcDocument } | undefined>('points', 'readonly', (s) => s.get(id));
  return r?.doc ?? null;
}
