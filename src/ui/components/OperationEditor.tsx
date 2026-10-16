import { norm, type Vec3 } from '../../core/math';
import type { Processing } from '../../core/model';
import { editExplicitProcessing } from '../../core/features';
import { parseProcessingKey, resolveGeometryReference } from '../../core/references';
import { fmt, useT } from '../i18n';
import { setState, updateDoc, useApp, useEvaluated } from '../store';
import { NumberInput, Row, Section } from './Field';

export function OperationEditor({reference}:{reference:string}) {
  const t=useT(),doc=useApp(s=>s.doc),ev=useEvaluated(),ref=parseProcessingKey(reference);
  if(!ref)return null;
  const part=ev.elements.find(e=>e.id===ref.elementId),explicit=doc.elements.find(e=>e.id===ref.elementId),
    proc=part&&[...part.processings,...part.all.filter(p=>p.jointId)].find(p=>p.id===ref.processingId);
  if(!part||!proc)return <p className="warn pad">{t('assembly.missing')}</p>;
  const joint=ev.joints.find(j=>j.id===proc.jointId),index=explicit?.processings.findIndex(p=>p.id===proc.id)??-1;
  const editable=!!explicit&&index>=0&&!proc.jointId;
  const change=(mutate:(p:Processing)=>void)=>updateDoc(d=>{editExplicitProcessing(d,part.id,proc.id,mutate);});
  const move=(offset:number)=>updateDoc(d=>{const list=d.elements.find(e=>e.id===part.id)?.processings;if(!list)return;const i=list.findIndex(p=>p.id===proc.id),j=i+offset;if(i>=0&&j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];});
  const vector=(label:string,value:Vec3,commit:(p:Processing,next:Vec3)=>void,direction=false)=><div><div className="sub-title">{label}</div>{['X','Y','Z'].map((axis,i)=><Row key={axis} label={axis}><NumberInput value={value[i]} unit={direction?undefined:'mm'} onCommit={number=>{const next=[...value] as Vec3;next[i]=number;if(direction&&Math.hypot(...next)<1e-8)return;change(p=>commit(p,direction?norm(next):next));}}/></Row>)}</div>;
  const origin=resolveGeometryReference(ev,{elementId:part.id,kind:'processingOrigin',processingId:proc.id,processingType:proc.type});
  return <>
    <div className="panel-title">{t(`proc.${proc.type}`)}</div><div className="pad"><strong>{part.name}</strong><p className="muted small">{t(proc.jointId?'assembly.derived':'assembly.explicit')}</p>
    {origin.ok?<p className="small">{t('assembly.origin')}: {origin.point.map(value=>fmt(value,1)).join(' / ')} mm</p>:<p className="muted small">{t('assembly.noOrigin')}</p>}
    {joint&&<button className="btn" onClick={()=>setState({dialog:{type:'joint',id:joint.id,a:joint.a,b:joint.b}})}>{t('assembly.jointEdit')}</button>}
    {!editable&&part.generator&&!joint&&<button className="btn" onClick={()=>setState({selection:[`gen:${part.generator}`]})}>{t('assembly.generatorEdit')}</button>}
    </div>
    {editable&&<>
      <Section title={t('props.processings')}>
        <p className="muted small">{t('assembly.localOperation')}</p>
        {proc.geom==='drill'&&<>{vector(t('assembly.origin'),proc.p,(p,next)=>{if(p.geom==='drill')p.p=next;})}{vector(t('assembly.axis'),proc.dir,(p,next)=>{if(p.geom==='drill')p.dir=next;},true)}
          <Row label={t('assembly.diameter')}><NumberInput value={proc.dia} unit="mm" min={0.1} onCommit={value=>change(p=>{if(p.geom==='drill')p.dia=value;})}/></Row>
          <Row label={t('assembly.depth')}><NumberInput value={proc.depth} unit="mm" min={0.1} onCommit={value=>change(p=>{if(p.geom==='drill')p.depth=value;})}/></Row>
          <Row label={t('assembly.through')}><input type="checkbox" checked={proc.through} onChange={event=>change(p=>{if(p.geom==='drill')p.through=event.target.checked;})}/></Row></>}
        {(proc.geom==='cut'||proc.geom==='cutExcept')&&<>{vector(t('assembly.origin'),proc.plane.p,(p,next)=>{if(p.geom==='cut'||p.geom==='cutExcept')p.plane.p=next;})}{vector(t('assembly.axis'),proc.plane.n,(p,next)=>{if(p.geom==='cut'||p.geom==='cutExcept')p.plane.n=next;},true)}</>}
        {proc.geom==='polytope'&&proc.planes.map((plane,i)=><div key={i}>{vector(`${t('assembly.origin')} ${i+1}`,plane.p,(p,next)=>{if(p.geom==='polytope')p.planes[i].p=next;})}</div>)}
      </Section>
      <div className="pad assembly-tree-actions"><button className="btn subtle" onClick={()=>change(p=>{p.suppressed=!p.suppressed;})}>{t(proc.suppressed?'assembly.restore':'assembly.suppress')}</button>
        <button className="btn subtle" disabled={index===0} onClick={()=>move(-1)}>{t('assembly.up')}</button><button className="btn subtle" disabled={index===explicit!.processings.length-1} onClick={()=>move(1)}>{t('assembly.down')}</button>
        <button className="btn danger" onClick={()=>{updateDoc(d=>{const e=d.elements.find(e=>e.id===part.id);if(e)e.processings=e.processings.filter(p=>p.id!==proc.id);});setState({selection:[part.id]});}}>{t('common.delete')}</button>
      </div>
    </>}
  </>;
}
