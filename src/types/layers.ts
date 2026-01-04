// Layer management types

import type { EntityID } from './entities';

export interface Layer {
  name: string;
  color: string;
  linetype: string;
  lineweight: number;
  plotStyle: string;
  visible: boolean;
  locked: boolean;
  frozen: boolean;
  plot: boolean;
  description?: string;
}

export interface LayerManagerState {
  layers: Layer[];
  activeLayer: string;
  layerEntities: Record<string, Set<EntityID>>;
}

// Default layer (layer 0 cannot be deleted)
export const DEFAULT_LAYER: Layer = {
  name: '0',
  color: '#ffffff',
  linetype: 'CONTINUOUS',
  lineweight: 0,
  plotStyle: 'Color',
  visible: true,
  locked: false,
  frozen: false,
  plot: true,
};

// Common linetypes
export const LINETYPES = [
  'CONTINUOUS',
  'DASHED',
  'DOTTED',
  'DASHDOT',
  'CENTER',
  'PHANTOM',
  'HIDDEN',
] as const;

// AutoCAD Color Index (ACI) to RGB mapping
export const ACI_COLORS: Record<number, string> = {
  0: '#000000', // BYBLOCK
  1: '#ff0000', // Red
  2: '#ffff00', // Yellow
  3: '#00ff00', // Green
  4: '#00ffff', // Cyan
  5: '#0000ff', // Blue
  6: '#ff00ff', // Magenta
  7: '#ffffff', // White/Black
  8: '#808080', // Gray
  9: '#c0c0c0', // Light Gray
};

// RGB to ACI (simplified)
export const rgbToACI = (rgb: string): number => {
  const colorMap: Record<string, number> = {
    '#ff0000': 1,
    '#ffff00': 2,
    '#00ff00': 3,
    '#00ffff': 4,
    '#0000ff': 5,
    '#ff00ff': 6,
    '#ffffff': 7,
    '#808080': 8,
  };
  return colorMap[rgb.toLowerCase()] || 7;
};

// ACI to RGB
export const aciToRGB = (aci: number): string => {
  return ACI_COLORS[aci] || '#ffffff';
};
