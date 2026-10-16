import type { Catalog } from '../catalog';
import type { Element, HardwareUse, Joint, Msg, ParamValue } from '../model';
import type { StaticSystem } from '../statics/model';

export type GenParams = Record<string, ParamValue>;

export type GenParamDef =
  | { id: string; group: string; type: 'number'; default: number; min: number; max: number; step: number; unit?: string; visible?: (p: GenParams) => boolean }
  | { id: string; group: string; type: 'select'; default: string; options: string[]; visible?: (p: GenParams) => boolean }
  | { id: string; group: string; type: 'boolean'; default: boolean; visible?: (p: GenParams) => boolean }
  | { id: string; group: string; type: 'material'; default: string; category: 'sheet' | 'timber'; visible?: (p: GenParams) => boolean };

export interface GeneratorOutput {
  elements: Element[];
  joints: Joint[];
  hardware: HardwareUse[];
  warnings: Msg[];
  notes: Msg[];
  /** Assembly dimensions table (e.g. slide heights). */
  mounting: { label: Msg; value: number; unit?: string }[];
  statics: StaticSystem[];
}

export interface GeneratorContext {
  catalog: Catalog;
  /** Prefix for ids, unique per generator instance. */
  id: string;
}

export interface GeneratorDef {
  type: string;
  category: 'furniture' | 'carpentry' | 'outdoor';
  params: GenParamDef[];
  build(p: GenParams, ctx: GeneratorContext): GeneratorOutput;
}

export function emptyOutput(): GeneratorOutput {
  return { elements: [], joints: [], hardware: [], warnings: [], notes: [], mounting: [], statics: [] };
}

export function withDefaults(def: GeneratorDef, p: GenParams): GenParams {
  const out: GenParams = {};
  for (const d of def.params) out[d.id] = p[d.id] ?? d.default;
  return out;
}

export const num = (p: GenParams, id: string) => Number(p[id]);
export const str = (p: GenParams, id: string) => String(p[id]);
export const bool = (p: GenParams, id: string) => Boolean(p[id]);
