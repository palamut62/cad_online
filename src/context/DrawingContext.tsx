import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { Entity, Point } from '../types/entities';
import type { CommandType } from '../types/commands';
import { closestPointOnEntity, rotatePoint as rotatePt, scalePoint as scalePt, translatePoint as translatePt, mirrorPoint as mirrorPt, getClosestSnapPoint, SnapPoint, GripPoint, distance2D, isEntityInBox, doesEntityIntersectBox } from '../utils/geometryUtils';
import { trimLineEntity, trimArcEntity, trimCircleEntity, extendLineEntity, extendArcEntity } from '../utils/intersectionUtils';

import { HistoryManager } from '../utils/historyManager';
import { calculateDimensionGeometry, autoDetectPoints } from '../utils/dimensionUtils';
import { DEFAULT_DIMENSION_SETTINGS } from '../types/dimensionSettings';
import type { Layer } from '../types/layers';
import { DEFAULT_LAYER } from '../types/layers';

interface ActiveGrip {
  entityId: number;
  grip: GripPoint;
  originalEntity: Entity;
  startPoint: Point; // where the grip was when clicked
}

interface SelectionBox {
  start: Point;
  end: Point;
  mode: 'WINDOW' | 'CROSSING'; // WINDOW (Left->Right), CROSSING (Right->Left)
}

// Unit types
export type DrawingUnit = 'mm' | 'cm' | 'm' | 'inch' | 'feet';

// Scale presets
export const SCALE_PRESETS = {
  '1:1': 1,
  '1:2': 0.5,
  '1:5': 0.2,
  '1:10': 0.1,
  '1:20': 0.05,
  '1:50': 0.02,
  '1:100': 0.01,
  '1:200': 0.005,
  '1:500': 0.002,
  '2:1': 2,
  '5:1': 5,
  '10:1': 10,
};

// Drawing Sheet interface for multi-tab support
export interface DrawingSheet {
  id: string;
  name: string;
  entities: Entity[];
  isModified: boolean;
  baseUnit: DrawingUnit;
  drawingUnit: DrawingUnit;
  drawingScale: string;
}

interface DrawingContextValue {
  // Sheet/Tab management
  sheets: DrawingSheet[];
  activeSheetId: string;
  addSheet: (name?: string) => void;
  removeSheet: (id: string) => void;
  switchSheet: (id: string) => void;
  renameSheet: (id: string, newName: string) => void;



  // File state (from active sheet)
  fileName: string;
  isModified: boolean;
  newFile: () => void;
  loadEntities: (entities: Entity[], fileName?: string) => void;
  loadProject: (data: any) => void;

  // Layer state
  layerDialogState: { isOpen: boolean };
  setLayerDialogState: React.Dispatch<React.SetStateAction<{ isOpen: boolean }>>;
  layers: Layer[];
  activeLayerId: string;
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayerId: (id: string) => void;
  activeLineType: string;
  setActiveLineType: (type: string) => void;
  activeLineWeight: number; // 0 means BYLAYER usually, or specifics
  setActiveLineWeight: (weight: number) => void;

  // Scale & Units
  baseUnit: DrawingUnit; // Proje baz birimi (değerler bu birimde saklanır)
  setBaseUnit: (unit: DrawingUnit) => void;
  drawingUnit: DrawingUnit; // Görüntüleme birimi
  setDrawingUnit: (unit: DrawingUnit) => void;
  drawingScale: string;
  setDrawingScale: (scale: string) => void;
  scaleFactor: number;

  // Entity state
  entities: Entity[];
  addEntity: (entity: any) => void;
  updateEntity: (id: number, updates: any) => void;
  deleteEntities: (ids: Set<number>) => void;
  getEntity: (id: number) => Entity | undefined;

  // Command state
  activeCommand: CommandType | null;
  startCommand: (cmd: CommandType) => void;
  cancelCommand: () => void;

  // Command execution state
  step: number;
  setStep: (step: number) => void;
  tempPoints: Point[];
  cursorPosition: Point;
  setCursorPosition: (pos: Point) => void;
  commandState: Record<string, any>;
  setCommandState: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  // Input handlers
  handleCommandInput: (point: Point) => void;
  handleMouseMove: (point: Point) => void;
  handleValueInput: (value: string) => void;
  finishPolyline: () => void;
  handlePointerDown: (point: Point) => void;
  handlePointerUp: () => void;

  // Selection
  selectedIds: Set<number>;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: () => void;
  selectionBox: SelectionBox | null;
  hoveredEntityId: number | null;
  setHoveredEntityId: (id: number | null) => void;

  // Snapping
  osnapEnabled: boolean;
  toggleOsnap: () => void;
  activeSnap: SnapPoint | null;

  // Grid & Ortho
  gridEnabled: boolean;
  toggleGrid: () => void;
  orthoEnabled: boolean;
  toggleOrtho: () => void;
  polarTrackingEnabled: boolean;
  togglePolarTracking: () => void;
  polarTrackingAngle: number;
  setPolarTrackingAngle: (angle: number) => void;

  // Grips
  activeGrip: ActiveGrip | null;
  activateGrip: (entityId: number, grip: GripPoint) => void;
  cancelGrip: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Zoom controls
  zoomToFitTrigger: number;
  triggerZoomToFit: () => void;
  zoomInTrigger: number;
  triggerZoomIn: () => void;
  zoomOutTrigger: number;
  triggerZoomOut: () => void;

  // Zoom Window
  zoomWindowMode: boolean;
  startZoomWindow: () => void;
  cancelZoomWindow: () => void;
  zoomWindowBox: { start: Point; end: Point } | null;
  setZoomWindowBox: React.Dispatch<React.SetStateAction<{ start: Point; end: Point } | null>>;
  applyZoomWindow: (start: Point, end: Point) => void;
  zoomWindowTrigger: { start: Point; end: Point } | null;

  // History
  historyManager: HistoryManager;

  // Text Dialog State
  textDialogState: {
    isOpen: boolean;
    mode?: 'TEXT' | 'MTEXT';
    initialText?: string;
    initialValues?: {
      text?: string;
      height?: number;
      rotation?: number;
      justification?: string;
      width?: number;
      lineSpacing?: number;
      color?: string;
    };
    callback?: (data: any) => void;
    onSubmit?: (text: string) => void;
    onCancel?: () => void;
  };
  setTextDialogState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    mode?: 'TEXT' | 'MTEXT';
    initialText?: string;
    initialValues?: {
      text?: string;
      height?: number;
      rotation?: number;
      justification?: string;
      width?: number;
      lineSpacing?: number;
      color?: string;
    };
    callback?: (data: any) => void;
    onSubmit?: (text: string) => void;
    onCancel?: () => void;
  }>>;

  // Table Dialog State
  tableDialogState: {
    isOpen: boolean;
    initialValues?: { rows?: number; cols?: number; rowHeight?: number; colWidth?: number; cellData?: string[][]; headerRow?: boolean };
    callback?: (data: any) => void;
    editMode?: boolean;
  };
  setTableDialogState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    initialValues?: { rows?: number; cols?: number; rowHeight?: number; colWidth?: number; cellData?: string[][]; headerRow?: boolean };
    callback?: (data: any) => void;
    editMode?: boolean;
  }>>;

  // Dimension Settings Dialog State
  dimensionSettingsDialogState: {
    isOpen: boolean;
  };
  setDimensionSettingsDialogState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
  }>>;

  // Dimension Edit Dialog State
  dimensionEditDialogState: {
    isOpen: boolean;
    entityId?: number;
  };
  setDimensionEditDialogState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    entityId?: number;
  }>>;

  // InPlaceTextEditor State
  inPlaceTextEditorState: {
    isOpen: boolean;
    entityId?: number;
    initialText?: string;
    position?: Point;
    width?: number;
    rotation?: number;
    style?: any;
    onSubmit?: (text: string, style?: any) => void;
    onCancel?: () => void;
  };
  setInPlaceTextEditorState: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    entityId?: number;
    initialText?: string;
    position?: Point;
    width?: number;
    rotation?: number;
    style?: any;
    onSubmit?: (text: string, style?: any) => void;
    onCancel?: () => void;
  }>>;
  submitInPlaceEdit: (text: string, style?: { height?: number; fontFamily?: string; color?: string; fontWeight?: string; fontStyle?: string; justification?: string }) => void;
  cancelInPlaceEdit: () => void;

  // Print System State
  printDialogState: { isOpen: boolean };
  setPrintDialogState: React.Dispatch<React.SetStateAction<{ isOpen: boolean }>>;

  printWindowMode: boolean;
  startPrintWindow: () => void;
  finishPrintWindow: () => void;
  printWindowBox: { start: Point; end: Point } | null;
  setPrintWindowBox: React.Dispatch<React.SetStateAction<{ start: Point; end: Point } | null>>;
  applyPrintWindow: (start: Point, end: Point) => void;
  // Print Preview
  printPreviewMode: boolean;
  startPrintPreview: () => void;
  finishPrintPreview: () => void;
  // Helper for print
  getEntitiesBoundingBox: () => { min: Point; max: Point } | null;
}

const DrawingContext = createContext<DrawingContextValue | null>(null);

export const useDrawing = (): DrawingContextValue => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within DrawingProvider');
  }
  return context;
};

interface DrawingProviderProps {
  children: React.ReactNode;
}

// localStorage keys
const STORAGE_KEY = 'cad_app_data';

// Load from localStorage
// Load from localStorage
const loadFromStorage = (): { sheets: DrawingSheet[]; activeSheetId: string; layers: Layer[]; activeLayerId: string } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      // Yeni format (sheets array)
      if (data.sheets && Array.isArray(data.sheets)) {
        return {
          sheets: data.sheets,
          activeSheetId: data.activeSheetId || data.sheets[0]?.id || '',
          layers: data.layers || [DEFAULT_LAYER],
          activeLayerId: data.activeLayerId || DEFAULT_LAYER.id,
        };
      }
      // Eski format (tek entities) - geriye dönük uyumluluk
      if (data.entities) {
        return {
          sheets: [{
            id: `sheet_${Date.now()}`,
            name: data.fileName || 'Untitled.dxf',
            entities: data.entities,
            isModified: false,
            baseUnit: data.baseUnit || 'mm',
            drawingUnit: data.drawingUnit || 'mm',
            drawingScale: data.drawingScale || '1:1',
          }],
          activeSheetId: '',
          layers: [DEFAULT_LAYER],
          activeLayerId: DEFAULT_LAYER.id,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
  }
  return null;
};

export const DrawingProvider: React.FC<DrawingProviderProps> = ({ children }) => {
  // Load initial state from localStorage
  const initialData = loadFromStorage();

  // Generate unique sheet ID
  const generateSheetId = useCallback(() => {
    return `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Default sheet for new/empty state
  const createDefaultSheet = (): DrawingSheet => ({
    id: `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Untitled.dxf',
    entities: [],
    isModified: false,
    baseUnit: 'mm',
    drawingUnit: 'mm',
    drawingScale: '1:1',
  });

  // Sheet/Tab management - initialize from localStorage or with one empty sheet
  const [sheets, setSheets] = useState<DrawingSheet[]>(() => {
    if (initialData && initialData.sheets.length > 0) {
      return initialData.sheets;
    }
    return [createDefaultSheet()];
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
    if (initialData && initialData.activeSheetId) {
      return initialData.activeSheetId;
    }
    return sheets[0]?.id || '';
  });

  // Table Dialog State
  const [tableDialogState, setTableDialogState] = useState<{
    isOpen: boolean;
    initialValues?: { rows?: number; cols?: number; rowHeight?: number; colWidth?: number; cellData?: string[][]; headerRow?: boolean };
    callback?: (data: any) => void;
    editMode?: boolean;
  }>({ isOpen: false });

  // Dimension Settings Dialog State
  const [dimensionSettingsDialogState, setDimensionSettingsDialogState] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });

  // Dimension Edit Dialog State
  const [dimensionEditDialogState, setDimensionEditDialogState] = useState<{
    isOpen: boolean;
    entityId?: number;
  }>({ isOpen: false });

  // InPlaceTextEditor State
  const [inPlaceTextEditorState, setInPlaceTextEditorState] = useState<{
    isOpen: boolean;
    entityId?: number;
    initialText?: string;
    position?: Point;
    width?: number;
    rotation?: number;
    style?: any;
    onSubmit?: (text: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false });

  const submitInPlaceEdit = useCallback((text: string, style?: { height?: number; fontFamily?: string; color?: string; fontWeight?: string; fontStyle?: string; justification?: string }) => {
    if (inPlaceTextEditorState.onSubmit) {
      inPlaceTextEditorState.onSubmit(text, style);
    }
    setInPlaceTextEditorState(prev => ({ ...prev, isOpen: false }));
  }, [inPlaceTextEditorState]);

  const cancelInPlaceEdit = useCallback(() => {
    if (inPlaceTextEditorState.onCancel) {
      inPlaceTextEditorState.onCancel();
    }
    setInPlaceTextEditorState(prev => ({ ...prev, isOpen: false }));
  }, [inPlaceTextEditorState]);

  // Print System State
  const [printDialogState, setPrintDialogState] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });

  const [printWindowMode, setPrintWindowMode] = useState(false);
  const [printWindowBox, setPrintWindowBox] = useState<{ start: Point; end: Point } | null>(null);

  const startPrintWindow = useCallback(() => {
    setPrintWindowMode(true);
    setPrintDialogState({ isOpen: false }); // Hide dialog during selection
    setPrintWindowBox(null);
    cancelCommand();
  }, []);

  const finishPrintWindow = useCallback(() => {
    setPrintWindowMode(false);
    setPrintDialogState({ isOpen: true }); // Show dialog after selection
  }, []);

  const applyPrintWindow = useCallback((start: Point, end: Point) => {
    setPrintWindowBox({ start, end });
    finishPrintWindow();
  }, [finishPrintWindow]);

  // Get active sheet
  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  // Derived state from active sheet
  const fileName = activeSheet?.name || 'Untitled.dxf';
  const isModified = activeSheet?.isModified || false;
  const entities = activeSheet?.entities || [];
  const baseUnit = activeSheet?.baseUnit || 'mm';
  const drawingUnit = activeSheet?.drawingUnit || 'mm';
  const drawingScale = activeSheet?.drawingScale || '1:1';
  const scaleFactor = SCALE_PRESETS[drawingScale as keyof typeof SCALE_PRESETS] || 1;

  // Update active sheet helper
  const updateActiveSheet = useCallback((updates: Partial<DrawingSheet>) => {
    setSheets(prev => prev.map(sheet =>
      sheet.id === activeSheetId ? { ...sheet, ...updates } : sheet
    ));
  }, [activeSheetId]);

  // Sheet management functions
  const addSheet = useCallback((name?: string) => {
    const newSheet: DrawingSheet = {
      id: generateSheetId(),
      name: name || `Çizim ${sheets.length + 1}`,
      entities: [],
      isModified: false,
      baseUnit: 'mm',
      drawingUnit: 'mm',
      drawingScale: '1:1',
    };
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  }, [sheets.length, generateSheetId]);



  const removeSheet = useCallback((id: string) => {
    if (sheets.length <= 1) {
      // Son sekmeyi silme, yerine yeni boş sekme oluştur
      const newSheet: DrawingSheet = {
        id: generateSheetId(),
        name: 'Untitled.dxf',
        entities: [],
        isModified: false,
        baseUnit: 'mm',
        drawingUnit: 'mm',
        drawingScale: '1:1',
      };
      setSheets([newSheet]);
      setActiveSheetId(newSheet.id);
      return;
    }

    const index = sheets.findIndex(s => s.id === id);
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);

    // Aktif sekme silindiyse, bir öncekine veya sonrakine geç
    if (activeSheetId === id) {
      const newIndex = Math.max(0, index - 1);
      setActiveSheetId(newSheets[newIndex]?.id || '');
    }
  }, [sheets, activeSheetId, generateSheetId]);

  const switchSheet = useCallback((id: string) => {
    if (sheets.some(s => s.id === id)) {
      setActiveSheetId(id);
    }
  }, [sheets]);

  const renameSheet = useCallback((id: string, newName: string) => {
    setSheets(prev => prev.map(sheet =>
      sheet.id === id ? { ...sheet, name: newName } : sheet
    ));
  }, []);

  // Proxy setters that update active sheet
  const setFileName = useCallback((name: string) => {
    updateActiveSheet({ name });
  }, [updateActiveSheet]);

  const setIsModified = useCallback((modified: boolean) => {
    updateActiveSheet({ isModified: modified });
  }, [updateActiveSheet]);

  const setEntities = useCallback((newEntities: Entity[] | ((prev: Entity[]) => Entity[])) => {
    setSheets(prev => prev.map(sheet => {
      if (sheet.id !== activeSheetId) return sheet;
      const updatedEntities = typeof newEntities === 'function'
        ? newEntities(sheet.entities)
        : newEntities;
      return { ...sheet, entities: updatedEntities };
    }));
  }, [activeSheetId]);

  const setBaseUnit = useCallback((unit: DrawingUnit) => {
    updateActiveSheet({ baseUnit: unit });
  }, [updateActiveSheet]);

  const setDrawingUnit = useCallback((unit: DrawingUnit) => {
    updateActiveSheet({ drawingUnit: unit });
  }, [updateActiveSheet]);

  const setDrawingScale = useCallback((scale: string) => {
    updateActiveSheet({ drawingScale: scale });
  }, [updateActiveSheet]);

  const [activeCommand, setActiveCommand] = useState<CommandType | null>(null);
  const [step, setStep] = useState(0);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const [cursorPosition, setCursorPosition] = useState<Point>([0, 0, 0]);
  const [commandState, setCommandState] = useState<Record<string, any>>({});
  const [osnapEnabled, setOsnapEnabled] = useState(true);
  const [activeSnap, setActiveSnap] = useState<SnapPoint | null>(null);

  const [gridEnabled, setGridEnabled] = useState(true);
  const toggleGrid = useCallback(() => setGridEnabled(prev => !prev), []);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const toggleOrtho = useCallback(() => setOrthoEnabled(prev => !prev), []);
  const [polarTrackingEnabled, setPolarTrackingEnabled] = useState(false);
  const togglePolarTracking = useCallback(() => setPolarTrackingEnabled(prev => !prev), []);
  const [polarTrackingAngle, setPolarTrackingAngle] = useState(45); // Default 45 degrees

  // Layer Dialog State
  const [layerDialogState, setLayerDialogState] = useState<{ isOpen: boolean }>({ isOpen: false });

  // Layer State
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (initialData && initialData.layers) return initialData.layers;
    return [DEFAULT_LAYER];
  });
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    if (initialData && initialData.activeLayerId) return initialData.activeLayerId;
    return DEFAULT_LAYER.id;
  });

  const [activeLineType, setActiveLineType] = useState<string>('continuous'); // Default continuous or BYLAYER logic
  const [activeLineWeight, setActiveLineWeight] = useState<number>(0); // 0 often used for Default/ByLayer


  const addLayer = useCallback((layer: Layer) => {
    setLayers(prev => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((id: string) => {
    if (id === DEFAULT_LAYER.id) {
      console.warn("Cannot delete default layer '0'");
      return;
    }
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(DEFAULT_LAYER.id);
    }
  }, [activeLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  // Zoom triggers - bu değerler arttığında Scene bileşeni kamerayı günceller
  const [zoomToFitTrigger, setZoomToFitTrigger] = useState(0);
  const triggerZoomToFit = useCallback(() => {
    setZoomToFitTrigger(prev => prev + 1);
  }, []);

  const [zoomInTrigger, setZoomInTrigger] = useState(0);
  const triggerZoomIn = useCallback(() => {
    setZoomInTrigger(prev => prev + 1);
  }, []);

  const [zoomOutTrigger, setZoomOutTrigger] = useState(0);
  const triggerZoomOut = useCallback(() => {
    setZoomOutTrigger(prev => prev + 1);
  }, []);

  // Zoom Window state
  const [zoomWindowMode, setZoomWindowMode] = useState(false);
  const [zoomWindowBox, setZoomWindowBox] = useState<{ start: Point; end: Point } | null>(null);
  const [zoomWindowTrigger, setZoomWindowTrigger] = useState<{ start: Point; end: Point } | null>(null);
  // Dialog State
  const [textDialogState, setTextDialogState] = useState<{
    isOpen: boolean;
    mode?: 'TEXT' | 'MTEXT';
    initialText?: string;
    initialValues?: {
      text?: string;
      height?: number;
      rotation?: number;
      justification?: string;
      width?: number;
      lineSpacing?: number;
      color?: string;
    };
    callback?: (data: any) => void;
    onSubmit?: (text: string) => void;
    onCancel?: () => void;
  }>({ isOpen: false, mode: 'TEXT' });
  // Table Dialog State



  const startZoomWindow = useCallback(() => {
    setZoomWindowMode(true);
    setZoomWindowBox(null);
    cancelCommand(); // Cancel any active drawing command
  }, []);

  const cancelZoomWindow = useCallback(() => {
    setZoomWindowMode(false);
    setZoomWindowBox(null);
  }, []);

  const applyZoomWindow = useCallback((start: Point, end: Point) => {
    setZoomWindowTrigger({ start, end });
    setZoomWindowMode(false);
    setZoomWindowBox(null);
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hoveredEntityId, setHoveredEntityId] = useState<number | null>(null);

  // Auto-save sheets and layers to localStorage (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          sheets,
          activeSheetId,
          layers,
          activeLayerId,
        }));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, 1000); // 1 saniye debounce

    return () => clearTimeout(timeoutId);
  }, [sheets, activeSheetId, layers, activeLayerId]);

  // History manager
  const historyManager = useRef<HistoryManager>(new HistoryManager(100));

  // State before command (for undo)
  const beforeStateRef = useRef<{
    entities: Entity[];
    selection: Set<number>;
  } | null>(null);

  // Capture state before modifying
  const captureBeforeState = useCallback(() => {
    beforeStateRef.current = {
      entities: JSON.parse(JSON.stringify(entities)),
      selection: new Set(selectedIds),
    };
  }, [entities, selectedIds]);

  // Create history item after modification
  const createHistoryItem = useCallback((command: CommandType) => {
    if (!beforeStateRef.current) return;

    const item = historyManager.current.createHistoryItem(
      command,
      beforeStateRef.current.entities,
      entities,
      beforeStateRef.current.selection,
      selectedIds
    );
    historyManager.current.pushHistory(item);
    beforeStateRef.current = null;
  }, [entities, selectedIds]);

  // New file - clear all entities and reset state
  const newFile = useCallback(() => {
    setEntities([]);
    setSelectedIds(new Set());
    setFileName('Untitled.dxf');
    setIsModified(false);
    historyManager.current = new HistoryManager(100);
    cancelCommand();
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }, []);



  // Load entities from file
  const loadEntities = useCallback((newEntities: Entity[], newFileName?: string) => {
    // Legacy support: update active sheet
    updateActiveSheet({
      entities: newEntities,
      name: newFileName || fileName
    });
    // Reset selection and command state
    setSelectedIds(new Set());
    setCommandState({});
    setActiveCommand(null);
    setStep(0);
    setTempPoints([]);

    // Reset history
    historyManager.current = new HistoryManager(100);
  }, [updateActiveSheet, fileName]);

  // Load project (multi-sheet support)
  const loadProject = useCallback((data: any) => {
    if (!data) return;

    if (data.sheets && Array.isArray(data.sheets)) {
      // Multi-sheet format
      setSheets(data.sheets);

      // Set active sheet
      if (data.activeSheetId && data.sheets.some((s: any) => s.id === data.activeSheetId)) {
        setActiveSheetId(data.activeSheetId);
      } else if (data.sheets.length > 0) {
        setActiveSheetId(data.sheets[0].id);
      }
    } else if (data.entities && Array.isArray(data.entities)) {
      // Legacy format (single sheet)
      loadEntities(data.entities, data.fileName || 'Untitled.dxf');
    }

    // Reset common state
    setCommandState({});
    setActiveCommand(null);
    setStep(0);
    setTempPoints([]);
    setSelectedIds(new Set());
    setSelectedIds(new Set());
    // setHistory and setRedoStack are not available, handled by resetting historyManager
    historyManager.current = new HistoryManager(100);
  }, [loadEntities]);

  // Unique ID counter - crypto.randomUUID kullan (daha güvenilir)
  const idCounterRef = useRef(0);
  const generateUniqueId = useCallback(() => {
    idCounterRef.current += 1;
    // Benzersiz ID: timestamp + counter + random
    return Date.now() * 10000 + idCounterRef.current * 10 + Math.floor(Math.random() * 10);
  }, []);

  // Add entity
  const addEntity = useCallback((entity: any) => {
    captureBeforeState();
    const newEntity: Entity = {
      ...entity,
      id: generateUniqueId(),
      visible: entity.visible ?? true,
      locked: entity.locked ?? false,
      layer: entity.layer || activeLayerId, // Use active layer if not provided
      color: entity.color || 'BYLAYER', // Default to BYLAYER
      lineType: entity.lineType || activeLineType, // Default to active line type
      lineWeight: entity.lineWeight ?? activeLineWeight, // Default to active line weight
    } as Entity;
    setEntities(prev => [...prev, newEntity]);
    setIsModified(true);
    createHistoryItem('ADD' as CommandType);
  }, [captureBeforeState, createHistoryItem]);

  // Update entity
  const updateEntity = useCallback((id: number, updates: any) => {
    captureBeforeState();
    setEntities(prev => prev.map(ent =>
      ent.id === id ? { ...ent, ...updates } : ent
    ));
    setIsModified(true);
    createHistoryItem('UPDATE' as CommandType);
  }, [captureBeforeState, createHistoryItem]);

  // Delete entities
  const deleteEntities = useCallback((ids: Set<number>) => {
    captureBeforeState();
    // Filter out locked entities
    const lockedLayerIds = new Set(layers.filter(l => l.locked).map(l => l.id));
    setEntities(prev => prev.filter(ent => {
      if (ids.has(ent.id)) {
        // If trying to delete, check if locked
        if (lockedLayerIds.has(ent.layer)) {
          console.warn(`Cannot delete entity on locked layer ${ent.layer}`);
          return true; // Keep it
        }
        return false; // Delete it
      }
      return true; // Keep others
    }));
    setIsModified(true);
    createHistoryItem('ERASE' as CommandType);
  }, [captureBeforeState, createHistoryItem]);



  // Delete key handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeElement = document.activeElement;
        const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        if (!isInput && selectedIds.size > 0) {
          deleteEntities(selectedIds);
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, deleteEntities]);

  // Get entity by ID
  const getEntity = useCallback((id: number): Entity | undefined => {
    return entities.find(ent => ent.id === id);
  }, [entities]);

  // Start command
  const startCommand = useCallback((cmd: CommandType) => {
    setActiveCommand(cmd);
    setStep(1);
    setTempPoints([]);
    setCommandState({});
    if (['LINE', 'CIRCLE', 'POLYLINE', 'RECTANGLE', 'POLYGON', 'ARC', 'SPLINE', 'ELLIPSE', 'POINT', 'RAY', 'XLINE', 'DONUT', 'TEXT', 'MTEXT', 'DIMLINEAR', 'DIMALIGNED', 'DIMANGULAR', 'DIMRADIUS', 'DIMDIAMETER', 'HATCH'].includes(cmd)) {
      setSelectedIds(new Set());
    }

    // DIMCONTINUE: Ardışık ölçü - önceden ölçü gerekmez
    // Step 1: İlk nokta, Step 2: İkinci nokta, Step 3: Ölçü pozisyonu, Step 4+: Devam noktaları
    if (cmd === 'DIMCONTINUE') {
      // Önceden bir ölçü varsa ondan devam et
      const lastDim = [...entities]
        .reverse()
        .find(e => e.type === 'DIMENSION' && (
          (e as any).dimType === 'DIMLINEAR' ||
          (e as any).dimType === 'DIMALIGNED'
        ));

      if (lastDim) {
        // Mevcut ölçüden devam et
        setCommandState({
          lastDimension: lastDim,
          basePoint: (lastDim as any).end,
          dimLinePosition: (lastDim as any).dimLinePosition,
          hasPreviousDim: true
        });
        setTempPoints([(lastDim as any).end]);
        setStep(4); // Direkt devam moduna geç
        console.log('DIMCONTINUE: Found last dimension, continuing from end point');
      } else {
        // Önceden ölçü yok - sıfırdan başla
        setCommandState({ hasPreviousDim: false });
        console.log('DIMCONTINUE: No previous dimension, starting fresh');
        // Step 1'de kalır - ilk nokta seçilecek
      }
    }

    // DIMBASELINE: Taban ölçü - önceden ölçü gerekmez
    if (cmd === 'DIMBASELINE') {
      const lastDim = [...entities]
        .reverse()
        .find(e => e.type === 'DIMENSION' && (
          (e as any).dimType === 'DIMLINEAR' ||
          (e as any).dimType === 'DIMALIGNED'
        ));

      if (lastDim) {
        setCommandState({
          baselineDimension: lastDim,
          basePoint: (lastDim as any).start,
          dimLinePosition: (lastDim as any).dimLinePosition,
          offsetMultiplier: 1,
          hasPreviousDim: true
        });
        setTempPoints([(lastDim as any).start]);
        setStep(4); // Direkt devam moduna geç
        console.log('DIMBASELINE: Found last dimension, ready for next point');
      } else {
        // Önceden ölçü yok - sıfırdan başla
        setCommandState({ hasPreviousDim: false, offsetMultiplier: 0 });
        console.log('DIMBASELINE: No previous dimension, starting fresh');
        // Step 1'de kalır - ilk nokta seçilecek
      }
    }

    console.log(`Command started: ${cmd}`);
  }, [entities]);

  // Cancel command
  const cancelCommand = useCallback(() => {
    // POLYLINE ve SPLINE için: ESC'de 2+ nokta varsa entity olarak kaydet
    if ((activeCommand === 'POLYLINE' || activeCommand === 'LINE') && tempPoints.length >= 2) {
      // Çizilen noktaları entity olarak kaydet
      addEntity({
        type: 'LWPOLYLINE',
        vertices: tempPoints,
        closed: false,
        color: 'BYLAYER',
        layer: activeLayerId,
      });
      console.log('POLYLINE saved before cancel');
    } else if (activeCommand === 'SPLINE' && tempPoints.length >= 2) {
      addEntity({
        type: 'SPLINE',
        controlPoints: tempPoints,
        degree: Math.min(3, tempPoints.length - 1),
        closed: false,
        color: 'BYLAYER',
        layer: activeLayerId,
      });
      console.log('SPLINE saved before cancel');
    }

    setActiveCommand(null);
    setStep(0);
    setTempPoints([]);
    setCommandState({});
    console.log('Command cancelled');
  }, [activeCommand, tempPoints, addEntity, activeLayerId]);

  // Toggle selection
  const toggleSelection = useCallback((id: number) => {
    if (activeCommand && !['MOVE', 'COPY', 'ROTATE', 'SCALE', 'MIRROR', 'ERASE', 'OFFSET', 'EXPLODE', 'TRIM', 'EXTEND', 'JOIN', 'FILLET', 'CHAMFER'].includes(activeCommand)) {
      return;
    }
    const ent = entities.find(e => e.id === id);
    if (!ent) return;

    const layer = layers.find(l => l.id === ent.layer);
    if (layer && layer.locked) {
      console.log(`Cannot select entity on locked layer ${layer.name}`);
      return;
    }

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [activeCommand]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    const allIds = new Set(entities.map(e => e.id));
    setSelectedIds(allIds);
  }, [entities]);

  // Finish polyline
  const finishPolyline = useCallback(() => {
    if (activeCommand === 'POLYLINE' && tempPoints.length > 1) {
      addEntity({
        type: 'LWPOLYLINE',
        vertices: tempPoints,
        closed: false,
        color: 'BYLAYER',
        layer: activeLayerId,
      });
      cancelCommand();
    }
  }, [activeCommand, tempPoints, addEntity, cancelCommand, activeLayerId]);

  // Undo
  const undo = useCallback(() => {
    if (activeCommand) {
      cancelCommand();
      return;
    }
    const item = historyManager.current.undo();
    if (item) {
      setEntities(JSON.parse(JSON.stringify(item.before.entities)));
      setSelectedIds(new Set(item.before.selection));
    }
  }, [activeCommand, cancelCommand]);

  // Redo
  const redo = useCallback(() => {
    if (activeCommand) {
      cancelCommand();
      return;
    }
    const item = historyManager.current.redo();
    if (item) {
      setEntities(JSON.parse(JSON.stringify(item.after.entities)));
      setSelectedIds(new Set(item.after.selection));
    }
  }, [activeCommand, cancelCommand]);

  // Can undo
  const canUndo = useCallback(() => {
    return historyManager.current.canUndo();
  }, []);

  // Can redo
  const canRedo = useCallback(() => {
    return historyManager.current.canRedo();
  }, []);

  // Keyboard shortcuts event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input alanlarında çalışmasını engelle
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z for Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }

      // Ctrl+A for Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectAll]);

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const selectionStartRef = useRef<Point | null>(null);
  const [activeGrip, setActiveGrip] = useState<ActiveGrip | null>(null);
  const wasBoxSelectingRef = useRef<boolean>(false);

  // Shift key tracking for ortho mode
  const [shiftKeyPressed, setShiftKeyPressed] = useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftKeyPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftKeyPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePointerDown = useCallback((point: Point) => {
    // Start window selection if:
    // 1. No active command
    // 2. Not hovering over a grip (handled elsewhere usually, but if here, we check activeGrip null)
    // 3. Not actively snapping to an object? AutoCad snaps still work for selection, but clicking ON object selects it.
    // If we click on empty space, we start box.
    if (!activeCommand && !activeGrip) {
      // Check if we clicked on an entity first (Direct Selection)
      // Actually, AutoCAD logic: Click down. If mouse doesn't move much and Up -> Click. If moves -> Drag.
      // Let's implement that in pointerUp or by tracking movement.
      selectionStartRef.current = point;
    }
  }, [activeCommand, activeGrip]);

  const updateSelectionBox = useCallback((start: Point, end: Point) => {
    const mode = end[0] > start[0] ? 'WINDOW' : 'CROSSING';
    setSelectionBox({ start, end, mode });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (selectionStartRef.current) {
      if (selectionBox) {
        // End Box Selection
        wasBoxSelectingRef.current = true; // Flag to prevent onClick from firing
        const { start, end, mode } = selectionBox;
        const minX = Math.min(start[0], end[0]);
        const maxX = Math.max(start[0], end[0]);
        const minY = Math.min(start[1], end[1]);
        const maxY = Math.max(start[1], end[1]);
        const min: Point = [minX, minY, 0];
        const max: Point = [maxX, maxY, 0];

        const newSelectedIds = new Set<number>();

        entities.forEach(ent => {
          if (ent.visible === false) return; // Only skip if explicitly false
          let match = false;
          if (mode === 'WINDOW') {
            if (isEntityInBox(ent, min, max)) match = true;
          } else {
            if (doesEntityIntersectBox(ent, min, max)) match = true;
          }

          if (match) {
            // Check for locked layer
            const layer = layers.find(l => l.id === ent.layer);
            if (!layer || !layer.locked) {
              newSelectedIds.add(ent.id);
            }
          }
        });
        setSelectedIds(newSelectedIds);

        // Reset flag after a short delay to allow onClick to be skipped
        setTimeout(() => { wasBoxSelectingRef.current = false; }, 50);
      }
      setSelectionBox(null);
      selectionStartRef.current = null;
    }
  }, [selectionBox, entities]);

  // ... (existing code)

  const toggleOsnap = useCallback(() => {
    setOsnapEnabled(prev => !prev);
  }, []);

  const activateGrip = useCallback((entityId: number, grip: GripPoint) => {
    const ent = entities.find(e => e.id === entityId);
    if (!ent) return;

    const layer = layers.find(l => l.id === ent.layer);
    if (layer && layer.locked) {
      return;
    }

    captureBeforeState();
    setActiveGrip({
      entityId,
      grip,
      originalEntity: JSON.parse(JSON.stringify(ent)),
      startPoint: grip.point
    });
    setActiveSnap(null);
  }, [entities, captureBeforeState]);

  // Cancel grip editing and restore original entity
  const cancelGrip = useCallback(() => {
    if (activeGrip) {
      // Restore original entity
      const { entityId, originalEntity } = activeGrip;
      setEntities(prev => prev.map(e => e.id === entityId ? originalEntity : e));
      setActiveGrip(null);
      setActiveSnap(null);
    }
  }, [activeGrip]);

  const handleMouseMove = useCallback((point: Point) => {
    // Grip Dragging Logic
    if (activeGrip) {
      const { entityId, grip, originalEntity, startPoint } = activeGrip;

      // Calculate snapped point if OSNAP is on (recursive snap? interesting)
      // For now, let's just use raw point or simple snap if we want.
      // If we want snapping while dragging grip, we should use getClosestSnapPoint here too.
      let effectivePoint = point;
      if (osnapEnabled) {
        const snap = getClosestSnapPoint(point, entities.filter(e => e.id !== entityId), 1.0); // Don't snap to self
        if (snap) {
          effectivePoint = snap.point;
          setActiveSnap(snap);
        } else {
          setActiveSnap(null);
        }
      }

      let newEnt: any = { ...originalEntity };

      if (originalEntity.type === 'LINE') {
        if (grip.type === 'start') {
          newEnt.start = effectivePoint;
        } else if (grip.type === 'end') {
          newEnt.end = effectivePoint;
        } else if (grip.type === 'mid') {
          newEnt.start = translatePt(originalEntity.start as Point, effectivePoint[0] - startPoint[0], effectivePoint[1] - startPoint[1]);
          newEnt.end = translatePt(originalEntity.end as Point, effectivePoint[0] - startPoint[0], effectivePoint[1] - startPoint[1]);
        }
      } else if (originalEntity.type === 'CIRCLE') {
        if (grip.type === 'center') {
          newEnt.center = effectivePoint;
        } else if (grip.type === 'quadrant') {
          newEnt.radius = distance2D(newEnt.center[0], newEnt.center[1], effectivePoint[0], effectivePoint[1]);
        }
      } else if (originalEntity.type === 'ARC') {
        if (grip.type === 'center') {
          newEnt.center = effectivePoint;
        }
        // Arc start/end points change angles. Complex math.
        // For now support center move only
      } else if (originalEntity.type === 'POINT') {
        newEnt.position = effectivePoint;
      } else if (originalEntity.type === 'ELLIPSE') {
        if (grip.type === 'center') newEnt.center = effectivePoint;
      } else if (originalEntity.type === 'LWPOLYLINE') {
        if (grip.type === 'vertex' && grip.index !== undefined) {
          const newVerts = [...originalEntity.vertices];
          newVerts[grip.index] = effectivePoint;
          newEnt.vertices = newVerts;
        }
      }

      setEntities(prev => prev.map(e => e.id === entityId ? (newEnt as Entity) : e));
      setCursorPosition(point); // Update cursor visual
      return;
    }

    // Selection Box Logic
    if (selectionStartRef.current) {
      // Threshold check to avoid accidental boxes on clicks
      const start = selectionStartRef.current;
      const dist = Math.sqrt(Math.pow(point[0] - start[0], 2) + Math.pow(point[1] - start[1], 2));
      if (dist > 3.0) { // 3.0 units threshold (daha büyük threshold)
        updateSelectionBox(start, point);
      }
    }

    // Only calculate snap points when actively drawing (command is active)
    // This prevents unnecessary calculations during idle mouse movement
    if (osnapEnabled && activeCommand) {
      const snap = getClosestSnapPoint(point, entities, 1.0);
      setActiveSnap(snap);
    } else if (activeSnap !== null) {
      setActiveSnap(null);
    }

    // Ortho constraint when Shift is held during LINE/POLYLINE
    let finalPoint = point;
    if (shiftKeyPressed && (activeCommand === 'LINE' || activeCommand === 'POLYLINE') && tempPoints.length > 0) {
      const lastPoint = tempPoints[tempPoints.length - 1];
      const dx = point[0] - lastPoint[0];
      const dy = point[1] - lastPoint[1];

      // Snap to nearest 90 degree angle (horizontal or vertical)
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        finalPoint = [point[0], lastPoint[1], 0];
      } else {
        // Vertical
        finalPoint = [lastPoint[0], point[1], 0];
      }
    }

    setCursorPosition(finalPoint);
  }, [entities, osnapEnabled, activeGrip, activeCommand, activeSnap, setActiveSnap, setEntities, setCursorPosition, updateSelectionBox, shiftKeyPressed, tempPoints]);

  const handleCommandInput = useCallback((rawPoint: Point) => {
    // Skip if we just finished box selection
    if (wasBoxSelectingRef.current) {
      return;
    }

    let point = (osnapEnabled && activeSnap) ? activeSnap.point : rawPoint;

    // Ortho constraint when Shift is held or orthoEnabled during LINE/POLYLINE
    if ((shiftKeyPressed || orthoEnabled) && (activeCommand === 'LINE' || activeCommand === 'POLYLINE') && tempPoints.length > 0) {
      const lastPoint = tempPoints[tempPoints.length - 1];
      const dx = point[0] - lastPoint[0];
      const dy = point[1] - lastPoint[1];

      // Snap to nearest 90 degree angle (horizontal or vertical)
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        point = [point[0], lastPoint[1], 0];
      } else {
        // Vertical
        point = [lastPoint[0], point[1], 0];
      }
    }
    // Polar Tracking constraint
    else if (polarTrackingEnabled && (activeCommand === 'LINE' || activeCommand === 'POLYLINE') && tempPoints.length > 0) {
      const lastPoint = tempPoints[tempPoints.length - 1];
      const dx = point[0] - lastPoint[0];
      const dy = point[1] - lastPoint[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.001) {
        // Get current angle in degrees
        let currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (currentAngle < 0) currentAngle += 360;

        // Snap to nearest polar angle increment
        const increment = polarTrackingAngle;
        const snappedAngle = Math.round(currentAngle / increment) * increment;
        const snappedAngleRad = snappedAngle * Math.PI / 180;

        // Check if we're close enough to snap (within 5 degrees)
        const angleDiff = Math.abs(currentAngle - snappedAngle);
        if (angleDiff < 5 || angleDiff > (360 - 5)) {
          point = [
            lastPoint[0] + Math.cos(snappedAngleRad) * dist,
            lastPoint[1] + Math.sin(snappedAngleRad) * dist,
            0
          ];
        }
      }
    }

    // Grip Commit
    if (activeGrip) {
      createHistoryItem('UPDATE' as CommandType);
      setActiveGrip(null);
      setActiveSnap(null);
      return;
    }

    if (!activeCommand) {
      // Selection mode
      let minD = Infinity;
      let closestId: number | null = null;
      const SELECT_THRESHOLD = 5.0;
      entities.forEach(ent => {
        if (ent.visible === false) return;
        const d = closestPointOnEntity(point[0], point[1], ent);
        if (d < SELECT_THRESHOLD && d < minD) {
          minD = d;
          closestId = ent.id;
        }
      });
      if (closestId !== null) toggleSelection(closestId);
      else clearSelection();
      return;
    }

    // Drawing commands
    if (activeCommand === 'LINE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        // Kapalı alan kontrolü - ilk noktaya yakınsa kapatıp bitir
        if (tempPoints.length >= 2) {
          const firstPoint = tempPoints[0];
          const dist = Math.hypot(point[0] - firstPoint[0], point[1] - firstPoint[1]);
          const closeThreshold = 3; // birim
          if (dist < closeThreshold) {
            // Kapalı polyline oluştur
            addEntity({
              type: 'LWPOLYLINE',
              vertices: tempPoints,
              closed: true,
              color: '#fff',
              layer: '0',
            });
            console.log('Closed polyline created');
            // Yeni çizime başla
            setStep(1);
            setTempPoints([]);
            return;
          }
        }

        // AutoCAD uyumlu LINE davranışı:
        // Her ikinci noktada bir çizgi oluştur
        const lastPoint = tempPoints[tempPoints.length - 1];
        addEntity({
          type: 'LINE',
          start: lastPoint,
          end: point,
          color: '#fff',
          layer: '0',
        });

        // Son noktayı başlangıç noktası yap, devam et
        setTempPoints([point]);
        // Step 2'de kal - bir sonraki çizgi için hazır
      }
    } else if (activeCommand === 'CIRCLE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const r = Math.hypot(point[0] - tempPoints[0][0], point[1] - tempPoints[0][1]);
        addEntity({
          type: 'CIRCLE',
          center: tempPoints[0],
          radius: r,
          color: '#fff',
          layer: '0',
        });
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
        setCommandState({});
      }
    } else if (activeCommand === 'ARC') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        setTempPoints(prev => [...prev, point]);
        setStep(3);
      } else if (step === 3) {
        const arc = createArcFrom3Points(tempPoints[0], tempPoints[1], point);
        if (arc) {
          addEntity({
            type: 'ARC',
            ...arc,
            color: '#fff',
            layer: '0',
          });
        }
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
        setCommandState({});
      }
    } else if (activeCommand === 'POLYLINE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else {
        setTempPoints(prev => [...prev, point]);
      }
    } else if (activeCommand === 'RECTANGLE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const p1 = tempPoints[0];
        const p2 = point;
        // Use consistent Z=0 for all vertices
        addEntity({
          type: 'LWPOLYLINE',
          vertices: [
            [p1[0], p1[1], 0] as Point,
            [p2[0], p1[1], 0] as Point,
            [p2[0], p2[1], 0] as Point,
            [p1[0], p2[1], 0] as Point
          ],
          closed: true,
          color: '#fff',
          layer: '0',
        });
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
      }
    } else if (activeCommand === 'POLYGON') {
      if (step === 1 || !commandState.center) {
        const sides = commandState.sides || 6;
        setCommandState({ sides, center: point });
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const { center, sides } = commandState;
        const r = Math.hypot(point[0] - center[0], point[1] - center[1]);
        const a0 = Math.atan2(point[1] - center[1], point[0] - center[0]);
        const v: Point[] = [];
        for (let i = 0; i < sides; i++) {
          const t = a0 + (i / sides) * Math.PI * 2;
          v.push([center[0] + Math.cos(t) * r, center[1] + Math.sin(t) * r, 0]);
        }
        addEntity({
          type: 'LWPOLYLINE',
          vertices: v,
          closed: true,
          color: '#fff',
          layer: '0',
        });
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
        setCommandState({});
      }
    } else if (activeCommand === 'ELLIPSE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const rx = Math.hypot(point[0] - tempPoints[0][0], point[1] - tempPoints[0][1]);
        setCommandState({ center: tempPoints[0], rx });
        setTempPoints([tempPoints[0], point]);
        setStep(3);
      } else if (step === 3) {
        const { center, rx } = commandState;
        const ry = Math.hypot(point[0] - center[0], point[1] - center[1]);
        addEntity({
          type: 'ELLIPSE',
          center,
          rx,
          ry,
          rotation: 0,
          color: '#fff',
          layer: '0',
        });
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
        setCommandState({});
      }
    } else if (activeCommand === 'POINT') {
      addEntity({
        type: 'POINT',
        position: point,
        color: '#fff',
        layer: '0',
      });
      // Stay in POINT mode for multiple points
    } else if (activeCommand === 'SPLINE') {
      // Spline: Collect control points, press Enter to finish
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else {
        setTempPoints(prev => [...prev, point]);
      }
    } else if (activeCommand === 'RAY') {
      // Ray: Origin point, then direction point
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const origin = tempPoints[0];
        const dx = point[0] - origin[0];
        const dy = point[1] - origin[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const direction: Point = len > 0.001 ? [dx / len, dy / len, 0] : [1, 0, 0];
        addEntity({
          type: 'RAY',
          origin,
          direction,
          color: '#fff',
          layer: '0',
        });
        // Reset to step 1 for next ray with new origin
        setTempPoints([]);
        setStep(1);
        // Stay in RAY mode for multiple rays
      }
    } else if (activeCommand === 'XLINE') {
      // Xline (Construction Line): Origin point, then direction point
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const origin = tempPoints[0];
        const dx = point[0] - origin[0];
        const dy = point[1] - origin[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const direction: Point = len > 0.001 ? [dx / len, dy / len, 0] : [1, 0, 0];
        addEntity({
          type: 'XLINE',
          origin,
          direction,
          color: '#fff',
          layer: '0',
        });
        // Reset to step 1 for next xline with new origin
        setTempPoints([]);
        setStep(1);
        // Stay in XLINE mode for multiple xlines
      }
    } else if (activeCommand === 'DONUT') {
      // Donut: Center point, then inner radius, then outer radius
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const center = tempPoints[0];
        const innerRadius = Math.hypot(point[0] - center[0], point[1] - center[1]);
        setCommandState({ center, innerRadius });
        setTempPoints([center, point]);
        setStep(3);
      } else if (step === 3) {
        const { center, innerRadius } = commandState;
        const outerRadius = Math.hypot(point[0] - center[0], point[1] - center[1]);
        if (outerRadius > innerRadius) {
          addEntity({
            type: 'DONUT',
            center,
            innerRadius,
            outerRadius,
            color: '#fff',
            layer: '0',
          });
        } else {
          console.log('Outer radius must be greater than inner radius');
        }
        // Komut aktif kalsın - ESC ile çıkılır
        setStep(1);
        setTempPoints([]);
        setCommandState({});
      }
    } else if (activeCommand === 'TEXT') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);

        // Open In-Place Text Editor instead of dialog (AutoCAD style)
        setInPlaceTextEditorState({
          isOpen: true,
          position: point,
          initialText: '',
          style: { height: 10, rotation: 0, fontFamily: 'Arial', color: '#FFFFFF' },
          onSubmit: (text: string, style?: any) => {
            if (text.trim()) {
              captureBeforeState();
              addEntity({
                type: 'TEXT',
                position: point,
                text: text,
                height: style?.height || 10,
                rotation: 0,
                color: style?.color || '#FFFFFF',
                layer: '0',
                justification: style?.justification || 'left',
                textStyle: {
                  fontFamily: style?.fontFamily || 'Arial',
                  fontWeight: style?.fontWeight || 'normal',
                  fontStyle: style?.fontStyle || 'normal'
                }
              });
              createHistoryItem('TEXT' as CommandType);
            }
            cancelCommand();
          },
          onCancel: () => {
            cancelCommand();
          }
        });
      }
    } else if (activeCommand === 'MTEXT') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        // Second point defines width
        const p1 = tempPoints[0];
        const width = Math.abs(point[0] - p1[0]);

        // Open Dialog for MText content
        setTextDialogState({
          isOpen: true,
          mode: 'MTEXT',
          initialValues: { height: 10 },
          callback: (data) => {
            addEntity({
              type: 'MTEXT',
              position: [Math.min(p1[0], point[0]), Math.max(p1[1], point[1]), 0], // Top-left
              width: width,
              text: data.text,
              height: data.height,
              color: '#fff',
              layer: '0'
            });
            cancelCommand();
          }
        });
      }
    } else if (activeCommand === 'TABLE') {
      if (step === 1) {
        setTempPoints([point]);
        setStep(2); // Ask for properties via Dialog

        setTableDialogState({
          isOpen: true,
          initialValues: { rows: 4, cols: 4, rowHeight: 10, colWidth: 30 },
          callback: (data) => {
            const { rows, cols, rowHeight, colWidth } = data;

            addEntity({
              type: 'TABLE',
              position: [point[0], point[1], 0],
              rows,
              cols,
              rowHeight,
              colWidth,
              color: '#fff',
              layer: '0'
            });

            cancelCommand();
          }
        });
      }
    } else if (activeCommand === 'MOVE') {
      // Step 0/1: Select
      if (step === 0 || (step === 1 && selectedIds.size === 0)) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
        setStep(1);
        return;
      }
      // Step 1: Base point
      if (step === 1 && selectedIds.size > 0) {
        captureBeforeState();
        setTempPoints([point]);
        setCommandState({ base: point, selectedEntities: Array.from(selectedIds) });
        setStep(2);
        return;
      }
      // Step 2: Second point (Displacement)
      if (step === 2) {
        const { base, selectedEntities } = commandState;
        const dx = point[0] - base[0];
        const dy = point[1] - base[1];

        (selectedEntities || Array.from(selectedIds)).forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent };
          if (ent.type === 'LINE') {
            (newEnt as any).start = translatePt((ent as any).start, dx, dy);
            (newEnt as any).end = translatePt((ent as any).end, dx, dy);
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
            (newEnt as any).center = translatePt((ent as any).center, dx, dy);
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) => translatePt(v, dx, dy));
          } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE' || ent.type === 'BLOCK_REFERENCE' || ent.type === 'INSERT') {
            (newEnt as any).position = translatePt((ent as any).position, dx, dy);
          } else if (ent.type === 'HATCH') {
            if ((ent as any).boundary?.vertices) {
              (newEnt as any).boundary.vertices = (ent as any).boundary.vertices.map((v: Point) => translatePt(v, dx, dy));
            }
          }
          updateEntity(id, newEnt as Entity);
        });
        createHistoryItem('MOVE' as CommandType);
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'COPY') {
      // Step 0/1: Select
      if (step === 0 || (step === 1 && selectedIds.size === 0)) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
        setStep(1);
        return;
      }
      // Step 1: Base point
      if (step === 1 && selectedIds.size > 0) {
        setTempPoints([point]);
        setCommandState({ base: point, selectedEntities: Array.from(selectedIds) });
        setStep(2);
        return;
      }
      // Step 2: Second point (Displacement and Copy)
      if (step === 2) {
        captureBeforeState();
        const { base, selectedEntities } = commandState;
        const dx = point[0] - base[0];
        const dy = point[1] - base[1];

        (selectedEntities || Array.from(selectedIds)).forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent, id: Date.now() + Math.random() }; // New ID
          if (ent.type === 'LINE') {
            (newEnt as any).start = translatePt((ent as any).start, dx, dy);
            (newEnt as any).end = translatePt((ent as any).end, dx, dy);
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
            (newEnt as any).center = translatePt((ent as any).center, dx, dy);
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) => translatePt(v, dx, dy));
          } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE' || ent.type === 'BLOCK_REFERENCE' || ent.type === 'INSERT') {
            (newEnt as any).position = translatePt((ent as any).position, dx, dy);
          } else if (ent.type === 'HATCH') {
            if ((ent as any).boundary?.vertices) {
              (newEnt as any).boundary.vertices = (ent as any).boundary.vertices.map((v: Point) => translatePt(v, dx, dy));
            }
          }
          addEntity(newEnt as Entity);
        });
        createHistoryItem('COPY' as CommandType);
        // COPY command usually stays active in AutoCAD, but here we can cancel or reset to step 1 (Base point reuse?) 
        // For simplicity: Single copy then exit, or stay in step 2 for multiple copies?
        // Let's loop step 2 (multiple copies from same base).
        // But to change base, user assumes 0,0 offset?
        // Standard COPY: Base -> Point1, Base -> Point2.
        // So we keep step 2.
        // However, undo logic might get complex if we don't commit.
        // Let's just finish for now to be safe.
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'ROTATE') {
      // Step 0/1: Seçim yapılmamışsa nesne seç
      if (step === 0 || (step === 1 && selectedIds.size === 0)) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
        setStep(1);
        return;
      }

      // Step 1: Baz nokta seç
      if (step === 1 && selectedIds.size > 0) {
        captureBeforeState();
        setCommandState({ base: point, selectedEntities: Array.from(selectedIds) });
        setStep(2);
        return;
      }

      // Step 2: Döndürme açısı
      if (step === 2) {
        const { base, selectedEntities } = commandState;
        const angle = Math.atan2(point[1] - base[1], point[0] - base[0]);

        (selectedEntities || Array.from(selectedIds)).forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          const newEnt = { ...ent };
          const cx = base[0];
          const cy = base[1];

          if (ent.type === 'LINE') {
            (newEnt as any).start = rotatePt((ent as any).start, cx, cy, angle);
            (newEnt as any).end = rotatePt((ent as any).end, cx, cy, angle);
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) => rotatePt(v, cx, cy, angle));
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
            (newEnt as any).center = rotatePt((ent as any).center, cx, cy, angle);
            if (ent.type === 'ARC') {
              (newEnt as any).startAngle += angle;
              (newEnt as any).endAngle += angle;
            }
          } else if (ent.type === 'ELLIPSE') {
            (newEnt as any).center = rotatePt((ent as any).center, cx, cy, angle);
          } else if (ent.type === 'HATCH') {
            if ((ent as any).boundary?.vertices) {
              (newEnt as any).boundary.vertices = (ent as any).boundary.vertices.map((v: Point) => rotatePt(v, cx, cy, angle));
            }
            (newEnt as any).rotation = ((newEnt as any).rotation || 0) + angle;
          } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
            (newEnt as any).position = rotatePt((ent as any).position, cx, cy, angle);
            (newEnt as any).rotation = ((newEnt as any).rotation || 0) + angle;
          } else if (ent.type === 'TABLE') {
            (newEnt as any).position = rotatePt((ent as any).position, cx, cy, angle);
            (newEnt as any).rotation = ((newEnt as any).rotation || 0) + angle;
          } else if (ent.type === 'POINT') {
            (newEnt as any).position = rotatePt((ent as any).position, cx, cy, angle);
          } else if (ent.type === 'DONUT') {
            (newEnt as any).center = rotatePt((ent as any).center, cx, cy, angle);
          }
          setEntities(prev => prev.map(e => e.id === id ? (newEnt as Entity) : e));
        });
        createHistoryItem('ROTATE' as CommandType);
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'SCALE') {
      // Step 0/1: Seçim yapılmamışsa nesne seç
      if (step === 0 || (step === 1 && selectedIds.size === 0)) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
        setStep(1);
        return;
      }

      // Step 1: Baz nokta seç
      if (step === 1 && selectedIds.size > 0) {
        captureBeforeState();
        setTempPoints([point]);
        setCommandState({ base: point, selectedEntities: Array.from(selectedIds) });
        setStep(2);
        return;
      }

      // Step 2: Referans mesafe
      if (step === 2) {
        const { base } = commandState;
        const dist1 = Math.hypot(point[0] - base[0], point[1] - base[1]);
        setCommandState(prev => ({ ...prev, dist1 }));
        setStep(3);
        return;
      }

      // Step 3: Ölçekleme faktörü
      if (step === 3) {
        const { base, dist1, selectedEntities } = commandState;
        const dist2 = Math.hypot(point[0] - base[0], point[1] - base[1]);
        const factor = dist1 > 0.01 ? dist2 / dist1 : 1;

        (selectedEntities || Array.from(selectedIds)).forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent };
          if (ent.type === 'LINE') {
            (newEnt as any).start = scalePt((ent as any).start, base[0], base[1], factor);
            (newEnt as any).end = scalePt((ent as any).end, base[0], base[1], factor);
          } else if (ent.type === 'CIRCLE') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).radius *= factor;
          } else if (ent.type === 'ARC') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).radius *= factor;
          } else if (ent.type === 'ELLIPSE') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).rx *= factor;
            (newEnt as any).ry *= factor;
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) =>
              scalePt(v, base[0], base[1], factor)
            );
          } else if (ent.type === 'TEXT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).height *= factor;
          } else if (ent.type === 'MTEXT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).height *= factor;
            (newEnt as any).width *= factor;
          } else if (ent.type === 'POINT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
          } else if (ent.type === 'DONUT') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).innerRadius *= factor;
            (newEnt as any).outerRadius *= factor;
          } else if (ent.type === 'HATCH') {
            if ((ent as any).boundary?.vertices) {
              (newEnt as any).boundary.vertices = (ent as any).boundary.vertices.map((v: Point) => scalePt(v, base[0], base[1], factor));
            }
            // Scale pattern scale if supported
            // (newEnt as any).scale = ((newEnt as any).scale || 1) * factor; // Optional: scale pattern too
          } else if (ent.type === 'TABLE') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).rowHeight *= factor;
            (newEnt as any).colWidth *= factor;
          }
          setEntities(prev => prev.map(e => e.id === id ? (newEnt as Entity) : e));
        });
        createHistoryItem('SCALE' as CommandType);
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'MIRROR') {
      // Step 0/1: Seçim yapılmamışsa nesne seç
      if (step === 0 || (step === 1 && selectedIds.size === 0)) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
        setStep(1);
        return;
      }

      // Step 1: Ayna çizgisi ilk nokta
      if (step === 1 && selectedIds.size > 0) {
        captureBeforeState();
        setTempPoints([point]);
        setCommandState({ selectedEntities: Array.from(selectedIds) });
        setStep(2);
        return;
      }

      // Step 2: Ayna çizgisi ikinci nokta
      if (step === 2) {
        const [p1] = tempPoints;
        const p2 = point;
        const { selectedEntities } = commandState;

        (selectedEntities || Array.from(selectedIds)).forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent, id: Date.now() + Math.random() };
          if (ent.type === 'LINE') {
            (newEnt as any).start = mirrorPt((ent as any).start, p1[0], p1[1], p2[0], p2[1]);
            (newEnt as any).end = mirrorPt((ent as any).end, p1[0], p1[1], p2[0], p2[1]);
          } else if (ent.type === 'CIRCLE' || ent.type === 'DONUT') {
            (newEnt as any).center = mirrorPt((ent as any).center, p1[0], p1[1], p2[0], p2[1]);
          } else if (ent.type === 'ARC') {
            (newEnt as any).center = mirrorPt((ent as any).center, p1[0], p1[1], p2[0], p2[1]);
          } else if (ent.type === 'ELLIPSE') {
            (newEnt as any).center = mirrorPt((ent as any).center, p1[0], p1[1], p2[0], p2[1]);
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) =>
              mirrorPt(v, p1[0], p1[1], p2[0], p2[1])
            );
          } else if (ent.type === 'HATCH') {
            if ((ent as any).boundary?.vertices) {
              (newEnt as any).boundary.vertices = (ent as any).boundary.vertices.map((v: Point) => mirrorPt(v, p1[0], p1[1], p2[0], p2[1]));
            }
          } else if (ent.type === 'TABLE' || ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT') {
            (newEnt as any).position = mirrorPt((ent as any).position, p1[0], p1[1], p2[0], p2[1]);
          }
          addEntity(newEnt);
        });
        createHistoryItem('MIRROR' as CommandType);
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'HATCH') {
      // HATCH: Create hatch with optional islands
      // Step 1: Select outer boundary
      // Step 2+: Select inner boundaries (islands) - press Enter to finish

      const convertToBoundary = (ent: Entity): any => {
        if (ent.type === 'CIRCLE') {
          const pts: Point[] = [];
          const segs = 64;
          for (let i = 0; i < segs; i++) {
            const t = (i / segs) * Math.PI * 2;
            pts.push([
              (ent as any).center[0] + Math.cos(t) * (ent as any).radius,
              (ent as any).center[1] + Math.sin(t) * (ent as any).radius,
              0
            ]);
          }
          return {
            type: 'LWPOLYLINE',
            vertices: pts,
            closed: true,
            color: ent.color,
            layer: ent.layer,
            id: ent.id
          };
        } else if (ent.type === 'ELLIPSE') {
          const pts: Point[] = [];
          const segs = 64;
          const cx = (ent as any).center[0];
          const cy = (ent as any).center[1];
          const rx = (ent as any).rx;
          const ry = (ent as any).ry;
          const rotation = (ent as any).rotation || 0;
          const cosR = Math.cos(rotation);
          const sinR = Math.sin(rotation);
          for (let i = 0; i < segs; i++) {
            const t = (i / segs) * Math.PI * 2;
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            // Apply rotation to ellipse points
            pts.push([
              cx + cosR * rx * cosT - sinR * ry * sinT,
              cy + sinR * rx * cosT + cosR * ry * sinT,
              0
            ]);
          }
          return {
            type: 'LWPOLYLINE',
            vertices: pts,
            closed: true,
            color: ent.color,
            layer: ent.layer,
            id: ent.id
          };
        } else if (ent.type === 'SPLINE') {
          return {
            type: 'LWPOLYLINE',
            vertices: (ent as any).controlPoints,
            closed: true,
            color: ent.color,
            layer: ent.layer,
            id: ent.id
          };
        } else if (ent.type === 'LWPOLYLINE') {
          return {
            ...ent,
            closed: true
          };
        }
        return null;
      };

      if (step === 1) {
        // Select outer boundary
        let minD = 20.0;
        let targetEnt: Entity | null = null;

        entities.forEach(ent => {
          if (!ent.visible) return;
          if (ent.type !== 'LWPOLYLINE' && ent.type !== 'CIRCLE' &&
            ent.type !== 'ELLIPSE' && ent.type !== 'SPLINE') {
            return;
          }

          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < minD) {
            minD = d;
            targetEnt = ent;
          }
        });

        if (targetEnt) {
          const boundary = convertToBoundary(targetEnt);
          if (boundary) {
            setCommandState({
              outerBoundary: boundary,
              islands: [],
              hatchParams: { scale: 1, rotation: 0, pattern: { name: 'ANSI31', type: 'predefined', angle: 45 } }
            });
            setStep(2);
            console.log('Outer boundary selected. Click to add islands or press Enter to finish');
          }
        } else {
          console.log('No closed boundary found');
        }
      } else if (step === 2) {
        // Select islands (inner boundaries)
        let minD = 20.0;
        let targetEnt: Entity | null = null;

        entities.forEach(ent => {
          if (!ent.visible) return;
          if (ent.type !== 'LWPOLYLINE' && ent.type !== 'CIRCLE' &&
            ent.type !== 'ELLIPSE' && ent.type !== 'SPLINE') {
            return;
          }

          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < minD) {
            minD = d;
            targetEnt = ent;
          }
        });

        if (targetEnt) {
          const islandBoundary = convertToBoundary(targetEnt);
          if (islandBoundary) {
            const islands = commandState.islands || [];
            islands.push(islandBoundary);
            setCommandState({
              ...commandState,
              islands
            });
            console.log(`Island ${islands.length} added. Click for more islands or press Enter to finish`);
          }
        }
      }
    } else if (activeCommand === 'ERASE') {
      if (selectedIds.size === 0) {
        console.log("No selection.");
        return;
      }
      deleteEntities(selectedIds);
      cancelCommand();
      clearSelection();
    } else if (activeCommand === 'OFFSET') {
      if (step === 2) {
        let closestId: number | null = null;
        let minD = Infinity;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (!ent.visible) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) { minD = d; closestId = ent.id; }
        });
        if (closestId !== null) {
          setCommandState(prev => ({ ...prev, targetId: closestId }));
          setStep(3);
        }
      } else if (step === 3) {
        const { targetId, distance } = commandState;
        const ent = entities.find(e => e.id === targetId);
        if (ent && distance) {
          let newEnt = null;
          if (ent.type === 'LINE') {
            const dx = ent.end[0] - ent.start[0];
            const dy = ent.end[1] - ent.start[1];
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;

            const vx = point[0] - ent.start[0];
            const vy = point[1] - ent.start[1];
            const dot = vx * nx + vy * ny;
            const sign = dot > 0 ? 1 : -1;

            const ox = nx * sign * distance;
            const oy = ny * sign * distance;

            newEnt = {
              ...ent,
              id: Date.now() + Math.random(),
              start: [ent.start[0] + ox, ent.start[1] + oy, ent.start[2]],
              end: [ent.end[0] + ox, ent.end[1] + oy, ent.end[2]]
            } as Entity;
          } else if (ent.type === 'CIRCLE') {
            const distToCenter = Math.hypot(point[0] - ent.center[0], point[1] - ent.center[1]);
            const newRadius = distToCenter > ent.radius ? ent.radius + distance : ent.radius - distance;
            if (newRadius > 0) {
              newEnt = { ...ent, id: Date.now() + Math.random(), radius: newRadius } as Entity;
            }
          } else if (ent.type === 'ARC') {
            const distToCenter = Math.hypot(point[0] - ent.center[0], point[1] - ent.center[1]);
            const newRadius = distToCenter > ent.radius ? ent.radius + distance : ent.radius - distance;
            if (newRadius > 0) {
              newEnt = { ...ent, id: Date.now() + Math.random(), radius: newRadius } as Entity;
            }
          } else if (ent.type === 'LWPOLYLINE') {
            // Offset polyline - simplified version (offset all vertices perpendicular)
            const vertices = (ent as any).vertices;
            const newVertices: Point[] = [];

            // Calculate which side to offset based on click point
            // Use first segment for direction determination
            if (vertices.length >= 2) {
              const dx = vertices[1][0] - vertices[0][0];
              const dy = vertices[1][1] - vertices[0][1];
              const len = Math.hypot(dx, dy);
              const nx = -dy / len;
              const ny = dx / len;

              const vx = point[0] - vertices[0][0];
              const vy = point[1] - vertices[0][1];
              const dot = vx * nx + vy * ny;
              const sign = dot > 0 ? 1 : -1;

              // Offset each vertex
              for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];

                // Calculate perpendicular direction for this vertex
                let perpX = 0, perpY = 0;

                if (i === 0 && !((ent as any).closed)) {
                  // First vertex (if not closed)
                  const dx = vertices[1][0] - v[0];
                  const dy = vertices[1][1] - v[1];
                  const len = Math.hypot(dx, dy);
                  perpX = -dy / len;
                  perpY = dx / len;
                } else if (i === vertices.length - 1 && !((ent as any).closed)) {
                  // Last vertex (if not closed)
                  const dx = v[0] - vertices[i - 1][0];
                  const dy = v[1] - vertices[i - 1][1];
                  const len = Math.hypot(dx, dy);
                  perpX = -dy / len;
                  perpY = dx / len;
                } else {
                  // Middle vertex - average of adjacent segments
                  const prevIdx = i === 0 ? vertices.length - 1 : i - 1;
                  const nextIdx = i === vertices.length - 1 ? 0 : i + 1;

                  const dx1 = v[0] - vertices[prevIdx][0];
                  const dy1 = v[1] - vertices[prevIdx][1];
                  const len1 = Math.hypot(dx1, dy1);
                  const perp1X = -dy1 / len1;
                  const perp1Y = dx1 / len1;

                  const dx2 = vertices[nextIdx][0] - v[0];
                  const dy2 = vertices[nextIdx][1] - v[1];
                  const len2 = Math.hypot(dx2, dy2);
                  const perp2X = -dy2 / len2;
                  const perp2Y = dx2 / len2;

                  perpX = (perp1X + perp2X) / 2;
                  perpY = (perp1Y + perp2Y) / 2;
                  const perpLen = Math.hypot(perpX, perpY);
                  if (perpLen > 0.001) {
                    perpX /= perpLen;
                    perpY /= perpLen;
                  }
                }

                newVertices.push([
                  v[0] + perpX * sign * distance,
                  v[1] + perpY * sign * distance,
                  v[2]
                ]);
              }

              newEnt = {
                ...ent,
                id: Date.now() + Math.random(),
                vertices: newVertices
              } as Entity;
            }
          }

          if (newEnt) addEntity(newEnt);
        }
        setStep(2); // Loop back for multiple offsets
      }
    } else if (activeCommand === 'TRIM') {
      // Step 1: Select cutting edges (can select multiple, press Enter to finish)
      // Step 2: Select objects to trim
      if (step === 1) {
        // Selecting cutting edges
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
          setCommandState(prev => ({
            ...prev,
            cuttingEdges: [...(prev.cuttingEdges || []), closestId]
          }));
        }
      } else if (step === 2) {
        // Trimming objects
        const cuttingEdgeIds = commandState.cuttingEdges || [];
        const cuttingEdges = entities.filter(e => cuttingEdgeIds.includes(e.id));

        if (cuttingEdges.length === 0) {
          console.log('No cutting edges selected');
          return;
        }

        // Find entity to trim at click point
        let minD = Infinity;
        let targetEntity: Entity | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (cuttingEdgeIds.includes(ent.id)) return; // Skip cutting edges
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            targetEntity = ent;
          }
        });

        if (targetEntity) {
          captureBeforeState();
          let newEntities: Entity[] = [];
          const target = targetEntity as Entity;

          if (target.type === 'LINE') {
            newEntities = trimLineEntity(target, point, cuttingEdges);
          } else if (target.type === 'ARC') {
            newEntities = trimArcEntity(target, point, cuttingEdges);
          } else if (target.type === 'CIRCLE') {
            newEntities = trimCircleEntity(target, point, cuttingEdges);
          }

          // Delete original entity
          deleteEntities(new Set([target.id]));

          // Add new trimmed entities
          newEntities.forEach(ent => addEntity(ent));

          createHistoryItem('TRIM' as CommandType);
        }
        // Stay in step 2 for multiple trims
      }
    } else if (activeCommand === 'EXTEND') {
      // Step 1: Select boundary edges (can select multiple, press Enter to finish)
      // Step 2: Select objects to extend
      if (step === 1) {
        // Selecting boundary edges
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
          setCommandState(prev => ({
            ...prev,
            boundaries: [...(prev.boundaries || []), closestId]
          }));
        }
      } else if (step === 2) {
        // Extending objects
        const boundaryIds = commandState.boundaries || [];
        const boundaries = entities.filter(e => boundaryIds.includes(e.id));

        if (boundaries.length === 0) {
          console.log('No boundary edges selected');
          return;
        }

        // Find entity to extend at click point
        let minD = Infinity;
        let targetEntity: Entity | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (boundaryIds.includes(ent.id)) return; // Skip boundaries
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            targetEntity = ent;
          }
        });

        if (targetEntity) {
          captureBeforeState();
          let extendedEntity: Entity | null = null;
          const target = targetEntity as Entity;

          if (target.type === 'LINE') {
            extendedEntity = extendLineEntity(target, point, boundaries);
          } else if (target.type === 'ARC') {
            extendedEntity = extendArcEntity(target, point, boundaries);
          }

          if (extendedEntity && extendedEntity !== target) {
            updateEntity(target.id, extendedEntity);
            createHistoryItem('EXTEND' as CommandType);
          }
        }
        // Stay in step 2 for multiple extends
      }
    } else if (activeCommand === 'BREAK') {
      // Step 1: Select object to break
      // Step 2: First break point
      // Step 3: Second break point
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const targetEntity = entities.find(e => e.id === closestId);
          if (targetEntity) {
            setCommandState({ targetEntity, firstBreakPoint: point });
            setTempPoints([point]);
            setStep(2);
          }
        }
      } else if (step === 2) {
        const { targetEntity, firstBreakPoint } = commandState;
        if (!targetEntity) return;

        captureBeforeState();
        const secondBreakPoint = point;

        if (targetEntity.type === 'LINE') {
          const line = targetEntity;
          // Calculate t parameters for both points
          const dx = line.end[0] - line.start[0];
          const dy = line.end[1] - line.start[1];
          const len = Math.sqrt(dx * dx + dy * dy);

          if (len < 0.0001) return;

          const t1 = ((firstBreakPoint[0] - line.start[0]) * dx + (firstBreakPoint[1] - line.start[1]) * dy) / (len * len);
          const t2 = ((secondBreakPoint[0] - line.start[0]) * dx + (secondBreakPoint[1] - line.start[1]) * dy) / (len * len);

          const tMin = Math.max(0, Math.min(t1, t2));
          const tMax = Math.min(1, Math.max(t1, t2));

          const breakPoint1: Point = [
            line.start[0] + tMin * dx,
            line.start[1] + tMin * dy,
            0
          ];
          const breakPoint2: Point = [
            line.start[0] + tMax * dx,
            line.start[1] + tMax * dy,
            0
          ];

          // Delete original line
          deleteEntities(new Set([targetEntity.id]));

          // Add two new line segments (if they exist)
          if (tMin > 0.001) {
            addEntity({
              ...line,
              id: Date.now() + Math.random(),
              start: line.start,
              end: breakPoint1,
            });
          }
          if (tMax < 0.999) {
            addEntity({
              ...line,
              id: Date.now() + Math.random() + 0.001,
              start: breakPoint2,
              end: line.end,
            });
          }

          createHistoryItem('BREAK' as CommandType);
        } else if (targetEntity.type === 'CIRCLE') {
          const circle = targetEntity;
          const angle1 = Math.atan2(firstBreakPoint[1] - circle.center[1], firstBreakPoint[0] - circle.center[0]);
          const angle2 = Math.atan2(secondBreakPoint[1] - circle.center[1], secondBreakPoint[0] - circle.center[0]);

          // Delete original circle
          deleteEntities(new Set([targetEntity.id]));

          // Create arc from the remaining portion
          addEntity({
            type: 'ARC',
            center: circle.center,
            radius: circle.radius,
            startAngle: angle2,
            endAngle: angle1,
            color: circle.color,
            layer: circle.layer,
            id: Date.now() + Math.random(),
          } as Entity);

          createHistoryItem('BREAK' as CommandType);
        } else if (targetEntity.type === 'ARC') {
          const arc = targetEntity;

          // Calculate angles for break points
          const angle1 = Math.atan2(firstBreakPoint[1] - arc.center[1], firstBreakPoint[0] - arc.center[0]);
          const angle2 = Math.atan2(secondBreakPoint[1] - arc.center[1], secondBreakPoint[0] - arc.center[0]);

          // Normalize angles
          const normalizeAngle = (a: number, ref: number) => {
            let normalized = a;
            while (normalized < ref) normalized += Math.PI * 2;
            while (normalized > ref + Math.PI * 2) normalized -= Math.PI * 2;
            return normalized;
          };

          const norm1 = normalizeAngle(angle1, arc.startAngle);
          const norm2 = normalizeAngle(angle2, arc.startAngle);
          const normEnd = normalizeAngle(arc.endAngle, arc.startAngle);

          const angleMin = Math.min(norm1, norm2);
          const angleMax = Math.max(norm1, norm2);

          // Delete original arc
          deleteEntities(new Set([targetEntity.id]));

          // Add two arc segments (if they exist)
          if (angleMin > arc.startAngle + 0.001) {
            addEntity({
              ...arc,
              id: Date.now() + Math.random(),
              startAngle: arc.startAngle,
              endAngle: angleMin,
            } as Entity);
          }
          if (angleMax < normEnd - 0.001) {
            addEntity({
              ...arc,
              id: Date.now() + Math.random() + 0.001,
              startAngle: angleMax,
              endAngle: arc.endAngle,
            } as Entity);
          }

          createHistoryItem('BREAK' as CommandType);
        }

        cancelCommand();
      }
    } else if (activeCommand === 'JOIN') {
      // Step 1: Select multiple objects to join (press Enter when done)
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE' && ent.type !== 'ARC') return; // Only lines and arcs can be joined
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null && !selectedIds.has(closestId)) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
      }
    } else if (activeCommand === 'EXPLODE') {
      // Select objects and explode them immediately
      if (selectedIds.size === 0) {
        // Select an object
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(new Set([closestId]));
        }
      } else {
        // Explode selected objects
        captureBeforeState();
        const toDelete: number[] = [];
        const toAdd: Entity[] = [];

        selectedIds.forEach(id => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;

          if (ent.type === 'LWPOLYLINE') {
            // Explode polyline into lines
            const vertices = (ent as any).vertices;
            for (let i = 0; i < vertices.length - 1; i++) {
              toAdd.push({
                type: 'LINE',
                start: vertices[i],
                end: vertices[i + 1],
                color: ent.color,
                layer: ent.layer,
                id: Date.now() + Math.random() + i * 0.001,
              } as Entity);
            }
            if ((ent as any).closed && vertices.length > 2) {
              toAdd.push({
                type: 'LINE',
                start: vertices[vertices.length - 1],
                end: vertices[0],
                color: ent.color,
                layer: ent.layer,
                id: Date.now() + Math.random() + vertices.length * 0.001,
              } as Entity);
            }
            toDelete.push(id);
          }
          // Note: RECTANGLE is stored as LWPOLYLINE, handled above
        });

        // Delete original entities
        deleteEntities(new Set(toDelete));

        // Add exploded entities
        toAdd.forEach(ent => addEntity(ent));

        if (toAdd.length > 0) {
          createHistoryItem('EXPLODE' as CommandType);
        }

        cancelCommand();
        clearSelection();
      }
    } else if ((activeCommand as string) === 'BREAK') {
      // BREAK: Break an entity at one or two points
      // Step 1: Select entity
      // Step 2: First break point
      // Step 3: Second break point (or same as first for single point break)
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE' && ent.type !== 'LWPOLYLINE' && ent.type !== 'CIRCLE' && ent.type !== 'ARC') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const selectedEntity = entities.find(e => e.id === closestId);
          if (selectedEntity) {
            setCommandState({ selectedEntity, firstPoint: point });
            setTempPoints([point]);
            setStep(2);
          }
        }
      } else if (step === 2) {
        // Second break point
        const { selectedEntity, firstPoint } = commandState;
        if (!selectedEntity) {
          cancelCommand();
          return;
        }

        captureBeforeState();
        const secondPoint = point;

        if (selectedEntity.type === 'LINE') {
          const line = selectedEntity as any;
          const start = line.start as Point;
          const end = line.end as Point;

          // Project both break points onto the line
          const dx = end[0] - start[0];
          const dy = end[1] - start[1];
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.001) {
            cancelCommand();
            return;
          }

          const ux = dx / len;
          const uy = dy / len;

          // Calculate t values for both points (0 = start, 1 = end)
          const t1 = ((firstPoint[0] - start[0]) * ux + (firstPoint[1] - start[1]) * uy) / len;
          const t2 = ((secondPoint[0] - start[0]) * ux + (secondPoint[1] - start[1]) * uy) / len;

          const tMin = Math.max(0, Math.min(t1, t2));
          const tMax = Math.min(1, Math.max(t1, t2));

          // Create two line segments (before break and after break)
          const toDelete = [selectedEntity.id];
          const toAdd: Entity[] = [];

          if (tMin > 0.01) {
            // First segment: start to break point 1
            const breakPoint1: Point = [
              start[0] + tMin * dx,
              start[1] + tMin * dy,
              0
            ];
            toAdd.push({
              type: 'LINE',
              start: start,
              end: breakPoint1,
              color: line.color,
              layer: line.layer,
              id: Date.now() + Math.random(),
            } as Entity);
          }

          if (tMax < 0.99) {
            // Second segment: break point 2 to end
            const breakPoint2: Point = [
              start[0] + tMax * dx,
              start[1] + tMax * dy,
              0
            ];
            toAdd.push({
              type: 'LINE',
              start: breakPoint2,
              end: end,
              color: line.color,
              layer: line.layer,
              id: Date.now() + Math.random() + 0.001,
            } as Entity);
          }

          deleteEntities(new Set(toDelete));
          toAdd.forEach(ent => addEntity(ent));
          createHistoryItem('BREAK' as CommandType);
        } else if (selectedEntity.type === 'CIRCLE') {
          // Breaking a circle creates an arc
          const circle = selectedEntity as any;
          const center = circle.center as Point;
          const radius = circle.radius as number;

          // Calculate angles for break points
          const angle1 = Math.atan2(firstPoint[1] - center[1], firstPoint[0] - center[0]);
          const angle2 = Math.atan2(secondPoint[1] - center[1], secondPoint[0] - center[0]);

          deleteEntities(new Set([selectedEntity.id]));
          addEntity({
            type: 'ARC',
            center: center,
            radius: radius,
            startAngle: angle2,
            endAngle: angle1,
            color: circle.color,
            layer: circle.layer,
            id: Date.now() + Math.random(),
          } as Entity);
          createHistoryItem('BREAK' as CommandType);
        } else if (selectedEntity.type === 'ARC') {
          // Breaking an arc creates two arcs
          const arc = selectedEntity as any;
          const center = arc.center as Point;
          const radius = arc.radius as number;

          const angle1 = Math.atan2(firstPoint[1] - center[1], firstPoint[0] - center[0]);
          const angle2 = Math.atan2(secondPoint[1] - center[1], secondPoint[0] - center[0]);

          // Normalize angles within arc range
          let startAngle = arc.startAngle;
          let endAngle = arc.endAngle;

          const toDelete = [selectedEntity.id];
          const toAdd: Entity[] = [];

          // First arc: original start to break point 1
          toAdd.push({
            type: 'ARC',
            center: center,
            radius: radius,
            startAngle: startAngle,
            endAngle: Math.min(angle1, angle2),
            color: arc.color,
            layer: arc.layer,
            id: Date.now() + Math.random(),
          } as Entity);

          // Second arc: break point 2 to original end
          toAdd.push({
            type: 'ARC',
            center: center,
            radius: radius,
            startAngle: Math.max(angle1, angle2),
            endAngle: endAngle,
            color: arc.color,
            layer: arc.layer,
            id: Date.now() + Math.random() + 0.001,
          } as Entity);

          deleteEntities(new Set(toDelete));
          toAdd.forEach(ent => addEntity(ent));
          createHistoryItem('BREAK' as CommandType);
        }

        cancelCommand();
        setCommandState({});
        setTempPoints([]);
      }
    } else if ((activeCommand as string) === 'JOIN') {
      // JOIN: Join collinear lines or arcs into a polyline
      // Step 1: Select first entity
      // Step 2: Select additional entities to join (Enter to finish)
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE' && ent.type !== 'ARC' && ent.type !== 'LWPOLYLINE') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const firstEntity = entities.find(e => e.id === closestId);
          if (firstEntity) {
            setSelectedIds(new Set([closestId]));
            setCommandState({ joinEntities: [closestId] });
            setStep(2);
          }
        }
      } else if (step === 2) {
        // Select additional entities
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE' && ent.type !== 'ARC' && ent.type !== 'LWPOLYLINE') return;
          if (selectedIds.has(ent.id)) return; // Already selected
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
          setCommandState(prev => ({
            ...prev,
            joinEntities: [...(prev.joinEntities || []), closestId]
          }));
        }
      }
    } else if (activeCommand === 'BOUNDARY') {
      // BOUNDARY: Create a boundary polyline from closed area
      // Step 1: Pick internal point
      if (step === 1) {
        // Find closed boundary at the clicked point
        const internalPoint = point;

        // Collect all potential boundary entities
        const boundaryEntities = entities.filter(ent =>
          ent.visible !== false &&
          (ent.type === 'LINE' || ent.type === 'LWPOLYLINE' || ent.type === 'CIRCLE' || ent.type === 'ARC')
        );

        // Simple boundary detection: find the closest closed polyline containing the point
        let foundBoundary: Point[] | null = null;

        for (const ent of boundaryEntities) {
          if (ent.type === 'LWPOLYLINE' && (ent as any).closed) {
            const vertices = (ent as any).vertices as Point[];
            // Check if point is inside this polyline
            let inside = false;
            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
              const xi = vertices[i][0], yi = vertices[i][1];
              const xj = vertices[j][0], yj = vertices[j][1];

              if (((yi > internalPoint[1]) !== (yj > internalPoint[1])) &&
                (internalPoint[0] < (xj - xi) * (internalPoint[1] - yi) / (yj - yi) + xi)) {
                inside = !inside;
              }
            }
            if (inside) {
              foundBoundary = [...vertices];
              break;
            }
          } else if (ent.type === 'CIRCLE') {
            const circle = ent as any;
            const dist = Math.hypot(internalPoint[0] - circle.center[0], internalPoint[1] - circle.center[1]);
            if (dist < circle.radius) {
              // Create boundary vertices from circle
              const numPoints = 36;
              foundBoundary = [];
              for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                foundBoundary.push([
                  circle.center[0] + Math.cos(angle) * circle.radius,
                  circle.center[1] + Math.sin(angle) * circle.radius,
                  0
                ]);
              }
              break;
            }
          }
        }

        if (foundBoundary) {
          addEntity({
            type: 'LWPOLYLINE',
            vertices: foundBoundary,
            closed: true,
            color: '#00ff00',
            layer: '0',
            id: Date.now() + Math.random(),
          } as Entity);
          createHistoryItem('BOUNDARY' as CommandType);
        }

        // Stay in command for multiple boundaries
        setStep(1);
      }
    } else if (activeCommand === 'FILLET') {
      // Step 1: Select first line
      // Step 2: Select second line
      // Radius input via handleValueInput
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE') return; // Only lines for now
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const firstLine = entities.find(e => e.id === closestId);
          if (firstLine) {
            setCommandState({ firstLine, radius: commandState.radius || 5 });
            setStep(2);
          }
        }
      } else if (step === 2) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const secondLine = entities.find(e => e.id === closestId);
          if (secondLine && commandState.firstLine) {
            captureBeforeState();

            const line1 = commandState.firstLine as any;
            const line2 = secondLine as any;
            const radius = commandState.radius || 5;

            // Find intersection point
            const dx1 = line1.end[0] - line1.start[0];
            const dy1 = line1.end[1] - line1.start[1];
            const dx2 = line2.end[0] - line2.start[0];
            const dy2 = line2.end[1] - line2.start[1];

            const denom = dx1 * dy2 - dy1 * dx2;
            if (Math.abs(denom) > 0.001) {
              const t = ((line2.start[0] - line1.start[0]) * dy2 - (line2.start[1] - line1.start[1]) * dx2) / denom;
              const intersectionPoint: Point = [
                line1.start[0] + t * dx1,
                line1.start[1] + t * dy1,
                0
              ];

              // Determine which endpoint of each line is closer to intersection
              const distLine1Start = Math.hypot(intersectionPoint[0] - line1.start[0], intersectionPoint[1] - line1.start[1]);
              const distLine1End = Math.hypot(intersectionPoint[0] - line1.end[0], intersectionPoint[1] - line1.end[1]);
              const distLine2Start = Math.hypot(intersectionPoint[0] - line2.start[0], intersectionPoint[1] - line2.start[1]);
              const distLine2End = Math.hypot(intersectionPoint[0] - line2.end[0], intersectionPoint[1] - line2.end[1]);

              const line1UseEnd = distLine1End < distLine1Start;
              const line2UseEnd = distLine2End < distLine2Start;

              // Calculate direction vectors pointing TOWARD intersection
              const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              // If end is closer to intersection, direction is start->end, else end->start
              const dir1: Point = line1UseEnd
                ? [dx1 / len1, dy1 / len1, 0]
                : [-dx1 / len1, -dy1 / len1, 0];
              const dir2: Point = line2UseEnd
                ? [dx2 / len2, dy2 / len2, 0]
                : [-dx2 / len2, -dy2 / len2, 0];

              // Calculate fillet center
              const dotProduct = dir1[0] * dir2[0] + dir1[1] * dir2[1];
              const clampedDot = Math.max(-1, Math.min(1, dotProduct));
              const angle = Math.acos(clampedDot);

              if (angle < 0.001 || angle > Math.PI - 0.001) {
                // Lines are parallel or anti-parallel, can't fillet
                cancelCommand();
                return;
              }

              const dist = radius / Math.tan(angle / 2);

              // Fillet points: move back from intersection along each line
              const filletStart: Point = [
                intersectionPoint[0] - dir1[0] * dist,
                intersectionPoint[1] - dir1[1] * dist,
                0
              ];
              const filletEnd: Point = [
                intersectionPoint[0] - dir2[0] * dist,
                intersectionPoint[1] - dir2[1] * dist,
                0
              ];

              // Perpendicular direction for center
              const perpDir1: Point = [-dir1[1], dir1[0], 0];
              const perpDir2: Point = [-dir2[1], dir2[0], 0];

              // Determine which side
              const cross = dir1[0] * dir2[1] - dir1[1] * dir2[0];
              const sign = cross > 0 ? 1 : -1;

              const centerOffset: Point = [
                (perpDir1[0] + perpDir2[0]) / 2,
                (perpDir1[1] + perpDir2[1]) / 2,
                0
              ];
              const centerOffsetLen = Math.sqrt(centerOffset[0] * centerOffset[0] + centerOffset[1] * centerOffset[1]);

              const filletCenter: Point = [
                (filletStart[0] + filletEnd[0]) / 2 + sign * (centerOffset[0] / centerOffsetLen) * radius,
                (filletStart[1] + filletEnd[1]) / 2 + sign * (centerOffset[1] / centerOffsetLen) * radius,
                0
              ];

              // Calculate arc angles
              const startAngle = Math.atan2(filletStart[1] - filletCenter[1], filletStart[0] - filletCenter[0]);
              const endAngle = Math.atan2(filletEnd[1] - filletCenter[1], filletEnd[0] - filletCenter[0]);

              // Trim lines - update the correct endpoint
              if (line1UseEnd) {
                updateEntity(line1.id, { ...line1, end: filletStart });
              } else {
                updateEntity(line1.id, { ...line1, start: filletStart });
              }

              if (line2UseEnd) {
                updateEntity(line2.id, { ...line2, end: filletEnd });
              } else {
                updateEntity(line2.id, { ...line2, start: filletEnd });
              }

              addEntity({
                type: 'ARC',
                center: filletCenter,
                radius,
                startAngle,
                endAngle,
                color: line1.color,
                layer: line1.layer,
                id: Date.now() + Math.random(),
              } as Entity);

              createHistoryItem('FILLET' as CommandType);
            }

            cancelCommand();
          }
        }
      }
    } else if (activeCommand === 'CHAMFER') {
      // Step 1: Select first line
      // Step 2: Select second line
      // Distance input via handleValueInput
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const firstLine = entities.find(e => e.id === closestId);
          if (firstLine) {
            setCommandState({ firstLine, distance: commandState.distance || 5 });
            setStep(2);
          }
        }
      } else if (step === 2) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type !== 'LINE') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null) {
          const secondLine = entities.find(e => e.id === closestId);
          if (secondLine && commandState.firstLine) {
            captureBeforeState();

            const line1 = commandState.firstLine as any;
            const line2 = secondLine as any;
            const distance = commandState.distance || 5;

            // Find intersection point
            const dx1 = line1.end[0] - line1.start[0];
            const dy1 = line1.end[1] - line1.start[1];
            const dx2 = line2.end[0] - line2.start[0];
            const dy2 = line2.end[1] - line2.start[1];

            const denom = dx1 * dy2 - dy1 * dx2;
            if (Math.abs(denom) > 0.001) {
              const t = ((line2.start[0] - line1.start[0]) * dy2 - (line2.start[1] - line1.start[1]) * dx2) / denom;
              const intersectionPoint: Point = [
                line1.start[0] + t * dx1,
                line1.start[1] + t * dy1,
                0
              ];

              // Determine which endpoint of each line is closer to intersection
              const distLine1Start = Math.hypot(intersectionPoint[0] - line1.start[0], intersectionPoint[1] - line1.start[1]);
              const distLine1End = Math.hypot(intersectionPoint[0] - line1.end[0], intersectionPoint[1] - line1.end[1]);
              const distLine2Start = Math.hypot(intersectionPoint[0] - line2.start[0], intersectionPoint[1] - line2.start[1]);
              const distLine2End = Math.hypot(intersectionPoint[0] - line2.end[0], intersectionPoint[1] - line2.end[1]);

              const line1UseEnd = distLine1End < distLine1Start;
              const line2UseEnd = distLine2End < distLine2Start;

              // Calculate direction vectors pointing TOWARD intersection
              const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
              const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              const dir1: Point = line1UseEnd
                ? [dx1 / len1, dy1 / len1, 0]
                : [-dx1 / len1, -dy1 / len1, 0];
              const dir2: Point = line2UseEnd
                ? [dx2 / len2, dy2 / len2, 0]
                : [-dx2 / len2, -dy2 / len2, 0];

              // Chamfer points: move back from intersection along each line
              const chamferStart: Point = [
                intersectionPoint[0] - dir1[0] * distance,
                intersectionPoint[1] - dir1[1] * distance,
                0
              ];
              const chamferEnd: Point = [
                intersectionPoint[0] - dir2[0] * distance,
                intersectionPoint[1] - dir2[1] * distance,
                0
              ];

              // Trim lines - update the correct endpoint
              if (line1UseEnd) {
                updateEntity(line1.id, { ...line1, end: chamferStart });
              } else {
                updateEntity(line1.id, { ...line1, start: chamferStart });
              }

              if (line2UseEnd) {
                updateEntity(line2.id, { ...line2, end: chamferEnd });
              } else {
                updateEntity(line2.id, { ...line2, start: chamferEnd });
              }

              addEntity({
                type: 'LINE',
                start: chamferStart,
                end: chamferEnd,
                color: line1.color,
                layer: line1.layer,
                id: Date.now() + Math.random(),
              } as Entity);

              createHistoryItem('CHAMFER' as CommandType);
            }

            cancelCommand();
          }
        }
      }
    } else if (activeCommand === 'ARRAY') {
      // Step 1: Select objects to array
      // Step 2: Specify array type (R=Rectangular, P=Polar) via handleValueInput
      // Step 3: Specify parameters and execute
      if (step === 1) {
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null && !selectedIds.has(closestId)) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
      } else if (step === 2) {
        // Center point for polar array
        setCommandState(prev => ({ ...prev, centerPoint: point }));
        setStep(3);
      } else if (step === 3) {
        // Execute array after parameters are set
        const arrayType = commandState.arrayType || 'RECTANGULAR';
        if (selectedIds.size === 0) return;

        captureBeforeState();
        const selectedEntities = entities.filter(e => selectedIds.has(e.id));

        if (arrayType === 'RECTANGULAR') {
          const rows = commandState.rows || 3;
          const cols = commandState.cols || 3;
          const rowSpacing = commandState.rowSpacing || 10;
          const colSpacing = commandState.colSpacing || 10;

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (row === 0 && col === 0) continue; // Skip original

              const dx = col * colSpacing;
              const dy = -row * rowSpacing;

              selectedEntities.forEach(ent => {
                let newEnt = { ...ent, id: Date.now() + Math.random() + row * 100 + col };

                if (ent.type === 'LINE') {
                  (newEnt as any).start = translatePt((ent as any).start, dx, dy);
                  (newEnt as any).end = translatePt((ent as any).end, dx, dy);
                } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
                  (newEnt as any).center = translatePt((ent as any).center, dx, dy);
                } else if (ent.type === 'LWPOLYLINE') {
                  (newEnt as any).vertices = (ent as any).vertices.map((v: Point) => translatePt(v, dx, dy));
                } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
                  (newEnt as any).position = translatePt((ent as any).position, dx, dy);
                } else if (ent.type === 'RAY' || ent.type === 'XLINE') {
                  (newEnt as any).origin = translatePt((ent as any).origin, dx, dy);
                }

                addEntity(newEnt as Entity);
              });
            }
          }
        } else if (arrayType === 'POLAR') {
          const items = commandState.items || 6;
          const centerPoint = commandState.centerPoint || [0, 0, 0] as Point;
          const fillAngle = commandState.fillAngle || 360;
          const angleStep = (fillAngle * Math.PI / 180) / items;

          for (let i = 1; i < items; i++) {
            const angle = angleStep * i;

            selectedEntities.forEach(ent => {
              let newEnt = { ...ent, id: Date.now() + Math.random() + i * 1000 };

              if (ent.type === 'LINE') {
                (newEnt as any).start = rotatePt((ent as any).start, centerPoint[0], centerPoint[1], angle);
                (newEnt as any).end = rotatePt((ent as any).end, centerPoint[0], centerPoint[1], angle);
              } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
                (newEnt as any).center = rotatePt((ent as any).center, centerPoint[0], centerPoint[1], angle);
                if (ent.type === 'ARC') {
                  (newEnt as any).startAngle = (ent as any).startAngle + angle;
                  (newEnt as any).endAngle = (ent as any).endAngle + angle;
                } else if (ent.type === 'ELLIPSE') {
                  (newEnt as any).rotation = ((ent as any).rotation || 0) + angle;
                }
              } else if (ent.type === 'LWPOLYLINE') {
                (newEnt as any).vertices = (ent as any).vertices.map((v: Point) => rotatePt(v, centerPoint[0], centerPoint[1], angle));
              } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
                (newEnt as any).position = rotatePt((ent as any).position, centerPoint[0], centerPoint[1], angle);
                if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
                  (newEnt as any).rotation = ((ent as any).rotation || 0) + angle;
                }
              } else if (ent.type === 'RAY' || ent.type === 'XLINE') {
                (newEnt as any).origin = rotatePt((ent as any).origin, centerPoint[0], centerPoint[1], angle);
                // Rotate direction vector
                const dir = (ent as any).direction;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                (newEnt as any).direction = [
                  dir[0] * cosA - dir[1] * sinA,
                  dir[0] * sinA + dir[1] * cosA,
                  0
                ];
              }

              addEntity(newEnt as Entity);
            });
          }
        }

        createHistoryItem('ARRAY' as CommandType);
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'STRETCH') {
      // STRETCH: Crossing window selection, then base point and displacement
      // Step 1: First corner of crossing window
      // Step 2: Second corner of crossing window (select entities)
      // Step 3: Base point
      // Step 4: Displacement point (execute stretch)
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        const corner1 = tempPoints[0];
        const corner2 = point;

        // Create crossing window box
        const minX = Math.min(corner1[0], corner2[0]);
        const maxX = Math.max(corner1[0], corner2[0]);
        const minY = Math.min(corner1[1], corner2[1]);
        const maxY = Math.max(corner1[1], corner2[1]);

        // Find entities to stretch
        const toMove: number[] = []; // Completely inside - will move
        const toStretch: number[] = []; // Crossing window - will stretch

        entities.forEach(ent => {
          if (ent.visible === false) return;

          const minPt: Point = [minX, minY, 0];
          const maxPt: Point = [maxX, maxY, 0];
          const isInside = isEntityInBox(ent, minPt, maxPt);
          const isCrossing = doesEntityIntersectBox(ent, minPt, maxPt);

          if (isInside) {
            toMove.push(ent.id);
          } else if (isCrossing) {
            toStretch.push(ent.id);
          }
        });

        setCommandState({
          corner1,
          corner2,
          minX,
          maxX,
          minY,
          maxY,
          toMove,
          toStretch
        });
        setTempPoints([point]);
        setStep(3);
      } else if (step === 3) {
        // Base point
        setTempPoints([point]);
        setCommandState(prev => ({ ...prev, basePoint: point }));
        setStep(4);
      } else if (step === 4) {
        // Displacement point - execute stretch
        const { basePoint, toMove, toStretch, minX, maxX, minY, maxY } = commandState;
        const dx = point[0] - basePoint[0];
        const dy = point[1] - basePoint[1];

        if (toMove.length === 0 && toStretch.length === 0) {
          cancelCommand();
          return;
        }

        captureBeforeState();

        // Move entities completely inside
        toMove.forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;

          if (ent.type === 'LINE') {
            updateEntity(id, {
              start: translatePt((ent as any).start, dx, dy),
              end: translatePt((ent as any).end, dx, dy),
            });
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
            updateEntity(id, {
              center: translatePt((ent as any).center, dx, dy),
            });
          } else if (ent.type === 'LWPOLYLINE') {
            updateEntity(id, {
              vertices: (ent as any).vertices.map((v: Point) => translatePt(v, dx, dy)),
            });
          } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
            updateEntity(id, {
              position: translatePt((ent as any).position, dx, dy),
            });
          } else if (ent.type === 'RAY' || ent.type === 'XLINE') {
            updateEntity(id, {
              origin: translatePt((ent as any).origin, dx, dy),
            });
          }
        });

        // Stretch entities crossing the window
        toStretch.forEach((id: number) => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;

          if (ent.type === 'LINE') {
            const start = (ent as any).start;
            const end = (ent as any).end;

            // Check which endpoints are inside the box
            const startInside = start[0] >= minX && start[0] <= maxX &&
              start[1] >= minY && start[1] <= maxY;
            const endInside = end[0] >= minX && end[0] <= maxX &&
              end[1] >= minY && end[1] <= maxY;

            updateEntity(id, {
              start: startInside ? translatePt(start, dx, dy) : start,
              end: endInside ? translatePt(end, dx, dy) : end,
            });
          } else if (ent.type === 'LWPOLYLINE') {
            const vertices = (ent as any).vertices;
            const newVertices = vertices.map((v: Point) => {
              const vInside = v[0] >= minX && v[0] <= maxX &&
                v[1] >= minY && v[1] <= maxY;
              return vInside ? translatePt(v, dx, dy) : v;
            });

            updateEntity(id, {
              vertices: newVertices,
            });
          } else if (ent.type === 'ARC') {
            // For arcs, if center is inside, move the whole arc
            const center = (ent as any).center;
            const centerInside = center[0] >= minX && center[0] <= maxX &&
              center[1] >= minY && center[1] <= maxY;

            if (centerInside) {
              updateEntity(id, {
                center: translatePt(center, dx, dy),
              });
            }
          }
        });

        createHistoryItem('STRETCH' as CommandType);
        cancelCommand();
        setCommandState({});
        setTempPoints([]);
      }
    } else if (activeCommand === 'DIMLINEAR' || activeCommand === 'DIMALIGNED') {
      if (step === 1) {
        // Otomatik nokta tespiti ile ilk noktayı seç
        const detected = autoDetectPoints(point, entities, 15);
        if (detected.length > 0 && osnapEnabled) {
          // Snap varsa, snap noktasını kullan
          setTempPoints([detected[0].point]);
        } else {
          setTempPoints([point]);
        }
        setStep(2);
      } else if (step === 2) {
        // İkinci nokta - otomatik tespit
        const detected = autoDetectPoints(point, entities, 15);
        if (detected.length > 0 && osnapEnabled) {
          setTempPoints(prev => [...prev, detected[0].point]);
        } else {
          setTempPoints(prev => [...prev, point]);
        }
        setStep(3);
      } else if (step === 3) {
        const start = tempPoints[0];
        const end = tempPoints[1];
        const type = activeCommand === 'DIMLINEAR' ? 'linear' : 'aligned';

        // Calculate geometry
        const geometry = calculateDimensionGeometry(start, end, point, type);

        // Varsayılan ayarları kullan
        const settings = DEFAULT_DIMENSION_SETTINGS;

        addEntity({
          type: 'DIMENSION',
          dimType: activeCommand,
          start: start,
          end: end,
          dimLinePosition: point,
          textHeight: settings.textHeight,
          arrowSize: settings.arrowSize,
          extensionLineOffset: settings.extensionLineOffset,
          extensionLineExtend: settings.extensionLineExtend,
          arrowStyle: settings.arrowStyle,
          arrowDirection: settings.arrowDirection,
          dimLineColor: settings.dimLineColor,
          extLineColor: settings.extLineColor,
          arrowColor: settings.arrowColor,
          textColor: settings.textColor,
          dimLineWeight: settings.dimLineWeight,
          extLineWeight: settings.extLineWeight,
          precision: settings.precision,
          rotation: geometry.rotation,
          color: settings.dimLineColor,
          layer: '0'
        } as any);
        createHistoryItem(activeCommand as CommandType);
        cancelCommand();
      }
    } else if (activeCommand === 'DIMANGULAR') {
      // AutoCAD uyumlu açı ölçüsü:
      // Step 1: İlk çizgi/segment seç
      // Step 2: İkinci çizgi/segment seç
      // Step 3: Açı ölçüsü pozisyonunu belirle

      if (step === 1) {
        // En yakın çizgiyi bul (LINE veya LWPOLYLINE segmenti)
        let closestEntity: any = null;
        let minDist = Infinity;
        const SELECT_THRESHOLD = 20.0;

        // LINE entity'lerini kontrol et
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type === 'LINE') {
            const d = closestPointOnEntity(point[0], point[1], ent);
            if (d < minDist && d < SELECT_THRESHOLD) {
              minDist = d;
              closestEntity = {
                type: 'LINE',
                entity: ent,
                startPoint: ent.start,
                endPoint: ent.end
              };
            }
          }
        });

        // LWPOLYLINE segmentlerini kontrol et
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type === 'LWPOLYLINE') {
            const polyline = ent as any;
            const verts = polyline.vertices || [];

            for (let i = 0; i < verts.length - 1; i++) {
              const segStart = verts[i];
              const segEnd = verts[i + 1];
              // Segment orta noktası
              const segMid: Point = [(segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, 0];
              const d = Math.hypot(point[0] - segMid[0], point[1] - segMid[1]);

              if (d < minDist && d < SELECT_THRESHOLD) {
                minDist = d;
                closestEntity = {
                  type: 'POLYSEG',
                  entity: ent,
                  startPoint: segStart,
                  endPoint: segEnd
                };
              }
            }

            // Closed polyline için son segment
            if (polyline.closed && verts.length > 2) {
              const segStart = verts[verts.length - 1];
              const segEnd = verts[0];
              const segMid: Point = [(segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, 0];
              const d = Math.hypot(point[0] - segMid[0], point[1] - segMid[1]);

              if (d < minDist && d < SELECT_THRESHOLD) {
                minDist = d;
                closestEntity = {
                  type: 'POLYSEG',
                  entity: ent,
                  startPoint: segStart,
                  endPoint: segEnd
                };
              }
            }
          }
        });

        if (closestEntity) {
          setCommandState({
            line1Start: closestEntity!.startPoint,
            line1End: closestEntity!.endPoint,
            line1EntityId: closestEntity!.entity.id
          });
          setStep(2);
        }
      } else if (step === 2) {
        // İkinci çizgiyi/segmenti bul
        const { line1EntityId } = commandState;
        let closestEntity: any = null;
        let minDist = Infinity;
        const SELECT_THRESHOLD = 20.0;

        // LINE entity'lerini kontrol et
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type === 'LINE') {
            // Aynı entity'i seçme
            if (ent.id === line1EntityId) return;

            const d = closestPointOnEntity(point[0], point[1], ent);
            if (d < minDist && d < SELECT_THRESHOLD) {
              minDist = d;
              closestEntity = {
                type: 'LINE',
                entity: ent,
                startPoint: ent.start,
                endPoint: ent.end
              };
            }
          }
        });

        // LWPOLYLINE segmentlerini kontrol et
        entities.forEach(ent => {
          if (ent.visible === false) return;
          if (ent.type === 'LWPOLYLINE') {
            const polyline = ent as any;
            const verts = polyline.vertices || [];

            for (let i = 0; i < verts.length - 1; i++) {
              const segStart = verts[i];
              const segEnd = verts[i + 1];
              // Aynı segmenti seçme
              if (ent.id === line1EntityId) {
                const p1 = commandState.line1Start;
                const p2 = commandState.line1End;
                if ((Math.abs(segStart[0] - p1[0]) < 0.001 && Math.abs(segStart[1] - p1[1]) < 0.001 &&
                  Math.abs(segEnd[0] - p2[0]) < 0.001 && Math.abs(segEnd[1] - p2[1]) < 0.001) ||
                  (Math.abs(segEnd[0] - p1[0]) < 0.001 && Math.abs(segEnd[1] - p1[1]) < 0.001 &&
                    Math.abs(segStart[0] - p2[0]) < 0.001 && Math.abs(segStart[1] - p2[1]) < 0.001)) {
                  continue;
                }
              }

              const segMid: Point = [(segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, 0];
              const d = Math.hypot(point[0] - segMid[0], point[1] - segMid[1]);

              if (d < minDist && d < SELECT_THRESHOLD) {
                minDist = d;
                closestEntity = {
                  type: 'POLYSEG',
                  entity: ent,
                  startPoint: segStart,
                  endPoint: segEnd
                };
              }
            }

            // Closed polyline için son segment
            if (polyline.closed && verts.length > 2) {
              const segStart = verts[verts.length - 1];
              const segEnd = verts[0];
              const p1 = commandState.line1Start;
              const p2 = commandState.line1End;
              if (ent.id === line1EntityId) {
                if ((Math.abs(segStart[0] - p1[0]) < 0.001 && Math.abs(segStart[1] - p1[1]) < 0.001 &&
                  Math.abs(segEnd[0] - p2[0]) < 0.001 && Math.abs(segEnd[1] - p2[1]) < 0.001) ||
                  (Math.abs(segEnd[0] - p1[0]) < 0.001 && Math.abs(segEnd[1] - p1[1]) < 0.001 &&
                    Math.abs(segStart[0] - p2[0]) < 0.001 && Math.abs(segStart[1] - p2[1]) < 0.001)) {
                  // Skip same segment
                } else {
                  const segMid: Point = [(segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, 0];
                  const d = Math.hypot(point[0] - segMid[0], point[1] - segMid[1]);
                  if (d < minDist && d < SELECT_THRESHOLD) {
                    minDist = d;
                    closestEntity = {
                      type: 'POLYSEG',
                      entity: ent,
                      startPoint: segStart,
                      endPoint: segEnd
                    };
                  }
                }
              } else {
                const segMid: Point = [(segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, 0];
                const d = Math.hypot(point[0] - segMid[0], point[1] - segMid[1]);
                if (d < minDist && d < SELECT_THRESHOLD) {
                  minDist = d;
                  closestEntity = {
                    type: 'POLYSEG',
                    entity: ent,
                    startPoint: segStart,
                    endPoint: segEnd
                  };
                }
              }
            }
          }
        });

        if (closestEntity) {
          setCommandState(prev => ({
            ...prev,
            line2Start: closestEntity!.startPoint,
            line2End: closestEntity!.endPoint
          }));
          setStep(3);
        }
      } else if (step === 3) {
        // Açı ölçüsünü oluştur
        const line1Start = commandState.line1Start as Point;
        const line1End = commandState.line1End as Point;
        const line2Start = commandState.line2Start as Point;
        const line2End = commandState.line2End as Point;

        // İki çizginin kesişim noktasını bul
        const x1 = line1Start[0], y1 = line1Start[1];
        const x2 = line1End[0], y2 = line1End[1];
        const x3 = line2Start[0], y3 = line2Start[1];
        const x4 = line2End[0], y4 = line2End[1];

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        let center: Point;
        if (Math.abs(denom) < 0.0001) {
          // Paralel çizgiler, orta nokta kullan
          center = [(x1 + x2 + x3 + x4) / 4, (y1 + y2 + y3 + y4) / 4, 0];
        } else {
          // Kesişim noktası hesapla
          const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
          center = [x1 + t * (x2 - x1), y1 + t * (y2 - y1), 0];
        }

        // Çizgi açılarını hesapla
        const angle1 = Math.atan2(y2 - y1, x2 - x1);
        const angle2 = Math.atan2(y4 - y3, x4 - x3);

        // Hangi açıyı ölçeceğimizi belirle
        // Açıları normalize et
        let startAngle = angle1 < 0 ? angle1 + Math.PI * 2 : angle1;
        let endAngle = angle2 < 0 ? angle2 + Math.PI * 2 : angle2;

        // Yarıçap hesapla (center'dan tıklanan noktaya)
        const radius = Math.max(Math.hypot(point[0] - center[0], point[1] - center[1]), 15);

        // Kullanıcının tıkladığı pozisyona göre hangi açıyı ölçeceğimizi belirle
        const clickAngle = Math.atan2(point[1] - center[1], point[0] - center[0]);
        let clickAngleNorm = clickAngle < 0 ? clickAngle + Math.PI * 2 : clickAngle;

        // Açı farkını hesapla
        let diff = endAngle - startAngle;
        if (diff < 0) diff += Math.PI * 2;

        // Cursor hangi açı bölgesinde?
        const isInFirstArc = (() => {
          let a = clickAngleNorm;
          let s = startAngle;
          let e = endAngle;
          // Normalize
          while (a < 0) a += Math.PI * 2;
          while (s < 0) s += Math.PI * 2;
          while (e < 0) e += Math.PI * 2;
          while (a >= Math.PI * 2) a -= Math.PI * 2;
          while (s >= Math.PI * 2) s -= Math.PI * 2;
          while (e >= Math.PI * 2) e -= Math.PI * 2;

          if (s < e) {
            return a >= s && a <= e;
          } else {
            return a >= s || a <= e;
          }
        })();

        // Ölçülecek açıyı hesapla
        let measureAngle: number;
        let arcStartAngle: number;
        let arcEndAngle: number;

        if (isInFirstArc) {
          measureAngle = diff;
          arcStartAngle = startAngle;
          arcEndAngle = endAngle;
        } else {
          measureAngle = Math.PI * 2 - diff;
          arcStartAngle = endAngle;
          arcEndAngle = startAngle + Math.PI * 2;
        }

        // Yay noktalarını oluştur
        const curvePoints: [number, number, number][] = [];
        const segments = 30;
        for (let i = 0; i <= segments; i++) {
          const ang = arcStartAngle + ((arcEndAngle - arcStartAngle) * i / segments);
          curvePoints.push([
            center[0] + Math.cos(ang) * radius,
            center[1] + Math.sin(ang) * radius,
            0
          ]);
        }

        // Uzantı çizgileri için noktalar
        const p1: Point = [
          center[0] + Math.cos(arcStartAngle) * (radius + 5),
          center[1] + Math.sin(arcStartAngle) * (radius + 5),
          0
        ];
        const p2: Point = [
          center[0] + Math.cos(arcEndAngle) * (radius + 5),
          center[1] + Math.sin(arcEndAngle) * (radius + 5),
          0
        ];

        const settings = DEFAULT_DIMENSION_SETTINGS;

        addEntity({
          type: 'DIMENSION',
          dimType: 'DIMANGULAR',
          start: p1,
          end: p2,
          center: center,
          dimLinePosition: point,
          startAngle: arcStartAngle,
          endAngle: arcEndAngle,
          textHeight: settings.textHeight,
          arrowSize: settings.arrowSize,
          arrowStyle: settings.arrowStyle,
          arrowColor: settings.arrowColor,
          textColor: settings.textColor,
          dimLineColor: settings.dimLineColor,
          dimLineWeight: settings.dimLineWeight,
          extLineWeight: settings.extLineWeight,
          color: settings.dimLineColor,
          layer: '0',
          text: `${Math.abs(measureAngle * 180 / Math.PI).toFixed(settings.anglePrecision)}°`,
          _curvePoints: curvePoints
        } as any);

        createHistoryItem(activeCommand as CommandType);
        cancelCommand();
      }
    }

    // Helper fonksiyonlar (handleCommandInput içinde)


    if (activeCommand === 'DIMRADIUS' || activeCommand === 'DIMDIAMETER') {
      if (step === 1) {
        let closestId: number | null = null;
        let minD = Infinity;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (!ent.visible) return;
          if (ent.type !== 'CIRCLE' && ent.type !== 'ARC') return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) { minD = d; closestId = ent.id; }
        });

        if (closestId) {
          const ent = entities.find(e => e.id === closestId);
          if (ent) {
            setCommandState({ targetEntity: ent });
            setStep(2);
          }
        }
      } else if (step === 2) {
        const { targetEntity } = commandState;
        if (targetEntity) {
          const settings = DEFAULT_DIMENSION_SETTINGS;
          const radius = (targetEntity as any).radius;

          addEntity({
            type: 'DIMENSION',
            dimType: activeCommand,
            start: (targetEntity as any).center,
            end: point,
            dimLinePosition: point,
            textHeight: settings.textHeight,
            arrowSize: settings.arrowSize,
            arrowStyle: settings.arrowStyle,
            arrowColor: settings.arrowColor,
            textColor: settings.textColor,
            dimLineColor: settings.dimLineColor,
            dimLineWeight: settings.dimLineWeight,
            color: settings.dimLineColor,
            layer: '0',
            text: activeCommand === 'DIMRADIUS' ? `R${radius.toFixed(2)}` : `Ø${(radius * 2).toFixed(2)}`,
            precision: settings.precision
          } as any);
          createHistoryItem(activeCommand as CommandType);
          cancelCommand();
        }
      }
    } else if (activeCommand === 'LEADER') {
      // LEADER: Arrow with text annotation
      // Step 1: Arrow start point
      // Step 2: Arrow end point (tip)
      // Step 3: Text position
      // Step 4: Text input via dialog or prompt
      if (step === 1) {
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        setTempPoints(prev => [...prev, point]);
        setStep(3);
      } else if (step === 3) {
        // Text position selected, now wait for text input
        setTempPoints(prev => [...prev, point]);
        setStep(4);

        // Open text dialog for leader text
        setTextDialogState({
          isOpen: true,
          initialText: '',
          onSubmit: (text: string) => {
            const startPoint = tempPoints[0];
            const arrowTip = tempPoints[1];
            const textPosition = point;

            captureBeforeState();

            // Create leader line from start to arrow tip
            addEntity({
              type: 'LINE',
              start: startPoint,
              end: arrowTip,
              color: '#fff',
              layer: '0',
              id: Date.now() + Math.random(),
            } as Entity);

            // Create arrow head at tip
            const dx = arrowTip[0] - startPoint[0];
            const dy = arrowTip[1] - startPoint[1];
            const angle = Math.atan2(dy, dx);
            const arrowSize = 3;
            const arrowAngle = Math.PI / 6; // 30 degrees

            const arrow1: Point = [
              arrowTip[0] - arrowSize * Math.cos(angle - arrowAngle),
              arrowTip[1] - arrowSize * Math.sin(angle - arrowAngle),
              0
            ];
            const arrow2: Point = [
              arrowTip[0] - arrowSize * Math.cos(angle + arrowAngle),
              arrowTip[1] - arrowSize * Math.sin(angle + arrowAngle),
              0
            ];

            // Create arrow as filled triangle
            addEntity({
              type: 'LWPOLYLINE',
              vertices: [arrowTip, arrow1, arrow2],
              closed: true,
              color: '#fff',
              layer: '0',
              id: Date.now() + Math.random() + 1,
            } as Entity);

            // Create horizontal line from arrow tip to text
            const horizontalLineEnd: Point = [textPosition[0], arrowTip[1], 0];
            addEntity({
              type: 'LINE',
              start: arrowTip,
              end: horizontalLineEnd,
              color: '#fff',
              layer: '0',
              id: Date.now() + Math.random() + 2,
            } as Entity);

            // Create text at text position
            if (text && text.trim() !== '') {
              addEntity({
                type: 'TEXT',
                position: textPosition,
                text: text,
                height: 2.5,
                rotation: 0,
                color: '#fff',
                layer: '0',
                id: Date.now() + Math.random() + 3,
              } as Entity);
            }

            createHistoryItem('LEADER' as CommandType);
            cancelCommand();
            setTempPoints([]);
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
          },
          onCancel: () => {
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
            cancelCommand();
          }
        });
      }
    } else if (activeCommand === 'HATCH') {
      // HATCH: Create hatch pattern in closed boundary
      // Step 1: Select closed entity
      if (step === 1) {
        let closestId: number | null = null;
        let minD = Infinity;
        const SELECT_THRESHOLD = 10.0;

        entities.forEach(ent => {
          if (!ent.visible) return;

          // Check if entity is closed or circle/ellipse
          let isClosed = false;
          if (ent.type === 'CIRCLE' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') isClosed = true;
          if (ent.type === 'LWPOLYLINE' && (ent as any).closed) isClosed = true;

          if (!isClosed) return;

          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < minD && d < SELECT_THRESHOLD) {
            minD = d;
            closestId = ent.id;
          }
        });

        if (closestId) {
          const boundaryEnt = entities.find(e => e.id === closestId);
          if (boundaryEnt) {
            let vertices: Point[] = [];

            // Convert boundary to vertices
            if (boundaryEnt.type === 'LWPOLYLINE') {
              vertices = [...(boundaryEnt as any).vertices];
              // Close loop if needed
              if (vertices.length > 0 &&
                (Math.abs(vertices[0][0] - vertices[vertices.length - 1][0]) > 0.001 ||
                  Math.abs(vertices[0][1] - vertices[vertices.length - 1][1]) > 0.001)) {
                vertices.push(vertices[0]);
              }
            } else if (boundaryEnt.type === 'CIRCLE') {
              const c = boundaryEnt as any;
              for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                vertices.push([
                  c.center[0] + Math.cos(a) * c.radius,
                  c.center[1] + Math.sin(a) * c.radius,
                  c.center[2] || 0
                ]);
              }
            } else if (boundaryEnt.type === 'ELLIPSE') {
              const e = boundaryEnt as any;
              for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                // Rotation needed
                const cosR = Math.cos(e.rotation || 0);
                const sinR = Math.sin(e.rotation || 0);
                const x = e.rx * Math.cos(a);
                const y = e.ry * Math.sin(a);

                vertices.push([
                  e.center[0] + x * cosR - y * sinR,
                  e.center[1] + x * sinR + y * cosR,
                  e.center[2] || 0
                ]);
              }
            }

            if (vertices.length >= 3) {
              addEntity({
                type: 'HATCH',
                boundary: {
                  type: 'LWPOLYLINE',
                  vertices: vertices,
                  closed: true
                },
                pattern: { name: 'ANSI31', type: 'predefined', angle: 45 },
                scale: 1,
                rotation: 0,
                color: boundaryEnt.color || '#ffffff',
                layer: boundaryEnt.layer || '0'
              } as any);
              createHistoryItem('HATCH' as CommandType);
              // cancelCommand(); // Keep command active
              setTempPoints([]); // Reset points if any
              // setStep(1); // Already 1, stay in loop
            }
          }
        }
      }
    } else if (activeCommand === 'DIMCONTINUE') {
      // DIMCONTINUE: Ardışık ölçü - önceden ölçü olmadan da çalışır
      // Step 1: İlk nokta, Step 2: İkinci nokta, Step 3: Ölçü pozisyonu, Step 4+: Devam

      if (step === 1) {
        // İlk nokta seçildi
        setTempPoints([point]);
        setStep(2);
      } else if (step === 2) {
        // İkinci nokta seçildi
        setTempPoints([...tempPoints, point]);
        setStep(3);
      } else if (step === 3) {
        // Ölçü çizgisi pozisyonu belirlendi - ilk ölçüyü oluştur
        const startPt = tempPoints[0];
        const endPt = tempPoints[1];

        // Otomatik olarak düz mü eğik mi belirle
        const dx = Math.abs(endPt[0] - startPt[0]);
        const dy = Math.abs(endPt[1] - startPt[1]);
        const isHorizontalOrVertical = dx < 0.1 || dy < 0.1 || Math.abs(dx - dy) < 0.1 * Math.max(dx, dy);
        const dimType = isHorizontalOrVertical ? 'DIMLINEAR' : 'DIMALIGNED';
        const geoType = dimType === 'DIMLINEAR' ? 'linear' : 'aligned';

        const geometry = calculateDimensionGeometry(startPt, endPt, point, geoType);

        addEntity({
          type: 'DIMENSION',
          dimType: dimType,
          start: startPt,
          end: endPt,
          dimLinePosition: point,
          textHeight: 2.5,
          rotation: geometry.rotation,
          color: '#ffffff',
          layer: '0'
        });

        createHistoryItem('DIMCONTINUE' as CommandType);

        // Devam modu için ayarla
        setCommandState({
          basePoint: endPt,
          dimLinePosition: point,
          dimType: dimType,
          hasPreviousDim: true
        });
        setTempPoints([endPt]);
        setStep(4);
      } else if (step === 4) {
        // Devam modu - yeni noktalar seç
        const { basePoint, dimLinePosition, dimType } = commandState;
        const geoType = dimType === 'DIMLINEAR' ? 'linear' : 'aligned';

        const geometry = calculateDimensionGeometry(basePoint, point, dimLinePosition, geoType);

        addEntity({
          type: 'DIMENSION',
          dimType: dimType || 'DIMLINEAR',
          start: basePoint,
          end: point,
          dimLinePosition: dimLinePosition,
          textHeight: 2.5,
          rotation: geometry.rotation,
          color: '#ffffff',
          layer: '0'
        });

        createHistoryItem('DIMCONTINUE' as CommandType);

        // Sonraki için güncelle
        setCommandState({
          ...commandState,
          basePoint: point
        });
        setTempPoints([point]);
        // Step 4'te kal - devam et
      }
    } else if (activeCommand === 'DIMBASELINE') {
      // DIMBASELINE: Taban ölçü - önceden ölçü olmadan da çalışır
      // Step 1: Taban nokta, Step 2: İlk bitiş noktası, Step 3: Ölçü pozisyonu, Step 4+: Devam

      if (step === 1) {
        // Taban nokta seçildi
        setTempPoints([point]);
        setCommandState({ ...commandState, basePoint: point });
        setStep(2);
      } else if (step === 2) {
        // İlk bitiş noktası seçildi
        setTempPoints([...tempPoints, point]);
        setStep(3);
      } else if (step === 3) {
        // Ölçü çizgisi pozisyonu belirlendi - ilk ölçüyü oluştur
        const basePoint = tempPoints[0];
        const endPt = tempPoints[1];

        // Otomatik olarak düz mü eğik mi belirle
        const dx = Math.abs(endPt[0] - basePoint[0]);
        const dy = Math.abs(endPt[1] - basePoint[1]);
        const isHorizontalOrVertical = dx < 0.1 || dy < 0.1 || Math.abs(dx - dy) < 0.1 * Math.max(dx, dy);
        const dimType = isHorizontalOrVertical ? 'DIMLINEAR' : 'DIMALIGNED';
        const geoType = dimType === 'DIMLINEAR' ? 'linear' : 'aligned';

        const geometry = calculateDimensionGeometry(basePoint, endPt, point, geoType);

        addEntity({
          type: 'DIMENSION',
          dimType: dimType,
          start: basePoint,
          end: endPt,
          dimLinePosition: point,
          textHeight: 2.5,
          rotation: geometry.rotation,
          color: '#ffffff',
          layer: '0'
        });

        createHistoryItem('DIMBASELINE' as CommandType);

        // Devam modu için ayarla
        setCommandState({
          basePoint: basePoint,
          dimLinePosition: point,
          dimType: dimType,
          offsetMultiplier: 1,
          hasPreviousDim: true
        });
        setTempPoints([basePoint]);
        setStep(4);
      } else if (step === 4) {
        // Devam modu - yeni noktalar seç (hep aynı taban noktasından)
        const { basePoint, dimLinePosition, dimType, offsetMultiplier } = commandState;
        const geoType = dimType === 'DIMLINEAR' ? 'linear' : 'aligned';

        // Normal vektör hesapla (offset için)
        const dx = point[0] - basePoint[0];
        const dy = point[1] - basePoint[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const normalX = len > 0 ? -dy / len : 0;
        const normalY = len > 0 ? dx / len : 1;

        // Offset yönünü belirle
        const origOffsetX = dimLinePosition[0] - basePoint[0];
        const origOffsetY = dimLinePosition[1] - basePoint[1];
        const dotProduct = origOffsetX * normalX + origOffsetY * normalY;
        const direction = dotProduct >= 0 ? 1 : -1;

        // Her baseline için artan offset
        const offset = 10;
        const newDimLinePosition: Point = [
          dimLinePosition[0] + normalX * offset * offsetMultiplier * direction,
          dimLinePosition[1] + normalY * offset * offsetMultiplier * direction,
          0
        ];

        const geometry = calculateDimensionGeometry(basePoint, point, newDimLinePosition, geoType);

        addEntity({
          type: 'DIMENSION',
          dimType: dimType || 'DIMLINEAR',
          start: basePoint,
          end: point,
          dimLinePosition: newDimLinePosition,
          textHeight: 2.5,
          rotation: geometry.rotation,
          color: '#ffffff',
          layer: '0'
        });

        createHistoryItem('DIMBASELINE' as CommandType);

        // Sonraki için offset'i artır
        setCommandState({
          ...commandState,
          offsetMultiplier: offsetMultiplier + 1
        });
        // Step 4'te kal - devam et
      }
    } else if (activeCommand === 'BLOCK') {
      // BLOCK: Define a block from selected entities
      // Step 1: Select entities (multiple selection)
      // Step 2: Select base point
      // Step 3: Enter block name via text input
      if (step === 1) {
        // Select entities
        let minD = Infinity;
        let closestId: number | null = null;
        const SELECT_THRESHOLD = 5.0;
        entities.forEach(ent => {
          if (ent.visible === false) return;
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestId = ent.id;
          }
        });
        if (closestId !== null && !selectedIds.has(closestId)) {
          setSelectedIds(prev => new Set([...prev, closestId!]));
        }
      } else if (step === 2) {
        // Base point selected
        if (selectedIds.size === 0) {
          console.log('No entities selected for block');
          cancelCommand();
          return;
        }

        setCommandState({ basePoint: point });
        setTempPoints([point]);
        setStep(3);

        // Open text dialog for block name
        setTextDialogState({
          isOpen: true,
          initialText: '',
          onSubmit: (blockName: string) => {
            if (!blockName || blockName.trim() === '') {
              console.log('Block name cannot be empty');
              setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
              cancelCommand();
              return;
            }

            const { basePoint } = commandState;
            const selectedEntities = entities.filter(e => selectedIds.has(e.id));

            // Store block definition in commandState or global blocks storage
            // For simplicity, we'll just group entities and convert selection to a block reference
            // In a full CAD app, blocks would be stored separately and referenced

            captureBeforeState();

            // Create a BLOCK_REFERENCE entity that contains the selected entities
            const blockEntities = selectedEntities.map(ent => {
              // Store relative to base point
              let relativeEnt = { ...ent };

              if (ent.type === 'LINE') {
                (relativeEnt as any).start = translatePt((ent as any).start, -basePoint[0], -basePoint[1]);
                (relativeEnt as any).end = translatePt((ent as any).end, -basePoint[0], -basePoint[1]);
              } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
                (relativeEnt as any).center = translatePt((ent as any).center, -basePoint[0], -basePoint[1]);
              } else if (ent.type === 'LWPOLYLINE') {
                (relativeEnt as any).vertices = (ent as any).vertices.map((v: Point) =>
                  translatePt(v, -basePoint[0], -basePoint[1])
                );
              } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
                (relativeEnt as any).position = translatePt((ent as any).position, -basePoint[0], -basePoint[1]);
              }

              return relativeEnt;
            });

            // Delete original entities
            deleteEntities(selectedIds);

            // Create block reference at base point
            addEntity({
              type: 'BLOCK_REFERENCE',
              blockName: blockName,
              position: basePoint,
              rotation: 0,
              scale: [1, 1, 1] as Point,
              attributes: { entities: JSON.stringify(blockEntities) },
              color: '#fff',
              layer: '0',
              id: Date.now() + Math.random(),
            } as Entity);

            createHistoryItem('BLOCK' as CommandType);
            clearSelection();
            cancelCommand();
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
          },
          onCancel: () => {
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
            cancelCommand();
          }
        });
      }
    } else if (activeCommand === 'INSERT') {
      // INSERT: Insert a block at a point
      // Step 1: Enter block name via text input (or select from list)
      // Step 2: Select insertion point
      if (step === 1) {
        // Open text dialog for block name
        setTextDialogState({
          isOpen: true,
          initialText: '',
          onSubmit: (blockName: string) => {
            if (!blockName || blockName.trim() === '') {
              console.log('Block name cannot be empty');
              setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
              cancelCommand();
              return;
            }

            // Find block definition - use blockName property (not name)
            const blockDef = entities.find(e =>
              e.type === 'BLOCK_REFERENCE' && (e as any).blockName === blockName
            );

            if (!blockDef) {
              console.log(`Block "${blockName}" not found`);
              setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
              cancelCommand();
              return;
            }

            setCommandState({ blockDefinition: blockDef, blockName });
            setStep(2);
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
          },
          onCancel: () => {
            setTextDialogState({ isOpen: false, initialText: '', onSubmit: () => { } });
            cancelCommand();
          }
        });
      } else if (step === 2) {
        // Insertion point selected
        const { blockDefinition } = commandState;

        if (!blockDefinition) {
          console.log('No block definition');
          cancelCommand();
          return;
        }

        captureBeforeState();

        // Insert block entities at insertion point
        // Entities are stored as JSON string in attributes.entities
        let blockEntities: any[] = [];
        try {
          const entitiesJson = (blockDefinition as any).attributes?.entities;
          if (entitiesJson) {
            blockEntities = JSON.parse(entitiesJson);
          }
        } catch (e) {
          console.log('Error parsing block entities:', e);
        }
        const insertionPoint = point;

        blockEntities.forEach((ent: any) => {
          let newEnt = { ...ent, id: Date.now() + Math.random() };

          if (ent.type === 'LINE') {
            (newEnt as any).start = translatePt(ent.start, insertionPoint[0], insertionPoint[1]);
            (newEnt as any).end = translatePt(ent.end, insertionPoint[0], insertionPoint[1]);
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
            (newEnt as any).center = translatePt(ent.center, insertionPoint[0], insertionPoint[1]);
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = ent.vertices.map((v: Point) =>
              translatePt(v, insertionPoint[0], insertionPoint[1])
            );
          } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
            (newEnt as any).position = translatePt(ent.position, insertionPoint[0], insertionPoint[1]);
          }

          addEntity(newEnt as Entity);
        });

        createHistoryItem('INSERT' as CommandType);
        // Stay in command for multiple inserts
        setStep(2);
      }
    } else if (activeCommand === 'BOUNDARY') {
      // BOUNDARY: Create a closed boundary polyline at a point
      // Detects closed region at click point and creates LWPOLYLINE

      // Simple implementation: Find all nearby closed polylines or circles
      // and create a copy at the same location

      let minD = Infinity;
      let closestClosedEntity: Entity | null = null;
      const SELECT_THRESHOLD = 5.0;

      entities.forEach(ent => {
        if (ent.visible === false) return;

        // Check if entity forms a closed boundary
        if (ent.type === 'LWPOLYLINE' && (ent as any).closed) {
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestClosedEntity = ent;
          }
        } else if (ent.type === 'CIRCLE') {
          const d = closestPointOnEntity(point[0], point[1], ent);
          if (d < SELECT_THRESHOLD && d < minD) {
            minD = d;
            closestClosedEntity = ent;
          }
        }
        // Note: RECTANGLE is stored as LWPOLYLINE, handled above
      });

      if (closestClosedEntity) {
        captureBeforeState();

        let boundaryEntity: Entity | null = null;
        const closedEnt = closestClosedEntity as Entity;

        if (closedEnt.type === 'LWPOLYLINE') {
          // Copy the polyline
          boundaryEntity = {
            ...closedEnt,
            id: Date.now() + Math.random(),
            color: '#0ff', // Cyan for boundary
            layer: '0',
          };
        } else if (closedEnt.type === 'CIRCLE') {
          // Convert circle to polyline with vertices
          const center = (closedEnt as any).center;
          const radius = (closedEnt as any).radius;
          const segments = 36;
          const vertices: Point[] = [];

          for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push([
              center[0] + Math.cos(angle) * radius,
              center[1] + Math.sin(angle) * radius,
              0
            ]);
          }

          boundaryEntity = {
            type: 'LWPOLYLINE',
            vertices,
            closed: true,
            color: '#0ff',
            layer: '0',
            id: Date.now() + Math.random(),
          } as Entity;
        }

        if (boundaryEntity) {
          addEntity(boundaryEntity);
          createHistoryItem('BOUNDARY' as CommandType);
        }

        // Stay in command for multiple boundaries
      } else {
        console.log('No closed boundary found at point');
      }
    } else if (activeCommand === 'WBLOCK') {
      // WBLOCK: Write block to a DXF file
      // Select a BLOCK_REFERENCE entity and export it

      let minD = Infinity;
      let closestBlockRef: Entity | null = null;
      const SELECT_THRESHOLD = 5.0;

      entities.forEach(ent => {
        if (ent.visible === false) return;
        if (ent.type !== 'BLOCK_REFERENCE') return;

        const d = closestPointOnEntity(point[0], point[1], ent);
        if (d < SELECT_THRESHOLD && d < minD) {
          minD = d;
          closestBlockRef = ent;
        }
      });

      if (closestBlockRef) {
        const blockRef = closestBlockRef as any;
        const blockName = blockRef.blockName || 'unnamed_block';

        // Parse entities from JSON string in attributes.entities
        let blockEntities: any[] = [];
        try {
          const entitiesJson = blockRef.attributes?.entities;
          if (entitiesJson) {
            blockEntities = JSON.parse(entitiesJson);
          }
        } catch (e) {
          console.log('Error parsing block entities:', e);
        }

        if (blockEntities.length === 0) {
          console.log('Block has no entities to export');
          return;
        }

        // Convert block entities to absolute positions for export
        const exportEntities: Entity[] = blockEntities.map((ent: any) => {
          let exportEnt = { ...ent, id: Date.now() + Math.random() };
          const pos = blockRef.position;

          if (ent.type === 'LINE') {
            exportEnt.start = translatePt(ent.start, pos[0], pos[1]);
            exportEnt.end = translatePt(ent.end, pos[0], pos[1]);
          } else if (ent.type === 'CIRCLE' || ent.type === 'ARC' || ent.type === 'ELLIPSE' || ent.type === 'DONUT') {
            exportEnt.center = translatePt(ent.center, pos[0], pos[1]);
          } else if (ent.type === 'LWPOLYLINE') {
            exportEnt.vertices = ent.vertices.map((v: Point) => translatePt(v, pos[0], pos[1]));
          } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
            exportEnt.position = translatePt(ent.position, pos[0], pos[1]);
          }

          return exportEnt as Entity;
        });

        // Generate DXF content
        let dxfContent = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';
        dxfContent += '0\nSECTION\n2\nENTITIES\n';

        exportEntities.forEach((ent: any) => {
          if (ent.type === 'LINE') {
            dxfContent += '0\nLINE\n8\n0\n';
            dxfContent += `10\n${ent.start[0]}\n20\n${ent.start[1]}\n30\n${ent.start[2] || 0}\n`;
            dxfContent += `11\n${ent.end[0]}\n21\n${ent.end[1]}\n31\n${ent.end[2] || 0}\n`;
          } else if (ent.type === 'CIRCLE') {
            dxfContent += '0\nCIRCLE\n8\n0\n';
            dxfContent += `10\n${ent.center[0]}\n20\n${ent.center[1]}\n30\n${ent.center[2] || 0}\n`;
            dxfContent += `40\n${ent.radius}\n`;
          } else if (ent.type === 'LWPOLYLINE') {
            dxfContent += '0\nLWPOLYLINE\n8\n0\n';
            dxfContent += `90\n${ent.vertices.length}\n`;
            dxfContent += ent.closed ? '70\n1\n' : '70\n0\n';
            ent.vertices.forEach((v: Point) => {
              dxfContent += `10\n${v[0]}\n20\n${v[1]}\n`;
            });
          }
        });

        dxfContent += '0\nENDSEC\n0\nEOF\n';

        // Download the file
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blockName}.dxf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Block "${blockName}" exported as DXF file`);
        // Stay in WBLOCK mode for multiple exports
      } else {
        console.log('No BLOCK_REFERENCE found at point. Create a block first with BLOCK command.');
      }
    }
  }, [
    activeCommand,
    step,
    tempPoints,
    commandState,
    entities,
    selectedIds,
    addEntity,
    updateEntity,
    deleteEntities,
    cancelCommand,
    toggleSelection,
    clearSelection,
    setTextDialogState,
  ]);

  // Handle value input (text input)
  const handleValueInput = useCallback((value: string) => {
    if (activeCommand === 'TRIM' && step === 1 && value === '') {
      // Enter pressed - move to trimming step
      if (commandState.cuttingEdges && commandState.cuttingEdges.length > 0) {
        setStep(2);
        clearSelection(); // Clear cutting edge selection highlights
      } else {
        console.log('No cutting edges selected');
      }
    } else if (activeCommand === 'EXTEND' && step === 1 && value === '') {
      // Enter pressed - move to extending step
      if (commandState.boundaries && commandState.boundaries.length > 0) {
        setStep(2);
        clearSelection(); // Clear boundary selection highlights
      } else {
        console.log('No boundary edges selected');
      }
    } else if (activeCommand === 'JOIN' && step === 1 && value === '') {
      // Enter pressed - join selected lines/arcs
      if (selectedIds.size >= 2) {
        const selectedEntities = entities.filter(e => selectedIds.has(e.id));
        const lines = selectedEntities.filter(e => e.type === 'LINE');

        if (lines.length >= 2) {
          captureBeforeState();

          // Try to join lines that are connected end-to-end
          const tolerance = 0.1;
          const joined: Entity[] = [];
          const used = new Set<number>();

          // Find connected lines and join them
          for (let i = 0; i < lines.length; i++) {
            if (used.has(lines[i].id)) continue;

            const chain: Entity[] = [lines[i]];
            used.add(lines[i].id);
            let currentEnd = (lines[i] as any).end;
            let changed = true;

            // Keep extending the chain
            while (changed) {
              changed = false;
              for (let j = 0; j < lines.length; j++) {
                if (used.has(lines[j].id)) continue;

                const line = lines[j] as any;
                const distToStart = Math.hypot(currentEnd[0] - line.start[0], currentEnd[1] - line.start[1]);
                const distToEnd = Math.hypot(currentEnd[0] - line.end[0], currentEnd[1] - line.end[1]);

                if (distToStart < tolerance) {
                  chain.push(lines[j]);
                  used.add(lines[j].id);
                  currentEnd = line.end;
                  changed = true;
                  break;
                } else if (distToEnd < tolerance) {
                  // Reverse the line
                  chain.push({
                    ...lines[j],
                    start: line.end,
                    end: line.start,
                  } as Entity);
                  used.add(lines[j].id);
                  currentEnd = line.start;
                  changed = true;
                  break;
                }
              }
            }

            if (chain.length > 1) {
              // Create a polyline from the chain
              const vertices: Point[] = [(chain[0] as any).start];
              for (const line of chain) {
                vertices.push((line as any).end);
              }

              joined.push({
                type: 'LWPOLYLINE',
                vertices,
                closed: false,
                color: chain[0].color,
                layer: chain[0].layer,
                id: Date.now() + Math.random(),
              } as Entity);

              // Delete original lines
              chain.forEach(line => {
                if (!used.has(-1)) { // Prevent duplicate deletion
                  deleteEntities(new Set([line.id]));
                }
              });
            }
          }

          // Add joined polylines
          joined.forEach(ent => addEntity(ent));

          if (joined.length > 0) {
            createHistoryItem('JOIN' as CommandType);
          }
        }

        cancelCommand();
        clearSelection();
      } else {
        console.log('Select at least 2 objects to join');
      }
    } else if (activeCommand === 'HATCH' && step === 2 && value === '') {
      // Enter pressed - finish hatch with selected islands
      const { outerBoundary, islands, hatchParams } = commandState;

      if (!outerBoundary) {
        console.log('No outer boundary selected');
        cancelCommand();
        return;
      }

      captureBeforeState();

      const hatchEntity: any = {
        type: 'HATCH',
        boundary: outerBoundary,
        pattern: hatchParams.pattern || { name: 'ANSI31', type: 'predefined', angle: 45 },
        scale: hatchParams.scale || 1.0,
        rotation: hatchParams.rotation || 0,
        color: hatchParams.color || outerBoundary.color,
        layer: outerBoundary.layer,
        id: Date.now() + Math.random(),
      };

      if (islands && islands.length > 0) {
        hatchEntity.islands = islands;
      }

      addEntity(hatchEntity as Entity);
      createHistoryItem('HATCH' as CommandType);

      console.log(`Hatch created with ${islands?.length || 0} island(s)`);

      // Reset to step 1 for another hatch
      setStep(1);
      setCommandState({});
    } else if (activeCommand === 'BLOCK' && step === 1 && value === '') {
      // Enter pressed - move to selecting base point
      if (selectedIds.size > 0) {
        setStep(2);
      } else {
        console.log('Select objects first for block');
      }
    } else if (activeCommand === 'ARRAY' && step === 1 && value === '') {
      // Enter pressed - move to specifying array parameters
      if (selectedIds.size > 0) {
        setStep(2);
      } else {
        console.log('Select objects first');
      }
    } else if (activeCommand === 'ARRAY' && step === 2 && value.toUpperCase() === 'R') {
      // Rectangular array - ask for rows, cols, spacing
      setCommandState(prev => ({ ...prev, arrayType: 'RECTANGULAR', rows: 3, cols: 3, rowSpacing: 10, colSpacing: 10 }));
      setStep(3);
    } else if (activeCommand === 'ARRAY' && step === 2 && value.toUpperCase() === 'P') {
      // Polar array - need center point
      setCommandState(prev => ({ ...prev, arrayType: 'POLAR', items: 6, fillAngle: 360 }));
      // Stay in step 2, wait for center point click
    } else if (activeCommand === 'OFFSET' && step === 1) {
      const dist = parseFloat(value);
      if (!isNaN(dist) && dist > 0) {
        setCommandState({ distance: dist });
        setStep(2);
      }
    } else if (activeCommand === 'POLYGON' && step === 1) {
      const sides = parseInt(value);
      if (!isNaN(sides) && sides > 2) {
        setCommandState({ ...commandState, sides });
        setStep(2);
      }
    } else if (activeCommand === 'POLYLINE') {
      if (value.toUpperCase() === 'C' && tempPoints.length > 2) {
        addEntity({
          type: 'LWPOLYLINE',
          vertices: tempPoints,
          closed: true,
          color: '#fff',
          layer: '0',
        });
        cancelCommand();
      } else if (value === '') {
        finishPolyline();
      }
    } else if (activeCommand === 'SPLINE') {
      // Finish spline on Enter
      if (value === '' && tempPoints.length >= 2) {
        addEntity({
          type: 'SPLINE',
          controlPoints: tempPoints,
          degree: Math.min(3, tempPoints.length - 1),
          closed: false,
          color: '#fff',
          layer: '0',
        });
        cancelCommand();
      }
    } else if (activeCommand === 'SCALE' && step === 2) {
      const factor = parseFloat(value);
      if (!isNaN(factor) && factor > 0) {
        const { base } = commandState || { base: [0, 0, 0] };
        selectedIds.forEach(id => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent };
          if (ent.type === 'LINE') {
            (newEnt as any).start = scalePt((ent as any).start, base[0], base[1], factor);
            (newEnt as any).end = scalePt((ent as any).end, base[0], base[1], factor);
          } else if (ent.type === 'CIRCLE') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).radius *= factor;
          } else if (ent.type === 'ARC') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).radius *= factor;
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) =>
              scalePt(v, base[0], base[1], factor)
            );
          } else if (ent.type === 'TEXT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).height *= factor;
          } else if (ent.type === 'MTEXT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).height *= factor;
            (newEnt as any).width *= factor;
          } else if (ent.type === 'TABLE') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
            (newEnt as any).rowHeight *= factor;
            (newEnt as any).colWidth *= factor;
          } else if (ent.type === 'POINT') {
            (newEnt as any).position = scalePt((ent as any).position, base[0], base[1], factor);
          } else if (ent.type === 'DONUT') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).innerRadius *= factor;
            (newEnt as any).outerRadius *= factor;
          } else if (ent.type === 'ELLIPSE') {
            (newEnt as any).center = scalePt((ent as any).center, base[0], base[1], factor);
            (newEnt as any).rx *= factor;
            (newEnt as any).ry *= factor;
          }
          updateEntity(id, newEnt as Entity);
        });
        cancelCommand();
        clearSelection();
      }
    } else if (activeCommand === 'ROTATE' && step === 2) {
      const angleDeg = parseFloat(value);
      if (!isNaN(angleDeg)) {
        const deltaAngle = angleDeg * Math.PI / 180;
        const { base } = commandState || { base: [0, 0, 0] };
        selectedIds.forEach(id => {
          const ent = entities.find(e => e.id === id);
          if (!ent) return;
          let newEnt = { ...ent };
          if (ent.type === 'LINE') {
            (newEnt as any).start = rotatePt((ent as any).start, base[0], base[1], deltaAngle);
            (newEnt as any).end = rotatePt((ent as any).end, base[0], base[1], deltaAngle);
          } else if (ent.type === 'CIRCLE') {
            (newEnt as any).center = rotatePt((ent as any).center, base[0], base[1], deltaAngle);
          } else if (ent.type === 'ARC') {
            (newEnt as any).center = rotatePt((ent as any).center, base[0], base[1], deltaAngle);
            (newEnt as any).startAngle += deltaAngle;
            (newEnt as any).endAngle += deltaAngle;
          } else if (ent.type === 'LWPOLYLINE') {
            (newEnt as any).vertices = (ent as any).vertices.map((v: Point) =>
              rotatePt(v, base[0], base[1], deltaAngle)
            );
          } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
            (newEnt as any).position = rotatePt((ent as any).position, base[0], base[1], deltaAngle);
            (newEnt as any).rotation = ((ent as any).rotation || 0) + deltaAngle;
          } else if (ent.type === 'TABLE') {
            (newEnt as any).position = rotatePt((ent as any).position, base[0], base[1], deltaAngle);
            (newEnt as any).rotation = ((ent as any).rotation || 0) + deltaAngle;
          }
          updateEntity(id, newEnt as Entity);
        });
        cancelCommand();
        clearSelection();
      }
    }
  }, [
    activeCommand,
    step,
    tempPoints,
    commandState,
    entities,
    selectedIds,
    addEntity,
    updateEntity,
    cancelCommand,
    finishPolyline,
    clearSelection,
  ]);

  // Print Preview
  const [printPreviewMode, setPrintPreviewMode] = useState(false);

  const startPrintPreview = useCallback(() => {
    setPrintDialogState({ isOpen: false });
    setPrintPreviewMode(true);
    // Note: Zoom to print area is handled by PrintDialog's applyPlotAreaZoom before calling this
  }, []);

  const finishPrintPreview = useCallback(() => {
    setPrintPreviewMode(false);
    setPrintDialogState({ isOpen: true });
  }, []);

  // Helper: Calculate bounding box of all visible entities
  const getEntitiesBoundingBox = useCallback((): { min: Point; max: Point } | null => {
    const visibleEntities = entities.filter(e => e.visible !== false);
    if (visibleEntities.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    visibleEntities.forEach(ent => {
      if (ent.type === 'LINE') {
        const line = ent as any;
        minX = Math.min(minX, line.start[0], line.end[0]);
        minY = Math.min(minY, line.start[1], line.end[1]);
        maxX = Math.max(maxX, line.start[0], line.end[0]);
        maxY = Math.max(maxY, line.start[1], line.end[1]);
      } else if (ent.type === 'CIRCLE' || ent.type === 'DONUT') {
        const c = ent as any;
        const r = c.outerRadius || c.radius || 0;
        minX = Math.min(minX, c.center[0] - r);
        minY = Math.min(minY, c.center[1] - r);
        maxX = Math.max(maxX, c.center[0] + r);
        maxY = Math.max(maxY, c.center[1] + r);
      } else if (ent.type === 'ARC') {
        const arc = ent as any;
        minX = Math.min(minX, arc.center[0] - arc.radius);
        minY = Math.min(minY, arc.center[1] - arc.radius);
        maxX = Math.max(maxX, arc.center[0] + arc.radius);
        maxY = Math.max(maxY, arc.center[1] + arc.radius);
      } else if (ent.type === 'ELLIPSE') {
        const e = ent as any;
        minX = Math.min(minX, e.center[0] - e.rx);
        minY = Math.min(minY, e.center[1] - e.ry);
        maxX = Math.max(maxX, e.center[0] + e.rx);
        maxY = Math.max(maxY, e.center[1] + e.ry);
      } else if (ent.type === 'LWPOLYLINE') {
        const poly = ent as any;
        poly.vertices.forEach((v: Point) => {
          minX = Math.min(minX, v[0]);
          minY = Math.min(minY, v[1]);
          maxX = Math.max(maxX, v[0]);
          maxY = Math.max(maxY, v[1]);
        });
      } else if (ent.type === 'POINT' || ent.type === 'TEXT' || ent.type === 'MTEXT' || ent.type === 'TABLE') {
        const p = (ent as any).position;
        if (p) {
          minX = Math.min(minX, p[0]);
          minY = Math.min(minY, p[1]);
          maxX = Math.max(maxX, p[0]);
          maxY = Math.max(maxY, p[1]);
        }
      }
    });

    if (minX === Infinity) return null;
    return { min: [minX, minY, 0], max: [maxX, maxY, 0] };
  }, [entities]);

  // Memoize context value to prevent unnecessary re-renders
  const value: DrawingContextValue = useMemo(() => ({
    // Sheet/Tab management
    sheets,
    activeSheetId,
    addSheet,
    removeSheet,
    switchSheet,
    renameSheet,

    // File state
    fileName,
    isModified,
    newFile,
    loadEntities,
    loadProject,
    // Layers
    layerDialogState,
    setLayerDialogState,
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayerId,
    activeLineType,
    setActiveLineType,
    activeLineWeight,
    setActiveLineWeight,
    baseUnit,
    setBaseUnit,
    drawingUnit,
    setDrawingUnit,
    drawingScale,
    setDrawingScale,
    scaleFactor,
    entities,
    addEntity,
    updateEntity,
    deleteEntities,
    getEntity,
    activeCommand,
    startCommand,
    cancelCommand,
    step,
    setStep,
    tempPoints,
    cursorPosition,
    setCursorPosition,
    commandState,
    setCommandState,
    handleCommandInput,
    handleMouseMove,
    handleValueInput,
    finishPolyline,
    selectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    hoveredEntityId,
    setHoveredEntityId,
    osnapEnabled,
    toggleOsnap,
    activeSnap,
    polarTrackingEnabled,
    togglePolarTracking,
    polarTrackingAngle,
    setPolarTrackingAngle,
    activeGrip,
    activateGrip,
    cancelGrip,
    selectionBox,
    handlePointerDown,
    handlePointerUp,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomToFitTrigger,
    triggerZoomToFit,
    zoomInTrigger,
    triggerZoomIn,
    zoomOutTrigger,
    triggerZoomOut,
    zoomWindowMode,
    startZoomWindow,
    cancelZoomWindow,
    zoomWindowBox,
    setZoomWindowBox,
    applyZoomWindow,
    zoomWindowTrigger,
    historyManager: historyManager.current,
    textDialogState,
    setTextDialogState,
    tableDialogState,
    setTableDialogState,
    dimensionSettingsDialogState,
    setDimensionSettingsDialogState,
    dimensionEditDialogState,
    setDimensionEditDialogState,
    // InPlaceTextEditor State
    inPlaceTextEditorState,
    setInPlaceTextEditorState,
    submitInPlaceEdit,
    cancelInPlaceEdit,
    // Print System
    printDialogState,
    setPrintDialogState,
    printWindowMode,
    startPrintWindow,
    finishPrintWindow,
    printWindowBox,
    setPrintWindowBox,
    applyPrintWindow,
    printPreviewMode,
    startPrintPreview,
    finishPrintPreview,
    getEntitiesBoundingBox,
    gridEnabled,
    toggleGrid,
    orthoEnabled,
    toggleOrtho,
  }), [
    sheets, activeSheetId, addSheet, removeSheet, switchSheet, renameSheet,
    fileName, isModified, newFile, loadEntities, loadProject,
    layerDialogState, setLayerDialogState, layers, activeLayerId, addLayer, removeLayer, updateLayer, setActiveLayerId,
    baseUnit, drawingUnit, drawingScale, scaleFactor,
    entities, addEntity, updateEntity, deleteEntities, getEntity,
    activeCommand, startCommand, cancelCommand,
    step, tempPoints, cursorPosition, commandState,
    handleCommandInput, handleMouseMove, handleValueInput, finishPolyline,
    selectedIds, toggleSelection, clearSelection, selectAll, hoveredEntityId, setHoveredEntityId,
    osnapEnabled, toggleOsnap, activeSnap,
    gridEnabled, toggleGrid, orthoEnabled, toggleOrtho,
    polarTrackingEnabled, togglePolarTracking, polarTrackingAngle, setPolarTrackingAngle,
    activeGrip, activateGrip, cancelGrip, selectionBox,
    handlePointerDown, handlePointerUp,
    undo, redo, canUndo, canRedo,
    zoomToFitTrigger, triggerZoomToFit,
    zoomInTrigger, triggerZoomIn, zoomOutTrigger, triggerZoomOut,
    zoomWindowMode, startZoomWindow, cancelZoomWindow, zoomWindowBox, applyZoomWindow, zoomWindowTrigger,
    textDialogState, setTextDialogState,
    tableDialogState, setTableDialogState,
    dimensionSettingsDialogState, setDimensionSettingsDialogState,
    dimensionEditDialogState, setDimensionEditDialogState,
    inPlaceTextEditorState, setInPlaceTextEditorState, submitInPlaceEdit, cancelInPlaceEdit,
    printDialogState, setPrintDialogState,
    printWindowMode, startPrintWindow, finishPrintWindow, printWindowBox, setPrintWindowBox, applyPrintWindow,
    printPreviewMode, startPrintPreview, finishPrintPreview
  ]);

  return (
    <DrawingContext.Provider value={value}>
      {children}
    </DrawingContext.Provider>
  );
};

// Helper: Create arc from 3 points
function createArcFrom3Points(p1: Point, p2: Point, p3: Point): {
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
} | null {
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const x3 = p3[0], y3 = p3[1];

  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(D) < 0.0001) return null;

  const Ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
  const Uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;

  const radius = Math.sqrt((x1 - Ux) * (x1 - Ux) + (y1 - Uy) * (y1 - Uy));

  return {
    center: [Ux, Uy, 0],
    radius,
    startAngle: Math.atan2(y1 - Uy, x1 - Ux),
    endAngle: Math.atan2(y3 - Uy, x3 - Ux),
  };
}
