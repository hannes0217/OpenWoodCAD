import { fmt,useT } from '../i18n';
import { useApp } from '../store';
export function DirectMoveHint(){
 const t=useT(),move=useApp(s=>s.directMove);if(!move)return null;
 return <div className="direct-move-hint" role="status"><strong>{t('drag.active')} · {move.axis?.toUpperCase()??t('drag.plane')}</strong><span>{move.delta.map((value,i)=>`${['X','Y','Z'][i]} ${fmt(value,1)}`).join(' · ')} mm</span><small>{t(move.blocked?'drag.axisBlocked':'drag.help')}</small></div>;
}
