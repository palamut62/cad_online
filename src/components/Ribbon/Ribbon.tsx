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

// Helper Component for Visual Line Type Selection
// Helper Component for Visual Line Type Selection
const LineTypeSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options = [
        { value: 'continuous', label: 'Sürekli', pattern: 'solid' },
        { value: 'dashed', label: 'Kesik', pattern: 'dashed' },
        { value: 'dotted', label: 'Noktalı', pattern: 'dotted' },
        { value: 'dashdot', label: 'Kesik-Nokta', pattern: 'dashed' },
        { value: 'center', label: 'Merkez', pattern: 'dashed' },
        { value: 'hidden', label: 'Gizli', pattern: 'dashed' },
        { value: 'phantom', label: 'Hayalet', pattern: 'dashed' },
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
    const {
        startCommand, selectedIds, updateEntity, activeCommand, setCommandState, commandState, getEntity,
        entities, fileName, isModified, newFile, loadEntities, addSheet,
        baseUnit, setBaseUnit, drawingUnit, setDrawingUnit, drawingScale, setDrawingScale,
        triggerZoomToFit, triggerZoomIn, triggerZoomOut, startZoomWindow, zoomWindowMode,
        // Layers
        layers, activeLayerId, setActiveLayerId, setLayerDialogState,
        // Global Properties
        activeLineType, setActiveLineType, activeLineWeight, setActiveLineWeight
    } = useDrawing();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hatch Context
    const selectedHatchId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
    const selectedHatch = selectedHatchId ? getEntity(selectedHatchId) : null;
    const isHatchSelected = selectedHatch?.type === 'HATCH';
    const isHatchCommand = activeCommand === 'HATCH';
    const showHatchTab = isHatchSelected || isHatchCommand;

    // Auto-switch to Hatch Editor tab when a hatch is selected OR hatch command is active
    useEffect(() => {
        if (isHatchSelected || (isHatchCommand && !isHatchSelected)) {
            setActiveTab('Hatch Editor');
        } else if (activeTab === 'Hatch Editor' && !isHatchCommand && !isHatchSelected) {
            // If we deselected hatch and not in hatch command, go back to Home
            setActiveTab('Home');
        }
    }, [isHatchSelected, isHatchCommand]);

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

    const renderTabContent = () => {
        if (activeTab === 'File') {
            return (
                <div className="ribbon-group">
                    <div className="ribbon-panel">
                        <div className="tool-grid">
                            <button className="tool-btn" onClick={handleNewFile}><FaFile /> <span>Yeni</span></button>
                            <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><FaFolderOpen /> <span>Aç</span></button>
                            <button className="tool-btn" onClick={handleCloseFile} title="Dosyayı kapat"><span className="material-icons" style={{ fontSize: '16px' }}>close</span> <span>Kapat</span></button>
                            <button className="tool-btn" onClick={handleSave}><FaSave /> <span>Kaydet</span></button>
                            <button className="tool-btn" onClick={handleSaveAs}><FaFileExport /> <span>Farklı</span></button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".dxf,.dwg"
                            onChange={handleFileImport}
                        />
                        <div className="panel-label">Dosya İşlemleri</div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="tool-col" style={{ padding: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#ccc' }}>
                                <strong>Dosya:</strong> {fileName}
                            </div>
                            <div style={{ fontSize: '11px', color: isModified ? '#ffcc00' : '#4caf50' }}>
                                <strong>Durum:</strong> {isModified ? 'Değişiklik var' : 'Kaydedildi'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#ccc' }}>
                                <strong>Nesne:</strong> {entities.length}
                            </div>
                        </div>
                        <div className="panel-label">Dosya Bilgisi</div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="tool-col" style={{ padding: '8px', fontSize: '10px', color: '#aaa' }}>
                            <div>✓ DXF (AutoCAD)</div>
                            <div style={{ color: '#ff9800' }}>⚠ DWG (DXF'e dönüştür)</div>
                        </div>
                        <div className="panel-label">Formatlar</div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'Hatch Editor' && showHatchTab) {
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
                        <div className="panel-label">Doku Seçimi</div>
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
                                            const preview = getPatternPreview(patternKey, 28);
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
                        <div className="panel-label">Renk & Opaklık</div>
                        <div className="hatch-color-controls">
                            <div className="color-picker-row">
                                <label>Renk:</label>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => updateHatchState('color', e.target.value)}
                                    className="hatch-color-input"
                                />
                                <span className="color-hex">{currentColor}</span>
                            </div>
                            <div className="opacity-row">
                                <label>Opaklık:</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentOpacity}
                                    onChange={(e) => updateHatchState('opacity', parseInt(e.target.value) / 100)}
                                    className="hatch-opacity-slider"
                                />
                                <span className="opacity-value">{Math.round(currentOpacity)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Ölçek ve Açı */}
                    <div className="ribbon-panel hatch-transform-panel">
                        <div className="panel-label">Dönüşüm</div>
                        <div className="hatch-transform-controls">
                            <div className="transform-row">
                                <label>Ölçek:</label>
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
                                <label>Açı:</label>
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
                        <div className="panel-label">Seçili Doku</div>
                        <div className="hatch-info">
                            <div className="selected-pattern-preview">
                                <img
                                    src={getPatternPreview(currentPattern, 48)}
                                    alt={PRESET_PATTERNS[currentPattern]?.name}
                                    style={{
                                        width: 48,
                                        height: 48,
                                        border: '2px solid #4cc2ff',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <div className="selected-pattern-details">
                                <div className="pattern-name-display">
                                    {PRESET_PATTERNS[currentPattern]?.name || currentPattern}
                                </div>
                                <div className="pattern-type-display">
                                    Tip: {PRESET_PATTERNS[currentPattern]?.type}
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
                                    <TbLine /> <span>Çizgi</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYLINE' ? 'active' : ''}`} onClick={() => startCommand('POLYLINE')}>
                                    <MdPolyline /> <span>PÇizgi</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'CIRCLE' ? 'active' : ''}`} onClick={() => startCommand('CIRCLE')}>
                                    <FaRegCircle /> <span>Daire</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ARC' ? 'active' : ''}`} onClick={() => startCommand('ARC')}>
                                    <FaBezierCurve /> <span>Yay</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'RECTANGLE' ? 'active' : ''}`} onClick={() => startCommand('RECTANGLE')}>
                                    <FaRegSquare /> <span>Dikd.</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'HATCH' ? 'active' : ''}`} onClick={() => startCommand('HATCH')}>
                                    <FaFillDrip /> <span>Tarama</span>
                                </button>
                                {/* New Draw Tools */}
                                <button className={`tool-btn ${activeCommand === 'ELLIPSE' ? 'active' : ''}`} onClick={() => startCommand('ELLIPSE')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>hdr_weak</span> <span>Elips</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYGON' ? 'active' : ''}`} onClick={() => startCommand('POLYGON')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>pentagon</span> <span>Çokgen</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SPLINE' ? 'active' : ''}`} onClick={() => startCommand('SPLINE')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>gesture</span> <span>Spline</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POINT' ? 'active' : ''}`} onClick={() => startCommand('POINT')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>gps_fixed</span> <span>Nokta</span>
                                </button>
                            </div>
                            <div className="panel-label">Çizim <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
                        </div>

                        {/* Modify Panel */}
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'MOVE' ? 'active' : ''}`} onClick={() => startCommand('MOVE')}>
                                    <FaArrowsAlt /> <span>Taşı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'COPY' ? 'active' : ''}`} onClick={() => startCommand('COPY')}>
                                    <FaCopy /> <span>Kopyala</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ROTATE' ? 'active' : ''}`} onClick={() => startCommand('ROTATE')}>
                                    <FaRedo /> <span>Döndür</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MIRROR' ? 'active' : ''}`} onClick={() => startCommand('MIRROR')}>
                                    <FaExchangeAlt /> <span>Aynala</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SCALE' ? 'active' : ''}`} onClick={() => startCommand('SCALE')}>
                                    <FaExpand /> <span>Ölçek</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TRIM' ? 'active' : ''}`} onClick={() => startCommand('TRIM')}>
                                    <FaCut /> <span>Kırp</span>
                                </button>
                                {/* New Modify Tools */}
                                <button className={`tool-btn ${activeCommand === 'OFFSET' ? 'active' : ''}`} onClick={() => startCommand('OFFSET')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>content_copy</span> <span>Ötele</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'FILLET' ? 'active' : ''}`} onClick={() => startCommand('FILLET')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>rounded_corner</span> <span>Pah</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'EXTEND' ? 'active' : ''}`} onClick={() => startCommand('EXTEND')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>last_page</span> <span>Uzat</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ARRAY' ? 'active' : ''}`} onClick={() => startCommand('ARRAY')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>grid_view</span> <span>Dizi</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ERASE' ? 'active' : ''}`} onClick={() => startCommand('ERASE')}>
                                    <FaEraser /> <span>Sil</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'EXPLODE' ? 'active' : ''}`} onClick={() => startCommand('EXPLODE')}>
                                    <FaObjectUngroup /> <span>Patlat</span>
                                </button>
                            </div>
                            <div className="panel-label">Düzenle <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
                        </div>

                        {/* Annotation Panel */}
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'TEXT' ? 'active' : ''}`} onClick={() => startCommand('TEXT')}>
                                    <FaFont /> <span>Metin</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MTEXT' ? 'active' : ''}`} onClick={() => startCommand('MTEXT')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>text_fields</span> <span>Çoklu</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMLINEAR' ? 'active' : ''}`} onClick={() => startCommand('DIMLINEAR')}>
                                    <TbLine /> <span>Doğrus..</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMALIGNED' ? 'active' : ''}`} onClick={() => startCommand('DIMALIGNED')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>straighten</span> <span>Hizalı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMANGULAR' ? 'active' : ''}`} onClick={() => startCommand('DIMANGULAR')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>architecture</span> <span>Açı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMRADIUS' ? 'active' : ''}`} onClick={() => startCommand('DIMRADIUS')}>
                                    <span className="material-icons" style={{ fontSize: '16px' }}>radio_button_checked</span> <span>Yarıçap</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TABLE' ? 'active' : ''}`} onClick={() => startCommand('TABLE')}>
                                    <FaTable /> <span>Tablo</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'LEADER' ? 'active' : ''}`} onClick={() => startCommand('LEADER')}>
                                    <FaProjectDiagram /> <span>Ok</span>
                                </button>
                            </div>
                            <div className="panel-label">Açıklama <span className="material-icons" style={{ fontSize: '10px' }}>arrow_drop_down</span></div>
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
                                    <span>KATMANLAR</span>
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
                                        <button className="mini-icon-btn" title="Kapat/Aç"><span className="material-icons">lightbulb</span></button>
                                        <button className="mini-icon-btn" title="Dondur"><span className="material-icons">ac_unit</span></button>
                                        <button className="mini-icon-btn" title="Kilitle"><span className="material-icons">lock_open</span></button>
                                    </div>
                                </div>
                            </div>
                            <div className="panel-label">KATMANLAR</div>
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
                                            <span className="property-val-label">RENK</span>
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
                            <div className="panel-label">ÖZELLİKLER</div>
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
                                    title="Yakınlaştır (+)"
                                >
                                    <span className="material-icons">zoom_in</span>
                                    <span>Yakın</span>
                                </button>
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomOut()}
                                    title="Uzaklaştır (-)"
                                >
                                    <span className="material-icons">zoom_out</span>
                                    <span>Uzak</span>
                                </button>
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomToFit()}
                                    title="Zoom Extents - Tüm çizimi ekrana sığdır (AutoCAD: ZOOM E)"
                                >
                                    <span className="material-icons">zoom_out_map</span>
                                    <span>Extents</span>
                                </button>
                                <button
                                    className={`tool-btn ${zoomWindowMode ? 'active' : ''}`}
                                    onClick={() => startZoomWindow()}
                                    title="Zoom Window - Pencere ile seçilen alanı yakınlaştır (AutoCAD: ZOOM W)"
                                    style={zoomWindowMode ? { backgroundColor: '#4cc2ff', color: '#000' } : {}}
                                >
                                    <span className="material-icons">crop_free</span>
                                    <span>Window</span>
                                </button>
                            </div>
                            <div className="panel-label">Yakınlaştır</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact">
                                <div className="prop-row">
                                    <span>Ölçek</span>
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
                            <div className="panel-label">Ölçek</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact">
                                <div className="prop-row">
                                    <span>Proje</span>
                                    <select
                                        value={baseUnit}
                                        onChange={(e) => setBaseUnit(e.target.value as any)}
                                        style={{ width: '70px' }}
                                        title="Proje baz birimi - çizim değerleri bu birimde saklanır"
                                    >
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="m">m</option>
                                        <option value="inch">inch</option>
                                        <option value="feet">feet</option>
                                    </select>
                                </div>
                                <div className="prop-row">
                                    <span>Göster</span>
                                    <select
                                        value={drawingUnit}
                                        onChange={(e) => setDrawingUnit(e.target.value as any)}
                                        style={{ width: '70px' }}
                                        title="Görüntüleme birimi - ölçüler bu birimde gösterilir"
                                    >
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="m">m</option>
                                        <option value="inch">inch</option>
                                        <option value="feet">feet</option>
                                    </select>
                                </div>
                            </div>
                            <div className="panel-label">Birimler</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-col compact" style={{ fontSize: '11px', color: '#aaa', padding: '8px' }}>
                                <div>Ölçek: <strong style={{ color: '#4cc2ff' }}>{drawingScale}</strong></div>
                                <div>Proje: <strong style={{ color: '#ffcc00' }}>{baseUnit}</strong></div>
                                <div>Göster: <strong style={{ color: '#4cc2ff' }}>{drawingUnit}</strong></div>
                            </div>
                            <div className="panel-label">Bilgi</div>
                        </div>
                    </div>
                );

            case 'Annotate':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'MTEXT' ? 'active' : ''}`} onClick={() => startCommand('MTEXT')}>
                                    <span className="material-icons">text_fields</span> <span>Çoklu Metin</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TEXT' ? 'active' : ''}`} onClick={() => startCommand('TEXT')}>
                                    <FaFont /> <span>Tek Metin</span>
                                </button>
                            </div>
                            <div className="panel-label">Metin</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'DIMLINEAR' ? 'active' : ''}`} onClick={() => startCommand('DIMLINEAR')}>
                                    <TbLine /> <span>Doğrusal</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMALIGNED' ? 'active' : ''}`} onClick={() => startCommand('DIMALIGNED')}>
                                    <span className="material-icons">straighten</span> <span>Hizalı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMANGULAR' ? 'active' : ''}`} onClick={() => startCommand('DIMANGULAR')}>
                                    <span className="material-icons">architecture</span> <span>Açısal</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMRADIUS' ? 'active' : ''}`} onClick={() => startCommand('DIMRADIUS')}>
                                    <span className="material-icons">radio_button_checked</span> <span>Yarıçap</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMDIAMETER' ? 'active' : ''}`} onClick={() => startCommand('DIMDIAMETER')}>
                                    <span className="material-icons">data_usage</span> <span>Çap</span>
                                </button>
                            </div>
                            <div className="panel-label">Ölçülendirme</div>
                        </div>
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'LEADER' ? 'active' : ''}`} onClick={() => startCommand('LEADER')}>
                                    <FaProjectDiagram /> <span>Lider</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TABLE' ? 'active' : ''}`} onClick={() => startCommand('TABLE')}>
                                    <FaTable /> <span>Tablo</span>
                                </button>
                            </div>
                            <div className="panel-label">Liderler ve Tablolar</div>
                        </div>
                    </div>
                );

            case 'Parametric':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_COINCIDENT')}>
                                    <span className="material-icons">all_out</span> <span>Çakışık</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_PARALLEL')}>
                                    <span className="material-icons">view_stream</span> <span>Paralel</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('GEOMCONSTRAINT_TANGENT')}>
                                    <span className="material-icons">radio_button_unchecked</span> <span>Teğet</span>
                                </button>
                            </div>
                            <div className="panel-label">Geometrik</div>
                        </div>
                    </div>
                );

            case 'Manage':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={() => startCommand('PURGE')}>
                                    <span className="material-icons">delete_sweep</span> <span>Temizle</span>
                                </button>
                                <button className="tool-btn" onClick={() => startCommand('AUDIT')}>
                                    <span className="material-icons">verified_user</span> <span>Denetle</span>
                                </button>
                            </div>
                            <div className="panel-label">Bakım</div>
                        </div>
                    </div>
                );

            case 'Export':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="tool-grid">
                                <button className="tool-btn" onClick={handleSave}><FaSave /> <span>DXF Kaydet</span></button>
                                <button className="tool-btn" onClick={handleSaveAs}><FaFileExport /> <span>Farklı Kaydet</span></button>
                            </div>
                            <div className="panel-label">Dışa Aktar</div>
                        </div>
                    </div>
                );

            default:
                return <div style={{ padding: '20px', color: '#888' }}>Bu sekme yapım aşamasındadır.</div>;
        }
    };

    const tabs = ['Home', 'Annotate', 'Insert', 'Parametric', 'View', 'Manage', 'Export'];
    if (showHatchTab) tabs.push('Hatch Editor');

    return (
        <div className="ribbon-container">
            {/* DWG Warning Modal */}
            {dwgWarning && (
                <div className="modal-overlay" onClick={() => setDwgWarning(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <FaExclamationTriangle style={{ color: '#ff9800', marginRight: '10px' }} />
                            DWG → DXF Dönüştürme Gerekli
                        </div>
                        <div className="modal-body">
                            <p>DWG formatı tarayıcıda doğrudan açılamaz. Önce DXF formatına dönüştürmeniz gerekiyor.</p>

                            <div className="convert-options">
                                <p><strong>Hızlı Dönüştürme:</strong></p>
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
                                Dönüştürdükten sonra DXF dosyasını bu uygulamada açabilirsiniz.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setDwgWarning(false)}>Kapat</button>
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
        </div>
    );
};



export default Ribbon;
