import { prisma } from '@rebridge/database';
import Redis from 'ioredis';

interface MonitoringAlert {
  source: string;
  type: 'high_failure_rate' | 'slow_crawl' | 'consecutive_failures';
  message: string;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export class CrawlerMonitoring {
  private redis: Redis;
  private alertThresholds = {
    failureRate: 0.2, // 20%
    avgCrawlTime: 900, // 15 minutes in seconds
    consecutiveFailures: 3,
  };

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkAndAlert(): Promise<MonitoringAlert[]> {
    const alerts: MonitoringAlert[] = [];
    const sources = ['workTogether', 'saramin', 'work24', 'jobkorea'];

    for (const source of sources) {
      // Check failure rate
      const failureRateAlert = await this.checkFailureRate(source);
      if (failureRateAlert) alerts.push(failureRateAlert);

      // Check average crawl time
      const crawlTimeAlert = await this.checkCrawlTime(source);
      if (crawlTimeAlert) alerts.push(crawlTimeAlert);

      // Check consecutive failures
      const consecutiveAlert = await this.checkConsecutiveFailures(source);
      if (consecutiveAlert) alerts.push(consecutiveAlert);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }

    return alerts;
  }

  private async checkFailureRate(source: string): Promise<MonitoringAlert | null> {
    const recentLogs = await prisma.crawlLog.findMany({
      where: {
        source,
        startedAt: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // Last 6 hours
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (recentLogs.length === 0) return null;

    const failures = recentLogs.filter(log => log.status === 'failed').length;
    const failureRate = failures / recentLogs.length;

    if (failureRate > this.alertThresholds.failureRate) {
      return {
        source,
        type: 'high_failure_rate',
        message: `Failure rate for ${source} is ${(failureRate * 100).toFixed(1)}% (threshold: ${this.alertThresholds.failureRate * 100}%)`,
        severity: failureRate > 0.5 ? 'critical' : 'warning',
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async checkCrawlTime(source: string): Promise<MonitoringAlert | null> {
    const successfulLogs = await prisma.crawlLog.findMany({
      where: {
        source,
        status: 'success',
        completedAt: { not: null },
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    if (successfulLogs.length === 0) return null;

    const durations = successfulLogs.map(log => {
      const start = new Date(log.startedAt).getTime();
      const end = new Date(log.completedAt!).getTime();
      return (end - start) / 1000; // in seconds
    });

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (avgDuration > this.alertThresholds.avgCrawlTime) {
      return {
        source,
        type: 'slow_crawl',
        message: `Average crawl time for ${source} is ${(avgDuration / 60).toFixed(1)} minutes (threshold: ${this.alertThresholds.avgCrawlTime / 60} minutes)`,
        severity: avgDuration > this.alertThresholds.avgCrawlTime * 2 ? 'critical' : 'warning',
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async checkConsecutiveFailures(source: string): Promise<MonitoringAlert | null> {
    const recentLogs = await prisma.crawlLog.findMany({
      where: { source },
      orderBy: { startedAt: 'desc' },
      take: this.alertThresholds.consecutiveFailures,
    });

    if (recentLogs.length < this.alertThresholds.consecutiveFailures) return null;

    const allFailed = recentLogs.every(log => log.status === 'failed');

    if (allFailed) {
      return {
        source,
        type: 'consecutive_failures',
        message: `${source} has failed ${this.alertThresholds.consecutiveFailures} times consecutively`,
        severity: 'critical',
        timestamp: new Date(),
      };
    }

    return null;
  }

  private async sendAlerts(alerts: MonitoringAlert[]): Promise<void> {
    // Store alerts in Redis for the dashboard
    const alertKey = 'crawler:alerts:active';
    await this.redis.setex(alertKey, 3600, JSON.stringify(alerts)); // TTL 1 hour

    // Log critical alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        console.error(`[CRITICAL ALERT] ${alert.source}: ${alert.message}`);
      } else {
        console.warn(`[WARNING] ${alert.source}: ${alert.message}`);
      }
    });

    // In production, you would send these alerts to:
    // - Slack webhook
    // - Email service
    // - SMS service
    // - PagerDuty
    // etc.

    // Example webhook payload (implement actual sending logic)
    if (process.env.SLACK_WEBHOOK_URL) {
      // await sendSlackNotification(alerts);
    }

    if (process.env.ALERT_EMAIL) {
      // await sendEmailAlert(alerts);
    }
  }

  async getActiveAlerts(): Promise<MonitoringAlert[]> {
    const alertKey = 'crawler:alerts:active';
    const alertData = await this.redis.get(alertKey);
    return alertData ? JSON.parse(alertData) : [];
  }

  async clearAlerts(): Promise<void> {
    const alertKey = 'crawler:alerts:active';
    await this.redis.del(alertKey);
  }
}