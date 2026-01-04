import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import type { Point, Entity } from '../../types/entities';
import { getGripPoints, rotatePoint } from '../../utils/geometryUtils';
import { getPatternTexture } from '../../utils/hatchPatterns';
import { calculateDimensionGeometry } from '../../utils/dimensionUtils';

// Pre-calculated circle points cache
const circlePointsCache = new Map<string, Point[]>();

function getCirclePoints(cx: number, cy: number, cz: number, radius: number, segments: number = 64): Point[] {
    const key = `${cx.toFixed(4)}_${cy.toFixed(4)}_${radius.toFixed(4)}_${segments}`;
    if (circlePointsCache.has(key)) {
        return circlePointsCache.get(key)!;
    }

    const points: Point[] = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push([
            cx + Math.cos(theta) * radius,
            cy + Math.sin(theta) * radius,
            cz || 0
        ]);
    }

    // Limit cache size
    if (circlePointsCache.size > 500) {
        const firstKey = circlePointsCache.keys().next().value;
        if (firstKey) circlePointsCache.delete(firstKey);
    }

    circlePointsCache.set(key, points);
    return points;
}

function getArcPoints(cx: number, cy: number, cz: number, radius: number, startAngle: number, endAngle: number, segments: number = 32): Point[] {
    const points: Point[] = [];
    let start = startAngle;
    let end = endAngle;
    if (end < start) end += Math.PI * 2;
    const span = end - start;

    for (let i = 0; i <= segments; i++) {
        const theta = start + (i / segments) * span;
        points.push([
            cx + Math.cos(theta) * radius,
            cy + Math.sin(theta) * radius,
            cz || 0
        ]);
    }
    return points;
}


// B-spline De Boor's algorithm for curve evaluation
function deBoor(k: number, degree: number, t: number, knots: number[], controlPoints: Point[]): Point {
    if (k === 0) {
        return controlPoints[Math.floor(t)];
    }

    const alpha = (t - knots[k]) / (knots[k + degree + 1] - knots[k]);
    const p1 = deBoor(k - 1, degree, t, knots, controlPoints);
    const p2 = deBoor(k - 1, degree, t, knots, controlPoints);

    return [
        (1 - alpha) * p1[0] + alpha * p2[0],
        (1 - alpha) * p1[1] + alpha * p2[1],
        (1 - alpha) * p1[2] + alpha * p2[2],
    ];
}

// Generate uniform knot vector for B-spline
function generateKnots(n: number, degree: number): number[] {
    const knots: number[] = [];
    const m = n + degree + 1;

    for (let i = 0; i < m; i++) {
        if (i < degree + 1) {
            knots.push(0);
        } else if (i >= n) {
            knots.push(n - degree);
        } else {
            knots.push(i - degree);
        }
    }

    return knots;
}

// Generate spline curve points
function generateSplinePoints(controlPoints: Point[], degree: number = 3, segments: number = 50): Point[] {
    const n = controlPoints.length;
    if (n < 2) return controlPoints;

    const actualDegree = Math.min(degree, n - 1);
    const knots = generateKnots(n, actualDegree);
    const points: Point[] = [];

    const maxT = n - actualDegree - 1;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * maxT;
        // Find knot span
        let span = actualDegree;
        while (span < n && t >= knots[span + 1]) {
            span++;
        }
        span = Math.min(span, n - 1);

        const point = deBoor(span, actualDegree, t, knots, controlPoints);
        points.push(point);
    }

    return points;
}

const SnapMarker = ({ point, type }: { point: Point, type: string }) => {
    // Farklı snap türleri için farklı renkler
    const getSnapColor = () => {
        switch (type) {
            case 'endpoint': return '#FFD700'; // Sarı - uç nokta
            case 'midpoint': return '#00FF00'; // Yeşil - orta nokta
            case 'center': return '#FF00FF'; // Magenta - merkez
            case 'intersection': return '#FF6600'; // Turuncu - kesişim
            case 'nearest': return '#00FFFF'; // Cyan - en yakın
            default: return '#FFD700'; // Varsayılan sarı
        }
    };

    const color = getSnapColor();
    const size = 0.8;

    return (
        <group position={[point[0], point[1], 0.2]}>
            {/* Dış kutu çerçevesi */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[size * 0.7, size, 4]} />
                <meshBasicMaterial color={color} depthTest={false} />
            </mesh>
            {/* İç dolgu */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <planeGeometry args={[size * 0.5, size * 0.5]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} depthTest={false} />
            </mesh>
        </group>
    );
};

const Grip = ({ point, isActive, onActivate }: { point: Point, isActive: boolean, onActivate: () => void }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    // Renk belirleme: aktif = kırmızı, hover = turuncu, normal = mavi
    const color = isActive ? "#ff0000" : isHovered ? "#ff6600" : "#0078d4";
    const scale = isHovered || isActive ? 1.3 : 1;

    return (
        <mesh
            position={[point[0], point[1], 0.5]}
            scale={[scale, scale, 1]}
            onPointerDown={(e) => {
                e.stopPropagation();
                onActivate();
            }}
            onPointerOver={() => {
                setIsHovered(true);
                document.body.style.cursor = 'grab';
            }}
            onPointerOut={() => {
                setIsHovered(false);
                document.body.style.cursor = 'default';
            }}
        >
            <boxGeometry args={[4.0, 4.0, 0.1]} />
            <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
    );
};

const SelectionBoxRenderer = ({ selectionBox }: { selectionBox: any }) => {
    if (!selectionBox) return null;
    const { start, end, mode } = selectionBox;
    const minX = Math.min(start[0], end[0]);
    const maxX = Math.max(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxY = Math.max(start[1], end[1]);
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    const color = mode === 'WINDOW' ? '#0078d4' : '#107c10'; // Blue vs Green

    return (
        <group>
            {/* Fill */}
            <mesh position={[centerX, centerY, 0.05]}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} depthTest={false} />
            </mesh>
            {/* Border */}
            <Line
                points={[
                    [minX, minY, 0.05],
                    [maxX, minY, 0.05],
                    [maxX, maxY, 0.05],
                    [minX, maxY, 0.05],
                    [minX, minY, 0.05]
                ]}
                color={color}
                lineWidth={1}
                dashed={mode === 'CROSSING'}
                dashScale={10}
            />
        </group>
    );
};

const HatchMaterial = React.memo(({ url, scale, rotation }: { url: string, scale: number, rotation: number }) => {
    const texture = useMemo(() => new THREE.TextureLoader().load(url), [url]);

    React.useEffect(() => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        const s = 0.1 / scale;
        texture.repeat.set(s, s);
        texture.rotation = rotation;
        texture.needsUpdate = true;
    }, [texture, scale, rotation]);

    return <meshBasicMaterial map={texture} color="white" transparent opacity={0.8} side={THREE.DoubleSide} depthTest={false} />;
});

HatchMaterial.displayName = 'HatchMaterial';

// Memoized entity component to prevent re-renders
interface EntityRendererProps {
    entity: Entity;
    isSelected: boolean;
}

const EntityRenderer = React.memo(({ entity: ent, isSelected }: EntityRendererProps) => {
    const displayColor = isSelected ? '#0078d4' : ent.color;
    const displayDashed = isSelected;

    if (ent.type === 'LINE') {
        return (
            <Line
                points={[ent.start, ent.end]}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'CIRCLE') {
        const points = getCirclePoints(ent.center[0], ent.center[1], ent.center[2] || 0, ent.radius, 64);
        return (
            <Line
                points={points}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'LWPOLYLINE') {
        let points = [...ent.vertices];
        if (ent.closed) points.push(ent.vertices[0]);
        return (
            <Line
                points={points}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={10}
            />
        );
    }

    if (ent.type === 'ARC') {
        const points = getArcPoints(ent.center[0], ent.center[1], ent.center[2] || 0, ent.radius, ent.startAngle, ent.endAngle, 32);
        return (
            <Line
                points={points}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'ELLIPSE') {
        const points = getCirclePoints(ent.center[0], ent.center[1], ent.center[2] || 0, 1, 64).map((p): Point => [
            ent.center[0] + (p[0] - ent.center[0]) * ent.rx,
            ent.center[1] + (p[1] - ent.center[1]) * ent.ry,
            ent.center[2] || 0
        ]);
        return (
            <Line
                points={points}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'POINT') {
        const size = 0.5;
        const p = ent.position;
        return (
            <group>
                <Line points={[[p[0] - size, p[1], 0], [p[0] + size, p[1], 0]]} color={displayColor} lineWidth={2} />
                <Line points={[[p[0], p[1] - size, 0], [p[0], p[1] + size, 0]]} color={displayColor} lineWidth={2} />
            </group>
        );
    }

    if (ent.type === 'SPLINE') {
        const splinePoints = generateSplinePoints(ent.controlPoints, ent.degree, 64);
        return (
            <Line
                points={splinePoints}
                color={displayColor}
                lineWidth={isSelected ? 3 : 1}
                dashed={displayDashed}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'RAY') {
        const { origin, direction } = ent;
        const length = 1000;
        const endPoint: Point = [
            origin[0] + direction[0] * length,
            origin[1] + direction[1] * length,
            origin[2] + direction[2] * length,
        ];
        return (
            <Line
                points={[origin, endPoint]}
                color={displayColor}
                lineWidth={isSelected ? 2 : 1}
                dashed={true}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'XLINE') {
        const { origin, direction } = ent;
        const length = 1000;
        const endPoint1: Point = [
            origin[0] - direction[0] * length,
            origin[1] - direction[1] * length,
            origin[2] - direction[2] * length,
        ];
        const endPoint2: Point = [
            origin[0] + direction[0] * length,
            origin[1] + direction[1] * length,
            origin[2] + direction[2] * length,
        ];
        return (
            <Line
                points={[endPoint1, endPoint2]}
                color={displayColor}
                lineWidth={isSelected ? 2 : 1}
                dashed={true}
                dashScale={5}
            />
        );
    }

    if (ent.type === 'DONUT') {
        const { center, innerRadius, outerRadius } = ent;
        const innerPoints = getCirclePoints(center[0], center[1], center[2] || 0, innerRadius, 64);
        const outerPoints = getCirclePoints(center[0], center[1], center[2] || 0, outerRadius, 64);

        return (
            <group>
                <Line points={outerPoints} color={displayColor} lineWidth={isSelected ? 3 : 2} />
                <Line points={innerPoints} color={displayColor} lineWidth={isSelected ? 3 : 2} />
            </group>
        );
    }

    if (ent.type === 'HATCH') {
        const { boundary, pattern, scale = 1, rotation = 0 } = ent;
        if (!boundary || !boundary.vertices || boundary.vertices.length < 3) return null;

        const shape = new THREE.Shape();
        shape.moveTo(boundary.vertices[0][0], boundary.vertices[0][1]);
        for (let i = 1; i < boundary.vertices.length; i++) {
            shape.lineTo(boundary.vertices[i][0], boundary.vertices[i][1]);
        }
        shape.closePath();

        const textureUrl = pattern.name === 'SOLID' ? null : getPatternTexture(pattern.name || 'ANSI31', displayColor);

        return (
            <mesh position={[0, 0, -0.01]}>
                <shapeGeometry args={[shape]} />
                {textureUrl ? (
                    <HatchMaterial url={textureUrl} scale={scale} rotation={rotation} />
                ) : (
                    <meshBasicMaterial color={displayColor} transparent opacity={0.5} side={THREE.DoubleSide} depthTest={false} />
                )}
            </mesh>
        );
    }

    if (ent.type === 'TEXT') {
        return (
            <Text
                key={`${ent.id}-${ent.height}`}
                position={[ent.position[0], ent.position[1], ent.position[2] || 0]}
                fontSize={ent.height}
                color={displayColor}
                anchorX="left"
                anchorY="bottom"
                rotation={[0, 0, ent.rotation || 0]}
            >
                {ent.text}
            </Text>
        );
    }

    if (ent.type === 'MTEXT') {
        // MText usually supports wrapping, but for now strict Text is fine.
        // We might want to use maxWidth based on ent.width if available.
        return (
            <Text
                key={`${ent.id}-${ent.height}`}
                position={[ent.position[0], ent.position[1], ent.position[2] || 0]}
                fontSize={ent.height}
                color={displayColor}
                maxWidth={ent.width}
                anchorX="left"
                anchorY="top" // MText usually starts from top-left
                rotation={[0, 0, ent.rotation || 0]}
                textAlign="left"
            >
                {ent.text}
            </Text>
        );
    }

    if (ent.type === 'TABLE') {
        const { position, rows, cols, rowHeight, colWidth, rotation = 0, cellData, headerRow } = ent;
        const elements: React.ReactNode[] = [];
        const startX = position[0];
        const startY = position[1];
        const width = cols * colWidth;
        const height = rows * rowHeight;

        // Helper function for rotation
        const rotateIfNeeded = (p: Point): Point => {
            if (rotation === 0) return p;
            return rotatePoint(p, startX, startY, rotation);
        };

        // Horizontal lines
        for (let i = 0; i <= rows; i++) {
            const p1 = rotateIfNeeded([startX, startY - i * rowHeight, 0]);
            const p2 = rotateIfNeeded([startX + width, startY - i * rowHeight, 0]);

            elements.push(
                <Line
                    key={`h-${i}`}
                    points={[p1, p2]}
                    color={displayColor}
                    lineWidth={isSelected ? 3 : (headerRow && i === 1 ? 2 : 1)}
                    dashed={displayDashed}
                />
            );
        }

        // Vertical lines
        for (let j = 0; j <= cols; j++) {
            const p1 = rotateIfNeeded([startX + j * colWidth, startY, 0]);
            const p2 = rotateIfNeeded([startX + j * colWidth, startY - height, 0]);

            elements.push(
                <Line
                    key={`v-${j}`}
                    points={[p1, p2]}
                    color={displayColor}
                    lineWidth={isSelected ? 3 : 1}
                    dashed={displayDashed}
                />
            );
        }

        // Render cell contents
        if (cellData && cellData.length > 0) {
            const cellFontSize = rowHeight * 0.6;
            const padding = colWidth * 0.05;

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const cellText = cellData[row]?.[col];
                    if (cellText) {
                        // Hücre merkezi hesapla
                        const cellCenterX = startX + col * colWidth + colWidth / 2;
                        const cellCenterY = startY - row * rowHeight - rowHeight / 2;
                        const textPos = rotateIfNeeded([cellCenterX, cellCenterY, 0]);

                        elements.push(
                            <Text
                                key={`cell-${row}-${col}`}
                                position={[textPos[0], textPos[1], 0.01]}
                                fontSize={cellFontSize}
                                color={displayColor}
                                anchorX="center"
                                anchorY="middle"
                                rotation={[0, 0, rotation]}
                                maxWidth={colWidth - padding * 2}
                                textAlign="center"
                            >
                                {cellText}
                            </Text>
                        );
                    }
                }
            }
        }

        return <group>{elements}</group>;
    }

    if (ent.type === 'DIMENSION') {
        const { start, end, dimLinePosition, dimType, textHeight = 5, text } = ent;
        const type = dimType === 'DIMLINEAR' ? 'linear' : 'aligned';

        let shouldRender = false;
        let dimStart: [number, number, number] = [0, 0, 0];
        let dimEnd: [number, number, number] = [0, 0, 0];
        let textPos: [number, number, number] = [0, 0, 0];
        let rotation = 0;
        let measureLength = 0;

        if (dimType === 'DIMLINEAR' || dimType === 'DIMALIGNED') {
            const geo = calculateDimensionGeometry(start, end, dimLinePosition || start, type as any);
            dimStart = geo.dimStart;
            dimEnd = geo.dimEnd;
            textPos = geo.textPosition;
            rotation = geo.rotation;
            measureLength = geo.measureLength;
            shouldRender = true;
        } else if (dimType === 'DIMRADIUS' || dimType === 'DIMDIAMETER') {
            // Simple rendering for radial
            dimStart = start;
            dimEnd = end;
            textPos = dimLinePosition || end;
            shouldRender = true;
        } else if (dimType === 'DIMANGULAR') {
            const { center, startAngle, endAngle, dimLinePosition } = ent as any;
            if (center && startAngle !== undefined && endAngle !== undefined && dimLinePosition) {
                const radius = Math.hypot(dimLinePosition[0] - center[0], dimLinePosition[1] - center[1]);

                // Generate Arc Points
                const curvePoints: [number, number, number][] = [];
                const segments = 20;
                // Ensure we go from start to end in shortest path? Or strictly CCW?
                // dimensionUtils calculated diff.
                let diff = endAngle - startAngle;
                if (diff < 0) diff += Math.PI * 2;

                for (let i = 0; i <= segments; i++) {
                    const ang = startAngle + (diff * i / segments);
                    curvePoints.push([
                        center[0] + Math.cos(ang) * radius,
                        center[1] + Math.sin(ang) * radius,
                        0
                    ]);
                }

                // Use curve points for "dimStart" to "dimEnd" (visual only, for Line component)
                // But Line component takes array of points.
                // We can hijack 'dimStart' and 'dimEnd' if we render differently.
                // Better to store curvePoints in specific var and render if present.
                (ent as any)._curvePoints = curvePoints;

                textPos = [
                    center[0] + Math.cos(startAngle + diff / 2) * (radius + textHeight),
                    center[1] + Math.sin(startAngle + diff / 2) * (radius + textHeight),
                    0
                ];
                shouldRender = true;
            }
        }

        if (!shouldRender) return null;

        const displayText = text || (
            type === 'linear' || type === 'aligned'
                ? measureLength.toFixed(2)
                : text || ''
        );

        return (
            <group>
                {/* Dimension Line */}
                <Line points={[dimStart, dimEnd]} color={displayColor} lineWidth={1} />

                {/* Extension Lines with proper offset and extend */}
                {(dimType === 'DIMLINEAR' || dimType === 'DIMALIGNED') && (
                    (() => {
                        const offset = ent.extensionLineOffset || 1.5; // Gap from object
                        const ext = ent.extensionLineExtend || 1.25; // Extend past dim line

                        // Direction from start to dimStart
                        const dir1X = dimStart[0] - start[0];
                        const dir1Y = dimStart[1] - start[1];
                        const len1 = Math.sqrt(dir1X * dir1X + dir1Y * dir1Y);
                        const norm1X = len1 > 0 ? dir1X / len1 : 0;
                        const norm1Y = len1 > 0 ? dir1Y / len1 : 0;

                        const dir2X = dimEnd[0] - end[0];
                        const dir2Y = dimEnd[1] - end[1];
                        const len2 = Math.sqrt(dir2X * dir2X + dir2Y * dir2Y);
                        const norm2X = len2 > 0 ? dir2X / len2 : 0;
                        const norm2Y = len2 > 0 ? dir2Y / len2 : 0;

                        // Extension line 1: from (start + offset) to (dimStart + extend)
                        const ext1Start: [number, number, number] = [
                            start[0] + norm1X * offset,
                            start[1] + norm1Y * offset,
                            0
                        ];
                        const ext1End: [number, number, number] = [
                            dimStart[0] + norm1X * ext,
                            dimStart[1] + norm1Y * ext,
                            0
                        ];

                        // Extension line 2: from (end + offset) to (dimEnd + extend)
                        const ext2Start: [number, number, number] = [
                            end[0] + norm2X * offset,
                            end[1] + norm2Y * offset,
                            0
                        ];
                        const ext2End: [number, number, number] = [
                            dimEnd[0] + norm2X * ext,
                            dimEnd[1] + norm2Y * ext,
                            0
                        ];

                        return (
                            <>
                                <Line points={[ext1Start, ext1End]} color={displayColor} lineWidth={0.5} />
                                <Line points={[ext2Start, ext2End]} color={displayColor} lineWidth={0.5} />
                            </>
                        );
                    })()
                )}

                {/* Angular Arc */}
                {dimType === 'DIMANGULAR' && (ent as any)._curvePoints && (
                    <>
                        <Line points={(ent as any)._curvePoints} color={displayColor} lineWidth={1} />
                        {/* Extension Lines for Angular (Center to Start/End of Arc) */}
                        {/* Note: Standard angular dims have extension lines from the definition points to the arc. */}
                        {/* ent.start is P1, ent.end is P2. Arc starts at angle1, ends at angle2. */}
                        {/* We draw line from P1 to ArcStart, P2 to ArcEnd? Or Center to Arc? */}
                        {/* Center to Arc is for sectors. P1/P2 to Arc is for angular between lines. */}
                        {/* Let's draw from P1 to ArcStart, and P2 to ArcEnd for now. */}
                        <Line points={[start, (ent as any)._curvePoints[0]]} color={displayColor} lineWidth={0.5} dashed />
                        <Line points={[end, (ent as any)._curvePoints[(ent as any)._curvePoints.length - 1]]} color={displayColor} lineWidth={0.5} dashed />
                    </>
                )}

                {/* Arrows */}
                {(dimType === 'DIMLINEAR' || dimType === 'DIMALIGNED') && (
                    <>
                        {/* Arrow at dimStart */}
                        {(() => {
                            const arrowSize = ent.arrowSize || 5;
                            const angle = Math.atan2(dimEnd[1] - dimStart[1], dimEnd[0] - dimStart[0]);
                            const arrowAngle = Math.PI / 6; // 30 degrees
                            return (
                                <>
                                    <Line
                                        points={[
                                            dimStart,
                                            [
                                                dimStart[0] + arrowSize * Math.cos(angle + Math.PI - arrowAngle),
                                                dimStart[1] + arrowSize * Math.sin(angle + Math.PI - arrowAngle),
                                                0
                                            ]
                                        ]}
                                        color={displayColor}
                                        lineWidth={1}
                                    />
                                    <Line
                                        points={[
                                            dimStart,
                                            [
                                                dimStart[0] + arrowSize * Math.cos(angle + Math.PI + arrowAngle),
                                                dimStart[1] + arrowSize * Math.sin(angle + Math.PI + arrowAngle),
                                                0
                                            ]
                                        ]}
                                        color={displayColor}
                                        lineWidth={1}
                                    />
                                    {/* Arrow at dimEnd */}
                                    <Line
                                        points={[
                                            dimEnd,
                                            [
                                                dimEnd[0] + arrowSize * Math.cos(angle - arrowAngle),
                                                dimEnd[1] + arrowSize * Math.sin(angle - arrowAngle),
                                                0
                                            ]
                                        ]}
                                        color={displayColor}
                                        lineWidth={1}
                                    />
                                    <Line
                                        points={[
                                            dimEnd,
                                            [
                                                dimEnd[0] + arrowSize * Math.cos(angle + arrowAngle),
                                                dimEnd[1] + arrowSize * Math.sin(angle + arrowAngle),
                                                0
                                            ]
                                        ]}
                                        color={displayColor}
                                        lineWidth={1}
                                    />
                                </>
                            );
                        })()}
                    </>
                )}

                {/* Radius/Diameter Arrow */}
                {(dimType === 'DIMRADIUS' || dimType === 'DIMDIAMETER') && (
                    (() => {
                        const arrowSize = ent.arrowSize || 2.5;
                        const angle = Math.atan2(dimEnd[1] - dimStart[1], dimEnd[0] - dimStart[0]);
                        const arrowAngle = Math.PI / 6;
                        return (
                            <>
                                <Line
                                    points={[
                                        dimEnd,
                                        [
                                            dimEnd[0] + arrowSize * Math.cos(angle + Math.PI - arrowAngle),
                                            dimEnd[1] + arrowSize * Math.sin(angle + Math.PI - arrowAngle),
                                            0
                                        ]
                                    ]}
                                    color={displayColor}
                                    lineWidth={1}
                                />
                                <Line
                                    points={[
                                        dimEnd,
                                        [
                                            dimEnd[0] + arrowSize * Math.cos(angle + Math.PI + arrowAngle),
                                            dimEnd[1] + arrowSize * Math.sin(angle + Math.PI + arrowAngle),
                                            0
                                        ]
                                    ]}
                                    color={displayColor}
                                    lineWidth={1}
                                />
                            </>
                        );
                    })()
                )}

                {/* Text */}
                <Text
                    position={textPos}
                    fontSize={textHeight}
                    color={displayColor}
                    anchorX="center"
                    anchorY="bottom"
                    rotation={[0, 0, rotation]}
                    outlineWidth={0.05}
                    outlineColor="#000000"
                >
                    {displayText}
                </Text>
            </group>
        );
    }

    return null;
}, (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return prevProps.entity === nextProps.entity && prevProps.isSelected === nextProps.isSelected;
});

EntityRenderer.displayName = 'EntityRenderer';

const EntitiesRenderer = React.memo(() => {
    const { entities, tempPoints, activeCommand, cursorPosition, step, selectedIds, commandState, activeSnap, activateGrip, activeGrip, selectionBox } = useDrawing();

    // Memoize entity list rendering
    const entityList = useMemo(() => {
        return entities.map(ent => (
            <EntityRenderer
                key={ent.id}
                entity={ent}
                isSelected={selectedIds.has(ent.id)}
            />
        ));
    }, [entities, selectedIds]);

    // Memoize grips rendering
    const gripsElements = useMemo(() => {
        if (activeCommand !== null) return null;
        console.log('Rendering grips for selectedIds:', selectedIds.size);
        return Array.from(selectedIds).map(id => {
            const ent = entities.find(e => e.id === id);
            if (!ent) return null;
            const grips = getGripPoints(ent);
            console.log('Entity', id, 'type:', ent.type, 'grips:', grips.length);
            return (
                <group key={`grips-${id}`}>
                    {grips.map((grip, index) => {
                        const isActive = activeGrip?.entityId === id &&
                            Math.abs(activeGrip.startPoint[0] - grip.point[0]) < 0.001 &&
                            Math.abs(activeGrip.startPoint[1] - grip.point[1]) < 0.001;
                        return (
                            <Grip
                                key={index}
                                point={grip.point}
                                isActive={!!isActive}
                                onActivate={() => activateGrip(id, grip)}
                            />
                        );
                    })}
                </group>
            );
        });
    }, [activeCommand, selectedIds, entities, activeGrip, activateGrip]);

    return (
        <>
            {entityList}

            {/* Selection Box */}
            <SelectionBoxRenderer selectionBox={selectionBox} />

            {/* Grips for selected entities (memoized) */}
            {gripsElements}

            {/* Snap Marker */}
            {activeSnap && (
                <SnapMarker point={activeSnap.point} type={activeSnap.type} />
            )}

            {/* Command Previews */}
            {activeCommand === 'LINE' && tempPoints.length > 0 && (
                <Line
                    points={[tempPoints[tempPoints.length - 1], cursorPosition]}
                    color="yellow"
                    lineWidth={1}
                    dashed={true}
                    dashScale={10}
                />
            )}

            {activeCommand === 'ARC' && tempPoints.length > 0 && (
                <Line
                    points={[...tempPoints, cursorPosition]}
                    color="cyan"
                    lineWidth={1}
                    dashed
                    dashScale={10}
                />
            )}

            {activeCommand === 'POLYLINE' && tempPoints.length > 0 && (
                <>
                    <Line
                        points={tempPoints}
                        color="yellow"
                        lineWidth={1}
                    />
                    <Line
                        points={[tempPoints[tempPoints.length - 1], cursorPosition]}
                        color="yellow"
                        lineWidth={1}
                        dashed={true}
                        dashScale={10}
                    />
                    {/* Close Indicator - ilk noktaya yakınsa göster */}
                    {tempPoints.length >= 2 && (() => {
                        const firstPoint = tempPoints[0];
                        const dist = Math.hypot(
                            cursorPosition[0] - firstPoint[0],
                            cursorPosition[1] - firstPoint[1]
                        );
                        const closeThreshold = 3; // birim
                        if (dist < closeThreshold) {
                            return (
                                <group position={[firstPoint[0], firstPoint[1], 0.2]}>
                                    {/* Yeşil daire - close indicator */}
                                    <mesh>
                                        <ringGeometry args={[0.8, 1.2, 32]} />
                                        <meshBasicMaterial color="#00ff00" transparent opacity={0.8} depthTest={false} />
                                    </mesh>
                                    {/* İç dolgu */}
                                    <mesh>
                                        <circleGeometry args={[0.8, 32]} />
                                        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} depthTest={false} />
                                    </mesh>
                                </group>
                            );
                        }
                        return null;
                    })()}
                </>
            )}

            {activeCommand === 'RECTANGLE' && tempPoints.length > 0 && (
                <Line
                    points={[
                        tempPoints[0],
                        [cursorPosition[0], tempPoints[0][1], 0],
                        cursorPosition,
                        [tempPoints[0][0], cursorPosition[1], 0],
                        tempPoints[0]
                    ]}
                    color="yellow"
                    lineWidth={1}
                    dashed={true}
                    dashScale={10}
                />
            )}

            {activeCommand === 'POLYGON' && tempPoints.length > 0 && step >= 2 && (
                <Line
                    points={[tempPoints[0], cursorPosition]}
                    color="yellow"
                    lineWidth={1}
                    dashed={true}
                    dashScale={10}
                />
            )}

            {activeCommand === 'SPLINE' && tempPoints.length > 0 && (
                <>
                    <Line
                        points={tempPoints}
                        color="cyan"
                        lineWidth={1}
                        dashed={true}
                        dashScale={5}
                    />
                    {tempPoints.length >= 2 && (
                        <Line
                            points={generateSplinePoints([...tempPoints, cursorPosition], Math.min(3, tempPoints.length), 32)}
                            color="yellow"
                            lineWidth={1}
                            dashed={true}
                            dashScale={10}
                        />
                    )}
                    <Line
                        points={[tempPoints[tempPoints.length - 1], cursorPosition]}
                        color="yellow"
                        lineWidth={1}
                        dashed={true}
                        dashScale={5}
                    />
                </>
            )}

            {activeCommand === 'RAY' && tempPoints.length > 0 && step === 2 && (
                <Line
                    points={[
                        tempPoints[0],
                        [
                            tempPoints[0][0] + (cursorPosition[0] - tempPoints[0][0]) * 100,
                            tempPoints[0][1] + (cursorPosition[1] - tempPoints[0][1]) * 100,
                            0
                        ]
                    ]}
                    color="yellow"
                    lineWidth={1}
                    dashed={true}
                    dashScale={10}
                />
            )}

            {activeCommand === 'XLINE' && tempPoints.length > 0 && step === 2 && (
                <Line
                    points={[
                        [
                            tempPoints[0][0] - (cursorPosition[0] - tempPoints[0][0]) * 100,
                            tempPoints[0][1] - (cursorPosition[1] - tempPoints[0][1]) * 100,
                            0
                        ],
                        [
                            tempPoints[0][0] + (cursorPosition[0] - tempPoints[0][0]) * 100,
                            tempPoints[0][1] + (cursorPosition[1] - tempPoints[0][1]) * 100,
                            0
                        ]
                    ]}
                    color="yellow"
                    lineWidth={1}
                    dashed={true}
                    dashScale={10}
                />
            )}

            {activeCommand === 'DONUT' && tempPoints.length > 0 && (
                <>
                    {step === 2 && (
                        <Line
                            points={Array.from({ length: 64 }, (_, i) => {
                                const theta = (i / 64) * Math.PI * 2;
                                const r = Math.hypot(cursorPosition[0] - tempPoints[0][0], cursorPosition[1] - tempPoints[0][1]);
                                return [
                                    tempPoints[0][0] + Math.cos(theta) * r,
                                    tempPoints[0][1] + Math.sin(theta) * r,
                                    0
                                ];
                            })}
                            color="yellow"
                            lineWidth={1}
                            dashed={true}
                            dashScale={10}
                        />
                    )}
                    {step === 3 && (
                        <>
                            <Line
                                points={Array.from({ length: 64 }, (_, i) => {
                                    const theta = (i / 64) * Math.PI * 2;
                                    return [
                                        tempPoints[0][0] + Math.cos(theta) * commandState.innerRadius,
                                        tempPoints[0][1] + Math.sin(theta) * commandState.innerRadius,
                                        0
                                    ];
                                })}
                                color="yellow"
                                lineWidth={1}
                                dashed={true}
                                dashScale={10}
                            />
                            <Line
                                points={Array.from({ length: 64 }, (_, i) => {
                                    const theta = (i / 64) * Math.PI * 2;
                                    const r = Math.hypot(cursorPosition[0] - tempPoints[0][0], cursorPosition[1] - tempPoints[0][1]);
                                    return [
                                        tempPoints[0][0] + Math.cos(theta) * r,
                                        tempPoints[0][1] + Math.sin(theta) * r,
                                        0
                                    ];
                                })}
                                color="yellow"
                                lineWidth={1}
                                dashed={true}
                                dashScale={10}
                            />
                        </>
                    )}
                </>
            )}

            {activeCommand === 'ROTATE' && step === 3 && commandState.base && (
                <group position={[commandState.base[0], commandState.base[1], 0]}>
                    {/* Protractor visual */}
                    <mesh rotation={[0, 0, 0]}>
                        <ringGeometry args={[0.5, 0.6, 32]} />
                        <meshBasicMaterial color="yellow" transparent opacity={0.5} />
                    </mesh>
                    <Line
                        points={[[0, 0, 0], [cursorPosition[0] - commandState.base[0], cursorPosition[1] - commandState.base[1], 0]]}
                        color="yellow"
                        lineWidth={2}
                        dashed
                        dashScale={5}
                    />
                    {/* Visual arc representing the angle */}
                    <Line
                        points={Array.from({ length: 32 }, () => {
                            // Calculate current angle relative to start? Start angle was mouse click pos?
                            // CommandState stores 'angle' as startAngle in Context.
                            // We can use it if we want to show sweep.
                            // For simplicity, just show a line to cursor.
                            return [0, 0, 0] as Point;
                        }).slice(0, 0)} // Dummy
                    />
                </group>
            )}
        </>
    );
});

EntitiesRenderer.displayName = 'EntitiesRenderer';

export default EntitiesRenderer;
