import { useState, useEffect, useCallback, useRef } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import './PrintDialog.css';

interface PrintSettings {
    printer: string;
    paperSize: string;
    plotArea: 'display' | 'extents' | 'window';
    fitToPaper: boolean;
    scale: string;
    orientation: 'portrait' | 'landscape';
    plotStyle: 'none' | 'monochrome' | 'grayscale';
    centerPlot: boolean;
    lineweightDisplay: 'default' | 'hairline' | 'thick';
    margins: { top: number; right: number; bottom: number; left: number };
    quality: 'draft' | 'normal' | 'high';
}

// Paper size definitions in mm
const PAPER_SIZES: { [key: string]: { width: number; height: number; name: string } } = {
    'iso_a4': { width: 210, height: 297, name: 'A4' },
    'iso_a3': { width: 297, height: 420, name: 'A3' },
    'iso_a2': { width: 420, height: 594, name: 'A2' },
    'iso_a1': { width: 594, height: 841, name: 'A1' },
    'iso_a0': { width: 841, height: 1189, name: 'A0' },
    'ansi_letter': { width: 216, height: 279, name: 'Letter' },
    'ansi_legal': { width: 216, height: 356, name: 'Legal' },
};

const PrintDialog = () => {
    const {
        printDialogState,
        setPrintDialogState,
        startPrintWindow,
        printWindowBox,
        startPrintPreview,
        applyZoomWindow,
        getEntitiesBoundingBox,
        triggerZoomToFit
    } = useDrawing();

    // Store original zoom state to restore after print
    const originalZoomRef = useRef<boolean>(false);

    const [settings, setSettings] = useState<PrintSettings>({
        printer: 'Adobe PDF',
        paperSize: 'iso_a4',
        plotArea: 'extents',
        fitToPaper: true,
        scale: '1:1',
        orientation: 'landscape',
        plotStyle: 'none',
        centerPlot: true,
        lineweightDisplay: 'default',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        quality: 'normal'
    });

    // Update settings if window box is selected
    useEffect(() => {
        if (printWindowBox && printDialogState.isOpen) {
            setSettings(prev => ({
                ...prev,
                plotArea: 'window'
            }));
        }
    }, [printWindowBox, printDialogState.isOpen]);

    // Helper: Inject @page CSS for paper size and orientation
    const injectPageCSS = useCallback((paperSize: string, orientation: string, margins: { top: number; right: number; bottom: number; left: number }) => {
        // Remove existing
        const existing = document.getElementById('print-page-style');
        if (existing) existing.remove();

        const paper = PAPER_SIZES[paperSize] || PAPER_SIZES['iso_a4'];
        const width = orientation === 'landscape' ? paper.height : paper.width;
        const height = orientation === 'landscape' ? paper.width : paper.height;

        const style = document.createElement('style');
        style.id = 'print-page-style';
        style.textContent = `@page { size: ${width}mm ${height}mm; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }`;
        document.head.appendChild(style);
    }, []);

    // Helper: Apply plot style class
    const applyPlotStyle = useCallback((style: string) => {
        document.body.classList.remove('print-monochrome', 'print-grayscale');
        if (style === 'monochrome') {
            document.body.classList.add('print-monochrome');
        } else if (style === 'grayscale') {
            document.body.classList.add('print-grayscale');
        }
    }, []);

    // Apply plot area zoom before printing
    const applyPlotAreaZoom = useCallback(() => {
        originalZoomRef.current = true; // Mark that we changed zoom
        if (settings.plotArea === 'extents') {
            const bounds = getEntitiesBoundingBox();
            if (bounds) {
                applyZoomWindow(bounds.min, bounds.max);
            }
        } else if (settings.plotArea === 'window' && printWindowBox) {
            applyZoomWindow(printWindowBox.start, printWindowBox.end);
        } else {
            originalZoomRef.current = false; // No zoom change for display
        }
    }, [settings.plotArea, printWindowBox, getEntitiesBoundingBox, applyZoomWindow]);

    // Restore zoom after printing
    const restoreZoom = useCallback(() => {
        if (originalZoomRef.current) {
            triggerZoomToFit();
            originalZoomRef.current = false;
        }
    }, [triggerZoomToFit]);

    if (!printDialogState.isOpen) return null;

    const handleWindowSelection = () => {
        startPrintWindow();
    };

    const handlePreview = () => {
        // Apply settings before preview
        injectPageCSS(settings.paperSize, settings.orientation, settings.margins);
        applyPlotStyle(settings.plotStyle);
        // Zoom to selected area before preview (allow time for zoom to complete)
        applyPlotAreaZoom();
        // Delay preview start to allow zoom animation to complete
        setTimeout(() => {
            startPrintPreview();
        }, 100);
    };

    const handlePrint = () => {
        console.log("Printing with settings:", settings, "Window:", printWindowBox);

        // Apply settings
        injectPageCSS(settings.paperSize, settings.orientation, settings.margins);
        applyPlotStyle(settings.plotStyle);
        applyPlotAreaZoom();

        // Close dialog first
        setPrintDialogState({ isOpen: false });

        // Trigger system print after a delay to allow zoom to complete
        setTimeout(() => {
            window.print();
            // Cleanup and restore after print
            setTimeout(() => {
                applyPlotStyle('none');
                restoreZoom();
            }, 1000);
        }, 400);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setPrintDialogState({ isOpen: false });
    };

    return (
        <div className="print-dialog-overlay" onClick={handleClose}>
            <div className="print-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="print-dialog-header">
                    <span>Plot - Model</span>
                    <span className="material-icons" style={{ cursor: 'pointer' }} onClick={handleClose}>close</span>
                </div>

                <div className="print-dialog-body">
                    {/* Left Column */}
                    <div className="print-column">
                        {/* Printer/Plotter */}
                        <div className="print-group">
                            <span className="print-group-title">Yazıcı/Plotter</span>
                            <div className="print-field">
                                <label>İsim</label>
                                <select
                                    value={settings.printer}
                                    onChange={e => setSettings({ ...settings, printer: e.target.value })}
                                >
                                    <option value="Adobe PDF">Adobe PDF</option>
                                    <option value="Microsoft Print to PDF">Microsoft Print to PDF</option>
                                    <option value="Web Print">Web Tarayıcı Yazdırma</option>
                                </select>
                            </div>
                        </div>

                        {/* Paper Size */}
                        <div className="print-group">
                            <span className="print-group-title">Kağıt Boyutu</span>
                            <div className="print-field">
                                <select
                                    value={settings.paperSize}
                                    onChange={e => setSettings({ ...settings, paperSize: e.target.value })}
                                >
                                    <option value="iso_a4">ISO A4 (210 x 297 mm)</option>
                                    <option value="iso_a3">ISO A3 (297 x 420 mm)</option>
                                    <option value="iso_a2">ISO A2 (420 x 594 mm)</option>
                                    <option value="iso_a1">ISO A1 (594 x 841 mm)</option>
                                    <option value="iso_a0">ISO A0 (841 x 1189 mm)</option>
                                    <option value="ansi_letter">ANSI Letter (8.5 x 11 in)</option>
                                    <option value="ansi_legal">ANSI Legal (8.5 x 14 in)</option>
                                </select>
                            </div>
                        </div>

                        {/* Plot Area */}
                        <div className="print-group">
                            <span className="print-group-title">Çizim Alanı</span>
                            <div className="print-field">
                                <label>Ne yazdırılsın:</label>
                                <select
                                    value={settings.plotArea}
                                    onChange={e => setSettings({ ...settings, plotArea: e.target.value as any })}
                                >
                                    <option value="display">Ekran</option>
                                    <option value="extents">Sınırlar</option>
                                    <option value="window">Pencere</option>
                                </select>
                            </div>

                            {settings.plotArea === 'window' && (
                                <div className="print-field">
                                    <button type="button" className="print-window-btn" onClick={handleWindowSelection}>
                                        <span className="material-icons" style={{ fontSize: '16px' }}>crop_free</span>
                                        Pencere Seç
                                    </button>
                                    {printWindowBox ? (
                                        <div className="print-window-info">Pencere Seçildi ✓</div>
                                    ) : (
                                        <div className="print-window-info" style={{ color: '#ff6b6b' }}>Pencere Seçilmedi</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="print-column">
                        {/* Plot Style Table */}
                        <div className="print-group">
                            <span className="print-group-title">Çizim Stili</span>
                            <div className="print-field">
                                <select
                                    value={settings.plotStyle}
                                    onChange={e => setSettings({ ...settings, plotStyle: e.target.value as any })}
                                >
                                    <option value="none">Hiçbiri (Renkli)</option>
                                    <option value="monochrome">Siyah/Beyaz</option>
                                    <option value="grayscale">Gri Tonlama</option>
                                </select>
                            </div>
                        </div>

                        {/* Plot Scale */}
                        <div className="print-group">
                            <span className="print-group-title">Ölçek</span>
                            <div className="print-field-row">
                                <input
                                    type="checkbox"
                                    checked={settings.fitToPaper}
                                    onChange={e => setSettings({ ...settings, fitToPaper: e.target.checked })}
                                />
                                <label>Kağıda Sığdır</label>
                            </div>
                            {!settings.fitToPaper && (
                                <div className="print-field">
                                    <label>Ölçek</label>
                                    <select
                                        value={settings.scale}
                                        onChange={e => setSettings({ ...settings, scale: e.target.value })}
                                    >
                                        <option value="1:1">1:1</option>
                                        <option value="1:2">1:2</option>
                                        <option value="1:10">1:10</option>
                                        <option value="1:50">1:50</option>
                                        <option value="1:100">1:100</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Plot Options */}
                        <div className="print-group">
                            <span className="print-group-title">Seçenekler</span>
                            <div className="print-field-row">
                                <input
                                    type="checkbox"
                                    checked={settings.centerPlot}
                                    onChange={e => setSettings({ ...settings, centerPlot: e.target.checked })}
                                />
                                <label>Çizimi Ortala</label>
                            </div>
                        </div>

                        {/* Orientation */}
                        <div className="print-group">
                            <span className="print-group-title">Kağıt Yönü</span>
                            <div className="print-field-row">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={settings.orientation === 'portrait'}
                                    onChange={() => setSettings({ ...settings, orientation: 'portrait' })}
                                />
                                <label>Dikey (Portrait)</label>
                            </div>
                            <div className="print-field-row">
                                <input
                                    type="radio"
                                    name="orientation"
                                    checked={settings.orientation === 'landscape'}
                                    onChange={() => setSettings({ ...settings, orientation: 'landscape' })}
                                />
                                <label>Yatay (Landscape)</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="print-dialog-footer">
                    <button type="button" className="print-btn print-btn-secondary" onClick={handleClose}>İptal</button>
                    <button type="button" className="print-btn print-btn-secondary" onClick={handlePreview}>Önizleme...</button>
                    <button type="button" className="print-btn print-btn-primary" onClick={handlePrint}>Yazdır</button>
                </div>
            </div>
        </div>
    );
};

export default PrintDialog;

