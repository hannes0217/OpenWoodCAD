import type { EvalElement, Evaluated } from '../core/evaluate';
import type { Joint } from '../core/model';
import { parseProcessingKey } from '../core/references';
export type SelectionFilter = 'all' | 'beam' | 'panel';
export interface ViewVisibility {
    visibilityOverrides: Record<string, boolean>;
    isolatedIds: string[] | null;
}
export function selectedElementIds(elements: Pick<EvalElement, 'id' | 'generator' | 'assemblyPath'>[], joints: Pick<Joint, 'id' | 'a' | 'b'>[], selection: string[]): string[] {
    const known = new Set(elements.map(e => e.id)), out = new Set<string>();
    for (const id of selection) {
        if (known.has(id))
            out.add(id);
        else if(id.startsWith('sketch:')){
            try{const elementId=decodeURIComponent(id.slice(7));if(known.has(elementId))out.add(elementId);}catch{ /* malformed selection */ }
        }
        else if (id.startsWith('group:')) {
            for(const element of elements)if(element.assemblyPath?.includes(id.slice(6)))out.add(element.id);
        }
        else if(parseProcessingKey(id)) {
            const ref=parseProcessingKey(id)!;if(known.has(ref.elementId))out.add(ref.elementId);
        }
        else if (id.startsWith('gen:')) {
            for (const e of elements)
                if (e.generator === id.slice(4))
                    out.add(e.id);
        }
        else if (id.startsWith('joint:')) {
            const joint = joints.find(j => j.id === id.slice(6));
            if (joint) {
                if (known.has(joint.a))
                    out.add(joint.a);
                if (known.has(joint.b))
                    out.add(joint.b);
            }
        }
    }
    return [...out];
}
export function visibleElements(elements: EvalElement[], state: ViewVisibility): EvalElement[] {
    const known = new Set(elements.map(e => e.id));
    const isolated = state.isolatedIds?.some(id => known.has(id)) ? new Set(state.isolatedIds) : null;
    return elements.filter(e => {
        const override = state.visibilityOverrides[e.id];
        return (typeof override === 'boolean' ? override : !e.hidden) && (!isolated || isolated.has(e.id));
    });
}
/** Mesh hits can contain several triangles/faces per body. Preserve depth
 * order but list each actual, selectable part exactly once.
 */
export function pickPartIds(hits: readonly string[], elements: Pick<EvalElement, 'id' | 'kind'>[], filter: SelectionFilter): string[] {
    const allowed = new Set(elements.filter(e => filter === 'all' || e.kind === filter).map(e => e.id));
    return [...new Set(hits.filter(id => allowed.has(id)))];
}
export function resolveSelection(ev: Evaluated, selection: string[]): string[] { return selectedElementIds(ev.elements, ev.joints, selection); }
