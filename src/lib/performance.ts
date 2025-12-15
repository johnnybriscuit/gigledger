/**
 * Performance Instrumentation
 * 
 * Lightweight performance tracking for web.
 * Measures key milestones in the app boot and dashboard load process.
 */

import { Platform } from 'react-native';

interface PerformanceMark {
  name: string;
  timestamp: number;
}

class PerformanceTracker {
  private marks: PerformanceMark[] = [];
  private startTime: number;
  private enabled: boolean;

  constructor() {
    this.startTime = Platform.OS === 'web' ? performance.now() : Date.now();
    this.enabled = Platform.OS === 'web' && __DEV__;
  }

  mark(name: string) {
    if (!this.enabled) return;

    const timestamp = Platform.OS === 'web' ? performance.now() : Date.now();
    this.marks.push({ name, timestamp });

    if (__DEV__) {
      console.log(`[Perf] ${name}: ${(timestamp - this.startTime).toFixed(2)}ms`);
    }
  }

  measure(startMark: string, endMark: string): number | null {
    if (!this.enabled) return null;

    const start = this.marks.find(m => m.name === startMark);
    const end = this.marks.find(m => m.name === endMark);

    if (!start || !end) return null;

    const duration = end.timestamp - start.timestamp;
    
    if (__DEV__) {
      console.log(`[Perf] ${startMark} → ${endMark}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  getReport() {
    if (!this.enabled) return null;

    const report = {
      startTime: this.startTime,
      marks: this.marks.map(m => ({
        name: m.name,
        elapsed: m.timestamp - this.startTime,
      })),
      measurements: {
        timeToBootstrap: this.measure('app-start', 'bootstrap-ready'),
        timeToDashboard: this.measure('app-start', 'dashboard-mounted'),
        timeToInteractive: this.measure('app-start', 'dashboard-interactive'),
      },
    };

    if (__DEV__) {
      console.table(report.marks);
      console.log('[Perf] Measurements:', report.measurements);
    }

    return report;
  }

  reset() {
    this.marks = [];
    this.startTime = Platform.OS === 'web' ? performance.now() : Date.now();
  }
}

// Singleton instance
export const perf = new PerformanceTracker();

// Mark app start immediately
perf.mark('app-start');
