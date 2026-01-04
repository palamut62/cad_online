import { useState, useRef, useEffect } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import './SheetTabs.css';

const SheetTabs = () => {
    const {
        sheets,
        activeSheetId,
        addSheet,
        removeSheet,
        switchSheet,
        renameSheet
    } = useDrawing();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const handleDoubleClick = (id: string, name: string) => {
        setEditingId(id);
        setEditValue(name);
    };

    const handleRenameSubmit = (id: string) => {
        if (editValue.trim()) {
            renameSheet(id, editValue.trim());
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            handleRenameSubmit(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleCloseClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const sheet = sheets.find(s => s.id === id);
        if (sheet?.isModified) {
            if (!window.confirm(`"${sheet.name}" değiştirilmiş. Kapatmak istediğinize emin misiniz?`)) {
                return;
            }
        }
        removeSheet(id);
    };

    return (
        <div className="sheet-tabs-container">
            <div className="sheet-tabs-list">
                {sheets.map(sheet => (
                    <div
                        key={sheet.id}
                        className={`sheet-tab ${activeSheetId === sheet.id ? 'active' : ''} ${sheet.isModified ? 'modified' : ''}`}
                        onClick={() => switchSheet(sheet.id)}
                        onDoubleClick={() => handleDoubleClick(sheet.id, sheet.name)}
                    >
                        {editingId === sheet.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                className="sheet-tab-input"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleRenameSubmit(sheet.id)}
                                onKeyDown={(e) => handleKeyDown(e, sheet.id)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <>
                                <span className="sheet-tab-name">
                                    {sheet.isModified && <span className="modified-indicator">●</span>}
                                    {sheet.name}
                                </span>
                                <button
                                    className="sheet-tab-close"
                                    onClick={(e) => handleCloseClick(e, sheet.id)}
                                    title="Kapat"
                                >
                                    ×
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <button
                className="sheet-tab-add"
                onClick={() => addSheet()}
                title="Yeni çizim sayfası ekle"
            >
                +
            </button>
        </div>
    );
};

export default SheetTabs;
