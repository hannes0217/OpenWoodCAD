import { useEffect, useMemo, useState } from 'react';
import { overlapIssues, staticChecks, type Issue } from '../../core/checks';
import { uid } from '../../core/math';
import { geom } from '../geomClient';
import { tm, useT } from '../i18n';
import { setState, updateDoc, useApp, useEvaluated } from '../store';
import { viewportFitIds } from '../Viewport';
import { useProduction } from '../views/Lists';

const ICON = { error: '⛔', warning: '⚠', info: 'ℹ' } as const;

function applyFix(i: Issue) {
  const f = i.fix;
  if (!f) return;
  if (f.kind === 'addJoint') {
    updateDoc((d) => d.joints.push({ id: uid('j'), type: f.type, a: f.a, b: f.b, params: {} }));
  } else if (f.kind === 'setDrillDepth') {
    updateDoc((d) => {
      const e = d.elements.find((x) => x.id === f.elementId);
      const p = e?.processings.find((x) => x.id === f.procId);
      if (p && p.geom === 'drill') p.depth = f.depth;
    });
  } else if (f.kind === 'select') {
    setState({ selection: f.ids, workspace: 'model' });
    viewportFitIds(f.ids);
  }
}

export function IssuesPanel() {
  const t = useT();
  const ev = useEvaluated();
  const prod = useProduction();
  const lang = useApp((s) => s.lang);
  const de = lang === 'de';
  const [overlaps, setOverlaps] = useState<Issue[]>([]);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);
  const [geometryRevision,setGeometryRevision]=useState(0);
  const [checkError,setCheckError]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [checkedFor,setCheckedFor]=useState<typeof ev|null>(null);
  const [skipped,setSkipped]=useState(false);
  useEffect(()=>geom.subscribe(()=>setGeometryRevision(n=>n+1)),[]);

  const statics = useMemo(() => staticChecks(ev, prod), [ev, prod]);
  const genWarnings: Issue[] = ev.warnings.map((w, k) => ({ id: `w${k}`, severity: 'warning', msg: w, elementIds: [] }));
  const geometryIssues:Issue[]=ev.elements.filter(e=>geom.failuresFor(e).length).map(e=>({id:`geometry-${e.id}`,severity:'error',elementIds:[e.id],msg:{key:'safe.processingFailure',args:{pos:e.pos,details:geom.failuresFor(e).join(', ')}}}));
  if(geom.error)geometryIssues.push({id:'worker-failed',severity:'error',elementIds:[],msg:{key:'safe.workerIssue',args:{details:geom.error}}});
  if(checkError && !geom.error)geometryIssues.push({id:'collision-failed',severity:'error',elementIds:[],msg:{key:'safe.checkFailed',args:{details:checkError}}});
  const issues = [...statics, ...overlaps, ...genWarnings,...geometryIssues];

  // Automatic overlap check for small and medium models (debounced).
  useEffect(() => {
    setOverlaps([]);setCheckError(null);setChecked(false);setChecking(false);setSkipped(false);
    if(ev.elements.length===0){setChecked(true);setCheckedFor(ev);return;}
    if(!geom.ready || geom.error)return;
    if (ev.elements.length > 250) {setSkipped(true);return;}
    let cancelled = false;
    const h = setTimeout(async () => {
      setChecking(true);
      try {
        const pairs = await geom.overlaps(ev.elements.filter((e) => !e.hidden));
        if (!cancelled) {setOverlaps(overlapIssues(ev, pairs));setChecked(true);setCheckedFor(ev);}
      }catch(error){if(!cancelled)setCheckError(String(error));
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 900);
    return () => { cancelled = true; clearTimeout(h); };
  }, [ev,geometryRevision]);

  useEffect(() => {
    setState({ issueIds: [...new Set(issues.filter((i) => i.severity !== 'info').flatMap((i) => i.elementIds))] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statics, overlaps,geometryRevision,checkError]);

  const fixLabel = (i: Issue) => {
    const f = i.fix;
    if (!f) return null;
    if (f.kind === 'addJoint') return f.type === 'lap' ? (de ? 'Überblattung anlegen' : 'Add lap joint') : (de ? 'Einlassung anlegen' : 'Add housing');
    if (f.kind === 'setDrillDepth') return de ? `Tiefe auf ${f.depth} mm` : `Depth to ${f.depth} mm`;
    return null;
  };
  const errors = issues.filter((i) => i.severity === 'error').length;
  const verified=checked && checkedFor===ev;
  const label = issues.length === 0
    ? (skipped?t('safe.checkSkipped'):checking || !verified?t('safe.checkPending'):(de ? '✓ Konstruktion ohne Befund' : '✓ No issues found'))
    : `${errors ? '⛔' : '⚠'} ${issues.length} ${de ? 'Hinweise' : 'issues'}`;

  return (
    <div className={`issues ${issues.length ? (errors ? 'has-errors' : 'has-warnings') : !verified || skipped?'has-warnings':'ok'}`}>
      <button className="issues-btn" onClick={() => setOpen(!open)}>{label}</button>
      {open && issues.length > 0 && (
        <div className="issues-pop">
          <div className="issues-head">
            <strong>{de ? 'Konstruktionsprüfung' : 'Design check'}</strong>
            <button className="icon-btn" onClick={() => setOpen(false)}>✕</button>
          </div>
          <ul>
            {issues.map((i) => (
              <li key={i.id} className={`sev-${i.severity}`}>
                <span className="sev">{ICON[i.severity]}</span>
                <span className="msg">{tm(i.msg)}</span>
                <span className="acts">
                  {i.elementIds.length > 0 && <button className="link" onClick={() => { setState({ selection: i.elementIds, workspace: 'model' }); viewportFitIds(i.elementIds); }}>{t('check.show')}</button>}
                  {fixLabel(i) && <button className="btn small" onClick={() => applyFix(i)}>{fixLabel(i)}</button>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
