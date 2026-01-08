import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useDrawing } from '../../context/DrawingContext';
import './InPlaceTextEditor.css';

// Font listesi
const FONT_OPTIONS = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Consolas', label: 'Consolas' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
];

// Renk paleti
const COLOR_PRESETS = [
    '#FFFFFF', // Beyaz
    '#FF0000', // Kırmızı
    '#00FF00', // Yeşil
    '#0000FF', // Mavi
    '#FFFF00', // Sarı
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Turuncu
    '#FF69B4', // Pembe
    '#808080', // Gri
];

/**
 * InPlaceTextEditor - AutoCAD tarzı yerinde metin düzenleme bileşeni
 * 
 * Dünya koordinatlarında belirtilen bir pozisyonda, doğrudan tuval üzerinde
 * metin girişi sağlar. ESC ile iptal, Enter ile onay yapılır.
 * Font seçimi ve renk değiştirme özellikleri içerir.
 * 
 * @react-three/drei Html bileşeni kullanarak Three.js sahnesinde HTML render eder.
 */
const InPlaceTextEditor: React.FC = () => {
    const {
        inPlaceTextEditorState,
        submitInPlaceEdit,
        cancelInPlaceEdit
    } = useDrawing();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [text, setText] = useState('');
    const [textHeight, setTextHeight] = useState(10);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [justification, setJustification] = useState<'left' | 'center' | 'right'>('left');
    const [fontFamily, setFontFamily] = useState('Arial');
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const isSubmittingRef = useRef(false);

    // Initialize text and styles when editor opens
    useEffect(() => {
        if (inPlaceTextEditorState.isOpen) {
            setText(inPlaceTextEditorState.initialText || '');
            setTextHeight(inPlaceTextEditorState.style?.height || 10);

            // Mevcut entity'den stil bilgilerini yükle
            const style = inPlaceTextEditorState.style;
            if (style) {
                setFontFamily(style.fontFamily || 'Arial');
                setTextColor(style.color || '#FFFFFF');
                setIsBold(style.fontWeight === 'bold');
                setIsItalic(style.fontStyle === 'italic');
                setJustification(style.justification || 'left');
            } else {
                // Varsayılan değerler
                setFontFamily('Arial');
                setTextColor('#FFFFFF');
                setIsBold(false);
                setIsItalic(false);
                setJustification('left');
            }

            isSubmittingRef.current = false;
            setShowColorPicker(false);
        }
    }, [inPlaceTextEditorState.isOpen, inPlaceTextEditorState.initialText, inPlaceTextEditorState.style]);

    // Focus textarea when editor opens
    useEffect(() => {
        if (inPlaceTextEditorState.isOpen && textareaRef.current) {
            // Small delay to ensure the element is rendered
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);

            // Keep focus on textarea - prevent canvas from stealing focus
            const focusInterval = setInterval(() => {
                if (textareaRef.current && document.activeElement !== textareaRef.current) {
                    // Only refocus if no other input is focused (e.g., toolbar inputs)
                    const activeTag = document.activeElement?.tagName?.toLowerCase();
                    if (activeTag !== 'input' && activeTag !== 'select') {
                        textareaRef.current.focus();
                    }
                }
            }, 200);

            return () => {
                clearTimeout(timer);
                clearInterval(focusInterval);
            };
        }
    }, [inPlaceTextEditorState.isOpen]);

    // Handle keyboard events
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        e.stopPropagation(); // Prevent event bubbling to canvas

        if (e.key === 'Escape') {
            e.preventDefault();
            if (!isSubmittingRef.current) {
                isSubmittingRef.current = true;
                cancelInPlaceEdit();
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            // Enter without Shift - submit
            e.preventDefault();
            if (!isSubmittingRef.current) {
                isSubmittingRef.current = true;
                // Stil bilgileriyle birlikte submit et
                submitInPlaceEdit(text, {
                    height: textHeight,
                    fontFamily,
                    color: textColor,
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    justification
                });
            }
        }
        // Shift+Enter allows newline in textarea naturally
    }, [text, textHeight, fontFamily, textColor, isBold, isItalic, justification, submitInPlaceEdit, cancelInPlaceEdit]);

    // Toolbar button click handler
    const handleToolbarClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        // Refocus textarea after toolbar click
        setTimeout(() => textareaRef.current?.focus(), 10);
    }, []);

    // Submit handler
    const handleSubmit = useCallback(() => {
        if (!isSubmittingRef.current) {
            isSubmittingRef.current = true;
            submitInPlaceEdit(text, {
                height: textHeight,
                fontFamily,
                color: textColor,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                justification
            });
        }
    }, [text, textHeight, fontFamily, textColor, isBold, isItalic, justification, submitInPlaceEdit]);

    // Cancel handler
    const handleCancel = useCallback(() => {
        if (!isSubmittingRef.current) {
            isSubmittingRef.current = true;
            cancelInPlaceEdit();
        }
    }, [cancelInPlaceEdit]);

    // Color selection handler
    const handleColorSelect = useCallback((color: string) => {
        setTextColor(color);
        setShowColorPicker(false);
        setTimeout(() => textareaRef.current?.focus(), 10);
    }, []);

    // Don't render if not open or no position
    if (!inPlaceTextEditorState.isOpen || !inPlaceTextEditorState.position) {
        return null;
    }

    const position = inPlaceTextEditorState.position;

    // Calculate font size - approximate mapping from world units to pixels
    const fontSize = Math.max(14, Math.min(textHeight * 1.5, 36));

    return (
        <Html
            position={[position[0], position[1], 10]}
            style={{
                pointerEvents: 'auto',
                transform: 'translate(-2px, 0)'
            }}
            zIndexRange={[1000, 1001]}
        >
            <div
                className="in-place-text-editor"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Toolbar */}
                <div className="editor-toolbar" onMouseDown={handleToolbarClick}>
                    {/* Font Family */}
                    <div className="toolbar-group">
                        <select
                            className="toolbar-select"
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            title="Font Seç"
                        >
                            {FONT_OPTIONS.map(font => (
                                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="toolbar-separator" />

                    {/* Text Height */}
                    <div className="toolbar-group">
                        <label className="toolbar-label">H:</label>
                        <input
                            type="number"
                            className="toolbar-input"
                            value={textHeight}
                            onChange={(e) => setTextHeight(Math.max(1, parseInt(e.target.value) || 10))}
                            min={1}
                            max={100}
                            onMouseDown={(e) => e.stopPropagation()}
                            title="Yazı Yüksekliği"
                        />
                    </div>

                    <div className="toolbar-separator" />

                    {/* Color Picker */}
                    <div className="toolbar-group color-picker-wrapper">
                        <button
                            className="toolbar-btn color-btn"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Renk Seç"
                            style={{ backgroundColor: textColor }}
                        >
                            <span className="material-icons" style={{ fontSize: '14px', color: textColor === '#FFFFFF' || textColor === '#FFFF00' ? '#000' : '#fff' }}>
                                format_color_text
                            </span>
                        </button>
                        {showColorPicker && (
                            <div className="color-picker-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                                <div className="color-presets">
                                    {COLOR_PRESETS.map(color => (
                                        <button
                                            key={color}
                                            className={`color-swatch ${textColor === color ? 'active' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => handleColorSelect(color)}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <div className="color-custom">
                                    <input
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => handleColorSelect(e.target.value)}
                                        className="color-input"
                                        title="Özel Renk"
                                    />
                                    <span className="color-label">Özel</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="toolbar-separator" />

                    {/* Bold */}
                    <button
                        className={`toolbar-btn ${isBold ? 'active' : ''}`}
                        onClick={() => setIsBold(!isBold)}
                        title="Kalın"
                    >
                        <span style={{ fontWeight: 'bold' }}>B</span>
                    </button>

                    {/* Italic */}
                    <button
                        className={`toolbar-btn ${isItalic ? 'active' : ''}`}
                        onClick={() => setIsItalic(!isItalic)}
                        title="İtalik"
                    >
                        <span style={{ fontStyle: 'italic' }}>I</span>
                    </button>

                    <div className="toolbar-separator" />

                    {/* Justification */}
                    <button
                        className={`toolbar-btn ${justification === 'left' ? 'active' : ''}`}
                        onClick={() => setJustification('left')}
                        title="Sola Hizala"
                    >
                        <span className="material-icons" style={{ fontSize: '14px' }}>format_align_left</span>
                    </button>
                    <button
                        className={`toolbar-btn ${justification === 'center' ? 'active' : ''}`}
                        onClick={() => setJustification('center')}
                        title="Ortala"
                    >
                        <span className="material-icons" style={{ fontSize: '14px' }}>format_align_center</span>
                    </button>
                    <button
                        className={`toolbar-btn ${justification === 'right' ? 'active' : ''}`}
                        onClick={() => setJustification('right')}
                        title="Sağa Hizala"
                    >
                        <span className="material-icons" style={{ fontSize: '14px' }}>format_align_right</span>
                    </button>

                    <div className="toolbar-separator" />

                    {/* Submit / Cancel */}
                    <button
                        className="toolbar-btn submit-btn"
                        onClick={handleSubmit}
                        title="Onayla (Enter)"
                    >
                        <span className="material-icons" style={{ fontSize: '14px' }}>check</span>
                    </button>
                    <button
                        className="toolbar-btn cancel-btn"
                        onClick={handleCancel}
                        title="İptal (ESC)"
                    >
                        <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
                    </button>
                </div>

                {/* Text Input */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                        // Prevent losing focus to canvas - immediately refocus
                        e.preventDefault();
                        const relatedTag = (e.relatedTarget as HTMLElement)?.tagName?.toLowerCase();
                        if (relatedTag !== 'input' && relatedTag !== 'select' && relatedTag !== 'button') {
                            setTimeout(() => textareaRef.current?.focus(), 10);
                        }
                    }}
                    placeholder="Metin girin..."
                    style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.3',
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontStyle: isItalic ? 'italic' : 'normal',
                        textAlign: justification,
                        fontFamily: fontFamily,
                        color: textColor
                    }}
                    rows={2}
                    autoFocus
                />
            </div>
        </Html>
    );
};

export default InPlaceTextEditor;
