import { describe, expect, it } from 'vitest';
import { emptyDocument } from '../src/core/model';
import { validateDocument } from '../src/core/validate';

describe('document validation', () => {
  it('rejects foreign files', () => {
    expect(validateDocument({ hello: 1 }).doc).toBeNull();
    expect(validateDocument('x').doc).toBeNull();
  });
  it('rejects newer versions', () => {
    const r = validateDocument({ ...emptyDocument(), version: 99 });
    expect(r.doc).toBeNull();
    expect(r.errors[0]).toContain('neueren');
  });
  it('drops broken elements and dangling joints with a report', () => {
    const d = emptyDocument();
    const raw = {
      ...d,
      elements: [
        { id: 'ok', kind: 'beam', name: 'A', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, length: 1000, width: 80, height: 80, materialId: 'kvh_c24', processings: [] },
        { id: 'bad', kind: 'beam', frame: null, length: -1 },
      ],
      joints: [{ id: 'j', type: 'trim', a: 'ok', b: 'bad', params: {} }],
    };
    const r = validateDocument(raw);
    expect(r.doc?.elements.map((e) => e.id)).toEqual(['ok']);
    expect(r.doc?.joints).toEqual([]);
    expect(r.repairs.length).toBe(2);
  });
  it('migrates version 0 outlines', () => {
    const d = { ...emptyDocument(), version: 0, elements: [{ id: 'p', kind: 'panel', name: 'P', frame: { o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, length: 100, width: 100, height: 18, materialId: 'mdf19', processings: [], outline: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }] }] };
    const r = validateDocument(d);
    expect(r.doc?.elements[0].outline).toEqual([[0, 0], [100, 0], [0, 100]]);
  });
});
