import { redis } from './redis';

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

interface ApiMetrics {
  endpoint: string;
  averageResponseTime: number;
  totalRequests: number;
  cacheHitRate: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { hits: number; misses: number; responseTimes: number[] }> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  // Record cache hit
  recordCacheHit(endpoint: string): void {
    const current = this.metrics.get(endpoint) || { hits: 0, misses: 0, responseTimes: [] };
    current.hits++;
    this.metrics.set(endpoint, current);
  }

  // Record cache miss
  recordCacheMiss(endpoint: string): void {
    const current = this.metrics.get(endpoint) || { hits: 0, misses: 0, responseTimes: [] };
    current.misses++;
    this.metrics.set(endpoint, current);
  }

  // Record response time
  recordResponseTime(endpoint: string, responseTime: number): void {
    const current = this.metrics.get(endpoint) || { hits: 0, misses: 0, responseTimes: [] };
    current.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times to prevent memory bloat
    if (current.responseTimes.length > 1000) {
      current.responseTimes = current.responseTimes.slice(-1000);
    }
    
    this.metrics.set(endpoint, current);
  }

  // Get cache metrics for an endpoint
  getCacheMetrics(endpoint: string): CacheMetrics {
    const data = this.metrics.get(endpoint) || { hits: 0, misses: 0, responseTimes: [] };
    const totalRequests = data.hits + data.misses;
    const hitRate = totalRequests > 0 ? (data.hits / totalRequests) * 100 : 0;

    return {
      hits: data.hits,
      misses: data.misses,
      totalRequests,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  // Get API metrics for an endpoint
  getApiMetrics(endpoint: string): ApiMetrics {
    const data = this.metrics.get(endpoint) || { hits: 0, misses: 0, responseTimes: [] };
    const cacheMetrics = this.getCacheMetrics(endpoint);
    
    const averageResponseTime = data.responseTimes.length > 0
      ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
      : 0;

    return {
      endpoint,
      averageResponseTime: Math.round(averageResponseTime),
      totalRequests: cacheMetrics.totalRequests,
      cacheHitRate: cacheMetrics.hitRate
    };
  }

  // Get all metrics
  getAllMetrics(): ApiMetrics[] {
    const allMetrics: ApiMetrics[] = [];
    
    for (const [endpoint] of this.metrics) {
      allMetrics.push(this.getApiMetrics(endpoint));
    }
    
    return allMetrics;
  }

  // Persist metrics to Redis (for distributed monitoring)
  async persistMetrics(): Promise<void> {
    try {
      const allMetrics = this.getAllMetrics();
      await redis().setex(
        'monitoring:metrics',
        300, // 5 minutes TTL
        JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics: allMetrics
        })
      );
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Helper function to measure API performance
export function measurePerformance(endpoint: string) {
  const monitor = PerformanceMonitor.getInstance();
  const startTime = Date.now();

  return {
    recordCacheHit: () => {
      monitor.recordCacheHit(endpoint);
      const responseTime = Date.now() - startTime;
      monitor.recordResponseTime(endpoint, responseTime);
      console.log(`[CACHE HIT] ${endpoint} - ${responseTime}ms`);
    },
    recordCacheMiss: () => {
      monitor.recordCacheMiss(endpoint);
      const responseTime = Date.now() - startTime;
      monitor.recordResponseTime(endpoint, responseTime);
      console.log(`[CACHE MISS] ${endpoint} - ${responseTime}ms`);
    }
  };
}

// Schedule metrics persistence every minute
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    const monitor = PerformanceMonitor.getInstance();
    await monitor.persistMetrics();
  }, 60000);
}