import React, { useState, useEffect } from 'react';
import { DEFAULT_DIMENSION_SETTINGS, type ArrowStyle, type DecimalFormat } from '../../types/dimensionSettings';
import type { DimensionEntity } from '../../types/entities';

interface DimensionEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entityId: number, updates: Partial<DimensionEntity>) => void;
    entity: DimensionEntity | null;
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

const ARROW_STYLES: { value: ArrowStyle; label: string }[] = [
    { value: 'closed', label: 'Kapalı Ok' },
    { value: 'open', label: 'Açık Ok' },
    { value: 'dot', label: 'Nokta' },
    { value: 'arrowDot', label: 'Oklu Nokta' },
    { value: 'architectural', label: 'Mimari (/)' },
    { value: 'none', label: 'Yok' },
];

const DECIMAL_FORMATS: { value: DecimalFormat; label: string; example: string }[] = [
    { value: '0', label: 'Tam Sayı', example: '123' },
    { value: '0.0', label: '1 Ondalık', example: '123.5' },
    { value: '0.00', label: '2 Ondalık', example: '123.45' },
    { value: '0.000', label: '3 Ondalık', example: '123.456' },
    { value: '0.0000', label: '4 Ondalık', example: '123.4567' },
    { value: 'fraction', label: 'Kesir', example: '123 1/2' },
];

const DimensionEditDialog: React.FC<DimensionEditDialogProps> = ({ isOpen, onClose, onSave, entity }) => {
    // Local state for form values
    const [text, setText] = useState('');
    const [textHeight, setTextHeight] = useState(2.5);
    const [arrowSize, setArrowSize] = useState(2.5);
    const [arrowStyle, setArrowStyle] = useState<ArrowStyle>('closed');
    const [arrowDirection, setArrowDirection] = useState<'inside' | 'outside' | 'both'>('both');
    const [arrowColor, setArrowColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#ffffff');
    const [dimLineColor, setDimLineColor] = useState('#ffffff');
    const [extLineColor, setExtLineColor] = useState('#ffffff');
    const [precision, setPrecision] = useState<DecimalFormat>('0.00');
    const [extensionLineOffset, setExtensionLineOffset] = useState(1.5);
    const [extensionLineExtend, setExtensionLineExtend] = useState(1.25);
    const [dimLineWeight, setDimLineWeight] = useState(1.0);
    const [extLineWeight, setExtLineWeight] = useState(0.5);
    const [showUnit, setShowUnit] = useState(false);
    const [unit, setUnit] = useState('mm');

    // Load entity values when dialog opens or entity changes
    useEffect(() => {
        if (isOpen && entity) {
            setText(entity.text || '');
            setTextHeight(entity.textHeight || DEFAULT_DIMENSION_SETTINGS.textHeight);
            setArrowSize(entity.arrowSize || DEFAULT_DIMENSION_SETTINGS.arrowSize);
            setArrowStyle(entity.arrowStyle || DEFAULT_DIMENSION_SETTINGS.arrowStyle);
            setArrowDirection(entity.arrowDirection || DEFAULT_DIMENSION_SETTINGS.arrowDirection);
            setArrowColor(entity.arrowColor || entity.color || DEFAULT_DIMENSION_SETTINGS.arrowColor);
            setTextColor(entity.textColor || entity.color || DEFAULT_DIMENSION_SETTINGS.textColor);
            setDimLineColor(entity.dimLineColor || entity.color || DEFAULT_DIMENSION_SETTINGS.dimLineColor);
            setExtLineColor(entity.extLineColor || entity.color || DEFAULT_DIMENSION_SETTINGS.extLineColor);
            setPrecision((entity.precision as DecimalFormat) || DEFAULT_DIMENSION_SETTINGS.precision);
            setExtensionLineOffset(entity.extensionLineOffset || DEFAULT_DIMENSION_SETTINGS.extensionLineOffset);
            setExtensionLineExtend(entity.extensionLineExtend || DEFAULT_DIMENSION_SETTINGS.extensionLineExtend);
            setDimLineWeight(entity.dimLineWeight || DEFAULT_DIMENSION_SETTINGS.dimLineWeight);
            setExtLineWeight(entity.extLineWeight || DEFAULT_DIMENSION_SETTINGS.extLineWeight);
            setShowUnit(entity.showUnit ?? false);
            setUnit(entity.unit || 'mm');
        }
    }, [isOpen, entity]);

    if (!isOpen || !entity) return null;

    const handleSave = () => {
        onSave(entity.id, {
            text: text || undefined,
            textHeight,
            arrowSize,
            arrowStyle,
            arrowDirection,
            arrowColor,
            textColor,
            dimLineColor,
            extLineColor,
            precision,
            extensionLineOffset,
            extensionLineExtend,
            dimLineWeight,
            extLineWeight,
            showUnit,
            unit
        });
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
                width: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                    Ölçü Düzenle
                </h3>

                {/* Metin Değeri */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                        Metin Değeri (Boş bırakırsanız otomatik hesaplanır):
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Örn: 50 veya R25"
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

                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Metin Yüksekliği: {textHeight}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={textHeight}
                            onChange={e => setTextHeight(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Ok Boyutu: {arrowSize}
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={arrowSize}
                            onChange={e => setArrowSize(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                {/* Ok Şekli */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                        Ok Şekli
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {ARROW_STYLES.map(style => (
                            <button
                                key={style.value}
                                type="button"
                                onClick={() => setArrowStyle(style.value)}
                                style={{
                                    padding: '10px',
                                    backgroundColor: arrowStyle === style.value ? '#4cc2ff' : '#444',
                                    color: arrowStyle === style.value ? 'black' : 'white',
                                    border: arrowStyle === style.value ? '2px solid #4cc2ff' : '1px solid #555',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ok Yönü */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                        Ok Yönü
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { value: 'inside' as const, label: 'İçeride' },
                            { value: 'outside' as const, label: 'Dışarıda' },
                            { value: 'both' as const, label: 'Her İki Taraf' }
                        ].map(dir => (
                            <button
                                key={dir.value}
                                type="button"
                                onClick={() => setArrowDirection(dir.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: arrowDirection === dir.value ? '#4cc2ff' : '#444',
                                    color: arrowDirection === dir.value ? 'black' : 'white',
                                    border: arrowDirection === dir.value ? '2px solid #4cc2ff' : '1px solid #555',
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

                {/* Hassasiyet */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                        Ondalık Hassasiyet
                    </label>
                    <select
                        value={precision}
                        onChange={e => setPrecision(e.target.value as DecimalFormat)}
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

                {/* Renkler */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                        Renkler
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', color: '#888' }}>Ok:</label>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setArrowColor(c.value)}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            backgroundColor: c.value,
                                            border: arrowColor === c.value ? '2px solid #4cc2ff' : '1px solid #555',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={arrowColor}
                                    onChange={e => setArrowColor(e.target.value)}
                                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#888' }}>Metin:</label>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setTextColor(c.value)}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            backgroundColor: c.value,
                                            border: textColor === c.value ? '2px solid #4cc2ff' : '1px solid #555',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={e => setTextColor(e.target.value)}
                                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#888' }}>Ölçü Çizgisi:</label>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setDimLineColor(c.value)}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            backgroundColor: c.value,
                                            border: dimLineColor === c.value ? '2px solid #4cc2ff' : '1px solid #555',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={dimLineColor}
                                    onChange={e => setDimLineColor(e.target.value)}
                                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: '#888' }}>Uzantı Çizgisi:</label>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setExtLineColor(c.value)}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            backgroundColor: c.value,
                                            border: extLineColor === c.value ? '2px solid #4cc2ff' : '1px solid #555',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={extLineColor}
                                    onChange={e => setExtLineColor(e.target.value)}
                                    style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Çizgi Kalınlıkları */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Ölçü Çizgisi Kalınlığı: {dimLineWeight}
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={dimLineWeight}
                            onChange={e => setDimLineWeight(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Uzantı Çizgisi Kalınlığı: {extLineWeight}
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={extLineWeight}
                            onChange={e => setExtLineWeight(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                {/* Uzantı Çizgisi Ayarları */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Uzantı Ofseti: {extensionLineOffset}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.25"
                            value={extensionLineOffset}
                            onChange={e => setExtensionLineOffset(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>
                            Uzantı Uzaması: {extensionLineExtend}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.25"
                            value={extensionLineExtend}
                            onChange={e => setExtensionLineExtend(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                {/* Birim */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', marginBottom: '10px' }}>
                        <input
                            type="checkbox"
                            checked={showUnit}
                            onChange={e => setShowUnit(e.target.checked)}
                            style={{ marginRight: '8px' }}
                        />
                        Birim göster
                    </label>
                    {showUnit && (
                        <select
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: '#444',
                                color: 'white',
                                border: '1px solid #555',
                                borderRadius: '4px'
                            }}
                        >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="inch">inch</option>
                            <option value="feet">feet</option>
                        </select>
                    )}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ padding: '8px 16px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{ padding: '8px 16px', backgroundColor: '#4cc2ff', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DimensionEditDialog;
