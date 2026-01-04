import { useState, FormEvent } from 'react';
import './CommandLine.css';
import { useDrawing } from '../../context/DrawingContext';

const CommandLine = () => {
    const [history, setHistory] = useState<string[]>(['Type a command (LINE, CIRCLE, PLINE, RECT, POLYGON, MOVE, COPY, ...)']);
    const [input, setInput] = useState('');
    const { startCommand, activeCommand, step, handleValueInput } = useDrawing();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const value = input.trim();
        const cmd = value.toUpperCase();

        const knownCommands: Record<string, string> = {
            'LINE': 'LINE', 'L': 'LINE',
            'CIRCLE': 'CIRCLE',
            'ARC': 'ARC', 'A': 'ARC',
            'PLINE': 'POLYLINE', 'PL': 'POLYLINE',
            'RECTANGLE': 'RECTANGLE', 'REC': 'RECTANGLE', 'RECT': 'RECTANGLE',
            'POLYGON': 'POLYGON', 'POL': 'POLYGON',
            'MOVE': 'MOVE', 'M': 'MOVE',
            'COPY': 'COPY', 'CO': 'COPY', 'CP': 'COPY',
            'ROTATE': 'ROTATE', 'RO': 'ROTATE',
            'SCALE': 'SCALE', 'SC': 'SCALE',
            'MIRROR': 'MIRROR', 'MI': 'MIRROR',
            'ERASE': 'ERASE', 'E': 'ERASE', 'DEL': 'ERASE',
            'OFFSET': 'OFFSET', 'O': 'OFFSET',
            'ELLIPSE': 'ELLIPSE', 'EL': 'ELLIPSE',
            'POINT': 'POINT', 'PO': 'POINT',
            'SPLINE': 'SPLINE', 'SPL': 'SPLINE',
            'RAY': 'RAY',
            'XLINE': 'XLINE', 'XL': 'XLINE',
            'DONUT': 'DONUT', 'DO': 'DONUT'
        };

        if (activeCommand && !knownCommands[cmd]) {
            handleValueInput(value);
            setHistory(prev => [...prev, `${activeCommand} > ${value}`]);
        } else if (knownCommands[cmd]) {
            startCommand(knownCommands[cmd] as any);
            setHistory(prev => [...prev, `Command: ${knownCommands[cmd]}`]);
        } else {
            if (activeCommand) {
                // pass
            } else if (value) {
                setHistory(prev => [...prev, `Unknown command: ${value}`]);
            }
        }

        setInput('');
    };

    const getPrompt = (): string => {
        if (!activeCommand) return 'Command:';
        switch (activeCommand) {
            case 'LINE': return step === 1 ? 'Line Specify first point:' : 'Line Specify next point:';
            case 'CIRCLE': return step === 1 ? 'Circle Specify center:' : 'Circle Specify radius:';
            case 'ARC':
                if (step === 1) return 'Arc Specify start point:';
                if (step === 2) return 'Arc Specify second point:';
                return 'Arc Specify end point:';
            case 'POLYLINE': return step === 1 ? 'PLine Specify start point:' : 'PLine Specify next point [Close]:';
            case 'RECTANGLE': return step === 1 ? 'Rect Specify first corner:' : 'Rect Specify other corner:';
            case 'POLYGON':
                if (step === 1) return 'Polygon Enter number of sides <6>:';
                return 'Polygon Specify center/radius:';
            case 'ELLIPSE':
                if (step === 1) return 'Ellipse Specify center:';
                if (step === 2) return 'Ellipse Specify endpoint of axis:';
                return 'Ellipse Specify distance to other axis:';
            case 'POINT': return 'Point Specify a point:';
            case 'SPLINE': return step === 1 ? 'Spline Specify first point:' : 'Spline Specify next point:';
            case 'RAY': return step === 1 ? 'Ray Specify origin point:' : 'Ray Specify through point:';
            case 'XLINE': return step === 1 ? 'XLine Specify a point:' : 'XLine Specify through point:';
            case 'DONUT':
                if (step === 1) return 'Donut Specify center point:';
                if (step === 2) return 'Donut Specify inside diameter:';
                return 'Donut Specify outside diameter:';
            case 'MOVE': return step === 1 ? 'Move Specify base point:' : 'Move Specify destination:';
            case 'COPY': return step === 1 ? 'Copy Specify base point:' : 'Copy Specify destination:';
            case 'ROTATE':
                if (step === 1) return 'Rotate Specify base point:';
                if (step === 2) return 'Rotate Specify rotation angle:';
                return 'Rotate Specify second point:';
            case 'SCALE':
                if (step === 1) return 'Scale Specify base point:';
                if (step === 2) return 'Scale Specify scale factor or reference:';
                return 'Scale Specify second point:';
            case 'MIRROR': return step === 1 ? 'Mirror Specify first point of mirror line:' : 'Mirror Specify second point:';
            case 'OFFSET':
                if (step === 1) return 'Offset Specify offset distance <1.0000>:';
                if (step === 2) return 'Offset Select object to offset:';
                return 'Offset Specify point on side to offset:';
            case 'ERASE': return 'Erase Select objects (press Enter to delete):';
            default: return 'Command:';
        }
    };

    return (
        <div className="command-line-container">
            <div className="command-history">
                {history.slice(-4).map((line, i) => (
                    <div key={i} className="history-line">{line}</div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="command-input-area">
                <span className="prompt-label">{getPrompt()}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="command-input"
                    autoFocus
                />
            </form>
        </div>
    );
};

export default CommandLine;
