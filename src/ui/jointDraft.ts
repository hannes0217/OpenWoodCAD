import { evaluate, type Evaluated } from '../core/evaluate';
import { applyJoint, JOINT_PARAMS } from '../core/joints';
import type { Joint, Msg, OwcDocument } from '../core/model';
import { getState, setState, updateDoc } from './store';

export interface JointReview { evaluation: Evaluated; warnings: Msg[]; valid: boolean }
export function reviewJoint(base: OwcDocument, joint: Joint): JointReview {
  const next = { ...base, joints: [...base.joints.filter(j => j.id !== joint.id), joint] };
  const evaluation = evaluate(next);
  const a = evaluation.elements.find(e => e.id === joint.a), b = evaluation.elements.find(e => e.id === joint.b);
  const definitions = JOINT_PARAMS[joint.type];
  const validParams = !!definitions && definitions.every(p => {
    const value = joint.params[p.id] ?? p.default;
    return p.type === 'number' ? typeof value === 'number' && Number.isFinite(value) && value >= (p.min ?? -Infinity) && value <= (p.max ?? Infinity) : p.type === 'boolean' ? typeof value === 'boolean' : typeof value === 'string' && p.options?.includes(value);
  });
  if (!a || !b || a.id === b.id || !validParams) return { evaluation, warnings: [], valid: false };
  const result = applyJoint(joint,a,b);
  return { evaluation, warnings: result.warnings, valid: !joint.suppressed && !result.warnings.length && result.processings.length > 0 };
}

/** A preview never enters document persistence or manufacturing evaluation. */
export function commitJoint(base: OwcDocument, joint: Joint): boolean {
  if (getState().doc !== base || !reviewJoint(base,joint).valid) return false;
  updateDoc(doc => { doc.joints = [...doc.joints.filter(j => j.id !== joint.id), structuredClone(joint)]; });
  setState({jointPreview:null,selection:[`joint:${joint.id}`],dialog:null});
  return true;
}
