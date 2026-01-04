import type { Entity, Point } from '../types/entities';
import type { SnapMode, SnapSettings, SnapResult } from '../types/snap';

/**
 * SnapManager handles object snapping (OSNAP) functionality
 */
export class SnapManager {
  private settings: SnapSettings;
  private entities: Entity[];

  constructor(settings: SnapSettings, entities: Entity[]) {
    this.settings = settings;
    this.entities = entities;
  }

  updateEntities(entities: Entity[]): void {
    this.entities = entities;
  }

  updateSettings(settings: Partial<SnapSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Find snap point near cursor position
   */
  findSnapPoint(cursorPoint: Point, viewportZoom: number): SnapResult {
    if (!this.settings.enabled) {
      return { snapped: false, point: cursorPoint };
    }

    const aperture = this.settings.apertureSize / viewportZoom;
    let closestPoint: Point | null = null;
    let closestDistance = aperture;
    let closestMode: SnapMode | undefined;
    let closestEntity: Entity | undefined;

    for (const entity of this.entities) {
      if (!entity.visible) continue;

      // Check each enabled snap mode
      for (const mode of this.settings.modes) {
        const result = this.findSnapForEntity(entity, mode, cursorPoint);
        if (result) {
          const distance = this.distance(cursorPoint, result);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = result;
            closestMode = mode;
            closestEntity = entity;
          }
        }
      }
    }

    if (closestPoint && this.settings.magnetEnabled) {
      return {
        snapped: true,
        point: this.applyMagnet(cursorPoint, closestPoint),
        mode: closestMode,
        entity: closestEntity,
      };
    }

    return closestPoint
      ? { snapped: true, point: closestPoint, mode: closestMode, entity: closestEntity }
      : { snapped: false, point: cursorPoint };
  }

  private findSnapForEntity(
    entity: Entity,
    mode: SnapMode,
    cursor: Point
  ): Point | null {
    switch (mode) {
      case 'ENDPOINT':
        return this.findEndpoint(entity, cursor);
      case 'MIDPOINT':
        return this.findMidpoint(entity, cursor);
      case 'CENTER':
        return this.findCenter(entity, cursor);
      case 'INTERSECTION':
        return this.findIntersection(entity, cursor);
      case 'PERPENDICULAR':
        return this.findPerpendicular(entity, cursor);
      case 'TANGENT':
        return this.findTangent(entity, cursor);
      case 'QUADRANT':
        return this.findQuadrant(entity, cursor);
      case 'NODE':
        return this.findNode(entity, cursor);
      case 'NEAREST':
        return this.findNearest(entity, cursor);
      default:
        return null;
    }
  }

  private findEndpoint(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'LINE') {
      return this.findClosest([entity.start, entity.end], cursor);
    }
    if (entity.type === 'LWPOLYLINE') {
      const endpoints = [entity.vertices[0], entity.vertices[entity.vertices.length - 1]];
      return this.findClosest(endpoints, cursor);
    }
    if (entity.type === 'ARC') {
      const start = this.pointOnArc(entity, entity.startAngle);
      const end = this.pointOnArc(entity, entity.endAngle);
      return this.findClosest([start, end], cursor);
    }
    return null;
  }

  private findMidpoint(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'LINE') {
      return [
        (entity.start[0] + entity.end[0]) / 2,
        (entity.start[1] + entity.end[1]) / 2,
        (entity.start[2] + entity.end[2]) / 2,
      ];
    }
    if (entity.type === 'LWPOLYLINE' && entity.vertices.length >= 2) {
      let closestMidpoint: Point | null = null;
      let minDist = Infinity;

      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const v1 = entity.vertices[i];
        const v2 = entity.vertices[i + 1];
        const midpoint: Point = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
        const dist = this.distance(cursor, midpoint);
        if (dist < minDist) {
          minDist = dist;
          closestMidpoint = midpoint;
        }
      }
      return closestMidpoint;
    }
    return null;
  }

  private findCenter(entity: Entity, _cursor: Point): Point | null {
    if (entity.type === 'CIRCLE' || entity.type === 'ARC' || entity.type === 'ELLIPSE') {
      return entity.center;
    }
    if (entity.type === 'LWPOLYLINE' && entity.closed) {
      return this.calculateCentroid(entity.vertices);
    }
    return null;
  }

  private findIntersection(_entity: Entity, _cursor: Point): Point | null {
    // Complex - requires entity-entity intersection tests
    // For now, skip
    return null;
  }

  private findPerpendicular(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'LINE') {
      return this.projectPointOnLine(cursor, entity.start, entity.end);
    }
    if (entity.type === 'LWPOLYLINE') {
      let closestPoint: Point | null = null;
      let minDist = Infinity;

      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const foot = this.projectPointOnLine(cursor, entity.vertices[i], entity.vertices[i + 1]);
        if (foot) {
          const dist = this.distance(cursor, foot);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = foot;
          }
        }
      }
      return closestPoint;
    }
    return null;
  }

  private findTangent(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
      return this.findTangentToCircle(cursor, entity.center, entity.radius);
    }
    if (entity.type === 'ELLIPSE') {
      // Approximate as circle for tangent
      const avgRadius = (entity.rx + entity.ry) / 2;
      return this.findTangentToCircle(cursor, entity.center, avgRadius);
    }
    return null;
  }

  private findQuadrant(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
      const { center, radius } = entity;
      const quadrants: Point[] = [
        [center[0] + radius, center[1], center[2]],
        [center[0], center[1] + radius, center[2]],
        [center[0] - radius, center[1], center[2]],
        [center[0], center[1] - radius, center[2]],
      ];
      return this.findClosest(quadrants, cursor);
    }
    return null;
  }

  private findNode(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'POINT') {
      return entity.position;
    }
    if (entity.type === 'LWPOLYLINE') {
      return this.findClosest(entity.vertices, cursor);
    }
    return null;
  }

  private findNearest(entity: Entity, cursor: Point): Point | null {
    if (entity.type === 'LINE') {
      return this.projectPointOnLine(cursor, entity.start, entity.end);
    }
    if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
      // Point on circle perimeter closest to cursor
      const dx = cursor[0] - entity.center[0];
      const dy = cursor[1] - entity.center[1];
      const angle = Math.atan2(dy, dx);
      return [
        entity.center[0] + Math.cos(angle) * entity.radius,
        entity.center[1] + Math.sin(angle) * entity.radius,
        entity.center[2] || 0,
      ];
    }
    if (entity.type === 'LWPOLYLINE') {
      let closestPoint: Point | null = null;
      let minDist = Infinity;

      for (let i = 0; i < entity.vertices.length - 1; i++) {
        const foot = this.projectPointOnLine(cursor, entity.vertices[i], entity.vertices[i + 1]);
        if (foot) {
          const dist = this.distance(cursor, foot);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = foot;
          }
        }
      }
      return closestPoint;
    }
    return null;
  }

  private findClosest(points: Point[], cursor: Point): Point | null {
    let closest: Point | null = null;
    let minDist = Infinity;

    for (const point of points) {
      const dist = this.distance(cursor, point);
      if (dist < minDist) {
        minDist = dist;
        closest = point;
      }
    }

    return closest;
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2) +
      Math.pow(p2[2] - p1[2], 2)
    );
  }

  private applyMagnet(cursor: Point, snapPoint: Point): Point {
    const strength = this.settings.magnetStrength;
    return [
      cursor[0] + (snapPoint[0] - cursor[0]) * strength,
      cursor[1] + (snapPoint[1] - cursor[1]) * strength,
      cursor[2] + (snapPoint[2] - cursor[2]) * strength,
    ];
  }

  private projectPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
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

  private pointOnArc(entity: any, angle: number): Point {
    const { center, radius } = entity;
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2] || 0,
    ];
  }

  private calculateCentroid(vertices: Point[]): Point {
    const n = vertices.length;
    let cx = 0, cy = 0, cz = 0;
    for (const v of vertices) {
      cx += v[0];
      cy += v[1];
      cz += v[2];
    }
    return [cx / n, cy / n, cz / n];
  }

  private findTangentToCircle(point: Point, center: Point, radius: number): Point | null {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) return null; // Point inside circle

    const angle = Math.atan2(dy, dx);
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      center[2] || 0,
    ];
  }
}
