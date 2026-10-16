import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { groupPath, movableRoots } from '../../core/assemblies';
import type { EvalElement } from '../../core/evaluate';
import { processingKey } from '../../core/references';
import { groupSelection, dissolveSelection } from '../assemblyActions';
import { has, useT } from '../i18n';
import { setState, useApp, useEvaluated } from '../store';
import { viewportFitIds } from '../Viewport';
import { visibleElements } from '../selection';
import { togglePartVisibility } from '../viewActions';

export function Tree() {
  const t=useT(),ev=useEvaluated(),doc=useApp(s=>s.doc),selection=useApp(s=>s.selection);
  const visibilityOverrides=useApp(s=>s.visibilityOverrides),isolatedIds=useApp(s=>s.isolatedIds);
  const visible=new Set(visibleElements(ev.elements,{visibilityOverrides,isolatedIds}).map(e=>e.id));
  const [open,setOpen]=useState<Record<string,boolean>>({}),[query,setQuery]=useState('');
  const q=query.trim().toLocaleLowerCase(),sel=new Set(selection);
  const matches=(...values:(string|number|undefined)[])=>values.some(v=>String(v??'').toLocaleLowerCase().includes(q));
  const click=(id:string,event:MouseEvent)=>{if(event.shiftKey||event.ctrlKey)setState(s=>({selection:s.selection.includes(id)?s.selection.filter(x=>x!==id):[...s.selection,id]}));else setState({selection:[id]});};
  const toggle=(id:string)=>setOpen(previous=>({...previous,[id]:!previous[id]}));
  const keydown=(id:string,expandable:boolean)=>(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.target!==event.currentTarget)return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();setState({selection:[id]});}
    if(expandable&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();setOpen(previous=>({...previous,[id]:event.key==='ArrowRight'}));}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();const rows=Array.from(event.currentTarget.closest('[role=tree]')?.querySelectorAll<HTMLElement>('[role=treeitem]')??[]);
      rows[Math.max(0,Math.min(rows.length-1,rows.indexOf(event.currentTarget)+(event.key==='ArrowDown'?1:-1)))]?.focus();
    }
  };
  const row=(id:string,label:string,detail:ReactNode,children:ReactNode[],partIds:string[],depth:number,expandable=false)=>{
    const expanded=!!q||!!open[id];
    return <div key={id}>
      <div role="treeitem" aria-level={depth+1} aria-expanded={expandable?expanded:undefined} aria-selected={sel.has(id)} tabIndex={0} className={`tree-item ${sel.has(id)?'sel':''}`} style={{paddingLeft:8+depth*14}} onKeyDown={keydown(id,expandable)} onClick={event=>click(id,event)} onDoubleClick={()=>viewportFitIds([id])}>
        {expandable?<button className="twisty" tabIndex={-1} aria-label={label} onClick={event=>{event.stopPropagation();toggle(id);}}>{expanded?'▾':'▸'}</button>:<span className="tree-icon">·</span>}
        <span className="grow">{label}</span><span className="muted small">{detail}</span>
        {!!partIds.length&&<button className="eye" onDoubleClick={event=>event.stopPropagation()} aria-label={`${label}: ${t('cad.visibility')}`} aria-pressed={partIds.some(key=>visible.has(key))} onClick={event=>{event.stopPropagation();togglePartVisibility([id]);}}>{partIds.some(key=>visible.has(key))?'●':'◌'}</button>}
      </div>
      {expanded&&children}
    </div>;
  };
  const part=(element:EvalElement,depth:number,parentMatch=false):ReactNode=>{
    const operations=[...element.processings,...element.all.filter(p=>p.jointId)];
    if(q&&!parentMatch&&!matches(element.name,element.pos,element.role,element.materialId)&&!operations.some(p=>matches(t(`proc.${p.type}`))))return null;
    const children=operations.map((proc,index)=>row(processingKey(element.id,proc.id),`${index+1}. ${t(`proc.${proc.type}`)}`,proc.suppressed?t('assembly.suppressed'):proc.jointId?'⋈':'',[],[],depth+1));
    return row(element.id,`${element.pos} · ${element.name}`,element.role&&has(`role.${element.role}`)?t(`role.${element.role}`):'',children,[element.id],depth,!!children.length);
  };
  const generator=(id:string,depth:number,parentMatch=false):ReactNode=>{
    const g=doc.generators.find(item=>item.id===id)!;const parts=ev.elements.filter(e=>e.generator===id);
    if(q&&!parentMatch&&!matches(g.name)&&!parts.some(e=>matches(e.name,e.pos,e.role)))return null;
    return row(`gen:${id}`,g.name,parts.length,parts.map(e=>part(e,depth+1,parentMatch||matches(g.name))),parts.map(e=>e.id),depth,true);
  };
  const assembly=(id:string,depth:number,parentMatch=false):ReactNode=>{
    const g=doc.groups.find(item=>item.id===id)!,parts=ev.elements.filter(e=>e.assemblyPath?.includes(id));
    const containsMatch=matches(g.name)||doc.groups.some(other=>groupPath(doc,other.parent).includes(id)&&matches(other.name))||doc.generators.some(other=>groupPath(doc,other.groupId).includes(id)&&matches(other.name))||parts.some(e=>matches(e.name,e.pos,e.role));
    if(q&&!parentMatch&&!containsMatch)return null;
    const show=parentMatch||matches(g.name);
    return row(`group:${id}`,g.name,parts.length,[...doc.groups.filter(child=>child.parent===id).map(child=>assembly(child.id,depth+1,show)),...doc.generators.filter(child=>child.groupId===id).map(child=>generator(child.id,depth+1,show)),...ev.elements.filter(e=>!e.generator&&e.groupId===id).map(e=>part(e,depth+1,show))],parts.map(e=>e.id),depth,true);
  };
  return <div className="tree">
    <div className="panel-title">{t('tree.title')}: <strong>{doc.project.name}</strong></div>
    <div className="cad-tree-search"><input type="search" aria-label={t('cad.treeSearch')} placeholder={t('cad.treeSearch')} value={query} onChange={event=>setQuery(event.target.value)}/></div>
    <div className="assembly-tree-actions"><button className="btn subtle" disabled={!movableRoots(doc,ev,selection).length} onClick={groupSelection}>{t('assembly.create')}</button>{selection.some(key=>key.startsWith('group:'))&&<button className="btn subtle" onClick={dissolveSelection}>{t('assembly.dissolve')}</button>}</div>
    {!ev.elements.length&&!doc.groups.length&&<p className="muted pad">{t('tree.empty')}</p>}
    <div role="tree" aria-label={t('tree.title')}>
      {doc.groups.filter(g=>!g.parent).map(g=>assembly(g.id,0))}
      {doc.generators.filter(g=>!g.groupId).map(g=>generator(g.id,0))}
      {ev.elements.filter(e=>!e.generator&&!e.groupId).map(e=>part(e,0))}
      {!!ev.joints.length&&<div className="tree-head">{t('tree.joints')}</div>}
      {ev.joints.filter(j=>matches(t(`joint.${j.type}`),j.a,j.b,ev.elements.find(e=>e.id===j.a)?.name,ev.elements.find(e=>e.id===j.b)?.name)).map(j=>row(`joint:${j.id}`,t(`joint.${j.type}`),j.suppressed?t('assembly.suppressed'):'⋈',[],[],0))}
    </div>
  </div>;
}
