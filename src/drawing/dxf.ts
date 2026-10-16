import { arcCenter, type Seg } from './paths';
import type { DrawnSheet } from './sheets';

// Minimal DXF R12 writer (ASCII) – lines, arcs, polylines for curves, texts.
// Sheets are placed side by side; y is flipped (DXF y up).

const LAYERS: Record<string, number> = { VISIBLE: 7, HIDDEN: 8, DIM: 3, TEXT: 7, FRAME: 5, THIN: 7, TABLE: 9, EDGE: 30 };

export function sheetsToDxf(sheets: DrawnSheet[]): string {
  const out: string[] = [];
  const g = (code: number, v: string | number) => out.push(String(code), typeof v === 'number' ? (Math.round(v * 1000) / 1000).toString() : v);
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$INSUNITS'); g(70, 4); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 2);
  g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0);
  g(0, 'LTYPE'); g(2, 'DASHED'); g(70, 0); g(3, '__ __ __'); g(72, 65); g(73, 2); g(40, 2.5); g(49, 1.6); g(49, -0.9);
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, Object.keys(LAYERS).length);
  for (const [name, color] of Object.entries(LAYERS)) { g(0, 'LAYER'); g(2, name); g(70, 0); g(62, color); g(6, name === 'HIDDEN' ? 'DASHED' : 'CONTINUOUS'); }
  g(0, 'ENDTAB'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  let offX = 0;
  for (const s of sheets) {
    const X = (x: number) => x + offX;
    const Y = (y: number) => s.h - y;
    for (const p of s.prims) {
      if (p.text) {
        g(0, 'TEXT'); g(8, 'TEXT'); g(10, X(p.text.x)); g(20, Y(p.text.y)); g(30, 0); g(40, p.text.h); g(1, p.text.s.replace(/\n/g, ' '));
        const h = p.text.anchor === 'middle' ? 1 : p.text.anchor === 'end' ? 2 : 0;
        if (h) { g(72, h); g(11, X(p.text.x)); g(21, Y(p.text.y)); g(31, 0); }
        continue;
      }
      const segs = p.segs ?? [];
      let cx = 0, cy = 0, sx = 0, sy = 0;
      const line = (x1: number, y1: number, x2: number, y2: number) => { g(0, 'LINE'); g(8, p.layer); g(10, X(x1)); g(20, Y(y1)); g(30, 0); g(11, X(x2)); g(21, Y(y2)); g(31, 0); };
      for (const sg of segs as Seg[]) {
        switch (sg.c) {
          case 'M': cx = sx = sg.x; cy = sy = sg.y; break;
          case 'L': line(cx, cy, sg.x, sg.y); cx = sg.x; cy = sg.y; break;
          case 'Z': if (cx !== sx || cy !== sy) line(cx, cy, sx, sy); cx = sx; cy = sy; break;
          case 'A': {
            const a = arcCenter(cx, cy, sg);
            // Flip to y-up: angles negate; SVG sweep=1 becomes clockwise, DXF arcs run counter-clockwise.
            const a0 = (-a.a0 * 180) / Math.PI, a1 = (-a.a1 * 180) / Math.PI;
            const [start, end] = sg.sweep === 1 ? [a1, a0] : [a0, a1];
            g(0, 'ARC'); g(8, p.layer); g(10, X(a.cx)); g(20, Y(a.cy)); g(30, 0); g(40, a.r); g(50, start); g(51, end);
            cx = sg.x; cy = sg.y;
            break;
          }
          case 'C': {
            let px = cx, py = cy;
            for (let i = 1; i <= 12; i++) {
              const t = i / 12, u = 1 - t;
              const x = u * u * u * cx + 3 * u * u * t * sg.x1 + 3 * u * t * t * sg.x2 + t * t * t * sg.x;
              const y = u * u * u * cy + 3 * u * u * t * sg.y1 + 3 * u * t * t * sg.y2 + t * t * t * sg.y;
              line(px, py, x, y); px = x; py = y;
            }
            cx = sg.x; cy = sg.y;
            break;
          }
          case 'Q': {
            let px = cx, py = cy;
            for (let i = 1; i <= 8; i++) {
              const t = i / 8, u = 1 - t;
              const x = u * u * cx + 2 * u * t * sg.x1 + t * t * sg.x;
              const y = u * u * cy + 2 * u * t * sg.y1 + t * t * sg.y;
              line(px, py, x, y); px = x; py = y;
            }
            cx = sg.x; cy = sg.y;
            break;
          }
        }
      }
    }
    offX += s.w + 20;
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return out.join('\r\n');
}
