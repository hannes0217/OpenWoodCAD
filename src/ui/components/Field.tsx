import { useEffect, useState, type ReactNode } from 'react';
import { materialName, type Catalog } from '../../core/catalog';
import { parseMeasure } from '../precision';
import { getState } from '../store';

/** Number input that commits on blur / Enter (one undo step per edit). */
export function NumberInput({ value, onCommit, min, max, step = 1, unit, disabled, width }: { value: number; onCommit: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; disabled?: boolean; width?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(Math.round(value * 1000) / 1000)), [value]);
  const commit = () => {
    let v: number;
    try { v = parseMeasure(text, unit === '°' ? 'angle' : 'length'); } catch { setText(String(value)); return; }
    if (!Number.isFinite(v)) return setText(String(value));
    const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
    if (c !== value) onCommit(c);
    setText(String(c));
  };
  return (
    <span className="num-input" style={width ? { width } : undefined}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const v = Number(text.replace(',', '.')) || 0;
            const n = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1)));
            setText(String(n));
            onCommit(n);
          }
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function TextInput({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      type="text"
      className="text-input"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function MaterialSelect({ value, onChange, catalog, category }: { value: string; onChange: (v: string) => void; catalog: Catalog; category?: 'sheet' | 'timber' }) {
  const lang = getState().lang;
  const list = catalog.materials.filter((m) => !category || m.category === category);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((m) => (
        <option key={m.id} value={m.id}>
          {materialName(m, lang)}
        </option>
      ))}
      {!list.some((m) => m.id === value) && <option value={value}>{value}</option>}
    </select>
  );
}

export function Row({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <label className="row" title={hint}>
      <span className="row-label">{label}</span>
      <span className="row-control">{children}</span>
    </label>
  );
}

export function Section({ title, children, open = true }: { title: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
