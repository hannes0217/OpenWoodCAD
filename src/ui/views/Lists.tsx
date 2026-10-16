import { useMemo } from 'react';
import { findHardware, findMaterial, materialName } from '../../core/catalog';
import { totals } from '../../core/lists';
import { production } from '../../core/production';
import type { SheetLayout } from '../../core/nesting';
import { download, safeName } from '../actions';
import { NumberInput } from '../components/Field';
import { fmt, has, money, t as tt, useT } from '../i18n';
import { setState, updateDoc, useApp, useEvaluated } from '../store';

export function useProduction() {
  const ev = useEvaluated();
  const settings = useApp((s) => s.doc.settings);
  return useMemo(() => production(ev, settings), [ev, settings]);
}

const edgeLabel = (edges: string[]) => edges.map((e) => ({ x0: '◁', x1: '▷', y0: '▽', y1: '△' }[e] ?? e)).join(' ');

export function ListsView() {
  const t = useT();
  const ev = useEvaluated();
  const lang = useApp((s) => s.lang);
  const doc = useApp((s) => s.doc);
  const p = useProduction();
  const tot = totals(p.rows);
  const matName = (id: string) => { try { return materialName(findMaterial(ev.catalog, id), lang); } catch { return id; } };
  const beams = p.rows.filter((r) => r.kind === 'beam');
  const panels = p.rows.filter((r) => r.kind === 'panel');
  const exportCsv = () => {
    const head = [tt('common.pos'), tt('common.name'), tt('common.material'), tt('common.length'), tt('common.width'), tt('common.thickness'), tt('common.qty'), 'm³', tt('safe.rawWeight')+' kg', tt('props.edges'), tt('props.processings')];
    const lines = p.rows.map((r) => [r.pos, r.names.join(' / '), matName(r.materialId), r.length.toFixed(1), r.width.toFixed(1), r.height.toFixed(1), r.qty, (r.volume * r.qty).toFixed(4), (r.weight * r.qty).toFixed(1), r.edges.join(' '), Object.entries(r.processings).map(([k, n]) => `${n}x ${tt(`proc.${k}`)}`).join(', ')]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    download(`${safeName(doc.project.name)}_stueckliste.csv`, '﻿' + csv, 'text/csv');
  };
  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>{t('ws.lists')}</h2>
        <div className="kpis">
          <span>{t('status.parts', { n: tot.parts })}</span><span>{t('status.positions', { n: tot.positions })}</span>
          {tot.volumeTimber > 0 && <span>{fmt(tot.volumeTimber, 3)} m³ Holz</span>}
          {tot.areaPanels > 0 && <span>{fmt(tot.areaPanels, 2)} m² Platten</span>}
          <span>{t('safe.rawWeightTotal', { kg: fmt(tot.weight, 0) })}</span>
        </div>
        <button className="btn" onClick={exportCsv}>CSV</button>
      </div>
      {beams.length > 0 && (
        <>
          <h3>{lang === 'de' ? 'Holzliste (Stabbauteile)' : 'Timber list (linear members)'}</h3>
          <table className="table">
            <thead><tr><th>{t('common.pos')}</th><th>{t('common.name')}</th><th>{t('common.qty')}</th><th>{t('common.section')}</th><th className="r">{t('common.length')}</th><th className="r">m³</th><th>{t('common.material')}</th><th>{t('props.processings')}</th></tr></thead>
            <tbody>
              {beams.map((r) => (
                <tr key={r.pos} onClick={() => setState({ selection: r.elementIds, workspace: 'model' })}>
                  <td><span className="pos-badge">{r.pos}</span></td><td>{r.names.join(' / ')}</td><td className="r">{r.qty}</td><td>{fmt(r.width)} × {fmt(r.height)}</td><td className="r">{fmt(r.length)}</td><td className="r">{fmt(r.volume * r.qty, 3)}</td><td>{matName(r.materialId)}</td>
                  <td className="small">{Object.entries(r.processings).map(([k, n]) => `${n}× ${has(`proc.${k}`) ? t(`proc.${k}`) : k}`).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {panels.length > 0 && (
        <>
          <h3>{lang === 'de' ? 'Zuschnittliste (Platten)' : 'Cut list (panels)'}</h3>
          <table className="table">
            <thead><tr><th>{t('common.pos')}</th><th>{t('common.name')}</th><th>{t('common.qty')}</th><th className="r">{t('common.length')}</th><th className="r">{t('common.width')}</th><th className="r">{t('common.thickness')}</th><th>{t('props.edges')}</th><th>{t('common.material')}</th><th>{t('props.processings')}</th></tr></thead>
            <tbody>
              {panels.map((r) => (
                <tr key={r.pos} onClick={() => setState({ selection: r.elementIds, workspace: 'model' })}>
                  <td><span className="pos-badge">{r.pos}</span></td><td>{r.names.join(' / ')}</td><td className="r">{r.qty}</td><td className="r">{fmt(r.length, 1)}</td><td className="r">{fmt(r.width, 1)}</td><td className="r">{fmt(r.height, 1)}</td><td>{edgeLabel(r.edges)}</td><td>{matName(r.materialId)}</td>
                  <td className="small">{Object.entries(r.processings).map(([k, n]) => `${n}× ${has(`proc.${k}`) ? t(`proc.${k}`) : k}`).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">{lang === 'de' ? 'Länge = Faserrichtung. Kanten: ◁▷ Stirnkanten, ▽△ Längskanten.' : 'Length = grain direction. Edges: ◁▷ end edges, ▽△ long edges.'}</p>
        </>
      )}
      {p.hardware.length > 0 && (
        <>
          <h3>{lang === 'de' ? 'Beschläge & Verbindungsmittel' : 'Hardware & fasteners'}</h3>
          <table className="table">
            <thead><tr><th>{t('common.name')}</th><th className="r">{t('common.qty')}</th></tr></thead>
            <tbody>{p.hardware.map((h) => <tr key={h.itemId}><td>{materialName(findHardware(ev.catalog, h.itemId), lang)}</td><td className="r">{h.qty}</td></tr>)}</tbody>
          </table>
        </>
      )}
      {ev.mounting.length > 0 && (
        <>
          <h3>{lang === 'de' ? 'Montagemaße' : 'Assembly dimensions'}</h3>
          <table className="table"><tbody>{ev.mounting.map((m, i) => <tr key={i}><td>{t(m.label.key, m.label.args)}</td><td className="r">{fmt(m.value, 1)} {m.unit ?? 'mm'}</td></tr>)}</tbody></table>
        </>
      )}
    </div>
  );
}

export function SheetSvg({ layout, scale = 0.25 }: { layout: SheetLayout; scale?: number }) {
  const W = layout.length * scale;
  const H = layout.width * scale;
  return (
    <svg className="sheet-svg" viewBox={`0 0 ${layout.length} ${layout.width}`} width={W} height={H}>
      <rect x={0} y={0} width={layout.length} height={layout.width} className="sheet-bg" />
      {layout.placements.map((p, i) => (
        <g key={i}>
          <rect x={p.x} y={layout.width - p.y - p.dy} width={p.dx} height={p.dy} className="sheet-piece" />
          <text x={p.x + p.dx / 2} y={layout.width - p.y - p.dy / 2} className="sheet-label" fontSize={Math.min(90, p.dy * 0.45, p.dx * 0.25)}>{p.piece.label}</text>
          {p.dx > 260 && p.dy > 120 && <text x={p.x + p.dx / 2} y={layout.width - p.y - p.dy / 2 + Math.min(70, p.dy * 0.3)} className="sheet-dim" fontSize={Math.min(45, p.dy * 0.18)}>{Math.round(p.rotated ? p.dy : p.dx)} × {Math.round(p.rotated ? p.dx : p.dy)}</text>}
        </g>
      ))}
    </svg>
  );
}

export function NestingView() {
  const t = useT();
  const ev = useEvaluated();
  const lang = useApp((s) => s.lang);
  const settings = useApp((s) => s.doc.settings);
  const p = useProduction();
  const matName = (id: string) => { try { return materialName(findMaterial(ev.catalog, id), lang); } catch { return id; } };
  const setSetting = (k: 'kerf' | 'sheetTrim' | 'timberAllowance', v: number) => updateDoc((d) => { d.settings[k] = v; });
  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>{t('ws.nesting')}</h2>
        <label className="inline">{lang === 'de' ? 'Schnittfuge' : 'Kerf'} <NumberInput value={settings.kerf} min={0} max={10} step={0.5} unit="mm" onCommit={(v) => setSetting('kerf', v)} /></label>
        <label className="inline">{lang === 'de' ? 'Besäumen' : 'Trim'} <NumberInput value={settings.sheetTrim} min={0} max={50} unit="mm" onCommit={(v) => setSetting('sheetTrim', v)} /></label>
        <label className="inline">{lang === 'de' ? 'Längenzugabe Holz' : 'Timber allowance'} <NumberInput value={settings.timberAllowance} min={0} max={200} unit="mm" onCommit={(v) => setSetting('timberAllowance', v)} /></label>
      </div>
      {p.sheets.map((s) => (
        <section key={s.materialId} className="nest-block">
          <h3>{matName(s.materialId)} – {s.result.sheets.length} {lang === 'de' ? 'Platte(n)' : 'sheet(s)'}</h3>
          {s.result.oversize.length > 0 && <p className="warn">{lang === 'de' ? 'Zu groß für das Plattenformat' : 'Too large for the sheet'}: Pos. {s.result.oversize.map((o) => o.label).join(', ')}</p>}
          <div className="sheets">
            {s.result.sheets.map((l, i) => (
              <figure key={i}>
                <SheetSvg layout={l} />
                <figcaption>{lang === 'de' ? 'Platte' : 'Sheet'} {i + 1} · {fmt(l.usage * 100, 0)} % {lang === 'de' ? 'genutzt' : 'used'}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      {p.linear.map((l) => (
        <section key={`${l.materialId}${l.section}`} className="nest-block">
          <h3>{matName(l.materialId)} {l.section[0]} × {l.section[1]} mm – {l.result.bars.length} {lang === 'de' ? 'Stück' : 'pieces'}</h3>
          {l.result.oversize.length > 0 && <p className="warn">{t('safe.specialStock')}: Pos. {l.result.oversize.map((o) => `${o.label} (${o.length} mm)`).join(', ')}</p>}
          <div className="bars">
            {l.result.bars.map((b, i) => (
              <div key={i} className="bar">
                <span className="bar-len">{b.stock}</span>
                <div className="bar-track">
                  {b.pieces.map((pc, k) => <span key={k} className="bar-piece" style={{ width: `${(pc.length / b.stock) * 100}%` }} title={`${pc.length} mm`}>{pc.label}</span>)}
                </div>
                <span className="muted small">{lang === 'de' ? 'Rest' : 'Rest'} {Math.round(b.waste)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      {p.sheets.length === 0 && p.linear.length === 0 && <p className="muted">{t('tree.empty')}</p>}
    </div>
  );
}

export function ShoppingView() {
  const t = useT();
  const ev = useEvaluated();
  const lang = useApp((s) => s.lang);
  const doc = useApp((s) => s.doc);
  const p = useProduction();
  const name = (kind: string, id: string) => {
    try { return materialName(kind === 'sheet' || kind === 'timber' ? findMaterial(ev.catalog, id) : findHardware(ev.catalog, id), lang); } catch { return id; }
  };
  const unitLabel: Record<string, string> = lang === 'de' ? { sheet: 'Platte', piece: 'Stk.', roll: 'Rolle', pack: 'Pack.' } : { sheet: 'sheet', piece: 'pc', roll: 'roll', pack: 'pack' };
  const setPrice = (id: string, v: number) => updateDoc((d) => { d.prices[id] = v; });
  const priceOf = (kind: string, id: string): number => {
    try {
      if (kind === 'sheet') return findMaterial(ev.catalog, id).pricePerSheet ?? 0;
      if (kind === 'timber') return findMaterial(ev.catalog, id).pricePerM3 ?? 0;
      return findHardware(ev.catalog, id).price;
    } catch { return 0; }
  };
  const c = p.cost;
  const setS = (k: 'labourRate' | 'overhead' | 'profit' | 'vat', v: number) => updateDoc((d) => { d.settings[k] = v; });
  return (
    <div className="view-scroll">
      <div className="view-head"><h2>{t('ws.shopping')}</h2></div>
      {!c.complete && <div className="info-box warn" role="alert"><strong>{t('safe.unpriced',{n:p.unavailable.length})}</strong><ul>{p.unavailable.map((item,i)=><li key={i}>Pos. {item.position}: {name('sheet',item.materialId)} · {item.dimensions}</li>)}</ul></div>}
      <h3>{lang === 'de' ? 'Einkaufsliste' : 'Shopping list'}</h3>
      <table className="table">
        <thead><tr><th>{t('common.name')}</th><th>{lang === 'de' ? 'Details' : 'Details'}</th><th className="r">{t('common.qty')}</th><th className="r">{t('common.unitPrice')}</th><th className="r">{t('common.total')}</th><th className="r">{lang === 'de' ? 'Preisbasis' : 'Price basis'}</th></tr></thead>
        <tbody>
          {p.shopping.map((s, i) => (
            <tr key={i}>
              <td>{name(s.kind, s.itemId)}</td><td className="small muted">{s.detail}</td><td className="r">{s.qty} {unitLabel[s.unit]}</td><td className="r">{money(s.unitPrice)}</td><td className="r">{money(s.total)}</td>
              <td className="r"><NumberInput value={priceOf(s.kind, s.itemId)} min={0} step={0.5} unit={s.kind === 'timber' ? '€/m³' : '€'} width={110} onCommit={(v) => setPrice(s.itemId, v)} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4}><strong>{t('common.total')}</strong></td><td className="r"><strong>{money(p.shopping.reduce((a, s) => a + s.total, 0))}</strong></td><td /></tr></tfoot>
      </table>
      <p className="muted small">{lang === 'de' ? 'Beispielpreise – in der Spalte „Preisbasis“ an deinen Händler anpassen. Platten werden ganz gekauft (Zuschnittplan), Holz in Handelslängen.' : 'Example prices – adjust in the “price basis” column. Sheets are bought whole (cutting plan), timber in stock lengths.'}</p>

      <h3>{lang === 'de' ? 'Kalkulation' : 'Costing'}</h3>
      <div className="calc-grid">
        <table className="table">
          <tbody>
            <tr><td>{lang === 'de' ? 'Material' : 'Material'}</td><td className="r">{money(c.material)}</td></tr>
            <tr><td>{lang === 'de' ? 'Beschläge' : 'Hardware'}</td><td className="r">{money(c.hardware)}</td></tr>
            <tr><td>{lang === 'de' ? 'Arbeitszeit' : 'Labour'} ({fmt(c.labourMinutes / 60, 1)} h)</td><td className="r">{money(c.labour)}</td></tr>
            <tr><td>{lang === 'de' ? 'Gemeinkosten' : 'Overhead'}</td><td className="r">{money(c.overhead)}</td></tr>
            <tr><td>{lang === 'de' ? 'Gewinn' : 'Profit'}</td><td className="r">{money(c.profit)}</td></tr>
            <tr className="strong"><td>{lang === 'de' ? 'Netto' : 'Net'}</td><td className="r">{money(c.net)}</td></tr>
            <tr><td>{lang === 'de' ? 'MwSt.' : 'VAT'}</td><td className="r">{money(c.vat)}</td></tr>
            <tr className="strong"><td>{lang === 'de' ? 'Brutto' : 'Gross'}</td><td className="r">{money(c.gross)}</td></tr>
          </tbody>
        </table>
        <div>
          <label className="row"><span className="row-label">{lang === 'de' ? 'Stundensatz' : 'Hourly rate'}</span><NumberInput value={doc.settings.labourRate} min={0} unit="€/h" onCommit={(v) => setS('labourRate', v)} /></label>
          <label className="row"><span className="row-label">{lang === 'de' ? 'Gemeinkosten' : 'Overhead'}</span><NumberInput value={doc.settings.overhead * 100} min={0} max={200} unit="%" onCommit={(v) => setS('overhead', v / 100)} /></label>
          <label className="row"><span className="row-label">{lang === 'de' ? 'Gewinn' : 'Profit'}</span><NumberInput value={doc.settings.profit * 100} min={0} max={200} unit="%" onCommit={(v) => setS('profit', v / 100)} /></label>
          <label className="row"><span className="row-label">{lang === 'de' ? 'MwSt.' : 'VAT'}</span><NumberInput value={doc.settings.vat * 100} min={0} max={50} unit="%" onCommit={(v) => setS('vat', v / 100)} /></label>
          <h4>{lang === 'de' ? 'Arbeitszeit nach Tätigkeit' : 'Labour by activity'}</h4>
          <table className="table small"><tbody>{c.labourItems.slice(0, 12).map((l) => <tr key={l.key}><td>{has(l.key) ? t(l.key) : l.key}</td><td className="r">{l.minutes} min</td></tr>)}</tbody></table>
        </div>
      </div>
    </div>
  );
}
