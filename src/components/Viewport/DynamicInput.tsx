import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html, Line } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import { distance2D, radToDeg } from '../../utils/geometryUtils';
import { formatWithUnit, formatDimension, formatSize, convertToUnit } from '../../utils/unitConversion';
import type { Point } from '../../types/entities';

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
    inputContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '6px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(0, 255, 0, 0.4)',
    },
    inputRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    inputLabel: {
        color: '#888',
        fontSize: '10px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        minWidth: '12px',
    },
    inputField: {
        background: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(0, 255, 0, 0.5)',
        borderRadius: '2px',
        color: '#00ff00',
        fontSize: '11px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        padding: '2px 4px',
        width: '60px',
        outline: 'none',
    },
    inputFieldFocused: {
        background: 'rgba(0, 50, 0, 0.8)',
        border: '1px solid rgba(0, 255, 0, 0.8)',
        boxShadow: '0 0 5px rgba(0, 255, 0, 0.3)',
    },
    inputUnit: {
        color: '#666',
        fontSize: '10px',
        fontFamily: "'Consolas', 'Monaco', monospace",
    },
    inputHint: {
        color: '#555',
        fontSize: '9px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        marginTop: '2px',
    },
};

// Editable Input Component for precise dimension entry
interface DimensionInputProps {
    position: [number, number, number];
    length: number;
    angle: number;
    unit: string;
    onSubmit: (length: number, angle: number) => void;
}

const DimensionInputPanel: React.FC<DimensionInputProps> = ({ position, length, angle, unit, onSubmit }) => {
    // Initial value should only be set once or when re-mounting
    const [lengthValue, setLengthValue] = useState('');
    const [angleValue, setAngleValue] = useState('');
    const [focusedField, setFocusedField] = useState<'length' | 'angle' | null>(null);
    const lengthInputRef = useRef<HTMLInputElement>(null);
    const angleInputRef = useRef<HTMLInputElement>(null);

    // Update display values when props change, ONLY if not focused and not typing
    useEffect(() => {
        if (focusedField !== 'length') {
            setLengthValue(length.toFixed(2));
        }
    }, [length, focusedField]);

    useEffect(() => {
        if (focusedField !== 'angle') {
            setAngleValue(angle.toFixed(1));
        }
    }, [angle, focusedField]);

    // Global Key Listener for "AutoCAD-style" direct input
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if already focused or holding modifiers
            if (document.activeElement === lengthInputRef.current || document.activeElement === angleInputRef.current) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            // If user types a number, dot, or minus
            if (/^[\d.-]$/.test(e.key)) {
                e.preventDefault();
                setFocusedField('length');
                // Overwrite current dynamic value with the typed character
                setLengthValue(e.key);
                lengthInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, field: 'length' | 'angle') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const len = parseFloat(lengthValue);
            const ang = parseFloat(angleValue);
            // Use current props if parse fails (empty string)
            onSubmit(isNaN(len) ? length : len, isNaN(ang) ? angle : ang);
            // Defocus after submit
            (e.target as HTMLInputElement).blur();
            setFocusedField(null);
            // Restore dynamic tracking
        } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (field === 'length') {
                setFocusedField('angle');
                // When tabbing to angle, select all for easy overwrite
                setTimeout(() => angleInputRef.current?.select(), 0);
            } else {
                setFocusedField('length');
                setTimeout(() => lengthInputRef.current?.select(), 0);
            }
        } else if (e.key === 'Escape') {
            (e.target as HTMLInputElement).blur();
            setFocusedField(null);
        }
    }, [lengthValue, angleValue, length, angle, onSubmit]);

    // Auto-focus logic when field changes via Tab
    useEffect(() => {
        if (focusedField === 'length') {
            lengthInputRef.current?.focus();
        } else if (focusedField === 'angle') {
            angleInputRef.current?.focus();
        }
    }, [focusedField]);

    return (
        <Html
            position={position}
            style={{ pointerEvents: 'auto', transform: 'translate(40px, 40px)' }} // Kursörden 40px sağ-aşağı ofset
            zIndexRange={[200, 100]}
        >
            <div style={styles.inputContainer} onClick={(e) => e.stopPropagation()}>
                <div style={styles.inputRow}>
                    <span style={styles.inputLabel}>L:</span>
                    <input
                        ref={lengthInputRef}
                        type="text"
                        style={{
                            ...styles.inputField,
                            ...(focusedField === 'length' ? styles.inputFieldFocused : {})
                        }}
                        value={lengthValue}
                        onChange={(e) => setLengthValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'length')}
                        onFocus={() => {
                            if (focusedField !== 'length') {
                                setFocusedField('length');
                                lengthInputRef.current?.select();
                            }
                        }}
                        onBlur={() => {
                            // Delay blur slightly to allow click-to-focus on other field
                            setTimeout(() => {
                                if (document.activeElement !== angleInputRef.current && document.activeElement !== lengthInputRef.current) {
                                    setFocusedField(null);
                                }
                            }, 100);
                        }}
                    />
                    <span style={styles.inputUnit}>{unit}</span>
                </div>
                <div style={styles.inputRow}>
                    <span style={styles.inputLabel}>A:</span>
                    <input
                        ref={angleInputRef}
                        type="text"
                        style={{
                            ...styles.inputField,
                            ...(focusedField === 'angle' ? styles.inputFieldFocused : {})
                        }}
                        value={angleValue}
                        onChange={(e) => setAngleValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 'angle')}
                        onFocus={() => {
                            if (focusedField !== 'angle') {
                                setFocusedField('angle');
                                angleInputRef.current?.select();
                            }
                        }}
                    />
                    <span style={styles.inputUnit}>°</span>
                </div>
                <div style={styles.inputHint}>Tab: Geçiş | Enter: Tamamla</div>
            </div>
        </Html>
    );
};

const DynamicInput = () => {
    const { activeCommand, tempPoints, cursorPosition, step, baseUnit, drawingUnit, activeGrip, handleCommandInput } = useDrawing();

    // Handle dimension input submit - calculate new point based on length and angle
    // Moved to top-level to comply with Rules of Hooks
    const handleDimensionSubmit = useCallback((inputLength: number, inputAngle: number) => {
        if (!tempPoints || tempPoints.length === 0) return;
        const lastPoint = tempPoints[tempPoints.length - 1];

        // Convert angle to radians
        const angleRad = inputAngle * Math.PI / 180;

        // Convert length from drawing unit to base unit
        const lengthInBaseUnit = convertToUnit(inputLength, drawingUnit, baseUnit);

        // Calculate new point
        const newPoint: Point = [
            lastPoint[0] + Math.cos(angleRad) * lengthInBaseUnit,
            lastPoint[1] + Math.sin(angleRad) * lengthInBaseUnit,
            lastPoint[2] || 0
        ];

        // Call handleCommandInput with the new point
        handleCommandInput(newPoint);
    }, [tempPoints, drawingUnit, baseUnit, handleCommandInput]);

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

    // Yatay referans çizgisine göre iç açı (0-180 arası)
    // Negatif açıları pozitife çevir ve 180'den büyükse 360'tan çıkar
    let angleNorm = angle < 0 ? angle + 360 : angle;
    // İç açıyı hesapla (yatay ile yapılan en küçük açı)
    const innerAngle = angleNorm > 180 ? 360 - angleNorm : angleNorm;

    // Orta nokta hesapla (uzunluk etiketi için)
    const midPoint: [number, number, number] = [
        (lastPoint[0] + cursorPosition[0]) / 2,
        (lastPoint[1] + cursorPosition[1]) / 2,
        0.1
    ];

    // Açı yayı için noktalar - sadece açı 5-175 derece arasındaysa göster
    const arcRadius = Math.min(rawDist * 0.3, 50);
    const arcPoints: [number, number, number][] = [];
    const arcSegments = 20;
    // Açıyı radyan cinsinden hesapla (0'dan açıya kadar)
    const angleRad = Math.atan2(dy, dx);
    const showArc = innerAngle > 5 && innerAngle < 175;

    if (showArc && rawDist > 15) {
        for (let i = 0; i <= arcSegments; i++) {
            // 0'dan mevcut açıya kadar çiz (pozitif yönde)
            const t = (i / arcSegments) * angleRad;
            arcPoints.push([
                lastPoint[0] + Math.cos(t) * arcRadius,
                lastPoint[1] + Math.sin(t) * arcRadius,
                0.08
            ]);
        }
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
        const baseLineLength = Math.min(rawDist * 0.5, 80);
        const baseLinePoints: [number, number, number][] = [
            [lastPoint[0], lastPoint[1], 0.04],
            [lastPoint[0] + baseLineLength, lastPoint[1], 0.04]
        ];

        // Açı etiketi pozisyonu - çizginin altında
        // Açı etiketi pozisyonu - çizginin altında (yay yarıçapına göre)
        const angleLabelBelowPos: [number, number, number] = [
            lastPoint[0] + Math.cos(angleLabelAngle) * (arcRadius * 1.2),
            lastPoint[1] + Math.sin(angleLabelAngle) * (arcRadius * 1.2),
            0.1
        ];

        // Input panel pozisyonu - doğrudan cursor üzerinde (CSS ile kaydırılacak)
        const inputPanelPos = cursorPosition;

        return (
            <group>
                {/* Referans zemin çizgisi (silik yatay çizgi) */}
                {rawDist > 15 && angleNorm > 5 && angleNorm < 355 && (
                    <Line
                        points={baseLinePoints}
                        color="#888888"
                        lineWidth={1}
                        opacity={0.3}
                        transparent
                        dashed
                        dashSize={3}
                        gapSize={2}
                        position={[0, 0, -0.01]} // Slightly below 0.05
                    />
                )}

                {/* Açı yayı (silik) */}
                {arcPoints.length > 1 && (
                    <Line
                        points={arcPoints}
                        color="#00ff00"
                        lineWidth={1}
                        opacity={0.4}
                        transparent
                    />
                )}

                {/* Uzunluk etiketi - çizginin tam üzerinde (orta nokta) */}
                {rawDist > 5 && (
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

                {/* Açı etiketi - yatay ile yapılan iç açı */}
                {rawDist > 25 && innerAngle > 5 && innerAngle < 175 && (
                    <Html
                        position={angleLabelBelowPos}
                        style={{ pointerEvents: 'none' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.angleLabel}>{innerAngle.toFixed(1)}°</div>
                    </Html>
                )}

                {/* Editable Input Panel - cursor yanında */}
                <DimensionInputPanel
                    position={inputPanelPos}
                    length={dist}
                    angle={innerAngle}
                    unit={drawingUnit}
                    onSubmit={handleDimensionSubmit}
                />

                {/* Koordinat tooltip */}
                <Html
                    position={[cursorPosition[0], cursorPosition[1], 0.1]}
                    style={{ pointerEvents: 'none', transform: 'translate(15px, -55px)' }}
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

    // POLYGON için
    if (activeCommand === 'POLYGON') {
        if (step === 2) {
            // Center to Vertex/Edge
            const radius = convertToUnit(rawDist, baseUnit, drawingUnit);
            const radiusMidPoint: Point = [
                (lastPoint[0] + cursorPosition[0]) / 2,
                (lastPoint[1] + cursorPosition[1]) / 2,
                0.1
            ];
            return (
                <group>
                    <Html
                        position={radiusMidPoint}
                        style={{ pointerEvents: 'none', transform: 'translate(0, -15px)' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.radiusLabel}>
                            {formatDimension('R = ', radius, drawingUnit)}
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
        return null;
    }

    // ELLIPSE için
    if (activeCommand === 'ELLIPSE') {
        if (step === 2) { // Major axis
            const axisLength = convertToUnit(rawDist, baseUnit, drawingUnit);
            const midPoint: Point = [
                (lastPoint[0] + cursorPosition[0]) / 2,
                (lastPoint[1] + cursorPosition[1]) / 2,
                0.1
            ];
            return (
                <group>
                    <Html
                        position={midPoint}
                        style={{ pointerEvents: 'none', transform: 'translate(0, -15px)' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.dimLabel}>
                            Major: {formatWithUnit(axisLength * 2, drawingUnit)}
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
        } else if (step === 3) { // Minor axis
            // Minor axis distance is typically from center to point
            const center = [
                (tempPoints[0][0] + tempPoints[1][0]) / 2,
                (tempPoints[0][1] + tempPoints[1][1]) / 2,
                0
            ];
            const rawMinorDist = distance2D(center[0], center[1], cursorPosition[0], cursorPosition[1]);
            const minorRadius = convertToUnit(rawMinorDist, baseUnit, drawingUnit);
            const radiusMidPoint: Point = [
                (center[0] + cursorPosition[0]) / 2,
                (center[1] + cursorPosition[1]) / 2,
                0.1
            ];

            return (
                <group>
                    <Html
                        position={radiusMidPoint}
                        style={{ pointerEvents: 'none', transform: 'translate(0, -15px)' }}
                        zIndexRange={[100, 0]}
                        center
                    >
                        <div style={styles.radiusLabel}>
                            Minor R: {formatWithUnit(minorRadius, drawingUnit)}
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
    }

    // SPLINE için
    if (activeCommand === 'SPLINE' && tempPoints.length > 0) {
        // Last point is already captured in tempPoints
        const segmentLength = convertToUnit(rawDist, baseUnit, drawingUnit);
        const midPoint: Point = [
            (lastPoint[0] + cursorPosition[0]) / 2,
            (lastPoint[1] + cursorPosition[1]) / 2,
            0.1
        ];

        return (
            <group>
                <Html
                    position={midPoint}
                    style={{ pointerEvents: 'none', transform: 'translate(0, -15px)' }}
                    zIndexRange={[100, 0]}
                    center
                >
                    <div style={styles.lengthLabel}>
                        {formatWithUnit(segmentLength, drawingUnit)}
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
