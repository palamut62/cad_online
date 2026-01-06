import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useDrawing } from '../../context/DrawingContext';

interface ApplicationMenuDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const ApplicationMenuDialog: React.FC<ApplicationMenuDialogProps> = ({ isOpen, onClose }) => {
    const {
        addSheet,
        activeSheetId,
        sheets,
        loadProject,
        setPrintDialogState
    } = useDrawing();

    if (!isOpen) return null;

    // Design Tokens
    const colors = {
        bg: 'rgba(30, 30, 31, 0.98)',
        surface: 'rgba(45, 45, 48, 0.5)',
        border: 'rgba(255, 255, 255, 0.1)',
        accent: '#4cc2ff',
        textMain: '#ececec',
        textDim: '#999999',
        error: '#ff6b6b',
        glass: 'blur(16px)',
        hoverBg: 'rgba(255, 255, 255, 0.05)'
    };

    // Dosya İşlemleri
    const handleNew = () => {
        addSheet(); // Yeni sayfa ekle
        onClose();
    };

    const handleSave = () => {
        // Aktif projeyi JSON olarak kaydet
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
        onClose();
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
        onClose();
    };

    const handlePrint = () => {
        setPrintDialogState({ isOpen: true });
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const MenuItem = ({ icon, title, desc, onClick, isExit = false }: { icon: string, title: string, desc: string, onClick?: () => void, isExit?: boolean }) => {
        const [isHovered, setIsHovered] = useState(false);

        return (
            <div
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    backgroundColor: isHovered ? (isExit ? 'rgba(255, 107, 107, 0.1)' : colors.hoverBg) : 'transparent',
                    borderLeft: isHovered ? `3px solid ${isExit ? colors.error : colors.accent}` : '3px solid transparent'
                }}
            >
                <span className="material-icons" style={{
                    fontSize: '24px',
                    color: isExit ? colors.error : colors.accent,
                    marginRight: '16px',
                    opacity: 0.9
                }}>
                    {icon}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: isExit ? colors.error : colors.textMain,
                        marginBottom: '4px'
                    }}>
                        {title}
                    </span>
                    <span style={{ fontSize: '11px', color: colors.textDim }}>
                        {desc}
                    </span>
                </div>
            </div>
        );
    };

    const Divider = () => (
        <div style={{ height: '1px', backgroundColor: colors.border, margin: '8px 0' }} />
    );

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
                zIndex: 3000, // Higher than other dialogs
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    height: '100%',
                    width: '320px',
                    backgroundColor: colors.bg,
                    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                    borderRight: `1px solid ${colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "'Consolas', 'Monaco', monospace",
                    backdropFilter: colors.glass,
                    animation: 'slideIn 0.3s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: colors.textMain, letterSpacing: '1px' }}>
                        APPLICATION MENU
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: colors.textDim,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span className="material-icons" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                    <MenuItem
                        icon="note_add"
                        title="New"
                        desc="Create a new drawing"
                        onClick={handleNew}
                    />
                    <MenuItem
                        icon="folder_open"
                        title="Open"
                        desc="Open an existing file"
                        onClick={handleOpen}
                    />
                    <MenuItem
                        icon="save"
                        title="Save"
                        desc="Save current drawing"
                        onClick={handleSave}
                    />
                    <MenuItem
                        icon="save_as"
                        title="Save As"
                        desc="Save with a new name"
                        onClick={handleSave}
                    />

                    <Divider />

                    <MenuItem
                        icon="print"
                        title="Print / Plot"
                        desc="Print drawing or save as PDF"
                        onClick={handlePrint}
                    />
                    <MenuItem
                        icon="publish"
                        title="Export"
                        desc="Export to DXF, PDF or other formats"
                    />

                    <Divider />

                    <MenuItem
                        icon="help_outline"
                        title="Help"
                        desc="User guide and support"
                    />

                    <Divider />

                    <MenuItem
                        icon="exit_to_app"
                        title="Exit"
                        desc="Close the application"
                        onClick={() => window.close()}
                        isExit={true}
                    />
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px',
                    borderTop: `1px solid ${colors.border}`,
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <span style={{ fontSize: '11px', color: colors.textDim }}>CAD Online v1.0.1</span>
                </div>
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ApplicationMenuDialog;
