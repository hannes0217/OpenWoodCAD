import { useT } from '../i18n';
import { setState, useApp } from '../store';
import { tools } from '../tools';
import type { PlaneChoice } from '../precision';
import { NumberInput } from './Field';

export function PrecisionControls() {
  const t = useT(), plane = useApp(s => s.workPlane), offset = useApp(s => s.workZ), tool = useApp(s => s.tool), draft = useApp(s => s.toolDraft);
  return <div className="precision-controls">
    <label title={t('precision.planeHint')}>{t('precision.plane')} <select value={plane} onChange={e => setState({ workPlane: e.target.value as PlaneChoice })}>
      <option value="auto">{t('precision.auto')}</option><option value="xy">XY</option><option value="xz">XZ</option><option value="yz">YZ</option>
    </select></label>
    <label>{t('precision.offset')} <NumberInput value={offset} min={-1000000} max={1000000} unit="mm" width={100} onCommit={v => setState({ workZ: v })}/></label>
    {tool !== 'select' && <>
      <label className="precision-expression">{t('precision.input')} <input aria-invalid={draft.error} value={draft.input} placeholder={tool === 'rect' || tool === 'cutRect' ? '600x400' : '800@45°'} title={t('precision.example')} onChange={e => tools.setInput(e.target.value)} onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); tools.applyInput(); }
        if (e.key === 'Escape') { e.preventDefault(); tools.reset(); setState({ tool: 'select' }); }
      }}/></label>
      <button disabled={!draft.points || tool === 'measure'} onClick={() => tools.applyInput()}>{t(!draft.input && tool === 'poly' ? 'precision.finish' : 'precision.apply')}</button>
      <button onClick={() => { tools.reset(); setState({ tool: 'select' }); }}>{t('precision.cancel')}</button>
      <span className="muted">{draft.snap && `${t('precision.snap')}: ${t(`precision.snap.${draft.snap}`)}`}</span>
      {draft.error && <span className="warn" role="alert">{t(draft.points ? 'precision.invalid' : 'precision.start')}</span>}
    </>}
  </div>;
}
