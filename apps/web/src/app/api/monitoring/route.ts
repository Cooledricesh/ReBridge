import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { PerformanceMonitor } from '@/lib/monitoring';

export async function GET() {
  try {
    // Get current in-memory metrics
    const monitor = PerformanceMonitor.getInstance();
    const currentMetrics = monitor.getAllMetrics();
    
    // Get persisted metrics from Redis
    const persistedData = await redis().get('monitoring:metrics');
    const persistedMetrics = persistedData ? JSON.parse(persistedData as string) : null;
    
    // Calculate overall stats
    const totalRequests = currentMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const overallCacheHitRate = totalRequests > 0
      ? currentMetrics.reduce((sum, m) => sum + (m.totalRequests * m.cacheHitRate), 0) / totalRequests
      : 0;
    const averageResponseTime = currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / currentMetrics.length
      : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        current: {
          timestamp: new Date().toISOString(),
          metrics: currentMetrics,
          summary: {
            totalRequests,
            overallCacheHitRate: Math.round(overallCacheHitRate * 100) / 100,
            averageResponseTime: Math.round(averageResponseTime),
            endpointsMonitored: currentMetrics.length
          }
        },
        persisted: persistedMetrics
      }
    });
  } catch (error) {
    console.error('Failed to fetch monitoring data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring data'
    }, { status: 500 });
  }
}

// Reset metrics (admin only)
export async function DELETE() {
  try {
    const monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
    
    await redis().del('monitoring:metrics');
    
    return NextResponse.json({
      success: true,
      message: 'Monitoring metrics cleared successfully'
    });
  } catch (error) {
    console.error('Failed to clear monitoring data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear monitoring data'
    }, { status: 500 });
  }
}