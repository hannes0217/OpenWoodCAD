import { add, dot, scale, sub, type Vec3 } from '../core/math';

export type PlaneChoice = 'auto' | 'xy' | 'xz' | 'yz';
export interface WorkPlane { o: Vec3; u: Vec3; v: Vec3; n: Vec3; elementId?: string }
export interface SnapEdge { a: Vec3; b: Vec3; id: string }

/** Arithmetic only: no eval, variables, calls, or implicit executable input.
 * Bare values use the field's base unit (mm or degrees). Unit suffixes convert
 * numeric literals before arithmetic, e.g. 1m + 2*19mm. */
export function parseMeasure(text: string, kind: 'length' | 'angle' = 'length'): number {
  if (!text.trim() || text.length > 256) throw new Error('Invalid expression');
  const input = text.toLowerCase().replace(/,/g, '.');
  let pos = 0, depth = 0;
  const space = () => { while (/\s/.test(input[pos] ?? '') && pos < input.length) pos++; };
  const consume = (ch: string) => { space(); if (input[pos] !== ch) return false; pos++; return true; };
  const primary = (): number => {
    if (++depth > 32) throw new Error('Expression too complex');
    let value: number;
    if (consume('+')) value = primary();
    else if (consume('-')) value = -primary();
    else if (consume('(')) { value = sum(); if (!consume(')')) throw new Error('Missing parenthesis'); }
    else {
      space();
      const token = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(input.slice(pos));
      if (!token) throw new Error('Expected number');
      pos += token[0].length; value = Number(token[0]); space();
      const unit = /^(mm|cm|m|in|deg|°)/.exec(input.slice(pos));
      if (unit) {
        const factors: Record<string, number> = kind === 'length' ? { mm: 1, cm: 10, m: 1000, in: 25.4 } : { deg: 1, '°': 1 };
        if (!(unit[0] in factors)) throw new Error('Wrong unit');
        value *= factors[unit[0]]; pos += unit[0].length;
      }
    }
    depth--; return value;
  };
  const product = (): number => {
    let value = primary();
    while (true) {
      if (consume('*')) value *= primary();
      else if (consume('/')) { const divisor = primary(); if (divisor === 0) throw new Error('Division by zero'); value /= divisor; }
      else return value;
    }
  };
  const sum = (): number => {
    let value = product();
    while (true) { if (consume('+')) value += product(); else if (consume('-')) value -= product(); else return value; }
  };
  const value = sum(); space();
  if (pos !== input.length || !Number.isFinite(value) || Math.abs(value) > (kind === 'length' ? 1e7 : 36000)) throw new Error('Invalid result');
  return value;
}

export function parseToolDimensions(text: string, rectangle: boolean): { length: number; width?: number; angle?: number } {
  const parts = text.split(rectangle ? /[x×;]/i : /@/);
  if (parts.length > 2 || rectangle && parts.length !== 2) throw new Error('Expected dimensions');
  const length = parseMeasure(parts[0]);
  if (length <= 0) throw new Error('Length must be positive');
  if (rectangle) {
    const width = parseMeasure(parts[1]);
    if (width <= 0) throw new Error('Width must be positive');
    return { length, width };
  }
  return { length, ...(parts.length === 2 ? { angle: parseMeasure(parts[1], 'angle') } : {}) };
}

export function standardPlane(choice: PlaneChoice, offset: number): WorkPlane {
  if (choice === 'xz') return { o: [0, offset, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] };
  if (choice === 'yz') return { o: [offset, 0, 0], u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] };
  return { o: [0, 0, offset], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
}

/** Point on a finite segment closest to a forward ray. Used on actual OCCT
 * edge polylines, not on bounding-box edges or triangle diagonals. */
export function closestEdgePoint(edge: SnapEdge, ray: { origin: Vec3; dir: Vec3 }, plane?: WorkPlane | null): Vec3 | null {
  const d = sub(edge.b, edge.a), length2 = dot(d, d);
  if (length2 < 1e-16) return null;
  if (plane) {
    const da = dot(sub(edge.a, plane.o), plane.n), db = dot(sub(edge.b, plane.o), plane.n);
    if (Math.abs(da) > 1e-3 || Math.abs(db) > 1e-3) {
      if (da * db > 0 || Math.abs(da - db) < 1e-10) return null;
      return add(edge.a, scale(d, da / (da - db)));
    }
  }
  const w = sub(edge.a, ray.origin), b = dot(d, ray.dir), c = dot(ray.dir, ray.dir), e = dot(ray.dir, w);
  const den = length2 * c - b * b;
  let t = Math.abs(den) < 1e-12 ? 0 : (b * e - c * dot(d, w)) / den;
  t = Math.max(0, Math.min(1, t));
  let p = add(edge.a, scale(d, t));
  if (dot(sub(p, ray.origin), ray.dir) < 0) { t = Math.max(0, Math.min(1, -dot(d, w) / length2)); p = add(edge.a, scale(d, t)); }
  return p;
}

/** Reject degenerate, touching and crossing non-adjacent outline edges. */
export function validOutline(points: [number, number][]): boolean {
  if (points.length < 3 || points.length > 2000 || points.some(p => p.some(v => !Number.isFinite(v)))) return false;
  const cross2 = (a: number[], b: number[], c: number[]) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const on = (a: number[], b: number[], c: number[]) => Math.abs(cross2(a,b,c)) < 1e-7 && c[0]>=Math.min(a[0],b[0])-1e-7 && c[0]<=Math.max(a[0],b[0])+1e-7 && c[1]>=Math.min(a[1],b[1])-1e-7 && c[1]<=Math.max(a[1],b[1])+1e-7;
  let area = 0;
  for (let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length];
    if (Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6) return false;
    area+=a[0]*b[1]-b[0]*a[1];
    for (let j=i+1;j<points.length;j++) {
      if (j===i+1 || i===0 && j===points.length-1) continue;
      const c=points[j], d=points[(j+1)%points.length];
      if (on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b) || cross2(a,b,c)*cross2(a,b,d)<0 && cross2(c,d,a)*cross2(c,d,b)<0) return false;
    }
  }
  return Math.abs(area)>1e-3;
}
