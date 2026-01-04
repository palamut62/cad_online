
import React, { useState, useEffect, useRef } from 'react';

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
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                    Tablo Düzenle
                </h3>
                <form onSubmit={handleSubmit}>
                    {/* Ölçekleme */}
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#363636', borderRadius: '4px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>Ölçek:</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {SCALE_PRESETS.map(preset => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => applyScale(preset.value)}
                                    style={{
                                        padding: '4px 10px',
                                        backgroundColor: scaleInput === String(preset.value * 100) ? '#4cc2ff' : '#444',
                                        color: scaleInput === String(preset.value * 100) ? 'black' : 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="number"
                                    min="10"
                                    max="500"
                                    value={scaleInput}
                                    onChange={e => handleScaleInputChange(e.target.value)}
                                    style={{ width: '60px', padding: '4px 6px', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '3px', fontSize: '12px' }}
                                />
                                <span style={{ fontSize: '12px', color: '#888' }}>%</span>
                            </div>
                        </div>
                    </div>

                    {/* Tablo özellikleri */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 100px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Satır:</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={rows}
                                onChange={e => setRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                                style={{ width: '100%', padding: '6px', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '3px' }}
                            />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Sütun:</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={cols}
                                onChange={e => setCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                style={{ width: '100%', padding: '6px', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '3px' }}
                            />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Satır Yük.:</label>
                            <input
                                type="number"
                                min="1"
                                value={rowHeight}
                                onChange={e => setRowHeight(parseFloat(e.target.value) || 10)}
                                style={{ width: '100%', padding: '6px', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '3px' }}
                            />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Sütun Gen.:</label>
                            <input
                                type="number"
                                min="1"
                                value={colWidth}
                                onChange={e => setColWidth(parseFloat(e.target.value) || 30)}
                                style={{ width: '100%', padding: '6px', backgroundColor: '#444', color: 'white', border: '1px solid #555', borderRadius: '3px' }}
                            />
                        </div>
                        <div style={{ flex: '1 1 100px', display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                            <input
                                type="checkbox"
                                id="headerRow"
                                checked={headerRow}
                                onChange={e => setHeaderRow(e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            <label htmlFor="headerRow" style={{ fontSize: '12px' }}>Başlık Satırı</label>
                        </div>
                    </div>

                    {/* Tablo grid */}
                    <div style={{
                        marginBottom: '20px',
                        overflowX: 'auto',
                        border: '1px solid #555',
                        borderRadius: '4px'
                    }}>
                        <table style={{
                            borderCollapse: 'collapse',
                            width: '100%',
                            minWidth: cols * 80
                        }}>
                            <tbody>
                                {Array.from({ length: rows }, (_, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {Array.from({ length: cols }, (_, colIndex) => (
                                            <td
                                                key={colIndex}
                                                onClick={() => handleCellClick(rowIndex, colIndex)}
                                                style={{
                                                    border: '1px solid #555',
                                                    padding: 0,
                                                    backgroundColor: headerRow && rowIndex === 0 ? '#3a3a3a' : '#2d2d2d',
                                                    fontWeight: headerRow && rowIndex === 0 ? 'bold' : 'normal',
                                                    cursor: 'text'
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
                                                            padding: '6px 8px',
                                                            backgroundColor: '#4a4a4a',
                                                            color: 'white',
                                                            border: '2px solid #4cc2ff',
                                                            outline: 'none',
                                                            fontWeight: headerRow && rowIndex === 0 ? 'bold' : 'normal'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        padding: '6px 8px',
                                                        minHeight: '20px',
                                                        minWidth: '60px'
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

                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '15px' }}>
                        Tab: Sonraki hücre | Enter: Alt satır | Ok tuşları: Gezinme | Esc: Düzenlemeyi kapat
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '8px 16px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            style={{ padding: '8px 16px', backgroundColor: '#4cc2ff', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TableEditDialog;
