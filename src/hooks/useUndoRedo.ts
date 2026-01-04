import { useCallback, useMemo } from 'react';
import { HistoryManager } from '../utils/historyManager';
import type { CommandHistoryItem } from '../types/commands';
import type { Entity } from '../types/entities';

interface UndoRedoOptions {
  maxHistory?: number;
  onUndo?: (item: CommandHistoryItem) => void;
  onRedo?: (item: CommandHistoryItem) => void;
}

export const useUndoRedo = (options: UndoRedoOptions = {}) => {
  const { maxHistory = 100, onUndo, onRedo } = options;

  const historyManager = useMemo(
    () => new HistoryManager(maxHistory),
    [maxHistory]
  );

  const undo = useCallback((): CommandHistoryItem | null => {
    const item = historyManager.undo();
    if (item && onUndo) {
      onUndo(item);
    }
    return item;
  }, [historyManager, onUndo]);

  const redo = useCallback((): CommandHistoryItem | null => {
    const item = historyManager.redo();
    if (item && onRedo) {
      onRedo(item);
    }
    return item;
  }, [historyManager, onRedo]);

  const pushHistory = useCallback((item: CommandHistoryItem) => {
    historyManager.pushHistory(item);
  }, [historyManager]);

  const canUndo = useCallback(() => historyManager.canUndo(), [historyManager]);
  const canRedo = useCallback(() => historyManager.canRedo(), [historyManager]);

  const clear = useCallback(() => {
    historyManager.clear();
  }, [historyManager]);

  const getUndoHistory = useCallback(() => historyManager.getUndoHistory(), [historyManager]);
  const getRedoHistory = useCallback(() => historyManager.getRedoHistory(), [historyManager]);

  return {
    undoStack: historyManager.getUndoHistory(),
    redoStack: historyManager.getRedoHistory(),
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    getUndoHistory,
    getRedoHistory,
    historyManager,
  };
};

/**
 * Hook for creating history items from entity changes
 */
export const useHistoryItem = () => {
  const createHistoryItem = useCallback((
    command: string,
    beforeEntities: Entity[],
    afterEntities: Entity[],
    beforeSelection: Set<number>,
    afterSelection: Set<number>
  ): CommandHistoryItem => {
    return {
      id: `${Date.now()}-${Math.random()}`,
      command: command as any,
      timestamp: Date.now(),
      before: {
        entities: JSON.parse(JSON.stringify(beforeEntities)),
        selection: new Set(beforeSelection),
      },
      after: {
        entities: JSON.parse(JSON.stringify(afterEntities)),
        selection: new Set(afterSelection),
      },
    };
  }, []);

  return { createHistoryItem };
};
