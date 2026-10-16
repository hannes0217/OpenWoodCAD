import { parsePath, segsToD, transformSegs, type Seg, type ViewTransform } from './paths';

export type SheetFormat = 'A4' | 'A3' | 'A2';

export const FORMATS: Record<SheetFormat, [number, number]> = { A4: [297, 210], A3: [420, 297], A2: [594, 420] };

export const SCALES = [1, 2, 2.5, 5, 10, 15, 20, 25, 50, 75, 100, 200, 250, 500];

export interface TitleInfo {
  project: string;
  title: string;
  scale: string;
  date: string;
  author?: string;
  customer?: string;
  sheet: string;
  drawingNo?: string;
}

/** Collected primitives for DXF export (sheet coordinates, mm, y down). */
export interface DxfPrim {
  layer: string;
  segs?: Seg[];
  text?: { x: number; y: number; h: number; s: string; anchor: 'start' | 'middle' | 'end'; rotate?: number };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => (Math.round(v * 100) / 100).toString();

export const LW = { frame: 0.7, visible: 0.5, thin: 0.25, hidden: 0.25, dim: 0.18, edge: 1.2 };

export class Sheet {
  readonly w: number;
  readonly h: number;
  private out: string[] = [];
  readonly prims: DxfPrim[] = [];
  /** Usable drawing area (inside frame, above/left of title block). */
  readonly area: { x: number; y: number; w: number; h: number };
  readonly titleBlock = { w: 180, h: 32 };

  constructor(public format: SheetFormat, public info: TitleInfo, public titleText = 'OpenWoodCAD') {
    [this.w, this.h] = FORMATS[format];
    this.area = { x: 25, y: 15, w: this.w - 25 - 10 - 5, h: this.h - 15 - 10 - this.titleBlock.h - 5 };
  }

  raw(svg: string) {
    this.out.push(svg);
  }

  line(x1: number, y1: number, x2: number, y2: number, lw = LW.thin, opts: { dash?: string; color?: string; layer?: string } = {}) {
    this.out.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${opts.color ?? '#000'}" stroke-width="${lw}"${opts.dash ? ` stroke-dasharray="${opts.dash}"` : ''} stroke-linecap="round"/>`);
    this.prims.push({ layer: opts.layer ?? 'THIN', segs: [{ c: 'M', x: x1, y: y1 }, { c: 'L', x: x2, y: y2 }] });
  }

  rect(x: number, y: number, w: number, h: number, lw = LW.thin, fill = 'none', layer = 'THIN', stroke = '#000') {
    this.out.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${lw}"/>`);
    this.prims.push({ layer, segs: [{ c: 'M', x, y }, { c: 'L', x: x + w, y }, { c: 'L', x: x + w, y: y + h }, { c: 'L', x, y: y + h }, { c: 'Z' }] });
  }

  text(x: number, y: number, s: string, opts: { size?: number; anchor?: 'start' | 'middle' | 'end'; weight?: 'normal' | 'bold'; color?: string; rotate?: number } = {}) {
    const size = opts.size ?? 3;
    const anchor = opts.anchor ?? 'start';
    const rot = opts.rotate ? ` transform="rotate(${opts.rotate} ${n(x)} ${n(y)})"` : '';
    this.out.push(`<text x="${n(x)}" y="${n(y)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" text-anchor="${anchor}" font-weight="${opts.weight ?? 'normal'}" fill="${opts.color ?? '#000'}"${rot}>${esc(s)}</text>`);
    this.prims.push({ layer: 'TEXT', text: { x, y, h: size * 0.72, s, anchor, rotate: opts.rotate } });
  }

  path(segs: Seg[], lw: number, opts: { dash?: string; color?: string; fill?: string; layer?: string } = {}) {
    if (!segs.length) return;
    this.out.push(`<path d="${segsToD(segs)}" fill="${opts.fill ?? 'none'}" stroke="${opts.color ?? '#000'}" stroke-width="${lw}"${opts.dash ? ` stroke-dasharray="${opts.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`);
    this.prims.push({ layer: opts.layer ?? 'VISIBLE', segs });
  }

  /** Place projected paths (u right, v up) at sheet position with scale factor s (= 1 / ratio). */
  view(paths: { visible: string[]; hidden: string[] }, t: ViewTransform, opts: { hidden?: boolean; lw?: number } = {}) {
    if (opts.hidden !== false) for (const d of paths.hidden) this.path(transformSegs(parsePath(d), t), LW.hidden, { dash: '1.6 0.9', color: '#555', layer: 'HIDDEN' });
    for (const d of paths.visible) this.path(transformSegs(parsePath(d), t), opts.lw ?? LW.visible, { layer: 'VISIBLE' });
  }

  private arrow(x: number, y: number, dx: number, dy: number) {
    const L = 2.2, W = 0.7;
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l;
    const p = (a: number, b: number) => `${n(a)},${n(b)}`;
    this.prims.push({layer:'DIM',segs:[{c:'M',x,y},{c:'L',x:x-ux*L-uy*W,y:y-uy*L+ux*W},{c:'L',x:x-ux*L+uy*W,y:y-uy*L-ux*W},{c:'Z'}]});
    this.out.push(`<polygon points="${p(x, y)} ${p(x - ux * L - uy * W, y - uy * L + ux * W)} ${p(x - ux * L + uy * W, y - uy * L - ux * W)}" fill="#000" stroke="none"/>`);
  }

  /** Linear dimension between two points along a direction (horizontal or vertical). */
  dim(x1: number, y1: number, x2: number, y2: number, offset: number, label: string, orient: 'h' | 'v', size = 2.5) {
    if (orient === 'h') {
      const yy = offset < 0 ? Math.min(y1, y2) + offset : Math.max(y1, y2) + offset;
      this.line(x1, y1 + Math.sign(offset) * 1, x1, yy + Math.sign(offset) * 1.5, LW.dim, { layer: 'DIM' });
      this.line(x2, y2 + Math.sign(offset) * 1, x2, yy + Math.sign(offset) * 1.5, LW.dim, { layer: 'DIM' });
      this.line(x1, yy, x2, yy, LW.dim, { layer: 'DIM' });
      const w = Math.abs(x2 - x1);
      if (w > 6) {
        this.arrow(Math.min(x1, x2), yy, -1, 0);
        this.arrow(Math.max(x1, x2), yy, 1, 0);
      }
      const tw = label.length * size * 0.55;
      const tx = w > tw + 2 ? (x1 + x2) / 2 : Math.max(x1, x2) + tw / 2 + 1.5;
      this.text(tx, yy - 0.8, label, { size, anchor: 'middle' });
    } else {
      const xx = offset < 0 ? Math.min(x1, x2) + offset : Math.max(x1, x2) + offset;
      this.line(x1 + Math.sign(offset) * 1, y1, xx + Math.sign(offset) * 1.5, y1, LW.dim, { layer: 'DIM' });
      this.line(x2 + Math.sign(offset) * 1, y2, xx + Math.sign(offset) * 1.5, y2, LW.dim, { layer: 'DIM' });
      this.line(xx, y1, xx, y2, LW.dim, { layer: 'DIM' });
      const h = Math.abs(y2 - y1);
      if (h > 6) {
        this.arrow(xx, Math.min(y1, y2), 0, -1);
        this.arrow(xx, Math.max(y1, y2), 0, 1);
      }
      const tw = label.length * size * 0.55;
      const ty = h > tw + 2 ? (y1 + y2) / 2 : Math.min(y1, y2) - tw / 2 - 1.5;
      this.text(xx - 0.8, ty, label, { size, anchor: 'middle', rotate: -90 });

    }
  }

  /** Aligned measurement in drawing-plane coordinates. */
  dimAligned(x1: number, y1: number, x2: number, y2: number, offset: number, label: string) {
    const length=Math.hypot(x2-x1,y2-y1); if(length<1e-6)return;
    const dx=(x2-x1)/length,dy=(y2-y1)/length,nx=-dy*offset,ny=dx*offset;
    this.line(x1,y1,x1+nx,y1+ny,LW.dim,{layer:'DIM'});this.line(x2,y2,x2+nx,y2+ny,LW.dim,{layer:'DIM'});
    this.line(x1+nx,y1+ny,x2+nx,y2+ny,LW.dim,{layer:'DIM'});
    this.arrow(x1+nx,y1+ny,-dx,-dy);this.arrow(x2+nx,y2+ny,dx,dy);
    let angle=Math.atan2(dy,dx)*180/Math.PI;if(angle>90)angle-=180;if(angle< -90)angle+=180;
    this.text((x1+x2)/2+nx,(y1+y2)/2+ny-1,label,{size:2.5,anchor:'middle',rotate:angle});
  }

  /** Chain of dimensions along one line through sorted sheet positions; short segments get staggered labels. */
  chain(positions: number[], fixed: number, orient: 'h' | 'v', labels: string[], size = 2.2) {
    const pts = positions.filter((p, i) => i === 0 || Math.abs(p - positions[i - 1]) > 0.01);
    if (pts.length < 2) return;
    const lab = labels.filter((_, i) => i === 0 || Math.abs(positions[i] - positions[i - 1]) > 0.01);
    const a0 = pts[0], a1 = pts[pts.length - 1];
    if (orient === 'h') this.line(a0, fixed, a1, fixed, LW.dim, { layer: 'DIM' });
    else this.line(fixed, a0, fixed, a1, LW.dim, { layer: 'DIM' });
    for (const p of pts) {
      // oblique tick (architectural style) keeps short segments readable
      if (orient === 'h') this.line(p - 0.8, fixed + 0.8, p + 0.8, fixed - 0.8, 0.3, { layer: 'DIM' });
      else this.line(fixed - 0.8, p + 0.8, fixed + 0.8, p - 0.8, 0.3, { layer: 'DIM' });
    }
    let lastEnd = -Infinity;
    let row = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const txt = lab[i] ?? '';
      const tw = txt.length * size * 0.55;
      const mid = (a + b) / 2;
      if (Math.abs(b - a) >= tw + 1) row = 0;
      else row = mid - tw / 2 < lastEnd ? (row + 1) % 3 : 0;
      const off = 0.8 + row * (size + 0.6);
      if (orient === 'h') this.text(mid, fixed - off, txt, { size, anchor: 'middle' });
      else this.text(fixed - off, mid, txt, { size, anchor: 'middle', rotate: -90 });
      lastEnd = mid + tw / 2;
    }
  }

  table(x: number, y: number, cols: { label: string; w: number; align?: 'l' | 'r' | 'c' }[], rows: string[][], rowH = 5, size = 2.6): number {
    const total = cols.reduce((s, c) => s + c.w, 0);
    this.rect(x, y, total, rowH, LW.thin, '#efe9df', 'TABLE');
    let cx = x;
    for (const c of cols) {
      this.text(cx + (c.align === 'r' ? c.w - 1.2 : c.align === 'c' ? c.w / 2 : 1.2), y + rowH * 0.7, c.label, { size, weight: 'bold', anchor: c.align === 'r' ? 'end' : c.align === 'c' ? 'middle' : 'start' });
      cx += c.w;
    }
    let cy = y + rowH;
    for (const r of rows) {
      cx = x;
      r.forEach((cell, i) => {
        const c = cols[i];
        if (!c) return;
        const maxChars = Math.floor(c.w / (size * 0.52));
        const s = cell.length > maxChars ? cell.slice(0, Math.max(1, maxChars - 1)) + '…' : cell;
        this.text(cx + (c.align === 'r' ? c.w - 1.2 : c.align === 'c' ? c.w / 2 : 1.2), cy + rowH * 0.7, s, { size, anchor: c.align === 'r' ? 'end' : c.align === 'c' ? 'middle' : 'start' });
        cx += c.w;
      });
      this.line(x, cy + rowH, x + total, cy + rowH, 0.12, { color: '#999', layer: 'TABLE' });
      cy += rowH;
    }
    this.rect(x, y, total, cy - y, LW.thin, 'none', 'TABLE');
    cx = x;
    for (const c of cols.slice(0, -1)) {
      cx += c.w;
      this.line(cx, y, cx, cy, 0.12, { color: '#999', layer: 'TABLE' });
    }
    return cy;
  }

  private frameAndTitle() {
    const { w, h } = this;
    this.rect(20, 10, w - 30, h - 20, LW.frame, 'none', 'FRAME');
    // centring marks
    for (const [x1, y1, x2, y2] of [[w / 2, 5, w / 2, 10], [w / 2, h - 10, w / 2, h - 5], [15, h / 2, 20, h / 2], [w - 10, h / 2, w - 5, h / 2]]) this.line(x1, y1, x2, y2, LW.frame, { layer: 'FRAME' });
    const tb = this.titleBlock;
    const x = w - 10 - tb.w, y = h - 10 - tb.h;
    this.rect(x, y, tb.w, tb.h, LW.frame, '#fff', 'FRAME');
    const i = this.info;
    const cell = (cx: number, cy: number, cw: number, ch: number, label: string, value: string, big = false) => {
      this.rect(cx, cy, cw, ch, LW.thin, 'none', 'FRAME');
      this.text(cx + 1.2, cy + 2.6, label, { size: 1.8, color: '#555' });
      this.text(cx + 1.2, cy + ch - 1.8, value, { size: big ? 4 : 2.8, weight: big ? 'bold' : 'normal' });
    };
    cell(x, y, 110, 12, 'Benennung / Title', i.title, true);
    cell(x + 110, y, 70, 12, 'Projekt / Project', i.project);
    cell(x, y + 12, 55, 10, 'Kunde / Client', i.customer ?? '');
    cell(x + 55, y + 12, 55, 10, 'Bearbeiter / Drawn', i.author ?? '');
    cell(x + 110, y + 12, 35, 10, 'Maßstab / Scale', i.scale);
    cell(x + 145, y + 12, 35, 10, 'Blatt / Sheet', i.sheet);
    cell(x, y + 22, 55, 10, 'Datum / Date', i.date);
    cell(x + 55, y + 22, 55, 10, 'Zeichnungs-Nr. / No.', i.drawingNo ?? '');
    cell(x + 110, y + 22, 70, 10, 'Software', this.titleText);
  }

  toSVG(): string {
    const body = this.out.join('\n');
    const frame = new Sheet(this.format, this.info, this.titleText);
    frame.frameAndTitle();
    this.prims.push(...frame.prims);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}mm" height="${this.h}mm" viewBox="0 0 ${this.w} ${this.h}">\n<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#fff"/>\n${frame.out.join('\n')}\n${body}\n</svg>`;
  }
}

/** Largest standard scale (smallest ratio) so that the content fits. Returns the ratio denominator. */
export function fitScale(contentW: number, contentH: number, availW: number, availH: number, min = 1): number {
  for (const s of SCALES) {
    if (s < min) continue;
    if (contentW / s <= availW && contentH / s <= availH) return s;
  }
  return SCALES[SCALES.length - 1];
}

export const scaleLabel = (ratio: number) => (ratio === 1 ? '1:1' : `1:${ratio}`);
