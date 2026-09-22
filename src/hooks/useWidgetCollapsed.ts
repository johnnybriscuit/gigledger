/**
 * Persisted collapse/expand state for dashboard widgets.
 * State is stored in localStorage on web so a user's layout
 * preferences survive reloads; on native it falls back to
 * plain component state.
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

const STORAGE_PREFIX = 'bozzy_widget_collapsed_';

function readStored(key: string, fallback: boolean): boolean {
  if (Platform.OS !== 'web') return fallback;
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + key);
    return saved === null ? fallback : saved === 'true';
  } catch {
    return fallback;
  }
}

export function useWidgetCollapsed(
  key: string,
  defaultCollapsed = false,
): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStored(key, defaultCollapsed));

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      if (Platform.OS === 'web') {
        try {
          localStorage.setItem(STORAGE_PREFIX + key, String(next));
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  }, [key]);

  return [collapsed, toggle];
}
