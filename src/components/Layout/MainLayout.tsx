import { useEffect, useState } from 'react';
import { useDrawing } from '../../context/DrawingContext';
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
        addSheet,
        sheets,
        activeSheetId,
        // Print
        setPrintDialogState,
        printPreviewMode,
        finishPrintPreview,
        printWindowMode,
        finishPrintWindow,
        loadProject,
        // Layers
        layerDialogState,
        setLayerDialogState
    } = useDrawing();

    const [appMenuOpen, setAppMenuOpen] = useState(false);

    // Dosya İşlemleri
    const handleNew = () => {
        addSheet(); // Yeni sayfa ekle
        setAppMenuOpen(false);
    };

    const handleSave = () => {
        // Aktif projeyi JSON olarak kaydet
        // Tüm sekmeleri kaydetmek daha doğru olur
        const data = {
            version: "1.0",
            savedAt: new Date().toISOString(),
            activeSheetId,
            sheets
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${new Date().getTime()}.cadjson`;
        a.click();
        URL.revokeObjectURL(url);
        setAppMenuOpen(false);
    };

    const handleOpen = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cadjson,.json';
        input.onchange = (e) => {
            const file = (e.target as any).files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const content = ev.target?.result as string;
                    const data = JSON.parse(content);

                    if (data.sheets && Array.isArray(data.sheets)) {
                        loadProject(data);
                    } else if (data.entities && Array.isArray(data.entities)) {
                        loadProject(data); // loadProject handles legacy format too
                    } else {
                        alert("Geçersiz dosya formatı.");
                    }
                } catch (err) {
                    console.error('Dosya okuma hatası:', err);
                    alert("Dosya okunamadı.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
        setAppMenuOpen(false);
    };

    const handlePrint = () => {
        setPrintDialogState({ isOpen: true });
        setAppMenuOpen(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log("ESC pressed");
                if (activeGrip) {
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
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancelCommand, clearSelection, activeCommand, selectedIds, activeGrip, cancelGrip, printWindowMode, finishPrintWindow]);

    return (
        <div className="main-layout">
            <div className="title-bar">
                <div className="app-menu-button" onClick={() => setAppMenuOpen(!appMenuOpen)}>
                    <span className="material-icons">menu</span>
                </div>
                <div className="quick-access-toolbar">
                    <button className="qa-btn" title="New" onClick={handleNew}><span className="material-icons">note_add</span></button>
                    <button className="qa-btn" title="Open" onClick={handleOpen}><span className="material-icons">folder_open</span></button>
                    <button className="qa-btn" title="Save" onClick={handleSave}><span className="material-icons">save</span></button>
                    <div className="qa-separator"></div>
                    <button className="qa-btn" title="Undo"><span className="material-icons">undo</span></button>
                    <button className="qa-btn" title="Redo"><span className="material-icons">redo</span></button>
                    <div className="qa-separator"></div>
                    <button className="qa-btn" title="Print" onClick={handlePrint}><span className="material-icons">print</span></button>
                </div>

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
                            <span className="compass-label n">N</span>
                            <span className="compass-label e">E</span>
                            <span className="compass-label s">S</span>
                            <span className="compass-label w">W</span>
                            <div className="view-cube-ring"></div>
                        </div>
                        <div className="view-cube-box">
                            <div className="cube-face top">TOP</div>
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

            {/* Application Menu Dialog */}
            {appMenuOpen && (
                <div className="app-menu-dialog-overlay" onClick={() => setAppMenuOpen(false)}>
                    <div className="app-menu-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="app-menu-header">
                            <span className="app-menu-title">Uygulama Menüsü</span>
                            <span className="material-icons app-menu-close" onClick={() => setAppMenuOpen(false)}>close</span>
                        </div>
                        <div className="app-menu-content">
                            <div className="app-menu-section">
                                <div className="app-menu-item" onClick={handleNew}>
                                    <span className="material-icons">note_add</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Yeni</span>
                                        <span className="app-menu-item-desc">Yeni bir çizim oluştur</span>
                                    </div>
                                </div>
                                <div className="app-menu-item" onClick={handleOpen}>
                                    <span className="material-icons">folder_open</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Aç</span>
                                        <span className="app-menu-item-desc">Mevcut bir dosyayı aç</span>
                                    </div>
                                </div>
                                <div className="app-menu-item" onClick={handleSave}>
                                    <span className="material-icons">save</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Kaydet</span>
                                        <span className="app-menu-item-desc">Çizimi kaydet</span>
                                    </div>
                                </div>
                                <div className="app-menu-item" onClick={handleSave}>
                                    <span className="material-icons">save_as</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Farklı Kaydet</span>
                                        <span className="app-menu-item-desc">Yeni bir isimle kaydet</span>
                                    </div>
                                </div>
                            </div>
                            <div className="app-menu-divider"></div>
                            <div className="app-menu-section">
                                <div className="app-menu-item" onClick={handlePrint}>
                                    <span className="material-icons">print</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Yazdır</span>
                                        <span className="app-menu-item-desc">Çizimi yazdır veya PDF olarak kaydet</span>
                                    </div>
                                </div>
                                <div className="app-menu-item">
                                    <span className="material-icons">publish</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Dışa Aktar</span>
                                        <span className="app-menu-item-desc">DXF, PDF veya diğer formatlara aktar</span>
                                    </div>
                                </div>
                            </div>
                            <div className="app-menu-divider"></div>
                            <div className="app-menu-section">
                                <div className="app-menu-item">
                                    <span className="material-icons">settings</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Ayarlar</span>
                                        <span className="app-menu-item-desc">Uygulama ayarlarını düzenle</span>
                                    </div>
                                </div>
                                <div className="app-menu-item">
                                    <span className="material-icons">help_outline</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Yardım</span>
                                        <span className="app-menu-item-desc">Kullanım kılavuzu ve destek</span>
                                    </div>
                                </div>
                            </div>
                            <div className="app-menu-divider"></div>
                            <div className="app-menu-section">
                                <div className="app-menu-item app-menu-item-exit">
                                    <span className="material-icons">exit_to_app</span>
                                    <div className="app-menu-item-text">
                                        <span className="app-menu-item-title">Çıkış</span>
                                        <span className="app-menu-item-desc">Uygulamayı kapat</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="app-menu-footer">
                            <span className="app-menu-version">CAD Online v1.0</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
