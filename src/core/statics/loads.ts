import type { Msg, SiteInfo } from '../model';
import { DURATION_ORDER, type LoadDuration } from '../timber';
import { finite, positive, StaticsError, validateSystem } from './fem2d';
import { CATEGORY_DURATION, PSI, type LoadCase, type StaticSystem } from './model';

/** kN/m². German NA ground-snow equations, regular sites only, A <= 1500 m.
 * Coefficients cross-checked with INFORMATIONSDIENST HOLZ, Nagelplattenkonstruktionen
 * nach Eurocode 5 (2017), section on snow actions. No exceptional snow/drifting.
 */
export function sk(zone: string, altitude: number): number {
  finite(altitude, 'Altitude');
  if (altitude < 0 || altitude > 1500) throw new StaticsError('snowOutsideScope', 'Ground-snow formula requires altitude 0..1500 m');
  const t = ((altitude + 140) / 760) ** 2;
  switch (zone) {
    case '1': return Math.max(0.65, 0.19 + 0.91*t);
    case '1a': return Math.max(0.81, 1.25*(0.19 + 0.91*t));
    case '2': return Math.max(0.85, 0.25 + 1.91*t);
    case '2a': return Math.max(1.06, 1.25*(0.25 + 1.91*t));
    case '3': return Math.max(1.10, 0.31 + 2.91*t);
    default: throw new StaticsError('snowOutsideScope', `Unknown snow zone ${zone}`);
  }
}

/** Unobstructed sliding, Ce=Ct=1; snow guards require a different model. */
export function snowShape(pitch: number): number {
  finite(pitch, 'Roof pitch');
  const a = Math.abs(pitch);
  if (a > 90) throw new StaticsError('invalidInput', 'Roof pitch must be within -90..90 degrees');
  return a <= 30 ? 0.8 : a < 60 ? 0.8*(60-a)/30 : 0;
}
export function roofSnow(zone: string, altitude: number, pitch: number): number {
  return sk(zone, altitude) * snowShape(pitch);
}

/** Simplified NA.B.3 table, kN/m², building height above ground, not frame height.
 * Source: DGfM teaching portal, section 3.2.3 Wind, table 3-7:
 * https://www.mauerwerksbau-lehre.de/vorlesungen/3-sicherheitskonzept-und-einwirkungen/32-einwirkungen/323-wind/
 * `islands` deliberately means North Sea islands (the more severe interpretation).
 * Baltic islands can explicitly use `coast`. North Sea >10 m is unsupported.
 */
export function windPressure(zone: number, terrain: SiteInfo['terrain'], height: number): number {
  positive(height, 'Building height');
  if (![1,2,3,4].includes(zone) || height > 25) throw new StaticsError('windOutsideScope', 'Wind table requires zone 1..4 and height <=25 m');
  const band = height <= 10 ? 0 : height <= 18 ? 1 : 2;
  if (terrain === 'islands') {
    if (zone !== 4 || height > 10) throw new StaticsError('windOutsideScope', 'North Sea islands require zone 4 and height <=10 m');
    return 1.4;
  }
  const inland = [[0.50,0.65,0.75],[0.65,0.80,0.90],[0.80,0.95,1.10],[0.95,1.15,1.30]];
  const coast = [[0.85,1.00,1.10],[1.05,1.20,1.30],[1.25,1.40,1.55]];
  if (terrain === 'inland') return inland[zone-1][band];
  if (terrain === 'coast' && zone >= 2) return coast[zone-2][band];
  throw new StaticsError('windOutsideScope', 'Unsupported terrain / wind zone combination');
}

export interface ResolvedLoads { system: StaticSystem; warnings: Msg[] }
export interface SiteLoadOptions { buildingHeight?: number }

/** Converts kN/m² to N/mm² with 1e-3, then multiplies by tributary width in mm.
 * Projection and rotation remain the FEM solver's responsibility (exactly once).
 */
export function resolveSiteLoads(sys: StaticSystem, site: SiteInfo, options: SiteLoadOptions = {}): ResolvedLoads {
  validateSystem(sys);
  const warnings: Msg[] = [];
  const snow = sys.memberLoads.some((l) => l.site === 'snow');
  const wind = sys.memberLoads.some((l) => l.site === 'wind');
  if (snow || wind) positive(sys.loadWidth ?? NaN, 'Tributary load width');
  if (snow && sys.pitch === undefined) throw new StaticsError('invalidInput', 'Site snow requires an explicit roof pitch');
  let s = 0, w = 0;
  if (snow) {
    s = roofSnow(site.snowZone, site.altitude, sys.pitch!);
    warnings.push({ key:'statics.warn.snowRegularOnly' });
    if (site.snowZone === '3') warnings.push({ key:'statics.warn.snowLocalValues' });
    // The supplied PSI table explicitly applies below 1000 m only. Do not silently
    // use low-altitude combinations at higher sites, even though sk is defined there.
    if (site.altitude >= 1000) throw new StaticsError('snowCombinationOutsideScope', 'Combination factors are supported below 1000 m only');
  }
  if (wind) {
    const height = options.buildingHeight ?? 25;
    w = windPressure(site.windZone, site.terrain, height) * (sys.cpe ?? 0.6);
    finite(w, 'Wind pressure');
    warnings.push({ key:'statics.warn.windSimplified' });
    if (options.buildingHeight === undefined) warnings.push({ key:'statics.warn.windHeightAssumed', args:{ height } });
    if (sys.cpe === undefined) warnings.push({ key:'statics.warn.windCoefficientAssumed', args:{ cpe:0.6 } });
    if (site.terrain === 'islands') warnings.push({ key:'statics.warn.northSeaIslands' });
    finite(site.altitude, 'Altitude');
    if (site.altitude > 800) throw new StaticsError('windOutsideScope', 'Simplified wind table does not cover altitude >800 m');
  }
  const system: StaticSystem = { ...sys, memberLoads:sys.memberLoads.map((l) => {
    if (!l.site) return { ...l };
    const scale = (l.site === 'snow' ? s : w) * 1e-3 * sys.loadWidth!;
    return { ...l, site:undefined, qx:l.qx*scale, qz:l.qz*scale };
  }) };
  return { system, warnings };
}

export type CombinationKind = 'uls' | 'characteristic' | 'quasiPermanent';
export interface LoadCombination {
  id: string;
  kind: CombinationKind;
  leading?: string;
  factors: Record<string, number>;
  duration: LoadDuration;
}

function duration(cases: LoadCase[], factors: Record<string, number>): LoadDuration {
  let index = 0;
  for (const c of cases) if (factors[c.id]) index = Math.max(index, DURATION_ORDER.indexOf(CATEGORY_DURATION[c.category]));
  return DURATION_ORDER[index];
}

/** EN 1990 6.10 / 6.14b / 6.16b, using the model's German-NA PSI table.
 * Cases are independent actions. Favourable variable actions may be omitted;
 * permanent cases share gammaG=1.0 or 1.35 (same permanent action). No EQU/accidental.
 * Enumerating subsets avoids losing uplift/opposing-load governing cases.
 */
export function loadCombinations(cases: LoadCase[]): LoadCombination[] {
  const variable = cases.filter((c) => c.category !== 'G');
  if (variable.length > 8) throw new StaticsError('combinationLimit', 'At most eight independent variable actions are supported');
  const result: LoadCombination[] = [];
  const seen = new Set<string>();
  const add = (kind: CombinationKind, gammaG: number, selected: LoadCase[], leading?: LoadCase) => {
    const factors = Object.fromEntries(cases.map((c) => [c.id, c.category === 'G' ? gammaG : 0]));
    for (const c of selected) factors[c.id] = kind === 'quasiPermanent' ? PSI[c.category][2]
      : (kind === 'uls' ? 1.5 : 1) * (c.id === leading?.id ? 1 : PSI[c.category][0]);
    const signature = `${kind}/${cases.map((c) => factors[c.id]).join(',')}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    result.push({ id:`${kind}-${result.length+1}`, kind, leading:leading?.id, factors, duration:duration(cases, factors) });
  };
  for (let mask = 0; mask < 2**variable.length; mask++) {
    const selected = variable.filter((_,i) => mask & (1<<i));
    const leads: (LoadCase | undefined)[] = selected.length ? selected : [undefined];
    for (const lead of leads) {
      for (const g of [1.35,1]) add('uls',g,selected,lead);
      add('characteristic',1,selected,lead);
    }
    add('quasiPermanent',1,selected);
  }
  return result;
}
