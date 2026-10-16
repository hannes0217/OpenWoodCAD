import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage=vi.hoisted(()=>({saveProject:vi.fn(),loadProject:vi.fn(),addPoint:vi.fn()}));
vi.mock('../src/ui/projects',()=>storage);
import { bootPersistence, flushPersistence, getState, setState, switchProject, updateDoc } from '../src/ui/store';
import { emptyDocument } from '../src/core/model';
import { openFile } from '../src/ui/actions';
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function tick(){for(let i=0;i<8;i++)await Promise.resolve();}
const initial=getState();
let fileInput:{files:{name:string;text:()=>Promise<string>}[];onchange:(()=>Promise<void>)|null;click:()=>void};
beforeEach(()=>{
 vi.useFakeTimers();storage.saveProject.mockReset().mockResolvedValue(undefined);storage.loadProject.mockReset().mockResolvedValue(null);storage.addPoint.mockReset().mockResolvedValue(undefined);
 vi.stubGlobal('localStorage',{setItem:vi.fn(),getItem:vi.fn(()=>null)});vi.stubGlobal('confirm',vi.fn(()=>true));
 fileInput={files:[],onchange:null,click:vi.fn()};vi.stubGlobal('document',{createElement:vi.fn(()=>fileInput)});
 setState({...initial,doc:emptyDocument('Original'),projectId:'original',saveStatus:{state:'saved'},dirty:false,past:[],future:[]});
});
afterEach(async()=>{await flushPersistence().catch(()=>{});vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();setState(initial);});
describe('project persistence ordering',()=>{
 it('serializes writes and never reports an older snapshot as the saved current document',async()=>{
  const first=deferred<void>(),second=deferred<void>();storage.saveProject.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  updateDoc(d=>{d.project.name='A';});const a=flushPersistence();await tick();
  updateDoc(d=>{d.project.name='B';});const b=flushPersistence();await tick();expect(storage.saveProject).toHaveBeenCalledTimes(1);
  first.resolve();await a;await tick();expect(getState().saveStatus.state).toBe('saving');expect(storage.saveProject.mock.calls[1][1].project.name).toBe('B');
  second.resolve();await b;expect(getState().saveStatus.state).toBe('saved');
 });
 it('flushes the outgoing project before switching and saves the next project under its own ID',async()=>{
  const writing=deferred<void>();storage.saveProject.mockReturnValueOnce(writing.promise);
  updateDoc(d=>{d.project.name='Outgoing';});const next=emptyDocument('Next'),switching=switchProject('next',next);await tick();
  expect(getState().projectId).toBe('original');expect(storage.saveProject.mock.calls[0][0]).toBe('original');
  writing.resolve();expect(await switching).toBe(true);expect(getState().doc).toBe(next);
  await flushPersistence();expect(storage.saveProject.mock.calls.at(-1)?.[0]).toBe('next');
 });
 it('keeps the outgoing document after a write failure and permits a successful retry',async()=>{
  storage.saveProject.mockRejectedValueOnce(new Error('Disk unavailable'));updateDoc(d=>{d.project.name='Keep me';});
  await expect(switchProject('next',emptyDocument())).rejects.toThrow('Disk unavailable');
  expect(getState().projectId).toBe('original');expect(getState().doc.project.name).toBe('Keep me');expect(getState().saveStatus.state).toBe('error');
  expect(await switchProject('next',emptyDocument())).toBe(true);
 });
 it('does not let delayed startup loading overwrite edits made after launch',async()=>{
  const loading=deferred<ReturnType<typeof emptyDocument>>();storage.loadProject.mockReturnValueOnce(loading.promise);const boot=bootPersistence();
  updateDoc(d=>{d.project.name='Edited after launch';});loading.resolve(emptyDocument('Old stored copy'));await boot;
  expect(getState().doc.project.name).toBe('Edited after launch');
 });
});
describe('file replacement safety',()=>{
 it('rejects a late file read if the active document changed while the chooser/read was open',async()=>{
  const loading=deferred<string>();openFile();fileInput.files=[{name:'other.owc',text:()=>loading.promise}];const opening=fileInput.onchange!();
  updateDoc(d=>{d.project.name='New work';});loading.resolve(JSON.stringify(emptyDocument('Other')));await opening;
  expect(getState().doc.project.name).toBe('New work');expect(confirm).not.toHaveBeenCalled();
 });
 it('preserves document, history and project identity when replacement is cancelled',async()=>{
  updateDoc(d=>{d.project.name='Unsaved';});const before=getState();vi.mocked(confirm).mockReturnValue(false);
  openFile();fileInput.files=[{name:'other.owc',text:async()=>JSON.stringify(emptyDocument('Other'))}];await fileInput.onchange!();
  expect(getState().doc).toBe(before.doc);expect(getState().past).toBe(before.past);expect(getState().projectId).toBe('original');
 });
 it('saves the outgoing document before importing under a fresh project identity',async()=>{
  updateDoc(d=>{d.project.name='Outgoing';});openFile();fileInput.files=[{name:'other.owc',text:async()=>JSON.stringify(emptyDocument('Imported'))}];await fileInput.onchange!();
  expect(storage.saveProject.mock.calls[0][0]).toBe('original');expect(storage.saveProject.mock.calls[0][1].project.name).toBe('Outgoing');
  expect(getState().doc.project.name).toBe('Imported');expect(getState().projectId).not.toBe('original');expect(getState().past).toEqual([]);
 });
});
