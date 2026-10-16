import { describe, expect, it } from 'vitest';
import { staticChecks } from '../src/core/checks';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument } from '../src/core/model';

describe('static checks', () => {
  it('flags a blind hole that breaks out and offers a depth fix', () => {
    const d = emptyDocument('t');
    d.elements.push({
      id: 'p', kind: 'panel', name: 'Brett', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, length: 500, width: 300, height: 19, materialId: 'mdf19',
      processings: [{ id: 'd1', type: 'drilling', geom: 'drill', p: [100, 100, 19], dir: [0, 0, -1], dia: 8, depth: 25, through: false }],
    });
    const issues = staticChecks(evaluate(d));
    expect(issues).toHaveLength(1);
    expect(issues[0].msg.key).toBe('check.drillBreaksOut');
    expect(issues[0].fix).toEqual({ kind: 'setDrillDepth', elementId: 'p', procId: 'd1', depth: 16 });
  });
  it('kommode has no static issues', () => {
    const d = emptyDocument('t');
    d.generators.push({ id: 'k', type: 'kommode', name: 'K', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, params: {} });
    expect(staticChecks(evaluate(d))).toEqual([]);
  });
});
