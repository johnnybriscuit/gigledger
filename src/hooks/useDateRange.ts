/**
 * Enhanced date range hook with URL sync and localStorage persistence
 * Supports: ytd, last30, last90, lastYear, custom
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export type DateRange = 'ytd' | 'last30' | 'last90' | 'lastYear' | 'custom';

interface DateRangeState {
  range: DateRange;
  customStart?: Date;
  customEnd?: Date;
}

interface UseDateRangeReturn extends DateRangeState {
  setRange: (range: DateRange) => void;
  setCustomRange: (start: Date, end: Date) => void;
}

export function useDateRange(): UseDateRangeReturn {
  const [state, setState] = useState<DateRangeState>(() => {
    // Initialize from URL query params (web) or localStorage
    if (Platform.OS === 'web') {
      const params = new URLSearchParams(window.location.search);
      const urlRange = params.get('range') as DateRange;
      const customStart = params.get('start');
      const customEnd = params.get('end');

      if (urlRange === 'custom' && customStart && customEnd) {
        return {
          range: 'custom',
          customStart: new Date(customStart),
          customEnd: new Date(customEnd),
        };
      }

      if (urlRange && ['ytd', 'last30', 'last90', 'lastYear'].includes(urlRange)) {
        return { range: urlRange };
      }

      // Fall back to localStorage
      const saved = localStorage.getItem('dateRange');
      if (saved) {
        try {
          return JSON.parse(saved, (key, value) => {
            if (key === 'customStart' || key === 'customEnd') {
              return value ? new Date(value) : undefined;
            }
            return value;
          });
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Default to YTD
    return { range: 'ytd' };
  });

  // Sync to URL and localStorage when state changes
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Update URL
      const params = new URLSearchParams(window.location.search);
      params.set('range', state.range);

      if (state.range === 'custom' && state.customStart && state.customEnd) {
        params.set('start', state.customStart.toISOString().split('T')[0]);
        params.set('end', state.customEnd.toISOString().split('T')[0]);
      } else {
        params.delete('start');
        params.delete('end');
      }

      // Update URL without reloading
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);

      // Save to localStorage
      localStorage.setItem('dateRange', JSON.stringify(state));
    }
  }, [state]);

  const setRange = (range: DateRange) => {
    if (range === 'custom') {
      // Don't change to custom without dates
      return;
    }
    setState({ range });
  };

  const setCustomRange = (customStart: Date, customEnd: Date) => {
    setState({
      range: 'custom',
      customStart,
      customEnd,
    });
  };

  return {
    ...state,
    setRange,
    setCustomRange,
  };
}
