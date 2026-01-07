import { useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import { useDrawing } from '../../context/DrawingContext';
import './Viewport.css';
import TextInputDialog from '../Dialogs/TextInputDialog';
import HatchDialog, { HatchParams } from '../Dialogs/HatchDialog';
import { PRESET_PATTERNS } from '../../utils/hatchPatterns';

// Fixed UCS Icon (Bottom Left)
const FixedUCS = () => (
    <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '50px',
        height: '50px',
        pointerEvents: 'none',
        zIndex: 1000
    }}>
        <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <line x1="10" y1="40" x2="10" y2="10" stroke="#00FF00" strokeWidth="2" />
            <polygon points="10,5 7,12 13,12" fill="#00FF00" />
            <text x="15" y="15" fill="#00FF00" fontSize="12" fontFamily="Arial">Y</text>
            <line x1="10" y1="40" x2="40" y2="40" stroke="#FF0000" strokeWidth="2" />
            <polygon points="45,40 38,37 38,43" fill="#FF0000" />
            <text x="40" y="35" fill="#FF0000" fontSize="12" fontFamily="Arial">X</text>
            <rect x="8" y="38" width="4" height="4" fill="white" />
        </svg>
    </div>
);

const Viewport = () => {
    const { activeCommand, selectedIds, getEntity, updateEntity, updateEntityTransient, step } = useDrawing();
    const [isPanning, setIsPanning] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Orta tuş (tekerlek) = button 1
        if (e.button === 1) {
            setIsPanning(true);
        }
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (e.button === 1) {
            setIsPanning(false);
        }
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Editing Dimension Text
    const [editDimId, setEditDimId] = useState<number | null>(null);
    const [editDimText, setEditDimText] = useState<string>('');
    const [editDimHeight, setEditDimHeight] = useState<number>(5);
    const [showEditDialog, setShowEditDialog] = useState(false);

    // Editing Hatch
    const [editHatchId, setEditHatchId] = useState<number | null>(null);
    const [showHatchEditDialog, setShowHatchEditDialog] = useState(false);
    const [hatchEditParams, setHatchEditParams] = useState<HatchParams>({
        pattern: 'ANSI31',
        color: '#808080',
        scale: 1,
        rotation: 0,
        opacity: 1
    });

    const handleDoubleClick = useCallback(() => {
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const entity = getEntity(id);
            if (entity) {
                if (entity.type === 'DIMENSION') {
                    setEditDimId(id);
                    setEditDimText(entity.text || '');
                    setEditDimHeight(entity.textHeight || 5);
                    setShowEditDialog(true);
                } else if (entity.type === 'HATCH') {
                    // Open Hatch edit dialog
                    const hatch = entity as any;
                    setEditHatchId(id);
                    setHatchEditParams({
                        pattern: hatch.pattern?.name || 'ANSI31',
                        color: hatch.color || '#808080',
                        scale: hatch.scale || 1,
                        rotation: hatch.rotation || 0,
                        opacity: hatch.opacity ?? 1
                    });
                    setShowHatchEditDialog(true);
                }
            }
        }
    }, [selectedIds, getEntity]);

    // Listen for custom edit events from EntityRenderer
    useEffect(() => {
        const handleEditEvent = (e: CustomEvent) => {
            const { id, type } = e.detail;
            const entity = getEntity(id);
            if (entity && type === 'HATCH') {
                const hatch = entity as any;
                setEditHatchId(id);
                setHatchEditParams({
                    pattern: hatch.pattern?.name || 'ANSI31',
                    color: hatch.color || '#808080',
                    scale: hatch.scale || 1,
                    rotation: hatch.rotation || 0,
                    opacity: hatch.opacity ?? 1
                });
                setShowHatchEditDialog(true);
            }
        };

        window.addEventListener('edit-entity', handleEditEvent as any);
        return () => window.removeEventListener('edit-entity', handleEditEvent as any);
    }); // useEffect yerine useState lazy init gibi kullandım ama yanlış, useEffect olmalı. Düzeltiyorum.

    const handleDimSubmit = useCallback((data: { text: string; height: number; rotation: number }) => {
        if (editDimId !== null) {
            updateEntity(editDimId, {
                text: data.text,
                textHeight: data.height
            });
            setShowEditDialog(false);
            setEditDimId(null);
        }
    }, [editDimId, updateEntity]);

    // Handle Hatch LIVE update - applies changes instantly without closing dialog
    const handleHatchLiveUpdate = useCallback((entityId: number, params: HatchParams) => {
        const patternConfig = PRESET_PATTERNS[params.pattern];
        updateEntityTransient(entityId, {
            pattern: {
                name: params.pattern,
                type: patternConfig?.type || 'lines',
                angle: patternConfig?.angle || 45
            },
            color: params.color,
            scale: params.scale,
            rotation: params.rotation,
            opacity: params.opacity
        });
        // Don't close dialog - let user see changes live
    }, [updateEntity]);

    // Handle Hatch final update (when dialog closes)
    const handleHatchUpdate = useCallback((_entityId: number, _params: HatchParams) => {
        // Just close the dialog - changes are already applied live
        setShowHatchEditDialog(false);
        setEditHatchId(null);
    }, []);

    // Aktif komuta göre cursor class'ını belirle
    const commandClass = useMemo(() => {
        if (!activeCommand) return '';
        const cmd = activeCommand.toLowerCase();

        // Düzenleme komutları (Selection vs Point Picking)
        if (['move', 'copy', 'rotate', 'scale', 'mirror', 'erase', 'offset', 'explode', 'trim', 'extend', 'join', 'fillet', 'chamfer'].includes(cmd)) {
            // Çoğu düzenleme komutunda 1. adım (step 0) seçim aşamasıdır -> Pickbox
            // Sonraki adımlar (step > 0) genelde nokta seçimidir -> Crosshair
            // Ancak ERASE ve EXPLODE gibi komutlar sadece seçimden oluşabilir veya seçim bitince biter.
            // OFFSET komutunda step 0: mesafe girme (metin) veya nokta seçme (crosshair?). AutoCAD offset: Pickbox? No.

            // Genel kural: Seçim yapılıyorsa Pickbox, nokta seçiliyorsa Crosshair.
            // step 0 varsayılan olarak seçimi temsil eder.
            if (step === 0 || cmd === 'erase' || cmd === 'explode') {
                return 'command-select';
            }
            return 'command-draw'; // Crosshair
        }

        // Drawing commands
        if (['line', 'circle', 'polyline', 'rectangle', 'polygon', 'arc', 'spline', 'ellipse', 'point', 'ray', 'xline', 'donut', 'text', 'mtext', 'dimlinear', 'dimaligned', 'dimangular', 'dimradius', 'dimdiameter', 'leader', 'hatch'].includes(cmd)) {
            return 'command-draw';
        }

        return '';
    }, [activeCommand, step]);

    return (
        <div
            className={`viewport-full ${isPanning ? 'panning' : ''} ${commandClass}`}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onDoubleClick={handleDoubleClick}
        >
            <Canvas
                orthographic
                camera={{ zoom: 20, position: [0, 0, 100], up: [0, 1, 0] }}
                onContextMenu={(e) => e.preventDefault()}
                gl={{ preserveDrawingBuffer: true, alpha: true }}
            >
                <Scene />
            </Canvas>

            <FixedUCS />

            <TextInputDialog
                isOpen={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                onSubmit={handleDimSubmit}
                mode="TEXT"
                initialValues={{
                    text: editDimText,
                    height: editDimHeight,
                    rotation: 0
                }}
            />

            {/* Hatch Edit Dialog */}
            <HatchDialog
                isOpen={showHatchEditDialog}
                onClose={() => {
                    setShowHatchEditDialog(false);
                    setEditHatchId(null);
                }}
                onApply={() => { }} // Not used in edit mode
                onUpdate={handleHatchUpdate}
                onLiveUpdate={handleHatchLiveUpdate}
                initialParams={hatchEditParams}
                editMode={true}
                entityId={editHatchId ?? undefined}
            />
        </div>
    );
};

export default Viewport;
