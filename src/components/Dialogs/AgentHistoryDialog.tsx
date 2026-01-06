import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AGENT_DESCRIPTIONS, AgentHistoryEntry } from '../../types/aiTypes';
import { useAI } from '../../context/AIContext';

interface AgentHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const AgentHistoryDialog: React.FC<AgentHistoryDialogProps> = ({ isOpen, onClose }) => {
    const { agentHistory, clearHistory, deleteHistoryEntry } = useAI();
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

    if (!isOpen) return null;

    const toggleExpand = (id: string) => {
        setExpandedEntryId(expandedEntryId === id ? null : id);
    };

    const toggleDetails = (resultIndex: number) => {
        setExpandedDetails(prev => ({
            ...prev,
            [resultIndex]: !prev[resultIndex]
        }));
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

    const handleCopyAll = (entry: AgentHistoryEntry, e: React.MouseEvent) => {
        e.stopPropagation();

        let fullText = `User Prompt: ${entry.userPrompt}\n`;
        fullText += `Model: ${entry.modelUsed}\n`;
        fullText += `Date: ${formatDate(entry.timestamp)}\n\n`;
        fullText += `===========================================\n\n`;

        entry.orchestrationResult.agentResults.forEach((result, idx) => {
            const agentInfo = AGENT_DESCRIPTIONS[result.agent];
            fullText += `### STEP ${idx + 1}: ${agentInfo?.name || result.agent}\n`;
            if (result.systemPrompt) {
                fullText += `--- SYSTEM PROMPT ---\n${result.systemPrompt}\n\n`;
            }
            if (result.userPrompt) {
                fullText += `--- INPUT ---\n${result.userPrompt}\n\n`;
            }
            fullText += `--- OUTPUT ---\n${result.output}\n`;
            if (result.error) {
                fullText += `--- ERROR ---\n${result.error}\n`;
            }
            fullText += `\n===========================================\n\n`;
        });

        navigator.clipboard.writeText(fullText).then(() => {
            alert('Full conversation copied to clipboard!');
        });
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

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
        glass: 'blur(16px)'
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
                    width: '900px',
                    maxHeight: '85vh',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    overflow: 'hidden',
                    fontFamily: "'Consolas', 'Monaco', monospace",
                    backdropFilter: colors.glass
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
                        <span className="material-icons" style={{ color: colors.accent, fontSize: '18px' }}>history</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: colors.textMain, letterSpacing: '0.5px' }}>
                            AGENT HISTORY / İŞLEM GEÇMİŞİ
                        </span>
                        <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: colors.textDim
                        }}>
                            {agentHistory.length}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {agentHistory.length > 0 && (
                            <button
                                onClick={clearHistory}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: `1px solid rgba(255, 107, 107, 0.3)`,
                                    background: 'rgba(255, 107, 107, 0.1)',
                                    color: colors.error,
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span className="material-icons" style={{ fontSize: '12px' }}>delete</span>
                                CLEAR
                            </button>
                        )}
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
                            <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="custom-scrollbar" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {agentHistory.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px',
                            color: colors.textDim,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span className="material-icons" style={{ fontSize: '48px', opacity: 0.2 }}>history_toggle_off</span>
                            <span style={{ fontSize: '12px' }}>Henüz işlem kaydı bulunmamaktadır.</span>
                        </div>
                    ) : (
                        agentHistory.map((entry) => (
                            <div key={entry.id} style={{
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '6px',
                                border: `1px solid ${expandedEntryId === entry.id ? colors.accent : colors.border}`,
                                overflow: 'hidden',
                                transition: 'all 0.2s ease'
                            }}>
                                {/* Entry Header */}
                                <div
                                    onClick={() => toggleExpand(entry.id)}
                                    style={{
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: expandedEntryId === entry.id ? 'rgba(76, 194, 255, 0.05)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                        <div style={{
                                            color: colors.textMain,
                                            fontWeight: '600',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ color: colors.accent, fontWeight: '700' }}>PROMPT:</span>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                                                "{entry.userPrompt}"
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: colors.textDim }}>
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

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {expandedEntryId === entry.id && (
                                            <button
                                                onClick={(e) => handleCopyAll(entry, e)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    border: `1px solid ${colors.accent}`,
                                                    background: 'rgba(76, 194, 255, 0.1)',
                                                    color: colors.accent,
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <span className="material-icons" style={{ fontSize: '12px' }}>content_copy</span>
                                                COPY ALL
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteHistoryEntry(entry.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: colors.textDim,
                                                display: 'flex',
                                                alignItems: 'center',
                                                opacity: 0.6,
                                                transition: 'all 0.2s',
                                                borderRadius: '4px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = colors.error;
                                                e.currentTarget.style.opacity = '1';
                                                e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = colors.textDim;
                                                e.currentTarget.style.opacity = '0.6';
                                                e.currentTarget.style.background = 'none';
                                            }}
                                            title="Delete Entry"
                                        >
                                            <span className="material-icons" style={{ fontSize: '18px' }}>delete_outline</span>
                                        </button>
                                        <span className="material-icons" style={{
                                            color: colors.textDim,
                                            fontSize: '20px',
                                            transform: expandedEntryId === entry.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }}>
                                            expand_more
                                        </span>
                                    </div>
                                </div>

                                {/* Entry Details */}
                                {expandedEntryId === entry.id && (
                                    <div className="custom-scrollbar" style={{
                                        padding: '16px',
                                        borderTop: `1px solid ${colors.border}`,
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        maxHeight: '450px',
                                        overflowY: 'auto'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Results Grid */}
                                            {entry.orchestrationResult.agentResults.map((result, idx) => {
                                                const agentInfo = AGENT_DESCRIPTIONS[result.agent];
                                                const detailsKey = `${entry.id}-${idx}`;
                                                const isDetailed = expandedDetails[detailsKey];

                                                return (
                                                    <div key={idx} style={{
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        borderRadius: '6px',
                                                        border: `1px solid ${colors.border}`,
                                                        padding: '12px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '8px',
                                                            borderBottom: `1px solid ${colors.border}`,
                                                            paddingBottom: '8px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span className="material-icons" style={{ fontSize: '16px', color: colors.accent }}>
                                                                    {agentInfo?.icon || 'smart_toy'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', fontWeight: '700', color: colors.textMain }}>
                                                                    {agentInfo?.name || result.agent}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                {/* Only show details toggle if prompts exist */}
                                                                {(result.systemPrompt || result.userPrompt) && (
                                                                    <button
                                                                        onClick={() => toggleDetails(detailsKey as any)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: colors.textDim,
                                                                            cursor: 'pointer',
                                                                            fontSize: '10px',
                                                                            textDecoration: 'underline',
                                                                            padding: 0
                                                                        }}
                                                                    >
                                                                        {isDetailed ? 'Hide Details' : 'Show Details'}
                                                                    </button>
                                                                )}
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: '700',
                                                                    color: result.success ? colors.success : colors.error,
                                                                    background: result.success ? 'rgba(76, 255, 166, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '2px'
                                                                }}>
                                                                    {result.success ? 'SUCCESS' : 'ERROR'}
                                                                </span>
                                                                <span style={{ fontSize: '10px', color: colors.textDim }}>
                                                                    {formatDuration(result.duration || 0)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Details View */}
                                                        {isDetailed && (
                                                            <div style={{
                                                                marginBottom: '12px',
                                                                paddingBottom: '12px',
                                                                borderBottom: `1px solid ${colors.border}`,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '8px'
                                                            }}>
                                                                {result.systemPrompt && (
                                                                    <div>
                                                                        <div style={{ fontSize: '10px', color: colors.accent, marginBottom: '4px', fontWeight: '700' }}>SYSTEM PROMPT:</div>
                                                                        <pre style={{
                                                                            margin: 0,
                                                                            padding: '8px',
                                                                            background: 'rgba(0,0,0,0.3)',
                                                                            borderRadius: '4px',
                                                                            fontSize: '10px',
                                                                            color: colors.textDim,
                                                                            whiteSpace: 'pre-wrap',
                                                                            wordBreak: 'break-word',
                                                                            maxHeight: '150px',
                                                                            overflowY: 'auto'
                                                                        }}>{result.systemPrompt}</pre>
                                                                    </div>
                                                                )}
                                                                {result.userPrompt && (
                                                                    <div>
                                                                        <div style={{ fontSize: '10px', color: colors.accent, marginBottom: '4px', fontWeight: '700' }}>INPUT:</div>
                                                                        <pre style={{
                                                                            margin: 0,
                                                                            padding: '8px',
                                                                            background: 'rgba(0,0,0,0.3)',
                                                                            borderRadius: '4px',
                                                                            fontSize: '10px',
                                                                            color: colors.textDim,
                                                                            whiteSpace: 'pre-wrap',
                                                                            wordBreak: 'break-word',
                                                                            maxHeight: '150px',
                                                                            overflowY: 'auto'
                                                                        }}>{result.userPrompt}</pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Output Preview */}
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: colors.textDim, marginBottom: '4px' }}>OUTPUT:</div>
                                                            <pre style={{
                                                                margin: 0,
                                                                padding: '10px',
                                                                background: '#111',
                                                                borderRadius: '4px',
                                                                fontSize: '10px',
                                                                color: '#c0c0c0',
                                                                overflowX: 'auto',
                                                                fontFamily: 'Consolas, monospace',
                                                                maxHeight: '200px',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-all'
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
        </div>,
        document.body
    );
};

export default AgentHistoryDialog;
