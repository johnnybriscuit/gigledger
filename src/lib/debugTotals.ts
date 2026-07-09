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
  }
  
  /**
   * Print summary
   */
  summary() {
    if (!this.isEnabled()) {
      return;
    }
    
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
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
    }
  }
}

export const debugTotals = new DebugTotalsLogger();

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).__debugTotals__ = debugTotals;
}
