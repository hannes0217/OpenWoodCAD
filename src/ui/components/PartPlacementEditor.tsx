import { useEffect,useMemo,useState } from 'react';
import { staticChecks } from '../../core/checks';
import { evaluate } from '../../core/evaluate';
import type { Vec3 } from '../../core/math';
import { geom,geomSig } from '../geomClient';
import { useT } from '../i18n';
import { parseMeasure } from '../precision';
import { commitPartPlacement,partPlacementCandidate,partPlacementInfo } from '../partPlacement';
import { getState,setState,useApp } from '../store';

export function PartPlacementEditor({id}:{id:string}){
 useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setState({jointPreview:null,dialog:null});}};window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);},[]);
 const t=useT(),[base]=useState(()=>({doc:getState().doc,project:getState().projectId}));
 const current=useApp(s=>s.doc),project=useApp(s=>s.projectId);
 const info=useMemo(()=>partPlacementInfo(base.doc,evaluate(base.doc),id),[base,id]);
 const [input,setInput]=useState(()=> (info?.offset??[0,0,0]).map(String));
 const [grid,setGrid]=useState(false),[check,setCheck]=useState<'pending'|'ready'|'collision'|'failed'>('pending');
 const [,pulse]=useState(0);useEffect(()=>geom.subscribe(()=>pulse(n=>n+1)),[]);
 const draft=useMemo(()=>{try{const offset=input.map(v=>parseMeasure(v,'length')) as Vec3;
   if(grid&&Math.abs(offset[2]/32-Math.round(offset[2]/32))>1e-7)return null;
   return {offset,...partPlacementCandidate(base.doc,id,offset)};}catch{return null;}},[base,id,input,grid]);
 const [reviewed,setReviewed]=useState<typeof draft>(null);
 const stale=current!==base.doc||project!==base.project;
 useEffect(()=>{
  let cancelled=false;setCheck('pending');setReviewed(null);
  if(!draft||stale||!geom.ready||geom.error){if(getState().jointPreview?.base===base.doc)setState({jointPreview:null});return;}
  if(staticChecks(draft.evaluation).some(i=>i.severity==='error')){setCheck('failed');return;}
  geom.request(draft.evaluation.elements);
  setState({jointPreview:{base:base.doc,evaluation:draft.evaluation,ids:[id],showContext:true}});
  geom.overlaps(draft.evaluation.elements).then(pairs=>{if(!cancelled){setReviewed(draft);setCheck(pairs.some(p=>(p.a===id||p.b===id)&&p.volume>1)?'collision':'ready');}}).catch(()=>{if(!cancelled)setCheck('failed');});
  return ()=>{cancelled=true;};
 },[draft,stale,base,id,geom.ready]);
 useEffect(()=>()=>{if(getState().jointPreview?.base===base.doc)setState({jointPreview:null});},[base]);
 const failed=!!geom.error||!!draft?.evaluation.elements.some(e=>geom.failed.has(geomSig(e)));
 const ready=!!draft&&!stale&&!failed&&check==='ready'&&reviewed===draft&&draft.evaluation.elements.every(e=>!!geom.mesh(geomSig(e)));
 const close=()=>setState({jointPreview:null,dialog:null});
 const apply=()=>{if(ready&&draft)commitPartPlacement(base.doc,base.project,id,draft.offset);};
 return <section className="part-placement-editor" role="dialog" aria-label={t('offset.title')} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Enter'){e.preventDefault();apply();}}}>
  <strong>{t('offset.title')} · {info?.part.name}</strong>
  <small>{t('offset.help')}</small>
  {info?.blocked?<p>{t(info.blocked)}</p>:<>
   <div className="placement-fields">{['X','Y','Z'].map((axis,index)=><label key={axis}>{axis} <input aria-label={`${axis} mm`} value={input[index]} onChange={e=>setInput(input.map((v,i)=>i===index?e.target.value:v))}/> mm</label>)}</div>
   <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>{t('offset.grid')}</label>
   <small>{t('offset.support')}</small>
   <div role="status">{t(stale?'offset.stale':!draft||failed||check==='failed'?'offset.failed':check==='collision'?'offset.collision':ready?'offset.preview':'common.loading')}</div>
  </>}
  <div className="movement-scope-actions"><button disabled={!!info?.blocked} onClick={()=>setInput(['0','0','0'])}>{t('offset.reset')}</button><button disabled={!ready} onClick={apply}>{t('common.apply')}</button><button onClick={close}>{t('common.cancel')}</button></div>
 </section>;
}
