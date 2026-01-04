import type { Point, Entity } from '../types/entities';

/**
 * Intersection point result
 */
export interface IntersectionResult {
  point: Point;
  t1?: number; // Parameter on first entity
  t2?: number; // Parameter on second entity
}

/**
 * Find intersection between two line segments (p1-p2 and p3-p4)
 */
export function lineLineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): IntersectionResult | null {
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const x3 = p3[0], y3 = p3[1];
  const x4 = p4[0], y4 = p4[1];

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0001) {
    // Lines are parallel
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return {
    point: [x1 + t * (x2 - x1), y1 + t * (y2 - y1), 0],
    t1: t,
    t2: u,
  };
}

/**
 * Check if intersection point is on line segment
 */
export function isPointOnSegment(point: Point, segStart: Point, segEnd: Point, tolerance = 0.0001): boolean {
  const t = lineLineIntersection(segStart, segEnd, point, point);
  if (!t) return false;

  const param = ((point[0] - segStart[0]) * (segEnd[0] - segStart[0]) +
                 (point[1] - segStart[1]) * (segEnd[1] - segStart[1]));
  const lenSq = Math.pow(segEnd[0] - segStart[0], 2) + Math.pow(segEnd[1] - segStart[1], 2);

  if (Math.abs(lenSq) < tolerance) return false;

  const tVal = param / lenSq;
  return tVal >= -tolerance && tVal <= 1 + tolerance;
}

/**
 * Find intersection between line and circle
 */
export function lineCircleIntersection(
  lineStart: Point,
  lineEnd: Point,
  circleCenter: Point,
  circleRadius: number
): IntersectionResult[] {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const fx = lineStart[0] - circleCenter[0];
  const fy = lineStart[1] - circleCenter[1];

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circleRadius * circleRadius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return [];
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  const results: IntersectionResult[] = [];

  if (t1 >= 0 && t1 <= 1) {
    results.push({
      point: [lineStart[0] + t1 * dx, lineStart[1] + t1 * dy, 0],
      t1: t1,
    });
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
    results.push({
      point: [lineStart[0] + t2 * dx, lineStart[1] + t2 * dy, 0],
      t1: t2,
    });
  }

  return results;
}

/**
 * Find intersection between two circles
 */
export function circleCircleIntersection(
  center1: Point,
  radius1: number,
  center2: Point,
  radius2: number
): IntersectionResult[] {
  const dx = center2[0] - center1[0];
  const dy = center2[1] - center1[1];
  const d = Math.sqrt(dx * dx + dy * dy);

  // Circles too far apart or one contains the other
  if (d > radius1 + radius2 || d < Math.abs(radius1 - radius2) || d === 0) {
    return [];
  }

  const a = (radius1 * radius1 - radius2 * radius2 + d * d) / (2 * d);
  const h = Math.sqrt(radius1 * radius1 - a * a);

  const x2 = center1[0] + a * dx / d;
  const y2 = center1[1] + a * dy / d;

  const results: IntersectionResult[] = [];

  results.push({
    point: [x2 + h * dy / d, y2 - h * dx / d, 0],
  });

  if (h > 0.0001) {
    results.push({
      point: [x2 - h * dy / d, y2 + h * dx / d, 0],
    });
  }

  return results;
}

/**
 * Find intersection between arc and line
 */
export function arcLineIntersection(
  arcCenter: Point,
  arcRadius: number,
  arcStartAngle: number,
  arcEndAngle: number,
  lineStart: Point,
  lineEnd: Point
): IntersectionResult[] {
  const circleIntersections = lineCircleIntersection(lineStart, lineEnd, arcCenter, arcRadius);

  return circleIntersections.filter(result => {
    const angle = Math.atan2(result.point[1] - arcCenter[1], result.point[0] - arcCenter[0]);

    // Normalize angles
    let normalizedAngle = angle;
    let normalizedStart = arcStartAngle;
    let normalizedEnd = arcEndAngle;

    if (normalizedEnd < normalizedStart) {
      normalizedEnd += Math.PI * 2;
    }
    if (normalizedAngle < normalizedStart) {
      normalizedAngle += Math.PI * 2;
    }

    return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd;
  });
}

/**
 * Find intersection between two arcs
 */
export function arcArcIntersection(
  center1: Point,
  radius1: number,
  startAngle1: number,
  endAngle1: number,
  center2: Point,
  radius2: number,
  startAngle2: number,
  endAngle2: number
): IntersectionResult[] {
  const circleIntersections = circleCircleIntersection(center1, radius1, center2, radius2);

  return circleIntersections.filter(result => {
    const angle1 = Math.atan2(result.point[1] - center1[1], result.point[0] - center1[0]);
    const angle2 = Math.atan2(result.point[1] - center2[1], result.point[0] - center2[0]);

    // Check if point is on first arc
    let normAngle1 = angle1;
    let normStart1 = startAngle1;
    let normEnd1 = endAngle1;

    if (normEnd1 < normStart1) {
      normEnd1 += Math.PI * 2;
    }
    if (normAngle1 < normStart1) {
      normAngle1 += Math.PI * 2;
    }

    const onArc1 = normAngle1 >= normStart1 && normAngle1 <= normEnd1;

    // Check if point is on second arc
    let normAngle2 = angle2;
    let normStart2 = startAngle2;
    let normEnd2 = endAngle2;

    if (normEnd2 < normStart2) {
      normEnd2 += Math.PI * 2;
    }
    if (normAngle2 < normStart2) {
      normAngle2 += Math.PI * 2;
    }

    const onArc2 = normAngle2 >= normStart2 && normAngle2 <= normEnd2;

    return onArc1 && onArc2;
  });
}

/**
 * Find closest point on entity to a given point (returns coordinates)
 */
export function closestPointOnEntityCoord(x: number, y: number, entity: Entity): Point {
  const point: Point = [x, y, 0];

  switch (entity.type) {
    case 'LINE': {
      return projectPointOnLine(point, entity.start, entity.end);
    }
    case 'CIRCLE': {
      const dx = x - entity.center[0];
      const dy = y - entity.center[1];
      const angle = Math.atan2(dy, dx);
      return [
        entity.center[0] + Math.cos(angle) * entity.radius,
        entity.center[1] + Math.sin(angle) * entity.radius,
        entity.center[2] || 0,
      ];
    }
    case 'ARC': {
      const dx = x - entity.center[0];
      const dy = y - entity.center[1];
      const angle = Math.atan2(dy, dx);
      // Clamp angle to arc range
      let clampedAngle = angle;
      let start = entity.startAngle;
      let end = entity.endAngle;

      if (end < start) {
        end += Math.PI * 2;
      }
      if (clampedAngle < start) {
        clampedAngle += Math.PI * 2;
      }
      clampedAngle = Math.max(start, Math.min(end, clampedAngle));

      return [
        entity.center[0] + Math.cos(clampedAngle) * entity.radius,
        entity.center[1] + Math.sin(clampedAngle) * entity.radius,
        entity.center[2] || 0,
      ];
    }
    case 'LWPOLYLINE': {
      let closestPoint: Point | null = null;
      let minDist = Infinity;

      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const pt = projectPointOnLine(point, entity.vertices[i], entity.vertices[i + 1]);
        const d = Math.sqrt(
          Math.pow(pt[0] - x, 2) + Math.pow(pt[1] - y, 2)
        );
        if (d < minDist) {
          minDist = d;
          closestPoint = pt;
        }
      }

      if (entity.closed && entity.vertices.length > 2) {
        const pt = projectPointOnLine(
          point,
          entity.vertices[entity.vertices.length - 1],
          entity.vertices[0]
        );
        const dist = Math.sqrt(
          Math.pow(pt[0] - x, 2) + Math.pow(pt[1] - y, 2)
        );
        if (dist < minDist) {
          closestPoint = pt;
        }
      }

      return closestPoint || point;
    }
    default:
      return point;
  }
}

/**
 * Project point onto line segment
 */
export function projectPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const dz = lineEnd[2] - lineStart[2];
  const lenSq = dx * dx + dy * dy + dz * dz;

  if (lenSq < 0.0001) return lineStart;

  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy + (point[2] - lineStart[2]) * dz) / lenSq;

  const clampedT = Math.max(0, Math.min(1, t));
  return [
    lineStart[0] + clampedT * dx,
    lineStart[1] + clampedT * dy,
    lineStart[2] + clampedT * dz,
  ];
}

/**
 * Find all intersections between two entities
 */
export function findEntityIntersections(entity1: Entity, entity2: Entity): IntersectionResult[] {
  // Line-Line
  if (entity1.type === 'LINE' && entity2.type === 'LINE') {
    const result = lineLineIntersection(entity1.start, entity1.end, entity2.start, entity2.end);
    if (result && isPointOnSegment(result.point, entity1.start, entity1.end) &&
        isPointOnSegment(result.point, entity2.start, entity2.end)) {
      return [result];
    }
    return [];
  }

  // Line-Circle
  if (entity1.type === 'LINE' && entity2.type === 'CIRCLE') {
    return lineCircleIntersection(entity1.start, entity1.end, entity2.center, entity2.radius);
  }
  if (entity1.type === 'CIRCLE' && entity2.type === 'LINE') {
    return lineCircleIntersection(entity2.start, entity2.end, entity1.center, entity1.radius);
  }

  // Line-Arc
  if (entity1.type === 'LINE' && entity2.type === 'ARC') {
    return arcLineIntersection(entity2.center, entity2.radius, entity2.startAngle, entity2.endAngle, entity1.start, entity1.end);
  }
  if (entity1.type === 'ARC' && entity2.type === 'LINE') {
    return arcLineIntersection(entity1.center, entity1.radius, entity1.startAngle, entity1.endAngle, entity2.start, entity2.end);
  }

  // Circle-Circle
  if (entity1.type === 'CIRCLE' && entity2.type === 'CIRCLE') {
    return circleCircleIntersection(entity1.center, entity1.radius, entity2.center, entity2.radius);
  }

  // Arc-Arc
  if (entity1.type === 'ARC' && entity2.type === 'ARC') {
    return arcArcIntersection(
      entity1.center, entity1.radius, entity1.startAngle, entity1.endAngle,
      entity2.center, entity2.radius, entity2.startAngle, entity2.endAngle
    );
  }

  // Circle-Arc
  if (entity1.type === 'CIRCLE' && entity2.type === 'ARC') {
    return arcArcIntersection(
      entity1.center, entity1.radius, 0, Math.PI * 2,
      entity2.center, entity2.radius, entity2.startAngle, entity2.endAngle
    );
  }
  if (entity1.type === 'ARC' && entity2.type === 'CIRCLE') {
    return arcArcIntersection(
      entity1.center, entity1.radius, entity1.startAngle, entity1.endAngle,
      entity2.center, entity2.radius, 0, Math.PI * 2
    );
  }

  return [];
}

/**
 * Trim/Break a LINE entity at intersection points
 */
export function trimLineEntity(
  lineEntity: Entity,
  clickPoint: Point,
  cuttingEdges: Entity[]
): Entity[] {
  if (lineEntity.type !== 'LINE') return [lineEntity];

  // Find all intersection points with cutting edges
  const intersections: { point: Point; t: number }[] = [];

  for (const cutter of cuttingEdges) {
    const results = findEntityIntersections(lineEntity, cutter);
    for (const result of results) {
      // Calculate parameter t for the line
      const dx = lineEntity.end[0] - lineEntity.start[0];
      const dy = lineEntity.end[1] - lineEntity.start[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.0001) continue;

      const t = ((result.point[0] - lineEntity.start[0]) * dx +
                 (result.point[1] - lineEntity.start[1]) * dy) / (len * len);

      if (t > 0.001 && t < 0.999) { // Exclude endpoints
        intersections.push({ point: result.point, t });
      }
    }
  }

  if (intersections.length === 0) return []; // Delete entire line if no intersections

  // Sort intersections by parameter t
  intersections.sort((a, b) => a.t - b.t);

  // Find which segment contains the click point
  const clickT = (() => {
    const dx = lineEntity.end[0] - lineEntity.start[0];
    const dy = lineEntity.end[1] - lineEntity.start[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.0001) return 0;
    return ((clickPoint[0] - lineEntity.start[0]) * dx +
            (clickPoint[1] - lineEntity.start[1]) * dy) / (len * len);
  })();

  // Build segments
  const segments: Entity[] = [];
  let prevPoint = lineEntity.start;
  let prevT = 0;

  for (const intersection of intersections) {
    // Check if click point is in this segment
    if (clickT >= prevT && clickT <= intersection.t) {
      // Skip this segment (it contains the click point)
    } else {
      // Keep this segment
      segments.push({
        ...lineEntity,
        id: Date.now() + Math.random(),
        start: prevPoint,
        end: intersection.point,
      } as Entity);
    }
    prevPoint = intersection.point;
    prevT = intersection.t;
  }

  // Last segment
  if (clickT >= prevT && clickT <= 1) {
    // Skip - click is in last segment
  } else {
    segments.push({
      ...lineEntity,
      id: Date.now() + Math.random(),
      start: prevPoint,
      end: lineEntity.end,
    } as Entity);
  }

  return segments;
}

/**
 * Trim an ARC entity at intersection points
 */
export function trimArcEntity(
  arcEntity: Entity,
  clickPoint: Point,
  cuttingEdges: Entity[]
): Entity[] {
  if (arcEntity.type !== 'ARC') return [arcEntity];

  // Find all intersection points
  const intersections: { point: Point; angle: number }[] = [];

  for (const cutter of cuttingEdges) {
    const results = findEntityIntersections(arcEntity, cutter);
    for (const result of results) {
      const angle = Math.atan2(
        result.point[1] - arcEntity.center[1],
        result.point[0] - arcEntity.center[0]
      );
      intersections.push({ point: result.point, angle });
    }
  }

  if (intersections.length === 0) return []; // Delete entire arc

  // Normalize angles
  const normalizeAngle = (angle: number, reference: number) => {
    let normalized = angle;
    while (normalized < reference) normalized += Math.PI * 2;
    while (normalized > reference + Math.PI * 2) normalized -= Math.PI * 2;
    return normalized;
  };

  const startAngle = arcEntity.startAngle;
  const endAngle = normalizeAngle(arcEntity.endAngle, startAngle);

  // Normalize intersection angles
  intersections.forEach(inter => {
    inter.angle = normalizeAngle(inter.angle, startAngle);
  });

  // Sort by angle
  intersections.sort((a, b) => a.angle - b.angle);

  // Filter intersections that are actually on the arc
  const validIntersections = intersections.filter(
    inter => inter.angle >= startAngle && inter.angle <= endAngle
  );

  if (validIntersections.length === 0) return []; // Delete entire arc

  // Find click angle
  const clickAngle = normalizeAngle(
    Math.atan2(clickPoint[1] - arcEntity.center[1], clickPoint[0] - arcEntity.center[0]),
    startAngle
  );

  // Build arc segments
  const segments: Entity[] = [];
  let prevAngle = startAngle;

  for (const intersection of validIntersections) {
    // Check if click is in this segment
    if (clickAngle >= prevAngle && clickAngle <= intersection.angle) {
      // Skip this segment
    } else {
      segments.push({
        ...arcEntity,
        id: Date.now() + Math.random(),
        startAngle: prevAngle,
        endAngle: intersection.angle,
      } as Entity);
    }
    prevAngle = intersection.angle;
  }

  // Last segment
  if (clickAngle >= prevAngle && clickAngle <= endAngle) {
    // Skip
  } else {
    segments.push({
      ...arcEntity,
      id: Date.now() + Math.random(),
      startAngle: prevAngle,
      endAngle: endAngle,
    } as Entity);
  }

  return segments;
}

/**
 * Trim a CIRCLE entity - converts to ARC
 */
export function trimCircleEntity(
  circleEntity: Entity,
  clickPoint: Point,
  cuttingEdges: Entity[]
): Entity[] {
  if (circleEntity.type !== 'CIRCLE') return [circleEntity];

  // Find all intersection points
  const intersections: { point: Point; angle: number }[] = [];

  for (const cutter of cuttingEdges) {
    const results = findEntityIntersections(circleEntity, cutter);
    for (const result of results) {
      const angle = Math.atan2(
        result.point[1] - circleEntity.center[1],
        result.point[0] - circleEntity.center[0]
      );
      intersections.push({ point: result.point, angle });
    }
  }

  if (intersections.length < 2) return []; // Need at least 2 intersections to trim a circle

  // Sort by angle
  intersections.sort((a, b) => a.angle - b.angle);

  // Find click angle
  const clickAngle = Math.atan2(
    clickPoint[1] - circleEntity.center[1],
    clickPoint[0] - circleEntity.center[0]
  );

  // Find the two closest intersections around click point
  let segment1Start = intersections[intersections.length - 1].angle;
  let segment1End = intersections[0].angle;

  for (let i = 0; i < intersections.length; i++) {
    const nextI = (i + 1) % intersections.length;
    const angle1 = intersections[i].angle;
    const angle2 = intersections[nextI].angle;

    let normalizedClick = clickAngle;
    let normalizedAngle1 = angle1;
    let normalizedAngle2 = angle2;

    if (normalizedAngle2 < normalizedAngle1) {
      normalizedAngle2 += Math.PI * 2;
    }
    if (normalizedClick < normalizedAngle1) {
      normalizedClick += Math.PI * 2;
    }

    if (normalizedClick >= normalizedAngle1 && normalizedClick <= normalizedAngle2) {
      segment1Start = angle1;
      segment1End = angle2;
      break;
    }
  }

  // Create arc from remaining segments (everything except the clicked segment)
  const result: Entity[] = [];
  for (let i = 0; i < intersections.length; i++) {
    const nextI = (i + 1) % intersections.length;
    const angle1 = intersections[i].angle;
    const angle2 = intersections[nextI].angle;

    // Skip the segment that contains the click
    if (angle1 === segment1Start && angle2 === segment1End) {
      continue;
    }

    result.push({
      type: 'ARC',
      center: circleEntity.center,
      radius: circleEntity.radius,
      startAngle: angle1,
      endAngle: angle2,
      color: circleEntity.color,
      layer: circleEntity.layer,
      id: Date.now() + Math.random(),
    } as Entity);
  }

  return result;
}

/**
 * Extend a LINE entity to boundary entities
 */
export function extendLineEntity(
  lineEntity: Entity,
  clickPoint: Point,
  boundaries: Entity[]
): Entity | null {
  if (lineEntity.type !== 'LINE') return lineEntity;

  // Determine which end to extend based on click point
  const distToStart = Math.hypot(clickPoint[0] - lineEntity.start[0], clickPoint[1] - lineEntity.start[1]);
  const distToEnd = Math.hypot(clickPoint[0] - lineEntity.end[0], clickPoint[1] - lineEntity.end[1]);
  const extendStart = distToStart < distToEnd;

  // Create an extended line for intersection testing
  const dx = lineEntity.end[0] - lineEntity.start[0];
  const dy = lineEntity.end[1] - lineEntity.start[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return lineEntity;

  const dirX = dx / len;
  const dirY = dy / len;

  // Extend line by a large amount for intersection testing
  const extendLength = 10000;
  const extendedStart: Point = extendStart
    ? [lineEntity.start[0] - dirX * extendLength, lineEntity.start[1] - dirY * extendLength, 0]
    : lineEntity.start;
  const extendedEnd: Point = !extendStart
    ? [lineEntity.end[0] + dirX * extendLength, lineEntity.end[1] + dirY * extendLength, 0]
    : lineEntity.end;

  // Find intersections with boundaries
  let closestIntersection: Point | null = null;
  let minDist = Infinity;

  for (const boundary of boundaries) {
    const testLine: Entity = {
      ...lineEntity,
      start: extendedStart,
      end: extendedEnd,
    };

    const intersections = findEntityIntersections(testLine, boundary);

    for (const result of intersections) {
      // Check if intersection is in the extension direction
      const distFromOriginal = extendStart
        ? Math.hypot(result.point[0] - lineEntity.start[0], result.point[1] - lineEntity.start[1])
        : Math.hypot(result.point[0] - lineEntity.end[0], result.point[1] - lineEntity.end[1]);

      // Check if point is in correct direction
      if (extendStart) {
        const dotProduct = (result.point[0] - lineEntity.start[0]) * (-dirX) +
                          (result.point[1] - lineEntity.start[1]) * (-dirY);
        if (dotProduct > 0 && distFromOriginal < minDist) {
          minDist = distFromOriginal;
          closestIntersection = result.point;
        }
      } else {
        const dotProduct = (result.point[0] - lineEntity.end[0]) * dirX +
                          (result.point[1] - lineEntity.end[1]) * dirY;
        if (dotProduct > 0 && distFromOriginal < minDist) {
          minDist = distFromOriginal;
          closestIntersection = result.point;
        }
      }
    }
  }

  if (!closestIntersection) return lineEntity; // No extension found

  // Create extended line
  return {
    ...lineEntity,
    start: extendStart ? closestIntersection : lineEntity.start,
    end: extendStart ? lineEntity.end : closestIntersection,
  } as Entity;
}

/**
 * Extend an ARC entity to boundary entities
 */
export function extendArcEntity(
  arcEntity: Entity,
  clickPoint: Point,
  boundaries: Entity[]
): Entity | null {
  if (arcEntity.type !== 'ARC') return arcEntity;

  // Determine which end to extend
  const startPoint: Point = [
    arcEntity.center[0] + Math.cos(arcEntity.startAngle) * arcEntity.radius,
    arcEntity.center[1] + Math.sin(arcEntity.startAngle) * arcEntity.radius,
    0
  ];
  const endPoint: Point = [
    arcEntity.center[0] + Math.cos(arcEntity.endAngle) * arcEntity.radius,
    arcEntity.center[1] + Math.sin(arcEntity.endAngle) * arcEntity.radius,
    0
  ];

  const distToStart = Math.hypot(clickPoint[0] - startPoint[0], clickPoint[1] - startPoint[1]);
  const distToEnd = Math.hypot(clickPoint[0] - endPoint[0], clickPoint[1] - endPoint[1]);
  const extendStart = distToStart < distToEnd;

  // Convert arc to full circle for intersection testing
  const circleEntity: Entity = {
    type: 'CIRCLE',
    center: arcEntity.center,
    radius: arcEntity.radius,
    color: arcEntity.color,
    layer: arcEntity.layer,
    id: arcEntity.id,
  };

  let closestIntersection: { point: Point; angle: number } | null = null;
  let minAngularDist = Infinity;

  for (const boundary of boundaries) {
    const intersections = findEntityIntersections(circleEntity, boundary);

    for (const result of intersections) {
      const angle = Math.atan2(
        result.point[1] - arcEntity.center[1],
        result.point[0] - arcEntity.center[0]
      );

      // Normalize angles
      const normalizeAngle = (a: number, ref: number) => {
        let normalized = a;
        while (normalized < ref) normalized += Math.PI * 2;
        while (normalized > ref + Math.PI * 2) normalized -= Math.PI * 2;
        return normalized;
      };

      const normAngle = normalizeAngle(angle, arcEntity.startAngle);
      const normEnd = normalizeAngle(arcEntity.endAngle, arcEntity.startAngle);

      let angularDist = 0;
      let validExtension = false;

      if (extendStart) {
        // Extending from start - look backwards
        angularDist = arcEntity.startAngle - normAngle;
        if (angularDist < 0) angularDist += Math.PI * 2;
        validExtension = normAngle < arcEntity.startAngle || normAngle > normEnd;
      } else {
        // Extending from end - look forwards
        angularDist = normAngle - normEnd;
        if (angularDist < 0) angularDist += Math.PI * 2;
        validExtension = normAngle > normEnd || normAngle < arcEntity.startAngle;
      }

      if (validExtension && angularDist < minAngularDist && angularDist > 0.01) {
        minAngularDist = angularDist;
        closestIntersection = { point: result.point, angle };
      }
    }
  }

  if (!closestIntersection) return arcEntity; // No extension found

  return {
    ...arcEntity,
    startAngle: extendStart ? closestIntersection.angle : arcEntity.startAngle,
    endAngle: extendStart ? arcEntity.endAngle : closestIntersection.angle,
  } as Entity;
}
