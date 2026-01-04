
import React, { useState, useEffect } from 'react';

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
                width: '300px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                    Tablo Oluştur
                </h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Satır Sayısı:</label>
                            <input
                                type="number"
                                min="1"
                                value={rows}
                                onChange={e => setRows(parseInt(e.target.value) || 1)}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: 'white', border: '1px solid #555' }}
                                autoFocus
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Sütun Sayısı:</label>
                            <input
                                type="number"
                                min="1"
                                value={cols}
                                onChange={e => setCols(parseInt(e.target.value) || 1)}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: 'white', border: '1px solid #555' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Satır Yüksekliği:</label>
                            <input
                                type="number"
                                min="1"
                                value={rowHeight}
                                onChange={e => setRowHeight(parseFloat(e.target.value) || 1)}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: 'white', border: '1px solid #555' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Sütun Genişliği:</label>
                            <input
                                type="number"
                                min="1"
                                value={colWidth}
                                onChange={e => setColWidth(parseFloat(e.target.value) || 1)}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#444', color: 'white', border: '1px solid #555' }}
                            />
                        </div>
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
                            Oluştur
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TableInputDialog;
