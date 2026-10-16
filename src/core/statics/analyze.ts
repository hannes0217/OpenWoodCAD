import type { Msg, SiteInfo } from '../model';
import { kdef } from '../timber';
import { checkDeflection, checkMember, displacementAt, type MemberCheckOptions, type TimberCheck } from './ec5';
import { solveFrame, validateSystem, type FrameResult, type MemberResult } from './fem2d';
import { loadCombinations, resolveSiteLoads, type LoadCombination, type SiteLoadOptions } from './loads';
import { PSI, type SMember, type StaticSystem } from './model';

export interface EnvelopeValue { min: number; max: number; minCombination: string; maxCombination: string }
export interface EnvelopeStation { x: number; N: EnvelopeValue; V: EnvelopeValue; M: EnvelopeValue; v: EnvelopeValue }
export interface MemberReport {
  id: string;
  elementId?: string;
  length: number;
  designLength: number;
  cantilever: boolean;
  envelope: EnvelopeStation[];
  checks: TimberCheck[];
  maxUtilization: number;
}
export interface StaticsReport {
  systemId: string;
  /** Always preliminary: this is not a complete structural verification. */
  preliminary: true;
  combinations: LoadCombination[];
  results: { combination: string; result: FrameResult }[];
  members: MemberReport[];
  maxUtilization: number;
  warnings: Msg[];
  assumptions: string[];
}

/** Recover physical spans in straight degree-two FE chains. A geometric frame
 * corner/branch is deliberately not interpreted as an automatically fixed support.
 */
function designSpan(sys: StaticSystem, member: SMember): MemberCheckOptions & { inferred: boolean } {
  const nodes = new Map(sys.nodes.map((n) => [n.id,n]));
  const a = nodes.get(member.n1)!, b = nodes.get(member.n2)!;
  const len = Math.hypot(b.x-a.x,b.z-a.z), c=(b.x-a.x)/len, s=(b.z-a.z)/len;
  const normalSupported = (id: string) => sys.supports.some((p) => p.node === id && ((p.ux && Math.abs(s)>1e-8) || (p.uz && Math.abs(c)>1e-8)));
  const walk = (start: string) => {
    let node=start, previous=member.id;
    const visited = new Set([previous]);
    while (true) {
      if (normalSupported(node)) return { node,supported:true,free:false,complex:false };
      const connected = sys.members.filter((m) => m.n1===node || m.n2===node);
      if (connected.length===1) return { node,supported:false,free:true,complex:false };
      const next = connected.find((m) => m.id!==previous);
      if (connected.length!==2 || !next || visited.has(next.id)) return { node,supported:false,free:false,complex:true };
      const other = next.n1===node ? next.n2:next.n1, p=nodes.get(other)!, q=nodes.get(node)!;
      if (Math.abs((p.x-q.x)*s-(p.z-q.z)*c)>1e-6 || next.b!==member.b || next.h!==member.h || next.strengthClass!==member.strengthClass) {
        return { node,supported:false,free:false,complex:true };
      }
      visited.add(next.id); previous=next.id; node=other;
    }
  };
  const left=walk(member.n1), right=walk(member.n2);
  const p=nodes.get(left.node)!, q=nodes.get(right.node)!;
  const inferred=!left.complex && !right.complex && (left.supported || right.supported);
  return { designLength:inferred ? Math.hypot(q.x-p.x,q.z-p.z):len,
    cantilever:inferred && ((left.supported && right.free) || (right.supported && left.free)), inferred };
}

function fieldAt(member: MemberResult, x: number) {
  return { N:-member.endForces[0]-member.qx*x, V:member.endForces[1]+member.qv*x,
    M:-member.endForces[2]+member.endForces[1]*x+member.qv*x*x/2, v:displacementAt(member,x) };
}

function envelope(results: { combination:string; result:MemberResult }[], length: number): EnvelopeStation[] {
  // Shared stations plus the exact moment extrema of every combination.
  const xs = new Set(Array.from({ length:41 }, (_,i) => length*i/40));
  for (const r of results) for (const p of r.result.stations) xs.add(p.x);
  return [...xs].sort((a,b) => a-b).map((x) => {
    const values = results.map((r) => ({ id:r.combination,...fieldAt(r.result,x) }));
    const range = (key:'N'|'V'|'M'|'v'): EnvelopeValue => {
      const low=values.reduce((a,b) => b[key]<a[key]?b:a), high=values.reduce((a,b) => b[key]>a[key]?b:a);
      return { min:low[key],max:high[key],minCombination:low.id,maxCombination:high.id };
    };
    return { x,N:range('N'),V:range('V'),M:range('M'),v:range('v') };
  });
}

/** Pure public entry point. Throws StaticsError for invalid/unsupported input or
 * unstable frames. Optional buildingHeight is required for North Sea islands and
 * recommended everywhere: the model itself does not store building height.
 * Uses existing first-generation EC/NA factors from model.ts and timber.ts;
 * no assertion of a current permitting standard is made.
 */
export function analyzeSystem(sys: StaticSystem, site: SiteInfo, options: SiteLoadOptions = {}): StaticsReport {
  validateSystem(sys);
  const resolved=resolveSiteLoads(sys,site,options), system=resolved.system;
  const combinations=loadCombinations(system.cases);
  const results=combinations.map((combination) => ({ combination:combination.id, result:solveFrame(system,combination.factors) }));
  const unitCases=new Map(system.cases.map((c) => [c.id,solveFrame(system,{ [c.id]:1 })]));
  const warnings:Msg[]=[...resolved.warnings,{ key:'statics.warn.preliminary' },{ key:'statics.warn.grossSection' },
    { key:'statics.warn.independentActions' },{ key:'statics.warn.linearAnalysis' }];
  const members=system.members.map((member): MemberReport => {
    const span=designSpan(system,member);
    const first=results[0].result.members.find((r) => r.id===member.id)!;
    const memberResults=results.map((r) => ({ combination:r.combination,result:r.result.members.find((m) => m.id===member.id)! }));
    if (!span.inferred) warnings.push({ key:'statics.warn.memberDesignLength',args:{ member:member.id } });
    if (member.lateralSpacing===undefined) warnings.push({ key:'statics.warn.lateralRestraintAssumed',args:{ member:member.id } });
    if (member.bucklingFactor===undefined) warnings.push({ key:'statics.warn.bucklingFactorAssumed',args:{ member:member.id,factor:1 } });
    const governing=new Map<TimberCheck['key'],TimberCheck>();
    const retain=(checks:TimberCheck[],combination:string) => {
      for (const check of checks) {
        const previous=governing.get(check.key);
        if (!previous || check.eta>previous.eta) governing.set(check.key,{ ...check,combination });
      }
    };
    for (const combination of combinations) {
      if (combination.kind==='uls') {
        const result=memberResults.find((r) => r.combination===combination.id)!.result;
        retain(checkMember(member,result,system.serviceClass,combination.duration,span),combination.id);
      }
      if (combination.kind==='characteristic') {
        const stations=Array.from({ length:201 }, (_,i) => {
          const x=first.length*i/200;
          let instantaneous=0, final=0;
          for (const c of system.cases) {
            const factor=combination.factors[c.id] ?? 0;
            if (!factor) continue;
            const result=unitCases.get(c.id)!.members.find((m) => m.id===member.id)!;
            const v=displacementAt(result,x)*factor;
            instantaneous+=v;
            final+=v*(1+(c.category==='G'?1:PSI[c.category][2])*kdef(system.serviceClass));
          }
          return { x,instantaneous,final };
        });
        retain(checkDeflection(member,first.length,system.serviceClass,stations,span),combination.id);
      }
    }
    const checks=[...governing.values()];
    return { id:member.id,elementId:member.elementId,length:first.length,designLength:span.designLength!,cantilever:!!span.cantilever,
      envelope:envelope(memberResults.filter((r) => combinations.find((c) => c.id===r.combination)!.kind==='uls'),first.length),
      checks,maxUtilization:Math.max(0,...checks.map((c) => c.eta)) };
  });
  return { systemId:sys.id,preliminary:true,combinations,results,members,maxUtilization:Math.max(0,...members.map((m) => m.maxUtilization)),warnings,
    assumptions:[
      'First-order, small-displacement Euler-Bernoulli frame; shear deformation omitted.',
      'Gross rectangular sections; no reduction for notches, holes or connection flexibility.',
      'No fire, vibration, fastener, bearing, biaxial bending or complete spatial stability verification.',
      'Independent variable actions; permanent cases share one favourable/unfavourable factor. No EQU or accidental combinations.',
      'Deflection uses absolute transverse displacement; physical spans are inferred only along straight unbranched chains. Complex frames require explicit engineering review.',
      'SLS deflections sampled at 201 points per FE member; force envelopes at 41 points plus moment extrema.',
      'Snow assumes unobstructed sliding without drifting or exceptional regional events. Wind is external pressure only; suction/internal pressure require explicit input cases.',
      'Existing material/PSI tables and the specified EC5/NA formula set are used; regulatory applicability is not automatically established.',
    ] };
}
