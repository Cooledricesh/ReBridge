import Redis from 'ioredis';
import { prisma } from '@rebridge/database';
import { 
  JobSource, 
  RawJobData, 
  REDIS_KEYS,
  CRAWL_CONFIG
} from '@rebridge/shared';
import { 
  SaraminAdapter,
  Work24Adapter,
  JobKoreaAdapter,
  CrawlerAdapter
} from '@rebridge/crawler-adapters';

interface CrawlResult {
  source: JobSource;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  error?: string;
}

export class CrawlerManager {
  private adapters: Map<JobSource, CrawlerAdapter> = new Map();
  
  constructor(private redis: Redis) {}

  async initialize(): Promise<void> {
    // Initialize adapters
    this.adapters.set('saramin', new SaraminAdapter());
    this.adapters.set('work24', new Work24Adapter());
    this.adapters.set('jobkorea', new JobKoreaAdapter());
    
    console.log('Crawler adapters initialized');
  }

  async crawlSource(source: JobSource, page: number = 1): Promise<CrawlResult> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`No adapter found for source: ${source}`);
    }

    const startTime = Date.now();
    let crawlLogId: string | null = null;
    let lastError: Error | null = null;

    try {
      // Create crawl log
      const crawlLog = await prisma.crawlLog.create({
        data: {
          source,
          status: 'running',
          jobsFound: 0,
          jobsNew: 0,
          jobsUpdated: 0,
          startedAt: new Date(),
        },
      });
      crawlLogId = crawlLog.id;

      // Crawl jobs with retry logic
      console.log(`Starting crawl for ${source}, page ${page}...`);
      let rawJobs: RawJobData[] = [];
      
      for (let attempt = 0; attempt <= CRAWL_CONFIG.MAX_RETRIES; attempt++) {
        try {
          rawJobs = await adapter.crawl(page);
          console.log(`Found ${rawJobs.length} jobs from ${source} on attempt ${attempt + 1}`);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          console.error(`Crawl attempt ${attempt + 1} failed for ${source}:`, error);
          
          if (attempt < CRAWL_CONFIG.MAX_RETRIES) {
            const delay = CRAWL_CONFIG.RETRY_BACKOFF[attempt] || 5000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error; // All retries exhausted
          }
        }
      }

      // Process and save jobs
      let jobsNew = 0;
      let jobsUpdated = 0;

      for (const rawJob of rawJobs) {
        try {
          const normalized = adapter.normalizeData(rawJob);
          
          // Ensure all required fields are present
          if (!normalized.source || !normalized.externalId || !normalized.title) {
            console.error('Missing required fields in normalized job data');
            continue;
          }
          
          // Check for existing job
          const existing = await prisma.job.findUnique({
            where: {
              source_externalId: {
                source: normalized.source,
                externalId: normalized.externalId,
              },
            },
          });

          if (existing) {
            // Update existing job
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                title: normalized.title,
                company: normalized.company,
                locationJson: normalized.locationJson,
                salaryRange: normalized.salaryRange,
                employmentType: normalized.employmentType,
                description: normalized.description,
                isDisabilityFriendly: normalized.isDisabilityFriendly,
                crawledAt: normalized.crawledAt,
                expiresAt: normalized.expiresAt,
                externalUrl: normalized.externalUrl,
                rawData: normalized.rawData,
              },
            });
            jobsUpdated++;
          } else {
            // Create new job
            await prisma.job.create({
              data: {
                source: normalized.source,
                externalId: normalized.externalId,
                title: normalized.title,
                company: normalized.company,
                locationJson: normalized.locationJson,
                salaryRange: normalized.salaryRange,
                employmentType: normalized.employmentType,
                description: normalized.description,
                isDisabilityFriendly: normalized.isDisabilityFriendly,
                crawledAt: normalized.crawledAt,
                expiresAt: normalized.expiresAt,
                externalUrl: normalized.externalUrl,
                rawData: normalized.rawData,
              },
            });
            jobsNew++;
          }
        } catch (error) {
          console.error(`Error processing job ${rawJob.externalId}:`, error);
        }
      }

      // Update crawl log
      await prisma.crawlLog.update({
        where: { id: crawlLogId },
        data: {
          status: 'success',
          jobsFound: rawJobs.length,
          jobsNew: jobsNew,
          jobsUpdated: jobsUpdated,
          completedAt: new Date(),
        },
      });

      // Update Redis cache
      await this.updateCache();

      const result: CrawlResult = {
        source,
        jobsFound: rawJobs.length,
        jobsNew,
        jobsUpdated,
      };

      console.log(`Crawl completed for ${source} in ${Date.now() - startTime}ms`, result);
      return result;

    } catch (error) {
      const finalError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Crawl error for ${source}:`, finalError);

      // Update crawl log with error
      if (crawlLogId) {
        await prisma.crawlLog.update({
          where: { id: crawlLogId },
          data: {
            status: 'failed',
            errorMessage: finalError.message,
            completedAt: new Date(),
          },
        });
      }

      return {
        source,
        jobsFound: 0,
        jobsNew: 0,
        jobsUpdated: 0,
        error: finalError.message,
      };
    }
  }

  private async updateCache(): Promise<void> {
    try {
      // Invalidate all jobs list cache keys
      const listCacheKeys = await this.redis.keys('jobs:latest:*');
      if (listCacheKeys.length > 0) {
        await this.redis.del(...listCacheKeys);
        console.log(`Invalidated ${listCacheKeys.length} list cache keys`);
      }

      // Get latest 100 jobs
      const latestJobs = await prisma.job.findMany({
        orderBy: { crawledAt: 'desc' },
        take: 100,
        select: {
          id: true,
          source: true,
          externalId: true,
          title: true,
          company: true,
          locationJson: true,
          salaryRange: true,
          employmentType: true,
          isDisabilityFriendly: true,
          crawledAt: true,
          expiresAt: true,
        },
      });

      // Cache in Redis with 1 hour TTL
      await this.redis.setex(
        REDIS_KEYS.JOBS_LATEST,
        3600,
        JSON.stringify(latestJobs)
      );

      // Also cache the first page without filters for quick access
      const firstPageJobs = await prisma.job.findMany({
        orderBy: { crawledAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          company: true,
          locationJson: true,
          salaryRange: true,
          employmentType: true,
          source: true,
          externalId: true,
          isDisabilityFriendly: true,
          crawledAt: true,
          expiresAt: true
        }
      });

      const totalCount = await prisma.job.count();
      
      // Cache the first page
      await this.redis.setex(
        'jobs:latest:1::::latest',
        3600,
        JSON.stringify({ jobs: firstPageJobs, totalCount })
      );

      console.log(`Cached ${latestJobs.length} jobs in Redis and invalidated list caches`);
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup all adapters
    for (const [source, adapter] of this.adapters) {
      try {
        if ('cleanup' in adapter && typeof adapter.cleanup === 'function') {
          await adapter.cleanup();
        }
      } catch (error) {
        console.error(`Error cleaning up ${source} adapter:`, error);
      }
    }
    
    this.adapters.clear();
    console.log('Crawler adapters cleaned up');
  }

  // Clean up expired jobs
  async cleanupExpiredJobs(): Promise<number> {
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    try {
      // Delete jobs that have expired OR are older than 3 months without expiry date
      const result = await prisma.job.deleteMany({
        where: {
          OR: [
            // Jobs with expiry date that has passed
            {
              expiresAt: {
                lt: now
              }
            },
            // Jobs without expiry date that are older than 3 months
            {
              AND: [
                { expiresAt: null },
                { crawledAt: { lt: threeMonthsAgo } }
              ]
            }
          ]
        }
      });

      if (result.count > 0) {
        console.log(`Deleted ${result.count} expired/old jobs`);
        
        // Invalidate cache after cleanup
        await this.updateCache();
      }

      return result.count;
    } catch (error) {
      console.error('Error cleaning up expired jobs:', error);
      return 0;
    }
  }

  // Get crawl statistics
  async getStats(): Promise<{
    totalJobs: number;
    jobsBySource: Record<JobSource, number>;
    recentCrawls: any[];
  }> {
    const [totalJobs, jobsBySource, recentCrawls] = await Promise.all([
      prisma.job.count(),
      prisma.job.groupBy({
        by: ['source'],
        _count: true,
      }),
      prisma.crawlLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    const sourceStats = jobsBySource.reduce((acc, item) => {
      acc[item.source as JobSource] = item._count;
      return acc;
    }, {} as Record<JobSource, number>);

    return {
      totalJobs,
      jobsBySource: sourceStats,
      recentCrawls,
    };
  }
}