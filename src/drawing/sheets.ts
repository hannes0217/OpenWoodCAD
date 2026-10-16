import { findHardware, findMaterial, materialName } from '../core/catalog';
import { elementCorners } from '../core/elements';
import type { EvalElement, Evaluated } from '../core/evaluate';
import type { PartRow } from '../core/lists';
import { neg, norm, type Vec3 } from '../core/math';
import type { ProjectInfo } from '../core/model';
import type { Production } from '../core/production';
import type { Projection } from '../geom/kernel';
import type { ViewSpec } from '../geom/protocol';
import { featureStations } from './features';
import { pathBounds } from './paths';
import { LW, Sheet, fitScale, scaleLabel, type DxfPrim, type SheetFormat, type TitleInfo } from './sheet';

export type Projector = (elements: EvalElement[], views: ViewSpec[]) => Promise<Projection[]>;
export type Translate = (key: string, args?: Record<string, string | number>) => string;

export interface DrawnSheet {
  id: string;
  title: string;
  svg: string;
  prims: DxfPrim[];
  w: number;
  h: number;
}

export interface DrawingOptions {
  format: SheetFormat;
  lang: 'de' | 'en';
  date: string;
  project: ProjectInfo;
  t: Translate;
  projector: Projector;
  include: { overview: boolean; views: boolean; parts: boolean; lists: boolean; nesting: boolean };
  /** Overview image (PNG data URL from the 3D view), optional. */
  snapshot?: string | null;
  onProgress?: (done: number, total: number) => void;
}

/**
 * OCCT projection camera: `eye` points from the object towards the viewer, x = horizontal
 * drawing axis, vertical axis = eye × x. Paths come back as (u, −v).
 */
const cam = (position: Vec3, eye: Vec3, xAxis: Vec3): ViewSpec => ({ kind: 'camera', position, direction: eye, xAxis });
const ISO_EYE: Vec3 = norm([-1, -1, 0.9]);
const ISO_X: Vec3 = norm([1, -1, 0]);
const r1 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString());

function modelBounds(els: EvalElement[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const e of els) for (const c of elementCorners(e)) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], c[i]); max[i] = Math.max(max[i], c[i]); }
  return { min, max };
}

export async function generateDrawings(ev: Evaluated, prod: Production, o: DrawingOptions): Promise<DrawnSheet[]> {
  const t = o.t;
  const de = o.lang === 'de';
  const els = ev.elements.filter((e) => !e.hidden);
  const sheets: { sheet: Sheet; title: string }[] = [];
  const baseInfo = (title: string, scale: string): TitleInfo => ({ project: o.project.name, customer: o.project.customer, author: o.project.author, title, scale, date: o.date, sheet: '' });
  const matName = (id: string) => { try { return materialName(findMaterial(ev.catalog, id), o.lang); } catch { return id; } };
  if (els.length === 0) return [];
  const { min, max } = modelBounds(els);
  const W = max[0] - min[0], D = max[1] - min[1], H = max[2] - min[2];

  // ------------------------------------------------------------ overview
  if (o.include.overview) {
    const s = new Sheet(o.format, baseInfo(de ? 'Übersicht' : 'Overview', '–'));
    const iso = (await o.projector(els, [cam([0, 0, 0], ISO_EYE, ISO_X)]))[0];
    const b = pathBounds(iso.visible) ?? [0, 0, 1, 1];
    const tableW = 150;
    const avail = { x: s.area.x, y: s.area.y + 8, w: s.area.w - tableW - 10, h: s.area.h - 8 };
    const bw = b[2] - b[0], bh = b[3] - b[1];
    const k = Math.min(avail.w / bw, avail.h / bh) * 0.92;
    const ox = avail.x + (avail.w - bw * k) / 2 - b[0] * k;
    const oy = avail.y + (avail.h - bh * k) / 2 - b[1] * k;
    s.text(s.area.x, s.area.y + 4, o.project.name, { size: 6, weight: 'bold' });
    s.view(iso, { ox, oy, s: k }, { hidden: false, lw: 0.35 });
    const rows = prod.rows.slice(0, 38).map((r) => [String(r.pos), r.names[0], String(r.qty), `${r1(r.length)}×${r1(r.width)}×${r1(r.height)}`]);
    s.text(s.area.x + s.area.w - tableW, s.area.y + 4, de ? 'Positionen' : 'Positions', { size: 3.5, weight: 'bold' });
    s.table(s.area.x + s.area.w - tableW, s.area.y + 8, [{ label: 'Pos', w: 12, align: 'c' }, { label: de ? 'Bezeichnung' : 'Name', w: 66 }, { label: de ? 'Stk' : 'Qty', w: 12, align: 'r' }, { label: 'L×B×H', w: 60, align: 'r' }], rows, 5, 2.4);
    const tot = `${de ? 'Außenmaße' : 'Overall'}: ${r1(W)} × ${r1(D)} × ${r1(H)} mm`;
    s.text(s.area.x, s.area.y + s.area.h, tot, { size: 3 });
    sheets.push({ sheet: s, title: de ? 'Übersicht' : 'Overview' });
  }

  // ------------------------------------------------------------- views
  if (o.include.views) {
    const s0 = new Sheet(o.format, baseInfo('', ''));
    const dm = 16, gap = 30;
    const ratio = fitScale(W + D + 0, H + D, s0.area.w - 2 * dm - gap, s0.area.h - 2 * dm - gap);
    const sc = 1 / ratio;
    const s = new Sheet(o.format, baseInfo(de ? 'Ansichten' : 'Views', scaleLabel(ratio)));
    const [front, side, top] = await o.projector(els, [
      cam([0, 0, 0], [0, -1, 0], [1, 0, 0]),
      cam([0, 0, 0], [-1, 0, 0], [0, -1, 0]),
      cam([0, 0, 0], [0, 0, 1], [1, 0, 0]),
    ]);
    const fx = s.area.x + dm + 8, fy = s.area.y + dm;
    const fW = W * sc, fH = H * sc, dW = D * sc;
    // front: u = x, v = z
    s.view(front, { ox: fx - min[0] * sc, oy: fy + max[2] * sc, s: sc }, { hidden: false });
    s.text(fx, fy - 11, de ? 'Vorderansicht' : 'Front view', { size: 3, weight: 'bold' });
    s.dim(fx, fy, fx + fW, fy, -5, r1(W), 'h');
    s.dim(fx, fy, fx, fy + fH, -6, r1(H), 'v');
    // side (from left): u = -y, v = z
    const sx = fx + fW + gap;
    s.view(side, { ox: sx + max[1] * sc, oy: fy + max[2] * sc, s: sc }, { hidden: false });
    s.text(sx, fy - 11, de ? 'Seitenansicht von links' : 'Left side view', { size: 3, weight: 'bold' });
    s.dim(sx, fy, sx + dW, fy, -5, r1(D), 'h');
    s.dim(sx + dW, fy, sx + dW, fy + fH, 6, r1(H), 'v');
    // top: u = x, v = y
    const ty = fy + fH + gap;
    s.view(top, { ox: fx - min[0] * sc, oy: ty + max[1] * sc, s: sc }, { hidden: false });
    // isometric view in the free area right of the top view / below the side view
    const isoBox = { x: sx, y: ty, w: s.area.x + s.area.w - sx, h: s.area.y + s.area.h - ty };
    if (isoBox.w > 60 && isoBox.h > 50) {
      const iso = (await o.projector(els, [cam([0, 0, 0], ISO_EYE, ISO_X)]))[0];
      const b = pathBounds(iso.visible);
      if (b) {
        const k = Math.min((isoBox.w - 10) / (b[2] - b[0]), (isoBox.h - 10) / (b[3] - b[1]), sc * 1.2);
        s.view(iso, { ox: isoBox.x + (isoBox.w - (b[2] - b[0]) * k) / 2 - b[0] * k, oy: isoBox.y + (isoBox.h - (b[3] - b[1]) * k) / 2 - b[1] * k, s: k }, { hidden: false, lw: 0.35 });
      }
    }
    s.text(fx, ty - 3, de ? 'Draufsicht' : 'Top view', { size: 3, weight: 'bold' });
    s.dim(fx, ty, fx, ty + dW, -6, r1(D), 'v');
    // fronts chain (furniture)
    const fronts = els.filter((e) => e.role === 'front' || e.role === 'door');
    if (fronts.length > 1) {
      const zs = new Set<number>();
      for (const f of fronts) {
        const cs = elementCorners(f);
        zs.add(Math.round(Math.min(...cs.map((c) => c[2])) * 10) / 10);
        zs.add(Math.round(Math.max(...cs.map((c) => c[2])) * 10) / 10);
      }
      zs.add(Math.round(min[2] * 10) / 10);
      zs.add(Math.round(max[2] * 10) / 10);
      const list = [...zs].sort((a, b) => b - a);
      const ys = list.map((z) => fy + (max[2] - z) * sc);
      s.chain(ys, fx - 16, 'v', list.slice(0, -1).map((z, i) => r1(z - list[i + 1])));
    }
    sheets.push({ sheet: s, title: de ? 'Ansichten' : 'Views' });
  }

  // ------------------------------------------------------------- parts
  if (o.include.parts) {
    const reps = prod.rows.map((r) => ({ row: r, el: ev.elements.find((e) => e.id === r.elementIds[0])! })).filter((x) => x.el);
    const isLong = (e: EvalElement) => (e.length > 6 * Math.max(e.width, e.height) && e.length > 600) || (e.kind === 'panel' && e.all.some((p) => p.geom === 'drill'));
    const groups: { long: boolean; items: typeof reps }[] = [];
    for (const it of reps) {
      const long = isLong(it.el);
      const last = groups.at(-1);
      const cap = long ? (it.el.kind === 'panel' ? 2 : 3) : 4;
      if (last && last.long === long && last.items.length < cap) last.items.push(it);
      else groups.push({ long, items: [it] });
    }
    let done = 0;
    for (const g of groups) {
      const s = new Sheet(o.format, baseInfo(de ? 'Werkstattzeichnungen' : 'Workshop drawings', de ? 'siehe Teil' : 'see part'));
      const cols = g.long ? 1 : 2;
      const rowsN = g.long ? (g.items[0].el.kind === 'panel' ? 2 : 3) : 2;
      const cw = s.area.w / cols, ch = s.area.h / rowsN;
      for (let i = 0; i < g.items.length; i++) {
        const cx = s.area.x + (i % cols) * cw, cy = s.area.y + Math.floor(i / cols) * ch;
        await drawPart(s, { x: cx, y: cy, w: cw, h: ch }, g.items[i].row, g.items[i].el, o, matName);
        o.onProgress?.(++done, reps.length);
      }
      // cell separators
      for (let c = 1; c < cols; c++) s.line(s.area.x + c * cw, s.area.y, s.area.x + c * cw, s.area.y + s.area.h, 0.15, { color: '#aaa', layer: 'FRAME' });
      for (let r = 1; r < rowsN; r++) s.line(s.area.x, s.area.y + r * ch, s.area.x + s.area.w, s.area.y + r * ch, 0.15, { color: '#aaa', layer: 'FRAME' });
      sheets.push({ sheet: s, title: `${de ? 'Teile' : 'Parts'} ${g.items.map((x) => x.row.pos).join(', ')}` });
    }
  }

  // ------------------------------------------------------------- lists
  if (o.include.lists) {
    const cols = [
      { label: 'Pos', w: 12, align: 'c' as const }, { label: de ? 'Bezeichnung' : 'Name', w: 70 }, { label: de ? 'Stk' : 'Qty', w: 12, align: 'r' as const },
      { label: de ? 'Länge' : 'Length', w: 22, align: 'r' as const }, { label: de ? 'Breite' : 'Width', w: 22, align: 'r' as const }, { label: de ? 'Dicke' : 'Thick.', w: 18, align: 'r' as const },
      { label: de ? 'Material' : 'Material', w: 88 }, { label: de ? 'Kanten' : 'Edges', w: 18 }, { label: 'm³', w: 18, align: 'r' as const }, { label: de?'Roh kg':'Raw kg', w: 18, align: 'r' as const },
      { label: de ? 'Bearbeitungen' : 'Processings', w: 72 },
    ];
    const rows = prod.rows.map((r) => [String(r.pos), r.names.join(' / '), String(r.qty), r1(r.length), r1(r.width), r1(r.height), matName(r.materialId), r.edges.join(' '), (r.volume * r.qty).toFixed(3), (r.weight * r.qty).toFixed(1), Object.entries(r.processings).map(([k, n]) => `${n}×${t(`proc.${k}`)}`).join(', ')]);
    const perPage = Math.floor((new Sheet(o.format, baseInfo('', '')).area.h - 20) / 5);
    for (let p = 0; p * perPage < Math.max(rows.length, 1); p++) {
      const s = new Sheet(o.format, baseInfo(de ? 'Stückliste' : 'Parts list', '–'));
      s.text(s.area.x, s.area.y + 5, de ? 'Stückliste' : 'Parts list', { size: 5, weight: 'bold' });
      const scaleW = Math.min(1, s.area.w / cols.reduce((a, c) => a + c.w, 0));
      s.table(s.area.x, s.area.y + 10, cols.map((c) => ({ ...c, w: c.w * scaleW })), rows.slice(p * perPage, (p + 1) * perPage), 5, 2.4);
      sheets.push({ sheet: s, title: `${de ? 'Stückliste' : 'Parts list'} ${p + 1}` });
    }
    // hardware + shopping
    const s = new Sheet(o.format, baseInfo(de ? 'Beschläge & Einkauf' : 'Hardware & shopping', '–'));
    s.text(s.area.x, s.area.y + 5, de ? 'Einkaufsliste' : 'Shopping list', { size: 5, weight: 'bold' });
    if(!prod.cost.complete)s.text(s.area.x,s.area.y+10,t('safe.unpriced',{n:prod.unavailable.length}),{size:2.2,color:'#b42318'});
    const shopRows = prod.shopping.map((r) => {
      let name = r.itemId;
      try { name = r.kind === 'sheet' || r.kind === 'timber' ? matName(r.itemId) : materialName(findHardware(ev.catalog, r.itemId), o.lang); } catch { /* keep id */ }
      return [name, r.detail ?? '', String(r.qty), r.unitPrice.toFixed(2), r.total.toFixed(2)];
    });
    const y = s.table(s.area.x, s.area.y + (prod.cost.complete?10:17), [{ label: de ? 'Artikel' : 'Item', w: 150 }, { label: 'Details', w: 70 }, { label: de ? 'Menge' : 'Qty', w: 20, align: 'r' }, { label: de ? 'Einzel €' : 'Unit €', w: 25, align: 'r' }, { label: de ? 'Summe €' : 'Total €', w: 25, align: 'r' }], shopRows, 5, 2.5);
    s.text(s.area.x + 290, y + 6, `${de ? 'Summe' : 'Total'}: ${prod.shopping.reduce((a, r) => a + r.total, 0).toFixed(2)} €`, { size: 3.2, weight: 'bold', anchor: 'end' });
    if (ev.notes.length) {
      s.text(s.area.x, y + 16, de ? 'Hinweise zur Ausführung' : 'Notes', { size: 3.5, weight: 'bold' });
      ev.notes.forEach((nt, i) => s.text(s.area.x, y + 22 + i * 5, `• ${t(nt.key, nt.args)}`, { size: 2.5 }));
    }
    sheets.push({ sheet: s, title: de ? 'Einkaufsliste' : 'Shopping list' });
  }

  // ------------------------------------------------------------- nesting
  if (o.include.nesting) {
    const layouts = prod.sheets.flatMap((sn) => sn.result.sheets.map((l, i) => ({ mat: sn.materialId, l, i, n: sn.result.sheets.length })));
    for (let p = 0; p < layouts.length; p += 2) {
      const s = new Sheet(o.format, baseInfo(de ? 'Zuschnittplan' : 'Cutting plan', '–'));
      const slot = s.area.h / 2;
      layouts.slice(p, p + 2).forEach((it, k) => {
        const y0 = s.area.y + k * slot;
        const sc = Math.min((s.area.w - 10) / it.l.length, (slot - 16) / it.l.width);
        s.text(s.area.x, y0 + 5, `${matName(it.mat)} – ${de ? 'Platte' : 'Sheet'} ${it.i + 1}/${it.n} (${it.l.length} × ${it.l.width} mm, ${Math.round(it.l.usage * 100)} %)`, { size: 3.2, weight: 'bold' });
        const ox = s.area.x, oy = y0 + 9;
        s.rect(ox, oy, it.l.length * sc, it.l.width * sc, 0.35, '#f1e7d5');
        for (const pl of it.l.placements) {
          const x = ox + pl.x * sc, y = oy + (it.l.width - pl.y - pl.dy) * sc;
          s.rect(x, y, pl.dx * sc, pl.dy * sc, 0.3, '#fffdf6');
          const fs = Math.min(4, pl.dy * sc * 0.4, pl.dx * sc * 0.3);
          if (fs > 1.2) s.text(x + (pl.dx * sc) / 2, y + (pl.dy * sc) / 2 + fs * 0.35, pl.piece.label, { size: fs, anchor: 'middle', weight: 'bold' });
          const fd = Math.min(2.4, pl.dy * sc * 0.18);
          if (fd > 1.1 && pl.dx * sc > 18) s.text(x + (pl.dx * sc) / 2, y + (pl.dy * sc) / 2 + fs * 0.35 + fd + 0.8, `${r1(pl.rotated ? pl.dy : pl.dx)}×${r1(pl.rotated ? pl.dx : pl.dy)}`, { size: fd, anchor: 'middle' });
        }
      });
      sheets.push({ sheet: s, title: `${de ? 'Zuschnitt' : 'Cutting'} ${p / 2 + 1}` });
    }
    if (prod.linear.length) {
      const s = new Sheet(o.format, baseInfo(de ? 'Holz-Zuschnitt' : 'Timber cutting', '–'));
      s.text(s.area.x, s.area.y + 5, de ? 'Zuschnitt Stabware (Handelslängen)' : 'Linear stock cutting', { size: 5, weight: 'bold' });
      let y = s.area.y + 12;
      for (const l of prod.linear) {
        if (y > s.area.y + s.area.h - 10) break;
        s.text(s.area.x, y, `${matName(l.materialId)} ${l.section[0]}×${l.section[1]}`, { size: 3, weight: 'bold' });
        y += 3;
        const maxStock = Math.max(...l.result.bars.map((b) => b.stock), 1);
        const k = (s.area.w - 40) / maxStock;
        for (const b of l.result.bars) {
          if (y > s.area.y + s.area.h - 8) break;
          s.text(s.area.x, y + 4, String(b.stock), { size: 2.4 });
          let x = s.area.x + 18;
          s.rect(x, y, b.stock * k, 5.5, 0.25, '#eee');
          for (const pc of b.pieces) {
            s.rect(x, y, pc.length * k, 5.5, 0.25, '#ead6ad');
            if (pc.length * k > 8) s.text(x + (pc.length * k) / 2, y + 3.9, `${pc.label} (${pc.length})`, { size: 2.2, anchor: 'middle' });
            x += pc.length * k;
          }
          y += 7;
        }
        y += 4;
      }
      sheets.push({ sheet: s, title: de ? 'Holz-Zuschnitt' : 'Timber cutting' });
    }
  }

  const total = sheets.length;
  return sheets.map((x, i) => {
    x.sheet.info.sheet = `${i + 1} / ${total}`;
    x.sheet.info.drawingNo = `${(o.project.name || 'P').slice(0, 12).toUpperCase().replace(/\s+/g, '-')}-${String(i + 1).padStart(2, '0')}`;
    const svg = x.sheet.toSVG();
    return { id: `s${i + 1}`, title: x.title, svg, prims: x.sheet.prims, w: x.sheet.w, h: x.sheet.h };
  });
}

/** Workshop drawing of one position inside a cell. */
async function drawPart(s: Sheet, cell: { x: number; y: number; w: number; h: number }, row: PartRow, e: EvalElement, o: DrawingOptions, matName: (id: string) => string) {
  const de = o.lang === 'de';
  const f = e.frame;
  const L = e.length, Wd = e.width, Ht = e.height;
  const holes = e.all.filter((p) => p.geom === 'drill');
  const isPanel = e.kind === 'panel';
  const showTable = isPanel && holes.length > 0;
  const tableW = showTable ? 62 : 0;
  const pad = 4, header = 10, dm = 12, gap = 14;
  const availW = cell.w - 2 * pad - tableW - dm * 2 - gap;
  const availH = cell.h - header - 2 * pad - dm * 2 - gap;
  const withEnd = !isPanel;
  const ratio = fitScale(L + (withEnd ? Wd : 0), Wd + Ht, availW, availH);
  const sc = 1 / ratio;
  const [topV, frontV, endV] = await o.projector([e], [
    cam(f.o, f.z, f.x),
    cam(f.o, neg(f.y), f.x),
    cam(f.o, neg(f.x), neg(f.y)),
  ]);
  // header
  s.text(cell.x + pad, cell.y + pad + 3.5, `Pos. ${row.pos} – ${row.names.join(' / ')}`, { size: 3.6, weight: 'bold' });
  s.text(cell.x + cell.w - pad, cell.y + pad + 3.5, `${row.qty} ${de ? 'Stk.' : 'pcs'} · ${scaleLabel(ratio)}`, { size: 3, anchor: 'end' });
  s.text(cell.x + pad, cell.y + pad + 8, `${r1(L)} × ${r1(Wd)} × ${r1(Ht)} mm · ${matName(e.materialId)}`, { size: 2.5, color: '#333' });
  // top view (u = x, v = y)
  const tx = cell.x + pad + dm + 4, ty = cell.y + header + pad + dm;
  s.view(topV, { ox: tx, oy: ty + Wd * sc, s: sc });
  s.dim(tx, ty, tx + L * sc, ty, -5, r1(L), 'h');
  s.dim(tx, ty, tx, ty + Wd * sc, -5, r1(Wd), 'v');
  // edge banding marks
  const eb = row.edges;
  const off = 0.9;
  const edgeLine = (x1: number, y1: number, x2: number, y2: number) => s.line(x1, y1, x2, y2, LW.edge, { color: '#b5651d', layer: 'EDGE' });
  if (eb.includes('x0')) edgeLine(tx - off, ty, tx - off, ty + Wd * sc);
  if (eb.includes('x1')) edgeLine(tx + L * sc + off, ty, tx + L * sc + off, ty + Wd * sc);
  if (eb.includes('y0')) edgeLine(tx, ty + Wd * sc + off, tx + L * sc, ty + Wd * sc + off);
  if (eb.includes('y1')) edgeLine(tx, ty - off, tx + L * sc, ty - off);
  // grain arrow
  if (row.grain) {
    const gy = ty + Wd * sc / 2, gx = tx + L * sc / 2;
    const gl = Math.min(18, L * sc * 0.3);
    s.line(gx - gl / 2, gy, gx + gl / 2, gy, 0.2, { color: '#888', layer: 'THIN' });
    s.text(gx, gy - 1, de ? 'Faser' : 'grain', { size: 1.8, anchor: 'middle', color: '#888' });
  }
  // front view below (u = x, v = z)
  const fy = ty + Wd * sc + gap;
  s.view(frontV, { ox: tx, oy: fy + Ht * sc, s: sc });
  s.dim(tx, fy, tx, fy + Ht * sc, -5, r1(Ht), 'v');
  // end view to the right of the top view (u = −y, v = z)
  if (withEnd) {
    const ex = tx + L * sc + gap;
    s.view(endV, { ox: ex + Wd * sc, oy: fy + Ht * sc, s: sc });
  }
  // feature stations along x under the front view (beams) or above (panels without table)
  const stations = featureStations(e, e.all, 0);
  if (!showTable && stations.length > 2 && stations.length < 40) {
    const xs = stations.map((v) => tx + v * sc);
    s.chain(xs, fy + Ht * sc + 6, 'h', stations.slice(0, -1).map((v, i) => r1(stations[i + 1] - v)), 2);
  }
  // hole table
  if (showTable) {
    const rows = holes.slice(0, Math.floor((cell.h - header - 2 * pad - 8) / 4)).map((h) => {
      const g = h as Extract<typeof h, { geom: 'drill' }>;
      const face = Math.abs(g.dir[2]) > 0.9 ? (g.dir[2] < 0 ? 'A' : 'B') : Math.abs(g.dir[0]) > 0.9 ? (g.dir[0] > 0 ? 'x0' : 'x1') : g.dir[1] > 0 ? 'y0' : 'y1';
      return [r1(g.p[0]), r1(g.p[1]), r1(g.p[2]), `Ø${r1(g.dia)}`, g.through ? (de ? 'durch' : 'thru') : r1(g.depth), face];
    });
    s.text(cell.x + cell.w - pad - tableW, cell.y + cell.h - pad - 1, de ? 'Seite A = Oberseite, B = Unterseite, x0/x1/y0/y1 = Kanten' : 'Side A = top, B = bottom, x0/x1/y0/y1 = edges', { size: 1.8, color: '#555' });
    s.table(cell.x + cell.w - pad - tableW, cell.y + header + pad, [{ label: 'x', w: 10, align: 'r' }, { label: 'y', w: 10, align: 'r' }, { label: 'z', w: 9, align: 'r' }, { label: 'Ø', w: 10, align: 'r' }, { label: de ? 'Tiefe' : 'Depth', w: 12, align: 'r' }, { label: de ? 'Seite' : 'Side', w: 11, align: 'c' }], rows, 4, 2);
    if (rows.length < holes.length) s.text(cell.x + cell.w - pad - tableW, cell.y + cell.h - pad, `+ ${holes.length - rows.length} ${de ? 'weitere' : 'more'}`, { size: 2 });
  }
  // processings summary for beams
  if (!isPanel) {
    const txt = Object.entries(row.processings).map(([k, n]) => `${n}× ${o.t(`proc.${k}`)}`).join(', ');
    if (txt) s.text(cell.x + pad, cell.y + cell.h - pad, txt, { size: 2.2, color: '#333' });
  }

}
