import React from 'react';
import { Html, Line } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import { distance2D, radToDeg } from '../../utils/geometryUtils';
import { formatWithUnit, formatDimension, formatSize, convertToUnit } from '../../utils/unitConversion';

// Inline styles
const styles = {
    dimLabel: {
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#00ff00',
        padding: '3px 8px',
        borderRadius: '3px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        fontWeight: 'bold' as const,
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(0, 255, 0, 0.3)',
        textShadow: '0 0 3px rgba(0, 255, 0, 0.5)',
    },
    lengthLabel: {
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#ffff00',
        padding: '3px 8px',
        borderRadius: '3px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        fontWeight: 'bold' as const,
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(255, 255, 0, 0.3)',
        textShadow: '0 0 3px rgba(255, 255, 0, 0.5)',
    },
    angleLabel: {
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#00ff00',
        padding: '2px 6px',
        borderRadius: '3px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '11px',
        fontWeight: 'bold' as const,
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(0, 255, 0, 0.3)',
    },
    radiusLabel: {
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#00ffff',
        padding: '3px 8px',
        borderRadius: '3px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        fontWeight: 'bold' as const,
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(0, 255, 255, 0.3)',
        textShadow: '0 0 3px rgba(0, 255, 255, 0.5)',
    },
    sizeLabel: {
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#ff9900',
        padding: '3px 8px',
        borderRadius: '3px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '12px',
        fontWeight: 'bold' as const,
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(255, 153, 0, 0.3)',
        textShadow: '0 0 3px rgba(255, 153, 0, 0.5)',
    },
    coordTooltip: {
        background: 'rgba(30, 30, 30, 0.9)',
        color: '#aaaaaa',
        padding: '2px 6px',
        borderRadius: '2px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '10px',
        whiteSpace: 'nowrap' as const,
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
};

const DynamicInput = () => {
    const { activeCommand, tempPoints, cursorPosition, step, baseUnit, drawingUnit, activeGrip } = useDrawing();

    // Grip düzenleme modu için ölçü gösterimi
    if (activeGrip) {
        const startPoint = activeGrip.startPoint;
        const rawDist = distance2D(startPoint[0], startPoint[1], cursorPosition[0], cursorPosition[1]);
        const dist = convertToUnit(rawDist, baseUnit, drawingUnit);
        const dx = cursorPosition[0] - startPoint[0];
        const dy = cursorPosition[1] - startPoint[1];
        const angle = radToDeg(Math.atan2(dy, dx));
        const angleNorm = angle < 0 ? angle + 360 : angle;

        const midPoint: [number, number, number] = [
            (startPoint[0] + cursorPosition[0]) / 2,
            (startPoint[1] + cursorPosition[1]) / 2,
            0.15
        ];

        // Referans çizgi (başlangıçtan imleçe)
        const linePoints: [number, number, number][] = [
            [startPoint[0], startPoint[1], 0.12],
            [cursorPosition[0], cursorPosition[1], 0.12]
        ];

        return (
            <group>
                {/* Referans çizgi (kesik çizgili) */}
                <Line
                    points={linePoints}
                    color="#ff6600"
                    lineWidth={2}
                    opacity={0.6}
                    transparent
                    dashed
                    dashSize={3}
                    gapSize={2}
                />

                {/* Uzunluk etiketi */}
                {rawDist > 2 && (
                    <Html
                        position={midPoint}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={{
                            ...styles.lengthLabel,
                            background: 'rgba(255, 102, 0, 0.9)',
                            transform: `rotate(${angle > 90 || angle < -90 ? angle + 180 : angle}deg)`
                        }}>
                            {formatWithUnit(dist, drawingUnit)}
                        </div>
                    </Html>
                )}

                {/* Açı etiketi */}
                {rawDist > 10 && (
                    <Html
                        position={[cursorPosition[0], cursorPosition[1] - 3, 0.15]}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={{
                            ...styles.angleLabel,
                            background: 'rgba(255, 102, 0, 0.9)'
                        }}>
                            {angleNorm.toFixed(1)}°
                        </div>
                    </Html>
                )}

                {/* Delta X, Delta Y */}
                {rawDist > 5 && (
                    <Html
                        position={[cursorPosition[0] + 2, cursorPosition[1] + 2, 0.15]}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                    >
                        <div style={{
                            ...styles.coordTooltip,
                            background: 'rgba(255, 102, 0, 0.9)'
                        }}>
                            ΔX: {formatWithUnit(convertToUnit(Math.abs(dx), baseUnit, drawingUnit), drawingUnit)}<br />
                            ΔY: {formatWithUnit(convertToUnit(Math.abs(dy), baseUnit, drawingUnit), drawingUnit)}
                        </div>
                    </Html>
                )}
            </group>
        );
    }

    if (!activeCommand || tempPoints.length === 0) return null;

    const lastPoint = tempPoints[tempPoints.length - 1];
    // Mesafe baseUnit cinsinden hesaplanır, sonra görüntüleme birimine dönüştürülür
    const rawDist = distance2D(lastPoint[0], lastPoint[1], cursorPosition[0], cursorPosition[1]);
    const dist = convertToUnit(rawDist, baseUnit, drawingUnit);
    const dx = cursorPosition[0] - lastPoint[0];
    const dy = cursorPosition[1] - lastPoint[1];
    const angle = radToDeg(Math.atan2(dy, dx));
    const angleNorm = angle < 0 ? angle + 360 : angle;

    // Orta nokta hesapla (uzunluk etiketi için)
    const midPoint: [number, number, number] = [
        (lastPoint[0] + cursorPosition[0]) / 2,
        (lastPoint[1] + cursorPosition[1]) / 2,
        0.1
    ];

    // Açı yayı için noktalar
    const arcRadius = Math.min(dist * 0.3, 50);
    const arcPoints: [number, number, number][] = [];
    const arcSegments = 20;
    for (let i = 0; i <= arcSegments; i++) {
        const t = (i / arcSegments) * (angleNorm * Math.PI / 180);
        arcPoints.push([
            lastPoint[0] + Math.cos(t) * arcRadius,
            lastPoint[1] + Math.sin(t) * arcRadius,
            0.1
        ]);
    }

    // Açı etiketi pozisyonu
    const angleLabelAngle = (angleNorm / 2) * Math.PI / 180;

    // Uzunluk etiketi için offset
    const perpAngle = angle + 90;
    const labelOffset = 12;
    const lengthLabelPos: [number, number, number] = [
        midPoint[0] + Math.cos(perpAngle * Math.PI / 180) * labelOffset,
        midPoint[1] + Math.sin(perpAngle * Math.PI / 180) * labelOffset,
        0.1
    ];

    // LINE ve POLYLINE için
    if (activeCommand === 'LINE' || activeCommand === 'POLYLINE') {
        // Referans zemin çizgisi (yatay) - başlangıç noktasından sağa doğru
        const baseLineLength = Math.min(dist * 0.5, 80);
        const baseLinePoints: [number, number, number][] = [
            [lastPoint[0], lastPoint[1], 0.05],
            [lastPoint[0] + baseLineLength, lastPoint[1], 0.05]
        ];

        // Açı etiketi pozisyonu - çizginin altında
        const angleLabelOffset = 25;
        const angleLabelBelowPos: [number, number, number] = [
            lastPoint[0] + Math.cos(angleLabelAngle) * (arcRadius + 10),
            lastPoint[1] + Math.sin(angleLabelAngle) * (arcRadius + 10) - angleLabelOffset,
            0.1
        ];

        return (
            <group>
                {/* Referans zemin çizgisi (silik yatay çizgi) */}
                {dist > 15 && angleNorm > 5 && angleNorm < 355 && (
                    <Line
                        points={baseLinePoints}
                        color="#888888"
                        lineWidth={1}
                        opacity={0.3}
                        transparent
                        dashed
                        dashSize={3}
                        gapSize={2}
                    />
                )}

                {/* Açı yayı (silik) */}
                {dist > 15 && angleNorm > 5 && angleNorm < 355 && (
                    <Line
                        points={arcPoints}
                        color="#00ff00"
                        lineWidth={1}
                        opacity={0.4}
                        transparent
                    />
                )}

                {/* Uzunluk etiketi - çizginin tam üzerinde (orta nokta) */}
                {dist > 5 && (
                    <Html
                        position={midPoint}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={{
                            ...styles.lengthLabel,
                            transform: `rotate(${angle > 90 || angle < -90 ? angle + 180 : angle}deg)`
                        }}>
                            {formatWithUnit(dist, drawingUnit)}
                        </div>
                    </Html>
                )}

                {/* Açı etiketi - çizginin altında */}
                {dist > 25 && angleNorm > 5 && angleNorm < 355 && (
                    <Html
                        position={angleLabelBelowPos}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.angleLabel}>{angleNorm.toFixed(1)}°</div>
                    </Html>
                )}

                {/* Koordinat tooltip */}
                <Html
                    position={[cursorPosition[0], cursorPosition[1], 0.1]}
                    style={{ pointerEvents: 'none', transform: 'translate(15px, -25px)' }}
                    zIndexRange={[100, 0]}
                >
                    <div style={styles.coordTooltip}>
                        {cursorPosition[0].toFixed(2)}, {cursorPosition[1].toFixed(2)}
                    </div>
                </Html>
            </group>
        );
    }

    // CIRCLE için - yarıçap etiketi çizginin ortasında
    if (activeCommand === 'CIRCLE' && step === 2) {
        // Yarıçap etiketini dairenin merkez-kenar çizgisinin ortasına koy
        const radiusMidPoint: [number, number, number] = [
            (lastPoint[0] + cursorPosition[0]) / 2,
            (lastPoint[1] + cursorPosition[1]) / 2,
            0.1
        ];

        return (
            <group>
                {/* Yarıçap etiketi - yarıçap çizgisinin ortasında */}
                <Html
                    position={radiusMidPoint}
                    style={{ pointerEvents: 'none' }}
                    zIndexRange={[100, 0]}
                    center
                >
                    <div style={{
                        ...styles.radiusLabel,
                        transform: `rotate(${angle > 90 || angle < -90 ? angle + 180 : angle}deg)`
                    }}>
                        {formatDimension('R = ', dist, drawingUnit)}
                    </div>
                </Html>

                <Html
                    position={[cursorPosition[0], cursorPosition[1], 0.1]}
                    style={{ pointerEvents: 'none', transform: 'translate(15px, -25px)' }}
                    zIndexRange={[100, 0]}
                >
                    <div style={styles.coordTooltip}>
                        {cursorPosition[0].toFixed(2)}, {cursorPosition[1].toFixed(2)}
                    </div>
                </Html>
            </group>
        );
    }

    // RECTANGLE için
    if (activeCommand === 'RECTANGLE' && step === 2) {
        const rawWidth = Math.abs(dx);
        const rawHeight = Math.abs(dy);
        const width = convertToUnit(rawWidth, baseUnit, drawingUnit);
        const height = convertToUnit(rawHeight, baseUnit, drawingUnit);

        // Genişlik etiketi - alt kenarda, şeklin tam ortasında
        const widthLabelPos: [number, number, number] = [
            (lastPoint[0] + cursorPosition[0]) / 2,
            Math.min(lastPoint[1], cursorPosition[1]),  // Alt kenar
            0.1
        ];

        // Yükseklik etiketi - sol kenarda, şeklin tam ortasında
        const heightLabelPos: [number, number, number] = [
            Math.min(lastPoint[0], cursorPosition[0]),  // Sol kenar
            (lastPoint[1] + cursorPosition[1]) / 2,
            0.1
        ];

        return (
            <group>
                {/* Genişlik etiketi - alt kenara bitişik */}
                {width > 5 && (
                    <Html
                        position={widthLabelPos}
                        style={{ pointerEvents: 'none', transform: 'translateY(12px)' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.sizeLabel}>{formatWithUnit(width, drawingUnit)}</div>
                    </Html>
                )}

                {/* Yükseklik etiketi - sol kenara bitişik */}
                {height > 5 && (
                    <Html
                        position={heightLabelPos}
                        style={{ pointerEvents: 'none', transform: 'translateX(-100%) translateX(-5px)' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.sizeLabel}>{formatWithUnit(height, drawingUnit)}</div>
                    </Html>
                )}

                <Html
                    position={[cursorPosition[0], cursorPosition[1], 0.1]}
                    style={{ pointerEvents: 'none', transform: 'translate(15px, -25px)' }}
                    zIndexRange={[100, 0]}
                >
                    <div style={styles.coordTooltip}>
                        {formatSize(width, height, drawingUnit)}
                    </div>
                </Html>
            </group>
        );
    }

    // ARC için
    if (activeCommand === 'ARC') {
        return (
            <group>
                <Html position={lengthLabelPos} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
                    <div style={styles.dimLabel}>{formatWithUnit(dist, drawingUnit)}</div>
                </Html>

                <Html
                    position={[cursorPosition[0], cursorPosition[1], 0.1]}
                    style={{ pointerEvents: 'none', transform: 'translate(15px, -25px)' }}
                    zIndexRange={[100, 0]}
                >
                    <div style={styles.coordTooltip}>
                        {cursorPosition[0].toFixed(2)}, {cursorPosition[1].toFixed(2)}
                    </div>
                </Html>
            </group>
        );
    }

    // Diğer komutlar için
    return (
        <Html
            position={[cursorPosition[0], cursorPosition[1], 0.1]}
            style={{ pointerEvents: 'none', transform: 'translate(15px, -25px)' }}
            zIndexRange={[100, 0]}
        >
            <div style={styles.coordTooltip}>
                {cursorPosition[0].toFixed(2)}, {cursorPosition[1].toFixed(2)}
            </div>
        </Html>
    );
};

export default React.memo(DynamicInput);
