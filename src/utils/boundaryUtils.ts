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
 * Generate circle/ellipse boundary points
 */
const generateCircleBoundaryPoints = (center: Point, radius: number, segments: number = 64): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push([
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            0
        ]);
    }
    return points;
};

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 */
const isPointInsidePolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        if (((yi > point[1]) !== (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
};

/**
 * Check if point is inside a circle
 */
const isPointInsideCircle = (point: Point, center: Point, radius: number): boolean => {
    const dx = point[0] - center[0];
    const dy = point[1] - center[1];
    return (dx * dx + dy * dy) < (radius * radius);
};

/**
 * Find the smallest closed loop surrounding the point
 */
// Helper to get direction vector between two points
const getDir = (p1: Point, p2: Point): Point => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.000001) return [0, 0, 0];
    return [dx / len, dy / len, 0];
};

/**
 * Find the smallest closed loop surrounding the point
 * Robust implementation handling intersections and midpoint starts
 */
export const findBoundaryFromPoint = (
    startPoint: Point,
    entities: Entity[]
): Point[] | null => {
    // 0. Filter visible entities
    const visibleEntities = entities.filter(e =>
        e.visible !== false &&
        (e.type === 'LINE' || e.type === 'LWPOLYLINE' || e.type === 'CIRCLE' || e.type === 'ARC')
    );

    // Initial check for point inside known closed shapes
    for (const ent of visibleEntities) {
        if (ent.type === 'CIRCLE') {
            if (isPointInsideCircle(startPoint, ent.center, ent.radius)) {
                return generateCircleBoundaryPoints(ent.center, ent.radius);
            }
        }
        else if (ent.type === 'LWPOLYLINE' && ent.closed && ent.vertices.length >= 3) {
            if (isPointInsidePolygon(startPoint, ent.vertices)) {
                return [...ent.vertices];
            }
        }
    }

    // 1. Initial Ray Cast
    const rayDir: Point = [1, 0, 0];
    const initialHit = castRay(startPoint, rayDir, visibleEntities);

    if (!initialHit) return null;

    // Check if we hit a closed shape directly (Circle, Closed Polyline)
    // Note: This logic assumes we are *inside* the shape. 
    // Usually castRay hits the boundary. If we are inside, we hit the wall.
    // We trace the wall.

    // 2. Setup Traversal
    // We need to pick an initial direction along the hit entity.
    // "Left Wall Following" (CCW).
    // Tangent T such that Ray x T > 0?
    // Ray (1,0). T(0,1) -> 1. T(0,-1) -> -1.
    // If we want Area on Left, and Ray comes from Inside-Left to Wall-Right.
    // Facing Wall. Left hand on wall -> We move "Up" (Screen Y Decrease, -90 deg).
    // Ray x Up = -1. 
    // So we choose T that minimizes Signed Angle with Ray.

    // Candidate Directions from Hit Point
    let startEntity = initialHit.entity;
    let currentPoint = initialHit.point;
    let candidates: { dir: Point, ent: Entity }[] = [];

    const addLineCandidates = (p: Point, ent: any) => {
        if (ent.type !== 'LINE') return;
        const d1 = getDir(p, ent.start);
        const d2 = getDir(p, ent.end);
        if (d1[0] !== 0 || d1[1] !== 0) candidates.push({ dir: d1, ent });
        if (d2[0] !== 0 || d2[1] !== 0) candidates.push({ dir: d2, ent });
    };

    if (startEntity.type === 'LINE') {
        addLineCandidates(currentPoint, startEntity);
    } else if (startEntity.type === 'LWPOLYLINE') {
        // Find which segment we are on
        const vertices = startEntity.vertices;
        for (let i = 0; i < vertices.length - 1; i++) {
            // simplified check: is point on segment?
            // Since we just hit it, we assume we can find the segment.
            // Check if currentPoint is on this segment
            // We can use isPointOnSegment from interutils, but avoiding import overhead here if possible
            // Let's just blindly add directions to adjacent vertices if close?
            // Or better: Project point?
            // Let's assume the hit point is exactly on the line.
            // We just strictly follow the segment directions.
            // For now, simpler: Treat polylines as individual segments in later steps.
            // For Start, we iterate segments.
            if (Math.abs((currentPoint[1] - vertices[i][1]) * (vertices[i + 1][0] - vertices[i][0]) - (currentPoint[0] - vertices[i][0]) * (vertices[i + 1][1] - vertices[i][1])) < 0.001) {
                // On line defined by segment. Check bounds.
                if (Math.min(vertices[i][0], vertices[i + 1][0]) <= currentPoint[0] + 0.001 &&
                    Math.max(vertices[i][0], vertices[i + 1][0]) >= currentPoint[0] - 0.001 &&
                    Math.min(vertices[i][1], vertices[i + 1][1]) <= currentPoint[1] + 0.001 &&
                    Math.max(vertices[i][1], vertices[i + 1][1]) >= currentPoint[1] - 0.001) {
                    candidates.push({ dir: getDir(currentPoint, vertices[i]), ent: startEntity });
                    candidates.push({ dir: getDir(currentPoint, vertices[i + 1]), ent: startEntity });
                }
            }
        }
        if (startEntity.closed && vertices.length > 2) {
            const vLast = vertices[vertices.length - 1];
            const vFirst = vertices[0];
            // Check closing segment
            if (Math.abs((currentPoint[1] - vLast[1]) * (vFirst[0] - vLast[0]) - (currentPoint[0] - vLast[0]) * (vFirst[1] - vLast[1])) < 0.001) {
                if (Math.min(vLast[0], vFirst[0]) <= currentPoint[0] + 0.001 &&
                    Math.max(vLast[0], vFirst[0]) >= currentPoint[0] - 0.001 &&
                    Math.min(vLast[1], vFirst[1]) <= currentPoint[1] + 0.001 &&
                    Math.max(vLast[1], vFirst[1]) >= currentPoint[1] - 0.001) {
                    candidates.push({ dir: getDir(currentPoint, vLast), ent: startEntity });
                    candidates.push({ dir: getDir(currentPoint, vFirst), ent: startEntity });
                }
            }
        }
    } else if (startEntity.type === 'CIRCLE') {
        // Find tangent directions
        // Tangent vector (-dy, dx) and (dy, -dx) from radius vector
        const dx = currentPoint[0] - startEntity.center[0];
        const dy = currentPoint[1] - startEntity.center[1];
        candidates.push({ dir: [-dy, dx, 0], ent: startEntity }); // CCW
        candidates.push({ dir: [dy, -dx, 0], ent: startEntity }); // CW
    }

    if (candidates.length === 0) return null;

    // Pick 'Best' Start Direction (Minimize Signed Angle from Ray)
    // Ray is Incoming. We want "Left" turn.
    // getSignedAngle(Ray, Candidate). Minimize.
    let bestStart = candidates[0];
    let minStartAngle = Infinity;

    for (const c of candidates) {
        if (c.dir[0] === 0 && c.dir[1] === 0) continue;
        const angle = getSignedAngle(rayDir, c.dir);
        if (angle < minStartAngle) {
            minStartAngle = angle;
            bestStart = c;
        }
    }

    let currentDir = bestStart.dir;
    let currentEnt = bestStart.ent;
    const path: Point[] = [currentPoint];
    const initialPoint = currentPoint;

    // 3. Traversal Loop
    for (let step = 0; step < 1000; step++) {
        // Find "Next Event" along currentEnt in currentDir.
        // Events:
        // A. Intersection with ANY other entity.
        // B. Endpoint/Vertex of currentEnt.

        let bestDist = Infinity;
        let nextP: Point | null = null;

        // Check Endpoints (Vertex)
        if (currentEnt.type === 'LINE') {
            // Project end? No, just check if end is in direction
            const vecToEnd = [currentEnt.end[0] - currentPoint[0], currentEnt.end[1] - currentPoint[1], 0];
            const dot = vecToEnd[0] * currentDir[0] + vecToEnd[1] * currentDir[1];
            if (dot > 0.001) {
                const d = Math.sqrt(vecToEnd[0] * vecToEnd[0] + vecToEnd[1] * vecToEnd[1]);
                if (d < bestDist) {
                    bestDist = d;
                    nextP = currentEnt.end;
                }
            }
            const vecToStart = [currentEnt.start[0] - currentPoint[0], currentEnt.start[1] - currentPoint[1], 0];
            const dotS = vecToStart[0] * currentDir[0] + vecToStart[1] * currentDir[1];
            if (dotS > 0.001) {
                const d = Math.sqrt(vecToStart[0] * vecToStart[0] + vecToStart[1] * vecToStart[1]);
                if (d < bestDist) {
                    bestDist = d;
                    nextP = currentEnt.start;
                }
            }
        } else if (currentEnt.type === 'LWPOLYLINE') {
            // Find next vertex in direction on current Segment
            // Simply iterate all vertices?
            const vertices = currentEnt.vertices; // Plus closed loop handled by index logic
            const n = vertices.length;
            for (let i = 0; i < n; i++) {
                const v = vertices[i];
                const vec = [v[0] - currentPoint[0], v[1] - currentPoint[1], 0];
                const dot = vec[0] * currentDir[0] + vec[1] * currentDir[1];
                const distV = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);

                // Must be on the line of travel?
                // Dot product alone isn't enough, must be collinear. Use cross product
                const cross = currentDir[0] * vec[1] - currentDir[1] * vec[0];
                if (dot > 0.001 && Math.abs(cross) < 0.1 && distV < bestDist) { // Loose tolerance for collinear check
                    bestDist = distV;
                    nextP = v;
                }
            }
        }

        // Check Intersections with ALL other entities
        for (const other of visibleEntities) {
            if (other.id === currentEnt.id) continue;

            // Find intersections
            // We need a helper that returns points
            const hits = findEntityIntersections(currentEnt, other);
            for (const hit of hits) {
                const vec = [hit.point[0] - currentPoint[0], hit.point[1] - currentPoint[1], 0];
                const dot = vec[0] * currentDir[0] + vec[1] * currentDir[1];
                const d = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1]);

                if (dot > 0.001 && d < bestDist - 0.001) { // Prefer closer intersection
                    bestDist = d;
                    nextP = hit.point;
                }
            }
        }

        if (!nextP) {
            // Dead End
            return null;
        }

        // Move
        currentPoint = nextP;
        path.push(currentPoint);

        // Check Closure
        if (dist(currentPoint, initialPoint) < 0.01 && step > 0) {
            return path;
        }

        // At NextPoint, determine Next Direction
        // Find all outgoing vectors from this point (candidates)
        candidates = [];

        // Helper to add candidates from an entity at a point
        const collectFromEnt = (ent: Entity, p: Point) => {
            if (ent.type === 'LINE') {
                const d1 = getDir(p, ent.start);
                const d2 = getDir(p, ent.end);
                // Check if length > 0
                if (d1[0] !== 0 || d1[1] !== 0) candidates.push({ dir: d1, ent });
                if (d2[0] !== 0 || d2[1] !== 0) candidates.push({ dir: d2, ent });
            } else if (ent.type === 'LWPOLYLINE') {
                // Add directions to adjacent vertices + segment directions
                // Just iterate all vertices and see if we are close to segment?
                // Simplification for Polyline at intersection:
                // Treat segments as lines.
                // Find which segment we are on or vertex we are at.
                const vs = ent.vertices;
                const n = vs.length;
                for (let i = 0; i < n; i++) {
                    const p1 = vs[i];
                    const p2 = vs[(i + 1) % n];
                    if (!ent.closed && i === n - 1) break;

                    // Check if P is on segment p1-p2
                    // We use generous tolerance
                    const dx = p2[0] - p1[0]; const dy = p2[1] - p1[1];
                    const length = Math.sqrt(dx * dx + dy * dy);
                    if (length < 0.001) continue;

                    // Project P onto line
                    const t = ((p[0] - p1[0]) * dx + (p[1] - p1[1]) * dy) / (length * length);
                    // Check perpendicular distance?
                    // Assuming we are AT the point, we just check if t is in [0,1]
                    // And point matches.
                    // But simpler: just add directions to p1 and p2 from p
                    // IF p is on segment.

                    // Distance check
                    const px = p1[0] + t * dx;
                    const py = p1[1] + t * dy;
                    const distToLine = Math.sqrt((p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py));

                    if (distToLine < 0.01 && t >= -0.001 && t <= 1.001) {
                        // On segment
                        const dir1 = getDir(p, p1);
                        const dir2 = getDir(p, p2);
                        if (dir1[0] !== 0 || dir1[1] !== 0) candidates.push({ dir: dir1, ent });
                        if (dir2[0] !== 0 || dir2[1] !== 0) candidates.push({ dir: dir2, ent });
                    }
                }
            }
            // Circle support omitted for brevity in this complex logic, assume converted or precise
        };

        // 1. Current Entity continues?
        collectFromEnt(currentEnt, currentPoint);

        // 2. Intersecting Entities?
        // Identify all entities passing through currentPoint
        for (const ent of visibleEntities) {
            if (ent.id === currentEnt.id) continue;
            // Check distance to entity
            // Using isPointOnSegment equivalent
            // or just distance to start/end if LINE (optimization)
            if (ent.type === 'LINE') {
                const dS = dist(currentPoint, ent.start);
                const dE = dist(currentPoint, ent.end);
                if (dS < 0.01 || dE < 0.01) {
                    collectFromEnt(ent, currentPoint);
                    continue;
                }
                // Check if point on middle
                const totalL = dist(ent.start, ent.end);
                if (Math.abs((dS + dE) - totalL) < 0.01) {
                    collectFromEnt(ent, currentPoint);
                }
            } else if (ent.type === 'LWPOLYLINE') {
                // Check if point on polyline (Reuse logic inside collectFromEnt implicitly?)
                // We call collectFromEnt, it checks segments.
                collectFromEnt(ent, currentPoint);
            }
        }

        // Choose Best Vector
        // We want: Minimize Angle(Incoming, Outgoing)
        // Incoming = currentDir (forward).
        // Angle range (-PI, PI].
        // Ideally we turn Left (-90).
        // Minimize Signed Angle.

        let bestCand: { dir: Point, ent: Entity } | null = null;
        let minAngle = Infinity;

        // Start Angle Reference: currentDir
        // But we want relative turn.
        // getSignedAngle(currentDir, candidateDir)

        for (const cand of candidates) {
            // Filter: Don't go back exactly the way we came (U-turn) unless necessary?
            // Angle 180 or -180.
            // Dot product close to -1.
            const dot = cand.dir[0] * currentDir[0] + cand.dir[1] * currentDir[1];
            if (dot < -0.99) continue; // Skip strict reversal

            const angle = getSignedAngle(currentDir, cand.dir);

            // We want the most negative angle (Sharpest Left Turn).
            // -179 is better than -90. -90 better than 0. 0 better than 90.
            // But wait, standard angle range (-PI, PI].
            // -179 is very left. +179 is very right.
            // So pure minimization works.

            if (angle < minAngle) {
                minAngle = angle;
                bestCand = cand;
            }
        }

        if (!bestCand) {
            // Try U-turn?
            return null;
        }

        currentDir = bestCand.dir;
        currentEnt = bestCand.ent;
    }

    return null;
};
