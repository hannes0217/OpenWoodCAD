import { findHardware, findMaterial, type Material } from './catalog';
import type { Evaluated } from './evaluate';
import { edgeBanding, hardwareRows, partRows, type HardwareRow, type PartRow } from './lists';
import type { ProcessingType, Settings } from './model';
import { nestLinear, nestSheets, type BarPiece, type LinearResult, type NestResult, type SheetPiece } from './nesting';

export interface SheetNesting {
  materialId: string;
  result: NestResult;
}

export interface LinearNesting {
  materialId: string;
  section: [number, number];
  result: LinearResult;
}

export interface ShoppingRow {
  kind: 'sheet' | 'timber' | 'edge' | 'hardware';
  itemId: string;
  /** Extra description (section, stock length). */
  detail?: string;
  qty: number;
  unit: 'sheet' | 'piece' | 'roll' | 'pack';
  unitPrice: number;
  total: number;
}

export interface CostBreakdown {
  /** False when stock is unavailable; numeric totals are then partial. */
  complete:boolean;
  material: number;
  hardware: number;
  labourMinutes: number;
  labour: number;
  subtotal: number;
  overhead: number;
  profit: number;
  net: number;
  vat: number;
  gross: number;
  labourItems: { key: string; minutes: number }[];
}

export interface Production {
  unavailable:{materialId:string;position:string;dimensions:string}[];
  rows: PartRow[];
  sheets: SheetNesting[];
  linear: LinearNesting[];
  edges: Map<string, number>;
  hardware: HardwareRow[];
  shopping: ShoppingRow[];
  cost: CostBreakdown;
}

/** Minutes per processing (manual workshop, conservative defaults). */
export const PROCESS_MINUTES: Record<ProcessingType, number> = {
  endCut: 2, jackRafterCut: 4, doubleCut: 6, ridgeValleyCut: 8, longitudinalCut: 10, birdsMouth: 8, lap: 15, notch: 10, house: 12,
  slot: 12, mortise: 25, tenon: 20, dovetailTenon: 30, dovetailMortise: 30, stepJoint: 12, stepJointNotch: 15, drilling: 1,
  groove: 4, rabbet: 4, pocket: 8, chamfer: 3, miter: 4, marking: 0.5,
};

const sectionKey = (w: number, h: number): [number, number] => [Math.min(w, h), Math.max(w, h)];

export function production(ev: Evaluated, settings: Settings): Production {
  const unavailable:Production['unavailable']=[];
  const rows = partRows(ev);
  const cat = ev.catalog;
  const matOf = (id: string): Material | undefined => {
    try { return findMaterial(cat, id); } catch { return undefined; }
  };

  // ---- 2D nesting per sheet material
  const sheetPieces = new Map<string, SheetPiece[]>();
  const linearPieces = new Map<string, { materialId: string; section: [number, number]; pieces: BarPiece[] }>();
  for (const r of rows) {
    const m = matOf(r.materialId);
    if (!m) {for(let i=0;i<r.qty;i++)unavailable.push({materialId:r.materialId,position:String(r.pos),dimensions:`${r.length} × ${r.width} × ${r.height} mm`});continue;}
    if (m.category === 'sheet') {
      const list = sheetPieces.get(m.id) ?? [];
      for (let i = 0; i < r.qty; i++) list.push({ id: `${r.pos}.${i}`, label: String(r.pos), l: r.length, w: r.width, grain: m.grain });
      sheetPieces.set(m.id, list);
    } else {
      const section = sectionKey(r.width, r.height);
      const key = `${m.id}|${section.join('x')}`;
      const g = linearPieces.get(key) ?? { materialId: m.id, section, pieces: [] };
      for (let i = 0; i < r.qty; i++) g.pieces.push({ id: `${r.pos}.${i}`, label: String(r.pos), length: r.length + settings.timberAllowance });
      linearPieces.set(key, g);
    }
  }
  const sheets: SheetNesting[] = [...sheetPieces.entries()].map(([materialId, pieces]) => {
    const m = matOf(materialId)!;
    return { materialId, result: nestSheets(pieces, { sheetLength: m.sheetLength ?? 2800, sheetWidth: m.sheetWidth ?? 2070, kerf: settings.kerf, trim: settings.sheetTrim }) };
  });
  const linear: LinearNesting[] = [...linearPieces.values()].map((g) => {
    const m = matOf(g.materialId)!;
    return { materialId: g.materialId, section: g.section, result: nestLinear(g.pieces, m.stockLengths ?? [6000], settings.kerf) };
  });

  // ---- shopping list
  const shopping: ShoppingRow[] = [];
  for (const s of sheets) {
    const m = matOf(s.materialId)!;
    for(const piece of s.result.oversize)unavailable.push({materialId:m.id,position:piece.label,dimensions:`${piece.l} × ${piece.w} mm`});
    const qty = s.result.sheets.length;
    const price = m.pricePerSheet ?? 0;
    if(qty)shopping.push({ kind: 'sheet', itemId: m.id, detail: `${m.sheetLength??2800} × ${m.sheetWidth??2070} mm`, qty, unit: 'sheet', unitPrice: price, total: qty * price });
  }
  for (const l of linear) {
    const m = matOf(l.materialId)!;
    const byStock = new Map<number, number>();
    for (const b of l.result.bars) byStock.set(b.stock, (byStock.get(b.stock) ?? 0) + 1);
    for (const p of l.result.oversize)unavailable.push({materialId:m.id,position:p.label,dimensions:`${l.section[0]} × ${l.section[1]} mm, ${p.length} mm`});
    for (const [stock, qty] of [...byStock.entries()].sort((a, b) => b[0] - a[0])) {
      const unitPrice = ((stock * l.section[0] * l.section[1]) / 1e9) * (m.pricePerM3 ?? 0);
      shopping.push({ kind: 'timber', itemId: m.id, detail: `${l.section[0]} × ${l.section[1]} mm, ${stock} mm`, qty, unit: 'piece', unitPrice: round2(unitPrice), total: round2(unitPrice * qty) });
    }
  }
  const edges = edgeBanding(rows, cat);
  for (const [itemId, metres] of edges) {
    let item;
    try { item = findHardware(cat, itemId); } catch { continue; }
    const rolls = Math.ceil((metres * (1 + settings.wasteFactor)) / (item.metresPerRoll ?? 10));
    shopping.push({ kind: 'edge', itemId, detail: `${metres.toFixed(1)} m`, qty: rolls, unit: 'roll', unitPrice: item.price, total: rolls * item.price });
  }
  const hardware = hardwareRows(ev.hardware, cat);
  for (const h of hardware) {
    const item = findHardware(cat, h.itemId);
    if (item.category === 'edge') continue;
    shopping.push({ kind: 'hardware', itemId: h.itemId, detail: item.packSize > 1 ? `${h.qty} Stk.` : undefined, qty: h.packs, unit: item.packSize > 1 ? 'pack' : 'piece', unitPrice: item.price, total: h.price });
  }

  // ---- costing
  const material = shopping.filter((s) => s.kind === 'sheet' || s.kind === 'timber' || s.kind === 'edge').reduce((a, s) => a + s.total, 0);
  const hwCost = shopping.filter((s) => s.kind === 'hardware').reduce((a, s) => a + s.total, 0);
  const labourItems = new Map<string, number>();
  const addMin = (k: string, m: number) => labourItems.set(k, (labourItems.get(k) ?? 0) + m);
  for (const r of rows) {
    if (r.kind === 'beam') addMin('labour.handlingBeam', 3 * r.qty);
    else addMin('labour.cutPanel', 1.5 * r.qty);
    for (const [t, n] of Object.entries(r.processings)) addMin(`proc.${t}`, (PROCESS_MINUTES[t as ProcessingType] ?? 2) * (n ?? 0) * r.qty);
  }
  for (const [itemId, metres] of edges) addMin('labour.edgeBanding', metres * 1.5 + (itemId ? 0 : 0));
  for (const h of hardware) {
    const item = findHardware(cat, h.itemId);
    if (item.minutes && item.category !== 'edge') addMin('labour.assembly', item.minutes * h.qty);
  }
  const labourMinutes = [...labourItems.values()].reduce((a, b) => a + b, 0);
  const labour = (labourMinutes / 60) * settings.labourRate;
  const subtotal = material + hwCost + labour;
  const overhead = subtotal * settings.overhead;
  const profit = (subtotal + overhead) * settings.profit;
  const net = subtotal + overhead + profit;
  const vat = net * settings.vat;
  const cost: CostBreakdown = {
    complete:unavailable.length===0,
    material: round2(material), hardware: round2(hwCost), labourMinutes: Math.round(labourMinutes), labour: round2(labour),
    subtotal: round2(subtotal), overhead: round2(overhead), profit: round2(profit), net: round2(net), vat: round2(vat), gross: round2(net + vat),
    labourItems: [...labourItems.entries()].map(([key, minutes]) => ({ key, minutes: Math.round(minutes) })).sort((a, b) => b.minutes - a.minutes),
  };
  return { rows, sheets, linear, edges, hardware, shopping, cost,unavailable };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
