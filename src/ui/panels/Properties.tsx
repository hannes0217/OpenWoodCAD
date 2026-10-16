import { findMaterial, materialName } from '../../core/catalog';
import { GENERATORS } from '../../core/generators';
import { JOINT_PARAMS } from '../../core/joints';
import { frameFromEuler, frameToEuler, type Vec3 } from '../../core/math';
import type { ParamValue } from '../../core/model';
import { explodeGenerator } from '../actions';
import { MaterialSelect, NumberInput, Row, Section, TextInput } from '../components/Field';
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
    if (g) { const o = [...g.frame.o] as Vec3; o[i] = v; g.frame = { ...g.frame, o }; }
  });
  const setGenRot = (deg: number) => updateDoc((d) => {
    const g = d.generators.find((x) => x.id === genId);
    if (g) g.frame = frameFromEuler(g.frame.o, [deg, 0, 0]);
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
            </div>
          )}
          <ParamForm defs={GENERATORS[gen.type]?.params ?? []} values={gen.params} catalog={ev.catalog} onChange={setGenParam} />
          <Section title={t('props.placement')} open={false}>
            {(['X', 'Y', 'Z'] as const).map((ax, i) => (
              <Row key={ax} label={ax}><NumberInput value={gen.frame.o[i]} step={10} unit="mm" onCommit={(v) => setGenPos(i, v)} /></Row>
            ))}
            <Row label={t('props.rotation')}><NumberInput value={frameToEuler(gen.frame)[0]} step={15} unit="°" onCommit={setGenRot} /></Row>
          </Section>
          <TransformPanel />
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
  if (!e || e.all.length === 0) return null;
  const counts = new Map<string, number>();
  for (const p of e.all) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  return (
    <div className="proc-list">
      {[...counts.entries()].map(([k, n]) => <span key={k} className="chip">{n}× {has(`proc.${k}`) ? t(`proc.${k}`) : k}</span>)}
    </div>
  );
}

function ElementEditor({ id }: { id: string }) {
  const t = useT();
  const ev = useEvaluated();
  const e = ev.elements.find((x) => x.id === id)!;
  const set = (fn: (el: (typeof getState extends () => infer S ? S : never)['doc']['elements'][number]) => void) => updateDoc((d) => {
    const el = d.elements.find((x) => x.id === id);
    if (el) fn(el);
  });
  const euler = frameToEuler(e.frame);
  let kg = 0;
  try { kg = (e.length * e.width * e.height / 1e9) * findMaterial(ev.catalog, e.materialId).density; } catch { /* unknown material */ }
  return (
    <>
      <div className="panel-title"><span className="pos-badge">{e.pos}</span> <TextInput value={e.name} onCommit={(v) => set((el) => { el.name = v; })} /></div>
      <div className="pad">
        <Row label={t('props.material')}><MaterialSelect value={e.materialId} catalog={ev.catalog} onChange={(m) => set((el) => { el.materialId = m; })} /></Row>
        <Row label={t('props.length')}><NumberInput value={e.length} min={1} unit="mm" onCommit={(v) => set((el) => { el.length = v; })} /></Row>
        <Row label={t('props.width')}><NumberInput value={e.width} min={1} unit="mm" onCommit={(v) => set((el) => { el.width = v; })} /></Row>
        <Row label={t('props.height')}><NumberInput value={e.height} min={1} unit="mm" onCommit={(v) => set((el) => { el.height = v; })} /></Row>
        <Row label={t('safe.rawWeight')}>{fmt(kg, 1)} kg</Row>
        <ProcessingList ids={[e.id]} />
      </div>
      <Section title={t('props.placement')}>
        {(['X', 'Y', 'Z'] as const).map((ax, i) => (
          <Row key={ax} label={ax}><NumberInput value={Math.round(e.frame.o[i] * 10) / 10} step={10} unit="mm" onCommit={(v) => set((el) => { const o = [...el.frame.o] as Vec3; o[i] = v; el.frame = { ...el.frame, o }; })} /></Row>
        ))}
        {(['Z', 'Y', 'X'] as const).map((ax, i) => (
          <Row key={`r${ax}`} label={`${t('props.rotation')} ${ax}`}><NumberInput value={euler[i]} step={15} unit="°" onCommit={(v) => set((el) => { const eu = [...euler] as Vec3; eu[i] = v; el.frame = frameFromEuler(el.frame.o, eu); })} /></Row>
        ))}
      </Section>
    </>
  );
}

function JointEditor({ id }: { id: string }) {
  const t = useT();
  const doc = useApp((s) => s.doc);
  const j = doc.joints.find((x) => x.id === id);
  if (!j) return null;
  const defs = JOINT_PARAMS[j.type];
  const set = (k: string, v: ParamValue) => updateDoc((d) => {
    const jj = d.joints.find((x) => x.id === id);
    if (jj) jj.params[k] = v;
  });
  return (
    <>
      <div className="panel-title">⋈ {t(`joint.${j.type}`)}</div>
      <div className="pad">
        {defs.map((p) => {
          const v = j.params[p.id] ?? p.default;
          return (
            <Row key={p.id} label={t(`jparam.${p.id}`)}>
              {p.type === 'number' && <NumberInput value={Number(v)} min={p.min} max={p.max} step={p.step} unit={p.unit} onCommit={(n) => set(p.id, n)} />}
              {p.type === 'boolean' && <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(p.id, e.target.checked)} />}
              {p.type === 'select' && (
                <select value={String(v)} onChange={(e) => set(p.id, e.target.value)}>
                  {p.options!.map((o) => <option key={o} value={o}>{has(`opt.${o}`) ? t(`opt.${o}`) : o}</option>)}
                </select>
              )}
            </Row>
          );
        })}
        <button className="btn subtle" onClick={() => { const a = j.a; updateDoc((d) => { const jj = d.joints.find((x) => x.id === id); if (jj) { jj.a = jj.b; jj.b = a; } }); }}>A ⇄ B</button>
      </div>
    </>
  );
}
