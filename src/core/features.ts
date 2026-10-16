import type { OwcDocument, Processing } from './model';

const geometry=(processing:Processing)=>{
  const {id:_,jointId:__,info:___,suppressed:____,...shape}=processing;
  return JSON.stringify(shape);
};
/** Editing geometry must not leave obsolete machine/list dimensions in `info`. */
export function editExplicitProcessing(doc:OwcDocument,elementId:string,id:string,edit:(processing:Processing)=>void):boolean {
  const part=doc.elements.find(e=>e.id===elementId),index=part?.processings.findIndex(p=>p.id===id)??-1;
  if(!part||index<0||part.processings[index].jointId)return false;
  const previous=part.processings[index],next=structuredClone(previous);edit(next);
  if(next.id!==previous.id||next.type!==previous.type||next.geom!==previous.geom)return false;
  if(geometry(previous)!==geometry(next)) {
    // For general convex cuts there is no unique semantic width/length after
    // moving individual planes. Omit unknown metadata instead of exporting lies.
    next.info=next.geom==='drill'?{dia:next.dia,...(!next.through?{depth:next.depth}:{})}:undefined;
  }
  part.processings[index]=next;
  return true;
}
