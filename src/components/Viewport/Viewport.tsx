import { useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import { useDrawing } from '../../context/DrawingContext';
import './Viewport.css';
import TextInputDialog from '../Dialogs/TextInputDialog';

const Viewport = () => {
    const { activeCommand, selectedIds, getEntity, updateEntity, step } = useDrawing();
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

    const handleDoubleClick = useCallback(() => {
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            const entity = getEntity(id);
            if (entity && entity.type === 'DIMENSION') {
                setEditDimId(id);
                setEditDimText(entity.text || '');
                setEditDimHeight(entity.textHeight || 5);
                setShowEditDialog(true);
            }
        }
    }, [selectedIds, getEntity]);

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
        </div>
    );
};

export default Viewport;
