import { findMaterial } from '../catalog';
import { createBoxElement } from '../elements';
import type { Element, Joint, JointType, ParamValue } from '../model';
import { bool, emptyOutput, num, str, type GeneratorDef } from './types';

/**
 * Workbench: four legs, aprons and lower stretchers with mortise-and-tenon joints,
 * laminated top, optional lower shelf. x = length, y = depth (front = 0), z up.
 */
export const werkbank: GeneratorDef = {
  type: 'werkbank',
  category: 'furniture',
  params: [
    { id: 'length', group: 'dimensions', type: 'number', default: 1800, min: 800, max: 3500, step: 5, unit: 'mm' },
    { id: 'depth', group: 'dimensions', type: 'number', default: 700, min: 400, max: 1200, step: 5, unit: 'mm' },
    { id: 'height', group: 'dimensions', type: 'number', default: 900, min: 600, max: 1100, step: 5, unit: 'mm' },
    { id: 'overhang', group: 'construction', type: 'number', default: 60, min: 0, max: 300, step: 5, unit: 'mm' },
    { id: 'leg', group: 'members', type: 'number', default: 80, min: 50, max: 140, step: 5, unit: 'mm' },
    { id: 'apronWidth', group: 'members', type: 'number', default: 40, min: 20, max: 80, step: 5, unit: 'mm' },
    { id: 'apronHeight', group: 'members', type: 'number', default: 120, min: 60, max: 240, step: 5, unit: 'mm' },
    { id: 'stretcherZ', group: 'members', type: 'number', default: 150, min: 60, max: 500, step: 5, unit: 'mm' },
    { id: 'topLayers', group: 'construction', type: 'number', default: 2, min: 1, max: 3, step: 1 },
    { id: 'shelf', group: 'construction', type: 'boolean', default: true },
    { id: 'pegs', group: 'construction', type: 'boolean', default: false },
    { id: 'timber', group: 'materials', type: 'material', default: 'kvh_c24', category: 'timber' },
    { id: 'topMaterial', group: 'materials', type: 'material', default: 'ply_birch18', category: 'sheet' },
    { id: 'shelfMaterial', group: 'materials', type: 'material', default: 'ply_poplar15', category: 'sheet' },
  ],

  build(p, ctx) {
    const out = emptyOutput();
    const id = (s: string) => `${ctx.id}/${s}`;
    const L = num(p, 'length'), D = num(p, 'depth'), H = num(p, 'height');
    const o = num(p, 'overhang'), a = num(p, 'leg'), aw = num(p, 'apronWidth'), ah = num(p, 'apronHeight');
    const sz = num(p, 'stretcherZ');
    const timber = findMaterial(ctx.catalog, str(p, 'timber'));
    const topM = findMaterial(ctx.catalog, str(p, 'topMaterial'));
    const shelfM = findMaterial(ctx.catalog, str(p, 'shelfMaterial'));
    const layers = Math.round(num(p, 'topLayers'));
    const T = layers * topM.thickness!;
    const pegs = bool(p, 'pegs');
    if (L - 2 * o < 3 * a || D - 2 * o < 3 * a || H - T - ah < sz + ah) {
      out.warnings.push({ key: 'warn.dimensionsTooSmall' });
      return out;
    }
    const add = (e: Element) => (out.elements.push(e), e);
    const joint = (type: JointType, x: Element, y: Element, params: Record<string, ParamValue> = {}): Joint => {
      const j: Joint = { id: id(`j-${x.id.split('/').pop()}-${y.id.split('/').pop()}`), type, a: x.id, b: y.id, params, generator: ctx.id };
      out.joints.push(j);
      return j;
    };
    const c = { generator: ctx.id, kind: 'beam' as const, materialId: timber.id };
    const legH = H - T;
    const x0 = o, x1 = L - o - a, y0 = o, y1 = D - o - a;
    const legs = [
      add(createBoxElement([x0, y0, 0], [a, a, legH], { ...c, id: id('leg-fl'), name: 'Bein vorn links', role: 'leg', grain: 'z' })),
      add(createBoxElement([x1, y0, 0], [a, a, legH], { ...c, id: id('leg-fr'), name: 'Bein vorn rechts', role: 'leg', grain: 'z' })),
      add(createBoxElement([x0, y1, 0], [a, a, legH], { ...c, id: id('leg-bl'), name: 'Bein hinten links', role: 'leg', grain: 'z' })),
      add(createBoxElement([x1, y1, 0], [a, a, legH], { ...c, id: id('leg-br'), name: 'Bein hinten rechts', role: 'leg', grain: 'z' })),
    ];
    const [fl, fr, bl, br] = legs;
    // Tenons from two directions meet in the leg: keep them shorter than half the leg.
    const tl = Math.max(20, Math.floor(a / 2 - 4));
    const tenon = { length: tl, thickness: Math.max(12, Math.round(aw / 3)), shoulder: Math.round(ah * 0.12), clearance: 2, peg: pegs, pegDia: 12 };
    const setback = Math.max(5, Math.round((a - aw) / 4));
    // aprons run from outer leg face to outer leg face – the tenon joint trims them.
    const za = legH - ah;
    const long = (name: string, sfx: string, y: number, z: number, h: number) => add(createBoxElement([x0, y, z], [L - 2 * o, aw, h], { ...c, id: id(sfx), name, role: 'apron', grain: 'x', thick: 'y' }));
    const side = (name: string, sfx: string, x: number, z: number, h: number) => add(createBoxElement([x, y0, z], [aw, D - 2 * o, h], { ...c, id: id(sfx), name, role: 'apron', grain: 'y', thick: 'x' }));
    const af = long('Zarge vorn', 'apron-f', y0 + setback, za, ah);
    const ab = long('Zarge hinten', 'apron-b', y1 + a - setback - aw, za, ah);
    const al = side('Zarge links', 'apron-l', x0 + setback, za, ah);
    const ar = side('Zarge rechts', 'apron-r', x1 + a - setback - aw, za, ah);
    joint('tenon', af, fl, tenon); joint('tenon', af, fr, tenon);
    joint('tenon', ab, bl, tenon); joint('tenon', ab, br, tenon);
    joint('tenon', al, fl, tenon); joint('tenon', al, bl, tenon);
    joint('tenon', ar, fr, tenon); joint('tenon', ar, br, tenon);
    // lower stretchers
    const sh = Math.round(ah * 0.8);
    const sf = long('Fußriegel vorn', 'str-f', y0 + setback, sz, sh);
    const sb = long('Fußriegel hinten', 'str-b', y1 + a - setback - aw, sz, sh);
    const sl = side('Fußriegel links', 'str-l', x0 + setback, sz + sh + 10, sh);
    const sr = side('Fußriegel rechts', 'str-r', x1 + a - setback - aw, sz + sh + 10, sh);
    joint('tenon', sf, fl, tenon); joint('tenon', sf, fr, tenon);
    joint('tenon', sb, bl, tenon); joint('tenon', sb, br, tenon);
    joint('tenon', sl, fl, tenon); joint('tenon', sl, bl, tenon);
    joint('tenon', sr, fr, tenon); joint('tenon', sr, br, tenon);
    // top (glued layers)
    for (let k = 0; k < layers; k++) {
      add(createBoxElement([0, 0, legH + k * topM.thickness!], [L, D, topM.thickness!], { generator: ctx.id, id: id(`top-${k + 1}`), name: `Arbeitsplatte Lage ${k + 1}`, role: 'top', materialId: topM.id, grain: 'x' }));
    }
    out.hardware.push({ itemId: 'angle_90', qty: 8, source: ctx.id }, { itemId: 'screw_4x30', qty: 32, source: ctx.id }, { itemId: 'glue', qty: 1, source: ctx.id });
    if (layers > 1) out.hardware.push({ itemId: 'screw_4x30', qty: Math.ceil((L * D) / 1e6 * 16) * (layers - 1), source: ctx.id });
    // shelf resting on the long stretchers, notched around the legs
    if (bool(p, 'shelf')) {
      const zs = sz + sh;
      const shelf = add(createBoxElement([x0 + a, y0 + setback, zs], [L - 2 * o - 2 * a, D - 2 * o - 2 * setback, shelfM.thickness!], { generator: ctx.id, id: id('shelf'), name: 'Ablageboden', role: 'shelf', materialId: shelfM.id, grain: 'x' }));
      // screwed from above through the shelf into both long stretchers
      joint('screw', sf, shelf, { size: '4x30', spacing: 300 });
      joint('screw', sb, shelf, { size: '4x30', spacing: 300 });
    }
    out.notes.push({ key: 'note.werkbank.order' });
    return out;
  },
};
