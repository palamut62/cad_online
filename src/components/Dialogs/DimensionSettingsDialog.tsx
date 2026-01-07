import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    DimensionSettings,
    DEFAULT_DIMENSION_SETTINGS,
    saveDimensionSettings,
    loadDimensionSettings,
    type ArrowStyle,
    type ArrowDirection,
    type TextAlignment,
    type DecimalFormat,
    type AngleFormat
} from '../../types/dimensionSettings';

interface DimensionSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (settings: DimensionSettings) => void;
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

const ARROW_STYLES: { value: ArrowStyle; label: string; icon?: string }[] = [
    { value: 'closed', label: 'Closed Filled' },
    { value: 'open', label: 'Open' },
    { value: 'dot', label: 'Dot' },
    { value: 'arrowDot', label: 'Dot with Arrow' },
    { value: 'architectural', label: 'Architectural Tick' },
    { value: 'none', label: 'None' },
];

const ARROW_DIRECTIONS: { value: ArrowDirection; label: string }[] = [
    { value: 'inside', label: 'Inside' },
    { value: 'outside', label: 'Outside' },
    { value: 'both', label: 'Both' },
];

const TEXT_ALIGNMENTS: { value: TextAlignment; label: string }[] = [
    { value: 'center', label: 'Center' },
    { value: 'above', label: 'Above' },
    { value: 'below', label: 'Below' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
];

const DECIMAL_FORMATS: { value: DecimalFormat; label: string; example: string }[] = [
    { value: '0', label: 'Integer', example: '123' },
    { value: '0.0', label: '1 Decimal', example: '123.5' },
    { value: '0.00', label: '2 Decimals', example: '123.45' },
    { value: '0.000', label: '3 Decimals', example: '123.456' },
    { value: '0.0000', label: '4 Decimals', example: '123.4567' },
    { value: 'fraction', label: 'Fractional', example: '123 1/2' },
];

const ANGLE_FORMATS: { value: AngleFormat; label: string; example: string }[] = [
    { value: 'decimal', label: 'Decimal Degrees', example: '45.5°' },
    { value: 'degMinSec', label: 'Deg/Min/Sec', example: '45°30\'00"' },
    { value: 'radian', label: 'Radians', example: '0.794 rad' },
    { value: 'gradian', label: 'Gradians', example: '50.66g' },
];

const DimensionSettingsDialog: React.FC<DimensionSettingsDialogProps> = ({ isOpen, onClose, onApply }) => {
    const [settings, setSettings] = useState<DimensionSettings>({ ...DEFAULT_DIMENSION_SETTINGS });
    const [activeTab, setActiveTab] = useState<'general' | 'arrows' | 'lines' | 'text'>('general');

    useEffect(() => {
        if (isOpen) {
            setSettings(loadDimensionSettings());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        saveDimensionSettings(settings);
        onApply(settings);
        onClose();
    };

    const handleSaveAsDefault = () => {
        saveDimensionSettings(settings); // Already saves to local storage which acts as default
        // Show feedback - using simple console for now, ideally use a toast
        console.log('Settings saved');
    };

    const updateSetting = <K extends keyof DimensionSettings>(key: K, value: DimensionSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
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

    const sectionTitleStyle = {
        marginTop: 0,
        marginBottom: '16px',
        fontSize: '12px',
        color: colors.accent,
        fontWeight: '700',
        letterSpacing: '0.5px',
        textTransform: 'uppercase' as const
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
                    width: '700px',
                    maxHeight: '85vh',
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>straighten</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>DIMENSION SETTINGS</span>
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

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: `1px solid ${colors.border}`,
                    padding: '0 16px',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    {[
                        { id: 'general', label: 'GENERAL' },
                        { id: 'arrows', label: 'ARROWS' },
                        { id: 'lines', label: 'LINES' },
                        { id: 'text', label: 'TEXT' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                color: activeTab === tab.id ? colors.accent : colors.textDim,
                                borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                fontWeight: activeTab === tab.id ? '700' : '400',
                                transition: 'all 0.2s',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px'
                }}>
                    {activeTab === 'general' && (
                        <div>
                            <h4 style={sectionTitleStyle}>General Settings</h4>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Scale Factor: <span style={{ color: colors.textMain }}>{settings.scale}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={settings.scale}
                                    onChange={e => updateSetting('scale', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Decimal Precision</label>
                                    <select
                                        value={settings.precision}
                                        onChange={e => updateSetting('precision', e.target.value as DecimalFormat)}
                                        style={inputStyle}
                                    >
                                        {DECIMAL_FORMATS.map(f => (
                                            <option key={f.value} value={f.value}>
                                                {f.label} ({f.example})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>Angle Format</label>
                                    <select
                                        value={settings.angleFormat}
                                        onChange={e => updateSetting('angleFormat', e.target.value as AngleFormat)}
                                        style={inputStyle}
                                    >
                                        {ANGLE_FORMATS.map(f => (
                                            <option key={f.value} value={f.value}>
                                                {f.label} ({f.example})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Angle Precision</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="6"
                                        value={settings.anglePrecision}
                                        onChange={e => updateSetting('anglePrecision', parseInt(e.target.value) || 1)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                padding: '16px',
                                borderRadius: '4px',
                                marginBottom: '24px',
                                border: `1px solid ${colors.border}`
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', marginBottom: '12px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.suppressLeadingZeros}
                                        onChange={e => updateSetting('suppressLeadingZeros', e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Suppress Leading Zeros (.25)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.suppressTrailingZeros}
                                        onChange={e => updateSetting('suppressTrailingZeros', e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Suppress Trailing Zeros (1.)
                                </label>
                            </div>

                            <h4 style={sectionTitleStyle}>Units</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Unit Display</label>
                                    <select
                                        value={settings.unitDisplay}
                                        onChange={e => updateSetting('unitDisplay', e.target.value as any)}
                                        style={inputStyle}
                                    >
                                        <option value="none">None</option>
                                        <option value="prefix">Prefix (mm 25)</option>
                                        <option value="suffix">Suffix (25 mm)</option>
                                    </select>
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', marginBottom: '8px', cursor: 'pointer', color: colors.textMain }}>
                                <input
                                    type="checkbox"
                                    checked={settings.showUnitSymbol}
                                    onChange={e => updateSetting('showUnitSymbol', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Show Unit Symbol
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                <input
                                    type="checkbox"
                                    checked={settings.useDrawingScale}
                                    onChange={e => updateSetting('useDrawingScale', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Use Drawing Scale
                            </label>
                        </div>
                    )}

                    {activeTab === 'arrows' && (
                        <div>
                            <h4 style={sectionTitleStyle}>Arrow Settings</h4>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Arrow Style</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {ARROW_STYLES.map(style => (
                                        <button
                                            key={style.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowStyle', style.value)}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: settings.arrowStyle === style.value ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: settings.arrowStyle === style.value ? colors.accent : colors.textDim,
                                                border: `1px solid ${settings.arrowStyle === style.value ? colors.accent : colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontFamily: 'inherit',
                                                textAlign: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Arrow Direction</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {ARROW_DIRECTIONS.map(dir => (
                                        <button
                                            key={dir.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowDirection', dir.value)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: settings.arrowDirection === dir.value ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: settings.arrowDirection === dir.value ? colors.accent : colors.textDim,
                                                border: `1px solid ${settings.arrowDirection === dir.value ? colors.accent : colors.border}`,
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

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Arrow Size: <span style={{ color: colors.textMain }}>{settings.arrowSize}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.5"
                                    value={settings.arrowSize}
                                    onChange={e => updateSetting('arrowSize', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Arrow Size Multiplier: <span style={{ color: colors.textMain }}>{settings.arrowSizeMultiplier}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={settings.arrowSizeMultiplier}
                                    onChange={e => updateSetting('arrowSizeMultiplier', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Arrow Color</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowColor', c.value)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: c.value,
                                                border: settings.arrowColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                            title={c.label}
                                        />
                                    ))}
                                    <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <input
                                            type="color"
                                            value={settings.arrowColor}
                                            onChange={e => updateSetting('arrowColor', e.target.value)}
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
                                    <span style={{ fontSize: '11px', color: colors.textDim, fontFamily: 'monospace' }}>
                                        {settings.arrowColor}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lines' && (
                        <div>
                            <h4 style={sectionTitleStyle}>Line Settings</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>
                                        Extension Offset: <span style={{ color: colors.textMain }}>{settings.extensionLineOffset}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.25"
                                        value={settings.extensionLineOffset}
                                        onChange={e => updateSetting('extensionLineOffset', parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                    />
                                    <span style={{ fontSize: '10px', color: colors.textDim, opacity: 0.7 }}>Dist from Object</span>
                                </div>

                                <div>
                                    <label style={labelStyle}>
                                        Extension Extend: <span style={{ color: colors.textMain }}>{settings.extensionLineExtend}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.25"
                                        value={settings.extensionLineExtend}
                                        onChange={e => updateSetting('extensionLineExtend', parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                    />
                                    <span style={{ fontSize: '10px', color: colors.textDim, opacity: 0.7 }}>Extend beyond Dim Line</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>
                                        Dim Line Weight: <span style={{ color: colors.textMain }}>{settings.dimLineWeight}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={settings.dimLineWeight}
                                        onChange={e => updateSetting('dimLineWeight', parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                    />
                                </div>

                                <div>
                                    <label style={labelStyle}>
                                        Ext Line Weight: <span style={{ color: colors.textMain }}>{settings.extLineWeight}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={settings.extLineWeight}
                                        onChange={e => updateSetting('extLineWeight', parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Dimension Line Color</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('dimLineColor', c.value)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: c.value,
                                                border: settings.dimLineColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <input
                                            type="color"
                                            value={settings.dimLineColor}
                                            onChange={e => updateSetting('dimLineColor', e.target.value)}
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
                                    <span style={{ fontSize: '11px', color: colors.textDim, fontFamily: 'monospace' }}>
                                        {settings.dimLineColor}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Extension Line Color</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('extLineColor', c.value)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: c.value,
                                                border: settings.extLineColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <input
                                            type="color"
                                            value={settings.extLineColor}
                                            onChange={e => updateSetting('extLineColor', e.target.value)}
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
                                    <span style={{ fontSize: '11px', color: colors.textDim, fontFamily: 'monospace' }}>
                                        {settings.extLineColor}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div>
                            <h4 style={sectionTitleStyle}>Text Settings</h4>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Text Height: <span style={{ color: colors.textMain }}>{settings.textHeight}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={settings.textHeight}
                                    onChange={e => updateSetting('textHeight', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Text Gap: <span style={{ color: colors.textMain }}>{settings.textGap}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={settings.textGap}
                                    onChange={e => updateSetting('textGap', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: colors.accent, height: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Alignment</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {TEXT_ALIGNMENTS.map(align => (
                                        <button
                                            key={align.value}
                                            type="button"
                                            onClick={() => updateSetting('textAlignment', align.value)}
                                            style={{
                                                padding: '8px',
                                                backgroundColor: settings.textAlignment === align.value ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                                color: settings.textAlignment === align.value ? colors.accent : colors.textDim,
                                                border: `1px solid ${settings.textAlignment === align.value ? colors.accent : colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontFamily: 'inherit',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {align.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Text Rotation</label>
                                    <select
                                        value={settings.textRotation}
                                        onChange={e => updateSetting('textRotation', e.target.value as any)}
                                        style={inputStyle}
                                    >
                                        <option value="aligned">Aligned</option>
                                        <option value="horizontal">Horizontal</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={labelStyle}>Text Movement</label>
                                    <select
                                        value={settings.textMovement}
                                        onChange={e => updateSetting('textMovement', e.target.value as any)}
                                        style={inputStyle}
                                    >
                                        <option value="moveLine">Move Line</option>
                                        <option value="moveText">Move Text</option>
                                        <option value="addLeader">Add Leader</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>Text Color</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('textColor', c.value)}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: c.value,
                                                border: settings.textColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <input
                                            type="color"
                                            value={settings.textColor}
                                            onChange={e => updateSetting('textColor', e.target.value)}
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
                                    <span style={{ fontSize: '11px', color: colors.textDim, fontFamily: 'monospace' }}>
                                        {settings.textColor}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Text Background Color</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {[
                                        { value: 'transparent', label: 'None' },
                                        ...PRESET_COLORS
                                    ].map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('textBackgroundColor', c.value)}
                                            style={{
                                                width: c.value === 'transparent' ? 'auto' : '24px',
                                                minWidth: '24px',
                                                height: '24px',
                                                backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                                                border: settings.textBackgroundColor === c.value ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: c.value === 'transparent' ? '0 8px' : '0',
                                                fontSize: '10px',
                                                color: c.value === 'transparent' ? colors.textDim : 'transparent'
                                            }}
                                        >
                                            {c.value === 'transparent' && 'None'}
                                        </button>
                                    ))}
                                    <div style={{ position: 'relative', width: '24px', height: '24px', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <input
                                            type="color"
                                            value={(settings.textBackgroundColor === 'transparent' ? '#ffffff' : settings.textBackgroundColor) as string}
                                            onChange={e => updateSetting('textBackgroundColor', e.target.value)}
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
                                </div>
                            </div>
                        </div>
                    )}
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
                        onClick={handleSaveAsDefault}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: colors.textDim,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                            marginRight: 'auto'
                        }}
                    >
                        SAVE AS DEFAULT
                    </button>
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
                        onClick={handleApply}
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
                        APPLY
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DimensionSettingsDialog;
