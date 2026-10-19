import { deleteSelection, duplicateSelection, saveFile } from './actions';
import { t } from './i18n';
import { getState, redo, setState, undo, type Tool, type Workspace } from './store';
import { viewportFit, viewportFitIds } from './Viewport';
import type { ViewName } from './cameraMath';
import { hideSelection, isolateSelection, showAllParts } from './viewActions';
import { resolveSelection } from './selection';
import { evaluated } from './store';
import { groupSelection,dissolveSelection } from './assemblyActions';
import { movableRoots } from '../core/assemblies';
export interface CadCommand {id:string;label:string;group:string;shortcut?:string;disabled?:boolean;run:()=>void}
export function cadCommands():CadCommand[] {
 const s=getState();
 const hasParts=resolveSelection(evaluated(),s.selection).length>0;
 const tool=(id:Tool,label:string,group:string,shortcut?:string):CadCommand => ({id:`tool.${id}`,label:t(label),group:t(group),shortcut,run:()=>setState({workspace:'model',tool:id,...(id==='select'?{gizmoMode:'none' as const}:{})})});
 const views:[ViewName,string][]=[['iso','view.iso'],['front','view.front'],['back','cad.back'],['side','view.side'],['left','cad.left'],['top','view.top'],['bottom','cad.bottom']];
 return [
  {id:'sketch.new',label:t('sketch.new'),group:t('cad.create'),run:()=>setState({workspace:'model',dialog:{type:'sketch'}})},
  {id:'assembly.create',label:t('assembly.create'),group:t('assembly.title'),disabled:!movableRoots(s.doc,evaluated(),s.selection).length,run:groupSelection},
  {id:'assembly.dissolve',label:t('assembly.dissolve'),group:t('assembly.title'),disabled:!s.selection.some(key=>key.startsWith('group:')),run:dissolveSelection},
  tool('select','cad.select','cad.modify'),tool('beam','menu.beam','cad.create','B'),tool('rect','tool.rect','cad.create','P'),tool('circle','tool.circle','cad.create','C'),tool('poly','tool.poly','cad.create','L'),
  tool('cutRect','tool.cutRect','cad.modify'),tool('cutCircle','tool.cutCircle','cad.modify'),tool('measure','menu.measure','cad.inspect','M'),
  {id:'insert',label:t('cad.newTemplate'),group:t('cad.create'),shortcut:'I',run:()=>setState({workspace:'model',dialog:{type:'insert'}})},
  ...(['translate','rotate'] as const).map((gizmoMode) => ({id:gizmoMode,label:t(gizmoMode==='translate'?'cad.move':'cad.rotate'),group:t('cad.modify'),run:()=>setState({workspace:'model',tool:'select',gizmoMode})})),
  {id:'duplicate',label:t('menu.duplicate'),group:t('cad.modify'),disabled:!s.selection.length,run:()=>duplicateSelection()},
  {id:'delete',label:t('menu.delete'),group:t('cad.modify'),disabled:!s.selection.length,run:deleteSelection},
  {id:'undo',label:t('menu.undo'),group:t('cad.modify'),disabled:!s.past.length,run:undo},
  {id:'redo',label:t('menu.redo'),group:t('cad.modify'),disabled:!s.future.length,run:redo},
  {id:'save',label:t('menu.save'),group:t('menu.file'),shortcut:'Ctrl+S',run:saveFile},
  ...views.map(([view,label]) => ({id:`view.${view}`,label:t(label),group:t('cad.views'),run:()=>{setState({workspace:'model'});viewportFit(view);}})),
  {id:'fitSelection',label:t('cad.fitSelection'),group:t('cad.views'),disabled:!s.selection.length,run:()=>{setState({workspace:'model'});viewportFitIds(s.selection);}},
  {id:'isolate',label:t('context.isolate'),group:t('cad.views'),disabled:!hasParts,run:isolateSelection},
  {id:'hide',label:t('context.hide'),group:t('cad.views'),disabled:!hasParts,run:hideSelection},
  {id:'showAll',label:t('context.showAll'),group:t('cad.views'),run:showAllParts},
  ...(['perspective','orthographic'] as const).map((projection) => ({id:projection,label:t(`cad.${projection}`),group:t('cad.views'),run:()=>setState({cad:{...getState().cad,projection}})})),
  ...(['drawings','lists','nesting','shopping','statics','project'] as Workspace[]).map((workspace) => ({id:`workspace.${workspace}`,label:t(`ws.${workspace}`),group:t('menu.view'),run:()=>setState({workspace})})),
 ];
}
const normalize=(s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function filterCommands(commands:CadCommand[],query:string):CadCommand[] {
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return commands.filter((c) => words.every((word) => normalize(`${c.label} ${c.group} ${c.id}`).includes(word)));
}
