// Characteristic timber properties.
// Solid softwood/hardwood: EN 338:2016. Glued laminated timber: EN 14080:2013.
// Strengths and stiffness in N/mm², densities in kg/m³.

export interface StrengthClass {
  id: string;
  kind: 'solid' | 'glulam';
  fmk: number;
  ft0k: number;
  ft90k: number;
  fc0k: number;
  fc90k: number;
  fvk: number;
  E0mean: number;
  E005: number;
  Gmean: number;
  rhok: number;
  rhomean: number;
}

export const STRENGTH_CLASSES: StrengthClass[] = [
  { id: 'C14', kind: 'solid', fmk: 14, ft0k: 7.2, ft90k: 0.4, fc0k: 16, fc90k: 2.0, fvk: 3.0, E0mean: 7000, E005: 4700, Gmean: 440, rhok: 290, rhomean: 350 },
  { id: 'C16', kind: 'solid', fmk: 16, ft0k: 8.5, ft90k: 0.4, fc0k: 17, fc90k: 2.2, fvk: 3.2, E0mean: 8000, E005: 5400, Gmean: 500, rhok: 310, rhomean: 370 },
  { id: 'C24', kind: 'solid', fmk: 24, ft0k: 14.5, ft90k: 0.4, fc0k: 21, fc90k: 2.5, fvk: 4.0, E0mean: 11000, E005: 7400, Gmean: 690, rhok: 350, rhomean: 420 },
  { id: 'C30', kind: 'solid', fmk: 30, ft0k: 19, ft90k: 0.4, fc0k: 24, fc90k: 2.7, fvk: 4.0, E0mean: 12000, E005: 8000, Gmean: 750, rhok: 380, rhomean: 460 },
  { id: 'D30', kind: 'solid', fmk: 30, ft0k: 18, ft90k: 0.6, fc0k: 24, fc90k: 5.3, fvk: 3.9, E0mean: 11000, E005: 9200, Gmean: 690, rhok: 530, rhomean: 640 },
  { id: 'D40', kind: 'solid', fmk: 40, ft0k: 24, ft90k: 0.6, fc0k: 27, fc90k: 5.8, fvk: 4.2, E0mean: 13000, E005: 10900, Gmean: 810, rhok: 590, rhomean: 700 },
  { id: 'GL24h', kind: 'glulam', fmk: 24, ft0k: 19.2, ft90k: 0.5, fc0k: 24, fc90k: 2.5, fvk: 3.5, E0mean: 11500, E005: 9600, Gmean: 650, rhok: 385, rhomean: 420 },
  { id: 'GL28h', kind: 'glulam', fmk: 28, ft0k: 22.3, ft90k: 0.5, fc0k: 28, fc90k: 2.5, fvk: 3.5, E0mean: 12600, E005: 10500, Gmean: 650, rhok: 425, rhomean: 460 },
  { id: 'GL30c', kind: 'glulam', fmk: 30, ft0k: 19.5, ft90k: 0.5, fc0k: 24.5, fc90k: 2.5, fvk: 3.5, E0mean: 13000, E005: 10800, Gmean: 650, rhok: 390, rhomean: 430 },
  { id: 'GL32h', kind: 'glulam', fmk: 32, ft0k: 25.6, ft90k: 0.5, fc0k: 32, fc90k: 2.5, fvk: 3.5, E0mean: 14200, E005: 11800, Gmean: 650, rhok: 440, rhomean: 490 },
];

export function strengthClass(id: string): StrengthClass {
  const s = STRENGTH_CLASSES.find((c) => c.id === id);
  if (!s) throw new Error(`Unknown strength class ${id}`);
  return s;
}

/** Load duration classes, EN 1995-1-1 2.3.1.2. */
export type LoadDuration = 'permanent' | 'long' | 'medium' | 'short' | 'instantaneous';

/** Service classes 1–3, EN 1995-1-1 2.3.1.3. */
export type ServiceClass = 1 | 2 | 3;

/** kmod for solid timber, glulam, LVL and plywood (EN 1995-1-1 Table 3.1). */
export function kmod(duration: LoadDuration, sc: ServiceClass): number {
  const t: Record<LoadDuration, [number, number, number]> = {
    permanent: [0.6, 0.6, 0.5],
    long: [0.7, 0.7, 0.55],
    medium: [0.8, 0.8, 0.65],
    short: [0.9, 0.9, 0.7],
    instantaneous: [1.1, 1.1, 0.9],
  };
  return t[duration][sc - 1];
}

/** kdef for solid timber and glulam (EN 1995-1-1 Table 3.2). */
export function kdef(sc: ServiceClass): number {
  return [0.6, 0.8, 2.0][sc - 1];
}

/** Partial factor for timber, German National Annex: 1.3 for all timber products. */
export const GAMMA_M = 1.3;

export const DURATION_ORDER: LoadDuration[] = ['permanent', 'long', 'medium', 'short', 'instantaneous'];
