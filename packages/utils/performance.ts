/**
 * Performance Monitoring Utilities
 * Track and optimize application performance
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record metric
   */
  end(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`⚠️ No start time found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    // Store metric
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    const existing = this.metrics.get(name) || [];
    existing.push(metric);

    // Keep only last 100 metrics per operation
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(name, existing);

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get average duration for an operation
   */
  getAverage(name: string): number {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get all metrics for an operation
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; average: number; total: number }> {
    const summary: Record<string, { count: number; average: number; total: number }> = {};

    for (const [name, metrics] of this.metrics.entries()) {
      const total = metrics.reduce((sum, m) => sum + m.duration, 0);
      summary[name] = {
        count: metrics.length,
        average: total / metrics.length,
        total,
      };
    }

    return summary;
  }

  /**
   * Print performance report
   */
  report(): void {
    const summary = this.getSummary();
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Performance Report");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const [name, stats] of Object.entries(summary)) {
      console.log(
        `${name}:\n` +
          `  Count: ${stats.count}\n` +
          `  Average: ${stats.average.toFixed(2)}ms\n` +
          `  Total: ${stats.total.toFixed(2)}ms`
      );
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  perfMonitor.start(name);
  try {
    const result = await fn();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.end(name);
    throw error;
  }
}

/**
 * Measure sync function execution time
 */
export function measure<T>(name: string, fn: () => T): T {
  perfMonitor.start(name);
  try {
    const result = fn();
    perfMonitor.end(name);
    return result;
  } catch (error) {
    perfMonitor.end(name);
    throw error;
  }
}

/**
 * Performance decorator for class methods
 */
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const name = `${target.constructor.name}.${propertyKey}`;
    perfMonitor.start(name);
    try {
      const result = await originalMethod.apply(this, args);
      perfMonitor.end(name);
      return result;
    } catch (error) {
      perfMonitor.end(name);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Web Vitals monitoring
 */
export function reportWebVitals() {
  if (typeof window === "undefined") return;

  // Observe Core Web Vitals
  if ("PerformanceObserver" in window) {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log("📊 LCP:", lastEntry.startTime.toFixed(2), "ms");
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log("📊 FID:", entry.processingStart - entry.startTime, "ms");
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });

      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        console.log("📊 CLS:", clsScore.toFixed(4));
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (error) {
      console.warn("Performance Observer not fully supported:", error);
    }
  }

  // Navigation Timing
  if ("performance" in window && "timing" in window.performance) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaint = timing.responseEnd - timing.fetchStart;

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Page Load Performance");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(`Total Load Time: ${loadTime}ms`);
        console.log(`DOM Ready: ${domReady}ms`);
        console.log(`First Paint: ${firstPaint}ms`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }, 0);
    });
  }
}

// Auto-initialize in browser
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  reportWebVitals();

  // Report performance summary every 30 seconds in dev mode
  setInterval(() => {
    perfMonitor.report();
  }, 30000);
}
