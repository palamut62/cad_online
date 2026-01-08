import { useEffect, useRef } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import { useNotification } from '../../context/NotificationContext';
import { FaFile, FaFolderOpen, FaSave, FaPrint } from 'react-icons/fa';
import Ribbon from '../Ribbon/Ribbon';
import Viewport from '../Viewport/Viewport';
import CommandLine from '../CommandLine/CommandLine';
import StatusBar from '../StatusBar/StatusBar';
import SheetTabs from '../SheetTabs/SheetTabs';
import TextInputDialog from '../Dialogs/TextInputDialog';
import TableInputDialog from '../Dialogs/TableInputDialog';
import TableEditDialog from '../Dialogs/TableEditDialog';
import DimensionSettingsDialog from '../Dialogs/DimensionSettingsDialog';
import DimensionEditDialog from '../Dialogs/DimensionEditDialog';
import PrintDialog from '../Dialogs/PrintDialog';
import LayerManager from '../Layers/LayerManager';
import { DimensionSettings, saveDimensionSettings } from '../../types/dimensionSettings';
import { parseDxf } from '../../utils/dxfLoader';
import { exportDXF } from '../../utils/dxfExporter';
import type { DimensionEntity } from '../../types/entities';
import './MainLayout.css';

const MainLayout = () => {
    const {
        cancelCommand,
        clearSelection,
        activeCommand,
        selectedIds,
        activeGrip,
        cancelGrip,
        textDialogState,
        setTextDialogState,
        tableDialogState,
        setTableDialogState,
        dimensionSettingsDialogState,
        setDimensionSettingsDialogState,
        dimensionEditDialogState,
        setDimensionEditDialogState,
        entities,
        updateEntity,
        startCommand,
        // Sheet management
        sheets,
        activeSheetId,
        // Print
        printPreviewMode,
        finishPrintPreview,
        printWindowMode,
        finishPrintWindow,
        // Layers
        layerDialogState,
        setLayerDialogState,
        // In-place text editor
        inPlaceTextEditorState,
        cancelInPlaceEdit,
        // File operations
        fileName,
        addSheet,
        loadEntities,
        // Print
        setPrintDialogState,
        // Zoom to fit
        triggerZoomToFit,
        finishPolyline,
        triggerPan,
        triggerView
    } = useDrawing();

    const { showError } = useNotification();
    const fileInputRef = useRef<HTMLInputElement>(null);




    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log("ESC pressed");
                if (inPlaceTextEditorState.isOpen) {
                    // Cancel in-place text editor first
                    cancelInPlaceEdit();
                } else if (activeGrip) {
                    // Cancel grip editing first (restores original entity)
                    cancelGrip();
                } else if (printWindowMode) {
                    // Cancel print window selection mode
                    finishPrintWindow();
                } else if (activeCommand) {
                    cancelCommand();
                } else if (selectedIds.size > 0) {
                    clearSelection();
                }
            } else if (e.key === 'Enter') {
                if (activeCommand === 'POLYLINE') {
                    finishPolyline();
                } else if (activeCommand === 'SPLINE') {
                    // SPLINE finishes on Enter (saves current points)
                    cancelCommand(true);
                } else if (activeCommand === 'LINE' || activeCommand === 'ARC') {
                    // LINE/ARC finish on Enter (stop drawing)
                    cancelCommand(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancelCommand, clearSelection, activeCommand, selectedIds, activeGrip, cancelGrip, printWindowMode, finishPrintWindow, inPlaceTextEditorState.isOpen, cancelInPlaceEdit]);

    return (
        <div className="main-layout">
            <div className="title-bar">
                {/* App Logo */}
                <div className="app-logo">
                    <img src="/gemini-icon.png" alt="CAD Logo" />
                </div>
                {/* Quick Access Toolbar */}
                <div className="quick-access-toolbar">
                    <button className="qat-btn" onClick={() => addSheet()} title="New File">
                        <FaFile />
                    </button>
                    <button className="qat-btn" onClick={() => fileInputRef.current?.click()} title="Open">
                        <FaFolderOpen />
                    </button>
                    <button className="qat-btn" onClick={() => exportDXF(entities, fileName)} title="Save">
                        <FaSave />
                    </button>
                    <button className="qat-btn" onClick={() => setPrintDialogState({ isOpen: true })} title="Print">
                        <FaPrint />
                    </button>
                    <div className="qat-separator"></div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".dxf,.dwg"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const content = event.target?.result as string;
                                const result = parseDxf(content);
                                if (result.errors.length > 0) {
                                    showError('DXF Hatası', 'DXF okuma hatası: ' + result.errors.join('\n'));
                                    return;
                                }
                                addSheet(file.name);
                                setTimeout(() => {
                                    loadEntities(result.entities, file.name);
                                }, 10);
                                setTimeout(() => triggerZoomToFit(), 150);
                            };
                            reader.readAsText(file);
                        }
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                />
                <div className="app-title-container">
                    <span className="app-title">2D Drafting & Annotation</span>
                    <span className="app-separator">-</span>
                    <span className="drawing-name">{sheets.find(s => s.id === activeSheetId)?.name || 'Untitled'}.dxf</span>
                </div>

                <div className="window-controls-placeholder">
                    {/* Placeholder for min/max/close if this was a desktop frame */}
                    <span className="material-icons">remove</span>
                    <span className="material-icons">check_box_outline_blank</span>
                    <span className="material-icons">close</span>
                </div>
            </div>
            <Ribbon />
            <div className="workspace">
                <div className="side-toolbar">
                    <button className="side-btn" onClick={() => startCommand('LINE')} title="Line"><span className="material-icons">horizontal_rule</span></button>
                    <button className="side-btn" onClick={() => startCommand('POLYLINE')} title="Polyline"><span className="material-icons">polyline</span></button>
                    <button className="side-btn" onClick={() => startCommand('CIRCLE')} title="Circle"><span className="material-icons">radio_button_unchecked</span></button>
                    <button className="side-btn" onClick={() => startCommand('ARC')} title="Arc"><span className="material-icons">architecture</span></button>
                    <div className="side-separator"></div>
                    <button className="side-btn" onClick={() => startCommand('MOVE')} title="Move"><span className="material-icons">open_with</span></button>
                    <button className="side-btn" onClick={() => startCommand('COPY')} title="Copy"><span className="material-icons">content_copy</span></button>
                    <button className="side-btn" onClick={() => startCommand('ROTATE')} title="Rotate"><span className="material-icons">autorenew</span></button>
                    <button className="side-btn" onClick={() => startCommand('ERASE')} title="Erase"><span className="material-icons">delete</span></button>
                </div>
                <div className="viewport-area">
                    <Viewport />

                    {/* ViewCube */}
                    <div className="view-cube-container">
                        <div className="view-cube-compass">
                            <span className="compass-label n" onClick={() => triggerPan(0, 1)} title="Pan Up">N</span>
                            <span className="compass-label e" onClick={() => triggerPan(1, 0)} title="Pan Right">E</span>
                            <span className="compass-label s" onClick={() => triggerPan(0, -1)} title="Pan Down">S</span>
                            <span className="compass-label w" onClick={() => triggerPan(-1, 0)} title="Pan Left">W</span>
                            <div className="view-cube-ring"></div>
                        </div>
                        <div className="view-cube-box">
                            <div className="cube-face top" onClick={() => triggerView('TOP')} title="Reset View">TOP</div>
                        </div>
                    </div>

                    <div className="view-mode-info">
                        [-] [Top] [2D Wireframe] [WCS]
                    </div>

                    <CommandLine />
                </div>
            </div>
            <SheetTabs />
            <StatusBar />

            {/* Dialogs */}
            <TextInputDialog
                isOpen={textDialogState.isOpen}
                onClose={() => {
                    setTextDialogState(prev => ({ ...prev, isOpen: false }));
                    cancelCommand(); // Cancel if closed without submit
                }}
                onSubmit={(data: { text: string; height: number; rotation: number }) => {
                    if (textDialogState.callback) {
                        textDialogState.callback(data);
                    }
                    setTextDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={textDialogState.initialValues}
                mode={textDialogState.mode || 'TEXT'}
            />
            {/* Tablo oluşturma diyaloğu (yeni tablo) */}
            <TableInputDialog
                isOpen={tableDialogState.isOpen && !tableDialogState.editMode}
                onClose={() => {
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                    cancelCommand();
                }}
                onSubmit={(data) => {
                    if (tableDialogState.callback) {
                        tableDialogState.callback(data);
                    }
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={tableDialogState.initialValues}
            />

            {/* Tablo düzenleme diyaloğu (mevcut tablo düzenleme) */}
            <TableEditDialog
                isOpen={tableDialogState.isOpen && tableDialogState.editMode === true}
                onClose={() => {
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                onSubmit={(data) => {
                    if (tableDialogState.callback) {
                        tableDialogState.callback(data);
                    }
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={tableDialogState.initialValues}
            />

            {/* Ölçülendirme Ayarları Diyaloğu */}
            <DimensionSettingsDialog
                isOpen={dimensionSettingsDialogState.isOpen}
                onClose={() => {
                    setDimensionSettingsDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                onApply={(settings: DimensionSettings) => {
                    // Ayarları kaydet
                    saveDimensionSettings(settings);
                    // İlgili entity'leri güncellemek için burada işlem yapılabilir
                    console.log('Dimension settings applied:', settings);
                }}
            />

            {/* Print Dialog */}
            <PrintDialog />

            {/* Print Preview Overlay */}
            {printPreviewMode && (
                <div className="print-preview-overlay">
                    <div className="print-preview-toolbar">
                        <span style={{ fontWeight: 'bold' }}>Print Preview Mode</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="qa-btn" style={{ width: 'auto', padding: '0 10px' }} onClick={() => window.print()}>
                                <span className="material-icons" style={{ fontSize: '16px', marginRight: '5px' }}>print</span> Print
                            </button>
                            <button className="qa-btn" style={{ width: 'auto', padding: '0 10px' }} onClick={finishPrintPreview}>
                                <span className="material-icons" style={{ fontSize: '16px', marginRight: '5px' }}>close</span> Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ölçü Düzenleme Diyaloğu */}
            <DimensionEditDialog
                isOpen={dimensionEditDialogState.isOpen}
                onClose={() => {
                    setDimensionEditDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                onSave={(entityId: number, updates: Partial<DimensionEntity>) => {
                    updateEntity(entityId, updates);
                    setDimensionEditDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                entity={dimensionEditDialogState.entityId
                    ? (entities.find(e => e.id === dimensionEditDialogState.entityId) as DimensionEntity)
                    : null
                }
            />

            {/* Layer Manager Modal */}
            {layerDialogState.isOpen && (
                <div className="modal-overlay" onClick={() => setLayerDialogState({ isOpen: false })}>
                    <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
                        <LayerManager onClose={() => setLayerDialogState({ isOpen: false })} />
                    </div>
                </div>
            )}


        </div>
    );
};

export default MainLayout;
