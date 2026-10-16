// Cutting optimisation.
//  - 2D guillotine nesting for sheet materials (panel saw friendly: every cut runs through).
//  - 1D cutting stock for linear timber (bars of stock lengths).

export interface SheetPiece {
  id: string;
  label: string;
  /** Length along the grain, width across. */
  l: number;
  w: number;
  /** Grain matters: l must stay parallel to the sheet length. */
  grain: boolean;
}

export interface Placement {
  piece: SheetPiece;
  x: number;
  y: number;
  /** Placed size along sheet length (x) and width (y). */
  dx: number;
  dy: number;
  rotated: boolean;
}

export interface SheetLayout {
  length: number;
  width: number;
  placements: Placement[];
  /** Used area fraction of the usable sheet. */
  usage: number;
}

export interface NestOptions {
  sheetLength: number;
  sheetWidth: number;
  kerf: number;
  trim: number;
}

export interface NestResult {
  sheets: SheetLayout[];
  /** Pieces that do not fit on a sheet at all. */
  oversize: SheetPiece[];
}

interface FreeRect { x: number; y: number; w: number; h: number }
interface WorkSheet { free: FreeRect[]; placements: Placement[] }

type Order = (a: SheetPiece, b: SheetPiece) => number;
const ORDERS: Order[] = [
  (a, b) => b.l * b.w - a.l * a.w,
  (a, b) => Math.max(b.l, b.w) - Math.max(a.l, a.w),
  (a, b) => b.w - a.w || b.l - a.l,
  (a, b) => b.l - a.l || b.w - a.w,
];

function nestOnce(pieces: SheetPiece[], o: NestOptions, order: Order, splitRule: 'short' | 'long'): NestResult {
  const L = o.sheetLength - 2 * o.trim;
  const W = o.sheetWidth - 2 * o.trim;
  const sheets: WorkSheet[] = [];
  const oversize: SheetPiece[] = [];
  const sorted = [...pieces].sort(order);
  const fits = (p: SheetPiece, rot: boolean) => (rot ? p.w <= L && p.l <= W : p.l <= L && p.w <= W);

  for (const p of sorted) {
    const orients = p.grain || p.l === p.w ? [false] : [false, true];
    if (!orients.some((r) => fits(p, r))) {
      oversize.push(p);
      continue;
    }
    let best: { s: WorkSheet; ri: number; rot: boolean; score: number } | null = null;
    for (const s of sheets) {
      s.free.forEach((fr, ri) => {
        for (const rot of orients) {
          const dx = rot ? p.w : p.l;
          const dy = rot ? p.l : p.w;
          if (dx <= fr.w + 1e-9 && dy <= fr.h + 1e-9) {
            const score = Math.min(fr.w - dx, fr.h - dy);
            if (!best || score < best.score) best = { s, ri, rot, score };
          }
        }
      });
    }
    if (!best) {
      const s: WorkSheet = { free: [{ x: 0, y: 0, w: L, h: W }], placements: [] };
      sheets.push(s);
      const rot = orients.find((r) => fits(p, r))!;
      best = { s, ri: 0, rot, score: 0 };
    }
    const { s, ri, rot } = best as { s: WorkSheet; ri: number; rot: boolean };
    const fr = s.free[ri];
    const dx = rot ? p.w : p.l;
    const dy = rot ? p.l : p.w;
    s.placements.push({ piece: p, x: fr.x + o.trim, y: fr.y + o.trim, dx, dy, rotated: rot });
    s.free.splice(ri, 1);
    const k = o.kerf;
    const rw = fr.w - dx - k; // remaining to the right
    const rh = fr.h - dy - k; // remaining above
    // Guillotine split: choose which leftover gets the full length.
    const horizontalFirst = splitRule === 'short' ? fr.w - dx < fr.h - dy : fr.w - dx >= fr.h - dy;
    if (horizontalFirst) {
      if (rh > 0) s.free.push({ x: fr.x, y: fr.y + dy + k, w: fr.w, h: rh });
      if (rw > 0) s.free.push({ x: fr.x + dx + k, y: fr.y, w: rw, h: dy });
    } else {
      if (rw > 0) s.free.push({ x: fr.x + dx + k, y: fr.y, w: rw, h: fr.h });
      if (rh > 0) s.free.push({ x: fr.x, y: fr.y + dy + k, w: dx, h: rh });
    }
  }
  const usable = L * W;
  return {
    sheets: sheets.map((s) => ({
      length: o.sheetLength,
      width: o.sheetWidth,
      placements: s.placements,
      usage: s.placements.reduce((a, pl) => a + pl.dx * pl.dy, 0) / usable,
    })),
    oversize,
  };
}

/** Try several orderings and split rules, keep the best (fewest sheets, then emptiest last sheet). */
export function nestSheets(pieces: SheetPiece[], o: NestOptions): NestResult {
  // Pieces that only fit the untrimmed sheet (full formats, e.g. sheathing) use a sheet of their own
  // without edge trimming.
  const L = o.sheetLength, W = o.sheetWidth, iL = L - 2 * o.trim, iW = W - 2 * o.trim;
  const fitsIn = (p: SheetPiece, a: number, b: number) => (p.l <= a + 1e-6 && p.w <= b + 1e-6) || (!p.grain && p.w <= a + 1e-6 && p.l <= b + 1e-6);
  const fullFormat = pieces.filter((p) => !fitsIn(p, iL, iW) && fitsIn(p, L, W));
  const rest = pieces.filter((p) => !fullFormat.includes(p));
  const own: SheetLayout[] = fullFormat.map((p) => {
    const rot = !(p.l <= L + 1e-6 && p.w <= W + 1e-6);
    const dx = rot ? p.w : p.l, dy = rot ? p.l : p.w;
    return { length: L, width: W, placements: [{ piece: p, x: 0, y: 0, dx, dy, rotated: rot }], usage: (dx * dy) / (L * W) };
  });
  const nested = nestBest(rest, o);
  return { sheets: [...own, ...nested.sheets], oversize: nested.oversize };
}

function nestBest(pieces: SheetPiece[], o: NestOptions): NestResult {
  let best: NestResult | null = null;
  for (const order of ORDERS) {
    for (const rule of ['short', 'long'] as const) {
      const r = nestOnce(pieces, o, order, rule);
      if (!best) { best = r; continue; }
      const lastUse = (x: NestResult) => x.sheets.at(-1)?.usage ?? 0;
      if (r.sheets.length < best.sheets.length || (r.sheets.length === best.sheets.length && lastUse(r) < lastUse(best))) best = r;
    }
  }
  return best ?? { sheets: [], oversize: [] };
}

// ------------------------------------------------------------ linear

export interface BarPiece {
  id: string;
  label: string;
  length: number;
}

export interface Bar {
  stock: number;
  pieces: BarPiece[];
  waste: number;
}

export interface LinearResult {
  bars: Bar[];
  oversize: BarPiece[];
}

/** First-fit decreasing into stock bars, then shrink every bar to the shortest stock length that fits. */
export function nestLinear(pieces: BarPiece[], stockLengths: number[], kerf: number): LinearResult {
  const stocks = [...stockLengths].sort((a, b) => a - b);
  const maxStock = stocks.at(-1) ?? 0;
  const bars: { stock: number; used: number; pieces: BarPiece[] }[] = [];
  const oversize: BarPiece[] = [];
  for (const p of [...pieces].sort((a, b) => b.length - a.length)) {
    if (p.length > maxStock) {
      oversize.push(p);
      continue;
    }
    let target: (typeof bars)[number] | undefined;
    let bestRest = Infinity;
    for (const b of bars) {
      const rest = b.stock - b.used - (b.pieces.length ? kerf : 0) - p.length;
      if (rest >= -1e-9 && rest < bestRest) { bestRest = rest; target = b; }
    }
    if (!target) {
      target = { stock: maxStock, used: 0, pieces: [] };
      bars.push(target);
    }
    target.used += (target.pieces.length ? kerf : 0) + p.length;
    target.pieces.push(p);
  }
  return {
    bars: bars.map((b) => {
      const stock = stocks.find((s) => s >= b.used - 1e-9) ?? b.stock;
      return { stock, pieces: b.pieces, waste: stock - b.used };
    }),
    oversize,
  };
}
