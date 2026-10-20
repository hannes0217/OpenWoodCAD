import { describe,expect,it } from 'vitest';
import { evaluate } from '../src/core/evaluate';
import { emptyDocument } from '../src/core/model';
import { WORLD } from '../src/core/math';
import { beginDirectMove } from '../src/ui/directMove';
import { movementScope,movementSelection } from '../src/ui/movementScope';

function fixture(){
 const doc=emptyDocument();
 doc.groups=[{id:'assembly',name:'Assembly',frame:structuredClone(WORLD)}];
 doc.generators=[{id:'template',name:'Workbench',type:'werkbank',frame:structuredClone(WORLD),params:{},groupId:'assembly'}];
 doc.elements=[{id:'loose',name:'Beam',kind:'beam',frame:structuredClone(WORLD),length:500,width:80,height:100,materialId:'kvh_c24',processings:[],groupId:'assembly'}];
 const ev=evaluate(doc);return {doc,ev,part:ev.elements.find(e=>e.generator==='template')!};
}
describe('movement scope before dragging',()=>{
 it('shows a generated hit as its whole template, matching the actual drag transaction without document changes',()=>{
  const {doc,ev,part}=fixture(),saved=JSON.stringify(doc);
  const scope=movementScope(doc,ev,[part.id],[part.id]);
  expect(scope.kind).toBe('template');expect(scope.name).toBe('Workbench');expect(scope.expanded).toBe(true);
  expect(scope.ids).toEqual(ev.elements.filter(e=>e.generator==='template').map(e=>e.id));
  expect(scope.hidden).toBe(scope.ids.length-1);
  const tx=beginDirectMove(doc,ev,[part.id],'p',[0,0,0],[0,0,1],{origin:[0,0,100],dir:[0,0,-1]});
  expect(scope.roots).toEqual(tx?.roots);expect(JSON.stringify(doc)).toBe(saved);
 });
 it('preserves selected assemblies on a descendant hit, deduplicates nested selections, and previews a new hit separately',()=>{
  const {doc,ev,part}=fixture(),visible=ev.elements.map(e=>e.id);
  expect(movementSelection(doc,ev,['group:assembly'],part.id)).toEqual(['group:assembly']);
  const scope=movementScope(doc,ev,['group:assembly',part.id,'loose'],visible,part.id);
  expect(scope.kind).toBe('assembly');expect(scope.roots).toEqual(['group:assembly']);expect(scope.ids).toHaveLength(ev.elements.length);
  const hovered=movementScope(doc,ev,[part.id],visible,'loose');expect(hovered.kind).toBe('part');expect(hovered.ids).toEqual(['loose']);
 });
 it('distinguishes multiple roots from a part inside a group, and never treats operation selections as movable parts',()=>{
  const {doc,ev,part}=fixture(),visible=ev.elements.map(e=>e.id);
  expect(movementScope(doc,ev,['loose'],visible).kind).toBe('part');
  expect(movementScope(doc,ev,[part.id,'loose'],visible).kind).toBe('multiple');
  expect(movementScope(doc,ev,['joint:missing','missing'],visible).ids).toEqual([]);
  expect(movementSelection(doc,ev,['missing'],'loose')).toEqual(['loose']);
 });
});
