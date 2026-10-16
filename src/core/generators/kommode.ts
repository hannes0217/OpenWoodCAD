import { findMaterial } from '../catalog';
import { createBoxElement } from '../elements';
import { dirToLocal, norm, toLocal, type Vec3 } from '../math';
import type { Element, Joint, JointType, ParamValue } from '../model';
import { emptyOutput, num, str, type GeneratorDef } from './types';

const SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600];
const SLIDE_CLEARANCE = 12.5;

const floorTo = (v: number, step: number) => Math.floor(v / step + 1e-9) * step;
const r05 = (v: number) => Math.round(v * 2) / 2;

/** Drill a hole given in world coordinates into an element. */
export function drillWorld(e: Element, id: string, p: Vec3, dir: Vec3, dia: number, depth: number, through: boolean): void {
  e.processings.push({ id, type: 'drilling', geom: 'drill', p: toLocal(e.frame, p), dir: norm(dirToLocal(e.frame, dir)), dia, depth, through, info: { dia, depth } });
}

export const kommode: GeneratorDef = {
  type: 'kommode',
  category: 'furniture',
  params: [
    { id: 'width', group: 'dimensions', type: 'number', default: 800, min: 300, max: 2400, step: 1, unit: 'mm' },
    { id: 'height', group: 'dimensions', type: 'number', default: 850, min: 300, max: 1600, step: 1, unit: 'mm' },
    { id: 'depth', group: 'dimensions', type: 'number', default: 450, min: 250, max: 750, step: 1, unit: 'mm' },
    { id: 'overhang', group: 'construction', type: 'number', default: 15, min: 0, max: 60, step: 1, unit: 'mm' },
    { id: 'plinth', group: 'construction', type: 'number', default: 80, min: 0, max: 250, step: 1, unit: 'mm' },
    { id: 'plinthSetback', group: 'construction', type: 'number', default: 30, min: 0, max: 100, step: 1, unit: 'mm' },
    { id: 'joinery', group: 'construction', type: 'select', default: 'dowel', options: ['dowel', 'confirmat', 'screw'] },
    { id: 'drawers', group: 'drawers', type: 'number', default: 4, min: 1, max: 10, step: 1 },
    { id: 'layout', group: 'drawers', type: 'select', default: 'equal', options: ['equal', 'graduated'] },
    { id: 'gap', group: 'drawers', type: 'number', default: 3, min: 1, max: 8, step: 0.5, unit: 'mm' },
    { id: 'handle', group: 'drawers', type: 'select', default: 'handle_128', options: ['none', 'knob', 'handle_96', 'handle_128', 'handle_160'] },
    { id: 'handlePos', group: 'drawers', type: 'select', default: 'center', options: ['center', 'top'] },
    { id: 'bodyMaterial', group: 'materials', type: 'material', default: 'chip19_white', category: 'sheet' },
    { id: 'topMaterial', group: 'materials', type: 'material', default: 'chip19_white', category: 'sheet' },
    { id: 'frontMaterial', group: 'materials', type: 'material', default: 'chip19_white', category: 'sheet' },
    { id: 'backMaterial', group: 'materials', type: 'material', default: 'hdf3_white', category: 'sheet' },
    { id: 'drawerMaterial', group: 'materials', type: 'material', default: 'ply_poplar12', category: 'sheet' },
    { id: 'drawerBottomMaterial', group: 'materials', type: 'material', default: 'ply_poplar6', category: 'sheet' },
  ],

  build(p, ctx) {
    const out = emptyOutput();
    const id = (s: string) => `${ctx.id}/${s}`;
    const mat = (k: string) => findMaterial(ctx.catalog, str(p, k));
    const body = mat('bodyMaterial'), topM = mat('topMaterial'), frontM = mat('frontMaterial');
    const backM = mat('backMaterial'), drawerM = mat('drawerMaterial'), bottomM = mat('drawerBottomMaterial');
    const t = body.thickness!, tt = topM.thickness!, tf = frontM.thickness!, tb = backM.thickness!;
    const td = drawerM.thickness!, tdb = bottomM.thickness!;
    const W = num(p, 'width'), H = num(p, 'height'), D = num(p, 'depth');
    const o = num(p, 'overhang'), s = num(p, 'plinth'), setback = num(p, 'plinthSetback');
    const n = Math.round(num(p, 'drawers')), g = num(p, 'gap');
    const joinery = str(p, 'joinery') as JointType;

    const Wb = W - 2 * o;
    const yb0 = o + tf;
    const Ds = D - o - tf - tb;
    const Hs = H - tt;
    if (Wb < 2 * t + 100 || Ds < 150 || Hs < s + t + 80) {
      out.warnings.push({ key: 'warn.dimensionsTooSmall' });
      return out;
    }
    const x0 = o, x1 = o + Wb;
    const add = (e: Element) => (out.elements.push(e), e);
    const joint = (type: JointType, a: Element, b: Element, params: Record<string, ParamValue> = {}): Joint => {
      const j: Joint = { id: id(`j-${a.id.split('/').pop()}-${b.id.split('/').pop()}`), type, a: a.id, b: b.id, params, generator: ctx.id };
      out.joints.push(j);
      return j;
    };
    const common = { generator: ctx.id };

    // ---------------------------------------------------------- carcass
    const sideL = add(createBoxElement([x0, yb0, 0], [t, Ds, Hs], { ...common, id: id('side-l'), name: 'Seite links', role: 'side', materialId: body.id, grain: 'z', band: { y: 'min' } }));
    const sideR = add(createBoxElement([x1 - t, yb0, 0], [t, Ds, Hs], { ...common, id: id('side-r'), name: 'Seite rechts', role: 'side', materialId: body.id, grain: 'z', band: { y: 'min' } }));
    const top = add(createBoxElement([0, 0, Hs], [W, D, tt], { ...common, id: id('top'), name: 'Deckplatte', role: 'top', materialId: topM.id, grain: 'x', band: { y: 'min', x: 'both' } }));
    const zBottom = s > 0 ? s : 0;
    const bottom = add(createBoxElement([x0 + t, yb0, zBottom], [Wb - 2 * t, Ds, t], { ...common, id: id('bottom'), name: 'Boden', role: 'bottom', materialId: body.id, grain: 'x', band: { y: 'min' } }));
    const back = add(createBoxElement([x0, yb0 + Ds, 0], [Wb, tb, Hs], { ...common, id: id('back'), name: 'Rückwand', role: 'back', materialId: backM.id, grain: Wb >= Hs ? 'x' : 'z', thick: 'y' }));

    for (const side of [sideL, sideR]) joint(joinery, bottom, side);
    for (const side of [sideL, sideR]) joint('dowel', side, top);
    if (s > 0) {
      const pf = add(createBoxElement([x0 + t, yb0 + setback, 0], [Wb - 2 * t, t, s], { ...common, id: id('plinth-f'), name: 'Sockelblende', role: 'plinth', materialId: body.id, grain: 'x', thick: 'y' }));
      const pb = add(createBoxElement([x0 + t, yb0 + Ds - t, 0], [Wb - 2 * t, t, s], { ...common, id: id('plinth-b'), name: 'Sockelleiste hinten', role: 'plinth', materialId: body.id, grain: 'x', thick: 'y' }));
      for (const pl of [pf, pb]) for (const side of [sideL, sideR]) joint(joinery, pl, side);
      joint('screw', pb, back, { size: '3x16', spacing: 150 });
    } else {
      out.hardware.push({ itemId: 'glides', qty: 1, source: ctx.id });
    }
    for (const e of [sideL, sideR, bottom]) joint('screw', e, back, { size: '3x16', spacing: 150 });

    // ---------------------------------------------------------- fronts
    const zf0 = s > 0 ? s : 2;
    const zf1 = Hs - g;
    const avail = zf1 - zf0 - (n - 1) * g;
    const weights = Array.from({ length: n }, (_, i) => (str(p, 'layout') === 'graduated' ? Math.pow(1.15, i) : 1));
    const wsum = weights.reduce((a, b) => a + b, 0);
    const equal = str(p, 'layout') !== 'graduated';
    const heights = weights.map((w) => (equal ? floorTo((avail * w) / wsum, 0.5) : r05((avail * w) / wsum)));
    if (!equal) heights[n - 1] = r05(avail - heights.slice(0, n - 1).reduce((a, b) => a + b, 0));
    // Equal fronts stay identical; the rounding rest goes into the gap below the top.
    const rest = avail - heights.reduce((a, b) => a + b, 0);
    if (Math.min(...heights) < 60) out.warnings.push({ key: 'warn.frontTooLow' });

    const innerZ0 = zBottom + t;
    const innerZ1 = Hs;
    const Di = Ds;
    const slide = [...SLIDE_LENGTHS].reverse().find((l) => l <= Di - 10);
    const Ls = slide ?? floorTo(Di - 10, 10);
    if (!slide) out.warnings.push({ key: 'warn.noSlide', args: { depth: Math.round(Di) } });
    const xb0 = x0 + t + SLIDE_CLEARANCE;
    const Bw = Wb - 2 * t - 2 * SLIDE_CLEARANCE;
    const xb1 = xb0 + Bw;
    const handle = str(p, 'handle');
    const holeSpacing = handle.startsWith('handle_') ? Number(handle.split('_')[1]) : 0;

    let zTop = zf1 - rest;
    for (let i = 0; i < n; i++) {
      const fh = heights[i];
      const f1 = zTop;
      const f0 = f1 - fh;
      zTop = f0 - g;
      const motion = { group: id(`drawer-${i + 1}`), dir: [0, -1, 0] as Vec3, travel: Ls * 0.9 };
      const nr = i + 1;
      const front = add(createBoxElement([x0 + g / 2, o, f0], [Wb - g, tf, fh], { ...common, id: id(`front-${nr}`), name: `Front ${nr}`, role: 'front', materialId: frontM.id, grain: 'x', thick: 'y', band: { x: 'both', z: 'both' } }));
      front.motion = motion;

      const low = Math.max(f0, innerZ0);
      const high = Math.min(f1 + g, innerZ1);
      const z0 = low + 5;
      const hb = floorTo(high - low - 5 - 15 - tdb, 5);
      if (hb < 50) {
        out.warnings.push({ key: 'warn.drawerTooLow', args: { n: nr } });
        continue;
      }
      const zs = z0 + tdb;
      const part = (sfx: string, name: string, role: string, min: Vec3, size: Vec3, grain: 'x' | 'y' | 'z', m = drawerM.id, thick?: 'x' | 'y' | 'z') => {
        const e = add(createBoxElement(min, size, { ...common, id: id(`d${nr}-${sfx}`), name: `${name} ${nr}`, role, materialId: m, grain, thick }));
        e.motion = motion;
        return e;
      };
      const dBottom = part('bottom', 'Schubkastenboden', 'drawerBottom', [xb0, yb0, z0], [Bw, Ls, tdb], 'x', bottomM.id, 'z');
      const dSideL = part('side-l', 'Schubkastenseite links', 'drawerSide', [xb0, yb0, zs], [td, Ls, hb], 'y', drawerM.id, 'x');
      const dSideR = part('side-r', 'Schubkastenseite rechts', 'drawerSide', [xb1 - td, yb0, zs], [td, Ls, hb], 'y', drawerM.id, 'x');
      const dFront = part('front', 'Schubkastenvorderstück', 'drawerFront', [xb0 + td, yb0, zs], [Bw - 2 * td, td, hb], 'x', drawerM.id, 'y');
      const dBack = part('back', 'Schubkastenhinterstück', 'drawerBack', [xb0 + td, yb0 + Ls - td, zs], [Bw - 2 * td, td, hb], 'x', drawerM.id, 'y');
      for (const piece of [dFront, dBack]) for (const side of [dSideL, dSideR]) joint('screw', piece, side, { size: '4x30', spacing: 120 });
      for (const piece of [dSideL, dSideR, dFront, dBack]) joint('screw', piece, dBottom, { size: '3x16', spacing: 150 });

      out.hardware.push({ itemId: `slide_${Ls}`, qty: 1, source: ctx.id }, { itemId: 'screw_4x16', qty: 12, source: ctx.id }, { itemId: 'screw_4x25', qty: 4, source: ctx.id });
      out.mounting.push({ label: { key: 'mount.drawerBottom', args: { n: nr } }, value: Math.round((z0 - innerZ0) * 10) / 10 });

      // Handle holes through the front and the drawer front.
      if (handle !== 'none') {
        const cx = (x0 + x1) / 2;
        const cz = str(p, 'handlePos') === 'top' ? f1 - Math.min(45, fh / 4) : (f0 + f1) / 2;
        const xs = holeSpacing ? [cx - holeSpacing / 2, cx + holeSpacing / 2] : [cx];
        xs.forEach((x, k) => {
          drillWorld(front, `${front.id}:h${k}`, [x, o, cz], [0, 1, 0], 5, tf, true);
          if (cz > zs && cz < zs + hb) drillWorld(dFront, `${dFront.id}:h${k}`, [x, yb0, cz], [0, 1, 0], 5, td, true);
        });
        out.hardware.push({ itemId: handle, qty: 1, source: ctx.id });
      }
    }
    out.hardware.push({ itemId: 'glue', qty: 1, source: ctx.id });
    out.notes.push({ key: 'note.kommode.order' }, { key: 'note.kommode.slides', args: { clearance: SLIDE_CLEARANCE, length: Ls } });
    return out;
  },
};
