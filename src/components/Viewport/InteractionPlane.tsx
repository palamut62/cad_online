
import React, { useCallback, useMemo, useRef } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import type { ThreeEvent } from '@react-three/fiber';
import { rafThrottle } from '../../utils/performance';
import type { Entity, Point } from '../../types/entities';
import { closestPointOnEntity } from '../../utils/geometryUtils';

const InteractionPlane = React.memo(() => {
    const {
        entities,
        activeCommand,
        setTextDialogState,
        setTableDialogState,
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

    // Throttled hover detection
    const throttledHoverDetection = useMemo(
        () => rafThrottle((point: Point) => {
            // Find closest entity for hover highlight
            let bestEntId: number | null = null;
            let minD = 10; // Hover tolerance

            entities.forEach(ent => {
                if (ent.visible === false) return;
                const d = closestPointOnEntity(point[0], point[1], ent);
                if (d < minD) {
                    minD = d;
                    bestEntId = ent.id;
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
            let bestEnt = null;
            let minD = 15; // Seçim toleransı (daha geniş threshold)

            entities.forEach(ent => {
                if (ent.visible === false) return; // Sadece açıkça gizlenmişleri atla
                const d = closestPointOnEntity(point[0], point[1], ent);
                // En yakın ve threshold içinde
                if (d < minD) {
                    minD = d;
                    bestEnt = ent;
                }
            });

            if (bestEnt) {
                // Çoklu seçim (Shift/Ctrl veya modify komutunda)
                // toggleSelection fonksiyonu context'te tek argüman defined olsa bile ek argümanları yutabilir veya biz sadece ID göndeririz.
                // Kullanıcı beklentisi: Tıkla seç. Modify komutu: Tıkla ekle.
                // toggleSelection(ent.id) genellikle ekle/çıkar yapar.
                toggleSelection((bestEnt as Entity).id);
                return; // Seçim yapıldıysa input gönderme
            }
        }

        handleCommandInput([e.point.x, e.point.y, 0]);
    }, [handleCommandInput, zoomWindowMode, activeCommand, step, entities, toggleSelection]);

    const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        // Sadece boşta ve komut yokken
        if (activeCommand || zoomWindowMode) return;

        const point: Point = [e.point.x, e.point.y, 0];

        // En yakın entity'yi bul
        let bestEnt = null;
        let minD = 5; // Tolerans

        entities.forEach(ent => {
            if (!ent.visible) return;
            const d = closestPointOnEntity(point[0], point[1], ent);
            if (d < minD) {
                minD = d;
                bestEnt = ent;
            }
        });

        if (bestEnt) {
            const entity = bestEnt as Entity;
            if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
                // Düzenleme diyaloğunu aç
                setTextDialogState({
                    isOpen: true,
                    mode: entity.type as 'TEXT' | 'MTEXT',
                    initialValues: {
                        text: (entity as any).text,
                        height: (entity as any).height,
                        rotation: (entity as any).rotation ? (entity as any).rotation * 180 / Math.PI : 0,
                        justification: (entity as any).justification,
                        width: (entity as any).width,
                        lineSpacing: (entity as any).lineSpacing,
                        color: (entity as any).color
                    },
                    callback: (data) => {
                        // Entity güncelle
                        updateEntity(entity.id, {
                            ...entity,
                            text: data.text,
                            height: data.height,
                            rotation: (data.rotation || 0) * Math.PI / 180,
                            justification: data.justification,
                            color: data.color,
                            ...(entity.type === 'MTEXT' ? {
                                width: data.width,
                                lineSpacing: data.lineSpacing
                            } : {})
                        });
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
    }, [activeCommand, zoomWindowMode, entities, setTextDialogState, setTableDialogState, updateEntity]);

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
