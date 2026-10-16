import { groupPath, objectFor, objectWorldFrame, setObjectWorldFrame } from '../../core/assemblies';
import { frameFromEuler, frameToEuler, type Vec3 } from '../../core/math';
import { dependencyGraph, dependencyProblems } from '../../core/references';
import { dissolveSelection, moveToAssembly } from '../assemblyActions';
import { duplicateSelection } from '../actions';
import { useT } from '../i18n';
import { updateDoc, useApp, useEvaluated } from '../store';
import { NumberInput, Row, Section, TextInput } from './Field';

export function MembershipEditor({objectKey}:{objectKey:string}) {
  const doc=useApp(s=>s.doc),t=useT(),target=objectFor(doc,objectKey);
  if(!target)return null;
  const id=objectKey.startsWith('group:')?objectKey.slice(6):undefined;
  return <Row label={t('assembly.parent')}><select aria-label={t('assembly.parent')} value={target.parent??''} onChange={event=>moveToAssembly(objectKey,event.target.value)}>
    <option value="">{t('assembly.root')}</option>{doc.groups.filter(g=>!id||!groupPath(doc,g.id).includes(id)).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
  </select></Row>;
}
export function AssemblyEditor({id}:{id:string}) {
  const doc=useApp(s=>s.doc),ev=useEvaluated(),t=useT(),group=doc.groups.find(g=>g.id===id);
  if(!group)return null;
  const key=`group:${id}`,world=objectWorldFrame(doc,key),angles=frameToEuler(world),nodes=dependencyGraph(doc,ev),problems=dependencyProblems(nodes);
  const position=(i:number,value:number)=>updateDoc(d=>{const f=objectWorldFrame(d,key),o=[...f.o] as Vec3;o[i]=value;setObjectWorldFrame(d,key,{...f,o});});
  const rotation=(i:number,value:number)=>updateDoc(d=>{const f=objectWorldFrame(d,key),a=frameToEuler(f);a[i]=value;setObjectWorldFrame(d,key,frameFromEuler(f.o,a));});
  return <>
    <div className="panel-title">◆ <TextInput value={group.name} onCommit={name=>updateDoc(d=>{d.groups.find(g=>g.id===id)!.name=name;})}/></div>
    <div className="pad"><p>{t('assembly.members',{n:ev.elements.filter(e=>e.assemblyPath?.includes(id)).length})}</p><MembershipEditor objectKey={key}/><p className="muted small">{t('assembly.local')}</p></div>
    <Section title={t('props.placement')}>
      {['X','Y','Z'].map((axis,i)=><Row key={axis} label={axis}><NumberInput value={world.o[i]} unit="mm" onCommit={value=>position(i,value)}/></Row>)}
      {['Z','Y','X'].map((axis,i)=><Row key={axis} label={`${t('props.rotation')} ${axis}`}><NumberInput value={angles[i]} unit="°" onCommit={value=>rotation(i,value)}/></Row>)}
    </Section>
    <Section title={t('assembly.dependencies')} open={false}><p className="small">{t('assembly.dependencyCount',{n:nodes.length})}</p>{problems.map(problem=><p className="warn" key={problem}>{problem}</p>)}</Section>
    <div className="pad assembly-tree-actions"><button className="btn subtle" onClick={()=>duplicateSelection()}>{t('menu.duplicate')}</button><button className="btn subtle" onClick={dissolveSelection}>{t('assembly.dissolve')}</button></div>
  </>;
}
