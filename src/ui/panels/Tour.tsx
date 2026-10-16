import { useEffect, useLayoutEffect, useState } from 'react';
import { setState, useApp } from '../store';

interface Step {
  selector: string;
  de: [string, string];
  en: [string, string];
  workspace?: 'model' | 'drawings' | 'nesting';
}

const STEPS: Step[] = [
  { selector: '.toolbar', workspace: 'model', de: ['1 · Bauteile anlegen', '„Vorlage“ fügt fertige Möbel, Wände usw. ein. Mit „Balken“, „Platte“, Kreis und Formteil zeichnest du frei – Ecken und Kantenmitten rasten ein, Maße kannst du direkt eintippen.'], en: ['1 · Create parts', '“Template” inserts furniture, walls etc. Beam, panel, circle and shaped part let you draw freely – corners snap, dimensions can be typed.'] },
  { selector: '.right', workspace: 'model', de: ['2 · Maße ändern', 'Hier änderst du Maße, Material und Ausführung des gewählten Objekts. Das Modell rechnet sofort neu. Unter „Transformieren“ verschiebst, spiegelst und kopierst du exakt.'], en: ['2 · Change dimensions', 'Change size, material and details of the selected object here. “Transform” moves, mirrors and copies precisely.'] },
  { selector: '[aria-label^="Zwei Bauteile"], [aria-label^="Ctrl-click"]', workspace: 'model', de: ['3 · Verbinden', 'Zwei Bauteile mit gedrückter Strg-Taste anklicken und „Verbinden“ wählen: Zapfen, Blatt, Kerve, Versatz, Dübel … Die Verbindung passt sich bei jeder Änderung an.'], en: ['3 · Join', 'Ctrl-click two parts and choose “Join”: tenon, lap, birdsmouth, dowels … Joints update with every change.'] },
  { selector: '.tabs', de: ['4 · Ausgeben', 'Unter „Zeichnungen“ entstehen Werkstattzeichnungen als PDF/DXF, unter „Listen“, „Zuschnitt“ und „Einkauf & Kalkulation“ Stückliste, Schnittpläne, Einkaufsliste und Preis.'], en: ['4 · Output', '“Drawings” gives workshop drawings as PDF/DXF; “Lists”, “Cutting” and “Shopping & costing” give parts list, cutting plans, shopping list and price.'] },
];

export const TOUR_KEY = 'openwoodcad.tourSeen';

export function Tour() {
  const step = useApp((s) => s.tourStep);
  const lang = useApp((s) => s.lang);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const st = step === null ? null : STEPS[step];
  useEffect(() => {
    if (st?.workspace) setState({ workspace: st.workspace });
  }, [st]);
  useLayoutEffect(() => {
    if (!st) return;
    const upd = () => {
      const el = document.querySelector(st.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    upd();
    const h = setInterval(upd, 300);
    return () => clearInterval(h);
  }, [st]);
  if (!st || step === null) return null;
  const [title, text] = lang === 'de' ? st.de : st.en;
  const finish = () => {
    setState({ tourStep: null });
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* ignore */ }
  };
  const W = 340;
  let left = 20, top = 80;
  if (rect) {
    left = Math.min(window.innerWidth - W - 16, Math.max(16, rect.left + rect.width / 2 - W / 2));
    top = rect.bottom + 12 + 180 > window.innerHeight ? Math.max(16, rect.top - 190) : rect.bottom + 12;
    if (rect.height > window.innerHeight / 2) { top = rect.top + 40; left = Math.max(16, rect.left - W - 16); }
  }
  return (
    <>
      {rect && <div className="tour-hole" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />}
      <div className="tour-box" style={{ left, top, width: W }} role="dialog" aria-label={title}>
        <strong>{title}</strong>
        <p>{text}</p>
        <div className="tour-actions">
          <button className="link" onClick={finish}>{lang === 'de' ? 'Überspringen' : 'Skip'}</button>
          <span className="muted small">{step + 1} / {STEPS.length}</span>
          {step > 0 && <button className="btn subtle" onClick={() => setState({ tourStep: step - 1 })}>‹</button>}
          {step < STEPS.length - 1 ? <button className="btn" onClick={() => setState({ tourStep: step + 1 })}>{lang === 'de' ? 'Weiter' : 'Next'}</button> : <button className="btn" onClick={() => { finish(); setState({ workspace: 'model' }); }}>{lang === 'de' ? 'Los geht’s' : 'Start'}</button>}
        </div>
      </div>
    </>
  );
}
