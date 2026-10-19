import { DimensionEditor } from './components/DimensionEditor';
import { useEffect, useRef, useState } from 'react';
import { deleteSelection, duplicateSelection, newDocument, openFile, saveFile, selectAll } from './actions';
import { geom } from './geomClient';
import { useT } from './i18n';
import { Dialogs } from './panels/Dialogs';
import { Tour } from './panels/Tour';
import { IssuesPanel } from './panels/Issues';
import { Properties } from './panels/Properties';
import { StartScreen } from './panels/StartScreen';
import { HoverTip, ModelToolbar } from './panels/Toolbar';
import { Tree } from './panels/Tree';
import { bootPersistence, getState, redo, setState, undo, useApp, useEvaluated, type Workspace } from './store';
import { SaveStatus } from './panels/ProjectsDialog';
import Viewport, { viewportFit } from './Viewport';
import { tools } from './tools';
import { CommandPalette } from './components/CommandPalette';
import { CadViewControls, PanelResize } from './components/CadWorkspace';
import { ModelContextMenu } from './components/ModelContextMenu';
import { DirectMoveHint } from './components/DirectMoveHint';
import { resolveSelection, visibleElements, type SelectionFilter } from './selection';
import { showAllParts } from './viewActions';
import { ListsView, NestingView, ShoppingView } from './views/Lists';
import { exportMenu, ExtraViews } from './views/registry';

const WORKSPACES: Workspace[] = ['model', 'drawings', 'lists', 'nesting', 'shopping', 'statics', 'project'];

function Menu({ label, items }: { label: string; items: ({ label: string; action: () => void; shortcut?: string; disabled?: boolean } | 'sep')[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <button className={`menu-btn ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>{label}</button>
      {open && (
        <div className="menu-pop">
          {items.map((it, i) => it === 'sep' ? <hr key={i} /> : (
            <button key={i} disabled={it.disabled} onClick={() => { setOpen(false); it.action(); }}>
              <span>{it.label}</span>{it.shortcut && <kbd>{it.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useGeomStatus() {
  const [, force] = useState(0);
  useEffect(() => geom.subscribe(() => force((n) => n + 1)), []);
  return { ready: geom.ready, busy: geom.busy,error:geom.error,failed:geom.failed.size };
}

export default function App() {
  const [commandOpen,setCommandOpen]=useState(false);
  const t = useT();
  const ws = useApp((s) => s.workspace);
  const lang = useApp((s) => s.lang);
  const dirty = useApp((s) => s.dirty);
  const docName = useApp((s) => s.doc.project.name);
  const toastMsg = useApp((s) => s.toast);
  const canUndo = useApp((s) => s.past.length > 0);
  const canRedo = useApp((s) => s.future.length > 0);
  const tool = useApp((s) => s.tool);
  const toolHint = useApp((s) => s.toolHint);
  const cad=useApp((s)=>s.cad);
  const ev = useEvaluated();
  const status = useGeomStatus();
  const selection=useApp(s=>s.selection),filter=useApp(s=>s.selectionFilter),visibility=useApp(s=>s.visibilityOverrides),isolation=useApp(s=>s.isolatedIds);
  const shown=visibleElements(ev.elements,{visibilityOverrides:visibility,isolatedIds:isolation}).length;

  useEffect(() => { document.title = `${docName}${dirty ? ' •' : ''} – OpenWoodCAD`; }, [docName, dirty]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { geom.start(); void bootPersistence(); }, []);
  useEffect(()=>{const media=window.matchMedia('(max-width: 900px)');const compact=()=>{if(media.matches)setState({cad:{...getState().cad,leftOpen:false,rightOpen:false}});};compact();media.addEventListener('change',compact);return()=>media.removeEventListener('change',compact);},[]);
  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{const status=getState().saveStatus.state;if(status==='saving'||status==='error'){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k' && !getState().dialog){e.preventDefault();setState({contextMenu:null,contextPreview:null});setCommandOpen((open)=>!open);return;}
      if(commandOpen || getState().dialog || getState().contextMenu) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (tools.key(e)) { e.preventDefault(); return; }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); saveFile(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'o') { e.preventDefault(); openFile(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); duplicateSelection(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); selectAll(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelection();
      else if (e.key === 'Escape') setState({ selection: [], tool: 'select', gizmoMode:'none', dialog: null });
      else if (k === 'i') setState({ dialog: { type: 'insert' } });
      else if (k === 'r') setState({ tool: 'select', gizmoMode: 'rotate' });
      else if (k === 'w') setState({ tool: 'select', gizmoMode: 'translate' });
      else if (k === 'b') setState({ tool: 'beam', workspace: 'model' });
      else if (k === 'p') setState({ tool: 'rect', workspace: 'model' });
      else if (k === 'c' && !e.ctrlKey) setState({ tool: 'circle', workspace: 'model' });
      else if (k === 'l') setState({ tool: 'poly', workspace: 'model' });
      else if (k === 'm') setState({ tool: 'measure', workspace: 'model' });
      else if (k === 'j') { const sel = getState().selection.filter((x) => !x.includes(':')); if (sel.length === 2) setState({ dialog: { type: 'joint', a: sel[0], b: sel[1] } }); }
      else if (k === 's' && !e.ctrlKey && !e.metaKey) {e.preventDefault();setCommandOpen(true);}
      else if (k === 'f') viewportFit('iso');
      else if (k >= '1' && k <= '4') viewportFit((['iso', 'front', 'side', 'top'] as const)[Number(k) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandOpen]);

  const kernelMsg = status.error?t('safe.workerFailed'):status.failed?t('safe.geometryFailed',{n:status.failed}):!status.ready ? t('common.kernelLoading') : status.busy ? t('common.loading') : t('common.kernelReady');

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="logo">◢◣</span> OpenWoodCAD</div>
        <Menu label={t('menu.file')} items={[
          { label: t('menu.new'), action: newDocument },
          { label: t('menu.projects'), action: () => setState({ dialog: { type: 'projects' } }) },
          { label: t('menu.open'), action: openFile, shortcut: 'Strg+O' },
          { label: t('menu.save'), action: saveFile, shortcut: 'Strg+S' },
          'sep',
          ...exportMenu(),
        ]} />
        <Menu label={t('menu.edit')} items={[
          { label: t('menu.undo'), action: undo, shortcut: 'Strg+Z', disabled: !canUndo },
          { label: t('menu.redo'), action: redo, shortcut: 'Strg+Y', disabled: !canRedo },
          'sep',
          { label: t('menu.duplicate'), action: () => duplicateSelection(), shortcut: 'Strg+D' },
          { label: t('menu.delete'), action: deleteSelection, shortcut: 'Entf' },
          { label: t('menu.selectAll'), action: selectAll, shortcut: 'Strg+A' },
        ]} />
        <Menu label={t('menu.insert')} items={[
          {label:t('sketch.new'),action:()=>setState({workspace:'model',dialog:{type:'sketch'}})},
          { label: t('menu.assistant'), action: () => setState({ dialog: { type: 'insert' } }), shortcut: 'I' },
          { label: t('menu.beam'), action: () => setState({ tool: 'beam', workspace: 'model' }), shortcut: 'B' },
          { label: t('tool.rect'), action: () => setState({ tool: 'rect', workspace: 'model' }), shortcut: 'P' },
          { label: t('tool.circle'), action: () => setState({ tool: 'circle', workspace: 'model' }), shortcut: 'C' },
          { label: t('tool.poly'), action: () => setState({ tool: 'poly', workspace: 'model' }), shortcut: 'L' },
          { label: t('tool.cutRect'), action: () => setState({ tool: 'cutRect', workspace: 'model' }) },
          { label: t('tool.cutCircle'), action: () => setState({ tool: 'cutCircle', workspace: 'model' }) },
          { label: t('menu.measure'), action: () => setState({ tool: 'measure', workspace: 'model' }), shortcut: 'M' },
          { label: t('menu.joint'), action: () => { const sel = getState().selection.filter((x) => !x.includes(':')); if (sel.length === 2) setState({ dialog: { type: 'joint', a: sel[0], b: sel[1] } }); }, shortcut: 'J' },
        ]} />
        <Menu label={t('menu.help')} items={[
          { label: getState().lang === 'de' ? 'Kurzanleitung (Tour)' : 'Quick tour', action: () => setState({ tourStep: 0, workspace: 'model' }) },
          { label: t('menu.shortcuts'), action: () => setState({ dialog: { type: 'shortcuts' } }) },
          { label: `${t('menu.language')}: Deutsch`, action: () => setState({ lang: 'de' }) },
          { label: `${t('menu.language')}: English`, action: () => setState({ lang: 'en' }) },
          { label: t('menu.about'), action: () => setState({ dialog: { type: 'about' } }) },
        ]} />
        <nav className="tabs">
          {WORKSPACES.map((w) => <button key={w} className={`tab ${ws === w ? 'on' : ''}`} onClick={() => setState({ workspace: w })}>{t(`ws.${w}`)}</button>)}
        </nav>
        <div className="doc-name"><SaveStatus /> <span>{docName}</span></div>
        <button className="cad-search-button" title={t('cad.shortcuts')} onClick={()=>setCommandOpen(true)}>{t('cad.search')} <kbd>S</kbd></button>
      </header>
      <main className={`main ws-${ws} ${cad.leftOpen?'':'cad-left-closed'} ${cad.rightOpen?'':'cad-right-closed'}`} style={{'--cad-left':`${cad.leftWidth}px`,'--cad-right':`${cad.rightWidth}px`} as React.CSSProperties}>
        {ws === 'model' && (
          <>
            {cad.leftOpen && <><aside className="left"><button className="cad-panel-close" aria-label={t('cad.toggleTree')} onClick={()=>setState({cad:{...getState().cad,leftOpen:false}})}>{t('cad.close')}</button><Tree /></aside><PanelResize side="left"/></>}
            <section className="center">
              <ModelToolbar />
              <div className="cad-workspace-bar">
                <button aria-pressed={cad.leftOpen} onClick={()=>setState({cad:{...getState().cad,leftOpen:!cad.leftOpen,...(window.matchMedia('(max-width: 900px)').matches?{rightOpen:false}:{})}})} title={t('cad.toggleTree')}>{t('cad.tree')}</button>
                <select aria-label={t('cad.navigation')} value={cad.navigation} onChange={e=>setState({cad:{...getState().cad,navigation:e.target.value as typeof cad.navigation}})}><option value="solidworks">{t('drag.navigation')}</option><option value="cad">{t('cad.navCad')}</option><option value="classic">{t('cad.navClassic')}</option></select>
                <label className="inline"><input type="checkbox" checked={cad.directDrag} onChange={event=>setState({cad:{...getState().cad,directDrag:event.target.checked}})}/>{t('drag.direct')}</label>
                <select className="selection-filter" aria-label={t('context.filter')} value={filter} onChange={e=>setState({selectionFilter:e.target.value as SelectionFilter})}><option value="all">{t('context.all')}</option><option value="beam">{t('context.beams')}</option><option value="panel">{t('context.panels')}</option></select>
                <button aria-pressed={cad.rightOpen} onClick={()=>setState({cad:{...getState().cad,rightOpen:!cad.rightOpen,...(window.matchMedia('(max-width: 900px)').matches?{leftOpen:false}:{})}})} title={t('cad.toggleProperties')}>{t('cad.properties')}</button>
              </div>
              <div className="viewport-wrap">
                <Viewport />
                <CadViewControls />
                <DirectMoveHint/><DimensionEditor/>
                {shown!==ev.elements.length && <button className="visibility-banner" onClick={showAllParts} title={t('context.showAll')}>{t('context.status',{shown,total:ev.elements.length})} · {t('context.showAll')}</button>}
                <HoverTip />
                {ev.elements.length === 0 && tool === 'select' && <StartScreen />}
                {tool !== 'select' && <div className="hint">{toolHint} · Esc</div>}
                {tool === 'select' && ev.elements.length > 0 && <div className="nav-help">{t(cad.navigation==='solidworks'?'drag.navigation':cad.navigation==='cad'?'cad.navCad':'cad.navClassic')} · {t(cad.directDrag&&cad.navigation!=='classic'?'drag.help':'context.hint')}</div>}
              </div>
            </section>
            {cad.rightOpen && <><PanelResize side="right"/><aside className="right"><button className="cad-panel-close" aria-label={t('cad.toggleProperties')} onClick={()=>setState({cad:{...getState().cad,rightOpen:false}})}>{t('cad.close')}</button><Properties /></aside></>}
          </>
        )}
        {ws === 'lists' && <ListsView />}
        {ws === 'nesting' && <NestingView />}
        {ws === 'shopping' && <ShoppingView />}
        <ExtraViews ws={ws} />
      </main>
      <footer className="statusbar">
        <span className={`dot ${status.error || status.failed?'error':status.ready ? (status.busy ? 'busy' : 'ok') : 'busy'}`} /> {kernelMsg}
        {(status.error || status.failed>0) && <button className="link" onClick={()=>geom.restart()} title={status.error??undefined}>{t('safe.restart')}</button>}
        <span className="sep" />
        <span>{t('status.parts', { n: ev.elements.length })}</span>
        {selection.length>0 && <><span className="sep"/><span>{t('context.selection',{n:resolveSelection(ev,selection).length})}</span></>}
        <span className="sep" />
        <IssuesPanel />
      </footer>
      {toastMsg && <div className={`toast ${toastMsg.kind}`}>{toastMsg.text}</div>}
      <Dialogs />
      <Tour />
      <ModelContextMenu/>
      {commandOpen && <CommandPalette onClose={()=>setCommandOpen(false)}/>}
    </div>
  );
}
