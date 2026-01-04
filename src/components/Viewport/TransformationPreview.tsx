import { useMemo } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import { Line, Text } from '@react-three/drei';
import { translatePoint, rotatePoint, scalePointFromCenter } from '../../utils/geometryUtils';
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
                    />
                ))}
            </group>
        );
    }
    return null;
};

const TransformationPreview = () => {
    const { activeCommand, step, commandState, selectedIds, entities, cursorPosition } = useDrawing();

    // Dönüştürülmüş varlıkları hesapla (sadece aktif komut varsa)
    const transformedEntities = useMemo(() => {
        if (!activeCommand || selectedIds.size === 0) return null;

        // Base point set edilmiş olmalı (genelde step >= 2)
        if (step !== 2) return null;

        const originalEntities = entities.filter(ent => selectedIds.has(ent.id));
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
        </group>
    );
};

export default TransformationPreview;
