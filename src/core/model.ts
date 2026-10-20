import type { Frame, Plane, Vec3 } from './math';

// =====================================================================
// Document model (persisted as JSON, file extension .owc).
// All lengths in millimetres, angles in degrees where user-facing.
// =====================================================================

export const FORMAT = 'openwoodcad';
export const FORMAT_VERSION = 6;

export interface Localized {
  de: string;
  en: string;
}

/** A translatable message: i18n key plus arguments. */
export interface Msg {
  key: string;
  args?: Record<string, string | number>;
}

// --------------------------------------------------------------- elements

/** beam = linear member (Kantholz, Balken, Latte, Brett); panel = sheet part. */
export type ElementKind = 'beam' | 'panel';

/** Edges of a panel: x0 = end face at x=0, x1 at x=L, y0 at y=0, y1 at y=W. */
export type EdgeId = 'x0' | 'x1' | 'y0' | 'y1';

/** Outline vertex: [x, y] or [x, y, bulge]. */
export type OutlinePt = [number, number] | [number, number, number];

export interface Element {
  id: string;
  /** Optional driving 2D profile; frame is the sketch origin, dimensions are derived. */
  sketch?: import('./sketch').ParametricSketch;
  kind: ElementKind;
  name: string;
  /** Semantic role (rafter, purlin, side, front …) – drives lists, colours, statics. */
  role?: string;
  /** Local frame. Base body is the box [0,L]×[0,W]×[0,H] in this frame. */
  frame: Frame;
  length: number;
  width: number;
  height: number;
  /**
   * Optional panel outline in local XY (counter-clockwise), replaces the rectangle.
   * A third value is the DXF-style bulge of the segment to the next point (tan(angle/4), + = CCW arc).
   */
  outline?: OutlinePt[];
  materialId: string;
  edges?: Partial<Record<EdgeId, boolean>>;
  /** Processings entered explicitly (joint processings are derived, not stored). */
  processings: Processing[];
  groupId?: string;
  color?: string;
  hidden?: boolean;
  /** Set for elements created by a generator. */
  generator?: string;
  /** Moves together with other parts of the same group in the 3D view (drawers). */
  motion?: { group: string; dir: Vec3; travel: number; rotation?: { pivot: Vec3; axis: Vec3; angle: number } };
  /** Free key/value data (e.g. assembly hints). */
  tags?: Record<string, string>;
}

// ------------------------------------------------------------ processings

/**
 * Semantic processing types. The names follow BTLx where a counterpart exists
 * so the machine export stays a direct mapping.
 */
export type ProcessingType =
  | 'endCut'
  | 'jackRafterCut'
  | 'doubleCut'
  | 'ridgeValleyCut'
  | 'longitudinalCut'
  | 'birdsMouth'
  | 'lap'
  | 'notch'
  | 'house'
  | 'slot'
  | 'mortise'
  | 'tenon'
  | 'dovetailTenon'
  | 'dovetailMortise'
  | 'stepJoint'
  | 'stepJointNotch'
  | 'drilling'
  | 'groove'
  | 'rabbet'
  | 'pocket'
  | 'chamfer'
  | 'miter'
  | 'marking';

interface ProcBase {
  id: string;
  /** A disabled explicit operation is retained in the editable feature tree. */
  suppressed?: boolean;
  type: ProcessingType;
  /** Joint that produced this processing (derived processings only). */
  jointId?: string;
  /** Key figures for lists and machine export (width, depth, angle …). */
  info?: Record<string, number | string>;
}

/** Removes the half-space on the side the plane normal points to. */
export interface CutGeom extends ProcBase {
  geom: 'cut';
  plane: Plane;
}

/** Removes the convex region where every plane has the point on its inner side (n·(q−p) ≤ 0). */
export interface PolytopeGeom extends ProcBase {
  geom: 'polytope';
  planes: Plane[];
}

/** Cylindrical hole from p along dir. */
export interface DrillGeom extends ProcBase {
  geom: 'drill';
  p: Vec3;
  dir: Vec3;
  dia: number;
  depth: number;
  through: boolean;
}

/** Removes the half-space except a convex region (tenons, dovetails). */
export interface CutExceptGeom extends ProcBase {
  geom: 'cutExcept';
  plane: Plane;
  keep: Plane[];
}

export type Processing = CutGeom | PolytopeGeom | DrillGeom | CutExceptGeom;

// ----------------------------------------------------------------- joints

export type JointType =
  | 'trim'
  | 'miter'
  | 'house'
  | 'birdsMouth'
  | 'lap'
  | 'tenon'
  | 'dovetail'
  | 'stepJoint'
  | 'dowel'
  | 'confirmat'
  | 'screw';

export type ParamValue = number | string | boolean;

export interface Joint {
  id: string;
  /** Suppression persists an override of a generator-provided joint. */
  suppressed?: boolean;
  type: JointType;
  /** Element that is processed first / the "incoming" member. */
  a: string;
  /** Element A connects to. */
  b: string;
  params: Record<string, ParamValue>;
  generator?: string;
}

// ------------------------------------------------------------- generators

export interface GeneratorInstance {
  /** Local translations keyed by stable generator-local part ID (without instance prefix). */
  partOffsets?: Record<string, Vec3>;
  id: string;
  type: string;
  name: string;
  /** Placement of the generated assembly in the world. */
  frame: Frame;
  params: Record<string, ParamValue>;
  hidden?: boolean;
  groupId?: string;
}

// ------------------------------------------------------------------ misc

export interface Group {
  id: string;
  name: string;
  parent?: string;
  hidden?: boolean;
  /** Local placement relative to parent; absent in legacy documents = identity. */
  frame?: Frame;
}

export interface HardwareUse {
  itemId: string;
  qty: number;
  /** Owner (generator or joint id) for traceability. */
  source?: string;
}

export interface SiteInfo {
  /** Height above sea level in m – snow load. */
  altitude: number;
  /** Snow load zone per DIN EN 1991-1-3/NA: 1, 1a, 2, 2a, 3. */
  snowZone: string;
  /** Wind zone per DIN EN 1991-1-4/NA: 1–4. */
  windZone: number;
  /** Terrain: inland, coast, islands (simplified velocity pressure). */
  terrain: 'inland' | 'coast' | 'islands';
}

export interface ProjectInfo {
  name: string;
  customer?: string;
  address?: string;
  author?: string;
  notes?: string;
  site: SiteInfo;
}

export interface Settings {
  /** Saw kerf for nesting. */
  kerf: number;
  /** Trim on each sheet edge. */
  sheetTrim: number;
  /** Extra length per timber piece (cut allowance). */
  timberAllowance: number;
  /** Extra waste factor on purchased quantities (0.1 = 10 %). */
  wasteFactor: number;
  currency: string;
  /** Hourly rate for labour costing. */
  labourRate: number;
  /** Overhead and profit surcharges (fractions). */
  overhead: number;
  profit: number;
  vat: number;
}

/** User price overrides by catalog id. */
export type PriceOverrides = Record<string, number>;

export interface DrawingPointRef { elementId?: string; corner: number }
export interface DrawingDimension { id: string; a: DrawingPointRef; b: DrawingPointRef; orientation: 'h' | 'v' | 'aligned'; offset: number }
export interface DrawingView {
  id: string; title: string; view: 'front' | 'side' | 'top';
  sectionOffset?: number;
  /** Window in unscaled view coordinates, v positive upwards. */
  detail?: { u: number; v: number; width: number; height: number };
  dimensions: DrawingDimension[];
}

export interface OwcDocument {
  format: typeof FORMAT;
  version: number;
  project: ProjectInfo;
  elements: Element[];
  joints: Joint[];
  generators: GeneratorInstance[];
  groups: Group[];
  drawingViews?: DrawingView[];
  hardware: HardwareUse[];
  prices: PriceOverrides;
  /** User-defined catalog additions. */
  customMaterials: import('./catalog').Material[];
  settings: Settings;
  statics: import('./statics/model').StaticSystem[];
}

export function defaultSettings(): Settings {
  return {
    kerf: 4,
    sheetTrim: 10,
    timberAllowance: 20,
    wasteFactor: 0.1,
    currency: 'EUR',
    labourRate: 55,
    overhead: 0.15,
    profit: 0.1,
    vat: 0.19,
  };
}

export function emptyDocument(name = 'Neues Projekt'): OwcDocument {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    project: { name, site: { altitude: 300, snowZone: '2', windZone: 2, terrain: 'inland' } },
    elements: [],
    joints: [],
    generators: [],
    groups: [],
    hardware: [],
    prices: {},
    customMaterials: [],
    settings: defaultSettings(),
    statics: [],
  };
}
