import { NextResponse } from 'next/server';
import { prisma } from '@rebridge/database';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    // Optional: Add authentication check for admin endpoints
    // const session = await auth();
    // if (!session || !session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get recent crawl logs
    const recentCrawls = await prisma.crawlLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    // Get statistics by source
    const sourceStats = await prisma.crawlLog.groupBy({
      by: ['source', 'status'],
      _count: true,
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // Calculate success rates
    const successRates: Record<string, number> = {};
    const sourceTotals: Record<string, number> = {};

    sourceStats.forEach((stat) => {
      const source = stat.source;
      const count = stat._count;

      if (!sourceTotals[source]) {
        sourceTotals[source] = 0;
      }
      sourceTotals[source] += count;

      if (stat.status === 'success') {
        if (!successRates[source]) {
          successRates[source] = 0;
        }
        successRates[source] = count;
      }
    });

    // Calculate percentages
    Object.keys(sourceTotals).forEach((source) => {
      successRates[source] = 
        (successRates[source] || 0) / sourceTotals[source] * 100;
    });

    // Get average crawl time by source
    const avgCrawlTimes = await prisma.$queryRaw`
      SELECT 
        source,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
      FROM crawl_logs
      WHERE 
        status = 'success' 
        AND completed_at IS NOT NULL
        AND started_at >= NOW() - INTERVAL '24 hours'
      GROUP BY source
    ` as Array<{ source: string; avg_duration_seconds: number }>;

    // Check for alerts
    const alerts: Array<{ source: string; type: string; message: string }> = [];
    
    // Alert if success rate < 80%
    Object.entries(successRates).forEach(([source, rate]) => {
      if (rate < 80) {
        alerts.push({
          source,
          type: 'error_rate',
          message: `Success rate for ${source} is ${rate.toFixed(1)}% (below 80%)`,
        });
      }
    });

    // Alert if average crawl time > 15 minutes
    avgCrawlTimes.forEach((stat) => {
      if (stat.avg_duration_seconds > 900) { // 15 minutes
        alerts.push({
          source: stat.source,
          type: 'slow_crawl',
          message: `Average crawl time for ${stat.source} is ${(stat.avg_duration_seconds / 60).toFixed(1)} minutes (above 15 min)`,
        });
      }
    });

    // Get total job counts by source
    const jobCounts = await prisma.job.groupBy({
      by: ['source'],
      _count: true,
    });

    return NextResponse.json({
      recentCrawls,
      statistics: {
        successRates,
        avgCrawlTimes: avgCrawlTimes.reduce((acc, stat) => {
          acc[stat.source] = stat.avg_duration_seconds;
          return acc;
        }, {} as Record<string, number>),
        jobCounts: jobCounts.reduce((acc, count) => {
          acc[count.source] = count._count;
          return acc;
        }, {} as Record<string, number>),
      },
      alerts,
      sources: ['workTogether', 'saramin', 'work24', 'jobkorea'],
    });
  } catch (error) {
    console.error('Error fetching crawl status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawl status' },
      { status: 500 }
    );
  }
}