import { Point, Entity } from '../types/entities';
import * as THREE from 'three';

/**
 * Otomatik köşe noktası tespiti ve seçimi
 * Belli bir mesafe içindeki ölçülebilir noktaları bulur
 */
export interface AutoDetectedPoint {
    point: Point;
    type: 'ENDPOINT' | 'MIDPOINT' | 'CENTER' | 'INTERSECTION' | 'QUADRANT';
    entityId?: number;
    priority: number; // 0 = en yüksek öncelik
}

export const autoDetectPoints = (
    cursorPos: Point,
    entities: Entity[],
    detectionRadius: number = 10
): AutoDetectedPoint[] => {
    const detectedPoints: AutoDetectedPoint[] = [];

    entities.forEach(entity => {
        if (!entity.visible) return;

        switch (entity.type) {
            case 'LINE':
                const line = entity as any;
                // Endpoints
                detectedPoints.push({
                    point: line.start,
                    type: 'ENDPOINT',
                    entityId: entity.id,
                    priority: 0
                });
                detectedPoints.push({
                    point: line.end,
                    type: 'ENDPOINT',
                    entityId: entity.id,
                    priority: 0
                });
                // Midpoint
                const midpoint: Point = [
                    (line.start[0] + line.end[0]) / 2,
                    (line.start[1] + line.end[1]) / 2,
                    0
                ];
                detectedPoints.push({
                    point: midpoint,
                    type: 'MIDPOINT',
                    entityId: entity.id,
                    priority: 1
                });
                break;

            case 'LWPOLYLINE':
                const polyline = entity as any;
                polyline.vertices.forEach((v: Point, idx: number) => {
                    // Vertices (endpoints)
                    detectedPoints.push({
                        point: v,
                        type: 'ENDPOINT',
                        entityId: entity.id,
                        priority: 0
                    });
                    // Segment midpoints
                    if (idx < polyline.vertices.length - 1) {
                        const nextV = polyline.vertices[idx + 1];
                        const segMid: Point = [
                            (v[0] + nextV[0]) / 2,
                            (v[1] + nextV[1]) / 2,
                            0
                        ];
                        detectedPoints.push({
                            point: segMid,
                            type: 'MIDPOINT',
                            entityId: entity.id,
                            priority: 1
                        });
                    }
                });
                // Closed polyline: last segment
                if (polyline.closed && polyline.vertices.length > 2) {
                    const lastV = polyline.vertices[polyline.vertices.length - 1];
                    const firstV = polyline.vertices[0];
                    const segMid: Point = [
                        (lastV[0] + firstV[0]) / 2,
                        (lastV[1] + firstV[1]) / 2,
                        0
                    ];
                    detectedPoints.push({
                        point: segMid,
                        type: 'MIDPOINT',
                        entityId: entity.id,
                        priority: 1
                    });
                }
                break;

            case 'CIRCLE':
            case 'ARC':
                const circleArc = entity as any;
                // Center
                detectedPoints.push({
                    point: circleArc.center,
                    type: 'CENTER',
                    entityId: entity.id,
                    priority: 0
                });
                // Quadrants (4 points at 0, 90, 180, 270 degrees)
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI) / 2;
                    const quadrant: Point = [
                        circleArc.center[0] + Math.cos(angle) * circleArc.radius,
                        circleArc.center[1] + Math.sin(angle) * circleArc.radius,
                        0
                    ];
                    detectedPoints.push({
                        point: quadrant,
                        type: 'QUADRANT',
                        entityId: entity.id,
                        priority: 2
                    });
                }
                break;

            case 'ELLIPSE':
                const ellipse = entity as any;
                detectedPoints.push({
                    point: ellipse.center,
                    type: 'CENTER',
                    entityId: entity.id,
                    priority: 0
                });
                break;

            case 'POINT':
                const pointEnt = entity as any;
                detectedPoints.push({
                    point: pointEnt.position,
                    type: 'ENDPOINT',
                    entityId: entity.id,
                    priority: 0
                });
                break;
        }
    });

    // Mesafe filtrelemesi ve sıralama
    const cursor = new THREE.Vector3(...cursorPos);
    const filtered = detectedPoints
        .filter(dp => {
            const dpVec = new THREE.Vector3(...dp.point);
            return dpVec.distanceTo(cursor) <= detectionRadius;
        })
        .sort((a, b) => {
            const distA = cursor.distanceTo(new THREE.Vector3(...a.point));
            const distB = cursor.distanceTo(new THREE.Vector3(...b.point));
            if (Math.abs(distA - distB) < 0.1) {
                // Aynı mesafede ise öncelik kullan
                return a.priority - b.priority;
            }
            return distA - distB;
        });

    return filtered;
};

/**
 * İki nokta arasındaki ölçü için otomatik olarak en iyi köşe noktalarını seçer
 */
export const autoSelectDimensionPoints = (
    cursorPos: Point,
    entities: Entity[],
    detectionRadius: number = 10
): { startPoint: Point | null; endPoint: Point | null } => {
    const detected = autoDetectPoints(cursorPos, entities, detectionRadius);

    if (detected.length >= 2) {
        // En yakın iki noktayı seç
        return {
            startPoint: detected[0].point,
            endPoint: detected[1].point
        };
    } else if (detected.length === 1) {
        return {
            startPoint: detected[0].point,
            endPoint: null
        };
    }

    return { startPoint: null, endPoint: null };
};

export const calculateDimensionGeometry = (
    start: Point,
    end: Point,
    dimPoint: Point, // Point where the user clicked to position the dimension line
    type: 'linear' | 'aligned' | 'vertical' | 'horizontal'
) => {
    // Basic vector math using locally standard arrays for simplicity or THREE keys if needed
    // Since Point is [x, y, z]

    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const d = new THREE.Vector3(...dimPoint);

    // Determine measurement axis
    if (type === 'linear') {
        // By default 'linear' in AutoCAD usually means aligned if not orthographic lock, 
        // OR it detects based on mouse movement. 
        // Simplified: 'linear' creates a rotated aligned dimension if 'aligned' is passed, 
        // or horizontal/vertical if those are strict.

        // For strict horizontal/vertical based on AutoCAD behavior (DIMLINEAR):
        // If x-dist > y-dist => Horizontal, else Vertical (simplified auto)
        // Or strictly project onto X or Y axes.

        // Let's implement standard Ortho Linear (Horizontal/Vertical)
        // We need to decide direction based on dimPoint location?
        // Actually DIMLINEAR creates H or V dim.

        // But we will handle 'rotated' logic in renderer if needed. 
        // Let's stick to "Aligned" vs "Linear" (Rotated 0 or 90).
    }

    // For ALIGNED dimension:
    // The dimension line is parallel to the line (start->end).
    // The distance of dimension line is determined by projection of dimPoint onto the normal vector.

    // Vector along measurement
    const dir = new THREE.Vector3().subVectors(e, s);
    const length = dir.length();

    // Normalized direction
    const unitDir = dir.clone().normalize();

    // Normal vector (2D) - rotate 90 degrees
    const normal = new THREE.Vector3(-unitDir.y, unitDir.x, 0);

    // Project vector (start->dimPoint) onto normal to get offset distance
    const vStartDim = new THREE.Vector3().subVectors(d, s);
    const offsetDist = vStartDim.dot(normal);

    // Calculate actual dimension line points
    const dimStart = s.clone().add(normal.clone().multiplyScalar(offsetDist));
    const dimEnd = e.clone().add(normal.clone().multiplyScalar(offsetDist));

    return {
        dimStart: [dimStart.x, dimStart.y, 0] as Point,
        dimEnd: [dimEnd.x, dimEnd.y, 0] as Point,
        measureLength: length,
        textPosition: [
            (dimStart.x + dimEnd.x) / 2,
            (dimStart.y + dimEnd.y) / 2 + (offsetDist >= 0 ? 1 : -1) * 2, // Slight offset for text
            0
        ] as Point,
        rotation: Math.atan2(unitDir.y, unitDir.x)
    };
};

export const calculateAngularDimensionGeometry = (
    center: Point,
    p1: Point,
    p2: Point,
    dimPoint: Point
) => {
    const c = new THREE.Vector3(...center);
    const v1 = new THREE.Vector3(...p1).sub(c);
    const v2 = new THREE.Vector3(...p2).sub(c);
    const vDim = new THREE.Vector3(...dimPoint).sub(c);

    const radius = vDim.length();

    let startAngle = Math.atan2(v1.y, v1.x);
    let endAngle = Math.atan2(v2.y, v2.x);
    let dimAngle = Math.atan2(vDim.y, vDim.x);

    // Normalize angles 0-2PI
    if (startAngle < 0) startAngle += Math.PI * 2;
    if (endAngle < 0) endAngle += Math.PI * 2;
    if (dimAngle < 0) dimAngle += Math.PI * 2;

    // Ensure we measure the "inner" angle that contains dimPoint? 
    // Or just start->end ccw?
    // AutoCAD usually measures smallest angle between lines, unless arc specified.

    // Simple logic: maintain CCW order that includes dimPoint?
    // Or allow crossing.

    // Calculate angle diff
    let diff = endAngle - startAngle;
    if (diff < 0) diff += Math.PI * 2;

    // Check if dimPoint is within this arc
    // Normalize dimAngle relative to startAngle
    let relDim = dimAngle - startAngle;
    if (relDim < 0) relDim += Math.PI * 2;

    if (relDim > diff) {
        // dimPoint is outside the start->end arc.
        // Swap start/end to measure the other side (explementary angle)?
        // Or assume user picked p1 then p2 implies direction?
        // Let's assume user wants the arc that "looks" like where they clicked.
        // Actually usually standard is:
        // User picks center, p1, p2. We draw arc p1->p2. Radius determined by dimPoint.
        // We do NOT change start/end based on dimPoint?
        // But radius is flexible.
    }

    // Text position: at the middle of the arc, at radius
    // Or at dimPoint angle?
    // Usually text is centered on the dimension arc.

    // If we support manual text placement (dimPoint determines radius AND angle):
    // Use dimAngle for text position.

    const textPos = new THREE.Vector3(
        c.x + Math.cos(dimAngle) * (radius + 2.5), // text offset
        c.y + Math.sin(dimAngle) * (radius + 2.5),
        0
    );

    return {
        center,
        radius,
        startAngle,
        endAngle,
        textPosition: [textPos.x, textPos.y, 0] as Point,
        measureAngle: diff // in radians
    };
};
