import { useEffect, useRef, useCallback, useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import InteractionPlane from './InteractionPlane';
import EntitiesRenderer from './EntitiesRenderer';
import DynamicInput from './DynamicInput';
import PreviewRenderer from './PreviewRenderer';
import TransformationPreview from './TransformationPreview';
import InPlaceTextEditor from './InPlaceTextEditor';
import { useDrawing } from '../../context/DrawingContext';
import type { Entity, Point } from '../../types/entities';

// Camera state localStorage key
const CAMERA_STATE_KEY = 'cad_app_camera_state';

// Entity'lerin bounding box'ını hesapla
const calculateBoundingBox = (entities: Entity[]): { min: Point; max: Point } | null => {
    if (entities.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    entities.forEach(ent => {
        if (ent.visible === false) return;

        if (ent.type === 'LINE') {
            minX = Math.min(minX, ent.start[0], ent.end[0]);
            minY = Math.min(minY, ent.start[1], ent.end[1]);
            maxX = Math.max(maxX, ent.start[0], ent.end[0]);
            maxY = Math.max(maxY, ent.start[1], ent.end[1]);
        } else if (ent.type === 'CIRCLE' || ent.type === 'DONUT') {
            const r = ent.type === 'CIRCLE' ? ent.radius : ent.outerRadius;
            minX = Math.min(minX, ent.center[0] - r);
            minY = Math.min(minY, ent.center[1] - r);
            maxX = Math.max(maxX, ent.center[0] + r);
            maxY = Math.max(maxY, ent.center[1] + r);
        } else if (ent.type === 'ARC') {
            minX = Math.min(minX, ent.center[0] - ent.radius);
            minY = Math.min(minY, ent.center[1] - ent.radius);
            maxX = Math.max(maxX, ent.center[0] + ent.radius);
            maxY = Math.max(maxY, ent.center[1] + ent.radius);
        } else if (ent.type === 'ELLIPSE') {
            minX = Math.min(minX, ent.center[0] - ent.rx);
            minY = Math.min(minY, ent.center[1] - ent.ry);
            maxX = Math.max(maxX, ent.center[0] + ent.rx);
            maxY = Math.max(maxY, ent.center[1] + ent.ry);
        } else if (ent.type === 'LWPOLYLINE') {
            ent.vertices.forEach(v => {
                minX = Math.min(minX, v[0]);
                minY = Math.min(minY, v[1]);
                maxX = Math.max(maxX, v[0]);
                maxY = Math.max(maxY, v[1]);
            });
        } else if (ent.type === 'POINT') {
            minX = Math.min(minX, ent.position[0]);
            minY = Math.min(minY, ent.position[1]);
            maxX = Math.max(maxX, ent.position[0]);
            maxY = Math.max(maxY, ent.position[1]);
        } else if (ent.type === 'DIMENSION') {
            // Include dimension start, end and dimLinePosition
            minX = Math.min(minX, ent.start[0], ent.end[0]);
            minY = Math.min(minY, ent.start[1], ent.end[1]);
            maxX = Math.max(maxX, ent.start[0], ent.end[0]);
            maxY = Math.max(maxY, ent.start[1], ent.end[1]);
            if (ent.dimLinePosition) {
                minX = Math.min(minX, ent.dimLinePosition[0]);
                minY = Math.min(minY, ent.dimLinePosition[1]);
                maxX = Math.max(maxX, ent.dimLinePosition[0]);
                maxY = Math.max(maxY, ent.dimLinePosition[1]);
            }
        } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
            const pos = ent.position;
            const h = ent.height || 10;
            const w = ent.type === 'MTEXT' ? (ent.width || 100) : (ent.text?.length || 1) * h * 0.6;
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1] - h);
            maxX = Math.max(maxX, pos[0] + w);
            maxY = Math.max(maxY, pos[1] + h);
        } else if (ent.type === 'TABLE') {
            const pos = ent.position;
            const tableWidth = ent.cols * ent.colWidth;
            const tableHeight = ent.rows * ent.rowHeight;
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1] - tableHeight);
            maxX = Math.max(maxX, pos[0] + tableWidth);
            maxY = Math.max(maxY, pos[1]);
        } else if (ent.type === 'HATCH') {
            if (ent.boundary?.vertices) {
                ent.boundary.vertices.forEach(v => {
                    minX = Math.min(minX, v[0]);
                    minY = Math.min(minY, v[1]);
                    maxX = Math.max(maxX, v[0]);
                    maxY = Math.max(maxY, v[1]);
                });
            }
        } else if (ent.type === 'SPLINE') {
            ent.controlPoints.forEach(v => {
                minX = Math.min(minX, v[0]);
                minY = Math.min(minY, v[1]);
                maxX = Math.max(maxX, v[0]);
                maxY = Math.max(maxY, v[1]);
            });
        } else if (ent.type === 'RAY' || ent.type === 'XLINE') {
            // RAY and XLINE extend to infinity, just include origin
            minX = Math.min(minX, ent.origin[0]);
            minY = Math.min(minY, ent.origin[1]);
            maxX = Math.max(maxX, ent.origin[0]);
            maxY = Math.max(maxY, ent.origin[1]);
        }
    });

    if (minX === Infinity) return null;

    return {
        min: [minX, minY, 0],
        max: [maxX, maxY, 0]
    };
};

// Camera State Persistence - kamera durumunu localStorage'a kaydeder ve yükler
const CameraStatePersistence = () => {
    const { camera, controls } = useThree();
    const { activeSheetId } = useDrawing();
    const isInitialized = useRef(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced save function
    const saveState = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            try {
                const orthoCamera = camera as THREE.OrthographicCamera;
                const cameraState = {
                    positionX: camera.position.x,
                    positionY: camera.position.y,
                    zoom: orthoCamera.zoom,
                    targetX: controls ? (controls as any).target.x : 0,
                    targetY: controls ? (controls as any).target.y : 0,
                    sheetId: activeSheetId,
                };
                localStorage.setItem(CAMERA_STATE_KEY, JSON.stringify(cameraState));
            } catch (e) {
                console.warn('Failed to save camera state:', e);
            }
        }, 300);
    }, [camera, controls, activeSheetId]);

    // Load camera state on mount
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        try {
            const saved = localStorage.getItem(CAMERA_STATE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                const orthoCamera = camera as THREE.OrthographicCamera;

                // Restore camera state
                camera.position.set(state.positionX || 0, state.positionY || 0, 100);
                orthoCamera.zoom = state.zoom || 20;
                orthoCamera.updateProjectionMatrix();

                if (controls) {
                    (controls as any).target.set(state.targetX || 0, state.targetY || 0, 0);
                    (controls as any).update();
                }

                console.log('Camera state restored:', state);
            }
        } catch (e) {
            console.warn('Failed to load camera state:', e);
        }
    }, [camera, controls]);

    // Save camera state on every frame (debounced)
    useFrame(() => {
        saveState();
    });

    return null;
};

// Zoom Controller - tüm zoom işlemlerini yönetir
const ZoomController = () => {
    const { camera, controls } = useThree();
    const { entities, zoomToFitTrigger, zoomInTrigger, zoomOutTrigger, zoomWindowTrigger, triggerZoomToFit, activeSheetId } = useDrawing();

    // Son tetiklenen değerleri takip et - sadece değiştiğinde çalış
    const lastZoomInTrigger = useRef(0);
    const lastZoomOutTrigger = useRef(0);
    const lastZoomToFitTrigger = useRef(0);
    const initialMountDone = useRef(false);
    const lastSheetId = useRef<string>('');

    // İlk mount'ta: localStorage'da kayıtlı state yoksa ve entity varsa Zoom Extents yap
    useEffect(() => {
        if (!initialMountDone.current && entities.length > 0) {
            initialMountDone.current = true;
            // Sadece localStorage'da kayıtlı state yoksa zoom to fit yap
            const savedState = localStorage.getItem(CAMERA_STATE_KEY);
            if (!savedState) {
                setTimeout(() => triggerZoomToFit(), 100);
            }
        }
        // Sekme değiştiğinde
        if (lastSheetId.current && lastSheetId.current !== activeSheetId) {
            setTimeout(() => triggerZoomToFit(), 100);
        }
        lastSheetId.current = activeSheetId;
    }, [entities, activeSheetId, triggerZoomToFit]);

    // Zoom In - sadece trigger değiştiğinde çalış
    useEffect(() => {
        if (zoomInTrigger === 0 || zoomInTrigger === lastZoomInTrigger.current) return;
        lastZoomInTrigger.current = zoomInTrigger;

        const orthoCamera = camera as THREE.OrthographicCamera;
        if (orthoCamera.isOrthographicCamera) {
            orthoCamera.zoom *= 1.5;
            orthoCamera.updateProjectionMatrix();
        }
    }, [zoomInTrigger, camera]);

    // Zoom Out - sadece trigger değiştiğinde çalış
    useEffect(() => {
        if (zoomOutTrigger === 0 || zoomOutTrigger === lastZoomOutTrigger.current) return;
        lastZoomOutTrigger.current = zoomOutTrigger;

        const orthoCamera = camera as THREE.OrthographicCamera;
        if (orthoCamera.isOrthographicCamera) {
            orthoCamera.zoom /= 1.5;
            orthoCamera.updateProjectionMatrix();
        }
    }, [zoomOutTrigger, camera]);

    // Zoom Extents - sadece trigger değiştiğinde çalış (AutoCAD ZOOM E)
    useEffect(() => {
        // Sadece trigger değeri değiştiğinde çalış (0 hariç)
        if (zoomToFitTrigger === 0 || zoomToFitTrigger === lastZoomToFitTrigger.current) return;
        lastZoomToFitTrigger.current = zoomToFitTrigger;

        const bbox = calculateBoundingBox(entities);
        const orthoCamera = camera as THREE.OrthographicCamera;

        if (!bbox || !orthoCamera.isOrthographicCamera) {
            // Entity yoksa varsayılan görünüme dön
            if (controls) {
                (controls as any).target.set(0, 0, 0);
            }
            camera.position.set(0, 0, 100);
            orthoCamera.zoom = 20;
            orthoCamera.updateProjectionMatrix();
            if (controls) {
                (controls as any).update();
            }
            return;
        }

        const { min, max } = bbox;
        const centerX = (min[0] + max[0]) / 2;
        const centerY = (min[1] + max[1]) / 2;

        // Bounding box boyutları
        const bboxWidth = max[0] - min[0];
        const bboxHeight = max[1] - min[1];

        // Minimum boyut (tek nokta veya çizgi için)
        const minSize = 10;
        const contentWidth = Math.max(bboxWidth, minSize);
        const contentHeight = Math.max(bboxHeight, minSize);

        // Padding ekle (%10)
        const padding = 1.1;
        const targetWidth = contentWidth * padding;
        const targetHeight = contentHeight * padding;

        // Kameranın mevcut frustum genişliği ve yüksekliği (zoom=1 iken)
        // OrthographicCamera: visible = (right - left) / zoom
        const frustumWidth = orthoCamera.right - orthoCamera.left;
        const frustumHeight = orthoCamera.top - orthoCamera.bottom;

        // Gerekli zoom hesapla:
        // visibleWidth = frustumWidth / zoom => zoom = frustumWidth / visibleWidth
        // visibleHeight = frustumHeight / zoom => zoom = frustumHeight / visibleHeight
        // targetWidth'i görmek için: zoom = frustumWidth / targetWidth
        // targetHeight'i görmek için: zoom = frustumHeight / targetHeight

        const zoomForWidth = frustumWidth / targetWidth;
        const zoomForHeight = frustumHeight / targetHeight;

        // Daha küçük zoom kullan (her iki boyut da sığsın)
        let newZoom = Math.min(zoomForWidth, zoomForHeight);

        // Güvenlik sınırları
        newZoom = Math.max(0.001, Math.min(newZoom, 10000));

        console.log('Zoom Extents:', {
            entities: entities.length,
            bbox: { minX: min[0].toFixed(2), minY: min[1].toFixed(2), maxX: max[0].toFixed(2), maxY: max[1].toFixed(2) },
            center: { x: centerX.toFixed(2), y: centerY.toFixed(2) },
            content: { width: contentWidth.toFixed(2), height: contentHeight.toFixed(2) },
            frustum: { width: frustumWidth.toFixed(2), height: frustumHeight.toFixed(2) },
            zoomForWidth: zoomForWidth.toFixed(4),
            zoomForHeight: zoomForHeight.toFixed(4),
            newZoom: newZoom.toFixed(4),
            currentZoom: orthoCamera.zoom.toFixed(4)
        });

        // 1. Önce OrbitControls target güncelle
        if (controls) {
            (controls as any).target.set(centerX, centerY, 0);
        }

        // 2. Kamerayı merkeze taşı
        camera.position.set(centerX, centerY, 100);

        // 3. Zoom uygula
        orthoCamera.zoom = newZoom;
        orthoCamera.updateProjectionMatrix();

        // 4. Controls güncelle
        if (controls) {
            (controls as any).update();
        }
    }, [zoomToFitTrigger, camera, entities, controls]);

    // Zoom Window - pencere ile seçilen alana zoom
    const lastZoomWindowTrigger = useRef<{ start: Point; end: Point } | null>(null);

    useEffect(() => {
        if (!zoomWindowTrigger || zoomWindowTrigger === lastZoomWindowTrigger.current) return;
        lastZoomWindowTrigger.current = zoomWindowTrigger;

        const orthoCamera = camera as THREE.OrthographicCamera;
        if (!orthoCamera.isOrthographicCamera) return;

        const { start, end } = zoomWindowTrigger;

        // Seçilen alanın merkezi ve boyutları
        const centerX = (start[0] + end[0]) / 2;
        const centerY = (start[1] + end[1]) / 2;
        const boxWidth = Math.abs(end[0] - start[0]);
        const boxHeight = Math.abs(end[1] - start[1]);

        // Minimum boyut kontrolü
        if (boxWidth < 1 || boxHeight < 1) return;

        // Padding ekle (%5)
        const padding = 1.05;
        const targetWidth = boxWidth * padding;
        const targetHeight = boxHeight * padding;

        // Kameranın mevcut frustum genişliği ve yüksekliği (zoom=1 iken)
        const frustumWidth = orthoCamera.right - orthoCamera.left;
        const frustumHeight = orthoCamera.top - orthoCamera.bottom;

        // Gerekli zoom hesapla
        const zoomForWidth = frustumWidth / targetWidth;
        const zoomForHeight = frustumHeight / targetHeight;

        // Daha küçük zoom kullan (her iki boyut da sığsın)
        let newZoom = Math.min(zoomForWidth, zoomForHeight);

        // Güvenlik sınırları
        newZoom = Math.max(0.001, Math.min(newZoom, 10000));

        console.log('Zoom Window:', {
            box: { startX: start[0].toFixed(2), startY: start[1].toFixed(2), endX: end[0].toFixed(2), endY: end[1].toFixed(2) },
            center: { x: centerX.toFixed(2), y: centerY.toFixed(2) },
            target: { width: targetWidth.toFixed(2), height: targetHeight.toFixed(2) },
            newZoom: newZoom.toFixed(4)
        });

        // 1. Önce OrbitControls target güncelle
        if (controls) {
            (controls as any).target.set(centerX, centerY, 0);
        }

        // 2. Kamerayı merkeze taşı
        camera.position.set(centerX, centerY, 100);

        // 3. Zoom uygula
        orthoCamera.zoom = newZoom;
        orthoCamera.updateProjectionMatrix();

        // 4. Controls güncelle
        if (controls) {
            (controls as any).update();
        }
    }, [zoomWindowTrigger, camera, controls]);

    return null;
};

// Navigation Controller - Pan and View resets
const NavigationController = () => {
    const { camera, controls } = useThree();
    const { panTrigger, viewTrigger, triggerZoomToFit } = useDrawing();

    // Pan Handler
    useEffect(() => {
        if (!panTrigger) return;

        const orthoCamera = camera as THREE.OrthographicCamera;
        if (!orthoCamera.isOrthographicCamera) return;

        const zoom = orthoCamera.zoom;
        // Pan amount should depend on zoom level to feel natural
        // Higher zoom = smaller movement
        // Let's say we want to move 25% of the viewport dimension
        const viewportHeight = (orthoCamera.top - orthoCamera.bottom) / zoom;
        const moveAmount = viewportHeight * 0.15; // 15% movement

        const deltaX = panTrigger.x * moveAmount;
        const deltaY = panTrigger.y * moveAmount;

        camera.position.x += deltaX;
        camera.position.y += deltaY;

        if (controls) {
            (controls as any).target.x += deltaX;
            (controls as any).target.y += deltaY;
            (controls as any).update();
        }

    }, [panTrigger, camera, controls]);

    // View Reset Handler
    useEffect(() => {
        if (!viewTrigger) return;

        if (viewTrigger === 'TOP') {
            // Trigger Zoom Extents directly to reset view nicely
            triggerZoomToFit();
        }
    }, [viewTrigger, triggerZoomToFit]);

    return null;
};

// Zoom Window Box Renderer - seçim kutusunu gösterir
const ZoomWindowBoxRenderer = () => {
    const { zoomWindowBox, zoomWindowMode } = useDrawing();

    if (!zoomWindowMode || !zoomWindowBox) return null;

    const { start, end } = zoomWindowBox;
    const minX = Math.min(start[0], end[0]);
    const maxX = Math.max(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxY = Math.max(start[1], end[1]);

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (width < 0.1 || height < 0.1) return null;

    return (
        <mesh position={[centerX, centerY, 1]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color="#00ff00" opacity={0.15} transparent />
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                <lineBasicMaterial color="#00ff00" linewidth={2} />
            </lineSegments>
        </mesh>
    );
};

// Print Window Box Renderer - soluk ekran ile seçim alanını gösterir
const PrintWindowBoxRenderer = () => {
    const { zoomWindowBox, printWindowMode } = useDrawing();
    const { viewport } = useThree();

    if (!printWindowMode || !zoomWindowBox) return null;

    const { start, end } = zoomWindowBox;
    const minX = Math.min(start[0], end[0]);
    const maxX = Math.max(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxY = Math.max(start[1], end[1]);

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (width < 0.1 || height < 0.1) return null;

    // Get viewport bounds for large overlay
    const overlaySize = Math.max(viewport.width, viewport.height) * 5;

    return (
        <>
            {/* Dimmed background overlay - large plane with hole effect */}
            <mesh position={[0, 0, 0.5]}>
                <planeGeometry args={[overlaySize, overlaySize]} />
                <meshBasicMaterial color="#000000" opacity={0.5} transparent depthWrite={false} />
            </mesh>

            {/* Clear selection area - shows normal brightness */}
            <mesh position={[centerX, centerY, 0.6]}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color="#ffffff" opacity={0.5} transparent depthWrite={false} />
            </mesh>

            {/* Selection border */}
            <mesh position={[centerX, centerY, 0.7]}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color="#00aaff" opacity={0.1} transparent />
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                    <lineBasicMaterial color="#00aaff" linewidth={3} />
                </lineSegments>
            </mesh>
        </>
    );
};

// Dinamik ve Uyarlanabilir Grid - AutoCAD Style (Custom Line Implementation)
const DynamicGrid = () => {
    const { camera } = useThree();
    const { gridEnabled } = useDrawing();

    // Refs for grid meshes
    const minorLinesRef = useRef<THREE.LineSegments>(null);
    const majorLinesRef = useRef<THREE.LineSegments>(null);
    const axisLinesRef = useRef<THREE.LineSegments>(null);

    // Memoized geometry creation function
    const createGridGeometry = useMemo(() => {
        return (bounds: { minX: number; maxX: number; minY: number; maxY: number }, spacing: number) => {
            const vertices: number[] = [];

            // Vertical lines (along Y)
            const startX = Math.floor(bounds.minX / spacing) * spacing;
            const endX = Math.ceil(bounds.maxX / spacing) * spacing;
            for (let x = startX; x <= endX; x += spacing) {
                vertices.push(x, bounds.minY, 0);
                vertices.push(x, bounds.maxY, 0);
            }

            // Horizontal lines (along X)
            const startY = Math.floor(bounds.minY / spacing) * spacing;
            const endY = Math.ceil(bounds.maxY / spacing) * spacing;
            for (let y = startY; y <= endY; y += spacing) {
                vertices.push(bounds.minX, y, 0);
                vertices.push(bounds.maxX, y, 0);
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            return geometry;
        };
    }, []);

    // Create axis lines geometry (X = red, Y = green)
    const createAxisGeometry = useMemo(() => {
        return (bounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
            // X-axis (along the X direction at Y=0)
            const xAxisVertices = [bounds.minX, 0, 0.01, bounds.maxX, 0, 0.01];
            // Y-axis (along the Y direction at X=0)
            const yAxisVertices = [0, bounds.minY, 0.01, 0, bounds.maxY, 0.01];

            const xGeom = new THREE.BufferGeometry();
            xGeom.setAttribute('position', new THREE.Float32BufferAttribute(xAxisVertices, 3));

            const yGeom = new THREE.BufferGeometry();
            yGeom.setAttribute('position', new THREE.Float32BufferAttribute(yAxisVertices, 3));

            // Merge into single geometry with color attributes
            const vertices = [...xAxisVertices, ...yAxisVertices];
            const colors = [
                0.5, 0.25, 0.25, 0.5, 0.25, 0.25, // X-axis: faded red
                0.25, 0.5, 0.25, 0.25, 0.5, 0.25  // Y-axis: faded green
            ];

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            return geometry;
        };
    }, []);

    useFrame(() => {
        if (!gridEnabled) return;
        const orthoCamera = camera as THREE.OrthographicCamera;
        if (!orthoCamera.isOrthographicCamera) return;

        const zoom = orthoCamera.zoom;
        const camX = camera.position.x;
        const camY = camera.position.y;

        // Calculate visible bounds in world coordinates
        const halfWidth = (orthoCamera.right - orthoCamera.left) / (2 * zoom);
        const halfHeight = (orthoCamera.top - orthoCamera.bottom) / (2 * zoom);

        // Extend bounds to cover pan movement
        const padding = Math.max(halfWidth, halfHeight) * 0.5;
        const bounds = {
            minX: camX - halfWidth - padding,
            maxX: camX + halfWidth + padding,
            minY: camY - halfHeight - padding,
            maxY: camY + halfHeight + padding
        };

        // Calculate adaptive spacing based on screen pixel density
        // We want grid lines to be at least minPixelSpacing pixels apart
        const minPixelSpacing = 10;
        const worldUnitsPerPixel = 1 / zoom;
        const minWorldSpacing = minPixelSpacing * worldUnitsPerPixel;

        // Find the smallest power-of-10 spacing that gives >= minPixelSpacing
        let minorSpacing = 1;
        while (minorSpacing < minWorldSpacing) {
            minorSpacing *= 10;
        }
        // If we can fit 5-unit subdivisions, use them
        if (minorSpacing / 5 >= minWorldSpacing) {
            minorSpacing /= 5;
        } else if (minorSpacing / 2 >= minWorldSpacing) {
            minorSpacing /= 2;
        }

        const majorSpacing = minorSpacing * 10;

        // Update minor grid
        if (minorLinesRef.current) {
            const oldGeom = minorLinesRef.current.geometry;
            minorLinesRef.current.geometry = createGridGeometry(bounds, minorSpacing);
            oldGeom.dispose();
        }

        // Update major grid
        if (majorLinesRef.current) {
            const oldGeom = majorLinesRef.current.geometry;
            majorLinesRef.current.geometry = createGridGeometry(bounds, majorSpacing);
            oldGeom.dispose();
        }

        // Update axis lines
        if (axisLinesRef.current) {
            const oldGeom = axisLinesRef.current.geometry;
            axisLinesRef.current.geometry = createAxisGeometry(bounds);
            oldGeom.dispose();
        }
    });

    if (!gridEnabled) return null;

    // Initial empty geometry
    const emptyGeometry = new THREE.BufferGeometry();
    emptyGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));

    return (
        <>
            {/* Minor Grid */}
            <lineSegments ref={minorLinesRef} geometry={emptyGeometry} renderOrder={-1002}>
                <lineBasicMaterial color={0x303030} transparent opacity={0.5} depthWrite={false} />
            </lineSegments>
            {/* Major Grid */}
            <lineSegments ref={majorLinesRef} geometry={emptyGeometry} renderOrder={-1001}>
                <lineBasicMaterial color={0x484848} transparent opacity={0.8} depthWrite={false} />
            </lineSegments>
            {/* Origin Axes (X=red, Y=green) */}
            <lineSegments ref={axisLinesRef} geometry={emptyGeometry} renderOrder={-1000}>
                <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
            </lineSegments>
        </>
    );
};


const Scene = () => {
    return (
        <>
            <OrbitControls
                enableDamping={false}
                enableRotate={false}
                enableZoom={true}
                enablePan={true}
                mouseButtons={{
                    LEFT: undefined,
                    MIDDLE: THREE.MOUSE.PAN,
                    RIGHT: THREE.MOUSE.PAN
                }}
                touches={{
                    ONE: undefined,
                    TWO: THREE.TOUCH.DOLLY_PAN
                }}
                minPolarAngle={Math.PI / 2}
                maxPolarAngle={Math.PI / 2}
                minAzimuthAngle={0}
                maxAzimuthAngle={0}
            />

            {/* Camera State Persistence */}
            <CameraStatePersistence />

            {/* Zoom Controller */}
            <ZoomController />

            {/* Navigation Controller */}
            <NavigationController />

            {/* Dynamic Grid on XY Plane - follows camera, behind entities */}
            <DynamicGrid />


            <InteractionPlane />
            <EntitiesRenderer />
            <TransformationPreview />
            <PreviewRenderer />
            <DynamicInput />
            <ZoomWindowBoxRenderer />
            <PrintWindowBoxRenderer />
            <InPlaceTextEditor />
        </>
    );
};

export default Scene;
