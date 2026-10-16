import { useState } from 'react';
import { has, useT } from '../i18n';
import { setState, useApp, useEvaluated } from '../store';
import { viewportFitIds } from '../Viewport';
import { visibleElements } from '../selection';
import { togglePartVisibility } from '../viewActions';

export function Tree() {
  const t = useT();
  const ev = useEvaluated();
  const doc = useApp((s) => s.doc);
  const selection = useApp((s) => s.selection);
  const visibilityOverrides=useApp(s=>s.visibilityOverrides),isolatedIds=useApp(s=>s.isolatedIds);
  const visible=new Set(visibleElements(ev.elements,{visibilityOverrides,isolatedIds}).map(e=>e.id));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query,setQuery]=useState('');
  const q=query.trim().toLocaleLowerCase();
  const matches=(...values:(string|number|undefined)[])=>values.some(v=>String(v??'').toLocaleLowerCase().includes(q));
  const sel = new Set(selection);
  const click = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey) setState((s) => ({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] }));
    else setState({ selection: [id] });
  };
  const free = ev.elements.filter((e) => !e.generator);
  const roleName = (r?: string) => (r && has(`role.${r}`) ? t(`role.${r}`) : '');
  const generators=doc.generators.filter(g=>matches(g.name)||ev.elements.some(e=>e.generator===g.id && matches(e.name,e.pos,e.role)));
  const freeMatches=free.filter(e=>matches(e.name,e.pos,e.role,e.materialId));
  const joints=doc.joints.filter(j=>matches(t(`joint.${j.type}`),j.a,j.b,ev.elements.find(e=>e.id===j.a)?.name,ev.elements.find(e=>e.id===j.b)?.name));

  return (
    <div className="tree">
      <div className="panel-title">{t('tree.title')}: <strong>{doc.project.name}</strong></div>
      <div className="cad-tree-search"><input type="search" aria-label={t('cad.treeSearch')} placeholder={t('cad.treeSearch')} value={query} onChange={e=>setQuery(e.target.value)}/></div>
      {doc.generators.length === 0 && free.length === 0 && <p className="muted pad">{t('tree.empty')}</p>}
      {q && !generators.length && !freeMatches.length && !joints.length && <p className="muted pad">{t('cad.noParts')}</p>}
      {generators.length > 0 && <div className="tree-head">{t('tree.generators')}</div>}
      {generators.map((g) => {
        const parts = ev.elements.filter((e) => e.generator === g.id && (!q || matches(g.name,e.name,e.pos,e.role)));
        const isOpen = q?true:open[g.id];
        return (
          <div key={g.id}>
            <div role="button" tabIndex={0} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setState({selection:[`gen:${g.id}`]});}}} className={`tree-item ${sel.has(`gen:${g.id}`) ? 'sel' : ''}`} onDoubleClick={()=>viewportFitIds([`gen:${g.id}`])} onClick={(e) => click(`gen:${g.id}`, e)}>
              <button className="twisty" onClick={(e) => { e.stopPropagation(); setOpen({ ...open, [g.id]: !isOpen }); }}>{isOpen ? '▾' : '▸'}</button>
              <span className="tree-icon">◆</span>
              <span className="grow">{g.name}</span>
              <span className="muted small">{parts.length}</span>
              <button className="eye" onDoubleClick={event=>event.stopPropagation()} title={t('context.visibility')} aria-label={`${g.name}: ${t('cad.visibility')}`} aria-pressed={ev.elements.some(e=>e.generator===g.id&&visible.has(e.id))} onClick={(e) => { e.stopPropagation(); togglePartVisibility([`gen:${g.id}`]); }}>{ev.elements.some(e=>e.generator===g.id&&visible.has(e.id)) ? '●' : '◌'}</button>
            </div>
            {isOpen && parts.map((e) => (
              <div key={e.id} role="button" tabIndex={0} onKeyDown={ev2=>{if(ev2.target===ev2.currentTarget&&(ev2.key==='Enter'||ev2.key===' ')){ev2.preventDefault();setState({selection:[e.id]});}}} className={`tree-item child ${sel.has(e.id) ? 'sel' : ''}`} onDoubleClick={()=>viewportFitIds([e.id])} onClick={(ev2) => click(e.id, ev2)}>
                <span className="pos-badge">{e.pos}</span>
                <span className="grow">{e.name}</span>
                <span className="muted small">{roleName(e.role)}</span>
                <button className="eye" onDoubleClick={event=>event.stopPropagation()} aria-label={`${e.name}: ${t('cad.visibility')}`} title={t('context.visibility')} aria-pressed={visible.has(e.id)} onClick={event=>{event.stopPropagation();togglePartVisibility([e.id]);}}>{visible.has(e.id)?'●':'◌'}</button>
              </div>
            ))}
          </div>
        );
      })}
      {freeMatches.length > 0 && <div className="tree-head">{t('tree.elements')}</div>}
      {freeMatches.map((e) => (
        <div key={e.id} role="button" tabIndex={0} onKeyDown={ev2=>{if(ev2.target===ev2.currentTarget&&(ev2.key==='Enter'||ev2.key===' ')){ev2.preventDefault();setState({selection:[e.id]});}}} className={`tree-item ${sel.has(e.id) ? 'sel' : ''}`} onDoubleClick={()=>viewportFitIds([e.id])} onClick={(ev2) => click(e.id, ev2)}>
          <span className="pos-badge">{e.pos}</span>
          <span className="grow">{e.name}</span>
          <span className="muted small">{Math.round(e.width)}×{Math.round(e.height)}</span>
          <button className="eye" onDoubleClick={event=>event.stopPropagation()} aria-label={`${e.name}: ${t('cad.visibility')}`} title={t('context.visibility')} aria-pressed={visible.has(e.id)} onClick={event=>{event.stopPropagation();togglePartVisibility([e.id]);}}>{visible.has(e.id)?'●':'◌'}</button>
        </div>
      ))}
      {joints.length > 0 && <div className="tree-head">{t('tree.joints')}</div>}
      {joints.map((j) => {
        const a = ev.elements.find((e) => e.id === j.a);
        const b = ev.elements.find((e) => e.id === j.b);
        return (
          <div key={j.id} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setState({selection:[`joint:${j.id}`]});}}} className={`tree-item ${sel.has(`joint:${j.id}`) ? 'sel' : ''}`} onDoubleClick={()=>viewportFitIds([`joint:${j.id}`])} onClick={(e) => click(`joint:${j.id}`, e)}>
            <span className="tree-icon">⋈</span>
            <span className="grow">{t(`joint.${j.type}`)}</span>
            <span className="muted small">{a?.name ?? '?'} ↔ {b?.name ?? '?'}</span>
          </div>
        );
      })}
    </div>
  );
}
