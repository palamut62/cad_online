import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DEFAULT_DIMENSION_SETTINGS, type ArrowStyle, type DecimalFormat } from '../../types/dimensionSettings';
import type { DimensionEntity } from '../../types/entities';

interface DimensionEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entityId: number, updates: Partial<DimensionEntity>) => void;
    entity: DimensionEntity | null;
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

const ARROW_STYLES: { value: ArrowStyle; label: string }[] = [
    { value: 'closed', label: 'Kapalı Ok' },
    { value: 'open', label: 'Açık Ok' },
    { value: 'dot', label: 'Nokta' },
    { value: 'arrowDot', label: 'Oklu Nokta' },
    { value: 'architectural', label: 'Mimari (/)' },
    { value: 'none', label: 'Yok' },
];

const DECIMAL_FORMATS: { value: DecimalFormat; label: string; example: string }[] = [
    { value: '0', label: 'Tam Sayı', example: '123' },
    { value: '0.0', label: '1 Ondalık', example: '123.5' },
    { value: '0.00', label: '2 Ondalık', example: '123.45' },
    { value: '0.000', label: '3 Ondalık', example: '123.456' },
    { value: '0.0000', label: '4 Ondalık', example: '123.4567' },
    { value: 'fraction', label: 'Kesir', example: '123 1/2' },
];

const DimensionEditDialog: React.FC<DimensionEditDialogProps> = ({ isOpen, onClose, onSave, entity }) => {
    // Local state for form values
    const [text, setText] = useState('');
    const [textHeight, setTextHeight] = useState(2.5);
    const [arrowSize, setArrowSize] = useState(2.5);
    const [arrowStyle, setArrowStyle] = useState<ArrowStyle>('closed');
    const [arrowDirection, setArrowDirection] = useState<'inside' | 'outside' | 'both'>('both');
    const [arrowColor, setArrowColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#ffffff');
    const [dimLineColor, setDimLineColor] = useState('#ffffff');
    const [extLineColor, setExtLineColor] = useState('#ffffff');
    const [precision, setPrecision] = useState<DecimalFormat>('0.00');
    const [extensionLineOffset, setExtensionLineOffset] = useState(1.5);
    const [extensionLineExtend, setExtensionLineExtend] = useState(1.25);
    const [dimLineWeight, setDimLineWeight] = useState(1.0);
    const [extLineWeight, setExtLineWeight] = useState(0.5);
    const [showUnit, setShowUnit] = useState(false);
    const [unit, setUnit] = useState('mm');

    // Load entity values when dialog opens or entity changes
    useEffect(() => {
        if (isOpen && entity) {
            setText(entity.text || '');
            setTextHeight(entity.textHeight || DEFAULT_DIMENSION_SETTINGS.textHeight);
            setArrowSize(entity.arrowSize || DEFAULT_DIMENSION_SETTINGS.arrowSize);
            setArrowStyle(entity.arrowStyle || DEFAULT_DIMENSION_SETTINGS.arrowStyle);
            setArrowDirection(entity.arrowDirection || DEFAULT_DIMENSION_SETTINGS.arrowDirection);
            setArrowColor(entity.arrowColor || entity.color || DEFAULT_DIMENSION_SETTINGS.arrowColor);
            setTextColor(entity.textColor || entity.color || DEFAULT_DIMENSION_SETTINGS.textColor);
            setDimLineColor(entity.dimLineColor || entity.color || DEFAULT_DIMENSION_SETTINGS.dimLineColor);
            setExtLineColor(entity.extLineColor || entity.color || DEFAULT_DIMENSION_SETTINGS.extLineColor);
            setPrecision((entity.precision as DecimalFormat) || DEFAULT_DIMENSION_SETTINGS.precision);
            setExtensionLineOffset(entity.extensionLineOffset || DEFAULT_DIMENSION_SETTINGS.extensionLineOffset);
            setExtensionLineExtend(entity.extensionLineExtend || DEFAULT_DIMENSION_SETTINGS.extensionLineExtend);
            setDimLineWeight(entity.dimLineWeight || DEFAULT_DIMENSION_SETTINGS.dimLineWeight);
            setExtLineWeight(entity.extLineWeight || DEFAULT_DIMENSION_SETTINGS.extLineWeight);
            setShowUnit(entity.showUnit ?? false);
            setUnit(entity.unit || 'mm');
        }
    }, [isOpen, entity]);

    if (!isOpen || !entity) return null;

    const handleSave = () => {
        onSave(entity.id, {
            text: text || undefined,
            textHeight,
            arrowSize,
            arrowStyle,
            arrowDirection,
            arrowColor,
            textColor,
            dimLineColor,
            extLineColor,
            precision,
            extensionLineOffset,
            extensionLineExtend,
            dimLineWeight,
            extLineWeight,
            showUnit,
            unit
        });
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

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
                zIndex: 1000,
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                style={{
                    backgroundColor: colors.bg,
                    borderRadius: '8px',
                    width: '500px',
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>edit</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>EDIT DIMENSION</span>
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

                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px'
                }}>
                    {/* Metin Değeri */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>
                            Override Text Value (Leave empty for calculated):
                        </label>
                        <input
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="e.g. 50 or R25"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>
                                Text Height: <span style={{ color: colors.textMain }}>{textHeight}</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                step="0.5"
                                value={textHeight}
                                onChange={e => setTextHeight(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                Arrow Size: <span style={{ color: colors.textMain }}>{arrowSize}</span>
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="10"
                                step="0.5"
                                value={arrowSize}
                                onChange={e => setArrowSize(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Ok Şekli */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Arrow Style</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {ARROW_STYLES.map(style => (
                                <button
                                    key={style.value}
                                    type="button"
                                    onClick={() => setArrowStyle(style.value)}
                                    style={{
                                        padding: '8px',
                                        backgroundColor: arrowStyle === style.value ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: arrowStyle === style.value ? colors.accent : colors.textDim,
                                        border: `1px solid ${arrowStyle === style.value ? colors.accent : colors.border}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ok Yönü */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Arrow Direction</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { value: 'inside' as const, label: 'Inside' },
                                { value: 'outside' as const, label: 'Outside' },
                                { value: 'both' as const, label: 'Both' }
                            ].map(dir => (
                                <button
                                    key={dir.value}
                                    type="button"
                                    onClick={() => setArrowDirection(dir.value)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        backgroundColor: arrowDirection === dir.value ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                        color: arrowDirection === dir.value ? colors.accent : colors.textDim,
                                        border: `1px solid ${arrowDirection === dir.value ? colors.accent : colors.border}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {dir.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hassasiyet */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Precision</label>
                        <select
                            value={precision}
                            onChange={e => setPrecision(e.target.value as DecimalFormat)}
                            style={inputStyle}
                        >
                            {DECIMAL_FORMATS.map(f => (
                                <option key={f.value} value={f.value}>
                                    {f.label} ({f.example})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Renkler */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Colors</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '10px', color: colors.textDim, marginBottom: '4px', display: 'block' }}>Arrow:</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setArrowColor(c.value)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: c.value,
                                                border: arrowColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', color: colors.textDim, marginBottom: '4px', display: 'block' }}>Text:</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setTextColor(c.value)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: c.value,
                                                border: textColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', color: colors.textDim, marginBottom: '4px', display: 'block' }}>Dim Line:</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setDimLineColor(c.value)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: c.value,
                                                border: dimLineColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', color: colors.textDim, marginBottom: '4px', display: 'block' }}>Ext Line:</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setExtLineColor(c.value)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: c.value,
                                                border: extLineColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Çizgi Kalınlıkları */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>
                                Dim Line Weight: <span style={{ color: colors.textMain }}>{dimLineWeight}</span>
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={dimLineWeight}
                                onChange={e => setDimLineWeight(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                Ext Line Weight: <span style={{ color: colors.textMain }}>{extLineWeight}</span>
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={extLineWeight}
                                onChange={e => setExtLineWeight(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Uzantı Çizgisi Ayarları */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>
                                Ext Offset: <span style={{ color: colors.textMain }}>{extensionLineOffset}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.25"
                                value={extensionLineOffset}
                                onChange={e => setExtensionLineOffset(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                Ext Extend: <span style={{ color: colors.textMain }}>{extensionLineExtend}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.25"
                                value={extensionLineExtend}
                                onChange={e => setExtensionLineExtend(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Birim */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', marginBottom: '10px', cursor: 'pointer', color: colors.textMain }}>
                            <input
                                type="checkbox"
                                checked={showUnit}
                                onChange={e => setShowUnit(e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Show Unit
                        </label>
                        {showUnit && (
                            <select
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="mm">mm</option>
                                <option value="cm">cm</option>
                                <option value="m">m</option>
                                <option value="inch">inch</option>
                                <option value="feet">feet</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px',
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
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
                        type="button"
                        onClick={handleSave}
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
                        SAVE
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DimensionEditDialog;
