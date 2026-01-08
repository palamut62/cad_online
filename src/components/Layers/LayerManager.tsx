import React, { useState } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import { Layer } from '../../types/layers';
import { ACI_COLORS } from '../../types/layers';
import './LayerManager.css';

import './LayerManager.css';

interface LayerManagerProps {
    onClose: () => void;
}

const LayerManager: React.FC<LayerManagerProps> = ({ onClose }) => {
    const {
        layers,
        activeLayerId,
        addLayer,
        removeLayer,
        updateLayer,
        setActiveLayerId
    } = useDrawing();

    const [newLayerName, setNewLayerName] = useState('');
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleAddLayer = () => {
        const name = newLayerName.trim() || `Layer ${layers.length + 1}`;
        const newLayer: Layer = {
            id: Date.now().toString(),
            name: name,
            color: ACI_COLORS[Math.floor(Math.random() * 7) + 1], // Random standard color
            linetype: 'CONTINUOUS',
            lineweight: 1, // Default
            plotStyle: 'Color',
            visible: true,
            locked: false,
            frozen: false,
            plot: true
        };
        addLayer(newLayer);
        setNewLayerName('');
    };

    const handleColorChange = (id: string, color: string) => {
        updateLayer(id, { color });
    };

    const startEditing = (layer: Layer) => {
        setEditingLayerId(layer.id);
        setEditingName(layer.name);
    };

    const saveLayerName = () => {
        if (editingLayerId && editingName.trim()) {
            updateLayer(editingLayerId, { name: editingName.trim() });
        }
        cancelEditing();
    };

    const cancelEditing = () => {
        setEditingLayerId(null);
        setEditingName('');
    };

    return (
        <div className="layer-manager">
            <div className="layer-manager-header">
                <h3>Layer Properties Manager</h3>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#aaa',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                    }}
                >
                    <span className="material-icons">close</span>
                </button>
            </div>
            <div className="layer-manager-subheader" style={{ padding: '8px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="layer-actions">
                    <input
                        type="text"
                        placeholder="New Layer Name"
                        value={newLayerName}
                        onChange={(e) => setNewLayerName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLayer()}
                    />
                    <button onClick={handleAddLayer} className="add-layer-btn">
                        <span className="material-icons">add</span> New Layer
                    </button>
                </div>
            </div>

            <div className="layer-list">
                <div className="layer-row header">
                    <div className="col-status">Status</div>
                    <div className="col-name">Name</div>
                    <div className="col-color">Color</div>
                    <div className="col-visible">On</div>
                    <div className="col-locked">Lock</div>
                    <div className="col-plot">Plot</div>
                    <div className="col-action"></div>
                </div>

                {layers.map(layer => (
                    <div
                        key={layer.id}
                        className={`layer-row ${activeLayerId === layer.id ? 'active' : ''}`}
                        onClick={() => setActiveLayerId(layer.id)}
                    >
                        <div className="col-status">
                            {activeLayerId === layer.id && <span className="material-icons active-icon">check</span>}
                        </div>
                        <div
                            className="col-name"
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                startEditing(layer);
                            }}
                        >
                            {editingLayerId === layer.id ? (
                                <input
                                    type="text"
                                    className="layer-name-edit"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={saveLayerName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveLayerName();
                                        if (e.key === 'Escape') cancelEditing();
                                        e.stopPropagation(); // Prevent triggering other key handlers
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            ) : (
                                layer.name
                            )}
                        </div>
                        <div className="col-color">
                            <input
                                type="color"
                                value={layer.color}
                                onChange={(e) => handleColorChange(layer.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="col-visible" onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                        }}>
                            <span className="material-icons">
                                {layer.visible ? 'visibility' : 'visibility_off'}
                            </span>
                        </div>
                        <div className="col-locked" onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { locked: !layer.locked });
                        }}>
                            <span className="material-icons">
                                {layer.locked ? 'lock' : 'lock_open'}
                            </span>
                        </div>
                        <div className="col-plot" onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { plot: !layer.plot });
                        }}>
                            <span className="material-icons">
                                {layer.plot ? 'print' : 'print_disabled'}
                            </span>
                        </div>
                        <div className="col-action">
                            {layer.name !== '0' && (
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete layer ${layer.name}?`)) {
                                            removeLayer(layer.id);
                                        }
                                    }}
                                >
                                    <span className="material-icons">delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LayerManager;
