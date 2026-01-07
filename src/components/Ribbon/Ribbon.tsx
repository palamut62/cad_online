import { useState, useRef, useMemo, useEffect } from 'react';
import './Ribbon.css';
import {
    FaRegCircle, FaRegSquare, FaBezierCurve, FaArrowsAlt, FaCopy,
    FaRedo, FaExpand, FaExchangeAlt, FaEraser, FaFillDrip,
    FaFont, FaTable, FaProjectDiagram, FaCut, FaObjectUngroup,
    FaFolderOpen, FaSave, FaFile, FaFileExport, FaExclamationTriangle
} from 'react-icons/fa';
import { MdPolyline } from 'react-icons/md';
import { TbLine } from 'react-icons/tb';
import { useDrawing } from '../../context/DrawingContext';
import { parseDxf } from '../../utils/dxfLoader';
import { exportDXF } from '../../utils/dxfExporter';
import { PRESET_PATTERNS, PATTERN_CATEGORIES, getPatternPreview } from '../../utils/hatchPatterns';
import HatchDialog, { HatchParams } from '../Dialogs/HatchDialog';

// Helper Component for Visual Line Type Selection
// Helper Component for Visual Line Type Selection
const LineTypeSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options = [
        { value: 'continuous', label: 'Continuous', pattern: 'solid' },
        { value: 'dashed', label: 'Dashed', pattern: 'dashed' },
        { value: 'dotted', label: 'Dotted', pattern: 'dotted' },
        { value: 'dashdot', label: 'Dash-Dot', pattern: 'dashed' },
        { value: 'center', label: 'Center', pattern: 'dashed' },
        { value: 'hidden', label: 'Hidden', pattern: 'dashed' },
        { value: 'phantom', label: 'Phantom', pattern: 'dashed' },
    ];

    const renderPreview = (type: string) => {
        let strokeDasharray = 'none';
        switch (type) {
            case 'dashed': strokeDasharray = '6, 3'; break;
            case 'dotted': strokeDasharray = '1, 2'; break;
            case 'dashdot': strokeDasharray = '6, 2, 1, 2'; break;
            case 'center': strokeDasharray = '10, 3, 2, 3'; break;
            case 'hidden': strokeDasharray = '3, 3'; break;
            case 'phantom': strokeDasharray = '10, 2, 1, 2, 1, 2'; break;
            case 'continuous': strokeDasharray = 'none'; break;
            default: strokeDasharray = 'none';
        }

        return (
            <svg width="60" height="2" style={{ marginRight: '8px' }}>
                <line x1="0" y1="1" x2="60" y2="1" stroke="currentColor" strokeWidth="1" strokeDasharray={strokeDasharray} />
            </svg>
        );
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="property-selector" ref={dropdownRef}>
            <div className="property-trigger" onClick={() => setIsOpen(!isOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {renderPreview(selectedOption.value)}
                    <span className="property-val-label">{selectedOption.label}</span>
                </div>
                <span className="material-icons" style={{ fontSize: '14px' }}>arrow_drop_down</span>
            </div>

            {isOpen && (
                <div className="property-dropdown">
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className="property-option"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {renderPreview(opt.value)}
                            <span>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper Component for Visual Line Weight Selection
const LineWeightSelector = ({ value, onChange }: { value: number, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const weights = [
        0, 0.05, 0.09, 0.13, 0.15, 0.18, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.70, 1.00, 1.40, 2.00
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="property-selector" ref={dropdownRef}>
            <div className="property-trigger" onClick={() => setIsOpen(!isOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                    <div style={{
                        height: Math.max(1, value * 5),
                        width: '40px',
                        backgroundColor: 'currentColor',
                        maxHeight: '12px'
                    }}></div>
                    <span className="property-val-label">{value === 0 ? 'ByLayer' : `${value.toFixed(2)} mm`}</span>
                </div>
                <span className="material-icons" style={{ fontSize: '14px' }}>arrow_drop_down</span>
            </div>

            {isOpen && (
                <div className="property-dropdown">
                    {weights.map(w => (
                        <div
                            key={w}
                            className="property-option"
                            onClick={() => {
                                onChange(w.toString());
                                setIsOpen(false);
                            }}
                        >
                            <div style={{
                                height: Math.max(1, w * 5),
                                width: '40px',
                                backgroundColor: 'currentColor',
                                marginRight: '10px',
                                maxHeight: '12px'
                            }}></div>
                            <span>{w === 0 ? 'ByLayer' : `${w.toFixed(2)} mm`}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Ribbon = () => {
    const [activeTab, setActiveTab] = useState<string>('Home');
    const [dwgWarning, setDwgWarning] = useState<boolean>(false);
    const [hatchDialogOpen, setHatchDialogOpen] = useState<boolean>(false);
    const [hatchEditMode, setHatchEditMode] = useState<boolean>(false);
    const [editingHatchId, setEditingHatchId] = useState<number | null>(null);
    const [hatchParams, setHatchParams] = useState<HatchParams>({
        pattern: 'ANSI31',
        color: '#808080',
        scale: 1,
        rotation: 0,
        opacity: 1
    });

    // Auto-reopen dialog logic
    const [waitingForHatch, setWaitingForHatch] = useState<boolean>(false);
    const prevEntitiesCount = useRef<number>(0);

    const {
        startCommand, selectedIds, updateEntity, updateEntityTransient, activeCommand, setCommandState, commandState, getEntity,
        entities, fileName, isModified, newFile, loadEntities, addSheet,
        baseUnit, setBaseUnit, drawingUnit, setDrawingUnit, drawingScale, setDrawingScale,
        triggerZoomToFit, triggerZoomIn, triggerZoomOut, startZoomWindow, zoomWindowMode,
        // Layers
        layers, activeLayerId, setActiveLayerId, setLayerDialogState,
        // Global Properties
        activeLineType, setActiveLineType, activeLineWeight, setActiveLineWeight
    } = useDrawing();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hatch Context - memoized to prevent unnecessary re-renders
    const hatchContext = useMemo(() => {
        const selectedHatchId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
        const selectedHatch = selectedHatchId ? entities.find(e => e.id === selectedHatchId) : null;
        const isHatchSelected = selectedHatch?.type === 'HATCH';
        const isHatchCommand = activeCommand === 'HATCH';
        const showHatchTab = isHatchSelected || isHatchCommand;
        return { selectedHatchId, selectedHatch, isHatchSelected, isHatchCommand, showHatchTab };
    }, [selectedIds, entities, activeCommand]);

    const { selectedHatchId, selectedHatch, isHatchSelected, isHatchCommand, showHatchTab } = hatchContext;

    // Hatch tab auto-switch disabled - using dialog instead
    // useEffect(() => {
    //     if ((isHatchSelected || isHatchCommand) && activeTab !== 'Hatch') {
    //         setActiveTab('Hatch');
    //     } else if (activeTab === 'Hatch' && !isHatchCommand && !isHatchSelected) {
    //         setActiveTab('Home');
    //     }
    // }, [isHatchSelected, isHatchCommand, activeTab]);

    // Pattern kategorileri için gruplandırma (useMemo hook'u component seviyesinde olmalı)
    const patternsByCategory = useMemo(() => {
        const groups: Record<string, string[]> = {};
        Object.entries(PRESET_PATTERNS).forEach(([key, config]) => {
            if (!groups[config.category]) groups[config.category] = [];
            groups[config.category].push(key);
        });
        return groups;
    }, []);

    const changeProperty = (key: string, value: any) => {
        if (selectedIds.size > 0) {
            selectedIds.forEach(id => updateEntity(id, { [key]: value }));
        } else {
            // Update global active property
            if (key === 'lineType') {
                setActiveLineType(value);
            } else if (key === 'lineWeight' || key === 'lineWidth') { // check naming
                setActiveLineWeight(parseFloat(value));
            }
        }
    };

    const updateHatchState = (key: string, val: any) => {
        if (isHatchSelected && selectedHatchId) {
            const overrides: any = {};
            if (key === 'pattern') {
                const config = PRESET_PATTERNS[val];
                if (config) overrides.pattern = { name: val, type: config.type, angle: config.angle };
            } else {
                overrides[key] = val;
            }
            updateEntity(selectedHatchId, overrides);
        } else if (isHatchCommand) {
            setCommandState(prev => {
                const currentParams = prev.hatchParams || { scale: 1, rotation: 0, pattern: { name: 'ANSI31' } };
                const newParams = { ...currentParams };
                if (key === 'pattern') {
                    const config = PRESET_PATTERNS[val];
                    if (config) newParams.pattern = { name: val, type: config.type, angle: config.angle };
                } else {
                    newParams[key] = val;
                }
                return { ...prev, hatchParams: newParams };
            });
        }
    };

    const handleNewFile = () => {
        // Yeni sekme olarak ekle (mevcut sekmeyi değiştirme)
        addSheet();
    };

    const handleCloseFile = () => {
        if (entities.length === 0) {
            return; // Zaten boş, kapatılacak bir şey yok
        }
        if (isModified) {
            const choice = window.confirm('Kaydedilmemiş değişiklikler var. Dosyayı kapatmak istediğinize emin misiniz?\n\nKaydetmek için "İptal"e basın ve önce kaydedin.');
            if (!choice) {
                return;
            }
        } else {
            if (!window.confirm('Dosyayı kapatmak istediğinize emin misiniz?')) {
                return;
            }
        }
        newFile();
    };

    const handleLayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLayerId = e.target.value;
        if (selectedIds.size > 0) {
            selectedIds.forEach(id => updateEntity(id, { layer: newLayerId }));
        } else {
            setActiveLayerId(newLayerId);
        }
    };

    // Determine which layer ID to show in the dropdown
    const currentLayerId = useMemo(() => {
        if (selectedIds.size > 0) {
            const firstId = Array.from(selectedIds)[0];
            const ent = getEntity(firstId);
            return ent ? ent.layer : activeLayerId;
        }
        return activeLayerId;
    }, [selectedIds, activeLayerId, getEntity]);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop()?.toLowerCase();

        // Check if it's a DWG file
        if (fileExt === 'dwg') {
            setDwgWarning(true);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const result = parseDxf(content);
            if (result.errors.length > 0) {
                alert('DXF okuma hatası: ' + result.errors.join('\n'));
                return;
            }
            // Her zaman yeni sekme olarak aç (mevcut sekmeyi değiştirme)
            addSheet(file.name);
            // addSheet yeni sekmeye geçiyor, sonra loadEntities
            setTimeout(() => {
                loadEntities(result.entities, file.name);
            }, 10);
            // DXF yüklendikten sonra otomatik Zoom Extents
            setTimeout(() => {
                triggerZoomToFit();
            }, 150);
            if (result.warnings.length > 0) {
                console.warn('DXF uyarıları:', result.warnings);
            }
        };
        reader.readAsText(file);

        // Reset input to allow re-selecting same file
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = () => {
        exportDXF(entities, fileName);
    };

    const handleSaveAs = () => {
        const newName = prompt('Dosya adını girin:', fileName);
        if (newName) {
            const finalName = newName.endsWith('.dxf') ? newName : newName + '.dxf';
            exportDXF(entities, finalName);
        }
    };

    // Watch for new hatch entity creation
    useEffect(() => {
        if (waitingForHatch && entities.length > prevEntitiesCount.current) {
            const lastEntity = entities[entities.length - 1];
            // Check if last entity is HATCH
            if (lastEntity.type === 'HATCH') {
                // Use setTimeout to ensure render cycle completes and ID is stable
                setTimeout(() => {
                    // Open dialog in edit mode for this new hatch
                    const hatch = lastEntity as any;
                    setHatchParams({
                        pattern: hatch.pattern?.name || 'ANSI31',
                        color: hatch.color || '#808080',
                        scale: hatch.scale || 1,
                        rotation: hatch.rotation || 0,
                        opacity: hatch.opacity ?? 1
                    });
                    setEditingHatchId(lastEntity.id);
                    setHatchEditMode(true);
                    setHatchDialogOpen(true);
                    setWaitingForHatch(false); // Reset waiting flag
                }, 100);
            }
        }
        prevEntitiesCount.current = entities.length;
    }, [entities, waitingForHatch]);

    // HATCH dialog apply handler
    const handleHatchApply = (params: HatchParams) => {
        setHatchParams(params);
        setHatchDialogOpen(false);
        setHatchEditMode(false);
        setEditingHatchId(null);
        setWaitingForHatch(true); // Start waiting for hatch creation

        // Set hatch parameters in command state and start HATCH command
        const patternConfig = PRESET_PATTERNS[params.pattern];
        setCommandState({
            hatchParams: {
                pattern: {
                    name: params.pattern,
                    type: patternConfig?.type || 'lines',
                    angle: patternConfig?.angle || 45
                },
                color: params.color,
                scale: params.scale,
                rotation: params.rotation,
                opacity: params.opacity
            }
        });
        startCommand('HATCH');
    };

    // Handle updating an existing hatch entity (Live Update)
    const handleHatchLiveUpdate = (entityId: number, params: HatchParams) => {
        const patternConfig = PRESET_PATTERNS[params.pattern];
        updateEntityTransient(entityId, {
            pattern: {
                name: params.pattern,
                type: patternConfig?.type || 'lines',
                angle: patternConfig?.angle || 45
            },
            color: params.color,
            scale: params.scale,
            rotation: params.rotation,
            opacity: params.opacity
        });
    };

    // Handle updating an existing hatch entity (Final / Close)
    const handleHatchUpdate = (_entityId: number, _params: HatchParams) => {
        setHatchDialogOpen(false);
        setHatchEditMode(false);
        setEditingHatchId(null);
    };

    // Open HATCH dialog instead of directly starting command
    const openHatchDialog = () => {
        setHatchEditMode(false);
        setEditingHatchId(null);
        setHatchDialogOpen(true);
    };

    // Open HATCH dialog in edit mode for selected hatch (can be used with double-click or context menu)
    // const openHatchEditDialog = () => {
    //     if (isHatchSelected && selectedHatchId) {
    //         const hatch = selectedHatch as any;
    //         setHatchParams({
    //             pattern: hatch.pattern?.name || 'ANSI31',
    //             color: hatch.color || '#808080',
    //             scale: hatch.scale || 1,
    //             rotation: hatch.rotation || 0,
    //             opacity: hatch.opacity ?? 1
    //         });
    //         setEditingHatchId(selectedHatchId);
    //         setHatchEditMode(true);
    //         setHatchDialogOpen(true);
    //     }
    // };

    const renderTabContent = () => {
        if (activeTab === 'File') {
            return (
                <div className="ribbon-group">
                    <div className="ribbon-panel">
                        <div className="tool-grid">
                            <button className="tool-btn" onClick={handleNewFile}><FaFile /> <span>New</span></button>
                            <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><FaFolderOpen /> <span>Open</span></button>
                            <button className="tool-btn" onClick={handleCloseFile} title="Close file"><span className="material-icons" style={{ fontSize: '16px' }}>close</span> <span>Close</span></button>
                            <button className="tool-btn" onClick={handleSave}><FaSave /> <span>Save</span></button>
                            <button className="tool-btn" onClick={handleSaveAs}><FaFileExport /> <span>Save As</span></button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".dxf,.dwg"
                            onChange={handleFileImport}
                        />
                        <div className="panel-label">File Operations</div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="tool-col" style={{ padding: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#ccc' }}>
                                <strong>File:</strong> {fileName}
                            </div>
                            <div style={{ fontSize: '11px', color: isModified ? '#ffcc00' : '#4caf50' }}>
                                <strong>Status:</strong> {isModified ? 'Modified' : 'Saved'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#ccc' }}>
                                <strong>Entities:</strong> {entities.length}
                            </div>
                        </div>
                        <div className="panel-label">File Info</div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="tool-col" style={{ padding: '8px', fontSize: '10px', color: '#aaa' }}>
                            <div>✓ DXF (AutoCAD)</div>
                            <div style={{ color: '#ff9800' }}>⚠ DWG (Convert to DXF)</div>
                        </div>
                        <div className="panel-label">Formats</div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'Hatch' && showHatchTab) {
            const currentPattern = isHatchSelected
                ? (selectedHatch as any).pattern?.name || 'ANSI31'
                : commandState.hatchParams?.pattern?.name || 'ANSI31';

            const currentColor = isHatchSelected
                ? (selectedHatch as any).color || PRESET_PATTERNS[currentPattern]?.color || '#808080'
                : commandState.hatchParams?.color || PRESET_PATTERNS[currentPattern]?.color || '#808080';

            const currentScale = isHatchSelected
                ? (selectedHatch as any).scale || 1
                : commandState.hatchParams?.scale || 1;

            const currentRotation = isHatchSelected
                ? (selectedHatch as any).rotation || 0
                : commandState.hatchParams?.rotation || 0;

            const currentOpacity = isHatchSelected
                ? ((selectedHatch as any).opacity ?? 1) * 100
                : (commandState.hatchParams?.opacity ?? 1) * 100;

            return (
                <div className="ribbon-group hatch-editor-group">
                    {/* Pattern Galerisi */}
                    <div className="ribbon-panel hatch-pattern-panel">
                        <div className="panel-label">Pattern Selection</div>
                        <div className="hatch-categories">
                            {Object.entries(PATTERN_CATEGORIES).map(([catKey, catInfo]) => (
                                <div key={catKey} className="hatch-category">
                                    <div className="category-header">
                                        <span className="category-icon">{catInfo.icon}</span>
                                        <span className="category-name">{catInfo.name}</span>
                                    </div>
                                    <div className="pattern-grid">
                                        {patternsByCategory[catKey]?.map(patternKey => {
                                            const pattern = PRESET_PATTERNS[patternKey];
                                            const isSelected = currentPattern === patternKey;
                                            const preview = getPatternPreview(patternKey, 32);
                                            return (
                                                <button
                                                    key={patternKey}
                                                    className={`pattern-btn ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => updateHatchState('pattern', patternKey)}
                                                    title={pattern.name}
                                                >
                                                    <img
                                                        src={preview}
                                                        alt={pattern.name}
                                                        className="pattern-preview"
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Renk ve Opaklık */}
                    <div className="ribbon-panel hatch-color-panel">
                        <div className="panel-label">Color & Opacity</div>
                        <div className="hatch-color-controls">
                            <div className="color-picker-row">
                                <label>Color:</label>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => updateHatchState('color', e.target.value)}
                                    className="hatch-color-input"
                                />
                                <span className="color-hex">{currentColor}</span>
                            </div>
                            <div className="opacity-row">
                                <label>Opacity:</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentOpacity}
                                    onChange={(e) => updateHatchState('opacity', parseInt(e.target.value) / 100)}
                                    className="hatch-opacity-slider"
                                    title={`Opacity: %${Math.round(currentOpacity)}`}
                                />
                                <span className="opacity-value">%{Math.round(currentOpacity)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ölçek ve Açı */}
                    <div className="ribbon-panel hatch-transform-panel">
                        <div className="panel-label">Transform</div>
                        <div className="hatch-transform-controls">
                            <div className="transform-row">
                                <label>Scale:</label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5"
                                    step="0.1"
                                    value={currentScale}
                                    onChange={(e) => updateHatchState('scale', parseFloat(e.target.value))}
                                    className="hatch-scale-slider"
                                />
                                <input
                                    type="number"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={currentScale}
                                    onChange={(e) => updateHatchState('scale', parseFloat(e.target.value))}
                                    className="hatch-scale-input"
                                />
                            </div>
                            <div className="transform-row">
                                <label>Angle:</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    step="15"
                                    value={currentRotation}
                                    onChange={(e) => updateHatchState('rotation', parseFloat(e.target.value))}
                                    className="hatch-angle-slider"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="360"
                                    step="15"
                                    value={currentRotation}
                                    onChange={(e) => updateHatchState('rotation', parseFloat(e.target.value))}
                                    className="hatch-angle-input"
                                />
                                <span className="angle-unit">°</span>
                            </div>
                        </div>
                    </div>

                    {/* Seçili Pattern Bilgisi */}
                    <div className="ribbon-panel hatch-info-panel">
                        <div className="panel-label">Selected Pattern</div>
                        <div className="hatch-info">
                            <div className="selected-pattern-preview">
                                <img
                                    src={getPatternPreview(currentPattern, 48)}
                                    alt={PRESET_PATTERNS[currentPattern]?.name}
                                    style={{
                                        width: 48,
                                        height: 48,
                                        border: '1px solid #ccc',
                                        borderRadius: '2px'
                                    }}
                                />
                            </div>
                            <div className="selected-pattern-details">
                                <div className="pattern-name-display">
                                    {PRESET_PATTERNS[currentPattern]?.name || currentPattern}
                                </div>
                                <div className="pattern-type-display">
                                    Type: {PRESET_PATTERNS[currentPattern]?.type}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'Home':
                return (
                    <div className="ribbon-group">
                        {/* Draw Panel */}
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'LINE' ? 'active' : ''}`} onClick={() => startCommand('LINE')}>
                                    <TbLine /> <span>Line</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYLINE' ? 'active' : ''}`} onClick={() => startCommand('POLYLINE')}>
                                    <MdPolyline /> <span>Polyline</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'CIRCLE' ? 'active' : ''}`} onClick={() => startCommand('CIRCLE')}>
                                    <FaRegCircle /> <span>Circle</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ARC' ? 'active' : ''}`} onClick={() => startCommand('ARC')}>
                                    <FaBezierCurve /> <span>Arc</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'RECTANGLE' ? 'active' : ''}`} onClick={() => startCommand('RECTANGLE')}>
                                    <FaRegSquare /> <span>Rect</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'HATCH' ? 'active' : ''}`} onClick={openHatchDialog}>
                                    <FaFillDrip /> <span>Hatch</span>
                                </button>
                                {/* New Draw Tools */}
                                <button className={`tool-btn ${activeCommand === 'ELLIPSE' ? 'active' : ''}`} onClick={() => startCommand('ELLIPSE')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>hdr_weak</span> <span>Ellipse</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYGON' ? 'active' : ''}`} onClick={() => startCommand('POLYGON')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>pentagon</span> <span>Polygon</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SPLINE' ? 'active' : ''}`} onClick={() => startCommand('SPLINE')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>gesture</span> <span>Spline</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POINT' ? 'active' : ''}`} onClick={() => startCommand('POINT')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>gps_fixed</span> <span>Point</span>
                                </button>
                            </div>
                            <div className="panel-label">Draw <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
                        </div>

                        {/* Modify Panel */}
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'MOVE' ? 'active' : ''}`} onClick={() => startCommand('MOVE')}>
                                    <FaArrowsAlt /> <span>Taşı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'COPY' ? 'active' : ''}`} onClick={() => startCommand('COPY')}>
                                    <FaCopy /> <span>Copy</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ROTATE' ? 'active' : ''}`} onClick={() => startCommand('ROTATE')}>
                                    <FaRedo /> <span>Rotate</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MIRROR' ? 'active' : ''}`} onClick={() => startCommand('MIRROR')}>
                                    <FaExchangeAlt /> <span>Mirror</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SCALE' ? 'active' : ''}`} onClick={() => startCommand('SCALE')}>
                                    <FaExpand /> <span>Scale</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TRIM' ? 'active' : ''}`} onClick={() => startCommand('TRIM')}>
                                    <FaCut /> <span>Trim</span>
                                </button>
                                {/* New Modify Tools */}
                                <button className={`tool-btn ${activeCommand === 'OFFSET' ? 'active' : ''}`} onClick={() => startCommand('OFFSET')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>content_copy</span> <span>Offset</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'FILLET' ? 'active' : ''}`} onClick={() => startCommand('FILLET')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>rounded_corner</span> <span>Fillet</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'EXTEND' ? 'active' : ''}`} onClick={() => startCommand('EXTEND')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>last_page</span> <span>Extend</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ARRAY' ? 'active' : ''}`} onClick={() => startCommand('ARRAY')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>grid_view</span> <span>Array</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ERASE' ? 'active' : ''}`} onClick={() => startCommand('ERASE')}>
                                    <FaEraser /> <span>Erase</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'EXPLODE' ? 'active' : ''}`} onClick={() => startCommand('EXPLODE')}>
                                    <FaObjectUngroup /> <span>Explode</span>
                                </button>
                            </div>
                            <div className="panel-label">Modify <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
                        </div>

                        {/* Annotation Panel */}
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'TEXT' ? 'active' : ''}`} onClick={() => startCommand('TEXT')}>
                                    <FaFont /> <span>Text</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MTEXT' ? 'active' : ''}`} onClick={() => startCommand('MTEXT')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>text_fields</span> <span>MText</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMLINEAR' ? 'active' : ''}`} onClick={() => startCommand('DIMLINEAR')}>
                                    <TbLine /> <span>Linear</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMALIGNED' ? 'active' : ''}`} onClick={() => startCommand('DIMALIGNED')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>straighten</span> <span>Aligned</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMANGULAR' ? 'active' : ''}`} onClick={() => startCommand('DIMANGULAR')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>architecture</span> <span>Angle</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMRADIUS' ? 'active' : ''}`} onClick={() => startCommand('DIMRADIUS')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>radio_button_checked</span> <span>Radius</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TABLE' ? 'active' : ''}`} onClick={() => startCommand('TABLE')}>
                                    <FaTable /> <span>Table</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'LEADER' ? 'active' : ''}`} onClick={() => startCommand('LEADER')}>
                                    <FaProjectDiagram /> <span>Leader</span>
                                </button>
                            </div>
                            <div className="panel-label">Annotation <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
                        </div>

                        {/* Layers Panel (AutoCAD Style) */}
                        <div className="ribbon-panel layers-panel">
                            <div style={{ display: 'flex', gap: '8px', padding: '2px' }}>
                                <button
                                    className="tool-btn large-btn"
                                    onClick={() => setLayerDialogState({ isOpen: true })}
                                    style={{ height: 'auto', minWidth: '60px' }}
                                >
                                    <span className="material-icons" style={{ fontSize: '32px' }}>layers</span>
                                    <span>LAYERS</span>
                                </button>
                                <div className="tool-col" style={{ justifyContent: 'center', gap: '4px', minWidth: '160px' }}>
                                    <div className="layer-selector-container">
                                        <div className="layer-color-indicator" style={{ backgroundColor: layers.find(l => l.id === currentLayerId)?.color || '#fff' }}></div>
                                        <select
                                            value={currentLayerId}
                                            onChange={handleLayerChange}
                                            className="ribbon-select"
                                        >
                                            {layers.map(layer => (
                                                <option key={layer.id} value={layer.id}>
                                                    {layer.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', paddingLeft: '4px' }}>
                                        <button className="mini-icon-btn" title="On/Off"><span className="material-icons">lightbulb</span></button>
                                        <button className="mini-icon-btn" title="Freeze"><span className="material-icons">ac_unit</span></button>
                                        <button className="mini-icon-btn" title="Lock"><span className="material-icons">lock_open</span></button>
                                    </div>
                                </div>
                            </div>
                            <div className="panel-label">LAYERS</div>
                        </div>

                        {/* Properties Panel (AutoCAD Style) */}
                        <div className="ribbon-panel properties-panel">
                            <div className="tool-col" style={{ gap: '3px', padding: '2px', minWidth: '180px' }}>
                                {/* Color Property */}
                                <div className="property-selector">
                                    <div className="property-trigger">
                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: selectedIds.size > 0 ? (getEntity(Array.from(selectedIds)[0])?.color || '#fff') : '#4cc2ff',
                                                border: '1px solid rgba(255,255,255,0.2)'
                                            }}></div>
                                            <span className="property-val-label">COLOR</span>
                                        </div>
                                        <input
                                            type="color"
                                            onChange={(e) => changeProperty('color', e.target.value)}
                                            style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                                        />
                                        <span className="material-icons" style={{ fontSize: '14px' }}>arrow_drop_down</span>
                                    </div>
                                </div>

                                {/* Line Type Property */}
                                <LineTypeSelector
                                    value={selectedIds.size > 0 ? (getEntity(Array.from(selectedIds)[0])?.lineType || 'continuous') : activeLineType}
                                    onChange={(val) => changeProperty('lineType', val)}
                                />

                                {/* Line Weight Property */}
                                <LineWeightSelector
                                    value={selectedIds.size > 0 ? (getEntity(Array.from(selectedIds)[0])?.lineWeight ?? 0) : activeLineWeight}
                                    onChange={(val) => changeProperty('lineWeight', val)}
                                />
                            </div>
                            <div className="panel-label">PROPERTIES</div>
                        </div>
                    </div>
                );
            case 'Insert':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><FaFolderOpen /> <span>DXF</span></button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".dxf"
                                onChange={handleFileImport}
                            />
                            <div className="panel-label">Import</div>
                        </div>
                    </div>
                );
            case 'View':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomIn()}
                                    title="Zoom In (+)"
                                >
                                    <span className="material-icons">zoom_in</span>
                                    <span>In</span>
                                </button>
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomOut()}
                                    title="Zoom Out (-)"
                                >
                                    <span className="material-icons">zoom_out</span>
                                    <span>Out</span>
                                </button>
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomToFit()}
                                    title="Zoom Extents (AutoCAD: ZOOM E)"
                                >
                                    <span className="material-icons">zoom_out_map</span>
                                    <span>Extents</span>
                                </button>
                                <button
                                    className={`tool-btn ${zoomWindowMode ? 'active' : ''}`}
                                    onClick={() => startZoomWindow()}
                                    title="Zoom Window (AutoCAD: ZOOM W)"
                                    style={zoomWindowMode ? { backgroundColor: '#4cc2ff', color: '#000' } : {}}
                                >
                                    <span className="material-icons">crop_free</span>
                                    <span>Window</span>
                                </button>
                            </div>
                            <div className="panel-label">Zoom</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact">
                                <div className="prop-row">
                                    <span>Scale</span>
                                    <select
                                        value={drawingScale}
                                        onChange={(e) => setDrawingScale(e.target.value)}
                                        style={{ width: '80px' }}
                                    >
                                        <option value="10:1">10:1</option>
                                        <option value="5:1">5:1</option>
                                        <option value="2:1">2:1</option>
                                        <option value="1:1">1:1</option>
                                        <option value="1:2">1:2</option>
                                        <option value="1:5">1:5</option>
                                        <option value="1:10">1:10</option>
                                        <option value="1:20">1:20</option>
                                        <option value="1:50">1:50</option>
                                        <option value="1:100">1:100</option>
                                        <option value="1:200">1:200</option>
                                        <option value="1:500">1:500</option>
                                    </select>
                                </div>
                            </div>
                            <div className="panel-label">Scale</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact">
                                <div className="prop-row">
                                    <span>Project</span>
                                    <select
                                        value={baseUnit}
                                        onChange={(e) => setBaseUnit(e.target.value as any)}
                                        style={{ width: '70px' }}
                                        title="Base unit - drawing values stored in this unit"
                                    >
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="m">m</option>
                                        <option value="inch">inch</option>
                                        <option value="feet">feet</option>
                                    </select>
                                </div>
                                <div className="prop-row">
                                    <span>Display</span>
                                    <select
                                        value={drawingUnit}
                                        onChange={(e) => setDrawingUnit(e.target.value as any)}
                                        style={{ width: '70px' }}
                                        title="Display unit - values shown in this unit"
                                    >
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="m">m</option>
                                        <option value="inch">inch</option>
                                        <option value="feet">feet</option>
                                    </select>
                                </div>
                            </div>
                            <div className="panel-label">Units</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact" style={{ fontSize: '11px', color: '#aaa', padding: '8px' }}>
                                <div>Scale: <strong style={{ color: '#4cc2ff' }}>{drawingScale}</strong></div>
                                <div>Project: <strong style={{ color: '#ffcc00' }}>{baseUnit}</strong></div>
                                <div>Display: <strong style={{ color: '#4cc2ff' }}>{drawingUnit}</strong></div>
                            </div>
                            <div className="panel-label">Info</div>
                        </div>
                    </div>
                );

            case 'Annotate':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'MTEXT' ? 'active' : ''}`} onClick={() => startCommand('MTEXT')}>
                                    <span className="material-icons">text_fields</span> <span>Multiline Text</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TEXT' ? 'active' : ''}`} onClick={() => startCommand('TEXT')}>
                                    <FaFont /> <span>Single Text</span>
                                </button>
                            </div>
                            <div className="panel-label">Text</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'DIMLINEAR' ? 'active' : ''}`} onClick={() => startCommand('DIMLINEAR')}>
                                    <TbLine /> <span>Linear</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMALIGNED' ? 'active' : ''}`} onClick={() => startCommand('DIMALIGNED')}>
                                    <span className="material-icons">straighten</span> <span>Aligned</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMANGULAR' ? 'active' : ''}`} onClick={() => startCommand('DIMANGULAR')}>
                                    <span className="material-icons">architecture</span> <span>Angular</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMRADIUS' ? 'active' : ''}`} onClick={() => startCommand('DIMRADIUS')}>
                                    <span className="material-icons">radio_button_checked</span> <span>Radius</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMDIAMETER' ? 'active' : ''}`} onClick={() => startCommand('DIMDIAMETER')}>
                                    <span className="material-icons">data_usage</span> <span>Diameter</span>
                                </button>
                            </div>
                            <div className="panel-label">Dimensions</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'LEADER' ? 'active' : ''}`} onClick={() => startCommand('LEADER')}>
                                    <FaProjectDiagram /> <span>Leader</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TABLE' ? 'active' : ''}`} onClick={() => startCommand('TABLE')}>
                                    <FaTable /> <span>Table</span>
                                </button>
                            </div>
                            <div className="panel-label">Leaders & Tables</div>
                        </div>
                    </div>
                );

            case 'Parametric':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_COINCIDENT')}>
                                    <span className="material-icons">all_out</span> <span>Coincident</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_PARALLEL')}>
                                    <span className="material-icons">view_stream</span> <span>Parallel</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_TANGENT')}>
                                    <span className="material-icons">radio_button_unchecked</span> <span>Tangent</span>
                                </button>
                            </div>
                            <div className="panel-label">Geometric</div>
                        </div>
                    </div>
                );

            case 'Manage':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={() => startCommand('PURGE')}>
                                    <span className="material-icons">delete_sweep</span> <span>Purge</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('AUDIT')}>
                                    <span className="material-icons">verified_user</span> <span>Audit</span>
                                </button>
                            </div>
                            <div className="panel-label">Maintenance</div>
                        </div>
                    </div>
                );

            case 'Export':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={handleSave}><FaSave /> <span>Save DXF</span></button>
                                <button className="tool-btn" onClick={handleSaveAs}><FaFileExport /> <span>Save As...</span></button>
                            </div>
                            <div className="panel-label">Export</div>
                        </div>
                    </div>
                );

            default:
                return <div style={{ padding: '20px', color: '#888' }}>This tab is under construction.</div>;
        }
    };

    // Static tabs - Hatch tab removed, using dialog instead
    const baseTabs = useMemo(() => ['Home', 'Annotate', 'Insert', 'Parametric', 'View', 'Manage', 'Export'], []);
    const tabs = baseTabs; // Hatch dialog kullanılıyor, tab artık gerekli değil

    return (
        <div className="ribbon-container">
            {/* DWG Warning Modal */}
            {dwgWarning && (
                <div className="modal-overlay" onClick={() => setDwgWarning(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <FaExclamationTriangle style={{ color: '#ff9800', marginRight: '10px' }} />
                            DWG → DXF Conversion Required
                        </div>
                        <div className="modal-body">
                            <p>DWG files cannot be opened directly in the browser. Please convert to DXF first.</p>

                            <div className="convert-options">
                                <p><strong>Quick Conversion:</strong></p>
                                <div className="convert-buttons">
                                    <a
                                        href="https://cloudconvert.com/dwg-to-dxf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="convert-btn"
                                    >
                                        CloudConvert
                                    </a>
                                    <a
                                        href="https://convertio.co/dwg-dxf/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="convert-btn"
                                    >
                                        Convertio
                                    </a>
                                    <a
                                        href="https://anyconv.com/dwg-to-dxf-converter/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="convert-btn"
                                    >
                                        AnyConv
                                    </a>
                                </div>
                            </div>

                            <p style={{ fontSize: '11px', color: '#888', marginTop: '12px' }}>
                                After conversion, you can open the DXF file in this app.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setDwgWarning(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}


            <div className="ribbon-tabs">
                {tabs.map(tab => (
                    <div
                        key={tab}
                        className={`ribbon-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </div>
                ))}
            </div>
            <div className="ribbon-content">
                {renderTabContent()}
            </div>

            {/* Hatch Dialog */}
            <HatchDialog
                isOpen={hatchDialogOpen}
                onClose={() => {
                    setHatchDialogOpen(false);
                    setHatchEditMode(false);
                    setEditingHatchId(null);
                }}
                onApply={handleHatchApply}
                onUpdate={handleHatchUpdate}
                onLiveUpdate={handleHatchLiveUpdate}
                initialParams={hatchParams}
                editMode={hatchEditMode}
                entityId={editingHatchId ?? undefined}
            />
        </div>
    );
};

export default Ribbon;
