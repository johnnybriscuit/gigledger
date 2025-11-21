/**
 * useAnchorLayout Hook
 * Measures component position for anchoring overlays
 * Uses measureInWindow (cross-platform) instead of findNodeHandle
 */

import { useState, useCallback, useEffect, RefObject } from 'react';
import { View, Platform } from 'react-native';

export type AnchorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function useAnchorLayout(ref: RefObject<View>) {
  const [anchor, setAnchor] = useState<AnchorLayout>({ x: 0, y: 0, width: 0, height: 0 });

  const measure = useCallback(() => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        setAnchor({ x, y, width, height });
      });
    }
  }, [ref]);

  // Re-measure on scroll/resize (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('scroll', measure, true);
      window.addEventListener('resize', measure);
      return () => {
        window.removeEventListener('scroll', measure, true);
        window.removeEventListener('resize', measure);
      };
    }
  }, [measure]);

  return { anchor, measure };
}
