import { partPlacementInfo } from '../partPlacement';
import { findMaterial, materialName } from '../../core/catalog';
import { GENERATORS } from '../../core/generators';
import { frameFromEuler, frameToEuler, type Vec3 } from '../../core/math';
import type { ParamValue } from '../../core/model';
import { explodeGenerator } from '../actions';
import { MaterialSelect, NumberInput, Row, Section, TextInput } from '../components/Field';
import { FittingLibrary } from '../components/FittingLibrary';
import { AssemblyEditor, MembershipEditor } from '../components/AssemblyEditor';
import { OperationEditor } from '../components/OperationEditor';
import { sketchFromElement } from '../sketchDraft';
import { objectWorldFrame, setObjectWorldFrame } from '../../core/assemblies';
import { ParamForm } from '../components/ParamForm';
import { TransformPanel } from './TransformPanel';
import { fmt, has, useT } from '../i18n';
import { getState, setState, updateDoc, useApp, useEvaluated } from '../store';

export function Properties() {
  const t = useT();
  const ev = useEvaluated();
  const doc = useApp((s) => s.doc);
  const selection = useApp((s) => s.selection);
  const lang = useApp((s) => s.lang);

  if (selection.length === 0) return <div className="props"><div className="panel-title">{t('props.title')}</div><p className="muted pad">{t('props.none')}</p></div>;

  // ----- generator (directly selected or via one of its parts)
  const first = selection[0];
  if(selection.length===1&&first.startsWith('group:'))return <div className="props"><AssemblyEditor id={first.slice(6)}/><TransformPanel/></div>;
  if(selection.length===1&&first.startsWith('proc:'))return <div className="props"><OperationEditor reference={first}/></div>;
  if(selection.length===1&&first.startsWith('sketch:'))return <div className="props pad"><h3>{t('sketch.title')}</h3><button className="btn" onClick={()=>setState({dialog:{type:'sketch',id:decodeURIComponent(first.slice(7))}})}>{t('sketch.edit')}</button></div>;
  const elem = ev.elements.find((e) => e.id === first);
  const genId = first.startsWith('gen:') ? first.slice(4) : selection.length === 1 ? elem?.generator : undefined;
  const gen = genId ? doc.generators.find((g) => g.id === genId) : undefined;
  const jointId = first.startsWith('joint:') ? first.slice(6) : undefined;

  if (selection.length > 1 && !first.startsWith('gen:')) {
    const els = ev.elements.filter((e) => selection.includes(e.id));
    const kg = els.reduce((s, e) => { try { return s + (e.length * e.width * e.height / 1e9) * findMaterial(ev.catalog, e.materialId).density; } catch { return s; } }, 0);
    return (
      <div className="props">
        <div className="panel-title">{t('props.multi', { n: selection.length })}</div>
        <div className="pad">
          <Row label={t('safe.rawWeight')}>{fmt(kg, 1)} kg</Row>
          {els.length === 2 && <button className="btn" onClick={() => setState({ dialog: { type: 'joint', a: els[0].id, b: els[1].id } })}>{t('menu.joint')}</button>}
        </div>
        <TransformPanel />
      </div>
    );
  }

  const setGenParam = (id: string, v: ParamValue) => updateDoc((d) => {
    const g = d.generators.find((x) => x.id === genId);
    if (g) g.params[id] = v;
  });
  const setGenPos = (i: number, v: number) => updateDoc((d) => {
    const g = d.generators.find((x) => x.id === genId);
    if (g) { const f=objectWorldFrame(d,`gen:${g.id}`),o = [...f.o] as Vec3; o[i] = v; setObjectWorldFrame(d,`gen:${g.id}`,{...f,o}); }
  });
  const setGenRot = (deg: number) => updateDoc((d) => {
    const g = d.generators.find((x) => x.id === genId);
    if (g) setObjectWorldFrame(d,`gen:${g.id}`,frameFromEuler(objectWorldFrame(d,`gen:${g.id}`).o, [deg, 0, 0]));
  });

  return (
    <div className="props">
      {gen && (
        <>
          <div className="panel-title">◆ <TextInput value={gen.name} onCommit={(v) => updateDoc((d) => { const g = d.generators.find((x) => x.id === gen.id); if (g) g.name = v; })} /></div>
          {elem && (
            <div className="pad info-box">
              <strong>{t('props.pos')} {elem.pos}: {elem.name}</strong>
              <div className="muted small">{fmt(elem.length, 1)} × {fmt(elem.width, 1)} × {fmt(elem.height, 1)} mm · {(() => { try { return materialName(findMaterial(ev.catalog, elem.materialId), lang); } catch { return elem.materialId; } })()}</div>
              <ProcessingList ids={[elem.id]} />
              {(()=>{const info=partPlacementInfo(doc,ev,elem.id);return info&&<><button className="btn" disabled={!!info.blocked} onClick={()=>setState({dialog:{type:'partPlacement',id:elem.id},hover:null})}>{t('offset.open')}</button>{info.blocked&&<small>{t(info.blocked)}</small>}</>;})()}
            </div>
          )}
          {!!Object.keys(gen.partOffsets??{}).length&&<div className="pad"><small>{t('offset.count',{n:Object.keys(gen.partOffsets??{}).length})}</small><button className="btn" onClick={()=>updateDoc(d=>{const g=d.generators.find(g=>g.id===gen.id);if(g)delete g.partOffsets;})}>{t('offset.resetAll')}</button></div>}
          <ParamForm defs={GENERATORS[gen.type]?.params ?? []} values={gen.params} catalog={ev.catalog} onChange={setGenParam} />
          <div className="pad"><MembershipEditor objectKey={`gen:${gen.id}`}/></div>
          <Section title={t('props.placement')} open={false}>
            {(['X', 'Y', 'Z'] as const).map((ax, i) => (
              <Row key={ax} label={ax}><NumberInput value={objectWorldFrame(doc,`gen:${gen.id}`).o[i]} step={10} unit="mm" onCommit={(v) => setGenPos(i, v)} /></Row>
            ))}
            <Row label={t('props.rotation')}><NumberInput value={frameToEuler(objectWorldFrame(doc,`gen:${gen.id}`))[0]} step={15} unit="°" onCommit={setGenRot} /></Row>
          </Section>
          <TransformPanel />
          {gen.type==='schrank'&&<FittingLibrary/>}
          <div className="pad"><button className="btn subtle" onClick={() => explodeGenerator(gen.id)}>{t('menu.explode')}</button></div>
        </>
      )}
      {!gen && elem && <><ElementEditor id={elem.id} /><TransformPanel /></>}
      {jointId && <JointEditor id={jointId} />}
    </div>
  );
}

function ProcessingList({ ids }: { ids: string[] }) {
  const t = useT();
  const ev = useEvaluated();
  const e = ev.elements.find((x) => x.id === ids[0]);
  if (!e) return null;
  const counts = new Map<string, number>();
  for (const p of e.all) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  return (
    <div className="proc-list">
      {[...counts.entries()].map(([k, n]) => <span key={k} className="chip">{n}× {has(`proc.${k}`) ? t(`proc.${k}`) : k}</span>)}
      {ev.joints.filter(j=>j.a===e.id||j.b===e.id).map(j=><button key={j.id} className="chip" onClick={()=>setState({dialog:{type:'joint',id:j.id,a:j.a,b:j.b}})}>{t(`joint.${j.type}`)} · {ev.elements.find(other=>other.id===(j.a===e.id?j.b:j.a))?.name}</button>)}
    </div>
  );
}

function ElementEditor({ id }: { id: string }) {
  const t = useT();
  const ev = useEvaluated();
  const e = ev.elements.find((x) => x.id === id)!;
  const set = (fn: (el: (typeof getState extends () => infer S ? S : never)['doc']['elements'][number]) => void) => updateDoc((d) => {
    const el = d.elements.find((x) => x.id === id);
    if (el) {const local=el.frame;el.frame=objectWorldFrame(d,id);fn(el);const world=el.frame;el.frame=local;setObjectWorldFrame(d,id,world);}
  });
  const placement=e.sketch?objectWorldFrame(getState().doc,id):e.frame;
  const euler = frameToEuler(placement);
  let kg = 0;
  try { kg = (e.length * e.width * e.height / 1e9) * findMaterial(ev.catalog, e.materialId).density; } catch { /* unknown material */ }
  return (
    <>
      <div className="panel-title"><span className="pos-badge">{e.pos}</span> <TextInput value={e.name} onCommit={(v) => set((el) => { el.name = v; })} /></div>
      <div className="pad">
        <MembershipEditor objectKey={id}/>
        <Row label={t('props.material')}><MaterialSelect value={e.materialId} catalog={ev.catalog} onChange={(m) => set((el) => { el.materialId = m; })} /></Row>
        <Row label={t('props.length')}><NumberInput disabled={!!e.sketch} value={e.length} min={1} unit="mm" onCommit={(v) => set((el) => { el.length = v; })} /></Row>
        <Row label={t('props.width')}><NumberInput disabled={!!e.sketch} value={e.width} min={1} unit="mm" onCommit={(v) => set((el) => { el.width = v; })} /></Row>
        <Row label={t('props.height')}><NumberInput value={e.height} min={1} unit="mm" onCommit={(v) => set((el) => { el.height = v; })} /></Row>
        <Row label={t('safe.rawWeight')}>{fmt(kg, 1)} kg</Row>
        <ProcessingList ids={[e.id]} />
        {!!sketchFromElement(e)&&<button className="btn subtle" onClick={()=>setState({dialog:{type:'sketch',id}})}>{t(e.sketch?'sketch.edit':'sketch.convert')}</button>}
      </div>
      <Section title={t(e.sketch?'sketch.origin':'props.placement')}>
        {(['X', 'Y', 'Z'] as const).map((ax, i) => (
          <Row key={ax} label={ax}><NumberInput value={Math.round(placement.o[i] * 10) / 10} step={10} unit="mm" onCommit={(v) => set((el) => { const o = [...el.frame.o] as Vec3; o[i] = v; el.frame = { ...el.frame, o }; })} /></Row>
        ))}
        {(['Z', 'Y', 'X'] as const).map((ax, i) => (
          <Row key={`r${ax}`} label={`${t('props.rotation')} ${ax}`}><NumberInput value={euler[i]} step={15} unit="°" onCommit={(v) => set((el) => { const eu = [...euler] as Vec3; eu[i] = v; el.frame = frameFromEuler(el.frame.o, eu); })} /></Row>
        ))}
      </Section>
    </>
  );
}

function JointEditor({ id }: { id: string }) {
  const t=useT(),ev=useEvaluated(),j=ev.joints.find(x=>x.id===id);
  if (!j) return null;
  return <><div className="panel-title">⋈ {t(`joint.${j.type}`)}</div><div className="pad">
    <p>A: {ev.elements.find(e=>e.id===j.a)?.name??j.a}</p><p>B: {ev.elements.find(e=>e.id===j.b)?.name??j.b}</p>
    {j.suppressed&&<p className="warn">{t('jointEdit.suppressed')}</p>}
    <button className="btn" onClick={()=>setState({dialog:{type:'joint',id:j.id,a:j.a,b:j.b}})}>{t(j.suppressed?'jointEdit.restore':'jointEdit.title')}</button>
  </div></>;
}
