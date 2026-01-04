
import React, { useState, useEffect } from 'react';

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
    { value: '#ffffff', label: 'Beyaz' },
    { value: '#ff0000', label: 'Kırmızı' },
    { value: '#ffff00', label: 'Sarı' },
    { value: '#00ff00', label: 'Yeşil' },
    { value: '#00ffff', label: 'Cyan' },
    { value: '#0000ff', label: 'Mavi' },
    { value: '#ff00ff', label: 'Magenta' },
    { value: '#ff8000', label: 'Turuncu' },
    { value: '#808080', label: 'Gri' },
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
            { value: 'left', label: 'Sol' },
            { value: 'center', label: 'Orta' },
            { value: 'right', label: 'Sağ' },
            { value: 'aligned', label: 'Hizalı' },
            { value: 'middle', label: 'Ortala' },
            { value: 'fit', label: 'Sığdır' }
        ]
        : [
            { value: 'topLeft', label: 'Sol Üst' },
            { value: 'topCenter', label: 'Orta Üst' },
            { value: 'topRight', label: 'Sağ Üst' },
            { value: 'middleLeft', label: 'Sol Orta' },
            { value: 'middleCenter', label: 'Orta' },
            { value: 'middleRight', label: 'Sağ Orta' },
            { value: 'bottomLeft', label: 'Sol Alt' },
            { value: 'bottomCenter', label: 'Orta Alt' },
            { value: 'bottomRight', label: 'Sağ Alt' }
        ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#2d2d2d',
                padding: '20px',
                borderRadius: '8px',
                width: '450px',
                maxHeight: '90vh',
                overflow: 'auto',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                    {mode === 'TEXT' ? 'Tek Satır Metin' : 'Çok Satırlı Metin'}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>İçerik:</label>
                        {mode === 'MTEXT' ? (
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '120px',
                                    padding: '8px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                                autoFocus
                            />
                        ) : (
                            <input
                                type="text"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px'
                                }}
                                autoFocus
                            />
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Yükseklik:</label>
                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={height}
                                onChange={e => setHeight(parseFloat(e.target.value) || 10)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Açı (Derece):</label>
                            <input
                                type="number"
                                value={rotation}
                                onChange={e => setRotation(parseFloat(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Advanced options toggle */}
                    <div style={{ marginBottom: '15px' }}>
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4cc2ff',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '13px'
                            }}
                        >
                            {showAdvanced ? '▼ Gelişmiş Seçenekleri Gizle' : '▶ Gelişmiş Seçenekler'}
                        </button>
                    </div>

                    {showAdvanced && (
                        <div style={{
                            backgroundColor: '#363636',
                            padding: '15px',
                            borderRadius: '4px',
                            marginBottom: '15px'
                        }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Hizalama:</label>
                                    <select
                                        value={justification}
                                        onChange={e => setJustification(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            border: '1px solid #555',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        {justificationOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {mode === 'MTEXT' && (
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Genişlik:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={width}
                                            onChange={e => setWidth(parseFloat(e.target.value) || 100)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: '#444',
                                                color: 'white',
                                                border: '1px solid #555',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {mode === 'MTEXT' && (
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Satır Aralığı:</label>
                                        <input
                                            type="number"
                                            min="0.5"
                                            max="3"
                                            step="0.1"
                                            value={lineSpacing}
                                            onChange={e => setLineSpacing(parseFloat(e.target.value) || 1.0)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: '#444',
                                                color: 'white',
                                                border: '1px solid #555',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Renk Seçimi */}
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Renk:</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            title={c.label}
                                            onClick={() => setColor(c.value)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: c.value,
                                                border: color === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        title="Özel Renk"
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>{color}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '8px 16px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            style={{ padding: '8px 16px', backgroundColor: '#4cc2ff', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Tamam
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TextInputDialog;
