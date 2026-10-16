import { useEffect, useMemo, useRef, useState } from 'react';
import { JOINT_PARAMS, applyJoint, suggestJoints } from '../../core/joints';
import { uid } from '../../core/math';
import type { Joint, JointType, ParamValue } from '../../core/model';
import { geom, geomSig } from '../geomClient';
import { commitJoint, reviewJoint } from '../jointDraft';
import { evaluated, getState, setState, useApp } from '../store';
import { has, tm, useT } from '../i18n';
import { viewportFitIds } from '../Viewport';
import { NumberInput, Row } from './Field';

export function JointWorkbench({ a, b, id, onClose }: {a:string;b:string;id?:string;onClose:()=>void}) {
  const t=useT(), doc=useApp(s=>s.doc);
  const [base]=useState(()=>getState().doc);
  const [previousSelection]=useState(()=>getState().selection);
  const [joint,setJoint]=useState<Joint>(()=>{
    const ev=evaluated(base), existing=id?ev.joints.find(j=>j.id===id):undefined;
    if (existing) return {...structuredClone(existing),suppressed:false};
    const first=ev.elements.find(e=>e.id===a),second=ev.elements.find(e=>e.id===b);
    const options=first&&second?suggestJoints(first,second):[];
    const type=options.find(type=>{const r=applyJoint({id:'preview',a,b,type,params:{}},first!,second!);return !r.warnings.length&&r.processings.length;})??options[0]??'tenon';
    return {id:uid('j'),type,a,b,params:{}};
  });
  const review=useMemo(()=>reviewJoint(base,joint),[base,joint]);
  const parts=useMemo(()=>review.evaluation.elements.filter(e=>e.id===joint.a||e.id===joint.b),[review,joint]);
  const [showContext,setShowContext]=useState(false);
  const [revision,force]=useState(0),[check,setCheck]=useState<{review:typeof review|null;state:'checking'|'ready'|'overlap'|'failed';error?:string}>({review:null,state:'checking'});
  const ref=useRef<HTMLElement>(null);
  const stale=doc!==base;
  const close=()=>{setState({jointPreview:null,selection:previousSelection,tool:'select'});onClose();};
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.querySelector('select')?.focus();viewportFitIds([a,b]);return()=>previous?.focus();},[]);
  useEffect(()=>geom.subscribe(()=>force(n=>n+1)),[]);
  useEffect(()=>{
    if (stale) return;
    setState({jointPreview:{base,evaluation:review.evaluation,ids:[joint.a,joint.b],showContext},gizmoMode:'none',tool:'select'});
    return()=>setState({jointPreview:null});
  },[base,review,stale,showContext]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  useEffect(()=>{
    let cancelled=false;
    setCheck({review:null,state:'checking'});
    if (!review.valid||stale) return;
    if (geom.error) {setCheck({review,state:'failed',error:geom.error});return;}
    geom.request(parts);
    const failed=parts.find(e=>geom.failuresFor(e).length);
    if (failed) {setCheck({review,state:'failed',error:geom.failuresFor(failed).join(', ')});return;}
    if (!parts.every(e=>!!geom.mesh(geomSig(e)))) return;
    geom.overlaps(parts).then(pairs=>{if(!cancelled)setCheck({review,state:pairs.some(p=>!Number.isFinite(p.volume)||p.volume>500)?'overlap':'ready'});}).catch(error=>{if(!cancelled)setCheck({review,state:'failed',error:String(error)});});
    return()=>{cancelled=true;};
  },[review,parts,revision,stale]);
  const ready=review.valid&&!stale&&check.review===review&&check.state==='ready';
  const setParam=(key:string,value:ParamValue)=>setJoint(j=>({...j,params:{...j.params,[key]:value}}));
  return <section ref={ref} className="joint-workbench" role="dialog" aria-label={t('jointEdit.title')}>
    <div className="panel-title">{t('jointEdit.title')}</div>
    <p className="small">{t('jointEdit.preview')}</p>
    <p className="muted small">A: {parts.find(e=>e.id===joint.a)?.name??joint.a} · B: {parts.find(e=>e.id===joint.b)?.name??joint.b}</p>
    <label className="row"><input type="checkbox" checked={showContext} onChange={e=>setShowContext(e.target.checked)}/>{t('jointEdit.context')}</label>
    {joint.generator&&<p className="muted small">{t('jointEdit.template')}</p>}
    <Row label={t('jointEdit.type')}><select value={joint.type} onChange={e=>setJoint(j=>({...j,type:e.target.value as JointType,params:{}}))}>{(Object.keys(JOINT_PARAMS) as JointType[]).map(type=><option key={type} value={type}>{t(`joint.${type}`)}</option>)}</select></Row>
    {JOINT_PARAMS[joint.type].map(p=>{const value=joint.params[p.id]??p.default;return <Row key={p.id} label={t(`jparam.${p.id}`)}>
      {p.type==='number'?<NumberInput value={Number(value)} min={p.min} max={p.max} step={p.step} unit={p.unit} onCommit={v=>setParam(p.id,v)}/>:p.type==='boolean'?<input type="checkbox" checked={!!value} onChange={e=>setParam(p.id,e.target.checked)}/>:<select value={String(value)} onChange={e=>setParam(p.id,e.target.value)}>{p.options?.map(o=><option key={o} value={o}>{has(`opt.${o}`)?t(`opt.${o}`):o}</option>)}</select>}
    </Row>;})}
    <div className="btn-row"><button className="btn subtle" onClick={()=>setJoint(j=>({...j,a:j.b,b:j.a}))}>{t('jointEdit.swap')}</button><button className="btn subtle" onClick={()=>viewportFitIds([joint.a,joint.b])}>{t('cad.fitSelection')}</button></div>
    <div className={ready?'muted small':'warn small'} role="status">{stale?t('jointEdit.stale'):!review.valid?t('jointEdit.invalid'):check.review!==review||check.state==='checking'?t('jointEdit.checking'):t(`jointEdit.${check.state==='overlap'?'overlap':check.state}`,{error:check.error??''})}</div>
    {review.warnings.map((w,index)=><p key={index} className="warn small">{tm(w)}</p>)}
    <div className="btn-row"><button className="btn primary" disabled={!ready} onClick={()=>{if(ready)commitJoint(base,joint);}}>{t('jointEdit.apply')}</button><button className="btn" onClick={close}>{t('jointEdit.cancel')}</button></div>
  </section>;
}
