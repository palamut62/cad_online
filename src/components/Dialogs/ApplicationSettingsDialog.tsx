import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAI } from '../../context/AIContext';

interface ApplicationSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
}

const ApplicationSettingsDialog: React.FC<ApplicationSettingsDialogProps> = ({ isOpen, onClose, initialTab = 'ai' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [capabilityFilter, setCapabilityFilter] = useState<'all' | 'text' | 'code' | 'vm'>('all');

    // Test state
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const { apiKey, setApiKey, selectedModel, setSelectedModel, systemPrompt, setSystemPrompt, availableModels, refreshModels, isLoading, error, testModel } = useAI();

    // Local state for form management (AI)
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [localModel, setLocalModel] = useState(selectedModel);
    const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
    const [showKey, setShowKey] = useState(false);

    // Filtering state
    const [searchTerm, setSearchTerm] = useState('');
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

    useEffect(() => {
        if (isOpen) {
            setLocalApiKey(apiKey);
            setLocalModel(selectedModel);
            setLocalSystemPrompt(systemPrompt);
            setSearchTerm('');
            setPriceFilter('all');
            setCapabilityFilter('all');
            setTestResult(null);
        }
    }, [isOpen, apiKey, selectedModel, systemPrompt]);

    useEffect(() => {
        if (isOpen && apiKey && availableModels.length === 0) {
            refreshModels();
        }
    }, [isOpen, apiKey, availableModels.length, refreshModels]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setApiKey(localApiKey);
        setSelectedModel(localModel);
        setSystemPrompt(localSystemPrompt);
        onClose();
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const result = await testModel(localApiKey, localModel);
        setTestResult(result);
        setIsTesting(false);
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Filter Logic
    const filteredModels = availableModels.filter(model => {
        // Text Search
        const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            model.id.toLowerCase().includes(searchTerm.toLowerCase());

        // Price Filter
        let matchesPrice = true;
        const isFree = model.pricing.prompt === '0' && model.pricing.completion === '0';
        if (priceFilter === 'free') matchesPrice = isFree;
        if (priceFilter === 'paid') matchesPrice = !isFree;

        // Capability Filter (Heuristic)
        let matchesCapability = true;
        if (capabilityFilter !== 'all') {
            const id = model.id.toLowerCase();
            const name = model.name.toLowerCase();
            if (capabilityFilter === 'code') {
                matchesCapability = id.includes('code') || name.includes('code') || id.includes('phind') || id.includes('wizard');
            } else if (capabilityFilter === 'vm') { // Vision/Multimodal
                matchesCapability = id.includes('vision') || id.includes('gemini') || id.includes('claude-3') || id.includes('gpt-4-turbo') || id.includes('gpt-4o') || id.includes('llava');
            } else if (capabilityFilter === 'text') {
                const isCode = id.includes('code') || name.includes('code') || id.includes('phind') || id.includes('wizard');
                const isVM = id.includes('vision') || id.includes('gemini') || id.includes('claude-3') || id.includes('gpt-4-turbo') || id.includes('gpt-4o') || id.includes('llava');
                matchesCapability = !isCode && !isVM;
            }
        }

        return matchesSearch && matchesPrice && matchesCapability;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const currentModelDetails = availableModels.find(m => m.id === localModel);

    if (!isOpen) return null;

    // Application Consistent Palette
    const colors = {
        bg: 'rgba(30, 30, 31, 0.98)',
        surface: 'rgba(45, 45, 48, 0.5)',
        border: 'rgba(255, 255, 255, 0.1)',
        accent: '#4cc2ff', // Application main blue
        textMain: '#ececec',
        textDim: '#999999',
        error: '#ff6b6b',
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
                zIndex: 9999,
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                style={{
                    backgroundColor: colors.bg,
                    width: '600px',
                    maxHeight: '80vh',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    overflow: 'hidden',
                    overflowX: 'hidden', // Explicitly prevent horizontal scroll
                    fontFamily: "'Consolas', 'Monaco', monospace",
                    backdropFilter: colors.glass
                }}
            >

                {/* Header: Minimal & Integrated */}
                <div
                    style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        borderBottom: `1px solid ${colors.border}`
                    }}
                >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: colors.accent, display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                        <span className="material-icons" style={{ fontSize: '14px' }}>settings</span>
                        SETTINGS / AYARLAR
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer', padding: '0', display: 'flex', opacity: 0.6 }}
                    >
                        <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

                {/* Navigation: Breadcrumb style tabs */}
                <div
                    style={{
                        padding: '8px 16px',
                        display: 'flex',
                        gap: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderBottom: `1px solid ${colors.border}`
                    }}
                >
                    {[
                        { id: 'general', label: 'GENEL' },
                        { id: 'ai', label: 'AI / YAPAY ZEKA' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: activeTab === tab.id ? colors.textMain : colors.textDim,
                                fontWeight: activeTab === tab.id ? '700' : 'normal',
                                cursor: 'pointer',
                                fontSize: '10px',
                                padding: '4px 0',
                                borderBottom: `1px solid ${activeTab === tab.id ? colors.accent : 'transparent'}`,
                                transition: 'all 0.15s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto', overflowX: 'hidden', flex: 1 }} className="custom-scrollbar">
                    {activeTab === 'general' && (
                        <div style={{ color: colors.textDim, textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <span className="material-icons" style={{ fontSize: '40px', color: colors.border }}>settings_applications</span>
                            </div>
                            <div>
                                <h4 style={{ color: '#fff', margin: '0 0 8px 0' }}>Uygulama Ayarları</h4>
                                <p style={{ margin: 0, fontSize: '13px' }}>Genel uygulama tercihleri bir sonraki güncelleme ile burada yer alacak.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* API Key Section */}
                            <div className="settings-section">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: colors.accent }}>
                                    API KEY / ANAHTAR
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={localApiKey}
                                        onChange={e => setLocalApiKey(e.target.value)}
                                        placeholder="sk-or-v1-..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            paddingRight: '40px',
                                            backgroundColor: colors.surface,
                                            color: colors.textMain,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            fontFamily: 'inherit'
                                        }}
                                        className="modern-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textDim, cursor: 'pointer' }}
                                    >
                                        <span className="material-icons" style={{ fontSize: '20px' }}>{showKey ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1 1 200px', minWidth: '0' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: colors.textDim }}>PRICE / FİYAT</label>
                                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
                                        {[
                                            { id: 'all', label: 'ALL' },
                                            { id: 'free', label: 'FREE' },
                                            { id: 'paid', label: 'PAID' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setPriceFilter(f.id as any)}
                                                style={{
                                                    flex: 1,
                                                    padding: '4px 0',
                                                    backgroundColor: priceFilter === f.id ? colors.accent : 'transparent',
                                                    color: priceFilter === f.id ? '#000' : colors.textDim,
                                                    border: 'none',
                                                    borderRadius: '2px',
                                                    cursor: 'pointer',
                                                    fontSize: '9px',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ flex: '1 1 200px', minWidth: '0' }}>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: colors.textDim }}>TYPE / YETENEK</label>
                                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '2px', border: `1px solid ${colors.border}`, borderRadius: '4px' }}>
                                        {[
                                            { id: 'all', label: 'ALL' },
                                            { id: 'text', icon: 'chat' },
                                            { id: 'code', icon: 'code' },
                                            { id: 'vm', icon: 'visibility' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setCapabilityFilter(f.id as any)}
                                                style={{
                                                    flex: 1,
                                                    padding: '4px 0',
                                                    backgroundColor: capabilityFilter === f.id ? colors.accent : 'transparent',
                                                    color: capabilityFilter === f.id ? '#000' : colors.textDim,
                                                    border: 'none',
                                                    borderRadius: '2px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                {f.id === 'all' ? <span style={{ fontSize: '9px', fontWeight: '700' }}>ALL</span> : <span className="material-icons" style={{ fontSize: '14px' }}>{f.icon}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Model Selection Group */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '600', color: colors.textDim }}>MODEL SEÇİMİ</label>

                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input
                                            type="text"
                                            placeholder="FIND MODEL..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px 8px 30px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '4px', color: colors.textMain, fontSize: '11px', outline: 'none' }}
                                        />
                                        <span className="material-icons" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: colors.textDim }}>search</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => refreshModels(localApiKey)}
                                        disabled={isLoading}
                                        style={{
                                            width: '32px',
                                            background: colors.surface,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: colors.accent,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span className={`material-icons ${isLoading ? 'spin-icon' : ''}`} style={{ fontSize: '16px' }}>refresh</span>
                                    </button>
                                </div>

                                {isLoading ? (
                                    <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: colors.textDim }}>
                                        <span className="material-icons spin-icon" style={{ fontSize: '24px', marginBottom: '8px', color: colors.accent }}>sync</span>
                                        <p style={{ margin: 0, fontSize: '13px' }}>Modeller yükleniyor...</p>
                                    </div>
                                ) : error ? (
                                    <div style={{ padding: '12px', textAlign: 'center', background: 'rgba(250, 82, 82, 0.1)', borderRadius: '8px', border: '1px solid rgba(250, 82, 82, 0.2)', color: colors.error, fontSize: '13px' }}>
                                        <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>warning</span>
                                        {error}
                                    </div>
                                ) : (
                                    <select
                                        value={localModel}
                                        onChange={e => setLocalModel(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: colors.surface,
                                            color: colors.textMain,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            appearance: 'none',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        {availableModels.length > 0 ? (
                                            <>
                                                {!filteredModels.find(m => m.id === localModel) && localModel && (
                                                    <option value={localModel}>{localModel} (Seçili model filtre dışı)</option>
                                                )}
                                                {filteredModels.map(model => (
                                                    <option key={model.id} value={model.id}>{model.name}</option>
                                                ))}
                                                {filteredModels.length === 0 && (
                                                    <option disabled>Filtreye uygun model yok</option>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <option value={localModel}>{localModel}</option>
                                                <option disabled>Model yok, lütfen yenileyin</option>
                                            </>
                                        )}
                                    </select>
                                )}

                                {/* Model Card */}
                                {currentModelDetails && (
                                    <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                                                <span style={{ color: colors.textDim, fontSize: '9px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>BAĞLAM (CTX)</span>
                                                <span style={{ color: colors.accent, fontSize: '13px' }}>{currentModelDetails.context_length ? (currentModelDetails.context_length / 1024).toFixed(0) + 'k' : 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: colors.textDim, fontSize: '10px', fontWeight: '700' }}>PROMPT</span>
                                                <span style={{ color: '#fff', fontSize: '13px' }}>{currentModelDetails.pricing?.prompt || '0'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: colors.textDim, fontSize: '10px', fontWeight: '700' }}>TAMAMLAMA</span>
                                                <span style={{ color: '#fff', fontSize: '13px' }}>{currentModelDetails.pricing?.completion || '0'}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: colors.textDim, fontSize: '10px', fontWeight: '700' }}>YETENEK</span>
                                                <span style={{ color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {currentModelDetails.id.includes('vision') ? 'Görsel' : currentModelDetails.id.includes('code') ? 'Kod' : 'Metin'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Model Test Action */}
                                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={handleTest}
                                                disabled={isTesting || !localApiKey}
                                                style={{
                                                    backgroundColor: 'rgba(76, 194, 255, 0.1)',
                                                    border: `1px solid ${colors.accent}`,
                                                    color: colors.accent,
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: localApiKey ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    opacity: localApiKey ? 1 : 0.5
                                                }}
                                            >
                                                {isTesting ? <span className="material-icons spin-icon" style={{ fontSize: '14px' }}>sync</span> : <span className="material-icons" style={{ fontSize: '14px' }}>play_arrow</span>}
                                                MODELİ TEST ET
                                            </button>

                                            {testResult && (
                                                <div style={{
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    backgroundColor: testResult.success ? 'rgba(76, 255, 166, 0.05)' : 'rgba(255, 107, 107, 0.05)',
                                                    border: `1px solid ${testResult.success ? 'rgba(76, 255, 166, 0.2)' : 'rgba(255, 107, 107, 0.2)'}`,
                                                    color: testResult.success ? '#4cffa6' : '#ff6b6b'
                                                }}>
                                                    <div style={{ fontWeight: '700', marginBottom: '2px', fontSize: '9px' }}>
                                                        {testResult.success ? 'TEST BAŞARILI' : 'TEST HATASI'}
                                                    </div>
                                                    {testResult.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* System Prompt Section */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: colors.textDim }}>SİSTEM TALİMATI (ROLS)</label>
                                    <button type="button" onClick={() => setLocalSystemPrompt('')} style={{ fontSize: '11px', color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Sıfırla</button>
                                </div>
                                <textarea
                                    value={localSystemPrompt}
                                    onChange={e => setLocalSystemPrompt(e.target.value)}
                                    placeholder="Varsayılan CAD asistanı talimatlarını kullanmak için boş bırakın."
                                    style={{ width: '100%', height: '70px', padding: '12px', backgroundColor: colors.surface, color: '#ccc', border: `1px solid ${colors.border}`, borderRadius: '8px', resize: 'none', fontFamily: 'inherit', fontSize: '12px', outline: 'none' }}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                                <button type="button" onClick={onClose} style={{ padding: '6px 16px', backgroundColor: 'transparent', color: colors.textDim, border: `1px solid ${colors.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>CANCEL / İPTAL</button>
                                <button type="submit" style={{ padding: '6px 20px', backgroundColor: colors.accent, color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '10px' }}>SAVE / KAYDET</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            <style>{`
                .spin-icon {
                    animation: spin 1.2s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .modern-input:focus {
                    border-color: #4cc2ff !important;
                    background-color: #2c2e33 !important;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.2);
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ApplicationSettingsDialog;
