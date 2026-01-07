import type { Entity, Point } from '../types/entities';

import {
    findEntityIntersections
} from './intersectionUtils';

/**
 * Interface representing a Ray hit result
 */
interface RayHit {
    point: Point;
    distance: number;
    entity: Entity;
}

// Distance helper since geometryUtils distance2D might have different signature or not exported properly
const dist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));

/**
 * Cast a ray from start point in direction
 * Returns the closest entity hit
 */
export const castRay = (
    start: Point,
    dir: Point, // Normalized direction
    entities: Entity[]
): RayHit | null => {
    // Create a long line segment representing the ray
    const MAX_DIST = 10000;
    const rayEnd: Point = [
        start[0] + dir[0] * MAX_DIST,
        start[1] + dir[1] * MAX_DIST,
        0
    ];

    const rayEntity: Entity = {
        id: -1,
        type: 'LINE',
        start: start,
        end: rayEnd,
        layer: '0',
        color: '#000000'
    };

    let closestHit: RayHit | null = null;
    let minDiff = Infinity;

    // Filter relevant entities (visible, on un-frozen layers etc - assumed filtered by caller)
    for (const ent of entities) {
        if (ent.type !== 'LINE' && ent.type !== 'LWPOLYLINE' && ent.type !== 'ARC' && ent.type !== 'CIRCLE') {
            continue;
        }

        const intersections = findEntityIntersections(rayEntity, ent);

        for (const hit of intersections) {
            // Calculate distance from start
            const d = dist(hit.point, start);

            // Filter very close hits (self-intersection or start point)
            if (d < 0.001) continue;

            if (d < minDiff) {
                minDiff = d;
                closestHit = {
                    point: hit.point,
                    distance: d,
                    entity: ent
                };
            }
        }
    }

    return closestHit;
};

/**
 * Get the signed angle from vector A to vector B
 * Range: (-PI, PI]
 * Positive: Left turn (CCW)
 * Negative: Right turn (CW)
 */
const getSignedAngle = (v1: Point, v2: Point): number => {
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    return Math.atan2(cross, dot);
};

/**
 * Find the smallest closed loop surrounding the point
 */
export const findBoundaryFromPoint = (
    startPoint: Point,
    entities: Entity[]
): Point[] | null => {
    // 1. Trace Ray (+X)
    const rayDir: Point = [1, 0, 0];
    const initialHit = castRay(startPoint, rayDir, entities);

    if (!initialHit) return null;

    const startEntity = initialHit.entity;
    const path: Point[] = [initialHit.point];

    // Function to get "next" vertex on the SAME entity from a point
    const getNextVertexOnEntity = (ent: Entity, p: Point, incomingDir: Point): Point | null => {
        if (ent.type === 'LINE') {
            const v1 = ent.start;
            const v2 = ent.end;
            // Vectors from p
            const vec1: Point = [v1[0] - p[0], v1[1] - p[1], 0];
            const vec2: Point = [v2[0] - p[0], v2[1] - p[1], 0];

            // Normalize
            const len1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
            const len2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);
            if (len1 < 0.001 && len2 < 0.001) return null; // Zero length line

            // Check angles
            const ang1 = getSignedAngle(incomingDir, len1 > 0 ? [vec1[0] / len1, vec1[1] / len1, 0] : [0, 0, 0]);
            const ang2 = getSignedAngle(incomingDir, len2 > 0 ? [vec2[0] / len2, vec2[1] / len2, 0] : [0, 0, 0]);

            // Prefer the smallest angle (Minimize signed angle)
            return ang1 < ang2 ? v1 : v2;
        }
        return null;
    };

    let currentPoint = initialHit.point;
    let currentDir = rayDir;
    let currentEnt = startEntity;

    // First step: from mid-point to end-point of hit entity
    let nextV = getNextVertexOnEntity(currentEnt, currentPoint, currentDir);
    if (!nextV) return null;

    path.push(nextV);

    // Main Loop
    for (let i = 0; i < 1000; i++) {
        const prevP = currentPoint;
        currentPoint = nextV; // We are now at a vertex

        // Calculate incoming vector (Prev -> Current)
        const incomingVec: Point = [
            currentPoint[0] - prevP[0],
            currentPoint[1] - prevP[1],
            0
        ];
        // Normalize
        const ilen = Math.sqrt(incomingVec[0] * incomingVec[0] + incomingVec[1] * incomingVec[1]);
        const inDir: Point = ilen > 0 ? [incomingVec[0] / ilen, incomingVec[1] / ilen, 0] : currentDir;

        // Check closure
        if (dist(currentPoint, initialHit.point) < 0.01 && i > 0) {
            // Found loop back to start Ray Hit!
            return path;
        }

        let bestEnt: Entity | null = null;
        let bestP: Point | null = null;
        let maxAngle = -Infinity;

        entities.forEach(ent => {
            if (ent.type !== 'LINE') return;
            const dStart = dist(currentPoint, ent.start);
            const dEnd = dist(currentPoint, ent.end);

            if (dStart > 0.001 && dEnd > 0.001) return;
            if (dStart < 0.001 && dEnd < 0.001) return;

            if (ent.id === currentEnt.id) return; // Don't go back immediately

            const otherP = dStart < 0.001 ? ent.end : ent.start;
            const outVec: Point = [otherP[0] - currentPoint[0], otherP[1] - currentPoint[1], 0];
            const len = Math.sqrt(outVec[0] * outVec[0] + outVec[1] * outVec[1]);
            const outDir: Point = [outVec[0] / len, outVec[1] / len, 0];

            const angle = getSignedAngle(inDir, outDir);

            // We want Maximize (Leftmost).
            if (angle > maxAngle) {
                maxAngle = angle;
                bestEnt = ent;
                bestP = otherP;
            }
        });

        if (bestEnt && bestP) {
            currentEnt = bestEnt;
            nextV = bestP;
            path.push(nextV);
        } else {
            // Dead end or no connection
            return null;
        }
    }

    return null;
};
