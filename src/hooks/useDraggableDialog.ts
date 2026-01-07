import { useState, useCallback, useRef, useEffect } from 'react';

interface DragState {
    isDragging: boolean;
    position: { x: number; y: number };
    offset: { x: number; y: number };
}

/**
 * Custom hook for making dialog headers draggable
 * @returns drag state and handlers
 */
export const useDraggableDialog = (initialPosition?: { x: number; y: number }) => {
    const [state, setState] = useState<DragState>({
        isDragging: false,
        position: initialPosition || { x: 0, y: 0 },
        offset: { x: 0, y: 0 }
    });

    const dialogRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // Center dialog on mount
    useEffect(() => {
        if (!initializedRef.current && dialogRef.current) {
            const dialog = dialogRef.current;
            const rect = dialog.getBoundingClientRect();
            const centerX = (window.innerWidth - rect.width) / 2;
            const centerY = (window.innerHeight - rect.height) / 2;
            setState(prev => ({
                ...prev,
                position: { x: centerX, y: Math.max(50, centerY) }
            }));
            initializedRef.current = true;
        }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only drag from header area
        if (dialogRef.current) {
            const rect = dialogRef.current.getBoundingClientRect();
            setState(prev => ({
                ...prev,
                isDragging: true,
                offset: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                }
            }));
        }
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (state.isDragging) {
            const newX = e.clientX - state.offset.x;
            const newY = e.clientY - state.offset.y;

            // Keep dialog within viewport bounds
            const maxX = window.innerWidth - (dialogRef.current?.offsetWidth || 300);
            const maxY = window.innerHeight - (dialogRef.current?.offsetHeight || 200);

            setState(prev => ({
                ...prev,
                position: {
                    x: Math.max(0, Math.min(newX, maxX)),
                    y: Math.max(0, Math.min(newY, maxY))
                }
            }));
        }
    }, [state.isDragging, state.offset]);

    const handleMouseUp = useCallback(() => {
        setState(prev => ({ ...prev, isDragging: false }));
    }, []);

    // Global mouse events for dragging
    useEffect(() => {
        if (state.isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [state.isDragging, handleMouseMove, handleMouseUp]);

    const dialogStyle: React.CSSProperties = {
        position: 'fixed',
        left: state.position.x,
        top: state.position.y,
        transform: 'none', // Override any existing transform
        cursor: state.isDragging ? 'grabbing' : 'default'
    };

    const headerStyle: React.CSSProperties = {
        cursor: state.isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
    };

    return {
        dialogRef,
        dialogStyle,
        headerStyle,
        handleMouseDown,
        isDragging: state.isDragging,
        position: state.position
    };
};

export default useDraggableDialog;
