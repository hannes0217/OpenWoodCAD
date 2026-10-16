// Interactive drawing tools: snapping, rubber-band preview, typed lengths.
// The tool controller lives outside React; it talks to the viewport through a small API
// and to the document through updateDoc().

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createBeam, elementCorners } from '../core/elements';
import {
  add, cross, dot, len, neg, norm, scale, sub, toLocal, uid, type Frame, type Vec3,
} from '../core/math';
import type { Element, OutlinePt, Processing } from '../core/model';
import { t } from './i18n';
import { evaluated, getState, setState, toast, updateDoc } from './store';

export type ToolName = 'select' | 'beam' | 'rect' | 'circle' | 'poly' | 'measure' | 'cutRect' | 'cutCircle';

export type SnapKind = 'end' | 'mid' | 'center' | 'face' | 'grid' | 'axis' | 'free';

export interface SnapResult {
  p: Vec3;
  kind: SnapKind;
  elementId?: string;
  normal?: Vec3;
}

/** What the tools need from the 3D view. */
export interface ViewApi {
  ray(x: number, y: number): { origin: Vec3; dir: Vec3 };
  pickDetailed(x: number, y: number): { id: string; point: Vec3; normal: Vec3 } | null;
  toScreen(p: Vec3): [number, number];
  layer: THREE.Group;
  render(): void;
}

interface WorkPlane {
  o: Vec3;
  u: Vec3;
  v: Vec3;
  n: Vec3;
  /** Element whose face defines the plane (for cut-outs). */
  elementId?: string;
}

const AXES: Record<'x' | 'y' | 'z', Vec3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const AXIS_COLORS = { x: 0xe5484d, y: 0x30a46c, z: 0x0090ff };

class ToolController {
  view: ViewApi | null = null;
  points: Vec3[] = [];
  plane: WorkPlane | null = null;
  current: SnapResult | null = null;
  axisLock: 'x' | 'y' | 'z' | null = null;
  input = '';
  measure: { a: Vec3; b: Vec3 } | null = null;

  get tool(): ToolName {
    return getState().tool as ToolName;
  }

  attach(v: ViewApi) {
    this.view = v;
  }

  reset() {
    this.points = [];
    this.plane = null;
    this.current = null;
    this.axisLock = null;
    this.input = '';
    this.measure = null;
    this.clearLayer();
    this.publish();
  }

  private clearLayer() {
    if (!this.view) return;
    for (const c of [...this.view.layer.children]) {
      this.view.layer.remove(c);
      (c as THREE.Mesh).geometry?.dispose?.();
    }
    this.view.render();
  }

  /** Short instruction for the hint bar. */
  hint(): string {
    const de = getState().lang === 'de';
    const n = this.points.length;
    const typed = this.input ? ` · ${de ? 'Eingabe' : 'Input'}: ${this.input}` : '';
    switch (this.tool) {
      case 'beam':
        return (n === 0 ? (de ? 'Startpunkt des Balkens klicken' : 'Click the beam start point') : (de ? 'Endpunkt klicken oder Länge tippen + Enter · X/Y/Z sperrt Richtung' : 'Click end point or type length + Enter · X/Y/Z locks direction')) + typed;
      case 'rect':
      case 'cutRect':
        return (n === 0 ? (de ? 'Erste Ecke klicken (auf eine Fläche = Arbeitsebene)' : 'Click first corner (on a face = work plane)') : (de ? 'Gegenecke klicken oder Maße tippen, z. B. 600x400 + Enter' : 'Click opposite corner or type e.g. 600x400 + Enter')) + typed;
      case 'circle':
      case 'cutCircle':
        return (n === 0 ? (de ? 'Mittelpunkt klicken (auf eine Fläche = Arbeitsebene)' : 'Click centre (on a face = work plane)') : (de ? 'Radius ziehen oder Durchmesser tippen + Enter' : 'Drag radius or type diameter + Enter')) + typed;
      case 'poly':
        return (n === 0 ? (de ? 'Ersten Punkt des Umrisses klicken' : 'Click the first outline point') : (de ? 'Weitere Punkte klicken · Enter oder Klick auf Startpunkt schließt · Länge tippen möglich' : 'Click more points · Enter or click start closes')) + typed;
      case 'measure':
        return n === 0 ? (de ? 'Ersten Punkt klicken' : 'Click first point') : (de ? 'Zweiten Punkt klicken' : 'Click second point');
      default:
        return '';
    }
  }

  private publish() {
    setState({ toolHint: this.hint() });
  }

  // ---------------------------------------------------------------- snapping

  snap(x: number, y: number): SnapResult | null {
    const v = this.view;
    if (!v) return null;
    const s = getState();
    const ray = v.ray(x, y);
    const hit = v.pickDetailed(x, y);
    const R = 12;
    let best: { p: Vec3; kind: SnapKind; d: number; id?: string } | null = null;
    const consider = (p: Vec3, kind: SnapKind, id?: string) => {
      const [sx, sy] = v.toScreen(p);
      const d = Math.hypot(sx - x, sy - y);
      const rank = { end: 0, mid: 1, center: 2, face: 3, grid: 4, axis: 4, free: 5 }[kind];
      if (d > R) return;
      if (!best || d + rank * 3 < best.d + ({ end: 0, mid: 1, center: 2, face: 3, grid: 4, axis: 4, free: 5 }[best.kind]) * 3) best = { p, kind, d, id };
    };
    const ev = evaluated();
    const els = ev.elements.filter((e) => !e.hidden);
    const near = hit ? [els.find((e) => e.id === hit.id)!, ...els.filter((e) => e.id !== hit.id).slice(0, 400)] : els.slice(0, 400);
    for (const e of near) {
      if (!e) continue;
      const c = elementCorners(e);
      c.forEach((p) => consider(p, 'end', e.id));
      const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [i, j] of edges) consider(scale(add(c[i], c[j]), 0.5), 'mid', e.id);
    }
    for (const p of this.points) consider(p, 'end');
    if (best) {
      const b = best as { p: Vec3; kind: SnapKind; id?: string };
      return { p: this.plane ? projectToPlane(b.p, this.plane) : b.p, kind: b.kind, elementId: b.id, normal: hit?.normal };
    }
    if (this.plane) {
      const p = intersectPlane(ray, this.plane);
      if (!p) return null;
      return { p: gridInPlane(p, this.plane, s.snap), kind: 'grid' };
    }
    if (hit) return { p: hit.point.map((c) => Math.round(c)) as Vec3, kind: 'face', elementId: hit.id, normal: hit.normal };
    const ground: WorkPlane = { o: [0, 0, s.workZ], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
    const p = intersectPlane(ray, ground);
    return p ? { p: gridInPlane(p, ground, s.snap), kind: 'grid' } : null;
  }

  /** Apply axis lock / inference relative to the last point. */
  private constrain(sn: SnapResult, x: number, y: number): SnapResult {
    const p0 = this.points.at(-1);
    if (!p0 || !this.view) return sn;
    const lockAxis = this.axisLock;
    if (lockAxis) {
      const ray = this.view.ray(x, y);
      const t0 = closestOnLine(p0, AXES[lockAxis], ray.origin, ray.dir);
      const snapStep = getState().snap || 1;
      return { p: add(p0, scale(AXES[lockAxis], Math.round(t0 / snapStep) * snapStep)), kind: 'axis' };
    }
    if (sn.kind === 'grid' || sn.kind === 'face') {
      const d = sub(sn.p, p0);
      const l = len(d);
      if (l > 1) {
        for (const ax of ['x', 'y', 'z'] as const) {
          if (Math.abs(dot(norm(d), AXES[ax])) > Math.cos((3 * Math.PI) / 180)) {
            const tt = dot(d, AXES[ax]);
            return { p: add(p0, scale(AXES[ax], tt)), kind: 'axis' };
          }
        }
      }
    }
    return sn;
  }

  // ---------------------------------------------------------------- events

  move(x: number, y: number) {
    if (this.tool === 'select') return;
    let sn = this.snap(x, y);
    if (!sn) return;
    if (this.tool !== 'rect' && this.tool !== 'cutRect' && this.tool !== 'circle' && this.tool !== 'cutCircle') sn = this.constrain(sn, x, y);
    this.current = sn;
    this.draw();
  }

  click(x: number, y: number): boolean {
    const tool = this.tool;
    if (tool === 'select') return false;
    let sn = this.snap(x, y);
    if (!sn) return true;
    const planar = tool === 'rect' || tool === 'cutRect' || tool === 'circle' || tool === 'cutCircle' || tool === 'poly';
    if (planar && this.points.length === 0) this.plane = this.planeFrom(sn);
    if (planar && this.plane) sn = { ...sn, p: projectToPlane(sn.p, this.plane) };
    if (!planar || tool === 'poly') sn = this.constrain(sn, x, y);
    this.addPoint(sn.p);
    return true;
  }

  private planeFrom(sn: SnapResult): WorkPlane {
    const s = getState();
    if (sn.elementId && sn.normal) {
      const e = evaluated().elements.find((x) => x.id === sn.elementId);
      const n = norm(sn.normal);
      // In-plane axes from the element frame: pick the two frame axes most perpendicular to n.
      const cands = e ? [e.frame.x, e.frame.y, e.frame.z] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec3[];
      const sorted = [...cands].sort((a, b) => Math.abs(dot(a, n)) - Math.abs(dot(b, n)));
      let u = norm(sub(sorted[0], scale(n, dot(sorted[0], n))));
      let v = cross(n, u);
      if (Math.abs(u[2]) > Math.abs(v[2]) + 1e-6) { const tmp = u; u = v; v = neg(tmp); v = cross(n, u); }
      return { o: sn.p, u, v, n, elementId: sn.elementId };
    }
    return { o: [sn.p[0], sn.p[1], sn.kind === 'grid' ? s.workZ : sn.p[2]], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  }

  private addPoint(p: Vec3) {
    const tool = this.tool;
    this.points.push(p);
    this.input = '';
    if (tool === 'beam' && this.points.length === 2) this.finishBeam(this.points[0], this.points[1]);
    else if ((tool === 'rect' || tool === 'cutRect') && this.points.length === 2) this.finishRect(this.points[0], this.points[1]);
    else if ((tool === 'circle' || tool === 'cutCircle') && this.points.length === 2) this.finishCircle(this.points[0], len(sub(this.points[1], this.points[0])));
    else if (tool === 'measure' && this.points.length === 2) {
      this.measure = { a: this.points[0], b: this.points[1] };
      this.points = [];
    } else if (tool === 'poly' && this.points.length > 2 && len(sub(p, this.points[0])) < 1e-3 + (getState().snap || 1) / 2) {
      this.points.pop();
      this.finishPoly();
    }
    this.draw();
    this.publish();
  }

  key(e: KeyboardEvent): boolean {
    if (this.tool === 'select') return false;
    const k = e.key;
    if (/^[0-9]$/.test(k) || ((k === '.' || k === ',') && this.points.length) || ((k === 'x' || k === '*') && this.input && /rect/i.test(this.tool))) {
      if (this.points.length === 0) return false;
      this.input += k === ',' ? '.' : k === '*' ? 'x' : k;
      this.publish();
      return true;
    }
    if (k === 'Backspace' && this.input) {
      this.input = this.input.slice(0, -1);
      this.publish();
      return true;
    }
    if ((k === 'x' || k === 'y' || k === 'z') && !this.input && this.points.length && (this.tool === 'beam' || this.tool === 'poly' || this.tool === 'measure')) {
      this.axisLock = this.axisLock === k ? null : k;
      this.draw();
      return true;
    }
    if (k === 'Enter') {
      if (this.input) this.applyInput();
      else if (this.tool === 'poly' && this.points.length >= 3) this.finishPoly();
      return true;
    }
    if (k === 'Escape') {
      if (this.points.length || this.measure) { this.reset(); return true; }
      return false;
    }
    return false;
  }

  private applyInput() {
    const txt = this.input;
    this.input = '';
    const p0 = this.points.at(-1);
    if (!p0) return;
    const tool = this.tool;
    if (tool === 'rect' || tool === 'cutRect') {
      const [a, b] = txt.split('x').map(Number);
      if (!(a > 0 && b > 0) || !this.plane) return;
      const cur = this.current?.p ?? add(p0, add(this.plane.u, this.plane.v));
      const du = Math.sign(dot(sub(cur, p0), this.plane.u)) || 1;
      const dv = Math.sign(dot(sub(cur, p0), this.plane.v)) || 1;
      this.addPoint(add(p0, add(scale(this.plane.u, du * a), scale(this.plane.v, dv * b))));
      return;
    }
    const val = Number(txt);
    if (!(val > 0)) return;
    if (tool === 'circle' || tool === 'cutCircle') {
      this.finishCircle(p0, val / 2);
      return;
    }
    const cur = this.current?.p;
    let dir: Vec3 = this.axisLock ? AXES[this.axisLock] : cur && len(sub(cur, p0)) > 1e-6 ? norm(sub(cur, p0)) : [1, 0, 0];
    if (this.axisLock && cur && dot(sub(cur, p0), dir) < 0) dir = neg(dir);
    this.addPoint(add(p0, scale(dir, val)));
  }

  // ---------------------------------------------------------------- results

  private finishBeam(a: Vec3, b: Vec3) {
    const s = getState();
    if (len(sub(b, a)) < 5) { this.points = [a]; return; }
    const e = createBeam(a, b, s.beamSection[0], s.beamSection[1], { name: t('role.beam'), role: 'beam', materialId: s.beamMaterial, align: 'bottom', id: uid('b') });
    updateDoc((d) => d.elements.push(e));
    setState({ selection: [e.id] });
    this.points = [b]; // continue a chain from the end point
  }

  private panelFrame(o: Vec3): Frame {
    const pl = this.plane!;
    return { o, x: pl.u, y: pl.v, z: pl.n };
  }

  private finishRect(a: Vec3, b: Vec3) {
    const pl = this.plane!;
    const du = dot(sub(b, a), pl.u);
    const dv = dot(sub(b, a), pl.v);
    this.points = [];
    if (Math.abs(du) < 1 || Math.abs(dv) < 1) return;
    const o = add(a, add(scale(pl.u, Math.min(0, du)), scale(pl.v, Math.min(0, dv))));
    if (this.tool === 'cutRect') {
      this.cutout(o, Math.abs(du), Math.abs(dv), null);
    } else {
      const s = getState();
      const L = Math.abs(du), W = Math.abs(dv);
      const longU = L >= W;
      const frame = longU ? this.panelFrame(o) : { o: add(o, scale(pl.v, 0)), x: pl.v, y: neg(pl.u), z: pl.n };
      if (!longU) frame.o = add(o, scale(pl.u, L));
      const e: Element = { id: uid('p'), kind: 'panel', name: t('role.board'), role: 'board', frame, length: Math.max(L, W), width: Math.min(L, W), height: s.panelThickness, materialId: s.panelMaterial, processings: [] };
      updateDoc((d) => d.elements.push(e));
      setState({ selection: [e.id] });
    }
    this.plane = null;
  }

  private finishCircle(c: Vec3, r: number) {
    this.points = [];
    if (r < 1) return;
    const pl = this.plane!;
    if (this.tool === 'cutCircle') {
      this.cutout(c, 0, 0, r);
    } else {
      const s = getState();
      const o = sub(c, add(scale(pl.u, r), scale(pl.v, r)));
      const outline: OutlinePt[] = [[2 * r, r, 1], [0, r, 1]];
      const e: Element = { id: uid('p'), kind: 'panel', name: getState().lang === 'de' ? 'Runde Platte' : 'Round panel', role: 'board', frame: this.panelFrame(o), length: 2 * r, width: 2 * r, height: s.panelThickness, materialId: s.panelMaterial, processings: [], outline };
      updateDoc((d) => d.elements.push(e));
      setState({ selection: [e.id] });
    }
    this.plane = null;
  }

  private finishPoly() {
    const pl = this.plane;
    const pts = this.points;
    this.points = [];
    if (!pl || pts.length < 3) return;
    const uv = pts.map((p) => [dot(sub(p, pl.o), pl.u), dot(sub(p, pl.o), pl.v)] as [number, number]);
    const minU = Math.min(...uv.map((p) => p[0])), minV = Math.min(...uv.map((p) => p[1]));
    const maxU = Math.max(...uv.map((p) => p[0])), maxV = Math.max(...uv.map((p) => p[1]));
    let outline: OutlinePt[] = uv.map(([u, v]) => [u - minU, v - minV]);
    // counter-clockwise
    let area = 0;
    for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) outline = outline.reverse();
    const s = getState();
    const o = add(pl.o, add(scale(pl.u, minU), scale(pl.v, minV)));
    const e: Element = { id: uid('p'), kind: 'panel', name: getState().lang === 'de' ? 'Formteil' : 'Shaped part', role: 'board', frame: this.panelFrame(o), length: maxU - minU, width: maxV - minV, height: s.panelThickness, materialId: s.panelMaterial, processings: [], outline };
    updateDoc((d) => d.elements.push(e));
    setState({ selection: [e.id] });
    this.plane = null;
    this.draw();
  }

  /** Rectangular (w×h at corner o) or circular (centre o, radius r) through-cut in the element of the work plane. */
  private cutout(o: Vec3, w: number, h: number, r: number | null) {
    const pl = this.plane!;
    const id = pl.elementId;
    const ev = evaluated();
    const target = id ? ev.elements.find((x) => x.id === id) : undefined;
    const de = getState().lang === 'de';
    if (!target) { toast(de ? 'Ausschnitt: zuerst auf die Fläche eines Bauteils klicken.' : 'Cut-out: click on a part face first.', 'error'); return; }
    if (target.generator) { toast(de ? 'Bauteil gehört zu einer Vorlage – zum Bearbeiten Vorlage auflösen.' : 'Part belongs to a template – explode it to edit.', 'error'); return; }
    const f = target.frame;
    let proc: Processing;
    const ln = norm(toLocalDir(f, pl.n));
    if (r !== null) {
      const p = toLocal(f, add(o, scale(pl.n, 1)));
      proc = { id: uid('pr'), type: 'drilling', geom: 'drill', p, dir: neg(ln), dia: 2 * r, depth: 1e5, through: true, info: { dia: 2 * r } };
    } else {
      const u = norm(toLocalDir(f, pl.u)), v = norm(toLocalDir(f, pl.v));
      const lo = toLocal(f, o);
      const corner = (du: number, dv: number): Vec3 => add(lo, add(scale(u, du), scale(v, dv)));
      proc = {
        id: uid('pr'), type: 'pocket', geom: 'polytope', info: { width: Math.round(w), length: Math.round(h) },
        planes: [
          { p: corner(0, 0), n: neg(u) }, { p: corner(w, 0), n: u },
          { p: corner(0, 0), n: neg(v) }, { p: corner(0, h), n: v },
        ],
      };
    }
    updateDoc((d) => { const el = d.elements.find((x) => x.id === target.id); if (el) el.processings.push(proc); });
    setState({ selection: [target.id] });
    this.plane = null;
  }

  // ---------------------------------------------------------------- preview

  private draw() {
    const v = this.view;
    if (!v) return;
    this.clearLayer();
    const cur = this.current?.p;
    const add3 = (o: THREE.Object3D) => { o.renderOrder = 20; v.layer.add(o); };
    const line = (pts: Vec3[], color = 0x0a84ff, dashed = false) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 20, gapSize: 12, depthTest: false }) : new THREE.LineBasicMaterial({ color, depthTest: false });
      const l = new THREE.Line(g, m);
      if (dashed) l.computeLineDistances();
      add3(l);
    };
    const label = (p: Vec3, text: string, cls = 'dim-label') => {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      const o = new CSS2DObject(div);
      o.position.set(...p);
      add3(o);
    };
    if (this.measure) {
      const { a, b } = this.measure;
      line([a, b], 0xff9500);
      const d = sub(b, a);
      label(scale(add(a, b), 0.5), `${Math.round(len(d) * 10) / 10} mm  (Δx ${Math.round(d[0])} · Δy ${Math.round(d[1])} · Δz ${Math.round(d[2])})`, 'dim-label measure');
    }
    if (cur) {
      const kindSym: Record<SnapKind, string> = { end: '□', mid: '△', center: '○', face: '◇', grid: '+', axis: '↔', free: '·' };
      label(cur, kindSym[this.current!.kind], 'snap-mark');
    }
    const p0 = this.points.at(-1);
    if (this.points.length > 1) line(this.points);
    if (p0 && cur) {
      const tool = this.tool;
      if (tool === 'rect' || tool === 'cutRect') {
        const pl = this.plane!;
        const du = dot(sub(cur, p0), pl.u), dv = dot(sub(cur, p0), pl.v);
        const c1 = add(p0, scale(pl.u, du)), c3 = add(p0, scale(pl.v, dv));
        line([p0, c1, cur, c3, p0], tool === 'cutRect' ? 0xe5484d : 0x0a84ff);
        label(scale(add(p0, c1), 0.5), `${Math.round(Math.abs(du))}`);
        label(scale(add(p0, c3), 0.5), `${Math.round(Math.abs(dv))}`);
      } else if (tool === 'circle' || tool === 'cutCircle') {
        const pl = this.plane!;
        const r = len(sub(cur, p0));
        const pts: Vec3[] = [];
        for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push(add(p0, add(scale(pl.u, Math.cos(a) * r), scale(pl.v, Math.sin(a) * r)))); }
        line(pts, tool === 'cutCircle' ? 0xe5484d : 0x0a84ff);
        line([p0, cur], 0x0a84ff, true);
        label(scale(add(p0, cur), 0.5), `Ø ${Math.round(2 * r)}`);
      } else {
        const color = this.axisLock ? AXIS_COLORS[this.axisLock] : this.current?.kind === 'axis' ? 0x30a46c : 0x0a84ff;
        line([p0, cur], color);
        label(scale(add(p0, cur), 0.5), `${Math.round(len(sub(cur, p0)))}`);
        if (tool === 'beam') this.beamGhost(p0, cur);
      }
    }
    v.render();
  }

  private beamGhost(a: Vec3, b: Vec3) {
    if (len(sub(b, a)) < 5 || !this.view) return;
    const s = getState();
    const e = createBeam(a, b, s.beamSection[0], s.beamSection[1], { name: '', materialId: s.beamMaterial, align: 'bottom' });
    const g = new THREE.BoxGeometry(e.length, e.width, e.height);
    g.translate(e.length / 2, e.width / 2, e.height / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x0a84ff, transparent: true, opacity: 0.25, depthWrite: false }));
    const f = e.frame;
    m.matrixAutoUpdate = false;
    m.matrix.set(f.x[0], f.y[0], f.z[0], f.o[0], f.x[1], f.y[1], f.z[1], f.o[1], f.x[2], f.y[2], f.z[2], f.o[2], 0, 0, 0, 1);
    this.view.layer.add(m);
  }
}

// ------------------------------------------------------------------ helpers

function intersectPlane(ray: { origin: Vec3; dir: Vec3 }, pl: WorkPlane): Vec3 | null {
  const den = dot(ray.dir, pl.n);
  if (Math.abs(den) < 1e-9) return null;
  const tt = dot(sub(pl.o, ray.origin), pl.n) / den;
  if (tt < 0) return null;
  return add(ray.origin, scale(ray.dir, tt));
}

function projectToPlane(p: Vec3, pl: WorkPlane): Vec3 {
  return sub(p, scale(pl.n, dot(sub(p, pl.o), pl.n)));
}

function gridInPlane(p: Vec3, pl: WorkPlane, step: number): Vec3 {
  if (!step) return p;
  const d = sub(p, pl.o);
  const u = Math.round(dot(d, pl.u) / step) * step;
  const v = Math.round(dot(d, pl.v) / step) * step;
  return add(pl.o, add(scale(pl.u, u), scale(pl.v, v)));
}

/** Parameter t on line p0 + t·d closest to the ray. */
function closestOnLine(p0: Vec3, d: Vec3, ro: Vec3, rd: Vec3): number {
  const w0 = sub(p0, ro);
  const a = dot(d, d), b = dot(d, rd), c = dot(rd, rd), dd = dot(d, w0), e = dot(rd, w0);
  const den = a * c - b * b;
  if (Math.abs(den) < 1e-9) return 0;
  return (b * e - c * dd) / den;
}

function toLocalDir(f: Frame, d: Vec3): Vec3 {
  return [dot(d, f.x), dot(d, f.y), dot(d, f.z)];
}

export const tools = new ToolController();
