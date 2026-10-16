import { useState } from 'react';
import { elementAABB } from '../../core/elements';
import { DEG, aabbUnion, mirrorFrame, rotateFrame, uid, type AABB, type Frame, type Vec3 } from '../../core/math';
import { NumberInput, Section } from '../components/Field';
import { evaluated, getState, setState, updateDoc, useApp } from '../store';

interface Targets {
  gens: string[];
  els: string[];
}

/** Resolve the selection to movable things: generators and free elements. */
export function selectionTargets(): Targets {
  const ev = evaluated();
  const gens = new Set<string>();
  const els: string[] = [];
  for (const id of getState().selection) {
    if (id.startsWith('gen:')) gens.add(id.slice(4));
    else if (!id.includes(':')) {
      const e = ev.elements.find((x) => x.id === id);
      if (e?.generator) gens.add(e.generator);
      else if (e) els.push(e.id);
    }
  }
  return { gens: [...gens], els };
}

function boundsOf(t: Targets): AABB | null {
  const ev = evaluated();
  let box: AABB | null = null;
  for (const e of ev.elements) {
    if (!(t.els.includes(e.id) || (e.generator && t.gens.includes(e.generator)))) continue;
    const b = elementAABB(e);
    box = box ? aabbUnion(box, b) : b;
  }
  return box;
}

function boundsOfOne(kind: 'gen' | 'el', id: string): AABB | null {
  return boundsOf(kind === 'gen' ? { gens: [id], els: [] } : { gens: [], els: [id] });
}

function applyFrames(t: Targets, fn: (f: Frame) => Frame) {
  updateDoc((d) => {
    for (const g of d.generators) if (t.gens.includes(g.id)) g.frame = fn(g.frame);
    for (const e of d.elements) if (t.els.includes(e.id)) e.frame = fn(e.frame);
  });
}

export function TransformPanel() {
  const lang = useApp((s) => s.lang);
  useApp((s) => s.selection);
  const de = lang === 'de';
  const [mv, setMv] = useState<Vec3>([0, 0, 0]);
  const [rot, setRot] = useState(90);
  const [arr, setArr] = useState<{ n: number; d: Vec3 }>({ n: 3, d: [600, 0, 0] });
  const [mirrorCopy, setMirrorCopy] = useState(true);
  const t = selectionTargets();
  if (!t.gens.length && !t.els.length) return null;

  const move = () => applyFrames(t, (f) => ({ ...f, o: [f.o[0] + mv[0], f.o[1] + mv[1], f.o[2] + mv[2]] }));
  const rotate = (deg: number) => {
    const b = boundsOf(t);
    if (!b) return;
    const c: Vec3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.min[2]];
    applyFrames(t, (f) => rotateFrame(f, c, [0, 0, 1], deg * DEG));
  };
  const mirror = (axis: 0 | 1 | 2) => {
    const b = boundsOf(t);
    if (!b) return;
    const p: Vec3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    const n: Vec3 = [0, 0, 0];
    n[axis] = 1;
    // As a copy, mirror at the far face so the copy sits next to the original.
    if (mirrorCopy) p[axis] = b.max[axis];
    const plane = { p, n };
    const newSel: string[] = [];
    updateDoc((d) => {
      for (const g of [...d.generators]) {
        if (!t.gens.includes(g.id)) continue;
        if (mirrorCopy) { const id = uid('g'); d.generators.push({ ...structuredClone(g), id, name: `${g.name} (S)`, frame: mirrorFrame(g.frame, plane) }); newSel.push(`gen:${id}`); }
        else g.frame = mirrorFrame(g.frame, plane);
      }
      for (const e of [...d.elements]) {
        if (!t.els.includes(e.id)) continue;
        if (mirrorCopy) { const id = uid('b'); d.elements.push({ ...structuredClone(e), id, frame: mirrorFrame(e.frame, plane) }); newSel.push(id); }
        else e.frame = mirrorFrame(e.frame, plane);
      }
    });
    if (newSel.length) setState({ selection: newSel });
  };
  const array = () => {
    const newSel: string[] = [];
    updateDoc((d) => {
      for (let i = 1; i < arr.n; i++) {
        const off: Vec3 = [arr.d[0] * i, arr.d[1] * i, arr.d[2] * i];
        const shift = (f: Frame): Frame => ({ ...f, o: [f.o[0] + off[0], f.o[1] + off[1], f.o[2] + off[2]] });
        for (const g of d.generators.filter((x) => t.gens.includes(x.id))) { const id = uid('g'); d.generators.push({ ...structuredClone(g), id, name: `${g.name} (${i + 1})`, frame: shift(g.frame) }); newSel.push(`gen:${id}`); }
        for (const e of d.elements.filter((x) => t.els.includes(x.id))) { const id = uid('b'); d.elements.push({ ...structuredClone(e), id, frame: shift(e.frame) }); newSel.push(id); }
      }
    });
    setState({ selection: [...getState().selection, ...newSel] });
  };
  /** Align every selected item to the first one. */
  const align = (axis: 0 | 1 | 2, mode: 'min' | 'mid' | 'max') => {
    const sel = getState().selection;
    const items: { kind: 'gen' | 'el'; id: string }[] = [];
    const ev = evaluated();
    for (const id of sel) {
      if (id.startsWith('gen:')) items.push({ kind: 'gen', id: id.slice(4) });
      else {
        const e = ev.elements.find((x) => x.id === id);
        if (e?.generator) { if (!items.some((i) => i.kind === 'gen' && i.id === e.generator)) items.push({ kind: 'gen', id: e.generator }); }
        else if (e) items.push({ kind: 'el', id });
      }
    }
    if (items.length < 2) return;
    const ref = boundsOfOne(items[0].kind, items[0].id)!;
    const val = (b: AABB) => (mode === 'min' ? b.min[axis] : mode === 'max' ? b.max[axis] : (b.min[axis] + b.max[axis]) / 2);
    const target = val(ref);
    const deltas = items.slice(1).map((it) => ({ it, d: target - val(boundsOfOne(it.kind, it.id)!) }));
    updateDoc((doc) => {
      for (const { it, d } of deltas) {
        const obj = it.kind === 'gen' ? doc.generators.find((g) => g.id === it.id) : doc.elements.find((e) => e.id === it.id);
        if (!obj) continue;
        const o = [...obj.frame.o] as Vec3;
        o[axis] += d;
        obj.frame = { ...obj.frame, o };
      }
    });
  };
  const ax = ['X', 'Y', 'Z'];
  const multi = getState().selection.length > 1;
  return (
    <Section title={de ? 'Transformieren' : 'Transform'} open={false}>
      <div className="sub-title">{de ? 'Verschieben um' : 'Move by'}</div>
      <div className="vec-row">
        {ax.map((a, i) => <label key={a}>{a}<NumberInput value={mv[i]} step={10} onCommit={(v) => { const n = [...mv] as Vec3; n[i] = v; setMv(n); }} /></label>)}
        <button className="btn subtle" onClick={move}>{de ? 'Anwenden' : 'Apply'}</button>
      </div>
      <div className="sub-title">{de ? 'Drehen um senkrechte Achse' : 'Rotate about vertical axis'}</div>
      <div className="vec-row">
        <label>°<NumberInput value={rot} step={15} onCommit={setRot} /></label>
        <button className="btn subtle" onClick={() => rotate(-rot)}>↻</button>
        <button className="btn subtle" onClick={() => rotate(rot)}>↺</button>
      </div>
      <div className="sub-title">{de ? 'Spiegeln' : 'Mirror'}</div>
      <div className="vec-row">
        {ax.map((a, i) => <button key={a} className="btn subtle" onClick={() => mirror(i as 0 | 1 | 2)}>{a}</button>)}
        <label className="inline"><input type="checkbox" checked={mirrorCopy} onChange={(e) => setMirrorCopy(e.target.checked)} /> {de ? 'als Kopie' : 'as copy'}</label>
      </div>
      <div className="sub-title">{de ? 'Mehrfach kopieren' : 'Array copy'}</div>
      <div className="vec-row">
        <label>{de ? 'Anzahl' : 'Count'}<NumberInput value={arr.n} min={2} max={200} onCommit={(n) => setArr({ ...arr, n: Math.round(n) })} /></label>
        {ax.map((a, i) => <label key={a}>{a}<NumberInput value={arr.d[i]} step={10} onCommit={(v) => { const d = [...arr.d] as Vec3; d[i] = v; setArr({ ...arr, d }); }} /></label>)}
        <button className="btn subtle" onClick={array}>{de ? 'Kopieren' : 'Copy'}</button>
      </div>
      {multi && (
        <>
          <div className="sub-title">{de ? 'Ausrichten am zuerst gewählten Teil' : 'Align to first selected'}</div>
          {ax.map((a, i) => (
            <div key={a} className="vec-row">
              <span className="muted">{a}</span>
              <button className="btn subtle" onClick={() => align(i as 0 | 1 | 2, 'min')}>{de ? 'Anfang' : 'Min'}</button>
              <button className="btn subtle" onClick={() => align(i as 0 | 1 | 2, 'mid')}>{de ? 'Mitte' : 'Centre'}</button>
              <button className="btn subtle" onClick={() => align(i as 0 | 1 | 2, 'max')}>{de ? 'Ende' : 'Max'}</button>
            </div>
          ))}
        </>
      )}
    </Section>
  );
}
