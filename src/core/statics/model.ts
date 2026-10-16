// Planar frame model for preliminary structural design (Vorbemessung).
// Coordinates in mm in the system plane: x horizontal, z vertical (up).
// Forces in N, distributed loads in N/mm (= kN/m), moments in Nmm.

import type { LoadDuration, ServiceClass } from '../timber';

export interface SNode {
  id: string;
  x: number;
  z: number;
}

export interface SMember {
  id: string;
  name: string;
  n1: string;
  n2: string;
  /** Cross-section width b and height h (h in the system plane). */
  b: number;
  h: number;
  strengthClass: string;
  /** Moment hinge at start / end. */
  hingeStart?: boolean;
  hingeEnd?: boolean;
  /** Buckling length factor in plane (default from system) and lateral restraint spacing. */
  bucklingFactor?: number;
  lateralSpacing?: number;
  /** Linked model element (for colouring results in 3D). */
  elementId?: string;
  /** Deflection limits as span fractions (w_inst, w_net,fin). */
  limitInst?: number;
  limitFin?: number;
}

export interface SSupport {
  node: string;
  ux: boolean;
  uz: boolean;
  ry: boolean;
}

/** Load action categories (EN 1990 / DIN EN 1990/NA). */
export type ActionCategory = 'G' | 'S' | 'W' | 'QA' | 'QH';

export interface LoadCase {
  id: string;
  name: string;
  category: ActionCategory;
}

export interface MemberLoad {
  member: string;
  case: string;
  /**
   * Global components per unit length (N/mm). If `site` is set, qx/qz are multipliers of the
   * site value (snow s in kN/m² resp. wind velocity pressure q_p in kN/m² × c_pe) times the
   * system's load width: q = factor · site value [N/mm²] · loadWidth [mm].
   */
  qx: number;
  qz: number;
  site?: 'snow' | 'wind';
  /** true: per horizontal projected length (snow), false: per member length. */
  projected?: boolean;
  /** true: perpendicular to member (wind pressure) – qz is then the local normal load. */
  normal?: boolean;
}

export interface NodeLoad {
  node: string;
  case: string;
  fx: number;
  fz: number;
  my?: number;
}

export interface StaticSystem {
  id: string;
  name: string;
  nodes: SNode[];
  members: SMember[];
  supports: SSupport[];
  cases: LoadCase[];
  memberLoads: MemberLoad[];
  nodeLoads: NodeLoad[];
  serviceClass: ServiceClass;
  /** Load width (e.g. rafter spacing) in mm for area loads given via `site`. */
  loadWidth?: number;
  /** Roof pitch in degrees (snow shape coefficient). */
  pitch?: number;
  /** External pressure coefficient for wind loads given via `site` (simplified, default 0.6). */
  cpe?: number;
  /** Generator that created the system (re-created on change). */
  generator?: string;
  /** Free text describing assumptions. */
  notes?: string[];
}

export const CATEGORY_DURATION: Record<ActionCategory, LoadDuration> = {
  G: 'permanent',
  S: 'short',
  W: 'short',
  QA: 'medium',
  QH: 'short',
};

/** Combination factors psi0, psi1, psi2 (DIN EN 1990/NA, sites below 1000 m). */
export const PSI: Record<ActionCategory, [number, number, number]> = {
  G: [1, 1, 1],
  S: [0.5, 0.2, 0],
  W: [0.6, 0.2, 0],
  QA: [0.7, 0.5, 0.3],
  QH: [0, 0, 0],
};
