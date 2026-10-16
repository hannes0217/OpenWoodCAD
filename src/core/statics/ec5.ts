import { GAMMA_M, kdef, kmod, strengthClass, type LoadDuration, type ServiceClass } from '../timber';
import { finite, positive, StaticsError, type MemberResult } from './fem2d';
import type { SMember } from './model';

export interface TimberCheck {
  key: 'bending' | 'shear' | 'tension' | 'compression' | 'buckling' | 'lateralTorsional'
    | 'tensionBending' | 'compressionBending' | 'stabilityInteraction' | 'instantaneous' | 'final';
  eta: number;
  passed: boolean;
  /** EN 1995-1-1 clause/equation, not a claim of complete code compliance. */
  reference: string;
  values: Record<string, number>;
  combination?: string;
  x?: number;
}
export interface MemberCheckOptions {
  /** Physical design length, distinct from arbitrary FE segmentation. */
  designLength?: number;
  cantilever?: boolean;
}
export interface Resistance {
  area: number; W: number; kh: number; kmod: number; gammaM: number;
  fmd: number; ftd: number; fcd: number; fvd: number;
  lambdaY: number; lambdaZ: number; kcY: number; kcZ: number;
  lambdaM: number; kcrit: number; effectiveLateralLength: number;
}

/** Solid timber size factor is limited to characteristic density <=700 kg/m³.
 * Reference: EN 1995-1-1 3.2(3), 3.3(3); kmod and material table live in timber.ts.
 */
export function sizeFactor(kind: 'solid' | 'glulam', height: number, density = 350): number {
  positive(height, 'Section height');
  if (kind === 'solid') return density <= 700 ? Math.max(1, Math.min(1.3, (150/height)**0.2)) : 1;
  return Math.max(1, Math.min(1.1, (600/height)**0.1));
}

export function bucklingFactor(lambdaRel: number, kind: 'solid' | 'glulam'): number {
  finite(lambdaRel, 'Relative slenderness');
  if (lambdaRel < 0) throw new StaticsError('invalidInput', 'Relative slenderness must not be negative');
  if (lambdaRel <= 0.3) return 1;
  const beta = kind === 'solid' ? 0.2 : 0.1;
  const k = 0.5*(1 + beta*(lambdaRel-0.3) + lambdaRel**2);
  return Math.min(1, 1/(k + Math.sqrt(Math.max(0, k*k-lambdaRel**2))));
}
export function lateralFactor(lambdaRel: number): number {
  finite(lambdaRel, 'Relative slenderness');
  if (lambdaRel < 0) throw new StaticsError('invalidInput', 'Relative slenderness must not be negative');
  return lambdaRel <= 0.75 ? 1 : lambdaRel <= 1.4 ? 1.56-0.75*lambdaRel : 1/lambdaRel**2;
}

/** Rectangular straight members, gross section; no notches, holes, bearing or fire.
 * In-plane buckling length is L * bucklingFactor (default 1); out-of-plane uses
 * the same length unless lateralSpacing specifies positive physical restraint spacing.
 * Absent lateralSpacing means a continuously restrained compression edge for LTB,
 * as required by the task. This assumption must be shown in the report.
 */
export function resistance(member: SMember, length: number, sc: ServiceClass, duration: LoadDuration, options: MemberCheckOptions = {}): Resistance {
  if (![1,2,3].includes(sc)) throw new StaticsError('invalidInput', 'Invalid service class');
  const timber = strengthClass(member.strengthClass);
  positive(member.b, 'b'); positive(member.h, 'h'); positive(length, 'Length');
  const designLength = options.designLength ?? length;
  positive(designLength, 'Design length');
  if (member.bucklingFactor !== undefined) positive(member.bucklingFactor, 'Buckling length factor');
  if (member.lateralSpacing !== undefined) positive(member.lateralSpacing, 'Lateral restraint spacing');
  const area = member.b*member.h, W = member.b*member.h**2/6;
  const kh = sizeFactor(timber.kind, member.h, timber.rhok), mod = kmod(duration, sc);
  const fmd = kh*mod*timber.fmk/GAMMA_M;
  // No tensile size enhancement: conservative for sections with unspecified width orientation.
  const ftd = mod*timber.ft0k/GAMMA_M, fcd = mod*timber.fc0k/GAMMA_M, fvd = mod*timber.fvk/GAMMA_M;
  const ly = designLength*(member.bucklingFactor ?? 1);
  const lz = member.lateralSpacing ?? ly;
  const lambdaY = ly/(member.h/Math.sqrt(12))/Math.PI * Math.sqrt(timber.fc0k/timber.E005);
  const lambdaZ = lz/(member.b/Math.sqrt(12))/Math.PI * Math.sqrt(timber.fc0k/timber.E005);
  const kcY = bucklingFactor(lambdaY, timber.kind), kcZ = bucklingFactor(lambdaZ, timber.kind);
  let lambdaM = 0, kcrit = 1, effectiveLateralLength = 0;
  if (member.lateralSpacing !== undefined) {
    // Conservative uniform-moment factor 1.0 (cantilever 2.0), top-edge load +2h.
    effectiveLateralLength = Math.min(designLength, member.lateralSpacing)*(options.cantilever ? 2 : 1)+2*member.h;
    const sigmaCrit = 0.78*member.b**2*timber.E005/(member.h*effectiveLateralLength);
    lambdaM = Math.sqrt(timber.fmk/sigmaCrit);
    kcrit = lateralFactor(lambdaM);
  }
  return { area,W,kh,kmod:mod,gammaM:GAMMA_M,fmd,ftd,fcd,fvd,lambdaY,lambdaZ,kcY,kcZ,lambdaM,kcrit,effectiveLateralLength };
}

function check(key: TimberCheck['key'], eta: number, reference: string, values: Record<string,number>, x?: number): TimberCheck {
  return { key,eta,passed:eta<=1,reference,values,x };
}

/** Checks combined N and M at the SAME station of the SAME combination.
 * This avoids combining unrelated extrema, or missing axial/bending interaction.
 */
export function checkMember(member: SMember, result: MemberResult, sc: ServiceClass, duration: LoadDuration, options: MemberCheckOptions = {}): TimberCheck[] {
  const r = resistance(member, result.length, sc, duration, options);
  const checks = new Map<TimberCheck['key'], TimberCheck>();
  for (const p of result.stations) {
    const bending = Math.abs(p.M)/r.W, tension = Math.max(0,p.N)/r.area, compression = Math.max(0,-p.N)/r.area;
    const shear = 1.5*Math.abs(p.V)/(0.67*r.area);
    const bm = bending/r.fmd, tc = tension/r.ftd, cc = compression/r.fcd;
    const values = { ...r,N:p.N,V:p.V,M:p.M,bending,tension,compression,shear,kcr:0.67 };
    const candidates = [
      check('bending',bm,'EN 1995-1-1 (6.11)',values,p.x),
      check('shear',shear/r.fvd,'EN 1995-1-1 (6.13); kcr=0.67',values,p.x),
      check('tension',tc,'EN 1995-1-1 (6.1)',values,p.x),
      check('compression',cc,'EN 1995-1-1 (6.2)',values,p.x),
      check('buckling',Math.max(cc/r.kcY,cc/r.kcZ),'EN 1995-1-1 (6.23)-(6.27)',values,p.x),
      check('lateralTorsional',bm/r.kcrit,'EN 1995-1-1 (6.33)',values,p.x),
      check('tensionBending',tc+bm,'EN 1995-1-1 (6.17)',values,p.x),
      check('compressionBending',r.lambdaY <= 0.3 && r.lambdaZ <= 0.3 ? cc**2+bm
        : Math.max(cc/r.kcY+bm,cc/r.kcZ+0.7*bm),'EN 1995-1-1 (6.19), (6.23)-(6.24)',values,p.x),
      check('stabilityInteraction',compression > 0 ? (bm/r.kcrit)**2+cc/r.kcZ : bm/r.kcrit,
        'EN 1995-1-1 (6.35)',values,p.x),
    ];
    for (const candidate of candidates) {
      // Only apply tension/compression interaction to the appropriate axial sign.
      if (candidate.key === 'tensionBending' && p.N < 0) continue;
      if (candidate.key === 'compressionBending' && p.N > 0) continue;
      const prev = checks.get(candidate.key);
      if (!prev || candidate.eta > prev.eta) checks.set(candidate.key,candidate);
    }
  }
  return [...checks.values()];
}

export interface DeflectionStation { x: number; instantaneous: number; final: number }

/** Signed G and Q responses must be superposed before taking absolute values.
 * Absolute transverse displacement is used (includes support/frame translation),
 * so this is conservative compared with a net deflection relative to a support chord.
 */
export function checkDeflection(member: SMember, length: number, sc: ServiceClass, stations: DeflectionStation[], options: MemberCheckOptions = {}): TimberCheck[] {
  positive(length, 'Length');
  const designLength = options.designLength ?? length;
  const limitLength = designLength*(options.cantilever ? 2 : 1);
  const limitInst = limitLength/(member.limitInst ?? 300), limitFin = limitLength/(member.limitFin ?? 200);
  positive(limitInst, 'Instantaneous limit'); positive(limitFin, 'Final limit');
  const worst = (key: 'instantaneous' | 'final', limit: number) => {
    const p = stations.reduce((a,b) => Math.abs(b[key]) > Math.abs(a[key]) ? b:a, stations[0]);
    return check(key,Math.abs(p[key])/limit,'EN 1995-1-1 2.2.3, 7.2',
      { displacement:p[key],limit,designLength,cantilever:options.cantilever?1:0,kdef:kdef(sc) },p.x);
  };
  if (!stations.length) return [];
  return [worst('instantaneous',limitInst),worst('final',limitFin)];
}

/** Evaluate any local displacement from the exact uniform-load polynomial.
 * The station set also contains extra moment extrema and is not an index grid.
 */
export function displacementAt(result: MemberResult, x: number): number {
  const L = result.length, t = x/L, d = result.displacements;
  const q = result.qv;
  return (1-3*t*t+2*t*t*t)*d[1]+L*(t-2*t*t+t*t*t)*d[2]
    +(3*t*t-2*t*t*t)*d[4]+L*(-t*t+t*t*t)*d[5]+q*x*x*(L-x)**2/(24*result.EI);
}
