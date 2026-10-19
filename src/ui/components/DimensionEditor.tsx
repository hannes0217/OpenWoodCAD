import { useEffect, useRef, useState } from 'react';
import { geom, geomSig } from '../geomClient';
import { useT } from '../i18n';
import { commitDimensionEdit, dimensionReview, previewDimension } from '../modelDimensions';
import { setState, useApp } from '../store';

export function DimensionEditor(){
 const edit=useApp(s=>s.dimensionEdit),t=useT(),input=useRef<HTMLInputElement>(null);
 const [,refresh]=useState(0);
 useEffect(()=>geom.subscribe(()=>refresh(n=>n+1)),[]);
 useEffect(()=>{if(edit){input.current?.focus();input.current?.select();}},[edit?.dimension.key]);
 useEffect(()=>{if(edit?.evaluation)geom.request(edit.evaluation.elements);},[edit?.evaluation,geom.ready]);
 if(!edit)return null;
 const review=dimensionReview(edit,geom,geomSig),ready=review==='ready';
 const apply=()=>{if(ready)commitDimensionEdit();};
 return <div className="dimension-editor" role="dialog" aria-label={t('dimension.edit')} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();setState({dimensionEdit:null});}if(e.key==='Enter'){e.preventDefault();apply();}}}>
  <strong>{t(edit.dimension.label)} <span className="muted">{edit.dimension.unit}</span></strong>
  <div className="dimension-entry"><input ref={input} aria-label={t('dimension.edit')} aria-invalid={review==='invalid'} value={edit.input} onChange={e=>previewDimension(e.target.value)}/><button className="btn primary" disabled={!ready} onClick={apply}>{t('common.apply')}</button><button className="btn" onClick={()=>setState({dimensionEdit:null})}>{t('common.cancel')}</button></div>
  <div className="small muted">{t('dimension.range',{min:edit.dimension.min,max:edit.dimension.max,unit:edit.dimension.unit})}</div>
  <div className="small" role="status">{review==='invalid'?t('dimension.invalid'):review==='failed'?t('dimension.geometry'):!ready?t('common.loading'):t('dimension.preview')}</div>
  {!!edit.evaluation?.warnings.length&&<div className="small">{t('dimension.warnings',{n:edit.evaluation.warnings.length})}</div>}
 </div>;
}
