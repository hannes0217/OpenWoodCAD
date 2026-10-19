import { useT } from '../i18n';
import { setState, useApp } from '../store';
import { viewportAlignPlane } from '../Viewport';
import { drawingPlane } from '../workplanes';
import { tools } from '../tools';
import type { PlaneChoice } from '../precision';
import { NumberInput } from './Field';

export function PrecisionControls() {
  const t = useT(),state=useApp(s=>s),plane = state.workPlane, offset = state.workZ, tool = state.tool, draft = state.toolDraft;
  const cutting=tool==='cutRect'||tool==='cutCircle',measuring=tool==='measure';
  return <div className="precision-controls">
    {!cutting&&!measuring&&<>
      <strong title={t('plane.help')}>{t('plane.fixed')}</strong>
      <label title={t('precision.planeHint')}><select aria-label={t('precision.plane')} value={plane} onChange={e => setState({ workPlane: e.target.value as PlaneChoice,drawingPlane:null,planePick:false })}>
        {state.drawingPlane&&<option value="auto">{t('plane.face')}</option>}
        <option value="xy">{t('plane.xy')}</option><option value="xz">{t('plane.xz')}</option><option value="yz">{t('plane.yz')}</option>
      </select></label>
      <button aria-pressed={state.planePick} title={t('plane.contour')} onClick={()=>setState(state.planePick?{planePick:false,workPlane:'xy',drawingPlane:null}:{planePick:true,drawingPlane:null})}>{t(state.planePick?'plane.pickCancel':'plane.pick')}</button>
      <label>{t('plane.offset')} <NumberInput disabled={state.planePick} value={offset} min={-1000000} max={1000000} unit="mm" width={100} onCommit={v => setState({ workZ: v })}/></label>
      <button aria-label={t('plane.normal')} title={t('plane.normal')} disabled={state.planePick||!drawingPlane(state)} onClick={viewportAlignPlane}>⊥</button>
      <span className="plane-status" role="status">{t(state.planePick?'plane.pickHint':draft.blocked&&!draft.input?'plane.parallel':'plane.ready')}</span>
    </>}
    {tool !== 'select' && <>
      <label className="precision-expression">{t('precision.input')} <input aria-invalid={draft.error} value={draft.input} placeholder={tool === 'rect' || tool === 'cutRect' ? '600x400' : '800@45°'} title={t('precision.example')} onChange={e => tools.setInput(e.target.value)} onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); tools.applyInput(); }
        if (e.key === 'Escape') { e.preventDefault(); tools.reset(); setState({ tool: 'select' }); }
      }}/></label>
      <button disabled={!draft.points || tool === 'measure'||state.planePick} onClick={() => tools.applyInput()}>{t(!draft.input && tool === 'poly' ? 'precision.finish' : 'precision.apply')}</button>
      <button onClick={() => { tools.reset(); setState({ tool: 'select' }); }}>{t('precision.cancel')}</button>
      <span className="muted">{draft.snap && `${t('precision.snap')}: ${t(`precision.snap.${draft.snap}`)}`}</span>
      {draft.error && <span className="warn" role="alert">{t(draft.points ? 'precision.invalid' : 'precision.start')}</span>}
    </>}
  </div>;
}
