// Core entity types for the CAD application

export type EntityID = number;

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Point as tuple for efficiency
export type Point = [number, number, number]; // [x, y, z]

// Base entity interface
export interface BaseEntity {
  id: EntityID;
  type: EntityType;
  color: string;
  layer: string;
  selected?: boolean;
  visible?: boolean;
  locked?: boolean;
  lineType?: string; // e.g. 'continuous', 'dashed'
  lineWeight?: number; // e.g. 1
}

// Entity types
export type EntityType =
  | 'LINE'
  | 'LWPOLYLINE'
  | 'CIRCLE'
  | 'ARC'
  | 'ELLIPSE'
  | 'POINT'
  | 'SPLINE'
  | 'RAY'
  | 'XLINE'
  | 'DONUT'
  | 'TEXT'
  | 'MTEXT'
  | 'DIMENSION'
  | 'HATCH'
  | 'BLOCK_REFERENCE'
  | 'INSERT'
  | 'TABLE';

// Specific entity interfaces
export interface LineEntity extends BaseEntity {
  type: 'LINE';
  start: Point;
  end: Point;
  thickness?: number;
}

export interface LWPolylineEntity extends BaseEntity {
  type: 'LWPOLYLINE';
  vertices: Point[];
  closed: boolean;
  width?: number;
  constantWidth?: number;
}

export interface CircleEntity extends BaseEntity {
  type: 'CIRCLE';
  center: Point;
  radius: number;
  thickness?: number;
}

export interface ArcEntity extends BaseEntity {
  type: 'ARC';
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness?: number;
}

export interface EllipseEntity extends BaseEntity {
  type: 'ELLIPSE';
  center: Point;
  rx: number; // Major axis radius
  ry: number; // Minor axis radius
  rotation: number; // Rotation angle in radians
}

export interface PointEntity extends BaseEntity {
  type: 'POINT';
  position: Point;
}

export interface SplineEntity extends BaseEntity {
  type: 'SPLINE';
  controlPoints: Point[];
  degree: number;
  closed: boolean;
  fitPoints?: Point[];
  knots?: number[];
}

export interface RayEntity extends BaseEntity {
  type: 'RAY';
  origin: Point;
  direction: Point; // Direction vector
}

export interface XlineEntity extends BaseEntity {
  type: 'XLINE';
  origin: Point;
  direction: Point; // Direction vector (infinite both ways)
}

export interface DonutEntity extends BaseEntity {
  type: 'DONUT';
  center: Point;
  innerRadius: number;
  outerRadius: number;
}

export interface TableCellStyle {
  textHeight?: number;
  textColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  fontWeight?: 'normal' | 'bold';
}

export interface TableEntity extends BaseEntity {
  type: 'TABLE';
  position: Point; // Top-left corner
  rows: number;
  cols: number;
  rowHeight: number;
  colWidth: number;
  rotation?: number;
  cellData?: string[][]; // 2D array of cell contents [row][col]
  cellStyles?: TableCellStyle[][]; // 2D array of cell styles
  headerRow?: boolean; // İlk satır başlık mı?
  columnWidths?: number[]; // Farklı sütun genişlikleri
  rowHeights?: number[]; // Farklı satır yükseklikleri
}

export interface TextStyle {
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  widthFactor?: number; // Karakter genişlik faktörü (default: 1)
  oblique?: number; // Eğiklik açısı (derece)
}

export interface TextEntity extends BaseEntity {
  type: 'TEXT';
  position: Point;
  text: string;
  height: number;
  rotation?: number;
  style?: string;
  justification?: 'left' | 'center' | 'right' | 'aligned' | 'middle' | 'fit';
  textStyle?: TextStyle;
  annotative?: boolean; // Ölçek bağımsız mı?
}

export interface MTextEntity extends BaseEntity {
  type: 'MTEXT';
  position: Point;
  text: string;
  width: number;
  height: number;
  rotation?: number;
  style?: string;
  lineSpacing?: number;
  lineSpacingStyle?: 'atLeast' | 'exact'; // Satır aralığı stili
  attachment?: 'topLeft' | 'topCenter' | 'topRight' | 'middleLeft' | 'middleCenter' | 'middleRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';
  textStyle?: TextStyle;
  backgroundColor?: string;
  backgroundFill?: boolean;
}

export interface DimensionEntity extends BaseEntity {
  type: 'DIMENSION';
  dimType: DimensionType;
  start: Point;
  end: Point;
  textPosition?: Point; // For custom placement
  text?: string; // Override text
  textHeight?: number;
  arrowSize?: number;
  extensionLineOffset?: number; // Gap from object
  extensionLineExtend?: number; // Extension past dim line

  // Specific properties
  dimLinePosition?: Point; // Defines the height/offset of the dimension line
  rotation?: number; // For aligned/rotated linear dimensions

  // For Angular
  center?: Point;
  startAngle?: number;
  endAngle?: number;

  // Extended dimension settings
  arrowStyle?: 'closed' | 'open' | 'dot' | 'arrowDot' | 'architectural' | 'none';
  arrowDirection?: 'inside' | 'outside' | 'both';
  arrowSizeMultiplier?: number;
  dimLineColor?: string;
  extLineColor?: string;
  arrowColor?: string;
  textColor?: string;
  dimLineWeight?: number;
  extLineWeight?: number;
  textAlignment?: 'above' | 'below' | 'center' | 'left' | 'right';
  precision?: string; // Decimal format
  unit?: string; // Unit for display
  showUnit?: boolean;
}

export type DimensionType =
  | 'DIMLINEAR'
  | 'DIMALIGNED'
  | 'DIMANGULAR'
  | 'DIMRADIUS'
  | 'DIMDIAMETER'
  | 'DIMCONTINUE'
  | 'DIMBASELINE';

export interface HatchEntity extends BaseEntity {
  type: 'HATCH';
  boundary: LWPolylineEntity; // Outer boundary as closed polyline
  islands?: LWPolylineEntity[]; // Inner boundaries (holes) that are not hatched
  pattern: HatchPattern;
  scale: number;
  rotation: number;
  opacity?: number;
}

export interface HatchPattern {
  name: string;
  type: 'user-defined' | 'predefined';
  angle?: number;
}

export interface BlockReferenceEntity extends BaseEntity {
  type: 'BLOCK_REFERENCE' | 'INSERT';
  blockName: string;
  position: Point;
  scale: Point;
  rotation: number;
  attributes?: Record<string, string>;
}

// Union type of all entities
export type Entity =
  | LineEntity
  | LWPolylineEntity
  | CircleEntity
  | ArcEntity
  | EllipseEntity
  | PointEntity
  | SplineEntity
  | RayEntity
  | XlineEntity
  | DonutEntity
  | TextEntity
  | MTextEntity
  | DimensionEntity
  | HatchEntity
  | BlockReferenceEntity
  | TableEntity;

// Type guards
export const isLineEntity = (entity: Entity): entity is LineEntity =>
  entity.type === 'LINE';

export const isPolylineEntity = (entity: Entity): entity is LWPolylineEntity =>
  entity.type === 'LWPOLYLINE';

export const isCircleEntity = (entity: Entity): entity is CircleEntity =>
  entity.type === 'CIRCLE';

export const isArcEntity = (entity: Entity): entity is ArcEntity =>
  entity.type === 'ARC';

export const isEllipseEntity = (entity: Entity): entity is EllipseEntity =>
  entity.type === 'ELLIPSE';

export const isPointEntity = (entity: Entity): entity is PointEntity =>
  entity.type === 'POINT';

export const isTextEntity = (entity: Entity): entity is TextEntity =>
  entity.type === 'TEXT';

export const isDimensionEntity = (entity: Entity): entity is DimensionEntity =>
  entity.type === 'DIMENSION';

export const isSplineEntity = (entity: Entity): entity is SplineEntity =>
  entity.type === 'SPLINE';

export const isRayEntity = (entity: Entity): entity is RayEntity =>
  entity.type === 'RAY';

export const isXlineEntity = (entity: Entity): entity is XlineEntity =>
  entity.type === 'XLINE';

export const isDonutEntity = (entity: Entity): entity is DonutEntity =>
  entity.type === 'DONUT';

export const isTableEntity = (entity: Entity): entity is TableEntity =>
  entity.type === 'TABLE';
