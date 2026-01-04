// Snap (OSNAP) types

import type { Point, Entity } from './entities';

export type SnapMode =
  | 'ENDPOINT'
  | 'MIDPOINT'
  | 'CENTER'
  | 'NODE'
  | 'QUADRANT'
  | 'INTERSECTION'
  | 'INSERTION'
  | 'PERPENDICULAR'
  | 'TANGENT'
  | 'NEAREST'
  | 'APARENT'
  | 'PARALLEL';

export interface SnapPoint {
  point: Point;
  mode: SnapMode;
  entity?: Entity;
  markerColor?: string;
}

export interface SnapSettings {
  enabled: boolean;
  modes: Set<SnapMode>;
  apertureSize: number; // pixels
  magnetEnabled: boolean;
  magnetStrength: number; // pixels (0-1)
}

export interface SnapResult {
  snapped: boolean;
  point: Point;
  mode?: SnapMode;
  entity?: Entity;
}

// Default snap settings
export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  modes: new Set<SnapMode>(['ENDPOINT', 'MIDPOINT', 'CENTER', 'INTERSECTION']),
  apertureSize: 10,
  magnetEnabled: true,
  magnetStrength: 0.5,
};

// Snap marker colors per mode
export const SNAP_COLORS: Record<SnapMode, string> = {
  ENDPOINT: '#00FF00',
  MIDPOINT: '#00FFFF',
  CENTER: '#FF00FF',
  NODE: '#FFFF00',
  QUADRANT: '#FF8000',
  INTERSECTION: '#FF0000',
  INSERTION: '#0080FF',
  PERPENDICULAR: '#FF00FF',
  TANGENT: '#00FF00',
  NEAREST: '#FFFFFF',
  APARENT: '#808080',
  PARALLEL: '#00FFFF',
};

// Snap marker shapes per mode
export const SNAP_SHAPES: Record<SnapMode, 'square' | 'triangle' | 'circle' | 'cross' | 'diamond'> = {
  ENDPOINT: 'square',
  MIDPOINT: 'triangle',
  CENTER: 'circle',
  NODE: 'cross',
  QUADRANT: 'square',
  INTERSECTION: 'cross',
  INSERTION: 'circle',
  PERPENDICULAR: 'triangle',
  TANGENT: 'triangle',
  NEAREST: 'circle',
  APARENT: 'square',
  PARALLEL: 'triangle',
};
