import { copyObjects, groupPath, movableRoots, objectFor, objectWorldFrame, setObjectWorldFrame } from '../../core/assemblies';
import { resolveSelection } from '../selection';
import { useState } from 'react';
import { elementAABB } from '../../core/elements';
import { DEG, aabbUnion, mirrorFrame, rotateFrame, type AABB, type Frame, type Vec3 } from '../../core/math';
import { NumberInput, Section } from '../components/Field';
import { evaluated, getState, setState, updateDoc, useApp } from '../store';

interface Targets { keys:string[] }

/** Movable hierarchy roots, excluding descendants of another selected assembly. */
export function selectionTargets():Targets {
  return {keys:movableRoots(getState().doc,evaluated(),getState().selection)};
}
function boundsOf(targets:Targets):AABB|null {
  const ev=evaluated(),ids=new Set(resolveSelection(ev,targets.keys));let box:AABB|null=null;
  for(const part of ev.elements)if(ids.has(part.id)){const b=elementAABB(part);box=box?aabbUnion(box,b):b;}
  return box;
}
function applyFrames(targets:Targets,fn:(frame:Frame)=>Frame) {
  updateDoc(doc=>{const frames=targets.keys.map(key=>({key,frame:fn(objectWorldFrame(doc,key))}));for(const item of frames)setObjectWorldFrame(doc,item.key,item.frame);});
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
  if (!t.keys.length) return null;

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
    let newSel:string[]=[];
    const ev=evaluated();
    updateDoc(doc=>{
      const roots=mirrorCopy?copyObjects(doc,ev,t.keys,[0,0,0]):t.keys;
      // Reflection also reflects each nested member placement; a rigid root rotation is insufficient.
      const keys=[...doc.groups.map(g=>`group:${g.id}`),...doc.generators.map(g=>`gen:${g.id}`),...doc.elements.map(e=>e.id)]
        .filter(key=>roots.includes(key)||groupPath(doc,objectFor(doc,key)?.parent).some(id=>roots.includes(`group:${id}`)))
        .sort((a,b)=>groupPath(doc,objectFor(doc,a)?.parent).length-groupPath(doc,objectFor(doc,b)?.parent).length);
      const frames=keys.map(key=>({key,frame:mirrorFrame(objectWorldFrame(doc,key),plane)}));
      for(const item of frames)setObjectWorldFrame(doc,item.key,item.frame);
      if(mirrorCopy)newSel=roots;
    });
    if(newSel.length)setState({selection:newSel});
  };  const array=()=>{
    const ev=evaluated();let selection:string[]=[];
    updateDoc(doc=>{for(let i=1;i<arr.n;i++)selection.push(...copyObjects(doc,ev,t.keys,[arr.d[0]*i,arr.d[1]*i,arr.d[2]*i]));});
    setState({selection:[...getState().selection,...selection]});
  };
  const align=(axis:0|1|2,mode:'min'|'mid'|'max')=>{
    const items=t.keys.map(key=>({key,box:boundsOf({keys:[key]})})).filter((item):item is {key:string;box:AABB}=>!!item.box);
    if(items.length<2)return;
    const value=(box:AABB)=>mode==='min'?box.min[axis]:mode==='max'?box.max[axis]:(box.min[axis]+box.max[axis])/2;
    const target=value(items[0].box);
    updateDoc(doc=>{for(const item of items.slice(1)){const f=objectWorldFrame(doc,item.key),o=[...f.o] as Vec3;o[axis]+=target-value(item.box);setObjectWorldFrame(doc,item.key,{...f,o});}});
  };  const ax = ['X', 'Y', 'Z'];
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
