import { evaluated, getState, setState } from './store';
import { resolveSelection, visibleElements } from './selection';
export function isolateSelection(): void {
    const ids = resolveSelection(evaluated(), getState().selection);
    if (ids.length)
        setState({ isolatedIds: ids, visibilityOverrides: { ...getState().visibilityOverrides, ...Object.fromEntries(ids.map(id => [id, true])) } });
}
export function hideSelection(): void {
    const ids = resolveSelection(evaluated(), getState().selection);
    if (ids.length)
        setState({ visibilityOverrides: { ...getState().visibilityOverrides, ...Object.fromEntries(ids.map(id => [id, false])) } });
}
export function showAllParts(): void {
    setState({ isolatedIds: null, visibilityOverrides: Object.fromEntries(evaluated().elements.map(e => [e.id, true])) });
}
export function togglePartVisibility(selection: string[]): void {
    const ev = evaluated(), state = getState(), ids = resolveSelection(ev, selection), visible = new Set(visibleElements(ev.elements, state).map(e => e.id));
    const show = !ids.every(id => visible.has(id));
    setState({ visibilityOverrides: { ...state.visibilityOverrides, ...Object.fromEntries(ids.map(id => [id, show])) }, ...(show ? { isolatedIds: null } : {}) });
}
