import { schrank } from './schrank';
import { carport } from './carport';
import { kommode } from './kommode';
import { regal } from './regal';
import { pultdach, satteldach } from './roof';
import type { GeneratorDef } from './types';
import { wand } from './wand';
import { werkbank } from './werkbank';

export const GENERATORS: Record<string, GeneratorDef> = Object.fromEntries([kommode, regal, schrank, werkbank, wand, satteldach, pultdach, carport].map((g) => [g.type, g]));

export const GENERATOR_LIST: GeneratorDef[] = Object.values(GENERATORS);
