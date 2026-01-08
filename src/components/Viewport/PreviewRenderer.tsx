import React, { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import type { Point, Entity } from '../../types/entities';
import { DEFAULT_DIMENSION_SETTINGS } from '../../types/dimensionSettings';
import { closestPointOnEntity } from '../../utils/geometryUtils';
import { findEntityIntersections } from '../../utils/intersectionUtils';

// Daire için noktalar oluştur
const generateCirclePoints = (center: Point, radius: number, segments: number = 64): [number, number, number][] => {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push([
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            0.05
        ]);
    }
    return points;
};

// Arc için noktalar oluştur
const generateArcPoints = (
    center: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
    segments: number = 32
): [number, number, number][] => {
    const points: [number, number, number][] = [];
    const angleSpan = endAngle - startAngle;
    for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (i / segments) * angleSpan;
        points.push([
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            0.05
        ]);
    }
    return points;
};

// Elips için noktalar oluştur
const generateEllipsePoints = (
    center: Point,
    rx: number,
    ry: number,
    segments: number = 64
): [number, number, number][] => {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push([
            center[0] + Math.cos(angle) * rx,
            center[1] + Math.sin(angle) * ry,
            0.05
        ]);
    }
    return points;
};

const PreviewRenderer = () => {
    const { activeCommand, tempPoints, cursorPosition, step, commandState, entities, hoveredEntityId } = useDrawing();

    if (!activeCommand) return null;

    if (activeCommand === 'DIMANGULAR') {
        console.log('PreviewRenderer: DIMANGULAR step', step, 'line1:', commandState.line1Id, 'line2:', commandState.line2Id);
    }

    const previewColor = '#00ffff'; // Cyan renk - preview için
    const opacity = 0.7;

    // LINE preview - çizim sırasında çizgiyi göster
    if (activeCommand === 'LINE' && tempPoints.length > 0) {
        const lastPoint = tempPoints[tempPoints.length - 1];
        return (
            <Line
                points={[
                    [lastPoint[0], lastPoint[1], 0.06],
                    [cursorPosition[0], cursorPosition[1], 0.06]
                ]}
                color={previewColor}
                lineWidth={2}
                opacity={opacity}
                transparent
                dashed
                dashSize={4}
                gapSize={2}
            />
        );
    }

    // POLYLINE preview
    if (activeCommand === 'POLYLINE' && tempPoints.length > 0) {
        const previewPoints: [number, number, number][] = tempPoints.map(p => [p[0], p[1], 0.05]);
        previewPoints.push([cursorPosition[0], cursorPosition[1], 0.05]);

        return (
            <Line
                points={previewPoints}
                color={previewColor}
                lineWidth={2}
                opacity={opacity}
                transparent
            />
        );
    }

    // CIRCLE preview - merkez seçildikten sonra daire göster
    if (activeCommand === 'CIRCLE' && step === 2 && tempPoints.length > 0) {
        const center = tempPoints[0];
        const dx = cursorPosition[0] - center[0];
        const dy = cursorPosition[1] - center[1];
        const radius = Math.sqrt(dx * dx + dy * dy);

        if (radius > 0.1) {
            const circlePoints = generateCirclePoints(center, radius);
            return (
                <group>
                    {/* Daire preview */}
                    <Line
                        points={circlePoints}
                        color={previewColor}
                        lineWidth={2}
                        opacity={opacity}
                        transparent
                    />
                    {/* Yarıçap çizgisi */}
                    <Line
                        points={[
                            [center[0], center[1], 0.05],
                            [cursorPosition[0], cursorPosition[1], 0.05]
                        ]}
                        color={previewColor}
                        lineWidth={1}
                        opacity={0.4}
                        transparent
                        dashed
                        dashSize={3}
                        gapSize={2}
                    />
                </group>
            );
        }
    }

    // RECTANGLE preview
    if (activeCommand === 'RECTANGLE' && step === 2 && tempPoints.length > 0) {
        const p1 = tempPoints[0];
        const p2 = cursorPosition;

        const rectPoints: [number, number, number][] = [
            [p1[0], p1[1], 0.05],
            [p2[0], p1[1], 0.05],
            [p2[0], p2[1], 0.05],
            [p1[0], p2[1], 0.05],
            [p1[0], p1[1], 0.05]
        ];

        return (
            <Line
                points={rectPoints}
                color={previewColor}
                lineWidth={2}
                opacity={opacity}
                transparent
            />
        );
    }

    // ARC preview - 3 noktalı arc
    if (activeCommand === 'ARC') {
        if (step === 2 && tempPoints.length === 1) {
            // Merkez belirlendi, son nokta için arc göster
            const center = tempPoints[0];
            const dx = cursorPosition[0] - center[0];
            const dy = cursorPosition[1] - center[1];
            const radius = Math.sqrt(dx * dx + dy * dy);

            if (radius > 0.1) {
                const arcPoints = generateArcPoints(center, radius, 0, Math.PI);
                return (
                    <Line
                        points={arcPoints}
                        color={previewColor}
                        lineWidth={2}
                        opacity={opacity}
                        transparent
                    />
                );
            }
        } else if (step === 3 && tempPoints.length === 2) {
            // Başlangıç açısı belirlendi, bitiş açısı için arc göster
            const center = tempPoints[0];
            const startPoint = tempPoints[1];
            const radius = Math.sqrt(
                Math.pow(startPoint[0] - center[0], 2) +
                Math.pow(startPoint[1] - center[1], 2)
            );
            const startAngle = Math.atan2(startPoint[1] - center[1], startPoint[0] - center[0]);
            const endAngle = Math.atan2(cursorPosition[1] - center[1], cursorPosition[0] - center[0]);

            const arcPoints = generateArcPoints(center, radius, startAngle, endAngle);
            return (
                <Line
                    points={arcPoints}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                />
            );
        }
    }

    // ELLIPSE preview
    if (activeCommand === 'ELLIPSE') {
        if (step === 2 && tempPoints.length === 1) {
            const center = tempPoints[0];
            const rx = Math.abs(cursorPosition[0] - center[0]);
            const ry = Math.abs(cursorPosition[1] - center[1]);

            if (rx > 0.1 && ry > 0.1) {
                const ellipsePoints = generateEllipsePoints(center, rx, ry);
                return (
                    <Line
                        points={ellipsePoints}
                        color={previewColor}
                        lineWidth={2}
                        opacity={opacity}
                        transparent
                    />
                );
            }
        }
    }

    // POLYGON preview
    if (activeCommand === 'POLYGON' && step === 2 && tempPoints.length === 1) {
        const center = tempPoints[0];
        const dx = cursorPosition[0] - center[0];
        const dy = cursorPosition[1] - center[1];
        const radius = Math.sqrt(dx * dx + dy * dy);
        const sides = commandState.sides || 6;

        if (radius > 0.1) {
            const polygonPoints: [number, number, number][] = [];
            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
                polygonPoints.push([
                    center[0] + Math.cos(angle) * radius,
                    center[1] + Math.sin(angle) * radius,
                    0.05
                ]);
            }
            return (
                <Line
                    points={polygonPoints}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                />
            );
        }
    }

    // DONUT preview
    if (activeCommand === 'DONUT') {
        if (step === 2 && tempPoints.length === 1) {
            // İç yarıçap belirleniyor
            const center = tempPoints[0];
            const innerRadius = Math.sqrt(
                Math.pow(cursorPosition[0] - center[0], 2) +
                Math.pow(cursorPosition[1] - center[1], 2)
            );

            if (innerRadius > 0.1) {
                const innerCircle = generateCirclePoints(center, innerRadius);
                return (
                    <Line
                        points={innerCircle}
                        color={previewColor}
                        lineWidth={2}
                        opacity={opacity}
                        transparent
                    />
                );
            }
        } else if (step === 3 && tempPoints.length === 2) {
            // Dış yarıçap belirleniyor
            const center = tempPoints[0];
            const innerRadius = Math.sqrt(
                Math.pow(tempPoints[1][0] - center[0], 2) +
                Math.pow(tempPoints[1][1] - center[1], 2)
            );
            const outerRadius = Math.sqrt(
                Math.pow(cursorPosition[0] - center[0], 2) +
                Math.pow(cursorPosition[1] - center[1], 2)
            );

            if (outerRadius > 0.1) {
                const innerCircle = generateCirclePoints(center, innerRadius);
                const outerCircle = generateCirclePoints(center, outerRadius);
                return (
                    <group>
                        <Line
                            points={innerCircle}
                            color={previewColor}
                            lineWidth={2}
                            opacity={opacity}
                            transparent
                        />
                        <Line
                            points={outerCircle}
                            color={previewColor}
                            lineWidth={2}
                            opacity={opacity}
                            transparent
                        />
                    </group>
                );
            }
        }
    }

    // DIMENSION PREVIEW
    if (activeCommand === 'DIMLINEAR' || activeCommand === 'DIMALIGNED') {
        const previewElements: React.ReactElement[] = [];

        if (step === 1) {
            // İlk nokta belirleniyor - sadece crosshair
            return null;
        } else if (step === 2 && tempPoints.length === 1) {
            // İkinci nokta belirleniyor - başlangıç ve cursor arası çizgi
            previewElements.push(
                <Line
                    key="dim-preview-line"
                    points={[
                        [tempPoints[0][0], tempPoints[0][1], 0.05],
                        [cursorPosition[0], cursorPosition[1], 0.05]
                    ]}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                    dashed
                />
            );
        } else if (step === 3 && tempPoints.length === 2) {
            // Dimension line pozisyonu belirleniyor - tam önizleme
            const start = tempPoints[0];
            const end = tempPoints[1];
            const dimPos = cursorPosition;

            // Basit hesaplama - extension line yönü
            const dir = [end[0] - start[0], end[1] - start[1]];
            const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
            const norm = len > 0 ? [-dir[1] / len, dir[0] / len] : [0, 1];

            // dimPos'un start'tan uzaklığı (normal yönde)
            const dx = dimPos[0] - start[0];
            const dy = dimPos[1] - start[1];
            const offset = dx * norm[0] + dy * norm[1];

            const dimStart: [number, number, number] = [start[0] + norm[0] * offset, start[1] + norm[1] * offset, 0.05];
            const dimEnd: [number, number, number] = [end[0] + norm[0] * offset, end[1] + norm[1] * offset, 0.05];

            // Extension lines and Arrows - use settings
            const settings = DEFAULT_DIMENSION_SETTINGS;
            const arrowSize = settings.arrowSize * 2; // Preview'da biraz büyük göster
            const angle = Math.atan2(dimEnd[1] - dimStart[1], dimEnd[0] - dimStart[0]);
            const arrowAngle = Math.PI / 6;

            previewElements.push(
                <Line key="ext1" points={[[start[0], start[1], 0.05], dimStart]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[[end[0], end[1], 0.05], dimEnd]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                // Dimension line
                <Line key="dimline" points={[dimStart, dimEnd]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,

                // Arrows (Start)
                <Line key="arrow1a" points={[dimStart, [dimStart[0] + arrowSize * Math.cos(angle + Math.PI - arrowAngle), dimStart[1] + arrowSize * Math.sin(angle + Math.PI - arrowAngle), 0.05]]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,
                <Line key="arrow1b" points={[dimStart, [dimStart[0] + arrowSize * Math.cos(angle + Math.PI + arrowAngle), dimStart[1] + arrowSize * Math.sin(angle + Math.PI + arrowAngle), 0.05]]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,

                // Arrows (End)
                <Line key="arrow2a" points={[dimEnd, [dimEnd[0] + arrowSize * Math.cos(angle - arrowAngle), dimEnd[1] + arrowSize * Math.sin(angle - arrowAngle), 0.05]]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,
                <Line key="arrow2b" points={[dimEnd, [dimEnd[0] + arrowSize * Math.cos(angle + arrowAngle), dimEnd[1] + arrowSize * Math.sin(angle + arrowAngle), 0.05]]} color={previewColor} lineWidth={2} opacity={opacity} transparent />
            );
        }

        return <group>{previewElements}</group>;
    }

    // DIMRADIUS / DIMDIAMETER preview
    if (activeCommand === 'DIMRADIUS' || activeCommand === 'DIMDIAMETER') {
        if (step === 2 && commandState?.targetEntity) {
            const target = commandState.targetEntity as any;
            if (target.center) {
                return (
                    <Line
                        points={[
                            [target.center[0], target.center[1], 0.05],
                            [cursorPosition[0], cursorPosition[1], 0.05]
                        ]}
                        color={previewColor}
                        lineWidth={2}
                        opacity={opacity}
                        transparent
                    />
                );
            }
        }
    }

    // DIMCONTINUE preview
    if (activeCommand === 'DIMCONTINUE') {
        const previewElements: React.ReactElement[] = [];

        if (step === 1) {
            // İlk nokta seçiliyor - sadece crosshair
            return null;
        } else if (step === 2 && tempPoints.length === 1) {
            // İkinci nokta seçiliyor
            previewElements.push(
                <Line
                    key="measure-line"
                    points={[[tempPoints[0][0], tempPoints[0][1], 0.05], [cursorPosition[0], cursorPosition[1], 0.05]]}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                    dashed
                    dashSize={4}
                    gapSize={2}
                />
            );
        } else if (step === 3 && tempPoints.length === 2) {
            // Ölçü pozisyonu belirleniyor - tam preview
            const start = tempPoints[0];
            const end = tempPoints[1];
            const dimPos = cursorPosition;

            const dir = [end[0] - start[0], end[1] - start[1]];
            const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
            const norm = len > 0 ? [-dir[1] / len, dir[0] / len] : [0, 1];

            const dx = dimPos[0] - start[0];
            const dy = dimPos[1] - start[1];
            const offset = dx * norm[0] + dy * norm[1];

            const dimStart: [number, number, number] = [start[0] + norm[0] * offset, start[1] + norm[1] * offset, 0.05];
            const dimEnd: [number, number, number] = [end[0] + norm[0] * offset, end[1] + norm[1] * offset, 0.05];

            previewElements.push(
                <Line key="ext1" points={[[start[0], start[1], 0.05], dimStart]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[[end[0], end[1], 0.05], dimEnd]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="dimline" points={[dimStart, dimEnd]} color={previewColor} lineWidth={2} opacity={opacity} transparent />
            );
        } else if (step === 4 && commandState?.basePoint && commandState?.dimLinePosition) {
            // Devam modu
            const basePoint = commandState.basePoint as Point;
            const dimLinePosition = commandState.dimLinePosition as Point;
            // dimType is stored for reference but we use geometric calculation

            // Calculate dimension preview
            const dx = cursorPosition[0] - basePoint[0];
            const dy = cursorPosition[1] - basePoint[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            const norm = len > 0 ? [-dy / len, dx / len] : [0, 1];

            const offsetDist = (dimLinePosition[0] - basePoint[0]) * norm[0] + (dimLinePosition[1] - basePoint[1]) * norm[1];

            const dimStart: [number, number, number] = [basePoint[0] + norm[0] * offsetDist, basePoint[1] + norm[1] * offsetDist, 0.05];
            const dimEnd: [number, number, number] = [cursorPosition[0] + norm[0] * offsetDist, cursorPosition[1] + norm[1] * offsetDist, 0.05];

            previewElements.push(
                <Line key="ext1" points={[[basePoint[0], basePoint[1], 0.05], dimStart]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[[cursorPosition[0], cursorPosition[1], 0.05], dimEnd]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="dimline" points={[dimStart, dimEnd]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,
                <Line key="measure" points={[[basePoint[0], basePoint[1], 0.05], [cursorPosition[0], cursorPosition[1], 0.05]]} color={previewColor} lineWidth={1} opacity={0.4} transparent dashed dashSize={3} gapSize={2} />
            );
        }

        return previewElements.length > 0 ? <group>{previewElements}</group> : null;
    }

    // DIMBASELINE preview
    if (activeCommand === 'DIMBASELINE') {
        const previewElements: React.ReactElement[] = [];

        if (step === 1) {
            // Taban nokta seçiliyor
            return null;
        } else if (step === 2 && tempPoints.length === 1) {
            // İlk bitiş noktası seçiliyor
            previewElements.push(
                <Line
                    key="measure-line"
                    points={[[tempPoints[0][0], tempPoints[0][1], 0.05], [cursorPosition[0], cursorPosition[1], 0.05]]}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                    dashed
                    dashSize={4}
                    gapSize={2}
                />,
                // Base point marker
                <mesh key="base-marker" position={[tempPoints[0][0], tempPoints[0][1], 0.1]}>
                    <circleGeometry args={[2, 16]} />
                    <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
                </mesh>
            );
        } else if (step === 3 && tempPoints.length === 2) {
            // Ölçü pozisyonu belirleniyor
            const basePoint = tempPoints[0];
            const end = tempPoints[1];
            const dimPos = cursorPosition;

            const dir = [end[0] - basePoint[0], end[1] - basePoint[1]];
            const len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
            const norm = len > 0 ? [-dir[1] / len, dir[0] / len] : [0, 1];

            const dx = dimPos[0] - basePoint[0];
            const dy = dimPos[1] - basePoint[1];
            const offset = dx * norm[0] + dy * norm[1];

            const dimStart: [number, number, number] = [basePoint[0] + norm[0] * offset, basePoint[1] + norm[1] * offset, 0.05];
            const dimEnd: [number, number, number] = [end[0] + norm[0] * offset, end[1] + norm[1] * offset, 0.05];

            previewElements.push(
                <Line key="ext1" points={[[basePoint[0], basePoint[1], 0.05], dimStart]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[[end[0], end[1], 0.05], dimEnd]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="dimline" points={[dimStart, dimEnd]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,
                <mesh key="base-marker" position={[basePoint[0], basePoint[1], 0.1]}>
                    <circleGeometry args={[2, 16]} />
                    <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
                </mesh>
            );
        } else if (step === 4 && commandState?.basePoint && commandState?.dimLinePosition) {
            // Devam modu
            const basePoint = commandState.basePoint as Point;
            const dimLinePosition = commandState.dimLinePosition as Point;
            const offsetMultiplier = commandState.offsetMultiplier || 1;

            const dx = cursorPosition[0] - basePoint[0];
            const dy = cursorPosition[1] - basePoint[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            const norm = len > 0 ? [-dy / len, dx / len] : [0, 1];

            const origOffsetX = dimLinePosition[0] - basePoint[0];
            const origOffsetY = dimLinePosition[1] - basePoint[1];
            const dotProduct = origOffsetX * norm[0] + origOffsetY * norm[1];
            const direction = dotProduct >= 0 ? 1 : -1;

            const offset = 10;
            const newDimLineX = dimLinePosition[0] + norm[0] * offset * offsetMultiplier * direction;
            const newDimLineY = dimLinePosition[1] + norm[1] * offset * offsetMultiplier * direction;
            const baseDimDist = (newDimLineX - basePoint[0]) * norm[0] + (newDimLineY - basePoint[1]) * norm[1];

            const dimStart: [number, number, number] = [basePoint[0] + norm[0] * baseDimDist, basePoint[1] + norm[1] * baseDimDist, 0.05];
            const dimEnd: [number, number, number] = [cursorPosition[0] + norm[0] * baseDimDist, cursorPosition[1] + norm[1] * baseDimDist, 0.05];

            previewElements.push(
                <Line key="ext1" points={[[basePoint[0], basePoint[1], 0.05], dimStart]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[[cursorPosition[0], cursorPosition[1], 0.05], dimEnd]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="dimline" points={[dimStart, dimEnd]} color={previewColor} lineWidth={2} opacity={opacity} transparent />,
                <mesh key="base-marker" position={[basePoint[0], basePoint[1], 0.1]}>
                    <circleGeometry args={[2, 16]} />
                    <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
                </mesh>
            );
        }

        return previewElements.length > 0 ? <group>{previewElements}</group> : null;
    }

    // DIMANGULAR preview
    if (activeCommand === 'DIMANGULAR') {
        const previewElements: React.ReactElement[] = [];

        // Step 1: İlk çizgi seçilmemiş - highlight yapma
        // Step 2: İkinci çizgi seçiliyor - ilk çizgiyi highlight yap
        if (step === 2 && commandState.line1Start && commandState.line1End) {
            const line1Start = commandState.line1Start as Point;
            const line1End = commandState.line1End as Point;
            previewElements.push(
                <Line
                    key="sel-line1"
                    points={[[line1Start[0], line1Start[1], 0.1], [line1End[0], line1End[1], 0.1]]}
                    color="#00ff00"
                    lineWidth={4}
                    opacity={0.9}
                    transparent
                />
            );
        }

        // Step 3: Pozisyon belirleniyor - tam önizleme
        if (step === 3 && commandState.line1Start && commandState.line1End && commandState.line2Start && commandState.line2End) {
            const line1Start = commandState.line1Start as Point;
            const line1End = commandState.line1End as Point;
            const line2Start = commandState.line2Start as Point;
            const line2End = commandState.line2End as Point;

            // Her iki çizgiyi de highlight yap
            previewElements.push(
                <Line
                    key="sel-line1"
                    points={[[line1Start[0], line1Start[1], 0.1], [line1End[0], line1End[1], 0.1]]}
                    color="#00ff00"
                    lineWidth={4}
                    opacity={0.9}
                    transparent
                />,
                <Line
                    key="sel-line2"
                    points={[[line2Start[0], line2Start[1], 0.1], [line2End[0], line2End[1], 0.1]]}
                    color="#00ff00"
                    lineWidth={4}
                    opacity={0.9}
                    transparent
                />
            );

            // Kesişim noktasını hesapla
            const x1 = line1Start[0], y1 = line1Start[1];
            const x2 = line1End[0], y2 = line1End[1];
            const x3 = line2Start[0], y3 = line2Start[1];
            const x4 = line2End[0], y4 = line2End[1];

            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            let center: [number, number, number];
            if (Math.abs(denom) < 0.0001) {
                center = [(x1 + x2 + x3 + x4) / 4, (y1 + y2 + y3 + y4) / 4, 0.05];
            } else {
                const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                center = [x1 + t * (x2 - x1), y1 + t * (y2 - y1), 0.05];
            }

            // Çizgi açılarını hesapla
            const angle1 = Math.atan2(y2 - y1, x2 - x1);
            const angle2 = Math.atan2(y4 - y3, x4 - x3);

            // Normalize angles to 0-2PI
            let startAngle = angle1 < 0 ? angle1 + Math.PI * 2 : angle1;
            let endAngle = angle2 < 0 ? angle2 + Math.PI * 2 : angle2;

            // Yarıçap - cursor'dan center'a mesafe
            const radius = Math.max(Math.hypot(cursorPosition[0] - center[0], cursorPosition[1] - center[1]), 15);

            // Kullanıcının tıkladığı pozisyona göre hangi açıyı ölçeceğimizi belirle
            const clickAngle = Math.atan2(cursorPosition[1] - center[1], cursorPosition[0] - center[0]);
            let clickAngleNorm = clickAngle < 0 ? clickAngle + Math.PI * 2 : clickAngle;

            // Açı farkını hesapla
            let diff = endAngle - startAngle;
            if (diff < 0) diff += Math.PI * 2;

            // Cursor hangi açı bölgesinde?
            const isInFirstArc = (() => {
                let a = clickAngleNorm;
                let s = startAngle;
                let e = endAngle;
                // Normalize
                while (a < 0) a += Math.PI * 2;
                while (s < 0) s += Math.PI * 2;
                while (e < 0) e += Math.PI * 2;
                while (a >= Math.PI * 2) a -= Math.PI * 2;
                while (s >= Math.PI * 2) s -= Math.PI * 2;
                while (e >= Math.PI * 2) e -= Math.PI * 2;

                if (s < e) {
                    return a >= s && a <= e;
                } else {
                    return a >= s || a <= e;
                }
            })();

            let arcStartAngle: number;
            let arcEndAngle: number;

            if (isInFirstArc) {
                arcStartAngle = startAngle;
                arcEndAngle = endAngle;
            } else {
                arcStartAngle = endAngle;
                arcEndAngle = startAngle + Math.PI * 2;
            }

            // Arc noktalarını oluştur
            const arcPoints: [number, number, number][] = [];
            const segments = 30;
            for (let i = 0; i <= segments; i++) {
                const ang = arcStartAngle + ((arcEndAngle - arcStartAngle) * i / segments);
                arcPoints.push([
                    center[0] + Math.cos(ang) * radius,
                    center[1] + Math.sin(ang) * radius,
                    0.1
                ]);
            }

            // Arc preview
            previewElements.push(
                <Line key="ang-arc" points={arcPoints} color={previewColor} lineWidth={2} opacity={opacity} transparent />
            );

            // Extension lines - from center outward along start/end angles (solid lines)
            const extOffset = 2; // Small offset from center
            const extExtend = 3; // Extend past arc

            const ext1Start: [number, number, number] = [
                center[0] + Math.cos(arcStartAngle) * extOffset,
                center[1] + Math.sin(arcStartAngle) * extOffset,
                0.1
            ];
            const ext1End: [number, number, number] = [
                center[0] + Math.cos(arcStartAngle) * (radius + extExtend),
                center[1] + Math.sin(arcStartAngle) * (radius + extExtend),
                0.1
            ];

            const ext2Start: [number, number, number] = [
                center[0] + Math.cos(arcEndAngle) * extOffset,
                center[1] + Math.sin(arcEndAngle) * extOffset,
                0.1
            ];
            const ext2End: [number, number, number] = [
                center[0] + Math.cos(arcEndAngle) * (radius + extExtend),
                center[1] + Math.sin(arcEndAngle) * (radius + extExtend),
                0.1
            ];

            previewElements.push(
                <Line key="ext1" points={[ext1Start, ext1End]} color={previewColor} lineWidth={1} opacity={opacity} transparent />,
                <Line key="ext2" points={[ext2Start, ext2End]} color={previewColor} lineWidth={1} opacity={opacity} transparent />
            );

            // Açı değeri - küçük marker ile göster
            const midAngle = arcStartAngle + (arcEndAngle - arcStartAngle) / 2;
            const textRadius = radius + 3;
            const textPos: [number, number, number] = [
                center[0] + Math.cos(midAngle) * textRadius,
                center[1] + Math.sin(midAngle) * textRadius,
                0.1
            ];

            previewElements.push(
                <mesh key="angle-marker" position={textPos}>
                    <circleGeometry args={[1.5, 16]} />
                    <meshBasicMaterial color={previewColor} transparent opacity={0.7} />
                </mesh>
            );
        }

        return <group>{previewElements}</group>;
    }

    // TEXT preview - step 1: editor open (no preview needed)
    // step 2: show pending text following cursor for placement
    if (activeCommand === 'TEXT' && step === 2 && commandState.pendingText) {
        const pendingStyle = commandState.pendingStyle || {};
        const textHeight = pendingStyle.height || 10;
        const textColor = pendingStyle.color || '#FFFFFF';

        return (
            <group position={[cursorPosition[0], cursorPosition[1], 0.1]}>
                {/* Crosshair for precise placement */}
                <Line
                    points={[[-8, 0, 0], [8, 0, 0]]}
                    color={previewColor}
                    lineWidth={1}
                    opacity={0.5}
                    transparent
                    dashed
                    dashSize={2}
                    gapSize={1}
                />
                <Line
                    points={[[0, -8, 0], [0, 8, 0]]}
                    color={previewColor}
                    lineWidth={1}
                    opacity={0.5}
                    transparent
                    dashed
                    dashSize={2}
                    gapSize={1}
                />
                {/* Actual text content preview */}
                <Text
                    position={[2, 0, 0.02]}
                    fontSize={textHeight}
                    color={textColor}
                    anchorX="left"
                    anchorY="middle"
                    fillOpacity={0.7}
                >
                    {commandState.pendingText}
                </Text>
                {/* Text placement indicator */}
                <mesh position={[-2, 0, 0]}>
                    <circleGeometry args={[2, 16]} />
                    <meshBasicMaterial color={previewColor} transparent opacity={0.5} />
                </mesh>
            </group>
        );
    }

    // EXTEND preview - Step 2: Show extended line segment in green
    if (activeCommand === 'EXTEND' && step === 2) {
        const SELECT_THRESHOLD = 5.0;
        let targetEntity: Entity | null = null;
        let minD = Infinity;

        const boundaryIds = commandState?.boundaries || [];

        for (const ent of entities) {
            if (ent.visible === false) continue;
            if (boundaryIds.length > 0 && boundaryIds.includes(ent.id)) continue;

            const d = closestPointOnEntity(cursorPosition[0], cursorPosition[1], ent);
            if (d < SELECT_THRESHOLD && d < minD) {
                minD = d;
                targetEntity = ent;
            }
        }

        if (targetEntity && targetEntity.type === 'LINE') {
            const lineEnt = targetEntity as any;
            const boundaries = boundaryIds.length > 0
                ? entities.filter(e => boundaryIds.includes(e.id))
                : entities.filter(e => e.visible !== false && e.id !== targetEntity!.id);

            // Determine which end to extend
            const distToStart = Math.hypot(cursorPosition[0] - lineEnt.start[0], cursorPosition[1] - lineEnt.start[1]);
            const distToEnd = Math.hypot(cursorPosition[0] - lineEnt.end[0], cursorPosition[1] - lineEnt.end[1]);
            const extendStart = distToStart < distToEnd;

            const dx = lineEnt.end[0] - lineEnt.start[0];
            const dy = lineEnt.end[1] - lineEnt.start[1];
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0.0001) {
                const dirX = dx / len;
                const dirY = dy / len;

                // Find closest intersection
                const extendLength = 10000;
                const extendedStart: Point = extendStart
                    ? [lineEnt.start[0] - dirX * extendLength, lineEnt.start[1] - dirY * extendLength, 0]
                    : lineEnt.start;
                const extendedEnd: Point = !extendStart
                    ? [lineEnt.end[0] + dirX * extendLength, lineEnt.end[1] + dirY * extendLength, 0]
                    : lineEnt.end;

                let closestIntersection: Point | null = null;
                let minDistToIntersection = Infinity;

                for (const boundary of boundaries) {
                    if (boundary.id === targetEntity.id) continue;
                    const testLine = { ...targetEntity, start: extendedStart, end: extendedEnd };
                    const intersections = findEntityIntersections(testLine, boundary);

                    for (const result of intersections) {
                        const distFromEnd = extendStart
                            ? Math.hypot(result.point[0] - lineEnt.start[0], result.point[1] - lineEnt.start[1])
                            : Math.hypot(result.point[0] - lineEnt.end[0], result.point[1] - lineEnt.end[1]);

                        // Check direction
                        const dotProduct = extendStart
                            ? (result.point[0] - lineEnt.start[0]) * (-dirX) + (result.point[1] - lineEnt.start[1]) * (-dirY)
                            : (result.point[0] - lineEnt.end[0]) * dirX + (result.point[1] - lineEnt.end[1]) * dirY;

                        if (dotProduct > 0 && distFromEnd < minDistToIntersection) {
                            minDistToIntersection = distFromEnd;
                            closestIntersection = result.point;
                        }
                    }
                }

                if (closestIntersection) {
                    // Show the extension segment in green/dashed
                    const extStart: [number, number, number] = extendStart
                        ? [closestIntersection[0], closestIntersection[1], 0.1]
                        : [lineEnt.end[0], lineEnt.end[1], 0.1];
                    const extEnd: [number, number, number] = extendStart
                        ? [lineEnt.start[0], lineEnt.start[1], 0.1]
                        : [closestIntersection[0], closestIntersection[1], 0.1];

                    return (
                        <Line
                            points={[extStart, extEnd]}
                            color="#00ff00"
                            lineWidth={3}
                            opacity={0.8}
                            transparent
                            dashed
                            dashSize={4}
                            gapSize={2}
                        />
                    );
                }
            }
        }
    }

    // OFFSET preview - Step 3: Show offset curve in cyan
    if (activeCommand === 'OFFSET' && step === 3 && commandState?.targetId && commandState?.distance) {
        const targetEntity = entities.find(e => e.id === commandState.targetId);
        if (targetEntity && targetEntity.type === 'LINE') {
            const lineEnt = targetEntity as any;
            const dx = lineEnt.end[0] - lineEnt.start[0];
            const dy = lineEnt.end[1] - lineEnt.start[1];
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0.0001) {
                // Calculate perpendicular direction
                const nx = -dy / len;
                const ny = dx / len;

                // Determine offset direction based on cursor position
                const midX = (lineEnt.start[0] + lineEnt.end[0]) / 2;
                const midY = (lineEnt.start[1] + lineEnt.end[1]) / 2;
                const toMouse = [cursorPosition[0] - midX, cursorPosition[1] - midY];
                const side = toMouse[0] * nx + toMouse[1] * ny > 0 ? 1 : -1;

                const distance = commandState.distance * side;

                // Calculate offset line
                const offsetStart: [number, number, number] = [
                    lineEnt.start[0] + nx * distance,
                    lineEnt.start[1] + ny * distance,
                    0.1
                ];
                const offsetEnd: [number, number, number] = [
                    lineEnt.end[0] + nx * distance,
                    lineEnt.end[1] + ny * distance,
                    0.1
                ];

                return (
                    <group>
                        {/* Offset line preview */}
                        <Line
                            points={[offsetStart, offsetEnd]}
                            color="#00ffff"
                            lineWidth={2}
                            opacity={0.8}
                            transparent
                        />
                        {/* Distance guide line from original to offset */}
                        <Line
                            points={[
                                [midX, midY, 0.1],
                                [midX + nx * distance, midY + ny * distance, 0.1]
                            ]}
                            color="#ffff00"
                            lineWidth={1}
                            opacity={0.5}
                            transparent
                            dashed
                            dashSize={3}
                            gapSize={2}
                        />
                    </group>
                );
            }
        }
    }

    // TRIM preview - Step 2: Show segment that would be trimmed in red
    if (activeCommand === 'TRIM' && step === 2) {
        // Find entity under cursor
        const SELECT_THRESHOLD = 5.0;
        let targetEntity: Entity | null = null;
        let minD = Infinity;

        const cuttingEdgeIds = commandState?.cuttingEdges || [];

        for (const ent of entities) {
            if (ent.visible === false) continue;
            // In explicit mode, skip cutting edges as targets
            if (cuttingEdgeIds.length > 0 && cuttingEdgeIds.includes(ent.id)) continue;

            const d = closestPointOnEntity(cursorPosition[0], cursorPosition[1], ent);
            if (d < SELECT_THRESHOLD && d < minD) {
                minD = d;
                targetEntity = ent;
            }
        }

        if (targetEntity && targetEntity.type === 'LINE') {
            // Get cutting edges
            const cuttingEdges = cuttingEdgeIds.length > 0
                ? entities.filter(e => cuttingEdgeIds.includes(e.id))
                : entities.filter(e => e.visible !== false && e.id !== targetEntity!.id);

            // Calculate trim preview for LINE
            const lineEnt = targetEntity as any;
            const dx = lineEnt.end[0] - lineEnt.start[0];
            const dy = lineEnt.end[1] - lineEnt.start[1];
            const lenSq = dx * dx + dy * dy;

            if (lenSq > 0.0001) {
                const tValues: number[] = [0, 1];

                // Find intersection t-values
                for (const cutter of cuttingEdges) {
                    if (cutter.id === targetEntity.id) continue;
                    const results = findEntityIntersections(targetEntity, cutter);
                    for (const res of results) {
                        const t = ((res.point[0] - lineEnt.start[0]) * dx + (res.point[1] - lineEnt.start[1]) * dy) / lenSq;
                        if (t > 0.00001 && t < 0.99999) {
                            tValues.push(t);
                        }
                    }
                }

                // Sort t-values
                tValues.sort((a, b) => a - b);

                // Find segment containing click point
                const clickT = ((cursorPosition[0] - lineEnt.start[0]) * dx + (cursorPosition[1] - lineEnt.start[1]) * dy) / lenSq;

                // Find which segment will be trimmed
                for (let i = 0; i < tValues.length - 1; i++) {
                    const t0 = tValues[i];
                    const t1 = tValues[i + 1];

                    if (clickT >= t0 - 0.001 && clickT <= t1 + 0.001) {
                        // This segment will be trimmed - show in red
                        const segStart: [number, number, number] = [
                            lineEnt.start[0] + dx * t0,
                            lineEnt.start[1] + dy * t0,
                            0.1
                        ];
                        const segEnd: [number, number, number] = [
                            lineEnt.start[0] + dx * t1,
                            lineEnt.start[1] + dy * t1,
                            0.1
                        ];

                        return (
                            <Line
                                points={[segStart, segEnd]}
                                color="#ff0000"
                                lineWidth={3}
                                opacity={0.8}
                                transparent
                                dashed
                                dashSize={4}
                                gapSize={2}
                            />
                        );
                    }
                }
            }
        }
    }

    return null;
};

export default React.memo(PreviewRenderer);
