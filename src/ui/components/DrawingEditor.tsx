import type { DrawingDimension, DrawingPointRef, DrawingView } from '../../core/model';
import { elementCorners } from '../../core/elements';
import { uid } from '../../core/math';
import { DRAWING_AXES } from '../../drawing/custom';
import { useT } from '../i18n';
import { updateDoc, useApp, useEvaluated } from '../store';
import { NumberInput, TextInput } from './Field';

const NO_VIEWS: DrawingView[]=[];
export function DrawingEditor(){
 const t=useT(),views=useApp(s=>s.doc.drawingViews??NO_VIEWS),ev=useEvaluated();
 const edit=(id:string,fn:(view:DrawingView)=>void)=>updateDoc(doc=>{const view=doc.drawingViews?.find(v=>v.id===id);if(view)fn(view);});
 const center=(view:DrawingView)=>{
  const axes=DRAWING_AXES[view.view],points=ev.elements.flatMap(elementCorners),dot=(p:number[],axis:number[])=>p.reduce((sum,n,i)=>sum+n*axis[i],0);
  const values=(axis:number[])=>points.map(p=>dot(p,axis));
  const middle=(array:number[])=>array.length?(Math.min(...array)+Math.max(...array))/2:0;
  return {u:middle(values(axes.u)),v:middle(values(axes.v)),offset:middle(points.map(p=>p[view.view==='front'?1:view.view==='side'?0:2]))};
 };
 const pointControl=(view:DrawingView,dimension:DrawingDimension,key:'a'|'b')=>{
  const ref=dimension[key],patch=(fn:(point:DrawingPointRef)=>void)=>edit(view.id,v=>{const dim=v.dimensions.find(d=>d.id===dimension.id);if(dim)fn(dim[key]);});
  return <label>{t(key==='a'?'drawing.pointA':'drawing.pointB')} <select value={ref.elementId??''} onChange={e=>patch(p=>{p.elementId=e.target.value||undefined;})}>
   <option value="">{t('drawing.model')}</option>{ref.elementId&&!ev.elements.some(e=>e.id===ref.elementId)&&<option value={ref.elementId}>{ref.elementId} (?)</option>}{ev.elements.map(e=><option key={e.id} value={e.id}>{e.pos} · {e.name}</option>)}
  </select><select aria-label={t('drawing.corner')} value={ref.corner} onChange={e=>patch(p=>{p.corner=Number(e.target.value);})}>{Array.from({length:8},(_,n)=><option key={n} value={n}>{['X','Y','Z'].map((axis,i)=>`${axis} ${t(n&(1<<i)?'drawing.max':'drawing.min')}`).join(' / ')}</option>)}</select></label>;
 };
 return <details className="drawing-editor"><summary>{t('drawing.edit')}</summary>
  <p className="muted small">{t('drawing.stockReferences')}</p>
  <button className="btn" disabled={views.length>=20} onClick={()=>updateDoc(doc=>{(doc.drawingViews??=[]).push({id:uid('view'),title:t('drawing.custom'),view:'front',dimensions:[]});})}>{t('drawing.addView')}</button>
  {views.map(view=><fieldset key={view.id}><legend>{view.title}</legend>
   <label>{t('drawing.title')} <TextInput value={view.title} onCommit={value=>edit(view.id,v=>{v.title=value.slice(0,120);})}/></label>
   <label>{t('drawing.view')} <select value={view.view} onChange={e=>edit(view.id,v=>{v.view=e.target.value as DrawingView['view'];})}>{(['front','side','top'] as const).map(name=><option key={name} value={name}>{t(`drawing.${name}`)}</option>)}</select></label>
   <label><input type="checkbox" checked={view.sectionOffset!==undefined} onChange={e=>edit(view.id,v=>{v.sectionOffset=e.target.checked?center(v).offset:undefined;})}/>{t('drawing.section')}</label>
   {view.sectionOffset!==undefined&&<label>{t('drawing.sectionOffset',{axis:view.view==='front'?'Y':view.view==='side'?'X':'Z'})} <NumberInput value={view.sectionOffset} unit="mm" min={-1000000} max={1000000} onCommit={value=>edit(view.id,v=>{v.sectionOffset=value;})}/></label>}
   <label><input type="checkbox" checked={!!view.detail} onChange={e=>edit(view.id,v=>{const c=center(v);v.detail=e.target.checked?{u:c.u,v:c.v,width:500,height:500}:undefined;})}/>{t('drawing.detail')}</label>
   {view.detail&&(['u','v','width','height'] as const).map(key=><label key={key}>{t(`drawing.${{u:'centerU',v:'centerV',width:'width',height:'height'}[key]}`)} <NumberInput value={view.detail![key]} unit="mm" min={key==='width'||key==='height'?1:-1000000} max={1000000} onCommit={value=>edit(view.id,v=>{if(v.detail)v.detail[key]=value;})}/></label>)}
   <div className="btn-row"><button className="btn" disabled={view.dimensions.length>=100} onClick={()=>edit(view.id,v=>v.dimensions.push({id:uid('dim'),a:{corner:0},b:{corner:7},orientation:'h',offset:10}))}>{t('drawing.addDimension')}</button><button className="btn subtle" onClick={()=>updateDoc(doc=>{doc.drawingViews=doc.drawingViews?.filter(v=>v.id!==view.id);})}>{t('drawing.deleteView')}</button></div>
   {view.dimensions.map((dimension,index)=><div className="drawing-dimension" key={dimension.id} role="group" aria-label={t('drawing.dimension',{n:index+1})}>{pointControl(view,dimension,'a')}{pointControl(view,dimension,'b')}
    <select aria-label={t('drawing.orientation')} value={dimension.orientation} onChange={e=>edit(view.id,v=>{v.dimensions.find(d=>d.id===dimension.id)!.orientation=e.target.value as DrawingDimension['orientation'];})}>{(['h','v','aligned'] as const).map(value=><option key={value} value={value}>{t(`drawing.${{h:'horizontal',v:'vertical',aligned:'aligned'}[value]}`)}</option>)}</select>
    <label>{t('drawing.offset')} <NumberInput value={dimension.offset} unit="mm" min={-80} max={80} onCommit={value=>edit(view.id,v=>{v.dimensions.find(d=>d.id===dimension.id)!.offset=value;})}/></label>
    <button className="btn subtle" onClick={()=>edit(view.id,v=>{v.dimensions=v.dimensions.filter(d=>d.id!==dimension.id);})}>{t('drawing.deleteDimension')}</button>
   </div>)}
  </fieldset>)}
 </details>;
}
