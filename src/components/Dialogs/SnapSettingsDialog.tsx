import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { SnapMode } from '../../types/snap';
import { DEFAULT_SNAP_SETTINGS } from '../../types/snap';

interface SnapDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LocalSnapSettings {
    enabled: boolean;
    modes: SnapMode[];
    apertureSize: number;
    magnetEnabled: boolean;
    magnetStrength: number;
}

const SNAP_MODES: { mode: SnapMode; label: string; icon: string }[] = [
    { mode: 'ENDPOINT', label: 'Endpoint', icon: '■' },
    { mode: 'MIDPOINT', label: 'Midpoint', icon: '▲' }, // Changed to standard triangle
    { mode: 'CENTER', label: 'Center', icon: '⊕' },
    { mode: 'NODE', label: 'Node', icon: '●' },
    { mode: 'QUADRANT', label: 'Quadrant', icon: '◆' }, // Diamond
    { mode: 'INTERSECTION', label: 'Intersection', icon: '✕' },
    { mode: 'INSERTION', label: 'Insertion', icon: 'INS' },
    { mode: 'PERPENDICULAR', label: 'Perpendicular', icon: '⊥' },
    { mode: 'TANGENT', label: 'Tangent', icon: '○' },
    { mode: 'NEAREST', label: 'Nearest', icon: '⧖' },
    { mode: 'PARALLEL', label: 'Parallel', icon: '//' },
];

const defaultLocalSettings: LocalSnapSettings = {
    enabled: DEFAULT_SNAP_SETTINGS.enabled,
    modes: Array.from(DEFAULT_SNAP_SETTINGS.modes),
    apertureSize: DEFAULT_SNAP_SETTINGS.apertureSize,
    magnetEnabled: DEFAULT_SNAP_SETTINGS.magnetEnabled,
    magnetStrength: DEFAULT_SNAP_SETTINGS.magnetStrength,
};

const SnapSettingsDialog: React.FC<SnapDialogProps> = ({ isOpen, onClose }) => {
    const [localSettings, setLocalSettings] = useState<LocalSnapSettings>(defaultLocalSettings);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(defaultLocalSettings);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleMode = (mode: SnapMode) => {
        let newModes: SnapMode[];
        if (localSettings.modes.includes(mode)) {
            newModes = localSettings.modes.filter(m => m !== mode);
        } else {
            newModes = [...localSettings.modes, mode];
        }
        setLocalSettings({ ...localSettings, modes: newModes });
    };

    const handleApply = () => {
        // DrawingContext'e ayarları kaydet logic'i buraya gelecek
        console.log('Applying snap settings:', localSettings);
        onClose();
    };

    const handleOK = () => {
        handleApply();
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
        glass: 'blur(16px)'
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
                    padding: '0',
                    borderRadius: '8px',
                    width: '400px',
                    color: colors.textMain,
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>gps_fixed</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>OBJECT SNAP SETTINGS</span>
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

                {/* Content */}
                <div style={{ padding: '16px' }}>

                    {/* Main Toggle */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        cursor: 'pointer',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        border: `1px solid ${localSettings.enabled ? colors.accent : 'transparent'}`
                    }}>
                        <input
                            type="checkbox"
                            checked={localSettings.enabled}
                            onChange={(e) => setLocalSettings({ ...localSettings, enabled: e.target.checked })}
                            style={{ marginRight: '8px' }}
                        />
                        OBJECT SNAP ON (F3)
                    </label>

                    {/* Snap Modes Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px',
                        marginBottom: '20px',
                        opacity: localSettings.enabled ? 1 : 0.5,
                        pointerEvents: localSettings.enabled ? 'auto' : 'none'
                    }}>
                        {SNAP_MODES.map(({ mode, label, icon }) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => toggleMode(mode)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: localSettings.modes.includes(mode) ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    color: localSettings.modes.includes(mode) ? colors.accent : colors.textDim,
                                    border: `1px solid ${localSettings.modes.includes(mode) ? colors.accent : colors.border}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{icon}</span>
                                <span style={{ fontFamily: 'Consolas, monospace', fontWeight: localSettings.modes.includes(mode) ? '700' : '400' }}>
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Advanced Settings */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ fontSize: '10px', color: colors.accent, fontWeight: '700', marginBottom: '8px' }}>ADVANCED CONFIG</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '10px', color: colors.textDim }}>Aperture Size</label>
                                    <span style={{ fontSize: '10px', color: colors.textMain }}>{localSettings.apertureSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="3"
                                    max="20"
                                    value={localSettings.apertureSize}
                                    onChange={(e) => setLocalSettings({ ...localSettings, apertureSize: parseFloat(e.target.value) })}
                                    style={{ width: '100%', height: '4px', accentColor: colors.accent }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', marginBottom: '4px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={localSettings.magnetEnabled}
                                        onChange={(e) => setLocalSettings({ ...localSettings, magnetEnabled: e.target.checked })}
                                        style={{ marginRight: '6px' }}
                                    />
                                    Magnet Effect
                                </label>

                                {localSettings.magnetEnabled && (
                                    <div style={{ marginLeft: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <label style={{ fontSize: '10px', color: colors.textDim }}>Strength</label>
                                            <span style={{ fontSize: '10px', color: colors.textMain }}>{(localSettings.magnetStrength * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.1"
                                            value={localSettings.magnetStrength}
                                            onChange={(e) => setLocalSettings({ ...localSettings, magnetStrength: parseFloat(e.target.value) })}
                                            style={{ width: '100%', height: '4px', accentColor: colors.accent }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: 'transparent',
                                color: colors.textDim,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            onClick={handleOK}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: colors.accent,
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                fontWeight: '700'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SnapSettingsDialog;
