import { NumberInput, Row, Section, TextInput } from '../components/Field';
import { useT } from '../i18n';
import { updateDoc, useApp } from '../store';

export function ProjectView() {
  const t = useT();
  const doc = useApp((s) => s.doc);
  const lang = useApp((s) => s.lang);
  const de = lang === 'de';
  const p = doc.project;
  const setP = (k: 'name' | 'customer' | 'address' | 'author' | 'notes', v: string) => updateDoc((d) => { d.project[k] = v; });
  return (
    <div className="view-scroll narrow">
      <div className="view-head"><h2>{t('ws.project')}</h2></div>
      <Section title={de ? 'Projektdaten' : 'Project data'}>
        <Row label={de ? 'Projektname' : 'Project name'}><TextInput value={p.name} onCommit={(v) => setP('name', v)} /></Row>
        <Row label={de ? 'Kunde / Bauherr' : 'Client'}><TextInput value={p.customer ?? ''} onCommit={(v) => setP('customer', v)} /></Row>
        <Row label={de ? 'Adresse / Baustelle' : 'Address / site'}><TextInput value={p.address ?? ''} onCommit={(v) => setP('address', v)} /></Row>
        <Row label={de ? 'Bearbeiter' : 'Author'}><TextInput value={p.author ?? ''} onCommit={(v) => setP('author', v)} /></Row>
        <Row label={de ? 'Notizen' : 'Notes'}><TextInput value={p.notes ?? ''} onCommit={(v) => setP('notes', v)} /></Row>
      </Section>
      <Section title={de ? 'Standort (Schnee- und Windlast)' : 'Site (snow and wind)'}>
        <Row label={de ? 'Höhe über NN' : 'Altitude'}><NumberInput value={p.site.altitude} min={0} max={1500} step={10} unit="m" onCommit={(v) => updateDoc((d) => { d.project.site.altitude = v; })} /></Row>
        <Row label={de ? 'Schneelastzone' : 'Snow zone'}>
          <select value={p.site.snowZone} onChange={(e) => updateDoc((d) => { d.project.site.snowZone = e.target.value; })}>
            {['1', '1a', '2', '2a', '3'].map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </Row>
        <Row label={de ? 'Windzone' : 'Wind zone'}>
          <select value={p.site.windZone} onChange={(e) => updateDoc((d) => { d.project.site.windZone = Number(e.target.value); })}>
            {[1, 2, 3, 4].map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </Row>
        <Row label={de ? 'Lage' : 'Terrain'}>
          <select value={p.site.terrain} onChange={(e) => updateDoc((d) => { d.project.site.terrain = e.target.value as 'inland'; })}>
            <option value="inland">{de ? 'Binnenland' : 'Inland'}</option><option value="coast">{t('statics.terrain.coast')}</option><option value="islands">{t('statics.terrain.islands')}</option>
          </select>
        </Row>
        <p className="muted small">{de ? 'Zonen nach DIN EN 1991-1-3/NA und 1991-1-4/NA. Die Zonenkarte für deinen Standort findest du z. B. beim DIBt oder über einen Schneelastzonen-Rechner.' : 'Zones per DIN EN 1991-1-3/NA and 1991-1-4/NA (Germany).'}</p>
      </Section>
    </div>
  );
}
