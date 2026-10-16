import { findMaterial } from '../catalog';
import { createBeam, createBoxElement } from '../elements';
import { DEG, norm } from '../math';
import type { Element } from '../model';
import { add, battens, joint, mk, plumbCut, rafterSystem, rafterXs } from './roof';
import { bool, emptyOutput, num, str, type GenParams, type GeneratorDef } from './types';

/**
 * Carport: two rows of posts with knee braces, beams (purlins) tenoned onto the posts,
 * mono-pitch rafters with birdsmouths rising towards the back, battens.
 * x = length, y = width (front row at y ≈ 0), z up.
 */
export const carport: GeneratorDef = {
  type: 'carport',
  category: 'outdoor',
  params: [
    { id: 'length', group: 'dimensions', type: 'number', default: 5500, min: 2500, max: 15000, step: 10, unit: 'mm' },
    { id: 'width', group: 'dimensions', type: 'number', default: 3200, min: 2000, max: 8000, step: 10, unit: 'mm' },
    { id: 'clearHeight', group: 'dimensions', type: 'number', default: 2200, min: 1800, max: 4000, step: 10, unit: 'mm' },
    { id: 'pitch', group: 'roof', type: 'number', default: 3, min: 1, max: 20, step: 0.5, unit: '°' },
    { id: 'eaves', group: 'roof', type: 'number', default: 300, min: 0, max: 1000, step: 10, unit: 'mm' },
    { id: 'gable', group: 'roof', type: 'number', default: 300, min: 0, max: 1500, step: 10, unit: 'mm' },
    { id: 'postSize', group: 'members', type: 'number', default: 120, min: 90, max: 200, step: 5, unit: 'mm' },
    { id: 'postSpacing', group: 'members', type: 'number', default: 2600, min: 1500, max: 4500, step: 50, unit: 'mm' },
    { id: 'beamWidth', group: 'members', type: 'number', default: 120, min: 80, max: 200, step: 5, unit: 'mm' },
    { id: 'beamHeight', group: 'members', type: 'number', default: 200, min: 120, max: 400, step: 5, unit: 'mm' },
    { id: 'rafterWidth', group: 'members', type: 'number', default: 60, min: 40, max: 120, step: 5, unit: 'mm' },
    { id: 'rafterHeight', group: 'members', type: 'number', default: 160, min: 100, max: 300, step: 5, unit: 'mm' },
    { id: 'spacing', group: 'members', type: 'number', default: 650, min: 400, max: 1000, step: 5, unit: 'mm' },
    { id: 'birdsmouth', group: 'members', type: 'number', default: 25, min: 10, max: 60, step: 5, unit: 'mm' },
    { id: 'kneeBraces', group: 'members', type: 'boolean', default: true },
    { id: 'battens', group: 'roof', type: 'boolean', default: true },
    { id: 'battenSpacing', group: 'roof', type: 'number', default: 400, min: 200, max: 600, step: 5, unit: 'mm', visible: (p: GenParams) => Boolean(p.battens) },
    { id: 'timber', group: 'materials', type: 'material', default: 'kvh_c24', category: 'timber' },
    { id: 'roofLoad', group: 'statics', type: 'number', default: 250, min: 50, max: 1500, step: 10, unit: 'N/m²' },
  ],

  build(p, gctx) {
    const out = emptyOutput();
    const c = mk(out, gctx.id);
    const L = num(p, 'length'), W = num(p, 'width'), H = num(p, 'clearHeight');
    const alpha = num(p, 'pitch') * DEG, tanA = Math.tan(alpha);
    const eo = num(p, 'eaves'), go = num(p, 'gable');
    const ps = num(p, 'postSize'), bw = num(p, 'beamWidth'), bh = num(p, 'beamHeight');
    const rb = num(p, 'rafterWidth'), rh = num(p, 'rafterHeight'), sp = num(p, 'spacing'), tk = num(p, 'birdsmouth');
    const timber = findMaterial(gctx.catalog, str(p, 'timber'));
    const yF = ps / 2, yB = W - ps / 2;
    const y0 = yF - bw / 2;
    // rafter underside: plumb depth tk at the outer (front) edge of the front beam
    const zuAt = (y: number) => H + bh - tk + (y - y0) * tanA;
    const tops: Record<'f' | 'b', number> = { f: H + bh, b: zuAt(yB + bw / 2) + tk };
    const nPosts = Math.max(2, Math.ceil((L - ps) / num(p, 'postSpacing')) + 1);
    const xs = Array.from({ length: nPosts }, (_, i) => ps / 2 + ((L - ps) * i) / (nPosts - 1));
    const beams: Element[] = [];
    for (const row of ['f', 'b'] as const) {
      const yc = row === 'f' ? yF : yB;
      const top = tops[row];
      const beam = add(c, createBoxElement([-go, yc - bw / 2, top - bh], [L + 2 * go, bw, bh], { id: c.id(`beam-${row}`), name: row === 'f' ? 'Pfette vorn' : 'Pfette hinten', role: 'purlin', kind: 'beam', materialId: timber.id, grain: 'x', generator: c.gen }));
      beams.push(beam);
      xs.forEach((x, k) => {
        const post = add(c, createBoxElement([x - ps / 2, yc - ps / 2, 0], [ps, ps, top - bh + 70], { id: c.id(`post-${row}-${k + 1}`), name: row === 'f' ? 'Pfosten vorn' : 'Pfosten hinten', role: 'post', kind: 'beam', materialId: timber.id, grain: 'z', generator: c.gen }));
        joint(c, 'tenon', post, beam, { length: 60, thickness: 40, shoulder: 20, peg: true, pegDia: 20 });
        out.hardware.push({ itemId: 'post_base', qty: 1, source: c.gen });
        if (!bool(p, 'kneeBraces')) return;
        const zTop = top - bh;
        const kb = Math.min(700, zTop * 0.3);
        for (const dir of [-1, 1]) {
          if ((k === 0 && dir < 0) || (k === nPosts - 1 && dir > 0)) continue;
          const x1 = x + dir * (ps / 2), z1 = zTop - kb;
          const x2 = x + dir * (ps / 2 + kb), z2 = zTop;
          const d = norm([x2 - x1, 0, z2 - z1]);
          const ext = 100;
          const brace = add(c, createBeam([x1 - d[0] * ext, yc, z1 - d[2] * ext], [x2 + d[0] * ext, yc, z2 + d[2] * ext], 80, 80, { id: c.id(`brace-${row}-${k + 1}-${dir > 0 ? 'r' : 'l'}`), name: 'Kopfband', role: 'kneeBrace', materialId: timber.id, align: 'center', up: [0, 1, 0], generator: c.gen }));
          joint(c, 'tenon', brace, post, { length: 35, thickness: 25, shoulder: 12, peg: true, pegDia: 14 });
          joint(c, 'tenon', brace, beam, { length: 35, thickness: 25, shoulder: 12, peg: true, pegDia: 14 });
        }
      });
    }
    const ext = rh * Math.sin(alpha) + 20;
    const yEnd = yB + bw / 2;
    const rafters: Element[] = rafterXs(L, go, rb, sp).map((x, i) => {
      const ya = y0 - eo - ext, yb = yEnd + eo + ext;
      const r = add(c, createBeam([x, ya, zuAt(ya)], [x, yb, zuAt(yb)], rb, rh, { id: c.id(`rafter-${i + 1}`), name: 'Sparren', role: 'rafter', materialId: timber.id, align: 'bottom', generator: c.gen }));
      plumbCut(r, y0 - eo, -1, `${r.id}:eave`);
      plumbCut(r, yEnd + eo, 1, `${r.id}:top`);
      joint(c, 'birdsMouth', r, beams[0]);
      joint(c, 'birdsMouth', r, beams[1]);
      return r;
    });
    out.hardware.push({ itemId: 'rafter_tie', qty: rafters.length * 2, source: c.gen });
    battens(c, p, rafters, 'l', y0 - eo, yEnd + eo, (y) => zuAt(y) + rh / Math.cos(alpha), alpha, L, go, 'lath_s10');
    out.statics.push(rafterSystem(c.id('st-rafter'), 'Sparren', [{ y: yF }, { y: yB }], y0 - eo, yEnd + eo, alpha, rb, rh, timber.strengthClass ?? 'C24', sp, num(p, 'roofLoad')));
    out.notes.push({ key: 'note.carport', args: { n: nPosts * 2 } });
    return out;
  },
};
