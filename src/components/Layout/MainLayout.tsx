import { useEffect } from 'react';
import { useDrawing } from '../../context/DrawingContext';
import Ribbon from '../Ribbon/Ribbon';
import Viewport from '../Viewport/Viewport';
import CommandLine from '../CommandLine/CommandLine';
import StatusBar from '../StatusBar/StatusBar';
import SheetTabs from '../SheetTabs/SheetTabs';
import TextInputDialog from '../Dialogs/TextInputDialog';
import TableInputDialog from '../Dialogs/TableInputDialog';
import TableEditDialog from '../Dialogs/TableEditDialog';
import './MainLayout.css';

const MainLayout = () => {
    const {
        cancelCommand,
        clearSelection,
        activeCommand,
        selectedIds,
        activeGrip,
        cancelGrip,
        textDialogState,
        setTextDialogState,
        tableDialogState,
        setTableDialogState
    } = useDrawing();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                console.log("ESC pressed");
                if (activeGrip) {
                    // Cancel grip editing first (restores original entity)
                    cancelGrip();
                } else if (activeCommand) {
                    cancelCommand();
                } else if (selectedIds.size > 0) {
                    clearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cancelCommand, clearSelection, activeCommand, selectedIds, activeGrip, cancelGrip]);

    return (
        <div className="main-layout">
            <div className="title-bar">
                <span>Online CAD App</span>
            </div>
            <Ribbon />
            <div className="workspace">
                <div className="viewport-area">
                    <Viewport />
                </div>
                {/* Right sidebar for properties could go here */}
            </div>
            <SheetTabs />
            <CommandLine />
            <StatusBar />

            {/* Dialogs */}
            <TextInputDialog
                isOpen={textDialogState.isOpen}
                onClose={() => {
                    setTextDialogState(prev => ({ ...prev, isOpen: false }));
                    cancelCommand(); // Cancel if closed without submit
                }}
                onSubmit={(data: { text: string; height: number; rotation: number }) => {
                    if (textDialogState.callback) {
                        textDialogState.callback(data);
                    }
                    setTextDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={textDialogState.initialValues}
                mode={textDialogState.mode}
            />
            {/* Tablo oluşturma diyaloğu (yeni tablo) */}
            <TableInputDialog
                isOpen={tableDialogState.isOpen && !tableDialogState.editMode}
                onClose={() => {
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                    cancelCommand();
                }}
                onSubmit={(data) => {
                    if (tableDialogState.callback) {
                        tableDialogState.callback(data);
                    }
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={tableDialogState.initialValues}
            />

            {/* Tablo düzenleme diyaloğu (mevcut tablo düzenleme) */}
            <TableEditDialog
                isOpen={tableDialogState.isOpen && tableDialogState.editMode === true}
                onClose={() => {
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                onSubmit={(data) => {
                    if (tableDialogState.callback) {
                        tableDialogState.callback(data);
                    }
                    setTableDialogState(prev => ({ ...prev, isOpen: false }));
                }}
                initialValues={tableDialogState.initialValues}
            />
        </div>
    );
};

export default MainLayout;
