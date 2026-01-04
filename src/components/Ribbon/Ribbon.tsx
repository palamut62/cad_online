import { useState, useRef, useMemo, useEffect } from 'react';
import './Ribbon.css';
import {
    FaRegCircle, FaDrawPolygon, FaFolderOpen, FaSave, FaFile, FaFileExport,
    FaRegSquare, FaBezierCurve, FaCrosshairs, FaArrowsAlt, FaCopy,
    FaRedo, FaExpand, FaExchangeAlt, FaEraser, FaStream, FaExclamationTriangle, FaFillDrip,
    FaFont, FaTable
} from 'react-icons/fa';
import { MdPolyline, MdTimeline } from 'react-icons/md';
import { TbOvalVertical, TbLine } from 'react-icons/tb';
import { useDrawing } from '../../context/DrawingContext';
import { parseDxf } from '../../utils/dxfLoader';
import { exportDXF } from '../../utils/dxfExporter';
import { PRESET_PATTERNS, PATTERN_CATEGORIES, getPatternPreview } from '../../utils/hatchPatterns';

const Ribbon = () => {
    const [activeTab, setActiveTab] = useState<string>('Home');
    const [dwgWarning, setDwgWarning] = useState<boolean>(false);
    const {
        startCommand, selectedIds, updateEntity, activeCommand, setCommandState, commandState, getEntity,
        entities, fileName, isModified, newFile, loadEntities, addSheet,
        baseUnit, setBaseUnit, drawingUnit, setDrawingUnit, drawingScale, setDrawingScale,
        triggerZoomToFit, triggerZoomIn, triggerZoomOut, startZoomWindow, zoomWindowMode
    } = useDrawing();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hatch Context
    const selectedHatchId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
    const selectedHatch = selectedHatchId ? getEntity(selectedHatchId) : null;
    const isHatchSelected = selectedHatch?.type === 'HATCH';
    const isHatchCommand = activeCommand === 'HATCH';
    const showHatchTab = isHatchSelected || isHatchCommand;

    // Auto-switch to Hatch Editor tab when a hatch is selected
    useEffect(() => {
        if (isHatchSelected) {
            setActiveTab('Hatch Editor');
        } else if (activeTab === 'Hatch Editor' && !isHatchCommand) {
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
                        <div className="panel-label">Dosya İşlemleri</div>
                        <div className="tool-row">
                            <button className="tool-btn" onClick={handleNewFile}><FaFile /> <span>Yeni</span></button>
                            <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><FaFolderOpen /> <span>Aç</span></button>
                            <button className="tool-btn" onClick={handleCloseFile} title="Dosyayı kapat"><span className="material-icons" style={{ fontSize: '16px' }}>close</span> <span>Kapat</span></button>
                            <button className="tool-btn" onClick={handleSave}><FaSave /> <span>Kaydet</span></button>
                            <button className="tool-btn" onClick={handleSaveAs}><FaFileExport /> <span>Farklı Kaydet</span></button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".dxf,.dwg"
                                onChange={handleFileImport}
                            />
                        </div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="panel-label">Dosya Bilgisi</div>
                        <div className="tool-col" style={{ padding: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#ccc' }}>
                                <strong>Dosya:</strong> {fileName}
                            </div>
                            <div style={{ fontSize: '12px', color: isModified ? '#ffcc00' : '#4caf50' }}>
                                <strong>Durum:</strong> {isModified ? 'Değişiklik var' : 'Kaydedildi'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#ccc' }}>
                                <strong>Nesne sayısı:</strong> {entities.length}
                            </div>
                        </div>
                    </div>
                    <div className="ribbon-panel">
                        <div className="panel-label">Desteklenen Formatlar</div>
                        <div className="tool-col" style={{ padding: '8px', fontSize: '11px', color: '#aaa' }}>
                            <div>✓ DXF (AutoCAD Drawing Exchange)</div>
                            <div style={{ color: '#ff9800' }}>⚠ DWG (Sadece görüntüleme - DXF'e dönüştürün)</div>
                        </div>
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
                        {/* Çizim Araçları */}
                        <div className="ribbon-panel wide-panel">
                            <div className="panel-label">Çizim</div>
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'LINE' ? 'active' : ''}`} onClick={() => startCommand('LINE')} title="Çizgi">
                                    <TbLine /> <span>Çizgi</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYLINE' ? 'active' : ''}`} onClick={() => startCommand('POLYLINE')} title="Polyline">
                                    <MdPolyline /> <span>PLine</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'RECTANGLE' ? 'active' : ''}`} onClick={() => startCommand('RECTANGLE')} title="Dikdörtgen">
                                    <FaRegSquare /> <span>Dikd.</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'CIRCLE' ? 'active' : ''}`} onClick={() => startCommand('CIRCLE')} title="Daire">
                                    <FaRegCircle /> <span>Daire</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ARC' ? 'active' : ''}`} onClick={() => startCommand('ARC')} title="Yay">
                                    <FaBezierCurve /> <span>Yay</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POLYGON' ? 'active' : ''}`} onClick={() => startCommand('POLYGON')} title="Çokgen">
                                    <FaDrawPolygon /> <span>Çokgen</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ELLIPSE' ? 'active' : ''}`} onClick={() => startCommand('ELLIPSE')} title="Elips">
                                    <TbOvalVertical /> <span>Elips</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SPLINE' ? 'active' : ''}`} onClick={() => startCommand('SPLINE')} title="Spline">
                                    <MdTimeline /> <span>Spline</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'POINT' ? 'active' : ''}`} onClick={() => startCommand('POINT')} title="Nokta">
                                    <FaCrosshairs /> <span>Nokta</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'HATCH' ? 'active' : ''}`} onClick={() => startCommand('HATCH')} title="Tarama">
                                    <FaFillDrip /> <span>Tarama</span>
                                </button>
                            </div>
                        </div>

                        {/* Text Tools (Moved to Home) */}
                        <div className="ribbon-panel">
                            <div className="panel-label">Metin</div>
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'TEXT' ? 'active' : ''}`} onClick={() => startCommand('TEXT')} title="Tek Satır Metin">
                                    <FaFont /> <span>Tek Satır</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MTEXT' ? 'active' : ''}`} onClick={() => startCommand('MTEXT')} title="Çok Satırlı Metin">
                                    <FaFont /> <span>Çok Satır</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'TABLE' ? 'active' : ''}`} onClick={() => startCommand('TABLE')} title="Tablo Oluştur">
                                    <FaTable /> <span>Tablo</span>
                                </button>
                            </div>
                        </div>

                        {/* Ölçülendirme */}
                        <div className="ribbon-panel">
                            <div className="panel-label">Ölçülendirme</div>
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'DIMLINEAR' ? 'active' : ''}`} onClick={() => startCommand('DIMLINEAR')} title="Doğrusal Ölçü">
                                    <TbLine /> <span>Lineer</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMALIGNED' ? 'active' : ''}`} onClick={() => startCommand('DIMALIGNED')} title="Hizalı Ölçü">
                                    <TbLine /> <span>Hizalı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMRADIUS' ? 'active' : ''}`} onClick={() => startCommand('DIMRADIUS')} title="Yarıçap Ölçüsü">
                                    <FaRegCircle /> <span>Yarıçap</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMDIAMETER' ? 'active' : ''}`} onClick={() => startCommand('DIMDIAMETER')} title="Çap Ölçüsü">
                                    <FaRegCircle /> <span>Çap</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'DIMANGULAR' ? 'active' : ''}`} onClick={() => startCommand('DIMANGULAR')} title="Açısal Ölçü">
                                    <FaDrawPolygon /> <span>Açı</span>
                                </button>
                            </div>
                        </div>

                        {/* Düzenleme */}
                        <div className="ribbon-panel">
                            <div className="panel-label">Düzenle</div>
                            <div className="tool-grid">
                                <button className={`tool-btn ${activeCommand === 'MOVE' ? 'active' : ''}`} onClick={() => startCommand('MOVE')} title="Taşı">
                                    <FaArrowsAlt /> <span>Taşı</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'COPY' ? 'active' : ''}`} onClick={() => startCommand('COPY')} title="Kopyala">
                                    <FaCopy /> <span>Kopya</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ROTATE' ? 'active' : ''}`} onClick={() => startCommand('ROTATE')} title="Döndür">
                                    <FaRedo /> <span>Döndür</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'SCALE' ? 'active' : ''}`} onClick={() => startCommand('SCALE')} title="Ölçekle">
                                    <FaExpand /> <span>Ölçek</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'MIRROR' ? 'active' : ''}`} onClick={() => startCommand('MIRROR')} title="Aynala">
                                    <FaExchangeAlt /> <span>Ayna</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'OFFSET' ? 'active' : ''}`} onClick={() => startCommand('OFFSET')} title="Öteleme">
                                    <FaStream /> <span>Offset</span>
                                </button>
                                <button className={`tool-btn ${activeCommand === 'ERASE' ? 'active' : ''}`} onClick={() => startCommand('ERASE')} title="Sil">
                                    <FaEraser /> <span>Sil</span>
                                </button>
                            </div>
                        </div>

                        {/* Özellikler */}
                        <div className="ribbon-panel">
                            <div className="panel-label">Özellik</div>
                            <div className="tool-col compact">
                                <div className="prop-row">
                                    <span>Renk</span>
                                    <input
                                        type="color"
                                        onChange={(e) => changeProperty('color', e.target.value)}
                                        defaultValue="#ffffff"
                                        title="Renk"
                                    />
                                </div>
                                <div className="prop-row">
                                    <span>Çizgi</span>
                                    <select onChange={(e) => changeProperty('lineType', e.target.value)} title="Çizgi Tipi">
                                        <option value="continuous">Düz</option>
                                        <option value="dashed">Kesik</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Insert':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="panel-label">Import</div>
                            <div className="tool-row">
                                <button className="tool-btn" onClick={() => fileInputRef.current?.click()}><FaFolderOpen /> <span>Import DXF</span></button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".dxf"
                                    onChange={handleFileImport}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'View':
                return (
                    <div className="ribbon-group">
                        <div className="ribbon-panel">
                            <div className="panel-label">Yakınlaştır</div>
                            <div className="tool-row">
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomIn()}
                                    title="Yakınlaştır (+)"
                                >
                                    <span className="material-icons">zoom_in</span>
                                    <span>Yakınlaştır</span>
                                </button>
                                <button
                                    className="tool-btn"
                                    onClick={() => triggerZoomOut()}
                                    title="Uzaklaştır (-)"
                                >
                                    <span className="material-icons">zoom_out</span>
                                    <span>Uzaklaştır</span>
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
                        </div>
                        <div className="ribbon-panel">
                            <div className="panel-label">Ölçek</div>
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
                        </div>
                        <div className="ribbon-panel">
                            <div className="panel-label">Birimler</div>
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
                        </div>
                        <div className="ribbon-panel">
                            <div className="panel-label">Bilgi</div>
                            <div className="tool-col compact" style={{ fontSize: '11px', color: '#aaa', padding: '8px' }}>
                                <div>Ölçek: <strong style={{ color: '#4cc2ff' }}>{drawingScale}</strong></div>
                                <div>Proje: <strong style={{ color: '#ffcc00' }}>{baseUnit}</strong></div>
                                <div>Göster: <strong style={{ color: '#4cc2ff' }}>{drawingUnit}</strong></div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return <div>Work in progress</div>;
        }
    };

    const tabs = ['File', 'Home', 'Insert', 'View', 'Manage'];
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
                        style={tab === 'File' ? { backgroundColor: '#107c10', color: 'white' } :
                            tab === 'Hatch Editor' ? { backgroundColor: '#2b579a', color: 'white' } : {}}
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
