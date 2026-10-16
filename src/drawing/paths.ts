// Parse and transform SVG path data as emitted by replicad (M, L, A, C, Q, Z).

export type Seg =
  | { c: 'M' | 'L'; x: number; y: number }
  | { c: 'A'; rx: number; ry: number; rot: number; large: number; sweep: number; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Q'; x1: number; y1: number; x: number; y: number }
  | { c: 'Z' };

export function parsePath(d: string): Seg[] {
  const tokens = d.match(/[MLACQZmlacqz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const out: Seg[] = [];
  let i = 0;
  let cmd = '';
  const n = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const tk = tokens[i];
    if (/[A-Za-z]/.test(tk)) {
      cmd = tk.toUpperCase();
      i++;
      if (cmd === 'Z') { out.push({ c: 'Z' }); continue; }
    }
    switch (cmd) {
      case 'M': out.push({ c: 'M', x: n(), y: n() }); cmd = 'L'; break;
      case 'L': out.push({ c: 'L', x: n(), y: n() }); break;
      case 'A': out.push({ c: 'A', rx: n(), ry: n(), rot: n(), large: n(), sweep: n(), x: n(), y: n() }); break;
      case 'C': out.push({ c: 'C', x1: n(), y1: n(), x2: n(), y2: n(), x: n(), y: n() }); break;
      case 'Q': out.push({ c: 'Q', x1: n(), y1: n(), x: n(), y: n() }); break;
      default: i++;
    }
  }
  return out;
}

/**
 * Projection paths come in SVG orientation (x = u, y = −v). Sheet placement is a plain
 * scale + translation: x = ox + px·s, y = oy + py·s (so oy is the sheet y of v = 0).
 */
export interface ViewTransform {
  ox: number;
  oy: number;
  s: number;
}

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

export function transformSegs(segs: Seg[], t: ViewTransform): Seg[] {
  const X = (u: number) => t.ox + u * t.s;
  const Y = (y: number) => t.oy + y * t.s;
  return segs.map((s) => {
    switch (s.c) {
      case 'M': case 'L': return { c: s.c, x: X(s.x), y: Y(s.y) };
      case 'A': return { c: 'A', rx: s.rx * t.s, ry: s.ry * t.s, rot: s.rot, large: s.large, sweep: s.sweep, x: X(s.x), y: Y(s.y) };
      case 'C': return { c: 'C', x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2), x: X(s.x), y: Y(s.y) };
      case 'Q': return { c: 'Q', x1: X(s.x1), y1: Y(s.y1), x: X(s.x), y: Y(s.y) };
      case 'Z': return s;
    }
  });
}

export function segsToD(segs: Seg[]): string {
  return segs.map((s) => {
    switch (s.c) {
      case 'M': case 'L': return `${s.c}${f(s.x)} ${f(s.y)}`;
      case 'A': return `A${f(s.rx)} ${f(s.ry)} ${f(s.rot)} ${s.large} ${s.sweep} ${f(s.x)} ${f(s.y)}`;
      case 'C': return `C${f(s.x1)} ${f(s.y1)} ${f(s.x2)} ${f(s.y2)} ${f(s.x)} ${f(s.y)}`;
      case 'Q': return `Q${f(s.x1)} ${f(s.y1)} ${f(s.x)} ${f(s.y)}`;
      case 'Z': return 'Z';
    }
  }).join(' ');
}

/** Approximate bounds of path data in path coordinates (x = u, y = −v). */
export function pathBounds(paths: string[]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const d of paths) {
    for (const s of parsePath(d)) {
      if (s.c === 'Z') continue;
      add(s.x, s.y);
      if (s.c === 'C') { add(s.x1, s.y1); add(s.x2, s.y2); }
      if (s.c === 'Q') add(s.x1, s.y1);
    }
  }
  return x0 === Infinity ? null : [x0, y0, x1, y1];
}

/** SVG arc (endpoint form) to centre form, used by the DXF writer. */
export function arcCenter(x1: number, y1: number, s: Extract<Seg, { c: 'A' }>): { cx: number; cy: number; r: number; a0: number; a1: number } {
  const { rx, x: x2, y: y2, large, sweep } = s;
  const r0 = Math.abs(rx);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  const r = Math.max(r0, Math.sqrt(d2));
  const sign = large === sweep ? -1 : 1;
  const k = sign * Math.sqrt(Math.max(0, (r * r - d2) / d2));
  const cxp = k * dy, cyp = -k * dx;
  const cx = cxp + (x1 + x2) / 2, cy = cyp + (y1 + y2) / 2;
  const a0 = Math.atan2(y1 - cy, x1 - cx);
  const a1 = Math.atan2(y2 - cy, x2 - cx);
  return { cx, cy, r, a0, a1 };
}
