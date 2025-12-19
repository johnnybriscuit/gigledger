import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to update the document title on web
 * @param title - The page title (e.g., "Dashboard")
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const previousTitle = document.title;
      document.title = title ? `${title} • GigLedger` : 'GigLedger';
      
      return () => {
        document.title = previousTitle;
      };
    }
  }, [title]);
}
