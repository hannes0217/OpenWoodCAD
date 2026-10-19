import { PrecisionControls } from '../components/PrecisionControls';
import { useState } from 'react';
import { MaterialSelect, NumberInput } from '../components/Field';
import { useT } from '../i18n';
import { setState, useApp, useEvaluated } from '../store';
import { resolveSelection } from '../selection';
import { viewportFit } from '../Viewport';
import { ToolIcon } from '../components/ToolIcon';

function TB({ on, onClick, icon, label, tip, disabled }: { on?: boolean; onClick: () => void; icon: string; label?: string; tip: string; disabled?: boolean }) {
  return (
    <button className={`tb ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} data-tip={tip} aria-label={tip}>
      <span className="tb-icon"><ToolIcon glyph={icon}/></span>
      {label && <span className="tb-label">{label}</span>}
    </button>
  );
}

export function ModelToolbar() {
  const t = useT();
  const s = useApp((x) => x);
  const ev = useEvaluated();
  const de = s.lang === 'de';
  const hasDrawers = ev.elements.some((e) => e.motion);
  const pair = resolveSelection(ev, s.selection);
  const [viewOpen, setViewOpen] = useState(false);
  const toggle = (tool: typeof s.tool) => setState({ tool: s.tool === tool ? 'select' : tool });
  return (
    <div className="toolbar">
      <div className="tb-group">
        <span className="tb-group-name">{t('cad.select')}</span>
        <TB on={s.tool==='select' && s.gizmoMode==='none'} onClick={()=>setState({tool:'select',gizmoMode:'none'})} icon="cursor" tip={t('cad.select')} />
        <TB on={s.tool === 'select' && s.gizmoMode === 'translate'} onClick={() => setState({ tool: 'select', gizmoMode: 'translate' })} icon="✥" label={de ? 'Verschieben' : 'Move'} tip={de ? 'Auswählen und an den Pfeilen am Objekt ziehen (W)' : 'Select and drag the arrows on the object (W)'} />
        <TB on={s.tool === 'select' && s.gizmoMode === 'rotate'} onClick={() => setState({ tool: 'select', gizmoMode: 'rotate' })} icon="⟳" label={t('cad.rotate')} tip={t('drag.rotateHelp')} />
        <button className="tb" aria-haspopup="menu" disabled={!pair.length} onClick={event=>{
          const rect=event.currentTarget.getBoundingClientRect();
          setState({contextMenu:{x:rect.left,y:rect.bottom,ids:[],source:'selection'},contextPreview:null,hover:null});
        }}>{t('context.title')} ▾</button>
      </div>
      <div className="tb-group">
        <span className="tb-group-name">{t('cad.create')}</span>
        <TB onClick={() => setState({ dialog: { type: 'insert' } })} icon="＋" label={de ? 'Vorlage' : 'Template'} tip={de ? 'Möbel, Dach, Wand … aus einer Vorlage einfügen (I)' : 'Insert furniture, roof, wall … from a template (I)'} />
        <TB on={s.tool === 'beam'} onClick={() => toggle('beam')} icon="▬" label={de ? 'Balken' : 'Beam'} tip={de ? 'Balken zeichnen: Punkte anklicken, Länge tippbar, X/Y/Z sperrt Richtung (B)' : 'Draw beams: click points, type length, X/Y/Z locks direction (B)'} />
        <TB on={s.tool === 'rect'} onClick={() => toggle('rect')} icon="▭" label={de ? 'Platte' : 'Panel'} tip={de ? 'Rechteckige Platte auf Boden oder Bauteilfläche, Maße tippbar (P)' : 'Rectangular panel on ground or part face, type size (P)'} />
        <TB on={s.tool === 'circle'} onClick={() => toggle('circle')} icon="◯" tip={de ? 'Runde Platte: Mittelpunkt + Radius, Durchmesser tippbar (C)' : 'Round panel: centre + radius (C)'} />
        <TB on={s.tool === 'poly'} onClick={() => toggle('poly')} icon="⬠" tip={de ? 'Formteil mit freiem Umriss (L)' : 'Shaped part with free outline (L)'} />
      </div>
      <div className="tb-group">
        <span className="tb-group-name">{t('cad.modify')}</span>
        <TB on={s.tool === 'cutRect'} onClick={() => toggle('cutRect')} icon="⬚" tip={de ? 'Rechteckiger Ausschnitt in einer Platte (auf ihre Fläche zeichnen)' : 'Rectangular cut-out (draw on the panel face)'} />
        <TB on={s.tool === 'cutCircle'} onClick={() => toggle('cutCircle')} icon="⊙" tip={de ? 'Runder Ausschnitt / Bohrung in einer Platte' : 'Round cut-out / hole in a panel'} />
        <TB on={s.tool === 'measure'} onClick={() => toggle('measure')} icon="📏" tip={de ? 'Abstand zwischen zwei Punkten messen (M)' : 'Measure distance (M)'} />
        <TB disabled={pair.length !== 2} onClick={() => setState({ dialog: { type: 'joint', a: pair[0], b: pair[1] } })} icon="⋈" label={de ? 'Verbinden' : 'Join'} tip={de ? 'Zwei Bauteile mit Strg anklicken, dann Holzverbindung wählen (J)' : 'Ctrl-click two parts, then choose a joint (J)'} />
      </div>
      <div className="tb-group">
        <span className="tb-group-name">{t('cad.views')}</span>
        <TB onClick={() => viewportFit('iso')} icon="◰" tip={de ? 'Alles zeigen (F)' : 'Zoom all (F)'} />
        <div className="menu">
          <TB on={viewOpen} onClick={() => setViewOpen(!viewOpen)} icon="👁" label={de ? 'Darstellung' : 'Display'} tip={de ? 'Schnitt, Röntgen, Farben, Positionsnummern' : 'Section, x-ray, colours, numbers'} />
          {viewOpen && (
            <div className="menu-pop view-pop" onMouseLeave={() => setViewOpen(false)}>
              <label><input type="checkbox" checked={s.showLabels} onChange={(e) => setState({ showLabels: e.target.checked })} /> {t('view.labels')}</label>
              <label><input type="checkbox" checked={s.xray} onChange={(e) => setState({ xray: e.target.checked })} /> {t('view.xray')}</label>
              <label><input type="checkbox" checked={s.section.enabled} onChange={(e) => setState({ section: { ...s.section, enabled: e.target.checked } })} /> {t('view.section')}</label>
              {s.section.enabled && (
                <div className="pop-row">
                  <select value={s.section.axis} onChange={(e) => setState({ section: { ...s.section, axis: e.target.value as 'x' } })}><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select>
                  <input type="range" min={0} max={1} step={0.01} value={s.section.offset} onChange={(e) => setState({ section: { ...s.section, offset: Number(e.target.value) } })} />
                </div>
              )}
              <div className="pop-row">
                {t('view.colorBy')}
                <select value={s.colorBy} onChange={(e) => setState({ colorBy: e.target.value as 'material' })}>
                  <option value="material">{t('view.color.material')}</option>
                  <option value="role">{t('view.color.role')}</option>
                  <option value="pos">{t('view.color.pos')}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      {hasDrawers && (
        <div className="tb-group">
          <TB on={s.drawerOpen > 0.5} onClick={() => setState({ drawerOpen: s.drawerOpen > 0.5 ? 0 : 1, openGroups: {} })} icon="⇲" label={s.drawerOpen > 0.5 ? (de ? 'Alle schließen' : 'Close all') : (de ? 'Alle öffnen' : 'Open all')} tip={de ? 'Alle Schubkästen/Türen auf/zu – einzelne per Doppelklick auf die Front' : 'Open/close all drawers/doors – single ones by double-clicking the front'} />
        </div>
      )}
      {(s.tool === 'rect' || s.tool === 'circle' || s.tool === 'poly') && (
        <div className="tb-group tool-opts">
          <span>{t('common.thickness')}</span>
          <NumberInput value={s.panelThickness} min={1} width={70} unit="mm" onCommit={(v) => setState({ panelThickness: v })} />
          <span>{de ? 'Raster' : 'Grid'}</span>
          <NumberInput value={s.snap} min={1} width={60} unit="mm" onCommit={(v) => setState({ snap: v })} />
          <MaterialSelect value={s.panelMaterial} catalog={ev.catalog} category="sheet" onChange={(m) => setState({ panelMaterial: m, panelThickness: ev.catalog.materials.find((x) => x.id === m)?.thickness ?? s.panelThickness })} />
        </div>
      )}
      {s.tool === 'beam' && (
        <div className="tb-group tool-opts">
          <span>{t('common.section')}</span>
          <NumberInput value={s.beamSection[0]} min={10} width={70} onCommit={(v) => setState({ beamSection: [v, s.beamSection[1]] })} />×
          <NumberInput value={s.beamSection[1]} min={10} width={70} onCommit={(v) => setState({ beamSection: [s.beamSection[0], v] })} />
          <span>{de ? 'Raster' : 'Grid'}</span>
          <NumberInput value={s.snap} min={1} width={60} unit="mm" onCommit={(v) => setState({ snap: v })} />
          <MaterialSelect value={s.beamMaterial} catalog={ev.catalog} category="timber" onChange={(m) => setState({ beamMaterial: m })} />
        </div>
      )}
      {s.tool!=='select'&&<PrecisionControls/>}
    </div>
  );
}

export function HoverTip() {
  const hover = useApp((s) => s.hover);
  const lang = useApp((s) => s.lang);
  const ev = useEvaluated();
  if (!hover) return null;
  const e = ev.elements.find((x) => x.id === hover.id);
  if (!e) return null;
  const r = (v: number) => Math.round(v * 10) / 10;
  return (
    <div className="hover-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
      <strong>Pos. {e.pos} · {e.name}</strong>
      <span>{r(e.length)} × {r(e.width)} × {r(e.height)} mm</span>
      {e.motion && <span className="muted">{lang === 'de' ? 'Doppelklick: öffnen/schließen' : 'Double-click: open/close'}</span>}
    </div>
  );
}
