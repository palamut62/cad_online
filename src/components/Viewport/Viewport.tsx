import { useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import { useDrawing } from '../../context/DrawingContext';
import './Viewport.css';
import TextInputDialog from '../Dialogs/TextInputDialog';

const Viewport = () => {
    const { activeCommand } = useDrawing();
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
    const { selectedIds, getEntity, updateEntity } = useDrawing();

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

        // Edit commands
        if (['move', 'copy', 'rotate', 'scale', 'mirror', 'erase', 'offset', 'hatch'].includes(cmd)) {
            return `command-${cmd}`;
        }

        // Drawing commands
        if (['line', 'circle', 'polyline', 'rectangle', 'polygon', 'arc', 'spline', 'ellipse', 'point', 'ray', 'xline', 'donut', 'text', 'mtext', 'dimlinear', 'dimaligned', 'dimangular', 'dimradius', 'dimdiameter'].includes(cmd)) {
            return 'command-draw';
        }

        return '';
    }, [activeCommand]);

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
            >
                <color attach="background" args={['#212223']} />
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
