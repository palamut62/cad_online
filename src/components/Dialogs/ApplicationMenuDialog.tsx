import React from 'react';
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

    return (
        <div className="app-menu-dialog-overlay" onClick={onClose}>
            <div className="app-menu-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="app-menu-header">
                    <span className="app-menu-title">Uygulama Menüsü</span>
                    <span className="material-icons app-menu-close" onClick={onClose}>close</span>
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
                            <span className="material-icons">help_outline</span>
                            <div className="app-menu-item-text">
                                <span className="app-menu-item-title">Yardım</span>
                                <span className="app-menu-item-desc">Kullanım kılavuzu ve destek</span>
                            </div>
                        </div>
                    </div>
                    <div className="app-menu-divider"></div>
                    <div className="app-menu-section">
                        <div className="app-menu-item app-menu-item-exit" onClick={() => window.close()}>
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
    );
};

export default ApplicationMenuDialog;
