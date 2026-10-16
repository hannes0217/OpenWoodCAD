import { GENERATOR_LIST } from '../../core/generators';
import { insertGenerator, openFile } from '../actions';
import { has, useT } from '../i18n';
import { setState, useApp, type AppState } from '../store';
import { GEN_ICONS } from './Dialogs';

type Mode = NonNullable<AppState['mode']>;

const MODES: { id: Mode; icon: string; de: [string, string]; en: [string, string] }[] = [
  { id: 'furniture', icon: '🗄', de: ['Möbel & Innenausbau', 'Kommoden, Regale, Schränke, Werkbänke – Platten, Beschläge, Kanten, Zuschnitt'], en: ['Furniture & interiors', 'Chests, shelves, cabinets, workbenches – panels, fittings, edges, cutting'] },
  { id: 'carpentry', icon: '⌂', de: ['Zimmerei & Holzbau', 'Wände, Dächer, Carports – Kanthölzer, Abbund, Holzliste'], en: ['Carpentry & timber framing', 'Walls, roofs, carports – timber, joinery, timber list'] },
  { id: 'free', icon: '✎', de: ['Frei zeichnen', 'Balken, Platten, Kreise und Formteile selbst zeichnen und verbinden'], en: ['Free drawing', 'Draw and join beams, panels, circles and shaped parts yourself'] },
];

/** Shown in the 3D area while the project is empty: "What do you want to build?" */
export function StartScreen() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.mode) ?? 'furniture';
  const de = lang === 'de';
  const cats: Record<Mode, ('furniture' | 'carpentry' | 'outdoor')[]> = { furniture: ['furniture'], carpentry: ['carpentry', 'outdoor'], free: [] };
  return (
    <div className="start">
      <div className="start-inner">
        <h1>{de ? 'Was möchtest du bauen?' : 'What do you want to build?'}</h1>
        <div className="mode-tabs" role="tablist">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={mode === m.id} className={`mode-tab ${mode === m.id ? 'on' : ''}`} onClick={() => setState({ mode: m.id })}>
              <span className="mode-icon">{m.icon}</span>
              <strong>{(de ? m.de : m.en)[0]}</strong>
              <span className="muted small">{(de ? m.de : m.en)[1]}</span>
            </button>
          ))}
        </div>
        {mode !== 'free' && (
          <>
            <p className="muted">{de ? 'Wähle eine Vorlage – Maße, Material und Ausführung passt du danach rechts an. Zeichnungen, Listen und Einkauf entstehen automatisch.' : 'Pick a template – adjust dimensions, material and details on the right. Drawings, lists and shopping are generated automatically.'}</p>
            {cats[mode].map((c) => {
              const list = GENERATOR_LIST.filter((g) => g.category === c);
              if (!list.length) return null;
              return (
                <section key={c}>
                  <h3>{t(`insert.cat.${c}`)}</h3>
                  <div className="start-grid">
                    {list.map((g) => (
                      <button key={g.type} className="start-card" onClick={() => insertGenerator(g.type)}>
                        <span className="start-icon">{GEN_ICONS[g.type] ?? '◆'}</span>
                        <strong>{t(`gen.${g.type}`)}</strong>
                        <span className="muted small">{has(`gen.${g.type}.desc`) ? t(`gen.${g.type}.desc`) : ''}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
        {mode === 'free' && (
          <section>
            <p className="muted">{de ? 'Wähle ein Werkzeug. Punkte rasten an Ecken, Kantenmitten und am Raster ein; Längen und Maße kannst du jederzeit eintippen.' : 'Pick a tool. Points snap to corners, edge midpoints and the grid; type lengths and sizes at any time.'}</p>
            <div className="start-grid">
              <button className="start-card" onClick={() => setState({ tool: 'beam' })}><span className="start-icon">▬</span><strong>{de ? 'Balken / Kantholz' : 'Beam'}</strong><span className="muted small">{de ? 'Start- und Endpunkt klicken (Taste B)' : 'Click start and end (B)'}</span></button>
              <button className="start-card" onClick={() => setState({ tool: 'rect' })}><span className="start-icon">▭</span><strong>{de ? 'Platte / Brett' : 'Panel / board'}</strong><span className="muted small">{de ? 'Zwei Ecken klicken oder 600x400 tippen (P)' : 'Click two corners or type 600x400 (P)'}</span></button>
              <button className="start-card" onClick={() => setState({ tool: 'circle' })}><span className="start-icon">◯</span><strong>{de ? 'Runde Platte' : 'Round panel'}</strong><span className="muted small">{de ? 'Mittelpunkt + Radius (C)' : 'Centre + radius (C)'}</span></button>
              <button className="start-card" onClick={() => setState({ tool: 'poly' })}><span className="start-icon">⬠</span><strong>{de ? 'Formteil' : 'Shaped part'}</strong><span className="muted small">{de ? 'Freien Umriss klicken (L)' : 'Click a free outline (L)'}</span></button>
            </div>
          </section>
        )}
        <section>
          <h3>{de ? 'Oder' : 'Or'}</h3>
          <div className="start-grid">
            <button className="start-card" onClick={() => setState({ dialog: { type: 'projects' } })}>
              <span className="start-icon">🗂</span>
              <strong>{de ? 'Gespeicherte Projekte' : 'Saved projects'}</strong>
              <span className="muted small">{de ? 'Lokale Projekte und Wiederherstellungspunkte' : 'Local projects and restore points'}</span>
            </button>
            <button className="start-card" onClick={openFile}>
              <span className="start-icon">📂</span>
              <strong>{de ? 'Datei öffnen' : 'Open file'}</strong>
              <span className="muted small">{de ? '.owc-Datei von deinem Rechner' : '.owc file from your computer'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
