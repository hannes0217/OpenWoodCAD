import type { Frame } from '../core/math';
import type { OutlinePt, Processing } from '../core/model';
import type { MeshData, Projection } from './kernel';

/** Minimal element description needed to build its local solid. */
export interface SolidSpec {
  sig: string;
  length: number;
  width: number;
  height: number;
  outline?: OutlinePt[];
  procs: Processing[];
}

export interface PlacedSpec extends SolidSpec {
  frame: Frame;
}

export type ViewSpec =
  | { kind: 'plane'; plane: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' }
  | { kind: 'camera'; position: [number, number, number]; direction: [number, number, number]; xAxis: [number, number, number] };

export type WorkerRequest =
  | { id: number; type: 'init' }
  | { id: number; type: 'mesh'; items: SolidSpec[]; tolerance?: number }
  | { id: number; type: 'project'; items: PlacedSpec[]; views: ViewSpec[] }
  | { id: number; type: 'step'; items: (PlacedSpec & { name: string; color?: string })[] }
  | { id: number; type: 'stl'; items: PlacedSpec[] }
  | { id: number; type: 'volume'; items: SolidSpec[] }
  | { id: number; type: 'overlaps'; items: (PlacedSpec & { id: string })[]; pairs: [number, number][] };

export interface MeshResult {
  sig: string;
  mesh: MeshData | null;
  failed: string[];
  error?: string;
}

export type WorkerResponse =
  | { id: number; ok: true; type: 'init' }
  | { id: number; ok: true; type: 'mesh'; results: MeshResult[] }
  | { id: number; ok: true; type: 'project'; projections: Projection[] }
  | { id: number; ok: true; type: 'step' | 'stl'; data: ArrayBuffer }
  | { id: number; ok: true; type: 'volume'; volumes: number[] }
  | { id: number; ok: true; type: 'overlaps'; volumes: number[] }
  | { id: number; ok: false; error: string };
