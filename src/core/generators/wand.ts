import { findMaterial } from '../catalog';
import { createBoxElement } from '../elements';
import type { Element, Joint, JointType, ParamValue, Processing } from '../model';
import { emptyOutput, num, str, type GenParams, type GeneratorDef } from './types';

interface Opening {
  kind: 'window' | 'door';
  x: number;
  w: number;
  h: number;
  sill: number;
}

const openingParams = (n: number) => [
  { id: `o${n}Type`, group: 'openings', type: 'select' as const, default: n === 1 ? 'window' : 'none', options: ['none', 'window', 'door'] },
  { id: `o${n}X`, group: 'openings', type: 'number' as const, default: n === 1 ? 1200 : 2800, min: 0, max: 20000, step: 5, unit: 'mm', visible: (p: GenParams) => p[`o${n}Type`] !== 'none' },
  { id: `o${n}Width`, group: 'openings', type: 'number' as const, default: n === 1 ? 1010 : 885, min: 300, max: 6000, step: 5, unit: 'mm', visible: (p: GenParams) => p[`o${n}Type`] !== 'none' },
  { id: `o${n}Height`, group: 'openings', type: 'number' as const, default: n === 1 ? 1260 : 2135, min: 300, max: 3000, step: 5, unit: 'mm', visible: (p: GenParams) => p[`o${n}Type`] !== 'none' },
  { id: `o${n}Sill`, group: 'openings', type: 'number' as const, default: 900, min: 0, max: 2500, step: 5, unit: 'mm', visible: (p: GenParams) => p[`o${n}Type`] === 'window' },
];

/**
 * Timber frame wall (Holzrahmenbau): sole plate, top plate(s), studs on a grid,
 * openings with king/jack studs, header, sill and cripples, optional OSB sheathing.
 * Wall runs along x, thickness along y (outside = −y), z up.
 */
export const wand: GeneratorDef = {
  type: 'wand',
  category: 'carpentry',
  params: [
    { id: 'length', group: 'dimensions', type: 'number', default: 4000, min: 600, max: 15000, step: 5, unit: 'mm' },
    { id: 'height', group: 'dimensions', type: 'number', default: 2600, min: 1000, max: 4000, step: 5, unit: 'mm' },
    { id: 'studWidth', group: 'members', type: 'number', default: 60, min: 40, max: 120, step: 5, unit: 'mm' },
    { id: 'studDepth', group: 'members', type: 'number', default: 160, min: 60, max: 300, step: 5, unit: 'mm' },
    { id: 'spacing', group: 'members', type: 'number', default: 625, min: 300, max: 1000, step: 5, unit: 'mm' },
    { id: 'topPlates', group: 'members', type: 'select', default: 'single', options: ['single', 'double'] },
    { id: 'headerHeight', group: 'members', type: 'number', default: 200, min: 100, max: 400, step: 5, unit: 'mm' },
    { id: 'timber', group: 'materials', type: 'material', default: 'kvh_c24', category: 'timber' },
    { id: 'sheathing', group: 'materials', type: 'select', default: 'outside', options: ['none', 'outside', 'both'] },
    { id: 'sheathingMaterial', group: 'materials', type: 'material', default: 'osb18', category: 'sheet' },
    ...openingParams(1),
    ...openingParams(2),
  ],

  build(p, ctx) {
    const out = emptyOutput();
    const id = (s: string) => `${ctx.id}/${s}`;
    const L = num(p, 'length'), H = num(p, 'height');
    const b = num(p, 'studWidth'), d = num(p, 'studDepth'), sp = num(p, 'spacing');
    const nTop = str(p, 'topPlates') === 'double' ? 2 : 1;
    const hh = num(p, 'headerHeight');
    const timber = findMaterial(ctx.catalog, str(p, 'timber'));
    const sheet = findMaterial(ctx.catalog, str(p, 'sheathingMaterial'));
    const c = { generator: ctx.id, kind: 'beam' as const, materialId: timber.id };
    const add = (e: Element) => (out.elements.push(e), e);
    const joint = (type: JointType, a: Element, bb: Element, params: Record<string, ParamValue> = {}): Joint => {
      const j: Joint = { id: id(`j-${a.id.split('/').pop()}-${bb.id.split('/').pop()}`), type, a: a.id, b: bb.id, params, generator: ctx.id };
      out.joints.push(j);
      return j;
    };
    const zTop = H - nTop * b; // underside of the top plate
    const openings: Opening[] = [];
    for (const n of [1, 2]) {
      const kind = str(p, `o${n}Type`);
      if (kind === 'none') continue;
      const o: Opening = { kind: kind as Opening['kind'], x: num(p, `o${n}X`), w: num(p, `o${n}Width`), h: num(p, `o${n}Height`), sill: kind === 'door' ? 0 : num(p, `o${n}Sill`) };
      const z1 = b + o.sill + o.h;
      if (o.x < 2 * b || o.x + o.w > L - 2 * b || z1 + hh > zTop) {
        out.warnings.push({ key: 'warn.openingOutside', args: { n } });
        continue;
      }
      openings.push(o);
    }
    openings.sort((a, b2) => a.x - b2.x);
    for (let i = 1; i < openings.length; i++) if (openings[i].x - 2 * b < openings[i - 1].x + openings[i - 1].w + 2 * b) out.warnings.push({ key: 'warn.openingsOverlap' });

    // sole plate (split at doors)
    let segStart = 0;
    const soles: Element[] = [];
    const doorCuts = openings.filter((o) => o.kind === 'door');
    for (const dc of [...doorCuts, null]) {
      const end = dc ? dc.x : L;
      if (end - segStart > 10) soles.push(add(createBoxElement([segStart, 0, 0], [end - segStart, d, b], { ...c, id: id(`sole-${soles.length + 1}`), name: 'Schwelle', role: 'plate', grain: 'x', thick: 'z' })));
      if (dc) segStart = dc.x + dc.w;
    }
    const tops: Element[] = [];
    for (let k = 0; k < nTop; k++) tops.push(add(createBoxElement([0, 0, H - (k + 1) * b], [L, d, b], { ...c, id: id(`top-${k + 1}`), name: k === 0 ? 'Rähm' : 'Rähm 2', role: 'plate', grain: 'x', thick: 'z' })));
    const topPlate = tops[tops.length - 1];
    const soleUnder = (x: number) => soles.find((s) => x >= s.frame.o[0] - 0.01 && x <= s.frame.o[0] + s.length + 0.01);

    // regular stud axis positions
    const axes: number[] = [b / 2];
    for (let x = sp; x < L - b; x += sp) axes.push(x);
    axes.push(L - b / 2);
    const blocked = (xc: number) => openings.some((o) => xc + b / 2 > o.x - 2 * b - 1 && xc - b / 2 < o.x + o.w + 2 * b + 1);
    let n = 0;
    const stud = (x0: number, z0: number, z1: number, name: string, role = 'stud') => {
      const e = add(createBoxElement([x0, 0, z0], [b, d, z1 - z0], { ...c, id: id(`stud-${++n}`), name, role, grain: 'z', thick: 'x' }));
      return e;
    };
    // Headers are too high for 120 mm screws: use 8 × 300 timber screws through them.
    const size = (x: Element) => (x.role === 'header' ? '8x300' : '6x120');
    const fix = (e: Element, below: Element | undefined, above: Element | undefined) => {
      if (below) joint('screw', e, below, { size: size(below), spacing: 1000 });
      if (above) joint('screw', e, above, { size: size(above), spacing: 1000 });
    };
    for (const xc of axes) {
      if (blocked(xc)) continue;
      const x0 = Math.max(0, Math.min(L - b, xc - b / 2));
      fix(stud(x0, b, zTop, 'Ständer'), soleUnder(x0 + b / 2), topPlate);
    }
    openings.forEach((o, oi) => {
      const nr = oi + 1;
      const z0 = b + o.sill;
      const z1 = z0 + o.h;
      // king studs (full height) and jack studs (carry the header)
      fix(stud(o.x - 2 * b, b, zTop, `Ständer Öffnung ${nr}`), soleUnder(o.x - 1.5 * b), topPlate);
      fix(stud(o.x + o.w + b, b, zTop, `Ständer Öffnung ${nr}`), soleUnder(o.x + o.w + 1.5 * b), topPlate);
      const jl = stud(o.x - b, b, z1, `Auflagerständer ${nr}`);
      const jr = stud(o.x + o.w, b, z1, `Auflagerständer ${nr}`);
      const header = add(createBoxElement([o.x - b, 0, z1], [o.w + 2 * b, d, hh], { ...c, id: id(`header-${nr}`), name: `Sturz ${nr}`, role: 'header', grain: 'x', thick: 'y' }));
      fix(jl, soleUnder(o.x - b / 2), header);
      fix(jr, soleUnder(o.x + o.w + b / 2), header);
      // cripples above the header
      const topGap = zTop - (z1 + hh);
      const inner = axes.filter((xc) => xc - b / 2 > o.x && xc + b / 2 < o.x + o.w);
      if (topGap > 30) for (const xc of inner) fix(stud(xc - b / 2, z1 + hh, zTop, `Füllständer ${nr}`, 'nogging'), header, topPlate);
      if (o.kind === 'window') {
        const sill = add(createBoxElement([o.x, 0, z0 - b], [o.w, d, b], { ...c, id: id(`sill-${nr}`), name: `Brüstungsriegel ${nr}`, role: 'nogging', grain: 'x', thick: 'z' }));
        joint('screw', sill, jl, { size: '6x120', spacing: 1000 });
        joint('screw', sill, jr, { size: '6x120', spacing: 1000 });
        if (z0 - b - b > 30) for (const xc of inner) fix(stud(xc - b / 2, b, z0 - b, `Füllständer ${nr}`, 'nogging'), soleUnder(xc), sill);
      }
    });

    // sheathing panels (vertical sheets), cut around openings
    const sides = str(p, 'sheathing') === 'both' ? ['out', 'in'] : str(p, 'sheathing') === 'outside' ? ['out'] : [];
    const ts = sheet.thickness!;
    const sw = sheet.sheetWidth ?? 1250;
    let area = 0;
    // Sheets stand upright (sheet length vertical). If the wall is higher than a sheet, a second
    // row is added; its vertical joints are offset by half a sheet so they land on other studs.
    const sl = sheet.sheetLength ?? 2500;
    let k = 0;
    for (const side of sides) {
      for (let row = 0, z = 0; z < H - 1; row++, z += sl) {
        const h = Math.min(sl, H - z);
        const xs: number[] = [];
        for (let x = row % 2 ? -sw / 2 : 0; x < L - 1; x += sw) xs.push(x);
        for (const xRaw of xs) {
          const x = Math.max(0, xRaw);
          const w = Math.min(xRaw + sw, L) - x;
          if (w < 1) continue;
          const y0 = side === 'out' ? -ts : d;
          const panel = createBoxElement([x, y0, z], [w, ts, h], { generator: ctx.id, id: id(`osb-${side}-${++k}`), name: side === 'out' ? 'Beplankung außen' : 'Beplankung innen', role: 'board', materialId: sheet.id, grain: 'z', thick: 'y' });
          // through cut-outs for openings (local: x = height above panel bottom, y = along wall)
          for (const o of openings) {
            const ox0 = Math.max(o.x, x), ox1 = Math.min(o.x + o.w, x + w);
            const oz0 = Math.max(b + o.sill, z), oz1 = Math.min(b + o.sill + o.h, z + h);
            if (ox1 - ox0 < 1 || oz1 - oz0 < 1) continue;
            const toY = (wx: number) => (panel.frame.y[0] > 0 ? wx - panel.frame.o[0] : panel.frame.o[0] - wx);
            const ya = toY(ox0), yb = toY(ox1);
            const cut: Processing = {
              id: `${panel.id}:cut${openings.indexOf(o)}`, type: 'pocket', geom: 'polytope', info: { width: Math.round(ox1 - ox0), length: Math.round(oz1 - oz0) },
              planes: [
                { p: [oz0 - z, 0, 0], n: [-1, 0, 0] }, { p: [oz1 - z, 0, 0], n: [1, 0, 0] },
                { p: [0, Math.min(ya, yb), 0], n: [0, -1, 0] }, { p: [0, Math.max(ya, yb), 0], n: [0, 1, 0] },
              ],
            };
            panel.processings.push(cut);
            area -= ((ox1 - ox0) * (oz1 - oz0)) / 1e6;
          }
          area += (w * h) / 1e6;
          add(panel);
        }
      }
    }
    if (area > 0) out.hardware.push({ itemId: 'nail_28x65', qty: Math.ceil(area * 25), source: ctx.id });
    out.notes.push({ key: 'note.wand.grid', args: { spacing: sp } });
    return out;
  },
};
