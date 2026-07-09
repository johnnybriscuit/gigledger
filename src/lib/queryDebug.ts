/**
 * Query Debug Utility
 * Helps identify duplicate queries and cache misses
 * 
 * Usage:
 * 1. Import in App.tsx: import { enableQueryDebug } from './src/lib/queryDebug';
 * 2. Call after QueryClient creation: enableQueryDebug(queryClient);
 * 3. Check console for duplicate query warnings
 */

import { QueryClient } from '@tanstack/react-query';

interface QueryLog {
  queryKey: string;
  count: number;
  timestamps: number[];
}

const queryLogs = new Map<string, QueryLog>();

export function enableQueryDebug(queryClient: QueryClient) {
  if (typeof window === 'undefined' || !__DEV__) return;


  // Track all queries
  const cache = queryClient.getQueryCache();
  
  cache.subscribe((event) => {
    if (event?.type === 'added') {
      const query = event.query;
      const keyString = JSON.stringify(query.queryKey);
      
      const log = queryLogs.get(keyString) || {
        queryKey: keyString,
        count: 0,
        timestamps: [],
      };
      
      log.count++;
      log.timestamps.push(Date.now());
      queryLogs.set(keyString, log);
      
      // Warn about duplicates within 5 seconds
      const recentCalls = log.timestamps.filter(t => Date.now() - t < 5000);
      
      if (recentCalls.length > 1) {
      }
      
      // Log all queries for debugging
    }
  });

  // Report summary every 10 seconds
  setInterval(() => {
    const duplicates = Array.from(queryLogs.values())
      .filter(log => log.count > 1)
      .sort((a, b) => b.count - a.count);
    
    if (duplicates.length > 0) {
      console.group('🚨 DUPLICATE QUERIES DETECTED');
      
      duplicates.forEach(log => {
      });
      
      console.groupEnd();
    }
  }, 10000);
}

/**
 * Get query statistics
 */
export function getQueryStats() {
  const stats = {
    totalQueries: queryLogs.size,
    totalCalls: Array.from(queryLogs.values()).reduce((sum, log) => sum + log.count, 0),
    duplicates: Array.from(queryLogs.values())
      .filter(log => log.count > 1)
      .map(log => ({
        queryKey: log.queryKey,
        count: log.count,
      }))
      .sort((a, b) => b.count - a.count),
  };
  
  console.group('📊 Query Statistics');
  
  if (stats.duplicates.length > 0) {
    stats.duplicates.slice(0, 10).forEach(d => {
    });
  }
  
  console.groupEnd();
  
  return stats;
}

/**
 * Clear query logs
 */
export function clearQueryLogs() {
  queryLogs.clear();
}

// Make available in console
if (typeof window !== 'undefined') {
  (window as any).getQueryStats = getQueryStats;
  (window as any).clearQueryLogs = clearQueryLogs;
}
