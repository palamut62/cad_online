// Command types and state management

import type { Point, EntityID } from './entities';

// Command types
export type CommandType =
  // Drawing commands
  | 'LINE'
  | 'POLYLINE'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'ARC'
  | 'POLYGON'
  | 'ELLIPSE'
  | 'POINT'
  | 'SPLINE'
  | 'DONUT'
  | 'RAY'
  | 'XLINE'
  // Modify commands
  | 'MOVE'
  | 'COPY'
  | 'ROTATE'
  | 'SCALE'
  | 'MIRROR'
  | 'ERASE'
  | 'OFFSET'
  | 'TRIM'
  | 'EXTEND'
  | 'FILLET'
  | 'CHAMFER'
  | 'STRETCH'
  | 'ARRAY'
  | 'BREAK'
  | 'JOIN'
  | 'EXPLODE'
  // Dimension commands
  | 'DIMLINEAR'
  | 'DIMALIGNED'
  | 'DIMANGULAR'
  | 'DIMRADIUS'
  | 'DIMDIAMETER'
  | 'DIMCONTINUE'
  | 'DIMBASELINE'
  // Text commands
  | 'TEXT'
  | 'MTEXT'
  | 'LEADER'
  // Block commands
  | 'BLOCK'
  | 'WBLOCK'
  | 'INSERT'
  // Hatch commands
  | 'HATCH'
  | 'BOUNDARY'
  // Utility commands
  | 'UNDO'
  | 'REDO'
  | 'ZOOM'
  | 'PAN'
  // Annotate commands
  | 'TABLE'
  // Parametric commands
  | 'GEOMCONSTRAINT_COINCIDENT'
  | 'GEOMCONSTRAINT_PARALLEL'
  | 'GEOMCONSTRAINT_TANGENT'
  // Management commands
  | 'PURGE'
  | 'AUDIT';

export interface CommandState {
  step: number;
  tempPoints: Point[];
  options: Record<string, any>;
  previewEntities?: any[];
}

export interface CommandHistoryItem {
  id: string;
  command: CommandType;
  timestamp: number;
  before: {
    entities: any[];
    selection: Set<EntityID>;
  };
  after: {
    entities: any[];
    selection: Set<EntityID>;
  };
}

// Command aliases map
export const COMMAND_ALIASES: Record<string, CommandType> = {
  'L': 'LINE',
  'LINE': 'LINE',
  'PL': 'POLYLINE',
  'PLINE': 'POLYLINE',
  'RECT': 'RECTANGLE',
  'REC': 'RECTANGLE',
  'RECTANGLE': 'RECTANGLE',
  'C': 'CIRCLE',
  'CIRCLE': 'CIRCLE',
  'A': 'ARC',
  'ARC': 'ARC',
  'POL': 'POLYGON',
  'POLYGON': 'POLYGON',
  'SPL': 'SPLINE',
  'SPLINE': 'SPLINE',
  'DO': 'DONUT',
  'DONUT': 'DONUT',
  'RAY': 'RAY',
  'XL': 'XLINE',
  'XLINE': 'XLINE',
  'M': 'MOVE',
  'MOVE': 'MOVE',
  'CO': 'COPY',
  'CP': 'COPY',
  'COPY': 'COPY',
  'RO': 'ROTATE',
  'ROTATE': 'ROTATE',
  'SC': 'SCALE',
  'SCALE': 'SCALE',
  'MI': 'MIRROR',
  'MIRROR': 'MIRROR',
  'E': 'ERASE',
  'DEL': 'ERASE',
  'ERASE': 'ERASE',
  'O': 'OFFSET',
  'OFFSET': 'OFFSET',
  'TR': 'TRIM',
  'TRIM': 'TRIM',
  'EX': 'EXTEND',
  'EXTEND': 'EXTEND',
  'F': 'FILLET',
  'FILLET': 'FILLET',
  'CHA': 'CHAMFER',
  'CHAMFER': 'CHAMFER',
  'S': 'STRETCH',
  'STRETCH': 'STRETCH',
  'AR': 'ARRAY',
  'ARRAY': 'ARRAY',
  'BR': 'BREAK',
  'BREAK': 'BREAK',
  'J': 'JOIN',
  'JOIN': 'JOIN',
  'X': 'EXPLODE',
  'EXPLODE': 'EXPLODE',
  'DLI': 'DIMLINEAR',
  'DIMLINEAR': 'DIMLINEAR',
  'DAL': 'DIMALIGNED',
  'DIMALIGNED': 'DIMALIGNED',
  'DAN': 'DIMANGULAR',
  'DIMANGULAR': 'DIMANGULAR',
  'DRA': 'DIMRADIUS',
  'DIMRADIUS': 'DIMRADIUS',
  'DDI': 'DIMDIAMETER',
  'DIMDIAMETER': 'DIMDIAMETER',
  'DCO': 'DIMCONTINUE',
  'DIMCONTINUE': 'DIMCONTINUE',
  'DBA': 'DIMBASELINE',
  'DIMBASELINE': 'DIMBASELINE',
  'DT': 'TEXT',
  'TEXT': 'TEXT',
  'MT': 'MTEXT',
  'MTEXT': 'MTEXT',
  'LEADER': 'LEADER',
  'B': 'BLOCK',
  'BLOCK': 'BLOCK',
  'WBLOCK': 'WBLOCK',
  'I': 'INSERT',
  'INSERT': 'INSERT',
  'H': 'HATCH',
  'HATCH': 'HATCH',
  'BO': 'BOUNDARY',
  'BOUNDARY': 'BOUNDARY',
  'U': 'UNDO',
  'UNDO': 'UNDO',
  'R': 'REDO',
  'REDO': 'REDO',
  'Z': 'ZOOM',
  'ZOOM': 'ZOOM',
  'P': 'PAN',
  'PAN': 'PAN',
};
