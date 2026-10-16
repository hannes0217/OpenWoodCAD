import { useEffect, useRef, useState } from 'react';
import { sheetsToDxf } from '../../drawing/dxf';
import type { SheetFormat } from '../../drawing/sheet';
import { generateDrawings, type DrawnSheet } from '../../drawing/sheets';
import { download, safeName } from '../actions';
import { geom } from '../geomClient';
import { t, useT } from '../i18n';
import { getState, toast, useApp, useEvaluated } from '../store';
import { useProduction } from './Lists';

let cache: { doc: unknown; key: string; sheets: DrawnSheet[] } | null = null;

export function DrawingsView() {
  useT();
  const ev = useEvaluated();
  const doc = useApp((s) => s.doc);
  const lang = useApp((s) => s.lang);
  const prod = useProduction();
  const de = lang === 'de';
  const [format, setFormat] = useState<SheetFormat>('A3');
  const [include, setInclude] = useState({ overview: true, views: true, parts: true, lists: true, nesting: true });
  const key = `${format}|${JSON.stringify(include)}|${lang}`;
  const [sheets, setSheets] = useState<DrawnSheet[]>(cache && cache.doc === doc && cache.key === key ? cache.sheets : []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const run = useRef(0);

  const build = async () => {
    if (!ev.elements.length) return;
    const my = ++run.current;
    setBusy(true);
    setProgress(null);
    try {
      const out = await generateDrawings(ev, prod, {
        format, lang, date: new Date().toLocaleDateString(de ? 'de-DE' : 'en-GB'), project: doc.project, t,
        projector: (els, views) => geom.project(els, views), include, onProgress: (a, b) => my === run.current && setProgress([a, b]),
      });
      if (my !== run.current) return;
      cache = { doc, key, sheets: out };
      setSheets(out);
    } catch (err) {
      toast(String((err as Error).message ?? err), 'error');
    } finally {
      if (my === run.current) setBusy(false);
    }
  };

  // Regenerate automatically when the model or options change.
  useEffect(() => {
    if (cache && cache.doc === doc && cache.key === key) { setSheets(cache.sheets); return; }
    const h = setTimeout(build, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, key]);

  const name = safeName(getState().doc.project.name);
  const exportPdf = async () => {
    setBusy(true);
    try {
      const { sheetsToPdf } = await import('../../drawing/pdf');
      download(`${name}_zeichnungen.pdf`, await sheetsToPdf(sheets, doc.project.name), 'application/pdf');
    } catch (err) {
      toast(String((err as Error).message ?? err), 'error');
    } finally {
      setBusy(false);
    }
  };
  const exportDxf = () => download(`${name}_zeichnungen.dxf`, sheetsToDxf(sheets), 'application/dxf');
  const exportSvg = (s: DrawnSheet, i: number) => download(`${name}_blatt${i + 1}.svg`, s.svg, 'image/svg+xml');
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${doc.project.name}</title><style>@page{size:${format} landscape;margin:0}body{margin:0}svg{width:100vw;height:auto;page-break-after:always;display:block}</style></head><body>${sheets.map((s) => s.svg).join('')}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>{t('ws.drawings')}</h2>
        <select value={format} onChange={(e) => setFormat(e.target.value as SheetFormat)}>
          <option value="A4">A4</option><option value="A3">A3</option><option value="A2">A2</option>
        </select>
        {(['overview', 'views', 'parts', 'lists', 'nesting'] as const).map((k) => (
          <label key={k} className="inline">
            <input type="checkbox" checked={include[k]} onChange={(e) => setInclude({ ...include, [k]: e.target.checked })} />
            {de ? { overview: 'Übersicht', views: 'Ansichten', parts: 'Einzelteile', lists: 'Listen', nesting: 'Zuschnittpläne' }[k] : { overview: 'Overview', views: 'Views', parts: 'Parts', lists: 'Lists', nesting: 'Cutting plans' }[k]}
          </label>
        ))}
        <span className="grow" />
        <button className="btn" disabled={busy || !sheets.length} onClick={exportPdf}>PDF</button>
        <button className="btn subtle" disabled={busy || !sheets.length} onClick={exportDxf}>DXF</button>
        <button className="btn subtle" disabled={busy || !sheets.length} onClick={print}>{t('common.print')}</button>
      </div>
      {!ev.elements.length && <p className="muted">{t('tree.empty')}</p>}
      {busy && <p className="muted">{t('common.loading')} {progress ? `(${progress[0]}/${progress[1]})` : ''}</p>}
      <div className="sheet-grid">
        {sheets.map((s, i) => (
          <figure key={s.id} className="sheet-thumb">
            <div className="sheet-frame" onClick={() => setZoom(i)} dangerouslySetInnerHTML={{ __html: s.svg }} />
            <figcaption>
              <span>{i + 1}. {s.title}</span>
              <button className="link" onClick={() => exportSvg(s, i)}>SVG</button>
            </figcaption>
          </figure>
        ))}
      </div>
      {zoom !== null && sheets[zoom] && (
        <div className="modal-backdrop" onMouseDown={() => setZoom(null)}>
          <div className="sheet-zoom" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sheet-zoom-bar">
              <button className="btn subtle" disabled={zoom === 0} onClick={() => setZoom(zoom - 1)}>‹</button>
              <span>{zoom + 1} / {sheets.length} – {sheets[zoom].title}</span>
              <button className="btn subtle" disabled={zoom === sheets.length - 1} onClick={() => setZoom(zoom + 1)}>›</button>
              <button className="icon-btn" onClick={() => setZoom(null)}>✕</button>
            </div>
            <div className="sheet-zoom-body" dangerouslySetInnerHTML={{ __html: sheets[zoom].svg }} />
          </div>
        </div>
      )}
    </div>
  );
}
