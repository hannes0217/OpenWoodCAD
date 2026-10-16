import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { findMaterial } from '../core/catalog';
import type { EvalElement, Evaluated } from '../core/evaluate';
import { frameMatrix, rotateFrame, type Frame, type Vec3 } from '../core/math';
import { geom, geomSig } from './geomClient';
import { tools, type ViewApi } from './tools';
import { getState, setState, subscribe, evaluated, updateDoc, type AppState } from './store';
import { changeProjection, fitCamera, resizeCamera, VIEW_DIRECTIONS, type CadCamera, type ViewName } from './cameraMath';
import { configureCadNavigation } from './navigation';
import { pickPartIds, resolveSelection, visibleElements } from './selection';
export type { ViewName } from './cameraMath';

const ROLE_COLORS: Record<string, string> = {
  rafter: '#d9a441', purlin: '#b5651d', ridgePurlin: '#8b4513', wallPlate: '#a0522d', post: '#6b8e23', collarTie: '#cd853f', tieBeam: '#bc8f8f', strut: '#9acd32', kneeBrace: '#9acd32',
  joist: '#deb887', stud: '#c19a6b', plate: '#8b7355', header: '#a0522d', batten: '#d2b48c', board: '#e6c79c', hipRafter: '#c0392b', jackRafter: '#e67e22', valleyRafter: '#2980b9',
  side: '#c9b38f', top: '#a67c52', bottom: '#b8a07a', back: '#e8e2d4', plinth: '#7d6b57', front: '#e4d1b0', drawerSide: '#efe0bf', drawerFront: '#e9d7b0', drawerBack: '#e9d7b0', drawerBottom: '#f3ead6',
};

function hashColor(n: number): string {
  const h = (n * 137.508) % 360;
  return `hsl(${h}, 55%, 62%)`;
}

class SceneView implements ViewApi {
  renderer: THREE.WebGLRenderer;
  labels: CSS2DRenderer;
  scene = new THREE.Scene();
  camera: CadCamera;
  controls: OrbitControls;
  root = new THREE.Group();
  grid: THREE.GridHelper;
  raycaster = new THREE.Raycaster();
  geoms = new Map<string, { mesh: THREE.BufferGeometry; edges: THREE.BufferGeometry }>();
  materials = new Map<string, THREE.MeshStandardMaterial>();
  edgeMat = new THREE.LineBasicMaterial({ color: 0x3a2f25 });
  edgeSelMat = new THREE.LineBasicMaterial({ color: 0x0a84ff });
  clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  dirty = true;
  frame = 0;
  fittedOnce = false;
  lastKey = '';
  geometryRevision=geom.revision;
  overlay = new THREE.Group();
  layer = new THREE.Group();
  gizmo: TransformControls;
  proxy = new THREE.Object3D();
  target: { kind: 'gen' | 'els'; ids: string[] } | null = null;
  dragStart = new THREE.Vector3();
  dragStartRot = 0;
  dragBase = new Map<THREE.Object3D, THREE.Matrix4>();
  gizmoBusy = false;
  onMove: ((t: { kind: 'gen' | 'els'; ids: string[] }, delta: Vec3, rotZ: number, pivot: Vec3) => void) | null = null;

  constructor(private host: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    host.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels-layer';
    host.appendChild(this.labels.domElement);
    this.camera = new THREE.PerspectiveCamera(35, 1, 10, 500000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(-2500, -3500, 2200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.controls.addEventListener('change', () => (this.dirty = true));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-3, -5, 8);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(4, 3, 2);
    this.scene.add(fill);
    this.grid = new THREE.GridHelper(10000, 100, 0x9a9083, 0xd5cec4);
    this.grid.rotation.x = Math.PI / 2;
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.55;
    this.scene.add(this.grid);
    this.scene.add(this.root);
    this.scene.add(this.overlay);
    this.scene.add(this.layer);
    this.scene.add(this.proxy);
    this.gizmo = new TransformControls(this.camera, this.renderer.domElement);
    this.gizmo.setSize(0.8);
    const helper = (this.gizmo as unknown as { getHelper?: () => THREE.Object3D }).getHelper?.() ?? (this.gizmo as unknown as THREE.Object3D);
    this.scene.add(helper);
    this.gizmo.addEventListener('change', () => (this.dirty = true));
    this.gizmo.addEventListener('mouseDown', () => { this.gizmoBusy = true; });
    this.gizmo.addEventListener('dragging-changed', (ev) => {
      const dragging = (ev as unknown as { value: boolean }).value;
      this.controls.enabled = !dragging;
      if (dragging) {
        this.dragStart.copy(this.proxy.position);
        this.dragStartRot = this.proxy.rotation.z;
        this.dragBase.clear();
        for (const g of this.targetGroups()) this.dragBase.set(g, g.matrix.clone());
      } else {
        const d = this.proxy.position.clone().sub(this.dragStart);
        const rz = this.proxy.rotation.z - this.dragStartRot;
        if (this.target && (d.length() > 0.01 || Math.abs(rz) > 1e-6)) this.onMove?.(this.target, [d.x, d.y, d.z], rz, [this.dragStart.x, this.dragStart.y, this.dragStart.z]);
        setTimeout(() => { this.gizmoBusy = false; }, 0);
      }
    });
    this.gizmo.addEventListener('objectChange', () => {
      const d = this.proxy.position.clone().sub(this.dragStart);
      const rz = this.proxy.rotation.z - this.dragStartRot;
      const rot = new THREE.Matrix4().makeRotationZ(rz);
      const toO = new THREE.Matrix4().makeTranslation(-this.dragStart.x, -this.dragStart.y, -this.dragStart.z);
      const back = new THREE.Matrix4().makeTranslation(this.dragStart.x + d.x, this.dragStart.y + d.y, this.dragStart.z + d.z);
      const m = back.multiply(rot).multiply(toO);
      for (const [g, base] of this.dragBase) g.matrix.copy(m.clone().multiply(base));
      this.overlay.visible = false;
      this.dirty = true;
    });
    this.resize();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.controls.update();
      if (this.dirty) {
        this.renderer.render(this.scene, this.camera);
        this.labels.render(this.scene, this.camera);
        this.dirty = false;
      }
    };
    loop();
  }

  applyTheme(dark: boolean) {
    this.scene.background = new THREE.Color(dark ? 0x23201d : 0xf4f1ec);
    this.dirty = true;
  }

  configureNavigation() {
    configureCadNavigation(this.controls,getState().cad.navigation,getState().tool!=='select');
  }

  configureProjection() {
    const projection=getState().cad.projection;
    if((this.camera instanceof THREE.OrthographicCamera)===(projection==='orthographic')) return;
    this.controls.update();
    this.camera=changeProjection(this.camera,this.controls.target,projection,(this.host.clientWidth||1)/(this.host.clientHeight||1));
    this.controls.object=this.camera;this.gizmo.camera=this.camera;
    this.controls.update();this.dirty=true;
  }

  private resetOrbitTarget(center:THREE.Vector3) {
    // OrbitControls caches camera.up in its constructor. Recreate it after a
    // top/bottom view changes the up axis, and discard residual damping.
    this.controls.dispose();
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.dampingFactor=.15;
    this.controls.target.copy(center);
    this.controls.addEventListener('change',() => {this.dirty=true;});
    this.configureNavigation();this.controls.update();
  }

  resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    resizeCamera(this.camera,w/h);
    this.dirty = true;
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.controls.dispose();
    this.renderer.dispose();
    this.host.innerHTML = '';
  }

  private boxGeometry(e: EvalElement) {
    const key = `box:${e.length}|${e.width}|${e.height}`;
    let g = this.geoms.get(key);
    if (!g) {
      const mesh = new THREE.BoxGeometry(e.length, e.width, e.height);
      mesh.translate(e.length / 2, e.width / 2, e.height / 2);
      g = { mesh, edges: new THREE.EdgesGeometry(mesh) };
      this.geoms.set(key, g);
    }
    return g;
  }

  private geometryFor(e: EvalElement) {
    if(this.geometryRevision!==geom.revision){
      for(const g of this.geoms.values()){g.mesh.dispose();g.edges.dispose();}
      this.geoms.clear();this.geometryRevision=geom.revision;
    }
    const sig = geomSig(e);
    const cached = this.geoms.get(sig);
    if (cached) return cached;
    const m = geom.mesh(sig);
    if (!m) return this.boxGeometry(e);
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute('position', new THREE.BufferAttribute(m.vertices, 3));
    mesh.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    mesh.setIndex(new THREE.BufferAttribute(m.indices, 1));
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.BufferAttribute(m.edges, 3));
    const g = { mesh, edges };
    this.geoms.set(sig, g);
    return g;
  }

  private material(color: string, opts: { xray: boolean; section: boolean }) {
    const key = `${color}|${opts.xray}|${opts.section}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, transparent: opts.xray, opacity: opts.xray ? 0.25 : 1, depthWrite: !opts.xray, side: THREE.DoubleSide });
      if (opts.section) m.clippingPlanes = [this.clip];
      this.materials.set(key, m);
    }
    return m;
  }

  update(ev: Evaluated, s: AppState) {
    const visible=visibleElements(ev.elements,s);
    geom.request(visible);
    const sel = new Set(s.selection);
    const selGens = new Set(s.selection.filter((x) => x.startsWith('gen:')).map((x) => x.slice(4)));
    const temporary=new Set<THREE.Material>();
    this.root.traverse(o=>{
      const object=o as THREE.Mesh;
      if((o as THREE.LineSegments).isLineSegments || o.userData.temporaryMaterial)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material)temporary.add(material);
    });
    temporary.forEach(material=>material.dispose());
    this.root.clear();
    const edgeMatSec = this.edgeMat.clone();
    const edgeSelSec = this.edgeSelMat.clone();
    if (s.section.enabled) {
      edgeMatSec.clippingPlanes = [this.clip];
      edgeSelSec.clippingPlanes = [this.clip];
    }
    for (const e of visible) {
      const g = this.geometryFor(e);
      let color = '#cccccc';
      if (s.colorBy === 'role') color = (e.role && ROLE_COLORS[e.role]) || '#c8b08a';
      else if (s.colorBy === 'pos') color = hashColor(e.pos);
      else {
        try { color = e.color ?? findMaterial(ev.catalog, e.materialId).color; } catch { /* keep grey */ }
      }
      const selected = sel.has(e.id) || (e.generator !== undefined && selGens.has(e.generator));
      const preview=s.contextPreview===e.id;
      const mesh = new THREE.Mesh(g.mesh, this.material(color, { xray: s.xray, section: s.section.enabled }));
      const lines = new THREE.LineSegments(g.edges, selected || preview ? edgeSelSec : edgeMatSec);
      const grp = new THREE.Group();
      grp.add(mesh, lines);
      grp.matrixAutoUpdate = false;
      const m = new THREE.Matrix4();
      m.set(...(frameMatrix(e.frame) as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]));
      const open = e.motion ? Math.max(s.drawerOpen, s.openGroups[e.motion.group] ?? 0) : 0;
      if (e.motion && open > 0) {
        const d = e.motion.dir;
        const k = e.motion.travel * open;
        m.elements[12] += d[0] * k;
        m.elements[13] += d[1] * k;
        m.elements[14] += d[2] * k;
      }
      grp.matrix.copy(m);
      if (e.motion) {
        const base = new THREE.Matrix4();
        base.set(...(frameMatrix(e.frame) as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]));
        grp.userData.base = base;
        grp.userData.motion = e.motion;
      }
      grp.userData.elementId = e.id;
      grp.userData.generator = e.generator;
      mesh.userData.elementId = e.id;
      const flagged = s.issueIds.includes(e.id);
      if (selected || flagged || preview) {
        mesh.material = this.material(color, { xray: s.xray, section: s.section.enabled }).clone();
        mesh.userData.temporaryMaterial=true;
        (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(preview?0xffb020:flagged && !selected ? 0xff2020 : 0x0a5cff);
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = preview ? 0.45 : flagged && !selected ? 0.35 : 0.12;
        if(preview){mesh.material.depthTest=false;mesh.renderOrder=500;}
      }
      if (s.showLabels) {
        const div = document.createElement('div');
        div.className = 'pos-label';
        div.textContent = String(e.pos);
        const lab = new CSS2DObject(div);
        lab.position.set(e.length / 2, e.width / 2, e.height / 2);
        grp.add(lab);
      }
      this.root.add(grp);
    }
    // Section plane position from the model bounds.
    const box = this.bounds();
    if (s.section.enabled && !box.isEmpty()) {
      const ax = { x: 0, y: 1, z: 2 }[s.section.axis];
      const n = new THREE.Vector3(0, 0, 0).setComponent(ax, -1);
      const min = box.min.getComponent(ax);
      const max = box.max.getComponent(ax);
      this.clip.set(n, min + (max - min) * s.section.offset);
    }
    const key = `${ev.elements.length}`;
    if (!this.fittedOnce && ev.elements.length > 0) {
      this.fit('iso');
      this.fittedOnce = true;
    } else if (key !== this.lastKey && ev.elements.length > 0 && this.lastKey === '0') {
      this.fit('iso');
    }
    this.lastKey = key;
    this.updateGrid(box);
    this.updateGizmo(s, ev);
    this.dirty = true;
  }

  /** Fast path: only drawer/door positions changed. */
  updateMotion(s: AppState) {
    for (const g of this.root.children) {
      const mo = g.userData.motion as { group: string; dir: Vec3; travel: number } | undefined;
      if (!mo) continue;
      const open = Math.max(s.drawerOpen, s.openGroups[mo.group] ?? 0);
      g.matrix.copy(g.userData.base as THREE.Matrix4);
      g.matrix.elements[12] += mo.dir[0] * mo.travel * open;
      g.matrix.elements[13] += mo.dir[1] * mo.travel * open;
      g.matrix.elements[14] += mo.dir[2] * mo.travel * open;
    }
    this.dirty = true;
  }

  targetGroups(): THREE.Object3D[] {
    if (!this.target) return [];
    const ids = new Set(this.target.ids);
    return this.root.children.filter((g) => (this.target!.kind === 'gen' ? ids.has(g.userData.generator) : ids.has(g.userData.elementId)));
  }

  private updateGizmo(s: AppState, ev: Evaluated) {
    const genIds = new Set<string>();
    const free: string[] = [];
    for (const id of s.selection) {
      if (id.startsWith('gen:')) genIds.add(id.slice(4));
      else if (!id.includes(':')) {
        const e = ev.elements.find((x) => x.id === id);
        if (e?.generator) genIds.add(e.generator);
        else if (e) free.push(e.id);
      }
    }
    this.target = genIds.size === 1 && free.length === 0 ? { kind: 'gen', ids: [...genIds] } : genIds.size === 0 && free.length ? { kind: 'els', ids: free } : null;
    this.overlay.clear();
    this.overlay.visible = true;
    const groups = this.targetGroups();
    if (!this.target || !groups.length || s.tool !== 'select') {
      this.gizmo.detach();
      return;
    }
    const box = new THREE.Box3();
    for (const g of groups) box.expandByObject(g);
    this.dimensionOverlay(box);
    if(s.gizmoMode==='none') {this.gizmo.detach();return;}
    const c = box.getCenter(new THREE.Vector3());
    if (this.target.kind === 'gen') {
      const gen = s.doc.generators.find((g) => g.id === this.target!.ids[0]);
      if (gen) c.set(gen.frame.o[0], gen.frame.o[1], gen.frame.o[2]);
    } else c.z = box.min.z;
    this.proxy.position.copy(c);
    this.proxy.rotation.set(0, 0, 0);
    this.proxy.updateMatrixWorld();
    this.gizmo.attach(this.proxy);
    this.gizmo.setMode(s.gizmoMode);
    this.gizmo.showX = s.gizmoMode === 'translate';
    this.gizmo.showY = s.gizmoMode === 'translate';
    this.gizmo.showZ = true;
    this.gizmo.setTranslationSnap(s.snap || null);
    this.gizmo.setRotationSnap(THREE.MathUtils.degToRad(15));
    this.gizmo.space = 'world';
  }

  private dimensionOverlay(box: THREE.Box3) {
    const size = box.getSize(new THREE.Vector3());
    if (size.length() < 1) return;
    const off = Math.max(size.x, size.y, size.z) * 0.08 + 40;
    const mat = new THREE.LineBasicMaterial({ color: 0x0a84ff, depthTest: false, transparent: true });
    const addDim = (a: THREE.Vector3, b: THREE.Vector3, text: string) => {
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 10;
      this.overlay.add(line);
      const div = document.createElement('div');
      div.className = 'dim-label';
      div.textContent = text;
      const lab = new CSS2DObject(div);
      lab.position.copy(a.clone().add(b).multiplyScalar(0.5));
      this.overlay.add(lab);
    };
    const r = (v: number) => `${Math.round(v)}`;
    const { min, max } = box;
    addDim(new THREE.Vector3(min.x, min.y - off, min.z), new THREE.Vector3(max.x, min.y - off, min.z), r(size.x));
    addDim(new THREE.Vector3(max.x + off, min.y, min.z), new THREE.Vector3(max.x + off, max.y, min.z), r(size.y));
    addDim(new THREE.Vector3(min.x - off, min.y, min.z), new THREE.Vector3(min.x - off, min.y, max.z), r(size.z));
  }

  private updateGrid(box: THREE.Box3) {
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, 1000) * 2;
    const step = extent > 20000 ? 1000 : extent > 4000 ? 500 : 100;
    const key = `${Math.ceil(extent / step)}|${step}`;
    if (this.grid.userData.key === key) return;
    this.scene.remove(this.grid);
    const divisions = Math.ceil(extent / step);
    this.grid = new THREE.GridHelper(divisions * step, divisions, 0x9a9083, 0xd5cec4);
    this.grid.rotation.x = Math.PI / 2;
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.5;
    this.grid.userData.key = key;
    const c = box.getCenter(new THREE.Vector3());
    this.grid.position.set(Math.round(c.x / step) * step, Math.round(c.y / step) * step, 0);
    this.scene.add(this.grid);
  }

  bounds(): THREE.Box3 {
    this.root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(this.root);
  }

  fitIds(ids: string[]) {
    const ev=evaluated();
    const set = new Set(ids.flatMap((id) => id.startsWith('gen:')?ev.elements.filter((e) => e.generator===id.slice(4)).map((e) => e.id):id.startsWith('joint:')?(() => {const j=getState().doc.joints.find((j) => j.id===id.slice(6));return j?[j.a,j.b]:[];})():[id]));
    const box = new THREE.Box3();
    this.root.updateMatrixWorld(true);
    for (const g of this.root.children) if (set.has(g.userData.elementId)) box.expandByObject(g);
    if (box.isEmpty()) return;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.resetOrbitTarget(fitCamera(this.camera,box,dir,(this.host.clientWidth||1)/(this.host.clientHeight||1)));
    this.controls.update();
    this.dirty = true;
  }

  fit(view: ViewName = 'iso') {
    const bounds=this.bounds(),box=bounds.isEmpty()?new THREE.Box3(new THREE.Vector3(-500,-500,0),new THREE.Vector3(500,500,500)):bounds;
    this.resetOrbitTarget(fitCamera(this.camera,box,new THREE.Vector3(...VIEW_DIRECTIONS[view]),(this.host.clientWidth||1)/(this.host.clientHeight||1)));
    this.controls.update();
    this.dirty = true;
  }

  pick(clientX: number, clientY: number): string | null {
    return this.pickCandidates(clientX,clientY)[0]??null;
  }

  pickCandidates(clientX:number,clientY:number):string[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o); });
    const hits = this.raycaster.intersectObjects(meshes, false);
    const state=getState();
    return pickPartIds(hits.filter(h=>!state.section.enabled || this.clip.distanceToPoint(h.point)>=0).map(h=>h.object.userData.elementId as string),evaluated().elements,state.selectionFilter);
  }

  /** Point on the horizontal work plane under the cursor. */
  workPoint(clientX: number, clientY: number, z: number): Vec3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const p = new THREE.Vector3();
    const ok = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p);
    return ok ? [p.x, p.y, p.z] : null;
  }

  ray(x: number, y: number): { origin: Vec3; dir: Vec3 } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const o = this.raycaster.ray.origin, d = this.raycaster.ray.direction;
    return { origin: [o.x, o.y, o.z], dir: [d.x, d.y, d.z] };
  }

  pickDetailed(x: number, y: number): { id: string; point: Vec3; normal: Vec3 } | null {
    this.ray(x, y);
    const meshes: THREE.Object3D[] = [];
    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o); });
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits.find((h) => !getState().section.enabled || this.clip.distanceToPoint(h.point) >= 0);
    if (!hit || !hit.face) return null;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    return { id: hit.object.userData.elementId as string, point: [hit.point.x, hit.point.y, hit.point.z], normal: [n.x, n.y, n.z] };
  }

  toScreen(p: Vec3): [number, number] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector3(...p).project(this.camera);
    return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
  }

  render() {
    this.dirty = true;
  }

  snapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}

/** Smoothly open/close one motion group (drawer, door). */
export function animateOpen(group: string, to: number) {
  const from = getState().openGroups[group] ?? 0;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / 350);
    const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
    setState((s) => ({ openGroups: { ...s.openGroups, [group]: v } }));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Commit a gizmo move/rotation to the document. */
function moveTarget(target: { kind: 'gen' | 'els'; ids: string[] }, d: Vec3, rotZ: number, pivot: Vec3) {
  const snap = getState().snap || 1;
  const r = (v: number) => Math.round(v / snap) * snap;
  const delta: Vec3 = [r(d[0]), r(d[1]), r(d[2])];
  updateDoc((doc) => {
    const apply = (f: Frame): Frame => {
      let out = rotZ ? rotateFrame(f, pivot, [0, 0, 1], rotZ) : f;
      out = { ...out, o: [out.o[0] + delta[0], out.o[1] + delta[1], out.o[2] + delta[2]] };
      return out;
    };
    if (target.kind === 'gen') {
      const g = doc.generators.find((x) => x.id === target.ids[0]);
      if (g) g.frame = apply(g.frame);
    } else {
      for (const e of doc.elements) if (target.ids.includes(e.id)) e.frame = apply(e.frame);
    }
  });
}

let active: SceneView | null = null;

export function viewportFit(view: ViewName = 'iso') {
  if(active) active.fit(view);else requestAnimationFrame(()=>active?.fit(view));
}

export function viewportFitIds(ids: string[]) {
  setTimeout(() => active?.fitIds(ids), 50);
}

export function viewportSnapshot(): string | null {
  return active?.snapshot() ?? null;
}

export function viewportWorkPoint(x: number, y: number, z: number): Vec3 | null {
  return active?.workPoint(x, y, z) ?? null;
}

export default function Viewport() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const view = new SceneView(host.current!);
    active = view;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const theme = () => view.applyTheme(document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && media.matches));
    theme();
    media.addEventListener('change', theme);
    const refresh = () => view.update(evaluated(), getState());
    view.configureProjection();view.configureNavigation();
    refresh();
    let last = getState();
    const unsub = subscribe(() => {
      const s = getState();
      const prev = last;
      last = s;
      if(s.cad.projection!==prev.cad.projection) view.configureProjection();
      if(s.cad.navigation!==prev.cad.navigation || s.tool!==prev.tool) view.configureNavigation();
      if (s.tool !== prev.tool) { tools.reset(); }
      const motionOnly = s.doc === prev.doc && s.selection === prev.selection && (s.drawerOpen !== prev.drawerOpen || s.openGroups !== prev.openGroups);
      if (motionOnly) view.updateMotion(s);
      else if (s.doc !== prev.doc || s.selection !== prev.selection || s.colorBy !== prev.colorBy || s.xray !== prev.xray || s.section !== prev.section || s.showLabels !== prev.showLabels || s.gizmoMode !== prev.gizmoMode || s.tool !== prev.tool || s.snap !== prev.snap || s.issueIds !== prev.issueIds || s.visibilityOverrides!==prev.visibilityOverrides || s.isolatedIds!==prev.isolatedIds || s.contextPreview!==prev.contextPreview) refresh();
    });
    const unsubGeom = geom.subscribe(refresh);
    const ro = new ResizeObserver(() => view.resize());
    ro.observe(host.current!);
    let down: { x: number; y: number } | null = null;
    const el = view.renderer.domElement;
    const onDown = (e: PointerEvent) => { view.configureNavigation();down = { x: e.clientX, y: e.clientY }; };
    let rightDown:{x:number;y:number}|null=null;
    const onRightDown=(e:PointerEvent)=>{if(e.button===2)rightDown={x:e.clientX,y:e.clientY};};
    const onContext=(e:MouseEvent)=>{
      e.preventDefault();
      if(rightDown && Math.hypot(e.clientX-rightDown.x,e.clientY-rightDown.y)>4){rightDown=null;return;}
      rightDown=null;
      const ids=view.pickCandidates(e.clientX,e.clientY),state=getState();
      const alreadySelected=resolveSelection(evaluated(),state.selection);
      setState({contextMenu:{x:e.clientX,y:e.clientY,ids},contextPreview:null,hover:null,...(ids[0] && !alreadySelected.includes(ids[0])?{selection:[ids[0]]}:{})});
    };
    const onUp = (e: PointerEvent) => {
      if (view.gizmoBusy) { down = null; return; }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 || e.button !== 0) {down=null;return;}
      down = null;
      if (getState().tool !== 'select') { tools.click(e.clientX, e.clientY); return; }
      const id = view.pick(e.clientX, e.clientY);
      // Own double-click detection (OrbitControls' pointer capture swallows native dblclick in some browsers).
      const now = performance.now();
      if (id && lastClick.id === id && now - lastClick.t < 400) {
        lastClick = { id: '', t: 0 };
        onDbl(id);
        return;
      }
      lastClick = { id: id ?? '', t: now };
      const s = getState();
      if (!id) { setState({ selection: [] }); return; }
      if (e.shiftKey || e.ctrlKey) setState({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] });
      else setState({ selection: [id] });
    };
    let lastClick = { id: '', t: 0 };
    const onDbl = (id: string) => {
      const el2 = evaluated().elements.find((x) => x.id === id);
      if (!el2?.motion) return;
      const g = el2.motion.group;
      const cur = getState().openGroups[g] ?? 0;
      animateOpen(g, cur > 0.5 ? 0 : 1);
    };
    let hoverT = 0;
    const onMove = (e: PointerEvent) => {
      if(getState().contextMenu)return;
      if (getState().tool !== 'select') { if (!e.buttons) tools.move(e.clientX, e.clientY); return; }
      if (e.buttons) { if (getState().hover) setState({ hover: null }); return; }
      const now = performance.now();
      if (now - hoverT < 60) return;
      hoverT = now;
      const id = view.pick(e.clientX, e.clientY);
      const r = el.getBoundingClientRect();
      const cur = getState().hover;
      if (!id) { if (cur) setState({ hover: null }); return; }
      if (!cur || cur.id !== id || Math.abs(cur.x - (e.clientX - r.left)) > 2 || Math.abs(cur.y - (e.clientY - r.top)) > 2) setState({ hover: { id, x: e.clientX - r.left, y: e.clientY - r.top } });
    };
    const onLeave = () => setState({ hover: null });
    view.onMove = (target, delta, rotZ, pivot) => moveTarget(target, delta, rotZ, pivot);
    tools.attach(view);
    el.addEventListener('pointerdown', onDown,true);
    el.addEventListener('pointerdown',onRightDown,true);
    el.addEventListener('contextmenu',onContext);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      unsub();
      unsubGeom();
      ro.disconnect();
      media.removeEventListener('change', theme);
      el.removeEventListener('pointerdown', onDown,true);
      el.removeEventListener('pointerdown',onRightDown,true);
      el.removeEventListener('contextmenu',onContext);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      view.dispose();
      if (active === view) active = null;
    };
  }, []);
  return <div className="viewport" ref={host} />;
}
