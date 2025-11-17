/**
 * useKeyboard Hook
 * 
 * Handles keyboard events for accessibility and UX.
 * Primarily for web platform keyboard navigation.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

export interface UseKeyboardOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  enabled?: boolean;
}

export function useKeyboard({ onEscape, onEnter, enabled = true }: UseKeyboardOptions) {
  useEffect(() => {
    // Only handle keyboard events on web
    if (Platform.OS !== 'web' || !enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'Enter':
          if (onEnter && !event.shiftKey) {
            event.preventDefault();
            onEnter();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, onEnter, enabled]);
}
