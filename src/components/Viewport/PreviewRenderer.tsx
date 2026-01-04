import React from 'react';
import { Line } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import type { Point } from '../../types/entities';

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
    const { activeCommand, tempPoints, cursorPosition, step, commandState, entities } = useDrawing();

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
                    [lastPoint[0], lastPoint[1], 0.05],
                    [cursorPosition[0], cursorPosition[1], 0.05]
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

            // Extension lines and Arrows
            const arrowSize = 5; // Default big arrow size
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

    // DIMANGULAR preview
    if (activeCommand === 'DIMANGULAR') {
        const previewElements: React.ReactElement[] = [];

        if (step === 2 && tempPoints.length === 1) {
            // Center'dan P1'e çizgi
            previewElements.push(
                <Line
                    key="ang-line1"
                    points={[
                        [tempPoints[0][0], tempPoints[0][1], 0.05],
                        [cursorPosition[0], cursorPosition[1], 0.05]
                    ]}
                    color={previewColor}
                    lineWidth={2}
                    opacity={opacity}
                    transparent
                />
            );
        } else if (step === 3 && commandState.line1Id && commandState.line2Id) {
            // Arc önizlemesi - both lines selected, show arc preview
            const line1 = entities.find(e => e.id === commandState.line1Id) as any;
            const line2 = entities.find(e => e.id === commandState.line2Id) as any;

            if (line1 && line2) {
                // Highlight selected lines
                previewElements.push(
                    <Line key="sel-line1" points={[line1.start, line1.end]} color="#00ff00" lineWidth={4} opacity={0.9} transparent />,
                    <Line key="sel-line2" points={[line2.start, line2.end]} color="#00ff00" lineWidth={4} opacity={0.9} transparent />
                );

                // Calculate intersection
                const x1 = line1.start[0], y1 = line1.start[1];
                const x2 = line1.end[0], y2 = line1.end[1];
                const x3 = line2.start[0], y3 = line2.start[1];
                const x4 = line2.end[0], y4 = line2.end[1];

                const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                let center: [number, number, number];
                if (Math.abs(denom) < 0.0001) {
                    center = [(x1 + x2 + x3 + x4) / 4, (y1 + y2 + y3 + y4) / 4, 0];
                } else {
                    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                    center = [x1 + t * (x2 - x1), y1 + t * (y2 - y1), 0];
                }

                const angle1 = Math.atan2(y2 - y1, x2 - x1);
                const angle2 = Math.atan2(y4 - y3, x4 - x3);
                let startAngle = angle1 < 0 ? angle1 + Math.PI * 2 : angle1;
                let endAngle = angle2 < 0 ? angle2 + Math.PI * 2 : angle2;

                const radius = Math.sqrt(Math.pow(cursorPosition[0] - center[0], 2) + Math.pow(cursorPosition[1] - center[1], 2));
                const arcPoints = generateArcPoints(center, radius, startAngle, endAngle);

                previewElements.push(
                    <Line key="ang-arc" points={arcPoints} color={previewColor} lineWidth={2} opacity={opacity} transparent />
                );
            }
        }

        // Step 1 veya 2'de seçilmiş çizgiyi göster
        if (step >= 2 && commandState.line1Id) {
            const line1 = entities.find(e => e.id === commandState.line1Id) as any;
            if (line1) {
                previewElements.push(
                    <Line key="sel-line1-step" points={[line1.start, line1.end]} color="#00ff00" lineWidth={4} opacity={0.9} transparent />
                );
            }
        }

        return <group>{previewElements}</group>;
    }

    return null;
};

export default React.memo(PreviewRenderer);
