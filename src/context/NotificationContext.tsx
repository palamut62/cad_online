import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';

// Types
type DialogType = 'alert' | 'confirm' | 'info' | 'warning' | 'error';

interface DialogState {
    isOpen: boolean;
    type: DialogType;
    title: string;
    message: string;
    resolve?: (value: boolean) => void;
}

interface NotificationContextValue {
    showAlert: (title: string, message: string) => Promise<void>;
    showConfirm: (title: string, message: string) => Promise<boolean>;
    showInfo: (title: string, message: string) => Promise<void>;
    showWarning: (title: string, message: string) => Promise<void>;
    showError: (title: string, message: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

// Design tokens
const colors = {
    bg: 'rgba(30, 30, 31, 0.98)',
    surface: 'rgba(45, 45, 48, 0.9)',
    border: 'rgba(255, 255, 255, 0.15)',
    accent: '#4cc2ff',
    textMain: '#ececec',
    textDim: '#999999',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3'
};

const getIconAndColor = (type: DialogType) => {
    switch (type) {
        case 'confirm': return { icon: 'help_outline', color: colors.accent };
        case 'warning': return { icon: 'warning', color: colors.warning };
        case 'error': return { icon: 'error', color: colors.error };
        case 'info': return { icon: 'info', color: colors.info };
        default: return { icon: 'notifications', color: colors.accent };
    }
};

// Dialog Component
const NotificationDialog: React.FC<{
    state: DialogState;
    onClose: (result: boolean) => void;
}> = ({ state, onClose }) => {
    if (!state.isOpen) return null;

    const { icon, color } = getIconAndColor(state.type);
    const isConfirm = state.type === 'confirm';

    return ReactDOM.createPortal(
        <div
            onClick={() => !isConfirm && onClose(false)}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: colors.bg,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    minWidth: '320px',
                    maxWidth: '480px',
                    fontFamily: "'Segoe UI', sans-serif",
                    animation: 'scaleIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: `1px solid ${colors.border}`,
                    gap: '12px'
                }}>
                    <span className="material-icons" style={{ fontSize: '24px', color }}>
                        {icon}
                    </span>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: colors.textMain,
                        flex: 1
                    }}>
                        {state.title}
                    </span>
                </div>

                {/* Body */}
                <div style={{
                    padding: '20px',
                    color: colors.textMain,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                }}>
                    {state.message}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '16px 20px',
                    borderTop: `1px solid ${colors.border}`,
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    {isConfirm && (
                        <button
                            onClick={() => onClose(false)}
                            style={{
                                padding: '8px 20px',
                                border: `1px solid ${colors.border}`,
                                borderRadius: '4px',
                                background: 'transparent',
                                color: colors.textDim,
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.color = colors.textMain;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = colors.textDim;
                            }}
                        >
                            İptal
                        </button>
                    )}
                    <button
                        onClick={() => onClose(true)}
                        style={{
                            padding: '8px 20px',
                            border: 'none',
                            borderRadius: '4px',
                            background: color,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.85';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        {isConfirm ? 'Tamam' : 'Kapat'}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};

// Provider
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    });

    const showDialog = useCallback((type: DialogType, title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type,
                title,
                message,
                resolve
            });
        });
    }, []);

    const handleClose = useCallback((result: boolean) => {
        if (dialogState.resolve) {
            dialogState.resolve(result);
        }
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, [dialogState.resolve]);

    const value: NotificationContextValue = {
        showAlert: useCallback((title, message) => showDialog('alert', title, message).then(() => { }), [showDialog]),
        showConfirm: useCallback((title, message) => showDialog('confirm', title, message), [showDialog]),
        showInfo: useCallback((title, message) => showDialog('info', title, message).then(() => { }), [showDialog]),
        showWarning: useCallback((title, message) => showDialog('warning', title, message).then(() => { }), [showDialog]),
        showError: useCallback((title, message) => showDialog('error', title, message).then(() => { }), [showDialog])
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <NotificationDialog state={dialogState} onClose={handleClose} />
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
