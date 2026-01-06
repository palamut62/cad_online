import React, { useState } from 'react';
import { AGENT_DESCRIPTIONS } from '../../types/aiTypes';
import { useAI } from '../../context/AIContext';

interface AgentHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const AgentHistoryDialog: React.FC<AgentHistoryDialogProps> = ({ isOpen, onClose }) => {
    const { agentHistory, clearHistory } = useAI();
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    if (!isOpen) return null;

    const toggleExpand = (id: string) => {
        setExpandedEntryId(expandedEntryId === id ? null : id);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
    };

    const formatDuration = (ms: number) => {
        if (!ms) return '-';
        return `${(ms / 1000).toFixed(1)}s`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                width: '800px',
                maxHeight: '85vh',
                backgroundColor: '#1E1E1E',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="material-icons" style={{ color: '#4cc2ff' }}>history</span>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                            Agent İşlem Geçmişi
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.6)'
                        }}>
                            {agentHistory.length} kayıt
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {agentHistory.length > 0 && (
                            <button
                                onClick={clearHistory}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 107, 107, 0.3)',
                                    background: 'rgba(255, 107, 107, 0.1)',
                                    color: '#ff6b6b',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '14px' }}>delete_outline</span>
                                Geçmişi Temizle
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {agentHistory.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: 'rgba(255, 255, 255, 0.3)',
                            fontStyle: 'italic'
                        }}>
                            <span className="material-icons" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}>history_toggle_off</span>
                            <br />
                            Henüz işlem geçmişi yok
                        </div>
                    ) : (
                        agentHistory.map((entry) => (
                            <div key={entry.id} style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                overflow: 'hidden'
                            }}>
                                {/* Entry Header */}
                                <div
                                    onClick={() => toggleExpand(entry.id)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: expandedEntryId === entry.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{
                                            color: '#fff',
                                            fontWeight: 500,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ color: '#4cc2ff' }}>"{entry.userPrompt}"</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons" style={{ fontSize: '12px' }}>schedule</span>
                                                {formatDate(entry.timestamp)}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons" style={{ fontSize: '12px' }}>smart_toy</span>
                                                {entry.modelUsed.replace('google/', '').replace('meta-llama/', '').split(':')[0]}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons" style={{ fontSize: '12px' }}>timer</span>
                                                {formatDuration(entry.orchestrationResult.totalDuration)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="material-icons" style={{
                                        color: 'rgba(255, 255, 255, 0.3)',
                                        transform: expandedEntryId === entry.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}>
                                        expand_more
                                    </span>
                                </div>

                                {/* Entry Details */}
                                {expandedEntryId === entry.id && (
                                    <div style={{
                                        padding: '16px',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: 'rgba(0, 0, 0, 0.2)'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Results Grid */}
                                            {entry.orchestrationResult.agentResults.map((result, idx) => {
                                                const agentInfo = AGENT_DESCRIPTIONS[result.agent];
                                                return (
                                                    <div key={idx} style={{
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        padding: '12px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '8px',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                            paddingBottom: '8px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span className="material-icons" style={{ fontSize: '16px', color: '#4cc2ff' }}>
                                                                    {agentInfo?.icon || 'smart_toy'}
                                                                </span>
                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>
                                                                    {agentInfo?.name || result.agent}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    color: result.success ? '#4cffa6' : '#ff6b6b',
                                                                    background: result.success ? 'rgba(76, 255, 166, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    {result.success ? 'BAŞARILI' : 'HATA'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                                                                    {formatDuration(result.duration || 0)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Output Preview */}
                                                        <div style={{ position: 'relative' }}>
                                                            <pre style={{
                                                                margin: 0,
                                                                padding: '10px',
                                                                background: '#111',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                color: '#a0a0a0',
                                                                overflowX: 'auto',
                                                                fontFamily: 'Consolas, monospace',
                                                                maxHeight: '200px'
                                                            }}>
                                                                {result.output}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentHistoryDialog;
