import type { Entity, Point } from '../types/entities';

/**
 * Calculate the shortest distance from a point to a line segment
 */
export const distancePointToLineSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) // in case of 0 length line
    param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find the closest point on an entity to a given point
 * Returns the distance to the entity
 */
export const closestPointOnEntity = (px: number, py: number, ent: Entity): number => {
  if (ent.type === 'LINE') {
    const start = ent.start;
    const end = ent.end;
    return distancePointToLineSegment(px, py, start[0], start[1], end[0], end[1]);
  } else if (ent.type === 'CIRCLE') {
    const dx = px - ent.center[0];
    const dy = py - ent.center[1];
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(distToCenter - ent.radius);
  } else if (ent.type === 'ELLIPSE') {
    // Approximate ellipse as circle for distance calculation
    const dx = px - ent.center[0];
    const dy = py - ent.center[1];
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    const avgRadius = (ent.rx + ent.ry) / 2;
    return Math.abs(distToCenter - avgRadius);
  } else if (ent.type === 'LWPOLYLINE') {
    let minDist = Infinity;
    const verts = ent.vertices;
    for (let i = 0; i < verts.length - 1; i++) {
      const d = distancePointToLineSegment(
        px, py,
        verts[i][0], verts[i][1],
        verts[i + 1][0], verts[i + 1][1]
      );
      if (d < minDist) minDist = d;
    }
    if (ent.closed && verts.length > 1) {
      const d = distancePointToLineSegment(
        px, py,
        verts[verts.length - 1][0], verts[verts.length - 1][1],
        verts[0][0], verts[0][1]
      );
      if (d < minDist) minDist = d;
    }
    return minDist;
  } else if (ent.type === 'ARC') {
    // Approximate as circle for now
    const dx = px - ent.center[0];
    const dy = py - ent.center[1];
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(distToCenter - ent.radius);
  } else if (ent.type === 'POINT') {
    const dx = px - ent.position[0];
    const dy = py - ent.position[1];
    return Math.sqrt(dx * dx + dy * dy);
  } else if (ent.type === 'SPLINE') {
    // SPLINE için kontrol noktaları veya fit noktaları arasındaki segmentlere mesafe
    const points = ent.controlPoints || ent.fitPoints || [];
    if (points.length < 2) return Infinity;

    let minDist = Infinity;

    // Kontrol noktalarına olan mesafe
    for (const pt of points) {
      const dx = px - pt[0];
      const dy = py - pt[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }

    // Kontrol noktaları arasındaki segmentlere mesafe (yaklaşık)
    for (let i = 0; i < points.length - 1; i++) {
      const d = distancePointToLineSegment(
        px, py,
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1]
      );
      if (d < minDist) minDist = d;
    }

    // Kapalı spline ise son-ilk segment
    if (ent.closed && points.length > 2) {
      const d = distancePointToLineSegment(
        px, py,
        points[points.length - 1][0], points[points.length - 1][1],
        points[0][0], points[0][1]
      );
      if (d < minDist) minDist = d;
    }

    return minDist;
  } else if (ent.type === 'HATCH') {
    // Hatch için boundary polyline'ını kullan
    if (!ent.boundary) {
      return Infinity;
    }

    // Get vertices - handle both direct vertices and LWPolyline boundary
    const verts = ent.boundary.vertices || (ent.boundary as any);

    if (!verts || !Array.isArray(verts) || verts.length < 3) {
      return Infinity;
    }

    let minEdgeDist = Infinity;

    // Boundary kenarlarına olan mesafe
    for (let i = 0; i < verts.length; i++) {
      const curr = verts[i];
      const next = verts[(i + 1) % verts.length];

      // Handle both Point tuple and object formats
      const x1 = Array.isArray(curr) ? curr[0] : (curr as any).x || 0;
      const y1 = Array.isArray(curr) ? curr[1] : (curr as any).y || 0;
      const x2 = Array.isArray(next) ? next[0] : (next as any).x || 0;
      const y2 = Array.isArray(next) ? next[1] : (next as any).y || 0;

      const d = distancePointToLineSegment(px, py, x1, y1, x2, y2);
      if (d < minEdgeDist) minEdgeDist = d;
    }

    // Convert vertices to Point format for isPointInsidePolygon
    const pointVerts: Point[] = verts.map((v: any) => {
      if (Array.isArray(v) && v.length >= 2) return [v[0], v[1], v[2] || 0] as Point;
      return [v.x || 0, v.y || 0, v.z || 0] as Point;
    });

    // Noktanın hatch içinde olup olmadığını kontrol et
    if (isPointInsidePolygon(px, py, pointVerts)) {
      // HATCH içindeyse - 0 mesafe döndür (kesin seçim)
      return 0;
    }

    // Dışarıdaysa kenar mesafesi
    return minEdgeDist;
  } else if (ent.type === 'DONUT') {
    const dx = px - ent.center[0];
    const dy = py - ent.center[1];
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    // İç veya dış çembere olan mesafe
    const distToInner = Math.abs(distToCenter - ent.innerRadius);
    const distToOuter = Math.abs(distToCenter - ent.outerRadius);
    return Math.min(distToInner, distToOuter);
  } else if (ent.type === 'TEXT') {
    // TEXT için position noktasına olan mesafe + metin alanı tahmini
    const textWidth = ent.text.length * ent.height * 0.6; // Yaklaşık karakter genişliği
    const textHeight = ent.height;
    const pos = ent.position;

    // Metin kutusunun içinde mi?
    const rotation = ent.rotation || 0;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    // Noktayı metin koordinat sistemine dönüştür
    const dx = px - pos[0];
    const dy = py - pos[1];
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Metin kutusu içinde mi kontrol et
    if (localX >= 0 && localX <= textWidth && localY >= 0 && localY <= textHeight) {
      return 0;
    }

    // En yakın kenar noktasına mesafe
    const clampedX = Math.max(0, Math.min(textWidth, localX));
    const clampedY = Math.max(0, Math.min(textHeight, localY));
    return Math.sqrt((localX - clampedX) ** 2 + (localY - clampedY) ** 2);
  } else if (ent.type === 'MTEXT') {
    // MTEXT için genişlik ve yükseklik kullanarak alan hesapla
    const textWidth = ent.width;
    const lineCount = (ent.text.match(/\n/g) || []).length + 1;
    const textHeight = lineCount * ent.height * 1.2; // Line spacing ile
    const pos = ent.position;

    const rotation = ent.rotation || 0;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const dx = px - pos[0];
    const dy = py - pos[1];
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // MTEXT üstten başlar (anchorY: top)
    if (localX >= 0 && localX <= textWidth && localY <= 0 && localY >= -textHeight) {
      return 0;
    }

    const clampedX = Math.max(0, Math.min(textWidth, localX));
    const clampedY = Math.max(-textHeight, Math.min(0, localY));
    return Math.sqrt((localX - clampedX) ** 2 + (localY - clampedY) ** 2);
  } else if (ent.type === 'TABLE') {
    // TABLE için tüm tablo alanını kontrol et
    const { position, rows, cols, rowHeight, colWidth, rotation = 0 } = ent;
    const tableWidth = cols * colWidth;
    const tableHeight = rows * rowHeight;

    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const dx = px - position[0];
    const dy = py - position[1];
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Tablo alanı içinde mi? (y aşağı doğru gider)
    if (localX >= 0 && localX <= tableWidth && localY <= 0 && localY >= -tableHeight) {
      return 0;
    }

    // En yakın kenar mesafesi
    const clampedX = Math.max(0, Math.min(tableWidth, localX));
    const clampedY = Math.max(-tableHeight, Math.min(0, localY));
    return Math.sqrt((localX - clampedX) ** 2 + (localY - clampedY) ** 2);
  } else if (ent.type === 'DIMENSION') {
    // DIMENSION için dimension line ve text'e tıklanabilirlik
    const { start, end, dimLinePosition, textHeight = 5, text, dimType } = ent;

    // Calculate precise geometry
    // Note: We need to import calculateDimensionGeometry but we are in utils.
    // Let's implement robust hit testing based on simplified but generous bounding boxes.

    let minDist = Infinity;

    // 1. Text Area Hit Test
    if (dimLinePosition) {
      // Text is usually at dimLinePosition
      const tLen = (text?.length || 1) * (textHeight * 0.6); // approximate width
      const tH = textHeight;

      // Check distance to text center point
      const dToText = Math.sqrt(Math.pow(px - dimLinePosition[0], 2) + Math.pow(py - dimLinePosition[1], 2));

      // If inside text box (generous)
      if (px >= dimLinePosition[0] - tLen / 2 - 1 && px <= dimLinePosition[0] + tLen / 2 + 1 &&
        py >= dimLinePosition[1] - tH / 2 - 1 && py <= dimLinePosition[1] + tH / 2 + 1) {
        return 0;
      }

      minDist = Math.min(minDist, dToText);

      // 2. Extension Lines and Dimension Line Hit Test
      // Linear/Aligned
      if (dimType === 'DIMLINEAR' || dimType === 'DIMALIGNED') {
        // Calculate offset points roughly
        // We know start->dimStart and end->dimEnd are extension lines

        // Direction of dimension line (roughly parallel to start->end)
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = len > 0 ? dx / len : 1;
        const uy = len > 0 ? dy / len : 0;
        // Perpendicular
        const px_dir = -uy;
        const py_dir = ux;

        // Projection of dimLinePosition onto perpendicular from start
        // Vector from start to dimLinePosition
        const vSx = dimLinePosition[0] - start[0];
        const vSy = dimLinePosition[1] - start[1];
        // Dot product with perpendicular
        const distPerp = vSx * px_dir + vSy * py_dir;

        // dimStart is start + distPerp * perpDir
        const dimStart: [number, number] = [start[0] + distPerp * px_dir, start[1] + distPerp * py_dir];
        const dimEnd: [number, number] = [end[0] + distPerp * px_dir, end[1] + distPerp * py_dir];

        // Start Extension Line
        const dExt1 = distancePointToLineSegment(px, py, start[0], start[1], dimStart[0], dimStart[1]);
        // End Extension Line
        const dExt2 = distancePointToLineSegment(px, py, end[0], end[1], dimEnd[0], dimEnd[1]);
        // Dimension Line
        const dDimLine = distancePointToLineSegment(px, py, dimStart[0], dimStart[1], dimEnd[0], dimEnd[1]);

        minDist = Math.min(minDist, dExt1, dExt2, dDimLine);
      } else if (dimType === 'DIMRADIUS' || dimType === 'DIMDIAMETER') {
        // Line from center (start) to dimLinePosition
        const dLine = distancePointToLineSegment(px, py, start[0], start[1], dimLinePosition[0], dimLinePosition[1]);
        minDist = Math.min(minDist, dLine);
      }
    }

    return minDist;
  }
  return Infinity;
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
const isPointInsidePolygon = (px: number, py: number, vertices: Point[]): boolean => {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];

    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Calculate distance between two points
 */
export const distance = (p1: Point, p2: Point): number => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate distance between two 2D points (ignoring Z)
 */
export const distance2D = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate midpoint between two points
 */
export const midpoint = (p1: Point, p2: Point): Point => {
  return [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2,
    (p1[2] + p2[2]) / 2,
  ];
};

/**
 * Calculate angle between two points (in radians)
 */
export const angle = (p1: Point, p2: Point): number => {
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
};

/**
 * Convert degrees to radians
 */
export const degToRad = (degrees: number): number => {
  return degrees * Math.PI / 180;
};

/**
 * Convert radians to degrees
 */
export const radToDeg = (radians: number): number => {
  return radians * 180 / Math.PI;
};

/**
 * Rotate a point around a center (using coordinates)
 */
export const rotatePoint = (point: Point, cx: number, cy: number, angleRad: number): Point => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  return [
    cx + dx * cos - dy * sin,
    cy + dx * sin + dy * cos,
    point[2] || 0,
  ];
};

/**
 * Rotate a point around a center (using Point array)
 */
export const rotatePointAround = (point: Point, center: Point, angleRad: number): Point => {
  return rotatePoint(point, center[0], center[1], angleRad);
};

/**
 * Scale a point from a center (using coordinates)
 */
export const scalePoint = (point: Point, cx: number, cy: number, factor: number): Point => {
  return [
    cx + (point[0] - cx) * factor,
    cy + (point[1] - cy) * factor,
    point[2] || 0,
  ];
};

/**
 * Scale a point from a center (using Point array)
 */
export const scalePointFromCenter = (point: Point, center: Point, factor: number): Point => {
  return [
    center[0] + (point[0] - center[0]) * factor,
    center[1] + (point[1] - center[1]) * factor,
    center[2] + (point[2] - center[2]) * factor,
  ];
};

/**
 * Translate a point by delta
 */
export const translatePoint = (point: Point, dx: number, dy: number, dz: number = 0): Point => {
  return [point[0] + dx, point[1] + dy, point[2] + dz];
};

/**
 * Mirror a point across a line defined by two points (using coordinates)
 */
export const mirrorPoint = (point: Point, x1: number, y1: number, x2: number, y2: number): Point => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 0.0001) return point;

  const t = ((point[0] - x1) * dx + (point[1] - y1) * dy) / lenSq;
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return [2 * closestX - point[0], 2 * closestY - point[1], point[2] || 0];
};

/**
 * Mirror a point across a line defined by two points (using Point arrays)
 */
export const mirrorPointByPoints = (point: Point, lineP1: Point, lineP2: Point): Point => {
  return mirrorPoint(point, lineP1[0], lineP1[1], lineP2[0], lineP2[1]);
};

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 */
export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Calculate the centroid of a polygon
 */
export const polygonCentroid = (vertices: Point[]): Point => {
  let cx = 0, cy = 0, cz = 0;
  const n = vertices.length;

  for (const v of vertices) {
    cx += v[0];
    cy += v[1];
    cz += v[2] || 0;
  }

  return [cx / n, cy / n, cz / n];
};

/**
 * Calculate polygon area
 */
export const polygonArea = (vertices: Point[]): number => {
  let area = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }

  return Math.abs(area / 2);
};

/**
 * Normalize an angle to 0-2PI range
 */
export const normalizeAngle = (angle: number): number => {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
};

/**
 * Check if two angles are equal (with tolerance)
 */
export const anglesEqual = (a1: number, a2: number, tolerance: number = 0.0001): boolean => {
  const diff = Math.abs(normalizeAngle(a1) - normalizeAngle(a2));
  return diff < tolerance || diff > Math.PI * 2 - tolerance;
};

export type SnapType = 'ENDPOINT' | 'MIDPOINT' | 'CENTER' | 'NEAREST' | 'INTERSECTION';

export interface SnapPoint {
  type: SnapType;
  point: Point;
}

/**
 * Get snap points for an entity
 */
export const getSnapPoints = (ent: Entity): SnapPoint[] => {
  const snaps: SnapPoint[] = [];

  if (ent.type === 'LINE') {
    snaps.push({ type: 'ENDPOINT', point: ent.start });
    snaps.push({ type: 'ENDPOINT', point: ent.end });
    snaps.push({ type: 'MIDPOINT', point: midpoint(ent.start, ent.end) });
  } else if (ent.type === 'LWPOLYLINE') {
    ent.vertices.forEach((v, i) => {
      snaps.push({ type: 'ENDPOINT', point: v });
      if (i < ent.vertices.length - 1) {
        snaps.push({ type: 'MIDPOINT', point: midpoint(v, ent.vertices[i + 1]) });
      } else if (ent.closed) {
        snaps.push({ type: 'MIDPOINT', point: midpoint(v, ent.vertices[0]) });
      }
    });
  } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
    snaps.push({ type: 'CENTER', point: ent.center });
    // Quadrants could be added here
  } else if (ent.type === 'POINT') {
    snaps.push({ type: 'ENDPOINT', point: ent.position }); // Points act as endpoints
  } else if (ent.type === 'SPLINE') {
    // SPLINE için kontrol/fit noktaları
    const points = ent.controlPoints || ent.fitPoints || [];
    points.forEach((pt, i) => {
      snaps.push({ type: 'ENDPOINT', point: pt });
      if (i < points.length - 1) {
        snaps.push({ type: 'MIDPOINT', point: midpoint(pt, points[i + 1]) });
      }
    });
    if (ent.closed && points.length > 2) {
      snaps.push({ type: 'MIDPOINT', point: midpoint(points[points.length - 1], points[0]) });
    }
  }

  return snaps;
};

/**
 * Find the closest snap point to the cursor
 */
export const getClosestSnapPoint = (
  cursor: Point,
  entities: Entity[],
  threshold: number = 1.0
): SnapPoint | null => {
  let bestSnap: SnapPoint | null = null;
  let minD = threshold;

  entities.forEach(ent => {
    if (!ent.visible) return;
    const snaps = getSnapPoints(ent);
    snaps.forEach(snap => {
      const d = distance2D(cursor[0], cursor[1], snap.point[0], snap.point[1]);
      if (d < minD) {
        minD = d;
        bestSnap = snap;
      }
    });
  });

  return bestSnap;
};

export interface AlignmentGuide {
  type: 'x' | 'y'; // x = vertical line at x, y = horizontal line at y
  value: number; // coordinate value
  point: Point; // source snap point
}

/**
 * Find alignment guides (horizontal/vertical) from entities snap points
 */
export const findAlignmentPoints = (
  cursor: Point,
  entities: Entity[],
  extraPoints: Point[] = [],
  threshold: number = 0.5
): { x?: AlignmentGuide, y?: AlignmentGuide } => {
  let guideX: AlignmentGuide | undefined;
  let guideY: AlignmentGuide | undefined;
  let minDx = threshold;
  let minDy = threshold;

  const checkPoint = (pt: Point) => {
    // Check Vertical Alignment (matches X)
    const dx = Math.abs(cursor[0] - pt[0]);
    if (dx < minDx) {
      minDx = dx;
      guideX = { type: 'x', value: pt[0], point: pt };
    }

    // Check Horizontal Alignment (matches Y)
    const dy = Math.abs(cursor[1] - pt[1]);
    if (dy < minDy) {
      minDy = dy;
      guideY = { type: 'y', value: pt[1], point: pt };
    }
  };

  // Check extra points first (e.g. tempPoints) - higher priority
  extraPoints.forEach(checkPoint);

  // Check entities
  entities.forEach(ent => {
    if (!ent.visible) return;
    const snaps = getSnapPoints(ent);
    snaps.forEach(snap => checkPoint(snap.point));
  });

  return { x: guideX, y: guideY };
};

export interface GripPoint {
  point: Point;
  type: 'start' | 'end' | 'mid' | 'center' | 'vertex' | 'quadrant' | 'origin';
  index?: number; // For vertices in polylines
}

/**
 * Get grip points for an entity
 */
export const getGripPoints = (ent: Entity): GripPoint[] => {
  const grips: GripPoint[] = [];

  if (ent.type === 'LINE') {
    grips.push({ point: ent.start, type: 'start' });
    grips.push({ point: ent.end, type: 'end' });
    grips.push({ point: midpoint(ent.start, ent.end), type: 'mid' });
  } else if (ent.type === 'CIRCLE') {
    grips.push({ point: ent.center, type: 'center' });
    // Add quadrants
    const r = ent.radius;
    grips.push({ point: [ent.center[0] + r, ent.center[1], ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0] - r, ent.center[1], ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0], ent.center[1] + r, ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0], ent.center[1] - r, ent.center[2] || 0], type: 'quadrant' });
  } else if (ent.type === 'ARC') {
    grips.push({ point: ent.center, type: 'center' });
    const p1: Point = [ent.center[0] + Math.cos(ent.startAngle) * ent.radius, ent.center[1] + Math.sin(ent.startAngle) * ent.radius, 0];
    const p2: Point = [ent.center[0] + Math.cos(ent.endAngle) * ent.radius, ent.center[1] + Math.sin(ent.endAngle) * ent.radius, 0];
    grips.push({ point: p1, type: 'start' });
    grips.push({ point: p2, type: 'end' });

    // Midpoint of arc
    let midAngle = (ent.startAngle + ent.endAngle) / 2;
    if (ent.endAngle < ent.startAngle) midAngle += Math.PI; // Correct for crossing 0
    // Actually, arc implementation details vary. Let's simplify: simple average might be wrong if crossing 2PI.
    // Assuming standardized angles in 0-2PI or similar. 
    // Normalized midpoint:
    // ...
  } else if (ent.type === 'LWPOLYLINE') {
    ent.vertices.forEach((v, i) => {
      grips.push({ point: v, type: 'vertex', index: i });
      // Midpoints for polylines? Maybe later.
    });
  } else if (ent.type === 'POINT') {
    grips.push({ point: ent.position, type: 'center' });
  } else if (ent.type === 'ELLIPSE') {
    grips.push({ point: ent.center, type: 'center' });
    grips.push({ point: [ent.center[0] + ent.rx, ent.center[1], 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0], ent.center[1] + ent.ry, 0], type: 'quadrant' });
  } else if (ent.type === 'SPLINE') {
    // SPLINE için kontrol/fit noktaları
    const points = ent.controlPoints || ent.fitPoints || [];
    points.forEach((pt, i) => {
      grips.push({ point: pt, type: 'vertex', index: i });
    });
  } else if (ent.type === 'HATCH') {
    // Hatch için boundary köşe noktalarını grip olarak ekle
    if (ent.boundary && ent.boundary.vertices) {
      ent.boundary.vertices.forEach((v, i) => {
        grips.push({ point: v, type: 'vertex', index: i });
      });
    }
  } else if (ent.type === 'DONUT') {
    grips.push({ point: ent.center, type: 'center' });
    // Dış çember quadrant noktaları
    const r = ent.outerRadius;
    grips.push({ point: [ent.center[0] + r, ent.center[1], ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0] - r, ent.center[1], ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0], ent.center[1] + r, ent.center[2] || 0], type: 'quadrant' });
    grips.push({ point: [ent.center[0], ent.center[1] - r, ent.center[2] || 0], type: 'quadrant' });
  } else if (ent.type === 'TEXT') {
    // TEXT için origin noktası (insertion point)
    grips.push({ point: ent.position, type: 'origin' });
    // Metin sonu için yaklaşık grip
    const textWidth = ent.text.length * ent.height * 0.6;
    const rotation = ent.rotation || 0;
    const endX = ent.position[0] + textWidth * Math.cos(rotation);
    const endY = ent.position[1] + textWidth * Math.sin(rotation);
    grips.push({ point: [endX, endY, ent.position[2] || 0], type: 'end' });
  } else if (ent.type === 'MTEXT') {
    // MTEXT için 4 köşe grip noktası
    const pos = ent.position;
    const width = ent.width;
    const lineCount = (ent.text.match(/\n/g) || []).length + 1;
    const height = lineCount * ent.height * 1.2;
    const rotation = ent.rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Sol üst (origin)
    grips.push({ point: pos, type: 'origin' });
    // Sağ üst
    grips.push({ point: [pos[0] + width * cos, pos[1] + width * sin, pos[2] || 0], type: 'vertex', index: 0 });
    // Sol alt
    grips.push({ point: [pos[0] - height * sin, pos[1] - height * cos, pos[2] || 0], type: 'vertex', index: 1 });
    // Sağ alt
    grips.push({ point: [pos[0] + width * cos - height * sin, pos[1] + width * sin - height * cos, pos[2] || 0], type: 'vertex', index: 2 });
  } else if (ent.type === 'TABLE') {
    // TABLE için köşe noktaları
    const { position, rows, cols, rowHeight, colWidth, rotation = 0 } = ent;
    const tableWidth = cols * colWidth;
    const tableHeight = rows * rowHeight;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Sol üst (origin)
    grips.push({ point: position, type: 'origin' });
    // Sağ üst
    grips.push({ point: [position[0] + tableWidth * cos, position[1] + tableWidth * sin, position[2] || 0], type: 'vertex', index: 0 });
    // Sol alt
    grips.push({ point: [position[0] + tableHeight * sin, position[1] - tableHeight * cos, position[2] || 0], type: 'vertex', index: 1 });
    // Sağ alt
    grips.push({ point: [position[0] + tableWidth * cos + tableHeight * sin, position[1] + tableWidth * sin - tableHeight * cos, position[2] || 0], type: 'vertex', index: 2 });
  } else if (ent.type === 'DIMENSION') {
    // DIMENSION için grip noktaları
    const { start, end, dimLinePosition, dimType, center } = ent;

    // Definition points
    grips.push({ point: start, type: 'start' });
    grips.push({ point: end, type: 'end' });

    // Dimension line position (metin ve çizgi yüksekliği)
    if (dimLinePosition) {
      grips.push({ point: dimLinePosition, type: 'vertex', index: 0 });
    }

    // Orta nokta
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    grips.push({ point: [midX, midY, 0], type: 'mid' });

    // Angular için center
    if (dimType === 'DIMANGULAR' && center) {
      grips.push({ point: center, type: 'center' });
    }
  }

  return grips;
};

/**
 * Check if a point is inside a box defined by min and max points
 */
export const isPointInBox = (p: Point, min: Point, max: Point): boolean => {
  return p[0] >= min[0] && p[0] <= max[0] &&
    p[1] >= min[1] && p[1] <= max[1];
};

/** 
 * Helper to check if entity is completely inside box (Window Selection)
 */
export const isEntityInBox = (ent: Entity, min: Point, max: Point): boolean => {
  if (ent.type === 'LINE') {
    return isPointInBox(ent.start, min, max) && isPointInBox(ent.end, min, max);
  } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
    const r = ent.radius;
    return ent.center[0] - r >= min[0] && ent.center[0] + r <= max[0] &&
      ent.center[1] - r >= min[1] && ent.center[1] + r <= max[1];
  } else if (ent.type === 'LWPOLYLINE') {
    return ent.vertices.every(v => isPointInBox(v, min, max));
  } else if (ent.type === 'POINT') {
    return isPointInBox(ent.position, min, max);
  } else if (ent.type === 'SPLINE') {
    const points = ent.controlPoints || ent.fitPoints || [];
    if (points.length === 0) return false;
    return points.every(v => isPointInBox(v, min, max));
  } else if (ent.type === 'HATCH') {
    if (!ent.boundary || !ent.boundary.vertices) return false;
    return ent.boundary.vertices.every(v => isPointInBox(v, min, max));
  } else if (ent.type === 'DONUT') {
    const r = ent.outerRadius;
    return ent.center[0] - r >= min[0] && ent.center[0] + r <= max[0] &&
      ent.center[1] - r >= min[1] && ent.center[1] + r <= max[1];
  } else if (ent.type === 'ELLIPSE') {
    return ent.center[0] - ent.rx >= min[0] && ent.center[0] + ent.rx <= max[0] &&
      ent.center[1] - ent.ry >= min[1] && ent.center[1] + ent.ry <= max[1];
  } else if (ent.type === 'TEXT') {
    // TEXT için basit bounding box kontrolü
    const textWidth = ent.text.length * ent.height * 0.6;
    const textHeight = ent.height;
    const pos = ent.position;
    return pos[0] >= min[0] && pos[0] + textWidth <= max[0] &&
      pos[1] >= min[1] && pos[1] + textHeight <= max[1];
  } else if (ent.type === 'MTEXT') {
    // MTEXT için bounding box kontrolü
    const lineCount = (ent.text.match(/\n/g) || []).length + 1;
    const textHeight = lineCount * ent.height * 1.2;
    const pos = ent.position;
    return pos[0] >= min[0] && pos[0] + ent.width <= max[0] &&
      pos[1] - textHeight >= min[1] && pos[1] <= max[1];
  } else if (ent.type === 'TABLE') {
    // TABLE için bounding box kontrolü
    const tableWidth = ent.cols * ent.colWidth;
    const tableHeight = ent.rows * ent.rowHeight;
    const pos = ent.position;
    return pos[0] >= min[0] && pos[0] + tableWidth <= max[0] &&
      pos[1] - tableHeight >= min[1] && pos[1] <= max[1];
  } else if (ent.type === 'DIMENSION') {
    // DIMENSION için tüm noktaların kutu içinde olup olmadığını kontrol et
    const { start, end, dimLinePosition } = ent;
    return isPointInBox(start, min, max) &&
      isPointInBox(end, min, max) &&
      (!dimLinePosition || isPointInBox(dimLinePosition, min, max));
  }
  return false;
};

/**
 * Helper to check if entity intersects box (Crossing Selection)
 */
export const doesEntityIntersectBox = (ent: Entity, min: Point, max: Point): boolean => {
  if (isEntityInBox(ent, min, max)) return true;

  if (ent.type === 'LINE') {
    const lineMinX = Math.min(ent.start[0], ent.end[0]);
    const lineMaxX = Math.max(ent.start[0], ent.end[0]);
    const lineMinY = Math.min(ent.start[1], ent.end[1]);
    const lineMaxY = Math.max(ent.start[1], ent.end[1]);

    if (lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1]) return false;
    return true;
  } else if (ent.type === 'CIRCLE') {
    const closestX = Math.max(min[0], Math.min(ent.center[0], max[0]));
    const closestY = Math.max(min[1], Math.min(ent.center[1], max[1]));
    const dx = closestX - ent.center[0];
    const dy = closestY - ent.center[1];
    return (dx * dx + dy * dy) <= (ent.radius * ent.radius);
  } else if (ent.type === 'LWPOLYLINE') {
    for (let i = 0; i < ent.vertices.length - 1; i++) {
      const p1 = ent.vertices[i];
      const p2 = ent.vertices[i + 1];
      const lineMinX = Math.min(p1[0], p2[0]);
      const lineMaxX = Math.max(p1[0], p2[0]);
      const lineMinY = Math.min(p1[1], p2[1]);
      const lineMaxY = Math.max(p1[1], p2[1]);
      if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) return true;
    }
    if (ent.closed) {
      const p1 = ent.vertices[ent.vertices.length - 1];
      const p2 = ent.vertices[0];
      const lineMinX = Math.min(p1[0], p2[0]);
      const lineMaxX = Math.max(p1[0], p2[0]);
      const lineMinY = Math.min(p1[1], p2[1]);
      const lineMaxY = Math.max(p1[1], p2[1]);
      if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) return true;
    }
    return false;
  } else if (ent.type === 'POINT') {
    return isPointInBox(ent.position, min, max);
  } else if (ent.type === 'SPLINE') {
    const points = ent.controlPoints || ent.fitPoints || [];
    if (points.length === 0) return false;
    // Check if any segment intersects the box
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const lineMinX = Math.min(p1[0], p2[0]);
      const lineMaxX = Math.max(p1[0], p2[0]);
      const lineMinY = Math.min(p1[1], p2[1]);
      const lineMaxY = Math.max(p1[1], p2[1]);
      if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) return true;
    }
    // Kapalı spline
    if (ent.closed && points.length > 2) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      const lineMinX = Math.min(p1[0], p2[0]);
      const lineMaxX = Math.max(p1[0], p2[0]);
      const lineMinY = Math.min(p1[1], p2[1]);
      const lineMaxY = Math.max(p1[1], p2[1]);
      if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) return true;
    }
    return false;
  } else if (ent.type === 'HATCH') {
    if (!ent.boundary || !ent.boundary.vertices) return false;
    // Check if any edge intersects the box
    const verts = ent.boundary.vertices;
    for (let i = 0; i < verts.length; i++) {
      const p1 = verts[i];
      const p2 = verts[(i + 1) % verts.length];
      const lineMinX = Math.min(p1[0], p2[0]);
      const lineMaxX = Math.max(p1[0], p2[0]);
      const lineMinY = Math.min(p1[1], p2[1]);
      const lineMaxY = Math.max(p1[1], p2[1]);
      if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) return true;
    }
    return false;
  } else if (ent.type === 'DONUT') {
    const closestX = Math.max(min[0], Math.min(ent.center[0], max[0]));
    const closestY = Math.max(min[1], Math.min(ent.center[1], max[1]));
    const dx = closestX - ent.center[0];
    const dy = closestY - ent.center[1];
    return (dx * dx + dy * dy) <= (ent.outerRadius * ent.outerRadius);
  } else if (ent.type === 'ELLIPSE') {
    // Approximate as bounding box
    const eMinX = ent.center[0] - ent.rx;
    const eMaxX = ent.center[0] + ent.rx;
    const eMinY = ent.center[1] - ent.ry;
    const eMaxY = ent.center[1] + ent.ry;
    return !(eMaxX < min[0] || eMinX > max[0] || eMaxY < min[1] || eMinY > max[1]);
  } else if (ent.type === 'DIMENSION') {
    // DIMENSION için herhangi bir noktası kutu ile kesişiyorsa seç
    const { start, end, dimLinePosition } = ent;

    // Start ve end noktaları arasındaki çizgi
    const lineMinX = Math.min(start[0], end[0]);
    const lineMaxX = Math.max(start[0], end[0]);
    const lineMinY = Math.min(start[1], end[1]);
    const lineMaxY = Math.max(start[1], end[1]);

    if (!(lineMaxX < min[0] || lineMinX > max[0] || lineMaxY < min[1] || lineMinY > max[1])) {
      return true;
    }

    // Dimension line position da kontrol et
    if (dimLinePosition) {
      const dimMinX = Math.min(start[0], end[0], dimLinePosition[0]);
      const dimMaxX = Math.max(start[0], end[0], dimLinePosition[0]);
      const dimMinY = Math.min(start[1], end[1], dimLinePosition[1]);
      const dimMaxY = Math.max(start[1], end[1], dimLinePosition[1]);

      if (!(dimMaxX < min[0] || dimMinX > max[0] || dimMaxY < min[1] || dimMinY > max[1])) {
        return true;
      }
    }

    return false;
  }
  return false;
};

/**
 * Scale an entity by a given factor
 */
export const scaleEntity = (ent: Entity, factor: number): Entity => {
  // Deep clone to avoid mutation
  const e = JSON.parse(JSON.stringify(ent));

  if (e.type === 'LINE') {
    e.start = [e.start[0] * factor, e.start[1] * factor, e.start[2] * factor];
    e.end = [e.end[0] * factor, e.end[1] * factor, e.end[2] * factor];
  } else if (e.type === 'CIRCLE' || e.type === 'ARC') {
    e.center = [e.center[0] * factor, e.center[1] * factor, (e.center[2] || 0) * factor];
    e.radius *= factor;
  } else if (e.type === 'ELLIPSE') {
    e.center = [e.center[0] * factor, e.center[1] * factor, (e.center[2] || 0) * factor];
    e.rx *= factor;
    e.ry *= factor;
  } else if (e.type === 'LWPOLYLINE') {
    e.vertices = e.vertices.map((v: Point) => [v[0] * factor, v[1] * factor, v[2] * factor]);
  } else if (e.type === 'POINT') {
    e.position = [e.position[0] * factor, e.position[1] * factor, e.position[2] * factor];
  } else if (e.type === 'TEXT' || e.type === 'MTEXT') {
    e.position = [e.position[0] * factor, e.position[1] * factor, e.position[2] * factor];
    if (e.height) e.height *= factor;
  } else if (e.type === 'DIMENSION') {
    if (e.defPoint) e.defPoint = [e.defPoint[0] * factor, e.defPoint[1] * factor, e.defPoint[2] * factor];
    if (e.textPoint) e.textPoint = [e.textPoint[0] * factor, e.textPoint[1] * factor, e.textPoint[2] * factor];
  } else if (e.type === 'BLOCK') {
    if (e.position) e.position = [e.position[0] * factor, e.position[1] * factor, e.position[2] * factor];
  } else if (e.type === 'TABLE') {
    if (e.position) e.position = [e.position[0] * factor, e.position[1] * factor, e.position[2] * factor];
    if (e.width) e.width *= factor;
    if (e.height) e.height *= factor;
    if (e.rowHeight) e.rowHeight *= factor;
    if (e.colWidth) e.colWidth *= factor;
  }

  return e;
};
