import React, { useState, useEffect } from 'react';
import {
    DimensionSettings,
    DEFAULT_DIMENSION_SETTINGS,
    saveDimensionSettings,
    loadDimensionSettings,
    type ArrowStyle,
    type ArrowDirection,
    type TextAlignment,
    type DecimalFormat,
    type AngleFormat
} from '../../types/dimensionSettings';

interface DimensionSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (settings: DimensionSettings) => void;
}

const PRESET_COLORS = [
    { value: '#ffffff', label: 'Beyaz' },
    { value: '#ff0000', label: 'Kırmızı' },
    { value: '#ffff00', label: 'Sarı' },
    { value: '#00ff00', label: 'Yeşil' },
    { value: '#00ffff', label: 'Cyan' },
    { value: '#0000ff', label: 'Mavi' },
    { value: '#ff00ff', label: 'Magenta' },
    { value: '#ff8000', label: 'Turuncu' },
    { value: '#808080', label: 'Gri' },
];

const ARROW_STYLES: { value: ArrowStyle; label: string; icon?: string }[] = [
    { value: 'closed', label: 'Kapalı Ok' },
    { value: 'open', label: 'Açık Ok' },
    { value: 'dot', label: 'Nokta' },
    { value: 'arrowDot', label: 'Oklu Nokta' },
    { value: 'architectural', label: 'Mimari (/)' },
    { value: 'none', label: 'Yok' },
];

const ARROW_DIRECTIONS: { value: ArrowDirection; label: string }[] = [
    { value: 'inside', label: 'İçeride' },
    { value: 'outside', label: 'Dışarıda' },
    { value: 'both', label: 'Her İki Taraf' },
];

const TEXT_ALIGNMENTS: { value: TextAlignment; label: string }[] = [
    { value: 'center', label: 'Orta' },
    { value: 'above', label: 'Üst' },
    { value: 'below', label: 'Alt' },
    { value: 'left', label: 'Sol' },
    { value: 'right', label: 'Sağ' },
];

const DECIMAL_FORMATS: { value: DecimalFormat; label: string; example: string }[] = [
    { value: '0', label: 'Tam Sayı', example: '123' },
    { value: '0.0', label: '1 Ondalık', example: '123.5' },
    { value: '0.00', label: '2 Ondalık', example: '123.45' },
    { value: '0.000', label: '3 Ondalık', example: '123.456' },
    { value: '0.0000', label: '4 Ondalık', example: '123.4567' },
    { value: 'fraction', label: 'Kesir', example: '123 1/2' },
];

const ANGLE_FORMATS: { value: AngleFormat; label: string; example: string }[] = [
    { value: 'decimal', label: 'Ondalık Derece', example: '45.5°' },
    { value: 'degMinSec', label: 'Derece/Dakika/Saniye', example: '45°30\'00"' },
    { value: 'radian', label: 'Radyan', example: '0.794 rad' },
    { value: 'gradian', label: 'Gradyan', example: '50.66g' },
];

const DimensionSettingsDialog: React.FC<DimensionSettingsDialogProps> = ({ isOpen, onClose, onApply }) => {
    const [settings, setSettings] = useState<DimensionSettings>({ ...DEFAULT_DIMENSION_SETTINGS });
    const [activeTab, setActiveTab] = useState<'general' | 'arrows' | 'lines' | 'text'>('general');

    useEffect(() => {
        if (isOpen) {
            setSettings(loadDimensionSettings());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        saveDimensionSettings(settings);
        onApply(settings);
        onClose();
    };

    const handleSaveAsDefault = () => {
        saveDimensionSettings(settings);
        // Show feedback
        alert('Ayarlar varsayılan olarak kaydedildi!');
    };

    const updateSetting = <K extends keyof DimensionSettings>(key: K, value: DimensionSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
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
                borderRadius: '8px',
                width: '650px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                color: 'white',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Ölçülendirme Ayarları</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #444',
                    padding: '0 10px'
                }}>
                    {[
                        { id: 'general', label: 'Genel' },
                        { id: 'arrows', label: 'Oklar' },
                        { id: 'lines', label: 'Çizgiler' },
                        { id: 'text', label: 'Metin' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: '12px 20px',
                                background: 'none',
                                border: 'none',
                                color: activeTab === tab.id ? '#4cc2ff' : '#888',
                                borderBottom: activeTab === tab.id ? '2px solid #4cc2ff' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: activeTab === tab.id ? 600 : 400
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px'
                }}>
                    {activeTab === 'general' && (
                        <div>
                            <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#4cc2ff' }}>
                                Genel Ayarlar
                            </h4>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ölçek Faktörü: {settings.scale}x
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    value={settings.scale}
                                    onChange={e => updateSetting('scale', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Ondalık Hassasiyet
                                    </label>
                                    <select
                                        value={settings.precision}
                                        onChange={e => updateSetting('precision', e.target.value as DecimalFormat)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            border: '1px solid #555',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        {DECIMAL_FORMATS.map(f => (
                                            <option key={f.value} value={f.value}>
                                                {f.label} ({f.example})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Açı Formatı
                                    </label>
                                    <select
                                        value={settings.angleFormat}
                                        onChange={e => updateSetting('angleFormat', e.target.value as AngleFormat)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            border: '1px solid #555',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        {ANGLE_FORMATS.map(f => (
                                            <option key={f.value} value={f.value}>
                                                {f.label} ({f.example})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Açı Hassasiyeti (Basamak)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="6"
                                        value={settings.anglePrecision}
                                        onChange={e => updateSetting('anglePrecision', parseInt(e.target.value) || 1)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            border: '1px solid #555',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: '#363636',
                                padding: '15px',
                                borderRadius: '4px',
                                marginBottom: '20px'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', marginBottom: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.suppressLeadingZeros}
                                        onChange={e => updateSetting('suppressLeadingZeros', e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Baştaki sıfırları gizle (.25)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.suppressTrailingZeros}
                                        onChange={e => updateSetting('suppressTrailingZeros', e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Sondaki sıfırları gizle (1.)
                                </label>
                            </div>

                            <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#4cc2ff' }}>
                                Birim
                            </h4>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Birim Gösterimi
                                    </label>
                                    <select
                                        value={settings.unitDisplay}
                                        onChange={e => updateSetting('unitDisplay', e.target.value as any)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#444',
                                            color: 'white',
                                            border: '1px solid #555',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <option value="none">Gösterme</option>
                                        <option value="prefix">Önek (mm 25)</option>
                                        <option value="suffix">Sonek (25 mm)</option>
                                    </select>
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', marginBottom: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.showUnitSymbol}
                                    onChange={e => updateSetting('showUnitSymbol', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Birim sembolünü göster
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.useDrawingScale}
                                    onChange={e => updateSetting('useDrawingScale', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Çizim ölçeğini kullan
                            </label>
                        </div>
                    )}

                    {activeTab === 'arrows' && (
                        <div>
                            <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#4cc2ff' }}>
                                Ok Ayarları
                            </h4>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ok Şekli
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {ARROW_STYLES.map(style => (
                                        <button
                                            key={style.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowStyle', style.value)}
                                            style={{
                                                padding: '10px',
                                                backgroundColor: settings.arrowStyle === style.value ? '#4cc2ff' : '#444',
                                                color: settings.arrowStyle === style.value ? 'black' : 'white',
                                                border: settings.arrowStyle === style.value ? '2px solid #4cc2ff' : '1px solid #555',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ok Yönü
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {ARROW_DIRECTIONS.map(dir => (
                                        <button
                                            key={dir.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowDirection', dir.value)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                backgroundColor: settings.arrowDirection === dir.value ? '#4cc2ff' : '#444',
                                                color: settings.arrowDirection === dir.value ? 'black' : 'white',
                                                border: settings.arrowDirection === dir.value ? '2px solid #4cc2ff' : '1px solid #555',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {dir.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ok Boyutu: {settings.arrowSize}
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.5"
                                    value={settings.arrowSize}
                                    onChange={e => updateSetting('arrowSize', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ok Boyutu Çarpanı: {settings.arrowSizeMultiplier}x
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={settings.arrowSizeMultiplier}
                                    onChange={e => updateSetting('arrowSizeMultiplier', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ok Rengi
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('arrowColor', c.value)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: c.value,
                                                border: settings.arrowColor === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={settings.arrowColor}
                                        onChange={e => updateSetting('arrowColor', e.target.value)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                                        {settings.arrowColor}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lines' && (
                        <div>
                            <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#4cc2ff' }}>
                                Çizgi Ayarları
                            </h4>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Uzantı Ofseti: {settings.extensionLineOffset}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.25"
                                        value={settings.extensionLineOffset}
                                        onChange={e => updateSetting('extensionLineOffset', parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#888' }}>Nesneden uzaklık</span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Uzantı Uzaması: {settings.extensionLineExtend}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.25"
                                        value={settings.extensionLineExtend}
                                        onChange={e => updateSetting('extensionLineExtend', parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#888' }}>Ölçü çizgisinden taşıma</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Ölçü Çizgisi Kalınlığı: {settings.dimLineWeight}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={settings.dimLineWeight}
                                        onChange={e => updateSetting('dimLineWeight', parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                        Uzantı Çizgisi Kalınlığı: {settings.extLineWeight}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="3"
                                        step="0.1"
                                        value={settings.extLineWeight}
                                        onChange={e => updateSetting('extLineWeight', parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Ölçü Çizgisi Rengi
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('dimLineColor', c.value)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: c.value,
                                                border: settings.dimLineColor === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={settings.dimLineColor}
                                        onChange={e => updateSetting('dimLineColor', e.target.value)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                                        {settings.dimLineColor}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Uzantı Çizgisi Rengi
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('extLineColor', c.value)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: c.value,
                                                border: settings.extLineColor === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={settings.extLineColor}
                                        onChange={e => updateSetting('extLineColor', e.target.value)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                                        {settings.extLineColor}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div>
                            <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', color: '#4cc2ff' }}>
                                Metin Ayarları
                            </h4>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Yüksekliği: {settings.textHeight}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={settings.textHeight}
                                    onChange={e => updateSetting('textHeight', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Boşluğu: {settings.textGap}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={settings.textGap}
                                    onChange={e => updateSetting('textGap', parseFloat(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Hizalama
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {TEXT_ALIGNMENTS.map(align => (
                                        <button
                                            key={align.value}
                                            type="button"
                                            onClick={() => updateSetting('textAlignment', align.value)}
                                            style={{
                                                padding: '10px',
                                                backgroundColor: settings.textAlignment === align.value ? '#4cc2ff' : '#444',
                                                color: settings.textAlignment === align.value ? 'black' : 'white',
                                                border: settings.textAlignment === align.value ? '2px solid #4cc2ff' : '1px solid #555',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {align.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Rotasyonu
                                </label>
                                <select
                                    value={settings.textRotation}
                                    onChange={e => updateSetting('textRotation', e.target.value as any)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#444',
                                        color: 'white',
                                        border: '1px solid #555',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <option value="aligned">Hizalı (Çizgiye paralel)</option>
                                    <option value="horizontal">Yatay</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Hareketi (Yetersiz alanda)
                                </label>
                                <select
                                    value={settings.textMovement}
                                    onChange={e => updateSetting('textMovement', e.target.value as any)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#444',
                                        color: 'white',
                                        border: '1px solid #555',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <option value="moveLine">Çizgiyi hareket ettir</option>
                                    <option value="moveText">Metni hareket ettir</option>
                                    <option value="addLeader">Lider çizgi ekle</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Rengi
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('textColor', c.value)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                backgroundColor: c.value,
                                                border: settings.textColor === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={settings.textColor}
                                        onChange={e => updateSetting('textColor', e.target.value)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                                        {settings.textColor}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                                    Metin Arka Plan Rengi
                                </label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {[
                                        { value: 'transparent', label: 'Şeffaf' },
                                        ...PRESET_COLORS
                                    ].map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => updateSetting('textBackgroundColor', c.value)}
                                            style={{
                                                width: c.value === 'transparent' ? 'auto' : '28px',
                                                height: '28px',
                                                minWidth: c.value === 'transparent' ? '60px' : '28px',
                                                padding: c.value === 'transparent' ? '0 8px' : '0',
                                                backgroundColor: c.value === 'transparent' ? '#444' : c.value,
                                                color: 'white',
                                                border: settings.textBackgroundColor === c.value ? '3px solid #4cc2ff' : '2px solid #666',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '11px'
                                            }}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                    <input
                                        type="color"
                                        value={settings.textBackgroundColor === 'transparent' ? '#ffffff' : settings.textBackgroundColor}
                                        onChange={e => updateSetting('textBackgroundColor', e.target.value)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            padding: 0,
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: 'transparent'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '15px 20px',
                    borderTop: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        type="button"
                        onClick={handleSaveAsDefault}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Varsayılan olarak Kaydet
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#555',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#4cc2ff',
                                color: 'black',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Uygula
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DimensionSettingsDialog;
