import { useState } from 'react';
import './StatusBar.css';
import { useDrawing } from '../../context/DrawingContext';
import { getUnitLabel } from '../../utils/unitConversion';
import ApplicationSettingsDialog from '../Dialogs/ApplicationSettingsDialog';

const StatusBar = () => {
    const {
        cursorPosition, selectedIds, activeCommand,
        osnapEnabled, toggleOsnap,
        drawingUnit, setDrawingUnit,
        gridEnabled, toggleGrid,
        orthoEnabled, toggleOrtho,
        polarTrackingEnabled, togglePolarTracking, polarTrackingAngle, setPolarTrackingAngle
    } = useDrawing();

    const [x, y] = cursorPosition;
    const [showPolarMenu, setShowPolarMenu] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const units = ['mm', 'cm', 'm'] as const;
    const polarAngles = [15, 30, 45, 60, 90];

    const cycleUnit = () => {
        const currentIndex = units.indexOf(drawingUnit as typeof units[number]);
        const nextIndex = (currentIndex + 1) % units.length;
        setDrawingUnit(units[nextIndex]);
    };

    return (
        <div className="status-bar">
            <div className="status-left">
                <div className="status-coords">
                    <span>{x.toFixed(4)}, {y.toFixed(4)}, 0.0000</span>
                </div>
                <div className="status-separator"></div>
                <span className={`status-icon-btn ${gridEnabled ? 'tool-active' : ''}`} onClick={toggleGrid} title="Grid (F7)">
                    <span className="material-icons">grid_on</span>
                </span>
                <span className={`status-icon-btn ${osnapEnabled ? 'tool-active' : ''}`} onClick={toggleOsnap} title="Object Snap (F3)">
                    <span className="material-icons">gps_fixed</span>
                </span>
                <span className={`status-icon-btn ${orthoEnabled ? 'tool-active' : ''}`} onClick={toggleOrtho} title="Ortho Mode (F8)">
                    <span className="material-icons">straighten</span>
                </span>
                <div className="polar-tracking-container">
                    <span
                        className={`status-icon-btn ${polarTrackingEnabled ? 'tool-active' : ''}`}
                        onClick={togglePolarTracking}
                        title={`Polar Tracking (${polarTrackingAngle}°)`}
                    >
                        <span className="material-icons">shutter_speed</span>
                    </span>
                    <span
                        className="polar-angle-btn"
                        onClick={() => setShowPolarMenu(!showPolarMenu)}
                        title="Set Polar Angle"
                    >
                        {polarTrackingAngle}°
                    </span>
                    {showPolarMenu && (
                        <div className="polar-menu">
                            {polarAngles.map(angle => (
                                <div
                                    key={angle}
                                    className={`polar-menu-item ${polarTrackingAngle === angle ? 'active' : ''}`}
                                    onClick={() => {
                                        setPolarTrackingAngle(angle);
                                        setShowPolarMenu(false);
                                    }}
                                >
                                    {angle}°
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="status-separator"></div>
                <span
                    className="status-unit-btn"
                    onClick={cycleUnit}
                    title="Birim Değiştir"
                >
                    {getUnitLabel(drawingUnit).toUpperCase()}
                </span>
                {activeCommand && <span className="active-cmd-label">{activeCommand}</span>}
                {selectedIds.size > 0 && <span className="selection-count">{selectedIds.size} selected</span>}
            </div>
            <div className="status-right">
                <span className="status-icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
                    <span className="material-icons">settings</span>
                </span>
                <span className="status-icon-btn"><span className="material-icons">list</span></span>
            </div>
            <ApplicationSettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default StatusBar;

