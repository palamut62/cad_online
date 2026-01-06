
import React, { useCallback, useMemo, useRef } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import type { ThreeEvent } from '@react-three/fiber';
import { rafThrottle } from '../../utils/performance';
import type { Point } from '../../types/entities';
import { closestPointOnEntity } from '../../utils/geometryUtils';

// Entity tipi öncelik sırası - düşük değer = yüksek öncelik
// Çizgi/kenar tipleri öncelikli, alan tipleri sonra
const getEntityTypePriority = (type: string): number => {
    switch (type) {
        case 'LINE':
        case 'ARC':
        case 'SPLINE':
            return 1; // En yüksek öncelik - tek çizgiler
        case 'CIRCLE':
        case 'ELLIPSE':
        case 'LWPOLYLINE':
        case 'POLYLINE':
            return 2; // Kapalı şekiller
        case 'DIMENSION':
        case 'LEADER':
            return 3; // Ölçü çizgileri
        case 'POINT':
            return 4; // Noktalar
        case 'TEXT':
        case 'MTEXT':
            return 5; // Metinler
        case 'TABLE':
            return 6; // Tablolar
        case 'HATCH':
        case 'SOLID':
            return 7; // Dolgu alanları - en düşük öncelik
        case 'INSERT':
        case 'BLOCK':
            return 8; // Bloklar
        default:
            return 10;
    }
};

const InteractionPlane = React.memo(() => {
    const {
        entities,
        activeCommand,
        setTextDialogState,
        setTableDialogState,
        setInPlaceTextEditorState,
        updateEntity,
        handleCommandInput,
        handleMouseMove,
        handlePointerDown,
        handlePointerUp,
        // Zoom variables
        zoomWindowMode,
        setZoomWindowBox,
        applyZoomWindow,
        cancelZoomWindow,
        // Selection variables
        toggleSelection,
        step,
        // Print variables
        printWindowMode,
        applyPrintWindow,
        finishPrintWindow,
        // Hover
        setHoveredEntityId
    } = useDrawing();

    // Zoom window selection start point
    const zoomWindowStartRef = useRef<Point | null>(null);
    const lastHoveredIdRef = useRef<number | null>(null);

    // Use RAF-based throttle for smooth mouse tracking
    const throttledMouseMove = useMemo(
        () => rafThrottle((point: [number, number, number]) => {
            handleMouseMove(point);
        }),
        [handleMouseMove]
    );

    // Throttled hover detection with priority system
    const throttledHoverDetection = useMemo(
        () => rafThrottle((point: Point) => {
            // Find closest entity for hover highlight
            let bestEntId: number | null = null;
            let minD = 10; // Hover tolerance
            let bestPriority = Infinity;

            entities.forEach(ent => {
                if (ent.visible === false) return;
                const d = closestPointOnEntity(point[0], point[1], ent);
                const priority = getEntityTypePriority(ent.type);

                // Seçim: Mesafe tolerans içindeyse ve (daha yakın VEYA aynı mesafede daha yüksek öncelikli)
                if (d < minD) {
                    // Mesafe farkı önemli (> 1 birim) ise mesafeye göre seç
                    if (minD - d > 1 || priority <= bestPriority) {
                        minD = d;
                        bestEntId = ent.id;
                        bestPriority = priority;
                    }
                } else if (Math.abs(d - minD) < 1 && priority < bestPriority) {
                    // Mesafeler çok yakın (< 1 birim fark), önceliğe göre seç
                    bestEntId = ent.id;
                    bestPriority = priority;
                }
            });

            if (bestEntId !== lastHoveredIdRef.current) {
                lastHoveredIdRef.current = bestEntId;
                setHoveredEntityId(bestEntId);
            }
        }),
        [entities, setHoveredEntityId]
    );

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        const point: Point = [e.point.x, e.point.y, 0];

        // Zoom window mode or Print window mode - update selection box
        if ((zoomWindowMode || printWindowMode) && zoomWindowStartRef.current) {
            setZoomWindowBox({
                start: zoomWindowStartRef.current,
                end: point
            });
        }

        // Hover detection when no command is active
        if (!activeCommand && !zoomWindowMode && !printWindowMode) {
            throttledHoverDetection(point);
        }

        throttledMouseMove(point);
    }, [throttledMouseMove, zoomWindowMode, setZoomWindowBox, activeCommand, printWindowMode, throttledHoverDetection]);

    const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        const point: Point = [e.point.x, e.point.y, 0];

        // Zoom window mode or Print window mode - start selection
        if (zoomWindowMode || printWindowMode) {
            zoomWindowStartRef.current = point;
            setZoomWindowBox({ start: point, end: point });
            return;
        }

        handlePointerDown(point);
    }, [handlePointerDown, zoomWindowMode, setZoomWindowBox]);

    const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        const point: Point = [e.point.x, e.point.y, 0];

        // Zoom window mode - apply zoom
        if (zoomWindowMode && zoomWindowStartRef.current) {
            const start = zoomWindowStartRef.current;
            const boxWidth = Math.abs(point[0] - start[0]);
            const boxHeight = Math.abs(point[1] - start[1]);

            // Minimum boyut kontrolü - çok küçük seçimleri yoksay
            if (boxWidth > 1 && boxHeight > 1) {
                applyZoomWindow(start, point);
            } else {
                cancelZoomWindow();
            }
            zoomWindowStartRef.current = null;
            return;
        }

        // Print window mode selection
        if (printWindowMode && zoomWindowStartRef.current) {
            const start = zoomWindowStartRef.current;
            const boxWidth = Math.abs(point[0] - start[0]);
            const boxHeight = Math.abs(point[1] - start[1]);

            // Minimum boyut kontrolü - çok küçük seçimleri yoksay
            if (boxWidth > 1 && boxHeight > 1) {
                // Apply selection
                applyPrintWindow(start, point);
            } else {
                // Seçim çok küçük, iptal et
                finishPrintWindow();
            }
            zoomWindowStartRef.current = null;
            // Visual box will be cleared when mode is disabled/dialog reopened
            setZoomWindowBox(null);
            return;
        }

        handlePointerUp();
    }, [handlePointerUp, zoomWindowMode, printWindowMode, applyZoomWindow, cancelZoomWindow, applyPrintWindow, finishPrintWindow, setZoomWindowBox]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        // Zoom window veya Print window modunda click'i yoksay (sürükleme bitince zaten pointerUp çalışır)
        if (zoomWindowMode || printWindowMode) return;

        // Seçim mantığı: Komut yoksa veya seçim aşamasıysa
        const cmd = activeCommand?.toLowerCase() || '';
        const isSelectionCommand = ['move', 'copy', 'rotate', 'scale', 'mirror', 'erase', 'offset', 'explode', 'trim', 'extend', 'join', 'fillet', 'chamfer'].includes(cmd);

        // Step 0 genellikle seçim aşamasıdır
        if (!activeCommand || (isSelectionCommand && step === 0)) {
            const point: Point = [e.point.x, e.point.y, 0];
            let bestEntId: number | null = null;
            let minD = 15; // Seçim toleransı (daha geniş threshold)
            let bestPriority = Infinity;

            entities.forEach(ent => {
                if (ent.visible === false) return; // Sadece açıkça gizlenmişleri atla
                const d = closestPointOnEntity(point[0], point[1], ent);
                const priority = getEntityTypePriority(ent.type);

                // Seçim: Mesafe tolerans içindeyse
                if (d < minD) {
                    // Mesafe farkı önemli (> 2 birim) ise mesafeye göre seç
                    if (minD - d > 2 || priority <= bestPriority) {
                        minD = d;
                        bestEntId = ent.id;
                        bestPriority = priority;
                    }
                } else if (Math.abs(d - minD) < 2 && priority < bestPriority) {
                    // Mesafeler çok yakın (< 2 birim fark), önceliğe göre seç
                    // Bu sayede HATCH içinde LWPOLYLINE kenarına yakın tıklandığında LWPOLYLINE seçilir
                    bestEntId = ent.id;
                    bestPriority = priority;
                }
            });

            if (bestEntId !== null) {
                toggleSelection(bestEntId);
                return; // Seçim yapıldıysa input gönderme
            }
        }

        handleCommandInput([e.point.x, e.point.y, 0]);
    }, [handleCommandInput, zoomWindowMode, activeCommand, step, entities, toggleSelection, printWindowMode]);

    const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        // Sadece boşta ve komut yokken
        if (activeCommand || zoomWindowMode) return;

        const point: Point = [e.point.x, e.point.y, 0];

        // En yakın entity'yi bul (öncelik sistemiyle)
        let bestEntId: number | null = null;
        let minD = 5; // Tolerans
        let bestPriority = Infinity;

        entities.forEach(ent => {
            if (!ent.visible) return;
            const d = closestPointOnEntity(point[0], point[1], ent);
            const priority = getEntityTypePriority(ent.type);

            if (d < minD) {
                if (minD - d > 1 || priority <= bestPriority) {
                    minD = d;
                    bestEntId = ent.id;
                    bestPriority = priority;
                }
            } else if (Math.abs(d - minD) < 1 && priority < bestPriority) {
                bestEntId = ent.id;
                bestPriority = priority;
            }
        });

        if (bestEntId !== null) {
            const entity = entities.find(e => e.id === bestEntId);
            if (!entity) return;
            if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
                // Yerinde metin düzenleme editörü aç (AutoCAD tarzı)
                const textEntity = entity as any;
                setInPlaceTextEditorState({
                    isOpen: true,
                    entityId: entity.id,
                    position: textEntity.position,
                    initialText: textEntity.text || '',
                    style: {
                        height: textEntity.height || 10,
                        rotation: textEntity.rotation || 0,
                        fontFamily: textEntity.textStyle?.fontFamily || 'Arial',
                        color: textEntity.color || '#FFFFFF',
                        fontWeight: textEntity.textStyle?.fontWeight || 'normal',
                        fontStyle: textEntity.textStyle?.fontStyle || 'normal',
                        justification: textEntity.justification || 'left'
                    },
                    onSubmit: (newText: string, style?: any) => {
                        if (newText.trim()) {
                            // Entity güncelle
                            updateEntity(entity.id, {
                                ...entity,
                                text: newText,
                                height: style?.height || textEntity.height || 10,
                                color: style?.color || textEntity.color || '#FFFFFF',
                                justification: style?.justification || textEntity.justification || 'left',
                                textStyle: {
                                    fontFamily: style?.fontFamily || textEntity.textStyle?.fontFamily || 'Arial',
                                    fontWeight: style?.fontWeight || textEntity.textStyle?.fontWeight || 'normal',
                                    fontStyle: style?.fontStyle || textEntity.textStyle?.fontStyle || 'normal'
                                }
                            });
                        }
                    },
                    onCancel: () => {
                        // İptal edilirse bir şey yapma
                    }
                });
            } else if (entity.type === 'TABLE') {
                // Tablo düzenleme diyaloğunu aç
                setTableDialogState({
                    isOpen: true,
                    editMode: true,
                    initialValues: {
                        rows: (entity as any).rows,
                        cols: (entity as any).cols,
                        rowHeight: (entity as any).rowHeight,
                        colWidth: (entity as any).colWidth,
                        cellData: (entity as any).cellData || [],
                        headerRow: (entity as any).headerRow || false
                    },
                    callback: (data) => {
                        updateEntity(entity.id, {
                            ...entity,
                            rows: data.rows,
                            cols: data.cols,
                            rowHeight: data.rowHeight,
                            colWidth: data.colWidth,
                            cellData: data.cellData,
                            headerRow: data.headerRow
                        });
                    }
                });
            }
        }
    }, [activeCommand, zoomWindowMode, entities, setTextDialogState, setTableDialogState, setInPlaceTextEditorState, updateEntity]);

    return (
        <mesh
            visible={false}
            onPointerMove={handlePointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
        >
            <planeGeometry args={[100000, 100000]} />
            <meshBasicMaterial />
        </mesh>
    );
});

InteractionPlane.displayName = 'InteractionPlane';

export default InteractionPlane;
