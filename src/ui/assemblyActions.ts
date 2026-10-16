import { createAssembly, dissolveAssembly, movableRoots, reparentObject } from '../core/assemblies';
import { t } from './i18n';
import { evaluated, getState, setState, updateDoc } from './store';
export function groupSelection():void {
  const state=getState(),ev=evaluated();if(!movableRoots(state.doc,ev,state.selection).length)return;
  let id='';updateDoc(doc=>{id=createAssembly(doc,ev,state.selection,t('assembly.newName'));});
  setState({selection:[`group:${id}`]});
}
export function dissolveSelection():void {
  const groups=getState().selection.filter(key=>key.startsWith('group:'));
  if(!groups.length)return;updateDoc(doc=>{for(const key of groups)dissolveAssembly(doc,key.slice(6));});setState({selection:[]});
}
export function moveToAssembly(key:string,parent:string):void {updateDoc(doc=>reparentObject(doc,key,parent||undefined));}
