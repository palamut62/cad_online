import React, { useState, useMemo, useEffect } from 'react';
import { PRESET_PATTERNS, PATTERN_CATEGORIES, getPatternPreview, addCustomPattern, deleteCustomPattern } from '../../utils/hatchPatterns';
import { useNotification } from '../../context/NotificationContext';
import './HatchDialog.css';

interface HatchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (params: HatchParams) => void;
    onUpdate?: (entityId: number, params: HatchParams) => void; // For edit mode
    onLiveUpdate?: (entityId: number, params: HatchParams) => void; // For live preview during editing
    initialParams?: Partial<HatchParams>;
    editMode?: boolean;
    entityId?: number;
}

export interface HatchParams {
    pattern: string;
    color: string;
    scale: number;
    rotation: number;
    opacity: number;
}

const HatchDialog: React.FC<HatchDialogProps> = ({
    isOpen,
    onClose,
    onApply,
    onUpdate,
    onLiveUpdate,
    initialParams,
    editMode = false,
    entityId
}) => {
    const [selectedPattern, setSelectedPattern] = useState(initialParams?.pattern || 'ANSI31');
    const [color, setColor] = useState(initialParams?.color || PRESET_PATTERNS['ANSI31']?.color || '#808080');
    const [scale, setScale] = useState(initialParams?.scale || 1);
    const [rotation, setRotation] = useState(initialParams?.rotation || 0);
    const [opacity, setOpacity] = useState(initialParams?.opacity || 1);
    const [activeCategory, setActiveCategory] = useState<string>('architectural');
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Force re-render when new patterns added
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { showConfirm } = useNotification();

    // Reset to defaults when dialog opens or params change
    useEffect(() => {
        if (isOpen) {
            setSelectedPattern(initialParams?.pattern || 'ANSI31');
            setColor(initialParams?.color || PRESET_PATTERNS['ANSI31']?.color || '#808080');
            setScale(initialParams?.scale || 1);
            setRotation(initialParams?.rotation || 0);
            setOpacity(initialParams?.opacity || 1);
        }
    }, [isOpen, initialParams]);

    // Live update effect - trigger when any parameter changes in edit mode
    useEffect(() => {
        if (editMode && entityId !== undefined && onLiveUpdate) {
            onLiveUpdate(entityId, {
                pattern: selectedPattern,
                color,
                scale,
                rotation,
                opacity
            });
        }
    }, [editMode, entityId, onLiveUpdate, selectedPattern, color, scale, rotation, opacity]);

    // Pattern kategorileri için gruplandırma
    const patternsByCategory = useMemo(() => {
        const groups: Record<string, string[]> = {};
        Object.entries(PRESET_PATTERNS).forEach(([key, config]) => {
            if (!groups[config.category]) groups[config.category] = [];
            groups[config.category].push(key);
        });
        return groups;
        return groups;
    }, [refreshTrigger]); // Re-calculate when refreshTrigger changes

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                // Optimization: Resize image to max 512px
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 512;
                    let w = img.width;
                    let h = img.height;

                    if (w > MAX_SIZE || h > MAX_SIZE) {
                        if (w > h) {
                            h *= MAX_SIZE / w;
                            w = MAX_SIZE;
                        } else {
                            w *= MAX_SIZE / h;
                            h = MAX_SIZE;
                        }
                    }

                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, w, h);
                        const resizedData = canvas.toDataURL('image/png');

                        const name = file.name.split('.')[0];
                        const newId = addCustomPattern(name, resizedData);
                        setRefreshTrigger(prev => prev + 1);
                        setActiveCategory('custom');
                        setSelectedPattern(newId);
                        setColor('#ffffff');
                    }
                };
                img.src = result;
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeletePattern = async (patternKey: string) => {
        const confirmed = await showConfirm('Desen Sil', 'Bu deseni silmek istediğinize emin misiniz?');
        if (confirmed) {
            deleteCustomPattern(patternKey);
            setRefreshTrigger(prev => prev + 1);
            if (selectedPattern === patternKey) {
                setSelectedPattern('ANSI31');
            }
        }
    };

    // Pattern seçildiğinde rengi de güncelle (sadece create modunda)
    const handlePatternSelect = (patternKey: string) => {
        setSelectedPattern(patternKey);
        const patternConfig = PRESET_PATTERNS[patternKey];
        if (patternConfig?.color && !editMode) {
            setColor(patternConfig.color);
        }
    };

    const handleApply = () => {
        const params: HatchParams = {
            pattern: selectedPattern,
            color,
            scale,
            rotation,
            opacity
        };

        if (editMode && entityId !== undefined && onUpdate) {
            onUpdate(entityId, params);
        } else {
            onApply(params);
        }
    };

    if (!isOpen) return null;

    // Common colors palette
    const basicColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#ffffff', '#808080', '#000000', '#8B4513', '#A52A2A', '#DEB887', '#F5F5DC', '#708090'];

    return (
        <div className="hatch-dialog-overlay">
            <div className="hatch-dialog">
                {/* Header */}
                <div className="hatch-dialog-header">
                    <h2>{editMode ? 'Edit Hatch' : 'Hatch Settings'}</h2>
                    <button className="close-btn" onClick={onClose} title="Close">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="hatch-dialog-content">
                    {/* Top: Settings Panel */}
                    <div className="hatch-settings-panel">
                        {/* Scale */}
                        <div className="setting-row">
                            <label>Generic Properties</label>
                            <div className="slider-container">
                                <label style={{ width: '40px' }}>Scale</label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                />
                                <input
                                    type="number"
                                    className="number-input"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="slider-container">
                                <label style={{ width: '40px' }}>Angle</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    step="15"
                                    value={rotation}
                                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                                />
                                <input
                                    type="number"
                                    className="number-input"
                                    min="0"
                                    max="360"
                                    value={rotation}
                                    onChange={(e) => setRotation(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="slider-container">
                                <label style={{ width: '40px' }}>Opacity</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={opacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                />
                                <span className="number-input" style={{ border: 'none', background: 'transparent' }}>
                                    {Math.round(opacity * 100)}%
                                </span>
                            </div>
                        </div>

                        {/* Color */}
                        <div className="setting-row">
                            <label>Color</label>
                            <div className="color-grid">
                                {basicColors.map(c => (
                                    <button
                                        key={c}
                                        className={`color-btn ${color === c ? 'active' : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                        title={c}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="color-btn"
                                    style={{ padding: 0 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Middle: Pattern Selection */}
                    <div className="hatch-patterns-section">
                        {/* Category Tabs */}
                        <div className="hatch-categories-tabs">
                            {Object.entries(PATTERN_CATEGORIES).map(([catKey, catInfo]) => (
                                <button
                                    key={catKey}
                                    className={`category-tab ${activeCategory === catKey ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(catKey)}
                                >
                                    {catInfo.name}
                                </button>
                            ))}
                        </div>

                        {/* Pattern Grid */}
                        <div className="patterns-grid">
                            {/* Upload Button for Custom Category */}
                            {activeCategory === 'custom' && (
                                <button
                                    className="pattern-item upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload PNG Image"
                                    style={{ borderStyle: 'dashed', opacity: 0.7 }}
                                >
                                    <span className="material-icons" style={{ fontSize: '24px', color: '#888' }}>add_photo_alternate</span>
                                    <span className="pattern-name" style={{ opacity: 1, position: 'relative', background: 'transparent', fontSize: '9px', marginTop: '4px' }}>Upload PNG</span>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/png,image/jpeg"
                                        onChange={handleFileUpload}
                                    />
                                </button>
                            )}
                            {patternsByCategory[activeCategory]?.map(patternKey => {
                                const pattern = PRESET_PATTERNS[patternKey];
                                const isSelected = selectedPattern === patternKey;
                                const preview = getPatternPreview(patternKey, 48);
                                const isCustom = pattern.category === 'custom';

                                return (
                                    <button
                                        key={patternKey}
                                        className={`pattern-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handlePatternSelect(patternKey)}
                                        title={pattern.name}
                                    >
                                        {/* Delete Button for Custom Patterns */}
                                        {isCustom && (
                                            <div
                                                className="delete-pattern-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePattern(patternKey);
                                                }}
                                                title="Delete Pattern"
                                            >
                                                <span className="material-icons">close</span>
                                            </div>
                                        )}
                                        <img
                                            src={preview}
                                            alt={pattern.name}
                                            className="pattern-preview"
                                        />
                                        <span className="pattern-name">{pattern.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="hatch-dialog-footer">
                    {editMode ? (
                        <button className="dialog-btn secondary" onClick={onClose}>
                            Close
                        </button>
                    ) : (
                        <>
                            <button className="dialog-btn secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button className="dialog-btn primary" onClick={handleApply}>
                                Pick Boundary
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HatchDialog;
