import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TextInputDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        text: string;
        height: number;
        rotation: number;
        justification?: string;
        width?: number;
        lineSpacing?: number;
        color?: string;
    }) => void;
    initialValues?: {
        text?: string;
        height?: number;
        rotation?: number;
        justification?: string;
        width?: number;
        lineSpacing?: number;
        color?: string;
    };
    mode: 'TEXT' | 'MTEXT';
}

const PRESET_COLORS = [
    { value: '#ffffff', label: 'White' },
    { value: '#ff0000', label: 'Red' },
    { value: '#ffff00', label: 'Yellow' },
    { value: '#00ff00', label: 'Green' },
    { value: '#00ffff', label: 'Cyan' },
    { value: '#0000ff', label: 'Blue' },
    { value: '#ff00ff', label: 'Magenta' },
    { value: '#ff8000', label: 'Orange' },
    { value: '#808080', label: 'Gray' },
];

const TextInputDialog: React.FC<TextInputDialogProps> = ({ isOpen, onClose, onSubmit, initialValues, mode }) => {
    const [text, setText] = useState('');
    const [height, setHeight] = useState(10);
    const [rotation, setRotation] = useState(0);
    const [justification, setJustification] = useState<string>('left');
    const [width, setWidth] = useState(100);
    const [lineSpacing, setLineSpacing] = useState(1.0);
    const [color, setColor] = useState('#ffffff');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Design Tokens
    const colors = {
        bg: 'rgba(30, 30, 31, 0.98)',
        surface: 'rgba(45, 45, 48, 0.5)',
        border: 'rgba(255, 255, 255, 0.1)',
        accent: '#4cc2ff',
        textMain: '#ececec',
        textDim: '#999999',
        error: '#ff6b6b',
        success: '#4cffa6',
        glass: 'blur(16px)',
        inputBg: 'rgba(0, 0, 0, 0.3)'
    };

    const inputStyle = {
        width: '100%',
        padding: '6px 8px',
        backgroundColor: colors.inputBg,
        color: colors.textMain,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        fontFamily: "'Consolas', 'Monaco', monospace",
        fontSize: '11px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '11px',
        color: colors.textDim
    };

    useEffect(() => {
        if (isOpen) {
            setText(initialValues?.text || '');
            setHeight(initialValues?.height || 10);
            setRotation(initialValues?.rotation || 0);
            setJustification(initialValues?.justification || 'left');
            setWidth(initialValues?.width || 100);
            setLineSpacing(initialValues?.lineSpacing || 1.0);
            setColor(initialValues?.color || '#ffffff');
            setShowAdvanced(false);
        }
    }, [isOpen, initialValues]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            text,
            height,
            rotation,
            justification,
            width: mode === 'MTEXT' ? width : undefined,
            lineSpacing: mode === 'MTEXT' ? lineSpacing : undefined,
            color
        });
        onClose();
    };

    const justificationOptions = mode === 'TEXT'
        ? [
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
            { value: 'aligned', label: 'Aligned' },
            { value: 'middle', label: 'Middle' },
            { value: 'fit', label: 'Fit' }
        ]
        : [
            { value: 'topLeft', label: 'Top Left' },
            { value: 'topCenter', label: 'Top Center' },
            { value: 'topRight', label: 'Top Right' },
            { value: 'middleLeft', label: 'Middle Left' },
            { value: 'middleCenter', label: 'Middle Center' },
            { value: 'middleRight', label: 'Middle Right' },
            { value: 'bottomLeft', label: 'Bottom Left' },
            { value: 'bottomCenter', label: 'Bottom Center' },
            { value: 'bottomRight', label: 'Bottom Right' }
        ];

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return ReactDOM.createPortal(
        <div
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 2000,
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                style={{
                    backgroundColor: colors.bg,
                    borderRadius: '8px',
                    width: '450px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    border: `1px solid ${colors.border}`,
                    fontFamily: "'Consolas', 'Monaco', monospace",
                    backdropFilter: colors.glass,
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>
                            {mode === 'TEXT' ? 'text_fields' : 'format_shapes'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>
                            {mode === 'TEXT' ? 'SINGLE LINE TEXT' : 'MULTILINE TEXT'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: colors.textDim,
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            opacity: 0.6
                        }}
                    >
                        <span className="material-icons" style={{ fontSize: '16px' }}>close</span>
                    </button>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>Content</label>
                            {mode === 'MTEXT' ? (
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        height: '120px',
                                        resize: 'vertical'
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    style={inputStyle}
                                    autoFocus
                                />
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Height</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={height}
                                    onChange={e => setHeight(parseFloat(e.target.value) || 10)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Rotation (Deg)</label>
                                <input
                                    type="number"
                                    value={rotation}
                                    onChange={e => setRotation(parseFloat(e.target.value) || 0)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: colors.accent,
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontFamily: 'inherit'
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '14px' }}>
                                    {showAdvanced ? 'expand_less' : 'expand_more'}
                                </span>
                                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                padding: '16px',
                                borderRadius: '4px',
                                marginBottom: '24px',
                                border: `1px solid ${colors.border}`
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: mode === 'MTEXT' ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Justification</label>
                                        <select
                                            value={justification}
                                            onChange={e => setJustification(e.target.value)}
                                            style={inputStyle}
                                        >
                                            {justificationOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {mode === 'MTEXT' && (
                                        <div>
                                            <label style={labelStyle}>Width</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={width}
                                                onChange={e => setWidth(parseFloat(e.target.value) || 100)}
                                                style={inputStyle}
                                            />
                                        </div>
                                    )}
                                </div>

                                {mode === 'MTEXT' && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Line Spacing</label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={lineSpacing}
                                            onChange={e => setLineSpacing(parseFloat(e.target.value) || 1.0)}
                                            style={{ ...inputStyle, width: '50%' }}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={labelStyle}>Color</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                title={c.label}
                                                onClick={() => setColor(c.value)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    backgroundColor: c.value,
                                                    border: color === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    padding: 0
                                                }}
                                            />
                                        ))}
                                        <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-50%',
                                                    left: '-50%',
                                                    width: '200%',
                                                    height: '200%',
                                                    padding: 0,
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '11px', color: colors.textDim, fontFamily: 'monospace' }}>{color}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: colors.textMain,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s'
                                }}
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 24px',
                                    backgroundColor: colors.accent,
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontFamily: 'inherit',
                                    fontWeight: '700',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(76, 194, 255, 0.2)'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TextInputDialog;
