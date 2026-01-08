import { useMemo } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import { Line, Text } from '@react-three/drei';
import { translatePoint, rotatePoint, scalePointFromCenter, mirrorPoint } from '../../utils/geometryUtils';
import type { Entity, Point } from '../../types/entities';

// Helper to render a ghost entity
const GhostEntityRenderer = ({ entity }: { entity: Entity }) => {
    // Style for ghost entities
    const color = "#aaaaff";
    const opacity = 0.6;
    const dashed = true;
    const dashScale = 5;

    if (entity.type === 'LINE') {
        return (
            <Line
                points={[entity.start, entity.end]}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                opacity={opacity}
                transparent
                depthTest={false}
                renderOrder={50}
            />
        );
    } else if (entity.type === 'LWPOLYLINE') {
        const points = [...entity.vertices];
        if (entity.closed) points.push(points[0]);
        return (
            <Line
                points={points}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                opacity={opacity}
                transparent
                depthTest={false}
                renderOrder={50}
            />
        );
    } else if (entity.type === 'CIRCLE') {
        const segments = 64;
        const points: Point[] = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push([
                entity.center[0] + Math.cos(theta) * entity.radius,
                entity.center[1] + Math.sin(theta) * entity.radius,
                entity.center[2] || 0
            ]);
        }
        return (
            <Line
                points={points}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                opacity={opacity}
                transparent
                depthTest={false}
                renderOrder={50}
            />
        );
    } else if (entity.type === 'ARC') {
        const segments = 32;
        const points: Point[] = [];
        const start = entity.startAngle;
        let end = entity.endAngle;
        if (end <= start) end += Math.PI * 2;

        for (let i = 0; i <= segments; i++) {
            const theta = start + (i / segments) * (end - start);
            points.push([
                entity.center[0] + Math.cos(theta) * entity.radius,
                entity.center[1] + Math.sin(theta) * entity.radius,
                entity.center[2] || 0
            ]);
        }
        return (
            <Line
                points={points}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                opacity={opacity}
                transparent
                depthTest={false}
                renderOrder={50}
            />
        );
    } else if (entity.type === 'ELLIPSE') {
        const segments = 64;
        const points: Point[] = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push([
                entity.center[0] + Math.cos(theta) * entity.rx,
                entity.center[1] + Math.sin(theta) * entity.ry,
                entity.center[2] || 0
            ]);
        }
        return (
            <Line
                points={points}
                color={color}
                lineWidth={1}
                dashed={dashed}
                dashScale={dashScale}
                opacity={opacity}
                transparent
                depthTest={false}
                renderOrder={50}
            />
        );
    } else if (entity.type === 'HATCH') {
        // Hatch için boundary'yi ghost olarak göster
        if (entity.boundary && entity.boundary.vertices) {
            const points = [...entity.boundary.vertices];
            if (entity.boundary.closed) points.push(points[0]);
            return (
                <Line
                    points={points}
                    color={color}
                    lineWidth={1}
                    dashed={dashed}
                    dashScale={dashScale}
                    opacity={opacity}
                    transparent
                    depthTest={false}
                    renderOrder={50}
                />
            );
        }
    } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const textEnt = entity as any;
        const pos = textEnt.position || [0, 0, 0];
        const height = textEnt.height || 10;
        const rotation = textEnt.rotation || 0;
        const text = textEnt.text || '';

        return (
            <Text
                position={[pos[0], pos[1], pos[2] || 0]}
                fontSize={height}
                color={color}
                anchorX="left"
                anchorY="bottom"
                rotation={[0, 0, rotation]}
                fillOpacity={opacity}
                renderOrder={50}
            >
                {text}
            </Text>
        );
    } else if (entity.type === 'TABLE') {
        const tableEnt = entity as any;
        const pos = tableEnt.position || [0, 0, 0];
        const rows = tableEnt.rows || 4;
        const cols = tableEnt.cols || 4;
        const rowHeight = tableEnt.rowHeight || 10;
        const colWidth = tableEnt.colWidth || 30;
        const tableWidth = cols * colWidth;
        const tableHeight = rows * rowHeight;

        const lines: Point[][] = [];

        // Yatay çizgiler
        for (let i = 0; i <= rows; i++) {
            const y = pos[1] - i * rowHeight;
            lines.push([
                [pos[0], y, 0],
                [pos[0] + tableWidth, y, 0]
            ]);
        }
        // Dikey çizgiler
        for (let j = 0; j <= cols; j++) {
            const x = pos[0] + j * colWidth;
            lines.push([
                [x, pos[1], 0],
                [x, pos[1] - tableHeight, 0]
            ]);
        }

        return (
            <group>
                {lines.map((pts, i) => (
                    <Line
                        key={i}
                        points={pts}
                        color={color}
                        lineWidth={1}
                        dashed={dashed}
                        dashScale={dashScale}
                        opacity={opacity}
                        transparent
                        depthTest={false}
                        renderOrder={50}
                    />
                ))}
            </group>
        );
    }
    return null;
};

const TransformationPreview = () => {
    const { activeCommand, step, commandState, selectedIds, entities, cursorPosition, tempPoints } = useDrawing();

    // Dönüştürülmüş varlıkları hesapla (sadece aktif komut varsa)
    const transformedEntities = useMemo(() => {
        if (!activeCommand) return null;

        // Base point set edilmiş olmalı (genelde step >= 2)
        if (step !== 2) return null;

        // Fallback to commandState.selectedEntities if selectedIds is empty
        let originalEntities = entities.filter(ent => selectedIds.has(ent.id));
        if (originalEntities.length === 0 && commandState.selectedEntities) {
            const ids = new Set(commandState.selectedEntities as number[]);
            originalEntities = entities.filter(ent => ids.has(ent.id));
        }

        if (originalEntities.length === 0) return null;

        const basePoint = commandState.basePoint || commandState.base;
        if (!basePoint) return null;

        const previewEntities: Entity[] = [];

        if (activeCommand === 'MOVE' || activeCommand === 'COPY') {
            const dx = cursorPosition[0] - basePoint[0];
            const dy = cursorPosition[1] - basePoint[1];

            originalEntities.forEach(ent => {
                let newEnt = { ...ent } as any;

                if (ent.type === 'LINE') {
                    newEnt.start = translatePoint(ent.start, dx, dy);
                    newEnt.end = translatePoint(ent.end, dx, dy);
                } else if (ent.type === 'LWPOLYLINE') {
                    newEnt.vertices = ent.vertices.map((v: Point) => translatePoint(v, dx, dy));
                } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
                    newEnt.center = translatePoint(ent.center, dx, dy);
                } else if (ent.type === 'POINT') {
                    newEnt.position = translatePoint(ent.position, dx, dy);
                } else if (ent.type === 'HATCH') {
                    if (newEnt.boundary && newEnt.boundary.vertices) {
                        newEnt.boundary = {
                            ...newEnt.boundary,
                            vertices: newEnt.boundary.vertices.map((v: Point) => translatePoint(v, dx, dy))
                        };
                    }
                } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
                    newEnt.position = translatePoint(ent.position, dx, dy);
                } else if (ent.type === 'TABLE') {
                    newEnt.position = translatePoint(ent.position, dx, dy);
                }

                previewEntities.push(newEnt as Entity);
            });

        } else if (activeCommand === 'ROTATE') {
            const angle = Math.atan2(cursorPosition[1] - basePoint[1], cursorPosition[0] - basePoint[0]);

            originalEntities.forEach(ent => {
                let newEnt = { ...ent } as any;

                if (ent.type === 'LINE') {
                    newEnt.start = rotatePoint(ent.start, basePoint[0], basePoint[1], angle);
                    newEnt.end = rotatePoint(ent.end, basePoint[0], basePoint[1], angle);
                } else if (ent.type === 'LWPOLYLINE') {
                    newEnt.vertices = ent.vertices.map((v: Point) => rotatePoint(v, basePoint[0], basePoint[1], angle));
                } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
                    newEnt.center = rotatePoint(ent.center, basePoint[0], basePoint[1], angle);
                    if (ent.type === 'ARC') {
                        newEnt.startAngle += angle;
                        newEnt.endAngle += angle;
                    }
                } else if (ent.type === 'ELLIPSE') {
                    newEnt.center = rotatePoint(ent.center, basePoint[0], basePoint[1], angle);
                } else if (ent.type === 'HATCH') {
                    if (newEnt.boundary && newEnt.boundary.vertices) {
                        newEnt.boundary = {
                            ...newEnt.boundary,
                            vertices: newEnt.boundary.vertices.map((v: Point) => rotatePoint(v, basePoint[0], basePoint[1], angle))
                        };
                    }
                } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
                    newEnt.position = rotatePoint(ent.position, basePoint[0], basePoint[1], angle);
                    newEnt.rotation = (ent.rotation || 0) + angle;
                } else if (ent.type === 'TABLE') {
                    newEnt.position = rotatePoint(ent.position, basePoint[0], basePoint[1], angle);
                }
                previewEntities.push(newEnt as Entity);
            });

        } else if (activeCommand === 'MIRROR') {
            // Mirror logic requires a line defined by two points.
            // Point 1 is basePoint/tempPoints[0]. Point 2 is cursorPosition.

            // Check if we have the first point of the mirror line

            // Step 1: Select entities (if not selected).
            // Step 2: First point of mirror line. -> No preview yet, just moving cursor? Or implies preview if we assume horizontal/vertical? No, wait for 2nd point.
            // Step 3: Second point of mirror line. -> Preview active here, line is p1 to cursor.

            // Let's assume the standard flow we implemented/observed in DrawingContext:
            // MIRROR:
            // Step 1: Selection (if needed)
            // Step 1 (actually): First point.
            // Step 2: Second point.

            // If step is 2, it means we have the first point (stored in tempPoints usually for MIRROR in DrawingContext, or passed as basePoint if customized).
            // Looking at DrawingContext logic we saw earlier for MIRROR:
            // "Step 1: Ayna çizgisi ilk nokta ... setTempPoints([point]); setStep(2);"
            // So in Step 2, tempPoints[0] is the first point.

            const firstPoint = commandState.basePoint || (tempPoints && tempPoints[0]) || (commandState.base);

            if (firstPoint) {
                originalEntities.forEach(ent => {
                    let newEnt = { ...ent } as any;
                    const p1 = firstPoint;
                    const p2 = cursorPosition;

                    if (ent.type === 'LINE') {
                        newEnt.start = mirrorPoint(ent.start, p1[0], p1[1], p2[0], p2[1]);
                        newEnt.end = mirrorPoint(ent.end, p1[0], p1[1], p2[0], p2[1]);
                    } else if (ent.type === 'LWPOLYLINE') {
                        newEnt.vertices = ent.vertices.map((v: Point) => mirrorPoint(v, p1[0], p1[1], p2[0], p2[1]));
                    } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
                        newEnt.center = mirrorPoint(ent.center, p1[0], p1[1], p2[0], p2[1]);
                        // Note: For ARC/ELLIPSE rotation/angles might be needed to be flipped/calculated properly.
                        // Simple mirror of center is a good start. For precise arc reflection:
                        // Reflect start/end points? Or center + radius?
                        // If we reflect center, and it's a circle, radius is same.
                        // If ARC, startAngle/endAngle change.
                        // Let's stick to center for now for simplicity or try to reflect key points if possible.
                        if (ent.type === 'ARC') {
                            // Reflect start/end points to re-calculate angles?
                            // A bit complex for simple preview. Just showing center move is often enough or simply mirroring relevant props?
                            // Let's try to be slightly better: Mirror start/end points of arc implies new angles.
                            // But entity data uses angles.
                            // TODO: Full math for arc reflection.
                        }
                    } else if (ent.type === 'POINT') {
                        newEnt.position = mirrorPoint(ent.position, p1[0], p1[1], p2[0], p2[1]);
                    } else if (ent.type === 'HATCH') {
                        if (newEnt.boundary && newEnt.boundary.vertices) {
                            newEnt.boundary = {
                                ...newEnt.boundary,
                                vertices: newEnt.boundary.vertices.map((v: Point) => mirrorPoint(v, p1[0], p1[1], p2[0], p2[1]))
                            };
                        }
                    } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
                        newEnt.position = mirrorPoint(ent.position, p1[0], p1[1], p2[0], p2[1]);
                        // Rotation reflection?
                    } else if (ent.type === 'TABLE') {
                        newEnt.position = mirrorPoint(ent.position, p1[0], p1[1], p2[0], p2[1]);
                    }
                    previewEntities.push(newEnt as Entity);
                });
            }
        }

        return previewEntities;
    }, [activeCommand, step, commandState, selectedIds, entities, cursorPosition]);

    // SCALE için özel durum: step 3 ise
    const scaledEntities = useMemo(() => {
        if (activeCommand === 'SCALE' && step === 3 && selectedIds.size > 0) {
            const originalEntities = entities.filter(ent => selectedIds.has(ent.id));
            const basePoint = commandState.base;
            const dist1 = commandState.dist1;

            if (!basePoint || !dist1 || originalEntities.length === 0) return null;

            const dist2 = Math.hypot(cursorPosition[0] - basePoint[0], cursorPosition[1] - basePoint[1]);
            const factor = dist1 > 0.01 ? dist2 / dist1 : 1;

            return originalEntities.map(ent => {
                let newEnt = { ...ent } as any;
                if (ent.type === 'LINE') {
                    newEnt.start = scalePointFromCenter(ent.start, basePoint, factor);
                    newEnt.end = scalePointFromCenter(ent.end, basePoint, factor);
                } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
                    newEnt.center = scalePointFromCenter(ent.center, basePoint, factor);
                    newEnt.radius *= factor;
                } else if (ent.type === 'LWPOLYLINE') {
                    newEnt.vertices = ent.vertices.map((v: Point) => scalePointFromCenter(v, basePoint, factor));
                } else if (ent.type === 'ELLIPSE') {
                    newEnt.center = scalePointFromCenter(ent.center, basePoint, factor);
                    newEnt.rx *= factor;
                    newEnt.ry *= factor;
                } else if (ent.type === 'HATCH') {
                    if (newEnt.boundary && newEnt.boundary.vertices) {
                        newEnt.boundary = {
                            ...newEnt.boundary,
                            vertices: newEnt.boundary.vertices.map((v: Point) => scalePointFromCenter(v, basePoint, factor))
                        };
                    }
                } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
                    newEnt.position = scalePointFromCenter(ent.position, basePoint, factor);
                    newEnt.height = (ent.height || 10) * factor;
                    if (ent.type === 'MTEXT' && ent.width) {
                        newEnt.width = ent.width * factor;
                    }
                } else if (ent.type === 'TABLE') {
                    newEnt.position = scalePointFromCenter(ent.position, basePoint, factor);
                    newEnt.rowHeight = (ent.rowHeight || 10) * factor;
                    newEnt.colWidth = (ent.colWidth || 30) * factor;
                }
                return newEnt as Entity;
            });
        }
        return null;
    }, [activeCommand, step, commandState, selectedIds, entities, cursorPosition]);

    const finalEntities = transformedEntities || scaledEntities;

    // Helper to render reference circle and scale factor
    const renderScaleGuides = () => {
        if (activeCommand !== 'SCALE' || step !== 3 || !commandState.base || !commandState.dist1) return null;

        const base = commandState.base;
        const dist1 = commandState.dist1;
        const dist2 = Math.hypot(cursorPosition[0] - base[0], cursorPosition[1] - base[1]);
        const factor = dist1 > 0.01 ? dist2 / dist1 : 1;

        // Generate points for reference circle
        const circlePoints: Point[] = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            circlePoints.push([
                base[0] + Math.cos(theta) * dist1,
                base[1] + Math.sin(theta) * dist1,
                0
            ]);
        }

        return (
            <group>
                {/* Reference Circle (Base Distance) */}
                <Line
                    points={circlePoints}
                    color="#ffcc00"
                    lineWidth={1}
                    dashed
                    dashScale={2}
                    opacity={0.4}
                    transparent
                />

                {/* Scale Factor Text */}
                <Text
                    position={[cursorPosition[0] + 2, cursorPosition[1] + 2, 0]}
                    fontSize={14 / 20 * (20 / 1)} // Adjust scale logic if needed, but relative to view
                    scale={[1, 1, 1]} // Text component handles size via fontSize
                    color="#ffcc00" // Gold color matching circle
                    anchorX="left"
                    anchorY="bottom"
                >
                    {`Scale: ${factor.toFixed(2)}x`}
                </Text>
            </group>
        );
    };

    const renderRotateGuides = () => {
        if (activeCommand !== 'ROTATE' || step !== 2) return null;
        const basePoint = commandState.basePoint || commandState.base;
        if (!basePoint) return null;

        const angle = Math.atan2(cursorPosition[1] - basePoint[1], cursorPosition[0] - basePoint[0]);
        const angleDeg = (angle * 180 / Math.PI).toFixed(2);

        return (
            <Text
                position={[cursorPosition[0] + 2, cursorPosition[1] + 2, 0]}
                fontSize={12 / 20 * 20} // relative to zoom logic approx
                color="#ffcc00"
                anchorX="left"
                anchorY="bottom"
            >
                {`${angleDeg}°`}
            </Text>
        );
    };

    const renderMirrorGuides = () => {
        if (activeCommand !== 'MIRROR' || step !== 2) return null;
        // Use robust logic to find the first point, consistent with transformedEntities
        const firstPoint = commandState.basePoint || (tempPoints && tempPoints[0]) || (commandState.base);
        if (!firstPoint) return null;

        const midPoint: Point = [
            (firstPoint[0] + cursorPosition[0]) / 2,
            (firstPoint[1] + cursorPosition[1]) / 2,
            0.1 // Lift text slightly
        ];

        // Calculate extended line points for "infinite" axis visualization
        const dx = cursorPosition[0] - firstPoint[0];
        const dy = cursorPosition[1] - firstPoint[1];
        const len = Math.hypot(dx, dy);

        let axisPoints: [Point, Point] = [
            [firstPoint[0], firstPoint[1], 0.05],
            [cursorPosition[0], cursorPosition[1], 0.05]
        ];

        if (len > 0.001) {
            const EXTEND_LENGTH = 10000; // Large enough to appear infinite in view
            const ux = dx / len;
            const uy = dy / len;

            const start: Point = [
                firstPoint[0] - ux * EXTEND_LENGTH,
                firstPoint[1] - uy * EXTEND_LENGTH,
                0
            ];
            const end: Point = [
                cursorPosition[0] + ux * EXTEND_LENGTH,
                cursorPosition[1] + uy * EXTEND_LENGTH,
                0
            ];
            axisPoints = [start, end];
        }

        return (
            <group>
                {/* Mirror Axis Line - Infinite guide */}
                <Line
                    points={axisPoints}
                    color="#00ffff"
                    lineWidth={1} // Thinner for infinite guide style
                    dashed
                    dashScale={5} // Larger dash for guide style
                    opacity={0.6}
                    transparent
                    depthTest={false}
                    renderOrder={100}
                />

                {/* Active Segment Highlight (P1 to Cursor) used for defining the axis */}
                <Line
                    points={[
                        [firstPoint[0], firstPoint[1], 0.05],
                        [cursorPosition[0], cursorPosition[1], 0.05]
                    ]}
                    color="#00ffff"
                    lineWidth={2}
                    dashed={false} // Solid for the active part
                    opacity={0.8}
                    transparent
                    depthTest={false}
                    renderOrder={101}
                />

                {/* Axis Label */}
                <Text
                    position={[midPoint[0], midPoint[1], 0]}
                    fontSize={12 / 20 * 20}
                    color="#00ffff"
                    anchorX="center"
                    anchorY="bottom"
                >
                    Mirror Axis
                </Text>
            </group>
        );
    };

    if (!finalEntities) return null;

    return (
        <group>
            {finalEntities.map((ent, i) => (
                <GhostEntityRenderer key={i} entity={ent} />
            ))}
            {/* Base point ile imleç arasında yardımcı çizgi */}
            {(commandState.basePoint || commandState.base) && (
                <Line
                    points={[commandState.basePoint || commandState.base, cursorPosition]}
                    color="#666"
                    lineWidth={1}
                    dashed
                    dashScale={2}
                    opacity={0.5}
                    transparent
                />
            )}
            {renderScaleGuides()}
            {renderRotateGuides()}
            {renderMirrorGuides()}
        </group>
    );
};

export default TransformationPreview;
