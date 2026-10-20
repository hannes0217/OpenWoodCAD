import { movableRoots, objectFor } from '../core/assemblies';
import type { Evaluated } from '../core/evaluate';
import type { OwcDocument } from '../core/model';
import { resolveSelection } from './selection';

/** Match pointer-down selection exactly, including a hit inside a selected assembly. */
export function movementSelection(doc:OwcDocument,ev:Evaluated,selection:string[],hit?:string):string[] {
  return hit && (!resolveSelection(ev,selection).includes(hit)||!movableRoots(doc,ev,selection).length)?[hit]:selection;
}
export function movementScope(doc:OwcDocument,ev:Evaluated,selection:string[],visibleIds:readonly string[],hit?:string) {
  const effective=movementSelection(doc,ev,selection,hit),roots=movableRoots(doc,ev,effective);
  const ids=resolveSelection(ev,roots),selected=resolveSelection(ev,effective),visible=new Set(visibleIds);
  const kind=roots.length!==1?'multiple':roots[0].startsWith('gen:')?'template':roots[0].startsWith('group:')?'assembly':'part';
  return {roots,ids,selected,kind,name:roots.length===1?objectFor(doc,roots[0])?.object.name:undefined,
    hidden:ids.filter(id=>!visible.has(id)).length,expanded:ids.some(id=>!selected.includes(id))};
}
