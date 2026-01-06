import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useDrawing } from '../../context/DrawingContext';
import './PrintDialog.css'; // Keep for specific print styles if needed, but override main UI

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
        fontSize: '11px',
        outline: 'none'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '4px',
        fontSize: '11px',
        color: colors.textDim
    };

    const sectionTitleStyle = {
        marginTop: 0,
        marginBottom: '10px',
        fontSize: '12px',
        color: colors.accent,
        fontWeight: '700',
        letterSpacing: '0.5px',
        textTransform: 'uppercase' as const,
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: '4px'
    };

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

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
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
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: colors.bg,
                    borderRadius: '8px',
                    width: '800px',
                    maxWidth: '95vw',
                    maxHeight: '90vh',
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>print</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>PLOT - MODEL</span>
                    </div>
                    <button
                        onClick={handleClose}
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

                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '24px'
                }}>
                    {/* Left Column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Printer/Plotter */}
                        <div>
                            <h4 style={sectionTitleStyle}>Printer/Plotter</h4>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={labelStyle}>Name</label>
                                <select
                                    value={settings.printer}
                                    onChange={e => setSettings({ ...settings, printer: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="Adobe PDF">Adobe PDF</option>
                                    <option value="Microsoft Print to PDF">Microsoft Print to PDF</option>
                                    <option value="Web Print">Web Browser Print</option>
                                </select>
                            </div>
                        </div>

                        {/* Paper Size */}
                        <div>
                            <h4 style={sectionTitleStyle}>Paper Size</h4>
                            <div style={{ marginBottom: '12px' }}>
                                <select
                                    value={settings.paperSize}
                                    onChange={e => setSettings({ ...settings, paperSize: e.target.value })}
                                    style={inputStyle}
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
                        <div>
                            <h4 style={sectionTitleStyle}>Plot Area</h4>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={labelStyle}>What to plot:</label>
                                <select
                                    value={settings.plotArea}
                                    onChange={e => setSettings({ ...settings, plotArea: e.target.value as any })}
                                    style={inputStyle}
                                >
                                    <option value="display">Display</option>
                                    <option value="extents">Extents</option>
                                    <option value="window">Window</option>
                                </select>
                            </div>

                            {settings.plotArea === 'window' && (
                                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={handleWindowSelection}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(76, 194, 255, 0.15)',
                                            color: colors.accent,
                                            border: `1px solid ${colors.accent}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontFamily: 'inherit',
                                            width: '100%',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span className="material-icons" style={{ fontSize: '16px' }}>crop_free</span>
                                        Select Window
                                    </button>
                                    {printWindowBox ? (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: colors.success, textAlign: 'center' }}>Window Selected ✓</div>
                                    ) : (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: colors.error, textAlign: 'center' }}>No Window Selected</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Plot Style Table */}
                        <div>
                            <h4 style={sectionTitleStyle}>Plot Style</h4>
                            <div style={{ marginBottom: '12px' }}>
                                <select
                                    value={settings.plotStyle}
                                    onChange={e => setSettings({ ...settings, plotStyle: e.target.value as any })}
                                    style={inputStyle}
                                >
                                    <option value="none">None (Color)</option>
                                    <option value="monochrome">Monochrome</option>
                                    <option value="grayscale">Grayscale</option>
                                </select>
                            </div>
                        </div>

                        {/* Plot Scale */}
                        <div>
                            <h4 style={sectionTitleStyle}>Plot Scale</h4>
                            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.fitToPaper}
                                        onChange={e => setSettings({ ...settings, fitToPaper: e.target.checked })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Fit to paper
                                </label>
                            </div>
                            {!settings.fitToPaper && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={labelStyle}>Scale</label>
                                    <select
                                        value={settings.scale}
                                        onChange={e => setSettings({ ...settings, scale: e.target.value })}
                                        style={inputStyle}
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
                        <div>
                            <h4 style={sectionTitleStyle}>Plot Options</h4>
                            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.centerPlot}
                                        onChange={e => setSettings({ ...settings, centerPlot: e.target.checked })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Center the plot
                                </label>
                            </div>
                        </div>

                        {/* Orientation */}
                        <div>
                            <h4 style={sectionTitleStyle}>Drawing Orientation</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="radio"
                                        name="orientation"
                                        checked={settings.orientation === 'portrait'}
                                        onChange={() => setSettings({ ...settings, orientation: 'portrait' })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Portrait
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="radio"
                                        name="orientation"
                                        checked={settings.orientation === 'landscape'}
                                        onChange={() => setSettings({ ...settings, orientation: 'landscape' })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Landscape
                                </label>
                            </div>
                        </div>
                    </div>
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
                        onClick={handleClose}
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
                        onClick={handlePreview}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: colors.textMain,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s'
                        }}
                    >
                        PREVIEW
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
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
                        PLOT
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PrintDialog;
