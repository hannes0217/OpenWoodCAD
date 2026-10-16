import { useMemo, useRef, useState } from 'react';
import type { SiteInfo } from '../../core/model';
import { analyzeSystem, type StaticsReport } from '../../core/statics/analyze';
import { StaticsError } from '../../core/statics/fem2d';
import type { StaticSystem } from '../../core/statics/model';
import type { ServiceClass } from '../../core/timber';
import { download, safeName } from '../actions';
import { NumberInput } from '../components/Field';
import { translate, useT } from '../i18n';
import { setState, useApp, useEvaluated, type Lang } from '../store';

type Quantity = 'N' | 'V' | 'M' | 'v';
const divisor:Record<Quantity,number>={N:1000,V:1000,M:1e6,v:1};

function number(value:number,lang:Lang,digits=2) {
  return value.toLocaleString(lang==='de'?'de-DE':'en-GB',{maximumFractionDigits:digits});
}

export function SystemDiagram({system,lang}:{system:StaticSystem;lang:Lang}) {
  const xs=system.nodes.map((n) => n.x), zs=system.nodes.map((n) => n.z);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
  const scale=Math.min(650/Math.max(1,maxX-minX),190/Math.max(1,maxZ-minZ));
  const x=(v:number) => 35+(v-minX)*scale, z=(v:number) => 225-(v-minZ)*scale;
  const nodes=new Map(system.nodes.map((n) => [n.id,n]));
  return <svg className="statics-diagram" viewBox="0 0 720 270" role="img" aria-label={translate(lang,'statics.system')}>
    {system.members.map((m) => {
      const a=nodes.get(m.n1)!, b=nodes.get(m.n2)!;
      return <g key={m.id}><line x1={x(a.x)} y1={z(a.z)} x2={x(b.x)} y2={z(b.z)} stroke="#3176b0" strokeWidth="4" />
        <text x={(x(a.x)+x(b.x))/2} y={(z(a.z)+z(b.z))/2-12} textAnchor="middle">{m.name} ({m.b} × {m.h})</text></g>;
    })}
    {system.nodes.map((n) => <g key={n.id}><circle cx={x(n.x)} cy={z(n.z)} r="4" fill="#222" /><text x={x(n.x)} y={z(n.z)-8}>{n.id}</text></g>)}
    {system.supports.map((s,i) => {
      const n=nodes.get(s.node)!;
      return <g key={i}><path d={`M ${x(n.x)} ${z(n.z)+4} l -9 16 h 18 z`} fill="#e2e7ec" stroke="#222" />
        <text x={x(n.x)} y={z(n.z)+36} textAnchor="middle">{[s.ux?'X':'',s.uz?'Z':'',s.ry?'R':''].filter(Boolean).join('/')}</text></g>;
    })}
  </svg>;
}

export function ResultPlot({points,title,lang}:{points:{x:number;value:number}[];title:string;lang:Lang}) {
  const length=Math.max(1,...points.map((p) => p.x)), magnitude=Math.max(1e-9,...points.map((p) => Math.abs(p.value)));
  const path=points.map((p,i) => `${i?'L':'M'} ${40+p.x/length*620} ${115-p.value/magnitude*75}`).join(' ');
  return <figure className="statics-plot"><figcaption>{title}</figcaption>
    <svg viewBox="0 0 720 240" role="img" aria-label={title}>
      <line x1="40" y1="115" x2="660" y2="115" stroke="#777" />
      <path d={path} fill="none" stroke="#2674a8" strokeWidth="2" />
      <text x="40" y="220">0 mm</text><text x="660" y="220" textAnchor="end">{number(length,lang)} mm</text>
      <text x="40" y="25">± {number(magnitude,lang,3)}</text>
    </svg>
    <details><summary>{translate(lang,'statics.results')}</summary><table className="table"><thead><tr><th>x [mm]</th><th>{title}</th></tr></thead>
      <tbody>{points.map((p,i) => <tr key={i}><td>{number(p.x,lang)}</td><td>{number(p.value,lang,4)}</td></tr>)}</tbody></table></details>
  </figure>;
}

/** Pure presentational report, also used by server-rendered regression tests. */
export function StaticsReportContent({report,system,site,lang,combinationId,quantity,projectName}:{
  report:StaticsReport;system:StaticSystem;site:SiteInfo;lang:Lang;combinationId:string;quantity:Quantity;projectName:string;
}) {
  const t=(key:string,args?:Record<string,string|number>) => translate(lang,key,args);
  const selected=report.results.find((r) => r.combination===combinationId) ?? report.results[0];
  return <div className="statics-report">
    <h2>{t('statics.title')} — {projectName}</h2><h3>{system.name}</h3>
    <p className="statics-notice">{t('statics.scope')}</p>
    <p>{t('statics.serviceClass')}: {system.serviceClass} · {site.altitude} m · S {site.snowZone} · W {site.windZone}</p>
    <p className={report.maxUtilization>1?'statics-fail':'statics-result'}><strong>{t('statics.max')}: {number(report.maxUtilization*100,lang,1)} %</strong><br />
      {t(report.maxUtilization>1?'statics.exceeded':'statics.within')}</p>
    <p className="muted">{t('statics.notApproval')}</p>
    <SystemDiagram system={system} lang={lang} />
    <p className="muted">{t('statics.warn.grossSection')}</p>
    <section><details><summary>{t('statics.warnings')} ({report.warnings.length})</summary><ul>{report.warnings.map((warning,i) => <li key={i}>{t(warning.key,warning.args)}</li>)}</ul>
      <ul>{report.assumptions.map((_,i) => <li key={i}>{t(`statics.assumption.${i}`)}</li>)}</ul></details></section>
    <section><h3>{t('statics.members')}</h3>{report.members.map((member) => {
      const source=system.members.find((m) => m.id===member.id)!;
      return <article key={member.id}><h4>{source.name} · {source.strengthClass} · {source.b} × {source.h} mm</h4>
        <p>{t('statics.length')}: {number(member.length,lang)} mm · {t('statics.span')}: {number(member.designLength,lang)} mm</p>
        <div className="statics-table-wrap"><table className="table"><thead><tr><th>{t('statics.check')}</th><th>{t('statics.utilization')}</th><th>{t('statics.reference')}</th><th>{t('statics.values')}</th></tr></thead>
          <tbody>{member.checks.map((check) => <tr key={check.key} className={check.eta>1?'statics-fail':''}>
            <td>{t(`statics.check.${check.key}`)}</td><td>{number(check.eta*100,lang,1)} %</td><td>{check.reference}</td><td>
              <details><summary>{check.combination} · x = {number(check.x ?? 0,lang)} mm</summary>
                <dl>{Object.entries(check.values).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{number(value,lang,5)}</dd></div>)}</dl>
              </details></td></tr>)}</tbody></table></div>
        {selected && <ResultPlot lang={lang} title={`${source.name}: ${t(`statics.quantity.${quantity}`)} · ${selected.combination}`}
          points={selected.result.members.find((m) => m.id===member.id)!.stations.map((p) => ({x:p.x,value:p[quantity]/divisor[quantity]}))} />}
        <details><summary>{t('statics.envelope')}</summary><table className="table"><thead><tr><th>x [mm]</th><th>min {quantity}</th><th>max {quantity}</th><th>{t('statics.combination')}</th></tr></thead>
          <tbody>{member.envelope.map((p,i) => <tr key={i}><td>{number(p.x,lang)}</td><td>{number(p[quantity].min/divisor[quantity],lang,4)}</td><td>{number(p[quantity].max/divisor[quantity],lang,4)}</td><td>{p[quantity].minCombination} / {p[quantity].maxCombination}</td></tr>)}</tbody></table></details>
      </article>;
    })}</section>
    <p className="muted small">{t('statics.chartHint')}</p>
    {selected && <section><h3>{t('statics.reactions')} — {selected.combination}</h3><table className="table"><thead><tr><th>{t('statics.node')}</th><th>Fx [kN]</th><th>Fz [kN]</th><th>My [kNm]</th></tr></thead>
      <tbody>{selected.result.reactions.map((r) => <tr key={r.node}><td>{r.node}</td><td>{number(r.fx/1000,lang,3)}</td><td>{number(r.fz/1000,lang,3)}</td><td>{number(r.my/1e6,lang,3)}</td></tr>)}</tbody></table></section>}
    <details><summary>{t('statics.combinations')}</summary><table className="table"><thead><tr><th>ID</th><th>{t('statics.combination')}</th><th>{t('statics.duration')}</th>{system.cases.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
      <tbody>{report.combinations.map((c) => <tr key={c.id}><td>{c.id}</td><td>{t(`statics.kind.${c.kind}`)}</td><td>{t(`statics.duration.${c.duration}`)}</td>{system.cases.map((load) => <td key={load.id}>{number(c.factors[load.id] ?? 0,lang,3)}</td>)}</tr>)}</tbody></table></details>
  </div>;
}

export function StaticsView() {
  const t=useT(), ev=useEvaluated(), doc=useApp((s) => s.doc), lang=useApp((s) => s.lang);
  const [systemId,setSystemId]=useState(''), [combinationId,setCombinationId]=useState(''), [quantity,setQuantity]=useState<Quantity>('M');
  const [heightKnown,setHeightKnown]=useState(false), [height,setHeight]=useState(10);
  const [service,setService]=useState<ServiceClass | undefined>(undefined);
  const reportElement=useRef<HTMLDivElement>(null);
  const source=ev.statics.find((s) => s.id===systemId) ?? ev.statics[0];
  const system=useMemo(() => source ? {...source,serviceClass:service ?? source.serviceClass}:undefined,[source,service]);
  const analysis=useMemo(() => {
    if (!system) return {};
    try { return {report:analyzeSystem(system,doc.project.site,heightKnown?{buildingHeight:height}:{})}; }
    catch(error) { return {error}; }
  },[system,doc.project.site,heightKnown,height]);
  const report=analysis.report;
  const exportReport=() => {
    if (!report || !system) return;
    download(`${safeName(doc.project.name)}_${safeName(system.name)}_statics.json`,JSON.stringify({
      project:doc.project,system,options:heightKnown?{buildingHeight:height}:{},report,
    },null,2),'application/json');
  };
  const print=() => {
    if (!report || !reportElement.current) return;
    const w=window.open('','_blank');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title></title><style>body{font:12px sans-serif;margin:20mm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px;text-align:left}svg{width:100%;max-height:280px}section,article{break-inside:avoid}details{margin:10px 0}.statics-fail{color:#a00}dl>div{display:flex;gap:12px}dt{min-width:120px}</style></head><body></body></html>');
    w.document.close(); w.document.title=doc.project.name;
    w.document.documentElement.lang=lang;
    const copy=w.document.importNode(reportElement.current,true);
    copy.querySelectorAll('details').forEach((el) => { el.open=true; });
    w.document.body.appendChild(copy); w.focus(); w.print();
  };
  const error=analysis.error;
  return <div className="view-scroll statics-view"><div className="view-head"><h2>{t('statics.title')}</h2>
    <button className="btn subtle" onClick={() => setState({workspace:'project'})}>{t('statics.site')}</button>
    <span className="grow" /><button className="btn" disabled={!report} onClick={exportReport}>{t('statics.export')}</button>
    <button className="btn subtle" disabled={!report} onClick={print}>{t('statics.print')}</button></div>
    {!source ? <p>{t('statics.empty')}</p> : <>
      <div className="statics-controls"><label>{t('statics.system')} <select value={source.id} onChange={(e) => {setSystemId(e.target.value);setService(undefined);}}>{ev.statics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>{t('statics.serviceOverride')} <select value={service ?? source.serviceClass} onChange={(e) => setService(Number(e.target.value) as ServiceClass)}>{[1,2,3].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
        <label><input type="checkbox" checked={heightKnown} onChange={(e) => setHeightKnown(e.target.checked)} /> {t('statics.heightKnown')}</label>
        {heightKnown && <label>{t('statics.height')} <NumberInput value={height} min={0.1} max={25} unit="m" onCommit={setHeight} /></label>}
        {source.generator && <button className="btn subtle" onClick={() => setState({workspace:'model',selection:[`gen:${source.generator}`]})}>{t('statics.source')}</button>}
      </div>
      {!heightKnown && <p className="muted small">{t('statics.defaultHeight')}</p>}<p className="muted small">{t('statics.session')}</p>
      {error!==undefined && <div className="statics-notice" role="alert"><h3>{t('statics.error')}</h3><p>{t(`statics.error.${error instanceof StaticsError?error.code:'unknown'}`)}</p><details><summary>{t('statics.errorDetail')}</summary><pre>{String(error)}</pre></details></div>}
      {report && system && <><div className="statics-controls"><label>{t('statics.combination')} <select value={report.results.some((r) => r.combination===combinationId)?combinationId:report.results[0]?.combination} onChange={(e) => setCombinationId(e.target.value)}>
        {report.combinations.map((c) => <option key={c.id} value={c.id}>{c.id} · {t(`statics.kind.${c.kind}`)}</option>)}</select></label>
        <label>{t('statics.quantity')} <select value={quantity} onChange={(e) => setQuantity(e.target.value as Quantity)}>{(['N','V','M','v'] as const).map((q) => <option key={q} value={q}>{t(`statics.quantity.${q}`)}</option>)}</select></label>
      </div><div ref={reportElement}><StaticsReportContent report={report} system={system} site={doc.project.site} lang={lang} combinationId={combinationId} quantity={quantity} projectName={doc.project.name} /></div></>}
    </>}
  </div>;
}
