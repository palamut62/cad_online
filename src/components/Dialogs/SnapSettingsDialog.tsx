import React, { useState, useEffect } from 'react';
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
    { mode: 'MIDPOINT', label: 'Midpoint', icon: '▬' },
    { mode: 'CENTER', label: 'Center', icon: '⊕' },
    { mode: 'NODE', label: 'Node', icon: '●' },
    { mode: 'QUADRANT', label: 'Quadrant', icon: '✚' },
    { mode: 'INTERSECTION', label: 'Intersection', icon: '✳' },
    { mode: 'INSERTION', label: 'Insertion', icon: '➤' },
    { mode: 'PERPENDICULAR', label: 'Perpendicular', icon: '⟂' },
    { mode: 'TANGENT', label: 'Tangent', icon: '◠' },
    { mode: 'NEAREST', label: 'Nearest', icon: '●' },
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
        // DrawingContext'e ayarları kaydet
        // (Bu işlev DrawingContext'te implement edilmeli)
        console.log('Applying snap settings:', localSettings);
        onClose();
    };

    const handleOK = () => {
        handleApply();
        onClose();
    };

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
                width: '380px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                    Object Snap Settings
                </h3>

                {/* Snap Modes Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '15px'
                }}>
                    {SNAP_MODES.map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => toggleMode(mode)}
                            style={{
                                padding: '12px 8px',
                                backgroundColor: localSettings.modes.includes(mode) ? '#4cc2ff' : '#444',
                                color: localSettings.modes.includes(mode) ? 'black' : 'white',
                                border: localSettings.modes.includes(mode) ? '2px solid #4cc2ff' : '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                        <input
                            type="checkbox"
                            checked={localSettings.enabled}
                            onChange={(e) => setLocalSettings({ ...localSettings, enabled: e.target.checked })}
                            style={{ marginRight: '8px' }}
                        />
                        Object Snap On
                    </label>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                Aperture Size: {localSettings.apertureSize}
                            </label>
                            <input
                                type="range"
                                min="3"
                                max="20"
                                value={localSettings.apertureSize}
                                onChange={(e) => setLocalSettings({ ...localSettings, apertureSize: parseFloat(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', marginBottom: '8px' }}>
                        <input
                            type="checkbox"
                            checked={localSettings.magnetEnabled}
                            onChange={(e) => setLocalSettings({ ...localSettings, magnetEnabled: e.target.checked })}
                            style={{ marginRight: '8px' }}
                        />
                        Magnet
                    </label>

                    {localSettings.magnetEnabled && (
                        <div style={{ marginLeft: '24px', marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                Magnet Strength: {localSettings.magnetStrength}
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={localSettings.magnetStrength}
                                onChange={(e) => setLocalSettings({ ...localSettings, magnetStrength: parseFloat(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: '8px 16px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        style={{ padding: '8px 16px', backgroundColor: '#4cc2ff', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        onClick={handleOK}
                        style={{ padding: '8px 16px', backgroundColor: '#107c10', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SnapSettingsDialog;
