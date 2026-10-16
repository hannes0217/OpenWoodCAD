import { GENERATOR_LIST } from '../../core/generators';
import { applyJoint, suggestJoints } from '../../core/joints';
import { uid } from '../../core/math';
import type { JointType } from '../../core/model';
import { insertGenerator } from '../actions';
import { ProjectsDialog } from './ProjectsDialog';
import { has, useT } from '../i18n';
import { setState, updateDoc, useApp, useEvaluated } from '../store';

export const GEN_ICONS: Record<string, string> = {
  kommode: '🗄', regal: '📚', schrank: '🚪', tisch: '🪑', werkbank: '🛠', bett: '🛏', hochbeet: '🌱',
  satteldach: '⌂', pultdach: '◺', walmdach: '⛫', carport: '🚗', wand: '▥', decke: '▤', terrasse: '▦', pergola: '⛩', gartenhaus: '🏠', treppe: '𝄛',
};

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="close">✕</button>
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
  if (dialog.type === 'insert') return <InsertDialog onClose={close} />;
  if (dialog.type === 'joint') return <JointDialog a={dialog.a} b={dialog.b} onClose={close} />;
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

function JointDialog({ a, b, onClose }: { a: string; b: string; onClose: () => void }) {
  const t = useT();
  const ev = useEvaluated();
  const ea = ev.elements.find((e) => e.id === a);
  const eb = ev.elements.find((e) => e.id === b);
  if (!ea || !eb) return null;
  const options = suggestJoints(ea, eb);
  const add = (type: JointType, swap = false) => {
    const id = uid('j');
    updateDoc((d) => d.joints.push({ id, type, a: swap ? b : a, b: swap ? a : b, params: {} }));
    setState({ dialog: null, selection: [`joint:${id}`] });
  };
  const works = (type: JointType, swap: boolean) => {
    const r = applyJoint({ id: 'x', type, a: swap ? b : a, b: swap ? a : b, params: {} }, swap ? eb : ea, swap ? ea : eb);
    return r.warnings.length === 0 && r.processings.length > 0;
  };
  return (
    <Modal title={t('menu.joint')} onClose={onClose}>
      <p className="muted">A = {ea.name}, B = {eb.name}</p>
      <div className="joint-grid">
        {options.map((o) => (
          <div key={o} className="joint-option">
            <strong>{t(`joint.${o}`)}</strong>
            <div className="btn-row">
              <button className="btn" disabled={!works(o, false)} onClick={() => add(o, false)}>A → B</button>
              <button className="btn" disabled={!works(o, true)} onClick={() => add(o, true)}>B → A</button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Modal title={t('menu.about')} onClose={onClose}>
      <p><strong>OpenWoodCAD</strong> 0.1 – {t('app.tagline')}</p>
      <p>AGPL-3.0-or-later · OpenCascade (LGPL-2.1) · three.js · React · jsPDF</p>
      <p className="muted small">Statische Berechnungen dienen der Vorbemessung und ersetzen keinen prüffähigen Standsicherheitsnachweis.</p>
    </Modal>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const rows: [string, string][] = [
      ['S / Strg+K', t('cad.search')],
    ['Strg+Z / Strg+Y', `${t('menu.undo')} / ${t('menu.redo')}`], ['Entf', t('menu.delete')], ['Strg+D', t('menu.duplicate')], ['Strg+S', t('menu.save')], ['Strg+O', t('menu.open')], ['Strg+A', t('menu.selectAll')],
    ['I', t('menu.assistant')], ['B', t('menu.beam')], ['P', t('menu.panel')], ['J', t('menu.joint')], ['F', t('view.fit')], ['1/2/3/4', `${t('view.iso')} / ${t('view.front')} / ${t('view.side')} / ${t('view.top')}`], ['Esc', 'Auswahl / Werkzeug beenden'],
  ];
  return (
    <Modal title={t('menu.shortcuts')} onClose={onClose}>
      <table className="table"><tbody>{rows.map(([k, v]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
    </Modal>
  );
}
