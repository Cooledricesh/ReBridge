import Redis from 'ioredis';
import { prisma } from '@rebridge/database';
import { 
  JobSource, 
  RawJobData, 
  REDIS_KEYS,
  CRAWL_CONFIG
} from '@rebridge/shared';
import { 
  WorkTogetherAdapter, 
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
    this.adapters.set('workTogether', new WorkTogetherAdapter());
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

      // Crawl jobs
      console.log(`Starting crawl for ${source}, page ${page}...`);
      const rawJobs = await adapter.crawl(page);
      console.log(`Found ${rawJobs.length} jobs from ${source}`);

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
      console.error(`Crawl error for ${source}:`, error);

      // Update crawl log with error
      if (crawlLogId) {
        await prisma.crawlLog.update({
          where: { id: crawlLogId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });
      }

      throw error;
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