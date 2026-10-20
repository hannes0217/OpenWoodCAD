import { movementScope } from '../movementScope';
import { visibleElements } from '../selection';
import { getState,setState,useApp,useEvaluated } from '../store';
import { useT } from '../i18n';
export function MovementScope(){
 const t=useT(),s=useApp(s=>s),ev=useEvaluated();
 if(s.tool!=='select'||s.dialog||s.dimensionEdit||s.jointPreview||s.contextMenu)return null;
 const scope=movementScope(s.doc,ev,s.selection,visibleElements(ev.elements,s).map(e=>e.id));
 if(!scope.ids.length)return null;
 return <section className="movement-scope" aria-label={t('scope.title')}>
  <strong>{t(`scope.${scope.kind}`)}{scope.name?` · ${scope.name}`:''}</strong>
  <span>{t('scope.count',{n:scope.ids.length})}</span>
  <small>{t(`scope.${scope.kind}Help`)}</small>
  {scope.hidden>0&&<small>{t('scope.hidden',{n:scope.hidden})}</small>}
  <small className="muted">{t('scope.legend')}</small>
  {!s.directMove&&<div className="movement-scope-actions">
   {scope.kind==='template'&&scope.expanded&&<button onClick={()=>setState({selection:scope.roots,hover:null})}>{t('scope.selectOwner')}</button>}
   <button onClick={()=>setState({cad:{...getState().cad,rightOpen:true}})}>{t('scope.properties')}</button>
   {scope.hidden>0&&<button onClick={()=>{const state=getState();setState({isolatedIds:null,visibilityOverrides:{...state.visibilityOverrides,...Object.fromEntries(scope.ids.map(id=>[id,true]))}});}}>{t('scope.show')}</button>}
  </div>}
 </section>;
}
