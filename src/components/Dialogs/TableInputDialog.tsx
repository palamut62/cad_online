import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TableInputDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { rows: number; cols: number; rowHeight: number; colWidth: number }) => void;
    initialValues?: { rows?: number; cols?: number; rowHeight?: number; colWidth?: number };
}

const TableInputDialog: React.FC<TableInputDialogProps> = ({ isOpen, onClose, onSubmit, initialValues }) => {
    const [rows, setRows] = useState(4);
    const [cols, setCols] = useState(4);
    const [rowHeight, setRowHeight] = useState(10);
    const [colWidth, setColWidth] = useState(30);

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
        marginBottom: '6px',
        fontSize: '11px',
        color: colors.textDim
    };

    useEffect(() => {
        if (isOpen) {
            setRows(initialValues?.rows || 4);
            setCols(initialValues?.cols || 4);
            setRowHeight(initialValues?.rowHeight || 10);
            setColWidth(initialValues?.colWidth || 30);
        }
    }, [isOpen, initialValues]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ rows, cols, rowHeight, colWidth });
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
            <div style={{
                backgroundColor: colors.bg,
                borderRadius: '8px',
                width: '320px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                border: `1px solid ${colors.border}`,
                fontFamily: "'Consolas', 'Monaco', monospace",
                backdropFilter: colors.glass,
                overflow: 'hidden'
            }}>
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>grid_on</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px', color: colors.textMain }}>NEW TABLE</span>
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

                <div style={{ padding: '24px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Rows</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={rows}
                                    onChange={e => setRows(parseInt(e.target.value) || 1)}
                                    style={inputStyle}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Columns</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cols}
                                    onChange={e => setCols(parseInt(e.target.value) || 1)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div>
                                <label style={labelStyle}>Row Height</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={rowHeight}
                                    onChange={e => setRowHeight(parseFloat(e.target.value) || 1)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Col Width</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={colWidth}
                                    onChange={e => setColWidth(parseFloat(e.target.value) || 1)}
                                    style={inputStyle}
                                />
                            </div>
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
                                CREATE
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TableInputDialog;
