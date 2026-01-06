import { useState, FormEvent, useRef, useEffect } from 'react';
import './CommandLine.css';
import { useDrawing } from '../../context/DrawingContext';
import { useAI } from '../../context/AIContext';
import { AGENT_DESCRIPTIONS } from '../../types/aiTypes';


const CommandLine = () => {
    const [history, setHistory] = useState<string[]>(['Type a command (LINE, CIRCLE, PLINE, RECT, POLYGON, MOVE, COPY, ...)']);
    const [input, setInput] = useState('');
    const [aiInput, setAiInput] = useState('');
    const { startCommand, activeCommand, step, handleValueInput } = useDrawing();
    const { generateCADCommands, isLoading: isAILoading, error: aiError, apiKey, clearError, useMultiAgent, activeAgent } = useAI();

    // Dragging state
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            setIsDragging(true);

            // If it was docked (position is null), set initial position to current calculated position
            if (!position) {
                setPosition({ x: rect.left, y: rect.top });
            }
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

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

    const handleAISubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const prompt = aiInput.trim();
        setAiInput('');
        setHistory(prev => [...prev, `AI Request: ${prompt}`]);

        try {
            await generateCADCommands(prompt);
            setHistory(prev => [...prev, `AI: Completed generation for "${prompt}"`]);
        } catch (err) {
            setHistory(prev => [...prev, `AI Error: Failed to process request`]);
        }
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
            case 'DIMLINEAR': return step === 1 ? 'DimLinear Specify first extension line origin:' : step === 2 ? 'DimLinear Specify second extension line origin:' : 'DimLinear Specify dimension line location:';
            case 'DIMALIGNED': return step === 1 ? 'DimAligned Specify first extension line origin:' : step === 2 ? 'DimAligned Specify second extension line origin:' : 'DimAligned Specify dimension line location:';
            case 'DIMRADIUS': return step === 1 ? 'DimRadius Select arc or circle:' : 'DimRadius Specify dimension line location:';
            case 'DIMDIAMETER': return step === 1 ? 'DimDiameter Select arc or circle:' : 'DimDiameter Specify dimension line location:';
            case 'DIMANGULAR': return step === 1 ? 'DimAngular Select first line:' : step === 2 ? 'DimAngular Select second line:' : 'DimAngular Specify dimension arc position:';
            case 'DIMCONTINUE': return 'DimContinue Select extension line origin:';
            case 'DIMBASELINE': return 'DimBaseline Select base dimension:';
            case 'LEADER': return step === 1 ? 'Leader Specify arrow start point:' : step === 2 ? 'Leader Specify next point:' : 'Leader Specify text width <0>:';
            case 'HATCH': return step === 1 ? 'Hatch Select outer boundary (closed polyline/circle/ellipse):' : 'Hatch Select island boundary or Enter to finish:';
            case 'ARRAY': return 'Array Select objects:';
            default: return 'Command:';
        }
    };

    const style: React.CSSProperties = position ? {
        position: 'fixed', // Use fixed positioning when dragging/floating
        left: position.x,
        top: position.y,
        bottom: 'auto',
        right: 'auto',
        width: '600px', // Fixed width when floating, or dynamic based on start? Let's use a safe default or keep it auto width if possible but auto might shrink. 
        // Better to have a min-width or specific width. Let's try to infer or set a good default.
        // Actually, let's keep it 'auto' but constrained by min-width in CSS, or set a practical width.
        // If we want it to look like the docked version but floating, giving it a width is good.
    } : {};

    return (
        <div
            className={`command-line-container ${isDragging ? 'dragging' : ''}`}
            ref={containerRef}
            style={style}
        >
            <div
                className="command-line-handle"
                onMouseDown={handleMouseDown}
            >
                <span className="material-icons">drag_indicator</span>
            </div>
            <div className="command-line-content" style={{ position: 'relative' }}>
                <div
                    className="refresh-btn"
                    onClick={() => {
                        setHistory(['Type a command (LINE, CIRCLE, PLINE, RECT, POLYGON, MOVE, COPY, ...)']);
                        setInput('');
                        setAiInput('');
                        clearError();
                    }}
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        cursor: 'pointer',
                        color: '#666',
                        zIndex: 10
                    }}
                    title="Reset Terminal"
                >
                    <span className="material-icons" style={{ fontSize: '14px' }}>refresh</span>
                </div>
                <div className="command-history">
                    {history.slice(-4).map((line, i) => (
                        <div key={i} className="history-line">{line}</div>
                    ))}
                    {aiError && <div className="history-line error" style={{ color: '#ff6b6b' }}>AI Error: {aiError}</div>}
                    {isAILoading && <div className="history-line info" style={{ color: '#4cc2ff' }}>AI is thinking...</div>}
                </div>

                {/* Standard Command Input */}
                <form onSubmit={handleSubmit} className="command-input-area" style={{ borderBottom: '1px solid #333', backgroundColor: '#252525' }}>
                    <span className="prompt-label" style={{ color: '#4cc2ff' }}>{getPrompt()}</span>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="command-input"
                        autoFocus
                        placeholder="Type a command..."
                        style={{ caretColor: '#4cc2ff', color: '#999', fontSize: '11px' }}
                    />
                </form>

                {/* AI Command Input */}
                <form onSubmit={handleAISubmit} className="command-input-area" style={{ backgroundColor: '#252525' }}>
                    <span className="prompt-label" style={{ color: '#4cc2ff' }}>AI:</span>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            className="command-input"
                            placeholder="Doğal dil ile çizim yapın..."
                            style={{ caretColor: '#4cc2ff', color: '#999', fontSize: '11px' }}
                        />
                        <div style={{
                            marginLeft: '10px',
                            paddingRight: '10px',
                            fontSize: '9px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            minWidth: '130px',
                            transition: 'all 0.3s ease'
                        }}>
                            {apiKey ? (
                                useMultiAgent ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            background: isAILoading && activeAgent
                                                ? 'linear-gradient(90deg, rgba(76, 194, 255, 0.2), rgba(76, 255, 166, 0.2))'
                                                : 'rgba(76, 255, 166, 0.1)',
                                            border: `1px solid ${isAILoading && activeAgent ? '#4cc2ff' : '#4cffa6'}`,
                                            transition: 'all 0.3s ease'
                                        }}
                                        className={isAILoading && activeAgent ? 'agent-pulse' : ''}
                                    >
                                        {isAILoading && activeAgent ? (
                                            <>
                                                <span
                                                    className="material-icons spin-icon"
                                                    style={{ fontSize: '12px', color: '#4cc2ff' }}
                                                >
                                                    sync
                                                </span>
                                                <span
                                                    style={{
                                                        color: '#4cc2ff',
                                                        fontWeight: 600,
                                                        animation: 'fadeSlide 0.3s ease-in-out'
                                                    }}
                                                    key={activeAgent}
                                                >
                                                    {AGENT_DESCRIPTIONS[activeAgent]?.name || activeAgent}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons" style={{ fontSize: '12px', color: '#4cffa6' }}>hub</span>
                                                <span style={{ color: '#4cffa6', fontWeight: 600 }}>Multi-Agent</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{ color: '#888', opacity: 0.5, fontSize: '8px' }}>Tek Model</span>
                                )
                            ) : (
                                <span style={{ color: '#ff6b6b', opacity: 0.7, fontSize: '8px' }}>API Key Yok</span>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CommandLine;
