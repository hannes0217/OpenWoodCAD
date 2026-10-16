import { HANDLE_PATTERNS, HINGE_PATTERNS } from '../../core/fittings';
import { useT } from '../i18n';
import { Section } from './Field';

export function FittingLibrary() {
  const t=useT();
  return <Section title={t('fitting.library')} open={false}>
    {Object.entries(HINGE_PATTERNS).map(([id,p])=><div key={id} className="pad small"><strong>{t(`opt.${id}`)}</strong>
      <p>{t('fitting.cup')}: Ø{p.cupDiameter} × {p.cupDepth} mm · {t('fitting.fixing')}: {p.fixingSpacing}/{p.fixingOffset} mm</p>
      <p>{t('fitting.plate')}: {p.plateSpacing} mm · Ø{p.plateDiameter} × {p.plateDepth} mm</p>
      <a href={p.source} target="_blank" rel="noreferrer">{t('fitting.source')}</a>
    </div>)}
    <div className="pad small">{Object.entries(HANDLE_PATTERNS).map(([id,p])=><p key={id}>{t(`opt.${id}`)} · Ø{p.diameter} mm · {t('fitting.centres')}: {p.spacing} mm</p>)}</div>
    <p className="muted small">{t('note.schrank.fittings')}</p>
  </Section>;
}
