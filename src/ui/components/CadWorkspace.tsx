import type { PointerEvent } from 'react';
import { useT } from '../i18n';
import { getState, setState, useApp } from '../store';
import { viewportFit, viewportFitIds } from '../Viewport';
import type { ViewName } from '../cameraMath';
export function PanelResize({side}:{side:'left'|'right'}) {
 const t=useT(),cad=useApp(s=>s.cad),key=side==='left'?'leftWidth':'rightWidth';
 const commit=(value:number)=>setState({cad:{...getState().cad,[key]:Math.max(200,Math.min(460,value))}});
 const down=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.start=String(e.clientX);e.currentTarget.dataset.width=String(getState().cad[key]);};
 return <div className="cad-resizer" role="separator" tabIndex={0} aria-label={t('cad.resize')} aria-orientation="vertical" aria-valuemin={200} aria-valuemax={460} aria-valuenow={cad[key]} onPointerDown={down} onPointerMove={(e)=>{if(e.currentTarget.hasPointerCapture(e.pointerId))commit(Number(e.currentTarget.dataset.width)+(e.clientX-Number(e.currentTarget.dataset.start))*(side==='left'?1:-1));}} onPointerUp={(e)=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onKeyDown={(e)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();commit(cad[key]+(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*10);}}}/>;
}
export function CadViewControls() {
 const t=useT(),cad=useApp(s=>s.cad),selection=useApp(s=>s.selection);
 const views:[ViewName,string][]=[['top','view.top'],['front','view.front'],['side','view.side'],['back','cad.back'],['left','cad.left'],['bottom','cad.bottom'],['iso','view.iso']];
 return <div className="cad-view-controls" aria-label={t('cad.views')}>
  <div className="cad-view-grid">{views.map(([view,label])=><button key={view} onClick={()=>viewportFit(view)}>{t(label)}</button>)}</div>
  <select aria-label={t('cad.orthographic')} value={cad.projection} onChange={e=>setState({cad:{...getState().cad,projection:e.target.value as 'perspective'|'orthographic'}})}><option value="perspective">{t('cad.perspective')}</option><option value="orthographic">{t('cad.orthographic')}</option></select>
  <button disabled={!selection.length} title={!selection.length?t('cad.selectionEmpty'):undefined} onClick={()=>viewportFitIds(selection)}>{t('cad.fitSelection')}</button>
 </div>;
}
