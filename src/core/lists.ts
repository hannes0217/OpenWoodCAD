import { findHardware, findMaterial, type Catalog, type Material } from './catalog';
import type { EvalElement, Evaluated } from './evaluate';
import type { EdgeId, HardwareUse, ProcessingType } from './model';

export interface PartRow {
  pos: number;
  names: string[];
  role?: string;
  kind: 'beam' | 'panel';
  materialId: string;
  length: number;
  width: number;
  height: number;
  qty: number;
  /** Banded edges (panels). */
  edges: EdgeId[];
  grain: boolean;
  /** Volume of the base body per piece (m³). */
  volume: number;
  /** Face area per piece (m²) – panels. */
  area: number;
  /** Weight per piece (kg, base body). */
  weight: number;
  processings: Partial<Record<ProcessingType, number>>;
  elementIds: string[];
}

export function partRows(ev: Evaluated): PartRow[] {
  const byPos = new Map<number, EvalElement[]>();
  for (const e of ev.elements) {
    if (!byPos.has(e.pos)) byPos.set(e.pos, []);
    byPos.get(e.pos)!.push(e);
  }
  const rows: PartRow[] = [];
  for (const [pos, es] of [...byPos.entries()].sort((a, b) => a[0] - b[0])) {
    const e = es[0];
    let m: Material | undefined;
    try { m = findMaterial(ev.catalog, e.materialId); } catch { m = undefined; }
    const volume = (e.length * e.width * e.height) / 1e9;
    const procs: Partial<Record<ProcessingType, number>> = {};
    for (const p of e.all) procs[p.type] = (procs[p.type] ?? 0) + 1;
    rows.push({
      pos,
      names: [...new Set(es.map((x) => x.name))],
      role: e.role,
      kind: e.kind,
      materialId: e.materialId,
      length: e.length,
      width: e.width,
      height: e.height,
      qty: es.length,
      edges: (Object.entries(e.edges ?? {}) as [EdgeId, boolean][]).filter(([, v]) => v).map(([k]) => k).sort(),
      grain: m?.grain ?? true,
      volume,
      area: (e.length * e.width) / 1e6,
      weight: volume * (m?.density ?? 500),
      processings: procs,
      elementIds: es.map((x) => x.id),
    });
  }
  return rows;
}

/** Edge banding length per banding item in metres (uses the panel material's banding). */
export function edgeBanding(rows: PartRow[], catalog: Catalog): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r.kind !== 'panel' || r.edges.length === 0) continue;
    let m: Material;
    try { m = findMaterial(catalog, r.materialId); } catch { continue; }
    if (!m.edgeBanding) continue;
    const perPiece = r.edges.reduce((s, e) => s + (e.startsWith('x') ? r.width : r.length), 0);
    out.set(m.edgeBanding, (out.get(m.edgeBanding) ?? 0) + (perPiece * r.qty) / 1000);
  }
  return out;
}

export interface HardwareRow {
  itemId: string;
  qty: number;
  packs: number;
  price: number;
}

export function hardwareRows(hw: HardwareUse[], catalog: Catalog): HardwareRow[] {
  const sum = new Map<string, number>();
  for (const h of hw) sum.set(h.itemId, (sum.get(h.itemId) ?? 0) + h.qty);
  const rows: HardwareRow[] = [];
  for (const [itemId, qty] of sum) {
    let item;
    try { item = findHardware(catalog, itemId); } catch { continue; }
    const packs = Math.ceil(qty / item.packSize - 1e-9);
    rows.push({ itemId, qty, packs, price: packs * item.price });
  }
  return rows.sort((a, b) => a.itemId.localeCompare(b.itemId));
}

export interface Totals {
  parts: number;
  positions: number;
  volumeTimber: number;
  areaPanels: number;
  weight: number;
}

export function totals(rows: PartRow[]): Totals {
  return {
    parts: rows.reduce((s, r) => s + r.qty, 0),
    positions: rows.length,
    volumeTimber: rows.filter((r) => r.kind === 'beam').reduce((s, r) => s + r.volume * r.qty, 0),
    areaPanels: rows.filter((r) => r.kind === 'panel').reduce((s, r) => s + r.area * r.qty, 0),
    weight: rows.reduce((s, r) => s + r.weight * r.qty, 0),
  };
}
