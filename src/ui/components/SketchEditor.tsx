import { useEffect,useMemo,useRef,useState,type PointerEvent } from 'react';
import { uid } from '../../core/math';
import { rectangleSketch,sketchProfile,solveSketch,SKETCH_CONSTRAINTS,type ParametricSketch,type SketchConstraint } from '../../core/sketch';
import { standardPlane } from '../precision';
import { drawingPlane } from '../workplanes';
import { commitSketch,sketchFromElement } from '../sketchDraft';
import { useT } from '../i18n';
import { getState,setState,useApp,useEvaluated } from '../store';
import { MaterialSelect,NumberInput,Row } from './Field';

type Pick={kind:'point'|'line';id:string};
export function SketchEditor({id}:{id?:string}) {
  const t=useT(),current=useApp(s=>s.doc),ev=useEvaluated(),[base]=useState(()=>getState().doc),[projectId]=useState(()=>getState().projectId),part=base.elements.find(e=>e.id===id);
  const [source,setSource]=useState<ParametricSketch>(()=>part?sketchFromElement(part)??rectangleSketch():rectangleSketch());
  const [name,setName]=useState(part?.name??t('sketch.name')),[thickness,setThickness]=useState(part?.height??getState().panelThickness),[materialId,setMaterial]=useState(part?.materialId??getState().panelMaterial);
  const [mode,setMode]=useState<'select'|'draw'>('select'),[grid,setGrid]=useState(10),[selection,setSelection]=useState<Pick[]>([]);
  const [type,setType]=useState<SketchConstraint['type']>('length'),[first,setFirst]=useState(''),[second,setSecond]=useState(''),[value,setValue]=useState(100);
  const [error,setError]=useState(''),svg=useRef<SVGSVGElement>(null),drag=useRef<string|null>(null);
  const solution=useMemo(()=>solveSketch(source),[source]);
  let profileError='';try{sketchProfile(source,solution);}catch(reason){profileError=String((reason as Error).message);}
  const valid=!profileError&&current===base&&(!id||!!part)&&Number.isFinite(thickness)&&thickness>=1&&thickness<=1000;
  const points=solution.sketch.points,segments=source.segments,byId=new Map(points.map(p=>[p.id,p]));
  const minX=Math.min(0,...points.map(p=>p.x))-80,minY=Math.min(0,...points.map(p=>p.y))-80,
    width=Math.max(600,...points.map(p=>p.x))-minX+80,height=Math.max(400,...points.map(p=>p.y))-minY+80;
  const viewBox=`${minX} ${-minY-height} ${width} ${height}`;
  const edit=(fn:(sketch:ParametricSketch)=>void)=>setSource(old=>{const next=structuredClone(old);fn(next);return next;});
  const close=()=>setState({dialog:null});
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const pick=(item:Pick,extend=false)=>{
    const next=extend?[...selection.filter(p=>p.kind===item.kind&&p.id!==item.id),item].slice(-2):[item];setSelection(next);setFirst(next[0].id);setSecond(next[1]?.id??'');
  };
  const selectedPoint=selection.length===1&&selection[0].kind==='point'?byId.get(selection[0].id):undefined;
  const pointer=(event:PointerEvent):[number,number]=>{
    const node=svg.current!,point=node.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(node.getScreenCTM()!.inverse());return [Math.round(local.x/grid)*grid,Math.round(-local.y/grid)*grid];
  };
  const addPoint=(event:PointerEvent<SVGSVGElement>)=>{
    if(mode!=='draw'||source.points.length>=32)return;
    const [x,y]=pointer(event),pointId=uid('sp');edit(s=>{const last=s.points.at(-1);s.points.push({id:pointId,x,y});if(last)s.segments.push({id:uid('sl'),a:last.id,b:pointId});});
  };
  const closeContour=()=>edit(s=>{if(s.points.length>=3&&!s.segments.some(line=>line.a===s.points[0].id&&line.b===s.points.at(-1)!.id||line.b===s.points[0].id&&line.a===s.points.at(-1)!.id))s.segments.push({id:uid('sl'),a:s.points.at(-1)!.id,b:s.points[0].id});});
  const pointConstraint=['fixed','coincident','distance','distanceX','distanceY'].includes(type),items=pointConstraint?points:segments;
  const a=items.some(item=>item.id===first)?first:items[0]?.id??'',b=items.some(item=>item.id===second)?second:items.find(item=>item.id!==a)?.id??'';
  const requiresB=['coincident','distance','distanceX','distanceY','equal','parallel','perpendicular','angle'].includes(type);
  const usesValue=['distance','distanceX','distanceY','length','angle'].includes(type);
  const addConstraint=()=>{
    const cid=uid('sc');let constraint:SketchConstraint;
    if(!a||requiresB&&(!b||b===a)||type==='length'&&value<=0||type==='distance'&&value<0)return;
    switch(type){
      case 'fixed':{const p=byId.get(a)!;constraint={id:cid,type,point:a,x:p.x,y:p.y};break;}
      case 'horizontal':case 'vertical':constraint={id:cid,type,line:a};break;
      case 'length':constraint={id:cid,type,line:a,value};break;
      case 'coincident':case 'equal':case 'parallel':case 'perpendicular':constraint={id:cid,type,a,b};break;
      default:constraint={id:cid,type,a,b,value};
    }
    edit(s=>{if(s.constraints.length<128)s.constraints.push(constraint);});
  };
  const apply=()=>{
    const plane=drawingPlane(getState())??standardPlane('xy',getState().workZ);
    const ok=commitSketch(base,{projectId,id,sketch:source,name,materialId,thickness,frame:part?.frame??{o:plane.o,x:plane.u,y:plane.v,z:plane.n}});
    if(!ok)setError(t('sketch.stale'));
  };
  const label=(kind:'point'|'line',key:string)=>`${t(kind==='point'?'sketch.point':'sketch.line')} ${(kind==='point'?points:segments).findIndex(item=>item.id===key)+1}`;
  return <div className="modal-backdrop" onMouseDown={close}><div role="dialog" aria-label={t('sketch.title')} className="modal sketch-editor" onMouseDown={event=>event.stopPropagation()}>
    <div className="modal-head"><h2>{t('sketch.title')}</h2><button className="icon-btn" aria-label={t('common.close')} onClick={close}>✕</button></div>
    <div className="sketch-toolbar">
      <button className="btn subtle" onClick={()=>{setSource(rectangleSketch());setSelection([]);setMode('select');}}>{t('sketch.rectangle')}</button>
      <button className="btn subtle" onClick={()=>{setSource({points:[],segments:[],constraints:[]});setSelection([]);setMode('draw');}}>{t('sketch.free')}</button>
      <button className="btn subtle" aria-pressed={mode==='select'} onClick={()=>setMode('select')}>{t('sketch.select')}</button>
      <button className="btn subtle" aria-pressed={mode==='draw'} onClick={()=>setMode('draw')}>{t('sketch.draw')}</button>
      <button className="btn subtle" disabled={points.length<3} onClick={closeContour}>{t('sketch.close')}</button>
      <label>{t('sketch.grid')}<NumberInput value={grid} min={0.1} max={1000} onCommit={setGrid}/></label>
    </div>
    <div className="sketch-body">
      <div className="sketch-canvas-column">
        <svg ref={svg} role="group" aria-label={t('sketch.title')} viewBox={viewBox} className="sketch-canvas" onPointerDown={addPoint} onPointerMove={event=>{if(drag.current){const pointId=drag.current,[x,y]=pointer(event);edit(s=>{const p=s.points.find(p=>p.id===pointId);if(p){p.x=x;p.y=y;}});}}} onPointerUp={event=>{drag.current=null;if(svg.current?.hasPointerCapture(event.pointerId))svg.current.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{drag.current=null;}}>
          <defs><pattern id="sketch-grid" width={grid*5} height={grid*5} patternUnits="userSpaceOnUse"><path d={`M ${grid*5} 0 L 0 0 0 ${grid*5}`} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth={width/1000}/></pattern></defs>
          <rect x={minX} y={-minY-height} width={width} height={height} fill="url(#sketch-grid)" pointerEvents="none"/>
          <line x1={minX} x2={minX+width} y1={0} y2={0} className="sketch-axis"/><line x1={0} x2={0} y1={-minY} y2={-minY-height} className="sketch-axis"/>
          {segments.map(line=>{const p=byId.get(line.a)!,q=byId.get(line.b)!;return <g key={line.id}><line role="button" tabIndex={0} aria-label={label('line',line.id)} x1={p.x} y1={-p.y} x2={q.x} y2={-q.y} className={`sketch-line ${selection.some(item=>item.id===line.id)?'selected':''}`} strokeWidth={width/200} onPointerDown={event=>{event.stopPropagation();pick({kind:'line',id:line.id},event.shiftKey);}} onKeyDown={event=>{if(event.key==='Enter')pick({kind:'line',id:line.id},event.shiftKey);}}/><text x={(p.x+q.x)/2} y={-(p.y+q.y)/2-width/80} fontSize={width/55} className="sketch-label">{Math.round(Math.hypot(p.x-q.x,p.y-q.y)*100)/100}</text></g>;})}
          {points.map((point,i)=><g key={point.id}><circle role="button" tabIndex={0} aria-label={label('point',point.id)} cx={point.x} cy={-point.y} r={width/95} className={`sketch-point ${selection.some(item=>item.id===point.id)?'selected':''}`} onPointerDown={event=>{event.stopPropagation();if(mode==='draw'&&i===0&&points.length>=3){closeContour();return;}pick({kind:'point',id:point.id},event.shiftKey);if(mode==='select'){drag.current=point.id;svg.current?.setPointerCapture(event.pointerId);}}} onKeyDown={event=>{if(event.key==='Enter')pick({kind:'point',id:point.id},event.shiftKey);}}/><text x={point.x+width/70} y={-point.y+width/70} fontSize={width/55} className="sketch-label">P{i+1}</text></g>)}
        </svg>
        <p className="muted small">{t('sketch.hint')}</p><p role="status" className={solution.status==='inconsistent'?'warn':'small'}>{t(`sketch.status.${solution.status}`)} · {t('sketch.freedom',{n:solution.degreesOfFreedom})}{solution.redundant>0?` · ${t('sketch.redundant',{n:solution.redundant})}`:''}</p>
        {!!profileError&&<p className="warn">{t(profileError)}</p>}
        {selectedPoint&&<div className="vec-row"><strong>{label('point',selectedPoint.id)}</strong>{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()}<NumberInput value={selectedPoint[axis]} unit="mm" onCommit={number=>edit(s=>{s.points.find(p=>p.id===selectedPoint.id)![axis]=number;})}/></label>)}</div>}
        {selection.length===2&&selection.every(item=>item.kind==='point')&&<button className="btn subtle" onClick={()=>edit(s=>{const [a,b]=selection.map(item=>item.id);if(!s.segments.some(line=>line.a===a&&line.b===b||line.a===b&&line.b===a))s.segments.push({id:uid('sl'),a,b});})}>{t('sketch.connect')}</button>}
      </div>
      <div className="sketch-settings">
        <Row label={t('props.name')}><input value={name} onChange={event=>setName(event.target.value)}/></Row>
        <Row label={t('props.material')}><MaterialSelect value={materialId} catalog={ev.catalog} category="sheet" onChange={setMaterial}/></Row>
        <Row label={t('common.thickness')}><NumberInput value={thickness} min={1} max={1000} unit="mm" onCommit={setThickness}/></Row>
        <h3>{t('sketch.relationship')}</h3><select aria-label={t('sketch.relationship')} value={type} onChange={event=>{setType(event.target.value as typeof type);setFirst('');setSecond('');}}>{SKETCH_CONSTRAINTS.map(type=><option key={type} value={type}>{t(`sketch.constraint.${type}`)}</option>)}</select>
        <Row label={t('sketch.a')}><select aria-label={t('sketch.a')} value={a} onChange={event=>setFirst(event.target.value)}>{items.map(item=><option key={item.id} value={item.id}>{label(pointConstraint?'point':'line',item.id)}</option>)}</select></Row>
        {requiresB&&<Row label={t('sketch.b')}><select aria-label={t('sketch.b')} value={b} onChange={event=>setSecond(event.target.value)}>{items.filter(item=>item.id!==a).map(item=><option key={item.id} value={item.id}>{label(pointConstraint?'point':'line',item.id)}</option>)}</select></Row>}
        {usesValue&&<Row label={t('sketch.value')}><NumberInput value={value} unit={type==='angle'?'°':'mm'} min={type==='length'?0.1:type==='distance'?0:undefined} onCommit={setValue}/></Row>}
        <button className="btn subtle" disabled={!a||requiresB&&!b||source.constraints.length>=128} onClick={addConstraint}>{t('sketch.add')}</button>
        <h3>{t('sketch.constraints')}</h3><div className="sketch-constraints">{source.constraints.map(constraint=><div key={constraint.id} className={`sketch-constraint ${solution.conflicts.includes(constraint.id)?'warn':''}`} title={solution.conflicts.includes(constraint.id)?t('sketch.conflict'):undefined}>
          <span>{t(`sketch.constraint.${constraint.type}`)} <small>{'line' in constraint?label('line',constraint.line):'point' in constraint?label('point',constraint.point):`${label(pointConstraintFor(constraint)?'point':'line',constraint.a)} / ${label(pointConstraintFor(constraint)?'point':'line',constraint.b)}`}</small></span>
          {'value' in constraint&&<label><span>{t('sketch.value')} {constraint.id}</span><NumberInput value={constraint.value} unit={constraint.type==='angle'?'°':'mm'} min={constraint.type==='length'?0.1:constraint.type==='distance'?0:undefined} max={constraint.type==='angle'?360:undefined} onCommit={number=>edit(s=>{const c=s.constraints.find(c=>c.id===constraint.id)!;if('value'in c)c.value=number;})}/></label>}
          {constraint.type==='fixed'&&<span>{constraint.x.toFixed(1)} / {constraint.y.toFixed(1)}</span>}
          <button className="icon-btn" aria-label={t('sketch.remove')} onClick={()=>edit(s=>{s.constraints=s.constraints.filter(c=>c.id!==constraint.id);})}>×</button>
        </div>)}</div>
      </div>
    </div>
    <div className="sketch-footer"><p className="muted small">{error||current!==base?t('sketch.stale'):t('sketch.scope')}</p><button className="btn subtle" onClick={close}>{t('common.cancel')}</button><button className="btn" disabled={!valid} onClick={apply}>{t('common.apply')}</button></div>
  </div></div>;
}
function pointConstraintFor(constraint:SketchConstraint):boolean {return ['coincident','distance','distanceX','distanceY'].includes(constraint.type);}
