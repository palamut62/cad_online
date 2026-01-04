import { useState, useCallback, useMemo } from 'react';
import { SnapManager } from '../utils/snapManager';
import type { SnapSettings, SnapMode, SnapResult } from '../types/snap';
import type { Entity, Point } from '../types/entities';
import { DEFAULT_SNAP_SETTINGS } from '../types/snap';

interface UseSnapOptions {
  entities: Entity[];
  viewportZoom?: number;
}

export const useSnap = ({ entities, viewportZoom = 1 }: UseSnapOptions) => {
  const [settings, setSettings] = useState<SnapSettings>(DEFAULT_SNAP_SETTINGS);
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);

  const snapManager = useMemo(() => {
    return new SnapManager(settings, entities);
  }, [entities, settings]);

  const findSnap = useCallback((cursorPoint: Point, zoom?: number): SnapResult => {
    const result = snapManager.findSnapPoint(cursorPoint, zoom ?? viewportZoom);
    setCurrentSnap(result);
    return result;
  }, [snapManager, viewportZoom]);

  const toggleSnap = useCallback(() => {
    setSettings(prev => {
      const updated = { ...prev, enabled: !prev.enabled };
      snapManager.updateSettings(updated);
      return updated;
    });
  }, [snapManager]);

  const toggleSnapMode = useCallback((mode: SnapMode) => {
    setSettings(prev => {
      const modes = new Set(prev.modes);
      if (modes.has(mode)) {
        modes.delete(mode);
      } else {
        modes.add(mode);
      }
      const updated = { ...prev, modes };
      snapManager.updateSettings(updated);
      return updated;
    });
  }, [snapManager]);

  const updateSettings = useCallback((updates: Partial<SnapSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      snapManager.updateSettings(updated);
      return updated;
    });
  }, [snapManager]);

  return {
    settings,
    currentSnap,
    findSnap,
    toggleSnap,
    toggleSnapMode,
    updateSettings,
    snapManager,
  };
};
