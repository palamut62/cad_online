
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
        zoomWindowMode,
        setZoomWindowBox,
        applyZoomWindow,
        cancelZoomWindow
    } = useDrawing();

    // Zoom window selection start point
    const zoomWindowStartRef = useRef<Point | null>(null);

    // Use RAF-based throttle for smooth mouse tracking
    const throttledMouseMove = useMemo(
        () => rafThrottle((point: [number, number, number]) => {
            handleMouseMove(point);
        }),
        [handleMouseMove]
    );

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        const point: Point = [e.point.x, e.point.y, 0];

        // Zoom window mode - update selection box
        if (zoomWindowMode && zoomWindowStartRef.current) {
            setZoomWindowBox({
                start: zoomWindowStartRef.current,
                end: point
            });
        }

        throttledMouseMove(point);
    }, [throttledMouseMove, zoomWindowMode, setZoomWindowBox]);

    const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        const point: Point = [e.point.x, e.point.y, 0];

        // Zoom window mode - start selection
        if (zoomWindowMode) {
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

        handlePointerUp();
    }, [handlePointerUp, zoomWindowMode, applyZoomWindow, cancelZoomWindow]);

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        // Zoom window modunda click'i yoksay
        if (zoomWindowMode) return;

        handleCommandInput([e.point.x, e.point.y, 0]);
    }, [handleCommandInput, zoomWindowMode]);

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
