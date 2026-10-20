import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { deleteSelection, duplicateSelection } from '../actions';
import { groupSelection, dissolveSelection } from '../assemblyActions';
import { useT } from '../i18n';
import { resolveSelection } from '../selection';
import { setState, useApp, useEvaluated } from '../store';
import { hideSelection, isolateSelection, showAllParts } from '../viewActions';
import { viewportFit, viewportFitIds } from '../Viewport';
export function ModelContextMenu() {
    const t = useT(), menu = useApp(s => s.contextMenu), selection = useApp(s => s.selection), tool = useApp(s => s.tool), ev = useEvaluated(), ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const ids = resolveSelection(ev, selection), has = ids.length > 0;
    const hasGenerator = ev.elements.some(e => ids.includes(e.id) && e.generator);
    const close = () => setState({ contextMenu: null, contextPreview: null });
    useLayoutEffect(() => { if (menu && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPosition({ x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)), y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)) });
    } }, [menu]);
    useEffect(() => {
        if (!menu)
            return;
        const previous = document.activeElement as HTMLElement | null;
        ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node))
            close(); };
        document.addEventListener('pointerdown', outside, true);
        return () => { document.removeEventListener('pointerdown', outside, true); previous?.focus(); };
    }, [menu]);
    if (!menu)
        return null;
    const action = (run: () => void) => { close(); run(); };
    const button = (label: string, run: () => void, disabled = false, shortcut?: string) => <button role="menuitem" disabled={disabled} onClick={() => action(run)}>{t(label)}{shortcut && <kbd>{shortcut}</kbd>}</button>;
    return <div ref={ref} className="model-context-menu" role="menu" aria-label={t('context.title')} style={{ left: position.x, top: position.y }} onContextMenu={e => e.preventDefault()} onKeyDown={e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
                return;
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(e.key)) {
                e.preventDefault();
                const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowUp' || e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
                buttons[next]?.focus();
            }
        }}>
  <div className="context-section">{t('context.actions')}</div>
  {hasGenerator && <div className="context-note context-scope">{t('context.generatorScope')}</div>}
  {tool !== 'select' && button('cad.cancelTool', () => setState({ tool: 'select', gizmoMode: 'none' }), false, 'Esc')}
  {button('cad.move', () => setState({ tool: 'select', gizmoMode: 'translate' }), !has, 'W')}
  {button('cad.rotate', () => setState({ tool: 'select', gizmoMode: 'rotate' }), !has, 'R')}
  {button('menu.duplicate', () => duplicateSelection(), !has, 'Ctrl+D')}
  {button('assembly.create', groupSelection, !has)}
  {selection.some(key=>key.startsWith('group:'))&&button('assembly.dissolve',dissolveSelection)}
  {button('menu.joint', () => setState({ dialog: { type: 'joint', a: ids[0], b: ids[1] } }), ids.length !== 2)}
  {button('cad.fitSelection', () => viewportFitIds(ids), !has)}
  {button('context.isolate', isolateSelection, !has)}
  {button('context.hide', hideSelection, !has)}
  {button('menu.delete', deleteSelection, !has, 'Del')}
  <div className="context-section">{t('context.view')}</div>
  {button('context.showAll', showAllParts)}
  {button('view.fit', () => viewportFit(), false, 'F')}
  {menu.source !== 'selection' && <><div className="context-section" title={t('context.pickHint')}>{t('context.pick')}</div>
  <div className="context-candidates">
   {!menu.ids.length && <p className="muted pad">{t('context.noHits')}</p>}
   {menu.ids.map(id => { const e = ev.elements.find(e => e.id === id); return e ? <button role="menuitemradio" aria-checked={ids.includes(id)} key={id} onMouseEnter={() => setState({ contextPreview: id })} onFocus={() => setState({ contextPreview: id })} onClick={() => setState({ selection: [id], contextPreview: id })}><span className="pos-badge">{e.pos}</span><span>{e.name}</span></button> : null; })}
  </div>
  </>}
  <div className="context-note">{t('context.visibility')}</div>
 </div>;
}
