// DXF import/export types

import type { Entity } from './entities';

export interface DXFExportOptions {
  version: 'R12' | 'R2000' | 'R2007' | 'R2010' | 'R2018';
  units: 'Millimeters' | 'Centimeters' | 'Meters' | 'Inches' | 'Feet';
  precision: number;
}

export const DEFAULT_DXF_EXPORT_OPTIONS: DXFExportOptions = {
  version: 'R2000',
  units: 'Millimeters',
  precision: 6,
};

export interface DXFImportResult {
  entities: Entity[];
  layers: string[];
  errors: string[];
  warnings: string[];
}

export interface DXFExportResult {
  success: boolean;
  data?: string;
  error?: string;
}

// DXF header variables
export interface DXFHeader {
  acadVer: string;
  insUnits: number;
  luprec: number;
}

// Unit conversion codes
export const UNIT_CODES: Record<string, number> = {
  'Inches': 1,
  'Feet': 2,
  'Miles': 3,
  'Millimeters': 4,
  'Centimeters': 5,
  'Meters': 6,
  'Kilometers': 7,
};

// Version strings
export const ACAD_VERSIONS: Record<string, string> = {
  'R12': 'AC1009',
  'R2000': 'AC1015',
  'R2007': 'AC1021',
  'R2010': 'AC1024',
  'R2018': 'AC1032',
};
