import type { Catalog } from '../../core/catalog';
import type { GenParamDef, GenParams } from '../../core/generators/types';
import type { ParamValue } from '../../core/model';
import { has, useT } from '../i18n';
import { MaterialSelect, NumberInput, Row, Section } from './Field';

/** Form for generator parameters, grouped by `group`. */
export function ParamForm({ defs, values, onChange, catalog, prefix = 'param' }: { defs: GenParamDef[]; values: GenParams; onChange: (id: string, v: ParamValue) => void; catalog: Catalog; prefix?: string }) {
  const t = useT();
  const groups = [...new Set(defs.map((d) => d.group))];
  const label = (id: string) => (has(`${prefix}.${id}`) ? t(`${prefix}.${id}`) : has(`param.${id}`) ? t(`param.${id}`) : id);
  return (
    <div className="param-form">
      {groups.map((g) => (
        <Section key={g} title={t(`group.${g}`)}>
          {defs
            .filter((d) => d.group === g && (!d.visible || d.visible(values)))
            .map((d) => {
              const v = values[d.id] ?? d.default;
              switch (d.type) {
                case 'number':
                  return (
                    <Row key={d.id} label={label(d.id)}>
                      <NumberInput value={Number(v)} min={d.min} max={d.max} step={d.step} unit={d.unit} onCommit={(n) => onChange(d.id, n)} />
                    </Row>
                  );
                case 'select':
                  return (
                    <Row key={d.id} label={label(d.id)}>
                      <select value={String(v)} onChange={(e) => onChange(d.id, e.target.value)}>
                        {d.options.map((o) => (
                          <option key={o} value={o}>{has(`opt.${o}`) ? t(`opt.${o}`) : o}</option>
                        ))}
                      </select>
                    </Row>
                  );
                case 'boolean':
                  return (
                    <Row key={d.id} label={label(d.id)}>
                      <input type="checkbox" checked={Boolean(v)} onChange={(e) => onChange(d.id, e.target.checked)} />
                    </Row>
                  );
                case 'material':
                  return (
                    <Row key={d.id} label={label(d.id)}>
                      <MaterialSelect value={String(v)} catalog={catalog} category={d.category} onChange={(m) => onChange(d.id, m)} />
                    </Row>
                  );
              }
            })}
        </Section>
      ))}
    </div>
  );
}
