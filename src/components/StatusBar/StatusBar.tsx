import './StatusBar.css';
import { useDrawing } from '../../context/DrawingContext';
import { getUnitLabel } from '../../utils/unitConversion';

const StatusBar = () => {
    const { cursorPosition, selectedIds, activeCommand, osnapEnabled, toggleOsnap, drawingUnit, setDrawingUnit } = useDrawing();
    const [x, y] = cursorPosition;

    const units = ['mm', 'cm', 'm'] as const;

    const cycleUnit = () => {
        const currentIndex = units.indexOf(drawingUnit as typeof units[number]);
        const nextIndex = (currentIndex + 1) % units.length;
        setDrawingUnit(units[nextIndex]);
    };

    return (
        <div className="status-bar">
            <div className="status-left">
                <span className="status-item">MODEL</span>
                <span className="status-item">GRID</span>
                <span
                    className={`status-item ${osnapEnabled ? 'active' : ''}`}
                    onClick={toggleOsnap}
                    style={{
                        cursor: 'pointer',
                        color: osnapEnabled ? '#0078d4' : 'inherit',
                        fontWeight: osnapEnabled ? 'bold' : 'normal'
                    }}
                >
                    OSNAP
                </span>
                <span className="status-item">ORTHO</span>
                <span
                    className="status-item"
                    onClick={cycleUnit}
                    style={{
                        cursor: 'pointer',
                        color: '#4cc2ff',
                        fontWeight: 'bold',
                        minWidth: '40px',
                        textAlign: 'center'
                    }}
                    title="Birim değiştirmek için tıklayın"
                >
                    {getUnitLabel(drawingUnit).toUpperCase()}
                </span>
                {activeCommand && <span className="active-cmd">{activeCommand}</span>}
                {selectedIds.size > 0 && <span className="selection-count">{selectedIds.size} selected</span>}
            </div>
            <div className="status-right">
                <span>{x.toFixed(4)}, {y.toFixed(4)}, 0.0000 {getUnitLabel(drawingUnit)}</span>
            </div>
        </div>
    );
};

export default StatusBar;

