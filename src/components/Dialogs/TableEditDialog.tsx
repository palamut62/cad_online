import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface TableEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        rows: number;
        cols: number;
        rowHeight: number;
        colWidth: number;
        cellData: string[][];
        headerRow: boolean;
    }) => void;
    initialValues?: {
        rows?: number;
        cols?: number;
        rowHeight?: number;
        colWidth?: number;
        cellData?: string[][];
        headerRow?: boolean;
    };
}

const SCALE_PRESETS = [
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.25, label: '125%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
];

const TableEditDialog: React.FC<TableEditDialogProps> = ({ isOpen, onClose, onSubmit, initialValues }) => {
    const [rows, setRows] = useState(4);
    const [cols, setCols] = useState(4);
    const [rowHeight, setRowHeight] = useState(10);
    const [colWidth, setColWidth] = useState(30);
    const [cellData, setCellData] = useState<string[][]>([]);
    const [headerRow, setHeaderRow] = useState(false);
    const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
    const [scaleInput, setScaleInput] = useState('100');
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep track of original values for scaling
    const [originalRowHeight, setOriginalRowHeight] = useState(10);
    const [originalColWidth, setOriginalColWidth] = useState(30);

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
        fontSize: '11px'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '11px',
        color: colors.textDim
    };

    useEffect(() => {
        if (isOpen) {
            const r = initialValues?.rows || 4;
            const c = initialValues?.cols || 4;
            const rh = initialValues?.rowHeight || 10;
            const cw = initialValues?.colWidth || 30;
            setRows(r);
            setCols(c);
            setRowHeight(rh);
            setColWidth(cw);
            setOriginalRowHeight(rh);
            setOriginalColWidth(cw);
            setHeaderRow(initialValues?.headerRow || false);
            setScaleInput('100');

            // Initialize cell data
            const existingData = initialValues?.cellData || [];
            const newCellData: string[][] = [];
            for (let i = 0; i < r; i++) {
                newCellData[i] = [];
                for (let j = 0; j < c; j++) {
                    newCellData[i][j] = existingData[i]?.[j] || '';
                }
            }
            setCellData(newCellData);
            setActiveCell(null);
        }
    }, [isOpen, initialValues]);

    const applyScale = (scaleFactor: number) => {
        const newRowHeight = Math.round(originalRowHeight * scaleFactor * 100) / 100;
        const newColWidth = Math.round(originalColWidth * scaleFactor * 100) / 100;
        setRowHeight(newRowHeight);
        setColWidth(newColWidth);
        setScaleInput(String(Math.round(scaleFactor * 100)));
    };

    const handleScaleInputChange = (value: string) => {
        setScaleInput(value);
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            const scaleFactor = numValue / 100;
            const newRowHeight = Math.round(originalRowHeight * scaleFactor * 100) / 100;
            const newColWidth = Math.round(originalColWidth * scaleFactor * 100) / 100;
            setRowHeight(newRowHeight);
            setColWidth(newColWidth);
        }
    };

    // Resize cell data when rows/cols change
    useEffect(() => {
        if (isOpen) {
            setCellData(prev => {
                const newData: string[][] = [];
                for (let i = 0; i < rows; i++) {
                    newData[i] = [];
                    for (let j = 0; j < cols; j++) {
                        newData[i][j] = prev[i]?.[j] || '';
                    }
                }
                return newData;
            });
        }
    }, [rows, cols, isOpen]);

    if (!isOpen) return null;

    const handleCellChange = (row: number, col: number, value: string) => {
        setCellData(prev => {
            const newData = prev.map(r => [...r]);
            if (!newData[row]) newData[row] = [];
            newData[row][col] = value;
            return newData;
        });
    };

    const handleCellClick = (row: number, col: number) => {
        setActiveCell({ row, col });
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const nextCol = e.shiftKey ? col - 1 : col + 1;
            if (nextCol >= 0 && nextCol < cols) {
                setActiveCell({ row, col: nextCol });
            } else if (!e.shiftKey && nextCol >= cols && row < rows - 1) {
                setActiveCell({ row: row + 1, col: 0 });
            } else if (e.shiftKey && nextCol < 0 && row > 0) {
                setActiveCell({ row: row - 1, col: cols - 1 });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (row < rows - 1) {
                setActiveCell({ row: row + 1, col });
            } else {
                setActiveCell(null);
            }
        } else if (e.key === 'Escape') {
            setActiveCell(null);
        } else if (e.key === 'ArrowUp' && row > 0) {
            setActiveCell({ row: row - 1, col });
        } else if (e.key === 'ArrowDown' && row < rows - 1) {
            setActiveCell({ row: row + 1, col });
        } else if (e.key === 'ArrowLeft' && col > 0 && (e.target as HTMLInputElement).selectionStart === 0) {
            setActiveCell({ row, col: col - 1 });
        } else if (e.key === 'ArrowRight' && col < cols - 1) {
            const input = e.target as HTMLInputElement;
            if (input.selectionStart === input.value.length) {
                setActiveCell({ row, col: col + 1 });
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ rows, cols, rowHeight, colWidth, cellData, headerRow });
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>table_chart</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>EDIT TABLE</span>
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

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Ölçekleme */}
                        <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                            <label style={labelStyle}>SCALE PRESETS</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {SCALE_PRESETS.map(preset => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        onClick={() => applyScale(preset.value)}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: scaleInput === String(preset.value * 100) ? 'rgba(76, 194, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: scaleInput === String(preset.value * 100) ? colors.accent : colors.textDim,
                                            border: `1px solid ${scaleInput === String(preset.value * 100) ? colors.accent : colors.border}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontFamily: 'inherit',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                    <span style={{ fontSize: '11px', color: colors.textDim }}>Custom:</span>
                                    <input
                                        type="number"
                                        min="10"
                                        max="500"
                                        value={scaleInput}
                                        onChange={e => handleScaleInputChange(e.target.value)}
                                        style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: '11px', color: colors.textDim }}>%</span>
                                </div>
                            </div>
                        </div>

                        {/* Tablo özellikleri */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Rows</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={rows}
                                    onChange={e => setRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Columns</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={cols}
                                    onChange={e => setCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Row Height</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={rowHeight}
                                    onChange={e => setRowHeight(parseFloat(e.target.value) || 10)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Col Width</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={colWidth}
                                    onChange={e => setColWidth(parseFloat(e.target.value) || 30)}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', cursor: 'pointer', color: colors.textMain }}>
                                    <input
                                        type="checkbox"
                                        checked={headerRow}
                                        onChange={e => setHeaderRow(e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Header Row
                                </label>
                            </div>
                        </div>

                        {/* Tablo grid */}
                        <div style={{
                            marginBottom: '16px',
                            overflowX: 'auto',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0,0,0,0.2)'
                        }}>
                            <table style={{
                                borderCollapse: 'collapse',
                                width: '100%',
                                minWidth: cols * 100
                            }}>
                                <tbody>
                                    {Array.from({ length: rows }, (_, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {Array.from({ length: cols }, (_, colIndex) => (
                                                <td
                                                    key={colIndex}
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                    style={{
                                                        border: `1px solid ${colors.border}`,
                                                        padding: 0,
                                                        backgroundColor: headerRow && rowIndex === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                        fontWeight: headerRow && rowIndex === 0 ? '700' : '400',
                                                        cursor: 'text',
                                                        height: '32px',
                                                        minWidth: '80px',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    {activeCell?.row === rowIndex && activeCell?.col === colIndex ? (
                                                        <input
                                                            ref={inputRef}
                                                            type="text"
                                                            value={cellData[rowIndex]?.[colIndex] || ''}
                                                            onChange={e => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, rowIndex, colIndex)}
                                                            onBlur={() => setActiveCell(null)}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                padding: '6px 8px',
                                                                backgroundColor: colors.inputBg,
                                                                color: colors.textMain,
                                                                border: `2px solid ${colors.accent}`,
                                                                outline: 'none',
                                                                fontFamily: 'inherit',
                                                                fontSize: '11px',
                                                                fontWeight: headerRow && rowIndex === 0 ? '700' : '400',
                                                                boxSizing: 'border-box',
                                                                display: 'block'
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            padding: '6px 8px',
                                                            width: '100%',
                                                            height: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            color: colors.textMain,
                                                            fontSize: '11px'
                                                        }}>
                                                            {cellData[rowIndex]?.[colIndex] || ''}
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ fontSize: '10px', color: colors.textDim, marginBottom: '24px', display: 'flex', gap: '16px' }}>
                            <span>• Tab: Next Cell</span>
                            <span>• Enter: Next Row</span>
                            <span>• Arrows: Navigate</span>
                            <span>• Esc: Stop Editing</span>
                        </div>

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={onClose}
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
                                type="submit"
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
                                SAVE CHANGES
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TableEditDialog;
