import { useEffect, useRef, useState } from 'react';
import { sheetsToDxf } from '../../drawing/dxf';
import type { SheetFormat } from '../../drawing/sheet';
import { generateDrawings, type DrawnSheet } from '../../drawing/sheets';
import { DrawingEditor } from '../components/DrawingEditor';
import { DrawingJobs, drawingPrintHtml } from '../drawingJobs';
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
  const [revision,setRevision]=useState(0);
  const key = `${format}|${JSON.stringify(include)}|${lang}|${revision}`;
  const [result,setResult]=useState<typeof cache>(cache);
  const sheets=result?.doc===doc&&result.key===key?result.sheets:[];
  const [building,setBuilding]=useState(false),[exporting,setExporting]=useState(false);
  const busy=building||exporting;
  const [error,setError]=useState<string|null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const jobs=useRef(new DrawingJobs()),latestKey=useRef(key);
  latestKey.current=key;
  useEffect(()=>{
    const token=jobs.current.begin(doc,key);
    const current=()=>jobs.current.current(token,getState().doc,latestKey.current);
    setZoom(null);setProgress(null);setError(null);
    if(!ev.elements.length){setResult(null);setBuilding(false);return()=>jobs.current.cancel();}
    if(cache?.doc===doc&&cache.key===key){setResult(cache);setBuilding(false);return()=>jobs.current.cancel();}
    setBuilding(true);
    const timer=setTimeout(async()=>{
      try{
        const out=await generateDrawings(ev,prod,{
          format,lang,date:new Date().toLocaleDateString(de?'de-DE':'en-GB'),project:doc.project,t,
          projector:(elements,views)=>geom.project(elements,views),include,customViews:doc.drawingViews,
          onProgress:(done,total)=>{if(current())setProgress([done,total]);},
        });
        if(!current())return;
        cache={doc,key,sheets:out};setResult(cache);
      }catch(reason){if(current()){setResult(null);setError(String((reason as Error).message??reason));}}
      finally{if(current())setBuilding(false);}
    },300);
    return()=>{clearTimeout(timer);jobs.current.cancel();};
    // Document identity includes every geometry, annotation and price change.
  },[doc,key]);

  const valid=()=>getState().doc===doc&&latestKey.current===key&&sheets.length>0&&!building;
  const name=safeName(doc.project.name);
  const exportPdf=async()=>{
    if(!valid()||exporting)return;
    const snapshot=sheets;setExporting(true);
    try{
      const {sheetsToPdf}=await import('../../drawing/pdf');
      const data=await sheetsToPdf(snapshot,doc.project.name);
      if(!valid()){toast(t('drawing.stale'),'error');return;}
      download(`${name}_zeichnungen.pdf`,data,'application/pdf');
    }catch(reason){toast(String(reason),'error');}finally{setExporting(false);}
  };
  const exportDxf=()=>{if(valid())download(`${name}_zeichnungen.dxf`,sheetsToDxf(sheets),'application/dxf');};
  const exportSvg=(sheet:DrawnSheet,index:number)=>{if(valid())download(`${name}_blatt${index+1}.svg`,sheet.svg,'image/svg+xml');};
  const print=()=>{
    if(!valid())return;
    const output=window.open('','_blank');if(!output)return;
    output.document.write(drawingPrintHtml(doc.project.name,format,sheets.map(s=>s.svg)));
    output.document.close();setTimeout(()=>output.print(),400);
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
        <button className="btn subtle" onClick={()=>setRevision(value=>value+1)}>{t('drawing.rebuild')}</button>
        <span className="grow" />
        <button className="btn" disabled={busy || !sheets.length} onClick={exportPdf}>PDF</button>
        <button className="btn subtle" disabled={busy || !sheets.length} onClick={exportDxf}>DXF</button>
        <button className="btn subtle" disabled={busy || !sheets.length} onClick={print}>{t('common.print')}</button>
      </div>
      <p className="muted small">{t('drawing.scope')}</p>
      <DrawingEditor/>
      {error&&<p className="warn" role="alert">{t('drawing.failure',{error})}</p>}
      {!ev.elements.length && <p className="muted">{t('tree.empty')}</p>}
      {busy && <p className="muted">{t('common.loading')} {progress ? `(${progress[0]}/${progress[1]})` : ''}</p>}
      <div className="sheet-grid">
        {sheets.map((s, i) => (
          <figure key={s.id} className="sheet-thumb">
            <div className="sheet-frame" onClick={() => setZoom(i)} dangerouslySetInnerHTML={{ __html: s.svg }} />
            <figcaption>
              <span>{i + 1}. {s.title}</span>
              <button className="link" disabled={busy} onClick={() => exportSvg(s, i)}>SVG</button>
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
