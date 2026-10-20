import { useEffect,useMemo,useRef,useState } from 'react';
import { staticChecks } from '../../core/checks';
import { evaluate } from '../../core/evaluate';
import { alignmentCandidate,alignmentStale,closeAlignment,commitAlignment } from '../faceAlignment';
import { geom,geomSig } from '../geomClient';
import { useT } from '../i18n';
import { parseMeasure } from '../precision';
import { resolveSelection } from '../selection';
import { getState,setState,useApp } from '../store';

export function AlignmentEditor(){
 const t=useT(),s=useApp(s=>s),edit=s.alignmentEdit;
 const [,pulse]=useState(0);useEffect(()=>geom.subscribe(()=>pulse(n=>n+1)),[]);
 const base=edit?.base,roots=edit?.roots,mounted=useRef(false);
 useEffect(()=>{mounted.current=true;const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeAlignment();}};window.addEventListener('keydown',cancel);
  return()=>{mounted.current=false;window.removeEventListener('keydown',cancel);queueMicrotask(()=>{if(!mounted.current&&getState().alignmentEdit?.roots===roots)setState({alignmentEdit:null,jointPreview:null,...(getState().dialog?.type==='align'?{dialog:null}:{})});});};
 },[base,roots]);
 const candidate=useMemo(()=>{
  if(!edit?.source||!edit.target)return null;
  try{const gap=parseMeasure(edit.input,'length');return {gap,...alignmentCandidate(edit.base,edit.roots,edit.source,edit.target,gap,edit.reverse,edit.mode)};}
  catch(error){return {error:error instanceof Error&&error.message==='align.statics'?'align.statics':'align.invalid'};}
 },[edit]);
 const [review,setReview]=useState<{candidate:typeof candidate;status:'pending'|'ready'|'collision'|'failed'}>({candidate:null,status:'pending'});
 const stale=!!edit&&alignmentStale(edit);
 useEffect(()=>{
  let cancelled=false;setReview({candidate,status:'pending'});
  if(!edit||!candidate||'error' in candidate||stale||!geom.ready||geom.error){setState({jointPreview:null});return;}
  if(staticChecks(candidate.evaluation).some(i=>i.severity==='error')){setReview({candidate,status:'failed'});return;}
  setState({jointPreview:{base:edit.base,evaluation:candidate.evaluation,ids:candidate.ids,showContext:true}});
  geom.request(candidate.evaluation.elements);
  geom.overlaps(candidate.evaluation.elements).then(pairs=>{if(!cancelled)setReview({candidate,status:pairs.some(p=>(candidate.ids.includes(p.a)||candidate.ids.includes(p.b))&&p.volume>1)?'collision':'ready'});}).catch(()=>{if(!cancelled)setReview({candidate,status:'failed'});});
  return()=>{cancelled=true;};
 },[candidate,stale,geom.ready]);
 if(!edit)return null;
 const ev=evaluate(edit.base),name=(id:string)=>ev.elements.find(e=>e.id===id)?.name??id;
 const failed=!!geom.error||candidate&&'evaluation' in candidate&&candidate.evaluation.elements.some(e=>geom.failed.has(geomSig(e)));
 const ready=!!candidate&&'evaluation' in candidate&&!stale&&!edit.error&&!failed&&review.candidate===candidate&&review.status==='ready'&&candidate.evaluation.elements.every(e=>!!geom.mesh(geomSig(e)));
 const patch=(value:Partial<typeof edit>)=>setState({alignmentEdit:{...edit,...value,error:null}});
 const apply=()=>{if(ready&&candidate&&'gap' in candidate)commitAlignment(edit,candidate.gap);};
 return <section className="alignment-editor" role="dialog" aria-label={t('align.title')} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeAlignment();}if(e.key==='Enter'){e.preventDefault();apply();}}}>
  <strong>{t('align.title')}</strong>
  <span>{t(!edit.source?'align.source':!edit.target?'align.target':'align.preview')}</span>
  <small>{t('align.count',{n:resolveSelection(ev,edit.roots).length})}</small>
  {edit.source&&<small>{t('align.sourceName',{name:name(edit.source.id)})}</small>}
  {edit.target&&<small>{t('align.targetName',{name:name(edit.target.id)})}</small>}
  <label>{t('align.mode')} <select aria-label={t('align.mode')} value={edit.mode} onChange={e=>patch({mode:e.target.value as typeof edit.mode})}><option value="plane">{t('align.plane')}</option><option value="point">{t('align.point')}</option></select></label>
  <label>{t('align.gap')} <input aria-label={t('align.gap')} value={edit.input} onChange={e=>patch({input:e.target.value})}/> mm</label>
  <label><input type="checkbox" checked={edit.reverse} onChange={e=>patch({reverse:e.target.checked})}/>{t('align.reverse')}</label>
  <small>{t('align.help')}</small>
  <small className="muted">{t('align.limit')}</small>
  <div role="status">{stale?t('offset.stale'):edit.error?t(edit.error):candidate&&'error' in candidate?t(candidate.error??'align.invalid'):failed||review.status==='failed'?t('align.invalid'):review.candidate===candidate&&review.status==='collision'?t('offset.collision'):ready?t('align.ready'):edit.target?t('common.loading'):''}</div>
  <div className="movement-scope-actions"><button onClick={()=>{patch({source:null,target:null});setState({jointPreview:null});}}>{t('align.again')}</button><button disabled={!ready} onClick={apply}>{t('common.apply')}</button><button onClick={closeAlignment}>{t('common.cancel')}</button></div>
 </section>;
}
