/**
 * FocusScope Component
 * 
 * Manages focus within a container for keyboard navigation.
 * Useful for modals, dropdowns, and other overlay components.
 */

import React, { useRef, useEffect } from 'react';
import { View, type ViewProps, Platform } from 'react-native';

export interface FocusScopeProps extends ViewProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  enabled?: boolean;
}

export function FocusScope({
  children,
  autoFocus = true,
  restoreFocus = true,
  enabled = true,
  ...props
}: FocusScopeProps) {
  const containerRef = useRef<View>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only handle focus on web
    if (Platform.OS !== 'web' || !enabled) {
      return;
    }

    // Store previously focused element
    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      previouslyFocusedElement.current = document.activeElement;
    }

    // Auto-focus the container
    if (autoFocus && containerRef.current) {
      // @ts-ignore - Web-specific API
      const element = containerRef.current as unknown as HTMLElement;
      element.focus();
    }

    return () => {
      // Restore focus on unmount
      if (restoreFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [autoFocus, restoreFocus, enabled]);

  return (
    <View
      ref={containerRef}
      // @ts-ignore - Web-specific prop
      tabIndex={enabled ? 0 : undefined}
      {...props}
    >
      {children}
    </View>
  );
}
