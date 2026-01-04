import type { CommandHistoryItem, CommandType } from '../types/commands';
import type { Entity } from '../types/entities';

/**
 * HistoryManager manages undo/redo state for CAD operations
 * Uses command pattern to track state changes
 */
export class HistoryManager {
  private undoStack: CommandHistoryItem[] = [];
  private redoStack: CommandHistoryItem[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Create a history item for an action
   */
  createHistoryItem(
    command: CommandType,
    beforeEntities: Entity[],
    afterEntities: Entity[],
    beforeSelection: Set<number>,
    afterSelection: Set<number>
  ): CommandHistoryItem {
    return {
      id: `${Date.now()}-${Math.random()}`,
      command,
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
  }

  /**
   * Push a history item onto the undo stack
   */
  pushHistory(item: CommandHistoryItem): void {
    this.undoStack.push(item);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  /**
   * Undo the last action
   */
  undo(): CommandHistoryItem | null {
    if (this.undoStack.length === 0) return null;
    const item = this.undoStack.pop()!;
    this.redoStack.push(item);
    return item;
  }

  /**
   * Redo the last undone action
   */
  redo(): CommandHistoryItem | null {
    if (this.redoStack.length === 0) return null;
    const item = this.redoStack.pop()!;
    this.undoStack.push(item);
    return item;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Get the last command on the undo stack (without popping)
   */
  peekUndo(): CommandHistoryItem | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1];
  }

  /**
   * Get the last command on the redo stack (without popping)
   */
  peekRedo(): CommandHistoryItem | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1];
  }

  /**
   * Get all undo items (for history display)
   */
  getUndoHistory(): CommandHistoryItem[] {
    return [...this.undoStack];
  }

  /**
   * Get all redo items (for history display)
   */
  getRedoHistory(): CommandHistoryItem[] {
    return [...this.redoStack];
  }
}
