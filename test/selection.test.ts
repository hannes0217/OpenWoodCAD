import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { evaluate } from '../src/core/evaluate';
import { WORLD } from '../src/core/math';
import { emptyDocument } from '../src/core/model';
import { pickPartIds, resolveSelection, selectedElementIds, visibleElements } from '../src/ui/selection';
import { hideSelection, isolateSelection, showAllParts, togglePartVisibility } from '../src/ui/viewActions';
import { evaluated, getState, setState } from '../src/ui/store';
import { contextDe, contextEn } from '../src/ui/i18n-context';
const previous = getState();
afterEach(() => setState(previous));
function fixture() { const doc = emptyDocument(); doc.elements = [{ id: 'beam', kind: 'beam', name: 'Beam', frame: WORLD, length: 1000, width: 100, height: 200, materialId: 'kvh_c24', processings: [] }, { id: 'panel', kind: 'panel', name: 'Panel', frame: WORLD, length: 1000, width: 300, height: 19, materialId: 'chip19_white', processings: [] }]; return { doc, ev: evaluate(doc) }; }
describe('precise part selection', () => {
    it('resolves templates, explicit parts and joints without duplicates or dangling IDs', () => {
        const parts = [{ id: 'a', generator: 'g' }, { id: 'b', generator: 'g' }, { id: 'c' }], joints = [{ id: 'j', a: 'b', b: 'c' }];
        expect(selectedElementIds(parts, joints, ['gen:g', 'joint:j', 'a', 'missing'])).toEqual(['a', 'b', 'c']);
        expect(selectedElementIds(parts, joints, ['joint:j'])).toEqual(['b', 'c']);
        expect(selectedElementIds(parts, [{ id: 'dangling', a: 'b', b: 'missing' }], ['joint:dangling'])).toEqual(['b']);
    });
    it('returns actual overlapping mesh hits in depth order and applies part-type priority', () => {
        const scene = new THREE.Scene(), geometry = new THREE.BoxGeometry(4, 1, 4), material = new THREE.MeshBasicMaterial();
        for (const [id, y] of [['panel', -5], ['beam', 0]] as const) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = y;
            mesh.userData.id = id;
            scene.add(mesh);
        }
        const camera = new THREE.PerspectiveCamera(35, 1, .1, 1000);
        camera.up.set(0, 0, 1);
        camera.position.set(0, -20, 0);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld(true);
        scene.updateMatrixWorld(true);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = ray.intersectObjects(scene.children).map(hit => String(hit.object.userData.id)), { ev } = fixture();
        expect(pickPartIds(hits, ev.elements, 'all')).toEqual(['panel', 'beam']);
        expect(pickPartIds(hits, ev.elements, 'beam')).toEqual(['beam']);
        expect(pickPartIds(hits, ev.elements, 'panel')).toEqual(['panel']);
        expect(pickPartIds(['unknown', ...hits, ...hits], ev.elements, 'all')).toEqual(['panel', 'beam']);
        geometry.dispose();
        material.dispose();
    });
    it('ignores obsolete isolation IDs and respects explicit visibility overrides', () => {
        const { ev } = fixture();
        ev.elements[0].hidden = true;
        expect(visibleElements(ev.elements, { visibilityOverrides: { beam: true }, isolatedIds: ['deleted'] }).map(e => e.id)).toEqual(['beam', 'panel']);
        expect(visibleElements(ev.elements, { visibilityOverrides: { beam: true, panel: false }, isolatedIds: null }).map(e => e.id)).toEqual(['beam']);
    });
});
describe('view-only hide and isolate actions', () => {
    it('does not change the document, undo history, dirty flag or manufacturing elements', () => {
        const { doc } = fixture(), json = JSON.stringify(doc);
        setState({ doc, selection: ['beam'], visibilityOverrides: {}, isolatedIds: null, dirty: false, past: [], future: [] });
        hideSelection();
        expect(visibleElements(evaluated().elements, getState()).map(e => e.id)).toEqual(['panel']);
        isolateSelection();
        expect(visibleElements(evaluated().elements, getState()).map(e => e.id)).toEqual(['beam']);
        showAllParts();
        expect(visibleElements(evaluated().elements, getState())).toHaveLength(2);
        expect(getState().doc).toBe(doc);
        expect(JSON.stringify(doc)).toBe(json);
        expect(getState().past).toEqual([]);
        expect(getState().dirty).toBe(false);
        expect(evaluated().elements).toHaveLength(2);
    });
    it('makes a part visible again from the browser even when another part was isolated', () => {
        const { doc } = fixture();
        setState({ doc, selection: ['beam'], visibilityOverrides: {}, isolatedIds: null });
        isolateSelection();
        togglePartVisibility(['panel']);
        expect(getState().isolatedIds).toBeNull();
        expect(visibleElements(evaluated().elements, getState())).toHaveLength(2);
    });
    it('provides matching translations and resolves generated part selections', () => {
        expect(Object.keys(contextDe).sort()).toEqual(Object.keys(contextEn).sort());
        const doc = emptyDocument();
        doc.generators = [{ id: 'g', name: 'Workbench', type: 'werkbank', frame: WORLD, params: {} }];
        const ev = evaluate(doc);
        expect(resolveSelection(ev, ['gen:g'])).toHaveLength(ev.elements.length);
    });
});
