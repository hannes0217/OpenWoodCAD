import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

// Exercise the actual field event handlers, including a synchronous blur before
// React has rendered the Escape state update. Native focus is checked in P1's
// browser protocol; these tests need no DOM emulation dependency.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useEffect: () => {},
  useState: (value: unknown) => {
    const i = hooks.cursor++;
    if (i >= hooks.slots.length) hooks.slots[i] = value;
    return [hooks.slots[i], (next: unknown) => { hooks.slots[i] = next; }];
  },
  useRef: (value: unknown) => {
    const i = hooks.cursor++;
    if (i >= hooks.slots.length) hooks.slots[i] = { current: value };
    return hooks.slots[i];
  },
}));
import { NumberInput, TextInput } from '../src/ui/components/Field';
import { emptyDocument } from '../src/core/model';
import { getState, setState, undo, updateDoc } from '../src/ui/store';

interface InputProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  onBlur: () => void;
  onKeyDown: (e: { key: string; currentTarget: { blur: () => void }; target: { blur: () => void }; preventDefault: () => void; stopPropagation: () => void }) => void;
}
const initial = getState();
beforeEach(() => {
  vi.useFakeTimers(); hooks.slots = []; hooks.cursor = 0;
  setState({ ...initial, doc: emptyDocument('Saved'), past: [], future: [], dirty: false });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); setState(initial); });

function field(kind: 'number' | 'text') {
  let input: InputProps;
  const commit = (v: number | string) => updateDoc(d => { d.project.name = String(v); });
  const render = () => {
    hooks.cursor = 0;
    const element = kind === 'number'
      ? NumberInput({ value: 862, unit: 'mm', min: 1, onCommit: commit })
      : TextInput({ value: 'Saved', onCommit: commit });
    input = kind === 'number'
      ? ((element.props.children as ReactElement[])[0].props as InputProps)
      : element.props as InputProps;
  };
  render();
  return {
    change(value: string) { input.onChange({ target: { value } }); render(); },
    key(key: string) {
      const blur = () => input.onBlur(), e = { key, currentTarget: { blur }, target: { blur }, preventDefault: vi.fn(), stopPropagation: vi.fn() };
      input.onKeyDown(e); render(); return e;
    },
    blur() { input.onBlur(); render(); },
    value: () => input.value,
  };
}

describe('property field transactions', () => {
  for (const kind of ['number', 'text'] as const) {
    it(`${kind}: Escape followed by blur preserves document, selection and undo`, () => {
      setState({ selection: ['part'] }); const before = getState(), f = field(kind);
      f.change(kind === 'number' ? '999' : 'Discard'); const e = f.key('Escape'); f.blur();
      expect(e.preventDefault).toHaveBeenCalled(); expect(e.stopPropagation).toHaveBeenCalled();
      expect(getState().doc).toBe(before.doc); expect(getState().past).toEqual([]);
      expect(getState().selection).toEqual(['part']); expect(getState().dirty).toBe(false);
      expect(f.value()).toBe(kind === 'number' ? '862' : 'Saved');
      f.change(kind === 'number' ? '90cm' : 'Accepted'); f.key('Enter');
      expect(getState().doc.project.name).toBe(kind === 'number' ? '900' : 'Accepted');
      expect(getState().past).toHaveLength(1); undo(); expect(getState().doc).toBe(before.doc);
    });
  }
  it('invalid numeric input leaves the document and history intact', () => {
    const before = getState().doc, f = field('number'); f.change('1/0'); f.key('Enter');
    expect(getState().doc).toBe(before); expect(getState().past).toEqual([]); expect(f.value()).toBe('862');
  });
});
