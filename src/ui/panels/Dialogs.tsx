import { version } from '../../../package.json';
import { JointWorkbench } from '../components/JointWorkbench';
import { SketchEditor } from '../components/SketchEditor';
import { GENERATOR_LIST } from '../../core/generators';
import { insertGenerator } from '../actions';
import { ProjectsDialog } from './ProjectsDialog';
import { has, useT } from '../i18n';
import { setState, useApp } from '../store';

export const GEN_ICONS: Record<string, string> = {
  kommode: '🗄', regal: '📚', schrank: '🚪', tisch: '🪑', werkbank: '🛠', bett: '🛏', hochbeet: '🌱',
  satteldach: '⌂', pultdach: '◺', walmdach: '⛫', carport: '🚗', wand: '▥', decke: '▤', terrasse: '▦', pergola: '⛩', gartenhaus: '🏠', treppe: '𝄛',
};

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const t = useT();
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Dialogs() {
  const dialog = useApp((s) => s.dialog);
  const close = () => setState({ dialog: null });
  if (!dialog) return null;
  if(dialog.type==='sketch')return <SketchEditor key={dialog.id??'new'} id={dialog.id}/>;
  if (dialog.type === 'insert') return <InsertDialog onClose={close} />;
  if (dialog.type === 'joint') return <JointWorkbench a={dialog.a} b={dialog.b} id={dialog.id} onClose={close} />;
  if (dialog.type === 'about') return <AboutDialog onClose={close} />;
  if (dialog.type === 'shortcuts') return <ShortcutsDialog onClose={close} />;
  if (dialog.type === 'projects') return <ProjectsDialog onClose={close} />;
  return null;
}

function InsertDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const mode = useApp((s) => s.mode);
  const cats = (mode === 'carpentry' ? ['carpentry', 'outdoor', 'furniture'] : ['furniture', 'carpentry', 'outdoor']) as ('furniture' | 'carpentry' | 'outdoor')[];
  return (
    <Modal title={t('insert.title')} onClose={onClose} wide>
      {cats.map((c) => {
        const list = GENERATOR_LIST.filter((g) => g.category === c);
        if (!list.length) return null;
        return (
          <section key={c} className="insert-cat">
            <h3>{t(`insert.cat.${c}`)}</h3>
            <div className="insert-grid">
              {list.map((g) => (
                <button key={g.type} className="insert-card" onClick={() => insertGenerator(g.type)}>
                  <span className="insert-icon">{GEN_ICONS[g.type] ?? '◆'}</span>
                  <strong>{t(`gen.${g.type}`)}</strong>
                  <span className="muted small">{has(`gen.${g.type}.desc`) ? t(`gen.${g.type}.desc`) : ''}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </Modal>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Modal title={t('menu.about')} onClose={onClose}>
      <p><strong>OpenWoodCAD</strong> {version} – {t('app.tagline')}</p>
      <p>AGPL-3.0-or-later · OpenCascade (LGPL-2.1) · three.js · React · jsPDF</p>
      <p className="muted small">{t('help.preliminary')}</p>
    </Modal>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const rows: [string, string][] = [
      ['S / Strg+K', t('cad.search')],
    ['Strg+Z / Strg+Y', `${t('menu.undo')} / ${t('menu.redo')}`], ['Entf', t('menu.delete')], ['Strg+D', t('menu.duplicate')], ['Strg+S', t('menu.save')], ['Strg+O', t('menu.open')], ['Strg+A', t('menu.selectAll')],
    ['I', t('menu.assistant')], ['B', t('menu.beam')], ['P', t('menu.panel')], ['J', t('menu.joint')], ['F', t('view.fit')], ['1/2/3/4', `${t('view.iso')} / ${t('view.front')} / ${t('view.side')} / ${t('view.top')}`], ['Esc', t('help.exitTool')],
  ];
  return (
    <Modal title={t('menu.shortcuts')} onClose={onClose}>
      <table className="table"><tbody>{rows.map(([k, v]) => <tr key={k}><td><kbd>{k.replaceAll('Strg',t('help.ctrl')).replaceAll('Entf',t('help.delete'))}</kbd></td><td>{v}</td></tr>)}</tbody></table>
    </Modal>
  );
}
