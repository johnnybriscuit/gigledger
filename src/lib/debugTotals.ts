/**
 * Debug Totals Logger
 * 
 * Lightweight dev-only instrumentation to track totals calculations
 * and identify when incorrect values flash on screen.
 * 
 * Usage:
 *   // In browser console:
 *   window.__GL_DEBUG_TOTALS__ = true
 * 
 *   // In code:
 *   debugTotals.log('dashboard', { ... })
 */

interface DebugTotalsInput {
  // Context
  userId: string | null;
  range: string;
  timestamp?: number;
  
  // Data status
  gigsStatus: 'loading' | 'success' | 'error';
  gigsCount: number;
  gigsDateRange?: { min: string; max: string };
  
  expensesStatus?: 'loading' | 'success' | 'error';
  expensesCount?: number;
  expensesDateRange?: { min: string; max: string };
  
  // Tax profile status
  taxProfileStatus: 'loading' | 'success' | 'error' | 'missing';
  taxProfileFields?: {
    filingStatus?: string;
    state?: string;
    businessStructure?: string;
    seIncome?: boolean;
  };
  
  // Computed outputs
  computed: {
    grossIncome: number;
    expenses: number;
    netProfit: number;
    setAside: number;
    setAsideRate: number;
  };
  
  // Additional context
  notes?: string;
}

class DebugTotalsLogger {
  private logs: Array<{ location: string; data: DebugTotalsInput }> = [];
  private startTime = Date.now();
  
  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).__GL_DEBUG_TOTALS__;
  }
  
  /**
   * Log a totals calculation
   */
  log(location: string, data: DebugTotalsInput) {
    if (!this.isEnabled()) return;
    
    const timestamp = Date.now() - this.startTime;
    const logEntry = {
      location,
      data: { ...data, timestamp },
    };
    
    this.logs.push(logEntry);
    
    // Console output with color coding
    const allReady = 
      data.gigsStatus === 'success' &&
      (!data.expensesStatus || data.expensesStatus === 'success') &&
      data.taxProfileStatus === 'success';
    
    const style = allReady 
      ? 'color: #10b981; font-weight: bold;' // green
      : 'color: #f59e0b; font-weight: bold;'; // amber
    
    console.log(
      `%c[DebugTotals +${timestamp}ms] ${location}`,
      style,
      {
        ready: allReady,
        userId: data.userId,
        range: data.range,
        gigs: `${data.gigsStatus} (${data.gigsCount})`,
        expenses: data.expensesStatus ? `${data.expensesStatus} (${data.expensesCount})` : 'n/a',
        taxProfile: data.taxProfileStatus,
        computed: {
          netProfit: `$${data.computed.netProfit.toFixed(2)}`,
          setAside: `$${data.computed.setAside.toFixed(2)}`,
          rate: `${(data.computed.setAsideRate * 100).toFixed(1)}%`,
        },
        notes: data.notes,
      }
    );
  }
  
  /**
   * Get all logs
   */
  getLogs() {
    return this.logs;
  }
  
  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
    this.startTime = Date.now();
    console.log('%c[DebugTotals] Logs cleared', 'color: #6b7280;');
  }
  
  /**
   * Print summary
   */
  summary() {
    if (!this.isEnabled()) {
      console.log('%c[DebugTotals] Debug mode not enabled. Set window.__GL_DEBUG_TOTALS__ = true', 'color: #6b7280;');
      return;
    }
    
    console.log('%c[DebugTotals] Summary', 'color: #3b82f6; font-weight: bold;');
    console.table(
      this.logs.map(log => ({
        time: `+${log.data.timestamp}ms`,
        location: log.location,
        range: log.data.range,
        gigsStatus: log.data.gigsStatus,
        taxStatus: log.data.taxProfileStatus,
        netProfit: `$${log.data.computed.netProfit.toFixed(2)}`,
        setAside: `$${log.data.computed.setAside.toFixed(2)}`,
        notes: log.data.notes || '',
      }))
    );
    
    // Identify potential issues
    const issues: string[] = [];
    
    // Check for calculations with loading data
    const calculationsWhileLoading = this.logs.filter(
      log => log.data.gigsStatus === 'loading' || log.data.taxProfileStatus === 'loading'
    );
    if (calculationsWhileLoading.length > 0) {
      issues.push(`⚠️  ${calculationsWhileLoading.length} calculations ran while data was still loading`);
    }
    
    // Check for changing totals
    const netProfits = this.logs.map(log => log.data.computed.netProfit);
    const uniqueNetProfits = [...new Set(netProfits)];
    if (uniqueNetProfits.length > 1) {
      issues.push(`⚠️  Net profit changed ${uniqueNetProfits.length} times: ${uniqueNetProfits.map(n => `$${n.toFixed(2)}`).join(' → ')}`);
    }
    
    if (issues.length > 0) {
      console.log('%c[DebugTotals] Issues Found:', 'color: #ef4444; font-weight: bold;');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('%c[DebugTotals] ✓ No issues detected', 'color: #10b981;');
    }
  }
}

export const debugTotals = new DebugTotalsLogger();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).__debugTotals__ = debugTotals;
  console.log(
    '%c[DebugTotals] Available in console. Enable with: window.__GL_DEBUG_TOTALS__ = true',
    'color: #6b7280; font-style: italic;'
  );
}
