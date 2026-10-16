import { findMaterial } from '../catalog';
import { createBoxElement } from '../elements';
import type { Element, Joint, JointType, ParamValue } from '../model';
import { drillWorld } from './kommode';
import { bool, emptyOutput, num, str, type GeneratorDef } from './types';

/**
 * Shelf / bookcase: two sides, top and bottom between the sides, optional vertical
 * dividers, fixed or adjustable shelves (System 32 shelf-pin rows), plinth, back panel.
 */
export const regal: GeneratorDef = {
  type: 'regal',
  category: 'furniture',
  params: [
    { id: 'width', group: 'dimensions', type: 'number', default: 800, min: 250, max: 2400, step: 1, unit: 'mm' },
    { id: 'height', group: 'dimensions', type: 'number', default: 1800, min: 300, max: 2800, step: 1, unit: 'mm' },
    { id: 'depth', group: 'dimensions', type: 'number', default: 320, min: 150, max: 700, step: 1, unit: 'mm' },
    { id: 'columns', group: 'layout', type: 'number', default: 1, min: 1, max: 6, step: 1 },
    { id: 'shelves', group: 'layout', type: 'number', default: 4, min: 0, max: 12, step: 1 },
    { id: 'shelfType', group: 'layout', type: 'select', default: 'adjustable', options: ['adjustable', 'fixed'] },
    { id: 'plinth', group: 'construction', type: 'number', default: 60, min: 0, max: 200, step: 1, unit: 'mm' },
    { id: 'topOverlay', group: 'construction', type: 'boolean', default: false },
    { id: 'back', group: 'construction', type: 'select', default: 'nailed', options: ['nailed', 'none'] },
    { id: 'joinery', group: 'construction', type: 'select', default: 'dowel', options: ['dowel', 'confirmat', 'screw'] },
    { id: 'bodyMaterial', group: 'materials', type: 'material', default: 'ply_birch18', category: 'sheet' },
    { id: 'shelfMaterial', group: 'materials', type: 'material', default: 'ply_birch18', category: 'sheet' },
    { id: 'backMaterial', group: 'materials', type: 'material', default: 'hdf3_white', category: 'sheet' },
  ],

  build(p, ctx) {
    const out = emptyOutput();
    const id = (s: string) => `${ctx.id}/${s}`;
    const body = findMaterial(ctx.catalog, str(p, 'bodyMaterial'));
    const shelfM = findMaterial(ctx.catalog, str(p, 'shelfMaterial'));
    const backM = findMaterial(ctx.catalog, str(p, 'backMaterial'));
    const t = body.thickness!, ts = shelfM.thickness!, tb = backM.thickness!;
    const W = num(p, 'width'), H = num(p, 'height'), D = num(p, 'depth');
    const cols = Math.round(num(p, 'columns'));
    const nShelves = Math.round(num(p, 'shelves'));
    const adjustable = str(p, 'shelfType') === 'adjustable';
    const plinth = num(p, 'plinth');
    const overlay = bool(p, 'topOverlay');
    const hasBack = str(p, 'back') === 'nailed';
    const joinery = str(p, 'joinery') as JointType;
    const Dc = D - (hasBack ? tb : 0); // carcass depth in front of the back panel
    const innerW = W - 2 * t - (cols - 1) * t;
    const colW = innerW / cols;
    if (colW < 120 || H < plinth + 3 * t + 100 || Dc < 100) {
      out.warnings.push({ key: 'warn.dimensionsTooSmall' });
      return out;
    }
    const add = (e: Element) => (out.elements.push(e), e);
    const joint = (type: JointType, a: Element, b: Element, params: Record<string, ParamValue> = {}): Joint => {
      const j: Joint = { id: id(`j-${a.id.split('/').pop()}-${b.id.split('/').pop()}`), type, a: a.id, b: b.id, params, generator: ctx.id };
      out.joints.push(j);
      return j;
    };
    const c = { generator: ctx.id };
    const sideH = overlay ? H - t : H;
    const sideL = add(createBoxElement([0, 0, 0], [t, Dc, sideH], { ...c, id: id('side-l'), name: 'Seite links', role: 'side', materialId: body.id, grain: 'z', band: { y: 'min' } }));
    const sideR = add(createBoxElement([W - t, 0, 0], [t, Dc, sideH], { ...c, id: id('side-r'), name: 'Seite rechts', role: 'side', materialId: body.id, grain: 'z', band: { y: 'min' } }));
    const zBottom = plinth;
    const bottom = add(createBoxElement([t, 0, zBottom], [W - 2 * t, Dc, t], { ...c, id: id('bottom'), name: 'Boden', role: 'bottom', materialId: body.id, grain: 'x', band: { y: 'min' } }));
    const top = overlay
      ? add(createBoxElement([0, 0, H - t], [W, Dc, t], { ...c, id: id('top'), name: 'Oberboden', role: 'top', materialId: body.id, grain: 'x', band: { y: 'min', x: 'both' } }))
      : add(createBoxElement([t, 0, H - t], [W - 2 * t, Dc, t], { ...c, id: id('top'), name: 'Oberboden', role: 'top', materialId: body.id, grain: 'x', band: { y: 'min' } }));
    for (const s of [sideL, sideR]) {
      joint(joinery, bottom, s);
      if (overlay) joint('dowel', s, top);
      else joint(joinery, top, s);
    }
    if (plinth > 0) {
      const pl = add(createBoxElement([t, 30, 0], [W - 2 * t, t, plinth], { ...c, id: id('plinth'), name: 'Sockelblende', role: 'plinth', materialId: body.id, grain: 'x', thick: 'y' }));
      for (const s of [sideL, sideR]) joint(joinery, pl, s);
    }

    // dividers split the inner width into columns
    const innerZ0 = zBottom + t, innerZ1 = H - t;
    const colX: number[] = [];
    let x = t;
    const verticals: Element[] = [sideL];
    for (let i = 0; i < cols; i++) {
      colX.push(x);
      x += colW;
      if (i < cols - 1) {
        const dv = add(createBoxElement([x, 0, innerZ0], [t, Dc, innerZ1 - innerZ0], { ...c, id: id(`divider-${i + 1}`), name: `Mittelwand ${i + 1}`, role: 'divider', materialId: body.id, grain: 'z', band: { y: 'min' } }));
        joint(joinery, dv, bottom);
        joint('dowel', dv, top);
        verticals.push(dv);
        x += t;
      }
    }
    verticals.push(sideR);

    // shelves
    const pitch = (innerZ1 - innerZ0) / (nShelves + 1);
    for (let ci = 0; ci < cols; ci++) {
      const left = verticals[ci], right = verticals[ci + 1];
      for (let si = 0; si < nShelves; si++) {
        const z = Math.round(innerZ0 + pitch * (si + 1) - ts / 2);
        const nr = `${ci + 1}.${si + 1}`;
        if (adjustable) {
          // 1 mm play on each side, set back 2 mm from the front
          add(createBoxElement([colX[ci] + 1, 2, z], [colW - 2, Dc - 4, ts], { ...c, id: id(`shelf-${nr}`), name: `Fachboden ${nr}`, role: 'shelf', materialId: shelfM.id, grain: 'x', band: { y: 'min' } }));
          out.hardware.push({ itemId: 'shelf_pin', qty: 4, source: ctx.id });
        } else {
          const sh = add(createBoxElement([colX[ci], 0, z], [colW, Dc, ts], { ...c, id: id(`shelf-${nr}`), name: `Fachboden ${nr}`, role: 'shelf', materialId: shelfM.id, grain: 'x', band: { y: 'min' } }));
          joint(joinery, sh, left);
          joint(joinery, sh, right);
        }
      }
    }

    // System 32 shelf-pin rows: Ø5 × 12, 37 mm from front and back edge, 32 mm grid
    if (adjustable && nShelves > 0) {
      const zs: number[] = [];
      for (let z = innerZ0 + 64; z <= innerZ1 - 64; z += 32) zs.push(z);
      for (let vi = 0; vi < verticals.length; vi++) {
        const v = verticals[vi];
        const faces: { x: number; dir: 1 | -1 }[] = [];
        const vx0 = v.frame.o[0] - (v.frame.z[0] < 0 ? t : 0);
        if (vi > 0) faces.push({ x: vx0, dir: 1 }); // left face, drilled towards +x
        if (vi < verticals.length - 1) faces.push({ x: vx0 + t, dir: -1 }); // right face
        for (const f of faces) {
          for (const yy of [37, Dc - 37]) {
            zs.forEach((z, k) => drillWorld(v, `${v.id}:sp${f.dir}${yy}${k}`, [f.x, yy, z], [f.dir, 0, 0], 5, 12, false));
          }
        }
      }
      out.notes.push({ key: 'note.regal.pins' });
    }

    if (hasBack) {
      const back = add(createBoxElement([0, Dc, 0], [W, tb, H], { ...c, id: id('back'), name: 'Rückwand', role: 'back', materialId: backM.id, grain: W >= H ? 'x' : 'z', thick: 'y' }));
      for (const e of [sideL, sideR]) joint('screw', e, back, { size: '3x16', spacing: 150 });
      for (const e of [bottom, top]) joint('screw', e, back, { size: '3x16', spacing: 150 });
    }
    out.hardware.push({ itemId: 'glue', qty: 1, source: ctx.id });
    if (H > 1200) out.notes.push({ key: 'note.regal.wall' });
    return out;
  },
};
